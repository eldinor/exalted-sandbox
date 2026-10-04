/** Stable thinning by horizontal placement, shared by every primitive of a prop. */
export function keepDesertPlacement(x: number, z: number, worldScale: number): boolean {
    const keepRatio = Math.min(1, worldScale * worldScale);
    if (keepRatio >= 1) return true;
    let hash = 2166136261;
    // Ignore height and material/node names: rebasing and multi-material splits
    // must not change the decision for a single authored placement.
    const key = `${Math.round(x * 100)}:${Math.round(z * 100)}`;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 0x100000000 < keepRatio;
}
