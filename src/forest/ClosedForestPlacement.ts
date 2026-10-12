import { pineGroundHeight } from './PineGrounding.ts';
import type { PropCollider } from '../world/propCollisions.ts';

export const CLOSED_FOREST = Object.freeze({ variant: 'Pine_big_1', spacing: 5.5,
    height: 20, eastBoundary: -352, chunkSize: 32, nearDistance: 0, distance: 600 });
export const FOREST_REAL_EDGE_WIDTH = 15;
export const FOREST_IMPOSTOR_BOUNDARY = CLOSED_FOREST.eastBoundary - FOREST_REAL_EDGE_WIDTH;
export const FOREST_SPAWN_REAL_RADIUS = 33;
export const FOREST_SMALL_SHARE = .25;
export function usesBorderImpostor(x: number, z: number): boolean {
    return x <= FOREST_IMPOSTOR_BOUNDARY && Math.hypot(x + 383.5, z - 52) > FOREST_SPAWN_REAL_RADIUS;
}
/** Small 1 replaces a deterministic share of real sites, keeping total density. */
export function realForestVariant(x: number, z: number): 'Pine_big_1' | 'Pine_small_1' {
    return random(Math.round(x / CLOSED_FOREST.spacing), Math.round(z / CLOSED_FOREST.spacing), 5) < FOREST_SMALL_SHARE
        ? 'Pine_small_1' : 'Pine_big_1';
}

/** Keep the spawn clearing connected to the accessible western side of the forest. */
export function forestAccessExcluded(x: number, z: number, margin = 0): boolean {
    return Math.hypot(x + 383.5, z - 52) <= 18 + margin
        || (x >= -383.5 - margin && Math.abs(z - 52) <= 8 + margin);
}
export interface ForestSite { x: number; y: number; z: number; scale: number; yaw: number; }
export interface ForestSampling {
    minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number;
    forestAt(x: number, z: number): boolean;
    heightAt(x: number, z: number): number;
    slopeAt(x: number, z: number): number;
    submergedAt(x: number, z: number, height: number): boolean;
}
function random(x: number, z: number, salt: number): number {
    let value = Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ salt;
    value = Math.imul(value ^ (value >>> 16), 2246822507);
    value = Math.imul(value ^ (value >>> 13), 3266489909);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** East on the authored chart is negative Babylon X. Barriers remain independent of rendering. */
export function placeClosedForest(sample: ForestSampling, rootSupport: Float32Array, modelHeight: number): {
    trees: ForestSite[]; barriers: PropCollider[];
} {
    const trees: ForestSite[] = [], barriers: PropCollider[] = [];
    const spacing = CLOSED_FOREST.spacing;
    const allowed = (x: number, z: number) => x >= sample.minX + 3 && x <= CLOSED_FOREST.eastBoundary
        && z >= sample.minZ + 3 && z <= sample.maxZ - 3
        && !forestAccessExcluded(x, z) && sample.forestAt(x, z);
    for (let row = Math.ceil(sample.minZ / spacing); row * spacing <= sample.maxZ; row++) {
        for (let col = Math.ceil(sample.minX / spacing); col * spacing <= CLOSED_FOREST.eastBoundary; col++) {
            const gx = col * spacing, gz = row * spacing;
            // Overlapping cylinders seal the restricted forest, including flight paths.
            if (allowed(gx, gz) && !forestAccessExcluded(gx, gz, spacing * .8)) barriers.push({ x: gx, z: gz, radius: spacing * .8,
                minY: sample.minY - 100, maxY: sample.maxY + 1000, name: `closed-forest:${col}:${row}` });
            const x = gx + (random(col, row, 1) - .5) * spacing * .55;
            const z = gz + (random(col, row, 2) - .5) * spacing * .55;
            if (!allowed(x, z) || !allowed(x - 2, z) || !allowed(x + 2, z)
                || !allowed(x, z - 2) || !allowed(x, z + 2)) continue;
            const height = sample.heightAt(x, z);
            if (sample.submergedAt(x, z, height) || sample.slopeAt(x, z) > .7) continue;
            const scale = CLOSED_FOREST.height / modelHeight * (.9 + random(col, row, 3) * .2);
            const yaw = random(col, row, 4) * Math.PI * 2;
            const y = pineGroundHeight(rootSupport, x, z, scale, yaw, sample.heightAt);
            trees.push({ x, y, z, scale, yaw });
        }
    }
    return { trees, barriers };
}

/** Camera altitude participates in LOD selection; tree tops retain their authored silhouettes. */
export function forestLod(x: number, y: number, z: number, camera: { x: number; y: number; z: number }): number {
    const distance = Math.hypot(x - camera.x, y + CLOSED_FOREST.height * .5 - camera.y, z - camera.z);
    return distance > CLOSED_FOREST.distance ? -1 : 1;
}
