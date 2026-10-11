import { cubeEntries } from '../coop/protocol.ts';
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
        carried: Object.fromEntries(cubeEntries(w.cubes).map(([id, c]) => [id, c.carried])), plates: w.room.plates ? [w.inputs.plateA, w.inputs.plateB, w.inputs.cubeOnPlate, w.inputs.plateC, w.inputs.cubeOnPlateB] : [w.inputs.plateA, w.inputs.plateB, w.room.id === 'pairing-bay' ? w.inputs.plateC : w.inputs.cubeOnPlateC,
            !!w.room.cargoPlate && w.cargoPlateActive],
        outputs: { ...w.frame.outputs }, signals: { ...w.frame.signals }, timer: w.frame.timer?.phase, warning: w.platforms.filter(p => p.fuse >= 0).map(p => p.def.id) };
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
        const death = events.find(e => e.kind === 'death');
        if (death) { this.audio.stopAll(); play(death.cause === 'firewall' ? 'firewallZap' : 'death'); return; }
        if (next.phase === 'firing' && old.phase !== 'firing') play('hookFire');
        if (next.phase === 'attached' && old.phase !== 'attached') play('hookAttach');
        if (old.phase === 'attached' && next.jumps > old.jumps) play('ropeJump');
        else if (old.grounded && !next.grounded && w.player.vy < -300) play('jump');
        if (w.player.justLanded) play('landing', undefined, Math.min(1, w.player.landingSpeed / 700));
        for (const [id, c] of cubeEntries(w.cubes)) if (!w.cubeAuthority(id)?.consumeCorrection?.() && old.carried[id] !== next.carried[id]) play(next.carried[id] ? 'pickup' : 'drop', c);
        next.plates.forEach((on, i) => {
            if (on !== old.plates[i]) play('plate', w.room.plates?.[i]?.at ?? [w.room.plate, w.room.plateB, w.room.plateC, w.room.cargoPlate][i], .8, on ? 1 : .8);
        });
        if (next.timer === 'window' && old.timer !== 'window') play('crumbleWarn', w.room.plates?.find(p => p.id === 'receiver')?.at, .65);
        // Phase is cued once by the predicted lever; cargo apparatus transitions share one bounded cue.
        if (['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall'].some(s => old.signals[s as keyof typeof old.signals] !== next.signals[s as keyof typeof next.signals])) play('codePower', undefined, .6);
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
            if (e.kind === 'terminal') play('latch', e.at);
            if (e.kind === 'lift-latch') play('latch', e.at);
            if (e.kind === 'checkpoint' && !events.some(e => e.kind === 'lift-latch')) play('latch', e.at, .6);
            if (e.kind === 'crumble-respawn') play('codePower', e.at, .5);
            if (e.kind === 'crumble') play('crumbleBreak', e.at);
            if (e.kind === 'cube-firewall') play('firewallZap', e.at);
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
