import type { MeshSurface } from '../terrain/meshSurface.ts';
import { forestOverlookGroundWeight } from '../terrain/forestGroundCoverage.ts';

export type SunRegion='base'|'forest'|'island';
function fade(a:number,b:number,x:number):number {const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return 1-t*t*(3-2*t);}
export function islandSunWeight(x:number,z:number):number {return fade(55,75,Math.hypot(x-272.5,z-76));}
/** Avatar-driven sun bearing, with boundary hysteresis and delayed smooth release. */
export class BiomeSun {
    readonly delaySeconds=1;
    readonly transitionSeconds=7;
    region:SunRegion='base';
    azimuth:number;
    private pending:SunRegion='base';
    private dwell=0;
    private from:number;
    private goal:number;
    private elapsed=7;
    private readonly rgb=new Float32Array(3);
    constructor(baseAzimuth:number){this.azimuth=this.from=this.goal=baseAzimuth;}
    get moving():boolean {return this.elapsed<this.transitionSeconds;}
    forestWeight(surface:MeshSurface|null,x:number,z:number):number {
        if(!surface||x<surface.minX||x>surface.maxX||z<surface.minZ||z>surface.maxZ)return 0;
        surface.sample(x,z,undefined,this.rgb);
        return Math.max(fade(.025,.08,Math.hypot(this.rgb[0]-124/255,this.rgb[1]-170/255,this.rgb[2]-129/255)),forestOverlookGroundWeight(x,z,this.rgb));
    }
    update(dt:number,baseAzimuth:number,forestWeight:number,islandWeight:number,frozen=false):number {
        if(frozen||dt<=0)return this.azimuth;
        const desired:SunRegion=islandWeight>=(this.region==='island'?.25:.65)?'island':
            forestWeight>=(this.region==='forest'?.25:.65)?'forest':'base';
        if(desired!==this.pending){this.pending=desired;this.dwell=0;}
        this.dwell+=dt;
        if(desired!==this.region&&this.dwell>=this.delaySeconds)this.region=desired;
        const target=this.region==='forest'?225:this.region==='island'?105:baseAzimuth;
        if(target!==this.goal){this.from=this.azimuth;this.goal=target;this.elapsed=0;}
        this.elapsed=Math.min(this.transitionSeconds,this.elapsed+dt);
        const t=this.elapsed/this.transitionSeconds,smooth=t*t*(3-2*t),delta=((this.goal-this.from+540)%360)-180;
        this.azimuth=((this.from+delta*smooth)%360+360)%360;
        return this.azimuth;
    }
}
