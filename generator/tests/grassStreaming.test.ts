import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GrassSystem } from '../grass/GrassSystem.ts';
import type { GrassSettings, GrassUpdateContext } from '../grass/grassTypes.ts';
import type { ImportedGrassPrototype } from '../grass/ImportedGrass.ts';

test('stream planning does no placement work; frame queue bounds uploads and reuses retained/pooled meshes', async () => {
    const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
        const module = await server.ssrLoadModule('/generator/grass/GrassSystem.ts');
        const Renderer: typeof GrassSystem = module.GrassSystem;
        const geometry = new VertexData();
        geometry.positions = [0, 0, 0, .1, 0, 0, 0, 1, 0];
        geometry.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
        geometry.indices = [0, 1, 2];
        const prototypes = new Map<string, ImportedGrassPrototype>();
        for (const lod of [1, 2]) {
            const name = `grass_medium_01_tall_a_LOD${lod}`;
            prototypes.set(name, { name, geometry, triangles: 1, authoredHeight: .3 });
        }
        const settings: GrassSettings = {
            enabled: true, density: .5, nearDistance: 8, farDistance: 70,
            bladeHeight: .85, bladeWidth: .045, windStrength: .3, windSpeed: 1,
            interaction: false, movingImpacts: false, interactionRadius: 2.4, interactionStrength: .55,
            freezeWind: false, visualization: 'final', bladeSource: 'imported',
            importedVariant: 'grass_medium_01_tall_a_LOD2', importedNearLod: 1,
            lodEnabled: false, singleLod: 2, rootColor: [.05, .2, .05], tipColor: [.01, .3, .01],
        };
        let queries = 0;
        const grass = new Renderer(scene, {
            heightAt: () => 0, grassWeightAt: () => { queries++; return 1; }, excludedAt: () => false, slopeAt: () => 0,
        }, settings, new Vector2(), 64, { importedOnly: true, streaming: true });
        grass.setImportedPrototypes(prototypes);
        assert.equal(queries, 0);
        const context: GrassUpdateContext = { cameraPosition: new Vector3(), elapsedSeconds: 0, impacts: [] };
        for (let frame = 0; frame < 100; frame++) {
            const before = scene.meshes.length;
            const beforeQueries = queries;
            grass.update(context);
            assert.ok(scene.meshes.length - before <= 2, 'at most one near/far patch pair per frame');
            assert.ok(queries - beforeQueries <= 2048, 'bounded placement candidates');
        }
        const retained = scene.meshes.find(mesh => mesh.name === 'grass:0:0:near');
        assert.ok(retained);
        assert.equal(grass.stats.midInstances, 0);
        context.cameraPosition.x = 16;
        grass.update(context);
        assert.equal(scene.meshes.find(mesh => mesh.name === 'grass:0:0:near'), retained);
        const oldMeshes = new Set(scene.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.name.startsWith('grass:')));
        const oldVertexBuffers = new Map([...oldMeshes].map(mesh => [mesh, mesh.getVertexBuffer('position')]));
        const sampledBeforePause = queries;
        grass.streamingPaused = true;
        context.cameraPosition.x = 160;
        for (let frame = 0; frame < 5; frame++) grass.update(context);
        assert.equal(queries, sampledBeforePause, 'pausing streaming stops camera-driven placement');
        assert.equal(scene.meshes.find(mesh => mesh.name === 'grass:0:0:near'), retained);
        grass.streamingPaused = false;
        context.cameraPosition.x = 160;
        for (let frame = 0; frame < 100; frame++) grass.update(context);
        assert.ok([...oldMeshes].some(mesh => mesh.isEnabled() && mesh.name.startsWith('grass:10:')));
        for (const mesh of oldMeshes) assert.equal(mesh.getVertexBuffer('position'), oldVertexBuffers.get(mesh), 'pooled geometry buffers survive movement');
        assert.ok(grass.stats.nearInstances > 0);
        assert.equal(grass.stats.midInstances, 0);
        const uploads: { mesh: Mesh; count: number }[] = [];
        for (const mesh of oldMeshes) {
            const updateBuffer = mesh.thinInstanceBufferUpdated.bind(mesh);
            mesh.thinInstanceBufferUpdated = kind => {
                uploads.push({ mesh, count: mesh.thinInstanceCount });
                updateBuffer(kind);
            };
        }
        // Reuse larger buffers with a different instance count, then grow back.
        // Babylon uses the count at upload time to select the copied byte range.
        for (const density of [.25, .5]) {
            settings.density = density;
            for (let frame = 0; frame < 100; frame++) {
                uploads.length = 0;
                grass.update(context);
                for (const upload of uploads) assert.equal(upload.count, upload.mesh.thinInstanceCount, 'upload uses the new patch count');
            }
        }
        const sampled = queries;
        settings.enabled = false;
        context.cameraPosition.x = 320;
        grass.update(context);
        assert.equal(queries, sampled);
        grass.dispose();
        settings.enabled = true;
        settings.singleLod = 1;
        settings.distantLodDistance = 120;
        const extended = new Renderer(scene, {
            heightAt: () => 0, grassWeightAt: () => 1, excludedAt: () => false, slopeAt: () => 0,
        }, settings, new Vector2(), 256, { importedOnly: true, streaming: true });
        extended.setImportedPrototypes(prototypes);
        context.cameraPosition.x = 0;
        for (let frame = 0; frame < 500; frame++) extended.update(context);
        assert.equal(extended.streamingStats.queued, 0);
        assert.ok(extended.stats.nearInstances > 0);
        assert.ok(extended.stats.midInstances > 0, 'outer LOD2 renders with normal distance LOD off');
        settings.windDistance = 20;
        extended.update(context);
        assert.ok(extended.streamingStats.staticDraws > 0);
        const distantPatch = scene.meshes.find(mesh => mesh.name === 'grass:3:0:near');
        assert.ok(distantPatch?.material instanceof ShaderMaterial);
        assert.ok(distantPatch.material.options.defines.includes('#define GRASS_STATIC'));
        settings.windDistance = 0;
        extended.update(context);
        assert.equal(extended.streamingStats.staticDraws, 0);
        assert.ok(distantPatch.material instanceof ShaderMaterial);
        assert.equal(distantPatch.material.options.defines.includes('#define GRASS_STATIC'), false);
        const fullOuterCount = extended.stats.midInstances;
        const fullMainCount = extended.stats.nearInstances;
        for (const mesh of scene.meshes) {
            const match = /^grass:(-?\d+):(-?\d+):mid$/.exec(mesh.name);
            if (!match || !mesh.isEnabled()) continue;
            const distance = Math.hypot((Number(match[1]) + .5) * 16, (Number(match[2]) + .5) * 16);
            assert.ok(distance > 70 && distance <= 120, 'outer meshes stay within the requested band');
        }
        settings.distantGrassDensity = .25;
        extended.update(context);
        assert.ok(extended.stats.midInstances < fullOuterCount);
        assert.ok(extended.stats.midInstances >= fullOuterCount * .24);
        assert.equal(extended.stats.nearInstances, fullMainCount, 'outer thinning leaves main grass intact');
        const boundedPatch = scene.meshes.find(mesh => mesh.name === 'grass:0:0:near');
        assert.ok(boundedPatch instanceof Mesh);
        const tightWidth = boundedPatch.getBoundingInfo().boundingBox.extendSize.x * 2;
        settings.tightGrassBounds = false;
        extended.update(context);
        const looseWidth = boundedPatch.getBoundingInfo().boundingBox.extendSize.x * 2;
        assert.ok(looseWidth > tightWidth + 20, 'tight bounds remove the previous broad padding');
        settings.tightGrassBounds = true;
        settings.windStrength = 3;
        context.impacts = [{ position: new Vector3(), radius: 2, strength: 2 }];
        settings.interaction = true;
        extended.update(context);
        const windyWidth = boundedPatch.getBoundingInfo().boundingBox.extendSize.x * 2;
        assert.ok(windyWidth > tightWidth + 5, 'bounds expand for live wind and impact edits');
        const bounds = boundedPatch.getBoundingInfo().boundingBox;
        const matrices = boundedPatch.thinInstanceGetWorldMatrices();
        for (const matrix of matrices.slice(0, 20)) {
            for (const point of [Vector3.Zero(), new Vector3(.1, 0, 0), new Vector3(0, 1, 0)]) {
                const transformed = Vector3.TransformCoordinates(point, matrix);
                assert.ok(transformed.x >= bounds.minimumWorld.x && transformed.x <= bounds.maximumWorld.x);
                assert.ok(transformed.y >= bounds.minimumWorld.y && transformed.y <= bounds.maximumWorld.y);
                assert.ok(transformed.z >= bounds.minimumWorld.z && transformed.z <= bounds.maximumWorld.z);
            }
        }
        settings.distantLodDistance = 0;
        extended.update(context);
        assert.equal(extended.stats.midInstances, 0, 'disabling extension restores the single-LOD cutoff');
        extended.dispose();
        const tinyGeometry = new VertexData();
        tinyGeometry.positions = geometry.positions;
        tinyGeometry.normals = geometry.normals;
        tinyGeometry.indices = [0, 1, 2, 0, 2, 1];
        for (const lod of [1, 2]) {
            const name = `grass_medium_01_tiny_d_LOD${lod}`;
            prototypes.set(name, { name, geometry: tinyGeometry, triangles: 2, authoredHeight: .045 });
        }
        settings.grassMixEnabled = true;
        settings.grassMix = [
            { variant: 'grass_medium_01_tall_a_LOD2', percentage: 50 },
            { variant: 'grass_medium_01_tiny_d_LOD2', percentage: 50 },
        ];
        const mixed = new Renderer(scene, {
            heightAt: () => 0, grassWeightAt: () => 1, excludedAt: () => false, slopeAt: () => 0,
        }, settings, new Vector2(), 32, { importedOnly: true, streaming: true });
        mixed.setImportedPrototypes(prototypes);
        context.cameraPosition.x = 0;
        for (let frame = 0; frame < 100; frame++) {
            const before = scene.meshes.length;
            mixed.update(context);
            assert.ok(scene.meshes.length - before <= 2, 'mixed fill uploads one model pair per frame');
        }
        assert.equal(mixed.streamingStats.queued, 0);
        const variantsAtOrigin = scene.meshes.filter(mesh => mesh.isEnabled() && mesh.name.startsWith('grass:0:0:near:'));
        assert.equal(variantsAtOrigin.length, 2);
        let originCount = 0;
        for (const mesh of variantsAtOrigin) {
            assert.ok(mesh instanceof Mesh);
            originCount += mesh.thinInstanceCount;
            const tiny = mesh.name.includes('tiny_d');
            assert.equal(mesh.getTotalIndices() / 3, tiny ? 2 : 1);
            const matrix = mesh.thinInstanceGetWorldMatrices()[0];
            const scale = Vector3.Zero();
            matrix.decompose(scale);
            assert.ok(tiny ? scale.y < .2 : scale.y > .5, 'mixture restores authored size');
        }
        const cells = Math.floor(16 / (.42 / Math.sqrt(settings.density)));
        assert.equal(originCount, cells * cells, 'mixing partitions placements rather than adding density');
        assert.deepEqual(mixed.getPrototypeTriangleCounts(), [1.5, 1.5]);
        assert.ok(mixed.stats.draws > mixed.stats.visiblePatches, 'tile counts do not count each variant as a new tile');
        const modelMeshes = scene.meshes.length;
        context.cameraPosition.x = 160;
        for (let frame = 0; frame < 100; frame++) mixed.update(context);
        assert.equal(scene.meshes.length, modelMeshes, 'mixture recycles model batches on teleport');
        assert.equal(mixed.streamingStats.queued, 0);
        settings.grassMix = [{ variant: 'grass_medium_01_tiny_d_LOD2', percentage: 100 }];
        for (let frame = 0; frame < 100; frame++) mixed.update(context);
        assert.equal(scene.meshes.filter(mesh => mesh.isEnabled() && mesh.name.includes('tall_a')).length, 0);
        mixed.dispose();
    } finally {
        scene.dispose(); engine.dispose(); await server.close();
    }
});
