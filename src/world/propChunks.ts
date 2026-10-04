/** Deterministic spatial membership; authored transforms remain untouched. */
export interface PropChunk {
    readonly key: string;
    readonly members: Uint32Array;
    readonly minX: number;
    readonly maxX: number;
    readonly minZ: number;
    readonly maxZ: number;
}

export function partitionPropChunks(centers: Float32Array, size: number): PropChunk[] {
    if (!Number.isFinite(size) || size <= 0 || centers.length % 2) throw new Error('Invalid prop chunk input.');
    const groups = new Map<string, number[]>();
    for (let i = 0; i < centers.length / 2; i++) {
        const key = `${Math.floor(centers[i * 2] / size)}:${Math.floor(centers[i * 2 + 1] / size)}`;
        const group = groups.get(key);
        if (group) group.push(i); else groups.set(key, [i]);
    }
    return Array.from(groups, ([key, members]) => {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const i of members) {
            minX = Math.min(minX, centers[i * 2]); maxX = Math.max(maxX, centers[i * 2]);
            minZ = Math.min(minZ, centers[i * 2 + 1]); maxZ = Math.max(maxZ, centers[i * 2 + 1]);
        }
        return { key, members: new Uint32Array(members), minX, maxX, minZ, maxZ };
    });
}

export function chunkInRange(chunk: PropChunk, x: number, z: number, radius: number): boolean {
    const dx = Math.max(chunk.minX - x, 0, x - chunk.maxX);
    const dz = Math.max(chunk.minZ - z, 0, z - chunk.maxZ);
    return dx * dx + dz * dz <= radius * radius;
}

export interface PropChunkCounts { nearCount: number; farCount: number; }

/** Append selected IDs into reusable LOD lists; callers reset counts per group. */
export function selectPropChunk(chunk: PropChunk, centers: Float32Array,
    x: number, z: number, distance: number, nearDistance: number,
    near: Uint32Array, far: Uint32Array, counts: PropChunkCounts): void {
    for (const i of chunk.members) {
        const dx = centers[i * 2] - x, dz = centers[i * 2 + 1] - z;
        const d2 = dx * dx + dz * dz;
        if (d2 > distance * distance) continue;
        const close = d2 < nearDistance * nearDistance;
        if (close) near[counts.nearCount++] = i;
        else far[counts.farCount++] = i;
    }
}
