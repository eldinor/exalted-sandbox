import test from 'node:test';
import assert from 'node:assert/strict';
import { initInput, input, resetInput, pollInput } from '../src/core/input.ts';

class FakeElement extends EventTarget {
    constructor(readonly ui = false) { super(); }
    closest() { return this.ui ? this : null; }
    focus() { documentState.activeElement = this; }
    requestPointerLock() {}
}
const documentState = Object.assign(new EventTarget(), { pointerLockElement: null as FakeElement | null, activeElement: null as FakeElement | null });
function mouse(type: string, target: EventTarget, values: { button?: number; buttons?: number; pointerType?: string; movementX?: number; movementY?: number } = {}) {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, 'target', { value: target });
    Object.assign(event, { button: 2, buttons: 2, movementX: 0, movementY: 0 }, values);
    documentState.dispatchEvent(event);
    return event;
}

test('surf works over the canvas without pointer lock, releases cleanly, and leaves UI right-click alone', () => {
    const names = ['document', 'window', 'Element'] as const;
    const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
    const windowState = new EventTarget(), canvas = new FakeElement(), ui = new FakeElement(true);
    try {
        for (const [name, value] of [['document', documentState], ['window', windowState], ['Element', FakeElement]] as const) Object.defineProperty(globalThis, name, { configurable: true, value });
        initInput(canvas as unknown as HTMLCanvasElement);
        documentState.activeElement = ui;
        resetInput(); input.locked = false;
        assert.equal(mouse('pointerdown', canvas, { pointerType: 'mouse' }).defaultPrevented, false, 'Do not suppress Firefox camera mousemove');
        assert.equal(input.surf, true, 'Original pointer events work when compatibility mousedown is absent');
        mouse('mousemove', canvas, { movementX: 10, movementY: -5 });
        assert.ok(Math.abs(input.lookX - .022) < 1e-12); assert.ok(Math.abs(input.lookY + .011) < 1e-12, 'Right-drag steers without pointer lock');
        mouse('pointermove', canvas, { pointerType: 'mouse', button: -1, buttons: 0 }); assert.equal(input.surf, true, 'Pointer motion cannot invent a release');
        assert.ok(Math.abs(input.lookX - .022) < 1e-12, 'Pointer events do not double-count camera movement');
        mouse('pointerup', canvas, { pointerType: 'mouse', buttons: 0 }); assert.equal(input.surf, false);
        mouse('mousemove', canvas, { movementX: 20 }); assert.ok(Math.abs(input.lookX - .022) < 1e-12, 'Free mouse hover cannot steer');
        mouse('pointermove', canvas, { pointerType: 'mouse', buttons: 3 }); assert.equal(input.surf, true, 'Right press while left is held arrives as a pointermove transition');
        mouse('pointermove', canvas, { pointerType: 'mouse', buttons: 1 }); assert.equal(input.surf, false, 'Right release while left is held clears surf');
        mouse('pointerdown', canvas, { pointerType: 'touch' }); assert.equal(input.surf, false);
        mouse('pointerdown', canvas, { pointerType: 'mouse' });
        mouse('pointercancel', canvas, { pointerType: 'mouse' }); assert.equal(input.surf, false);
        documentState.activeElement = ui;
        assert.equal(mouse('mousedown', canvas).defaultPrevented, true);
        assert.equal(input.surf, true);
        pollInput(); assert.equal(input.surf, true, 'Canvas focus prevents a previously focused UI button swallowing surf');
        assert.equal(mouse('contextmenu', canvas).defaultPrevented, true);
        mouse('mouseup', canvas, { buttons: 0 }); assert.equal(input.surf, false);
        mouse('mousedown', ui); assert.equal(input.surf, false);
        assert.equal(mouse('contextmenu', ui).defaultPrevented, false);

        documentState.pointerLockElement = canvas;
        documentState.dispatchEvent(new Event('pointerlockchange'));
        const beforeLook = input.lookX;
        mouse('mousemove', canvas, { movementX: 10 }); assert.ok(Math.abs(input.lookX - beforeLook - .022) < 1e-12, 'Locked camera keeps the existing sensitivity');
        mouse('mousedown', documentState); assert.equal(input.surf, true);
        assert.equal(mouse('contextmenu', documentState).defaultPrevented, true, 'Locked menus can target the document');
        mouse('mousemove', canvas, { buttons: 0 }); assert.equal(input.surf, true, 'Firefox locked movement reporting zero buttons must not cancel a held right press');
        mouse('mouseup', canvas, { button: 0, buttons: 0 }); assert.equal(input.surf, true, 'Releasing another button does not cancel surfing');
        mouse('mouseup', canvas, { buttons: 0 }); assert.equal(input.surf, false);
        mouse('mousemove', canvas, { buttons: 3 }); assert.equal(input.surf, false, 'Movement cannot fabricate a new press');
        mouse('mousedown', canvas, { buttons: 3 }); assert.equal(input.surf, true);
        documentState.pointerLockElement = null;
        documentState.dispatchEvent(new Event('pointerlockchange')); assert.equal(input.surf, false);
        mouse('mousedown', canvas); windowState.dispatchEvent(new Event('blur')); assert.equal(input.surf, false);
    } finally {
        resetInput(); input.locked = false;
        names.forEach((name, i) => { const descriptor = previous[i]; if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); });
    }
});
