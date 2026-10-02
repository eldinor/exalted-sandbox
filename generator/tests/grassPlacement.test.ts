import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { GrassPlacementJob } from '../grass/GrassPlacementJob.ts';
import { writeGrassMatrix } from '../grass/GrassDistribution.ts';
import { changeGrassMixShare } from '../grass/GrassMix.ts';
import { canUseStaticGrass } from '../grass/GrassWind.ts';
import type { GrassSamplers } from '../grass/grassTypes.ts';

const flat: GrassSamplers = { heightAt: () => 2, grassWeightAt: () => 1, excludedAt: () => false, slopeAt: () => 0 };
const config = { density: .5, height: .85, width: .045, nearImported: true, midImported: true };

test('static wind shader requires the whole patch outside the fade and active impacts', () => {
    const camera = new Vector3();
    assert.equal(canUseStaticGrass(67, 0, camera, 60, []), false, 'patch centre alone cannot determine the cutoff');
    assert.equal(canUseStaticGrass(68, 0, camera, 60, []), true);
    assert.equal(canUseStaticGrass(100, 0, camera, 0, []), false, 'unlimited wind keeps the animated shader');
    assert.equal(canUseStaticGrass(100, 0, camera, 60, [{ position: new Vector3(100, 0, 0), radius: 2, strength: .5 }]), false);
    assert.equal(canUseStaticGrass(100, 0, camera, 60, [{ position: camera, radius: 2, strength: .5 }]), true);
    assert.equal(canUseStaticGrass(100, 0, camera, 60, [{ position: new Vector3(100, 0, 0), radius: 2, strength: 0 }]), true);
    assert.equal(canUseStaticGrass(100, 0, new Vector3(95, 10, 0), 60, []), false, 'actual camera position controls wind');
});

test('mix percentages remain at 100 and handle activating a model from an exclusive mix', () => {
    const mix = [{ variant: 'tall', percentage: 100 }, { variant: 'tiny', percentage: 0 }, { variant: 'small', percentage: 0 }];
    const changed = changeGrassMixShare(mix, 1, 30);
    assert.deepEqual(changed.map(entry => entry.percentage), [70, 30, 0]);
    assert.equal(mix[0].percentage, 100);
    const redistributed = changeGrassMixShare(mix, 0, 45);
    assert.deepEqual(redistributed.map(entry => entry.percentage), [45, 28, 27]);
    assert.equal(redistributed.reduce((sum, entry) => sum + entry.percentage, 0), 100);
});

test('mixed placement assigns every candidate once and preserves variant sizes across batches', () => {
    const mixed = { ...config, variants: [{ weight: .4, heightRatio: 1 }, { weight: .6, heightRatio: .15 }] };
    const slow = new GrassPlacementJob(-2, 3, mixed, flat);
    const fast = new GrassPlacementJob(-2, 3, mixed, flat);
    while (!slow.done) slow.advance(32);
    while (!fast.done) fast.advance(4096);
    assert.deepEqual(slow.nearBuffer, fast.nearBuffer);
    assert.deepEqual(slow.variantIndices, fast.variantIndices);
    assert.equal(slow.count, slow.cells * slow.cells);
    assert.ok(slow.variantCounts && slow.variantIndices);
    assert.equal(slow.variantCounts[0] + slow.variantCounts[1], slow.count);
    assert.ok(Math.abs(slow.variantCounts[0] / slow.count - .4) < .08);
    for (let i = 0; i < slow.count; i++) {
        const m = slow.nearBuffer;
        const height = Math.hypot(m[i * 16 + 4], m[i * 16 + 5], m[i * 16 + 6]);
        const nominal = config.height * mixed.variants[slow.variantIndices[i]].heightRatio;
        assert.ok(height >= nominal * .649 && height <= nominal * 1.351);
    }
});

test('random scatter fills patch bounds without a periodic grid-row signal', () => {
    const job = new GrassPlacementJob(-3, 4, { ...config, density: 6 }, flat);
    while (!job.done) job.advance(256);
    assert.equal(job.count, job.cells * job.cells, 'density retains the original candidate count');
    for (const [offset, origin] of [[12, -48], [14, 64]]) {
        let cosine = 0, sine = 0;
        const bins = new Uint32Array(16);
        for (let i = 0; i < job.count; i++) {
            const local = job.nearBuffer[i * 16 + offset] - origin;
            assert.ok(local >= 0 && local < 16);
            bins[Math.floor(local)]++;
            const phase = local / 16 * job.cells * Math.PI * 2;
            cosine += Math.cos(phase); sine += Math.sin(phase);
        }
        assert.ok(Math.hypot(cosine, sine) / job.count < .06, 'no coherent signal at the former row spacing');
        for (const count of bins) assert.ok(count > job.count / 32 && count < job.count / 8, 'coverage spans the full patch');
    }
});

test('placement is identical regardless of frame batch size and reuses imported matrices for both LODs', () => {
    const slow = new GrassPlacementJob(-3, 4, config, flat);
    const fast = new GrassPlacementJob(-3, 4, config, flat);
    slow.advance(32);
    assert.equal(slow.cursor, 32);
    assert.equal(slow.done, false);
    while (!slow.done) slow.advance(32);
    while (!fast.done) fast.advance(4096);
    assert.equal(slow.count, fast.count);
    assert.deepEqual(slow.nearBuffer, fast.nearBuffer);
    assert.equal(slow.nearBuffer, slow.midBuffer);
});

test('direct matrix layout matches Babylon composition with lean and independent scales', () => {
    const actual = new Float32Array(16);
    writeGrassMatrix(actual, 0, -20, 2.015, 7, .65, .9, 1.1, .14, -2.1, -.08);
    const expected = Matrix.Compose(new Vector3(.65, .9, 1.1), Quaternion.FromEulerAngles(.14, -2.1, -.08), new Vector3(-20, 2.015, 7));
    for (let i = 0; i < 16; i++) assert.ok(Math.abs(actual[i] - expected.m[i]) < 1e-6);
    const job = new GrassPlacementJob(0, 0, config, flat);
    job.advance(1);
    const m = job.nearBuffer;
    assert.ok(Math.abs(m[13] - 2.015) < 1e-6);
    assert.ok(Math.abs(m[4]) + Math.abs(m[6]) > 0, 'grass has a nonvertical lean');
});

test('pooled buffers are reused, Hybrid scales stay distinct and rejected terrain produces no instances', () => {
    const first = new GrassPlacementJob(0, 0, { ...config, midImported: false }, flat);
    while (!first.done) first.advance(256);
    assert.notEqual(first.nearBuffer, first.midBuffer);
    assert.notEqual(first.nearBuffer[0], first.midBuffer[0]);
    const rejected = new GrassPlacementJob(1, 0, { ...config, midImported: false }, { ...flat, excludedAt: () => true }, first.nearBuffer, first.midBuffer);
    assert.equal(rejected.nearBuffer, first.nearBuffer);
    assert.equal(rejected.midBuffer, first.midBuffer);
    while (!rejected.done) rejected.advance(256);
    assert.equal(rejected.count, 0);
});
