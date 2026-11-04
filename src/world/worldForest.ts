/** Limited authored-world experiment: dense, inaccessible eastern pines. */
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Scene } from '@babylonjs/core/scene';
import type { Terrain } from '../terrain/terrain.ts';
import { ExaltedWorld } from '../terrain/exaltedWorld.ts';
import type { Sky } from '../render/sky.ts';
import type { ShadowSystem } from '../render/shadows.ts';
import type { DepthPass } from '../render/depthPass.ts';
import { whenReady } from '../core/gpuUtil.ts';
import { loadPinePack, type PinePrototype } from '../forest/PinePack.ts';
import { pineGroundHeight } from '../forest/PineGrounding.ts';
import { OPEN_FOREST, OPEN_FOREST_MIX, placeOpenForest } from '../forest/OpenForestPlacement.ts';
import { forestOverlookGroundWeight } from '../terrain/forestGroundCoverage.ts';
import type { MapPropSnapshot } from '../ui/mapPropSnapshot.ts';
import { writeImpostorCard } from '../forest/ImpostorBatchGeometry.ts';
import { DENSE_FOREST_EDGE } from '../forest/DenseForestShape.ts';
import { loadFirPack } from '../forest/FirPack.ts';
import { FOREST_FRINGE, createForestBush, placeForestFringe } from '../forest/ForestFringe.ts';
import { BIG_TREE_DENSITY, thinBigTrees } from '../forest/BigTreeDensity.ts';
import { ForestImpostorBatch, ForestImpostorResources } from '../forest/ForestImpostorBatch.ts';
import { parseSpruceAtlas } from '../forest/SpruceImpostor.ts';
import { isForestColor } from '../forest/ForestBiome.ts';
import { ForestMaterials } from '../forest/ForestMaterials.ts';
import { CLOSED_FOREST, FOREST_IMPOSTOR_BOUNDARY, FOREST_REAL_EDGE_WIDTH, FOREST_SPAWN_REAL_RADIUS, FOREST_SMALL_SHARE, realForestVariant, usesBorderImpostor, placeClosedForest, forestLod, type ForestSite } from '../forest/ClosedForestPlacement.ts';
import { PropCollisions, type PropCollider } from './propCollisions.ts';

interface PineBatch {
    sites: ForestSite[]; all: Float32Array; buffer: Float32Array;
    meshes: Mesh[]; depth: ShaderMaterial[]; variant: string;
}
interface ForestChunk { pines: PineBatch[]; impostor?: ForestImpostorBatch; }
export class WorldForest {
    readonly settings = {
        enabled: true, ...CLOSED_FOREST, shadows: false as const, impostorBoundary: FOREST_IMPOSTOR_BOUNDARY, borderVariant: 'blue-spruce-impostor',
        realEdgeWidth: FOREST_REAL_EDGE_WIDTH, spawnRealRadius: FOREST_SPAWN_REAL_RADIUS, smallVariant: 'Pine_small_1', smallShare: FOREST_SMALL_SHARE,
        openForest: OPEN_FOREST, openMix: OPEN_FOREST_MIX,
        denseEdge: DENSE_FOREST_EDGE,
        firPack: 'terrain/forest/fir-pack-selected.glb',
        fringe: FOREST_FRINGE,
        bigTreeDensity: BIG_TREE_DENSITY,
    };
    readonly stats = { placed: 0, visible: 0, activeChunks: 0, activeMeshes: 0, triangles: 0, colliders: 0, updateMs: 0, impostorPlaced: 0, impostorVisible: 0, impostorChunks: 0, impostorTriangles: 0, bigPlaced: 0, smallPlaced: 0, openPlaced: 0, firPlaced: 0 };
    private readonly chunks: ForestChunk[] = [];
    private readonly warmUpMeshes: Mesh[] = [];
    private readonly shading: ForestMaterials;
    private readonly collisions: PropCollisions;
    private barriers: PropCollider[] = [];
    private container: AssetContainer | null = null;
    private firContainer: AssetContainer | null = null;
    private impostorResources: ForestImpostorResources | null = null;
    private readonly last = new Vector3(Infinity, Infinity, Infinity);
    private wasEnabled = true;
    private disposed = false;
    readonly fringeStats = {placed:0,trees:0,bushes:0};
    constructor(private readonly scene: Scene, private readonly terrain: Terrain, sky: Sky, shadows: ShadowSystem,
        private readonly depth: DepthPass) {
        this.shading = new ForestMaterials(scene, sky, shadows);
        this.collisions = terrain.obstacles ?? new PropCollisions();
        terrain.obstacles = this.collisions;
        scene.onDisposeObservable.addOnce(() => this.dispose());
    }
    get materials(): ShaderMaterial[] { return this.shading.entries.filter(entry => !entry.pass).map(entry => entry.mat); }

    async load(): Promise<void> {
        const world = this.terrain.heightfield;
        if (!(world instanceof ExaltedWorld) || !world.surface) throw new Error('Forest requires authored terrain triangles.');
        const surface = world.surface, rgb = new Float32Array(3), normal = new Vector3();
        const heightAt = (x: number, z: number) => surface.sample(x, z);
        const placed = await loadPinePack(this.scene);
        this.container = placed.container;
        try {
            const firs = await loadFirPack(this.scene);
            this.firContainer = firs.container;
            const prototype = placed.prototypes.find(tree => tree.name === CLOSED_FOREST.variant);
            if (!prototype) throw new Error('Missing Big 1 pine prototype.');
            const smallPrototype = placed.prototypes.find(tree => tree.name === 'Pine_small_1');
            if (!smallPrototype) throw new Error('Missing Small 1 pine prototype.');
            const firSmall=firs.prototypes.find(tree=>tree.name==='Fir_small_2');
            if(!firSmall)throw new Error('Missing Small 2 shrub source.');
            const bush=createForestBush(firSmall);
            const pinePrototypes: readonly PinePrototype[] = [prototype, smallPrototype, ...placed.prototypes.filter(tree =>
                OPEN_FOREST_MIX.some(entry => entry.variant === tree.name)), ...firs.prototypes,bush];
            const placement = placeClosedForest({
                minX: surface.minX, maxX: surface.maxX, minZ: surface.minZ, maxZ: surface.maxZ,
                minY: world.minHeight, maxY: world.maxHeight, heightAt,
                forestAt: (x, z) => { surface.sample(x, z, undefined, rgb); return isForestColor(rgb); },
                slopeAt: (x, z) => { surface.sample(x, z, normal); return Math.hypot(normal.x, normal.z) / Math.max(normal.y, 1e-6); },
                submergedAt: (x, z, y) => (this.terrain.water?.sample(x, z)?.level ?? -Infinity) > y,
            }, prototype.rootSupport, prototype.height);
            const open = placeOpenForest({
                minX:surface.minX,maxX:surface.maxX,minZ:surface.minZ,maxZ:surface.maxZ,
                minY:world.minHeight,maxY:world.maxHeight,heightAt,
                forestAt:(x,z)=>{surface.sample(x,z,undefined,rgb);return isForestColor(rgb)||forestOverlookGroundWeight(x,z,rgb)>.65;},
                slopeAt:(x,z)=>{surface.sample(x,z,normal);return Math.hypot(normal.x,normal.z)/Math.max(normal.y,1e-6);},
                submergedAt:(x,z,y)=>(this.terrain.water?.sample(x,z)?.level??-Infinity)>y,
            },[...placed.prototypes,...firs.prototypes],firs.referenceHeight);
            const fringe=placeForestFringe({
                minX:surface.minX,maxX:surface.maxX,minZ:surface.minZ,maxZ:surface.maxZ,minY:world.minHeight,maxY:world.maxHeight,heightAt,
                forestAt:(x,z)=>{surface.sample(x,z,undefined,rgb);return isForestColor(rgb);},
                slopeAt:(x,z)=>{surface.sample(x,z,normal);return Math.hypot(normal.x,normal.z)/Math.max(normal.y,1e-6);},
                submergedAt:(x,z,y)=>(this.terrain.water?.sample(x,z)?.level??-Infinity)>y,
            },pinePrototypes,[...placement.trees,...open.trees]);
            Object.assign(this.fringeStats,{placed:fringe.trees.length,trees:fringe.trees.length-fringe.bushes,bushes:fringe.bushes});
            const response = await fetch(`${import.meta.env.BASE_URL}terrain/forest/blue-spruce/impostor.json`);
            if (!response.ok) throw new Error('Failed to load border spruce atlas metadata.');
            const atlasData: unknown = await response.json();
            this.impostorResources = new ForestImpostorResources(this.scene, parseSpruceAtlas(atlasData), this.shading);
            const retained=thinBigTrees([...placement.trees,...open.trees,...fringe.trees]);
            const retainedRoots=new Set(retained.map(site=>`${site.x}:${site.z}`));
            this.barriers = [...placement.barriers,...open.colliders.filter(trunk=>retainedRoots.has(`${trunk.x}:${trunk.z}`)),...fringe.colliders];
            for (const barrier of this.barriers) this.collisions.add(barrier);
            this.stats.placed = retained.length;
            this.stats.openPlaced = open.trees.filter(site=>retainedRoots.has(`${site.x}:${site.z}`)).length;
            this.stats.colliders = this.barriers.length;
            const grouped = new Map<string, (ForestSite & {variant?:string})[]>();
            for (const site of retained) {
                const key = `${Math.floor(site.x / CLOSED_FOREST.chunkSize)},${Math.floor(site.z / CLOSED_FOREST.chunkSize)}`;
                let group = grouped.get(key);
                if (!group) { group = []; grouped.set(key, group); }
                group.push(site);
            }
            // Both pine models share pack materials; tint and adapt them once.
            const partMaterials = new Map<PBRMaterial, {beauty: ShaderMaterial; depth: ShaderMaterial}>();
            for (const tree of pinePrototypes) for (const part of tree.far) {
                if (!(part.material instanceof PBRMaterial)) throw new Error('Pine pack requires PBR material metadata.');
                if (partMaterials.has(part.material)) continue;
                if (part.material.name === 'Clusters_Mat') part.material.albedoColor.multiplyInPlace(new Color3(.18, .30, .32));
                if (part.material.name === 'Brunches_Mat') part.material.albedoColor.multiplyInPlace(new Color3(.45, .55, .55));
                partMaterials.set(part.material, {beauty: this.shading.create(part.material), depth: this.shading.create(part.material, 'PROP_PREPASS')});
            }
            const matrix = new Matrix(), position = new Vector3(), scaling = new Vector3(), rotation = new Quaternion();
            for (const [key, originalSites] of grouped) {
                const realSites = originalSites.filter(site => site.variant || !usesBorderImpostor(site.x, site.z));
                const borderSites = originalSites.filter(site => !site.variant && usesBorderImpostor(site.x, site.z)).map(site => ({
                    x: site.x, z: site.z, y: heightAt(site.x,site.z) - .03,
                    height: site.scale * prototype.height, yaw: site.yaw,
                }));
                const impostor = borderSites.length ? new ForestImpostorBatch(this.scene,key,borderSites,this.impostorResources,this.depth) : undefined;
                this.stats.impostorPlaced += borderSites.length;
                const pines: PineBatch[] = [];
                for (const tree of pinePrototypes) {
                    const sites = realSites.filter(site => (site.variant ?? realForestVariant(site.x,site.z)) === tree.name).map(site => ({
                        ...site, y: pineGroundHeight(tree.rootSupport,site.x,site.z,site.scale,site.yaw,heightAt),
                    }));
                    if (!sites.length) continue;
                    if (tree.name.startsWith('Fir_')) this.stats.firPlaced += sites.length;
                    if (tree.name.includes('_small_')) this.stats.smallPlaced += sites.length;
                    else if (tree === prototype) this.stats.bigPlaced += sites.length;
                    // Retain the pack's size ratio: Small 1 uses the same scale
                    // as Big 1, rather than being stretched into another big tree.
                    const all = new Float32Array(sites.length * 16);
                    for (let i = 0; i < sites.length; i++) {
                        const site = sites[i]; position.set(site.x, site.y, site.z); scaling.setAll(site.scale);
                        Quaternion.RotationYawPitchRollToRef(site.yaw, 0, 0, rotation);
                        Matrix.ComposeToRef(scaling, rotation, position, matrix); matrix.copyToArray(all, i * 16);
                    }
                    const buffer = all.slice(), depth: ShaderMaterial[] = [];
                    const meshes = tree.far.map((part, index) => {
                        if (!(part.material instanceof PBRMaterial)) throw new Error('Missing pine material.');
                        const materials = partMaterials.get(part.material);
                        if (!materials) throw new Error('Missing adapted pine material.');
                        depth.push(materials.depth);
                        const mesh = new Mesh(`forest:${key}:${tree.name}:LOD2:${index}`, this.scene);
                        // Independent geometry protects each chunk's matrix binding.
                        part.geometry.applyToMesh(mesh);
                        mesh.material = materials.beauty; mesh.sideOrientation = part.sideOrientation;
                        mesh.renderingGroupId = 1; mesh.isPickable = false;
                        mesh.thinInstanceSetBuffer('matrix', buffer, 16, false);
                        mesh.thinInstanceRefreshBoundingInfo(); mesh.freezeWorldMatrix(); mesh.setEnabled(false);
                        return mesh;
                    });
                    pines.push({sites,all,buffer,meshes,depth,variant:tree.name});
                }
                this.chunks.push({pines,impostor});
            }
        } catch (error) { this.dispose(); throw error; }
    }

    /** Full authored placements for a separate orthographic inspection render. */
    addMapSnapshot(snapshot:MapPropSnapshot):void {
        const viewer=new Vector3();
        for(const chunk of this.chunks){
            for(const batch of chunk.pines)for(const mesh of batch.meshes){
                if (!(mesh.material instanceof ShaderMaterial)) continue;
                snapshot.add(mesh.name,VertexData.ExtractFromMesh(mesh,true,true),mesh.material,batch.all,mesh.sideOrientation);
            }
            const batch=chunk.impostor;if(!batch)continue;
            const atlas=batch.resources.atlas,count=batch.sites.length;
            const buffers={positions:new Float32Array(count*12),normals:new Float32Array(count*12),uvs:new Float32Array(count*8),yaw:new Float32Array(count*8)};
            const indices=new Uint32Array(count*6);
            for(let i=0;i<count;i++){
                const site=batch.sites[i],scale=site.height/atlas.sourceHeight,c=Math.cos(site.yaw),s=Math.sin(site.yaw);
                viewer.set(site.x+(c*atlas.center[0]+s*atlas.center[2])*scale,snapshot.cameraPosition.y,site.z+(-s*atlas.center[0]+c*atlas.center[2])*scale);
                writeImpostorCard(atlas,buffers,i,site,viewer);
                indices.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6);
            }
            const geometry=new VertexData();geometry.positions=buffers.positions;geometry.normals=buffers.normals;geometry.uvs=buffers.uvs;geometry.indices=indices;
            snapshot.add(batch.mesh.name,geometry,batch.resources.beauty).setVerticesData('impostorYaw',buffers.yaw,false,2);
        }
    }

    update(camera: Vector3, force = false): void {
        if (this.disposed) return;
        const start = performance.now();
        this.shading.update(camera);
        if (force || this.wasEnabled !== this.settings.enabled || Vector3.DistanceSquared(camera, this.last) > 9) {
            this.wasEnabled = this.settings.enabled; this.last.copyFrom(camera);
            for (const chunk of this.chunks) for (const batch of chunk.pines) {
                let count = 0;
                if (this.settings.enabled) for (let i = 0; i < batch.sites.length; i++) {
                    const site = batch.sites[i], lod = forestLod(site.x, site.y, site.z, camera);
                    if (lod < 0) continue;
                    const target = count++ * 16;
                    for (let k = 0; k < 16; k++) batch.buffer[target + k] = batch.all[i * 16 + k];
                }
                for (let part = 0; part < batch.meshes.length; part++) {
                    const mesh = batch.meshes[part], wasVisible = mesh.isEnabled();
                    mesh.thinInstanceCount = count;
                    if (count) mesh.thinInstanceBufferUpdated('matrix');
                    mesh.setEnabled(count > 0);
                    if (count && !wasVisible) this.depth.registerCaster(mesh, batch.depth[part]);
                    else if (!count && wasVisible) this.depth.unregisterCaster(mesh);
                }
            }
        }
        // Cards follow camera position at a finer threshold than the static pine LOD buffers.
        this.stats.impostorVisible = this.stats.impostorChunks = this.stats.impostorTriangles = 0;
        for (const chunk of this.chunks) {
            chunk.impostor?.update(camera,this.settings.enabled,force);
            const count = chunk.impostor?.count ?? 0;
            this.stats.impostorVisible += count;
            if(count)this.stats.impostorChunks++;
        }
        // Pine counters are retained between membership updates; combine without accumulating.
        this.stats.visible = this.stats.impostorVisible;
        this.stats.activeMeshes = this.stats.impostorChunks;
        this.stats.activeChunks = this.stats.triangles = 0;
        for (const chunk of this.chunks) {
            let pineCount = 0;
            for (const batch of chunk.pines) {
                pineCount += batch.meshes[0]?.thinInstanceCount ?? 0;
                for (const mesh of batch.meshes) if (mesh.isEnabled()) {
                    this.stats.activeMeshes++;
                    this.stats.triangles += mesh.thinInstanceCount * mesh.getTotalIndices()/3;
                }
            }
            this.stats.visible += pineCount;
            if (pineCount || chunk.impostor?.count) this.stats.activeChunks++;
        }
        this.stats.impostorTriangles = this.stats.impostorVisible * 2;
        this.stats.triangles += this.stats.impostorTriangles;
        this.stats.updateMs = performance.now() - start;
    }

    async warmUp(): Promise<void> {
        const samples: PineBatch[] = [];
        for (const variant of [CLOSED_FOREST.variant, 'Pine_small_1', 'Fir_shrub_1', ...OPEN_FOREST_MIX.map(entry=>entry.variant)]) {
            const sample = this.chunks.flatMap(chunk => chunk.pines).find(batch => batch.variant === variant);
            if (sample) samples.push(sample);
        }
        if (!samples.length && !this.impostorResources) return;
        const camera = this.scene.activeCamera;
        if (!camera) throw new Error('Forest warm-up requires an active camera.');
        this.finishWarmUp();
        const position = camera.getForwardRay(3).direction.scale(3).add(camera.globalPosition);
        const matrix = Matrix.Scaling(.05, .05, .05).setTranslation(position);
        try {
            for (const sample of samples) for (let part = 0; part < sample.meshes.length; part++) {
                const source = sample.meshes[part];
                if (!(source.material instanceof ShaderMaterial)) throw new Error('Missing forest material.');
                const probe = new Mesh(`forest-warm-up:${sample.variant}:LOD2:${part}`, this.scene);
                this.warmUpMeshes.push(probe);
                VertexData.ExtractFromMesh(source, true, true).applyToMesh(probe);
                probe.material = source.material; probe.sideOrientation = source.sideOrientation;
                probe.renderingGroupId = 1; probe.alwaysSelectAsActiveMesh = true; probe.isPickable = false;
                probe.thinInstanceSetBuffer('matrix', Float32Array.from(matrix.m), 16, false);
                this.depth.registerCaster(probe, sample.depth[part]);
                await whenReady(source.material, probe.name, [probe, true]);
                await whenReady(sample.depth[part], `${probe.name}:depth`, [probe, true]);
            }
            const resources = this.impostorResources;
            if (resources) {
                await whenReady(resources.colour,'border spruce colour'); await whenReady(resources.normal,'border spruce normals');
                const probe = new Mesh('forest-warm-up:impostor',this.scene); this.warmUpMeshes.push(probe);
                const geometry = VertexData.CreatePlane({size:1}); geometry.applyToMesh(probe);
                probe.position.copyFrom(position); probe.scaling.setAll(.15);
                probe.setVerticesData('impostorYaw',new Float32Array([1,0,1,0,1,0,1,0]),false,2);
                probe.material = resources.beauty; probe.renderingGroupId=1; probe.alwaysSelectAsActiveMesh=true;
                this.depth.registerCaster(probe,resources.prepass);
                await whenReady(resources.beauty,probe.name,[probe,false]);
                await whenReady(resources.prepass,`${probe.name}:depth`,[probe,false]);
            }
        } catch (error) { this.finishWarmUp(); throw error; }
    }

    /** Submit actual colour/depth pipelines during the loading frames, then release the probes. */
    finishWarmUp(): void {
        for (const mesh of this.warmUpMeshes) { this.depth.unregisterCaster(mesh); mesh.dispose(); }
        this.warmUpMeshes.length = 0;
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.finishWarmUp();
        for (const chunk of this.chunks) for (const batch of chunk.pines) for (const mesh of batch.meshes) {
            this.depth.unregisterCaster(mesh); mesh.dispose();
        }
        for (const chunk of this.chunks) chunk.impostor?.dispose();
        this.chunks.length = 0;
        for (const barrier of this.barriers) this.collisions.remove(barrier);
        this.barriers = [];
        this.impostorResources?.dispose(); this.impostorResources=null;
        this.shading.dispose(); this.container?.dispose(); this.container = null;
        this.firContainer?.dispose(); this.firContainer = null;
    }
}
