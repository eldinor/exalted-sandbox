/** Export selected forest detail props with deduplicated, unchanged PNG maps. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const source = 'public/terrain/forest/coniferous_forest_assets_pack.glb';
const destination = 'public/terrain/forest/coniferous-selected';
const selection = [
    ['Coniferous Dead Log_5', 'fallen-log.glb'],
    ['Coniferous Dead Tree_6', 'dead-tree-tall.glb'],
    ['Coniferous Dead Tree 2_7', 'dead-tree-short.glb'],
    ['BoulderMossyLarge_8', 'boulder-mossy.glb'],
    ['BoulderPlainLarge_13', 'boulder-plain.glb'],
];
const textureNames = { 0: 'bark-color.png', 1: 'bark-normal.png', 4: 'mossy-rock-color.png',
    5: 'mossy-rock-normal.png', 6: 'plain-rock-color.png', 7: 'plain-rock-normal.png' };
const bytes = readFileSync(source), hash = createHash('sha256').update(bytes).digest('hex');
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('Expected GLB version 2.');
const jsonSize = bytes.readUInt32LE(12), original = JSON.parse(bytes.subarray(20, 20 + jsonSize).toString());
const binary = bytes.subarray(28 + jsonSize, 28 + jsonSize + bytes.readUInt32LE(20 + jsonSize));
mkdirSync(join(destination, 'textures'), { recursive: true });
const parents = new Map();
original.nodes.forEach((node, i) => { for (const child of node.children ?? []) parents.set(child, i); });
const exportedTextures = new Set();
const assets = [];

for (const [name, file] of selection) {
    const selected = original.nodes.findIndex(node => node.name === name);
    if (selected < 0) throw new Error(`Missing ${name}.`);
    const keep = new Set();
    const descend = i => { keep.add(i); for (const child of original.nodes[i].children ?? []) descend(child); };
    descend(selected);
    let ancestor = parents.get(selected);
    while (ancestor !== undefined) { keep.add(ancestor); ancestor = parents.get(ancestor); }
    const out = { asset: structuredClone(original.asset), scene: 0, scenes: [{ nodes: [0] }], nodes: [], meshes: [], materials: [],
        accessors: [], bufferViews: [], buffers: [{ byteLength: 0 }], textures: [], images: [], samplers: [],
        extensionsUsed: original.extensionsUsed, extensionsRequired: original.extensionsRequired };
    out.asset.extras = { ...out.asset.extras, derivedFrom: source, sourceSha256: hash, selectedAsset: name,
        preparation: 'Display translation removed; rotation, scale, authored ground plane, geometry and materials preserved. Texture PNGs shared externally.' };
    const maps = Object.fromEntries(['nodes', 'meshes', 'materials', 'accessors', 'textures', 'images', 'samplers'].map(k => [k, new Map()]));
    const chunks = []; let binarySize = 0;
    const append = (data, target) => {
        const pad = (4 - binarySize % 4) % 4;
        if (pad) { chunks.push(Buffer.alloc(pad)); binarySize += pad; }
        const index = out.bufferViews.length;
        out.bufferViews.push({ buffer: 0, byteOffset: binarySize, byteLength: data.length, ...(target ? { target } : {}) });
        chunks.push(data); binarySize += data.length; return index;
    };
    const copy = (kind, index) => {
        if (maps[kind].has(index)) return maps[kind].get(index);
        const value = structuredClone(original[kind][index]);
        if (!value) throw new Error(`Missing ${kind}[${index}].`);
        const next = out[kind].length; maps[kind].set(index, next); out[kind].push(value);
        if (kind === 'nodes') {
            if (value.mesh !== undefined) value.mesh = copy('meshes', value.mesh);
            const children = (value.children ?? []).filter(child => keep.has(child));
            if (children.length) value.children = children.map(child => copy('nodes', child)); else delete value.children;
            if (index === selected) {
                if (value.matrix) value.matrix[12] = value.matrix[13] = value.matrix[14] = 0;
                if (value.translation) value.translation = [0, 0, 0];
            }
        } else if (kind === 'meshes') {
            for (const primitive of value.primitives) {
                for (const key of Object.keys(primitive.attributes)) primitive.attributes[key] = copy('accessors', primitive.attributes[key]);
                if (primitive.indices !== undefined) primitive.indices = copy('accessors', primitive.indices);
                if (primitive.material !== undefined) primitive.material = copy('materials', primitive.material);
            }
        } else if (kind === 'accessors') {
            if (value.sparse) throw new Error('Sparse accessors are not supported by this extractor.');
            const view = original.bufferViews[value.bufferView];
            const channels = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[value.type];
            const componentSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[value.componentType];
            if (!channels || !componentSize) throw new Error('Unsupported accessor format.');
            const size = channels * componentSize, packed = Buffer.alloc(value.count * size);
            const start = (view.byteOffset ?? 0) + (value.byteOffset ?? 0), stride = view.byteStride ?? size;
            for (let i = 0; i < value.count; i++) binary.copy(packed, i * size, start + i * stride, start + i * stride + size);
            value.bufferView = append(packed, view.target); value.byteOffset = 0;
        } else if (kind === 'materials') {
            const visit = object => {
                for (const [key, child] of Object.entries(object)) if (child && typeof child === 'object') {
                    if (key.endsWith('Texture') && Number.isInteger(child.index)) child.index = copy('textures', child.index);
                    else visit(child);
                }
            };
            visit(value);
        } else if (kind === 'textures') {
            value.source = copy('images', value.source);
            if (value.sampler !== undefined) value.sampler = copy('samplers', value.sampler);
        } else if (kind === 'images') {
            const filename = textureNames[index];
            if (!filename || value.bufferView === undefined) throw new Error(`Unexpected image ${index}.`);
            const view = original.bufferViews[value.bufferView];
            const data = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
            if (!exportedTextures.has(index)) { writeFileSync(join(destination, 'textures', filename), data); exportedTextures.add(index); }
            delete value.bufferView; value.uri = `textures/${filename}`;
        }
        return next;
    };
    copy('nodes', 0); out.buffers[0].byteLength = binarySize;
    const json = Buffer.from(JSON.stringify(out)), jsonPad = (4 - json.length % 4) % 4, binPad = (4 - binarySize % 4) % 4;
    const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
    header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + jsonPad + binarySize + binPad, 8);
    header.writeUInt32LE(json.length + jsonPad, 12); header.writeUInt32LE(0x4e4f534a, 16);
    binHeader.writeUInt32LE(binarySize + binPad); binHeader.writeUInt32LE(0x004e4942, 4);
    const result = Buffer.concat([header, json, Buffer.alloc(jsonPad, 32), binHeader, ...chunks, Buffer.alloc(binPad)]);
    writeFileSync(join(destination, file), result);
    const triangles = out.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((s, p) => s + out.accessors[p.indices].count / 3, 0), 0);
    assets.push({ file, sourceNode: name, triangles, bytes: result.length });
    console.log(`${file}: ${triangles} triangles, ${result.length} bytes`);
}
writeFileSync(join(destination, 'manifest.json'), JSON.stringify({ source, sourceSha256: hash,
    attribution: original.asset.extras, preparation: 'Shared external PNG maps; zeroed asset display translations only.', assets }, null, 2) + '\n');
