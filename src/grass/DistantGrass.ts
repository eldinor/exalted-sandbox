import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { ImportedGrassPrototype } from './ImportedGrass.ts';

export const DISTANT_GRASS_SUFFIX = '_FAR';
/** Twelve tapered, bent blades; opaque silhouettes, without rectangular alpha cards. */
export function distantGrassPrototype(source:ImportedGrassPrototype):ImportedGrassPrototype {
    const name=source.name+DISTANT_GRASS_SUFFIX;
    if(source.triangles<=36)return {...source,name};
    const p=source.geometry.positions;
    if(!p?.length)throw new Error('Distant grass requires source bounds.');
    let rx=0,rz=0;
    for(let i=0;i<p.length;i+=3){rx=Math.max(rx,Math.abs(p[i]));rz=Math.max(rz,Math.abs(p[i+2]));}
    const positions:number[]=[],indices:number[]=[];
    for(let blade=0;blade<12;blade++){
        const angle=blade*2.399963+(source.name.includes('small_b')?.6:0);
        const radius=Math.sqrt(blade/11)*.65;
        const x=Math.cos(angle)*rx*radius,z=Math.sin(angle)*rz*radius;
        const height=blade===0?1:.55+.4*((blade*7%11)/10);
        const width=Math.max(.012,Math.min(rx,rz)*.14);
        const tx=Math.cos(angle+.8),tz=Math.sin(angle+.8);
        const leanX=Math.sin(angle)*rx*.2,leanZ=Math.cos(angle)*rz*.2;
        const v=positions.length/3;
        positions.push(x-tx*width,0,z-tz*width,x+tx*width,0,z+tz*width,
            x+leanX*.4-tx*width*.6,height*.55,z+leanZ*.4-tz*width*.6,
            x+leanX*.4+tx*width*.6,height*.55,z+leanZ*.4+tz*width*.6,
            x+leanX,height,z+leanZ);
        indices.push(v,v+2,v+1,v+1,v+2,v+3,v+2,v+4,v+3);
    }
    const normals=new Float32Array(positions.length);VertexData.ComputeNormals(positions,indices,normals);
    const geometry=new VertexData();geometry.positions=new Float32Array(positions);geometry.indices=indices;geometry.normals=normals;
    return {name,geometry,triangles:indices.length/3,authoredHeight:source.authoredHeight};
}
