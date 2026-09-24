import test from 'node:test';
import assert from 'node:assert/strict';
import { RocketJump, ROCKET_JUMP_COOLDOWN } from '../src/character/rocketJump.ts';
import { CharacterController } from '../src/character/controller.ts';
import { input, resetInput } from '../src/core/input.ts';

function fixture() {
    return {
        terrain: { heightAt: () => 0 },
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        groundY: 0,
    };
}

const basis = [{ x: 0, z: 1 }, { x: 1, z: 0 }];

test('F launch creates a ballistic arc and lands', () => {
    const jump = new RocketJump();
    const ch = fixture();
    jump.update(1 / 60, ch, { moveX: 0, moveZ: 0, rocketJumpPressed: true }, ...basis, false);
    assert.equal(jump.justStarted, true);
    assert.equal(jump.active, true);
    assert.ok(ch.position.y > 0);

    for (let i = 0; i < 180 && jump.active; i++) {
        jump.update(1 / 60, ch, { moveX: 0, moveZ: 0, rocketJumpPressed: false }, ...basis, false);
    }
    assert.equal(jump.active, false);
    assert.equal(ch.position.y, 0);
    assert.equal(ch.velocity.y, 0);
});

test('cooldown rejects immediate repeat and permits another airborne impulse', () => {
    const jump = new RocketJump();
    const ch = fixture();
    jump.update(1 / 60, ch, { moveX: 0, moveZ: 0, rocketJumpPressed: true }, ...basis, false);
    const firstVelocity = ch.velocity.y;
    jump.update(.1, ch, { moveX: 0, moveZ: 0, rocketJumpPressed: true }, ...basis, false);
    assert.equal(jump.justStarted, false);
    assert.ok(ch.velocity.y < firstVelocity);
    for (let i = 0; i < 24; i++) {
        jump.update(1 / 60, ch, { moveX: 0, moveZ: 0, rocketJumpPressed: false }, ...basis, false);
    }
    const velocityBeforeRepeat = ch.velocity.y;
    jump.update(1 / 60, ch, { moveX: 0, moveZ: 0, rocketJumpPressed: true }, ...basis, false);
    assert.equal(jump.justStarted, true);
    assert.ok(ch.velocity.y > velocityBeforeRepeat + 8);
});

test('airborne WASD reaches Fly-like camera-relative speed', () => {
    const jump = new RocketJump();
    const ch = fixture();
    jump.update(1 / 60, ch, { moveX: 0, moveZ: 0, rocketJumpPressed: true }, ...basis, false);
    for (let i = 0; i < 24; i++) {
        jump.update(1 / 60, ch, { moveX: 0, moveZ: 1, rocketJumpPressed: false }, ...basis, false);
    }
    assert.ok(ch.velocity.z > 15);
    assert.ok(Math.abs(ch.velocity.x) < 1e-6);
});

test('Space transitions from rocket-jump airtime into Fly without losing ascent', () => {
    const terrain = {
        heightAt: () => 0,
        normalAt: (_x, _z, out) => { out.set(0, 1, 0); return out; },
    };
    const rig = {
        yaw: 0,
        getFlatForward: (out) => out.set(0, 0, 1),
        getFlatRight: (out) => out.set(1, 0, 0),
        addTrauma: () => {},
    };
    const ch = new CharacterController(terrain);
    resetInput();
    input.rocketJumpPressed = true;
    ch.update(1 / 60, rig);
    const ascent = ch.velocity.y;
    assert.equal(ch.rocketJump.active, true);

    input.rocketJumpPressed = false;
    input.flyPressed = true;
    ch.update(1 / 60, rig);
    assert.equal(ch.rocketJump.active, false);
    assert.equal(ch.flight.active, true);
    assert.ok(ch.velocity.y >= ascent - .5);

    const flightRemaining = ch.flight.remaining;
    const flightVelocity = ch.velocity.y;
    ch.rocketJump.cooldown = 0;
    input.flyPressed = false;
    input.rocketJumpPressed = true;
    ch.update(1 / 60, rig);
    assert.equal(ch.flight.active, true);
    assert.equal(ch.rocketJump.active, false);
    assert.equal(ch.rocketJump.justStarted, true);
    assert.ok(ch.flight.remaining < flightRemaining);
    assert.ok(ch.velocity.y > flightVelocity);
    resetInput();
});
