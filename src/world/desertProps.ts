/**
 * Authored placements, compacted into shared geometry/material instance batches.
 * @module world/desertProps
 */

import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/core/Meshes/instancedMesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Matrix, Vector2, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { S } from '../core/settings.ts';
import { bindMatrixArray, whenReady } from '../core/gpuUtil.ts';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import { PropCollisions } from './propCollisions.ts';
import { propColliderGeometry } from './propColliderGeometry.ts';
import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Terrain } from '../terrain/terrain.ts';
import { ExaltedWorld } from '../terrain/exaltedWorld.ts';
import { rebasePropHeight } from './propGrounding.ts';
import { keepDesertPlacement } from './desertDensity.ts';
import { DesertPropChunks } from './desertPropChunks.ts';
import type { Sky } from '../render/sky.ts';
import type { ShadowSystem } from '../render/shadows.ts';
import type { DepthPass } from '../render/depthPass.ts';

type PropPass = 'PROP_SHADOW' | 'PROP_PREPASS' | undefined;

export interface PropBatch {
    mesh: Mesh;
    sourceMaterial: PBRMaterial;
    matrices?: number[];
    centers: number[] | Float32Array;
    names: string[];
    data: VertexData;
    distance: number;
    size: number;
    count: number;
    windEnabled?: boolean;
    windBounds?: Vector2;
    all?: Float32Array;
    visible?: Float32Array;
    far?: Mesh;
    farVisible?: Float32Array;
    lodError?: number;
    nearCount?: number;
    farCount?: number;
    instanced?: boolean;
    shadowMats?: ShaderMaterial[];
    prepass?: ShaderMaterial;
}

interface PropPassRecord {
    mat: ShaderMaterial;
    mesh: Mesh;
    pass: PropPass;
    instanced: boolean;
}

interface PlacementSeat {
    name: string;
    x: number;
    z: number;
    lowestY: number;
    groundY: number;
    clearance: number;
}

interface DesertPropAudit {
    densityKeepRatio: number;
    densityRejectedPrimitives: number;
    loadMs: number;
    batches: number;
    primitiveInstances: number;
    transformError: number;
    nearby: number;
    floatingOver20cm: number;
    buriedOver50cm: number;
    seats: PlacementSeat[];
    grounding: 'authored' | 'heightmap-offset';
    adjustedPrimitives: number;
    minHeightAdjustment: number;
    maxHeightAdjustment: number;
}

interface TextureSrgbState {
    _texture?: { _useSRGBBuffer?: boolean };
}

/** Authored placements, compacted into shared geometry/material instance batches. */
export class DesertProps {
    readonly scene: Scene;
    readonly terrain: Terrain;
    readonly sky: Sky;
    readonly shadows: ShadowSystem;
    readonly depthPass: DepthPass;
    readonly batches: PropBatch[] = [];
    readonly materials: ShaderMaterial[] = [];
    readonly passes: PropPassRecord[] = [];
    readonly collisions = new PropCollisions();
    readonly center: Vector2;
    readonly worldScale: number;
    readonly last = new Vector2(Infinity, Infinity);
    readonly splits = new Vector4();
    triangles = 0;
    visibleInstances = 0;
    windTime = 0;
    readonly wind = new Vector4();
    readonly white: RawTexture;
    readonly flat: RawTexture;
    container?: AssetContainer;
    audit?: DesertPropAudit;
    chunks?: DesertPropChunks;
    private disposed = false;

    constructor(
        scene: Scene,
        terrain: Terrain,
        sky: Sky,
        shadows: ShadowSystem,
        depthPass: DepthPass,
        worldScale = 1,
    ) {
        this.scene = scene;
        this.terrain = terrain;
        this.sky = sky;
        this.shadows = shadows;
        this.depthPass = depthPass;
        this.worldScale = worldScale;
        this.center = new Vector2(-65 * worldScale, 604 * worldScale);
        terrain.obstacles = this.collisions;
        this.white = RawTexture.CreateRGBATexture(new Uint8Array([255,255,255,255]),1,1,scene,false,false);
        this.flat = RawTexture.CreateRGBATexture(new Uint8Array([128,128,255,255]),1,1,scene,false,false);
        scene.onDisposeObservable.addOnce(() => this.dispose());
    }
    /**
     * Extract authored placements into material/geometry batches, build reduced meshes and register collision cylinders independently of visibility. Keep imported materials/textures alive for custom shader bindings.
     */
    async load(): Promise<void> {
        const world = this.terrain.heightfield;
        const rebase = world instanceof ExaltedWorld && world.source === 'heightmap'
            && new URLSearchParams(location.search).get('props') !== 'authored';
        const referenceSurface = rebase ? await world.loadGlbReferenceSurface() : null;
        const referenceGround = referenceSurface ? { heightAt: (x: number, z: number) => referenceSurface.sample(x, z) } : null;
        let adjustedPrimitives = 0, minHeightAdjustment = Infinity, maxHeightAdjustment = -Infinity;
        let densityRejectedPrimitives = 0;
        const started = performance.now();
        await MeshoptSimplifier.ready;
        const container = await LoadAssetContainerAsync(`${import.meta.env.BASE_URL}assets/exalted/exalted_desert.glb`, this.scene);
        this.container = container;
        const ground=container.meshes.find(m=>m.name==='Ground');
        if(!(ground instanceof Mesh)) throw new Error('Desert GLB ground material is missing');
        this.terrain.setDesertGround(ground);
        const root = container.meshes.find(m => m.name === '__root__');
        if (!root) throw new Error('Desert GLB has no loader root');
        const rootMatrix = root.computeWorldMatrix(true).clone(), inverseRoot = Matrix.Invert(rootMatrix);
        const groups = new Map<string, PropBatch>();
        const seats: PlacementSeat[] = [];
        const point = new Vector3(), lowest = new Vector3();
        let transformError = 0;
        for (const node of container.meshes) {
            if (!node.getTotalVertices() || node.name === 'Ground') continue;
            const source = node instanceof InstancedMesh ? node.sourceMesh : node;
            if (!(source instanceof Mesh) || !source.geometry || !(source.material instanceof PBRMaterial)) continue;
            const key = `${source.geometry.uniqueId}:${source.material.uniqueId}`;
            let batch = groups.get(key);
            if (!batch) {
                const data = VertexData.ExtractFromMesh(source, true, true);
                data.transform(rootMatrix);
                if (!data.positions) continue;
                if (!data.uvs) data.uvs = new Float32Array(data.positions.length / 3 * 2);
                const mesh = new Mesh(`desert:${source.material.name}:${groups.size}`, this.scene);
                data.applyToMesh(mesh);
                mesh.sideOrientation = source.sideOrientation;
                mesh.renderingGroupId = 1; mesh.isPickable = false;
                mesh.alwaysSelectAsActiveMesh = true;
                // Distance is based on object size, so small stones do not survive to the horizon.
                const size = source.getBoundingInfo().boundingBox.extendSize.length() * 2;
                batch = { mesh, sourceMaterial: source.material, matrices: [], centers: [], names: [], data,
                    distance: 40, size, count: 0 };
                groups.set(key, batch);
            }
            const authored = node.computeWorldMatrix(true).clone();
            const instance = inverseRoot.multiply(authored);
            // Compress authored placement coordinates with the test world, but
            // retain each prop's source rotation and physical model scale.
            instance.getTranslationToRef(point);
            instance.setTranslationFromFloats(
                point.x * this.worldScale,
                point.y * this.worldScale,
                point.z * this.worldScale,
            );
            let placement = rootMatrix.multiply(instance);
            placement.getTranslationToRef(point);
            // Apply one selection before both visual batches and collision extraction.
            if (!keepDesertPlacement(point.x, point.z, this.worldScale)) {
                densityRejectedPrimitives++;
                continue;
            }
            if (referenceGround) {
                // Transfer the original ground-relative placement instead of seating each
                // model at its lowest vertex (which would erase intentional embedding).
                const delta = rebasePropHeight(instance, rootMatrix, referenceGround, world, point);
                placement = rootMatrix.multiply(instance);
                adjustedPrimitives++;
                minHeightAdjustment = Math.min(minHeightAdjustment, delta);
                maxHeightAdjustment = Math.max(maxHeightAdjustment, delta);
            }
            const bound = source.getBoundingInfo().boundingBox;
            const objectScale = new Vector3(); placement.decompose(objectScale);
            const diameter = batch.size * Math.max(Math.abs(objectScale.x), Math.abs(objectScale.y), Math.abs(objectScale.z));
            batch.matrices!.push(...instance.m);
            Vector3.TransformCoordinatesToRef(bound.center, placement, point);
            (batch.centers as number[]).push(point.x, point.z);
            batch.names.push(node.name);
            batch.distance = Math.max(batch.distance, Math.min(220, 35 + diameter * 24));
            // Check the actual transformed vertex chain, not just position metadata.
            const original = source.getVerticesData('position');
            if (!original || !batch.data.positions) continue;
            // Thin-instance LOD and density do not own collision geometry.
            const collider = propColliderGeometry(node.name, source.material.name, original, placement, this.terrain.heightfield);
            if (collider) this.collisions.add(collider);
            const originalPoint = Vector3.TransformCoordinates(Vector3.FromArray(original), placement);
            const instancedPoint = Vector3.TransformCoordinates(Vector3.FromArray(batch.data.positions), instance);
            transformError = Math.max(transformError, Vector3.Distance(originalPoint, instancedPoint));
            if (Math.hypot(point.x + 65 * this.worldScale, point.z - 604 * this.worldScale) < 55) {
                lowest.set(0, Infinity, 0);
                for (let v = 0; v < original.length; v += 3) {
                    Vector3.TransformCoordinatesFromFloatsToRef(original[v], original[v+1], original[v+2], placement, point);
                    if (point.y < lowest.y) lowest.copyFrom(point);
                }
                const ground = this.terrain.heightfield.heightAt(lowest.x, lowest.z);
                seats.push({ name: node.name, x: lowest.x, z: lowest.z, lowestY: lowest.y, groundY: ground, clearance: lowest.y - ground });
            }
        }
        for (const batch of groups.values()) {
            if (batch.names.length === 0) {
                batch.mesh.dispose();
                continue;
            }
            const name = batch.sourceMaterial.name;
            batch.windEnabled = /didelta|leipoldtia|iceplant/.test(name);
            const bounds = batch.mesh.getBoundingInfo().boundingBox;
            batch.windBounds = new Vector2(bounds.minimum.y, Math.max(.01, bounds.maximum.y - bounds.minimum.y));
            if (/sand_rocks_small|namaqualand_stones/.test(name)) batch.distance = 35;
            else if (/didelta|leipoldtia|iceplant/.test(name)) batch.distance = 60;
            else batch.distance = Math.min(180, batch.distance);
            batch.all = new Float32Array(batch.matrices!); delete batch.matrices;
            batch.centers = new Float32Array(batch.centers);
            batch.visible = new Float32Array(batch.all.length);
            batch.visible.set(batch.all);
            batch.mesh.thinInstanceSetBuffer('matrix', batch.visible, 16, false);
            batch.mesh.thinInstanceCount = batch.names.length;
            batch.mesh.doNotSyncBoundingInfo = true;
            const beauty = this.makeMaterial(batch);
            batch.mesh.material = beauty;
            this.materials.push(beauty);
            const shadowMats = Array.from({length:3},()=>this.makeMaterial(batch, 'PROP_SHADOW'));
            const prepass = this.makeMaterial(batch, 'PROP_PREPASS');
            batch.shadowMats = shadowMats; batch.prepass = prepass;
            this.shadows.registerCaster(batch.mesh, i => shadowMats[i]);
            this.depthPass.registerCaster(batch.mesh, prepass);
            if (!batch.data.indices || !batch.data.positions) continue;
            const [indices, error] = MeshoptSimplifier.simplify(new Uint32Array(batch.data.indices),
                new Float32Array(batch.data.positions), 3, Math.max(12,Math.floor(batch.data.indices.length*.15/3)*3), .025, ['Prune']);
            batch.lodError = error;
            const far = new Mesh(`${batch.mesh.name}:distant`, this.scene);
            const data = new VertexData();
            data.positions = batch.data.positions; data.normals = batch.data.normals; data.uvs = batch.data.uvs; data.indices = indices;
            data.applyToMesh(far);
            far.sideOrientation = batch.mesh.sideOrientation; far.material = batch.mesh.material;
            far.renderingGroupId = 1; far.isPickable = false; far.alwaysSelectAsActiveMesh = true;
            batch.far = far; batch.farVisible = new Float32Array(batch.all.length);
            batch.farVisible.set(batch.all);
            far.thinInstanceSetBuffer('matrix',batch.farVisible,16,false);
            far.doNotSyncBoundingInfo = true;
            this.shadows.registerCaster(far, i => shadowMats[i]);
            this.depthPass.registerCaster(far,prepass);
            this.batches.push(batch);
        }
        // Retain textures/material provenance; imported nodes and their geometry are no longer needed.
        for (const mesh of [...container.meshes]) mesh.dispose(false, false);
        for (const node of [...container.transformNodes]) node.dispose();
        container.meshes.length = 0; container.transformNodes.length = 0;
        this.audit = { densityKeepRatio: Math.min(1, this.worldScale * this.worldScale), densityRejectedPrimitives,
            loadMs: performance.now() - started, batches: this.batches.length,
            primitiveInstances: this.batches.reduce((n,b) => n+b.names.length,0), transformError,
            nearby: seats.length, floatingOver20cm: seats.filter(s => s.clearance > .2).length,
            buriedOver50cm: seats.filter(s => s.clearance < -.5).length,
            grounding: referenceSurface ? 'heightmap-offset' : 'authored', adjustedPrimitives,
            minHeightAdjustment: adjustedPrimitives ? minHeightAdjustment : 0,
            maxHeightAdjustment: adjustedPrimitives ? maxHeightAdjustment : 0,
            seats: seats.sort((a,b) => b.clearance-a.clearance) };
        // Keep the old batching available for actual draw comparisons.
        const chunkOption = new URLSearchParams(location.search).get('propChunks');
        if (chunkOption !== 'off') {
            const requested = Number(chunkOption ?? 64);
            const size = [32,64,96,128,192].includes(requested) ? requested : 64;
            this.chunks = new DesertPropChunks(this.scene, this.batches, this.shadows, this.depthPass, size);
        }
    }
    /**
     * Bind shared desert shading for beauty, shadow or depth passes so alpha cutouts and wind displacement agree. Imported PBR metadata supplies supported texture channels.
     */
    makeMaterial(batch: PropBatch, pass?: PropPass): ShaderMaterial {
        const source = batch.sourceMaterial;
        const mat = new ShaderMaterial(`desert:${pass || 'beauty'}:${source.name}`, this.scene, 'desertProp', {
            shaderLanguage: ShaderLanguage.WGSL,
            attributes: ['position','normal','uv'],
            defines: [...(pass ? [`#define ${pass}`] : []), ...(batch.windEnabled ? ['#define PROP_WIND'] : []), ...(source.unlit ? ['#define PROP_UNLIT'] : [])],
            uniforms: ['world','viewProjection','lightViewProjection','uvMatrix','baseColor','alphaCutoff','gammaDecode','roughness','normalStrength',
                'cameraPos','cullCenter','cullDistance','sunDir','sunRadiance','shR','cascadeMatrices','cascadeSplits','cascadeParams','shadowTexel','shadowSoftness','shadowBias',
                'ambientIntensity','fogDensity','fogHeightFalloff','fogStart','aerialStrength','spellLightPos','spellLightCol','spellLightCount',
                'propWind','windTime','windBounds','emissiveMatrix','emissiveColor','emissiveGamma'],
            samplers: ['baseTex','normalTex','roughTex','emissiveTex','skyLUT','cascade0','cascade1','cascade2'],
        });
        mat.backFaceCulling = source.backFaceCulling;
        mat.setTexture('baseTex', source.albedoTexture || this.white);
        mat.setTexture('normalTex', source.bumpTexture || this.flat);
        mat.setTexture('roughTex', source.metallicTexture || this.white);
        mat.setMatrix('uvMatrix', source.albedoTexture?.getTextureMatrix() || Matrix.Identity());
        const emission=source.emissiveTexture;
        const strength=(source.emissiveIntensity ?? 1)*(emission?.level ?? 1);
        mat.setTexture('emissiveTex',emission || this.white);
        mat.setMatrix('emissiveMatrix',emission?.getTextureMatrix() || Matrix.Identity());
        mat.setVector3('emissiveColor',new Vector3(
            (source.emissiveColor?.r ?? 0)*strength,
            (source.emissiveColor?.g ?? 0)*strength,
            (source.emissiveColor?.b ?? 0)*strength));
        const emissionState = emission as (typeof emission & TextureSrgbState) | null;
        mat.setFloat('emissiveGamma',emissionState?.gammaSpace && !emissionState._texture?._useSRGBBuffer ? 1 : 0);
        const color = source.albedoColor;
        mat.setVector4('baseColor', new Vector4(color.r,color.g,color.b,source.alpha));
        mat.setFloat('alphaCutoff', source.needAlphaBlending() || source.needAlphaTesting() ? (source.alphaCutOff || .5) : 0);
        const albedoState = source.albedoTexture as (typeof source.albedoTexture & TextureSrgbState) | null;
        mat.setFloat('gammaDecode', albedoState?.gammaSpace && !albedoState._texture?._useSRGBBuffer ? 1 : 0);
        mat.setFloat('roughness', source.roughness ?? 1);
        mat.setFloat('normalStrength', source.bumpTexture ? (source.bumpTexture.level ?? 1) : 0);
        mat.setFloat('cullDistance', batch.distance);
        mat.setFloat('spellLightCount', 0);
        mat.setVector4('propWind', this.wind);
        mat.setFloat('windTime', this.windTime);
        mat.setVector2('windBounds', batch.windBounds ?? Vector2.Zero());
        mat.setTexture('skyLUT', this.sky.lut);
        for (let i=0;i<3;i++) mat.setTexture(`cascade${i}`,this.shadows.maps[i]);
        this.passes.push({ mat, mesh: batch.mesh, pass, instanced: batch.instanced ?? true });
        return mat;
    }
    /**
     * Compact near/far instance buffers after sufficient focus movement, then refresh lighting and wind for all passes.
     * @param camera - World camera position used for shading.
     * @param focus - World position controlling distance selection.
     * @param force - Rebuild membership even if the focus has barely moved.
     * @param dt - Wind simulation seconds.
     */
    update(camera: Vector3, focus: Vector3, force = false, dt = 0): void {
        this.windTime += dt * S.bushWindSpeed;
        const angle = S.windDirection * Math.PI / 180;
        this.wind.set(Math.sin(angle), Math.cos(angle), S.windStrength * S.bushWindStrength, 0);
        this.center.set(focus.x, focus.z);
        const rebuild = force || Math.hypot(focus.x-this.last.x,focus.z-this.last.y) > 3;
        if (this.chunks) {
            this.chunks.update(focus, rebuild);
            if (rebuild) {
                this.last.copyFrom(this.center);
                this.triangles = this.chunks.triangles;
                this.visibleInstances = this.chunks.visibleInstances;
            }
        } else if (rebuild) {
            this.last.copyFrom(this.center); this.triangles = 0; this.visibleInstances = 0;
            for (const b of this.batches) {
                let count = 0, farCount = 0;
                for (let i=0;i<b.names.length;i++) {
                    const distance = Math.hypot(b.centers[i*2]-focus.x,b.centers[i*2+1]-focus.z);
                    if (distance > b.distance+6) continue;
                    if (distance < (b.distance > 100 ? 30 : 16)) b.visible!.set(b.all!.subarray(i*16,i*16+16),count++*16);
                    else b.farVisible!.set(b.all!.subarray(i*16,i*16+16),farCount++*16);
                }
                b.mesh.thinInstanceCount = count;
                if (count) b.mesh.thinInstanceBufferUpdated('matrix');
                b.mesh.setEnabled(count > 0);
                b.far!.thinInstanceCount = farCount;
                if (farCount) b.far!.thinInstanceBufferUpdated('matrix');
                b.far!.setEnabled(farCount > 0); b.count = count + farCount; b.nearCount = count; b.farCount = farCount;
                this.visibleInstances += count + farCount;
                this.triangles += (count * b.mesh.getTotalIndices() + farCount * b.far!.getTotalIndices())/3;
            }
        }
        this.splits.set(this.shadows.splits[0], this.shadows.splits[1], this.shadows.splits[2], this.shadows.splits[3]);
        for (const { mat, pass } of this.passes) {
            mat.setVector3('cameraPos',camera); mat.setVector2('cullCenter',this.center);
            mat.setVector4('propWind', this.wind); mat.setFloat('windTime', this.windTime);
            if (pass) continue;
            mat.setVector3('sunDir',this.sky.sunDir); mat.setColor3('sunRadiance',this.sky.sunRadiance);
            mat.setArray4('shR',this.sky.sh as unknown as number[]); bindMatrixArray(mat,'cascadeMatrices',this.shadows.matrixData);
            mat.setVector4('cascadeSplits',this.splits); mat.setArray4('cascadeParams',this.shadows.paramData as unknown as number[]);
            mat.setFloat('shadowTexel',this.shadows.texelSize); mat.setFloat('shadowSoftness',1.8); mat.setFloat('shadowBias',.01);
            mat.setFloat('ambientIntensity',S.ambientIntensity); mat.setFloat('fogDensity',S.fogDensity);
            mat.setFloat('fogHeightFalloff',S.fogHeightFalloff); mat.setFloat('fogStart',S.fogStart); mat.setFloat('aerialStrength',S.aerialStrength);
        }
    }
    /**
     * Compile registered material/pass combinations before interaction to avoid first-use pipeline stalls.
     */
    async warmUp(): Promise<void> {
        for (const { mat, mesh, instanced } of this.passes) await whenReady(mat,mat.name,[mesh,instanced]);
    }
    /** Release near/far batches, pass materials, retained import container and fallback textures when the owning system is torn down. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.chunks?.dispose();
        for (const b of this.batches) {
            this.shadows.unregisterCaster(b.mesh); this.depthPass.unregisterCaster(b.mesh);
            if (b.far) { this.shadows.unregisterCaster(b.far); this.depthPass.unregisterCaster(b.far); b.far.dispose(); }
            b.mesh.dispose();
        }
        for (const p of this.passes) p.mat.dispose();
        this.container?.dispose(); this.white.dispose(); this.flat.dispose();
    }
}
