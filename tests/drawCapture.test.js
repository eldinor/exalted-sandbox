import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { captureDraws } from '../src/core/drawCapture.ts';

test('draw capture separates passes, accounts for instances, and restores rendering methods', async () => {
    const engine = new NullEngine(), scene = new Scene(engine), mesh = new Mesh('desert:batch', scene);
    engine.drawElementsType = () => {};
    engine.drawArraysType = () => {};
    mesh.render = function () { engine.drawElementsType(0, 0, 30, 4); return this; };
    const render = mesh.render, draw = engine.drawElementsType;
    try {
        const capture = captureDraws(scene, 2);
        // A partial frame before the next scene start must not enter the average.
        engine.drawElementsType(0, 0, 999);
        await assert.rejects(captureDraws(scene, 1), /already capturing/);
        for (let frame = 0; frame < 2; frame++) {
            scene.onBeforeRenderObservable.notifyObservers(scene);
            engine.currentRenderPassId = 0; mesh.render();
            engine.currentRenderPassId = 7; mesh.render();
            engine.currentRenderPassId = 0; engine.drawArraysType(0, 0, 3);
            scene.onAfterRenderObservable.notifyObservers(scene);
        }
        const report = await capture;
        assert.equal(report.drawsPerFrame, 3);
        assert.equal(report.indicesPerFrame, 240);
        assert.equal(report.rows.find(row => row.pass === 'pass:7').indicesPerFrame, 120);
        assert.equal(report.rows.find(row => row.mesh === 'fullscreen/other').verticesPerFrame, 3);
        assert.equal(mesh.render, render); assert.equal(engine.drawElementsType, draw);
    } finally { scene.dispose(); engine.dispose(); }
});

test('disposing a scene cancels a capture and restores engine methods', async () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    const draw = engine.drawElementsType;
    await assert.rejects(captureDraws(scene, 0), /1–600/);
    const capture = captureDraws(scene, 2);
    scene.dispose();
    await assert.rejects(capture, /disposed during/);
    assert.equal(engine.drawElementsType, draw);
    engine.dispose();
});
