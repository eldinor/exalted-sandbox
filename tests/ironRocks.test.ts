import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {buildAuthoredHeightmap,decodeAuthoredPng,ROADS_HEIGHTMAP,ROADS_BIOME_MAP} from '../src/terrain/authoredHeightmap.ts';
import {MeshSurface} from '../src/terrain/meshSurface.ts';
import {maskWeightAt,placeIronRocks, type IronRockQueries} from '../src/world/IronRockPlacement.ts';
import {placeStoneGateWall,STONE_GATE_WALL_ENDS} from '../src/world/StoneGateWall.ts';
import {PropCollisions} from '../src/world/propCollisions.ts';
import {buildStoneGateCliff,STONE_GATE_CLIFF} from '../src/world/StoneGateCliff.ts';

test('Stone Gate wall closes its span, is grounded and reuses three stone layers',()=>{
    const heightAt=(x:number,z:number)=>114+x*.01+z*.005;
    const wall=placeStoneGateWall(heightAt),[a,b]=STONE_GATE_WALL_ENDS;
    assert.equal(wall.length,13);assert.deepEqual(wall,placeStoneGateWall(heightAt));
    assert.deepEqual([...new Set(wall.map(s=>s.layer))].sort(),[1,2,3]);
    const grid=new PropCollisions();
    for(const s of wall){
        assert.ok(s.y<heightAt(s.x,s.z));assert.ok(s.y+s.height>heightAt(s.x,s.z)+3);
        grid.add({x:s.x,z:s.z,radius:Math.max(s.width,s.depth)*.46,minY:s.y,maxY:s.y+s.height});
    }
    // Endpoint rocks are existing authored accents; the new pieces must overlap them.
    grid.add({x:a.x,z:a.z,radius:4.39798*.46,minY:110,maxY:118});
    grid.add({x:b.x,z:b.z,radius:2.13454*.46,minY:110,maxY:118});
    const length=Math.hypot(b.x-a.x,b.z-a.z),nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length;
    for(let i=0;i<=140;i++){
        const x=a.x+(b.x-a.x)*i/140,z=a.z+(b.z-a.z)*i/140;
        assert.ok(grid.colliders.some(s=>Math.hypot(x-s.x,z-s.z)<s.radius+.32),'No walkable gap along the wall');
        const position={x:x-nx*8,y:heightAt(x,z),z:z-nz*8},velocity={x:nx*16,z:nz*16};
        grid.move(position,velocity,1);
        if(i>14&&i<126)assert.ok((position.x-x)*nx+(position.z-z)*nz<0,'Movement across the interior is stopped; sliding around endpoints is allowed');
    }
    for(const collider of [...grid.colliders])grid.remove(collider);
    assert.equal(grid.colliders.length,0);assert.equal(grid.cells.size,0);
    assert.throws(()=>placeStoneGateWall(()=>NaN));
});

test('rock placement excludes complete road/water footprints, steep slopes and teleport clearing',()=>{
    const q:IronRockQueries={ironAt:()=>1,roadAt:(x)=>Math.abs(x)<8?1:0,heightAt:()=>50,upAt:()=>1,submergedAt:(x,z)=>z>0};
    const sites=placeIronRocks(q);assert.equal(sites.length,44);assert.deepEqual(sites,placeIronRocks(q));
    for(const s of sites){const r=Math.hypot(s.width,s.depth)*.5;
        assert.ok(Math.abs(s.x)>8+r+1);assert.ok(s.z+r<2);assert.ok(Math.hypot(s.x+257.5,s.z+190)>=18+r);
        assert.equal(s.y,50-s.height*.22);
    }
    assert.equal(placeIronRocks({...q,upAt:()=>.4}).length,0);
    assert.equal(placeIronRocks({...q,ironAt:()=>0}).length,0);
    assert.equal(placeIronRocks({...q,submergedAt:()=>true}).length,0);
});
test('authored Iron Mountains accents stay on the mask and retain real triangle grounding',()=>{
    const png=(path:string)=>decodeAuthoredPng(readFileSync('public/'+path));
    const iron=png('assets/textures/biome-iron-mountains-9.png'),road=png('assets/textures/mask-roads-9.png');
    const data=buildAuthoredHeightmap(png(ROADS_HEIGHTMAP),png(ROADS_BIOME_MAP));
    assert.ok(data.positions&&data.indices);const surface=new MeshSurface(data.positions,data.indices),n=new Vector3();
    const facing=buildStoneGateCliff((x,z)=>surface.sample(x,z));
    assert.ok(facing.positions&&facing.indices&&facing.normals&&facing.uvs);
    assert.equal(facing.indices.length/3,1152);
    assert.deepEqual(facing.positions,buildStoneGateCliff((x,z)=>surface.sample(x,z)).positions);
    let exposed=0;
    for(let i=0;i<facing.positions.length/3;i++){
        const x=facing.positions[i*3],y=facing.positions[i*3+1],z=facing.positions[i*3+2];
        assert.ok([x,y,z].every(Number.isFinite));
        // The derived display map has low gray-classification noise on cliff rock.
        assert.ok(maskWeightAt(road,x,z)<.15,'Facing stays outside road coverage');
        assert.ok(Math.abs(facing.uvs[i*2]+z/8)<.001);
        assert.ok(Math.abs(facing.uvs[i*2+1]-y/8)<.001);
        if(y>surface.sample(x,z)+1)exposed++;
        if(i%(STONE_GATE_CLIFF.levels+1)>1&&i%(STONE_GATE_CLIFF.levels+1)<20)assert.ok(facing.normals[i*3]<0,'Cliff normals face the pass');
    }
    assert.ok(exposed>400,'Facing covers the cliff rather than sitting inside it');
    assert.throws(()=>buildStoneGateCliff(()=>NaN));
    const q:IronRockQueries={ironAt:(x,z)=>maskWeightAt(iron,x,z),roadAt:(x,z)=>maskWeightAt(road,x,z),
        heightAt:(x,z)=>surface.sample(x,z),upAt:(x,z)=>{surface.sample(x,z,n);return n.y;},submergedAt:()=>false};
    const sites=placeIronRocks(q);assert.equal(sites.filter(s=>s.kind==='cliff').length,12);assert.equal(sites.filter(s=>s.kind==='boulder').length,32);
    for(const s of sites){assert.ok(q.ironAt(s.x,s.z)>.98);assert.ok(q.roadAt(s.x,s.z)<.015);assert.ok(s.y<q.heightAt(s.x,s.z));assert.ok(Number.isFinite(s.y));}
    console.log('Iron rock budget:',sites.length,'sites;',sites.length*768,'triangles');
});
