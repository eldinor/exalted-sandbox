/**
 * Local reflection-probe test object near the authored default spawn.
 *
 * The probe is deliberately range-gated: a cubemap update renders the scene six
 * times, so retaining the last capture outside the inspection area avoids a
 * permanent cost elsewhere in the world.
 *
 * @module world/reflectiveCube
 */

import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { ReflectionProbe } from '@babylonjs/core/Probes/reflectionProbe';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { CharacterController } from '../character/controller.ts';
import type { Terrain } from '../terrain/terrain.ts';

const CUBE_SIZE = 3;
const GROUND_CLEARANCE = 0.5;
const CAPTURE_RADIUS = 20;
const CAPTURE_RADIUS_SQUARED = CAPTURE_RADIUS * CAPTURE_RADIUS;
const CAPTURE_INTERVAL_FRAMES = 4;

/** A reflective 3 m cube whose expensive dynamic probe runs only near the avatar. */
export class ReflectiveCube {
    readonly mesh: Mesh;
    readonly material: PBRMaterial;
    readonly probe: ReflectionProbe;

    private frame = 0;
    private disposed = false;

    constructor(scene: Scene, terrain: Terrain, character: CharacterController) {
        const facing = character.facing;
        const leftX = -Math.cos(facing);
        const leftZ = Math.sin(facing);
        const x = character.position.x + leftX * 10;
        const z = character.position.z + leftZ * 10;
        const ground = terrain.heightAt(x, z);

        this.mesh = MeshBuilder.CreateBox('reflection-test:cube', { size: CUBE_SIZE }, scene);
        this.mesh.position.set(x, ground + GROUND_CLEARANCE + CUBE_SIZE * 0.5, z);
        this.mesh.renderingGroupId = 1;
        this.mesh.isPickable = false;
        this.mesh.metadata = { triangles: 12, reflectionTest: true };

        this.probe = new ReflectionProbe(
            'reflection-test:probe', 512, scene, true, false, true,
        );
        this.probe.position.copyFrom(this.mesh.position);
        this.probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        this.probe.cubeTexture.level = 1;

        this.material = new PBRMaterial('reflection-test:material', scene);
        // In the metallic workflow the base color also tints reflected light.
        // A near-black value produced black metal rather than a neutral mirror.
        this.material.albedoColor = new Color3(0.42, 0.44, 0.48);
        this.material.metallic = 1;
        this.material.roughness = 0.055;
        this.material.environmentIntensity = 1.45;
        this.material.reflectionTexture = this.probe.cubeTexture;
        this.mesh.material = this.material;

        // The cube must not reflect itself. Retaining all other scene meshes
        // includes the authored world and the avatar's body, cloth and fur.
        this.probe.renderList = scene.meshes.filter(mesh => mesh !== this.mesh);

        scene.onDisposeObservable.addOnce(() => this.dispose());
    }

    /** Queue an on-demand cubemap refresh while the avatar is within 20 metres. */
    update(avatarPosition: Vector3): void {
        if (this.disposed || Vector3.DistanceSquared(avatarPosition, this.mesh.position) > CAPTURE_RADIUS_SQUARED) {
            this.frame = 0;
            return;
        }
        if (this.frame++ % CAPTURE_INTERVAL_FRAMES === 0) {
            this.probe.cubeTexture.resetRefreshCounter();
        }
    }

    /** Release the test mesh, material and six-face render target. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.probe.dispose();
        this.mesh.dispose();
        this.material.dispose();
    }
}
