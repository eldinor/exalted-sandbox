/** Preserve current RGBA8 array pixels in ordinary opaque PNGs; sources are read-only. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { encodePng8 } from './png8.mts';
import { ROCK_ARRAY_SIZE, ROCK_ARRAY_LAYERS, ROCK_ARRAY_ROOT, ROCK_IMAGE_ROOT } from '../src/terrain/RockArrayProfile.ts';

const sourceRoot = `public/${ROCK_ARRAY_ROOT}`, targetRoot = `public/${ROCK_IMAGE_ROOT}`;
const source = JSON.parse(readFileSync(`${sourceRoot}/textures.json`, 'utf8'));
if (source.width !== ROCK_ARRAY_SIZE || source.height !== ROCK_ARRAY_SIZE || source.layers.length !== ROCK_ARRAY_LAYERS) throw new Error('Rock source profile mismatch.');
mkdirSync(targetRoot, { recursive: true });
const outputs = [], sources = [];
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
for (const map of ['base', 'normal', 'arm-height']) {
    const file = `${map}.rgba.gz`, compressed = readFileSync(`${sourceRoot}/${file}`);
    if (hash(compressed) !== source.outputs.find((entry: { file: string }) => entry.file === file)?.sha256) throw new Error(`Source checksum mismatch: ${file}`);
    sources.push({ file: `${sourceRoot}/${file}`, sha256: hash(compressed) });
    const bytes = gunzipSync(compressed), stride = ROCK_ARRAY_SIZE * 4;
    if (bytes.length !== ROCK_ARRAY_SIZE * ROCK_ARRAY_SIZE * ROCK_ARRAY_LAYERS * 4) throw new Error('Invalid source array length.');
    for (let row = 0; row < bytes.length; row += stride) for (let x = 4; x < stride; x++) bytes[row + x] = (bytes[row + x] + bytes[row + x - 4]) & 255;
    for (let layer = 0; layer < ROCK_ARRAY_LAYERS; layer++) {
        const rgb = new Uint8Array(ROCK_ARRAY_SIZE * ROCK_ARRAY_SIZE * 3), height = new Uint8Array(ROCK_ARRAY_SIZE * ROCK_ARRAY_SIZE);
        for (let pixel = 0; pixel < height.length; pixel++) {
            const from = (layer * height.length + pixel) * 4;
            rgb.set(bytes.subarray(from, from + 3), pixel * 3);
            height[pixel] = bytes[from + 3];
            if (map !== 'arm-height' && height[pixel] !== 255) throw new Error('Expected opaque colour/normal data.');
        }
        const save = (name: string, channels: 1 | 3, pixels: Uint8Array) => {
            const png = encodePng8(ROCK_ARRAY_SIZE, ROCK_ARRAY_SIZE, channels, pixels, true);
            writeFileSync(`${targetRoot}/${name}`, png);
            outputs.push({ file: name, bytes: png.length, sha256: hash(png) });
        };
        save(`${map === 'arm-height' ? 'arm' : map}-${layer}.png`, 3, rgb);
        if (map === 'arm-height') save(`height-${layer}.png`, 1, height);
    }
}
writeFileSync(`${targetRoot}/textures.json`, JSON.stringify({ width: ROCK_ARRAY_SIZE, height: ROCK_ARRAY_SIZE, layers: source.layers, textureMetres: source.textureMetres, format: 'Opaque RGB8 and grayscale8 PNG; untagged; no resampling or pixel changes. Height is separate to avoid alpha premultiplication.', sources, outputs }, null, 2) + '\n');
console.log(`Prepared ${outputs.length} PNGs: ${(outputs.reduce((sum, entry) => sum + entry.bytes, 0) / 1048576).toFixed(2)} MiB`);
