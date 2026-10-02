import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { GrassMixEntry } from './GrassMix.ts';

export interface GrassSettings {
    enabled: boolean;
    density: number;
    nearDistance: number;
    farDistance: number;
    /** Optional imported LOD2 band beyond the main visible distance; 0 disables it. */
    distantLodDistance?: number;
    /** Fraction retained at the outer edge; full density at the main cutoff. */
    distantGrassDensity?: number;
    tightGrassBounds?: boolean;
    bladeHeight: number;
    bladeWidth: number;
    windStrength: number;
    windSpeed: number;
    /** Wind fades over the last third of this range; 0 means unlimited. */
    windDistance?: number;
    interaction: boolean;
    movingImpacts: boolean;
    interactionRadius: number;
    interactionStrength: number;
    freezeWind: boolean;
    visualization: 'final' | 'lod' | 'biome' | 'patches';
    bladeSource: 'procedural' | 'imported' | 'hybrid';
    importedVariant: string;
    grassMixEnabled?: boolean;
    grassMix?: readonly GrassMixEntry[];
    importedNearLod: 1 | 2;
    lodEnabled: boolean;
    singleLod: 1 | 2;
    /** Linear RGB gradient endpoints, independent of the geometry source. */
    rootColor: readonly [number, number, number];
    tipColor: readonly [number, number, number];
}

export interface GrassImpact {
    position: Vector3;
    radius: number;
    strength: number;
}

export interface GrassStats {
    updateMs: number;
    visiblePatches: number;
    nearInstances: number;
    midInstances: number;
    triangles: number;
    draws: number;
}

export interface GrassSamplers {
    heightAt(x: number, z: number): number;
    grassWeightAt(x: number, z: number): number;
    excludedAt(x: number, z: number): boolean;
    /** Optional exact triangle slope, expressed as rise over horizontal run. */
    slopeAt?(x: number, z: number): number;
    /** Conservative biome-only rejection before scheduling a whole patch. */
    patchMayContainGrass?(x: number, z: number, size: number): boolean;
}

export interface GrassUpdateContext {
    windCameraPosition?: Vector3;
    cameraPosition: Vector3;
    elapsedSeconds: number;
    impacts: readonly GrassImpact[];
}
