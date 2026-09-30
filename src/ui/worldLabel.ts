/** DOM label anchored to a projected world-space position. */

import { Matrix, Vector3 } from '@babylonjs/core/Maths/math';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import type { Scene } from '@babylonjs/core/scene';
import './worldLabel.css';

export class WorldLabel {
    private readonly element = document.createElement('div');
    private readonly projected = Vector3.Zero();
    private readonly viewport = new Viewport(0, 0, 1, 1);

    constructor(private readonly scene: Scene, text: string) {
        this.element.className = 'world-label';
        this.element.textContent = text;
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-live', 'polite');
        document.body.appendChild(this.element);
    }

    /** Project a world point to CSS pixels and show it only when visible. */
    update(world: Vector3, camera: Camera, show: boolean): void {
        if (!show) {
            this.element.classList.remove('visible');
            return;
        }
        const engine = this.scene.getEngine();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        camera.viewport.toGlobalToRef(width, height, this.viewport);
        Vector3.ProjectToRef(world, Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), this.viewport, this.projected);
        const canvas = engine.getRenderingCanvas();
        if (!canvas || this.projected.z < 0 || this.projected.z > 1) {
            this.element.classList.remove('visible');
            return;
        }
        const rect = canvas.getBoundingClientRect();
        this.element.style.left = `${rect.left + this.projected.x * rect.width / width}px`;
        this.element.style.top = `${rect.top + this.projected.y * rect.height / height}px`;
        this.element.classList.add('visible');
    }

    dispose(): void {
        this.element.remove();
    }
}
