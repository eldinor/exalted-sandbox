import { summarizeTimings, type TimingSummary } from './grassBenchmark.ts';

export const BENCHMARK_METRICS = [
    'frameMs', 'cpuTotalMs', 'cpuSubmitMs', 'cpuCharacterMs', 'cpuSpellsMs',
    'cpuTerrainMs', 'cpuVfxMs', 'drawCalls', 'submittedIndices', 'grassCpuMs',
    'grassUploadCpuMs', 'grassQueuedPatches', 'grassVisiblePatches',
    'desertActiveChunks', 'desertActiveMeshes', 'forestCpuMs', 'forestVisibleTrees',
    'forestActiveChunks', 'forestActiveMeshes', 'flowerCpuMs', 'flowerInstances', 'gpuRollingMs',
] as const;
export type BenchmarkMetric = typeof BENCHMARK_METRICS[number];
export type BenchmarkValues = Record<BenchmarkMetric, number>;

/** Fixed storage; sorting and report allocations happen only after recording. */
export class FrameBenchmark {
    readonly values = Object.fromEntries(BENCHMARK_METRICS.map(key => [key, 0])) as BenchmarkValues;
    private readonly samples: Float64Array[];
    count = 0;

    constructor(private readonly capacity = 36000) {
        if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Invalid benchmark capacity.');
        this.samples = BENCHMARK_METRICS.map(() => new Float64Array(capacity));
    }

    record(): boolean {
        if (this.count >= this.capacity) return false;
        for (let channel = 0; channel < BENCHMARK_METRICS.length; channel++) {
            this.samples[channel][this.count] = this.values[BENCHMARK_METRICS[channel]];
        }
        this.count++;
        return true;
    }

    result(gpuTiming: boolean) {
        const frameMs = summarizeTimings(this.samples[0], this.count);
        const metrics: Partial<Record<BenchmarkMetric, TimingSummary>> = {};
        for (let channel = 0; channel < BENCHMARK_METRICS.length; channel++) {
            const key = BENCHMARK_METRICS[channel];
            if (key !== 'gpuRollingMs' || gpuTiming) metrics[key] = key === 'frameMs' ? frameMs : summarizeTimings(this.samples[channel], this.count);
        }
        let over33 = 0, over50 = 0, over100 = 0;
        for (let i = 0; i < this.count; i++) {
            const ms = this.samples[0][i];
            if (ms > 1000 / 30) over33++;
            if (ms > 50) over50++;
            if (ms > 100) over100++;
        }
        return { frames: this.count, averageFps: frameMs.mean > 0 ? 1000 / frameMs.mean : 0,
            frameMs, framesOver33ms: over33, framesOver50ms: over50, framesOver100ms: over100, metrics };
    }
}
