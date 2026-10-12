import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

function load(path) {
    const bytes = readFileSync(path), length = bytes.readUInt32LE(12);
    assert.equal(bytes.readUInt32LE(0), 0x46546c67);
    assert.equal(bytes.readUInt32LE(4), 2);
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    return { bytes, json: JSON.parse(bytes.subarray(20, 20 + length)), binary: bytes.subarray(28 + length) };
}
const root = 'public/terrain/grassland/dandelions/';
const prepared = load(`${root}dandelions.glb`);
const source = load('public/assets/exalted/undergrowth_pack_lowpoly_game-ready.glb');
const manifest = JSON.parse(readFileSync(`${root}dandelions.manifest.json`, 'utf8'));
test('selected daisies retain source cutout, only LOD1 geometry and cleared display offsets',()=>{
    const pack=load('public/terrain/grassland/daisies/daisies.glb');
    const original=load('public/assets/exalted/daisy_models_pack_realistic_optimized.glb');
    const d=pack.json;
    assert.equal(d.asset.extras.sourceSha256,createHash('sha256').update(original.bytes).digest('hex'));
    assert.equal(d.asset.extras.license,original.json.asset.extras.license);
    assert.equal(d.meshes.length,3);assert.equal(d.materials.length,1);assert.equal(d.images.length,3);
    assert.equal(d.materials[0].alphaMode,'MASK');
    assert.equal(d.materials[0].alphaCutoff,original.json.materials[0].alphaCutoff);
    assert.deepEqual(d.meshes.map(m=>d.accessors[m.primitives[0].indices].count/3),[139,190,196]);
    assert.ok(!d.nodes.some(n=>/_LOD[02]|patch/.test(n.name)));
    for(const node of d.nodes.filter(n=>/^Daisy_[123](_LOD1)?$/.test(n.name))){
        assert.deepEqual(node.matrix.slice(12),[0,0,0,1]);
        const sourceNode=original.json.nodes.find(n=>n.name===node.name);
        assert.deepEqual(node.matrix.slice(0,12),sourceNode.matrix.slice(0,12));
    }
    const hashImages=asset=>asset.json.images.slice(0,3).map((_,i)=>createHash('sha256').update(imageBytes(asset,i)).digest('hex')).sort();
    assert.deepEqual(hashImages(pack),hashImages(original));
    d.meshes.forEach(m=>{
        const sourceMesh=original.json.meshes.find(sm=>sm.name===m.name);
        const p=m.primitives[0],sp=sourceMesh.primitives[0];
        assert.deepEqual(accessorBytes(pack,p.indices),accessorBytes(original,sp.indices));
        for(const key of Object.keys(sp.attributes))assert.deepEqual(accessorBytes(pack,p.attributes[key]),accessorBytes(original,sp.attributes[key]));
    });
});
function imageBytes(asset, index) {
    const view = asset.json.bufferViews[asset.json.images[index].bufferView];
    return asset.binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}
function accessorBytes(asset, index) {
    const a = asset.json.accessors[index], view = asset.json.bufferViews[a.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type] * { 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
    const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = view.byteStride ?? size;
    const bytes = Buffer.alloc(size * a.count);
    for (let i = 0; i < a.count; i++) asset.binary.copy(bytes, i * size, start + i * stride, start + i * stride + size);
    return bytes;
}

test('dandelion subset retains selected geometry, hierarchy and source attribution', () => {
    const d = prepared.json;
    assert.equal(d.asset.extras.sourceSha256, createHash('sha256').update(source.bytes).digest('hex'));
    assert.equal(d.asset.extras.license, source.json.asset.extras.license);
    assert.equal(d.asset.extras.author, source.json.asset.extras.author);
    assert.equal(d.meshes.length, 4);
    assert.equal(manifest.byteLength, prepared.bytes.length);
    assert.equal(manifest.variants.reduce((sum, v) => sum + v.recommendedFlowerShare, 0), 100);
    for (const variant of manifest.variants) {
        const node = d.nodes.find(n => n.name === variant.name);
        const original = source.json.nodes.find(n => n.name === variant.sourceNode);
        assert.deepEqual(node.matrix.slice(0, 12), original.matrix.slice(0, 12));
        assert.deepEqual(node.matrix.slice(12), [0, 0, 0, 1]);
        const mesh = d.meshes[d.nodes[node.children[0]].mesh];
        const sourceMesh = source.json.meshes[source.json.nodes[original.children[0]].mesh];
        assert.equal(mesh.primitives.length, sourceMesh.primitives.length);
        mesh.primitives.forEach((p, i) => {
            const sp = sourceMesh.primitives[i];
            assert.deepEqual(accessorBytes(prepared, p.indices), accessorBytes(source, sp.indices));
            for (const key of Object.keys(sp.attributes)) assert.deepEqual(accessorBytes(prepared, p.attributes[key]), accessorBytes(source, sp.attributes[key]));
        });
        assert.ok(variant.naturalHeightMetres > .23 && variant.naturalHeightMetres < .25);
    }
    assert.ok(!d.nodes.some(n => /Ground|Lactuca|Plantain|Man_ref|Dandelion\.004/.test(n.name)));
});

test('dandelion material shares unchanged textures with explicit double-sided alpha cutout', () => {
    const d = prepared.json;
    assert.equal(d.materials.length, 1);
    assert.equal(d.images.length, 3);
    const m = d.materials[0], sm = source.json.materials.find(m => m.name === 'Dandelion_Mat');
    assert.equal(m.alphaMode, 'MASK');
    assert.equal(m.alphaCutoff, .35);
    assert.equal(m.doubleSided, true);
    const textureIndices = mat => [mat.pbrMetallicRoughness.baseColorTexture.index, mat.pbrMetallicRoughness.metallicRoughnessTexture.index, mat.normalTexture.index];
    textureIndices(m).forEach((t, i) => {
        assert.deepEqual(imageBytes(prepared, d.textures[t].source), imageBytes(source, source.json.textures[textureIndices(sm)[i]].source));
    });
    for (const view of d.bufferViews) assert.ok((view.byteOffset ?? 0) + view.byteLength <= d.buffers[0].byteLength);
});
