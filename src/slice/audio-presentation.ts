import { cubeEntries } from '../coop/protocol.ts';
import { GameAudio, MACHINERY_CUES, type SoundCue } from '../audio/game-audio.ts';
import type { Box, Vec2 } from '../engine/geometry.ts';
import { PLAYER } from '../engine/constants.ts';
import type { MachineEvent, PuzzleWorld } from './world.ts';
import { payloadReceivers } from './receiver-presentation.ts';

/** Sound observes physical state/output transitions, never retained CPU timing. */
export function liftProximity(player: Vec2, box: Box): number {
    const dx = Math.max(box.x - player.x, 0, player.x - box.x - box.w);
    const dy = Math.max(box.y - player.y, 0, player.y - box.y - box.h);
    return Math.max(0, 1 - Math.hypot(dx, dy) / 420);
}
function state(w: PuzzleWorld) {
    const receivers = payloadReceivers(w);
    return { phase: w.player.rope.phase, jumps: w.player.ropeJumpAnchors.length, grounded: w.player.grounded,
        carried: Object.fromEntries(cubeEntries(w.cubes).map(([id, c]) => [id, c.carried])), plates: (w.frame.plates
            ? [...(w.room.plates ?? []).map(p => ({ on: !!w.frame.plates?.[p.id], at: p.at })),
                { on: w.inputs.plateB, at: w.room.plateB }, { on: w.inputs.plateC, at: w.room.plateC },
                ...(w.room.cubePads ?? []).map(p => ({ on: p.id === 'liftCargo' ? w.inputs.cubeOnPlate : p.id === 'finalLeft' ? w.inputs.cubeOnPlateB : w.inputs.cubeOnPlateC, at: p.at }))]
            : (w.room.plates ? [w.inputs.plateA, w.inputs.plateB, w.inputs.cubeOnPlate, w.inputs.plateC, w.inputs.cubeOnPlateB] : [w.inputs.plateA, w.inputs.plateB, w.room.id === 'pairing-bay' ? w.inputs.plateC : w.inputs.cubeOnPlateC,
                !!w.room.cargoPlate && w.cargoPlateActive]).map((on, i) => ({ on, at: w.room.plates?.[i]?.at ?? [w.room.plate, w.room.plateB, w.room.plateC, w.room.cargoPlate][i] })))
            .filter(p => !receivers.some(r => r.at === p.at)),
        lifts: Object.fromEntries(w.lifts.map(l => [l.def.signal, l.enabled])),
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
        const pending = new Map<SoundCue, { level: number; rate: number }>();
        const play = (cue: SoundCue, at?: Vec2, level = 1, rate = 1) => {
            const distance = at ? Math.hypot(at.x - w.player.x, at.y - w.player.y) : 0;
            const audible = level * Math.max(0, 1 - distance / 1100);
            if (audible > (pending.get(cue)?.level ?? 0)) pending.set(cue, { level: audible, rate });
        };
        const flush = () => {
            // A single input can power several retained outputs. Keep their
            // physical presentation, but use one readable activation sound.
            const machinery = (['door', 'relayPower', 'liftPower', 'codePower'] as const).find(cue => pending.has(cue));
            for (const [cue, { level, rate }] of pending) {
                if (MACHINERY_CUES.includes(cue) && cue !== machinery) continue;
                this.audio.play(cue, level, rate);
            }
        };
        const death = events.find(e => e.kind === 'death');
        if (death) { this.audio.stopAll(); play(death.cause === 'firewall' ? 'firewallZap' : 'death'); flush(); return; }
        if (next.phase === 'firing' && old.phase !== 'firing') play('hookFire');
        if (next.phase === 'attached' && old.phase !== 'attached') play('hookAttach');
        if (old.phase === 'attached' && next.jumps > old.jumps) play('ropeJump');
        else if (old.grounded && !next.grounded && w.player.vy < -300) play('jump');
        // A local footfall onto a newly pressed plate already has its impact.
        // Do not suppress landings for remote plates or a cube pressing one.
        const plateLanding = next.plates.some(({ on, at }, i) => on && !old.plates[i]?.on && at
            && Math.abs(at.x - w.player.x) < 72 && Math.abs(at.y - w.player.y - PLAYER.height / 2) < 8);
        if (w.player.justLanded && !old.grounded && next.grounded && !plateLanding)
            play('landing', undefined, Math.min(1, w.player.landingSpeed / 700));
        for (const [id, c] of cubeEntries(w.cubes)) if (!w.cubeAuthority(id)?.consumeCorrection?.() && old.carried[id] !== next.carried[id]) play(next.carried[id] ? 'pickup' : 'drop', c);
        next.plates.forEach(({ on, at }, i) => {
            if (on !== old.plates[i]?.on) play('plate', at, .8, on ? 1 : .8);
        });
        if (next.timer === 'window' && old.timer !== 'window') play('crumbleWarn', w.room.plates?.find(p => p.id === 'receiver')?.at, .65);
        // Phase is cued once by the predicted lever; cargo apparatus transitions share one bounded cue.
        if (['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall', 'leftRoute', 'rightRoute'].some(s => old.signals[s as keyof typeof old.signals] !== next.signals[s as keyof typeof next.signals])) play('codePower', undefined, .6);
        // One cue per retained output, even when it controls several physical slabs.
        for (const signal of ['grappleAnchor', 'bridge', 'codePlatformA', 'codePlatformB'] as const)
            if (old.outputs[signal] !== next.outputs[signal]) play('codePower', undefined, .75, next.outputs[signal] ? 1 : .75);
        if (old.outputs.relayGates !== next.outputs.relayGates) play('relayPower', undefined, 1, next.outputs.relayGates ? 1 : .7);
        // Include authored JSON outputs as well as the retained liftField signal.
        // Several physical fields can share one output; that still makes one cue.
        for (const [signal, on] of Object.entries(next.lifts)) if (old.lifts[signal] !== undefined && old.lifts[signal] !== on) {
            const nearby = Math.max(0, ...w.lifts.filter(l => l.def.signal === signal).map(l => liftProximity(w.player, l.def)));
            play('liftPower', undefined, nearby, on ? 1 : .7);
        }
        if (old.outputs.exitDoor !== next.outputs.exitDoor) play('door', undefined, 1, next.outputs.exitDoor ? 1 : .8);
        for (const id of next.warning) if (!old.warning.includes(id)) {
            const p = w.platforms.find(p => p.def.id === id)!.def;
            play('crumbleWarn', { x: p.x + p.w / 2, y: p.y });
        }
        const samePoint = (a: Vec2 | undefined, b: Vec2) => !!a && Math.hypot(a.x - b.x, a.y - b.y) < 1;
        const station = (at: Vec2) => w.room.breakpoints?.some(b => b.activationControl && samePoint(b.at, at));
        // Mirror the existing renderer's control shapes, without changing event
        // producers, input prediction or server acceptance. A latch can be a lever.
        const lever = (e: MachineEvent) => !station(e.at) && (e.kind === 'switch' || e.kind === 'lift-latch'
            || e.kind === 'terminal' && (samePoint(w.room.lever, e.at) || samePoint(w.room.upperLever, e.at)
                || w.room.controls?.some(c => c.kind === 'toggle' && samePoint(c.at, e.at))));
        const hasLever = events.some(lever), hasLiftLatch = events.some(e => e.kind === 'lift-latch');
        for (const e of events) {
            // Authored checkpoint machines own a deployment/confirmation pair on their local clock.
            if (e.kind === 'checkpoint' && w.room.breakpoints?.some(b => b.checkpoint === w.checkpoint)) continue;
            if ((e.kind === 'switch' || e.kind === 'terminal' || e.kind === 'lift-latch') && station(e.at)) continue;
            if (lever(e)) play('switch', e.at);
            // Keep meaningful confirmation behind the immediate digital click.
            // Map coalescing also handles the solo switch + lift-latch pair once.
            if (e.kind === 'terminal' || e.kind === 'lift-latch') play('latch', e.at, lever(e) ? .3 : 1);
            if (e.kind === 'checkpoint' && !hasLiftLatch) play('checkpoint', e.at, hasLever ? .4 : 1);
            if (e.kind === 'crumble-respawn') play('codePower', e.at, .5);
            if (e.kind === 'crumble') play('crumbleBreak', e.at);
            if (e.kind === 'cube-firewall') play('firewallZap', e.at);
        }
        // A carried payload emits both events; a loose cube emits only relay-cargo.
        const transit = events.find(e => e.kind === 'teleport') ?? events.find(e => e.kind === 'relay-cargo');
        if (transit) play('teleport', transit.at);
        flush();
    }
    ambience(w: PuzzleWorld, active: boolean): void {
        this.audio.setLoop('reel', active && (w.pullingCube || w.player.rope.phase === 'attached' && w.player.rope.taut) ? 1 : 0);
        const nearby = Math.max(0, ...w.lifts.filter(l => l.enabled).map(l => liftProximity(w.player, l.def)));
        this.audio.setLoop('liftHum', active ? nearby : 0);
    }
}
