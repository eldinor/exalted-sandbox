import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { groundTexturePath } from './GroundTextureProfile.ts';

export const FOREST_GROUND_TILE_METRES = 4;
export interface ForestGroundTextures { baseColor: Texture; normal: Texture; arm: Texture; }

/** User-supplied forest floor maps; colour is sRGB, normal/ARM are linear. */
export function loadForestGroundTextures(scene: Scene): ForestGroundTextures {
    const load = (map: string, gammaSpace: boolean): Texture => {
        const texture = new Texture(`${import.meta.env.BASE_URL}${groundTexturePath(`terrain/forest/textures/forrest_ground_01_${map}_2k.png`)}`, scene, false, false);
        texture.gammaSpace = gammaSpace;
        texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
        return texture;
    };
    return { baseColor: load('diff', true), normal: load('nor_gl', false), arm: load('arm', false) };
}
