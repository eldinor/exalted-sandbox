/** Lossless authored PNG decoding and world-aligned heightmap/biome data. */
import { roadsGrassWeight } from '../grass/GrassBiome.ts';
export { roadsGrassWeight } from '../grass/GrassBiome.ts';
import { unzlibSync } from 'fflate';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { biomeMapMaterialWeights } from './surfaceTypes.ts';

export const HEIGHTMAP_WIDTH = 936;
export const HEIGHTMAP_DEPTH = 702;
export const HEIGHTMAP_SUBDIVISIONS = 400;
export const HEIGHTMAP_MIN = -7.820367813110352 * 0.5;
export const HEIGHTMAP_MAX = 498.8232116699219 * 0.5;
export const ROADS_HEIGHTMAP = 'assets/textures/vis_ground_heightmap-11.png';
export const ROADS_BIOME_MAP = 'assets/textures/vertex_color_4k-9.png';

export interface AuthoredPng {
    width: number;
    height: number;
    channels: 1 | 3;
    pixels: Uint8Array | Uint16Array;
}

function paeth(a: number, b: number, c: number): number {
    const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
}

/** Decode the two supplied non-interlaced formats without Canvas's 8-bit conversion. */
export function decodeAuthoredPng(bytes: Uint8Array): AuthoredPng {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((value, index) => bytes[index] === value)) throw new Error('Invalid authored PNG signature.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let width = 0, height = 0, depth = 0, channels: 1 | 3 = 1, ended = false;
    const chunks: Uint8Array[] = [];
    let compressedSize = 0;
    for (let offset = 8; offset + 12 <= bytes.length;) {
        const length = view.getUint32(offset);
        if (length > bytes.length - offset - 12) throw new Error('Truncated authored PNG chunk.');
        const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
        const start = offset + 8;
        if (type === 'IHDR') {
            if (offset !== 8 || length !== 13) throw new Error('Invalid authored PNG header.');
            width = view.getUint32(start); height = view.getUint32(start + 4); depth = bytes[start + 8];
            const color = bytes[start + 9];
            if (!((color === 0 && depth === 16) || (color === 2 && depth === 8))
                || bytes[start + 10] || bytes[start + 11] || bytes[start + 12]) {
                throw new Error('Authored PNG requires non-interlaced grayscale16 or RGB8.');
            }
            if (!width || !height || width > 4096 || height > 4096) throw new Error('Authored PNG dimensions exceed 4096.');
            channels = color === 0 ? 1 : 3;
        } else if (type === 'IDAT') {
            chunks.push(bytes.subarray(start, start + length)); compressedSize += length;
        } else if (type === 'IEND') { ended = true; break; }
        offset += length + 12;
    }
    if (!width || !ended || !chunks.length) throw new Error('Incomplete authored PNG.');
    const compressed = new Uint8Array(compressedSize);
    let write = 0;
    for (const chunk of chunks) { compressed.set(chunk, write); write += chunk.length; }
    const bpp = channels * depth / 8, stride = width * bpp;
    const expected = (stride + 1) * height;
    const filtered = unzlibSync(compressed);
    if (filtered.length !== expected) throw new Error('Authored PNG scanline length mismatch.');
    const raw = new Uint8Array(stride * height);
    for (let row = 0; row < height; row++) {
        const input = row * (stride + 1), output = row * stride, filter = filtered[input];
        if (filter > 4) throw new Error('Unsupported authored PNG filter.');
        for (let column = 0; column < stride; column++) {
            const left = column >= bpp ? raw[output + column - bpp] : 0;
            const up = row ? raw[output + column - stride] : 0;
            const upperLeft = row && column >= bpp ? raw[output + column - stride - bpp] : 0;
            const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up
                : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upperLeft);
            raw[output + column] = filtered[input + column + 1] + predictor;
        }
    }
    if (depth === 8) return { width, height, channels, pixels: raw };
    const pixels = new Uint16Array(width * height);
    for (let i = 0; i < pixels.length; i++) pixels[i] = raw[i * 2] * 256 + raw[i * 2 + 1];
    return { width, height, channels, pixels };
}

type Output = { [index: number]: number };
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Both measured blue map colours represent water; gray/green island colours do not. */
export function roadsWaterWeight(rgb: ArrayLike<number>): number {
    const distance = Math.min(
        Math.hypot(rgb[0] - 129 / 255, rgb[1] - 173 / 255, rgb[2] - 206 / 255),
        Math.hypot(rgb[0] - 111 / 255, rgb[1] - 153 / 255, rgb[2] - 191 / 255),
    );
    return clamp01((.06 - distance) / .04);
}

/** PNG left/right and rows follow chart east/north, both opposite Babylon X/Z. */
export function sampleBiomeRgb<T extends Output>(image: AuthoredPng, x: number, z: number, out: T): T {
    const fx = clamp01(0.5 - x / HEIGHTMAP_WIDTH) * (image.width - 1);
    const fy = clamp01(0.5 + z / HEIGHTMAP_DEPTH) * (image.height - 1);
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const nextX = Math.min(ix + 1, image.width - 1), nextY = Math.min(iy + 1, image.height - 1);
    for (let channel = 0; channel < 3; channel++) {
        const a = image.pixels[(iy * image.width + ix) * 3 + channel];
        const b = image.pixels[(iy * image.width + nextX) * 3 + channel];
        const c = image.pixels[(nextY * image.width + ix) * 3 + channel];
        const d = image.pixels[(nextY * image.width + nextX) * 3 + channel];
        out[channel] = ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) / 255;
    }
    return out;
}

/** Linear weight texture in increasing world X/Z order, also sampled by CPU consumers. */
export class AuthoredSurfaceMap {
    readonly data: Uint8Array;
    /** Separate from the four terrain deformation/material channels. */
    readonly grassData: Uint8Array;
    constructor(readonly width: number, readonly height: number, image: AuthoredPng) {
        this.data = new Uint8Array(width * height * 4);
        this.grassData = new Uint8Array(width * height);
        const rgb = new Float32Array(3), weights = new Float32Array(3);
        for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
            sampleBiomeRgb(image, column / (width - 1) * HEIGHTMAP_WIDTH - HEIGHTMAP_WIDTH / 2,
                row / (height - 1) * HEIGHTMAP_DEPTH - HEIGHTMAP_DEPTH / 2, rgb);
            biomeMapMaterialWeights(rgb, weights);
            const offset = (row * width + column) * 4;
            this.grassData[row * width + column] = Math.round(roadsGrassWeight(rgb) * 255);
            for (let channel = 0; channel < 3; channel++) this.data[offset + channel] = Math.round(weights[channel] * 255);
            this.data[offset + 3] = Math.round(roadsWaterWeight(rgb) * 255);
        }
    }

    sample<T extends Output>(x: number, z: number, out: T): T {
        for (let channel = 0; channel < 2; channel++) out[channel] = this.sampleChannel(x, z, channel);
        return out;
    }

    grassAt(x: number, z: number): number { return this.sampleChannel(x, z, 4); }

    hasGrassArea(minX: number, maxX: number, minZ: number, maxZ: number): boolean {
        return this.hasArea(minX, maxX, minZ, maxZ, 'grass');
    }

    waterAt(x: number, z: number): number { return this.sampleChannel(x, z, 3); }

    private sampleChannel(x: number, z: number, channel: number): number {
        const fx = clamp01(x / HEIGHTMAP_WIDTH + 0.5) * (this.width - 1);
        const fy = clamp01(z / HEIGHTMAP_DEPTH + 0.5) * (this.height - 1);
        const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const nextX = Math.min(ix + 1, this.width - 1), nextY = Math.min(iy + 1, this.height - 1);
        const pixels = channel === 4 ? this.grassData : this.data;
        const stride = channel === 4 ? 1 : 4, component = channel === 4 ? 0 : channel;
        const a = pixels[(iy * this.width + ix) * stride + component];
        const b = pixels[(iy * this.width + nextX) * stride + component];
        const c = pixels[(nextY * this.width + ix) * stride + component];
        const d = pixels[(nextY * this.width + nextX) * stride + component];
        return ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty) / 255;
    }

    /** Conservative bounding-box coverage retains soft islands inside coarse triangles. */
    hasSoftArea(minX: number, maxX: number, minZ: number, maxZ: number): boolean {
        return this.hasArea(minX, maxX, minZ, maxZ, 'soft');
    }

    hasWaterArea(minX: number, maxX: number, minZ: number, maxZ: number): boolean {
        return this.hasArea(minX, maxX, minZ, maxZ, 'water');
    }

    hasLandArea(minX: number, maxX: number, minZ: number, maxZ: number): boolean {
        return this.hasArea(minX, maxX, minZ, maxZ, 'land');
    }

    private hasArea(minX: number, maxX: number, minZ: number, maxZ: number, kind: 'soft' | 'water' | 'land' | 'grass'): boolean {
        const x0 = Math.max(0, Math.floor((minX / HEIGHTMAP_WIDTH + .5) * (this.width - 1)));
        const x1 = Math.min(this.width - 1, Math.ceil((maxX / HEIGHTMAP_WIDTH + .5) * (this.width - 1)));
        const z0 = Math.max(0, Math.floor((minZ / HEIGHTMAP_DEPTH + .5) * (this.height - 1)));
        const z1 = Math.min(this.height - 1, Math.ceil((maxZ / HEIGHTMAP_DEPTH + .5) * (this.height - 1)));
        for (let row = z0; row <= z1; row++) for (let column = x0; column <= x1; column++) {
            const offset = (row * this.width + column) * 4;
            if (kind === 'grass' ? this.grassData[row * this.width + column] > 0 : kind === 'water' ? this.data[offset + 3] > 127
                : kind === 'land' ? this.data[offset + 3] < 255 : this.data[offset] + this.data[offset + 1] > 0) return true;
        }
        return false;
    }
}

/** Same grid/diagonal as hm.html, rotated 180 degrees into the authored world frame. */
export function buildAuthoredHeightmap(height: AuthoredPng, biome: AuthoredPng, subdivisions = HEIGHTMAP_SUBDIVISIONS): VertexData {
    if (height.channels !== 1 || !(height.pixels instanceof Uint16Array) || biome.channels !== 3) {
        throw new Error('Heightmap requires grayscale16 height and RGB8 biome data.');
    }
    if (!Number.isInteger(subdivisions) || subdivisions < 1) throw new Error('Invalid heightmap subdivisions.');
    const side = subdivisions + 1, count = side * side;
    const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
    const colors = new Float32Array(count * 4), indices = new Uint32Array(subdivisions * subdivisions * 6);
    const rgb = new Float32Array(3);
    for (let row = 0; row < side; row++) for (let column = 0; column < side; column++) {
        const index = row * side + column, x = (.5 - column / subdivisions) * HEIGHTMAP_WIDTH;
        const z = (row / subdivisions - .5) * HEIGHTMAP_DEPTH;
        const pixelX = Math.floor(column / subdivisions * (height.width - 1));
        const pixelY = Math.floor(row / subdivisions * (height.height - 1));
        positions[index * 3] = x;
        positions[index * 3 + 1] = HEIGHTMAP_MIN + height.pixels[pixelY * height.width + pixelX] / 65535 * (HEIGHTMAP_MAX - HEIGHTMAP_MIN);
        positions[index * 3 + 2] = z;
        sampleBiomeRgb(biome, x, z, rgb);
        colors.set(rgb, index * 4); colors[index * 4 + 3] = 1;
    }
    let offset = 0;
    for (let row = 0; row < subdivisions; row++) for (let column = 0; column < subdivisions; column++) {
        const a = column + row * side, b = a + 1, c = a + side, d = c + 1;
        indices[offset++] = d; indices[offset++] = b; indices[offset++] = a;
        indices[offset++] = c; indices[offset++] = d; indices[offset++] = a;
    }
    VertexData.ComputeNormals(positions, indices, normals);
    const data = new VertexData();
    data.positions = positions; data.normals = normals; data.colors = colors; data.indices = indices;
    return data;
}
