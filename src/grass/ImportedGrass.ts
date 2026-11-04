import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';

export interface ImportedGrassPrototype {
    name: string;
    geometry: VertexData;
    triangles: number;
    authoredHeight: number;
}

const VARIANTS = [
    'grass_medium_01_tall_a_LOD2',
    'grass_medium_01_tall_b_LOD2',
    'grass_medium_01_tall_c_LOD2',
    'grass_medium_01_tiny_a_LOD2',
    'grass_medium_01_tiny_b_LOD2',
    'grass_medium_01_tiny_c_LOD2',
    'grass_medium_01_tiny_d_LOD2',
    'grass_medium_01_tiny_e_LOD2',
    'grass_medium_01_tiny_f_LOD2',
    'grass_medium_01_small_a_LOD2',
    'grass_medium_01_small_b_LOD2',
] as const;

function owningNodeName(mesh: AbstractMesh): string {
    let node: AbstractMesh['parent'] | AbstractMesh = mesh;
    while (node) {
        const lod2Name = node.name.replace(/_LOD1$/, '_LOD2');
        if (VARIANTS.includes(lod2Name as typeof VARIANTS[number])) return node.name;
        node = node.parent;
    }
    return '';
}

/** Normalizes LOD1/LOD2 geometry for the shader; authoredHeight restores variant size at placement. */
export async function loadImportedGrass(scene: Scene): Promise<Map<string, ImportedGrassPrototype>> {
    const container = await LoadAssetContainerAsync(`${import.meta.env.BASE_URL}terrain/grassland/grass_medium_01_1k.glb`, scene);
    const result = new Map<string, ImportedGrassPrototype>();
    for (const mesh of container.meshes) {
        if (!(mesh instanceof Mesh) || !mesh.getTotalVertices()) continue;
        const name = owningNodeName(mesh);
        if (!name || result.has(name)) continue;
        const geometry = VertexData.ExtractFromMesh(mesh, true, true);
        const positions = geometry.positions;
        if (!positions?.length || !geometry.indices?.length) continue;
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (let index = 0; index < positions.length; index += 3) {
            minX = Math.min(minX, positions[index]); maxX = Math.max(maxX, positions[index]);
            minY = Math.min(minY, positions[index + 1]); maxY = Math.max(maxY, positions[index + 1]);
            minZ = Math.min(minZ, positions[index + 2]); maxZ = Math.max(maxZ, positions[index + 2]);
        }
        const authoredHeight = Math.max(0.001, maxY - minY);
        const centreX = (minX + maxX) * 0.5;
        const centreZ = (minZ + maxZ) * 0.5;
        for (let index = 0; index < positions.length; index += 3) {
            positions[index] = (positions[index] - centreX) / authoredHeight;
            positions[index + 1] = (positions[index + 1] - minY) / authoredHeight;
            positions[index + 2] = (positions[index + 2] - centreZ) / authoredHeight;
        }
        result.set(name, { name, geometry, triangles: geometry.indices.length / 3, authoredHeight });
    }
    container.dispose();
    for (const lod2Name of VARIANTS) {
        for (const name of [lod2Name, lod2Name.replace(/_LOD2$/, '_LOD1')]) {
            if (!result.has(name)) throw new Error(`Missing grass prototype ${name} in grass_medium_01_1k.glb.`);
        }
    }
    return result;
}
