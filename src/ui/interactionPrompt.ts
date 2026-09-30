/** Compact, reusable world-interaction prompt rendered outside the scene canvas. */

import './interactionPrompt.css';

export class InteractionPrompt {
    private readonly element = document.createElement('aside');
    private visible = false;

    constructor(key: string, message: string) {
        this.element.className = 'interaction-prompt';
        this.element.setAttribute('role', 'status');
        this.element.setAttribute('aria-live', 'polite');
        const keycap = document.createElement('strong');
        keycap.textContent = key;
        this.element.append(keycap, document.createTextNode(message));
        document.body.appendChild(this.element);
    }

    /** Toggle without rewriting DOM or restarting its transition each frame. */
    show(show: boolean): void {
        if (show === this.visible) return;
        this.visible = show;
        this.element.classList.toggle('visible', show);
    }

    dispose(): void {
        this.element.remove();
    }
}
