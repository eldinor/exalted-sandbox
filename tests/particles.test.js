import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SprayField, SNOW_SURF_POWDER_DRAG } from '../src/vfx/particles.ts';
import { SurfWake } from '../src/vfx/surfWake.ts';

for (const [biome, weights] of [['snow', new Float32Array([1, 0])], ['sand', new Float32Array([0, 1])]]) {
    test(`${biome} surf spray resumes after repeated location changes`, () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        try {
            const texture = RawTexture.CreateRGBATexture(new Uint8Array([255, 255, 255, 255]), 1, 1, scene);
            const terrain = {
                exalted: true, useDesertTextures: false,
                heightfield: { heightTex: texture },
                deform: { surfaceWeightsAt: () => weights },
                heightAt: () => 60,
            };
            const spray = new SprayField(scene, terrain, { lut: texture }, { maps: [texture, texture, texture] });
            const cameraPosition = new Vector3(0, 65, 0);
            for (let teleport = 0; teleport < 2; teleport++) {
                spray.reset();
                assert.equal(spray.liveCount, 0);
                assert.equal(spray.mesh.isVisible, false);
                spray.emit(0, 65, 0, 2, 8, 0, .15, .5, 0, 1);
                spray.update(1 / 60, cameraPosition);
                assert.equal(spray.liveCount, 1);
                assert.equal(spray.sand[0], biome === 'sand' ? 1 : 0);
                assert.equal(spray.mesh.isVisible, true, 'new surf particles must render after teleport');
                for (let frame = 0; frame < 90; frame++) spray.update(1 / 60, cameraPosition);
                assert.equal(spray.liveCount, 0);
                assert.equal(spray.mesh.isVisible, false);
            }
        } finally {
            scene.dispose();
            engine.dispose();
        }
    });
}

test('grass surf keeps each sample biome through boundaries, emits blades, and resets on teleport', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const originalRandom = Math.random;
    try {
        const texture = RawTexture.CreateRGBATexture(new Uint8Array([255,255,255,255]), 1, 1, scene);
        const terrain = {
            exalted: false, heightfield: { heightTex: texture },
            deform: { surfaceWeightsAt: () => new Float32Array([1,0]) }, heightAt: () => 0,
        };
        const controller = {
            position: new Vector3(), velocity: new Vector3(0,0,12),
            facing: 0, surf: 1, speed: 12, carve: 0,
            flight: { active: false }, rocketJump: { active: false }, swimming: { active: false },
        };
        const emissions = [];
        const wake = new SurfWake(scene, { lut: texture }, {
            maps: [texture,texture,texture], registerCaster: () => {},
        }, controller, { emit: (...args) => emissions.push(args) }, terrain);
        wake.grassWeightAt = (_x,z) => z < 10 ? 1 : 0;
        const lay = () => {
            wake._odo += .4;
            controller.position.z += .4;
            wake._writeHead();
        };
        for (let i = 0; i < 12; i++) lay();
        wake._resolve();
        for (let i = 0; i < wake._count; i++) assert.equal(wake._texData[(96*2+i)*4+3],1);
        Math.random = () => .1;
        wake._plume(1/30);
        assert.ok(emissions.length > 0);
        assert.ok(emissions.every(args => args[8] === 6), 'grass produces blades without white curtain or drift');
        assert.ok(emissions.every(args => args[6] >= .14 && args[6] <= .26 && args[7] <= 1), 'visible short-lived fragments');

        controller.position.z = 12;
        lay(); lay(); wake._resolve();
        assert.equal(wake._texData[96*2*4+3],0);
        assert.equal(wake._texData[(96*2+3)*4+3],1, 'old grass retains its colour when the avatar leaves the biome');

        wake.reset();
        assert.equal(wake._count,0);
        emissions.length = 0;
        wake._plume(1/30);
        assert.equal(emissions.length,0);
        controller.position.z = 0;
        controller.flight.active = true;
        for (let i = 0; i < 12; i++) lay();
        wake._resolve(); wake._plume(1/30);
        assert.equal(emissions.length,0,'airborne grass samples do not shed particles');
        wake.reset(); controller.flight.active = false; controller.swimming.active = true;
        controller.position.z = 0;
        for (let i = 0; i < 12; i++) lay();
        wake._resolve(); wake._plume(1/30);
        assert.equal(emissions.length,0,'swimming grass samples do not shed particles');
    } finally {
        Math.random = originalRandom;
        scene.dispose(); engine.dispose();
    }
});

test('tiny grass particles retain their kind, settle, expire and reuse the pool after teleport', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
        const texture = RawTexture.CreateRGBATexture(new Uint8Array([255,255,255,255]), 1, 1, scene);
        const terrain = {
            exalted: true, useDesertTextures: false, heightfield: { heightTex: texture },
            deform: { surfaceWeightsAt: () => new Float32Array([0,1]) }, heightAt: () => 0,
        };
        const spray = new SprayField(scene, terrain, { lut: texture }, { maps: [texture,texture,texture] });
        for (let teleport = 0; teleport < 2; teleport++) {
            spray.reset();
            spray.emit(0,.1,0,1,-1,0,.1,.8,6,1.8);
            spray.update(1/60,new Vector3(0,3,0));
            assert.equal(spray.kind[0],6);
            assert.equal(spray.sand[0],0,'grass fragments stay grass over another biome');
            assert.equal(spray._texData[(5120)*4+2],6);
            assert.equal(spray.liveCount,1);
            for (let i = 0; i < 90; i++) spray.update(1/60,new Vector3(0,3,0));
            assert.equal(spray.liveCount,0);
            assert.equal(spray.mesh.isVisible,false);
        }
    } finally { scene.dispose(); engine.dispose(); }
});

test('desert and grass particles follow the snow curtain vertical trajectory', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
        const texture = RawTexture.CreateRGBATexture(new Uint8Array([255,255,255,255]), 1, 1, scene);
        let sand = false;
        const terrain = {
            exalted: true, useDesertTextures: false, heightfield: { heightTex: texture },
            deform: { surfaceWeightsAt: () => sand ? [0,1] : [1,0] }, heightAt: () => 0,
        };
        const spray = new SprayField(scene, terrain, { lut: texture }, { maps: [texture,texture,texture] });
        spray.emit(0,30,0,2,2,0,.1,5,0,SNOW_SURF_POWDER_DRAG);
        sand = true;
        spray.emit(0,30,0,2,2,0,.1,5,0,SNOW_SURF_POWDER_DRAG);
        spray.emit(0,30,0,2,2,0,.1,5,6,1.8);
        assert.equal(spray.sand[1],1);
        const camera = new Vector3(0,35,0);
        for (let frame = 0; frame < 90; frame++) {
            spray.update(1/60,camera);
            assert.equal(spray.pos[4],spray.pos[1], 'desert height matches snow during rise and fall');
            assert.equal(spray.pos[7],spray.pos[1], 'grass height matches snow during rise and fall');
            assert.equal(spray.vel[4],spray.vel[1]);
            assert.equal(spray.vel[7],spray.vel[1]);
        }
        assert.ok(spray.vel[1] < 0, 'the comparison includes falling');
        assert.notEqual(spray.pos[6],spray.pos[0], 'grass preserves its separate horizontal drag');
    } finally { scene.dispose(); engine.dispose(); }
});
