import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';

/** Split the supplied merged pine asset by welded components and its two trunks.
 * Whole foliage cards stay intact; imported world transforms must be baked first.
 */
export function splitPines(data: VertexData): readonly [VertexData, VertexData] {
    const p = data.positions, indices = data.indices, normals = data.normals, uv = data.uvs;
    if (!p || !indices || !normals || !uv) throw new Error('Pine asset requires positions, normals, UVs and indices.');
    const count = p.length / 3, parents = Int32Array.from({ length: count }, (_, i) => i);
    const root = (i: number): number => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; } return i; };
    const weld = new Map<string, number>();
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < count; i++) {
        const offset = i * 3;
        minY = Math.min(minY, p[offset + 1]); maxY = Math.max(maxY, p[offset + 1]);
        const key = `${Math.round(p[offset] * 1e6)}:${Math.round(p[offset + 1] * 1e6)}:${Math.round(p[offset + 2] * 1e6)}`;
        const previous = weld.get(key);
        if (previous !== undefined) parents[root(i)] = root(previous); else weld.set(key, i);
    }
    for (let i = 0; i < indices.length; i += 3) {
        const a = root(indices[i]); parents[root(indices[i + 1])] = a; parents[root(indices[i + 2])] = a;
    }
    const components = new Map<number, { vertices: number[]; minY: number; maxY: number; x: number; z: number }>();
    for (let i = 0; i < count; i++) {
        const key = root(i);
        let component = components.get(key);
        if (!component) { component = { vertices: [], minY: Infinity, maxY: -Infinity, x: 0, z: 0 }; components.set(key, component); }
        component.vertices.push(i);
        component.minY = Math.min(component.minY, p[i * 3 + 1]); component.maxY = Math.max(component.maxY, p[i * 3 + 1]);
        component.x += p[i * 3]; component.z += p[i * 3 + 2];
    }
    const height = maxY - minY;
    const trunks = [...components.values()].filter(c => c.minY <= minY + height * .015 && c.maxY - c.minY > height * .5)
        .sort((a, b) => b.maxY - a.maxY);
    if (trunks.length !== 2) throw new Error(`Expected two pine trunks; found ${trunks.length}.`);
    const bases = trunks.map(trunk => {
        let x = 0, z = 0, n = 0;
        for (const vertex of trunk.vertices) if (p[vertex * 3 + 1] < trunk.minY + height * .03) { x += p[vertex * 3]; z += p[vertex * 3 + 2]; n++; }
        if (!n) throw new Error('Pine trunk base is empty.');
        return { x: x / n, z: z / n, y: trunk.minY, top: trunk.maxY };
    });
    const variants = new Map<number, number>();
    for (const [key, component] of components) {
        const x = component.x / component.vertices.length, z = component.z / component.vertices.length;
        const nearA = Math.hypot(x - bases[0].x, z - bases[0].z), nearB = Math.hypot(x - bases[1].x, z - bases[1].z);
        variants.set(key, component.maxY > bases[1].top + .01 || nearA <= nearB ? 0 : 1);
    }
    const result = [new VertexData(), new VertexData()] as const;
    for (let variant = 0; variant < 2; variant++) {
        const positions: number[] = [], outputNormals: number[] = [], uvs: number[] = [], outputIndices: number[] = [];
        const remap = new Map<number, number>();
        for (let i = 0; i < indices.length; i += 3) {
            if (variants.get(root(indices[i])) !== variant) continue;
            for (let corner = 0; corner < 3; corner++) {
                const old = indices[i + corner]; let next = remap.get(old);
                if (next === undefined) {
                    next = remap.size; remap.set(old, next);
                    positions.push(p[old * 3] - bases[variant].x, p[old * 3 + 1] - bases[variant].y, p[old * 3 + 2] - bases[variant].z);
                    outputNormals.push(normals[old * 3], normals[old * 3 + 1], normals[old * 3 + 2]);
                    uvs.push(uv[old * 2], uv[old * 2 + 1]);
                }
                outputIndices.push(next);
            }
        }
        result[variant].positions = new Float32Array(positions);
        result[variant].normals = new Float32Array(outputNormals);
        result[variant].uvs = new Float32Array(uvs);
        result[variant].indices = new Uint32Array(outputIndices);
    }
    return result;
}
