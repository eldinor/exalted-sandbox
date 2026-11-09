import { surfaceTexturePath } from '../core/TextureWebpProfile.ts';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import type { Scene } from '@babylonjs/core/scene';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { DepthPass } from '../render/depthPass.ts';
import type { ForestMaterials } from './ForestMaterials.ts';
import type { SpruceAtlas } from './SpruceImpostor.ts';
import { forestLod } from './ClosedForestPlacement.ts';
import { writeImpostorCard, type CardBuffers, type ImpostorSite } from './ImpostorBatchGeometry.ts';

/** Shared atlas resources/materials across all production forest chunks. */
export class ForestImpostorResources {
    readonly colour: Texture; readonly normal: Texture;
    readonly beauty: ShaderMaterial; readonly prepass: ShaderMaterial;
    private readonly source: PBRMaterial;
    constructor(scene: Scene, readonly atlas: SpruceAtlas, shading: ForestMaterials) {
        this.colour=new Texture(`${import.meta.env.BASE_URL}${surfaceTexturePath('terrain/forest/blue-spruce/impostor-colour.png')}`,scene,true,false,Texture.BILINEAR_SAMPLINGMODE);
        this.normal=new Texture(`${import.meta.env.BASE_URL}${surfaceTexturePath('terrain/forest/blue-spruce/impostor-normal.png')}`,scene,true,false,Texture.BILINEAR_SAMPLINGMODE);
        this.colour.gammaSpace=true;this.colour.hasAlpha=true;this.normal.gammaSpace=false;
        for(const texture of [this.colour,this.normal])texture.wrapU=texture.wrapV=Texture.CLAMP_ADDRESSMODE;
        this.source=new PBRMaterial('border-spruce-impostor-source',scene);
        this.source.albedoTexture=this.colour;this.source.bumpTexture=this.normal;this.source.backFaceCulling=false;this.source.roughness=.8;
        this.source.transparencyMode=PBRMaterial.PBRMATERIAL_ALPHATEST;this.source.alphaCutOff=atlas.alphaCutoff;
        this.beauty=shading.create(this.source,undefined,true,true);this.prepass=shading.create(this.source,'PROP_PREPASS',true,true);
    }
    dispose():void{this.source.dispose();this.colour.dispose();this.normal.dispose();}
}

/** One draw per pass per 32 m chunk; no per-tree meshes or material changes. */
export class ForestImpostorBatch {
    readonly mesh: Mesh;
    readonly buffers: CardBuffers;
    count=0;
    private registered=false;
    private readonly last=new Vector3(Infinity,Infinity,Infinity);
    private wasEnabled=false;
    constructor(scene:Scene,key:string,readonly sites:readonly ImpostorSite[],readonly resources:ForestImpostorResources,
        private readonly depth:DepthPass){
        const count=sites.length;
        this.buffers={positions:new Float32Array(count*12),normals:new Float32Array(count*12),uvs:new Float32Array(count*8),yaw:new Float32Array(count*8)};
        const indices=new Uint32Array(count*6);
        for(let i=0;i<count;i++)indices.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6);
        this.mesh=new Mesh(`forest-impostor:${key}`,scene);
        const geometry=new VertexData();geometry.positions=this.buffers.positions;geometry.normals=this.buffers.normals;
        geometry.uvs=this.buffers.uvs;geometry.indices=indices;geometry.applyToMesh(this.mesh,true);
        this.mesh.setVerticesData('impostorYaw',this.buffers.yaw,true,2);
        this.mesh.material=resources.beauty;this.mesh.isPickable=false;this.mesh.renderingGroupId=1;
        const min=new Vector3(Infinity,Infinity,Infinity),max=new Vector3(-Infinity,-Infinity,-Infinity),point=new Vector3();
        for(const site of sites){
            const scale=site.height/resources.atlas.sourceHeight,radius=resources.atlas.planeSize*scale/Math.SQRT2;
            // Conservative sphere over all yaw/view directions, with fixed chunk bounds.
            const extent=radius+Math.hypot(resources.atlas.center[0],resources.atlas.center[2])*scale;
            const y=site.y+resources.atlas.center[1]*scale;
            point.set(site.x-extent,y-radius,site.z-extent);min.minimizeInPlace(point);
            point.set(site.x+extent,y+radius,site.z+extent);max.maximizeInPlace(point);
        }
        const bounds=new BoundingInfo(min,max);
        this.mesh.setBoundingInfo(bounds);this.mesh.subMeshes[0].setBoundingInfo(bounds);
        this.mesh.freezeWorldMatrix();this.mesh.setEnabled(false);
    }
    update(camera:Vector3,enabled:boolean,force=false):void{
        if(!force&&enabled===this.wasEnabled&&Vector3.DistanceSquared(camera,this.last)<.0625)return;
        this.last.copyFrom(camera);this.wasEnabled=enabled;let count=0;
        if(enabled)for(const site of this.sites){
            if(forestLod(site.x,site.y,site.z,camera)<0)continue;
            writeImpostorCard(this.resources.atlas,this.buffers,count++,site,camera);
        }
        this.count=count;
        this.mesh.subMeshes[0].indexCount=count*6;this.mesh.subMeshes[0].verticesCount=count*4;
        if(count){
            this.mesh.updateVerticesData('position',this.buffers.positions,false);
            this.mesh.updateVerticesData('normal',this.buffers.normals);
            this.mesh.updateVerticesData('uv',this.buffers.uvs);
            this.mesh.updateVerticesData('impostorYaw',this.buffers.yaw);
        }
        this.mesh.setEnabled(count>0);
        if(count&&!this.registered){this.depth.registerCaster(this.mesh,this.resources.prepass);this.registered=true;}
        else if(!count&&this.registered){this.depth.unregisterCaster(this.mesh);this.registered=false;}
    }
    dispose():void{this.depth.unregisterCaster(this.mesh);this.mesh.dispose();this.registered=false;}
}
