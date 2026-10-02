import { Vector2 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial';
import { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Scene } from '@babylonjs/core/scene';
import { ExaltedWorld } from '../../src/terrain/exaltedWorld.ts';
import { MeshSurface } from '../../src/terrain/meshSurface.ts';
import { SPAWN_POINTS } from '../../src/world/spawnPoints.ts';
import { AUTHORED_WORLD_SCALE } from '../../src/world/worldScale.ts';
import { createAuthoredGrassSamplers } from './AuthoredGrassSamplers.ts';
import { createMeadowGroundMaterial, MEADOW_TILE_METRES, partitionGrasslandTriangles } from './MeadowGround.ts';
import type { GrassLabWorld } from './GrassLab.ts';

export async function createAuthoredGrassWorld(scene: Scene): Promise<GrassLabWorld> {
    const terrain = new Mesh('authored-grassland-terrain', scene);
    terrain.isPickable = false;
    const world = new ExaltedWorld(scene);
    await world.loadInto(terrain);
    if (!world.surface) throw new Error('Authored Exalted terrain surface did not load.');
    // Match the production biome-map coordinates. GLB transforms and world scale
    // are already baked by ExaltedWorld; do not convert mesh coordinates again.
    const positions = world.data.positions;
    const uvs = new Float32Array(positions.length / 3 * 2);
    const meadowUvs = new Float32Array(uvs.length);
    for (let i = 0, uv = 0; i < positions.length; i += 3, uv += 2) {
        uvs[uv] = 1 - (positions[i] - world.origin.x) / world.extent.x;
        uvs[uv + 1] = (positions[i + 2] - world.origin.y) / world.extent.y;
        meadowUvs[uv] = -positions[i] / MEADOW_TILE_METRES;
        meadowUvs[uv + 1] = positions[i + 2] / MEADOW_TILE_METRES;
    }
    terrain.setVerticesData(VertexBuffer.UVKind, uvs);
    terrain.setVerticesData(VertexBuffer.UV2Kind, meadowUvs);
    const material = new StandardMaterial('authored-grassland-ground', scene);
    const biomeMap = new Texture(`${import.meta.env.BASE_URL}assets/textures/vertex_color_4k%20copy.png`, scene, true, false, Constants.TEXTURE_BILINEAR_SAMPLINGMODE);
    biomeMap.gammaSpace = false;
    biomeMap.wrapU = biomeMap.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    material.diffuseTexture = biomeMap;
    material.diffuseColor = Color3.White();
    material.specularColor = new Color3(.03, .03, .025);
    terrain.useVertexColors = false;
    const meadowMaterial = createMeadowGroundMaterial(scene);
    const groundMaterials = new MultiMaterial('authored-biome-ground', scene);
    groundMaterials.subMaterials.push(material, meadowMaterial);
    const partition = partitionGrasslandTriangles(world.data.indices, world.data.colors);
    // Only the visual index buffer changes. CPU grounding keeps authored data.
    terrain.setIndices(partition.indices);
    terrain.releaseSubMeshes();
    const vertexCount = positions.length / 3;
    if (partition.otherIndexCount) new SubMesh(0, 0, vertexCount, 0, partition.otherIndexCount, terrain);
    if (partition.otherIndexCount < partition.indices.length) new SubMesh(1, 0, vertexCount, partition.otherIndexCount, partition.indices.length - partition.otherIndexCount, terrain);
    terrain.material = groundMaterials;
    const spawn = SPAWN_POINTS.find(point => point.id === 'C3');
    if (!spawn) throw new Error('Exalted Grassland spawn C3 is missing.');
    return {
        centre: new Vector2(-spawn.x * AUTHORED_WORLD_SCALE, -spawn.y * AUTHORED_WORLD_SCALE),
        // A finer CPU index retains exact triangle samples while reducing the
        // candidate scan for dense grass. The production terrain is unchanged.
        samplers: createAuthoredGrassSamplers(new MeshSurface(world.data.positions, world.data.indices, 4, world.data.colors)),
        importedOnly: true, streaming: true, demoImpacts: false,
        readyMessage: 'Ready - Exalted grassland, authored world at 50% scale',
        clampPosition: position => world.clampToPlayArea(position),
        setTerrainVisible: visible => { terrain.setEnabled(visible); },
        dispose: () => { world.dispose(); biomeMap.dispose(); material.dispose(); meadowMaterial.dispose(false, true); groundMaterials.dispose(); },
    };
}
