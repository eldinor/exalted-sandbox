import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { SprayField } from '../src/vfx/particles.ts';

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
