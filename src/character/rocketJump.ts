/** Ballistic rocket-jump movement driven by a short, repeatable vertical impulse. */
import type { MovementCharacter, MovementVector2 } from './movementTypes.ts';

export const ROCKET_JUMP_COOLDOWN = 0.45;
export const ROCKET_JUMP_IMPULSE = 12.4;
const GRAVITY = 24;
const AIR_SPEED = 18;

export interface RocketJumpInput {
    moveX: number;
    moveZ: number;
    rocketJumpPressed: boolean;
}

/** Owns rocket-jump cooldown and collision-aware airborne integration. */
export class RocketJump {
    active = false;
    cooldown = 0;
    justStarted = false;
    launchX = 0;
    launchY = 0;
    launchZ = 0;

    /** Reset transient state when teleporting between world spawn points. */
    reset(): void {
        this.active = false;
        this.cooldown = 0;
        this.justStarted = false;
    }

    /** Apply input and advance one ballistic frame; returns true while this mode owns movement. */
    update(
        dt: number,
        ch: MovementCharacter,
        input: RocketJumpInput,
        forward: MovementVector2,
        right: MovementVector2,
        impulseOnly: boolean,
    ): boolean {
        this.justStarted = false;
        if (dt <= 0) return this.active;
        this.cooldown = Math.max(0, this.cooldown - dt);

        if (input.rocketJumpPressed && this.cooldown === 0) {
            let ground = ch.terrain.heightAt(ch.position.x, ch.position.z);
            ground = Math.max(ground, ch.terrain.obstacles?.supportHeight(ch.position) ?? -Infinity);
            this.launchX = ch.position.x;
            this.launchY = ground;
            this.launchZ = ch.position.z;
            this.justStarted = true;
            this.active = !impulseOnly;
            this.cooldown = ROCKET_JUMP_COOLDOWN;
            // Repeated blasts add height without allowing velocity to grow without bound.
            ch.velocity.y = Math.min(18, Math.max(0, ch.velocity.y) + ROCKET_JUMP_IMPULSE);
        }
        if (!this.active) return false;

        let rest = dt;
        while (rest > 1e-8 && this.active) {
            const h = Math.min(rest, 1 / 60);
            rest -= h;

            const wishX = (forward.x * input.moveZ + right.x * input.moveX) * AIR_SPEED;
            const wishZ = (forward.z * input.moveZ + right.z * input.moveX) * AIR_SPEED;
            const airControl = 1 - Math.exp(-5 * h);
            ch.velocity.x += (wishX - ch.velocity.x) * airControl;
            ch.velocity.z += (wishZ - ch.velocity.z) * airControl;

            const oldX = ch.position.x;
            const oldZ = ch.position.z;
            if (ch.terrain.obstacles) ch.terrain.obstacles.move(ch.position, ch.velocity, h);
            else {
                ch.position.x += ch.velocity.x * h;
                ch.position.z += ch.velocity.z * h;
            }
            ch.terrain.heightfield?.clampToPlayArea(ch.position);

            let ground = ch.terrain.heightAt(ch.position.x, ch.position.z);
            if (ground > ch.position.y + .2) {
                ch.position.x = oldX;
                ch.position.z = oldZ;
                ch.velocity.x = ch.velocity.z = 0;
                ground = ch.terrain.heightAt(oldX, oldZ);
            }
            const water = ch.terrain.water?.sample(ch.position.x, ch.position.z);
            if (water) ground = Math.max(ground, water.level);

            ch.velocity.y -= GRAVITY * h;
            let nextY = ch.position.y + ch.velocity.y * h;
            const obstacles = ch.terrain.obstacles;
            if (obstacles) {
                nextY = obstacles.verticalLimit(ch.position, nextY);
                if (nextY !== ch.position.y + ch.velocity.y * h) ch.velocity.y = 0;
                ground = Math.max(ground, obstacles.supportHeight(ch.position));
            }
            ch.groundY = ground;
            if (nextY <= ground && ch.velocity.y <= 0) {
                ch.position.y = ground;
                ch.velocity.y = 0;
                this.active = false;
            } else {
                ch.position.y = Math.max(ground, nextY);
            }
        }
        return true;
    }
}
