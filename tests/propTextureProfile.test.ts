import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PROP_ASSETS_1K, propAssetPath } from '../src/core/PropTextureProfile.ts';
import { productionAssetFiles } from '../scripts/production-assets.mjs';
import { inflateSync } from 'node:zlib';

const root = 'public/terrain/props-1k/';
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
/** Test-only RGBA8 decoder; the numeric terrain decoder intentionally rejects alpha. */
function rgbaPng(bytes: Buffer) {
    assert.equal(bytes[24], 8); assert.equal(bytes[25], 6); assert.equal(bytes[28], 0);
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), chunks: Buffer[] = [];
    for (let p = 8; p < bytes.length;) {
        const length = bytes.readUInt32BE(p);
        if (bytes.toString('ascii', p + 4, p + 8) === 'IDAT') chunks.push(bytes.subarray(p + 8, p + 8 + length));
        p += length + 12;
    }
    const rows = inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = new Uint8Array(stride * height);
    for (let y = 0; y < height; y++) {
        const filter = rows[y * (stride + 1)];
        assert.ok(filter <= 4);
        for (let x = 0; x < stride; x++) {
            const i = y * stride + x, a = x >= 4 ? pixels[i - 4] : 0;
            const b = y > 0 ? pixels[i - stride] : 0, c = y > 0 && x >= 4 ? pixels[i - stride - 4] : 0;
            const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
            const prediction = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            pixels[i] = rows[y * (stride + 1) + 1 + x] + prediction;
        }
    }
    return {width, height, channels: 4, pixels};
}
function glb(path: string) {
    const bytes = readFileSync(path), length = bytes.readUInt32LE(12);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const doc = JSON.parse(bytes.toString('utf8', 20, 20 + length));
    const bin = bytes.subarray(28 + length);
    return {doc, view: (index: number): Buffer => {
        const view = doc.bufferViews[index];
        return bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    }};
}

test('prop comparison keeps original defaults and includes derivatives in deployment', () => {
    const files = productionAssetFiles('public');
    for (const [source, target] of PROP_ASSETS_1K) {
        assert.equal(propAssetPath(source, false), source);
        assert.equal(propAssetPath(source, true), target);
        assert.ok(files.includes(source)); assert.ok(files.includes(target));
    }
    for (const source of ['terrain/forest/fir-pack-selected.glb', 'terrain/grassland/daisies/daisies.glb', 'assets/textures/vis_ground_heightmap-11.png']) assert.equal(propAssetPath(source, true), source);
    for (const page of ['index.html', 'index-1k.html']) assert.ok(!readFileSync(page, 'utf8').includes('data-prop-textures="1k"'));
    const page = readFileSync('index-1k-props.html', 'utf8');
    assert.ok(page.includes('data-prop-textures="1k"') && page.includes('data-ground-textures="1k"'));
});

test('reduced spruce atlases retain premultiplied colour and encoded normal samples', () => {
    for (const name of ['colour', 'normal']) {
        const before = rgbaPng(readFileSync(`public/terrain/forest/blue-spruce/impostor-${name}.png`));
        const after = rgbaPng(readFileSync(`${root}impostor-${name}.png`));
        assert.equal(before.channels, 4); assert.equal(after.channels, 4);
        const scale = before.width / after.width;
        assert.equal(scale, 4); assert.equal(before.height / after.height, scale);
        for (let pixel = 0; pixel < after.width * after.height; pixel += 997) {
            const x = pixel % after.width, y = Math.floor(pixel / after.width);
            for (let channel = 0; channel < 4; channel++) {
                let sum = 0;
                for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
                    sum += before.pixels[((y * scale + dy) * before.width + x * scale + dx) * 4 + channel];
                }
                assert.ok(Math.abs(after.pixels[pixel * 4 + channel] - sum / (scale * scale)) <= 1,
                    `${name}: stored premultiplied channel ${channel} must be filtered directly`);
            }
        }
    }
});

test('prop conversion preserves sources, model hierarchy, materials and every geometry buffer', () => {
    const meta = JSON.parse(readFileSync(`${root}textures.json`, 'utf8'));
    for (const [path, expected] of Object.entries(meta.sources)) assert.equal(hash(readFileSync(`public/${path}`)), expected);
    for (const entry of meta.outputs) {
        assert.equal(hash(readFileSync(root + entry.file)), entry.sha256);
        if (!entry.file.endsWith('.glb')) continue;
        const source = glb(`public/${entry.source}`), target = glb(root + entry.file);
        const imageViews = new Set(source.doc.images.map((image: {bufferView?: number}) => image.bufferView));
        for (let i = 0; i < source.doc.bufferViews.length; i++) {
            if (!imageViews.has(i)) assert.deepEqual(target.view(i), source.view(i), `${entry.file} geometry view ${i}`);
            const {byteOffset: _offset, byteLength: _length, ...before} = source.doc.bufferViews[i];
            const {byteOffset: _newOffset, byteLength: _newLength, ...after} = target.doc.bufferViews[i];
            assert.deepEqual(after, before);
        }
        const {images: _images, bufferViews: _views, buffers: _buffers, ...before} = source.doc;
        const {images: _newImages, bufferViews: _newViews, buffers: _newBuffers, ...after} = target.doc;
        assert.deepEqual(after, before, 'Only image storage and buffer offsets change');
        for (const image of entry.images) {
            assert.ok(Math.max(...image.dimensions) <= 1024);
            const targetImage = target.doc.images[image.image];
            assert.equal(targetImage.uri, undefined, 'Derivative GLBs are self-contained');
            if (Math.max(...image.sourceDimensions) > 1024) {
                const png = target.view(targetImage.bufferView);
                assert.equal(png.toString('ascii', 1, 4), 'PNG');
                assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], image.dimensions);
                const previous = source.doc.images[image.image];
                if (previous.bufferView !== undefined) {
                    // RGBA source images remain RGBA (cutout alpha is never dropped).
                    const original = source.view(previous.bufferView);
                    if (original.toString('ascii', 1, 4) === 'PNG' && original[25] === 6) assert.equal(png[25], 6);
                }
            }
        }
    }
    const before = JSON.parse(readFileSync('public/terrain/forest/blue-spruce/impostor.json', 'utf8'));
    const after = JSON.parse(readFileSync(`${root}impostor.json`, 'utf8'));
    assert.deepEqual(after, {...before, tileSize: 128});
    for (const name of ['colour', 'normal']) {
        const png = readFileSync(`${root}impostor-${name}.png`);
        assert.equal(png.readUInt32BE(16), after.columns * after.tileSize);
        assert.equal(png.readUInt32BE(20), after.rows * after.tileSize);
    }
});
