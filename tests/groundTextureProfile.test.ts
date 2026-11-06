import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodeAuthoredPng } from '../src/terrain/authoredHeightmap.ts';
import { GROUND_TEXTURES_1K, GROUND_TEXTURE_1K_ROOT, groundTexturePath } from '../src/terrain/GroundTextureProfile.ts';
import { productionAssetFiles } from '../scripts/production-assets.mjs';

test('1K profile changes only the twelve standalone tiled textures and preserves original source bytes', () => {
    const meta = JSON.parse(readFileSync(`public/${GROUND_TEXTURE_1K_ROOT}/textures.json`, 'utf8'));
    const files = productionAssetFiles('public');
    assert.equal(meta.outputs.length, 12);
    for (const entry of GROUND_TEXTURES_1K) {
        const target = `${GROUND_TEXTURE_1K_ROOT}/${entry.file}`, saved = meta.outputs.find((output: { file: string }) => output.file === entry.file);
        assert.equal(groundTexturePath(entry.source, false), entry.source);
        assert.equal(groundTexturePath(entry.source, true), target);
        assert.ok(files.includes(entry.source)); assert.ok(files.includes(target));
        const source = readFileSync(`public/${entry.source}`), output = readFileSync(`public/${target}`);
        assert.equal(createHash('sha256').update(source).digest('hex'), saved.sourceSha256);
        assert.equal(createHash('sha256').update(output).digest('hex'), saved.sha256);
        const png = decodeAuthoredPng(output);
        assert.equal(png.width, 1024); assert.equal(png.height, 1024); assert.equal(png.channels, 3);
        if (entry.kind === 'normal') for (let pixel = 0; pixel < png.pixels.length; pixel += 3 * 997) {
            const x = png.pixels[pixel] / 127.5 - 1, y = png.pixels[pixel + 1] / 127.5 - 1, z = png.pixels[pixel + 2] / 127.5 - 1;
            assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < .015, 'Reduced normal vectors retain unit length');
        }
    }
    for (const path of ['assets/textures/vis_ground_heightmap-11.png', 'assets/textures/vertex_color_4k-9.png', 'assets/textures/biome-beach-9.png', 'assets/exalted/exalted_desert.glb', 'terrain/rock/iron-mountains-png-1024/base-0.png']) assert.equal(groundTexturePath(path, true), path);
    assert.ok(!readFileSync('index.html', 'utf8').includes('data-ground-textures="1k"'));
    assert.ok(readFileSync('index-1k.html', 'utf8').includes('data-ground-textures="1k"'));
});
