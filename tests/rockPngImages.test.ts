import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodeAuthoredPng } from '../src/terrain/authoredHeightmap.ts';
import { ROCK_ARRAY_ROOT, ROCK_IMAGE_ROOT, ROCK_ARRAY_SIZE, ROCK_ARRAY_LAYERS } from '../src/terrain/RockArrayProfile.ts';
import { readRockPng } from '../src/terrain/RockPngImages.ts';

test('ordinary rock PNGs reconstruct every source channel, including nonopaque height values', () => {
    const meta = JSON.parse(readFileSync(`public/${ROCK_IMAGE_ROOT}/textures.json`, 'utf8'));
    for (const source of meta.sources) assert.equal(createHash('sha256').update(readFileSync(source.file)).digest('hex'), source.sha256);
    for (const output of meta.outputs) assert.equal(createHash('sha256').update(readFileSync(`public/${ROCK_IMAGE_ROOT}/${output.file}`)).digest('hex'), output.sha256);
    const pixels = ROCK_ARRAY_SIZE * ROCK_ARRAY_SIZE;
    for (const name of ['base', 'normal', 'arm-height']) {
        const original = gunzipSync(readFileSync(`public/${ROCK_ARRAY_ROOT}/${name}.rgba.gz`)), stride = ROCK_ARRAY_SIZE * 4;
        for (let row = 0; row < original.length; row += stride) for (let x = 4; x < stride; x++) original[row + x] = (original[row + x] + original[row + x - 4]) & 255;
        const reconstructed = new Uint8Array(original.length);
        for (let layer = 0; layer < ROCK_ARRAY_LAYERS; layer++) {
            const rgb = decodeAuthoredPng(readFileSync(`public/${ROCK_IMAGE_ROOT}/${name === 'arm-height' ? 'arm' : name}-${layer}.png`));
            const height = name === 'arm-height' ? decodeAuthoredPng(readFileSync(`public/${ROCK_IMAGE_ROOT}/height-${layer}.png`)) : null;
            assert.equal(rgb.width, ROCK_ARRAY_SIZE); assert.equal(rgb.height, ROCK_ARRAY_SIZE); assert.equal(rgb.channels, 3);
            if (height) assert.equal(height.channels, 1);
            for (let i = 0; i < pixels; i++) {
                const at = (layer * pixels + i) * 4;
                for (let channel = 0; channel < 3; channel++) reconstructed[at + channel] = rgb.pixels[i * 3 + channel];
                reconstructed[at + 3] = height ? height.pixels[i] : 255;
            }
        }
        assert.equal(Buffer.compare(original, reconstructed), 0, name);
    }
});

test('browser rock loader preserves channels, disables conversion and releases images on success and failure', async () => {
    const previousFetch = globalThis.fetch;
    const previousBitmap = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    let closed = 0, width = 1;
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: () => {}, getImageData: () => ({ data: new Uint8ClampedArray([9, 27, 83, 255]) }) }) };
    try {
        globalThis.fetch = async () => new Response('PNG test double');
        Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: async (_blob: Blob, options: ImageBitmapOptions) => {
            assert.deepEqual(options, { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' });
            return { width, height: 1, close: () => { closed++; } };
        } });
        Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
        assert.deepEqual(await readRockPng('/normal.png', 1), new Uint8Array([9, 27, 83, 255]));
        assert.equal(closed, 1); assert.equal(canvas.width, 0);
        width = 2;
        await assert.rejects(readRockPng('/normal.png', 1), /Cannot load \/normal.png: Expected 1 x 1/);
        assert.equal(closed, 2);
    } finally {
        globalThis.fetch = previousFetch;
        if (previousBitmap) Object.defineProperty(globalThis, 'createImageBitmap', previousBitmap); else Reflect.deleteProperty(globalThis, 'createImageBitmap');
        if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument); else Reflect.deleteProperty(globalThis, 'document');
    }
});
