/** Isolated Babylon WebGPU heightmap-terrain comparison. */

import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
// Install the WebGPU methods used by the canvas-composited preview texture.
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { GroundMesh } from '@babylonjs/core/Meshes/groundMesh';
import '@babylonjs/core/Meshes/Builders/groundBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3, Color4, Vector3 } from '@babylonjs/core/Maths/math';

const WIDTH = 936;
const DEPTH = 702;
const SUBDIVISIONS = 400;
const MIN_HEIGHT = -7.820367813110352 * 0.5;
const MAX_HEIGHT = 498.8232116699219 * 0.5;

function required<T extends HTMLElement>(id: string, type: { new(): T }): T {
    const value = document.getElementById(id);
    if (!(value instanceof type)) throw new Error(`Missing #${id}`);
    return value;
}

async function boot(): Promise<void> {
    const canvas = required('view', HTMLCanvasElement);
    const status = required('status', HTMLElement);
    if (!navigator.gpu) throw new Error('WebGPU is not available in this browser.');

    const engine = new WebGPUEngine(canvas, { antialias: true, powerPreference: 'high-performance' });
    await engine.initAsync();
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.055, 0.09, 0.12, 1);

    const target = new Vector3(0, 55, 0);
    const camera = new ArcRotateCamera('camera', -Math.PI * 0.64, 1.08, 690, target, scene);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 1500;
    camera.wheelPrecision = 1.1;
    camera.panningSensibility = 35;
    camera.attachControl(canvas, true);

    const resetCamera = (): void => {
        camera.alpha = -Math.PI * 0.64;
        camera.beta = 1.08;
        camera.radius = 690;
        camera.target.copyFrom(target);
    };

    const hemi = new HemisphericLight('sky-fill', new Vector3(0.15, 1, 0.1), scene);
    hemi.intensity = 0.7;
    hemi.diffuse = new Color3(0.58, 0.68, 0.8);
    hemi.groundColor = new Color3(0.1, 0.12, 0.13);
    const sun = new DirectionalLight('sun', new Vector3(-0.45, -0.78, 0.34), scene);
    sun.intensity = 3.1;
    sun.diffuse = new Color3(1, 0.84, 0.61);

    const base = import.meta.env.BASE_URL;
    const material = new PBRMaterial('heightmap-material', scene);
    material.metallic = 0;
    material.roughness = 0.94;
    material.albedoColor = new Color3(0.38, 0.42, 0.32);
    const loadHeightmap = (url: string): Promise<GroundMesh> => new Promise((resolve, reject) => {
        const mesh = MeshBuilder.CreateGroundFromHeightMap('heightmap-terrain', url, {
            width: WIDTH, height: DEPTH, subdivisions: SUBDIVISIONS,
            minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT, updatable: false,
            onReady: ready => { ready.material = material; resolve(ready); },
            onError: message => { mesh.dispose(); reject(new Error(message || 'Could not load heightmap.')); },
        }, scene);
    });
    const loadMapImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not load map image.'));
        image.src = url;
    });
    const heightUrl = `${base}assets/textures/vis_ground_heightmap-11.png`;
    const [initialTerrain, initialHeightImage] = await Promise.all([loadHeightmap(heightUrl), loadMapImage(heightUrl)]);
    let terrain = initialTerrain, heightImage = initialHeightImage;
    let biomeImage = await loadMapImage(`${base}assets/textures/vertex_color_4k-9.png`);
    const mapTexture = new DynamicTexture('heightmap-preview-layers', { width: 4096, height: 4096 }, scene, false, Texture.BILINEAR_SAMPLINGMODE);
    mapTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
    mapTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
    // Match the existing vertex-map orientation, including uploaded height images.
    mapTexture.vScale = -1;
    mapTexture.vOffset = 1;
    material.albedoTexture = mapTexture;
    const heightOpacity = required('heightmap-opacity', HTMLInputElement);
    const biomeOpacity = required('biome-opacity', HTMLInputElement);
    const context = mapTexture.getContext();
    const redrawMaps = (): void => {
        context.globalAlpha = 1;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 4096, 4096);
        context.globalAlpha = biomeOpacity.valueAsNumber / 100;
        context.drawImage(biomeImage, 0, 0, 4096, 4096);
        context.globalAlpha = heightOpacity.valueAsNumber / 100;
        context.drawImage(heightImage, 0, 0, 4096, 4096);
        context.globalAlpha = 1;
        mapTexture.update(false);
    };
    redrawMaps();
    let redrawPending = false;
    for (const [slider, outputId] of [[heightOpacity, 'heightmap-opacity-value'], [biomeOpacity, 'biome-opacity-value']] as const) {
        const output = required(outputId, HTMLOutputElement);
        slider.disabled = false;
        slider.addEventListener('input', () => {
            output.value = `${slider.value}%`;
            if (redrawPending) return;
            redrawPending = true;
            requestAnimationFrame(() => { redrawPending = false; redrawMaps(); });
        });
    }
    status.textContent = 'Ready';

    for (const kind of ['heightmap', 'biome'] as const) {
        const button = required(kind === 'heightmap' ? 'upload-heightmap' : 'upload-biome', HTMLButtonElement);
        const input = required(`${kind}-file`, HTMLInputElement);
        const filename = required(`${kind}-name`, HTMLElement);
        button.disabled = false;
        button.addEventListener('click', () => input.click());
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            button.disabled = true;
            status.textContent = `Loading ${file.name}…`;
            try {
                if (kind === 'heightmap') {
                    // Decode the overlay first so an invalid image cannot replace the mesh.
                    const image = await loadMapImage(url);
                    const replacement = await loadHeightmap(url);
                    terrain.dispose();
                    terrain = replacement;
                    heightImage = image;
                } else {
                    biomeImage = await loadMapImage(url);
                }
                redrawMaps();
                filename.textContent = file.name;
                status.textContent = 'Ready';
            } catch (error) {
                status.textContent = `Upload failed: ${error instanceof Error ? error.message : String(error)}`;
            } finally {
                URL.revokeObjectURL(url);
                input.value = '';
                button.disabled = false;
            }
        });
    }

    required('wireframe', HTMLInputElement).addEventListener('change', event => {
        material.wireframe = (event.currentTarget as HTMLInputElement).checked;
    });
    required('reset', HTMLButtonElement).addEventListener('click', resetCamera);

    window.addEventListener('resize', () => engine.resize());
    engine.runRenderLoop(() => scene.render());
}

boot().catch(error => {
    console.error(error);
    const status = document.getElementById('status');
    if (status) status.textContent = `Startup failed · ${error instanceof Error ? error.message : String(error)}`;
});
