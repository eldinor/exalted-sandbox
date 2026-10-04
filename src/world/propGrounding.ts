/** Transfer authored ground clearance without changing prop shape or horizontal placement. */
import type { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';

interface GroundSurface { heightAt(x: number, z: number): number }

/** The GLB loader root flips X but leaves Y unchanged; instance translation remains in root space. */
export function rebasePropHeight(instance: Matrix, root: Matrix, reference: GroundSurface,
    target: GroundSurface, scratch: Vector3): number {
    const placement = root.multiply(instance);
    placement.getTranslationToRef(scratch);
    const delta = target.heightAt(scratch.x, scratch.z) - reference.heightAt(scratch.x, scratch.z);
    instance.getTranslationToRef(scratch);
    instance.setTranslationFromFloats(scratch.x, scratch.y + delta, scratch.z);
    return delta;
}
