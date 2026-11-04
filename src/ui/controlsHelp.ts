/** Player-facing controls reference; installed before gameplay keyboard listeners. */
import { resetInput } from '../core/input.ts';
import './controlsHelp.css';

export function installControlsHelp(): () => void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'controls-help-button';
    button.textContent = '?';
    button.title = 'Controls and spells';
    button.setAttribute('aria-label', 'Help: controls and spells');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'controls-help');
    button.setAttribute('aria-expanded', 'false');

    const dialog = document.createElement('dialog');
    dialog.id = 'controls-help';
    dialog.className = 'controls-help';
    dialog.setAttribute('aria-labelledby', 'controls-help-title');
    dialog.innerHTML = `
        <header><h2 id="controls-help-title">Controls &amp; spells</h2>
            <button type="button" class="controls-help-close" aria-label="Close help" autofocus>&times;</button></header>
        <p class="controls-help-intro">Click the world to control the camera. Press Esc to release the mouse and use the menus.</p>
        <section aria-labelledby="help-movement"><h3 id="help-movement">Explore</h3><dl>
            <div><dt><kbd>W A S D</kbd> / arrow keys</dt><dd>Move</dd></div>
            <div><dt>Mouse</dt><dd>Look around</dd></div>
            <div><dt>Mouse wheel</dt><dd>Zoom camera</dd></div>
            <div><dt><kbd>Shift</kbd></dt><dd>Sprint</dd></div>
            <div><dt>Hold right mouse button</dt><dd>Surf</dd></div>
            <div><dt><kbd>Space</kbd></dt><dd>Start flight; hold to rise</dd></div>
            <div><dt><kbd>Ctrl</kbd></dt><dd>Descend while flying</dd></div>
            <div><dt><kbd>F</kbd></dt><dd>Rocket jump / boost in flight</dd></div>
            <div><dt><kbd>E</kbd></dt><dd>Interact with the Cube to reveal its portal</dd></div>
        </dl><p>Flight lasts up to 15 seconds, with a 5-second cooldown after landing. Walk into the revealed portal to visit the Hall.</p>
        <p>Use the location bar at the top to teleport around the world.</p></section>
        <section aria-labelledby="help-spells"><h3 id="help-spells">Spells</h3>
        <p>Aim with the camera, then press a number key.</p><dl>
            <div><dt><kbd>1</kbd> Sweep</dt><dd>Send a crescent wave across the ground</dd></div>
            <div><dt><kbd>2</kbd> Ribbon</dt><dd>Hold to guide a flowing ribbon</dd></div>
            <div><dt><kbd>3</kbd> Bloom</dt><dd>Unleash an upward burst at the aimed spot</dd></div>
            <div><dt><kbd>4</kbd> Crystallize</dt><dd>Grow a crystal formation</dd></div>
            <div><dt><kbd>5</kbd> Vortex</dt><dd>Raise a swirling vortex</dd></div>
            <div><dt><kbd>6</kbd> Rift</dt><dd>Split a path ahead</dd></div>
            <div><dt><kbd>7</kbd> Aegis</dt><dd>Hold to grow a wall; press again to shatter it</dd></div>
            <div><dt><kbd>8</kbd> Avalanche</dt><dd>Launch a rolling wave forward</dd></div>
            <div><dt><kbd>9</kbd> Melt</dt><dd>Thaw the surface at the aimed spot</dd></div>
        </dl></section>
        <section aria-labelledby="help-more"><h3 id="help-more">Screenshots &amp; settings</h3><dl>
            <div><dt><kbd>P</kbd></dt><dd>Take a screenshot</dd></div>
            <div><dt><kbd>Ctrl + P</kbd></dt><dd>Capture the whole map from above</dd></div>
            <div><dt><kbd>Ctrl + Shift + P</kbd></dt><dd>Capture the map with trees and props</dd></div>
            <div><dt><kbd>F1</kbd> / <kbd>\u0060</kbd></dt><dd>Toggle settings</dd></div>
        </dl></section>`;
    const closeButton = dialog.querySelector('button');
    closeButton?.addEventListener('click', () => dialog.close());
    button.addEventListener('click', () => {
        resetInput();
        if (document.pointerLockElement) document.exitPointerLock();
        dialog.showModal();
        button.setAttribute('aria-expanded', 'true');
    });
    dialog.addEventListener('close', () => {
        resetInput();
        button.setAttribute('aria-expanded', 'false');
        button.focus();
    });
    // Keep Tab, Escape and button activation native while preventing game shortcuts.
    const blockGameplay = (event: KeyboardEvent): void => {
        if (dialog.open) event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', blockGameplay, true);
    document.body.append(button, dialog);
    return () => {
        window.removeEventListener('keydown', blockGameplay, true);
        if (dialog.open) dialog.close();
        dialog.remove();
        button.remove();
    };
}
