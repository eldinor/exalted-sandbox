import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { RawTexture2DArray } from '@babylonjs/core/Materials/Textures/rawTexture2DArray';
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.rawTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Scene } from '@babylonjs/core/scene';
import { downsampleRockArray } from './RockArrayMipmaps.ts';
import { loadRockPngArray } from './RockPngImages.ts';
import { ROCK_ARRAY_SIZE,ROCK_ARRAY_LAYERS } from './RockArrayProfile.ts';
export const ROCK_TILE_METRES = 4;
export interface RockGroundTextures { baseColor: RawTexture2DArray; normal: RawTexture2DArray; arm: RawTexture2DArray; ready: Promise<void>; }
export function loadRockGroundTextures(scene: Scene): RockGroundTextures {
    const load = (map: string): RawTexture2DArray => {
        const texture=new RawTexture2DArray(null,ROCK_ARRAY_SIZE,ROCK_ARRAY_SIZE,ROCK_ARRAY_LAYERS,Constants.TEXTUREFORMAT_RGBA,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
        texture.name=`rock-array:${map}`;texture.gammaSpace=false;
        texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
        return texture;
    };
    const baseColor=load('base'),normal=load('normal'),arm=load('arm-height');
    const upload=async(name:'base'|'normal'|'arm-height',texture:RawTexture2DArray)=>{
        const data=await loadRockPngArray(name,import.meta.env.BASE_URL);
        if(!scene.isDisposed&&texture.getInternalTexture()){
            // Raw2DArray automatic WebGPU generation populates only array layer 0.
            // Supply all mip levels for all layers through the public upload API.
            let mip:Uint8Array=data,width:number=ROCK_ARRAY_SIZE,height:number=ROCK_ARRAY_SIZE,level=0;
            while(width>1||height>1){
                mip=downsampleRockArray(mip,width,height,ROCK_ARRAY_LAYERS);
                width=Math.max(1,width>>1);height=Math.max(1,height>>1);
                texture.updateMipLevel(mip,++level);
            }
            // Upload the base last so Babylon's context-loss base buffer remains correct.
            texture.update(data);
        }
    };
    const ready=(async()=>{
        await upload('base',baseColor);
        await upload('normal',normal);
        await upload('arm-height',arm);
    })();
    // Warm-up awaits/reports failures; attach a handler while other startup assets load.
    void ready.catch(()=>{});
    return {baseColor,normal,arm,ready};
}
