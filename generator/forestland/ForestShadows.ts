import type { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import type { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector';

export function configureForestShadows(sun: DirectionalLight, shadow: ShadowGenerator): void {
    // Auto-fit cannot produce valid bounds from an empty caster list in aerial views.
    sun.shadowFrustumSize = 200;
    sun.shadowMinZ = 1;
    sun.shadowMaxZ = 400;
    shadow.frustumEdgeFalloff = .1;
}

export function updateForestShadows(
    sun: DirectionalLight, camera: Vector3, groundHeight: number,
    shadowsRequested: boolean, casterCount: number,
): void {
    // Camera altitude must not move the nearby ground shadow volume into the sky.
    const offset = 160 / sun.direction.length();
    sun.position.set(
        camera.x - sun.direction.x * offset,
        groundHeight - sun.direction.y * offset,
        camera.z - sun.direction.z * offset,
    );
    // Do not sample a stale map when every detailed tree is outside the shadow range.
    sun.shadowEnabled = shadowsRequested && casterCount > 0;
}
