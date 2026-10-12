import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3, Quaternion, Matrix } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { ExaltedWorld } from '../../src/terrain/exaltedWorld.ts';
import { decodeAuthoredPng, sampleBiomeRgb, ROADS_BIOME_MAP, HEIGHTMAP_WIDTH, HEIGHTMAP_DEPTH } from '../../src/terrain/authoredHeightmap.ts';
import { FrameBenchmark } from '../../src/core/frameBenchmark.ts';
import { installDrawCounter, endFrameDraws, setBenchmarkDrawRecording, stats } from '../../src/core/perf.ts';
import { loadPinePack, defaultTreeMix, selectTreeVariant } from './PinePack.ts';
import { TreeMixPanel } from './TreeMixPanel.ts';
import { pineGroundHeight } from './PineGrounding.ts';
import { createPinePlaceholder } from './PinePlaceholder.ts';
import { isForestColor } from './ForestBiome.ts';
import { configureForestShadows, updateForestShadows } from './ForestShadows.ts';

function element<T extends HTMLElement>(id: string, type: new (...args: never[]) => T): T {
    const value = document.getElementById(id);
    if (!(value instanceof type)) throw new Error(`Missing #${id}.`);
    return value;
}
function random(x: number, z: number, salt: number): number {
    let hash = Math.imul(x ^ salt, 374761393) ^ Math.imul(z, 668265263);
    hash = Math.imul(hash ^ hash >>> 13, 1274126177);
    return ((hash ^ hash >>> 16) >>> 0) / 4294967296;
}

async function boot(): Promise<void> {
    if (!navigator.gpu) throw new Error('Forestland requires WebGPU.');
    const canvas = element('view', HTMLCanvasElement), status = element('status', HTMLElement);
    const engine = new WebGPUEngine(canvas, { antialias: true, powerPreference: 'high-performance' });
    await engine.initAsync();
    const scene = new Scene(engine);
    scene.skipPointerMovePicking = scene.skipPointerDownPicking = scene.skipPointerUpPicking = true;
    scene.clearColor = new Color4(.36, .48, .54, 1);
    scene.fogMode = Scene.FOGMODE_EXP2; scene.fogDensity = .0035; scene.fogColor = new Color3(.36, .48, .54);
    const ambient = new HemisphericLight('forest-sky', new Vector3(0, 1, 0), scene);
    ambient.intensity = .7; ambient.groundColor = new Color3(.08, .12, .07);
    const sun = new DirectionalLight('forest-sun', new Vector3(.082, -.342, .936), scene);
    sun.intensity = 2;
    const shadow = new ShadowGenerator(1024, sun);
    shadow.usePercentageCloserFiltering = true; shadow.bias = .002; shadow.normalBias = .025;
    configureForestShadows(sun, shadow);

    const ground = new Mesh('forestland-ground', scene);
    const world = new ExaltedWorld(scene, 'heightmap');
    await world.loadInto(ground);
    const surface = world.surface;
    if (!surface) throw new Error('Forestland terrain surface is missing.');
    const response = await fetch(`${import.meta.env.BASE_URL}${ROADS_BIOME_MAP}`);
    if (!response.ok) throw new Error('Cannot load forest biome map.');
    const biome = decodeAuthoredPng(new Uint8Array(await response.arrayBuffer()));
    const rgb = new Float32Array(3);
    const isForest = (x: number, z: number): boolean => {
        if (x < surface.minX || x > surface.maxX || z < surface.minZ || z > surface.maxZ) return false;
        sampleBiomeRgb(biome, x, z, rgb);
        return isForestColor(rgb);
    };
    const positions = world.data.positions, uvs = new Float32Array(positions.length / 3 * 2);
    for (let i = 0, uv = 0; i < positions.length; i += 3, uv += 2) {
        uvs[uv] = .5 - positions[i] / HEIGHTMAP_WIDTH; uvs[uv + 1] = .5 + positions[i + 2] / HEIGHTMAP_DEPTH;
    }
    ground.setVerticesData(VertexBuffer.UVKind, uvs); ground.useVertexColors = false;
    const groundMaterial = new StandardMaterial('forestland-biome-ground', scene);
    const biomeTexture = new Texture(`${import.meta.env.BASE_URL}${ROADS_BIOME_MAP}`, scene, false, false);
    biomeTexture.gammaSpace = false; biomeTexture.wrapU = biomeTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
    groundMaterial.diffuseTexture = biomeTexture; groundMaterial.specularColor.set(.03, .03, .03);
    ground.material = groundMaterial; ground.receiveShadows = true;

    status.textContent = 'Loading the pine pack…';
    const { container, prototypes, referenceHeight } = await loadPinePack(scene);
    const placeholders = prototypes.map(prototype => createPinePlaceholder(scene, prototype));
    const triangles = (variant: number, near: boolean): number => (near ? prototypes[variant].near : prototypes[variant].far)
        .reduce((total, part) => total + (part.geometry.indices?.length ?? 0) / 3, 0);

    const centre = new Vector3(-383.5, surface.sample(-383.5, 52), 52);
    const groundCamera = new UniversalCamera('forest-ground-camera', centre.add(new Vector3(0, 1.72, -10)), scene);
    groundCamera.setTarget(centre.add(new Vector3(0, 1.6, 20)));
    groundCamera.speed = .8; groundCamera.angularSensibility = 2600;
    groundCamera.keysUp.push(87); groundCamera.keysDown.push(83); groundCamera.keysLeft.push(65); groundCamera.keysRight.push(68);
    const overview = new ArcRotateCamera('forest-overview-camera', -Math.PI / 2, .8, 110, centre.clone(), scene);
    overview.lowerRadiusLimit = 25; overview.upperRadiusLimit = 350;
    scene.activeCamera = groundCamera; groundCamera.attachControl(canvas, true);
    const settings = { enabled: true, spacing: 12, height: 12, nearDistance: 40, distance: 140,
        placeholders: true, placeholderDistance: 350, shadows: true, treeMix: defaultTreeMix() };
    interface Batch { near: Mesh[]; far: Mesh[]; card: Mesh; x: number; y: number; z: number; count: number; variant: number; }
    const batches: Batch[] = [];
    const normal = new Vector3(), scale = new Vector3(), translation = new Vector3(), rotation = new Quaternion(), matrix = new Matrix();
    const heightAt = (x: number, z: number): number => surface.sample(x, z);
    let placed = 0, visible = 0, visiblePlaceholders = 0;
    const rebuild = (): void => {
        for (const batch of batches) for (const mesh of [...batch.near, ...batch.far, batch.card]) { shadow.removeShadowCaster(mesh); mesh.dispose(); }
        batches.length = 0; placed = 0;
        const groups = new Map<string, { x: number; z: number; variant: number; heightSum: number; matrices: number[] }>();
        for (let gz = Math.floor(surface.minZ / settings.spacing); gz <= Math.ceil(surface.maxZ / settings.spacing); gz++) {
            for (let gx = Math.floor(surface.minX / settings.spacing); gx <= Math.ceil(surface.maxX / settings.spacing); gx++) {
                const x = (gx + .5 + (random(gx, gz, 1) - .5) * .6) * settings.spacing;
                const z = (gz + .5 + (random(gx, gz, 2) - .5) * .6) * settings.spacing;
                if (!isForest(x, z) || !isForest(x - 2, z) || !isForest(x + 2, z) || !isForest(x, z - 2) || !isForest(x, z + 2)) continue;
                surface.sample(x, z, normal);
                if (Math.hypot(normal.x, normal.z) / Math.max(.0001, normal.y) > .7) continue;
                const variant = selectTreeVariant(settings.treeMix, random(gx, gz, 3));
                if (variant < 0) continue;
                const cx = Math.floor(x / 32), cz = Math.floor(z / 32), key = `${cx}:${cz}:${variant}`;
                let group = groups.get(key);
                if (!group) { group = { x: (cx + .5) * 32, z: (cz + .5) * 32, variant, heightSum: 0, matrices: [] }; groups.set(key, group); }
                const size = settings.height / referenceHeight * (.85 + random(gx, gz, 4) * .3);
                const yaw = random(gx, gz, 5) * Math.PI * 2;
                const groundedY = pineGroundHeight(prototypes[variant].rootSupport, x, z, size, yaw, heightAt);
                group.heightSum += groundedY + prototypes[variant].height * size * .5;
                scale.setAll(size); translation.set(x, groundedY, z); Quaternion.FromEulerAnglesToRef(0, yaw, 0, rotation);
                Matrix.ComposeToRef(scale, rotation, translation, matrix);
                for (let i = 0; i < 16; i++) group.matrices.push(matrix.m[i]);
                placed++;
            }
        }
        for (const [key, group] of groups) {
            const matrices = new Float32Array(group.matrices);
            const make = (near: boolean): Mesh[] => (near ? prototypes[group.variant].near : prototypes[group.variant].far).map((part, i) => {
                const mesh = new Mesh(`forestland:${key}:LOD${near ? 1 : 2}:${i}`, scene);
                part.geometry.applyToMesh(mesh); mesh.material = part.material; mesh.sideOrientation = part.sideOrientation;
                mesh.isPickable = false; mesh.receiveShadows = true;
                mesh.thinInstanceSetBuffer('matrix', matrices, 16, false);
                mesh.thinInstanceRefreshBoundingInfo(); mesh.freezeWorldMatrix(); mesh.setEnabled(false);
                return mesh;
            });
            const placeholder = placeholders[group.variant], card = new Mesh(`forestland:${key}:placeholder`, scene);
            placeholder.geometry.applyToMesh(card); card.material = placeholder.material; card.isPickable = false;
            card.thinInstanceSetBuffer('matrix', matrices, 16, false); card.thinInstanceRefreshBoundingInfo(); card.freezeWorldMatrix(); card.setEnabled(false);
            const count = matrices.length / 16;
            batches.push({ near: make(true), far: make(false), card, x: group.x, y: group.heightSum / count, z: group.z, count, variant: group.variant });
        }
        element('placed', HTMLElement).textContent = placed.toLocaleString();
        const total = (near: boolean) => settings.treeMix.reduce((sum, entry, i) => sum + entry.percentage / 100 * triangles(i, near), 0);
        element('prototype', HTMLElement).textContent = `${total(true).toFixed(0)} / ${total(false).toFixed(0)}`;
    };
    rebuild();

    const mixPanel = new TreeMixPanel(settings.treeMix, mix => { settings.treeMix = mix; rebuild(); });
    const controls = ['enabled', 'spacing', 'height', 'near', 'distance', 'placeholders', 'placeholder-distance', 'shadows', 'terrain'];
    for (const id of controls) element(id, HTMLInputElement).addEventListener('change', () => {
        settings.enabled = element('enabled', HTMLInputElement).checked;
        settings.spacing = Number(element('spacing', HTMLInputElement).value);
        settings.height = Number(element('height', HTMLInputElement).value);
        settings.nearDistance = Number(element('near', HTMLInputElement).value);
        settings.distance = Number(element('distance', HTMLInputElement).value);
        settings.placeholders = element('placeholders', HTMLInputElement).checked;
        settings.placeholderDistance = Number(element('placeholder-distance', HTMLInputElement).value);
        settings.shadows = element('shadows', HTMLInputElement).checked;
        ground.setEnabled(element('terrain', HTMLInputElement).checked);
        if (id === 'spacing' || id === 'height') rebuild();
    });
    for (const [id, suffix] of [['spacing', ' m'], ['height', ' m'], ['near', ' m'], ['distance', ' m'], ['placeholder-distance', ' m']]) {
        element(id, HTMLInputElement).addEventListener('input', () => { element(`${id}-value`, HTMLOutputElement).value = element(id, HTMLInputElement).value + suffix; });
    }
    element('camera-mode', HTMLButtonElement).addEventListener('click', () => {
        const groundMode = scene.activeCamera !== groundCamera;
        scene.activeCamera?.detachControl(); scene.activeCamera = groundMode ? groundCamera : overview; scene.activeCamera.attachControl(canvas, true);
        element('camera-mode', HTMLButtonElement).textContent = groundMode ? 'Camera: Ground' : 'Camera: Overview';
    });
    element('reset-camera', HTMLButtonElement).addEventListener('click', () => {
        groundCamera.position.copyFrom(centre).addInPlace(new Vector3(0, 1.72, -10)); groundCamera.setTarget(centre.add(new Vector3(0, 1.6, 20)));
        overview.setTarget(centre); overview.alpha = -Math.PI / 2; overview.beta = .8; overview.radius = 110;
    });
    const keys = new Set<string>();
    window.addEventListener('keydown', event => { if (!(event.target instanceof HTMLInputElement)) keys.add(event.code); });
    window.addEventListener('keyup', event => keys.delete(event.code)); window.addEventListener('blur', () => keys.clear());
    const start = element('benchmark-start', HTMLButtonElement), stop = element('benchmark-stop', HTMLButtonElement), copy = element('benchmark-copy', HTMLButtonElement);
    const results = element('benchmark-results', HTMLTextAreaElement), benchmarkStatus = element('benchmark-status', HTMLElement);
    let recording: FrameBenchmark | null = null, recordingStart = 0, startState: unknown, note = '', previousRecorded: number | null = null;
    const snapshot = () => ({ settings: { ...settings, treeMix: settings.treeMix.map(entry => ({ ...entry })) }, cameraMode: scene.activeCamera === groundCamera ? 'ground' : 'overview', camera: scene.activeCamera?.position.asArray(),
        renderWidth: engine.getRenderWidth(), renderHeight: engine.getRenderHeight(), placed, visible, visiblePlaceholders, models: 'terrain/forest/pine-pack-forestland.glb' });
    const finish = (reason: string): void => {
        if (!recording) return;
        const collected = recording.result(false); recording = null; setBenchmarkDrawRecording(false);
        const metrics = { frames: collected.frames, averageFps: collected.averageFps, frameMs: collected.frameMs,
            framesOver33ms: collected.framesOver33ms, framesOver50ms: collected.framesOver50ms, framesOver100ms: collected.framesOver100ms,
            cpuTotalMs: collected.metrics.cpuTotalMs, cpuSubmitMs: collected.metrics.cpuSubmitMs,
            drawCalls: collected.metrics.drawCalls, submittedIndices: collected.metrics.submittedIndices };
        results.value = JSON.stringify({ format: 'exalted-forestland-benchmark-v1', reason, description: note, durationSeconds: (performance.now() - recordingStart) / 1000,
            start: startState, end: snapshot(), metrics, timingNotes: 'Uncapped browser intervals; CPU submission is not GPU execution. First partial interval is excluded.' }, null, 2);
        element('benchmark-details', HTMLDetailsElement).hidden = false;
        start.disabled = false; stop.disabled = true; copy.disabled = false;
        for (const id of controls) element(id, HTMLInputElement).disabled = false;
        mixPanel.setDisabled(false);
        benchmarkStatus.textContent = `${metrics.averageFps.toFixed(1)} FPS · p95 ${metrics.frameMs.p95.toFixed(1)} ms · worst ${metrics.frameMs.max.toFixed(1)} ms.`;
    };
    start.addEventListener('click', () => {
        recording = new FrameBenchmark(); recordingStart = performance.now(); previousRecorded = null; startState = snapshot(); note = element('benchmark-note', HTMLInputElement).value;
        start.disabled = copy.disabled = true; stop.disabled = false; element('benchmark-details', HTMLDetailsElement).hidden = true;
        for (const id of controls) element(id, HTMLInputElement).disabled = true;
        mixPanel.setDisabled(true);
        setBenchmarkDrawRecording(true); benchmarkStatus.textContent = 'Recording for 30 seconds…';
    });
    stop.addEventListener('click', () => finish('manual-stop'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) finish('tab-hidden'); });
    copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(results.value); benchmarkStatus.textContent = 'Results copied.'; }
        catch { element('benchmark-details', HTMLDetailsElement).open = true; results.focus(); results.select(); benchmarkStatus.textContent = 'Copy the selected results (Ctrl+C).'; }
    });
    installDrawCounter(engine);
    let previous = performance.now(), nextUi = 0;
    engine.runRenderLoop(() => {
        const now = performance.now(), frameMs = now - previous; previous = now;
        groundCamera.speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.5 : .8;
        if (scene.activeCamera === groundCamera) {
            world.clampToPlayArea(groundCamera.position);
            groundCamera.position.y = surface.sample(groundCamera.position.x, groundCamera.position.z) + 1.72;
        }
        const camera = scene.activeCamera?.position ?? groundCamera.position;
        visible = visiblePlaceholders = 0;
        const shadowList = shadow.getShadowMap()?.renderList;
        if (shadowList) shadowList.length = 0;
        for (const batch of batches) {
            const distance = Math.hypot(batch.x - camera.x, batch.y - camera.y, batch.z - camera.z);
            const enabled = settings.enabled && distance <= settings.distance;
            const cardEnabled = settings.enabled && settings.placeholders && !enabled && distance <= Math.max(settings.distance, settings.placeholderDistance) + 23;
            const near = distance <= settings.nearDistance;
            for (const mesh of batch.near) mesh.setEnabled(enabled && near);
            for (const mesh of batch.far) mesh.setEnabled(enabled && !near);
            batch.card.setEnabled(cardEnabled);
            if (enabled || cardEnabled) visible += batch.count;
            if (cardEnabled) visiblePlaceholders += batch.count;
            if (enabled && settings.shadows && distance < 60 && shadowList) for (const mesh of near ? batch.near : batch.far) shadowList.push(mesh);
        }
        updateForestShadows(sun, camera, surface.sample(camera.x, camera.z), settings.shadows, shadowList?.length ?? 0);
        const beforeRender = performance.now(); scene.render(); const cpuMs = performance.now() - beforeRender;
        endFrameDraws();
        if (recording) {
            recording.values.frameMs = frameMs; recording.values.cpuTotalMs = performance.now() - now;
            recording.values.cpuSubmitMs = cpuMs; recording.values.drawCalls = stats.drawCalls; recording.values.submittedIndices = stats.submittedIndices;
            if (previousRecorded !== null && !recording.record()) finish('sample-limit');
            previousRecorded = now;
            if (now - recordingStart >= 30000) finish('duration-complete');
        }
        if (now >= nextUi) {
            nextUi = now + 250;
            element('visible', HTMLElement).textContent = visible.toLocaleString(); element('draws', HTMLElement).textContent = String(stats.drawCalls);
            element('placeholder-count', HTMLElement).textContent = visiblePlaceholders.toLocaleString();
            element('indices', HTMLElement).textContent = stats.submittedIndices ? stats.submittedIndices.toLocaleString() : 'Record to measure';
            element('fps', HTMLElement).textContent = engine.getFps().toFixed(1);
            if (recording) benchmarkStatus.textContent = `Recording: ${Math.max(0, 30 - (now - recordingStart) / 1000).toFixed(1)} s remaining.`;
        }
    });
    window.addEventListener('resize', () => engine.resize());
    scene.onDisposeObservable.add(() => { setBenchmarkDrawRecording(false); for (const placeholder of placeholders) { placeholder.material.dispose(); placeholder.texture.dispose(); } container.dispose(); world.dispose(); });
    status.textContent = 'Ready — The Thornwood, 12 pine variants with LOD1/LOD2.';
}

boot().catch((error: unknown) => {
    console.error(error);
    element('status', HTMLElement).textContent = `Startup failed: ${error instanceof Error ? error.message : String(error)}`;
});
