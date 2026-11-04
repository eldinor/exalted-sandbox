import test from 'node:test';
import assert from 'node:assert/strict';
import {readAsset} from '../src/core/assetDownload.ts';
import {readAssetInRanges} from '../src/core/assetRanges.ts';
import {readFileSync} from 'node:fs';
import {decodeAuthoredPng} from '../src/terrain/authoredHeightmap.ts';

const chunkSize=1024*1024;
test('ground coverage recovers from Failed to fetch and decodes the unchanged authored PNG',async()=>{
    const original=globalThis.fetch,bytes=readFileSync('public/assets/textures/ground-coverage-9.png');
    let whole=0,ranges=0;
    try{
        globalThis.fetch=async(url,init)=>{
            assert.equal(url,'/assets/textures/ground-coverage-9.png');
            const range=new Headers(init?.headers).get('Range');
            if(!range){whole++;throw new TypeError('Failed to fetch');}
            ranges++;assert.equal(range,`bytes=0-${chunkSize-1}`);
            return new Response(bytes,{status:206,headers:{'Content-Range':`bytes 0-${bytes.length-1}/${bytes.length}`,ETag:'"coverage-v1"'}});
        };
        const recovered=await readAsset('/assets/textures/ground-coverage-9.png',async r=>decodeAuthoredPng(new Uint8Array(await r.arrayBuffer())),{rangeFallback:true});
        assert.deepEqual(recovered,decodeAuthoredPng(bytes));
        assert.equal(whole,2);assert.equal(ranges,1);
    }finally{globalThis.fetch=original;}
});

test('range-enabled terrain maps leave successful loads and HTTP errors on the normal path',async()=>{
    const original=globalThis.fetch;let calls=0;
    try{
        globalThis.fetch=async()=>{calls++;return new Response(new Uint8Array([1,2]));};
        assert.deepEqual(new Uint8Array(await readAsset('/coverage.png',r=>r.arrayBuffer(),{rangeFallback:true})),new Uint8Array([1,2]));
        assert.equal(calls,1);
        calls=0;
        globalThis.fetch=async()=>{calls++;return new Response('denied',{status:403});};
        await assert.rejects(readAsset('/coverage.png',r=>r.arrayBuffer(),{rangeFallback:true}),/HTTP 403/);
        assert.equal(calls,1);
    }finally{globalThis.fetch=original;}
});

test('two interrupted heightmap transfers recover in validated chunks without changing bytes',async()=>{
    const original=globalThis.fetch,bytes=Uint8Array.from({length:chunkSize+37},(_,i)=>i%251);
    const requested:string[]=[];let whole=0,firstChunk=0;
    try{
        globalThis.fetch=async(_url,init)=>{
            const headers=new Headers(init?.headers),range=headers.get('Range');
            assert.equal(init?.cache,whole===0?undefined:'reload');
            if(!range){whole++;throw new TypeError('Content-Length header of network response exceeds response Body.');}
            requested.push(range);const [,a,b]=/^bytes=(\d+)-(\d+)$/.exec(range)!;
            const start=Number(a),end=Math.min(Number(b),bytes.length-1);
            if(start===0&&firstChunk++===0)throw new TypeError('Connection closed');
            if(start>0)assert.equal(headers.get('If-Range'),'"height-v1"');
            return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,ETag:'"height-v1"'}});
        };
        const result=await readAsset('/height.png',r=>r.arrayBuffer(),{rangeFallback:true});
        assert.deepEqual(new Uint8Array(result),bytes);assert.equal(whole,2);
        assert.deepEqual(requested,[`bytes=0-${chunkSize-1}`,`bytes=0-${chunkSize-1}`,`bytes=${chunkSize}-${bytes.length-1}`]);
    }finally{globalThis.fetch=original;}
});

test('range recovery rejects changed files, invalid boundaries, oversized bodies and unsupported servers',async()=>{
    const original=globalThis.fetch;
    try{
        globalThis.fetch=async()=>new Response('ignored range',{status:200});
        await assert.rejects(readAssetInRanges('/height.png'),/requires HTTP 206/);
        globalThis.fetch=async()=>new Response('x',{status:206,headers:{'Content-Range':'bytes 0-0/999999999',ETag:'"v1"'}});
        await assert.rejects(readAssetInRanges('/height.png'),/boundaries or asset size/);
        globalThis.fetch=async()=>new Response('x',{status:206,headers:{'Content-Range':'bytes 1-1/2',ETag:'"v1"'}});
        await assert.rejects(readAssetInRanges('/height.png'),/boundaries/);
        let count=0;
        globalThis.fetch=async()=>{
            const first=count++===0;
            return new Response(new Uint8Array(first?chunkSize:1),{status:206,headers:{'Content-Range':first?`bytes 0-${chunkSize-1}/${chunkSize+1}`:`bytes ${chunkSize}-${chunkSize}/${chunkSize+1}`,ETag:first?'"v1"':'"v2"'}});
        };
        await assert.rejects(readAssetInRanges('/height.png'),/changed during/);
        count=0;
        globalThis.fetch=async()=>{count++;return new Response(new Uint8Array([1]),{status:206,headers:{'Content-Range':'bytes 0-1/2',ETag:'"v1"'}});};
        await assert.rejects(readAssetInRanges('/height.png'),/Incomplete/);assert.equal(count,2,'An incomplete chunk has one retry');
    }finally{globalThis.fetch=original;}
});

test('range recovery accepts a Last-Modified validator when the server uses weak ETags',async()=>{
    const original=globalThis.fetch;
    try{
        globalThis.fetch=async()=>new Response(new Uint8Array([7,8]),{status:206,headers:{'Content-Range':'bytes 0-1/2',ETag:'W/"v1"','Last-Modified':'Sat, 24 Oct 2026 10:00:00 GMT'}});
        assert.deepEqual(new Uint8Array(await (await readAssetInRanges('/height.png')).arrayBuffer()),new Uint8Array([7,8]));
        globalThis.fetch=async()=>new Response(new Uint8Array([7,8]),{status:206,headers:{'Content-Range':'bytes 0-1/2'}});
        await assert.rejects(readAssetInRanges('/height.png'),/requires an ETag or Last-Modified/);
    }finally{globalThis.fetch=original;}
});
