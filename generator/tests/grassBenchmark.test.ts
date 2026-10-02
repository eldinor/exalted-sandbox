import test from 'node:test';
import assert from 'node:assert/strict';
import { GrassBenchmark, summarizeTimings } from '../grass/GrassBenchmark.ts';

test('benchmark percentiles use the recorded prefix and preserve the source', () => {
    const values = new Float64Array([50, 10, 30, 20, 40, 999]);
    assert.deepEqual(summarizeTimings(values, 5), { mean: 30, median: 30, p95: 50, p99: 50, max: 50 });
    assert.equal(values[0], 50);
    assert.equal(summarizeTimings([]).max, 0);
});

test('benchmark reports frame-rate, independent CPU timings and slow-frame thresholds', () => {
    const benchmark = new GrassBenchmark();
    assert.equal(benchmark.result().averageFps, 0);
    for (const ms of [10, 20, 40, 60, 120]) benchmark.record(ms, 2, 1, .1, .5, 3, 7);
    const report = benchmark.result();
    assert.equal(report.frames, 5);
    assert.equal(report.averageFps, 20);
    assert.equal(report.frameMs.max, 120);
    assert.equal(report.framesOver33ms, 3);
    assert.equal(report.framesOver50ms, 2);
    assert.equal(report.framesOver100ms, 1);
    assert.equal(report.renderCpuMs.mean, 2);
    assert.equal(report.uploadCpuMs.max, .5);
    assert.equal(report.queuedPatches.mean, 3);
    assert.equal(report.grassMeshesInFrustum.max, 7);
});
