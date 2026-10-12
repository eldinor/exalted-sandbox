export interface ImpostorView { direction: [number, number, number]; right: [number, number, number]; up: [number, number, number]; }
export function spruceImpostorViews(): ImpostorView[] {
    const views: ImpostorView[] = [];
    for (const elevation of [0, Math.PI / 4]) for (let i = 0; i < 8; i++) {
        const yaw = i * Math.PI / 4, c = Math.cos(elevation), s = Math.sin(elevation);
        views.push({ direction: [Math.sin(yaw) * c, s, Math.cos(yaw) * c],
            right: [-Math.cos(yaw), 0, Math.sin(yaw)], up: [-Math.sin(yaw) * s, c, -Math.cos(yaw) * s] });
    }
    views.push({ direction: [0, 1, 0], right: [-1, 0, 0], up: [0, 0, -1] });
    return views;
}
/** Closest baked view, including overhead; no allocation in the selection path. */
export function selectImpostorView(views: readonly ImpostorView[], x: number, y: number, z: number): number {
    let selected = 0, score = -Infinity;
    for (let i = 0; i < views.length; i++) {
        const direction = views[i].direction, dot = direction[0] * x + direction[1] * y + direction[2] * z;
        if (dot > score) { score = dot; selected = i; }
    }
    return selected;
}
