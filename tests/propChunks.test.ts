import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ShadowSystem } from '../src/render/shadows.ts';
import { DepthPass } from '../src/render/depthPass.ts';
import { DesertPropChunks } from '../src/world/desertPropChunks.ts';
import type { PropBatch } from '../src/world/desertProps.ts';
import { partitionPropChunks, chunkInRange, selectPropChunk } from '../src/world/propChunks.ts';

test('chunks deterministically partition negative coordinates and boundaries without losing placements', () => {
    const centers = new Float32Array([-96,-96,-.1,0,0,0,95.9,0,96,0]);
    const chunks = partitionPropChunks(centers,96);
    assert.deepEqual(chunks.map(c=>c.key),['-1:-1','-1:0','0:0','1:0']);
    assert.deepEqual(chunks.map(c=>Array.from(c.members)),[[0],[1],[2,3],[4]]);
    assert.deepEqual(partitionPropChunks(centers,96),chunks);
    assert.equal(chunkInRange(chunks[3],0,0,95),false);
    assert.equal(chunkInRange(chunks[3],0,0,96),true);
    assert.throws(()=>partitionPropChunks(centers,0),/Invalid/);
});

test('chunk selection preserves legacy near/far thresholds and source placement IDs', () => {
    const centers = new Float32Array([0,0,16,0,46,0,47,0]);
    const chunk = partitionPropChunks(centers,96)[0];
    const near = new Uint32Array(4), far = new Uint32Array(4), counts = {nearCount:0,farCount:0};
    selectPropChunk(chunk,centers,0,0,46,16,near,far,counts);
    assert.deepEqual(counts,{nearCount:1,farCount:2});
    assert.deepEqual(Array.from(near.slice(0,1)),[0]);
    assert.deepEqual(Array.from(far.slice(0,2)),[1,2]);
    counts.nearCount = counts.farCount = 0;
    selectPropChunk(chunk,centers,1000,0,46,16,near,far,counts);
    assert.deepEqual(counts,{nearCount:0,farCount:0});
});

test('pooled prop chunks share geometry, refresh bounds, preserve off-camera shadows and clean registrations', () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const shadows = new ShadowSystem(scene), depth = new DepthPass(scene);
    try {
        const camera = new FreeCamera('camera',new Vector3(0,3,-10),scene);
        camera.setTarget(Vector3.Zero());
        const data = VertexData.CreateBox({size:2});
        const mesh = new Mesh('desert:test',scene), far = new Mesh('desert:test:distant',scene);
        data.applyToMesh(mesh); data.applyToMesh(far);
        const material = new ShaderMaterial('test',scene,'unused',{attributes:['position'],uniforms:['world','viewProjection']});
        mesh.material = far.material = material;
        const all = new Float32Array(64), centers = new Float32Array([0,0,12,0,260,0,272,0]);
        for(let i=0;i<4;i++) Matrix.Translation(centers[i*2],0,centers[i*2+1]).copyToArray(all,i*16);
        const batch: PropBatch = {mesh,far,data,sourceMaterial:new PBRMaterial('source',scene),centers,
            all,names:['a','b','c','d'],count:0,distance:40,size:2,shadowMats:[material,material,material],prepass:material};
        for(const matrix of shadows.matrices) Matrix.OrthoLHToRef(800,800,-800,800,matrix);
        const originalReferences = mesh.geometry!.getIndexBuffer()!.references;
        const chunks = new DesertPropChunks(scene,[batch],shadows,depth,96);
        for(const x of [0,260,0,260,0,30,0]) {
            camera.position.set(x,3,-10); camera.setTarget(new Vector3(x,0,0));
            chunks.update(new Vector3(x,0,0),true);
            assert.equal(chunks.visibleInstances,2);
            assert.equal(chunks.stats.pooledSlots,4,'teleports recycle the same per-pass buffers');
            for(const target of shadows.maps) assert.equal(new Set(target.renderList).size,target.renderList!.length);
            assert.equal(new Set(depth.rtt.renderList).size,depth.rtt.renderList!.length);
            assert.equal(depth.materials.length,depth.rtt.renderList!.length);
        }
        const active = scene.meshes.find(m=>m.name.includes(':chunk:') && m.isEnabled())!;
        assert.notEqual((active as Mesh).geometry,mesh.geometry,'instance attribute bindings are isolated per pass');
        assert.equal(active.getVertexBuffer('position')!.getBuffer(),mesh.getVertexBuffer('position')!.getBuffer(),'model GPU vertices remain shared');
        assert.equal((active as Mesh).geometry!.getIndexBuffer(),mesh.geometry!.getIndexBuffer(),'model GPU indices remain shared');
        const cameraMesh = scene.meshes.find(m=>m.name.endsWith(':chunk:0:near'))!;
        const shadowMesh = scene.meshes.find(m=>m.name.endsWith(':chunk:1:near'))!;
        assert.notEqual(cameraMesh.getVertexBuffer('world0')!.getBuffer(),shadowMesh.getVertexBuffer('world0')!.getBuffer(),'passes cannot overwrite each other’s transforms');
        assert.deepEqual(Array.from((cameraMesh as Mesh).thinInstanceGetWorldMatrices()[0].asArray()),Array.from(all.slice(0,16)),'beauty retains the authored matrix');
        assert.ok(active.getBoundingInfo().boundingBox.maximumWorld.x < 20,'bounds contain this chunk, not the distant placements');
        camera.setTarget(new Vector3(0,3,-100));
        chunks.update(Vector3.Zero(),false);
        assert.equal(chunks.stats.depthMeshes,0,'camera rotation updates depth culling without rewriting instance membership');
        assert.ok(shadows.maps.every(map=>map.renderList!.length>0),'off-camera casters remain in the light volume');
        const materials = shadows.materials.length;
        chunks.update(new Vector3(1000,0,0),true);
        assert.equal(chunks.visibleInstances,0);
        assert.ok(shadows.maps.every(map=>map.renderList!.length===0));
        chunks.update(Vector3.Zero(),true);
        assert.equal(shadows.materials.length,materials,'revisiting a chunk does not accumulate registrations');
        chunks.dispose();
        assert.ok(shadows.maps.every(map=>map.renderList!.length===0));
        assert.equal(shadows.materials.length,0);
        assert.equal(depth.rtt.renderList!.length,0);
        assert.equal(depth.materials.length,0);
        assert.equal(mesh.geometry!.getIndexBuffer()!.references,originalReferences,'shared index references are released without freeing the prototype');
        assert.ok(mesh.getVertexBuffer('position')!.getBuffer(),'shared prototype vertices survive pass disposal');
    } finally { depth.dispose(); shadows.dispose(); scene.dispose(); engine.dispose(); }
});
