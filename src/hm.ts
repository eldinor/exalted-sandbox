/** Isolated Babylon WebGPU heightmap-terrain comparison. */

import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import '@babylonjs/core/Meshes/Builders/groundBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
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
    const terrain = MeshBuilder.CreateGroundFromHeightMap('heightmap-terrain', `${base}assets/textures/vis_ground_heightmap-roads.png`, {
        width: WIDTH,
        height: DEPTH,
        subdivisions: SUBDIVISIONS,
        minHeight: MIN_HEIGHT,
        maxHeight: MAX_HEIGHT,
        updatable: false,
        onReady: () => {
            status.textContent = `Ready · ${terrain.getTotalVertices().toLocaleString()} vertices · ${(terrain.getTotalIndices() / 3).toLocaleString()} triangles`;
        },
    }, scene);

    const material = new PBRMaterial('heightmap-material', scene);
    material.metallic = 0;
    material.roughness = 0.94;
    material.albedoColor = new Color3(0.38, 0.42, 0.32);
    const biomeTexture = new Texture(`${base}assets/textures/vertex_color_4k-roads.png`, scene, true, false);
    biomeTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
    biomeTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
    // Heightmap rows and authored biome-map rows use opposite V directions.
    // Flip vertically while preserving left/right world orientation.
    biomeTexture.vScale = -1;
    biomeTexture.vOffset = 1;
    material.albedoTexture = biomeTexture;
    terrain.material = material;

    required('wireframe', HTMLInputElement).addEventListener('change', event => {
        material.wireframe = (event.currentTarget as HTMLInputElement).checked;
    });
    required('biome-map', HTMLInputElement).addEventListener('change', event => {
        material.albedoTexture = (event.currentTarget as HTMLInputElement).checked ? biomeTexture : null;
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
