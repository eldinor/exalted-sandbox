import { forestAccessExcluded, type ForestSampling, type ForestSite } from './ClosedForestPlacement.ts';
import { pineGroundHeight } from './PineGrounding.ts';
import type { PinePrototype } from './PinePack.ts';
import type { PropCollider } from '../world/propCollisions.ts';
import { denseForestBoundaryAt } from './DenseForestShape.ts';

export const OPEN_FOREST = Object.freeze({ spacing: 8, minX: -417, maxX: -166,
    referenceHeight: 14, overlookX: -248, overlookZ: 125, clearingRadius: 18 });
export const OPEN_FOREST_MIX = [
    {variant:'Pine_medium_1',share:.25},{variant:'Pine_medium_2',share:.25},
    {variant:'Pine_small_1',share:.15},{variant:'Pine_small_2',share:.15},
    {variant:'Pine_sapling_1',share:.10},{variant:'Pine_sapling_2',share:.10},
] as const;
export interface OpenForestSite extends ForestSite { variant: string; }
function random(x:number,z:number,salt:number):number {
    let h=Math.imul(x,73856093)^Math.imul(z,19349663)^salt;
    h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);
    return ((h^(h>>>16))>>>0)/4294967296;
}
export function openForestExcluded(x:number,z:number):boolean {
    if (forestAccessExcluded(x,z)||Math.hypot(x-OPEN_FOREST.overlookX,z-OPEN_FOREST.overlookZ)<OPEN_FOREST.clearingRadius) return true;
    // Preserve the overlook's southeast sightline toward the grasslands.
    const dx=82,dz=-90,t=Math.max(0,Math.min(1,((x+248)*dx+(z-125)*dz)/(dx*dx+dz*dz)));
    return Math.hypot(x-(-248+dx*t),z-(125+dz*t))<8;
}
/** Accessible woodland: deterministic six-model placement and trunk-only collision. */
export function placeOpenForest(sample:ForestSampling,models:readonly PinePrototype[],referenceHeight:number):{
    trees:OpenForestSite[];colliders:PropCollider[];
} {
    const trees:OpenForestSite[]=[],colliders:PropCollider[]=[],spacing=OPEN_FOREST.spacing;
    const allowed=(x:number,z:number)=>x>denseForestBoundaryAt(z)+2&&x<=OPEN_FOREST.maxX
        &&x>=sample.minX+3&&x<=sample.maxX-3&&z>=sample.minZ+3&&z<=sample.maxZ-3
        &&!openForestExcluded(x,z)&&sample.forestAt(x,z);
    for(let row=Math.ceil(sample.minZ/spacing);row*spacing<=sample.maxZ;row++)for(let col=Math.ceil(Math.max(sample.minX,OPEN_FOREST.minX)/spacing);col*spacing<=OPEN_FOREST.maxX;col++){
        const x=(col+(random(col,row,11)-.5)*.55)*spacing,z=(row+(random(col,row,12)-.5)*.55)*spacing;
        if(!allowed(x,z)||!allowed(x-2,z)||!allowed(x+2,z)||!allowed(x,z-2)||!allowed(x,z+2))continue;
        const ground=sample.heightAt(x,z);
        if(!Number.isFinite(ground)||sample.slopeAt(x,z)>.7||sample.submergedAt(x,z,ground))continue;
        const selection=random(col,row,13);let cumulative=0,variant:string=OPEN_FOREST_MIX[5].variant;
        for(const entry of OPEN_FOREST_MIX){cumulative+=entry.share;if(selection<cumulative){variant=entry.variant;break;}}
        const model=models.find(tree=>tree.name===variant);if(!model)throw new Error(`Missing open forest model ${variant}.`);
        const scale=OPEN_FOREST.referenceHeight/referenceHeight*(.85+random(col,row,14)*.3),yaw=random(col,row,15)*Math.PI*2;
        const y=pineGroundHeight(model.rootSupport,x,z,scale,yaw,sample.heightAt);
        trees.push({x,y,z,scale,yaw,variant});
        colliders.push({x,z,radius:Math.max(.12,model.height*scale*.018),minY:ground-.3,maxY:ground+model.height*scale*.65,name:`open-forest:${col}:${row}:${variant}`});
    }
    return {trees,colliders};
}
