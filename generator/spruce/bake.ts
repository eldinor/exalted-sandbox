import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3, Vector4, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { ShaderStore } from '@babylonjs/core/Engines/shaderStore';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import vertex from '../../src/shaders/desertProp.vertex.wgsl?raw';
import fragment from './bake.fragment.wgsl?raw';
import { spruceImpostorViews } from '../../src/forest/ImpostorViews.ts';
import { whenReady } from '../../src/core/gpuUtil.ts';

declare global { interface Window { spruceBake?: { colour: string; normal: string; metadata: unknown }; bakeError?: string; } }
async function bake(): Promise<void> {
    const canvas = document.getElementById('view');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing bake canvas.');
    const engine = new WebGPUEngine(canvas, { antialias: false }); await engine.initAsync();
    const scene = new Scene(engine); scene.clearColor = new Color4(0,0,0,0);
    const camera = new FreeCamera('bake-camera', new Vector3(0,2,10), scene); camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    scene.activeCamera = camera;
    ShaderStore.ShadersStoreWGSL.spruceBakeVertexShader = vertex;
    ShaderStore.ShadersStoreWGSL.spruceBakePixelShader = fragment;
    const container = await LoadAssetContainerAsync('/terrain/forest/blue-spruce/blue-spruce-cutout.glb', scene);
    container.addAllToScene();
    const meshes = container.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);
    const min = new Vector3(Infinity,Infinity,Infinity), max = new Vector3(-Infinity,-Infinity,-Infinity);
    const materials: ShaderMaterial[] = [];
    for (const mesh of meshes) {
        const source = mesh.material;
        if (!(source instanceof PBRMaterial) || !source.albedoTexture) throw new Error('Spruce must supply textured PBR materials.');
        mesh.computeWorldMatrix(true); const bounds = mesh.getBoundingInfo().boundingBox;
        min.minimizeInPlace(bounds.minimumWorld); max.maximizeInPlace(bounds.maximumWorld);
        const mat = new ShaderMaterial(`bake:${source.name}`, scene, 'spruceBake', {
            shaderLanguage: ShaderLanguage.WGSL, attributes: ['position','normal','uv'],
            uniforms: ['world','viewProjection','uvMatrix','emissiveMatrix','baseColor','alphaCutoff','gammaDecode','normalBake','cameraPos'], samplers: ['baseTex'],
        });
        mat.backFaceCulling = source.backFaceCulling; mat.setTexture('baseTex', source.albedoTexture);
        mat.setMatrix('uvMatrix', source.albedoTexture.getTextureMatrix()); mat.setMatrix('emissiveMatrix', Matrix.Identity());
        mat.setVector4('baseColor', new Vector4(source.albedoColor.r, source.albedoColor.g, source.albedoColor.b, source.alpha));
        mat.setFloat('alphaCutoff', source.needAlphaTesting() ? source.alphaCutOff : 0);
        mat.setFloat('gammaDecode', source.albedoTexture.gammaSpace && !source.albedoTexture._texture?._useSRGBBuffer ? 1 : 0);
        mat.setFloat('normalBake', 0); mat.setVector3('cameraPos', camera.position);
        mesh.material = mat; materials.push(mat);
    }
    const center = min.add(max).scale(.5), planeSize = Vector3.Distance(min, max) * 1.04;
    camera.orthoLeft = camera.orthoBottom = -planeSize / 2; camera.orthoRight = camera.orthoTop = planeSize / 2;
    const tile = 512, columns = 8, rows = 3, views = spruceImpostorViews();
    const output = [document.createElement('canvas'), document.createElement('canvas')];
    for (const image of output) { image.width = columns * tile; image.height = rows * tile; }
    const target = new RenderTargetTexture('spruce-bake', tile, scene, false);
    target.activeCamera = camera; target.renderList = meshes; target.renderParticles = false; target.clearColor = new Color4(0,0,0,0);
    try {
        for (let i = 0; i < views.length; i++) {
            const view = views[i]; camera.position.copyFromFloats(...view.direction).scaleInPlace(10).addInPlace(center);
            camera.upVector.copyFromFloats(...view.up); camera.setTarget(center);
            for (let pass = 0; pass < 2; pass++) {
                for (let part = 0; part < meshes.length; part++) {
                    materials[part].setFloat('normalBake', pass); materials[part].setVector3('cameraPos', camera.position);
                    await whenReady(materials[part], materials[part].name, [meshes[part], false]);
                }
                engine.beginFrame(); target.render(false); engine.endFrame();
                const pixels = await target.readPixels();
                if (!(pixels instanceof Uint8Array)) throw new Error('Bake requires RGBA8 readback.');
                const context = output[pass].getContext('2d'); if (!context) throw new Error('Missing atlas context.');
                const image = context.createImageData(tile, tile);
                for (let y = 0; y < tile; y++) image.data.set(pixels.subarray((tile - 1 - y) * tile * 4, (tile - y) * tile * 4), y * tile * 4);
                context.putImageData(image, i % columns * tile, Math.floor(i / columns) * tile);
            }
            const status = document.getElementById('status'); if (status) status.textContent = `Baked ${i + 1}/${views.length} ground/aerial views`;
        }
        window.spruceBake = { colour: output[0].toDataURL('image/png'), normal: output[1].toDataURL('image/png'),
            metadata: { version: 1, tileSize: tile, columns, rows, planeSize, sourceHeight: max.y-min.y, center: center.asArray(), views,
                alphaCutoff: .35, source: 'blue-spruce-cutout.glb', bake: 'Unlit sRGB albedo plus linear object-space normals; 8 ground, 8 elevated, 1 overhead views.' } };
    } finally { target.dispose(); container.dispose(); for (const mat of materials) mat.dispose(); scene.dispose(); engine.dispose(); }
}
void bake().catch(error => { window.bakeError = error instanceof Error ? error.message : String(error); console.error(error); });
