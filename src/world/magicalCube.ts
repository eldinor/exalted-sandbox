/** Animated magical shader test object beside the authored default spawn. */

import { Vector3 } from '@babylonjs/core/Maths/math';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import { ShaderLanguage } from '@babylonjs/core/Materials/shaderLanguage';
import { Constants } from '@babylonjs/core/Engines/constants';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { CharacterController } from '../character/controller.ts';
import type { Terrain } from '../terrain/terrain.ts';
import { whenReady } from '../core/gpuUtil.ts';
import { InteractionPrompt } from '../ui/interactionPrompt.ts';
import { WorldLabel } from '../ui/worldLabel.ts';

const CUBE_SIZE = 1.5;
const GROUND_CLEARANCE = 0.5;
const INTERACTION_RADIUS_SQUARED = 3 * 3;
const DISSOLVE_SECONDS = 1.25;
const PORTAL_ENTRY_RADIUS_SQUARED = 1.5 * 1.5;
const PORTAL_ENTRY_DELAY_SECONDS = 0.45;

type PortalState = 'cube' | 'dissolving' | 'portal';

/** Payload published whenever the avatar crosses into the completed portal. */
export interface PortalEnteredDetail {
    readonly id: string;
    readonly position: Readonly<{ x: number; y: number; z: number }>;
}

declare global {
    interface WindowEventMap {
        'exalted:portal-entered': CustomEvent<PortalEnteredDetail>;
    }
}

/** A 1.5 m HDR crystalline cube placed right of the default avatar spawn. */
export class MagicalCube {
    readonly mesh: Mesh;
    readonly material: ShaderMaterial;
    readonly ring: Mesh;
    readonly ringMaterial: ShaderMaterial;
    readonly surface: Mesh;
    readonly surfaceMaterial: ShaderMaterial;
    readonly portalRoot: TransformNode;
    private time = 0;
    private transition = 0;
    private portalEntryDelay = 0;
    private state: PortalState = 'cube';
    private readonly prompt = new InteractionPrompt('E', 'Press E to enter the portal');
    private readonly enteredLabel: WorldLabel;
    private readonly labelAnchor = Vector3.Zero();
    private wasInsidePortal = false;

    constructor(scene: Scene, terrain: Terrain, character: CharacterController) {
        const facing = character.facing;
        const x = character.position.x + Math.cos(facing) * 10;
        const z = character.position.z - Math.sin(facing) * 10;
        const ground = terrain.heightAt(x, z);

        this.mesh = MeshBuilder.CreateBox('magic-test:cube', { size: CUBE_SIZE }, scene);
        this.mesh.position.set(x, ground + GROUND_CLEARANCE + CUBE_SIZE * 0.5, z);
        this.mesh.renderingGroupId = 1;
        this.mesh.isPickable = false;
        this.mesh.metadata = { triangles: 12, magicTest: true };

        this.material = new ShaderMaterial('magic-test:material', scene, 'magicalCube', {
            shaderLanguage: ShaderLanguage.WGSL,
            attributes: ['position', 'normal'],
            uniforms: ['world', 'viewProjection', 'cameraPos', 'magicTime', 'magicDissolve'],
        });
        this.material.backFaceCulling = true;
        this.material.setFloat('magicTime', 0);
        this.material.setFloat('magicDissolve', 0);
        this.mesh.material = this.material;

        this.portalRoot = new TransformNode('magic-test:portal-root', scene);
        this.portalRoot.position.set(x, ground + 1.62, z);
        this.enteredLabel = new WorldLabel(scene, 'Portal entered');

        this.ring = MeshBuilder.CreateTorus('magic-test:portal-ring', {
            diameter: 2.65,
            thickness: 0.24,
            tessellation: 96,
        }, scene);
        this.ring.parent = this.portalRoot;
        this.ring.rotation.x = Math.PI * 0.5;
        this.ring.scaling.setAll(0.28);
        this.ring.renderingGroupId = 1;
        this.ring.isPickable = false;
        this.ring.isVisible = false;
        this.ring.metadata = { triangles: 192, portalTest: true };

        this.ringMaterial = new ShaderMaterial('magic-test:portal-material', scene, 'portalRing', {
            shaderLanguage: ShaderLanguage.WGSL,
            attributes: ['position', 'normal'],
            uniforms: ['world', 'viewProjection', 'cameraPos', 'portalTime', 'portalReveal'],
        });
        this.ringMaterial.backFaceCulling = false;
        this.ringMaterial.setFloat('portalTime', 0);
        this.ringMaterial.setFloat('portalReveal', 0);
        this.ring.material = this.ringMaterial;

        this.surface = MeshBuilder.CreateDisc('magic-test:portal-surface', {
            radius: 1.18,
            tessellation: 96,
            sideOrientation: Mesh.DOUBLESIDE,
        }, scene);
        this.surface.parent = this.portalRoot;
        this.surface.scaling.setAll(0.28);
        this.surface.renderingGroupId = 1;
        this.surface.isPickable = false;
        this.surface.isVisible = false;
        this.surface.metadata = { triangles: 192, portalSurfaceTest: true };

        this.surfaceMaterial = new ShaderMaterial('magic-test:portal-surface-material', scene, 'portalSurface', {
            shaderLanguage: ShaderLanguage.WGSL,
            attributes: ['position', 'normal'],
            uniforms: ['world', 'viewProjection', 'cameraPos', 'portalTime', 'portalReveal'],
        });
        this.surfaceMaterial.backFaceCulling = false;
        this.surfaceMaterial.alpha = 0.999;
        this.surfaceMaterial.alphaMode = Constants.ALPHA_COMBINE;
        this.surfaceMaterial.disableDepthWrite = true;
        this.surfaceMaterial.setFloat('portalTime', 0);
        this.surfaceMaterial.setFloat('portalReveal', 0);
        this.surface.material = this.surfaceMaterial;

        scene.onDisposeObservable.addOnce(() => this.dispose());
    }

    /** Advance the internal glow and publish the active view position. */
    update(dt: number, camera: Camera, avatarPosition: Vector3, interactPressed: boolean): void {
        this.time += dt;
        const cameraPosition = camera.position;
        this.material.setFloat('magicTime', this.time);
        this.material.setVector3('cameraPos', cameraPosition);
        this.ringMaterial.setFloat('portalTime', this.time);
        this.ringMaterial.setVector3('cameraPos', cameraPosition);
        this.surfaceMaterial.setFloat('portalTime', this.time);
        this.surfaceMaterial.setVector3('cameraPos', cameraPosition);

        const dx = avatarPosition.x - this.mesh.position.x;
        const dz = avatarPosition.z - this.mesh.position.z;
        const near = dx * dx + dz * dz <= INTERACTION_RADIUS_SQUARED;
        this.prompt.show(this.state === 'cube' && near);
        if (this.state === 'cube' && near && interactPressed) {
            // Select the nearest axis-aligned vertical cube face. The portal
            // then stays fixed instead of billboarding as the avatar moves.
            if (Math.abs(dx) > Math.abs(dz)) {
                this.portalRoot.rotation.y = dx >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
            } else {
                this.portalRoot.rotation.y = dz >= 0 ? 0 : Math.PI;
            }
            this.state = 'dissolving';
            this.transition = 0;
            this.prompt.show(false);
        }

        if (this.state === 'dissolving') {
            this.transition = Math.min(1, this.transition + dt / DISSOLVE_SECONDS);
            const eased = this.transition * this.transition * (3 - 2 * this.transition);
            this.material.setFloat('magicDissolve', eased);
            if (this.transition >= 0.34) {
                this.ring.isVisible = true;
                this.surface.isVisible = true;
                const reveal = Math.min(1, (this.transition - 0.34) / 0.66);
                const ringScale = 0.28 + 0.72 * (1 - Math.pow(1 - reveal, 3));
                this.ring.scaling.setAll(ringScale);
                this.surface.scaling.setAll(ringScale);
                this.ringMaterial.setFloat('portalReveal', reveal);
                this.surfaceMaterial.setFloat('portalReveal', reveal);
            }
            if (this.transition >= 1) {
                this.state = 'portal';
                this.portalEntryDelay = 0;
                this.mesh.isVisible = false;
                this.ring.scaling.setAll(1);
                this.surface.scaling.setAll(1);
                this.ringMaterial.setFloat('portalReveal', 1);
                this.surfaceMaterial.setFloat('portalReveal', 1);
            }
        }

        if (this.state === 'portal') {
            this.portalEntryDelay = Math.min(
                PORTAL_ENTRY_DELAY_SECONDS,
                this.portalEntryDelay + dt,
            );
        }
        const entryArmed = this.state === 'portal'
            && this.portalEntryDelay >= PORTAL_ENTRY_DELAY_SECONDS;
        const insidePortal = entryArmed
            && dx * dx + dz * dz <= PORTAL_ENTRY_RADIUS_SQUARED;
        if (insidePortal && !this.wasInsidePortal) {
            window.dispatchEvent(new CustomEvent<PortalEnteredDetail>('exalted:portal-entered', {
                detail: {
                    id: 'default-spawn-portal',
                    position: {
                        x: this.portalRoot.position.x,
                        y: this.portalRoot.position.y,
                        z: this.portalRoot.position.z,
                    },
                },
            }));
        }
        this.wasInsidePortal = insidePortal;
        this.labelAnchor.copyFrom(this.portalRoot.position);
        this.labelAnchor.y += 1.7;
        this.enteredLabel.update(this.labelAnchor, camera, insidePortal);
    }

    /** Compile the shader while the loading screen still owns the frame. */
    async warmUp(): Promise<void> {
        await whenReady(this.material, 'magical cube material', [this.mesh, false]);
        const wasVisible = this.ring.isVisible;
        this.ring.isVisible = true;
        await whenReady(this.ringMaterial, 'portal ring material', [this.ring, false]);
        this.ring.isVisible = wasVisible;
        const wasSurfaceVisible = this.surface.isVisible;
        this.surface.isVisible = true;
        await whenReady(this.surfaceMaterial, 'portal surface material', [this.surface, false]);
        this.surface.isVisible = wasSurfaceVisible;
    }

    /** Release the shader test object with the scene. */
    dispose(): void {
        this.mesh.dispose();
        this.material.dispose();
        this.ring.dispose();
        this.ringMaterial.dispose();
        this.surface.dispose();
        this.surfaceMaterial.dispose();
        this.portalRoot.dispose();
        this.prompt.dispose();
        this.enteredLabel.dispose();
    }
}
