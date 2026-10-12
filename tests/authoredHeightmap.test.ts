import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zlibSync } from 'fflate';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import {
    AuthoredSurfaceMap, buildAuthoredHeightmap, decodeAuthoredPng, sampleBiomeRgb, roadsWaterWeight,
    HEIGHTMAP_MIN, HEIGHTMAP_MAX, ROADS_HEIGHTMAP, ROADS_BIOME_MAP,
} from '../src/terrain/authoredHeightmap.ts';
import { ExaltedWorld, type LoadedTerrainData } from '../src/terrain/exaltedWorld.ts';
import { LocalTerrain } from '../src/terrain/localTerrain.ts';
import { MeshSurface } from '../src/terrain/meshSurface.ts';
import { buildWaterGeometry, heightmapLakeLevel, heightmapWaterSource, HEIGHTMAP_LAKE_LEVEL_OFFSET, type WaterReference } from '../src/world/waterGeometry.ts';
import { WaterSurface } from '../src/world/waterSurface.ts';
import { SPAWN_POINTS } from '../src/world/spawnPoints.ts';
import { rebasePropHeight } from '../src/world/propGrounding.ts';
import { BEACH_COVERAGE_MAP } from '../src/terrain/groundCoverage.ts';

test('prop transfer preserves horizontal position, rotation, physical size and signed ground clearance', () => {
    const root = Matrix.Scaling(-1, 1, 1);
    const instance = Matrix.RotationY(.7); instance.setTranslationFromFloats(32.5, 1.8, 308);
    const before = root.multiply(instance), shape = Array.from(instance.m).slice(0, 12);
    const delta = rebasePropHeight(instance, root, { heightAt: () => 2.6 }, { heightAt: () => 40.5 }, new Vector3());
    const after = root.multiply(instance);
    assert.ok(Math.abs(delta - 37.9) < 1e-6);
    assert.deepEqual(Array.from(instance.m).slice(0, 12), shape);
    assert.equal(after.m[12], before.m[12]); assert.equal(after.m[14], before.m[14]);
    assert.ok(Math.abs((after.m[13] - 40.5) - (before.m[13] - 2.6)) < 1e-5);
});

const height = decodeAuthoredPng(readFileSync(`public/${ROADS_HEIGHTMAP}`));
const biome = decodeAuthoredPng(readFileSync(`public/${ROADS_BIOME_MAP}`));

test('corrected heightmap lake fills its raised basin, supports swimming and leaves the island dry', () => {
    const data = buildAuthoredHeightmap(height, biome) as LoadedTerrainData;
    const beach = decodeAuthoredPng(readFileSync(`public/${BEACH_COVERAGE_MAP}`));
    const mask = new AuthoredSurfaceMap(2049, 1537, biome, undefined, undefined, undefined, beach);
    const reference = JSON.parse(readFileSync('src/world/waterReference.json', 'utf8')) as WaterReference;
    const source = heightmapWaterSource(data, mask, reference, .5);
    const shorelineLevel = heightmapLakeLevel(source, reference, .5);
    const level = shorelineLevel + HEIGHTMAP_LAKE_LEVEL_OFFSET;
    assert.ok(level > 30 && level < 45);
    assert.ok(Math.abs(level - 41.6695262460979) < 1e-6, 'island bank eligibility must not change lake level');
    const geometry = buildWaterGeometry(source, reference, level, .5, 'connected-basin');
    const lake = new WaterSurface(geometry.lake, level);
    const previousLake = new WaterSurface(buildWaterGeometry(source, reference, shorelineLevel, .5, 'connected-basin').lake, shorelineLevel);
    for (const [x, z] of [[200, 100], [250, 150], [300, 150]]) {
        const water = lake.sample(x, z);
        assert.ok(water && water.depth > 2, `Expected deep lake water at ${x}, ${z}`);
        assert.equal(water.level, level);
        const previous = previousLake.sample(x, z);
        assert.ok(previous);
        assert.equal(water.level - previous.level, 5, 'lake rise must be five runtime metres');
        assert.ok(Math.abs(water.depth - previous.depth - 5) < .001, 'swimming depth must follow the raised surface');
    }
    assert.equal(lake.sample(272.5, 76), null, 'Lake Island must remain dry');
    assert.equal(lake.sample(-32.5, 308), null, 'Desert Start must remain dry');
    const ground = new MeshSurface(data.positions, data.indices, 16);
    for (let z = -32; z < 225; z += 4) for (let x = 105; x < 425; x += 4) {
        if (Math.max(mask.waterAt(x, z), mask.beachAt(x, z)) < .99 || ground.sample(x, z) >= level - .1) continue;
        assert.ok(lake.sample(x, z), `Submerged shore must not have a water gap at ${x},${z}`);
    }
    assert.ok(geometry.lake.indices.length / 3 < 60000, 'Interior water should retain coarse geometry');
});

test('bundled roads assets retain 16-bit height precision and authored biome orientation', () => {
    assert.equal(height.width, 4096); assert.equal(height.height, 4096);
    assert.ok(height.pixels instanceof Uint16Array);
    assert.equal(biome.channels, 3);
    const rgb = new Float32Array(3);
    for (const [id, expected] of [
        ['desert-start', [234, 215, 173]], ['C5', [243, 246, 249]],
        ['C3', [179, 206, 149]], ['C2', [124, 170, 129]], ['C6', [164, 160, 155]],
    ] as const) {
        const point = SPAWN_POINTS.find(point => point.id === id)!;
        sampleBiomeRgb(biome, -point.x * .5, -point.y * .5, rgb);
        assert.deepEqual([...rgb].map(value => Math.round(value * 255)), expected);
    }
});

test('generated grid normals and triangle grounding agree, including a non-bilinear diagonal', () => {
    const map = { width: 2, height: 2, channels: 1 as const, pixels: new Uint16Array([0, 0, 0, 65535]) };
    const color = { width: 2, height: 2, channels: 3 as const, pixels: new Uint8Array(12) };
    const data = buildAuthoredHeightmap(map, color, 1);
    assert.equal(data.positions!.length, 12); assert.equal(data.indices!.length, 6);
    assert.equal(data.positions![1], Math.fround(HEIGHTMAP_MIN));
    assert.equal(data.positions![10], Math.fround(HEIGHTMAP_MAX));
    for (let i = 1; i < data.normals!.length; i += 3) assert.ok(data.normals![i] > 0);
    const surface = new MeshSurface(data.positions!, data.indices!, 16);
    assert.ok(Math.abs(surface.sample(0, 0) - (HEIGHTMAP_MIN + HEIGHTMAP_MAX) / 2) < 1e-5);
    const normal = new Vector3(); surface.sample(0, 0, normal);
    assert.ok(normal.y > 0);
    // Bilinear interpolation at the centre would produce a quarter of the range.
    assert.ok(Math.abs(surface.sample(0, 0) - (HEIGHTMAP_MIN + (HEIGHTMAP_MAX - HEIGHTMAP_MIN) / 4)) > 60);
});

test('PNG decoder reconstructs all scanline filters and rejects unsupported/truncated input', () => {
    function chunk(type: string, data: Uint8Array): Uint8Array {
        const bytes = new Uint8Array(data.length + 12); new DataView(bytes.buffer).setUint32(0, data.length);
        bytes.set(new TextEncoder().encode(type), 4); bytes.set(data, 8); return bytes;
    }
    const header = new Uint8Array(13), view = new DataView(header.buffer);
    view.setUint32(0, 2); view.setUint32(4, 5); header[8] = 16;
    // Each row reconstructs [0x1234, 0xabcd], with byte-predictors for bpp=2.
    const raw = [18, 52, 171, 205];
    const scanlines = new Uint8Array([
        0, ...raw, 1, 18, 52, 153, 153, 2, 0, 0, 0, 0,
        3, 9, 26, 77, 77, 4, 0, 0, 0, 0,
    ]);
    const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlibSync(scanlines)), chunk('IEND', new Uint8Array())];
    const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    assert.deepEqual([...decodeAuthoredPng(bytes).pixels], Array.from({ length: 5 }, () => [0x1234, 0xabcd]).flat());
    assert.throws(() => decodeAuthoredPng(bytes.subarray(0, bytes.length - 5)), /Incomplete|Truncated/);
    bytes[24] = 4; assert.throws(() => decodeAuthoredPng(bytes), /grayscale/);
});

test('roads stay firm and conservative detail selection preserves interior soft areas', () => {
    const map = new AuthoredSurfaceMap(2049, 1537, biome);
    const out = new Float32Array(2);
    let checkedRoad = false;
    for (let row = 200; row < 4096 && !checkedRoad; row += 20) for (let column = 100; column < 4096; column += 20) {
        const index = (row * biome.width + column) * 3;
        if (biome.pixels[index] !== 246 || biome.pixels[index + 1] !== 232 || biome.pixels[index + 2] !== 208) continue;
        const x = (.5 - column / 4095) * 936, z = (row / 4095 - .5) * 702;
        map.sample(x, z, out); assert.ok(out[0] + out[1] < .01); checkedRoad = true; break;
    }
    assert.ok(checkedRoad);
    map.sample(-32.5, 308, out); assert.ok(out[1] > .95);
    map.sample(109, -125.5, out); assert.ok(out[0] > .95);
    const fixture = new AuthoredSurfaceMap(5, 5, { width: 2, height: 2, channels: 3, pixels: new Uint8Array(12) });
    fixture.data[(2 * 5 + 2) * 4] = 255;
    assert.ok(fixture.hasSoftArea(-100, 100, -100, 100));
    fixture.sample(-100, -100, out); assert.ok(out[0] < 1);
});

test('full-grid local patches remain within capacity and partition coarse/detail triangles exactly', () => {
    const engine = new NullEngine(), scene = new Scene(engine), coarse = new Mesh('ground', scene);
    try {
        const data = buildAuthoredHeightmap(height, biome) as LoadedTerrainData;
        const world = new ExaltedWorld(scene, 'heightmap');
        world.data = data; world.surface = new MeshSurface(data.positions, data.indices, 16, data.colors);
        // An all-soft map is the conservative worst case for the fixed patch capacity.
        world.biomeSurface = new AuthoredSurfaceMap(3, 3, { width: 2, height: 2, channels: 3, pixels: new Uint8Array(12).fill(243) });
        world.biomeSurface.data.fill(255);
        data.applyToMesh(coarse); coarse.metadata = {};
        const local = new LocalTerrain(scene, world, coarse);
        for (const point of [{ x: 0, z: 0 }, { x: -32.5, z: 308 }, { x: 109, z: -125.5 }, { x: 460, z: -345 }]) {
            local.update(point);
            assert.ok(local.triangleCount > 0 && local.triangleCount <= local.capacity);
            const original = new Set<string>(), retained = new Set<string>();
            for (let i = 0; i < data.indices.length; i += 3) original.add([data.indices[i], data.indices[i + 1], data.indices[i + 2]].join(','));
            const remaining = coarse.getIndices()!;
            for (let i = 0; i < remaining.length; i += 3) retained.add([remaining[i], remaining[i + 1], remaining[i + 2]].join(','));
            assert.equal(retained.size + local.triangleCount, original.size);
            for (const triangle of retained) assert.ok(original.has(triangle));
        }
        local.dispose(); world.dispose();
    } finally { scene.dispose(); engine.dispose(); }
});

test('new blue palette produces water while preserving islands and sub-triangle wet regions', () => {
    assert.equal(roadsWaterWeight([129 / 255, 173 / 255, 206 / 255]), 1);
    assert.equal(roadsWaterWeight([111 / 255, 153 / 255, 191 / 255]), 1);
    assert.equal(roadsWaterWeight([139 / 255, 158 / 255, 134 / 255]), 0);
    const data = { positions: [0, -2, 0, 4, -2, 0, 0, -2, 4], colors: new Array(12).fill(0), indices: [0, 1, 2] };
    const source = heightmapWaterSource(data, {
        hasWaterArea: () => true,
        waterAt: (x, z) => x > .5 && x < 2.5 && z > .5 && z < 2.5 ? 1 : 0,
    });
    const water = buildWaterGeometry(source, { lake: [[1, 1], [-5, 1], [-5, -5], [1, -5]], river: [] });
    assert.ok(water.lake.indices.length > 0);
    assert.equal(water.river.indices.length, 0);
    assert.ok(water.lake.positions.every((value, i) => i % 3 !== 1 || value === .025));
});
