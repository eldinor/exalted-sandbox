import { surfaceTexturePath } from '../core/TextureWebpProfile.ts';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

export const BEACH_TILE_METRES = 30;
export interface BeachGroundTextures { baseColor: Texture; normal: Texture; arm: Texture; }

/** Existing user-supplied beach set: colour is sRGB, OpenGL normal and ARM are linear. */
export function loadBeachGroundTextures(scene: Scene): BeachGroundTextures {
    const load = (map: string, gammaSpace: boolean): Texture => {
        const texture = new Texture(`${import.meta.env.BASE_URL}${surfaceTexturePath(`terrain/sand/beach/aerial_beach_01_${map}_2k.png`)}`, scene, false, false);
        texture.gammaSpace = gammaSpace;
        texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
        return texture;
    };
    return { baseColor: load('diff', true), normal: load('nor_gl', false), arm: load('arm', false) };
}
