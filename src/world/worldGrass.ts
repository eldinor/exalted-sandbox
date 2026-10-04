/** Production adapter for the shared Grassland renderer. */
import type { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Vector2, Vector3, Vector4 } from '@babylonjs/core/Maths/math.vector';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import type { Scene } from '@babylonjs/core/scene';
import { GrassSystem } from '../grass/GrassSystem.ts';
import { loadImportedGrass } from '../grass/ImportedGrass.ts';
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
    'visualization','lodKind','colorScale','rootColor','tipColor','sunDir','sunRadiance','shR','cascadeMatrices',
    'cascadeSplits','cascadeParams','shadowTexel','shadowSoftness','shadowBias','ambientIntensity','fogDensity',
    'fogHeightFalloff','fogStart','aerialStrength','spellLightPos','spellLightCol','spellLightCount'];

export class WorldGrass {
    readonly settings = worldGrassSettings();
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

    constructor(private readonly scene: Scene, private readonly terrain: Terrain, private readonly sky: Sky,
        private readonly shadows: ShadowSystem, private readonly depth: DepthPass) {
        const world = terrain.heightfield;
        if (!(world instanceof ExaltedWorld) || !world.surface) throw new Error('Grass requires loaded authored terrain.');
        const samplers = createAuthoredGrassSamplers(world.surface, world.biomeSurface ?? undefined, (x, z, height) => {
            const water = terrain.water?.sample(x, z);
            return !!water && water.level > height;
        });
        this.grassWeightAt = samplers.grassWeightAt;
        this.renderer = new GrassSystem(scene, samplers, this.settings, new Vector2(), 320, {
            importedOnly: true, streaming: true,
            createMaterial: (name, lod, staticGrass) => this.makeMaterial(name, lod, staticGrass),
            updateMaterial: (material, context) => this.bindMaterial(material, context),
            syncMesh: (mesh, visible, _distance, staticGrass) => this.syncMesh(mesh, visible, staticGrass),
        });
        scene.onDisposeObservable.add(() => this.dispose());
    }

    get stats() { return this.renderer.stats; }
    get streamingStats() { return this.renderer.streamingStats; }

    async load(): Promise<void> {
        const prototypes = await loadImportedGrass(this.scene);
        this.warmUpGeometry = prototypes.get('grass_medium_01_small_a_LOD1')?.geometry ?? null;
        this.renderer.setImportedPrototypes(prototypes);
        this.renderer.prepareStaticMaterials();
        for (const staticGrass of [false, true]) {
            this.passMaterial('GRASS_PREPASS', staticGrass);
        }
    }

    private makeMaterial(name: string, lod: number, staticGrass: boolean, pass?: GrassPass): ShaderMaterial {
        const material = new ShaderMaterial(`world-grass:${name}`, this.scene, 'worldGrass', {
            shaderLanguage: ShaderLanguage.WGSL,
            attributes: ['position','normal'],
            uniforms: UNIFORMS.slice(),
            samplers: ['skyLUT','cascade0','cascade1','cascade2'],
            defines: ['#define GRASS_PRODUCTION', ...(staticGrass ? ['#define GRASS_STATIC'] : []), ...(pass ? [`#define ${pass}`] : [])],
        });
        material.backFaceCulling = false;
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

    update(dt: number, camera: Vector3, character: CharacterController, wake: SurfWake, lights: SpellLights): void {
        const allowed = grassInteractionAllowed(character.flight.active, character.rocketJump.active,
            character.swimming.active, character.position.y, this.terrain.heightAt(character.position.x, character.position.z));
        const target = allowed ? this.settings.interactionStrength * (1 - character.surf) : 0;
        this.impact.strength = allowed ? this.impact.strength + (target - this.impact.strength) * (1 - Math.exp(-18 * dt)) : 0;
        this.impact.position.copyFrom(character.position);
        this.impact.radius = this.settings.interactionRadius;
        this.context.elapsedSeconds += dt;
        this.context.cameraPosition.copyFrom(character.position);
        this.context.windCameraPosition.copyFrom(camera);
        const angle = S.windDirection * Math.PI / 180;
        this.context.windDirection.set(Math.sin(angle), Math.cos(angle));
        this.settings.windStrength = .3 * S.windStrength;
        this.context.surfSegmentCount = allowed && this.settings.interaction ? wake.copyInteractionSegments(this.surfSegments) : 0;
        let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
        for (let endpoint = 0; endpoint < this.context.surfSegmentCount * 2; endpoint++) {
            const offset = endpoint * 4, x = this.surfSegments[offset], z = this.surfSegments[offset + 2];
            minX = Math.min(minX, x); minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x); maxZ = Math.max(maxZ, z);
        }
        if (this.context.surfSegmentCount) this.surfBounds.set(minX - 2.4, minZ - 2.4, maxX + 2.4, maxZ + 2.4);
        else this.surfBounds.set(0, 0, 0, 0);
        this.renderer.update(this.context);
        for (const material of this.renderer.materials) lights.apply(material);
        for (const material of this.passMaterials) this.bindMaterial(material, this.context);
    }

    reset(): void { this.impact.strength = 0; this.context.surfSegmentCount = 0; this.surfSegments.fill(0); this.surfBounds.set(0, 0, 0, 0); }

    async warmUp(): Promise<void> {
        // Compile every LOD/static/pass variant even if the initial spawn contains no grass.
        const geometry = this.warmUpGeometry;
        if (!geometry) throw new Error('Missing grass warm-up prototype.');
        const probe = new Mesh('grass-warm-up', this.scene);
        try {
            geometry.applyToMesh(probe);
            probe.thinInstanceSetBuffer('matrix', Float32Array.from(Matrix.Identity().m), 16, false);
            probe.setEnabled(false);
            for (const material of this.renderer.materials) {
                this.bindMaterial(material, this.context);
                await whenReady(material, material.name, [probe, true]);
            }
            for (const material of this.passMaterials) {
                this.bindMaterial(material, this.context);
                await whenReady(material, material.name, [probe, true]);
            }
        } finally { probe.dispose(); }
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const mesh of this.registered.keys()) this.unregister(mesh);
        this.renderer.dispose();
        for (const material of this.passMaterials) material.dispose();
        this.passMaterials.length = 0; this.passCache.clear(); this.warmUpGeometry = null;
    }
}
