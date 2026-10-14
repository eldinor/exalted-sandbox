/** Authored-world ridge/road accents using the attributed plain boulder; no lab imports. */
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { Scene } from '@babylonjs/core/scene';
import type { Terrain } from '../terrain/terrain.ts';
import type { Sky } from '../render/sky.ts';
import type { ShadowSystem } from '../render/shadows.ts';
import type { DepthPass } from '../render/depthPass.ts';
import type { MapPropSnapshot } from '../ui/mapPropSnapshot.ts';
import { ForestMaterials } from '../forest/ForestMaterials.ts';
import { ExaltedWorld } from '../terrain/exaltedWorld.ts';
import { decodeAuthoredPng } from '../terrain/authoredHeightmap.ts';
import { IRON_MOUNTAINS_MASK } from '../terrain/IronMountains.ts';
import { ROAD_DISPLAY_MAP } from '../terrain/roadBlending.ts';
import { buildStoneGateCliff } from './StoneGateCliff.ts';
import { placeStoneGateWall } from './StoneGateWall.ts';
import { maskWeightAt, placeIronRocks } from './IronRockPlacement.ts';
import { PropCollisions, type PropCollider } from './propCollisions.ts';
import { S } from '../core/settings.ts';
import { whenReady } from '../core/gpuUtil.ts';

interface RockBatch {mesh:Mesh;geometry:VertexData;all:Float32Array;beauty:ShaderMaterial;prepass:ShaderMaterial;}
export class IronRocks {
    readonly stats={placed:0,cliffs:0,boulders:0,triangles:0,batches:0,colliders:0,wallRocks:0,cliffFacingTriangles:0};
    private container:AssetContainer|null=null;
    private readonly batches:RockBatch[]=[];
    private readonly colliders:PropCollider[]=[];
    private readonly shading:ForestMaterials;
    private readonly collisions:PropCollisions;
    private disposed=false;
    private enabled=true;
    private readonly probes:Mesh[]=[];
    constructor(private readonly scene:Scene,private readonly terrain:Terrain,sky:Sky,
        shadows:ShadowSystem,private readonly depth:DepthPass){
        this.shading=new ForestMaterials(scene,sky,shadows,false,true);
        this.collisions=terrain.obstacles??new PropCollisions();terrain.obstacles=this.collisions;
        scene.onDisposeObservable.addOnce(()=>this.dispose());
    }
    get materials():ShaderMaterial[]{return this.shading.entries.filter(entry=>!entry.pass).map(entry=>entry.mat);}
    async load():Promise<void>{
        const world=this.terrain.heightfield;
        if(!(world instanceof ExaltedWorld)||world.source!=='heightmap'||!world.surface)throw new Error('Iron rocks require authored heightmap triangles.');
        try{
            const read=async(path:string)=>{const r=await fetch(`${import.meta.env.BASE_URL}${path}`);if(!r.ok)throw new Error(`Cannot load ${path}`);return decodeAuthoredPng(new Uint8Array(await r.arrayBuffer()));};
            const [iron,road]=await Promise.all([read(IRON_MOUNTAINS_MASK),read(ROAD_DISPLAY_MAP)]);
            const normal=new Vector3(),surface=world.surface;
            const sites=placeIronRocks({ironAt:(x,z)=>maskWeightAt(iron,x,z),roadAt:(x,z)=>maskWeightAt(road,x,z),
                heightAt:(x,z)=>surface.sample(x,z),upAt:(x,z)=>{surface.sample(x,z,normal);return normal.y;},
                submergedAt:(x,z,y)=>(this.terrain.water?.sample(x,z)?.level??-Infinity)>y});
            this.container=await LoadAssetContainerAsync(`${import.meta.env.BASE_URL}terrain/forest/coniferous-selected/boulder-plain.glb`,this.scene);
            const parts=this.container.meshes.filter((mesh):mesh is Mesh=>mesh instanceof Mesh&&mesh.getTotalVertices()>0);
            if(parts.length!==1||!(parts[0].material instanceof PBRMaterial))throw new Error('Plain boulder requires one PBR geometry part.');
            const source=parts[0],material=source.material as PBRMaterial;
            const geometry=VertexData.ExtractFromMesh(source,true,true);geometry.transform(source.computeWorldMatrix(true));
            const positions=geometry.positions,indices=geometry.indices;if(!positions||!indices)throw new Error('Missing boulder geometry.');
            const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
            for(let i=0;i<positions.length;i++) {const axis=i%3;min[axis]=Math.min(min[axis],positions[i]);max[axis]=Math.max(max[axis],positions[i]);}
            if(max.some((value,axis)=>value-min[axis]<=0))throw new Error('Degenerate boulder bounds.');
            for(let i=0;i<positions.length;i++){const axis=i%3;positions[i]=(positions[i]-(axis===1?min[axis]:(min[axis]+max[axis])*.5))/(max[axis]-min[axis]);}
            // Baking a nonuniform normalization requires rebuilding geometry normals.
            const normals=new Float32Array(positions.length);VertexData.ComputeNormals(positions,indices,normals);geometry.normals=normals;
            material.albedoColor.multiplyInPlace(new Color3(.42,.46,.48));material.roughness=.98;
            const beauty=this.shading.create(material),prepass=this.shading.create(material,'PROP_PREPASS');
            const rockTextures=this.terrain.rockTextures;
            if(!rockTextures)throw new Error('Stone Gate wall requires shared stone textures.');
            const wall=placeStoneGateWall((x,z)=>surface.sample(x,z));
            const variants=new Map<number,{beauty:ShaderMaterial;prepass:ShaderMaterial}>([[0,{beauty,prepass}]]);
            for(const layer of [1,2,3])variants.set(layer,{
                beauty:this.shading.create(material,undefined,false,false,{textures:rockTextures,layer}),
                prepass:this.shading.create(material,'PROP_PREPASS',false,false,{textures:rockTextures,layer})});
            const grouped=new Map<string,{list:typeof sites;layer:number}>();
            for(const site of [...sites.map(site=>({...site,layer:0})),...wall]){
                const layer=site.layer;
                const key=layer ? `wall:${layer}` : `${Math.floor(site.x/64)},${Math.floor(site.z/64)}`;
                const group=grouped.get(key)??{list:[],layer};group.list.push(site);grouped.set(key,group);
                const collider:PropCollider={x:site.x,z:site.z,radius:Math.max(site.width,site.depth)*.46,minY:site.y,maxY:site.y+site.height,name:`iron-${site.kind}`,kind:'rock'};
                this.collisions.add(collider);this.colliders.push(collider);
            }
            const matrix=new Matrix();
            for(const [key,{list,layer}] of grouped){
                const variant=variants.get(layer);if(!variant)throw new Error('Missing rock material variant.');
                const {beauty,prepass}=variant;
                const all=new Float32Array(list.length*16);
                for(let i=0;i<list.length;i++){const s=list[i];Matrix.ComposeToRef(new Vector3(s.width,s.height,s.depth),Quaternion.RotationYawPitchRoll(s.yaw,0,0),new Vector3(s.x,s.y,s.z),matrix);matrix.copyToArray(all,i*16);}
                const mesh=new Mesh(`iron-rocks:${key}`,this.scene);geometry.applyToMesh(mesh);mesh.sideOrientation=source.sideOrientation;
                mesh.material=beauty;mesh.isPickable=false;mesh.thinInstanceSetBuffer('matrix',all,16,true);mesh.thinInstanceRefreshBoundingInfo();mesh.freezeWorldMatrix();
                this.batches.push({mesh,geometry,all,beauty,prepass});this.depth.registerCaster(mesh,prepass);
            }
            // The Snow Mountain facing is visual geometry; terrain remains the
            // grounding/collision authority. Its footprint stays well off the road.
            const facing=buildStoneGateCliff((x,z)=>surface.sample(x,z));
            const faceBeauty=this.shading.create(material,undefined,false,false,{textures:rockTextures,layer:4});
            const faceDepth=this.shading.create(material,'PROP_PREPASS',false,false,{textures:rockTextures,layer:4});
            const faceMesh=new Mesh('stone-gate:rock-cliff-facing',this.scene);facing.applyToMesh(faceMesh);
            faceMesh.material=faceBeauty;faceMesh.isPickable=false;
            const identity=new Float32Array(Matrix.Identity().asArray());
            faceMesh.thinInstanceSetBuffer('matrix',identity,16,true);faceMesh.thinInstanceRefreshBoundingInfo();faceMesh.freezeWorldMatrix();
            this.batches.push({mesh:faceMesh,geometry:facing,all:identity,beauty:faceBeauty,prepass:faceDepth});this.depth.registerCaster(faceMesh,faceDepth);
            const facingTriangles=(facing.indices?.length??0)/3;
            Object.assign(this.stats,{cliffFacingTriangles:facingTriangles,placed:sites.length+wall.length,wallRocks:wall.length,cliffs:sites.filter(s=>s.kind==='cliff').length,boulders:sites.filter(s=>s.kind==='boulder').length+wall.length,
                triangles:(sites.length+wall.length)*(geometry.indices?.length??0)/3+facingTriangles,batches:this.batches.length,colliders:this.colliders.length});
        }catch(error){this.dispose();throw error;}
    }
    update(camera:Vector3):void{
        if(this.disposed)return;this.shading.update(camera);
        if(this.enabled!==S.ironMountainsRocks){this.enabled=S.ironMountainsRocks;for(const {mesh} of this.batches)mesh.setEnabled(this.enabled);}
    }
    async warmUp():Promise<void>{
        for(const entry of this.shading.entries)for(const texture of entry.mat.getActiveTextures())await whenReady(texture,'Iron rock texture');
        const camera=this.scene.activeCamera;if(!camera)return;
        const warmed=new Set<ShaderMaterial>();
        for(const batch of this.batches){
            if(warmed.has(batch.beauty))continue;warmed.add(batch.beauty);
            await whenReady(batch.beauty,'Iron rock pipeline',[batch.mesh,true]);
            await whenReady(batch.prepass,'Iron rock depth pipeline',[batch.mesh,true]);
            // Submit every instanced colour/depth variant behind the loading screen.
            const probe=new Mesh('iron-rocks:warm-up',this.scene);this.probes.push(probe);
            batch.geometry.applyToMesh(probe);probe.sideOrientation=batch.mesh.sideOrientation;
            probe.material=batch.beauty;const matrix=Matrix.Scaling(.15,.15,.15);
            matrix.setTranslation(camera.position.add(camera.getForwardRay().direction.scale(3)));
            probe.thinInstanceSetBuffer('matrix',new Float32Array(matrix.asArray()),16,true);probe.thinInstanceRefreshBoundingInfo();
            this.depth.registerCaster(probe,batch.prepass);
        }
    }
    finishWarmUp():void{for(const probe of this.probes){this.depth.unregisterCaster(probe);probe.dispose();}this.probes.length=0;}
    addMapSnapshot(snapshot:MapPropSnapshot):void{for(const b of this.batches)snapshot.add(b.mesh.name,b.geometry,b.beauty,b.all,b.mesh.sideOrientation);}
    dispose():void{if(this.disposed)return;this.disposed=true;this.finishWarmUp();for(const {mesh} of this.batches){this.depth.unregisterCaster(mesh);mesh.dispose();}
        this.batches.length=0;for(const collider of this.colliders)this.collisions.remove(collider);this.colliders.length=0;this.shading.dispose();this.container?.dispose();this.container=null;}
}
