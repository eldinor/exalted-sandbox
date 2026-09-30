/**
 * Authored-world scale used by the isolated halved-world test page.
 *
 * Scaling happens when authored coordinates enter the runtime. Character and
 * prop geometry remain metre-sized, while terrain, placements and navigation
 * coordinates occupy a smaller world.
 */
export const AUTHORED_WORLD_SCALE = globalThis.location?.pathname.replace(/\\/g, '/').endsWith('/halved.html')
    ? 0.5
    : 1;

/** Scale an authored map coordinate into the active test world's metres. */
export function scaledWorldCoordinate(value: number, scale = AUTHORED_WORLD_SCALE): number {
    return value * scale;
}
