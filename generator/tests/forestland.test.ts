import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { configureForestShadows, updateForestShadows } from '../forestland/ForestShadows.ts';
import { splitPines } from '../forestland/PineGeometry.ts';
import { isForestColor } from '../forestland/ForestBiome.ts';
import { decodeAuthoredPng, sampleBiomeRgb } from '../../src/terrain/authoredHeightmap.ts';
import { defaultTreeMix, selectTreeVariant } from '../forestland/PinePack.ts';
import { changeGrassMixShare } from '../../src/grass/GrassMix.ts';
import { pineRootSupport, pineGroundHeight } from '../forestland/PineGrounding.ts';
import { createHash } from 'node:crypto';
import { pinePlaceholderGeometry } from '../forestland/PinePlaceholder.ts';

test('forest shadows remain ground anchored and have valid projection with no aerial casters', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const camera = new UniversalCamera('test-camera', new Vector3(-300, 72, 30), scene);
    scene.activeCamera = camera;
    const sun = new DirectionalLight('test-sun', new Vector3(.082, -.342, .936), scene);
    const shadow = new ShadowGenerator(1024, sun);
    try {
        configureForestShadows(sun, shadow);
        updateForestShadows(sun, camera.position, 70, true, 2);
        assert.equal(sun.shadowEnabled, true);
        const groundPosition = sun.position.clone();
        camera.position.y = 300;
        updateForestShadows(sun, camera.position, 70, true, 0);
        assert.equal(sun.shadowEnabled, false);
        assert.ok(sun.position.equals(groundPosition));
        const matrix = shadow.getTransformMatrix();
        assert.ok(Array.from(matrix.m).every(Number.isFinite));
        assert.ok(Math.abs(matrix.determinant()) > 1e-10, 'empty-list projection must remain invertible');
        camera.position.y = 72;
        updateForestShadows(sun, camera.position, 80, true, 2);
        assert.equal(sun.shadowEnabled, true);
        assert.equal(sun.position.y, groundPosition.y + 10);
        updateForestShadows(sun, camera.position, 80, false, 2);
        assert.equal(sun.shadowEnabled, false);
    } finally {
        scene.dispose(); engine.dispose();
    }
});

test('farthest pine placeholder has six triangles including a horizontal aerial canopy', () => {
    const geometry = pinePlaceholderGeometry(3, 12);
    assert.equal(geometry.indices!.length, 18);
    assert.equal(geometry.positions!.length, 36);
    assert.equal(geometry.normals!.length, 36);
    assert.equal(geometry.uvs!.length, 24);
    const topPositions = Array.from(geometry.positions!).slice(24);
    for (let i = 1; i < topPositions.length; i += 3) assert.ok(Math.abs(topPositions[i] - 12 * .72) < 1e-6);
    assert.ok(topPositions.some((value, i) => i % 3 === 0 && value === -3));
    assert.ok(topPositions.some((value, i) => i % 3 === 2 && value === 3));
    assert.ok(Array.from(geometry.uvs!).slice(0, 16).every((value, i) => i % 2 !== 0 || value < .5));
    assert.ok(Array.from(geometry.uvs!).slice(16).every((value, i) => i % 2 !== 0 || value > .5));
});

test('selected coniferous details preserve geometry, authored transforms and exact shared texture bytes', () => {
    const folder = 'public/terrain/forest/coniferous-selected/';
    const manifest = JSON.parse(readFileSync(`${folder}manifest.json`, 'utf8'));
    const source = readFileSync(manifest.source);
    assert.equal(manifest.sourceSha256, createHash('sha256').update(source).digest('hex'));
    const jsonSize = source.readUInt32LE(12);
    const original = JSON.parse(source.subarray(20, 20 + jsonSize).toString());
    const binary = source.subarray(28 + jsonSize);
    assert.equal(manifest.assets.length, 5);
    const textures = new Set<string>();
    for (const asset of manifest.assets) {
        const bytes = readFileSync(`${folder}${asset.file}`);
        assert.equal(bytes.length, bytes.readUInt32LE(8));
        const size = bytes.readUInt32LE(12), document = JSON.parse(bytes.subarray(20, 20 + size).toString());
        assert.equal(document.meshes.length, 1);
        assert.equal(document.materials.length, 1);
        assert.equal(document.asset.extras.selectedAsset, asset.sourceNode);
        assert.deepEqual(document.extensionsRequired, original.extensionsRequired);
        const node = document.nodes.find((n: { name: string }) => n.name === asset.sourceNode);
        const originalNode = original.nodes.find((n: { name: string }) => n.name === asset.sourceNode);
        if (node.matrix) {
            assert.deepEqual(node.matrix.slice(12, 15), [0, 0, 0]);
            assert.ok(node.matrix.slice(0, 12).every((value: number, i: number) => value === originalNode.matrix[i]));
        }
        let triangles = 0;
        for (const primitive of document.meshes[0].primitives) {
            triangles += document.accessors[primitive.indices].count / 3;
            const oldMesh = original.meshes.find((mesh: { name: string }) => mesh.name === document.meshes[0].name);
            for (const [attribute, index] of Object.entries(primitive.attributes)) {
                const accessor = document.accessors[Number(index)], old = original.accessors[oldMesh.primitives[0].attributes[attribute]];
                assert.equal(accessor.count, old.count); assert.deepEqual(accessor.min, old.min); assert.deepEqual(accessor.max, old.max);
            }
        }
        assert.equal(triangles, asset.triangles);
        for (const image of document.images) {
            textures.add(image.uri);
            const exported = readFileSync(`${folder}${image.uri}`);
            assert.ok(original.images.some((old: { bufferView: number }) => {
                const view = original.bufferViews[old.bufferView], start = view.byteOffset ?? 0;
                return exported.equals(binary.subarray(start, start + view.byteLength));
            }), 'PNG bytes exactly match an embedded source image');
        }
        for (const view of document.bufferViews) assert.ok(view.byteOffset + view.byteLength <= document.buffers[0].byteLength);
    }
    assert.equal(textures.size, 6);
});

test('pine grounding preserves buried roots and supports scaled, rotated roots on slopes in both LODs', () => {
    const near = new Float32Array([0, -.2, 0, 1, -.4, 0, -1, -.4, 0, 0, -.3, 1, 0, -.3, -1, 0, 10, 0]);
    const far = new Float32Array([0, -.1, 0, 1.2, -.35, 0, -1.2, -.35, 0, 0, 10, 0]);
    const support = pineRootSupport([near, far], 10);
    assert.ok(Math.abs(pineGroundHeight(support, 0, 0, 1, 0, () => 5) - 4.97) < 1e-6, 'flat ground does not lift buried roots');
    const terrain = (x: number, z: number): number => 5 + x * .5 - z * .3;
    for (const scale of [.7, 1, 1.5]) for (const yaw of [0, Math.PI / 2, Math.PI]) {
        const height = pineGroundHeight(support, 2, 3, scale, yaw, terrain);
        for (let i = 0; i < support.length; i += 3) {
            const x = 2 + scale * (support[i] * Math.cos(yaw) + support[i + 2] * Math.sin(yaw));
            const z = 3 + scale * (-support[i] * Math.sin(yaw) + support[i + 2] * Math.cos(yaw));
            assert.ok(height + support[i + 1] * scale <= terrain(x, z) - .029, 'both LOD root supports stay buried');
        }
    }
    assert.throws(() => pineRootSupport([new Float32Array([0, 10, 0])], 10), /no root/);
});

test('pine-pack mixes stay at 100 percent and zero-share variants are excluded', () => {
    const mix = defaultTreeMix();
    assert.equal(mix.length, 12);
    assert.equal(mix.reduce((sum, entry) => sum + entry.percentage, 0), 100);
    const changed = changeGrassMixShare(mix, 2, 100);
    for (const random of [0, .1, .5, .999999]) assert.equal(selectTreeVariant(changed, random), 2);
    const withoutFirst = changeGrassMixShare(mix, 0, 0);
    for (let i = 0; i < 1000; i++) assert.notEqual(selectTreeVariant(withoutFirst, i / 1000), 0);
    assert.equal(mix[0].percentage, 25, 'redistribution does not mutate the original mix');
});

test('prepared pine pack keeps selected geometry and textures without display offsets or billboards', () => {
    const glb = readFileSync('public/terrain/forest/pine-pack-forestland.glb');
    assert.equal(glb.readUInt32LE(8), glb.length);
    const size = glb.readUInt32LE(12), document = JSON.parse(glb.subarray(20, 20 + size).toString());
    assert.equal(document.meshes.length, 48);
    assert.equal(document.materials.length, 2);
    assert.equal(document.images.length, 6);
    assert.equal(document.materials.find((material: { name: string }) => material.name === 'Clusters_Mat').alphaMode, 'MASK');
    assert.ok(document.asset.extras.sourceSha256);
    const owners = document.nodes.filter((node: { name?: string }) => /_LOD[12]$/.test(node.name ?? ''));
    assert.equal(owners.length, 24);
    for (const node of document.nodes) {
        assert.ok(!/Billboard|LOD0|LOD3|Checker|Ref_plane|Pine_large/.test(node.name ?? ''));
        if (/^Pine_/.test(node.name ?? '') && node.matrix) assert.deepEqual(node.matrix.slice(12, 15), [0, 0, 0]);
    }
    const binaryLength = glb.readUInt32LE(20 + size);
    for (const view of document.bufferViews) assert.ok(view.byteOffset >= 0 && view.byteOffset + view.byteLength <= binaryLength);
    for (const primitive of document.meshes.flatMap((mesh: { primitives: unknown[] }) => mesh.primitives)) {
        assert.ok(primitive.attributes.POSITION !== undefined && primitive.attributes.NORMAL !== undefined && primitive.attributes.TEXCOORD_0 !== undefined);
        assert.ok(primitive.material < 2);
    }
});

test('Forestland selects the actual dark-green biome and excludes road, grass, water and rocks', () => {
    const image = decodeAuthoredPng(readFileSync('public/assets/textures/vertex_color_4k-9.png'));
    const rgb = new Float32Array(3);
    sampleBiomeRgb(image, -383.5, 52, rgb);
    assert.equal(isForestColor(rgb), true);
    sampleBiomeRgb(image, -155, 0, rgb);
    assert.equal(isForestColor(rgb), false);
    for (const color of [[246,232,208], [179,206,149], [129,173,206], [111,153,191], [137,147,128], [243,246,249], [234,215,173]]) {
        assert.equal(isForestColor(color.map(value => value / 255)), false);
    }
});

test('the supplied merged pine GLB splits into two rooted variants without losing geometry or UVs', () => {
    const glb = readFileSync('public/terrain/forest/pine_tree_01.glb');
    const jsonSize = glb.readUInt32LE(12);
    const document = JSON.parse(glb.subarray(20, 20 + jsonSize).toString());
    const binary = glb.subarray(28 + jsonSize);
    const primitive = document.meshes[0].primitives[0];
    const read = (index: number): number[] => {
        const accessor = document.accessors[index], view = document.bufferViews[accessor.bufferView];
        const channels = accessor.type === 'VEC3' ? 3 : accessor.type === 'VEC2' ? 2 : 1;
        const bytes = accessor.componentType === 5123 ? 2 : 4;
        const values: number[] = [];
        for (let i = 0; i < accessor.count; i++) for (let c = 0; c < channels; c++) {
            const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + i * (view.byteStride ?? channels * bytes) + c * bytes;
            values.push(accessor.componentType === 5126 ? binary.readFloatLE(offset) : accessor.componentType === 5123 ? binary.readUInt16LE(offset) : binary.readUInt32LE(offset));
        }
        return values;
    };
    const data = new VertexData();
    data.positions = read(primitive.attributes.POSITION); data.normals = read(primitive.attributes.NORMAL);
    data.uvs = read(primitive.attributes.TEXCOORD_0); data.indices = read(primitive.indices);
    data.transform(Matrix.FromArray(document.nodes[0].matrix));
    const variants = splitPines(data);
    assert.equal(variants[0].indices!.length + variants[1].indices!.length, data.indices!.length);
    const heights = variants.map(variant => {
        assert.ok(variant.indices!.length > 3000);
        assert.equal(variant.normals!.length, variant.positions!.length);
        assert.equal(variant.uvs!.length, variant.positions!.length / 3 * 2);
        const ys = Array.from(variant.positions!).filter((_, i) => i % 3 === 1);
        assert.ok(Math.abs(Math.min(...ys)) < .015, 'trunk roots are grounded at zero');
        assert.ok(Array.from(variant.indices!).every(index => index < variant.positions!.length / 3));
        return Math.max(...ys);
    });
    assert.ok(heights[0] > heights[1] * 1.2, 'relative authored tall/short heights remain distinct');
    assert.throws(() => splitPines(new VertexData()), /requires/);
});
