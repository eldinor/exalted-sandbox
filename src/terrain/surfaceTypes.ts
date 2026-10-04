/** Matching CPU and WGSL biome thresholds restrict deformation to authored snow and sand. */

/** Measured COLOR_0 values in alpha-map.glb at the Rev B region centres. */
export const SAND_COLORS = [
    [0.822782, 0.679545, 0.417884],
    [0.760525, 0.630762, 0.401984],
] as const;

/** Measured COLOR_0 value of the connected authored GLB road network. */
export const ROAD_COLOR = [235 / 255, 206 / 255, 161 / 255] as const;

/** Sand palette measured directly from the blended 4K biome map. */
export const BIOME_MAP_SAND_COLORS = [
    [234 / 255, 215 / 255, 173 / 255],
    [226 / 255, 208 / 255, 170 / 255],
] as const;

/** Road/path palette measured directly from the blended 4K biome map. */
export const BIOME_MAP_ROAD_COLORS = [
    [246 / 255, 232 / 255, 208 / 255],
    [236 / 255, 222 / 255, 197 / 255],
] as const;

/** Snow palette measured directly from the blended 4K biome map. */
export const BIOME_MAP_SNOW_COLORS = [
    [243 / 255, 246 / 255, 249 / 255],
] as const;

type NumericInput = ArrayLike<number>;
type NumericOutput = { [index: number]: number };

function smooth(a: number, b: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function paletteDistance(color: NumericInput, palette: ReadonlyArray<NumericInput>): number {
    let nearest = Infinity;
    for (const sample of palette) {
        nearest = Math.min(nearest, Math.hypot(
            color[0] - sample[0], color[1] - sample[1], color[2] - sample[2],
        ));
    }
    return nearest;
}

/** Write [snow, sand] softness from GLB vertex RGB; roads and other biomes remain firm. */
export function surfaceWeights<T extends NumericOutput>(color: NumericInput, out: T): T {
    out[0] = smooth(0.75, 0.87, Math.min(color[0], color[1], color[2]));
    out[1] = 1 - smooth(0.025, 0.09, paletteDistance(color, SAND_COLORS));
    return out;
}

/** Normalized [snow, sand, road] weights from the blended 4K biome map. */
export function biomeMapMaterialWeights<T extends NumericOutput>(color: NumericInput, out: T): T {
    const snowDistance = paletteDistance(color, BIOME_MAP_SNOW_COLORS);
    const sandDistance = paletteDistance(color, BIOME_MAP_SAND_COLORS);
    const roadDistance = paletteDistance(color, BIOME_MAP_ROAD_COLORS);
    const nearest = Math.min(snowDistance, sandDistance, roadDistance);
    const presence = 1 - smooth(0.06, 0.18, nearest);
    // Preserve more of the authored transition ramp. A steeper classifier made
    // the softly painted 4K borders collapse back into nearly binary regions.
    const snow = Math.exp(-450 * snowDistance * snowDistance);
    const sand = Math.exp(-450 * sandDistance * sandDistance);
    const road = Math.exp(-450 * roadDistance * roadDistance);
    const scale = presence / Math.max(snow + sand + road, 1e-8);
    out[0] = snow * scale; out[1] = sand * scale; out[2] = road * scale;
    return out;
}

/** Write [snow, sand] coverage while retaining the public two-channel API. */
export function biomeMapSurfaceWeights<T extends NumericOutput>(color: NumericInput, out: T): T {
    const weights = new Float32Array(3);
    biomeMapMaterialWeights(color, weights);
    out[0] = weights[0];
    out[1] = weights[1];
    return out;
}

/** Smooth road coverage for the GLB fallback vertex colors. */
export function roadWeight(color: NumericInput): number {
    return 1 - smooth(0.025, 0.085, paletteDistance(color, [ROAD_COLOR]));
}

/** Smooth road coverage for the independently authored 4K biome map. */
export function biomeMapRoadWeight(color: NumericInput): number {
    const weights = new Float32Array(3);
    biomeMapMaterialWeights(color, weights);
    return weights[2];
}

function wgslDistance(color: string, palette: ReadonlyArray<NumericInput>): string {
    const terms = palette.map(sample => `distance(${color}, vec3f(${sample[0]},${sample[1]},${sample[2]}))`);
    return terms.slice(1).reduce((result, term) => `min(${result}, ${term})`, terms[0]);
}

/** The source-specific palettes and thresholds compiled into GPU consumers. */
export const surfaceWGSL = `
fn surfaceWeights(color: vec3f) -> vec2f {
    let snow = smoothstep(0.75, 0.87, min(color.r, min(color.g, color.b)));
    let d = ${wgslDistance('color', SAND_COLORS)};
    return vec2f(snow, 1.0 - smoothstep(0.025, 0.09, d));
}
fn biomeMapMaterialWeights(color: vec3f) -> vec3f {
    let distances = vec3f(
        ${wgslDistance('color', BIOME_MAP_SNOW_COLORS)},
        ${wgslDistance('color', BIOME_MAP_SAND_COLORS)},
        ${wgslDistance('color', BIOME_MAP_ROAD_COLORS)}
    );
    let nearest = min(distances.x, min(distances.y, distances.z));
    let presence = 1.0 - smoothstep(0.06, 0.18, nearest);
    let scores = exp(-450.0 * distances * distances);
    return scores / max(dot(scores, vec3f(1.0)), 1e-8) * presence;
}
fn biomeMapSurfaceWeights(color: vec3f) -> vec2f {
    return biomeMapMaterialWeights(color).xy;
}
fn roadWeight(color: vec3f) -> f32 {
    return 1.0 - smoothstep(0.025, 0.085, distance(color, vec3f(${ROAD_COLOR.join(',')})));
}
fn biomeMapRoadWeight(color: vec3f) -> f32 {
    return biomeMapMaterialWeights(color).z;
}
fn localFade(world: vec2f, center: vec2f) -> f32 {
    let d = abs(world - center);
    return 1.0 - smoothstep(12.0, 16.0, max(d.x, d.y));
}
`;
