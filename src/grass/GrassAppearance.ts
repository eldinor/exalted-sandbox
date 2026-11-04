import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';

export function defaultGrassColors(): { rootColor: readonly [number, number, number]; tipColor: readonly [number, number, number] } {
    const root = Color3.FromHexString('#426f35').toLinearSpace(true);
    const tip = Color3.FromHexString('#179306').toLinearSpace(true);
    return { rootColor: [root.r, root.g, root.b], tipColor: [tip.r, tip.g, tip.b] };
}

/** Area-weighted diffuse response averaged over the lab's random instance yaw. */
export function grassLightingResponse(geometry: VertexData): number {
    const { positions, normals, indices } = geometry;
    if (!positions || !normals || !indices) return 1;
    const sunLength = Math.hypot(.45, 1, .28);
    let areaSum = 0, lightSum = 0;
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
        const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
        const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
        const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
        const nx = normals[a] + normals[b] + normals[c];
        const ny = normals[a + 1] + normals[b + 1] + normals[c + 1];
        const nz = normals[a + 2] + normals[b + 2] + normals[c + 2];
        const length = Math.hypot(nx, ny, nz);
        if (area <= 0 || length <= 0) continue;
        let light = 0;
        for (let yaw = 0; yaw < 32; yaw++) {
            const angle = yaw * Math.PI / 16;
            const x = nx * Math.cos(angle) + nz * Math.sin(angle);
            const z = nz * Math.cos(angle) - nx * Math.sin(angle);
            light += .34 + .74 * Math.abs((-.45 * x + ny - .28 * z) / (length * sunLength));
        }
        areaSum += area;
        lightSum += area * light / 32;
    }
    return areaSum > 0 ? lightSum / areaSum : 1;
}
