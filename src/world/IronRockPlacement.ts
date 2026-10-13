/** Sparse, deterministic silhouette accents. Placement and collision are independent of rendering. */
import { HEIGHTMAP_WIDTH, HEIGHTMAP_DEPTH, type AuthoredPng } from '../terrain/authoredHeightmap.ts';

export interface IronRockSite { x:number; y:number; z:number; width:number; height:number; depth:number; yaw:number; kind:'cliff'|'boulder'; }
export interface IronRockQueries { ironAt:(x:number,z:number)=>number; roadAt:(x:number,z:number)=>number;
    heightAt:(x:number,z:number)=>number; upAt:(x:number,z:number)=>number; submergedAt:(x:number,z:number,y:number)=>boolean; }
export const IRON_ROCK_LIMITS = { cliffs:12, boulders:32, spacing:21, roadMargin:3, spawnRadius:18 } as const;

export function maskWeightAt(image:AuthoredPng,x:number,z:number):number {
    if(image.channels!==1||!(image.pixels instanceof Uint8Array))throw new Error('Rock placement requires grayscale8 masks.');
    const u=.5-x/HEIGHTMAP_WIDTH,v=.5+z/HEIGHTMAP_DEPTH;
    if(u<0||u>1||v<0||v>1)return 0;
    return image.pixels[Math.round(v*(image.height-1))*image.width+Math.round(u*(image.width-1))]/255;
}
const random=(x:number,z:number,salt:number)=>{const n=Math.sin(x*127.1+z*311.7+salt*74.7)*43758.5453;return n-Math.floor(n);};

export function placeIronRocks(q:IronRockQueries):IronRockSite[] {
    const result:IronRockSite[]=[];
    for(const kind of ['cliff','boulder'] as const){
        const candidates:(IronRockSite&{score:number;radius:number})[]=[];
        for(let gz=-16;gz<=16;gz++)for(let gx=-22;gx<=22;gx++){
            const x=gx*21+(random(gx,gz,1)-.5)*12,z=gz*21+(random(gx,gz,2)-.5)*12;
            const width=kind==='cliff'?7+random(gx,gz,3)*6:2+random(gx,gz,3)*3;
            const height=kind==='cliff'?8+random(gx,gz,4)*8:1.8+random(gx,gz,4)*2;
            const depth=kind==='cliff'?4+random(gx,gz,5)*3:width*(.65+random(gx,gz,5)*.3);
            const radius=Math.hypot(width,depth)*.5,ground=q.heightAt(x,z);
            if(!Number.isFinite(ground)||q.ironAt(x,z)<.98||Math.hypot(x+257.5,z+190)<18+radius||q.upAt(x,z)<.55)continue;
            let min=ground,max=ground,valid=true,nearRoad=false;
            // Check the complete enclosing footprint plus road clearance, not just the centre.
            const extent=radius+IRON_ROCK_LIMITS.roadMargin;
            for(let dz=-extent;dz<=extent;dz+=2)for(let dx=-extent;dx<=extent;dx+=2){
                if(Math.hypot(dx,dz)>extent)continue;
                const px=x+dx,pz=z+dz,y=q.heightAt(px,pz);
                if(!Number.isFinite(y)||q.ironAt(px,pz)<.95||q.roadAt(px,pz)>.015||q.submergedAt(px,pz,y))valid=false;
                if(Math.hypot(dx,dz)<=radius){min=Math.min(min,y);max=Math.max(max,y);}
            }
            if(!valid||max-min>height*.55)continue;
            for(let i=0;i<8;i++){const a=i*Math.PI/4;if(q.roadAt(x+Math.cos(a)*(extent+14),z+Math.sin(a)*(extent+14))>.1)nearRoad=true;}
            const ridge=ground-(q.heightAt(x-12,z)+q.heightAt(x+12,z)+q.heightAt(x,z-12)+q.heightAt(x,z+12))*.25;
            candidates.push({x,z,y:min-height*.22,width,height,depth,yaw:random(gx,gz,6)*Math.PI*2,kind,radius,
                score:kind==='cliff'?ridge+ground*.035+(1-q.upAt(x,z))*4:random(gx,gz,7)+(nearRoad?2:0)});
        }
        candidates.sort((a,b)=>b.score-a.score||a.x-b.x||a.z-b.z);
        let count=0;
        for(const candidate of candidates){
            if(result.some(site=>Math.hypot(site.x-candidate.x,site.z-candidate.z)<Math.hypot(site.width,site.depth)*.5+candidate.radius+5))continue;
            const {score:_,radius:__,...site}=candidate;result.push(site);
            if(++count>=IRON_ROCK_LIMITS[kind==='cliff'?'cliffs':'boulders'])break;
        }
    }
    return result;
}
