import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { groundTexturePath } from '../terrain/GroundTextureProfile.ts';

/** Same physical repeat and texture set as the authored Grassland lab. */
export const MEADOW_TILE_METRES = 4;
export interface MeadowTextures { baseColor: Texture; normal: Texture; orm: Texture; }

export function loadMeadowTextures(scene: Scene): MeadowTextures {
    const load = (name: string, gammaSpace: boolean): Texture => {
        const texture = new Texture(`${import.meta.env.BASE_URL}${groundTexturePath(`terrain/grassland/meadow/Material-326-A_${name}`)}`, scene, false, false);
        texture.gammaSpace = gammaSpace;
        texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
        return texture;
    };
    return { baseColor: load('BaseColor.jpg', true), normal: load('Normal.jpg', false), orm: load('ORM.png', false) };
}
