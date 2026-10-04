/** Grass classification shared by placement and production ground shading. */
export const AUTHORED_GRASS_COLOR = [0.450782, 0.617212, 0.300542] as const;
export const HEIGHTMAP_GRASS_COLOR = [179 / 255, 206 / 255, 149 / 255] as const;

function grassPaletteWeight(color: ArrayLike<number>, target: readonly number[]): number {
    const distance = Math.hypot(color[0] - target[0], color[1] - target[1], color[2] - target[2]);
    const t = Math.max(0, Math.min(1, (distance - .025) / .075));
    return 1 - t * t * (3 - 2 * t);
}
export function authoredGrassWeight(color: ArrayLike<number>): number { return grassPaletteWeight(color, AUTHORED_GRASS_COLOR); }
export function roadsGrassWeight(color: ArrayLike<number>): number { return grassPaletteWeight(color, HEIGHTMAP_GRASS_COLOR); }

export const grassBiomeWGSL = `
fn grassPaletteWeight(color: vec3f, referenceColor: vec3f) -> f32 {
    return 1.0 - smoothstep(0.025, 0.1, distance(color, referenceColor));
}
fn heightmapGrassWeight(color: vec3f) -> f32 {
    return grassPaletteWeight(color, vec3f(${HEIGHTMAP_GRASS_COLOR.join(',')}));
}
fn authoredGrassWeight(color: vec3f) -> f32 {
    return grassPaletteWeight(color, vec3f(${AUTHORED_GRASS_COLOR.join(',')}));
}
`;
