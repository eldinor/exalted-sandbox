import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { MeshSurface } from '../../src/terrain/meshSurface.ts';
import type { GrassSamplers } from './grassTypes.ts';

/** COLOR_0 at The Long Green, measured from alpha-map.glb after loader baking. */
export const AUTHORED_GRASS_COLOR = [0.450782, 0.617212, 0.300542] as const;

export function authoredGrassWeight(color: ArrayLike<number>): number {
    const distance = Math.hypot(color[0] - AUTHORED_GRASS_COLOR[0], color[1] - AUTHORED_GRASS_COLOR[1], color[2] - AUTHORED_GRASS_COLOR[2]);
    const t = Math.max(0, Math.min(1, (distance - .025) / .075));
    // The grass palette is disjoint from roads and all other authored biomes.
    return 1 - t * t * (3 - 2 * t);
}

/** Exact authored triangle grounding, with one reusable query for placement predicates. */
export function createAuthoredGrassSamplers(surface: MeshSurface): GrassSamplers {
    const color = new Float32Array(3);
    const normal = new Vector3();
    const grassVertices = new Uint8Array(surface.positions.length / 3);
    if (surface.colors) for (let vertex = 0; vertex < grassVertices.length; vertex++) {
        color[0] = surface.colors[vertex * 4]; color[1] = surface.colors[vertex * 4 + 1]; color[2] = surface.colors[vertex * 4 + 2];
        grassVertices[vertex] = authoredGrassWeight(color) > 0 ? 1 : 0;
    }
    const grassCells = new Uint8Array(surface.cells.length);
    for (let cell = 0; cell < surface.cells.length; cell++) {
        for (const offset of surface.cells[cell]) {
            if (grassVertices[surface.indices[offset]] || grassVertices[surface.indices[offset + 1]] || grassVertices[surface.indices[offset + 2]]) {
                grassCells[cell] = 1; break;
            }
        }
    }
    let lastX = NaN, lastZ = NaN, height = 0, weight = 0, valid = false;
    const sample = (x: number, z: number): boolean => {
        if (x === lastX && z === lastZ) return valid;
        lastX = x; lastZ = z; valid = false;
        if (x < surface.minX || x > surface.maxX || z < surface.minZ || z > surface.maxZ) return false;
        try {
            height = surface.sample(x, z, normal, color);
            weight = authoredGrassWeight(color);
            valid = true;
        } catch (error) {
            if (!(error instanceof Error) || !error.message.startsWith('No Exalted terrain triangle')) throw error;
        }
        return valid;
    };
    return {
        heightAt: (x, z) => {
            if (!sample(x, z)) throw new Error(`No authored ground at (${x}, ${z}).`);
            return height;
        },
        grassWeightAt: (x, z) => sample(x, z) ? weight : 0,
        excludedAt: (x, z) => !sample(x, z) || weight <= 0,
        slopeAt: (x, z) => sample(x, z) ? Math.hypot(normal.x, normal.z) / Math.max(normal.y, 1e-6) : Infinity,
        patchMayContainGrass: (x, z, size) => {
            if (x + size < surface.minX || x > surface.maxX || z + size < surface.minZ || z > surface.maxZ) return false;
            for (let row = surface._row(z); row <= surface._row(z + size); row++) {
                for (let col = surface._col(x); col <= surface._col(x + size); col++) {
                    if (grassCells[row * surface.cols + col]) return true;
                }
            }
            return false;
        },
    };
}
