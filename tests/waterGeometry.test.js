import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWaterGeometry,blueWater } from '../src/world/waterGeometry.ts';
import { WaterSurface } from '../src/world/waterSurface.ts';
const reference={lake:[[-10,-10],[10,-10],[10,10],[-10,10]],river:[[0,0],[0,-10]]};
const triangle=(heights,colors)=>({positions:[0,heights[0],0,4,heights[1],0,0,heights[2],4],indices:[0,1,2],colors:colors.flat()});
const blue=[.22,.418,.617,1],sand=[.82,.68,.42,1];
test('water mask rejects snow and sand',()=>{
    assert.equal(blueWater(...blue),1);assert.equal(blueWater(...sand),0);assert.equal(blueWater(.896,.922,.947),0);
});
test('lake clips banks at the waterline and retains positive bed depth',()=>{
    const {lake}=buildWaterGeometry(triangle([-2,2,-2],[blue,blue,blue]),reference);
    assert.equal(lake.indices.length,6);
    for(let i=0;i<lake.positions.length;i+=3) {assert.equal(lake.positions[i+1],.025);assert.ok(lake.positions[i]<=2);}
    assert.ok(lake.colors.every(Number.isFinite));
    assert.ok(lake.colors.filter((_,i)=>i%4===0).every(x=>x>=0));
});
test('blue boundary clips mixed triangles and non-water remains dry',()=>{
    const dry=buildWaterGeometry(triangle([-2,-2,-2],[sand,sand,sand]),reference);
    assert.equal(dry.lake.indices.length,0);assert.equal(dry.river.indices.length,0);
    const {lake}=buildWaterGeometry(triangle([-2,-2,-2],[blue,sand,sand]),reference);
    assert.equal(lake.indices.length,3);assert.ok(Math.max(...lake.positions.filter((_,i)=>i%3===0))<=2);
});
test('river follows slopes above the lake and excludes distant blue regions',()=>{
    const data=triangle([8,8,2],[blue,blue,blue]);
    const {lake,river}=buildWaterGeometry(data,reference);
    assert.equal(lake.indices.length,0);assert.equal(river.indices.length,3);
    assert.ok(river.colors[3]>.5);assert.ok(river.colors[2]>0);
    const excluded=buildWaterGeometry(data,{lake:reference.lake,river:[[200,200],[200,210]]});
    assert.equal(excluded.river.indices.length,0);
});

test('connected heightmap basin reaches banks beyond the old outline and excludes disconnected pools',()=>{
    const data={positions:[0,-2,0, 1,-2,0, 0,-2,1, 5,-2,0,
        100,-2,0, 101,-2,0, 100,-2,1,
        .8,-2,.8, 1.1,-2,.8, .8,-2,1.1],
        indices:[0,1,2, 1,3,2, 4,5,6, 7,8,9],colors:[],waterWeights:Array(10).fill(1)};
    const refs={lake:[[-1,-1],[1.2,-1],[1.2,1.2],[-1,1.2]],river:[]};
    const old=new WaterSurface(buildWaterGeometry(data,refs).lake,0);
    const fixed=new WaterSurface(buildWaterGeometry(data,refs,0,1,'connected-basin').lake,0);
    assert.equal(old.sample(2,.2),null,'legacy outline clips the connected extension');
    assert.ok(fixed.sample(2,.2)?.depth===2);
    assert.equal(fixed.sample(100.2,.2),null,'unconnected external pool stays excluded');
    assert.equal(fixed.sample(.9,.9),null,'smaller disconnected pool inside the reference is excluded');
    assert.equal(fixed.data.indices.length,6);
});

test('connected basin rim meets terrain at the actual rendered plane without changing its physical level',()=>{
    const data=triangle([-2,2,-2],[blue,blue,blue]);data.waterWeights=[1,1,1];
    const geometry=buildWaterGeometry(data,reference,0,1,'connected-basin');
    assert.equal(geometry.level,0);
    let edges=0;
    for(let i=0;i<geometry.lake.positions.length;i+=3){
        const x=geometry.lake.positions[i],y=geometry.lake.positions[i+1];
        assert.equal(y,.025);
        if(geometry.lake.colors[i/3*4]===0){assert.ok(Math.abs(x-2-y)<1e-8);edges++;}
    }
    assert.ok(edges>0);
});

test('sandy island bank joins water below the plane while higher island and river classification stay intact',()=>{
    const data=triangle([-4,1,-4],[blue,sand,blue]);
    data.waterWeights=[1,0,1];data.lakeWeights=[1,1,1];
    const previous=buildWaterGeometry(data,reference,0,1,'reference');
    const current=buildWaterGeometry(data,reference,0,1,'connected-basin');
    const lake=new WaterSurface(current.lake,0);
    assert.equal(new WaterSurface(previous.lake,0).sample(2.5,.2),null);
    assert.ok(lake.sample(2.5,.2)?.depth>0);
    assert.equal(lake.sample(3.5,.1),null,'higher island remains dry');
    assert.equal(current.level,0);
    assert.deepEqual(current.river,previous.river,'lake-only eligibility must not extend the river');
});
