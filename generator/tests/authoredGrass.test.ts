import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF/index.js';
import { MeshSurface } from '../../src/terrain/meshSurface.ts';
import { AUTHORED_WORLD_SCALE } from '../../src/world/worldScale.ts';
import { ROAD_COLOR, SAND_COLORS } from '../../src/terrain/surfaceTypes.ts';
import { AUTHORED_GRASS_COLOR, authoredGrassWeight, createAuthoredGrassSamplers } from '../grass/AuthoredGrassSamplers.ts';
import { partitionGrasslandTriangles } from '../grass/MeadowGround.ts';

test('meadow material partition preserves triangle winding and leaves CPU indices unchanged', () => {
    const colors = [...AUTHORED_GRASS_COLOR, 1, ...AUTHORED_GRASS_COLOR, 1, ...AUTHORED_GRASS_COLOR, 1, ...ROAD_COLOR, 1, ...ROAD_COLOR, 1, ...ROAD_COLOR, 1];
    const indices = new Uint32Array([0, 2, 1, 3, 4, 5]);
    const partition = partitionGrasslandTriangles(indices, colors);
    assert.equal(partition.otherIndexCount, 3);
    assert.deepEqual([...partition.indices], [3, 4, 5, 0, 2, 1]);
    assert.deepEqual([...indices], [0, 2, 1, 3, 4, 5]);
});

test('authored grass palette excludes forest, roads, sand, snow, rock and water', () => {
    assert.equal(authoredGrassWeight(AUTHORED_GRASS_COLOR), 1);
    for (const color of [ROAD_COLOR, ...SAND_COLORS, [.201556, .401984, .219532], [.896269, .921584, .947311], [.371237, .351537, .327779], [.21953, .417884, .617212], [.158968, .318547, .520989]]) {
        assert.equal(authoredGrassWeight(color), 0);
    }
});

test('authored placement uses exact triangle height and rejects terrain gaps/outside bounds', () => {
    const colors = Array.from({ length: 3 }, () => [...AUTHORED_GRASS_COLOR, 1]).flat();
    const surface = new MeshSurface([0, 0, 0, 4, 1, 0, 0, 0, 4], [0, 1, 2], 2, colors);
    const samplers = createAuthoredGrassSamplers(surface);
    assert.equal(samplers.heightAt(1, 1), .25);
    assert.ok(samplers.grassWeightAt(1, 1) > .999);
    assert.equal(samplers.patchMayContainGrass!(0, 0, 2), true);
    assert.equal(samplers.patchMayContainGrass!(20, 20, 2), false);
    assert.ok(Math.abs(samplers.slopeAt!(1, 1) - .25) < 1e-10);
    for (const [x, z] of [[-1, 1], [3, 3]]) {
        assert.equal(samplers.grassWeightAt(x, z), 0);
        assert.equal(samplers.excludedAt(x, z), true);
        assert.throws(() => samplers.heightAt(x, z), /No authored ground/);
    }
});

test('real alpha-map loader transforms at half scale put grass at the production Grassland spawn', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
        const bytes = await readFile(new URL('../../public/assets/exalted/alpha-map.glb', import.meta.url));
        const container = await LoadAssetContainerAsync(new Uint8Array(bytes), scene, { pluginExtension: '.glb' });
        const mesh = container.meshes.find(item => item.name === 'vis_ground');
        assert.ok(mesh instanceof Mesh);
        const data = VertexData.ExtractFromMesh(mesh);
        data.transform(mesh.computeWorldMatrix(true));
        assert.ok(data.positions && data.indices && data.colors);
        for (let i = 0; i < data.positions.length; i++) data.positions[i] *= AUTHORED_WORLD_SCALE;
        const surface = new MeshSurface(data.positions, data.indices, 16, data.colors);
        const samplers = createAuthoredGrassSamplers(surface);
        assert.ok(Math.abs(surface.maxX - surface.minX - 936) < .01);
        assert.ok(Math.abs(surface.maxZ - surface.minZ - 702) < .01);
        assert.ok(samplers.grassWeightAt(-155, 0) > .999);
        assert.ok(Math.abs(samplers.heightAt(-155, 0) - 9.001899) < .001);
        assert.equal(samplers.grassWeightAt(-383.5, 52), 0); // Forest spawn.
        assert.equal(samplers.grassWeightAt(-32.5, 308), 0); // Desert spawn.
        container.dispose();
    } finally {
        scene.dispose(); engine.dispose();
    }
});
