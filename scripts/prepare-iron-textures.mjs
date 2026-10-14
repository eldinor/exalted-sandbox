/** Lossless PNG reconstruction; numeric 16-bit texture maps become RGBA8 arrays. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {inflateSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

export function decodeTexturePng(bytes){
    let w=0,h=0,depth=0,channels=0;const parts=[];
    for(let o=8;o<bytes.length;){const length=bytes.readUInt32BE(o),type=bytes.toString('ascii',o+4,o+8),data=bytes.subarray(o+8,o+8+length);
        if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);depth=data[8];channels={0:1,2:3,4:2,6:4}[data[9]];if(data[12])throw Error('Interlaced PNG not supported.');}
        if(type==='IDAT')parts.push(data);o+=length+12;
    }
    if(!channels||![8,16].includes(depth))throw Error('Expected grayscale/grayscale-alpha/RGB/RGBA PNG8/16.');
    const bpp=channels*depth/8,stride=w*bpp,raw=inflateSync(Buffer.concat(parts)),out=Buffer.alloc(h*stride);
    const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
    if(raw.length!==h*(stride+1))throw Error('Truncated texture PNG.');
    for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('Unknown PNG filter.');
        for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?out[i-bpp]:0,b=y?out[i-stride]:0,c=y&&x>=bpp?out[i-stride-bpp]:0;
            out[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;
        }
    }
    const pixels=new Uint8Array(w*h*channels);
    for(let i=0;i<pixels.length;i++)pixels[i]=depth===16?Math.round(out.readUInt16BE(i*2)/257):out[i];
    return {width:w,height:h,channels,pixels};
}
if(process.argv[1]?.endsWith('prepare-iron-textures.mjs')){
    const directory='public/terrain/rock/iron-mountains';mkdirSync(directory,{recursive:true});
    const layers=[['rock/river','river_small_rocks'],['rock/rocky_terrain_2k/textures','rocky_terrain'],['rock/rocky_terrain_03_2k/textures','rocky_terrain_03'],['rock/03','rock_face_03'],['rock/snow','snow_03']];
    const size=2048,records=[];const buffers=Array.from({length:3},()=>Buffer.alloc(size*size*4*layers.length));
    for(let layer=0;layer<layers.length;layer++){
        const [folder,name]=layers[layer];
        const read=map=>{const file=`public/terrain/${folder}/${name}_${map}_2k.png`,bytes=readFileSync(file),image=decodeTexturePng(bytes);
            if(image.width!==size||image.height!==size)throw Error(`Wrong texture dimensions: ${file}`);
            records.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});return image;};
        const maps=[read('diff'),read('nor_gl'),read('arm')],height=layer===1||layer===2||layer===4?read('disp'):null;
        for(let m=0;m<3;m++)for(let i=0;i<size*size;i++){
            const o=(layer*size*size+i)*4,image=maps[m];
            for(let c=0;c<3;c++)buffers[m][o+c]=image.pixels[i*image.channels+c];
            buffers[m][o+3]=m===2&&height?height.pixels[i*height.channels]:255;
        }
    }
    const names=['base','normal','arm-height'],outputs=[];
    buffers.forEach((data,i)=>{const file=`${names[i]}.rgba.gz`,filtered=Buffer.from(data),stride=size*4;
        for(let row=0;row<filtered.length;row+=stride)for(let x=stride-1;x>=4;x--)filtered[row+x]=(filtered[row+x]-filtered[row+x-4])&255;
        const compressed=gzipSync(filtered,{level:9});writeFileSync(`${directory}/${file}`,compressed);outputs.push({file,bytes:compressed.length,rawBytes:data.length,sha256:createHash('sha256').update(compressed).digest('hex')});});
    writeFileSync(`${directory}/textures.json`,JSON.stringify({width:size,height:size,layers:['river','exposedRock','brokenRock','snowCliff','stoneGateSnowRock'],textureMetres:[4,90,90,8,8],format:'RGBA8; horizontal delta (4-byte pixel), then gzip; sRGB-encoded base, linear normal/ARM/height',heightChannel:'ARM alpha, normalized source displacement',sources:records,outputs},null,2)+'\n');
    console.log(outputs.map(o=>`${o.file}: ${(o.bytes/1048576).toFixed(1)} MiB`).join('\n'));
}
