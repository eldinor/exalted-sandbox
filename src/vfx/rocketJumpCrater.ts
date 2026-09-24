/** Persistent, terrain-conforming visual crater pool for rocket-jump impacts. */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Terrain } from '../terrain/terrain.ts';

const CRATER_COUNT = 12;
const SEGMENTS = 48;
const RINGS = 5;
const PROFILE = [-.13, -.105, -.035, .075, .008] as const;

/** Recycles the oldest of twelve persistent crater surfaces to keep draw cost bounded. */
export class RocketJumpCraters {
    private readonly meshes: Mesh[] = [];
    private readonly material: StandardMaterial;
    private next = 0;

    constructor(private readonly scene: Scene, private readonly terrain: Terrain) {
        this.material = new StandardMaterial('rocket jump crater surface', scene);
        this.material.disableLighting = true;
        this.material.diffuseColor = Color3.White();
        this.material.emissiveColor = new Color3(.16, .075, .025);
        this.material.alpha = .92;
        this.material.backFaceCulling = false;
        this.material.disableDepthWrite = true;
        for (let i = 0; i < CRATER_COUNT; i++) this.meshes.push(this.createMesh(i));
    }

    /** Stamp a dark, irregular bowl and rim only where the deformation mask permits soft ground. */
    stamp(x: number, z: number, radius = 1.65): void {
        const weights = this.terrain.deform.surfaceWeightsAt?.(x, z);
        if (weights && weights[0] + weights[1] < .01) return;
        const mesh = this.meshes[this.next];
        const slot = this.next;
        this.next = (this.next + 1) % this.meshes.length;
        const positions = new Float32Array(RINGS * SEGMENTS * 3);
        const colors = new Float32Array(RINGS * SEGMENTS * 4);
        for (let ring = 0; ring < RINGS; ring++) {
            const u = ring / (RINGS - 1);
            for (let segment = 0; segment < SEGMENTS; segment++) {
                const angle = segment / SEGMENTS * Math.PI * 2;
                const wobble = 1 + .055 * Math.sin(angle * 5 + slot * 1.7) + .03 * Math.sin(angle * 11 - slot);
                const r = radius * u * wobble;
                const px = Math.cos(angle) * r;
                const pz = Math.sin(angle) * r;
                const index = ring * SEGMENTS + segment;
                const po = index * 3;
                positions[po] = px;
                positions[po + 1] = this.terrain.heightAt(x + px, z + pz) + PROFILE[ring] + .018;
                positions[po + 2] = pz;
                const co = index * 4;
                const edge = ring === RINGS - 1;
                colors[co] = edge ? .20 : ring === 3 ? .24 : .055 + ring * .018;
                colors[co + 1] = edge ? .12 : ring === 3 ? .095 : .026 + ring * .012;
                colors[co + 2] = edge ? .055 : ring === 3 ? .025 : .012;
                colors[co + 3] = edge ? 0 : ring === 3 ? .62 : .88;
            }
        }
        mesh.position.set(x, 0, z);
        mesh.updateVerticesData(VertexBuffer.PositionKind, positions, false, false);
        mesh.updateVerticesData(VertexBuffer.ColorKind, colors, false, false);
        mesh.refreshBoundingInfo();
        mesh.setEnabled(true);
    }

    private createMesh(slot: number): Mesh {
        const mesh = new Mesh(`rocket jump crater ${slot}`, this.scene);
        const positions = new Float32Array(RINGS * SEGMENTS * 3);
        const colors = new Float32Array(RINGS * SEGMENTS * 4);
        const indices: number[] = [];
        for (let ring = 0; ring < RINGS - 1; ring++) for (let segment = 0; segment < SEGMENTS; segment++) {
            const next = (segment + 1) % SEGMENTS;
            const a = ring * SEGMENTS + segment;
            const b = ring * SEGMENTS + next;
            const c = (ring + 1) * SEGMENTS + segment;
            const d = (ring + 1) * SEGMENTS + next;
            indices.push(a, c, b, b, c, d);
        }
        const data = new VertexData();
        data.positions = positions;
        data.colors = colors;
        data.indices = indices;
        data.applyToMesh(mesh, true);
        mesh.hasVertexAlpha = true;
        mesh.material = this.material;
        mesh.renderingGroupId = 2;
        mesh.isPickable = false;
        mesh.setEnabled(false);
        return mesh;
    }

    dispose(): void {
        for (const mesh of this.meshes) mesh.dispose();
        this.material.dispose();
    }
}
