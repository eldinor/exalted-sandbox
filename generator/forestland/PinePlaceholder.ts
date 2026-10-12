import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import '@babylonjs/core/Engines/WebGPU/Extensions/engine.dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Material } from '@babylonjs/core/Materials/material';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import type { PinePrototype } from './PinePack.ts';

/** Two crossed side cards and one horizontal canopy card: six triangles. */
export function pinePlaceholderGeometry(radius: number, height: number): VertexData {
    const data = new VertexData();
    const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
    const quad = (vertices: number[], normal: number[], top: boolean): void => {
        const base = positions.length / 3;
        positions.push(...vertices);
        for (let i = 0; i < 4; i++) normals.push(...normal);
        const left = top ? .502 : .002, right = top ? .998 : .498;
        uvs.push(left, .002, right, .002, right, .998, left, .998);
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    quad([-radius, 0, 0, radius, 0, 0, radius, height, 0, -radius, height, 0], [0, 0, 1], false);
    quad([0, 0, -radius, 0, 0, radius, 0, height, radius, 0, height, -radius], [1, 0, 0], false);
    const crownY = height * .72;
    quad([-radius, crownY, -radius, radius, crownY, -radius, radius, crownY, radius, -radius, crownY, radius], [0, 1, 0], true);
    data.positions = new Float32Array(positions); data.normals = new Float32Array(normals);
    data.uvs = new Float32Array(uvs); data.indices = new Uint16Array(indices);
    return data;
}

/** A code-drawn silhouette atlas keeps this placeholder independent of downloads
 * or an expensive render-to-texture bake. It is deliberately an approximation.
 */
export function createPinePlaceholder(scene: Scene, prototype: PinePrototype) {
    let radius = 0, top = 0, crownBottom = Infinity;
    for (const part of prototype.far) {
        const p = part.geometry.positions;
        if (!p) continue;
        const foliage = part.material.name === 'Clusters_Mat';
        for (let i = 0; i < p.length; i += 3) {
            radius = Math.max(radius, Math.abs(p[i]), Math.abs(p[i + 2])); top = Math.max(top, p[i + 1]);
            if (foliage) crownBottom = Math.min(crownBottom, p[i + 1]);
        }
    }
    if (!(radius > 0 && top > 0)) throw new Error(`Invalid placeholder bounds for ${prototype.name}.`);
    const texture = new DynamicTexture(`pine-placeholder:${prototype.name}`, { width: 512, height: 256 }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 512, 256);
    const crownEnd = Math.max(128, Math.min(235, 256 * (1 - crownBottom / top)));
    const trunkWidth = Math.max(3, 256 * .025);
    ctx.fillStyle = '#51432f'; ctx.fillRect(128 - trunkWidth / 2, 35, trunkWidth, 219);
    const gradient = ctx.createLinearGradient(0, 2, 0, crownEnd);
    gradient.addColorStop(0, '#657c43'); gradient.addColorStop(1, '#344d2c'); ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.moveTo(128, 3);
    // Jagged tiers suggest branches while keeping the crown a cheap solid shape.
    for (let tier = 1; tier <= 10; tier++) {
        const t = tier / 10, width = Math.sin(t * Math.PI * .72) * 111;
        ctx.lineTo(128 + width * .8, crownEnd * t - 7); ctx.lineTo(128 + width, crownEnd * t);
    }
    ctx.lineTo(128, crownEnd + 7);
    for (let tier = 10; tier >= 1; tier--) {
        const t = tier / 10, width = Math.sin(t * Math.PI * .72) * 111;
        ctx.lineTo(128 - width, crownEnd * t); ctx.lineTo(128 - width * .8, crownEnd * t - 7);
    }
    ctx.closePath(); ctx.fill();
    const canopy = ctx.createRadialGradient(378, 110, 8, 384, 128, 115);
    canopy.addColorStop(0, '#657c43'); canopy.addColorStop(1, '#344d2c'); ctx.fillStyle = canopy;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
        const angle = i / 64 * Math.PI * 2, r = 106 * (1 + .06 * Math.sin(i * 2.3));
        const x = 384 + Math.cos(angle) * r, y = 128 + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    texture.hasAlpha = true; texture.update(true);
    const material = new StandardMaterial(`pine-placeholder:${prototype.name}`, scene);
    material.diffuseTexture = material.emissiveTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.diffuseColor = Color3.Black(); material.emissiveColor = Color3.White();
    material.disableLighting = true; material.backFaceCulling = false;
    material.transparencyMode = Material.MATERIAL_ALPHATEST; material.alphaCutOff = .4;
    return { geometry: pinePlaceholderGeometry(radius, top), material, texture };
}
