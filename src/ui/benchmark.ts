import { FrameBenchmark, type BenchmarkValues } from '../core/frameBenchmark.ts';
import { setBenchmarkDrawRecording } from '../core/perf.ts';
import './benchmark.css';
import type { BenchmarkRoute } from '../core/benchmarkRoute.ts';

interface BenchmarkSources {
    gpuTiming: boolean;
    captureState(): unknown;
    sample(values: BenchmarkValues): void;
    route?: BenchmarkRoute;
    grassSettings?: { enabled: boolean; cheapDistantGeometry?: boolean };
    flowerSettings?: { enabled: boolean };
    forestSettings?: { enabled: boolean };
}

/** Collapsed development UI; the composition root can omit it for public releases. */
export class BenchmarkPanel {
    readonly root = document.createElement('aside');
    private readonly stack = document.createElement('div');
    private readonly description = document.createElement('input');
    private readonly startButton = document.createElement('button');
    private readonly stopButton = document.createElement('button');
    private readonly copyButton = document.createElement('button');
    private readonly status = document.createElement('p');
    private readonly results = document.createElement('textarea');
    private readonly details = document.createElement('details');
    private readonly mode = document.createElement('select');
    private readonly grassEnabled = document.createElement('input');
    private readonly cheapGrass = document.createElement('input');
    private readonly forestEnabled = document.createElement('input');
    private readonly flowerEnabled = document.createElement('input');
    private preparingSince: number | null = null;
    private preparationSeconds = 0;
    private preparationTimedOut = false;
    private automatic = false;
    private recording: FrameBenchmark | null = null;
    private started = 0;
    private startedAt = '';
    private startState: unknown;
    private note = '';
    private previousFrame: number | null = null;
    private nextStatus = 0;
    private disposed = false;
    private readonly visibilityChanged = () => { if (document.hidden) this.finish('tab-hidden'); };
    private readonly escapePressed = (event: KeyboardEvent) => {
        if (event.code === 'Escape' && (this.recording || this.preparingSince !== null)) this.finish('escape-cancelled');
    };

    constructor(private readonly sources: BenchmarkSources, private readonly avatarPanel: HTMLElement) {
        this.stack.className = 'dev-panel-stack';
        avatarPanel.before(this.stack);
        this.root.className = 'app-benchmark';
        this.root.setAttribute('aria-label', 'Application benchmark');
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Benchmark';
        const controls = document.createElement('div');
        controls.className = 'app-benchmark-controls';
        const label = document.createElement('label');
        label.textContent = 'Test description';
        this.description.type = 'text';
        this.description.placeholder = 'e.g. Surfing through grass';
        label.append(this.description);
        const modeLabel = document.createElement('label');
        modeLabel.textContent = 'Camera mode';
        for (const [value, text] of [['manual', 'Manual'], ['automatic', 'Automatic grassland route'], ['forest', 'Automatic forest route']]) {
            const option = document.createElement('option');
            option.value = value; option.textContent = text;
            option.disabled = value !== 'manual' && (!sources.route || (value === 'forest' && !sources.forestSettings));
            this.mode.append(option);
        }
        modeLabel.append(this.mode);
        const grassLabel = document.createElement('label');
        grassLabel.className = 'benchmark-grass-toggle';
        grassLabel.textContent = 'Grass models';
        grassLabel.title = 'Toggle grass models for comparison. The ground texture remains visible.';
        this.grassEnabled.type = 'checkbox';
        this.grassEnabled.checked = sources.grassSettings?.enabled ?? false;
        grassLabel.hidden = !sources.grassSettings;
        grassLabel.append(this.grassEnabled);
        this.grassEnabled.addEventListener('change', () => {
            if (sources.grassSettings) sources.grassSettings.enabled = this.grassEnabled.checked;
        });
        const cheapLabel=document.createElement('label');
        cheapLabel.className='benchmark-grass-toggle';cheapLabel.textContent='Cheaper distant grass';
        cheapLabel.hidden=sources.grassSettings?.cheapDistantGeometry===undefined;
        this.cheapGrass.type='checkbox';this.cheapGrass.checked=sources.grassSettings?.cheapDistantGeometry??false;
        cheapLabel.append(this.cheapGrass);
        this.cheapGrass.addEventListener('change',()=>{
            if(sources.grassSettings)sources.grassSettings.cheapDistantGeometry=this.cheapGrass.checked;
        });
        const flowerLabel = document.createElement('label');
        flowerLabel.className = 'benchmark-grass-toggle';
        flowerLabel.textContent = 'Meadow flowers';
        flowerLabel.hidden = !sources.flowerSettings;
        const flowerEnabled = this.flowerEnabled;
        flowerEnabled.type = 'checkbox';flowerEnabled.checked = sources.flowerSettings?.enabled ?? false;
        flowerLabel.append(flowerEnabled);
        flowerEnabled.addEventListener('change', () => {
            if (sources.flowerSettings) sources.flowerSettings.enabled = flowerEnabled.checked;
        });
        const forestLabel = document.createElement('label');
        forestLabel.className = 'benchmark-grass-toggle';
        forestLabel.textContent = 'Forest trees';
        forestLabel.title = 'Compare forest rendering cost. The restricted area stays closed.';
        this.forestEnabled.type = 'checkbox';
        this.forestEnabled.checked = sources.forestSettings?.enabled ?? false;
        forestLabel.hidden = !sources.forestSettings;
        forestLabel.append(this.forestEnabled);
        this.forestEnabled.addEventListener('change', () => {
            if (sources.forestSettings) sources.forestSettings.enabled = this.forestEnabled.checked;
        });
        this.startButton.textContent = 'Start 30-second benchmark';
        this.stopButton.textContent = 'Stop';
        this.copyButton.textContent = 'Copy results';
        for (const button of [this.startButton, this.stopButton, this.copyButton]) button.type = 'button';
        this.stopButton.disabled = this.copyButton.disabled = true;
        this.status.textContent = 'Ready to record.';
        this.status.setAttribute('role', 'status');
        const resultSummary = document.createElement('summary');
        resultSummary.textContent = 'Detailed results';
        this.results.readOnly = true;
        this.results.setAttribute('aria-label', 'Benchmark results JSON');
        this.details.hidden = true;
        this.details.append(resultSummary, this.results);
        controls.append(modeLabel, grassLabel, cheapLabel, flowerLabel, forestLabel, label, this.startButton, this.stopButton, this.copyButton, this.status, this.details);
        details.append(summary, controls);
        this.root.append(details);
        this.stack.append(this.root, avatarPanel);
        this.startButton.addEventListener('click', () => this.start());
        this.stopButton.addEventListener('click', () => this.finish('manual-stop'));
        this.copyButton.addEventListener('click', () => { void this.copy(); });
        document.addEventListener('visibilitychange', this.visibilityChanged);
        window.addEventListener('keydown', this.escapePressed);
    }

    start(): void {
        if (this.disposed || this.recording || this.preparingSince !== null || document.hidden) return;
        this.automatic = (this.mode.value === 'automatic' || (this.mode.value === 'forest' && !!this.sources.forestSettings)) && !!this.sources.route;
        this.preparationSeconds = 0; this.preparationTimedOut = false;
        this.mode.disabled = this.startButton.disabled = this.description.disabled = true;
        this.cheapGrass.disabled = this.grassEnabled.disabled = this.flowerEnabled.disabled = this.forestEnabled.disabled = true;
        this.copyButton.disabled = true; this.stopButton.disabled = false;
        this.results.value = ''; this.details.hidden = true;
        if (this.automatic) {
            this.sources.route?.start(this.mode.value === 'forest' ? 'forest' : 'grass');
            this.preparingSince = performance.now();
            this.nextStatus = 0;
            this.status.textContent = this.mode.value === 'forest' ? 'Preparing forest route. Escape cancels.' : 'Preparing grassland route. Escape cancels.';
            return;
        }
        this.beginRecording(performance.now());
    }

    /** Advance camera before the production camera/depth/shadow updates. */
    updateFrame(now: number): void {
        if (!this.recording && this.preparingSince === null) {
            this.grassEnabled.checked = this.sources.grassSettings?.enabled ?? false;
            this.cheapGrass.checked = this.sources.grassSettings?.cheapDistantGeometry ?? false;
            this.flowerEnabled.checked = this.sources.flowerSettings?.enabled ?? false;
            this.forestEnabled.checked = this.sources.forestSettings?.enabled ?? false;
        }
        const route = this.sources.route;
        if (!this.automatic || !route?.active) return;
        route.update(now);
        if (this.preparingSince === null) return;
        const elapsed = now - this.preparingSince;
        if (elapsed >= 3000 && (route.ready || elapsed >= 30000)) {
            this.preparationSeconds = elapsed / 1000;
            this.preparationTimedOut = !route.ready;
            this.preparingSince = null;
            route.beginRecording(now);
            this.beginRecording(now);
        } else if (elapsed >= this.nextStatus) {
            this.nextStatus = elapsed + 250;
            this.status.textContent = `Preparing route: ${(elapsed / 1000).toFixed(1)} s. ${route.kind === 'forest' ? 'Warming forest view.' : 'Waiting for nearby grass.'} Escape cancels.`;
        }
    }

    private beginRecording(now: number): void {
        this.startState = structuredClone(this.sources.captureState());
        this.recording = new FrameBenchmark();
        this.started = now;
        this.startedAt = new Date().toISOString();
        this.note = this.description.value;
        this.previousFrame = null;
        this.nextStatus = 0;
        this.results.value = '';
        this.details.hidden = true;
        this.startButton.disabled = this.copyButton.disabled = true;
        this.description.disabled = true;
        this.stopButton.disabled = false;
        setBenchmarkDrawRecording(true);
        this.status.textContent = this.automatic ? 'Automatic route: recording for 30 seconds. Escape cancels.' : 'Recording for 30 seconds. Move as usual.';
    }

    /** Called after submission; use raw browser cadence, never the simulation's capped dt. */
    recordFrame(frameStarted: number): void {
        const recording = this.recording;
        if (!recording) return;
        if (this.previousFrame !== null) {
            this.sources.sample(recording.values);
            recording.values.frameMs = frameStarted - this.previousFrame;
            if (!recording.record()) { this.finish('sample-limit'); return; }
        }
        this.previousFrame = frameStarted;
        const elapsed = performance.now() - this.started;
        if (elapsed >= 30000) { this.finish('duration-complete'); return; }
        if (elapsed >= this.nextStatus) {
            this.nextStatus = elapsed + 250;
            this.status.textContent = `Recording: ${Math.max(0, 30 - elapsed / 1000).toFixed(1)} s remaining, ${recording.count} frames.`;
        }
    }

    finish(reason: string): void {
        const recording = this.recording;
        if (!recording) {
            if (this.preparingSince !== null) {
                this.preparingSince = null;
                this.sources.route?.stop();
                this.mode.disabled = this.startButton.disabled = this.description.disabled = false;
                this.grassEnabled.disabled = this.flowerEnabled.disabled = this.forestEnabled.disabled = false;
                this.stopButton.disabled = true;
                this.status.textContent = `Preparation cancelled (${reason}).`;
            }
            return;
        }
        this.recording = null;
        setBenchmarkDrawRecording(false);
        const metrics = recording.result(this.sources.gpuTiming);
        const endState = this.sources.captureState();
        const report = { format: 'exalted-app-benchmark-v1', page: location.pathname + location.search,
            startedAt: this.startedAt, endedAt: new Date().toISOString(),
            durationSeconds: (performance.now() - this.started) / 1000, reason, description: this.note,
            cameraMode: this.automatic ? 'automatic' : 'manual',
            route: this.automatic ? this.sources.route?.snapshot() : null,
            preparationSeconds: this.preparationSeconds, preparationTimedOut: this.preparationTimedOut,
            start: this.startState, end: endState,
            stateChanged: JSON.stringify(this.startState) !== JSON.stringify(endState), metrics,
            timingNotes: 'Frame times are uncapped browser frame intervals; the first partial interval is excluded. CPU timings measure synchronous work, not GPU execution. Draw calls and instanced indexed submissions include all engine render passes. GPU timing, if present, is the existing rolling GPU average. Start/end snapshots show settings and position changes, not a complete edit history.' };
        this.results.value = JSON.stringify(report, null, 2);
        if (this.automatic) this.sources.route?.stop();
        this.details.hidden = false;
        this.startButton.disabled = this.description.disabled = false;
        this.mode.disabled = false;
        this.grassEnabled.disabled = this.forestEnabled.disabled = false;
        this.stopButton.disabled = true;
        this.copyButton.disabled = false;
        this.status.textContent = `${metrics.frames} frames · ${metrics.averageFps.toFixed(1)} FPS · p95 ${metrics.frameMs.p95.toFixed(1)} ms · p99 ${metrics.frameMs.p99.toFixed(1)} ms · worst ${metrics.frameMs.max.toFixed(1)} ms · ${metrics.framesOver50ms} frames over 50 ms.`;
    }

    private async copy(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.results.value);
            if (!this.disposed) this.status.textContent = 'Results copied.';
        } catch {
            if (this.disposed) return;
            this.details.open = true;
            this.results.focus(); this.results.select();
            this.status.textContent = 'Select and copy the results below (Ctrl+C).';
        }
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        if (this.recording) { this.recording = null; setBenchmarkDrawRecording(false); }
        this.sources.route?.stop();
        this.preparingSince = null;
        document.removeEventListener('visibilitychange', this.visibilityChanged);
        window.removeEventListener('keydown', this.escapePressed);
        this.stack.before(this.avatarPanel);
        this.stack.remove();
    }
}
