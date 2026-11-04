import { Camera } from '@babylonjs/core/Cameras/camera';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { Terrain } from '../terrain/terrain.ts';
import { ExaltedWorld } from '../terrain/exaltedWorld.ts';
import type { WorldWater } from '../world/worldWater.ts';
import { mapScreenshotFraming } from './mapScreenshotFraming.ts';
import { MapPropSnapshot } from './mapPropSnapshot.ts';
import type { WorldForest } from '../world/worldForest.ts';
import type { IronRocks } from '../world/ironRocks.ts';
import type { DesertProps } from '../world/desertProps.ts';

const MAP_LAYER = 0x10000000;
const WIDTH = 2048, HEIGHT = 1536;

/** Render authored terrain offscreen without moving the rig or touching temporal passes. */
export async function captureWholeMap(scene: Scene, terrain: Terrain, water: WorldWater | null,
    props?: {forest:WorldForest|null;desertProps:DesertProps|null;ironRocks?:IronRocks|null}): Promise<string> {
    const width=props?4096:WIDTH,height=props?3072:HEIGHT;
    const world = terrain.heightfield;
    if (!(world instanceof ExaltedWorld) || !world.surface) throw new Error('Whole-map screenshots require the authored world.');
    const surface = world.surface;
    const frame = mapScreenshotFraming(surface.minX, surface.maxX, surface.minZ, surface.maxZ, width, height);
    const camera = new UniversalCamera('map-screenshot-camera', new Vector3(frame.x, world.maxHeight + 600, frame.z), scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.upVector.set(0, 0, -1); // Image north is decreasing Babylon Z; east is decreasing X.
    camera.setTarget(new Vector3(frame.x, world.minHeight, frame.z));
    camera.orthoLeft = -frame.halfWidth; camera.orthoRight = frame.halfWidth;
    camera.orthoTop = frame.halfHeight; camera.orthoBottom = -frame.halfHeight;
    camera.minZ = 1; camera.maxZ = world.maxHeight - world.minHeight + 1000;
    camera.layerMask = MAP_LAYER;
    const mesh = new Mesh('map-screenshot-terrain', scene);
    // Use complete authoritative indices: gameplay's coarse mesh has a hole for local detail.
    world.data.applyToMesh(mesh);
    mesh.sideOrientation = terrain.mesh.sideOrientation;
    mesh.layerMask = MAP_LAYER; mesh.isPickable = false;
    const material = terrain.material.clone('map-screenshot-ground');
    material.options.defines.push('MAP_SCREENSHOT');
    material.setVector3('cameraPos', camera.position);
    material.setFloat('debugMode', 0);
    mesh.material = material;
    const waterMaterial = new StandardMaterial('map-screenshot-water', scene);
    waterMaterial.disableLighting = true;
    waterMaterial.diffuseColor = Color3.Black();
    waterMaterial.emissiveColor = new Color3(.12, .4, .6);
    waterMaterial.backFaceCulling = false;
    const waterMeshes: Mesh[] = [];
    for (const source of water?.meshes ?? []) {
        // New meshes must not inherit the water's camera-depth material overrides.
        const copy = new Mesh(`map-screenshot-${source.name}`, scene);
        const geometry = VertexData.ExtractFromMesh(source, true, true);
        geometry.transform(source.computeWorldMatrix(true));
        geometry.applyToMesh(copy);
        copy.layerMask = MAP_LAYER; copy.renderingGroupId = 0;
        copy.useVertexColors = false; copy.hasVertexAlpha = false;
        copy.material = waterMaterial; copy.isPickable = false;
        waterMeshes.push(copy);
    }
    const snapshot=new MapPropSnapshot(scene,MAP_LAYER,camera.position);
    const target = new RenderTargetTexture('map-screenshot', { width, height }, scene, false);
    target.activeCamera = camera;
    target.renderParticles = false; target.renderSprites = false;
    target.clearColor = new Color4(.055, .085, .1, 1);
    try {
        props?.forest?.addMapSnapshot(snapshot);props?.desertProps?.addMapSnapshot(snapshot);props?.ironRocks?.addMapSnapshot(snapshot);
        target.renderList = [mesh, ...waterMeshes, ...snapshot.meshes];
        await material.forceCompilationAsync(mesh);
        if (waterMeshes.length) await waterMaterial.forceCompilationAsync(waterMeshes[0]);
        await snapshot.compile();
        // Run after the normal render, when the frame's ordered passes have finished.
        await new Promise<void>((resolve, reject) => {
            const observer = scene.onAfterRenderObservable.addOnce(() => {
                clearTimeout(timeout);
                try { target.render(false); resolve(); } catch (error) { reject(error); }
            });
            const timeout = setTimeout(() => {
                scene.onAfterRenderObservable.remove(observer);
                reject(new Error('Whole-map capture timed out waiting for a rendered frame.'));
            }, 15000);
        });
        const pixels = await target.readPixels();
        if (!(pixels instanceof Uint8Array) || pixels.length !== width * height * 4) throw new Error('Invalid map screenshot pixels.');
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Cannot encode the map screenshot.');
        const data = context.createImageData(width, height);
        // WebGPU render-target readback is bottom-up; export north-up PNG rows.
        const stride = width * 4;
        for (let y = 0; y < height; y++) data.data.set(pixels.subarray((height - 1 - y) * stride, (height - y) * stride), y * stride);
        context.putImageData(data, 0, 0);
        return canvas.toDataURL('image/png');
    } finally {
        snapshot.dispose();
        target.dispose(); mesh.dispose(); material.dispose();
        for (const copy of waterMeshes) copy.dispose();
        waterMaterial.dispose(); camera.dispose();
    }
}
