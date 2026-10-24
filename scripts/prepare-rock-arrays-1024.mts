import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {downsampleRockArray} from '../src/terrain/RockArrayMipmaps.ts';
import {ROCK_ARRAY_SIZE,ROCK_ARRAY_LAYERS,ROCK_ARRAY_ROOT} from '../src/terrain/RockArrayProfile.ts';

const sourceRoot='public/terrain/rock/iron-mountains',targetRoot=`public/${ROCK_ARRAY_ROOT}`;
const metadata=JSON.parse(readFileSync(`${sourceRoot}/textures.json`,'utf8'));
if(metadata.width!==2048||metadata.height!==2048||metadata.layers.length!==ROCK_ARRAY_LAYERS||ROCK_ARRAY_SIZE!==1024)throw new Error('Expected five 2048-square source layers and a 1024-square trial.');
mkdirSync(targetRoot,{recursive:true});
const outputs=[],sources=[];
for(const name of ['base','normal','arm-height']){
    const file=`${name}.rgba.gz`,compressed=readFileSync(`${sourceRoot}/${file}`);
    const sha256=createHash('sha256').update(compressed).digest('hex');
    if(metadata.outputs.find((entry:{file:string})=>entry.file===file)?.sha256!==sha256)throw new Error(`Source checksum mismatch: ${file}`);
    sources.push({file:`${sourceRoot}/${file}`,sha256});
    const decoded=gunzipSync(compressed),stride=metadata.width*4;
    if(decoded.length!==metadata.width*metadata.height*ROCK_ARRAY_LAYERS*4)throw new Error(`Invalid source array: ${file}`);
    for(let row=0;row<decoded.length;row+=stride)for(let x=4;x<stride;x++)decoded[row+x]=(decoded[row+x]+decoded[row+x-4])&255;
    const reduced=downsampleRockArray(decoded,metadata.width,metadata.height,ROCK_ARRAY_LAYERS);
    // Retain the existing byte format, including independent horizontal deltas per row/layer.
    const filtered=Buffer.from(reduced),targetStride=ROCK_ARRAY_SIZE*4;
    for(let row=0;row<filtered.length;row+=targetStride)for(let x=targetStride-1;x>=4;x--)filtered[row+x]=(filtered[row+x]-filtered[row+x-4])&255;
    const result=gzipSync(filtered,{level:9});writeFileSync(`${targetRoot}/${file}`,result);
    outputs.push({file,bytes:result.length,rawBytes:reduced.length,sha256:createHash('sha256').update(result).digest('hex')});
    console.log(`${file}: ${(compressed.length/1048576).toFixed(2)} -> ${(result.length/1048576).toFixed(2)} MiB`);
}
writeFileSync(`${targetRoot}/textures.json`,JSON.stringify({width:ROCK_ARRAY_SIZE,height:ROCK_ARRAY_SIZE,layers:metadata.layers,textureMetres:metadata.textureMetres,format:metadata.format,heightChannel:metadata.heightChannel,derivation:'2x2 RGBA box reduction; identical to the first existing mip level. Source files are read-only.',sources,outputs},null,2)+'\n');
