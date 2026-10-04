export function grassHash(x: number): number {
    let value = x | 0;
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000;
}

/** Each candidate scatters across the whole patch, independently of grid rows. */
export function grassCandidateSeed(patchX: number, patchZ: number, candidate: number): number {
    return (Math.imul(patchX, 73856093) ^ Math.imul(patchZ, 19349663) ^ Math.imul(candidate, 83492791) ^ 0x9e3779b9) >>> 0;
}

/** Compose yaw/pitch/roll and independent scales without per-instance objects. */
export function writeGrassMatrix(buffer: Float32Array, offset: number, x: number, y: number, z: number, scaleX: number, scaleY: number, scaleZ: number, pitch: number, yaw: number, roll: number): void {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    buffer[offset] = (cy * cr + sy * sp * sr) * scaleX;
    buffer[offset + 1] = cp * sr * scaleX;
    buffer[offset + 2] = (-sy * cr + cy * sp * sr) * scaleX;
    buffer[offset + 3] = 0;
    buffer[offset + 4] = (-cy * sr + sy * sp * cr) * scaleY;
    buffer[offset + 5] = cp * cr * scaleY;
    buffer[offset + 6] = (sy * sr + cy * sp * cr) * scaleY;
    buffer[offset + 7] = 0;
    buffer[offset + 8] = sy * cp * scaleZ;
    buffer[offset + 9] = -sp * scaleZ;
    buffer[offset + 10] = cy * cp * scaleZ;
    buffer[offset + 11] = 0;
    buffer[offset + 12] = x; buffer[offset + 13] = y; buffer[offset + 14] = z; buffer[offset + 15] = 1;
}
