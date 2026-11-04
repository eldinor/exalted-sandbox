import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { stoneGateLeftWeight } from './SnowMountains.ts';
import { biomeMapMaterialWeights } from './surfaceTypes.ts';

/** Correct cliff-cell diagonals while retaining every authored vertex and cell edge. */
export function correctStoneGateTriangles(data:VertexData):number {
    const p=data.positions,indices=data.indices;
    if(!p||!indices)throw new Error('Stone Gate triangulation requires positions and indices.');
    const face=(a:number,b:number,c:number):[number,number,number]=>{
        const ux=p[b*3]-p[a*3],uy=p[b*3+1]-p[a*3+1],uz=p[b*3+2]-p[a*3+2];
        const vx=p[c*3]-p[a*3],vy=p[c*3+1]-p[a*3+1],vz=p[c*3+2]-p[a*3+2];
        const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz);
        return [nx/len,ny/len,nz/len];
    };
    const alignment=(a:number[],b:number[])=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    let corrected=0;
    const rgb=new Float32Array(3),weights=new Float32Array(3);
    for(let i=0;i<indices.length;i+=6){
        // The authored grid's two clockwise triangles: d,b,a and c,d,a.
        const d=indices[i],b=indices[i+1],a=indices[i+2],c=indices[i+3];
        if(indices[i+4]!==d||indices[i+5]!==a)throw new Error('Stone Gate correction requires the authored grid topology.');
        const x=(p[a*3]+p[d*3])*.5,z=(p[a*3+2]+p[d*3+2])*.5;
        if(stoneGateLeftWeight(x,z)<.5)continue;
        const heights=[p[a*3+1],p[b*3+1],p[c*3+1],p[d*3+1]];
        if(Math.max(...heights)-Math.min(...heights)<8)continue;
        let road=false;
        if(data.colors)for(const vertex of [a,b,c,d]){
            for(let channel=0;channel<3;channel++)rgb[channel]=data.colors[vertex*4+channel];
            biomeMapMaterialWeights(rgb,weights);if(weights[2]>.1)road=true;
        }
        if(road)continue;
        const before=alignment(face(d,b,a),face(c,d,a));
        const after=alignment(face(c,b,a),face(c,d,b));
        // Require a meaningful reduction of the diagonal crease; keep ties stable.
        if(after<=before+.03)continue;
        indices[i]=c;indices[i+1]=b;indices[i+2]=a;
        indices[i+3]=c;indices[i+4]=d;indices[i+5]=b;corrected++;
    }
    if(corrected){const normals=new Float32Array(p.length);VertexData.ComputeNormals(p,indices,normals);data.normals=normals;}
    return corrected;
}
