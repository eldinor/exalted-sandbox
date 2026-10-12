/** Production adapter for the shared Grassland renderer. */
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import { flowerSettings, flowerSamplers, meadowFlowerColonyAt, loadMeadowFlowers, type MeadowFlowerFamily } from '../grass/MeadowFlowers.ts';
import type { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Vector2, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { Frustum } from '@babylonjs/core/Maths/math.frustum';
import '@babylonjs/core/Culling/ray';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import type { Scene } from '@babylonjs/core/scene';
import { GrassSystem } from '../grass/GrassSystem.ts';
import { loadImportedGrass, type ImportedGrassPrototype } from '../grass/ImportedGrass.ts';
import { worldGrassSettings } from '../grass/WorldGrassSettings.ts';
import { createAuthoredGrassSamplers } from '../grass/AuthoredGrassSamplers.ts';
import { grassInteractionAllowed, MAX_GRASS_SURF_SEGMENTS } from '../grass/GrassInteraction.ts';
import type { GrassSettings, GrassImpact, GrassUpdateContext } from '../grass/grassTypes.ts';
import { ExaltedWorld } from '../terrain/exaltedWorld.ts';
import { S } from '../core/settings.ts';
import { bindMatrixArray, whenReady } from '../core/gpuUtil.ts';
import type { Terrain } from '../terrain/terrain.ts';
import type { Sky } from '../render/sky.ts';
import type { ShadowSystem } from '../render/shadows.ts';
import type { DepthPass } from '../render/depthPass.ts';
import type { CharacterController } from '../character/controller.ts';
import type { SurfWake } from '../vfx/surfWake.ts';
import type { SpellLights } from '../spells/spellLights.ts';

type GrassPass = 'GRASS_PREPASS';
interface MeshPasses { staticGrass: boolean; }


const UNIFORMS = ['world','viewProjection','lightViewProjection','time','wind','windFade','windDirection',
    'windCameraPosition','cameraPosition','interactionEnabled','impactCount','impactData','surfSegmentCount','surfSegments','surfBounds',
    'visualization','lodKind','colorScale','rootColor','tipColor','flowerGamma','flowerCutoff','sunDir','sunRadiance','shR','cascadeMatrices',
    'cascadeSplits','cascadeParams','shadowTexel','shadowSoftness','shadowBias','ambientIntensity','fogDensity',
    'fogHeightFalloff','fogStart','aerialStrength','spellLightPos','spellLightCol','spellLightCount'];

export class WorldGrass {
    private readonly viewPlanes = Frustum.GetPlanes(Matrix.Identity());
    private viewReady = false;
    private readonly tileMinimum = new Vector3();
    private readonly tileMaximum = new Vector3();
    readonly settings: GrassSettings;
    private flowerTexture: BaseTexture | null = null;
    readonly renderer: GrassSystem;
    readonly grassWeightAt: (x: number, z: number) => number;
    private readonly passMaterials: ShaderMaterial[] = [];
    private readonly passCache = new Map<string, ShaderMaterial>();
    private readonly registered = new Map<Mesh, MeshPasses>();
    private readonly splits = new Vector4();
    private readonly wind = new Vector2();
    private readonly windFade = new Vector2(40, 60);
    private readonly impactData = new Float32Array(32);
    private readonly surfBounds = new Vector4();
    private readonly surfSegments = new Float32Array(MAX_GRASS_SURF_SEGMENTS * 8);
    private readonly impact: GrassImpact = { position: new Vector3(), radius: 2.4, strength: 0 };
    private readonly impacts = [this.impact];
    private readonly context: GrassUpdateContext & { windCameraPosition: Vector3; windDirection: Vector2; surfSegmentCount: number } = {
        cameraPosition: new Vector3(), windCameraPosition: new Vector3(), elapsedSeconds: 0,
        impacts: this.impacts, windDirection: new Vector2(), surfSegments: this.surfSegments, surfSegmentCount: 0,
    };
    private disposed = false;
    private warmUpGeometry: VertexData | null = null;
    private readonly warmUpMeshes: Mesh[] = [];

    constructor(private readonly scene: Scene, private readonly terrain: Terrain, private readonly sky: Sky,
        private readonly shadows: ShadowSystem, private readonly depth: DepthPass,
        private readonly flowerFamily?: MeadowFlowerFamily, private readonly thinFlowerColonies = false,
        private readonly layerEnabled?: () => boolean) {
        this.settings = flowerFamily ? flowerSettings(flowerFamily) : worldGrassSettings();
        const world = terrain.heightfield;
        if (!(world instanceof ExaltedWorld) || !world.surface) throw new Error('Grass requires loaded authored terrain.');
        const baseSamplers = createAuthoredGrassSamplers(world.surface, world.biomeSurface ?? undefined, (x, z, height) => {
            const water = terrain.water?.sample(x, z);
            return !!water && water.level > height;
        });
        this.grassWeightAt = baseSamplers.grassWeightAt;
        const samplers = flowerFamily ? flowerSamplers(baseSamplers, flowerFamily.seed) : {
            ...baseSamplers, densityWeightAt: (x: number,z: number) =>
                this.thinFlowerColonies ? 1 - .35 * meadowFlowerColonyAt(x,z) : 1,
        };
        this.renderer = new GrassSystem(scene, samplers, this.settings, new Vector2(), 320, {
            importedOnly: true, streaming: true,
            isMeshInView: mesh => !this.viewReady || mesh.getBoundingInfo().isInFrustum(this.viewPlanes),
            isTileInView: (x, z, size) => this.tileInView(x, z, size),
            createMaterial: (name, lod, staticGrass) => this.makeMaterial(name, lod, staticGrass),
            updateMaterial: (material, context) => this.bindMaterial(material, context),
            syncMesh: (mesh, visible, _distance, staticGrass) => this.syncMesh(mesh, visible, staticGrass),
        });
        scene.onDisposeObservable.add(() => this.dispose());
    }

    get stats() { return this.renderer.stats; }
    get streamingStats() { return this.renderer.streamingStats; }

    async load(): Promise<void> {
        let prototypes: Map<string, ImportedGrassPrototype>;
        if (this.flowerFamily) {
            const loaded = await loadMeadowFlowers(this.scene, this.flowerFamily);
            prototypes = loaded.prototypes; this.flowerTexture = loaded.texture;
            for (const material of this.renderer.materials) {
                material.setTexture('flowerAlbedo', this.flowerTexture);
                material.setFloat('flowerGamma', this.flowerTexture.gammaSpace ? 2.2 : 1);
            }
        } else prototypes = await loadImportedGrass(this.scene);
        this.warmUpGeometry = prototypes.get(this.flowerFamily?.mix[0].variant ?? 'grass_medium_01_small_a_LOD1')?.geometry ?? null;
        this.renderer.setImportedPrototypes(prototypes);
        this.renderer.prepareStaticMaterials();
        for (const staticGrass of [false, true]) {
            this.passMaterial('GRASS_PREPASS', staticGrass);
        }
    }

    private makeMaterial(name: string, lod: number, staticGrass: boolean, pass?: GrassPass): ShaderMaterial {
        const material = new ShaderMaterial(`world-${this.flowerFamily?.id ?? 'grass'}:${name}`, this.scene, 'worldGrass', {
            shaderLanguage: ShaderLanguage.WGSL,
            attributes: ['position','normal', ...(this.flowerFamily ? ['uv'] : [])],
            uniforms: UNIFORMS.slice(),
            samplers: ['skyLUT','cascade0','cascade1','cascade2', ...(this.flowerFamily ? ['flowerAlbedo'] : [])],
            defines: ['#define GRASS_PRODUCTION', ...(this.flowerFamily ? ['#define MEADOW_FLOWERS'] : []), ...(staticGrass ? ['#define GRASS_STATIC'] : []), ...(pass ? [`#define ${pass}`] : [])],
        });
        material.backFaceCulling = false;
        if (this.flowerFamily) material.setFloat('flowerCutoff', this.flowerFamily.alphaCutoff);
        if (this.flowerTexture) {
            material.setTexture('flowerAlbedo', this.flowerTexture);
            material.setFloat('flowerGamma', this.flowerTexture.gammaSpace ? 2.2 : 1);
        }
        material.setFloat('lodKind', lod);
        material.setFloat('spellLightCount', 0);
        material.setArray4('spellLightPos', new Array<number>(16).fill(0));
        material.setArray4('spellLightCol', new Array<number>(16).fill(0));
        material.setTexture('skyLUT', this.sky.lut);
        for (let cascade = 0; cascade < 3; cascade++) material.setTexture(`cascade${cascade}`, this.shadows.maps[cascade]);
        return material;
    }

    private passMaterial(pass: GrassPass, staticGrass: boolean): ShaderMaterial {
        const key = `${pass}:${staticGrass}`;
        let material = this.passCache.get(key);
        if (!material) {
            material = this.makeMaterial(key, 0, staticGrass, pass);
            this.passCache.set(key, material);
            this.passMaterials.push(material);
        }
        return material;
    }

    private unregister(mesh: Mesh): void {
        this.depth.unregisterCaster(mesh);
        this.registered.delete(mesh);
    }

    private syncMesh(mesh: Mesh, visible: boolean, staticGrass: boolean): void {
        mesh.renderingGroupId = 1;
        if (this.flowerFamily && mesh.name.startsWith('grass:')) mesh.name = mesh.name.replace('grass:', this.flowerFamily.id + ':');
        const previous = this.registered.get(mesh);
        if (!visible) { if (previous) this.unregister(mesh); return; }
        if (previous && previous.staticGrass === staticGrass) return;
        if (previous) this.unregister(mesh);
        else if (!mesh.metadata?.grassDisposeHook) {
            mesh.metadata = { ...mesh.metadata, grassDisposeHook: true };
            mesh.onDisposeObservable.add(() => this.unregister(mesh));
        }
        this.depth.registerCaster(mesh, this.passMaterial('GRASS_PREPASS', staticGrass));
        this.registered.set(mesh, { staticGrass });
    }

    private bindMaterial(material: ShaderMaterial, context: GrassUpdateContext): void {
        material.setVector3('cameraPosition', context.windCameraPosition ?? context.cameraPosition);
        material.setVector3('windCameraPosition', context.windCameraPosition ?? context.cameraPosition);
        material.setVector2('windDirection', this.context.windDirection);
        material.setFloat('time', this.settings.freezeWind ? 0 : context.elapsedSeconds * this.settings.windSpeed);
        this.wind.set(this.settings.windStrength, this.settings.windSpeed);
        material.setVector2('wind', this.wind);
        const windDistance = Math.max(0, this.settings.windDistance ?? 0);
        this.windFade.set(windDistance * 2 / 3, windDistance);
        material.setVector2('windFade', this.windFade);
        material.setFloat('interactionEnabled', this.settings.interaction ? 1 : 0);
        this.impactData.fill(0);
        const impact = this.impact;
        this.impactData[0] = impact.position.x; this.impactData[1] = impact.position.z;
        this.impactData[2] = impact.radius; this.impactData[3] = impact.strength;
        material.setFloat('impactCount', impact.strength > .001 && this.settings.interaction ? 1 : 0);
        material.setArray4('impactData', this.impactData as unknown as number[]);
        material.setFloat('surfSegmentCount', this.settings.interaction ? context.surfSegmentCount ?? 0 : 0);
        material.setArray4('surfSegments', this.surfSegments as unknown as number[]);
        material.setVector4('surfBounds', this.surfBounds);
        material.setVector3('sunDir', this.sky.sunDir); material.setColor3('sunRadiance', this.sky.sunRadiance);
        material.setArray4('shR', this.sky.sh as unknown as number[]);
        bindMatrixArray(material, 'cascadeMatrices', this.shadows.matrixData);
        this.splits.set(this.shadows.splits[0], this.shadows.splits[1], this.shadows.splits[2], this.shadows.splits[3]);
        material.setVector4('cascadeSplits', this.splits);
        material.setArray4('cascadeParams', this.shadows.paramData as unknown as number[]);
        material.setFloat('shadowTexel', this.shadows.texelSize);
        material.setFloat('shadowSoftness', 1.5); material.setFloat('shadowBias', .018);
        material.setFloat('ambientIntensity', S.ambientIntensity);
        material.setFloat('fogDensity', S.fogDensity); material.setFloat('fogHeightFalloff', S.fogHeightFalloff);
        material.setFloat('fogStart', S.fogStart); material.setFloat('aerialStrength', S.aerialStrength);
    }

    private tileInView(x: number, z: number, size: number): boolean {
        if (!this.viewReady) return true;
        // Unknown placements use the whole terrain's vertical range, avoiding
        // rejection of grass on hills. Final meshes use their tighter bent bounds.
        this.tileMinimum.set(x - 4, this.terrain.heightfield.minHeight - 4, z - 4);
        this.tileMaximum.set(x + size + 4, this.terrain.heightfield.maxHeight + 8, z + size + 4);
        for (const plane of this.viewPlanes) {
            const n = plane.normal;
            const farthest = n.x * (n.x >= 0 ? this.tileMaximum.x : this.tileMinimum.x)
                + n.y * (n.y >= 0 ? this.tileMaximum.y : this.tileMinimum.y)
                + n.z * (n.z >= 0 ? this.tileMaximum.z : this.tileMinimum.z) + plane.d;
            if (farthest < 0) return false;
        }
        return true;
    }

    update(dt: number, camera: Vector3, character: CharacterController, wake: SurfWake, lights: SpellLights, streamingFocus?: Vector3): void {
        const activeCamera = this.scene.activeCamera;
        this.viewReady = !!activeCamera;
        if (activeCamera) {
            activeCamera.getViewMatrix();
            activeCamera.getProjectionMatrix();
            Frustum.GetPlanesToRef(activeCamera.getTransformationMatrix(), this.viewPlanes);
            // Small view guard covers temporal jitter and changes at patch edges.
            for (const plane of this.viewPlanes) plane.d += 2;
        }
        const allowed = !streamingFocus && grassInteractionAllowed(character.flight.active, character.rocketJump.active,
            character.swimming.active, character.position.y, this.terrain.heightAt(character.position.x, character.position.z));
        const target = allowed ? this.settings.interactionStrength * (1 - character.surf) : 0;
        this.impact.strength = allowed ? this.impact.strength + (target - this.impact.strength) * (1 - Math.exp(-18 * dt)) : 0;
        this.impact.position.copyFrom(character.position);
        this.impact.radius = this.settings.interactionRadius;
        this.context.elapsedSeconds += dt;
        this.context.cameraPosition.copyFrom(streamingFocus ?? character.position);
        this.context.windCameraPosition.copyFrom(camera);
        const angle = S.windDirection * Math.PI / 180;
        this.context.windDirection.set(Math.sin(angle), Math.cos(angle));
        this.settings.windStrength = (this.flowerFamily ? .07 : .3) * S.windStrength;
        this.context.surfSegmentCount = allowed && this.settings.interaction ? wake.copyInteractionSegments(this.surfSegments) : 0;
        let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
        for (let endpoint = 0; endpoint < this.context.surfSegmentCount * 2; endpoint++) {
            const offset = endpoint * 4, x = this.surfSegments[offset], z = this.surfSegments[offset + 2];
            minX = Math.min(minX, x); minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x); maxZ = Math.max(maxZ, z);
        }
        if (this.context.surfSegmentCount) this.surfBounds.set(minX - 2.4, minZ - 2.4, maxX + 2.4, maxZ + 2.4);
        else this.surfBounds.set(0, 0, 0, 0);
        const enabled = this.settings.enabled;
        if (this.layerEnabled) this.settings.enabled = enabled && this.layerEnabled();
        try { this.renderer.update(this.context); } finally { this.settings.enabled = enabled; }
        for (const material of this.renderer.materials) lights.apply(material);
        for (const material of this.passMaterials) this.bindMaterial(material, this.context);
    }

    reset(): void { this.impact.strength = 0; this.context.surfSegmentCount = 0; this.surfSegments.fill(0); this.surfBounds.set(0, 0, 0, 0); }

    async warmUp(): Promise<void> {
        // isReady compiles shader modules, but WebGPU render pipelines are only
        // built by actual draws. Leave every variant standing through main's
        // loading-screen frames, even when the initial spawn contains no grass.
        const geometry = this.warmUpGeometry;
        if (!geometry) throw new Error('Missing grass warm-up prototype.');
        const camera = this.scene.activeCamera;
        if (!camera) throw new Error('Grass warm-up requires an active camera.');
        this.finishWarmUp();
        const position = camera.getForwardRay(3).direction.scale(3).add(camera.globalPosition);
        const matrix = Matrix.Scaling(.1, .1, .1).setTranslation(position);
        try {
            for (const material of this.renderer.materials) {
                const probe = new Mesh(`grass-warm-up:${material.name}`, this.scene);
                this.warmUpMeshes.push(probe);
                geometry.applyToMesh(probe);
                probe.thinInstanceSetBuffer('matrix', Float32Array.from(matrix.m), 16, false);
                probe.material = material;
                probe.alwaysSelectAsActiveMesh = true;
                this.syncMesh(probe, true, material.options.defines?.includes('#define GRASS_STATIC') ?? false);
                this.bindMaterial(material, this.context);
                await whenReady(material, material.name, [probe, true]);
            }
            for (const material of this.passMaterials) {
                this.bindMaterial(material, this.context);
                const probe = this.warmUpMeshes.find(mesh =>
                    this.registered.get(mesh)?.staticGrass === material.options.defines?.includes('#define GRASS_STATIC'));
                if (probe) await whenReady(material, material.name, [probe, true]);
            }
        } catch (error) { this.finishWarmUp(); throw error; }
    }

    /** Remove probes only after the real loading-screen frames have submitted. */
    finishWarmUp(): void {
        for (const mesh of this.warmUpMeshes) mesh.dispose();
        this.warmUpMeshes.length = 0;
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.finishWarmUp();
        for (const mesh of this.registered.keys()) this.unregister(mesh);
        this.renderer.dispose();
        for (const material of this.passMaterials) material.dispose();
        this.passMaterials.length = 0; this.passCache.clear(); this.warmUpGeometry = null;
        this.flowerTexture?.dispose(); this.flowerTexture = null;
    }
}
