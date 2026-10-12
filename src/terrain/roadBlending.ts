/** Visual-only road feather; keep the original surface channels for gameplay. */
import type { AuthoredPng } from './authoredHeightmap.ts';
export const ROAD_DISPLAY_MAP = 'assets/textures/mask-roads-9.png';
export const ROAD_BLEND_SIGMA_METRES = 1.1;

/** Read source-aligned grayscale coverage into increasing-world-X CPU rows. */
export function readRoadDisplayMask(image: AuthoredPng, width: number, height: number): Uint8Array {
    if (image.channels !== 1 || !(image.pixels instanceof Uint8Array)) throw new Error('Coverage mask requires grayscale8.');
    const result = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const fx = (1 - x / (width - 1)) * (image.width - 1), fy = y / (height - 1) * (image.height - 1);
        const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const nx = Math.min(ix + 1, image.width - 1), ny = Math.min(iy + 1, image.height - 1);
        const a = image.pixels[iy * image.width + ix], b = image.pixels[iy * image.width + nx];
        const c = image.pixels[ny * image.width + ix], d = image.pixels[ny * image.width + nx];
        result[y * width + x] = Math.round((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty);
    }
    return result;
}

export function buildRoadDisplayMask(surface: Uint8Array, width: number, height: number,
    worldWidth: number, worldDepth: number): Uint8Array {
    const source = new Float32Array(width * height), scratch = new Float32Array(source.length);
    for (let i = 0; i < source.length; i++) source[i] = surface[i * 4 + 2] / 255;
    const blur = (input: Float32Array, output: Float32Array, horizontal: boolean): void => {
        const sigma = ROAD_BLEND_SIGMA_METRES / (horizontal ? worldWidth / (width - 1) : worldDepth / (height - 1));
        const radius = Math.ceil(3 * sigma), kernel = new Float32Array(radius * 2 + 1);
        let total = 0;
        for (let i = -radius; i <= radius; i++) total += kernel[i + radius] = Math.exp(-.5 * (i / sigma) ** 2);
        for (let i = 0; i < kernel.length; i++) kernel[i] /= total;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            let value = 0;
            for (let i = -radius; i <= radius; i++) {
                const sx = horizontal ? Math.max(0, Math.min(width - 1, x + i)) : x;
                const sy = horizontal ? y : Math.max(0, Math.min(height - 1, y + i));
                value += input[sy * width + sx] * kernel[i + radius];
            }
            output[y * width + x] = value;
        }
    };
    blur(source, scratch, true); blur(scratch, source, false);
    return Uint8Array.from(source, value => Math.round(value * 255));
}
