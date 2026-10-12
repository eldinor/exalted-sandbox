import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Material } from '@babylonjs/core/Materials/material';
import type { Scene } from '@babylonjs/core/scene';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import type { GrassMixEntry } from '../grass/GrassMix.ts';
import { pineRootSupport } from './PineGrounding.ts';

export const TREE_VARIANTS = [
    ['Pine_medium_1', 'Medium 1', 25], ['Pine_medium_2', 'Medium 2', 25], ['Pine_medium_3', 'Medium 3', 20],
    ['Pine_big_1', 'Big 1', 5], ['Pine_big_2', 'Big 2', 5], ['Pine_big_3', 'Big 3', 5],
    ['Pine_small_1', 'Small 1', 3], ['Pine_small_2', 'Small 2', 3], ['Pine_small_3', 'Small 3', 3],
    ['Pine_sapling_1', 'Sapling 1', 2], ['Pine_sapling_2', 'Sapling 2', 2], ['Pine_sapling_3', 'Sapling 3', 2],
] as const;
export function defaultTreeMix(): GrassMixEntry[] { return TREE_VARIANTS.map(([variant, , percentage]) => ({ variant, percentage })); }
export function selectTreeVariant(mix: readonly GrassMixEntry[], random: number): number {
    let accumulated = 0;
    for (let i = 0; i < mix.length; i++) { accumulated += mix[i].percentage / 100; if (random < accumulated) return i; }
    for (let i = mix.length - 1; i >= 0; i--) if (mix[i].percentage > 0) return i;
    return -1;
}
export interface PinePart { geometry: VertexData; material: Material; sideOrientation: number; }
export interface PinePrototype { name: string; near: PinePart[]; far: PinePart[]; height: number; rootSupport: Float32Array; }

export async function loadPinePack(scene: Scene, pack?: {path:string;variants:readonly string[];referenceVariant:string}): Promise<{ container: AssetContainer; prototypes: PinePrototype[]; referenceHeight: number }> {
    const container = await LoadAssetContainerAsync(`${import.meta.env.BASE_URL}${pack?.path ?? 'terrain/forest/pine-pack-forestland.glb'}`, scene);
    try {
        const prototypes: PinePrototype[] = (pack?.variants ?? TREE_VARIANTS.map(([name])=>name)).map(name => ({ name, near: [], far: [], height: 0, rootSupport: new Float32Array() }));
        for (const mesh of container.meshes) {
            if (!(mesh instanceof Mesh) || !mesh.getTotalVertices() || !mesh.material) continue;
            let node = mesh.parent; let owner = '';
            while (node) { if (/^(Pine|Fir)_\w+_\d+_LOD[12]$/.test(node.name)) { owner = node.name; break; } node = node.parent; }
            const prototype = prototypes.find(value => owner === `${value.name}_LOD1` || owner === `${value.name}_LOD2`);
            if (!prototype) continue;
            const geometry = VertexData.ExtractFromMesh(mesh, true, true); geometry.transform(mesh.computeWorldMatrix(true));
            (owner.endsWith('LOD1') ? prototype.near : prototype.far).push({ geometry, material: mesh.material, sideOrientation: mesh.sideOrientation });
        }
        for (const prototype of prototypes) {
            if (prototype.near.length !== 2 || prototype.far.length !== 2) throw new Error(`Missing bark/foliage LODs for ${prototype.name}.`);
            const bark = prototype.near.find(part => part.material.name === 'Bark_Mat');
            if (!bark?.geometry.positions) throw new Error(`Missing trunk for ${prototype.name}.`);
            const p = bark.geometry.positions;
            let minY = Infinity, maxY = -Infinity;
            for (const part of prototype.near) {
                const positions = part.geometry.positions;
                if (!positions) throw new Error('Missing pine positions.');
                for (let i = 1; i < positions.length; i += 3) { minY = Math.min(minY, positions[i]); maxY = Math.max(maxY, positions[i]); }
            }
            prototype.height = maxY - minY;
            let x = 0, z = 0, n = 0;
            for (let i = 0; i < p.length; i += 3) if (p[i + 1] <= minY + prototype.height * .02) { x += p[i]; z += p[i + 2]; n++; }
            if (!n) throw new Error(`Missing root vertices for ${prototype.name}.`);
            x /= n; z /= n;
            for (const part of [...prototype.near, ...prototype.far]) {
                const positions = part.geometry.positions;
                if (!positions) throw new Error('Missing pine positions.');
                // Prepared nodes retain the authored ground plane at Y=0.
                // Negative root vertices belong below ground; lifting the lowest
                // root tip to zero made the trunk visibly float above the soil.
                for (let i = 0; i < positions.length; i += 3) { positions[i] -= x; positions[i + 2] -= z; }
            }
            const rootLods = [...prototype.near, ...prototype.far]
                .filter(part => part.material.name === 'Bark_Mat')
                .map(part => {
                    if (!part.geometry.positions) throw new Error('Missing trunk positions.');
                    return part.geometry.positions;
                });
            prototype.rootSupport = pineRootSupport(rootLods, prototype.height);
        }
        const referenceHeight = prototypes.find(value => value.name === (pack?.referenceVariant ?? 'Pine_medium_2'))?.height;
        if (!referenceHeight) throw new Error('Missing Medium 2 reference height.');
        return { container, prototypes, referenceHeight };
    } catch (error) { container.dispose(); throw error; }
}
