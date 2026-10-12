import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3, Color3, Color4 } from '@babylonjs/core/Maths/math';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { registerShaders } from '../../src/shaders/registry.ts';
import { Sky } from '../../src/render/sky.ts';
import { ShadowSystem } from '../../src/render/shadows.ts';
import { DepthPass } from '../../src/render/depthPass.ts';
import { PostChain } from '../../src/post/postChain.ts';
import { ForestMaterials } from '../../src/forest/ForestMaterials.ts';
import { SpruceImpostor, parseSpruceAtlas } from '../../src/forest/SpruceImpostor.ts';
import { S } from '../../src/core/settings.ts';
import { whenReady } from '../../src/core/gpuUtil.ts';

interface CutoutPart { mesh: Mesh; materials: ShaderMaterial[]; }
declare global { interface Window { spruceComparison?: { scene: Scene; camera: ArcRotateCamera; depth: DepthPass;
    parts: CutoutPart[]; impostor: SpruceImpostor; showDepth(): Promise<void> }; } }
function input(id: string): HTMLInputElement { const value = document.getElementById(id); if (!(value instanceof HTMLInputElement)) throw new Error(`Missing ${id}`); return value; }
function text(id: string, value: string): void { const element = document.getElementById(id); if (element) element.textContent = value; }
function half(value: number): number { const sign = value & 0x8000 ? -1 : 1, exponent = (value >> 10) & 31, fraction = value & 1023;
    return exponent === 0 ? sign * 2 ** -14 * fraction / 1024 : exponent === 31 ? Infinity : sign * 2 ** (exponent - 15) * (1 + fraction / 1024); }

async function boot(): Promise<void> {
    const canvas = document.getElementById('view'); if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas.');
    const engine = new WebGPUEngine(canvas, { antialias: false }); await engine.initAsync(); registerShaders();
    S.showMountains = false;
    const scene = new Scene(engine); scene.clearColor = new Color4(.03,.05,.07,1); scene.setRenderingAutoClearDepthStencil(1,false);
    const camera = new ArcRotateCamera('spruce-camera', Math.PI / 2, 1.35, 12, new Vector3(0,1.7,0),scene);
    camera.minZ = .1; camera.maxZ = 1000; camera.attachControl(canvas,true); scene.activeCamera = camera;
    const sky = new Sky(scene); await sky.solve();
    const shadows = new ShadowSystem(scene); const depth = new DepthPass(scene);
    const shading = new ForestMaterials(scene,sky,shadows);
    const post = new PostChain(scene,camera,depth,sky);
    const response = await fetch(`${import.meta.env.BASE_URL}terrain/forest/blue-spruce/impostor.json`);
    if (!response.ok) throw new Error('Missing spruce atlas; run its bake script.');
    const metadata: unknown = await response.json(); const atlas = parseSpruceAtlas(metadata);
    const container = await LoadAssetContainerAsync(`${import.meta.env.BASE_URL}terrain/forest/blue-spruce/blue-spruce-cutout.glb`,scene);
    const parts: CutoutPart[] = [];
    for (const source of container.meshes) {
        if (!(source instanceof Mesh) || !source.getTotalVertices()) continue;
        if (!(source.material instanceof PBRMaterial)) throw new Error('Spruce requires PBR metadata.');
        const geometry = VertexData.ExtractFromMesh(source,true,true); geometry.transform(source.computeWorldMatrix(true));
        const mesh = new Mesh(`spruce-cutout:${source.material.name}`,scene); geometry.applyToMesh(mesh);
        mesh.position.x = 3; mesh.sideOrientation = source.sideOrientation; mesh.renderingGroupId = 1;
        const beauty = shading.create(source.material), prepass = shading.create(source.material,'PROP_PREPASS');
        mesh.material = beauty; depth.registerCaster(mesh,prepass);
        const caster = [shading.create(source.material,'PROP_SHADOW'),shading.create(source.material,'PROP_SHADOW')];
        shadows.registerCaster(mesh,cascade => caster[cascade],2);
        parts.push({mesh,materials:[beauty,prepass,...caster]});
    }
    const floorSource = new PBRMaterial('spruce-floor-source',scene); floorSource.albedoColor = new Color3(.11,.14,.09); floorSource.roughness = 1;
    const floor = CreateGround('spruce-floor',{width:600,height:600},scene); floor.position.y = -.04; floor.renderingGroupId = 1;
    floor.material = shading.create(floorSource); depth.registerCaster(floor,shading.create(floorSource,'PROP_PREPASS'));
    const impostor = new SpruceImpostor(scene,atlas,shading,depth); impostor.origin.x = -3; impostor.update(camera.position);
    const rig = {camera}; shadows.update(camera,sky.sunDir); sky.render(rig,0); shading.update(camera.position);
    for (const part of parts) for (const material of part.materials) await whenReady(material,material.name,[part.mesh,false]);
    await whenReady(impostor.colour,'spruce colour atlas'); await whenReady(impostor.normal,'spruce normal atlas');
    await whenReady(impostor.material,impostor.material.name,[impostor.mesh,false]);
    await whenReady(impostor.prepass,impostor.prepass.name,[impostor.mesh,false]);
    await depth.warmUp(); await whenReady(sky.material,sky.material.name,[sky.mesh,false]);
    post.update(0,0,12); for (const material of post.passes) await whenReady(material,material.name);
    for (let i=0;i<3;i++) {engine.beginFrame();scene.render();engine.endFrame();post.endFrame();await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}
    const reset = () => post.resetHistory();
    const setView = (beta:number) => { camera.beta = beta; reset(); };
    document.getElementById('ground')?.addEventListener('click',()=>setView(1.35));
    document.getElementById('aerial')?.addEventListener('click',()=>setView(.65));
    document.getElementById('overhead')?.addEventListener('click',()=>setView(.025));
    input('cutoff').addEventListener('input',()=> {
        const cutoff = Number(input('cutoff').value); text('cutoffValue',cutoff.toFixed(2));
        for (const part of parts) if (part.mesh.name.includes('Needles')) for (const material of part.materials) material.setFloat('alphaCutoff',cutoff);
        reset();
    });
    input('height').addEventListener('input',()=> {
        const height = Number(input('height').value), scale = height / atlas.sourceHeight;
        for (const part of parts) { part.mesh.scaling.setAll(scale); part.mesh.position.x = 3 * scale; }
        impostor.scale = scale; impostor.origin.x = -3 * scale; camera.target.y = atlas.center[1] * scale; camera.radius = 12 * scale;
        text('heightValue',`${height} m`); reset();
    });
    input('full').addEventListener('change',()=> {for (const part of parts) part.mesh.setEnabled(input('full').checked);reset();});
    input('impostor').addEventListener('change',()=> {impostor.mesh.setEnabled(input('impostor').checked);reset();});
    let depthVisible = false;
    async function showDepth(): Promise<void> {
        const image = document.getElementById('depth'); if (!(image instanceof HTMLImageElement)) return;
        if (depthVisible) { image.style.display='none'; depthVisible=false; return; }
        const values = await depth.rtt.readPixels();
        if (!(values instanceof Uint16Array) && !(values instanceof Float32Array)) throw new Error('Unsupported camera-depth readback.');
        const size=depth.rtt.getSize(), output=document.createElement('canvas');output.width=size.width;output.height=size.height;
        const context=output.getContext('2d');if(!context)throw new Error('Depth canvas unavailable.');
        const pixels=context.createImageData(size.width,size.height);
        for(let y=0;y<size.height;y++)for(let x=0;x<size.width;x++){
            const index=((size.height-1-y)*size.width+x)*4, destination=(y*size.width+x)*4;
            const distance=values instanceof Uint16Array?half(values[index]):Number(values[index]);
            const shade=distance>1000?0:Math.round(255/(1+distance*.06));
            pixels.data.set([shade,shade,shade,255],destination);
        }
        context.putImageData(pixels,0,0);image.src=output.toDataURL();image.style.display='block';depthVisible=true;
    }
    document.getElementById('depthButton')?.addEventListener('click',()=>void showDepth().catch(console.error));
    window.spruceComparison={scene,camera,depth,parts,impostor,showDepth};
    text('status','Ready · 11,364 triangles vs 2 · atlas baked at 0.35');
    let previous=performance.now(),time=0,pendingResize=false;
    window.addEventListener('resize',()=>{pendingResize=true;});
    engine.runRenderLoop(()=> {
        if(pendingResize){pendingResize=false;engine.resize();reset();}
        const now=performance.now(),dt=Math.min(.1,(now-previous)/1000);previous=now;time+=dt;
        post.update(dt,0,camera.radius);sky.update();sky.render(rig,time);shadows.update(camera,sky.sunDir);
        impostor.update(camera.position);shading.update(camera.position);scene.render();post.endFrame();
    });
    scene.onDisposeObservable.addOnce(()=> {
        for(const part of parts){depth.unregisterCaster(part.mesh);shadows.unregisterCaster(part.mesh);part.mesh.dispose();}
        depth.unregisterCaster(floor);floor.dispose();impostor.dispose();shading.dispose();container.dispose();floorSource.dispose();
        post.dispose();depth.dispose();shadows.dispose();sky.dispose();
    });
}
void boot().catch(error=>{text('status',`Startup failed: ${error instanceof Error?error.message:String(error)}`);console.error(error);});
