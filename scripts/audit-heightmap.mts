/** Reproducible CPU geometry/seating audit; does not verify GPU appearance. */
import { readFile, writeFile } from 'node:fs/promises';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/instancedMesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { AuthoredSurfaceMap, buildAuthoredHeightmap, decodeAuthoredPng, ROADS_HEIGHTMAP, ROADS_BIOME_MAP } from '../src/terrain/authoredHeightmap.ts';
import { MeshSurface } from '../src/terrain/meshSurface.ts';
import { SPAWN_POINTS } from '../src/world/spawnPoints.ts';
import { buildWaterGeometry, heightmapLakeLevel, heightmapWaterSource, HEIGHTMAP_LAKE_LEVEL_OFFSET, withoutWaterfalls, type WaterReference } from '../src/world/waterGeometry.ts';
import { WaterSurface } from '../src/world/waterSurface.ts';
import { rebasePropHeight } from '../src/world/propGrounding.ts';
import { ExaltedWorld, type LoadedTerrainData } from '../src/terrain/exaltedWorld.ts';
import { LocalTerrain } from '../src/terrain/localTerrain.ts';

const [heightBytes, biomeBytes] = await Promise.all([ROADS_HEIGHTMAP, ROADS_BIOME_MAP].map(path => readFile(`public/${path}`)));
const height = decodeAuthoredPng(heightBytes), biome = decodeAuthoredPng(biomeBytes);
const data = buildAuthoredHeightmap(height, biome);
if (!data.positions || !data.indices || !data.colors) throw new Error('Incomplete terrain data.');
const surface = new MeshSurface(data.positions, data.indices, 16, data.colors);
const masks = new AuthoredSurfaceMap(2049, 1537, biome);
const reference = JSON.parse(await readFile('src/world/waterReference.json', 'utf8')) as WaterReference;
const waterSource = heightmapWaterSource({ positions: data.positions, colors: data.colors, indices: data.indices }, masks, reference, .5);
const lakeLevel = heightmapLakeLevel(waterSource, reference, .5) + HEIGHTMAP_LAKE_LEVEL_OFFSET;
const water = buildWaterGeometry(waterSource, reference, lakeLevel, .5);
const lake = new WaterSurface(water.lake, lakeLevel);
const engine = new NullEngine(), scene = new Scene(engine);
try {
    const container = await LoadAssetContainerAsync(new Uint8Array(await readFile('public/assets/exalted/alpha-map.glb')), scene, { pluginExtension: '.glb' });
    const ground = container.meshes.find(mesh => mesh.name === 'vis_ground');
    if (!(ground instanceof Mesh)) throw new Error('GLB comparison ground missing.');
    const original = VertexData.ExtractFromMesh(ground);
    original.transform(ground.computeWorldMatrix(true));
    if (!original.positions || !original.indices) throw new Error('GLB comparison data missing.');
    for (let i = 0; i < original.positions.length; i++) original.positions[i] *= .5;
    const oldSurface = new MeshSurface(original.positions, original.indices, 16);
    const terrainComparison = ([['glb', original], ['heightmap', data]] as const).map(([mode, vertexData]) => {
        const world = new ExaltedWorld(scene, mode);
        world.data = vertexData as LoadedTerrainData;
        world.surface = new MeshSurface(world.data.positions, world.data.indices, 16, world.data.colors);
        if (mode === 'heightmap') world.biomeSurface = masks;
        const coarse = new Mesh(`audit:${mode}`, scene);
        vertexData.applyToMesh(coarse);
        coarse.metadata = {};
        const local = new LocalTerrain(scene, world, coarse);
        local.update({ x: -32.5, z: 308 });
        const result = { source: mode, baseVertices: vertexData.positions!.length / 3,
            baseIndices: vertexData.indices!.length, detailVertices: local.mesh.getTotalVertices(),
            selectedDetailTriangles: local.triangleCount,
            drawnIndicesPerPass: coarse.getTotalIndices() + local.mesh.subMeshes[0].indexCount,
            terrainDrawsPerPass: local.mesh.isVisible ? 2 : 1 };
        local.dispose(); coarse.dispose(); world.dispose();
        return result;
    });
    const spawns = SPAWN_POINTS.map(point => {
        const x = -point.x * .5, z = -point.y * .5, oldHeight = oldSurface.sample(x, z), newHeight = surface.sample(x, z);
        const weights = masks.sample(x, z, new Float32Array(2));
        return { id: point.id, x, z, glbHeight: oldHeight, heightmapHeight: newHeight, difference: newHeight - oldHeight,
            snow: weights[0], sand: weights[1], waterMask: masks.waterAt(x, z), swimmingSurface: lake.sample(x, z) };
    });
    container.dispose();
    const desert = await LoadAssetContainerAsync(new Uint8Array(await readFile('public/assets/exalted/exalted_desert.glb')), scene,
        { pluginExtension: '.glb', pluginOptions: { gltf: { skipMaterials: true } } });
    const root = desert.meshes.find(mesh => mesh.name === '__root__');
    if (!root) throw new Error('Desert loader root missing.');
    const rootMatrix = root.computeWorldMatrix(true).clone(), inverse = Matrix.Invert(rootMatrix);
    const point = new Vector3(), lowest = new Vector3();
    const seats: { name: string; x: number; z: number; authoredLowestY: number; glbClearance: number; authoredHeightmapClearance: number; heightAdjustment: number; heightmapClearance: number }[] = [];
    const referenceGround = { heightAt: (x: number, z: number) => oldSurface.sample(x, z) };
    const targetGround = { heightAt: (x: number, z: number) => surface.sample(x, z) };
    for (const mesh of desert.meshes) {
        if (mesh.name === 'Ground') continue;
        const positions = mesh.getVerticesData('position');
        if (!positions) continue;
        const instance = inverse.multiply(mesh.computeWorldMatrix(true));
        instance.getTranslationToRef(point); instance.setTranslationFromFloats(point.x * .5, point.y * .5, point.z * .5);
        const placement = rootMatrix.multiply(instance);
        placement.getTranslationToRef(point);
        if (Math.hypot(point.x + 32.5, point.z - 308) > 55) continue;
        lowest.set(0, Infinity, 0);
        for (let i = 0; i < positions.length; i += 3) {
            Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], placement, point);
            if (point.y < lowest.y) lowest.copyFrom(point);
        }
        seats.push({ name: mesh.name, x: lowest.x, z: lowest.z, authoredLowestY: lowest.y,
            glbClearance: lowest.y - oldSurface.sample(lowest.x, lowest.z),
            authoredHeightmapClearance: lowest.y - surface.sample(lowest.x, lowest.z),
            heightAdjustment: rebasePropHeight(instance, rootMatrix, referenceGround, targetGround, point),
            heightmapClearance: 0 });
        const seat = seats[seats.length - 1];
        seat.heightmapClearance = seat.authoredHeightmapClearance + seat.heightAdjustment;
    }
    desert.dispose();
    const report = {
        method: 'CPU audit using native 16-bit PNG heights and Babylon-baked GLB transforms; no visual verification.',
        propScope: 'All material primitives within 55 m of Desert Start, before production density thinning; compare authored and ground-offset-transferred heights.',
        terrainComparison,
        terrain: { vertices: data.positions.length / 3, triangles: data.indices.length / 3, minHeight: surface.minHeight, maxHeight: surface.maxHeight,
            surfaceMap: [masks.width, masks.height] },
        water: { lakeTriangles: water.lake.indices.length / 3, riverTriangles: water.river.indices.length / 3,
            renderedRiverTriangles: withoutWaterfalls(water.river, .85, 2.5).indices.length / 3, level: lakeLevel },
        spawns,
        desert: { primitiveCount: seats.length, floatingOver20cm: seats.filter(seat => seat.heightmapClearance > .2).length,
            buriedOver50cm: seats.filter(seat => seat.heightmapClearance < -.5).length,
            authoredFloatingOver20cm: seats.filter(seat => seat.authoredHeightmapClearance > .2).length,
            authoredBuriedOver50cm: seats.filter(seat => seat.authoredHeightmapClearance < -.5).length, seats },
    };
    await writeFile('reports/heightmap-integration.json', `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ terrain: report.terrain, water: report.water, spawns, desert: { ...report.desert, seats: undefined } }, null, 2));
} finally { scene.dispose(); engine.dispose(); }
