/** Authored closure between the two northern Stone Gate endpoint boulders. */
import type { IronRockSite } from './IronRockPlacement.ts';

export const STONE_GATE_WALL_ENDS = [{x:-57.1006,z:-278.1011},{x:-23.3307,z:-269.9006}] as const;
export interface StoneGateWallSite extends IronRockSite { layer: number; }
export function placeStoneGateWall(heightAt:(x:number,z:number)=>number):StoneGateWallSite[] {
    const [a,b]=STONE_GATE_WALL_ENDS,sites:StoneGateWallSite[]=[];
    const length=Math.hypot(b.x-a.x,b.z-a.z),nx=-(b.z-a.z)/length,nz=(b.x-a.x)/length;
    // Closely overlapping pieces close the pass, with a staggered silhouette.
    for(let i=1;i<14;i++){
        const t=i/14,jitter=Math.sin(i*2.7)*.45;
        const x=a.x+(b.x-a.x)*t+nx*jitter,z=a.z+(b.z-a.z)*t+nz*jitter;
        const width=5.2+Math.sin(i*1.9)*.7,depth=4.8+Math.cos(i*2.3)*.5;
        const height=5.6+Math.sin(i*1.3)*1.5;
        let foundation=heightAt(x,z);
        for(let j=0;j<8;j++){const angle=j*Math.PI/4;foundation=Math.min(foundation,heightAt(x+Math.cos(angle)*3,z+Math.sin(angle)*3));}
        if(!Number.isFinite(foundation))throw new Error('Stone Gate wall requires valid terrain grounding.');
        sites.push({x,z,y:foundation-height*.18,width,height,depth,yaw:i*2.399963,kind:'boulder',layer:1+i%3});
    }
    return sites;
}
