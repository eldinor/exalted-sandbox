import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodeAuthoredPng, ROADS_BIOME_MAP } from '../src/terrain/authoredHeightmap.ts';
import { buildLandCoverage, GROUND_COVERAGE_MAP, ROCK_COVERAGE_MAP, BEACH_COVERAGE_MAP, DETAIL_COVERAGE_MAP, GROUND_BLEND_SIGMA_METRES } from '../src/terrain/groundCoverage.ts';
import { encodePng8 } from './png8.mts';
import { IRON_MOUNTAINS_MASK } from '../src/terrain/IronMountains.ts';

const source = readFileSync(`public/${ROADS_BIOME_MAP}`);
const { ground: image, rock, beach, detail, iron } = buildLandCoverage(decodeAuthoredPng(source));
function chunk(type: string, data: Buffer): Buffer {
    const payload = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of payload) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length); payload.copy(result, 4);
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
    return result;
}
const header = Buffer.alloc(13);
header.writeUInt32BE(image.width); header.writeUInt32BE(image.height, 4);
header[8] = 8; header[9] = 2;
const rows = Buffer.alloc(image.height * (image.width * 3 + 1));
for (let row = 0; row < image.height; row++) {
    rows.set(image.pixels.subarray(row * image.width * 3, (row + 1) * image.width * 3), row * (image.width * 3 + 1) + 1);
}
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
writeFileSync(`public/${GROUND_COVERAGE_MAP}`, png);
const rockPng = encodePng8(rock.width, rock.height, 1, new Uint8Array(rock.pixels));
writeFileSync(`public/${ROCK_COVERAGE_MAP}`, rockPng);
const beachPng = encodePng8(beach.width, beach.height, 1, new Uint8Array(beach.pixels));
const detailPng = encodePng8(detail.width, detail.height, 3, new Uint8Array(detail.pixels));
writeFileSync(`public/${BEACH_COVERAGE_MAP}`, beachPng);
writeFileSync(`public/${DETAIL_COVERAGE_MAP}`, detailPng);
const ironPng=encodePng8(iron.width,iron.height,1,new Uint8Array(iron.pixels));
writeFileSync(`public/${IRON_MOUNTAINS_MASK}`,ironPng);
writeFileSync('public/assets/textures/ground-coverage-9.json', JSON.stringify({
    source: ROADS_BIOME_MAP, sourceSha256: createHash('sha256').update(source).digest('hex'),
    output: GROUND_COVERAGE_MAP, outputSha256: createHash('sha256').update(png).digest('hex'),
    width: image.width, height: image.height, channels: ['grass', 'forest', 'desert'],
    rock: ROCK_COVERAGE_MAP, rockSha256: createHash('sha256').update(rockPng).digest('hex'),
    beach: BEACH_COVERAGE_MAP, beachSha256: createHash('sha256').update(beachPng).digest('hex'),
    detail: DETAIL_COVERAGE_MAP, detailSha256: createHash('sha256').update(detailPng).digest('hex'),
    beachPaletteRgb: [[129, 173, 206], [137, 147, 128]],
    iron: IRON_MOUNTAINS_MASK, ironSha256:createHash('sha256').update(ironPng).digest('hex'),
    detailChannels: ['rock', 'beach', 'ironMountains'],
    remainingGround: '1 - sum(RGB) - rock - beach; roads continue nearest land underneath and remain a separate overlay',
    sigmaMetres: GROUND_BLEND_SIGMA_METRES, orientation: 'same endpoints and orientation as source biome PNG',
    correction: 'Forest Overlook stays forest; sandy pixels in northern corridor x[-85,35], z<-70 become rock (Babylon metres)',
}, null, 2) + '\n');
console.log(`Saved ${GROUND_COVERAGE_MAP}: ${image.width}x${image.height}, ${png.length} bytes`);
console.log(`Saved ${ROCK_COVERAGE_MAP}: ${rockPng.length} bytes`);

console.log(`Saved ${BEACH_COVERAGE_MAP}: ${beachPng.length} bytes; ${DETAIL_COVERAGE_MAP}: ${detailPng.length} bytes`);
