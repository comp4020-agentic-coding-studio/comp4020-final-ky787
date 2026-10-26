import { expect, it, vi } from 'vitest';
import { newRecord, sharedRoom } from '../server/coop-state.ts';
import { CoopClient } from '../src/coop/client.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { COOP_LABS } from '../src/coop/labs.ts';
import type { CoopLevelId, SharedRoom } from '../src/coop/protocol.ts';
import { AudioPresentation } from '../src/slice/audio-presentation.ts';
import { HERO_TIMING, HeroPresentation } from '../src/slice/hero-presentation.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { roomById } from '../src/slice/rooms.ts';
import { PuzzleWorld } from '../src/slice/world.ts';

const feedback = new Set(['switch', 'latch', 'checkpoint', 'breakpointDeploy', 'breakpointConfirm', 'complete']);
function presentation(world: PuzzleWorld) {
    const audio = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() };
    const sound = new AudioPresentation(audio); sound.reset(world);
    return { audio, sound, observe: () => sound.observe(world, world.events.splice(0)),
        feedback: () => audio.play.mock.calls.map(([cue]) => cue).filter(cue => feedback.has(cue)) };
}
function solo(id: 'switch' | 'uplink') {
    const world = new PuzzleWorld(roomById(id), freshProgress().rooms[id]);
    return { world, ...presentation(world) };
}
function coop<L extends CoopLevelId>(level: L) {
    // Real accepted-state adapters, with no WebSocket connection or gameplay override.
    const room = sharedRoom(newRecord('ABCD', '11111111-1111-4111-8111-111111111111', level), [true, true], [null, null]);
    const client = new CoopClient(() => {}, () => {}); client.room = room as SharedRoom; client.slot = 1;
    const authority = createCoopAuthority(room as SharedRoom, client);
    const world = new PuzzleWorld(COOP_LABS[level].room(1), freshProgress().rooms.pressure, undefined, authority);
    return { room, client, authority, world, ...presentation(world) };
}

it('the actual SWITCH lever selects the switch cue on both edges, without special confirmation cues', () => {
    const h = solo('switch'), at = h.world.room.lever!;
    Object.assign(h.world.player, { x: at.x, y: at.y - 25 });
    for (const on of [true, false]) {
        h.world.interact();
        expect(h.world.inputs.switchB).toBe(on);
        expect(h.world.events.some(e => e.kind === 'switch')).toBe(true);
        h.observe();
    }
    expect(h.feedback()).toEqual(['switch', 'switch']);
    h.audio.play.mockClear();
    for (let n = 0; n < 20; n++) h.observe();
    expect(h.audio.play).not.toHaveBeenCalled();
});

it('CONTROL SPINE relay power preserves its separate ordinary lever and checkpoint sounds', () => {
    const h = solo('uplink'), at = h.world.room.lever!;
    Object.assign(h.world.player, { x: at.x, y: at.y - 25 });
    h.world.interact(); h.observe();
    expect(h.world.checkpoint).toBe('relay');
    expect(h.feedback()).toEqual(['switch', 'checkpoint']);
});

it('the actual upper lift latch keeps its latch cue and suppresses duplicate switch/checkpoint feedback', () => {
    const h = solo('uplink'), at = h.world.room.upperLever!;
    Object.assign(h.world.player, { x: at.x, y: at.y - 25 });
    h.world.interact();
    expect(h.world.events.map(e => e.kind)).toEqual(expect.arrayContaining(['switch', 'lift-latch', 'checkpoint']));
    h.observe(); expect(h.feedback()).toEqual(['latch']);
    expect(h.world.inputs.switchC).toBe(true); expect(h.world.checkpoint).toBe('upper');
    h.world.interact(); h.observe(); expect(h.feedback()).toEqual(['latch']);
});

it('Crossfeed accepted toggles use switch while its terminal controls keep latch, once per transition', () => {
    const h = coop('crossfeed-vault');
    for (const id of ['switchB', 'routeMode', 'switchC', 'switchD'] as const) {
        const control = h.world.room.controls!.find(c => c.id === id)!;
        Object.assign(h.world.player, { x: control.at.x, y: control.at.y - 25 });
        h.room.levelState.inputs[id] = true;
        h.authority.sample(h.world); h.world.syncAuthority(); h.observe();
        const expected = control.kind === 'toggle' ? 'switch' : 'latch';
        expect(h.feedback()).toEqual([expected]);
        h.audio.play.mockClear();
        h.authority.sample(h.world); h.observe(); expect(h.feedback()).toEqual([]);
    }
});

it('Race phase changes select switch while accepted COMMIT preserves latch', () => {
    const h = coop('race-condition');
    for (const [id, input, cue] of [['phase', 'phase', 'switch'], ['commit', 'finalControl', 'latch']] as const) {
        const at = h.world.room.controls!.find(c => c.id === id)!.at;
        Object.assign(h.world.player, { x: at.x, y: at.y - 25 });
        h.room.levelState.inputs[input] = true;
        h.authority.sample(h.world); h.world.syncAuthority(); h.observe();
        expect(h.feedback()).toEqual([cue]); h.audio.play.mockClear();
        h.authority.sample(h.world); h.observe(); expect(h.feedback()).toEqual([]);
    }
});

it('Handshake maintenance terminal retains latch without becoming an ordinary switch', () => {
    const h = coop('handshake'), at = h.world.room.controls!.find(c => c.id === 'draft:maintenance')!.at;
    Object.assign(h.world.player, { x: at.x, y: at.y - 25 });
    h.room.levelState.devices['maintenance.value'] = true;
    h.authority.sample(h.world); h.world.syncAuthority(); h.observe();
    expect(h.feedback()).toEqual(['latch']);
    h.audio.play.mockClear(); h.authority.sample(h.world); h.observe();
    expect(h.feedback()).toEqual([]);
});

it('reconnecting with accepted controls already on cannot replay lever, terminal or checkpoint cues', () => {
    const h = coop('crossfeed-vault');
    Object.assign(h.room.levelState.inputs, { switchB: true, routeMode: true, switchC: true, switchD: true });
    h.room.checkpoint = 'upper';
    const authority = createCoopAuthority(h.room, h.client);
    const restored = new PuzzleWorld(COOP_LABS['crossfeed-vault'].room(1), { ...freshProgress().rooms.pressure, checkpoint: 'upper' }, undefined, authority);
    const sound = presentation(restored);
    authority.sample(restored); restored.syncAuthority(); sound.observe();
    expect(sound.audio.play).not.toHaveBeenCalled();
    expect(restored.checkpoint).toBe('upper');
});

it('a checkpoint station owns its staged hero cues without also playing switch, latch or checkpoint', () => {
    const base = roomById('uplink');
    const room = { ...base, breakpoints: [{ id: 'upper-station', at: base.upperLever!, checkpoint: 'upper' as const, activationControl: 'upperLever' as const }] };
    const world = new PuzzleWorld(room, freshProgress().rooms.uplink), h = presentation(world), heroes = new HeroPresentation();
    const state = () => ({ checkpoint: world.checkpoint, exitReady: world.frame.outputs.exitDoor, completed: world.exited });
    heroes.reset(room, state()); heroes.update(room, state(), 0, true);
    Object.assign(world.player, { x: room.upperLever!.x, y: room.upperLever!.y - 25 });
    world.interact(); h.observe(); expect(h.feedback()).toEqual([]);
    expect(heroes.update(room, state(), 0, true).map(c => c.cue)).toEqual(['breakpointDeploy']);
    expect(heroes.update(room, state(), HERO_TIMING.flag, true).map(c => c.cue)).toEqual(['breakpointConfirm']);
    expect(heroes.update(room, state(), 10, true)).toEqual([]);

    // Restoring a completed milestone baselines both presenters; no new switch or fanfare.
    const restored = new PuzzleWorld(room, world.memory()), restoredAudio = presentation(restored);
    const restoredState = { checkpoint: restored.checkpoint, exitReady: true, completed: true };
    heroes.reset(room, restoredState); restoredAudio.observe();
    expect(restoredAudio.audio.play).not.toHaveBeenCalled();
    expect(heroes.update(room, restoredState, 10, true)).toEqual([]);
});
