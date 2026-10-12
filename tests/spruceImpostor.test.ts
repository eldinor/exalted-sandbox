import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { spruceImpostorViews, selectImpostorView } from '../src/forest/ImpostorViews.ts';
import { parseSpruceAtlas } from '../src/forest/SpruceImpostor.ts';
import { writeImpostorCard } from '../src/forest/ImpostorBatchGeometry.ts';
import { usesBorderImpostor } from '../src/forest/ClosedForestPlacement.ts';
import { denseForestBoundaryAt } from '../src/forest/DenseForestShape.ts';
import { ForestImpostorBatch } from '../src/forest/ForestImpostorBatch.ts';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { DepthPass } from '../src/render/depthPass.ts';

const root = 'public/terrain/forest/blue-spruce';
const metadata = JSON.parse(readFileSync(`${root}/impostor.json`, 'utf8'));
const atlas = parseSpruceAtlas(metadata);

test('spruce fills the interior except for the real-tree edge and spawn surround', () => {
    assert.equal(usesBorderImpostor(-468,0),true);
    const edge = denseForestBoundaryAt(0)-15;
    assert.equal(usesBorderImpostor(edge,0),true);
    assert.equal(usesBorderImpostor(edge+.001,0),false);
    assert.equal(usesBorderImpostor(-352,0),false);
    assert.equal(usesBorderImpostor(-410,52),false,'real trees surround the clearing');
    assert.equal(usesBorderImpostor(-440,52),true,'impostors resume beyond the spawn surround and real contour edge');
});

test('batched cards select object-relative views, retain height and face ground/aerial cameras at every yaw', () => {
    const buffers={positions:new Float32Array(24),normals:new Float32Array(24),uvs:new Float32Array(16),yaw:new Float32Array(16)};
    for(const yaw of [0,.7,Math.PI,5.4])for(let frame=0;frame<atlas.views.length;frame++) {
        const site={x:-430,y:80,z:31,height:20,yaw},scale=site.height/atlas.sourceHeight,c=Math.cos(yaw),s=Math.sin(yaw);
        const center=new Vector3(site.x+(c*atlas.center[0]+s*atlas.center[2])*scale,site.y+atlas.center[1]*scale,site.z+(-s*atlas.center[0]+c*atlas.center[2])*scale);
        const d=atlas.views[frame].direction,dir=new Vector3(c*d[0]+s*d[2],d[1],-s*d[0]+c*d[2]);
        assert.equal(writeImpostorCard(atlas,buffers,1,site,center.add(dir.scale(100))),frame);
        assert.deepEqual(Array.from(buffers.positions.subarray(0,12)),new Array(12).fill(0),'writing slot 1 preserves slot 0');
        const mean=Vector3.Zero(),vertices=[];
        for(let i=0;i<4;i++){
            const vertex=Vector3.FromArray(buffers.positions,12+i*3);vertices.push(vertex);mean.addInPlace(vertex);
            assert.ok(Math.abs(Vector3.Dot(vertex.subtract(center),dir))<.0001,'card lies in camera-facing plane');
            assert.ok(Math.abs(buffers.yaw[8+i*2]-c)<1e-6);assert.ok(Math.abs(buffers.yaw[9+i*2]-s)<1e-6);
            const u=buffers.uvs[8+i*2],v=buffers.uvs[9+i*2];
            assert.ok(u>(frame%atlas.columns)/atlas.columns&&u<(frame%atlas.columns+1)/atlas.columns);
            assert.ok(v>Math.floor(frame/atlas.columns)/atlas.rows&&v<(Math.floor(frame/atlas.columns)+1)/atlas.rows);
        }
        assert.ok(Vector3.Distance(mean.scale(.25),center)<.0001);
        assert.ok(Math.abs(Vector3.Distance(vertices[0],vertices[1])-atlas.planeSize*scale)<.0001);
    }
});

test('chunk cards reuse geometry, bound all views, compact visibility and remove depth registrations', () => {
    const engine=new NullEngine(),scene=new Scene(engine),depth=new DepthPass(scene);
    const beauty=new ShaderMaterial('card-colour',scene,{vertex:'test',fragment:'test'}),prepass=new ShaderMaterial('card-depth',scene,{vertex:'test',fragment:'test'});
    // Resource fixture exercises real chunk geometry/depth ownership without loading browser textures.
    const resources={atlas,beauty,prepass} as ConstructorParameters<typeof ForestImpostorBatch>[3];
    const sites=[{x:-430,y:80,z:30,height:20,yaw:1},{x:-440,y:82,z:42,height:18,yaw:2}];
    const batch=new ForestImpostorBatch(scene,'test',sites,resources,depth),other=new ForestImpostorBatch(scene,'other',sites,resources,depth);
    const geometry=batch.mesh.geometry,materialCount=scene.materials.length;
    assert.notEqual(geometry,other.mesh.geometry,'each chunk owns its update buffers');
    other.update(new Vector3(-430,90,30),true);
    for(const camera of [new Vector3(-420,90,40),new Vector3(-430,150,30),new Vector3(-450,85,-30)]){
        for(let i=0;i<20;i++)batch.update(camera,true,true);
        assert.equal(batch.count,2);assert.equal(batch.mesh.subMeshes[0].indexCount,12);
        assert.equal(batch.mesh.geometry,geometry);assert.equal(scene.materials.length,materialCount);
        const box=batch.mesh.subMeshes[0].getBoundingInfo().boundingBox;
        for(let i=0;i<batch.buffers.positions.length;i+=3)for(let axis=0;axis<3;axis++){
            const value=batch.buffers.positions[i+axis];
            assert.ok(value>=box.minimum.asArray()[axis]-.0001&&value<=box.maximum.asArray()[axis]+.0001,'fixed bounds include rotated quad corners');
        }
        assert.equal(depth.rtt.renderList!.filter(mesh=>mesh===batch.mesh).length,1);
    }
    batch.update(new Vector3(1500,90,30),true,true);assert.equal(batch.count,0);assert.equal(batch.mesh.isEnabled(),false);
    assert.equal(depth.rtt.renderList!.length,1);assert.equal(depth.rtt.renderList![0]?.name,other.mesh.name);
    batch.update(new Vector3(-430,90,30),true,true);batch.update(new Vector3(-430,90,30),false,true);
    assert.equal(depth.rtt.renderList!.length,1);assert.equal(depth.rtt.renderList![0]?.name,other.mesh.name);
    batch.dispose();other.dispose();assert.equal(depth.rtt.renderList!.length,0);assert.equal(depth.materials.length,0);
    scene.dispose();engine.dispose();
});

test('cutout conversion preserves geometry, embedded images and hierarchy, with source attribution', () => {
    const original = readFileSync('public/terrain/forest/blue_spruce.glb'), prepared = readFileSync(`${root}/blue-spruce-cutout.glb`);
    const sourceLength = original.readUInt32LE(12), targetLength = prepared.readUInt32LE(12);
    const source = JSON.parse(original.subarray(20,20+sourceLength).toString()), target = JSON.parse(prepared.subarray(20,20+targetLength).toString());
    assert.deepEqual(prepared.subarray(20+targetLength), original.subarray(20+sourceLength));
    for (const field of ['nodes','meshes','accessors','images','textures']) assert.deepEqual(target[field],source[field]);
    assert.deepEqual(target.materials[0],source.materials[0]);
    assert.equal(source.materials[1].alphaMode,'BLEND'); assert.equal(target.materials[1].alphaMode,'MASK');
    assert.equal(target.materials[1].alphaCutoff,.35); assert.equal(target.materials[1].doubleSided,true);
    assert.equal(target.asset.extras.sourceSha256,createHash('sha256').update(original).digest('hex'));
    assert.equal(target.asset.extras.author,source.asset.extras.author); assert.equal(target.asset.extras.license,source.asset.extras.license);
});

test('ground, elevated and overhead frames have orthonormal capture bases and stable nearest-view selection', () => {
    const views=spruceImpostorViews(); assert.equal(views.length,17);
    assert.deepEqual(atlas.views,JSON.parse(JSON.stringify(views)));
    for(let i=0;i<views.length;i++) {
        const frame=views[i],dot=(a:number[],b:number[])=>a.reduce((s,v,k)=>s+v*b[k],0);
        for(const vector of [frame.direction,frame.right,frame.up]) assert.ok(Math.abs(dot(vector,vector)-1)<1e-9);
        assert.ok(Math.abs(dot(frame.direction,frame.right))<1e-9);assert.ok(Math.abs(dot(frame.direction,frame.up))<1e-9);
        assert.ok(Math.abs(dot(frame.up,frame.right))<1e-9);
        assert.equal(selectImpostorView(views,...frame.direction),i);
    }
    assert.equal(selectImpostorView(views,0,100,0),16,'overhead camera sees the real crown bake');
    assert.equal(selectImpostorView(views,0,0,100),0);
    assert.equal(selectImpostorView(views,0,0,-100),4);
});

test('atlas parser rejects malformed dimensions, missing views, invalid vectors and unsafe cutout values', () => {
    for(const invalid of [null,{...metadata,version:2},{...metadata,planeSize:0},{...metadata,columns:0},
        {...metadata,tileSize:16384},{...metadata,views:[]},{...metadata,alphaCutoff:0},
        {...metadata,center:[0,NaN,0]},{...metadata,views:[{direction:[0,1],right:[1,0,0],up:[0,0,1]}]}]) {
        assert.throws(()=>parseSpruceAtlas(invalid));
    }
});

/** Decode canvas-generated RGBA8 only, to validate paired alpha silhouettes. */
function pixels(bytes:Buffer): Uint8Array {
    assert.equal(bytes[24],8);assert.equal(bytes[25],6);
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),chunks:Buffer[]=[];
    for(let o=8;o<bytes.length;){const n=bytes.readUInt32BE(o);if(bytes.toString('ascii',o+4,o+8)==='IDAT')chunks.push(bytes.subarray(o+8,o+8+n));o+=n+12;}
    const scan=inflateSync(Buffer.concat(chunks)),stride=width*4,out=new Uint8Array(stride*height);
    for(let y=0;y<height;y++)for(let x=0;x<stride;x++){
        const filter=scan[y*(stride+1)],left=x>=4?out[y*stride+x-4]:0,up=y?out[(y-1)*stride+x]:0,diagonal=y&&x>=4?out[(y-1)*stride+x-4]:0;
        let prediction=0;
        if(filter===1)prediction=left;else if(filter===2)prediction=up;else if(filter===3)prediction=Math.floor((left+up)/2);
        else if(filter===4){const p=left+up-diagonal,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-diagonal);prediction=a<=b&&a<=c?left:b<=c?up:diagonal;}
        else assert.equal(filter,0);
        out[y*stride+x]=scan[y*(stride+1)+1+x]+prediction;
    }
    return out;
}
test('colour and object-normal atlases have matching alpha in all 17 views, transparent gutters and recorded hashes', () => {
    const colour=readFileSync(`${root}/impostor-colour.png`),normal=readFileSync(`${root}/impostor-normal.png`);
    assert.equal(createHash('sha256').update(colour).digest('hex'),metadata.colourSha256);
    assert.equal(createHash('sha256').update(normal).digest('hex'),metadata.normalSha256);
    assert.equal(colour.readUInt32BE(16),4096);assert.equal(colour.readUInt32BE(20),1536);
    const c=pixels(colour),n=pixels(normal);
    for(let i=3;i<c.length;i+=4) assert.equal(c[i],n[i],'normal/colour silhouette must match');
    for(let frame=0;frame<24;frame++) {
        let occupied=0;
        for(let y=0;y<512;y++)for(let x=0;x<512;x++){
            const offset=((Math.floor(frame/8)*512+y)*4096+(frame%8*512+x))*4;
            if(c[offset+3])occupied++;
            if(x<8||x>503||y<8||y>503)assert.equal(c[offset+3],0,'view gutters prevent neighbouring frame bleed');
        }
        if(frame<17)assert.ok(occupied>1000,`Missing baked view ${frame}`);else assert.equal(occupied,0);
    }
});
