import type { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { GrassImpact } from './grassTypes.ts';

function distanceToPatch(x: number, z: number, centreX: number, centreZ: number): number {
    return Math.hypot(Math.max(0, Math.abs(x - centreX) - 8), Math.max(0, Math.abs(z - centreZ) - 8));
}

/** Static shader is safe only when every root is past the fade and all impacts. */
export function canUseStaticGrass(centreX: number, centreZ: number, camera: Vector3, windDistance: number, impacts: readonly GrassImpact[]): boolean {
    if (windDistance <= 0 || distanceToPatch(camera.x, camera.z, centreX, centreZ) < windDistance) return false;
    for (let i = 0; i < Math.min(8, impacts.length); i++) {
        const impact = impacts[i];
        if (impact.strength !== 0 && distanceToPatch(impact.position.x, impact.position.z, centreX, centreZ) <= impact.radius) return false;
    }
    return true;
}
