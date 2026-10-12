import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
export const ROCK_TILE_METRES = 4;
export interface RockGroundTextures { baseColor: Texture; normal: Texture; arm: Texture; }
export function loadRockGroundTextures(scene: Scene): RockGroundTextures {
    const load = (map: string, gammaSpace: boolean): Texture => {
        const texture = new Texture(`${import.meta.env.BASE_URL}terrain/rock/river/river_small_rocks_${map}_2k.png`, scene, false, false);
        texture.gammaSpace = gammaSpace;
        texture.wrapU = texture.wrapV = Texture.WRAP_ADDRESSMODE;
        texture.anisotropicFilteringLevel = 8;
        return texture;
    };
    return { baseColor: load('diff', true), normal: load('nor_gl', false), arm: load('arm', false) };
}
