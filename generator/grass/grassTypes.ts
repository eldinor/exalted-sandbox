import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

export interface GrassSettings {
    enabled: boolean;
    density: number;
    nearDistance: number;
    farDistance: number;
    bladeHeight: number;
    bladeWidth: number;
    windStrength: number;
    windSpeed: number;
    interaction: boolean;
    movingImpacts: boolean;
    interactionRadius: number;
    interactionStrength: number;
    freezeWind: boolean;
    visualization: 'final' | 'lod' | 'biome' | 'patches';
    bladeSource: 'procedural' | 'imported' | 'hybrid';
    importedVariant: string;
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
}

export interface GrassUpdateContext {
    cameraPosition: Vector3;
    elapsedSeconds: number;
    impacts: readonly GrassImpact[];
}
