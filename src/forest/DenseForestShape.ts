/** Traced from the user-corrected 1280x960 forest concept, 2026-10-12.
 * Terrain rectangle: pixels (47,35)..(1232,924), world 936x702 m.
 * Points describe the western canopy edge in Babylon (z,x); east is -X.
 */
export const DENSE_FOREST_EDGE: readonly (readonly [number,number])[] = [
    [-160,-362],[-67,-362],[-10,-362],[15,-378],[45,-413],
    [65,-409],[95,-398],[130,-385],[165,-370],[225,-363],
];
/** Root inset compensates for crowns overhanging the traced canopy edge. */
export function denseForestBoundaryAt(z:number):number {
    let edge=DENSE_FOREST_EDGE[0][1];
    for(let i=1;i<DENSE_FOREST_EDGE.length;i++){
        const [z0,x0]=DENSE_FOREST_EDGE[i-1],[z1,x1]=DENSE_FOREST_EDGE[i];
        if(z>=z1){edge=x1;continue;}
        const t=Math.max(0,Math.min(1,(z-z0)/(z1-z0))),smooth=t*t*(3-2*t);
        edge=x0+(x1-x0)*smooth;break;
    }
    return edge-4;
}
