/**
 * Production scale of the authored Exalted world.
 *
 * The original authored terrain and all map coordinates are reduced to 50%.
 * Character and prop geometry remain metre-sized; only terrain geometry,
 * authored placements, water and navigation coordinates use this scale.
 * This scale was established by the former half-world experiment.
 */
export const AUTHORED_WORLD_SCALE: number = 0.5;

/** Scale an original authored map coordinate into production-world metres. */
export function scaledWorldCoordinate(value: number, scale = AUTHORED_WORLD_SCALE): number {
    return value * scale;
}
