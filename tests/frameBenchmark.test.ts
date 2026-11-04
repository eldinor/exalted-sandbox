import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameBenchmark } from '../src/core/frameBenchmark.ts';
import { installDrawCounter, endFrameDraws, setBenchmarkDrawRecording, stats } from '../src/core/perf.ts';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { BenchmarkRoute, sampleGrassRoute, sampleForestRoute } from '../src/core/benchmarkRoute.ts';
import { CameraRig } from '../src/core/camera.ts';
import { Scene } from '@babylonjs/core/scene';

test('automatic route has fixed endpoints and frame-rate-independent continuous sampling', () => {
    const position = new Vector3();
    sampleGrassRoute(-5, position);
    assert.deepEqual(position.asArray(), [-30, 0, 210]);
    sampleGrassRoute(35, position);
    assert.deepEqual(position.asArray(), [-140, 0, 35]);
    const direct = new Vector3();
    const yaw = sampleGrassRoute(13.5, direct);
    for (const rate of [20, 60, 144]) {
        for (let frame = 0; frame <= Math.floor(13.5 * rate); frame++) sampleGrassRoute(frame / rate, position);
        assert.equal(sampleGrassRoute(13.5, position), yaw);
        assert.deepEqual(position.asArray(), direct.asArray());
    }
    for (const time of [6, 12, 18, 24]) {
        const left = new Vector3(), right = new Vector3();
        const a = sampleGrassRoute(time - .00001, left), b = sampleGrassRoute(time + .00001, right);
        assert.ok(Vector3.Distance(left, right) < .001);
        assert.ok(Math.abs(a - b) < .001);
    }
});

test('app benchmark retains uncapped stutters, bounded storage and independent metrics', () => {
    const benchmark = new FrameBenchmark(5);
    assert.equal(benchmark.result(false).averageFps, 0);
    for (const frameMs of [10, 20, 40, 60, 200]) {
        Object.assign(benchmark.values, { frameMs, cpuSubmitMs: 2, submittedIndices: 100000,
            grassQueuedPatches: 7, desertActiveChunks: 12, gpuRollingMs: 3 });
        assert.equal(benchmark.record(), true);
    }
    benchmark.values.frameMs = 999;
    assert.equal(benchmark.record(), false);
    const report = benchmark.result(false);
    assert.equal(report.frames, 5);
    assert.equal(report.frameMs.max, 200);
    assert.equal(report.frameMs.p99, 200);
    assert.equal(report.averageFps, 1000 / 66);
    assert.equal(report.framesOver33ms, 3);
    assert.equal(report.framesOver50ms, 2);
    assert.equal(report.framesOver100ms, 1);
    assert.equal(report.metrics.cpuSubmitMs?.mean, 2);
    assert.equal(report.metrics.submittedIndices?.mean, 100000);
    assert.equal(report.metrics.grassQueuedPatches?.mean, 7);
    assert.equal(report.metrics.desertActiveChunks?.mean, 12);
    assert.equal(report.metrics.gpuRollingMs, undefined);
    assert.equal(benchmark.result(true).metrics.gpuRollingMs?.mean, 3);
    assert.throws(() => new FrameBenchmark(0), RangeError);
});

test('forest route is repeatable, stays outside the barrier on ground legs, and includes an aerial canopy pass', () => {
    const position = new Vector3(), rotation = new Vector3();
    sampleForestRoute(-1, position, rotation);
    assert.deepEqual(position.asArray(), [-320, 3, 100]);
    assert.equal(rotation.y, -Math.PI / 2);
    sampleForestRoute(40, position, rotation);
    assert.deepEqual(position.asArray(), [-315, 60, 125]);
    const target = new Vector3(), targetRotation = new Vector3();
    sampleForestRoute(23.5, target, targetRotation);
    for (const rate of [20, 60, 144]) {
        for (let frame = 0; frame <= Math.floor(23.5 * rate); frame++) sampleForestRoute(frame / rate, position, rotation);
        sampleForestRoute(23.5, position, rotation);
        assert.deepEqual(position.asArray(), target.asArray());
        assert.deepEqual(rotation.asArray(), targetRotation.asArray());
    }
    for (let t = 0; t <= 30; t += .05) {
        sampleForestRoute(t, position, rotation);
        assert.ok(position.x > -345, 'camera remains on the accessible side');
        assert.ok(position.y >= 3 && position.y <= 110);
        if (t < 12) assert.equal(position.y, 3);
    }
    sampleForestRoute(24, position, rotation);
    assert.equal(position.y, 110); assert.equal(rotation.x, .78);
    for (const time of [6, 12, 18, 24]) {
        const left = new Vector3(), right = new Vector3(), a = new Vector3(), b = new Vector3();
        sampleForestRoute(time - .00001, left, a); sampleForestRoute(time + .00001, right, b);
        assert.ok(Vector3.Distance(left, right) < .001);
        assert.ok(Vector3.Distance(a, b) < .001);
    }
});

test('forest automatic route ignores grass queue readiness and restores camera on stop or preparation cancellation', () => {
    const engine = new NullEngine(), scene = new Scene(engine), rig = new CameraRig(scene, {} as HTMLCanvasElement);
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { exitPointerLock: async () => {} } });
    let started = 0, stopped = 0, resets = 0;
    const route = new BenchmarkRoute(rig, () => 70, () => resets++, () => {}, () => started++, () => stopped++, () => 7);
    try {
        rig.camera.position.set(10, 20, 30); rig.camera.rotation.set(.1, .2, .3); rig.camera.fov = .9;
        route.start('forest');
        assert.equal(route.kind, 'forest'); assert.equal(route.ready, true);
        assert.deepEqual(rig.camera.position.asArray(), [-320, 73, 100]);
        route.start('grass'); assert.equal(route.kind, 'forest', 'active route cannot be replaced');
        route.beginRecording(100); route.update(24100);
        assert.deepEqual(rig.camera.position.asArray(), [-330, 180, 45]);
        assert.equal(route.snapshot().name, 'Forest edge and aerial canopy');
        assert.equal(route.snapshot().cameraHeightAboveTerrain, 110);
        route.stop(); route.stop();
        assert.deepEqual(rig.camera.position.asArray(), [10, 20, 30]);
        assert.deepEqual(rig.camera.rotation.asArray(), [.1, .2, .3]); assert.equal(rig.camera.fov, .9);
        route.start('forest'); route.stop(); // Cancellation before beginRecording.
        assert.deepEqual(rig.camera.position.asArray(), [10, 20, 30]);
        route.start(); assert.equal(route.kind, 'grass'); assert.equal(route.ready, false);
        assert.deepEqual(rig.camera.position.asArray(), [-30, 73, 210]); route.stop();
        assert.equal(started, 3); assert.equal(stopped, 3); assert.equal(resets, 6);
    } finally {
        if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
        else Reflect.deleteProperty(globalThis, 'document');
        scene.dispose(); engine.dispose();
    }
});

test('benchmark draw totals account for instancing, exclude non-indexed draws and reset on stop', () => {
    const engine = new NullEngine();
    // Isolate submitted arguments from NullEngine rasterization internals.
    engine.drawElementsType = () => {};
    engine.drawArraysType = () => {};
    try {
        installDrawCounter(engine);
        engine.drawElementsType(0, 0, 30, 4);
        endFrameDraws();
        assert.equal(stats.submittedIndices, 0, 'no index collection while idle');
        setBenchmarkDrawRecording(true);
        engine.drawElementsType(0, 0, 30, 4);
        engine.drawElementsType(0, 0, 12);
        engine.drawArraysType(0, 0, 100, 2);
        endFrameDraws();
        assert.equal(stats.drawCalls, 3);
        assert.equal(stats.submittedIndices, 132);
        endFrameDraws();
        assert.equal(stats.submittedIndices, 0);
        setBenchmarkDrawRecording(false);
        engine.drawElementsType(0, 0, 99);
        endFrameDraws();
        assert.equal(stats.submittedIndices, 0);
    } finally { setBenchmarkDrawRecording(false); engine.dispose(); }
});
