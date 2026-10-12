import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { PinePrototype } from './PinePack.ts';
import { pineGroundHeight } from './PineGrounding.ts';
import { denseForestBoundaryAt } from './DenseForestShape.ts';
import { openForestExcluded, type OpenForestSite } from './OpenForestPlacement.ts';
import type { ForestSampling } from './ClosedForestPlacement.ts';
import type { PropCollider } from '../world/propCollisions.ts';

export const FOREST_FRINGE = Object.freeze({spacing:3.5,inside:3,outside:14,treeShare:.4});
export const FOREST_BUSH_VARIANT='Fir_shrub_1';
/** Two low, wide fir shoots form a 592-triangle evergreen shrub, sharing fir textures. */
export function createForestBush(source:PinePrototype):PinePrototype {
    const far=source.far.map(part=>{
        const pieces=[];
        for(const [x,z,yaw,height] of [[-.35,0,.4,1.5],[.35,.15,2.7,1.25]]){
            const geometry=part.geometry.clone();
            const transform=Matrix.Compose(new Vector3(1.8/source.height,height/source.height,1.8/source.height),Quaternion.RotationYawPitchRoll(yaw,0,0),new Vector3(x,0,z));
            geometry.transform(transform);pieces.push(geometry);
        }
        pieces[0].merge(pieces[1]);
        return {...part,geometry:pieces[0]};
    });
    return {name:FOREST_BUSH_VARIANT,height:1.5,near:far,far,rootSupport:new Float32Array([-.35,0,0,.35,0,.15])};
}
function random(x:number,z:number,salt:number):number {
    let h=Math.imul(x,73856093)^Math.imul(z,19349663)^salt;
    h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);
    return ((h^(h>>>16))>>>0)/4294967296;
}
export function placeForestFringe(sample:ForestSampling,models:readonly PinePrototype[],existing:readonly {x:number;z:number}[]):{
    trees:OpenForestSite[];colliders:PropCollider[];bushes:number;
} {
    const trees:OpenForestSite[]=[],colliders:PropCollider[]=[],spacing=FOREST_FRINGE.spacing;
    const accepted=(x:number,z:number)=>x>=sample.minX+3&&x<=sample.maxX-3&&z>=sample.minZ+3&&z<=sample.maxZ-3
        &&!openForestExcluded(x,z)&&sample.forestAt(x,z);
    let bushes=0;
    for(let row=Math.ceil(sample.minZ/spacing);row*spacing<=sample.maxZ;row++){
        const z=(row+(random(row,0,31)-.5)*.5)*spacing,edge=denseForestBoundaryAt(z);
        for(let col=Math.ceil((edge-FOREST_FRINGE.inside)/spacing);col*spacing<=edge+FOREST_FRINGE.outside;col++){
            const x=(col+(random(col,row,32)-.5)*.5)*spacing;
            if(x<edge-FOREST_FRINGE.inside||x>edge+FOREST_FRINGE.outside||!accepted(x,z)
                ||!accepted(x-1,z)||!accepted(x+1,z)||!accepted(x,z-1)||!accepted(x,z+1))continue;
            // Keep roots separated from retained placements; never move existing props.
            if(existing.some(site=>Math.hypot(x-site.x,z-site.z)<1.5))continue;
            const ground=sample.heightAt(x,z);
            if(!Number.isFinite(ground)||sample.submergedAt(x,z,ground)||sample.slopeAt(x,z)>.7)continue;
            const bush=random(col,row,33)>=FOREST_FRINGE.treeShare;
            const variant=bush?FOREST_BUSH_VARIANT:random(col,row,34)<.5?'Fir_small_1':'Fir_small_2';
            const model=models.find(model=>model.name===variant);if(!model)throw new Error(`Missing fringe model ${variant}.`);
            const height=bush?1.2+random(col,row,35)*.7:2.8+random(col,row,35)*1.5,scale=height/model.height,yaw=random(col,row,36)*Math.PI*2;
            const y=pineGroundHeight(model.rootSupport,x,z,scale,yaw,sample.heightAt);
            trees.push({x,y,z,scale,yaw,variant});
            if(bush)bushes++;
            else colliders.push({x,z,radius:Math.max(.12,height*.018),minY:ground-.3,maxY:ground+height*.65,name:`forest-fringe:${col}:${row}`});
        }
    }
    return {trees,colliders,bushes};
}
