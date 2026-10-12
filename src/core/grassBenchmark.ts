export interface TimingSummary {
    mean: number; median: number; p95: number; p99: number; max: number;
}

export function summarizeTimings(values: ArrayLike<number>, count = values.length): TimingSummary {
    const sorted = Array.from({ length: count }, (_, i) => values[i]).sort((a, b) => a - b);
    if (!count) return { mean: 0, median: 0, p95: 0, p99: 0, max: 0 };
    const percentile = (fraction: number): number => sorted[Math.max(0, Math.ceil(count * fraction) - 1)];
    return {
        mean: sorted.reduce((sum, value) => sum + value, 0) / count,
        median: percentile(.5), p95: percentile(.95), p99: percentile(.99), max: sorted[count - 1],
    };
}

/** Fixed storage keeps recording out of the allocation-sensitive frame path. */
export class GrassBenchmark {
    private readonly samples = Array.from({ length: 7 }, () => new Float64Array(36000));
    public count = 0;

    public record(frameMs: number, renderMs: number, grassMs: number, groundMs: number, uploadMs: number, queued: number, drawn: number): void {
        if (this.count >= this.samples[0].length) return;
        const i = this.count++;
        this.samples[0][i] = frameMs; this.samples[1][i] = renderMs;
        this.samples[2][i] = grassMs; this.samples[3][i] = groundMs;
        this.samples[4][i] = uploadMs; this.samples[5][i] = queued; this.samples[6][i] = drawn;
    }

    public result(): {
        frames: number; averageFps: number; frameMs: TimingSummary;
        renderCpuMs: TimingSummary; grassCpuMs: TimingSummary; groundCpuMs: TimingSummary;
        uploadCpuMs: TimingSummary; queuedPatches: TimingSummary; grassMeshesInFrustum: TimingSummary;
        framesOver33ms: number; framesOver50ms: number; framesOver100ms: number;
    } {
        const frame = summarizeTimings(this.samples[0], this.count);
        let over33 = 0, over50 = 0, over100 = 0;
        for (let i = 0; i < this.count; i++) {
            const ms = this.samples[0][i];
            if (ms > 1000 / 30) over33++;
            if (ms > 50) over50++;
            if (ms > 100) over100++;
        }
        return {
            frames: this.count, averageFps: frame.mean > 0 ? 1000 / frame.mean : 0, frameMs: frame,
            renderCpuMs: summarizeTimings(this.samples[1], this.count),
            grassCpuMs: summarizeTimings(this.samples[2], this.count),
            groundCpuMs: summarizeTimings(this.samples[3], this.count),
            uploadCpuMs: summarizeTimings(this.samples[4], this.count),
            queuedPatches: summarizeTimings(this.samples[5], this.count),
            grassMeshesInFrustum: summarizeTimings(this.samples[6], this.count),
            framesOver33ms: over33, framesOver50ms: over50, framesOver100ms: over100,
        };
    }
}
