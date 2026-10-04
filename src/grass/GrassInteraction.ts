/** Bounded, allocation-free snapshot of the existing surf ring. Each vec4 is xyz + strength. */
export const MAX_GRASS_SURF_SEGMENTS = 8;
export const GRASS_SURF_LIFETIME = .88;
export function writeSurfSegments(x: Float32Array, y: Float32Array, z: Float32Array,
    strength: Float32Array, laid: Float32Array, head: number, count: number, clock: number,
    out: Float32Array): number {
    if (out.length < MAX_GRASS_SURF_SEGMENTS * 8) throw new RangeError('Grass surf buffer requires 64 floats.');
    out.fill(0);
    const segments = Math.min(MAX_GRASS_SURF_SEGMENTS, count - 1);
    if (segments <= 0) return 0;
    let written = 0;
    for (let segment = 0; segment < segments; segment++) {
        const newer = (head - Math.floor(segment * (count - 1) / segments) + x.length) % x.length;
        const older = (head - Math.floor((segment + 1) * (count - 1) / segments) + x.length) % x.length;
        if (Math.hypot(x[newer] - x[older], z[newer] - z[older]) < .001) continue;
        const offset = written++ * 8;
        for (let endpoint = 0; endpoint < 2; endpoint++) {
            const index = endpoint === 0 ? older : newer;
            const age = Math.max(0, Math.min(1, (clock - laid[index]) / GRASS_SURF_LIFETIME));
            out[offset + endpoint * 4] = x[index];
            out[offset + endpoint * 4 + 1] = y[index];
            out[offset + endpoint * 4 + 2] = z[index];
            out[offset + endpoint * 4 + 3] = strength[index] * (1 - age) * (1 - age);
        }
    }
    return written;
}

export function grassInteractionAllowed(flying: boolean, jumping: boolean, swimming: boolean,
    avatarY: number, groundY: number): boolean {
    return !flying && !jumping && !swimming && Math.abs(avatarY - groundY) < .35;
}
