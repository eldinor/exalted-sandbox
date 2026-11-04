/** Spatial streaming with visible chunks merged into shared per-pass batches. */
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Geometry } from '@babylonjs/core/Meshes/geometry';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { Frustum } from '@babylonjs/core/Maths/math.frustum';
import { BoundingInfo } from '@babylonjs/core/Culling/boundingInfo';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Plane } from '@babylonjs/core/Maths/math.plane';
import type { Scene } from '@babylonjs/core/scene';
import type { ShadowSystem } from '../render/shadows.ts';
import type { DepthPass } from '../render/depthPass.ts';
import type { PropBatch } from './desertProps.ts';
import { partitionPropChunks, chunkInRange, selectPropChunk, type PropChunk } from './propChunks.ts';

interface BufferMesh {
    mesh: Mesh;
    buffer: Float32Array;
    ids: Uint32Array;
    count: number;
    registered: boolean;
}
interface PassPair { near: BufferMesh; far: BufferMesh; }
interface Group {
    batch: PropBatch;
    chunks: PropChunk[];
    bounds: Float32Array;
    nearIds: Uint32Array;
    farIds: Uint32Array;
    nearCount: number;
    farCount: number;
    passes: PassPair[];
}

/** Conservative full-detail spheres also cover lower LODs and maximum wind. */
export function propSphereInFrustum(bounds: Float32Array, index: number, planes: readonly Plane[]): boolean {
    const o = index * 4;
    for (const plane of planes) {
        if (plane.normal.x * bounds[o] + plane.normal.y * bounds[o+1] + plane.normal.z * bounds[o+2] + plane.d < -bounds[o+3]) return false;
    }
    return true;
}

export class DesertPropChunks {
    private readonly groups: Group[];
    private readonly cameraMatrix = new Matrix();
    private readonly cameraPlanes = Frustum.GetPlanes(Matrix.Identity());
    private readonly shadowPlanes = Array.from({ length: 3 }, () => Frustum.GetPlanes(Matrix.Identity()));
    private readonly minimum = new Vector3();
    private readonly maximum = new Vector3();
    readonly stats = { chunkSize: 0, totalChunks: 0, activeChunks: 0, pooledSlots: 0, activeMeshes: 0, depthMeshes: 0, shadowMeshes: [0,0,0] };
    triangles = 0;
    visibleInstances = 0;

    constructor(private readonly scene: Scene, batches: PropBatch[], private readonly shadows: ShadowSystem,
        private readonly depth: DepthPass, readonly size: number) {
        this.stats.chunkSize = size;
        const matrix = new Matrix(), position = new Vector3();
        this.groups = batches.map(batch => {
            const chunks = partitionPropChunks(batch.centers as Float32Array, size);
            this.stats.totalChunks += chunks.length;
            this.shadows.unregisterCaster(batch.mesh); this.depth.unregisterCaster(batch.mesh);
            if (batch.far) { this.shadows.unregisterCaster(batch.far); this.depth.unregisterCaster(batch.far); }
            batch.mesh.setEnabled(false); batch.far?.setEnabled(false);
            // Read the shared prototype geometry, not the template's all-world instance bounds.
            const min = new Vector3(Infinity,Infinity,Infinity), max = new Vector3(-Infinity,-Infinity,-Infinity);
            const vertices = batch.data.positions!;
            for (let v = 0; v < vertices.length; v += 3) {
                position.set(vertices[v],vertices[v+1],vertices[v+2]);
                min.minimizeInPlace(position); max.maximizeInPlace(position);
            }
            const raw = new BoundingInfo(min,max);
            const bounds = new Float32Array(batch.names.length * 4);
            for (let i = 0; i < batch.names.length; i++) {
                Matrix.FromArrayToRef(batch.all!, i * 16, matrix);
                Vector3.TransformCoordinatesToRef(raw.boundingSphere.center, matrix, position);
                const m = matrix.m;
                const scale = Math.max(Math.hypot(m[0],m[1],m[2]), Math.hypot(m[4],m[5],m[6]), Math.hypot(m[8],m[9],m[10]));
                bounds[i*4] = position.x; bounds[i*4+1] = position.y; bounds[i*4+2] = position.z;
                bounds[i*4+3] = raw.boundingSphere.radius * scale + .01 + (batch.windEnabled ? 3 : 0);
            }
            const passes = Array.from({ length: 4 }, (_, pass) => ({
                near: this.createMesh(batch.mesh, batch.names.length, `${pass}:near`, pass),
                far: this.createMesh(batch.far!, batch.names.length, `${pass}:far`, pass),
            }));
            this.stats.pooledSlots += passes.length;
            return { batch, chunks, bounds, nearIds: new Uint32Array(batch.names.length),
                farIds: new Uint32Array(batch.names.length), nearCount: 0, farCount: 0, passes };
        });
    }

    private createMesh(source: Mesh, capacity: number, suffix: string, pass: number): BufferMesh {
        const mesh = new Mesh(`${source.name}:chunk:${suffix}`, this.scene);
        // Thin-instance attributes live on Geometry. Each pass needs its own
        // bindings, with non-owning wrappers around the prototype's GPU buffers.
        const geometry = new Geometry(mesh.name, this.scene);
        for (const kind of ['position','normal','uv']) {
            const vertex = source.geometry!.getVertexBuffer(kind);
            if (!vertex) continue;
            geometry.setVerticesBuffer(new VertexBuffer(this.scene.getEngine(), vertex.getWrapperBuffer(), kind, {
                stride: vertex.byteStride, offset: vertex.byteOffset, useBytes: true,
                size: vertex.getSize(), type: vertex.type, normalized: vertex.normalized, takeBufferOwnership: false,
            }), source.getTotalVertices());
        }
        const indexBuffer = source.geometry!.getIndexBuffer()!;
        indexBuffer.references++;
        geometry.setIndexBuffer(indexBuffer, source.getTotalVertices(), source.getTotalIndices(), indexBuffer.is32Bits);
        geometry.applyToMesh(mesh);
        mesh.sideOrientation = source.sideOrientation; mesh.material = source.material;
        mesh.renderingGroupId = 1; mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = false;
        // Explicit shadow render lists ignore layer masks. Shadow-only batches
        // must never enter the camera's normal beauty pass.
        if (pass > 0) mesh.layerMask = 0;
        const buffer = new Float32Array(capacity * 16);
        mesh.thinInstanceSetBuffer('matrix', buffer, 16, false);
        mesh.thinInstanceCount = 0; mesh.setEnabled(false);
        mesh.doNotSyncBoundingInfo = true;
        return { mesh, buffer, ids: new Uint32Array(capacity), count: 0, registered: false };
    }

    private compact(group: Group, out: BufferMesh, ids: Uint32Array, count: number, planes: readonly Plane[]): void {
        let visible = 0, changed = false;
        for (let j = 0; j < count; j++) {
            const id = ids[j];
            if (!propSphereInFrustum(group.bounds, id, planes)) continue;
            if (out.ids[visible] !== id) changed = true;
            out.ids[visible++] = id;
        }
        changed ||= visible !== out.count;
        out.count = visible;
        out.mesh.setEnabled(visible > 0);
        if (!changed) return;
        out.mesh.thinInstanceCount = visible;
        if (!visible) return;
        for (let j = 0; j < visible; j++) {
            const offset = out.ids[j] * 16;
            for (let k = 0; k < 16; k++) out.buffer[j*16+k] = group.batch.all![offset+k];
        }
        out.mesh.thinInstanceBufferUpdated('matrix');
        out.mesh.thinInstanceRefreshBoundingInfo();
        if (group.batch.windEnabled) {
            const info = out.mesh.getBoundingInfo();
            this.minimum.copyFrom(info.minimum).addInPlaceFromFloats(-3,-3,-3);
            this.maximum.copyFrom(info.maximum).addInPlaceFromFloats(3,3,3);
            info.reConstruct(this.minimum, this.maximum, out.mesh.getWorldMatrix());
        }
    }

    update(focus: Vector3, rebuild: boolean): void {
        if (rebuild) {
            this.triangles = this.visibleInstances = this.stats.activeChunks = 0;
            for (const group of this.groups) {
                const b = group.batch, radius = b.distance + 6, nearDistance = b.distance > 100 ? 30 : 16;
                group.nearCount = group.farCount = 0;
                for (const chunk of group.chunks) {
                    if (!chunkInRange(chunk, focus.x, focus.z, radius)) continue;
                    const before = group.nearCount + group.farCount;
                    selectPropChunk(chunk, b.centers as Float32Array, focus.x, focus.z, radius, nearDistance,
                        group.nearIds, group.farIds, group);
                    if (before < group.nearCount + group.farCount) this.stats.activeChunks++;
                }
                b.nearCount = group.nearCount; b.farCount = group.farCount; b.count = group.nearCount + group.farCount;
                this.visibleInstances += b.count;
                this.triangles += (group.nearCount * b.mesh.getTotalIndices() + group.farCount * b.far!.getTotalIndices()) / 3;
            }
        }
        const camera = this.scene.activeCamera;
        if (!camera) return;
        camera.getViewMatrix().multiplyToRef(camera.getProjectionMatrix(), this.cameraMatrix);
        Frustum.GetPlanesToRef(this.cameraMatrix, this.cameraPlanes);
        for (let i = 0; i < 3; i++) Frustum.GetPlanesToRef(this.shadows.matrices[i], this.shadowPlanes[i]);
        this.stats.activeMeshes = this.stats.depthMeshes = 0;
        this.stats.shadowMeshes.fill(0);
        for (const group of this.groups) for (let pass = 0; pass < 4; pass++) {
            const pair = group.passes[pass], planes = pass === 0 ? this.cameraPlanes : this.shadowPlanes[pass-1];
            this.compact(group, pair.near, group.nearIds, group.nearCount, planes);
            this.compact(group, pair.far, group.farIds, group.farCount, planes);
            this.syncPass(pair.near, pass, group.batch); this.syncPass(pair.far, pass, group.batch);
        }
    }

    private syncPass(out: BufferMesh, pass: number, batch: PropBatch): void {
        const visible = out.count > 0;
        if (visible && !out.registered) {
            if (pass === 0) this.depth.registerCaster(out.mesh, batch.prepass!);
            else this.shadows.registerCaster(out.mesh, i => batch.shadowMats![i], 1, pass-1);
        } else if (!visible && out.registered) {
            if (pass === 0) this.depth.unregisterCaster(out.mesh);
            else this.shadows.unregisterCaster(out.mesh);
        }
        out.registered = visible;
        if (visible) {
            this.stats.activeMeshes++;
            if (pass === 0) this.stats.depthMeshes++;
            else this.stats.shadowMeshes[pass-1]++;
        }
    }

    dispose(): void {
        for (const group of this.groups) for (const pair of group.passes) for (const out of [pair.near,pair.far]) {
            this.shadows.unregisterCaster(out.mesh); this.depth.unregisterCaster(out.mesh); out.mesh.dispose();
        }
        this.groups.length = 0;
    }
}
