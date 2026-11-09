import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { surfaceTexturePath, modelTexturePath } from '../src/core/TextureWebpProfile.ts';
import { productionAssetFiles, PRODUCTION_SOURCE_ASSETS, webpProductionAssetPath } from '../scripts/production-assets.mjs';

const root = 'public/textures-webp-80/';
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
function dimensions(data: Buffer): number[] {
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    assert.equal(data.readUInt32LE(4) + 8, data.length);
    for (let p = 12; p + 8 <= data.length;) {
        const type = data.toString('ascii', p, p + 4), length = data.readUInt32LE(p + 4), at = p + 8;
        if (type === 'VP8X') return [1 + data.readUIntLE(at + 4, 3), 1 + data.readUIntLE(at + 7, 3)];
        if (type === 'VP8 ') return [data.readUInt16LE(at + 6) & 16383, data.readUInt16LE(at + 8) & 16383];
        if (type === 'VP8L') { const bits = data.readUInt32LE(at + 1); return [(bits & 16383) + 1, ((bits >>> 14) & 16383) + 1]; }
        p += 8 + length + (length & 1);
    }
    throw new Error('Missing WebP frame');
}
function glb(path: string) {
    const data = readFileSync(path), n = data.readUInt32LE(12), doc = JSON.parse(data.toString('utf8', 20, 20 + n)), bin = data.subarray(28 + n);
    assert.equal(data.readUInt32LE(8), data.length);
    return {doc, view: (i: number) => { const v = doc.bufferViews[i]; return bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength); }};
}

test('quality-80 surface derivatives keep source hashes, dimensions and numeric map paths', () => {
    const manifest = JSON.parse(readFileSync(root + 'textures.json', 'utf8'));
    assert.equal(manifest.quality, 80); assert.equal(manifest.resize, false);
    assert.equal(manifest.outputs.length, 26);
    const files = productionAssetFiles('public');
    for (const entry of manifest.outputs) {
        assert.equal(hash(readFileSync(`public/${entry.source}`)), entry.sourceSha256);
        const target = readFileSync(root + entry.file);
        assert.equal(hash(target), entry.sha256); assert.deepEqual(dimensions(target), entry.dimensions);
        assert.equal(surfaceTexturePath(entry.source, true), `textures-webp-80/${entry.file}`);
        assert.equal(surfaceTexturePath(entry.source, false), entry.source, 'Labs retain original assets');
        assert.ok(files.includes(`textures-webp-80/${entry.file}`));
        assert.ok(!files.includes(entry.source), 'Do not package replaced original');
    }
    for (const path of PRODUCTION_SOURCE_ASSETS.filter((name: string) => name.startsWith('assets/textures/') || /\/height-\d+\.png$/.test(name))) {
        assert.equal(webpProductionAssetPath(path), path);
        assert.equal(surfaceTexturePath(path, true), path);
        assert.ok(files.includes(path));
    }
    assert.equal(surfaceTexturePath('terrain/road/asp1/asphalt_snow_diff_2k.jpg', true), 'terrain/road/asp1/asphalt_snow_diff_2k.jpg');
    assert.ok(readFileSync('index.html', 'utf8').includes('data-surface-textures="webp"'));
});

test('WebP GLBs retain materials, transforms and geometry bytes, and declare supported WebP textures', () => {
    const manifest = JSON.parse(readFileSync(root + 'textures.json', 'utf8'));
    assert.equal(manifest.models.length, 7);
    for (const entry of manifest.models) {
        assert.equal(hash(readFileSync(`public/${entry.source}`)), entry.sourceSha256);
        assert.equal(hash(readFileSync(root + entry.file)), entry.sha256);
        assert.equal(modelTexturePath(entry.source, true), `textures-webp-80/${entry.file}`);
        assert.equal(modelTexturePath(entry.source, false), entry.source);
        const before = glb(`public/${entry.source}`), after = glb(root + entry.file);
        for (const key of ['asset', 'scenes', 'scene', 'nodes', 'meshes', 'accessors', 'materials', 'samplers', 'animations', 'skins']) assert.deepEqual(after.doc[key], before.doc[key], key);
        assert.ok(after.doc.extensionsRequired.includes('EXT_texture_webp'));
        const images = new Set(before.doc.images.map((image: {bufferView?: number}) => image.bufferView));
        for (let i = 0; i < before.doc.bufferViews.length; i++) if (!images.has(i)) assert.deepEqual(after.view(i), before.view(i), `${entry.file} geometry ${i}`);
        for (const image of entry.images) {
            const view = after.doc.images[image.image];
            assert.equal(view.mimeType, 'image/webp');
            assert.deepEqual(dimensions(after.view(view.bufferView)), image.dimensions);
            assert.ok(after.doc.textures.some((texture: {extensions?: {EXT_texture_webp?: {source: number}}}) => texture.extensions?.EXT_texture_webp?.source === image.image));
        }
        for (let i = 0; i < before.doc.images.length; i++) {
            const source = before.doc.images[i];
            if (source.bufferView !== undefined && !before.view(source.bufferView).subarray(0, 4).equals(Buffer.from([137,80,78,71]))) assert.deepEqual(after.view(after.doc.images[i].bufferView), before.view(source.bufferView), 'Existing JPEG stays byte-identical');
        }
    }
    assert.equal(modelTexturePath('assets/exalted/alpha-map.glb', true), 'assets/exalted/alpha-map.glb');
});
