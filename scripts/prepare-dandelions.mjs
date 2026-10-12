/** Extract four selected dandelion silhouettes with shared alpha-cutout PBR textures. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const source = 'public/assets/exalted/undergrowth_pack_lowpoly_game-ready.glb';
const destination = 'public/terrain/grassland/dandelions/dandelions.glb';
const bytes = readFileSync(source);
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('Expected GLB version 2.');
const jsonLength = bytes.readUInt32LE(12), binaryStart = 28 + jsonLength;
const original = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const binary = bytes.subarray(binaryStart, binaryStart + bytes.readUInt32LE(20 + jsonLength));
const sourceHash = createHash('sha256').update(bytes).digest('hex');
const out = { asset: structuredClone(original.asset), scene: 0, scenes: [{ nodes: [0] }], nodes: [], meshes: [], materials: [],
    accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }], textures: [], images: [], samplers: [], extensionsUsed: original.extensionsUsed };
out.asset.extras = { ...out.asset.extras, derivedFrom: source, sourceSha256: sourceHash,
    preparation: 'Selected Dandelion 001/002/003 flowers and 005 buds; complete hierarchy rotations/scales retained, display translations cleared; shared foliage alpha cutout 0.35.' };
const bufferChunks = []; let byteLength = 0;
const maps = Object.fromEntries(['nodes', 'meshes', 'materials', 'accessors', 'bufferViews', 'textures', 'images', 'samplers'].map(key => [key, new Map()]));
function copy(kind, index) {
    if (maps[kind].has(index)) return maps[kind].get(index);
    const value = structuredClone(original[kind][index]);
    if (!value) throw new Error(`Missing ${kind}[${index}].`);
    const next = out[kind].length; maps[kind].set(index, next); out[kind].push(value);
    if (kind === 'bufferViews') {
        const pad = (4 - byteLength % 4) % 4;
        if (pad) { bufferChunks.push(Buffer.alloc(pad)); byteLength += pad; }
        bufferChunks.push(binary.subarray(value.byteOffset ?? 0, (value.byteOffset ?? 0) + value.byteLength));
        value.buffer = 0; value.byteOffset = byteLength; byteLength += value.byteLength;
    } else if (kind === 'accessors') {
        if (value.sparse) throw new Error('Sparse accessors are not supported by this pack extractor.');
        const sourceView = original.bufferViews[value.bufferView];
        const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[value.type];
        const componentBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[value.componentType];
        if (!components || !componentBytes) throw new Error('Unsupported accessor format.');
        const size = components * componentBytes, packed = Buffer.alloc(value.count * size);
        const start = (sourceView.byteOffset ?? 0) + (value.byteOffset ?? 0), stride = sourceView.byteStride ?? size;
        for (let i = 0; i < value.count; i++) binary.copy(packed, i * size, start + i * stride, start + i * stride + size);
        const pad = (4 - byteLength % 4) % 4;
        if (pad) { bufferChunks.push(Buffer.alloc(pad)); byteLength += pad; }
        value.bufferView = out.bufferViews.length; value.byteOffset = 0;
        out.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: packed.length, ...(sourceView.target ? { target: sourceView.target } : {}) });
        bufferChunks.push(packed); byteLength += packed.length;
    } else if (kind === 'images') {
        if (value.bufferView !== undefined) value.bufferView = copy('bufferViews', value.bufferView);
    } else if (kind === 'textures') {
        value.source = copy('images', value.source);
        if (value.sampler !== undefined) value.sampler = copy('samplers', value.sampler);
    } else if (kind === 'materials') {
        const visit = object => {
            for (const [key, child] of Object.entries(object)) if (child && typeof child === 'object') {
                if (key.endsWith('Texture') && Number.isInteger(child.index)) child.index = copy('textures', child.index);
                else visit(child);
            }
        };
        visit(value);
        if (value.name === 'Dandelion_Mat') { value.alphaMode = 'MASK'; value.alphaCutoff = .35; }
    } else if (kind === 'meshes') {
        for (const primitive of value.primitives) {
            for (const attribute of Object.keys(primitive.attributes)) primitive.attributes[attribute] = copy('accessors', primitive.attributes[attribute]);
            if (primitive.indices !== undefined) primitive.indices = copy('accessors', primitive.indices);
            if (primitive.material !== undefined) primitive.material = copy('materials', primitive.material);
        }
    } else if (kind === 'nodes') {
        if (value.mesh !== undefined) value.mesh = copy('meshes', value.mesh);
        const selected = (value.children ?? []).filter(child => keep.has(child));
        if (selected.length) value.children = selected.map(child => copy('nodes', child)); else delete value.children;
        if (renamed.has(index)) {
            value.name = renamed.get(index);
            if (value.matrix) value.matrix[12] = value.matrix[13] = value.matrix[14] = 0;
            if (value.translation) value.translation = [0, 0, 0];
        }
    }
    return next;
}
const parents = new Map();
original.nodes.forEach((node, i) => { for (const child of node.children ?? []) parents.set(child, i); });
const keep = new Set();
const descend = index => { keep.add(index); for (const child of original.nodes[index].children ?? []) descend(child); };
const renamed = new Map();
for (let i = 0; i < original.nodes.length; i++) {
    if (!/^Dandelion\.00[1235]$/.test(original.nodes[i].name)) continue;
    renamed.set(i, original.nodes[i].name.replace('.', '_'));
    descend(i);
    let parent = parents.get(i);
    while (parent !== undefined) { keep.add(parent); parent = parents.get(parent); }
}
if (renamed.size !== 4) throw new Error('Missing dandelion variant.');
copy('nodes', 0);
out.buffers[0].byteLength = byteLength;
const json = Buffer.from(JSON.stringify(out)), jsonPad = (4 - json.length % 4) % 4, binaryPad = (4 - byteLength % 4) % 4;
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + jsonPad + byteLength + binaryPad, 8);
header.writeUInt32LE(json.length + jsonPad, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(byteLength + binaryPad); binHeader.writeUInt32LE(0x004e4942, 4);
mkdirSync(destination.slice(0, destination.lastIndexOf('/')), { recursive: true });
writeFileSync(destination, Buffer.concat([header, json, Buffer.alloc(jsonPad, 32), binHeader, ...bufferChunks, Buffer.alloc(binaryPad)]));
console.log(`${destination}: ${out.meshes.length} meshes, ${out.materials.length} materials, ${out.images.length} textures, ${byteLength} binary bytes.`);

const variants = [...renamed].map(([index, name]) => {
    const mesh = original.meshes[original.nodes[original.nodes[index].children[0]].mesh];
    const position = original.accessors[mesh.primitives[0].attributes.POSITION];
    return { name, sourceNode: original.nodes[index].name,
        triangles: mesh.primitives.reduce((sum, primitive) => sum + original.accessors[primitive.indices].count / 3, 0),
        naturalHeightMetres: position.max[2] - position.min[2],
        groundOffsetMetres: -position.min[2],
        role: name.endsWith('005') ? 'Optional unopened-bud accent' : 'Yellow flowering plant',
        recommendedFlowerShare: { Dandelion_001: 45, Dandelion_002: 35, Dandelion_003: 20, Dandelion_005: 0 }[name] };
});
writeFileSync(destination.replace('.glb', '.manifest.json'), JSON.stringify({
    source, sourceSha256: sourceHash, asset: destination, byteLength: readFileSync(destination).length,
    sourceAttribution: original.asset.extras, alphaMode: 'MASK', alphaCutoff: .35,
    upAxis: 'Y after complete glTF hierarchy; raw geometry uses Z',
    variants, omitted: ['Dandelion.004 (similar flowering silhouette)'],
    productionIntegration: 'Prepared only; not placed in the main app'
}, null, 2) + '\n');
