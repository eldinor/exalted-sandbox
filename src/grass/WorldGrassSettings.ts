import type { GrassSettings } from './grassTypes.ts';
import { defaultGrassColors } from './GrassAppearance.ts';

export function worldGrassSettings(): GrassSettings {
    return {
        enabled: true, density: 3, maxSlope: 1, nearDistance: 22, farDistance: 22,
        distantLodDistance: 90, distantGrassDensity: .25, tightGrassBounds: true,
        bladeHeight: .85, bladeWidth: .045, windStrength: .3, windSpeed: 1, windDistance: 60,
        interaction: true, movingImpacts: false, interactionRadius: 2.4, interactionStrength: .55,
        freezeWind: false, visualization: 'final', bladeSource: 'imported',
        importedVariant: 'grass_medium_01_small_a_LOD2', importedNearLod: 2,
        lodEnabled: false, singleLod: 2, grassMixEnabled: true,
        grassMix: [
            { variant: 'grass_medium_01_tiny_d_LOD2', percentage: 10 },
            { variant: 'grass_medium_01_small_a_LOD2', percentage: 45 },
            { variant: 'grass_medium_01_small_b_LOD2', percentage: 45 },
        ],
        ...defaultGrassColors(),
    };
}

