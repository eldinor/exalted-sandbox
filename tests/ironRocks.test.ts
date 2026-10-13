import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {buildAuthoredHeightmap,decodeAuthoredPng,ROADS_HEIGHTMAP,ROADS_BIOME_MAP} from '../src/terrain/authoredHeightmap.ts';
import {MeshSurface} from '../src/terrain/meshSurface.ts';
import {maskWeightAt,placeIronRocks, type IronRockQueries} from '../src/world/IronRockPlacement.ts';

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
    const q:IronRockQueries={ironAt:(x,z)=>maskWeightAt(iron,x,z),roadAt:(x,z)=>maskWeightAt(road,x,z),
        heightAt:(x,z)=>surface.sample(x,z),upAt:(x,z)=>{surface.sample(x,z,n);return n.y;},submergedAt:()=>false};
    const sites=placeIronRocks(q);assert.equal(sites.filter(s=>s.kind==='cliff').length,12);assert.equal(sites.filter(s=>s.kind==='boulder').length,32);
    for(const s of sites){assert.ok(q.ironAt(s.x,s.z)>.98);assert.ok(q.roadAt(s.x,s.z)<.015);assert.ok(s.y<q.heightAt(s.x,s.z));assert.ok(Number.isFinite(s.y));}
    console.log('Iron rock budget:',sites.length,'sites;',sites.length*768,'triangles');
});
