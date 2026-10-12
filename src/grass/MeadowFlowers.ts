/** Flower families share streaming/rendering, but retain separate mixes and budgets. */
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { BaseTexture } from '@babylonjs/core/Materials/Textures/baseTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { ImportedGrassPrototype } from './ImportedGrass.ts';
import type { GrassSamplers } from './grassTypes.ts';
import { worldGrassSettings } from './WorldGrassSettings.ts';
import { grassHash } from './GrassDistribution.ts';

export interface MeadowFlowerFamily {
    id: string;
    asset: string;
    mix: readonly { variant: string; percentage: number }[];
    /** Independent colony pattern: daisies can use a different seed later. */
    seed: number;
    height: number;
    density: number;
    alphaCutoff: number;
}
export const DANDELIONS: MeadowFlowerFamily = {
    id: 'dandelions', asset: 'terrain/grassland/dandelions/dandelions.glb', seed: 4117,
    height: .35, density: .08, alphaCutoff: .35,
    mix: [{variant:'Dandelion_001',percentage:45},{variant:'Dandelion_002',percentage:35},{variant:'Dandelion_003',percentage:20}],
};
export const DAISIES: MeadowFlowerFamily = {
    id: 'daisies', asset: 'terrain/grassland/daisies/daisies.glb', seed: 9001,
    height: .42, density: .04, alphaCutoff: .08597224407957241,
    mix: [{variant:'Daisy_1',percentage:40},{variant:'Daisy_2',percentage:30},{variant:'Daisy_3',percentage:30}],
};

/** Species overlap never compounds the local grass-density reduction. */
export function meadowFlowerColonyAt(x: number, z: number): number {
    return Math.max(flowerColonyAt(x,z,DANDELIONS.seed),flowerColonyAt(x,z,DAISIES.seed));
}

/** One colony per 14 m cell, wholly inside its cell; no neighbour scans in hot paths. */
export function flowerColonyAt(x: number, z: number, seed = DANDELIONS.seed): number {
    const col = Math.floor(x / 14), row = Math.floor(z / 14);
    const key = Math.imul(col, 73856093) ^ Math.imul(row, 19349663) ^ seed;
    if (grassHash(key) > .8) return 0;
    const cx = (col + .25 + grassHash(key + 17) * .5) * 14;
    const cz = (row + .25 + grassHash(key + 29) * .5) * 14;
    const radius = 1.8 + grassHash(key + 41) * .8;
    const t = Math.max(0, Math.min(1, (Math.hypot(x - cx, z - cz) / radius - .65) / .35));
    return 1 - t * t * (3 - 2 * t);
}

export function flowerSamplers(base: GrassSamplers, seed: number): GrassSamplers {
    return {...base, grassWeightAt: (x,z) => base.grassWeightAt(x,z) * flowerColonyAt(x,z,seed)};
}
export function flowerSettings(family: MeadowFlowerFamily) {
    return {...worldGrassSettings(), density: family.density, maxSlope: .7, upright: true, groundOffset: 0,
        nearDistance: 35, farDistance: 35, distantLodDistance: 50, distantGrassDensity: 0,
        bladeHeight: family.height, windDistance: 50, importedVariant: family.mix[0].variant,
        grassMix: family.mix, windStrength: .07};
}

export async function loadMeadowFlowers(scene: Scene, family: MeadowFlowerFamily): Promise<{
    prototypes: Map<string, ImportedGrassPrototype>; texture: BaseTexture;
}> {
    const container = await LoadAssetContainerAsync(`${import.meta.env.BASE_URL}${family.asset}`, scene);
    let texture: BaseTexture | null = null;
    try {
        const material = container.materials.find(m => m instanceof PBRMaterial);
        if (!(material instanceof PBRMaterial) || !material.albedoTexture) throw new Error(`Missing ${family.id} albedo/alpha texture.`);
        texture = material.albedoTexture.clone();
        if (!texture) throw new Error(`Cannot retain ${family.id} texture.`);
        const prototypes = new Map<string, ImportedGrassPrototype>();
        for (const mesh of container.meshes) {
            if (!(mesh instanceof Mesh) || !mesh.getTotalVertices()) continue;
            let node = mesh.parent;
            while (node && !family.mix.some(v => v.variant === node?.name)) node = node.parent;
            if (!node) continue;
            const geometry = VertexData.ExtractFromMesh(mesh, true, true);
            geometry.transform(mesh.computeWorldMatrix(true));
            const positions = geometry.positions;
            if (!positions || !geometry.indices || !geometry.uvs) throw new Error(`Incomplete flower geometry: ${node.name}`);
            let minY = Infinity, maxY = -Infinity;
            for (let i=1;i<positions.length;i+=3) { minY=Math.min(minY,positions[i]);maxY=Math.max(maxY,positions[i]); }
            const height = maxY-minY;
            if (!(height > .001)) throw new Error(`Invalid flower height: ${node.name}`);
            for (let i=0;i<positions.length;i+=3) {
                positions[i]/=height;positions[i+1]=(positions[i+1]-minY)/height;positions[i+2]/=height;
            }
            prototypes.set(node.name,{name:node.name,geometry,triangles:geometry.indices.length/3,authoredHeight:1});
        }
        for (const entry of family.mix) if (!prototypes.has(entry.variant)) throw new Error(`Missing flower: ${entry.variant}`);
        return {prototypes,texture};
    } catch (error) { texture?.dispose();throw error; }
    finally { container.dispose(); }
}
