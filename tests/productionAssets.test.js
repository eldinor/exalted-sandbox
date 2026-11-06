import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,rmSync,statSync,readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename,dirname,join,resolve } from 'node:path';
import { resolveConfig } from 'vite';
import { PRODUCTION_ASSETS,productionAssetFiles,production1kAssetFiles,productionAssetOutput } from '../scripts/production-assets.mjs';
import { readRockArrayResponse } from '../src/terrain/RockArrayStream.ts';
import { gzipSync } from 'node:zlib';
import { readAsset } from '../src/core/assetDownload.ts';
import { ROCK_ARRAY_ROOT, ROCK_IMAGE_ROOT, ROCK_IMAGE_MAPS, ROCK_ARRAY_LAYERS } from '../src/terrain/RockArrayProfile.ts';

test('asset failures retain the URL for HTTP errors, fetch errors and truncated bodies',async()=>{
    const original=globalThis.fetch,url='/terrain/rock/iron-mountains/base.rgba.bin';
    try{
        globalThis.fetch=async()=>new Response('denied',{status:403});
        await assert.rejects(readAsset(url,r=>r.arrayBuffer()),error=>error.message.includes(url)&&error.message.includes('403'));
        globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
        await assert.rejects(readAsset(url,r=>r.arrayBuffer()),error=>error.message.includes(url)&&error.cause.message==='Failed to fetch');
        globalThis.fetch=async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2]));c.error(new TypeError('Content-Length header of network response exceeds response Body.'));}}));
        await assert.rejects(readAsset(url,readRockArrayResponse),error=>error.message.includes(url)&&error.message.includes('Content-Length'));
        globalThis.fetch=async()=>new Response(new Uint8Array([1,2,3]));
        assert.deepEqual(new Uint8Array(await readAsset(url,r=>r.arrayBuffer())),new Uint8Array([1,2,3]));
    }finally{globalThis.fetch=original;}
});

test('interrupted asset body retries once with cache reload; HTTP failures do not retry',async()=>{
    const original=globalThis.fetch,url='/terrain/rock/iron-mountains/base.rgba.bin',calls=[];
    try{
        globalThis.fetch=async(_url,options)=>{
            calls.push(options);
            if(calls.length===1)return new Response(new ReadableStream({start(c){c.error(new TypeError('Content-Length header of network response exceeds response Body.'));}}));
            return new Response(new Uint8Array([1,2,3]));
        };
        assert.deepEqual(new Uint8Array(await readAsset(url,r=>r.arrayBuffer())),new Uint8Array([1,2,3]));
        assert.equal(calls.length,2);assert.deepEqual(calls[1],{cache:'reload'});
        calls.length=0;
        globalThis.fetch=async()=>{calls.push(1);throw new TypeError('Failed to fetch');};
        await assert.rejects(readAsset(url,r=>r.arrayBuffer()),/Cannot load/);assert.equal(calls.length,2,'Retry is bounded');
        calls.length=0;
        globalThis.fetch=async()=>{calls.push(1);return new Response('forbidden',{status:403});};
        await assert.rejects(readAsset(url,r=>r.arrayBuffer()),/HTTP 403/);assert.equal(calls.length,1);
    }finally{globalThis.fetch=original;}
});

test('rock binaries decode gzip, browser-decoded bodies and split gzip signatures',async()=>{
    const raw=new Uint8Array([12,34,56,78,90]),compressed=gzipSync(raw);
    for(const headers of [{},{'content-encoding':'gzip'}]){
        assert.deepEqual(await readRockArrayResponse(new Response(compressed,{headers})),raw);
        assert.deepEqual(await readRockArrayResponse(new Response(raw,{headers})),raw);
    }
    const chunks=new ReadableStream({start(c){c.enqueue(compressed.subarray(0,1));c.enqueue(compressed.subarray(1,2));c.enqueue(compressed.subarray(2));c.close();}});
    assert.deepEqual(await readRockArrayResponse(new Response(chunks)),raw);
    assert.deepEqual(await readRockArrayResponse(new Response(new Uint8Array())),new Uint8Array());
    for(const map of ['base','normal','arm-height'])assert.equal(productionAssetOutput(`terrain/rock/iron-mountains/${map}.rgba.gz`),`terrain/rock/iron-mountains/${map}.rgba.bin`);
    assert.equal(productionAssetOutput('assets/exalted/alpha-map.glb'),'assets/exalted/alpha-map.glb');
});

function glb(json){
    const text=Buffer.from(JSON.stringify(json).padEnd(Math.ceil(JSON.stringify(json).length/4)*4,' '));
    const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);
    header.writeUInt32LE(20+text.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
    return Buffer.concat([header,text]);
}

test('production includes external GLB dependencies and provenance, excluding source packs',()=>{
    const root=mkdtempSync(join(tmpdir(),'exalted-build-assets-'));
    try{
        mkdirSync(join(root,'models','textures'),{recursive:true});
        writeFileSync(join(root,'models','tree.glb'),glb({images:[{uri:'textures/leaf%20colour.png'}],buffers:[{uri:'tree.bin'}]}));
        writeFileSync(join(root,'models','textures','leaf colour.png'),'image');writeFileSync(join(root,'models','tree.bin'),'data');
        writeFileSync(join(root,'models','SOURCE.md'),'credit');writeFileSync(join(root,'models','source-pack.glb'),'not runtime');
        assert.deepEqual(productionAssetFiles(root,['models/tree.glb']),['models/SOURCE.md','models/textures/leaf colour.png','models/tree.bin','models/tree.glb']);
        assert.throws(()=>productionAssetFiles(root,['missing.glb']),/Missing production asset/);
        assert.throws(()=>productionAssetFiles(root,['../outside.png']),/escapes public/);
        writeFileSync(join(root,'models','tree.glb'),glb({images:[{uri:'../../outside.png'}]}));
        assert.throws(()=>productionAssetFiles(root,['models/tree.glb']),/escapes public/);
    }finally{
        assert.equal(dirname(root),resolve(tmpdir()));
        assert.ok(basename(root).startsWith('exalted-build-assets-'));
        rmSync(root,{recursive:true,force:true});
    }
});

test('current production inventory retains runtime packs and boulder textures, without duplicate authoring inputs',()=>{
    const root=resolve('public'),files=productionAssetFiles(root);
    for(const name of PRODUCTION_ASSETS)assert.ok(files.includes(name),name);
    for(const name of ['plain-rock-color.png','plain-rock-normal.png'])assert.ok(files.includes(`terrain/forest/coniferous-selected/textures/${name}`));
    assert.ok(files.includes('LICENSE.txt'));assert.ok(files.includes('THIRD_PARTY_NOTICES.md'));
    assert.ok(files.includes('terrain/rock/snow/SOURCE.md'),'Retain source attribution for packed textures');
    assert.ok(!files.some(p=>p.endsWith('.exr')||p.endsWith('.zip')||p.includes('generator/work/')||p.endsWith('vis_ground_heightmap-9.png')));
    assert.ok(!files.includes('terrain/forest/pine_trees_pack_lowpoly_game_ready_lods.glb'));
    assert.ok(!files.includes('terrain/rock/snow/snow_03_diff_2k.png'),'Packed rock texture arrays supply this layer');
    for(const map of ['base','normal','arm-height']){
        assert.ok(!files.includes(`${ROCK_ARRAY_ROOT}/${map}.rgba.gz`),'Packed arrays stay outside the PNG build');
        assert.equal(productionAssetOutput(`${ROCK_ARRAY_ROOT}/${map}.rgba.gz`),`${ROCK_ARRAY_ROOT}/${map}.rgba.bin`);
        assert.ok(!files.includes(`terrain/rock/iron-mountains/${map}.rgba.gz`),'Original high-resolution arrays stay outside the trial build');
    }
    for(const map of ROCK_IMAGE_MAPS)for(let layer=0;layer<ROCK_ARRAY_LAYERS;layer++)assert.ok(files.includes(`${ROCK_IMAGE_ROOT}/${map}-${layer}.png`));
    console.log('Production runtime/provenance assets:',files.length,(files.reduce((s,p)=>s+statSync(join(root,p)).size,0)/1048576).toFixed(2),'MiB');
});

test('main build excludes lab entry points, source maps and public-directory bulk copying',async()=>{
    const app=await resolveConfig({mode:'production'},'build');
    assert.equal(app.build.outDir,'dist');assert.equal(app.build.copyPublicDir,false);assert.equal(app.build.sourcemap,false);
    assert.deepEqual(app.build.rollupOptions.input,{main:'index.html',ground1k:'index-1k.html',props1k:'index-1k-props.html'});
    assert.ok(!app.plugins.some(p=>p.name==='exalted-generated-world-package'));
    const labs=await resolveConfig({mode:'labs'},'build');
    assert.equal(labs.build.outDir,'dist-labs');assert.equal(labs.build.copyPublicDir,true);assert.equal(labs.build.sourcemap,true);
    assert.ok(labs.build.rollupOptions.input.heightmap);assert.ok(labs.build.rollupOptions.input.generatedWorld);
    assert.ok(labs.plugins.some(p=>p.name==='exalted-generated-world-package'));
    const dev=await resolveConfig({},'serve');
    assert.equal(resolve(dev.publicDir),resolve('public'));assert.equal(dev.server.port,5173);
});

test('1K deployment excludes replaced originals and their unused external images',()=>{
    const root=resolve('public'), files=production1kAssetFiles(root);
    const original=productionAssetFiles(root);
    for(const folder of ['ground-1k','props-1k']){
        const manifest=JSON.parse(readFileSync(join(root,`terrain/${folder}/textures.json`),'utf8'));
        for(const entry of manifest.outputs){
            assert.ok(!files.includes(entry.source),entry.source);
            assert.ok(files.includes(`terrain/${folder}/${entry.file}`));
            assert.ok(original.includes(entry.source),'Regular package retains original');
        }
    }
    assert.ok(!files.includes('terrain/forest/blue-spruce/impostor.json'));
    assert.ok(files.includes('terrain/props-1k/impostor.json'));
    for(const name of ['plain-rock-color.png','plain-rock-normal.png'])assert.ok(!files.includes(`terrain/forest/coniferous-selected/textures/${name}`));
    for(const name of ['LICENSE.txt','THIRD_PARTY_NOTICES.md','terrain/forest/fir-pack-selected.glb','assets/exalted/alpha-map.glb','assets/textures/vis_ground_heightmap-11.png'])assert.ok(files.includes(name),name);
    assert.ok(!files.some(name=>name.endsWith('.zip')));
});
