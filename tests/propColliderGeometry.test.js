import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/loaders/glTF';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { propColliderGeometry } from '../src/world/propColliderGeometry.ts';
import { PropCollisions, solidPropKind } from '../src/world/propCollisions.ts';
import { rebasePropHeight } from '../src/world/propGrounding.ts';
import { keepDesertPlacement } from '../src/world/desertDensity.ts';

test('real woody Searsia, quiver and cactus geometry blocks walking, fast surfing and camera after height transfer', async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    try {
        const container = await LoadAssetContainerAsync(new Uint8Array(await readFile(new URL('../public/assets/exalted/exalted_desert.glb', import.meta.url))), scene, { pluginExtension: '.glb' });
        const root = container.meshes.find(mesh => mesh.name === '__root__').computeWorldMatrix(true).clone();
        const inverse = Matrix.Invert(root), scratch = new Vector3();
        for (const material of ['searsia_burchellii_twigs', 'quiver_tree_02', 'dead_quiver_trunk', 'SaguaroSkin']) {
            const mesh = container.meshes.find(mesh => {
                if (mesh.material?.name !== material) return false;
                const position = mesh.getAbsolutePosition();
                return material === 'SaguaroSkin' || keepDesertPlacement(position.x * .5, position.z * .5, .5);
            });
            assert.ok(mesh, `missing real fixture ${material}`);
            assert.equal(solidPropKind(material), 'trunk');
            const instance = inverse.multiply(mesh.computeWorldMatrix(true));
            instance.getTranslationToRef(scratch);
            instance.setTranslationFromFloats(scratch.x * .5, scratch.y * .5, scratch.z * .5);
            const positions = mesh.getVerticesData('position');
            const before = root.multiply(instance);
            let bottom = Infinity;
            for (let i = 0; i < positions.length; i += 3) {
                Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], before, scratch);
                bottom = Math.min(bottom, scratch.y);
            }
            const ground = { heightAt: () => 60 };
            rebasePropHeight(instance, root, { heightAt: () => bottom + .1 }, ground, scratch);
            const collider = propColliderGeometry(mesh.name, material, positions, root.multiply(instance), ground);
            assert.ok(collider, material);
            assert.ok(Math.abs(collider.minY - 59.9) < 1e-4);
            assert.ok(collider.maxY > 60);
            const world = new PropCollisions(); world.add(collider);
            const reach = collider.radius + 3;
            for (const speed of [4, 35]) {
                const position = { x: collider.x - reach, y: 60, z: collider.z }, velocity = { x: speed, z: 0 };
                world.move(position, velocity, 2 * reach / speed);
                assert.ok(position.x < collider.x - collider.radius, `${material}: must block at ${speed} m/s`);
                assert.ok(Math.abs(velocity.x) < 1e-6);
            }
            assert.ok(world.cameraFraction({ x: collider.x - reach, y: 60.3, z: collider.z }, { x: collider.x + reach, y: 60.3, z: collider.z }) < .5);
            assert.equal(propColliderGeometry(mesh.name, 'searsia_burchellii', positions, root.multiply(instance), ground), null, 'leaf material remains passable');
        }
        container.dispose();
    } finally { scene.dispose(); engine.dispose(); }
});
