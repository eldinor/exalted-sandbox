import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AuthoredSurfaceMap, decodeAuthoredPng, ROADS_BIOME_MAP } from '../src/terrain/authoredHeightmap.ts';
import { ROAD_DISPLAY_MAP, ROAD_BLEND_SIGMA_METRES } from '../src/terrain/roadBlending.ts';
import { encodePng8 } from './png8.mts';

const source = readFileSync(`public/${ROADS_BIOME_MAP}`);
const map = new AuthoredSurfaceMap(2049, 1537, decodeAuthoredPng(source));
const pixels = new Uint8Array(map.width * map.height);
// CPU surface data increases in world X; exported images follow the biome PNG.
for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    pixels[y * map.width + x] = map.roadDisplayData[y * map.width + map.width - 1 - x];
}
const png = encodePng8(map.width, map.height, 1, pixels);
writeFileSync(`public/${ROAD_DISPLAY_MAP}`, png);
writeFileSync(`public/${ROAD_DISPLAY_MAP.replace('.png', '.json')}`, JSON.stringify({
    source: ROADS_BIOME_MAP, sourceSha256: createHash('sha256').update(source).digest('hex'),
    output: ROAD_DISPLAY_MAP, outputSha256: createHash('sha256').update(png).digest('hex'),
    width: map.width, height: map.height, format: 'grayscale8', sigmaMetres: ROAD_BLEND_SIGMA_METRES,
    orientation: 'same endpoints and orientation as source biome PNG',
    meaning: 'white=road, black=land, grey=visual road blend; independent of gameplay firmness and road material selection',
}, null, 2) + '\n');
console.log(`Saved ${ROAD_DISPLAY_MAP}: ${map.width}x${map.height}, ${png.length} bytes`);
