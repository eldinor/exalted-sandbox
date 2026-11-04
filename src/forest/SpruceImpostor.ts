import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { DepthPass } from '../render/depthPass.ts';
import type { ForestMaterials } from './ForestMaterials.ts';
import { selectImpostorView, type ImpostorView } from './ImpostorViews.ts';

export interface SpruceAtlas { version: number; columns: number; rows: number; tileSize: number; planeSize: number; sourceHeight: number;
    center: [number,number,number]; views: ImpostorView[]; alphaCutoff: number; }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function number(value: unknown): number { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid spruce atlas number.'); return value; }
function triple(value: unknown): [number,number,number] {
    if (!Array.isArray(value) || value.length !== 3) throw new Error('Invalid spruce atlas vector.');
    return [number(value[0]),number(value[1]),number(value[2])];
}
export function parseSpruceAtlas(value: unknown): SpruceAtlas {
    if (!record(value) || value.version !== 1 || !Array.isArray(value.views)) throw new Error('Unsupported spruce atlas metadata.');
    const columns = number(value.columns), rows = number(value.rows), tileSize = number(value.tileSize), planeSize = number(value.planeSize);
    if (![columns,rows,tileSize].every(v => Number.isInteger(v) && v > 0) || columns * tileSize > 8192 || rows * tileSize > 8192
        || planeSize <= 0 || value.views.length < 1 || value.views.length > columns * rows) throw new Error('Invalid spruce atlas dimensions.');
    const alphaCutoff = number(value.alphaCutoff); if (alphaCutoff <= 0 || alphaCutoff >= 1) throw new Error('Invalid spruce atlas cutout.');
    const sourceHeight = number(value.sourceHeight); if (sourceHeight <= 0) throw new Error('Invalid spruce atlas height.');
    const views = value.views.map(view => {
        if (!record(view)) throw new Error('Invalid spruce atlas view.');
        const frame = { direction: triple(view.direction), right: triple(view.right), up: triple(view.up) };
        const dot = (a: readonly number[], b: readonly number[]) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
        if ([frame.direction,frame.right,frame.up].some(vector => Math.abs(dot(vector,vector)-1) > .001)
            || Math.abs(dot(frame.direction,frame.right)) > .001 || Math.abs(dot(frame.direction,frame.up)) > .001
            || Math.abs(dot(frame.right,frame.up)) > .001) throw new Error('Invalid spruce atlas basis.');
        return frame;
    });
    return { version: 1, columns, rows, tileSize, planeSize, sourceHeight, center: triple(value.center), alphaCutoff, views };
}

/** Two-triangle camera-facing card, with object-space normals and the same alpha/depth mapping.
 * Initial prototype: discrete views, fixed object yaw; planar depth is an approximation.
 */
export class SpruceImpostor {
    readonly mesh: Mesh;
    readonly material: ShaderMaterial;
    readonly prepass: ShaderMaterial;
    readonly center = new Vector3();
    readonly colour: Texture;
    readonly normal: Texture;
    private readonly source: PBRMaterial;
    private readonly positions = new Float32Array(12);
    private readonly normals = new Float32Array(12);
    private readonly uvs = new Float32Array(8);
    private readonly direction = new Vector3();
    private readonly right = new Vector3();
    private readonly up = new Vector3();
    private previous = -1;
    frame = 0;
    scale = 1;
    readonly origin = new Vector3();
    constructor(scene: Scene, readonly atlas: SpruceAtlas, shading: ForestMaterials, private readonly depth: DepthPass) {
        this.colour = new Texture(`${import.meta.env.BASE_URL}terrain/forest/blue-spruce/impostor-colour.png`, scene, true, false, Texture.BILINEAR_SAMPLINGMODE);
        this.normal = new Texture(`${import.meta.env.BASE_URL}terrain/forest/blue-spruce/impostor-normal.png`, scene, true, false, Texture.BILINEAR_SAMPLINGMODE);
        this.colour.gammaSpace = true; this.colour.hasAlpha = true; this.normal.gammaSpace = false;
        for (const texture of [this.colour,this.normal]) texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
        this.source = new PBRMaterial('spruce-impostor-source', scene);
        this.source.albedoTexture = this.colour; this.source.bumpTexture = this.normal;
        this.source.backFaceCulling = false; this.source.roughness = .8;
        this.source.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHATEST; this.source.alphaCutOff = atlas.alphaCutoff;
        this.material = shading.create(this.source, undefined, true); this.prepass = shading.create(this.source, 'PROP_PREPASS', true);
        this.mesh = new Mesh('spruce-impostor', scene);
        const geometry = new VertexData(); geometry.positions = this.positions; geometry.normals = this.normals; geometry.uvs = this.uvs;
        geometry.indices = [0,1,2,0,2,3]; geometry.applyToMesh(this.mesh, true);
        this.mesh.material = this.material; this.mesh.isPickable = false; this.mesh.renderingGroupId = 1;
        depth.registerCaster(this.mesh, this.prepass);
    }
    update(camera: Vector3): void {
        this.center.set(this.atlas.center[0],this.atlas.center[1],this.atlas.center[2]).scaleInPlace(this.scale).addInPlace(this.origin);
        camera.subtractToRef(this.center, this.direction); this.direction.normalize();
        const index = selectImpostorView(this.atlas.views, this.direction.x, this.direction.y, this.direction.z); this.frame = index;
        const frame = this.atlas.views[index]; this.right.copyFromFloats(...frame.right);
        const dot = Vector3.Dot(this.right,this.direction);
        this.right.x -= this.direction.x * dot; this.right.y -= this.direction.y * dot; this.right.z -= this.direction.z * dot;
        this.right.normalize(); Vector3.CrossToRef(this.right,this.direction,this.up); this.up.normalize();
        const radius = this.atlas.planeSize * this.scale / 2;
        for (let i = 0; i < 4; i++) {
            const x = i === 0 || i === 3 ? -radius : radius, y = i < 2 ? -radius : radius;
            this.positions[i*3] = this.center.x + this.right.x*x + this.up.x*y;
            this.positions[i*3+1] = this.center.y + this.right.y*x + this.up.y*y;
            this.positions[i*3+2] = this.center.z + this.right.z*x + this.up.z*y;
            this.normals[i*3] = this.direction.x; this.normals[i*3+1] = this.direction.y; this.normals[i*3+2] = this.direction.z;
        }
        this.mesh.updateVerticesData('position',this.positions,true); this.mesh.updateVerticesData('normal',this.normals);
        if (index !== this.previous) {
            this.previous = index;
            const column = index % this.atlas.columns, row = Math.floor(index / this.atlas.columns), inset = .5 / this.atlas.tileSize;
            const left = (column + inset) / this.atlas.columns, right = (column + 1 - inset) / this.atlas.columns;
            const top = (row + inset) / this.atlas.rows, bottom = (row + 1 - inset) / this.atlas.rows;
            this.uvs.set([left,bottom,right,bottom,right,top,left,top]); this.mesh.updateVerticesData('uv',this.uvs);
        }
    }
    dispose(): void {
        this.depth.unregisterCaster(this.mesh); this.mesh.dispose(); this.source.dispose(); this.colour.dispose(); this.normal.dispose();
    }
}
