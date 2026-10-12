/** Collect trunk-base and root-tip support points once, from both geometry LODs. */
export function pineRootSupport(lods: readonly ArrayLike<number>[], height: number): Float32Array {
    const sectors = 16, radius = Math.max(.015, height * .02);
    const support: number[] = [];
    for (const positions of lods) {
        let centreY = Infinity, closest = Infinity, closestY = 0;
        const sectorY = new Float64Array(sectors).fill(Infinity), sectorX = new Float64Array(sectors), sectorZ = new Float64Array(sectors);
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i], y = positions[i + 1], z = positions[i + 2];
            if (y > height * .08) continue;
            const distance = Math.hypot(x, z);
            if (distance < closest) { closest = distance; closestY = y; }
            if (distance <= radius) centreY = Math.min(centreY, y);
            else {
                const sector = Math.min(sectors - 1, Math.floor((Math.atan2(z, x) + Math.PI) / (2 * Math.PI) * sectors));
                if (y < sectorY[sector]) { sectorY[sector] = y; sectorX[sector] = x; sectorZ[sector] = z; }
            }
        }
        if (!Number.isFinite(closest)) throw new Error('Pine geometry has no root vertices.');
        support.push(0, Number.isFinite(centreY) ? centreY : closestY, 0);
        for (let sector = 0; sector < sectors; sector++) if (Number.isFinite(sectorY[sector])) {
            support.push(sectorX[sector], sectorY[sector], sectorZ[sector]);
        }
    }
    return new Float32Array(support);
}

/** Embed rigid roots into the actual triangles, accounting for yaw and scale.
 * A shared height supports both LODs; only instance translation changes.
 */
export function pineGroundHeight(support: Float32Array, x: number, z: number, scale: number, yaw: number,
    heightAt: (x: number, z: number) => number): number {
    const cosine = Math.cos(yaw), sine = Math.sin(yaw);
    let y = heightAt(x, z);
    for (let i = 0; i < support.length; i += 3) {
        const dx = support[i] * scale, dz = support[i + 2] * scale;
        const ground = heightAt(x + dx * cosine + dz * sine, z - dx * sine + dz * cosine);
        y = Math.min(y, ground - support[i + 1] * scale);
    }
    return y - .03;
}
