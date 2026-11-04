import type { Scene } from '@babylonjs/core/scene';
import { loadPinePack } from './PinePack.ts';
export const FIR_VARIANTS = ['Fir_large_2','Fir_medium_1','Fir_medium_2','Fir_small_1','Fir_small_2'] as const;
export function loadFirPack(scene:Scene) {
    return loadPinePack(scene,{path:'terrain/forest/fir-pack-selected.glb',variants:FIR_VARIANTS,referenceVariant:'Fir_medium_1'});
}
