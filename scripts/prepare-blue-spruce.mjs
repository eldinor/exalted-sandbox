/** Preserve source geometry/textures/hierarchy; convert needle transparency to cutout. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const source = 'public/terrain/forest/blue_spruce.glb';
const root = 'public/terrain/forest/blue-spruce';
mkdirSync(root, { recursive: true });
const bytes = readFileSync(source);
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('Expected GLB2.');
const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length));
const binaryChunk = bytes.subarray(20 + length);
let changed = 0;
for (const material of json.materials) if (material.alphaMode === 'BLEND') {
    material.alphaMode = 'MASK'; material.alphaCutoff = .35; changed++;
}
if (changed !== 1) throw new Error('Expected one transparent needle material.');
json.asset.extras = { ...json.asset.extras, derivedFrom: 'blue_spruce.glb',
    sourceSha256: createHash('sha256').update(bytes).digest('hex'), preparation: 'Needles alpha MASK 0.35; geometry, hierarchy and embedded texture bytes preserved.' };
const encoded = Buffer.from(JSON.stringify(json));
const padded = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 0x20); encoded.copy(padded);
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + padded.length + binaryChunk.length, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
writeFileSync(`${root}/blue-spruce-cutout.glb`, Buffer.concat([header, padded, binaryChunk]));
console.log(`Saved cutout spruce; ${changed} material changed, binary chunk preserved.`);
