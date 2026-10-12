import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { CameraRig } from './camera.ts';

export const GRASS_BENCHMARK_ROUTE = { name: 'Grassland approach and turn', version: 1, durationSeconds: 30 } as const;
export const FOREST_BENCHMARK_ROUTE = { name: 'Forest edge and aerial canopy', version: 1, durationSeconds: 30 } as const;
export type BenchmarkRouteKind = 'grass' | 'forest';
// Babylon metres, seconds and unwrapped yaw radians. Fixed geometry and timing
// make camera motion independent of frame rate and avatar physics.
const KEYS = [
    [0, -30, 210, -2.6], [6, -75, 155, -2.5], [12, -135, 100, -2.8],
    [18, -165, 40, -3.0], [24, -175, -5, -1.0], [30, -140, 35, 1.0],
] as const;
// Time, X, Z, height above terrain, yaw, pitch. Ground legs stay west of
// the closed strip; the aerial legs expose complete crowns from above.
const FOREST_KEYS = [
    [0, -320, 100, 3, -Math.PI / 2, .10],
    [6, -338, 52, 3, -Math.PI / 2, .10],
    [12, -330, -45, 3, -Math.PI / 2, .12],
    [18, -315, -65, 65, -1.8, .55],
    [24, -330, 45, 110, -Math.PI / 2, .78],
    [30, -315, 125, 60, -1.9, .50],
] as const;

function cubic(u: number, p: number, q: number, r: number, s: number): number {
    return .5 * ((2 * q) + (-p + r) * u + (2 * p - 5 * q + 4 * r - s) * u * u + (-p + 3 * q - 3 * r + s) * u * u * u);
}

export function sampleGrassRoute(seconds: number, out: Vector3): number {
    const t = Math.max(0, Math.min(30, seconds));
    const index = Math.min(KEYS.length - 2, Math.floor(t / 6));
    const a = KEYS[index], b = KEYS[index + 1];
    const before = KEYS[Math.max(0, index - 1)], after = KEYS[Math.min(KEYS.length - 1, index + 2)];
    const u = (t - a[0]) / (b[0] - a[0]);
    out.set(cubic(u, before[1], a[1], b[1], after[1]), 0, cubic(u, before[2], a[2], b[2], after[2]));
    const blend = u * u * (3 - 2 * u);
    return a[3] + (b[3] - a[3]) * blend;
}

/** Allocation-free, absolute-time ground approach followed by an aerial sweep. */
export function sampleForestRoute(seconds: number, out: Vector3, rotation: Vector3): void {
    const t = Math.max(0, Math.min(30, seconds));
    const index = Math.min(FOREST_KEYS.length - 2, Math.floor(t / 6));
    const a = FOREST_KEYS[index], b = FOREST_KEYS[index + 1];
    const before = FOREST_KEYS[Math.max(0, index - 1)], after = FOREST_KEYS[Math.min(FOREST_KEYS.length - 1, index + 2)];
    const u = (t - a[0]) / (b[0] - a[0]), blend = u * u * (3 - 2 * u);
    out.set(cubic(u, before[1], a[1], b[1], after[1]), a[3] + (b[3] - a[3]) * blend,
        cubic(u, before[2], a[2], b[2], after[2]));
    rotation.set(a[5] + (b[5] - a[5]) * blend, a[4] + (b[4] - a[4]) * blend, 0);
}

export class BenchmarkRoute {
    readonly focus = new Vector3();
    active = false;
    private runningSince: number | null = null;
    private readonly savedPosition = new Vector3();
    private readonly savedRotation = new Vector3();
    private savedFov = 1;
    private seconds = 0;
    private routeKind: BenchmarkRouteKind = 'grass';
    private heightAboveTerrain = 3;
    private readonly routeRotation = new Vector3();

    constructor(private readonly rig: CameraRig, private readonly heightAt: (x: number, z: number) => number,
        private readonly resetHistory: () => void, private readonly resetInput: () => void,
        private readonly onStart: () => void, private readonly onStop: () => void,
        private readonly queuedPatches: () => number) {}

    start(kind: BenchmarkRouteKind = 'grass'): void {
        if (this.active) return;
        this.savedPosition.copyFrom(this.rig.camera.position);
        this.savedRotation.copyFrom(this.rig.camera.rotation);
        this.savedFov = this.rig.camera.fov;
        this.runningSince = null;
        this.seconds = 0;
        this.routeKind = kind;
        this.active = true;
        this.resetInput(); this.onStart(); this.update(performance.now()); this.resetHistory();
        void document.exitPointerLock();
    }

    get kind(): BenchmarkRouteKind { return this.routeKind; }
    get ready(): boolean { return this.routeKind === 'forest' || this.queuedPatches() === 0; }
    beginRecording(now: number): void { this.runningSince = now; }

    update(now: number): void {
        if (!this.active) return;
        this.seconds = this.runningSince === null ? 0 : Math.min(30, Math.max(0, (now - this.runningSince) / 1000));
        if (this.routeKind === 'forest') sampleForestRoute(this.seconds, this.focus, this.routeRotation);
        else { this.routeRotation.set(.12, sampleGrassRoute(this.seconds, this.focus), 0); this.focus.y = 3; }
        this.heightAboveTerrain = this.focus.y;
        this.focus.y = this.heightAt(this.focus.x, this.focus.z);
        this.rig.camera.position.set(this.focus.x, this.focus.y + this.heightAboveTerrain, this.focus.z);
        this.rig.camera.rotation.copyFrom(this.routeRotation);
        this.rig.camera.fov = 1.02;
        this.resetInput();
    }

    snapshot() { return { ...(this.routeKind === 'forest' ? FOREST_BENCHMARK_ROUTE : GRASS_BENCHMARK_ROUTE),
        kind: this.routeKind, seconds: this.seconds, focus: this.focus.asArray(),
        cameraHeightAboveTerrain: this.heightAboveTerrain, verticalFovRadians: 1.02,
        pitchRadians: this.routeRotation.x, yawRadians: this.routeRotation.y }; }

    stop(): void {
        if (!this.active) return;
        this.active = false;
        this.rig.camera.position.copyFrom(this.savedPosition);
        this.rig.camera.rotation.copyFrom(this.savedRotation);
        this.rig.camera.fov = this.savedFov;
        this.resetInput(); this.onStop(); this.resetHistory();
    }
}
