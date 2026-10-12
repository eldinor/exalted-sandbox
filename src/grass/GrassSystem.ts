import '@babylonjs/core/Meshes/thinInstanceMesh';
import { Matrix, Quaternion, Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import type { Scene } from '@babylonjs/core/scene';
import { createGrassBlade } from './GrassGeometry.ts';
import { grassLightingResponse } from './GrassAppearance.ts';
import { GrassPlacementJob, type GrassPlacementConfig } from './GrassPlacementJob.ts';
import { grassCandidateSeed, grassHash as hash } from './GrassDistribution.ts';
import { canUseStaticGrass } from './GrassWind.ts';
import type { GrassSamplers, GrassSettings, GrassStats, GrassUpdateContext } from './grassTypes.ts';
import type { ImportedGrassPrototype } from './ImportedGrass.ts';
import vertexShader from './grass.vertex.wgsl?raw';
import fragmentShader from './grass.fragment.wgsl?raw';

interface GrassPatch {
    tile?: StreamTile;
    x: number;
    z: number;
    instances: number;
    near: Mesh;
    mid: Mesh;
    nearTriangles: number;
    midTriangles: number;
    nearBuffer?: Float32Array;
    midBuffer?: Float32Array;
    nearGeometry?: VertexData;
    midGeometry?: VertexData;
    baseMidMaterial?: ShaderMaterial;
    boundsMinimum?: Vector3;
    boundsMaximum?: Vector3;
    boundsPadding?: number;
}

interface StreamTile { patches: GrassPatch[]; visible: boolean; }
interface MixedGeometry {
    name: string; near: VertexData; mid: VertexData;
    nearTriangles: number; midTriangles: number;
    midMaterial: ShaderMaterial;
    radius: number;
}

interface StreamRequest { key: string; x: number; z: number; distance: number; }
interface StreamGeometry {
    near: VertexData; mid: VertexData;
    nearTriangles: number; midTriangles: number;
    placement: GrassPlacementConfig;
    radius: number;
    variants?: MixedGeometry[];
}

export interface GrassSystemOptions {
    /** Optional production shader factory; labs retain their standalone shading. */
    createMaterial?(name: string, lodKind: number, staticGrass: boolean): ShaderMaterial;
    updateMaterial?(material: ShaderMaterial, context: GrassUpdateContext): void;
    syncMesh?(mesh: Mesh, visible: boolean, distance: number, staticGrass: boolean): void;
    importedOnly?: boolean;
    streaming?: boolean;
    /** Optional production view gates. Completed off-screen patches stay cached. */
    isMeshInView?(mesh: Mesh): boolean;
    isTileInView?(x: number, z: number, size: number): boolean;
}

const PATCH_SIZE = 16;
const MAX_IMPACTS = 8;
const NO_IMPACTS: readonly GrassUpdateContext['impacts'][number][] = [];

/** DOM-independent procedural grass renderer used by the lab and later world integration. */
export class GrassSystem {
    public streamingPaused = false;
    public readonly materials: ShaderMaterial[] = [];
    public readonly streamingStats = { queued: 0, deferred: 0, uploadMs: 0, staticDraws: 0 };
    public readonly stats: GrassStats = { updateMs: 0, visiblePatches: 0, nearInstances: 0, midInstances: 0, triangles: 0, draws: 0 };
    private readonly patches: GrassPatch[] = [];
    private readonly nearTemplate: Mesh;
    private readonly midTemplate: Mesh;
    private readonly nearGeometry: VertexData;
    private readonly midGeometry: VertexData;
    private importedPrototypes = new Map<string, ImportedGrassPrototype>();
    private readonly nearMaterial: ShaderMaterial;
    private readonly midMaterial: ShaderMaterial;
    private builtDensity = -1;
    private builtGeometryKey = '';
    private readonly impactData = new Float32Array(MAX_IMPACTS * 4);
    private readonly rootColor = Color3.Black();
    private readonly tipColor = Color3.Black();
    private midColorScale = 1;
    private emptyPatches = new Set<string>();
    private readonly streamReady = new Map<string, StreamTile>();
    private readonly mixedMaterials = new Map<string, ShaderMaterial>();
    private readonly staticMaterials = new Map<ShaderMaterial, ShaderMaterial>();
    private readonly materialColorScales = new Map<ShaderMaterial, number>();
    private readonly windFade = new Vector2();
    private streamUploadVariant = 0;
    private readonly streamPool: GrassPatch[] = [];
    private streamWanted = new Set<string>();
    private streamQueue: StreamRequest[] = [];
    private streamPending: GrassPlacementJob | null = null;
    private streamReserved: GrassPatch | null = null;
    private streamSpare: { near: Float32Array; mid: Float32Array } | null = null;
    private streamGeometry: StreamGeometry | null = null;
    private streamRange = -1;
    private readonly windUniform = new Vector2();
    private readonly boundsMinimum = new Vector3();
    private readonly boundsMaximum = new Vector3();
    private cachedMix: GrassSettings['grassMix'];
    private cachedMixEnabled = false;
    private mixEntries: readonly { variant: string; percentage: number }[] = [];
    private mixSignature = '';

    public constructor(
        private readonly scene: Scene,
        private readonly samplers: GrassSamplers,
        public readonly settings: GrassSettings,
        private readonly centre = new Vector2(-250, 60),
        private readonly extent = 256,
        private readonly options: GrassSystemOptions = {},
    ) {
        ShaderStore.ShadersStoreWGSL.exaltedGrassVertexShader = vertexShader;
        ShaderStore.ShadersStoreWGSL.exaltedGrassPixelShader = fragmentShader;
        this.nearTemplate = options.importedOnly ? new Mesh('grass-near-template', scene) : createGrassBlade('grass-near-template', scene, 4);
        this.midTemplate = options.importedOnly ? new Mesh('grass-mid-template', scene) : createGrassBlade('grass-mid-template', scene, 1);
        // Patch meshes need independent vertex-buffer bindings. Babylon mesh
        // cloning can share the internal thin-instance storage as well as the
        // intended blade geometry, causing one patch's count to address a
        // sibling patch's shorter matrix buffer.
        this.nearGeometry = options.importedOnly ? new VertexData() : VertexData.ExtractFromMesh(this.nearTemplate, true, true);
        this.midGeometry = options.importedOnly ? new VertexData() : VertexData.ExtractFromMesh(this.midTemplate, true, true);
        this.nearMaterial = this.createMaterial('near', 0);
        this.midMaterial = this.createMaterial('mid', 1);
        this.nearTemplate.material = this.nearMaterial;
        this.midTemplate.material = this.midMaterial;
        this.nearTemplate.setEnabled(false);
        this.midTemplate.setEnabled(false);
        if (!options.importedOnly) this.rebuild();
    }

    /** Supplies normalized GLB prototypes without coupling the renderer to asset loading. */
    public setImportedPrototypes(prototypes: Map<string, ImportedGrassPrototype>): void {
        this.importedPrototypes = prototypes;
        this.rebuild();
    }

    /** Pre-create static variants so production can compile them before streaming. */
    public prepareStaticMaterials(): void {
        this.materialForWind(this.nearMaterial, true);
        this.materialForWind(this.midMaterial, true);
        for (const material of this.mixedMaterials.values()) this.materialForWind(material, true);
    }

    public getPrototypeTriangleCounts(): readonly [number, number] {
        const mix = this.activeMix();
        if (mix.length) {
            const total = mix.reduce((sum, entry) => sum + entry.percentage, 0);
            const lod = this.settings.lodEnabled ? this.settings.importedNearLod : this.settings.singleLod;
            let near = 0, mid = 0;
            for (const entry of mix) {
                near += (this.importedPrototypes.get(entry.variant.replace(/_LOD2$/, `_LOD${lod}`))?.triangles ?? 0) * entry.percentage / total;
                mid += (this.importedPrototypes.get(entry.variant)?.triangles ?? 0) * entry.percentage / total;
            }
            return [near, this.settings.lodEnabled || this.distantLodActive() ? mid : near];
        }
        const near = this.importedPrototypes.get(this.importedNearName())?.triangles ?? 8;
        const mid = this.importedPrototypes.get(this.settings.importedVariant)?.triangles ?? 2;
        if (this.settings.bladeSource === 'procedural') return this.settings.lodEnabled ? [8, 2] : [8, 8];
        if (!this.settings.lodEnabled) return [near, this.distantLodActive() ? mid : near];
        if (this.settings.bladeSource === 'hybrid') return [near, 2];
        return [near, mid];
    }

    private importedNearName(): string {
        const lod = this.settings.lodEnabled ? this.settings.importedNearLod : this.settings.singleLod;
        return this.settings.importedVariant.replace(/_LOD2$/, `_LOD${lod}`);
    }

    private activeMix(): readonly { variant: string; percentage: number }[] {
        const enabled = !!(this.options.streaming && this.settings.bladeSource === 'imported' && this.settings.grassMixEnabled);
        if (this.cachedMix !== this.settings.grassMix || this.cachedMixEnabled !== enabled) {
            this.cachedMix = this.settings.grassMix; this.cachedMixEnabled = enabled;
            this.mixEntries = enabled ? (this.settings.grassMix ?? []).filter(entry => Number.isFinite(entry.percentage) && entry.percentage > 0) : [];
            this.mixSignature = this.mixEntries.map(entry => `${entry.variant}=${entry.percentage}`).join(',');
        }
        return this.mixEntries;
    }

    private distantLodActive(): boolean {
        return this.settings.bladeSource === 'imported' && (this.settings.distantLodDistance ?? 0) > this.settings.farDistance;
    }

    private visibleDistance(): number {
        return this.distantLodActive() ? this.settings.distantLodDistance ?? this.settings.farDistance : this.settings.farDistance;
    }

    private updatePatchBounds(patch: GrassPatch, padding: number): void {
        if (!patch.boundsMinimum || !patch.boundsMaximum || patch.boundsPadding === padding) return;
        this.boundsMinimum.copyFrom(patch.boundsMinimum);
        this.boundsMaximum.copyFrom(patch.boundsMaximum);
        this.boundsMinimum.x -= padding; this.boundsMinimum.z -= padding;
        this.boundsMaximum.x += padding; this.boundsMaximum.z += padding;
        for (const mesh of [patch.near, patch.mid]) {
            mesh.getBoundingInfo().reConstruct(this.boundsMinimum, this.boundsMaximum, mesh.getWorldMatrix());
        }
        patch.boundsPadding = padding;
    }

    private createMaterial(name: string, lodKind: number, staticGrass = false): ShaderMaterial {
        const material = this.options.createMaterial?.(name, lodKind, staticGrass) ?? new ShaderMaterial(`grass-${name}`, this.scene, 'exaltedGrass', {
            shaderLanguage: ShaderLanguage.WGSL,
            defines: staticGrass ? ['#define GRASS_STATIC'] : [],
            attributes: ['position', 'normal'],
            uniforms: ['world', 'viewProjection', 'time', 'wind', 'windFade', 'windCameraPosition', 'cameraPosition', 'interactionEnabled', 'impactCount', 'impactData', 'visualization', 'lodKind', 'colorScale', 'rootColor', 'tipColor'],
        });
        material.backFaceCulling = false;
        material.setFloat('lodKind', lodKind);
        material.setFloat('time', 0);
        material.setVector2('wind', Vector2.Zero());
        material.setVector3('cameraPosition', Vector3.Zero());
        material.setVector3('windCameraPosition', Vector3.Zero());
        material.setVector2('windFade', Vector2.Zero());
        material.setFloat('interactionEnabled', 1);
        material.setFloat('impactCount', 0);
        material.setArray4('impactData', this.impactData as unknown as number[]);
        material.setFloat('visualization', 0);
        material.setFloat('colorScale', 1);
        this.rootColor.set(...this.settings.rootColor);
        this.tipColor.set(...this.settings.tipColor);
        material.setColor3('rootColor', this.rootColor);
        material.setColor3('tipColor', this.tipColor);
        this.materials.push(material);
        return material;
    }

    private materialForWind(source: ShaderMaterial, staticGrass: boolean): ShaderMaterial {
        if (!staticGrass) return source;
        let material = this.staticMaterials.get(source);
        if (!material) {
            material = this.createMaterial(`${source.name}-static`, source === this.nearMaterial ? 0 : 1, true);
            this.staticMaterials.set(source, material);
        }
        return material;
    }

    /** Rebuilds deterministic patch buffers when density or blade dimensions change. */
    public rebuild(reusePatches = false): void {
        if (this.options.streaming) { this.rebuildStreaming(reusePatches); return; }
        const retained = new Map<string, GrassPatch>();
        for (const patch of this.patches) {
            if (reusePatches) {
                retained.set(`${Math.floor(patch.x / PATCH_SIZE)}:${Math.floor(patch.z / PATCH_SIZE)}`, patch);
                continue;
            }
            patch.near.dispose();
            patch.mid.dispose();
        }
        this.patches.length = 0;
        const imported = this.importedPrototypes.get(this.settings.importedVariant);
        const importedNear = this.importedPrototypes.get(this.importedNearName());
        if (this.options.importedOnly && (this.settings.bladeSource !== 'imported' || !imported || !importedNear)) {
            throw new Error('Authored Grassland requires loaded imported near and far grass prototypes.');
        }
        const useImportedNear = this.settings.bladeSource !== 'procedural' && importedNear;
        const useImportedMid = this.settings.bladeSource === 'imported' && imported;
        const nearGeometry = useImportedNear ? importedNear.geometry : this.nearGeometry;
        const midGeometry = useImportedMid ? imported.geometry : this.midGeometry;
        const nearTriangles = useImportedNear ? importedNear.triangles : 8;
        const midTriangles = useImportedMid ? imported.triangles : 2;
        // Keep unit-height geometry for wind/gradient math, then restore authored
        // sizes using the same LOD1 ratio for near, far and Hybrid blades.
        const referenceHeight = this.importedPrototypes.get('grass_medium_01_tall_a_LOD1')?.authoredHeight ?? 1;
        const variantHeight = this.importedPrototypes.get(this.settings.importedVariant.replace(/_LOD2$/, '_LOD1'))?.authoredHeight ?? referenceHeight;
        const heightRatio = useImportedNear ? variantHeight / referenceHeight : 1;
        // Match average diffuse brightness without changing either LOD's tint.
        this.midColorScale = grassLightingResponse(nearGeometry) / grassLightingResponse(midGeometry);
        const half = this.extent * 0.5;
        const firstX = Math.floor((this.centre.x - half) / PATCH_SIZE);
        const lastX = Math.floor((this.centre.x + half) / PATCH_SIZE);
        const firstZ = Math.floor((this.centre.y - half) / PATCH_SIZE);
        const lastZ = Math.floor((this.centre.y + half) / PATCH_SIZE);
        const oldEmpty = reusePatches ? this.emptyPatches : new Set<string>();
        this.emptyPatches = new Set<string>();
        // Blade-scale grass needs several candidates per square metre. The
        // earlier 0.72 m spacing was appropriate for authored plant clumps but
        // left individual imported blades visibly isolated.
        const spacing = 0.42 / Math.sqrt(this.settings.density);
        const cells = Math.floor(PATCH_SIZE / spacing);
        for (let patchZ = firstZ; patchZ <= lastZ; patchZ++) {
            for (let patchX = firstX; patchX <= lastX; patchX++) {
                const key = `${patchX}:${patchZ}`;
                if (oldEmpty.has(key)) { this.emptyPatches.add(key); continue; }
                const existing = retained.get(key);
                if (existing) {
                    this.patches.push(existing);
                    retained.delete(key);
                    continue;
                }
                const nearMatrices: number[] = [];
                const midMatrices: number[] = [];
                for (let cellZ = 0; cellZ < cells; cellZ++) {
                    for (let cellX = 0; cellX < cells; cellX++) {
                        const seed = grassCandidateSeed(patchX, patchZ, cellZ * cells + cellX);
                        const x = patchX * PATCH_SIZE + hash(seed) * PATCH_SIZE;
                        const z = patchZ * PATCH_SIZE + hash(seed + 11) * PATCH_SIZE;
                        const weight = this.samplers.grassWeightAt(x, z);
                        const coverage = Math.max(0, Math.min(1, (weight - 0.06) / 0.48));
                        if (coverage <= 0 || hash(seed + 23) > coverage || this.samplers.excludedAt(x, z)) continue;
                        if (this.samplers.slopeAt) {
                            if (this.samplers.slopeAt(x, z) > (this.settings.maxSlope ?? .4)) continue;
                        } else {
                            const slope = this.samplers.heightAt(x + 1, z) - this.samplers.heightAt(x - 1, z);
                            const slopeZ = this.samplers.heightAt(x, z + 1) - this.samplers.heightAt(x, z - 1);
                            if (Math.hypot(slope, slopeZ) > 2 * (this.settings.maxSlope ?? .4)) continue;
                        }
                        const height = this.settings.bladeHeight * heightRatio * (.65 + hash(seed + 31) * .7);
                        const width = this.settings.bladeWidth * (0.78 + hash(seed + 47) * 0.44);
                        const rotation = Quaternion.FromEulerAngles((hash(seed + 71) * 2 - 1) * Math.PI / 18, (hash(seed + 59) * 2 - 1) * Math.PI, (hash(seed + 83) * 2 - 1) * Math.PI / 18);
                        const translation = new Vector3(x, this.samplers.heightAt(x, z) + 0.015, z);
                        const spreadX = .8 + hash(seed + 97) * .4;
                        const spreadZ = .8 + hash(seed + 109) * .4;
                        const proceduralScale = new Vector3(width * spreadX, height, width * spreadZ);
                        const importedScale = new Vector3(height * spreadX, height, height * spreadZ);
                        nearMatrices.push(...Matrix.Compose(useImportedNear ? importedScale : proceduralScale, rotation, translation).m);
                        midMatrices.push(...Matrix.Compose(useImportedMid ? importedScale : proceduralScale, rotation, translation).m);
                    }
                }
                if (!nearMatrices.length) { this.emptyPatches.add(key); continue; }
                const near = new Mesh(`grass:${patchX}:${patchZ}:near`, this.scene);
                const mid = new Mesh(`grass:${patchX}:${patchZ}:mid`, this.scene);
                nearGeometry.applyToMesh(near);
                midGeometry.applyToMesh(mid);
                near.material = this.nearMaterial;
                mid.material = this.midMaterial;
                near.isPickable = false;
                mid.isPickable = false;
                const nearBuffer = Float32Array.from(nearMatrices);
                const midBuffer = Float32Array.from(midMatrices);
                near.thinInstanceSetBuffer('matrix', nearBuffer, 16, false);
                mid.thinInstanceSetBuffer('matrix', midBuffer, 16, false);
                const instanceCount = nearBuffer.length / 16;
                near.thinInstanceCount = instanceCount;
                mid.thinInstanceCount = instanceCount;
                near.thinInstanceRefreshBoundingInfo(true);
                mid.thinInstanceRefreshBoundingInfo(true);
                near.setEnabled(false);
                mid.setEnabled(false);
                this.patches.push({
                    x: (patchX + 0.5) * PATCH_SIZE,
                    z: (patchZ + 0.5) * PATCH_SIZE,
                    instances: instanceCount,
                    near, mid, nearTriangles, midTriangles,
                });
            }
        }
        for (const patch of retained.values()) { patch.near.dispose(); patch.mid.dispose(); }
        this.builtDensity = this.settings.density;
        this.builtGeometryKey = this.geometryKey();
    }

    private geometryKey(): string {
        this.activeMix();
        return `${this.settings.bladeSource}:${this.settings.importedVariant}:${this.importedNearName()}:${this.settings.bladeHeight}:${this.settings.bladeWidth}:${this.settings.maxSlope ?? .4}:${this.mixSignature}`;
    }

    private releaseStreamingPatch(patch: GrassPatch): void {
        patch.near.setEnabled(false); patch.mid.setEnabled(false);
        this.options.syncMesh?.(patch.near, false, Infinity, false);
        this.options.syncMesh?.(patch.mid, false, Infinity, false);
        this.streamPool.push(patch);
    }

    private cancelPending(): void {
        if (this.streamReserved) this.releaseStreamingPatch(this.streamReserved);
        else if (this.streamPending) this.streamSpare = { near: this.streamPending.nearBuffer, mid: this.streamPending.midBuffer };
        this.streamPending = null; this.streamReserved = null;
        this.streamUploadVariant = 0;
    }

    /** Replan only; expensive sampling and uploads are performed by the frame queue. */
    private rebuildStreaming(reusePatches: boolean): void {
        if (!reusePatches) {
            this.cancelPending();
            for (const tile of this.streamReady.values()) for (const patch of tile.patches) this.releaseStreamingPatch(patch);
            this.streamReady.clear(); this.emptyPatches.clear();
            const near = this.importedPrototypes.get(this.importedNearName());
            const mid = this.importedPrototypes.get(this.settings.importedVariant);
            if (this.options.importedOnly && (!near || !mid || this.settings.bladeSource !== 'imported')) throw new Error('Authored grass requires imported prototypes.');
            const nearImported = this.settings.bladeSource !== 'procedural' && !!near;
            const midImported = this.settings.bladeSource === 'imported' && !!mid;
            const nearData = nearImported && near ? near.geometry : this.nearGeometry;
            const midData = midImported && mid ? mid.geometry : this.midGeometry;
            const reference = this.importedPrototypes.get('grass_medium_01_tall_a_LOD1')?.authoredHeight ?? 1;
            const height = this.importedPrototypes.get(this.settings.importedVariant.replace(/_LOD2$/, '_LOD1'))?.authoredHeight ?? reference;
            let radius = 0;
            for (const data of [nearData, midData]) {
                const positions = data.positions;
                if (positions) for (let i = 0; i < positions.length; i += 3) radius = Math.max(radius, Math.hypot(positions[i], positions[i + 2]));
            }
            this.streamGeometry = {
                near: nearData, mid: midData,
                nearTriangles: nearImported && near ? near.triangles : 8,
                midTriangles: midImported && mid ? mid.triangles : 2,
                radius,
                placement: { density: this.settings.density, maxSlope: this.settings.maxSlope, height: this.settings.bladeHeight * (nearImported ? height / reference : 1), width: this.settings.bladeWidth, nearImported, midImported },
            };
            this.midColorScale = grassLightingResponse(nearData) / grassLightingResponse(midData);
            const mix = this.activeMix();
            if (mix.length) {
                const total = mix.reduce((sum, entry) => sum + entry.percentage, 0);
                const lod = this.settings.lodEnabled ? this.settings.importedNearLod : this.settings.singleLod;
                const variants: MixedGeometry[] = [];
                const placementVariants: { weight: number; heightRatio: number }[] = [];
                for (const entry of mix) {
                    const nearPrototype = this.importedPrototypes.get(entry.variant.replace(/_LOD2$/, `_LOD${lod}`));
                    const midPrototype = this.importedPrototypes.get(entry.variant);
                    const size = this.importedPrototypes.get(entry.variant.replace(/_LOD2$/, '_LOD1'));
                    if (!nearPrototype || !midPrototype || !size) throw new Error(`Missing grass mix prototype: ${entry.variant}`);
                    let midMaterial = this.mixedMaterials.get(entry.variant);
                    if (!midMaterial) {
                        midMaterial = this.createMaterial(`mix-${entry.variant}`, 1);
                        this.mixedMaterials.set(entry.variant, midMaterial);
                    }
                    const colorScale = grassLightingResponse(nearPrototype.geometry) / grassLightingResponse(midPrototype.geometry);
                    midMaterial.setFloat('colorScale', colorScale);
                    this.materialColorScales.set(midMaterial, colorScale);
                    const model = { name: entry.variant, near: nearPrototype.geometry, mid: midPrototype.geometry,
                        nearTriangles: nearPrototype.triangles, midTriangles: midPrototype.triangles, midMaterial, radius: 0 };
                    variants.push(model);
                    placementVariants.push({ weight: entry.percentage / total, heightRatio: size.authoredHeight / reference });
                    for (const data of [nearPrototype.geometry, midPrototype.geometry]) {
                        if (data.positions) for (let i = 0; i < data.positions.length; i += 3) model.radius = Math.max(model.radius, Math.hypot(data.positions[i], data.positions[i + 2]));
                    }
                    radius = Math.max(radius, model.radius);
                }
                this.streamGeometry.variants = variants;
                this.streamGeometry.radius = radius;
                this.streamGeometry.placement.height = this.settings.bladeHeight;
                this.streamGeometry.placement.variants = placementVariants;
            }
        }
        // Prepare beyond visibility while avoiding the old full square of candidates.
        const range = Math.min(this.extent / 2, this.visibleDistance() + PATCH_SIZE * 2);
        this.streamRange = this.visibleDistance();
        const wanted = new Set<string>();
        const queue: StreamRequest[] = [];
        for (let z = Math.floor((this.centre.y - range) / PATCH_SIZE); z <= Math.floor((this.centre.y + range) / PATCH_SIZE); z++) {
            for (let x = Math.floor((this.centre.x - range) / PATCH_SIZE); x <= Math.floor((this.centre.x + range) / PATCH_SIZE); x++) {
                const distance = Math.hypot((x + .5) * PATCH_SIZE - this.centre.x, (z + .5) * PATCH_SIZE - this.centre.y);
                if (distance > range + PATCH_SIZE) continue;
                if (this.samplers.patchMayContainGrass && !this.samplers.patchMayContainGrass(x * PATCH_SIZE, z * PATCH_SIZE, PATCH_SIZE)) continue;
                const key = `${x}:${z}`;
                wanted.add(key);
                if (!this.streamReady.has(key) && !this.emptyPatches.has(key) && !(this.streamPending?.patchX === x && this.streamPending.patchZ === z)) queue.push({ key, x, z, distance });
            }
        }
        this.streamWanted = wanted;
        for (const [key, tile] of this.streamReady) {
            if (!wanted.has(key)) { for (const patch of tile.patches) this.releaseStreamingPatch(patch); this.streamReady.delete(key); }
        }
        for (const key of this.emptyPatches) if (!wanted.has(key)) this.emptyPatches.delete(key);
        if (this.streamPending && !wanted.has(`${this.streamPending.patchX}:${this.streamPending.patchZ}`)) this.cancelPending();
        queue.sort((a, b) => a.distance - b.distance);
        this.streamQueue = queue;
        this.patches.length = 0;
        for (const tile of this.streamReady.values()) this.patches.push(...tile.patches);
        this.builtDensity = this.settings.density;
        this.builtGeometryKey = this.geometryKey();
    }

    /** A 2 ms candidate budget and at most one completed patch upload per frame. */
    private processStreamingQueue(): void {
        const geometry = this.streamGeometry;
        if (!geometry || !this.settings.enabled || this.streamingPaused) return;
        const deadline = performance.now() + 2;
        let candidates = 0;
        while (performance.now() < deadline && candidates < 2048) {
            if (!this.streamPending) {
                let index = 0;
                if (this.options.isTileInView) {
                    while (index < this.streamQueue.length) {
                        const request = this.streamQueue[index];
                        if (this.options.isTileInView(request.x * PATCH_SIZE, request.z * PATCH_SIZE, PATCH_SIZE)) break;
                        index++;
                    }
                }
                if (index >= this.streamQueue.length) return;
                const request = this.streamQueue.splice(index, 1)[0];
                if (!request) return;
                this.streamReserved = geometry.variants ? null : this.streamPool.pop() ?? null;
                const nearBuffer = this.streamReserved?.nearBuffer ?? this.streamSpare?.near;
                const midBuffer = this.streamReserved?.midBuffer ?? this.streamSpare?.mid;
                this.streamPending = new GrassPlacementJob(request.x, request.z, geometry.placement, this.samplers, nearBuffer, midBuffer);
                this.streamUploadVariant = 0;
                this.streamSpare = null;
            }
            this.streamPending.advance(32);
            candidates += 32;
            if (!this.streamPending.done) continue;
            const job = this.streamPending;
            const key = `${job.patchX}:${job.patchZ}`;
            if (!job.count) {
                this.emptyPatches.add(key);
                this.cancelPending();
                continue;
            }
            const variant = geometry.variants?.[this.streamUploadVariant];
            const count = variant ? job.variantCounts?.[this.streamUploadVariant] ?? 0 : job.count;
            if (!count) {
                this.streamUploadVariant++;
                if (geometry.variants && this.streamUploadVariant >= geometry.variants.length) {
                    this.streamSpare = { near: job.nearBuffer, mid: job.midBuffer };
                    this.streamPending = null;
                }
                continue;
            }
            const patch: GrassPatch = this.streamReserved ?? (variant ? this.streamPool.pop() : null) ?? {
                x: 0, z: 0, instances: 0,
                near: new Mesh('grass-stream-near', this.scene), mid: new Mesh('grass-stream-mid', this.scene),
                nearTriangles: 0, midTriangles: 0,
            };
            patch.x = (job.patchX + .5) * PATCH_SIZE; patch.z = (job.patchZ + .5) * PATCH_SIZE;
            patch.instances = count;
            patch.nearTriangles = variant?.nearTriangles ?? geometry.nearTriangles;
            patch.midTriangles = variant?.midTriangles ?? geometry.midTriangles;
            let nearBuffer = job.nearBuffer, midBuffer = job.midBuffer;
            if (variant) {
                nearBuffer = patch.nearBuffer && patch.nearBuffer.length >= count * 16 ? patch.nearBuffer : new Float32Array(Math.ceil(count * 1.2 / 256) * 256 * 16);
                midBuffer = nearBuffer;
                let destination = 0;
                for (let source = 0; source < job.count; source++) {
                    if (job.variantIndices?.[source] !== this.streamUploadVariant) continue;
                    for (let component = 0; component < 16; component++) nearBuffer[destination++] = job.nearBuffer[source * 16 + component];
                }
            }
            const maxHeight = variant ? job.variantMaxHeights?.[this.streamUploadVariant] ?? job.maxHeight : job.maxHeight;
            const maxWidth = variant ? job.variantMaxWidths?.[this.streamUploadVariant] ?? job.maxWidth : job.maxWidth;
            const spread = (variant?.radius ?? geometry.radius) * Math.max(maxHeight, maxWidth);
            // Pitch/roll are within 10 degrees each. Include their horizontal
            // displacement and vertical movement, then add shader bend at update.
            const lean = maxHeight * .35;
            const padding = spread + lean + .05;
            patch.boundsMinimum = new Vector3(job.patchX * PATCH_SIZE - padding, job.minY - spread * .35 - .05, job.patchZ * PATCH_SIZE - padding);
            patch.boundsMaximum = new Vector3((job.patchX + 1) * PATCH_SIZE + padding, job.maxY + maxHeight + spread * .35 + .05, (job.patchZ + 1) * PATCH_SIZE + padding);
            patch.boundsPadding = undefined;
            const uploadStarted = performance.now();
            for (const [mesh, data, buffer, oldBuffer, material, label] of [
                [patch.near, variant?.near ?? geometry.near, nearBuffer, patch.nearBuffer, this.nearMaterial, 'near'],
                [patch.mid, variant?.mid ?? geometry.mid, midBuffer, patch.midBuffer, variant?.midMaterial ?? this.midMaterial, 'mid'],
            ] as const) {
                mesh.name = `grass:${job.patchX}:${job.patchZ}:${label}${variant ? `:${variant.name}` : ''}`;
                mesh.doNotSyncBoundingInfo = true;
                // Movement changes placements, not blade geometry. Retain the
                // GPU vertex/index buffers and bindings when recycling a patch.
                const previousGeometry = label === 'near' ? patch.nearGeometry : patch.midGeometry;
                if (previousGeometry !== data) data.applyToMesh(mesh);
                mesh.material = material; mesh.isPickable = false;
                mesh.freezeWorldMatrix();
                // Avoid Babylon's repeated scans over every matrix for bounds.
                if (buffer === oldBuffer) {
                    // Babylon uploads only thinInstanceCount matrices. A pooled
                    // patch can gain blades, so set the new count before upload.
                    mesh.thinInstanceCount = count;
                    mesh.thinInstanceBufferUpdated('matrix');
                } else mesh.thinInstanceSetBuffer('matrix', buffer, 16, false);
                mesh.thinInstanceCount = count;
                mesh.setBoundingInfo(new BoundingInfo(
                    patch.boundsMinimum, patch.boundsMaximum,
                ));
                mesh.setEnabled(false);
            }
            patch.nearBuffer = nearBuffer; patch.midBuffer = midBuffer;
            patch.nearGeometry = variant?.near ?? geometry.near; patch.midGeometry = variant?.mid ?? geometry.mid;
            patch.baseMidMaterial = variant?.midMaterial ?? this.midMaterial;
            this.streamingStats.uploadMs = performance.now() - uploadStarted;
            const tile = this.streamReady.get(key) ?? { patches: [], visible: false };
            tile.patches.push(patch); patch.tile = tile;
            this.streamReady.set(key, tile); this.patches.push(patch);
            this.streamUploadVariant++;
            if (!geometry.variants || this.streamUploadVariant >= geometry.variants.length) {
                if (geometry.variants) this.streamSpare = { near: job.nearBuffer, mid: job.midBuffer };
                this.streamPending = null; this.streamReserved = null;
            }
            return;
        }
    }

    /** Selects patch LODs and updates shared wind/interaction uniforms. */
    public update(context: GrassUpdateContext): void {
        const started = performance.now();
        this.streamingStats.uploadMs = 0;
        this.streamingStats.staticDraws = 0;
        const centreX = Math.floor(context.cameraPosition.x / PATCH_SIZE) * PATCH_SIZE;
        const centreZ = Math.floor(context.cameraPosition.z / PATCH_SIZE) * PATCH_SIZE;
        const moved = this.options.streaming && (this.centre.x !== centreX || this.centre.y !== centreZ);
        if (moved && !this.streamingPaused) this.centre.set(centreX, centreZ);
        const geometryKey = this.geometryKey();
        if (this.builtDensity !== this.settings.density || this.builtGeometryKey !== geometryKey) this.rebuild();
        else if (!this.streamingPaused && (moved || this.options.streaming && this.streamRange !== this.visibleDistance())) this.rebuild(true);
        if (this.options.streaming) this.processStreamingQueue();
        let deferred = 0;
        if (this.options.isTileInView) for (const request of this.streamQueue) {
            if (!this.options.isTileInView(request.x * PATCH_SIZE, request.z * PATCH_SIZE, PATCH_SIZE)) deferred++;
        }
        this.streamingStats.deferred = deferred;
        this.streamingStats.queued = this.streamQueue.length - deferred + (this.streamPending ? 1 : 0);
        const visualization = { final: 0, lod: 1, biome: 2, patches: 3 }[this.settings.visualization];
        const time = this.settings.freezeWind ? 0 : context.elapsedSeconds * this.settings.windSpeed;
        this.impactData.fill(0);
        const impactCount = this.settings.interaction ? Math.min(context.impacts.length, MAX_IMPACTS) : 0;
        let bendPadding = Math.hypot(.78, .32) * Math.abs(this.settings.windStrength) + .02;
        if ((context.surfSegmentCount ?? 0) > 0) bendPadding += this.settings.bladeHeight * 1.35;
        for (let i = 0; i < impactCount; i++) {
            const impact = context.impacts[i];
            const offset = i * 4;
            this.impactData[offset] = impact.position.x;
            this.impactData[offset + 1] = impact.position.z;
            this.impactData[offset + 2] = Math.max(.01, impact.radius);
            this.impactData[offset + 3] = impact.strength;
            bendPadding += Math.abs(impact.strength);
        }
        this.rootColor.set(...this.settings.rootColor);
        this.tipColor.set(...this.settings.tipColor);
        this.windUniform.set(this.settings.windStrength, this.settings.windSpeed);
        const windDistance = Math.max(0, this.settings.windDistance ?? 0);
        this.windFade.set(windDistance * 2 / 3, windDistance);
        const windCamera = context.windCameraPosition ?? context.cameraPosition;
        for (const material of [this.nearMaterial, this.midMaterial]) {
            material.setFloat('time', time);
            material.setVector2('wind', this.windUniform);
            material.setVector2('windFade', this.windFade);
            material.setVector3('windCameraPosition', windCamera);
            material.setVector3('cameraPosition', context.cameraPosition);
            material.setFloat('interactionEnabled', this.settings.interaction ? 1 : 0);
            material.setFloat('impactCount', impactCount);
            material.setArray4('impactData', this.impactData as unknown as number[]);
            material.setFloat('visualization', visualization);
            material.setColor3('rootColor', this.rootColor);
            material.setColor3('tipColor', this.tipColor);
        }
        for (const material of this.mixedMaterials.values()) {
            material.setFloat('time', time);
            material.setVector2('wind', this.windUniform);
            material.setVector2('windFade', this.windFade);
            material.setVector3('windCameraPosition', windCamera);
            material.setVector3('cameraPosition', context.cameraPosition);
            material.setFloat('interactionEnabled', this.settings.interaction ? 1 : 0);
            material.setFloat('impactCount', impactCount);
            material.setArray4('impactData', this.impactData as unknown as number[]);
            material.setFloat('visualization', visualization);
            material.setColor3('rootColor', this.rootColor);
            material.setColor3('tipColor', this.tipColor);
        }
        this.nearMaterial.setFloat('colorScale', 1);
        const distanceLod = this.settings.lodEnabled;
        const distantLod = this.distantLodActive();
        this.nearMaterial.setFloat('lodKind', distanceLod || this.settings.singleLod === 1 ? 0 : 1);
        this.midMaterial.setFloat('colorScale', this.midColorScale);
        Object.assign(this.stats, { visiblePatches: 0, nearInstances: 0, midInstances: 0, triangles: 0, draws: 0 });
        for (const tile of this.streamReady.values()) tile.visible = false;
        for (const patch of this.patches) {
            this.updatePatchBounds(patch, this.settings.tightGrassBounds === false ? Math.max(14, bendPadding) : bendPadding);
            const distance = Math.hypot(patch.x - context.cameraPosition.x, patch.z - context.cameraPosition.z);
            const inView = !this.options.isMeshInView || this.options.isMeshInView(patch.near);
            const nearVisible = this.settings.enabled && inView && distance <= (distanceLod ? this.settings.nearDistance : this.settings.farDistance);
            let midVisible = this.settings.enabled && inView && (
                distanceLod && distance > this.settings.nearDistance && distance <= this.settings.farDistance ||
                distantLod && distance > this.settings.farDistance && distance <= this.visibleDistance()
            );
            let midInstances = patch.instances;
            if (distantLod && distance > this.settings.farDistance) {
                const t = Math.min(1, (distance - this.settings.farDistance) / (this.visibleDistance() - this.settings.farDistance));
                const blend = t * t * (3 - 2 * t);
                const edgeDensity = Math.max(0, Math.min(1, this.settings.distantGrassDensity ?? 1));
                midInstances = Math.floor(patch.instances * (1 - blend * (1 - edgeDensity)));
            }
            midVisible = midVisible && midInstances > 0;
            let staticGrass = false;
            if (nearVisible || midVisible) {
                staticGrass = canUseStaticGrass(patch.x, patch.z, windCamera, windDistance, this.settings.interaction ? context.impacts : NO_IMPACTS) && !((context.surfSegmentCount ?? 0) > 0 && distance < 60);
                if (staticGrass) this.streamingStats.staticDraws++;
                const nearMaterial = this.materialForWind(this.nearMaterial, staticGrass);
                const midMaterial = this.materialForWind(patch.baseMidMaterial ?? this.midMaterial, staticGrass);
                if (patch.near.material !== nearMaterial) patch.near.material = nearMaterial;
                if (patch.mid.material !== midMaterial) patch.mid.material = midMaterial;
            }
            patch.mid.thinInstanceCount = midInstances;
            patch.near.setEnabled(nearVisible);
            patch.mid.setEnabled(midVisible);
            this.options.syncMesh?.(patch.near, nearVisible, distance, staticGrass);
            this.options.syncMesh?.(patch.mid, midVisible, distance, staticGrass);
            if (nearVisible) {
                if (!patch.tile || !patch.tile.visible) this.stats.visiblePatches++;
                if (patch.tile) patch.tile.visible = true;
                this.stats.nearInstances += patch.instances;
                this.stats.triangles += patch.instances * patch.nearTriangles;
                this.stats.draws++;
            } else if (midVisible) {
                if (!patch.tile || !patch.tile.visible) this.stats.visiblePatches++;
                if (patch.tile) patch.tile.visible = true;
                this.stats.midInstances += midInstances;
                this.stats.triangles += midInstances * patch.midTriangles;
                this.stats.draws++;
            }
        }
        for (const [source, material] of this.staticMaterials) {
            material.setVector3('cameraPosition', context.cameraPosition);
            material.setFloat('visualization', visualization);
            material.setFloat('lodKind', source === this.nearMaterial ? (distanceLod || this.settings.singleLod === 1 ? 0 : 1) : 1);
            material.setFloat('colorScale', source === this.midMaterial ? this.midColorScale : this.materialColorScales.get(source) ?? 1);
            material.setColor3('rootColor', this.rootColor); material.setColor3('tipColor', this.tipColor);
        }
        for (const material of this.materials) this.options.updateMaterial?.(material, context);
        this.stats.updateMs = performance.now() - started;
    }

    public dispose(): void {
        this.cancelPending();
        for (const patch of this.patches) { patch.near.dispose(); patch.mid.dispose(); }
        for (const patch of this.streamPool) { patch.near.dispose(); patch.mid.dispose(); }
        this.streamReady.clear(); this.streamQueue.length = 0; this.streamPool.length = 0; this.patches.length = 0;
        this.streamSpare = null; this.streamGeometry = null; this.streamWanted.clear(); this.emptyPatches.clear();
        this.nearTemplate.dispose(); this.midTemplate.dispose();
        this.nearMaterial.dispose(); this.midMaterial.dispose();
        for (const material of this.mixedMaterials.values()) material.dispose();
        this.mixedMaterials.clear();
        for (const material of this.staticMaterials.values()) material.dispose();
        this.staticMaterials.clear(); this.materialColorScales.clear(); this.materials.length = 0;
    }
}
