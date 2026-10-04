/** Build static collision from the same full-detail placement used by rendering. */
import { Vector3, type Matrix } from '@babylonjs/core/Maths/math.vector';
import { solidPropKind, type PropCollider } from './propCollisions.ts';

interface GroundSurface { heightAt(x: number, z: number): number }

export function propColliderGeometry(name: string, material: string, positions: ArrayLike<number>,
    placement: Matrix, ground: GroundSurface): PropCollider | null {
    const kind = solidPropKind(material);
    if (!kind || positions.length < 3) return null;
    const point = new Vector3(), vertices = new Float64Array(positions.length);
    let bottom = Infinity, top = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
        Vector3.TransformCoordinatesFromFloatsToRef(positions[i], positions[i + 1], positions[i + 2], placement, point);
        vertices[i] = point.x; vertices[i + 1] = point.y; vertices[i + 2] = point.z;
        bottom = Math.min(bottom, point.y); top = Math.max(top, point.y);
    }
    const cutoff = kind === 'trunk' ? bottom + Math.min(1.8, (top - bottom) * .2) : top;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < vertices.length; i += 3) {
        if (vertices[i + 1] > cutoff) continue;
        minX = Math.min(minX, vertices[i]); maxX = Math.max(maxX, vertices[i]);
        minZ = Math.min(minZ, vertices[i + 2]); maxZ = Math.max(maxZ, vertices[i + 2]);
    }
    const x = (minX + maxX) * .5, z = (minZ + maxZ) * .5;
    const radius = Math.max(maxX - minX, maxZ - minZ) * .5, groundY = ground.heightAt(x, z);
    if (kind === 'rock' && (radius < .4 || top - groundY < .35)) return null;
    return { name, kind, x, z, radius: Math.max(.12, radius), minY: bottom,
        maxY: kind === 'trunk' ? Math.min(top, Math.max(groundY + 2.2, bottom + (top - bottom) * .55)) : top };
}
