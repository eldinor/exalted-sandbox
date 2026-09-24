/** Dedicated WebGPU particle layers for the rocket-jump blast. */
import type { Scene } from '@babylonjs/core/scene';
import { GPUParticleSystem } from '@babylonjs/core/Particles/gpuParticleSystem';
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.computeShader';
import '@babylonjs/core/Particles/computeShaderParticleSystem';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

function sprite(scene: Scene, hardness: number, streak = false): RawTexture {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = (x + .5) / size * 2 - 1;
        const dy = ((y + .5) / size * 2 - 1) * (streak ? .28 : 1);
        const falloff = Math.max(0, 1 - Math.hypot(dx, dy));
        const alpha = Math.pow(falloff, hardness);
        const i = (y * size + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = Math.round(alpha * 255);
    }
    const texture = RawTexture.CreateRGBATexture(
        data, size, size, scene, true, false,
        Constants.TEXTURE_TRILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE,
    );
    texture.hasAlpha = true;
    texture.wrapU = texture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    return texture;
}

function baseSystem(scene: Scene, name: string, capacity: number, texture: RawTexture): GPUParticleSystem {
    const system = new GPUParticleSystem(name, { capacity, emitRateControl: true }, scene);
    system.particleTexture = texture;
    system.emitter = new Vector3();
    system.emitRate = 0;
    system.manualEmitCount = 0;
    system.updateSpeed = 1 / 60;
    system.renderingGroupId = 2;
    system.start();
    return system;
}

/** Four independently tuned GPU simulations, burst through manual emission counts. */
export class RocketJumpParticles {
    readonly fire: GPUParticleSystem;
    readonly smoke: GPUParticleSystem;
    readonly embers: GPUParticleSystem;
    readonly sparks: GPUParticleSystem;
    private readonly textures: RawTexture[];

    constructor(scene: Scene) {
        const soft = sprite(scene, 2.4);
        const hot = sprite(scene, .55);
        const spark = sprite(scene, 1.1, true);
        this.textures = [soft, hot, spark];

        this.fire = baseSystem(scene, 'rocket jump:gpu fire', 900, hot);
        this.fire.createBoxEmitter(
            new Vector3(-1.4, -8.5, -1.4), new Vector3(1.4, -4.5, 1.4),
            new Vector3(-.22, -.06, -.22), new Vector3(.22, .08, .22),
        );
        this.fire.minLifeTime = .16; this.fire.maxLifeTime = .42;
        this.fire.minSize = .18; this.fire.maxSize = .72;
        this.fire.minEmitPower = .8; this.fire.maxEmitPower = 1.35;
        this.fire.gravity.set(0, 5.5, 0);
        this.fire.blendMode = GPUParticleSystem.BLENDMODE_ADD;
        this.fire.color1 = new Color4(1, .9, .22, .95);
        this.fire.color2 = new Color4(1, .12, .012, .78);
        this.fire.colorDead = new Color4(.28, .015, .002, 0);
        this.fire.addSizeGradient(0, .25).addSizeGradient(.28, 1).addSizeGradient(1, .15);

        this.smoke = baseSystem(scene, 'rocket jump:gpu smoke', 720, soft);
        this.smoke.createBoxEmitter(
            new Vector3(-1.8, 1.1, -1.8), new Vector3(1.8, 4.2, 1.8),
            new Vector3(-.6, .02, -.6), new Vector3(.6, .22, .6),
        );
        this.smoke.minLifeTime = 2.4; this.smoke.maxLifeTime = 4.8;
        this.smoke.minSize = .28; this.smoke.maxSize = .8;
        this.smoke.minEmitPower = .55; this.smoke.maxEmitPower = 1.1;
        this.smoke.gravity.set(.18, .38, .08);
        this.smoke.blendMode = GPUParticleSystem.BLENDMODE_STANDARD;
        this.smoke.color1 = new Color4(.10, .085, .075, .48);
        this.smoke.color2 = new Color4(.24, .20, .16, .32);
        this.smoke.colorDead = new Color4(.34, .31, .29, 0);
        this.smoke.addSizeGradient(0, .35).addSizeGradient(.45, 1.35).addSizeGradient(1, 2.1);
        this.smoke.addDragGradient(0, .9).addDragGradient(1, 2.6);

        this.embers = baseSystem(scene, 'rocket jump:gpu embers', 640, hot);
        this.embers.createBoxEmitter(
            new Vector3(-3.6, 2.8, -3.6), new Vector3(3.6, 8.5, 3.6),
            new Vector3(-.3, .02, -.3), new Vector3(.3, .28, .3),
        );
        this.embers.minLifeTime = .8; this.embers.maxLifeTime = 2.1;
        this.embers.minSize = .018; this.embers.maxSize = .065;
        this.embers.minEmitPower = .75; this.embers.maxEmitPower = 1.25;
        this.embers.gravity.set(0, -8.5, 0);
        this.embers.blendMode = GPUParticleSystem.BLENDMODE_ADD;
        this.embers.color1 = new Color4(1, .72, .12, 1);
        this.embers.color2 = new Color4(1, .12, .008, .9);
        this.embers.colorDead = new Color4(.4, .025, .002, 0);

        this.sparks = baseSystem(scene, 'rocket jump:gpu sparks', 760, spark);
        this.sparks.createBoxEmitter(
            new Vector3(-5.5, 1.2, -5.5), new Vector3(5.5, 7.5, 5.5),
            new Vector3(-.24, .02, -.24), new Vector3(.24, .18, .24),
        );
        this.sparks.minLifeTime = .28; this.sparks.maxLifeTime = .72;
        this.sparks.minSize = .025; this.sparks.maxSize = .07;
        this.sparks.minScaleX = .28; this.sparks.maxScaleX = .5;
        this.sparks.minScaleY = 2.5; this.sparks.maxScaleY = 5;
        this.sparks.minEmitPower = .8; this.sparks.maxEmitPower = 1.3;
        this.sparks.gravity.set(0, -12, 0);
        this.sparks.blendMode = GPUParticleSystem.BLENDMODE_ADD;
        this.sparks.billboardMode = Constants.PARTICLES_BILLBOARDMODE_STRETCHED;
        this.sparks.color1 = new Color4(1, .94, .42, 1);
        this.sparks.color2 = new Color4(1, .28, .015, .95);
        this.sparks.colorDead = new Color4(.7, .035, .002, 0);

    }

    /** Reposition every emitter and enqueue one GPU burst without rebuilding buffers. */
    burst(x: number, groundY: number, z: number, avatarY: number): void {
        (this.fire.emitter as Vector3).set(x, avatarY - .28, z);
        (this.smoke.emitter as Vector3).set(x, groundY + .1, z);
        (this.embers.emitter as Vector3).set(x, groundY + .08, z);
        (this.sparks.emitter as Vector3).set(x, groundY + .08, z);
        this.fire.manualEmitCount = 190;
        this.smoke.manualEmitCount = 105;
        this.embers.manualEmitCount = 88;
        this.sparks.manualEmitCount = 135;
    }

    dispose(): void {
        this.fire.dispose(); this.smoke.dispose(); this.embers.dispose(); this.sparks.dispose();
        for (const texture of this.textures) texture.dispose();
    }
}
