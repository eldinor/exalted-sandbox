import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {buildAuthoredHeightmap,decodeAuthoredPng,ROADS_HEIGHTMAP,ROADS_BIOME_MAP} from '../src/terrain/authoredHeightmap.ts';
import {biomeMapMaterialWeights} from '../src/terrain/surfaceTypes.ts';
import {MeshSurface} from '../src/terrain/meshSurface.ts';
import {correctStoneGateTriangles} from '../src/terrain/StoneGateTriangles.ts';
import {snowMountainRegionWeight,snowCliffExposure,snowRockHeightBlend,palecrownRockAllowance,PALECROWN_SNOW,stoneGateLeftWeight,stoneGateAreaWeight,STONE_GATE_TEXTURE_AREA} from '../src/terrain/SnowMountains.ts';

test('snow cliffs leave low terrain, roads and ledges alone and accumulate snow in crevices',()=>{
    assert.equal(palecrownRockAllowance(PALECROWN_SNOW.x,PALECROWN_SNOW.z),0);
    assert.equal(palecrownRockAllowance(PALECROWN_SNOW.x+69,PALECROWN_SNOW.z),0);
    assert.equal(palecrownRockAllowance(PALECROWN_SNOW.x+105,PALECROWN_SNOW.z),1);
    assert.ok(palecrownRockAllowance(PALECROWN_SNOW.x+87.5,PALECROWN_SNOW.z)>.4);
    assert.equal(snowCliffExposure(.7,0),0,'moderately steep faces now stay snowy');
    assert.equal(snowMountainRegionWeight(1,0,65),0);
    assert.equal(snowMountainRegionWeight(1,0,100),1);
    assert.equal(snowMountainRegionWeight(0,0,200),0);
    assert.equal(snowMountainRegionWeight(1,1,200),0);
    for(const variation of [-1,0,1]){assert.equal(snowCliffExposure(1,variation),0);assert.equal(snowCliffExposure(0,variation),1);}
    for(let height=0;height<=1;height+=.05){assert.equal(snowRockHeightBlend(0,height),0);assert.equal(snowRockHeightBlend(1,height),1);}
    assert.ok(snowRockHeightBlend(.5,.1)<snowRockHeightBlend(.5,.9),'raised rock protrudes while snow occupies crevices');
});
test('authored snow mountains contain both retained snowy ledges and exposed cliff candidates',()=>{
    const png=(path:string)=>decodeAuthoredPng(readFileSync('public/'+path));
    const data=buildAuthoredHeightmap(png(ROADS_HEIGHTMAP),png(ROADS_BIOME_MAP));assert.ok(data.positions&&data.indices);
    const surface=new MeshSurface(data.positions,data.indices,16,data.colors),normal=new Vector3(),rgb=new Float32Array(3),weights=new Float32Array(3);
    let ledges=0,cliffs=0;
    for(let z=-340;z<=340;z+=12)for(let x=-460;x<=460;x+=12){
        const height=surface.sample(x,z,normal,rgb);biomeMapMaterialWeights(rgb,weights);
        if(snowMountainRegionWeight(weights[0],weights[2],height)<.9)continue;
        const exposure=snowCliffExposure(normal.y,0);
        if(exposure===0)ledges++;if(exposure>.5)cliffs++;
    }
    assert.ok(ledges>0);assert.ok(cliffs>0);
    console.log('Snow mountain sample candidates:',ledges,'snowy ledges;',cliffs,'exposed cliff sites');
});


test('Stone Gate correction reduces cliff creases with the same vertices, triangle budget and outside grounding',()=>{
    const png=(path:string)=>decodeAuthoredPng(readFileSync('public/'+path));
    const data=buildAuthoredHeightmap(png(ROADS_HEIGHTMAP),png(ROADS_BIOME_MAP));assert.ok(data.positions&&data.indices);
    const original=Array.from(data.indices),positions=Array.from(data.positions);
    const before=new MeshSurface(data.positions,original);
    const count=correctStoneGateTriangles(data);assert.ok(count>0);
    assert.deepEqual(Array.from(data.positions),positions);assert.equal(data.indices.length,original.length);
    let changed=0;
    for(let i=0;i<data.indices.length;i++)if(data.indices[i]!==original[i]){
        changed++;const cell=Math.floor(i/6)*6,a=original[cell+2],d=original[cell];
        assert.ok(stoneGateLeftWeight((positions[a*3]+positions[d*3])*.5,(positions[a*3+2]+positions[d*3+2])*.5)>=.5);
    }
    assert.equal(changed,count*2);
    const after=new MeshSurface(data.positions,data.indices);
    for(const [x,z] of [[-383.5,52],[-155,0],[272.5,76],[-257.5,-190],[0,280]])assert.equal(after.sample(x,z),before.sample(x,z));
    for(let i=0;i<data.indices.length;i+=3){
        const a=data.indices[i]*3,b=data.indices[i+1]*3,c=data.indices[i+2]*3;
        const signedY=(positions[b+2]-positions[a+2])*(positions[c]-positions[a])-(positions[b]-positions[a])*(positions[c+2]-positions[a+2]);
        assert.ok(signedY<0,'Babylon clockwise winding remains valid');
    }
    console.log('Corrected Stone Gate cliff cells:',count,'with no added triangles');
});


test('whole Stone Gate texture area covers both sides and the road, then feathers without reaching Palecrown',()=>{
    const {x,z}=STONE_GATE_TEXTURE_AREA;
    assert.equal(stoneGateAreaWeight(x,z),1);
    assert.equal(stoneGateAreaWeight(x-59,z),1);assert.equal(stoneGateAreaWeight(x+59,z),1);
    assert.equal(stoneGateAreaWeight(x,z-59),1);assert.equal(stoneGateAreaWeight(x,z+59),1);
    assert.equal(stoneGateAreaWeight(x+90,z),0);
    assert.ok(Math.abs(stoneGateAreaWeight(x+75,z)-.5)<1e-8);
    assert.equal(stoneGateAreaWeight(PALECROWN_SNOW.x,PALECROWN_SNOW.z),0);
    assert.equal(stoneGateAreaWeight(-257.5,-190),0);
});
