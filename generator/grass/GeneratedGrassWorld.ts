import { Vector2 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import { loadBakedHeightField } from '../preview/loadHeightField.ts';
import { loadBakedBiomeField } from '../preview/loadBiomeField.ts';
import { loadBakedHydrologyField } from '../preview/loadHydrologyField.ts';
import { loadGeneratedRoads } from '../preview/loadRoads.ts';
import type { GrassLabWorld } from './GrassLab.ts';
const CENTRE_X = -250, CENTRE_Z = 60, TERRAIN_SIZE = 280;
function fieldIndex(x: number, z: number, metadata: { width: number; height: number; origin: readonly [number, number]; sampleSpacing: readonly [number, number] }): number {
    const ix = Math.max(0, Math.min(metadata.width - 1, Math.floor((x - metadata.origin[0]) / metadata.sampleSpacing[0])));
    const iz = Math.max(0, Math.min(metadata.height - 1, Math.floor((z - metadata.origin[1]) / metadata.sampleSpacing[1])));
    return iz * metadata.width + ix;
}

export async function createGeneratedGrassWorld(scene: Scene): Promise<GrassLabWorld> {
    const [heightField, biomeField, hydrology, roads] = await Promise.all([
        loadBakedHeightField(), loadBakedBiomeField(), loadBakedHydrologyField(), loadGeneratedRoads(),
    ]);
    if (!heightField || !biomeField) throw new Error('Generate the height and biome fields before opening Grass Lab.');

    const terrain = CreateGround('grass-lab-terrain', { width: TERRAIN_SIZE, height: TERRAIN_SIZE, subdivisions: 180, updatable: true }, scene);
    terrain.position.x = CENTRE_X;
    terrain.position.z = CENTRE_Z;
    const positions = terrain.getVerticesData(VertexBuffer.PositionKind)!;
    const colors: number[] = [];
    for (let offset = 0; offset < positions.length; offset += 3) {
        const x = positions[offset] + CENTRE_X;
        const z = positions[offset + 2] + CENTRE_Z;
        positions[offset + 1] = heightField.sample(x, z);
        const weights = biomeField.sample(x, z);
        const green = Math.max(weights.grassland, weights.forest * 0.55, weights.wetland * 0.6);
        colors.push(0.20 + green * 0.10, 0.25 + green * 0.20, 0.13 + green * 0.08, 1);
    }
    const indices = terrain.getIndices()!;
    const normals = new Array<number>(positions.length);
    VertexData.ComputeNormals(positions, indices, normals);
    terrain.setVerticesData(VertexBuffer.PositionKind, positions, true);
    terrain.setVerticesData(VertexBuffer.NormalKind, normals, true);
    terrain.setVerticesData(VertexBuffer.ColorKind, colors, true);
    terrain.refreshBoundingInfo();
    const terrainMaterial = new StandardMaterial('grass-lab-ground', scene);
    terrainMaterial.diffuseColor = Color3.White();
    terrainMaterial.specularColor = new Color3(0.03, 0.03, 0.025);
    terrain.useVertexColors = true;
    terrain.material = terrainMaterial;

    return { centre: new Vector2(CENTRE_X, CENTRE_Z), readyMessage: "Ready - deterministic blades on Grass 1", samplers: {
        heightAt: (x, z) => heightField.sample(x, z),
        grassWeightAt: (x, z) => {
            const weights = biomeField.sample(x, z);
            return Math.max(weights.grassland, weights.forest * 0.32, weights.wetland * 0.45);
        },
        excludedAt: (x, z) => {
            const wet = hydrology ? hydrology.waterMask[fieldIndex(x, z, hydrology.metadata)] > 0 : false;
            const road = roads ? roads.mask[fieldIndex(x, z, {
                width: roads.metadata.resolution,
                height: roads.metadata.resolution,
                origin: heightField.metadata.origin,
                sampleSpacing: [
                    heightField.metadata.extent[0] / roads.metadata.resolution,
                    heightField.metadata.extent[1] / roads.metadata.resolution,
                ],
            })] > 18 : false;
            return wet || road;
        },
    } };
}
