/** Rocket-jump blast orchestration: GPU combustion, shockwave, debris and crater. */
import type { Scene } from '@babylonjs/core/scene';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { CharacterController } from '../character/controller.ts';
import type { CameraRig } from '../core/camera.ts';
import type { Terrain } from '../terrain/terrain.ts';
import type { SprayField } from './particles.ts';
import { RocketJumpParticles } from './rocketJumpParticles.ts';
import { RocketJumpCraters } from './rocketJumpCrater.ts';

const TAU = Math.PI * 2;

/** Converts the movement mode's one-frame launch signal into bounded, reusable scene effects. */
export class RocketJumpVfx {
    private readonly flash: Mesh;
    private readonly wave: Mesh;
    private readonly flashMaterial: StandardMaterial;
    private readonly waveMaterial: StandardMaterial;
    private readonly particles: RocketJumpParticles;
    private readonly craters: RocketJumpCraters;
    private age = 99;

    constructor(
        scene: Scene,
        private readonly character: CharacterController,
        private readonly terrain: Terrain,
        private readonly spray: SprayField,
        private readonly rig: CameraRig,
    ) {
        this.flashMaterial = this.makeMaterial(scene, 'rocket jump flash', new Color3(1, .38, .035), .8);
        this.waveMaterial = this.makeMaterial(scene, 'rocket jump shockwave', new Color3(1, .48, .035), .76);
        this.particles = new RocketJumpParticles(scene);
        this.craters = new RocketJumpCraters(scene, terrain);

        this.flash = CreateSphere('rocket jump ignition', { diameter: 1, segments: 12 }, scene);
        this.wave = CreateTorus('rocket jump shockwave', { diameter: 1, thickness: .075, tessellation: 48 }, scene);
        for (const mesh of [this.flash, this.wave]) {
            mesh.isPickable = false;
            mesh.renderingGroupId = 2;
            mesh.visibility = 0;
        }
        this.flash.material = this.flashMaterial;
        this.wave.material = this.waveMaterial;
        scene.onDisposeObservable.addOnce(() => this.dispose());
    }

    /** Trigger once per accepted launch, then animate the short-lived meshes. */
    update(dt: number): void {
        const jump = this.character.rocketJump;
        if (jump.justStarted) this.blast(jump.launchX, jump.launchY, jump.launchZ);
        this.age += dt;

        const flashT = Math.min(1, this.age / .16);
        this.flash.visibility = Math.max(0, 1 - flashT) * .95;
        this.flash.scaling.setAll(.35 + flashT * 1.55);

        const waveT = Math.min(1, this.age / .48);
        this.wave.visibility = Math.max(0, 1 - waveT) * .85;
        this.wave.scaling.setAll(.6 + waveT * 5.8);

    }

    private blast(x: number, y: number, z: number): void {
        this.age = 0;
        this.flash.position.set(x, y + .3, z);
        this.wave.position.set(x, y + .055, z);
        this.rig.addTrauma(.72);
        this.particles.burst(x, y, z, this.character.position.y);
        this.craters.stamp(x, z);

        // The shared deformation mask naturally limits this crater to snow and sand.
        this.terrain.deform.brush(x, z, 1.65, .16, .075, .82, 0, 0, 1, .72);

        // Existing pooled grains provide the first-stage dust, clods and lingering fallout.
        for (let i = 0; i < 72; i++) {
            const angle = (i / 72) * TAU + Math.random() * .12;
            const speed = 2.2 + Math.random() * 5.8;
            const clod = i % 5 === 0;
            this.spray.emit(
                x + Math.cos(angle) * (.18 + Math.random() * .45),
                y + .08 + Math.random() * .18,
                z + Math.sin(angle) * (.18 + Math.random() * .45),
                Math.cos(angle) * speed,
                clod ? 2.8 + Math.random() * 3.5 : .8 + Math.random() * 2.4,
                Math.sin(angle) * speed,
                clod ? .055 + Math.random() * .05 : .035 + Math.random() * .06,
                clod ? 1.3 : 1.8 + Math.random() * 1.2,
                clod ? 1 : 0,
                clod ? .75 : 2.2,
            );
        }
    }

    private makeMaterial(scene: Scene, name: string, color: Color3, alpha: number): StandardMaterial {
        const material = new StandardMaterial(name, scene);
        material.disableLighting = true;
        material.emissiveColor = color;
        material.diffuseColor = color;
        material.alpha = alpha;
        material.disableDepthWrite = true;
        material.backFaceCulling = false;
        return material;
    }

    /** Release scene resources; gameplay state remains owned by the character controller. */
    dispose(): void {
        this.flash.dispose();
        this.wave.dispose();
        this.flashMaterial.dispose();
        this.waveMaterial.dispose();
        this.particles.dispose();
        this.craters.dispose();
    }
}
