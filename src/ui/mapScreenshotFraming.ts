/** Fit the authored rectangle with padding while preserving screenshot aspect. */
export function mapScreenshotFraming(minX: number, maxX: number, minZ: number, maxZ: number,
    width = 2048, height = 1536): { x: number; z: number; halfWidth: number; halfHeight: number } {
    if (![minX,maxX,minZ,maxZ,width,height].every(Number.isFinite) || maxX <= minX || maxZ <= minZ || width <= 0 || height <= 0) {
        throw new Error('Invalid whole-map screenshot bounds.');
    }
    const aspect = width / height;
    const halfWidth = Math.max((maxX - minX) * .54, (maxZ - minZ) * .54 * aspect);
    return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, halfWidth, halfHeight: halfWidth / aspect };
}
