import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodeAuthoredPng} from '../src/terrain/authoredHeightmap.ts';
import {buildIronMountainsMask,ironScreeWeight,IRON_MOUNTAINS_MASK} from '../src/terrain/IronMountains.ts';

test('Iron Mountains mask selects The Ironspine and northern corridor without western/southern rocks',()=>{
    const rock=decodeAuthoredPng(readFileSync('public/assets/textures/biome-rock-9.png'));
    const saved=decodeAuthoredPng(readFileSync(`public/${IRON_MOUNTAINS_MASK}`));
    const built=buildIronMountainsMask(rock);
    assert.deepEqual(saved.pixels,built.pixels);
    const at=(x:number,z:number)=>saved.pixels[Math.round((.5+z/702)*(saved.height-1))*saved.width+Math.round((.5-x/936)*(saved.width-1))];
    for(const [x,z] of [[-257.5,-190],[-300,-200],[0,-200]])assert.ok(at(x,z)>252);
    for(const [x,z] of [[-248,125],[272.5,76],[200,-50],[0,280],[-360,200]])assert.equal(at(x,z),0);
    for(let i=0;i<saved.pixels.length;i++)assert.ok(saved.pixels[i]<=rock.pixels[i]);
});
test('height blending favours exposed cliffs, accumulates scree on ledges and never produces empty seams',()=>{
    for(let c=0;c<=1;c+=.1)for(let s=0;s<=1;s+=.1){
        assert.equal(ironScreeWeight(0,c,s),0);assert.equal(ironScreeWeight(1,c,s),1);
        for(let up=0;up<=1;up+=.05){const w=ironScreeWeight(up,c,s);assert.ok(Number.isFinite(w)&&w>=0&&w<=1);}
    }
    assert.ok(ironScreeWeight(.7,.1,.9)>ironScreeWeight(.7,.9,.1));
});
test('prepared rock arrays retain original river RGB bytes and pack real displacement in mountain ARM alpha',()=>{
    const root='public/terrain/rock/iron-mountains/',meta=JSON.parse(readFileSync(root+'textures.json','utf8'));
    assert.deepEqual(meta.textureMetres,[4,90,90]);
    for(const source of meta.sources)assert.equal(createHash('sha256').update(readFileSync(source.file)).digest('hex'),source.sha256);
    for(const [m,map] of ['diff','nor_gl','arm'].entries()){
        const file=meta.outputs[m],compressed=readFileSync(root+file.file);
        assert.equal(createHash('sha256').update(compressed).digest('hex'),file.sha256);
        const bytes=gunzipSync(compressed),stride=meta.width*4;
        for(let row=0;row<bytes.length;row+=stride)for(let x=4;x<stride;x++)bytes[row+x]=(bytes[row+x]+bytes[row+x-4])&255;
        assert.equal(bytes.length,meta.width*meta.height*3*4);
        const original=decodeAuthoredPng(readFileSync(`public/terrain/rock/river/river_small_rocks_${map}_2k.png`));
        for(let i=0;i<original.width*original.height;i+=31){
            for(let c=0;c<3;c++)assert.equal(bytes[i*4+c],original.pixels[i*3+c]);
            assert.equal(bytes[i*4+3],255);
        }
        if(map==='arm'){
            const h=decodeAuthoredPng(readFileSync('public/terrain/rock/rocky_terrain_03_2k/textures/rocky_terrain_03_disp_2k.png'));
            const scale=h.pixels instanceof Uint16Array?257:1;
            for(let i=0;i<h.width*h.height;i+=47)assert.equal(bytes[(2*h.width*h.height+i)*4+3],Math.round(h.pixels[i]/scale));
        }
    }
});
