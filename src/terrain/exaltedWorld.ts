/** Authored roads heightmap and GLB comparison sources, with exact triangle grounding. */
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Vector2 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Constants } from '@babylonjs/core/Engines/constants';
import { MeshSurface, type MutableNormal, type MutableWorldPosition } from './meshSurface.ts';
import { roadWeight, surfaceWeights } from './surfaceTypes.ts';
import { DEFAULT_SPAWN } from '../world/spawnPoints.ts';
import { AUTHORED_WORLD_SCALE } from '../world/worldScale.ts';
import { AuthoredSurfaceMap, buildAuthoredHeightmap, decodeAuthoredPng, ROADS_HEIGHTMAP, ROADS_BIOME_MAP } from './authoredHeightmap.ts';
import { GROUND_COVERAGE_MAP, ROCK_COVERAGE_MAP, BEACH_COVERAGE_MAP } from './groundCoverage.ts';
import { correctStoneGateTriangles } from './StoneGateTriangles.ts';
import { ROAD_DISPLAY_MAP } from './roadBlending.ts';
import { readAsset } from '../core/assetDownload.ts';

export type AuthoredTerrainSource = 'glb' | 'heightmap';

/** Vertex buffers guaranteed after a successful Exalted terrain load. */
export type LoadedTerrainData = VertexData & {
    positions: NonNullable<VertexData['positions']>;
    normals: NonNullable<VertexData['normals']>;
    colors: NonNullable<VertexData['colors']>;
    indices: NonNullable<VertexData['indices']>;
};

export const EXALTED_SPAWN = Object.freeze({
    x: -DEFAULT_SPAWN.x * AUTHORED_WORLD_SCALE,
    y: 4.8,
    z: -DEFAULT_SPAWN.y * AUTHORED_WORLD_SCALE,
});

/** Load or generate, retain and query Exalted's authored terrain geometry and biome data. */
export class ExaltedWorld {
    readonly scene: Scene;
    readonly scale = AUTHORED_WORLD_SCALE;
    readonly origin = new Vector2(-936 * this.scale, -702 * this.scale);
    readonly size = 1872 * this.scale;
    readonly extent = new Vector2(1872 * this.scale, 1404 * this.scale);
    readonly heightTex: RawTexture;
    readonly auxTex: RawTexture;
    readonly _color = new Float32Array(3);
    readonly _weights = new Float32Array(2);
    minHeight = 0;
    maxHeight = 0;
    data!: LoadedTerrainData;
    surface: MeshSurface | null = null;
    surfaceMap?: RawTexture;
    biomeSurface: AuthoredSurfaceMap | null = null;

    constructor(scene: Scene, readonly source: AuthoredTerrainSource = 'glb') {
        this.scene = scene;
        // The common terrain material keeps these bindings, although Exalted's
        // shader reads imported positions, normals, and colors instead.
        this.heightTex = RawTexture.CreateRGBATexture(
            new Uint8Array([0, 0, 0, 255]), 1, 1, scene, false, false,
        );
        this.auxTex = this.heightTex;
    }

    /** Bake loader transforms into the target and derive CPU and GPU biome maps. */
    async loadInto(target: Mesh): Promise<void> {
        if (this.source === 'heightmap') {
            await this.loadHeightmapInto(target);
            return;
        }
        const url = `${import.meta.env.BASE_URL}assets/exalted/alpha-map.glb`;
        const container = await LoadAssetContainerAsync(url, this.scene);
        try {
            const ground = container.meshes.find(mesh => mesh.name === 'vis_ground');
            if (!(ground instanceof Mesh) || !ground.isVerticesDataPresent('color')) {
                throw new Error('Exalted alpha-map.glb must contain vis_ground with biome vertex colours.');
            }
            const data = VertexData.ExtractFromMesh(ground);
            data.transform(ground.computeWorldMatrix(true));
            if (!data.positions || !data.normals || !data.indices || !data.colors) {
                throw new Error('Exalted vis_ground must contain positions, normals, indices, and vertex colors.');
            }
            if (this.scale !== 1) {
                for (let i = 0; i < data.positions.length; i++) data.positions[i] *= this.scale;
            }
            data.applyToMesh(target);
            target.sideOrientation = ground.sideOrientation;
            target.useVertexColors = true;
            target.hasVertexAlpha = false;
            target.metadata = { triangles: data.indices.length / 3, source: url };
            const bounds = target.getBoundingInfo().boundingBox;
            this.minHeight = bounds.minimum.y;
            this.maxHeight = bounds.maximum.y;
            this.data = data as LoadedTerrainData;
            this.surface = new MeshSurface(data.positions, data.indices, 16, data.colors);

            const width = 469, height = 352;
            const map = new Uint8Array(width * height * 4);
            const authoredRoad = new Uint8Array(width * height);
            for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
                const x = this.origin.x + column * (this.extent.x / (width - 1));
                const z = this.origin.y + row * (this.extent.y / (height - 1));
                const weights = this.weightsAt(x, z);
                const offset = (row * width + column) * 4;
                map[offset] = Math.round(weights[0] * 255);
                map[offset + 1] = Math.round(weights[1] * 255);
                authoredRoad[row * width + column] = Math.round(roadWeight(this._color) * 255);
                map[offset + 3] = 255;
            }
            // COLOR_0 is discontinuous where Blender split biome boundary
            // vertices. Preserve full road coverage on its side of that seam,
            // then feather only outwards by two 4 m cells so the material can
            // cross-fade into the neighbouring biome without widening its
            // fully textured centre.
            const featherRadius = 2;
            for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
                const index = row * width + column;
                let coverage = authoredRoad[index] / 255;
                if (coverage < 1) {
                    for (let dz = -featherRadius; dz <= featherRadius; dz++) {
                        const sampleRow = row + dz;
                        if (sampleRow < 0 || sampleRow >= height) continue;
                        for (let dx = -featherRadius; dx <= featherRadius; dx++) {
                            const sampleColumn = column + dx;
                            if (sampleColumn < 0 || sampleColumn >= width) continue;
                            const source = authoredRoad[sampleRow * width + sampleColumn] / 255;
                            if (source <= 0) continue;
                            const distance = Math.hypot(dx, dz);
                            coverage = Math.max(coverage, source * Math.max(0, 1 - distance / (featherRadius + 1)));
                        }
                    }
                }
                map[index * 4 + 2] = Math.round(coverage * 255);
            }
            this.surfaceMap = RawTexture.CreateRGBATexture(
                map, width, height, this.scene, false, false,
                Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
            );
        } finally {
            container.dispose();
        }
    }

    /** Keep the generated triangles authoritative for both rendering and grounding. */
    private async loadHeightmapInto(target: Mesh): Promise<void> {
        const base = import.meta.env.BASE_URL;
        const [height, biome, groundCoverage, roadDisplay, rockCoverage, beachCoverage] = await Promise.all([ROADS_HEIGHTMAP, ROADS_BIOME_MAP, GROUND_COVERAGE_MAP, ROAD_DISPLAY_MAP, ROCK_COVERAGE_MAP, BEACH_COVERAGE_MAP].map(async path => {
            return readAsset(`${base}${path}`,async response=>decodeAuthoredPng(new Uint8Array(await response.arrayBuffer())),{rangeFallback:true});
        }));
        const data = buildAuthoredHeightmap(height, biome);
        const correctedCliffCells = correctStoneGateTriangles(data);
        if (!data.positions || !data.normals || !data.colors || !data.indices) throw new Error('Incomplete heightmap geometry.');
        data.applyToMesh(target);
        // Generated Babylon ground keeps the mesh's left-handed default winding.
        target.useVertexColors = true; target.hasVertexAlpha = false;
        target.metadata = { triangles: data.indices.length / 3, source: `${base}${ROADS_HEIGHTMAP}`, precision: 16, correctedCliffCells };
        this.data = data as LoadedTerrainData;
        this.surface = new MeshSurface(data.positions, data.indices, 16, data.colors);
        this.minHeight = this.surface.minHeight; this.maxHeight = this.surface.maxHeight;
        // ~0.46 m samples preserve roads without retaining a second full 4K RGBA image.
        this.biomeSurface = new AuthoredSurfaceMap(2049, 1537, biome, groundCoverage, roadDisplay, rockCoverage, beachCoverage);
        this.surfaceMap = RawTexture.CreateRGBATexture(this.biomeSurface.visualSurfaceData(),
            this.biomeSurface.width, this.biomeSurface.height, this.scene, false, false,
            Constants.TEXTURE_BILINEAR_SAMPLINGMODE);
        this.surfaceMap.gammaSpace = false;
        this.surfaceMap.wrapU = this.surfaceMap.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    }

    /** Temporary CPU reference for transferring authored prop ground offsets; never rendered. */
    async loadGlbReferenceSurface(): Promise<MeshSurface> {
        const container = await LoadAssetContainerAsync(`${import.meta.env.BASE_URL}assets/exalted/alpha-map.glb`, this.scene);
        try {
            const ground = container.meshes.find(mesh => mesh.name === 'vis_ground');
            if (!(ground instanceof Mesh)) throw new Error('Authored prop grounding reference is missing.');
            const data = VertexData.ExtractFromMesh(ground);
            data.transform(ground.computeWorldMatrix(true));
            if (!data.positions || !data.indices) throw new Error('Authored prop grounding reference has no geometry.');
            for (let i = 0; i < data.positions.length; i++) data.positions[i] *= this.scale;
            return new MeshSurface(data.positions, data.indices, 16);
        } finally { container.dispose(); }
    }

    /** Access the loaded CPU surface while producing a useful lifecycle error. */
    private loadedSurface(): MeshSurface {
        if (!this.surface) throw new Error('Exalted terrain surface is not loaded.');
        return this.surface;
    }

    /** Selected terrain triangle height in world metres, before local GPU deformation. */
    heightAt(x: number, z: number): number {
        return this.loadedSurface().sample(x, z);
    }

    /** Reusable [snow, sand] weights; copy the result if it must survive another call. */
    weightsAt(x: number, z: number): Float32Array {
        if (this.biomeSurface) return this.biomeSurface.sample(x, z, this._weights);
        this.loadedSurface().sample(x, z, null, this._color);
        return surfaceWeights(this._color, this._weights);
    }

    /** Write the authored triangle-plane normal without allocating another vector. */
    normalAt<T extends MutableNormal>(x: number, z: number, out: T): T {
        this.loadedSurface().sample(x, z, out);
        return out;
    }

    /** Clamp a mutable position to the imported terrain's playable X/Z bounds. */
    clampToPlayArea(position: MutableWorldPosition): void {
        this.loadedSurface().clampToPlayArea(position);
    }

    /** Release sampling textures and the CPU surface reference. */
    dispose(): void {
        this.heightTex.dispose();
        this.surfaceMap?.dispose();
        this.surface = null;
        this.biomeSurface = null;
    }
}
