import type { SpruceAtlas } from './SpruceImpostor.ts';
import { selectImpostorView } from './ImpostorViews.ts';
export interface ImpostorSite { x: number; y: number; z: number; height: number; yaw: number; }
export interface CardBuffers { positions: Float32Array; normals: Float32Array; uvs: Float32Array; yaw: Float32Array; }
/** Write a scaled, rotated tree into one camera-facing card without temporary arrays/vectors. */
export function writeImpostorCard(atlas: SpruceAtlas, buffers: CardBuffers, slot: number, site: ImpostorSite,
    camera: { x: number; y: number; z: number }): number {
    const scale = site.height / atlas.sourceHeight, c = Math.cos(site.yaw), s = Math.sin(site.yaw);
    const cx = site.x + (c*atlas.center[0]+s*atlas.center[2])*scale;
    const cy = site.y + atlas.center[1]*scale, cz = site.z + (-s*atlas.center[0]+c*atlas.center[2])*scale;
    let dx=camera.x-cx,dy=camera.y-cy,dz=camera.z-cz;
    const length=Math.hypot(dx,dy,dz); if(length<1e-8){dx=0;dy=0;dz=1;}else{dx/=length;dy/=length;dz/=length;}
    const frameIndex=selectImpostorView(atlas.views,c*dx-s*dz,dy,s*dx+c*dz),frame=atlas.views[frameIndex];
    let rx=c*frame.right[0]+s*frame.right[2],ry=frame.right[1],rz=-s*frame.right[0]+c*frame.right[2];
    const dot=rx*dx+ry*dy+rz*dz;rx-=dx*dot;ry-=dy*dot;rz-=dz*dot;
    const rLength=Math.hypot(rx,ry,rz);rx/=rLength;ry/=rLength;rz/=rLength;
    const ux=ry*dz-rz*dy,uy=rz*dx-rx*dz,uz=rx*dy-ry*dx;
    const radius=atlas.planeSize*scale/2,column=frameIndex%atlas.columns,row=Math.floor(frameIndex/atlas.columns),inset=.5/atlas.tileSize;
    for(let i=0;i<4;i++){
        const vertex=slot*4+i,offset=vertex*3,x=i===0||i===3?-radius:radius,y=i<2?-radius:radius;
        buffers.positions[offset]=cx+rx*x+ux*y;buffers.positions[offset+1]=cy+ry*x+uy*y;buffers.positions[offset+2]=cz+rz*x+uz*y;
        buffers.normals[offset]=dx;buffers.normals[offset+1]=dy;buffers.normals[offset+2]=dz;
        buffers.uvs[vertex*2]=(column+(i===0||i===3?inset:1-inset))/atlas.columns;
        buffers.uvs[vertex*2+1]=(row+(i<2?1-inset:inset))/atlas.rows;
        buffers.yaw[vertex*2]=c;buffers.yaw[vertex*2+1]=s;
    }
    return frameIndex;
}
