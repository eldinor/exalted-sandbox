import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Color3, Color4, Vector2, Vector3 } from '@babylonjs/core/Maths/math';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { Scene } from '@babylonjs/core/scene';
import { GrassSystem } from './GrassSystem.ts';
import { loadImportedGrass } from './ImportedGrass.ts';
import { defaultGrassColors } from './GrassAppearance.ts';
import { GrassBenchmark } from './GrassBenchmark.ts';
import { changeGrassMixShare } from './GrassMix.ts';
import type { GrassImpact, GrassSamplers, GrassSettings } from './grassTypes.ts';

export interface GrassLabWorld {
    centre: Vector2;
    samplers: GrassSamplers;
    readyMessage: string;
    importedOnly?: boolean;
    streaming?: boolean;
    demoImpacts?: boolean;
    setTerrainVisible?(visible: boolean): void;
    clampPosition?(position: Vector3): void;
    dispose?(): void;
}

function element<T extends HTMLElement>(id: string, constructor: new (...args: never[]) => T): T {
    const value = document.getElementById(id);
    if (!(value instanceof constructor)) throw new Error(`Missing #${id}.`);
    return value;
}

async function boot(createWorld: (scene: Scene) => Promise<GrassLabWorld>): Promise<void> {
    if (!navigator.gpu) throw new Error('Grass Lab requires WebGPU.');
    const canvas = element('view', HTMLCanvasElement);
    const status = element('status', HTMLElement);
    const engine = new WebGPUEngine(canvas, { antialias: true, powerPreference: 'high-performance' });
    await engine.initAsync();
    const scene = new Scene(engine);
    // These labs have camera controls but no pointer-selected world objects.
    scene.skipPointerMovePicking = true;
    scene.skipPointerDownPicking = true;
    scene.skipPointerUpPicking = true;
    scene.clearColor = new Color4(0.36, 0.48, 0.54, 1);
    scene.ambientColor = new Color3(0.18, 0.22, 0.18);
    const light = new HemisphericLight('grass-lab-light', new Vector3(-0.4, 1, -0.25), scene);
    light.intensity = 1.15;
    light.groundColor = new Color3(0.08, 0.12, 0.07);

    const world = await createWorld(scene);
    const CENTRE_X = world.centre.x, CENTRE_Z = world.centre.y;
    const heightAt = world.samplers.heightAt;
    const baseHeight = heightAt(CENTRE_X, CENTRE_Z);
    const groundCamera = new UniversalCamera('grass-ground-camera', new Vector3(CENTRE_X, baseHeight + 1.72, CENTRE_Z - 14), scene);
    groundCamera.setTarget(new Vector3(CENTRE_X, baseHeight + 1.6, CENTRE_Z + 10));
    groundCamera.speed = 0.8;
    groundCamera.angularSensibility = 2600;
    groundCamera.keysUp.push(87); groundCamera.keysDown.push(83); groundCamera.keysLeft.push(65); groundCamera.keysRight.push(68);
    groundCamera.attachControl(canvas, true);
    const overviewCamera = new ArcRotateCamera('grass-overview-camera', -Math.PI / 2, 0.76, 105, new Vector3(CENTRE_X, baseHeight, CENTRE_Z), scene);
    overviewCamera.lowerRadiusLimit = 35;
    overviewCamera.upperRadiusLimit = 260;
    overviewCamera.wheelPrecision = 1.5;
    scene.activeCamera = groundCamera;

    const demoImpacts = world.demoImpacts !== false;
    const settings: GrassSettings = {
        enabled: true, density: 6, nearDistance: 22, farDistance: 70,
        distantLodDistance: world.importedOnly ? 120 : 0,
        distantGrassDensity: .25, tightGrassBounds: true,
        windDistance: world.importedOnly ? 60 : 0,
        bladeHeight: 0.85, bladeWidth: 0.045, windStrength: 0.3, windSpeed: 1,
        interaction: true, movingImpacts: demoImpacts, interactionRadius: 2.4, interactionStrength: .55,
        freezeWind: false, visualization: 'final',
        bladeSource: world.importedOnly ? 'imported' : 'procedural', importedVariant: 'grass_medium_01_tall_a_LOD2',
        importedNearLod: 1,
        lodEnabled: false, singleLod: 1,
        ...defaultGrassColors(),
    };
    if (world.importedOnly) {
        const variantOptions = element('imported-variant', HTMLSelectElement).options;
        settings.grassMixEnabled = true;
        settings.grassMix = Array.from(variantOptions, option => ({
            variant: option.value,
            percentage: option.value === 'grass_medium_01_tall_a_LOD2' ? 40 :
                option.value === 'grass_medium_01_small_a_LOD2' ? 35 :
                option.value === 'grass_medium_01_tiny_d_LOD2' ? 25 : 0,
        }));
        const panel = document.createElement('section');
        panel.className = 'grass-mix-panel';
        panel.setAttribute('aria-label', 'Grass model mix');
        const header = document.createElement('div');
        header.className = 'grass-mix-header';
        const enabledLabel = document.createElement('label');
        enabledLabel.className = 'toggle';
        const enabled = document.createElement('input');
        enabled.type = 'checkbox'; enabled.checked = true;
        enabledLabel.append(enabled, document.createTextNode('Mix grass models'));
        const help = document.createElement('p');
        help.className = 'help'; help.textContent = 'Total 100%. Changing one share redistributes the others. Zero excludes a model. Overall density stays the same.';
        header.append(enabledLabel, help); panel.append(header);
        const rows = document.createElement('div'); rows.className = 'grass-mix-rows';
        const controls: { range: HTMLInputElement; number: HTMLInputElement; output: HTMLOutputElement }[] = [];
        for (let index = 0; index < variantOptions.length; index++) {
            const option = variantOptions[index];
            const row = document.createElement('div'); row.className = 'grass-mix-card';
            const label = document.createElement('label'); label.htmlFor = `grass-mix-${index}`;
            const output = document.createElement('output');
            label.append(document.createTextNode(option.text), output);
            const range = document.createElement('input');
            range.id = label.htmlFor; range.type = 'range'; range.min = '0'; range.max = '100'; range.step = '1';
            const number = document.createElement('input');
            number.type = 'number'; number.min = '0'; number.max = '100'; number.step = '1';
            number.setAttribute('aria-label', `${option.text} percentage`);
            const apply = (value: string): void => {
                const share = Number(value);
                if (!Number.isFinite(share) || !settings.grassMix) return;
                settings.grassMix = changeGrassMixShare(settings.grassMix, index, share);
                syncMix();
            };
            range.addEventListener('input', () => apply(range.value));
            number.addEventListener('change', () => apply(number.value));
            row.append(label, range, number); rows.append(row);
            controls.push({ range, number, output });
        }
        const syncMix = (): void => {
            for (let i = 0; i < controls.length; i++) {
                const control = controls[i];
                const share = settings.grassMix?.[i].percentage ?? 0;
                control.range.value = control.number.value = String(share);
                control.output.value = `${share}%`;
                control.range.disabled = control.number.disabled = !settings.grassMixEnabled;
            }
            element('imported-variant', HTMLSelectElement).disabled = !!settings.grassMixEnabled;
            const prototypeLabel = element('prototype-tris', HTMLElement).previousElementSibling;
            if (prototypeLabel) prototypeLabel.textContent = settings.grassMixEnabled ? 'Prototype tris (weighted)' : 'Prototype tris';
        };
        enabled.addEventListener('change', () => { settings.grassMixEnabled = enabled.checked; syncMix(); });
        panel.append(rows); document.body.append(panel); document.body.classList.add('has-grass-mix');
        syncMix();
    }
    status.textContent = 'Loading imported grass prototypes...';
    const importedPrototypes = await loadImportedGrass(scene);
    const grass = new GrassSystem(scene, world.samplers, settings, world.centre.clone(), 256, {
        importedOnly: world.importedOnly, streaming: world.streaming,
    });
    grass.setImportedPrototypes(importedPrototypes);
    const benchmarkSidebar = document.createElement('aside');
    benchmarkSidebar.className = 'benchmark-sidebar';
    benchmarkSidebar.setAttribute('aria-label', 'Grass benchmark');
    benchmarkSidebar.innerHTML = `<h1>Benchmark</h1>
        <p class="help">Let grass finish loading, then start and move the camera as usual. Record the same route when comparing settings.</p>
        <label for="benchmark-note">Test description</label>
        <input id="benchmark-note" type="text" placeholder="e.g. LOD2, walking and turning">
        <button id="benchmark-start" type="button">Start 30-second benchmark</button>
        <button id="benchmark-stop" type="button" disabled>Stop recording</button>
        <p id="benchmark-status" class="help" role="status">Ready to record.</p>
        <button id="benchmark-copy" type="button" disabled>Copy benchmark results</button>
        <textarea id="benchmark-results" aria-label="Benchmark results JSON" readonly hidden></textarea>`;
    const liveCounters = element('cpu', HTMLElement).closest('dl');
    if (liveCounters) benchmarkSidebar.append(liveCounters);
    document.body.append(benchmarkSidebar);
    let terrainVisible = true;
    const diagnostics = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = 'Performance diagnosis';
    diagnostics.append(legend);
    const addDiagnosticToggle = (text: string, checked: boolean, apply: (checked: boolean) => void): void => {
        const label = document.createElement('label');
        label.className = 'toggle';
        const input = document.createElement('input');
        input.type = 'checkbox'; input.checked = checked;
        input.addEventListener('change', () => apply(input.checked));
        label.append(input, document.createTextNode(` ${text}`));
        diagnostics.append(label);
    };
    if (world.streaming) addDiagnosticToggle('Pause patch streaming', false, paused => { grass.streamingPaused = paused; });
    if (world.streaming) addDiagnosticToggle('Tight grass bounds', true, enabled => { settings.tightGrassBounds = enabled; });
    if (world.setTerrainVisible) addDiagnosticToggle('Show terrain', true, visible => {
        terrainVisible = visible; world.setTerrainVisible?.(visible);
    });
    const timingOutput = document.createElement('p');
    timingOutput.className = 'help';
    diagnostics.append(timingOutput);
    benchmarkSidebar.append(diagnostics);
    scene.onDisposeObservable.add(() => { grass.dispose(); world.dispose?.(); });

    const focusPosition = new Vector3();
    const proxy = demoImpacts ? CreateSphere('interaction-proxy', { diameter: 0.34, segments: 12 }, scene) : null;
    if (proxy) {
        const proxyMaterial = new StandardMaterial('interaction-proxy-material', scene);
        proxyMaterial.emissiveColor = new Color3(0.72, 0.88, 0.72);
        proxyMaterial.alpha = 0.65;
        proxy.material = proxyMaterial;
        proxy.isPickable = false;
        proxy.position = focusPosition;
    }
    const impactMaterial = demoImpacts ? new StandardMaterial('moving-impact-material', scene) : null;
    if (impactMaterial) impactMaterial.emissiveColor = new Color3(1, .43, .08);
    const movingProxies = Array.from({ length: demoImpacts ? 3 : 0 }, (_, index) => {
        const sphere = CreateSphere(`moving-impact-${index}`, { diameter: .26, segments: 10 }, scene);
        sphere.material = impactMaterial;
        sphere.isPickable = false;
        return sphere;
    });
    const cameraImpact: GrassImpact = { position: focusPosition, radius: settings.interactionRadius, strength: settings.interactionStrength };
    const movingImpactData: GrassImpact[] = movingProxies.map(sphere => ({
        position: sphere.position, radius: settings.interactionRadius * .72, strength: settings.interactionStrength * .8,
    }));
    const cameraImpacts: readonly GrassImpact[] = [cameraImpact];
    const allImpacts: readonly GrassImpact[] = [cameraImpact, ...movingImpactData];
    const noImpacts: readonly GrassImpact[] = [];

    const bindRange = (id: string, outputId: string, apply: (value: number) => void, format: (value: number) => string): void => {
        const input = element(id, HTMLInputElement);
        const output = element(outputId, HTMLOutputElement);
        const update = (): void => { const value = Number(input.value); apply(value); output.value = format(value); };
        input.addEventListener('input', update); update();
    };
    element('enabled', HTMLInputElement).addEventListener('change', event => { settings.enabled = (event.currentTarget as HTMLInputElement).checked; });
    element('interaction', HTMLInputElement).addEventListener('change', event => { settings.interaction = (event.currentTarget as HTMLInputElement).checked; });
    element('moving-impacts', HTMLInputElement).addEventListener('change', event => { settings.movingImpacts = (event.currentTarget as HTMLInputElement).checked; });
    const movingImpactsControl = element('moving-impacts', HTMLInputElement);
    movingImpactsControl.checked = settings.movingImpacts;
    if (!demoImpacts) {
        movingImpactsControl.disabled = true;
        movingImpactsControl.closest('label')?.setAttribute('hidden', '');
    }
    element('freeze-wind', HTMLInputElement).addEventListener('change', event => { settings.freezeWind = (event.currentTarget as HTMLInputElement).checked; });
    bindRange('density', 'density-value', value => { settings.density = value; }, value => `${value.toFixed(1)}×`);
    bindRange('near', 'near-value', value => { settings.nearDistance = value; }, value => `${value.toFixed(0)} m`);
    bindRange('far', 'far-value', value => { settings.farDistance = value; }, value => `${value.toFixed(0)} m`);
    const distantLodEnabled = document.getElementById('distant-lod-enabled');
    const distantLodRange = document.getElementById('distant-lod');
    if (distantLodEnabled instanceof HTMLInputElement && distantLodRange instanceof HTMLInputElement) {
        const syncDistantLod = (): void => {
            distantLodRange.disabled = !distantLodEnabled.checked;
            settings.distantLodDistance = distantLodEnabled.checked ? Number(distantLodRange.value) : 0;
        };
        distantLodEnabled.addEventListener('change', syncDistantLod);
        bindRange('distant-lod', 'distant-lod-value', syncDistantLod, value => `${value.toFixed(0)} m`);
    }
    if (document.getElementById('distant-density')) bindRange('distant-density', 'distant-density-value', value => {
        settings.distantGrassDensity = value / 100;
    }, value => `${value.toFixed(0)}%`);
    bindRange('height', 'height-value', value => { settings.bladeHeight = value; grass.rebuild(); }, value => `${value.toFixed(2)} m`);
    bindRange('width', 'width-value', value => { settings.bladeWidth = value; grass.rebuild(); }, value => `${(value * 100).toFixed(1)} cm`);
    bindRange('wind', 'wind-value', value => { settings.windStrength = value; }, value => value.toFixed(2));
    bindRange('wind-speed', 'wind-speed-value', value => { settings.windSpeed = value; }, value => value.toFixed(1));
    const windLimit = document.getElementById('wind-distance-enabled');
    const windDistanceRange = document.getElementById('wind-distance');
    if (windLimit instanceof HTMLInputElement && windDistanceRange instanceof HTMLInputElement) {
        const syncWindDistance = (): void => {
            windDistanceRange.disabled = !windLimit.checked;
            settings.windDistance = windLimit.checked ? Number(windDistanceRange.value) : 0;
        };
        windLimit.addEventListener('change', syncWindDistance);
        bindRange('wind-distance', 'wind-distance-value', syncWindDistance, value => `${value.toFixed(0)} m`);
    }
    bindRange('interaction-radius', 'interaction-radius-value', value => { settings.interactionRadius = value; }, value => `${value.toFixed(1)} m`);
    bindRange('interaction-strength', 'interaction-strength-value', value => { settings.interactionStrength = value; }, value => value.toFixed(2));
    element('visualization', HTMLSelectElement).addEventListener('change', event => { settings.visualization = (event.currentTarget as HTMLSelectElement).value as GrassSettings['visualization']; });
    const bladeSource = element('blade-source', HTMLSelectElement);
    const importedVariant = element('imported-variant', HTMLSelectElement);
    const importedNearLod = element('imported-near-lod', HTMLSelectElement);
    const lodEnabled = element('lod-enabled', HTMLInputElement);
    const singleLod = element('single-lod', HTMLSelectElement);
    const syncLodControls = (): void => {
        const imported = settings.bladeSource !== 'procedural';
        lodEnabled.disabled = false;
        lodEnabled.checked = settings.lodEnabled;
        importedNearLod.disabled = !imported || !settings.lodEnabled;
        singleLod.disabled = !imported || settings.lodEnabled;
        element('single-lod-controls', HTMLElement).hidden = !imported || settings.lodEnabled;
        element('near', HTMLInputElement).disabled = !settings.lodEnabled;
        element('lod-help', HTMLElement).textContent = !imported
            ? settings.lodEnabled ? 'Procedural near and far blades.' : 'One procedural blade mesh at every visible distance.'
            : !settings.lodEnabled
            ? `LOD${settings.singleLod} inside the main range.${world.importedOnly ? ' Optional outer band uses LOD2.' : ''} Patch streaming remains active.`
            : settings.bladeSource === 'hybrid'
                ? 'Hybrid uses procedural blades beyond Near distance.'
                : 'LOD2 is used beyond Near distance.';
    };
    bladeSource.addEventListener('change', () => {
        settings.bladeSource = bladeSource.value as GrassSettings['bladeSource'];
        importedVariant.disabled = settings.bladeSource === 'procedural';
        syncLodControls();
        grass.rebuild();
    });
    importedVariant.addEventListener('change', () => {
        settings.importedVariant = importedVariant.value;
        grass.rebuild();
    });
    bladeSource.value = settings.bladeSource;
    bladeSource.disabled = world.importedOnly === true;
    importedVariant.disabled = settings.bladeSource === 'procedural' || !!settings.grassMixEnabled;
    syncLodControls();
    lodEnabled.addEventListener('change', () => {
        settings.lodEnabled = lodEnabled.checked;
        syncLodControls();
    });
    singleLod.addEventListener('change', () => {
        settings.singleLod = singleLod.value === '1' ? 1 : 2;
        syncLodControls();
        grass.rebuild();
    });
    importedNearLod.addEventListener('change', () => {
        settings.importedNearLod = importedNearLod.value === '1' ? 1 : 2;
        grass.rebuild();
    });
    const bindColor = (id: string, key: 'rootColor' | 'tipColor'): (() => void) => {
        const input = element(id, HTMLInputElement);
        const output = element(`${id}-value`, HTMLOutputElement);
        const sync = (): void => {
            input.value = Color3.FromArray(settings[key]).toGammaSpace(true).toHexString();
            output.value = input.value;
        };
        input.addEventListener('input', () => {
            const color = Color3.FromHexString(input.value).toLinearSpace(true);
            settings[key] = [color.r, color.g, color.b];
            output.value = input.value;
        });
        sync();
        return sync;
    };
    const syncRootColor = bindColor('root-color', 'rootColor');
    const syncTipColor = bindColor('tip-color', 'tipColor');
    element('reset-colors', HTMLButtonElement).addEventListener('click', () => {
        Object.assign(settings, defaultGrassColors());
        syncRootColor(); syncTipColor();
    });
    element('copy-settings', HTMLButtonElement).addEventListener('click', async () => {
        const json = JSON.stringify({
            ...settings,
            rootColorHex: element('root-color', HTMLInputElement).value,
            tipColorHex: element('tip-color', HTMLInputElement).value,
        }, null, 2);
        const output = element('settings-export', HTMLTextAreaElement);
        const copyStatus = element('copy-status', HTMLElement);
        output.value = json;
        output.hidden = false;
        try {
            await navigator.clipboard.writeText(json);
            copyStatus.textContent = 'Settings copied.';
        } catch {
            output.focus(); output.select();
            copyStatus.textContent = 'Select and copy the settings below (Ctrl+C).';
        }
    });

    let groundMode = true;
    const cameraMode = element('camera-mode', HTMLButtonElement);
    const selectCamera = (): void => {
        groundCamera.detachControl(); overviewCamera.detachControl();
        scene.activeCamera = groundMode ? groundCamera : overviewCamera;
        scene.activeCamera.attachControl(canvas, true);
        cameraMode.textContent = `Camera: ${groundMode ? 'Ground' : 'Overview'}`;
    };
    cameraMode.addEventListener('click', () => { groundMode = !groundMode; selectCamera(); });
    element('reset-camera', HTMLButtonElement).addEventListener('click', () => {
        groundCamera.position.set(CENTRE_X, baseHeight + 1.72, CENTRE_Z - 14);
        groundCamera.setTarget(new Vector3(CENTRE_X, baseHeight + 1.6, CENTRE_Z + 10));
        overviewCamera.setPosition(new Vector3(CENTRE_X, baseHeight + 78, CENTRE_Z - 72));
        overviewCamera.setTarget(new Vector3(CENTRE_X, baseHeight, CENTRE_Z));
    });

    const benchmarkStart = element('benchmark-start', HTMLButtonElement);
    const benchmarkStop = element('benchmark-stop', HTMLButtonElement);
    const benchmarkCopy = element('benchmark-copy', HTMLButtonElement);
    const benchmarkStatus = element('benchmark-status', HTMLElement);
    const benchmarkResults = element('benchmark-results', HTMLTextAreaElement);
    let recording: GrassBenchmark | null = null;
    let recordingStarted = 0;
    let previousRecordedFrame: number | null = null;
    let recordingTimestamp = '';
    let recordingNote = '';
    let startState = '';
    let stateChanges = 0;
    const captureState = (): string => JSON.stringify({
        settings, streamingPaused: grass.streamingPaused, terrainVisible,
        camera: groundMode ? {
            mode: 'ground', position: groundCamera.position.asArray(), rotation: groundCamera.rotation.asArray(),
        } : {
            mode: 'overview', position: overviewCamera.position.asArray(), target: overviewCamera.target.asArray(),
            alpha: overviewCamera.alpha, beta: overviewCamera.beta, radius: overviewCamera.radius,
        },
    });
    // Input events bubble after their settings handlers have applied the edit.
    const noteStateChange = (event: Event): void => {
        if (recording && event.target instanceof HTMLElement && event.target.closest('aside, .grass-mix-panel') &&
            !event.target.closest('.benchmark-sidebar')) stateChanges++;
    };
    document.addEventListener('input', noteStateChange);
    document.addEventListener('change', noteStateChange);
    cameraMode.addEventListener('click', () => { if (recording) stateChanges++; });
    diagnostics.addEventListener('change', () => { if (recording) stateChanges++; });
    const finishBenchmark = (reason: string): void => {
        if (!recording) return;
        const durationSeconds = (performance.now() - recordingStarted) / 1000;
        const metrics = recording.result();
        recording = null;
        const report = {
            format: 'exalted-grass-benchmark-v1', page: location.pathname,
            startedAt: recordingTimestamp, endedAt: new Date().toISOString(), durationSeconds, reason,
            description: recordingNote,
            environment: {
                renderer: 'WebGPU', babylonVersion: '9.18.0', userAgent: navigator.userAgent,
                logicalCores: navigator.hardwareConcurrency, devicePixelRatio: window.devicePixelRatio,
                renderWidth: engine.getRenderWidth(), renderHeight: engine.getRenderHeight(),
                hardwareScalingLevel: engine.getHardwareScalingLevel(),
            },
            start: JSON.parse(startState) as unknown, end: JSON.parse(captureState()) as unknown,
            settingChangesDuringRecording: stateChanges, metrics,
            finalGrass: { ...grass.stats, ...grass.streamingStats },
            timingNotes: 'Frame timings are browser frame intervals. CPU timings are synchronous work, not GPU execution. First partial interval is excluded. Settings may change during a run; start/end snapshots and edit count are included.',
        };
        benchmarkResults.value = JSON.stringify(report, null, 2);
        benchmarkResults.hidden = false;
        benchmarkStart.disabled = false; benchmarkStop.disabled = true; benchmarkCopy.disabled = false;
        benchmarkStatus.textContent = `${durationSeconds.toFixed(1)} s, ${metrics.frames} frames. Average ${metrics.averageFps.toFixed(1)} FPS. Frame p95 ${metrics.frameMs.p95.toFixed(1)} ms; worst ${metrics.frameMs.max.toFixed(1)} ms. ${metrics.framesOver50ms} frames over 50 ms. ${stateChanges ? 'Settings changed during recording.' : ''}`;
    };
    benchmarkStart.addEventListener('click', () => {
        recording = new GrassBenchmark(); recordingStarted = performance.now(); previousRecordedFrame = null;
        recordingTimestamp = new Date().toISOString(); startState = captureState(); stateChanges = 0;
        recordingNote = element('benchmark-note', HTMLInputElement).value;
        benchmarkStart.disabled = true; benchmarkStop.disabled = false; benchmarkCopy.disabled = true;
        benchmarkResults.hidden = true; benchmarkStatus.textContent = 'Recording for 30 seconds. Move the camera as usual.';
    });
    benchmarkStop.addEventListener('click', () => finishBenchmark('manual-stop'));
    benchmarkCopy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(benchmarkResults.value);
            benchmarkStatus.textContent = 'Benchmark results copied. Paste them into the chat.';
        } catch {
            benchmarkResults.focus(); benchmarkResults.select();
            benchmarkStatus.textContent = 'Select and copy the results below (Ctrl+C).';
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) finishBenchmark('tab-hidden');
    });

    const frameSamples: number[] = [];
    const renderSamples: number[] = [];
    let groundMs = 0;
    let uploadPeakMs = 0;
    let elapsed = 0;
    let lastStats = 0;
    scene.onBeforeRenderObservable.add(() => {
        const delta = Math.min(engine.getDeltaTime(), 50) / 1000;
        elapsed += delta;
        const groundStarted = performance.now();
        if (groundMode) {
            world.clampPosition?.(groundCamera.position);
            groundCamera.position.y = heightAt(groundCamera.position.x, groundCamera.position.z) + 1.72;
            focusPosition.set(groundCamera.position.x, heightAt(groundCamera.position.x, groundCamera.position.z) + 0.18, groundCamera.position.z);
        } else {
            world.clampPosition?.(overviewCamera.target);
            focusPosition.set(overviewCamera.target.x, heightAt(overviewCamera.target.x, overviewCamera.target.z) + 0.18, overviewCamera.target.z);
        }
        groundMs = performance.now() - groundStarted;
        proxy?.setEnabled(settings.interaction);
        cameraImpact.radius = settings.interactionRadius;
        cameraImpact.strength = settings.interactionStrength;
        for (let i = 0; i < movingProxies.length; i++) {
            const angle = elapsed * (.55 + i * .13) + i * Math.PI * .67;
            const radius = 3.2 + i * 1.35;
            const sphere = movingProxies[i];
            sphere.position.x = focusPosition.x + Math.cos(angle) * radius;
            sphere.position.z = focusPosition.z + Math.sin(angle) * radius;
            sphere.position.y = heightAt(sphere.position.x, sphere.position.z) + .13;
            sphere.setEnabled(settings.interaction && settings.movingImpacts);
            movingImpactData[i].radius = settings.interactionRadius * (.58 + i * .08);
            movingImpactData[i].strength = settings.interactionStrength * (.72 + i * .08);
        }
        const activeImpacts = !demoImpacts && !groundMode ? noImpacts : settings.movingImpacts ? allImpacts : cameraImpacts;
        grass.update({ cameraPosition: focusPosition, windCameraPosition: scene.activeCamera?.globalPosition ?? focusPosition, elapsedSeconds: elapsed, impacts: activeImpacts });
        uploadPeakMs = Math.max(uploadPeakMs, grass.streamingStats.uploadMs);
        frameSamples.push(engine.getDeltaTime());
        if (frameSamples.length > 180) frameSamples.shift();
        if (performance.now() - lastStats > 400) {
            const sorted = [...frameSamples].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
            const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
            element('frame', HTMLElement).textContent = `${median.toFixed(1)} / ${p95.toFixed(1)} ms`;
            element('cpu', HTMLElement).textContent = `${grass.stats.updateMs.toFixed(2)} ms`;
            element('patches', HTMLElement).textContent = String(grass.stats.visiblePatches);
            element('instances', HTMLElement).textContent = `${grass.stats.nearInstances.toLocaleString()} / ${grass.stats.midInstances.toLocaleString()}`;
            element('triangles', HTMLElement).textContent = grass.stats.triangles.toLocaleString();
            element('draws', HTMLElement).textContent = String(grass.stats.draws);
            const [nearTriangles, midTriangles] = grass.getPrototypeTriangleCounts();
            element('prototype-tris', HTMLElement).textContent = `${nearTriangles.toLocaleString()} / ${midTriangles.toLocaleString()}`;
            element('impact-count', HTMLElement).textContent = settings.interaction ? String(activeImpacts.length) : '0';
            let drawnGrass = 0;
            const active = scene.getActiveMeshes();
            for (let i = 0; i < active.length; i++) if (active.data[i].name.startsWith('grass:')) drawnGrass++;
            timingOutput.textContent = `Frame worst: ${Math.max(...frameSamples).toFixed(1)} ms. Render CPU worst: ${Math.max(0, ...renderSamples).toFixed(1)} ms. Ground: ${groundMs.toFixed(2)} ms. Upload CPU peak: ${uploadPeakMs.toFixed(2)} ms. Queue: ${grass.streamingStats.queued}. Grass in frustum: ${drawnGrass}.`;
            uploadPeakMs = 0;
            if (recording) benchmarkStatus.textContent = `Recording: ${Math.max(0, 30 - (performance.now() - recordingStarted) / 1000).toFixed(1)} s remaining, ${recording.count} frames.`;
            lastStats = performance.now();
        }
    });

    window.addEventListener('keydown', event => { groundCamera.speed = event.shiftKey ? 3.2 : 0.8; });
    window.addEventListener('keyup', () => { groundCamera.speed = 0.8; });

    status.textContent = world.readyMessage;
    let pendingResize = false;
    window.addEventListener('resize', () => { pendingResize = true; });
    engine.runRenderLoop(() => {
        if (pendingResize) { engine.resize(); pendingResize = false; }
        const renderStarted = performance.now();
        scene.render();
        const renderMs = performance.now() - renderStarted;
        renderSamples.push(renderMs);
        if (renderSamples.length > 180) renderSamples.shift();
        if (recording) {
            if (previousRecordedFrame !== null) {
                let drawn = 0;
                const active = scene.getActiveMeshes();
                for (let i = 0; i < active.length; i++) if (active.data[i].name.startsWith('grass:')) drawn++;
                recording.record(renderStarted - previousRecordedFrame, renderMs, grass.stats.updateMs,
                    groundMs, grass.streamingStats.uploadMs, grass.streamingStats.queued, drawn);
            }
            previousRecordedFrame = renderStarted;
            if (performance.now() - recordingStarted >= 30000) finishBenchmark('duration-complete');
        }
    });
}

export function startGrassLab(createWorld: (scene: Scene) => Promise<GrassLabWorld>): void {
    void boot(createWorld).catch(error => {
        console.error(error);
        const status = document.getElementById('status');
        if (status) status.textContent = `Startup failed — ${error instanceof Error ? error.message : String(error)}`;
    });
}
