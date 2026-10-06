import { GameAudio, type SoundCue } from '../audio/game-audio.ts';
import type { Box, Vec2 } from '../engine/geometry.ts';
import type { MachineEvent, PuzzleWorld } from './world.ts';

/** Sound observes physical state/output transitions, never retained CPU timing. */
export function liftProximity(player: Vec2, box: Box): number {
    const dx = Math.max(box.x - player.x, 0, player.x - box.x - box.w);
    const dy = Math.max(box.y - player.y, 0, player.y - box.y - box.h);
    return Math.max(0, 1 - Math.hypot(dx, dy) / 420);
}
function state(w: PuzzleWorld) {
    return { phase: w.player.rope.phase, jumps: w.player.ropeJumpAnchors.length, grounded: w.player.grounded,
        carried: !!w.cube?.carried, plates: [w.inputs.plateA, w.inputs.plateB, w.room.id === 'pairing-bay' ? w.inputs.plateC : w.inputs.cubeOnPlateC,
            !!w.room.cargoPlate && w.inputs.cubeOnPlate],
        outputs: { ...w.frame.outputs }, warning: w.platforms.filter(p => p.fuse >= 0).map(p => p.def.id) };
}
type AudioSink = Pick<GameAudio, 'play' | 'setLoop' | 'stopAll'>;
export class AudioPresentation {
    private previous: ReturnType<typeof state> | null = null;
    constructor(private audio: AudioSink) {}
    reset(w: PuzzleWorld): void { this.audio.stopAll(); this.previous = state(w); }
    observe(w: PuzzleWorld, events: readonly MachineEvent[]): void {
        const next = state(w), old = this.previous; this.previous = next;
        if (!old) return;
        const play = (cue: SoundCue, at?: Vec2, level = 1, rate = 1) => {
            const distance = at ? Math.hypot(at.x - w.player.x, at.y - w.player.y) : 0;
            this.audio.play(cue, level * Math.max(0, 1 - distance / 1100), rate);
        };
        if (events.some(e => e.kind === 'death')) { this.audio.stopAll(); play('death'); return; }
        if (next.phase === 'firing' && old.phase !== 'firing') play('hookFire');
        if (next.phase === 'attached' && old.phase !== 'attached') play('hookAttach');
        if (old.phase === 'attached' && next.jumps > old.jumps) play('ropeJump');
        else if (old.grounded && !next.grounded && w.player.vy < -300) play('jump');
        if (w.player.justLanded) play('landing', undefined, Math.min(1, w.player.landingSpeed / 700));
        if (old.carried !== next.carried) play(next.carried ? 'pickup' : 'drop');
        next.plates.forEach((on, i) => {
            if (on !== old.plates[i]) play('plate', [w.room.plate, w.room.plateB, w.room.plateC, w.room.cargoPlate][i], .8, on ? 1 : .8);
        });
        // One cue per retained output, even when it controls several physical slabs.
        for (const signal of ['grappleAnchor', 'bridge', 'codePlatformA', 'codePlatformB'] as const)
            if (old.outputs[signal] !== next.outputs[signal]) play('codePower', undefined, .75, next.outputs[signal] ? 1 : .75);
        if (old.outputs.relayGates !== next.outputs.relayGates) play('relayPower', undefined, 1, next.outputs.relayGates ? 1 : .7);
        if (old.outputs.liftField !== next.outputs.liftField) play('liftPower', undefined, 1, next.outputs.liftField ? 1 : .7);
        if (old.outputs.exitDoor !== next.outputs.exitDoor) play('door', undefined, 1, next.outputs.exitDoor ? 1 : .8);
        for (const id of next.warning) if (!old.warning.includes(id)) {
            const p = w.platforms.find(p => p.def.id === id)!.def;
            play('crumbleWarn', { x: p.x + p.w / 2, y: p.y });
        }
        for (const e of events) {
            if (e.kind === 'switch' && !events.some(e => e.kind === 'lift-latch')) play('switch', e.at);
            if (e.kind === 'lift-latch') play('latch', e.at);
            if (e.kind === 'crumble') play('crumbleBreak', e.at);
        }
        // A carried payload emits both events; a loose cube emits only relay-cargo.
        const transit = events.find(e => e.kind === 'teleport') ?? events.find(e => e.kind === 'relay-cargo');
        if (transit) play('teleport', transit.at);
    }
    ambience(w: PuzzleWorld, active: boolean): void {
        this.audio.setLoop('reel', active && (w.pullingCube || w.player.rope.phase === 'attached' && w.player.rope.taut) ? 1 : 0);
        const nearby = Math.max(0, ...w.lifts.filter(l => l.enabled).map(l => liftProximity(w.player, l.def)));
        this.audio.setLoop('liftHum', active ? nearby : 0);
    }
}
