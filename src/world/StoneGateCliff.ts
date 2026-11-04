import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';

/** A local rock facing over the stretched northern Snow Mountain cliff cells. */
export const STONE_GATE_CLIFF = {zMin:-302,zMax:-238,columns:24,levels:24,xMin:-8,xMax:65} as const;
export function buildStoneGateCliff(heightAt:(x:number,z:number)=>number):VertexData {
    const {zMin,zMax,columns,levels,xMin,xMax}=STONE_GATE_CLIFF;
    const positions=new Float32Array((columns+1)*(levels+1)*3);
    const uvs=new Float32Array((columns+1)*(levels+1)*2),indices:number[]=[];
    for(let column=0;column<=columns;column++){
        const z=zMin+(zMax-zMin)*column/columns,base=heightAt(xMin,z)-2,top=heightAt(xMax,z);
        if(!Number.isFinite(base)||!Number.isFinite(top)||top<=base)throw new Error('Stone Gate cliff requires valid rising terrain.');
        const edge=Math.min(1,column/2,(columns-column)/2);
        for(let level=0;level<=levels;level++){
            const t=level/levels,y=base+(top-base)*t;
            // Follow the actual slope contour at each height; project the rock face
            // outward, burying its outer seam in the existing terrain.
            let lo:number=xMin,hi:number=xMax;
            for(let i=0;i<18;i++){const x=(lo+hi)*.5;if(heightAt(x,z)<y)lo=x;else hi=x;}
            const taper=Math.min(1,(1-t)*6);
            const crag=4.8+Math.sin(column*1.8+level*.7)*1.1+Math.cos(level*1.4-column*.6)*.7;
            const x=(lo+hi)*.5-crag*edge*taper+.45;
            const vertex=column*(levels+1)+level;
            positions.set([x,y,z],vertex*3);uvs.set([-z/8,y/8],vertex*2);
            if(column<columns&&level<levels){const a=vertex,b=a+levels+1,c=a+1,d=b+1;
                indices.push(a,c,b,b,c,d);}
        }
    }
    const normals=new Float32Array(positions.length);VertexData.ComputeNormals(positions,indices,normals);
    const geometry=new VertexData();geometry.positions=positions;geometry.indices=indices;geometry.normals=normals;geometry.uvs=uvs;
    return geometry;
}
