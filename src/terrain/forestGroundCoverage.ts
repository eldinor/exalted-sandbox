/** Temporary display-only correction for the grey Forest Overlook clearing.
 * Babylon coordinates; replace with authored forest coverage when masks arrive.
 * Keep separate from snow/sand deformation, tree placement and collisions.
 */
const OVERLOOK_CENTER = [-248, 125] as const;
const OVERLOOK_HALF_EXTENT = [74, 83] as const;
const OVERLOOK_ROCK_COLORS = [[162 / 255, 153 / 255, 144 / 255], [169 / 255, 163 / 255, 157 / 255]] as const;

function fade(a: number, b: number, value: number): number {
    const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
    return 1 - t * t * (3 - 2 * t);
}

export function forestOverlookGroundWeight(x: number, z: number, color: ArrayLike<number>): number {
    const bounds = Math.max(Math.abs(x - OVERLOOK_CENTER[0]) / OVERLOOK_HALF_EXTENT[0],
        Math.abs(z - OVERLOOK_CENTER[1]) / OVERLOOK_HALF_EXTENT[1]);
    const distance = Math.min(...OVERLOOK_ROCK_COLORS.map(sample =>
        Math.hypot(color[0] - sample[0], color[1] - sample[1], color[2] - sample[2])));
    return fade(1, 1.1, bounds) * fade(.025, .08, distance);
}

export const forestGroundCoverageWGSL = `
fn forestOverlookGroundWeight(world: vec2f, color: vec3f) -> f32 {
    let bounds = abs(world - vec2f(${OVERLOOK_CENTER.join(',')})) / vec2f(${OVERLOOK_HALF_EXTENT.join(',')});
    let region = 1.0 - smoothstep(1.0, 1.1, max(bounds.x, bounds.y));
    let rockDistance = min(distance(color, vec3f(${OVERLOOK_ROCK_COLORS[0].join(',')})),
        distance(color, vec3f(${OVERLOOK_ROCK_COLORS[1].join(',')})));
    return region * (1.0 - smoothstep(0.025, 0.08, rockDistance));
}
`;
