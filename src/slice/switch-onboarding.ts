import type { GrappleTarget } from '../engine/physics.ts';
import type { PuzzleWorld } from './world.ts';

export type SwitchOnboardingStage = 'hidden' | 'aim' | 'targeted' | 'attached' | 'complete';
const CONFIRMATION_SECONDS = 2.8;

/** Presentation only: observes the game's real target and rope; never completes a mechanic. */
export class SwitchOnboarding {
    stage: SwitchOnboardingStage = 'hidden';
    private learned = false;
    private confirmation = 0;
    private time = 0;

    reset(roomId: string, mechanics: readonly string[] = []): void {
        this.learned = mechanics.includes('grapple');
        this.confirmation = 0;
        this.time = 0;
        this.stage = roomId === 'switch' && this.learned ? 'complete' : 'hidden';
    }

    update(world: PuzzleWorld, target: GrappleTarget | null, dt: number, running: boolean, motion: boolean): void {
        if (world.room.id !== 'switch') { this.stage = 'hidden'; return; }
        if (!running) return;
        if (motion) this.time += Math.max(0, dt);
        if (this.learned) {
            this.confirmation = Math.max(0, this.confirmation - Math.max(0, dt));
            this.stage = this.confirmation > 0 ? 'attached' : 'complete';
            return;
        }
        // A selected ring or fired hook is not a successful grapple. The rope
        // must have actually attached to SWITCH's authored, powered anchor.
        if (world.player.rope.phase === 'attached' && world.player.rope.anchorId === 'anchor') {
            this.learned = true;
            this.confirmation = CONFIRMATION_SECONDS;
            this.stage = 'attached';
            return;
        }
        const anchor = world.platforms.find(platform => platform.def.id === 'anchor');
        this.stage = !anchor?.solid.enabled || !anchor.solid.grappleable ? 'hidden'
            : target?.solid.id === anchor.solid.id ? 'targeted' : 'aim';
    }

    pulse(motion: boolean): number { return motion ? (Math.sin(this.time * 3) + 1) / 2 : .5; }
    snapshot() { return { stage: this.stage, learned: this.learned, confirmation: this.confirmation }; }
}
