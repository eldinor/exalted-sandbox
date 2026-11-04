import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { loadMeadowTextures } from '../../src/grass/MeadowTextures.ts';
export { MEADOW_TILE_METRES } from '../../src/grass/MeadowTextures.ts';
import type { Scene } from '@babylonjs/core/scene';
import { authoredGrassWeight } from './AuthoredGrassSamplers.ts';

/** Reorder visual triangles into other-biome and grassland material ranges. */
export function partitionGrasslandTriangles(indices: ArrayLike<number>, colors: ArrayLike<number>): { indices: Uint32Array; otherIndexCount: number } {
    const weights = new Float32Array(colors.length / 4);
    const color = new Float32Array(3);
    for (let vertex = 0; vertex < weights.length; vertex++) {
        for (let channel = 0; channel < 3; channel++) color[channel] = colors[vertex * 4 + channel];
        weights[vertex] = authoredGrassWeight(color);
    }
    const grass = new Uint8Array(indices.length / 3);
    let otherIndexCount = 0;
    for (let i = 0; i < indices.length; i += 3) {
        grass[i / 3] = (weights[indices[i]] + weights[indices[i + 1]] + weights[indices[i + 2]]) / 3 >= .5 ? 1 : 0;
        if (!grass[i / 3]) otherIndexCount += 3;
    }
    const reordered = new Uint32Array(indices.length);
    let otherCursor = 0, grassCursor = otherIndexCount;
    for (let i = 0; i < indices.length; i += 3) {
        const offset = grass[i / 3] ? grassCursor : otherCursor;
        for (let corner = 0; corner < 3; corner++) reordered[offset + corner] = indices[i + corner];
        if (grass[i / 3]) grassCursor += 3; else otherCursor += 3;
    }
    return { indices: reordered, otherIndexCount };
}

export function createMeadowGroundMaterial(scene: Scene): PBRMaterial {
    const material = new PBRMaterial('authored-meadow-ground', scene);
    const textures = loadMeadowTextures(scene);
    for (const texture of Object.values(textures)) texture.coordinatesIndex = 1;
    material.albedoTexture = textures.baseColor;
    material.bumpTexture = textures.normal;
    material.metallicTexture = textures.orm;
    material.metallic = 1;
    material.roughness = 1;
    material.useAmbientOcclusionFromMetallicTextureRed = true;
    material.useRoughnessFromMetallicTextureGreen = true;
    material.useRoughnessFromMetallicTextureAlpha = false;
    material.useMetallnessFromMetallicTextureBlue = true;
    material.ambientTextureImpactOnAnalyticalLights = 1;
    // Keep the same display transform as the existing StandardMaterial ground.
    return material;
}
