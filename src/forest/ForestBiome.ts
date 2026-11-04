/** The dark-green forest palette from the authored roads biome PNG. */
export function isForestColor(rgb: ArrayLike<number>): boolean {
    return Math.hypot(rgb[0] - 124 / 255, rgb[1] - 170 / 255, rgb[2] - 129 / 255) < .04;
}
