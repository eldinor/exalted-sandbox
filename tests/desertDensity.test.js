import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/loaders/glTF';
import { keepDesertPlacement } from '../src/world/desertDensity.ts';

test('half-scale desert retains about a quarter of real placements and keeps multi-part props whole', async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    try {
        const bytes = new Uint8Array(await readFile(new URL('../public/assets/exalted/exalted_desert.glb', import.meta.url)));
        const container = await LoadAssetContainerAsync(bytes, scene, { pluginExtension: '.glb', pluginOptions: { gltf: { skipMaterials: true } } });
        const decisions = new Map();
        let total = 0, kept = 0, nearby = 0, nearbyKept = 0, sharedParts = 0;
        for (const mesh of container.meshes) {
            if (!mesh.getTotalVertices() || mesh.name === 'Ground') continue;
            const matrix = mesh.computeWorldMatrix(true);
            const x = matrix.m[12] * .5, z = matrix.m[14] * .5;
            const keep = keepDesertPlacement(x, z, .5);
            assert.equal(keep, keepDesertPlacement(x, z, .5), 'selection must be stable');
            assert.equal(keepDesertPlacement(x, z, 1), true, 'full-size reference keeps authored placements');
            const key = `${Math.round(x * 100)}:${Math.round(z * 100)}`;
            if (decisions.has(key)) { assert.equal(keep, decisions.get(key)); sharedParts++; }
            decisions.set(key, keep);
            total++; if (keep) kept++;
            if (Math.hypot(x + 32.5, z - 308) < 60) { nearby++; if (keep) nearbyKept++; }
        }
        assert.ok(sharedParts > 0, 'real export must exercise multi-part placement selection');
        assert.ok(kept / total > .22 && kept / total < .28);
        assert.ok(nearbyKept / nearby > .2 && nearbyKept / nearby < .3);
        console.log({ totalPrimitives: total, keptPrimitives: kept, nearbyPrimitives: nearby, nearbyKept });
        container.dispose();
    } finally { scene.dispose(); engine.dispose(); }
});
