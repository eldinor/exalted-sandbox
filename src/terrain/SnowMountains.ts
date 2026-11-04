/** Visual-only coverage; authored snow/deformation channels remain unchanged. */
import { PALECROWN_SPAWN, STONE_GATE_SPAWN } from '../world/spawnPoints.ts';
import { AUTHORED_WORLD_SCALE } from '../world/worldScale.ts';
export const PALECROWN_SNOW = {x:-PALECROWN_SPAWN.x*AUTHORED_WORLD_SCALE,z:-PALECROWN_SPAWN.y*AUTHORED_WORLD_SCALE,inner:70,outer:105} as const;
export const STONE_GATE_TEXTURE_AREA = {x:-STONE_GATE_SPAWN.x*AUTHORED_WORLD_SCALE,z:-STONE_GATE_SPAWN.y*AUTHORED_WORLD_SCALE,inner:60,outer:90} as const;
export function stoneGateAreaWeight(x:number,z:number):number {
    return 1-smooth(STONE_GATE_TEXTURE_AREA.inner,STONE_GATE_TEXTURE_AREA.outer,Math.hypot(x-STONE_GATE_TEXTURE_AREA.x,z-STONE_GATE_TEXTURE_AREA.z));
}
export function palecrownRockAllowance(x:number,z:number):number {
    return smooth(PALECROWN_SNOW.inner,PALECROWN_SNOW.outer,Math.hypot(x-PALECROWN_SNOW.x,z-PALECROWN_SNOW.z));
}
const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
/** Left snow face and rocky approach when looking toward the mountain from Stone Gate. */
export function stoneGateLeftWeight(x:number,z:number):number {
    return smooth(-25,0,x)*(1-smooth(310,340,x))*smooth(-285,-265,z)*(1-smooth(-95,-70,z));
}
export function snowMountainRegionWeight(snow:number,road:number,height:number):number {
    return Math.max(0,Math.min(1,snow))*(1-Math.max(0,Math.min(1,road)))*smooth(65,100,height);
}
export function snowCliffExposure(up:number,windVariation:number):number {
    return 1-smooth(.25,.60,Math.max(0,Math.min(1,up))+windVariation*.035);
}
export function snowRockHeightBlend(exposure:number,rockHeight:number):number {
    // Raised rock protrudes; snow persists in crevices, with safe pure-material endpoints.
    const a=exposure*(.35+Math.max(0,Math.min(1,rockHeight)));
    const b=(1-exposure)*(1.45-Math.max(0,Math.min(1,rockHeight))*.35);
    return a/Math.max(a+b,1e-6);
}
export const snowMountainsWGSL=`
fn stoneGateAreaWeight(p:vec2f)->f32 {
    return 1.0-smoothstep(60.0,90.0,distance(p,vec2f(${STONE_GATE_TEXTURE_AREA.x},${STONE_GATE_TEXTURE_AREA.z})));
}
fn stoneGateLeftWeight(p:vec2f)->f32 {
    return smoothstep(-25.0,0.0,p.x)*(1.0-smoothstep(310.0,340.0,p.x))
        *smoothstep(-285.0,-265.0,p.y)*(1.0-smoothstep(-95.0,-70.0,p.y));
}
fn palecrownRockAllowance(p:vec2f)->f32 {
    return smoothstep(70.0,105.0,distance(p,vec2f(${PALECROWN_SNOW.x},${PALECROWN_SNOW.z})));
}
fn snowMountainRegionWeight(snow:f32,road:f32,height:f32)->f32 {
    return clamp(snow,0.0,1.0)*(1.0-clamp(road,0.0,1.0))*smoothstep(65.0,100.0,height);
}
fn snowCliffExposure(up:f32,windVariation:f32)->f32 {
    return 1.0-smoothstep(.25,.60,clamp(up,0.0,1.0)+windVariation*.035);
}
fn snowRockHeightBlend(exposure:f32,rockHeight:f32)->f32 {
    let h=clamp(rockHeight,0.0,1.0);
    let a=exposure*(.35+h);let b=(1.0-exposure)*(1.45-h*.35);
    return a/max(a+b,.000001);
}`;
