import test from 'node:test';
import assert from 'node:assert/strict';
import { DANDELIONS, DAISIES, flowerColonyAt, meadowFlowerColonyAt, flowerSamplers, flowerSettings } from '../src/grass/MeadowFlowers.ts';
import { GrassPlacementJob } from '../src/grass/GrassPlacementJob.ts';
import type { GrassSamplers } from '../src/grass/grassTypes.ts';

const ground: GrassSamplers = {heightAt:(x,z)=>3+x*.01-z*.02,grassWeightAt:()=>1,excludedAt:()=>false,slopeAt:()=>.03};
test('daisies use a modest separate budget and overlapping colonies do not compound grass thinning',()=>{
    assert.equal(DAISIES.density,DANDELIONS.density/2);
    assert.deepEqual(DAISIES.mix.map(v=>v.percentage),[40,30,30]);
    assert.equal(flowerSettings(DAISIES).distantLodDistance,50);
    for(let x=-40;x<40;x++)for(let z=-40;z<40;z++){
        const d=flowerColonyAt(x,z,DANDELIONS.seed),a=flowerColonyAt(x,z,DAISIES.seed);
        assert.equal(meadowFlowerColonyAt(x,z),Math.max(d,a));
        assert.ok(1-.35*meadowFlowerColonyAt(x,z)>=.65);
    }
});
test('flower colonies are sparse, deterministic and independently seedable for future daisies',()=>{
    let coverage=0,different=0;
    for(let x=-140;x<140;x++)for(let z=-140;z<140;z++){
        const a=flowerColonyAt(x,z);
        assert.equal(a,flowerColonyAt(x,z));assert.ok(a>=0&&a<=1);
        coverage+=a;if(a!==flowerColonyAt(x,z,9001))different++;
    }
    assert.ok(coverage/(280*280)>.03&&coverage/(280*280)<.07);
    assert.ok(different>1000);
    const settings=flowerSettings(DANDELIONS);
    assert.deepEqual(settings.grassMix.map(v=>v.percentage),[45,35,20]);
    assert.equal(settings.distantLodDistance,50);assert.equal(settings.groundOffset,0);
    assert.equal(settings.upright,true);assert.equal(settings.density,.16);
});
test('flower streaming preserves exact grounding, exclusions and deterministic model selection',()=>{
    const samplers=flowerSamplers({...ground,
        grassWeightAt:(x)=>x<0?0:1,
        excludedAt:(x,z)=>x<0||z<0,
        slopeAt:(x)=>x>28?1:.03,
    },DANDELIONS.seed);
    const config={density:.08,height:.35,width:.1,nearImported:true,midImported:true,upright:true,groundOffset:0,maxSlope:.7,
        variants:DANDELIONS.mix.map(v=>({weight:v.percentage/100,heightRatio:1}))};
    let count=0;const selected=new Set<number>();
    for(let row=-1;row<3;row++)for(let col=-1;col<3;col++){
        const a=new GrassPlacementJob(col,row,config,samplers),b=new GrassPlacementJob(col,row,config,samplers);
        while(!a.done)a.advance(7);b.advance(1e6);
        assert.equal(a.count,b.count);assert.deepEqual(a.nearBuffer,b.nearBuffer);
        assert.deepEqual(a.variantIndices,b.variantIndices);
        for(let i=0;i<a.count;i++){
            const o=i*16,x=a.nearBuffer[o+12],y=a.nearBuffer[o+13],z=a.nearBuffer[o+14];
            assert.ok(x>=0&&x<=28&&z>=0);
            assert.ok(Math.abs(y-ground.heightAt(x,z))<1e-5,'root rests on sampled triangle');
            assert.ok(flowerColonyAt(x,z)>.05);
            assert.equal(Math.abs(a.nearBuffer[o+1]),0);assert.equal(Math.abs(a.nearBuffer[o+9]),0);
            selected.add(a.variantIndices![i]);count++;
        }
    }
    assert.ok(count>10);assert.equal(selected.size,3);
    const submerged=flowerSamplers({...ground,grassWeightAt:()=>0,excludedAt:()=>true},DANDELIONS.seed);
    const wet=new GrassPlacementJob(0,0,config,submerged);wet.advance(1e6);assert.equal(wet.count,0);
});

test('local grass thinning changes density without changing biome classification',()=>{
    const config={density:1,height:.85,width:.1,nearImported:true,midImported:true};
    const full=new GrassPlacementJob(0,0,config,ground);
    const thin=new GrassPlacementJob(0,0,config,{...ground,densityWeightAt:()=>.65});
    full.advance(1e6);thin.advance(1e6);
    assert.ok(thin.count/full.count>.6&&thin.count/full.count<.7);
    assert.equal(ground.grassWeightAt(0,0),1);
});
