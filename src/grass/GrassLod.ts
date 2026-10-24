import type { GrassSettings } from './grassTypes.ts';

export function grassTransitionEnd(settings:Pick<GrassSettings,'farDistance'|'distantLodDistance'|'distantTransitionWidth'>):number {
    return Math.min(settings.distantLodDistance??Infinity,settings.farDistance+Math.max(.5,settings.distantTransitionWidth??12));
}
/** Exact distance range of tuft roots in a square patch, without allocating corners. */
export function grassTileMinDistance(x:number,z:number,cx:number,cz:number,size=16):number {
    return Math.hypot(Math.max(0,Math.abs(x-cx)-size*.5),Math.max(0,Math.abs(z-cz)-size*.5));
}
export function grassTileMaxDistance(x:number,z:number,cx:number,cz:number,size=16):number {
    return Math.hypot(Math.abs(x-cx)+size*.5,Math.abs(z-cz)+size*.5);
}
