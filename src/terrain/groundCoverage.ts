import { HEIGHTMAP_WIDTH, HEIGHTMAP_DEPTH, sampleBiomeRgb, type AuthoredPng } from './authoredHeightmap.ts';
import { forestOverlookGroundWeight } from './forestGroundCoverage.ts';
import { buildIronMountainsMask } from './IronMountains.ts';

export const GROUND_COVERAGE_MAP = 'assets/textures/ground-coverage-9.png';
export const ROCK_COVERAGE_MAP = 'assets/textures/biome-rock-9.png';
export const BEACH_COVERAGE_MAP = 'assets/textures/biome-beach-9.png';
export const DETAIL_COVERAGE_MAP = 'assets/textures/ground-detail-coverage-9.png';
export const BEACH_BIOME_COLOR = [129 / 255, 173 / 255, 206 / 255] as const;
export const GROUND_BLEND_SIGMA_METRES = 1.5;
const GRASS = [179 / 255, 206 / 255, 149 / 255] as const;
const FOREST = [124 / 255, 170 / 255, 129 / 255] as const;
const DESERT = [[234,215,173],[226,208,170],[220,177,118]].map(color => color.map(value => value / 255));
const OTHER = [[243,246,249],
    [246,232,208],[236,222,197],[162,153,144],[169,163,157],
    [129,173,206],[111,153,191],[137,147,128]].map(color => color.map(value => value / 255));

function distanceSquared(color: ArrayLike<number>, reference: readonly number[]): number {
    return (color[0] - reference[0]) ** 2 + (color[1] - reference[1]) ** 2 + (color[2] - reference[2]) ** 2;
}

/** Source image orientation, linear RGB: grass, forest, desert; remainder is implicit. */
export function buildGroundCoverage(image: AuthoredPng, width = 2049, height = 1537,
    sigmaMetres = GROUND_BLEND_SIGMA_METRES): AuthoredPng {
    return buildLandCoverage(image, width, height, sigmaMetres).ground;
}

export function buildLandCoverage(image: AuthoredPng, width = 2049, height = 1537,
    sigmaMetres = GROUND_BLEND_SIGMA_METRES): { ground: AuthoredPng; rock: AuthoredPng; beach: AuthoredPng; detail: AuthoredPng; iron: AuthoredPng } {
    if (image.channels !== 3 || !(image.pixels instanceof Uint8Array)) throw new Error('Ground coverage requires RGB8 biome input.');
    if (width < 2 || height < 2 || !Number.isInteger(width) || !Number.isInteger(height) || sigmaMetres <= 0) {
        throw new Error('Ground coverage requires integer dimensions >= 2 and positive blend width.');
    }
    const source = new Float32Array(width * height * 5), scratch = new Float32Array(source.length);
    const roads = new Uint8Array(width * height);
    const color = new Float32Array(3);
    const delta = FOREST.map((value, i) => value - GRASS[i]);
    const deltaLength = delta.reduce((sum, value) => sum + value * value, 0);
    for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
        const x = (.5 - column / (width - 1)) * HEIGHTMAP_WIDTH;
        const z = (row / (height - 1) - .5) * HEIGHTMAP_DEPTH;
        sampleBiomeRgb(image, x, z, color);
        const greenDistance = Math.min(distanceSquared(color, GRASS), distanceSquared(color, FOREST));
        let otherDistance = Infinity, otherIndex = -1, desertDistance = Infinity;
        for (let i = 0; i < OTHER.length; i++) {
            const distance = distanceSquared(color, OTHER[i]);
            if (distance < otherDistance) { otherDistance = distance; otherIndex = i; }
        }
        for (const reference of DESERT) desertDistance = Math.min(desertDistance, distanceSquared(color, reference));
        const offset = (row * width + column) * 5;
        if (greenDistance <= Math.min(otherDistance, desertDistance)) {
            const forest = Math.max(0, Math.min(1, ((color[0] - GRASS[0]) * delta[0]
                + (color[1] - GRASS[1]) * delta[1] + (color[2] - GRASS[2]) * delta[2]) / deltaLength));
            source[offset] = 1 - forest;
            source[offset + 1] = forest;
        } else if (desertDistance <= otherDistance) {
            // Correct the sandy-painted northern mountain pass, not the southern desert.
            source[offset + (x >= -85 && x <= 35 && z < -70 ? 3 : 2)] = 1;
        }
        else {
            source[offset + 1] = forestOverlookGroundWeight(x, z, color);
            if (otherIndex === 3 || otherIndex === 4) source[offset + 3] = 1 - source[offset + 1];
            // Light-blue shore and muted grey-green island use the beach set.
            if (otherIndex === 5 || otherIndex === 7) source[offset + 4] = 1;
            if (otherIndex === 1 || otherIndex === 2) roads[row * width + column] = 1;
        }
    }
    // Roads are overlays. Continue nearest land beneath them so their existing
    // edge fade reveals textured land rather than a pale unclassified strip.
    const queue = new Uint32Array(width * height);
    let head = 0, tail = 0;
    for (let i = 0; i < roads.length; i++) if (!roads[i]) queue[tail++] = i;
    const fill = (from: number, to: number): void => {
        if (!roads[to]) return;
        roads[to] = 0;
        for (let channel = 0; channel < 5; channel++) source[to * 5 + channel] = source[from * 5 + channel];
        queue[tail++] = to;
    };
    while (head < tail) {
        const index = queue[head++], column = index % width;
        if (column > 0) fill(index, index - 1);
        if (column + 1 < width) fill(index, index + 1);
        if (index >= width) fill(index, index - width);
        if (index + width < roads.length) fill(index, index + width);
    }
    // Physical widths differ along image axes: the authored world is rectangular.
    const blur = (input: Float32Array, output: Float32Array, horizontal: boolean): void => {
        const sigma = sigmaMetres / (horizontal ? HEIGHTMAP_WIDTH / (width - 1) : HEIGHTMAP_DEPTH / (height - 1));
        const radius = Math.ceil(sigma * 3), weights = new Float32Array(radius * 2 + 1);
        let total = 0;
        for (let i = -radius; i <= radius; i++) total += weights[i + radius] = Math.exp(-.5 * (i / sigma) ** 2);
        for (let i = 0; i < weights.length; i++) weights[i] /= total;
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
            let grass = 0, forest = 0, desert = 0, rock = 0, beach = 0;
            for (let i = -radius; i <= radius; i++) {
                const x = horizontal ? Math.max(0, Math.min(width - 1, column + i)) : column;
                const y = horizontal ? row : Math.max(0, Math.min(height - 1, row + i));
                const offset = (y * width + x) * 5, weight = weights[i + radius];
                grass += input[offset] * weight; forest += input[offset + 1] * weight;
                desert += input[offset + 2] * weight;
                rock += input[offset + 3] * weight; beach += input[offset + 4] * weight;
            }
            const offset = (row * width + column) * 5;
            output[offset] = grass; output[offset + 1] = forest;
            output[offset + 2] = desert;
            output[offset + 3] = rock; output[offset + 4] = beach;
        }
    };
    blur(source, scratch, true); blur(scratch, source, false);
    const pixels = new Uint8Array(width * height * 3);
    const rockPixels = new Uint8Array(width * height), beachPixels = new Uint8Array(width * height);
    const detailPixels = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
        const grass = Math.round(source[i * 5] * 255);
        const forest = Math.min(255 - grass, Math.round(source[i * 5 + 1] * 255));
        const desert = Math.min(255 - grass - forest, Math.round(source[i * 5 + 2] * 255));
        rockPixels[i] = Math.min(255 - grass - forest - desert, Math.round(source[i * 5 + 3] * 255));
        beachPixels[i] = Math.min(255 - grass - forest - desert - rockPixels[i], Math.round(source[i * 5 + 4] * 255));
        detailPixels[i * 3] = rockPixels[i]; detailPixels[i * 3 + 1] = beachPixels[i];
        pixels[i * 3] = grass; pixels[i * 3 + 1] = forest; pixels[i * 3 + 2] = desert;
    }
    const iron=buildIronMountainsMask({width,height,channels:1,pixels:rockPixels});
    for(let i=0;i<rockPixels.length;i++)detailPixels[i*3+2]=iron.pixels[i];
    return { iron, ground: { width, height, channels: 3, pixels }, rock: { width, height, channels: 1, pixels: rockPixels },
        beach: { width, height, channels: 1, pixels: beachPixels }, detail: { width, height, channels: 3, pixels: detailPixels } };
}
