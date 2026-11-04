import test from 'node:test';
import assert from 'node:assert/strict';
import { downsampleRockArray } from '../src/terrain/RockArrayMipmaps.ts';

test('rock mipmaps keep every array layer populated and separate down to 1x1',()=>{
    let width=8,height=4;
    let data:Uint8Array=new Uint8Array(width*height*5*4);
    for(let layer=0;layer<5;layer++)for(let pixel=0;pixel<width*height;pixel++)data.set([20+layer*40,100+layer,128,40+layer*30],(layer*width*height+pixel)*4);
    while(width>1||height>1){
        data=downsampleRockArray(data,width,height,5);width=Math.max(1,width>>1);height=Math.max(1,height>>1);
        assert.equal(data.length,width*height*5*4);
        for(let layer=0;layer<5;layer++)for(let pixel=0;pixel<width*height;pixel++)assert.deepEqual(Array.from(data.slice((layer*width*height+pixel)*4,(layer*width*height+pixel)*4+4)),[20+layer*40,100+layer,128,40+layer*30]);
    }
});
test('mip box filtering averages RGBA including texture height without crossing layer boundaries',()=>{
    const data=new Uint8Array([0,20,40,60,20,40,60,80,40,60,80,100,60,80,100,120,
        200,200,200,200,200,200,200,200,200,200,200,200,200,200,200,200]);
    assert.deepEqual(Array.from(downsampleRockArray(data,2,2,2)),[30,50,70,90,200,200,200,200]);
    assert.throws(()=>downsampleRockArray(data,2,2,3),/dimensions/);
});
