import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture2DArray } from '@babylonjs/core/Materials/Textures/rawTexture2DArray';
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.rawTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Scene } from '@babylonjs/core/scene';
export const ROCK_TILE_METRES = 4;
export interface RockGroundTextures { baseColor: RawTexture2DArray; normal: RawTexture2DArray; arm: RawTexture2DArray; ready: Promise<void>; }
export function loadRockGroundTextures(scene: Scene): RockGroundTextures {
    const load = (map: string): RawTexture2DArray => {
        const texture=new RawTexture2DArray(null,2048,2048,3,Constants.TEXTUREFORMAT_RGBA,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
        texture.name=`rock-array:${map}`;texture.gammaSpace=false;
        texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
        return texture;
    };
    const baseColor=load('base'),normal=load('normal'),arm=load('arm-height');
    const upload=async(name:string,texture:RawTexture2DArray)=>{
        const response=await fetch(`${import.meta.env.BASE_URL}terrain/rock/iron-mountains/${name}.rgba.gz`);
        if(!response.ok||!response.body)throw new Error(`Cannot load ${name} rock array (${response.status}).`);
        // Vite serves .gz with Content-Encoding; browsers already decode that response.
        const stream=response.headers.get('content-encoding')?.includes('gzip')
            ? response.body : response.body.pipeThrough(new DecompressionStream('gzip'));
        const data=new Uint8Array(await new Response(stream).arrayBuffer());
        if(data.length!==2048*2048*3*4)throw new Error(`Invalid ${name} rock array size.`);
        const stride=2048*4;
        for(let row=0;row<data.length;row+=stride)for(let x=4;x<stride;x++)data[row+x]=(data[row+x]+data[row+x-4])&255;
        if(!scene.isDisposed&&texture.getInternalTexture())texture.update(data);
    };
    const ready=Promise.all([upload('base',baseColor),upload('normal',normal),upload('arm-height',arm)]).then(()=>{});
    // Warm-up awaits/reports failures; attach a handler while other startup assets load.
    void ready.catch(()=>{});
    return {baseColor,normal,arm,ready};
}
