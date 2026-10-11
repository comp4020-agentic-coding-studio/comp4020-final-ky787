import { expect, it, vi } from 'vitest';
import { newRecord, freshCubes, sharedRoom, definition } from '../server/coop-state.ts';
import { freshRace, advanceRace, raceOutputs, raceInputs, RACE_TIMING } from '../server/race-state.ts';
import { freshCrumble, advanceCrumble } from '../server/crumble-state.ts';
import { assignCube } from '../server/cube-state.ts';
import { CoopClient } from '../src/coop/client.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { raceCondition } from '../src/coop/race-condition.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { emptyInput, createPlayer } from '../src/engine/physics.ts';
import { FIXED_DT, PLAYER, GRAPPLE } from '../src/engine/constants.ts';
import { connectionPowered, roomConnections } from '../src/slice/connections.ts';
import { roomById } from '../src/slice/rooms.ts';
import type { Plate } from '../src/coop/protocol.ts';

function setup() {
    const record = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', 'race-condition');
    const cubes = freshCubes(record.level), race = freshRace(), crumble = freshCrumble(), held: [Plate, Plate] = [null, null];
    for (const c of Object.values(cubes)) assignCube(c, 1);
    const client = new CoopClient(() => {}, () => {}); client.slot = 1; client.status = 'CONNECTED';
    const ctx = { record, held, race, crumble, now: 1000 };
    client.room = sharedRoom(record, [true, true], held, cubes, crumble, ctx.now, race);
    const authority = createCoopAuthority(client.room, client);
    const cubeReport = vi.spyOn(client, 'cubeOccupancy').mockImplementation(() => {});
    const bodyReport = vi.spyOn(client, 'occupy').mockImplementation(() => {});
    const contact = vi.spyOn(client, 'bufferContact').mockImplementation(() => {});
    const reset = vi.spyOn(client, 'cubeAction').mockReturnValue(false);
    vi.spyOn(client, 'reachExit').mockImplementation(() => {});
    const w = new PuzzleWorld(raceCondition(1), { checkpoint: 'entry', switchB: false, cubeOnPlate: false, cubeOnPlateB: false }, undefined, authority);
    const sync = () => { client.room = sharedRoom(record, [true, true], held, cubes, crumble, ctx.now, race); authority.room = client.room; w.syncAuthority(); };
    return { record, cubes, race, crumble, held, client, authority, ctx, w, sync, cubeReport, bodyReport, contact, reset };
}
function step(w: PuzzleWorld, n: number, input = emptyInput()) { for (let i = 0; i < n; i++) { w.step(FIXED_DT, input); input.jumpPressed = false; } }

it('initial apparatus is armed; resolved inverse wiring follows the top destination', () => {
    const f = setup(), link = roomConnections(f.w.room).find(w => w.id === 'drop-top')!;
    expect(f.w.power('topBridge')).toBe(true); expect(f.w.power('bufferBridge')).toBe(true);
    expect(connectionPowered(link, f.w)).toBe(true);
    f.held[0] = 'dropA'; f.sync();
    expect(f.w.power('topBridge')).toBe(false); expect(connectionPowered(link, f.w)).toBe(false);
    const top = f.w.platforms.find(p => p.def.id === 'cargo-top')!;
    expect(top.solid).toMatchObject({ enabled: false, grappleable: false });
    expect(f.w.room.platforms).toContain(top.def); // still rendered as a ghost
});

it('real cube gravity reaches buffer, then receiver with A released and B held', () => {
    const f = setup(); f.held[0] = 'dropA'; f.sync(); step(f.w, 65);
    expect(f.w.cubes.cubeA?.groundId).toBe('cargo-buffer'); expect(f.contact).toHaveBeenCalled();
    f.race.buffer = 'window'; f.race.deadline = f.ctx.now + RACE_TIMING.buffer;
    f.held[0] = null; f.held[1] = 'dropB'; f.sync(); step(f.w, 100);
    expect(f.reset).not.toHaveBeenCalled(); expect(f.w.cubes.cubeA?.groundId).toBe('receiver-floor');
    expect(f.cubeReport).toHaveBeenCalledWith('receiver', 'cubeA');
    expect(f.w.cubes.cubeB).toMatchObject({ x: 3570, y: 698 });
});

it.each(['overlap', 'timeout'] as const)('%s drops only Cube A into a powered beam', failure => {
    const f = setup(); f.held[0] = 'dropA'; f.sync(); step(f.w, 65);
    f.race.buffer = 'window'; f.race.deadline = f.ctx.now + RACE_TIMING.buffer;
    if (failure === 'overlap') f.held[1] = 'dropB';
    else { f.held[0] = null; f.ctx.now += RACE_TIMING.buffer; advanceRace(f.race, f.ctx.now); }
    f.sync(); step(f.w, 75);
    expect(f.reset).toHaveBeenCalledWith('cube-reset', undefined, 'cubeA', 'firewall');
    expect(f.reset.mock.calls.every(c => c[2] === 'cubeA')).toBe(true); expect(f.w.deaths).toBe(0);
});

it('late B cannot erase a committed timeout; all plates are universal and reversible', () => {
    const f = setup(); f.race.buffer = 'expired'; f.held[0] = 'dropB';
    expect(raceOutputs(raceInputs(f.ctx), f.race.buffer, false).safetyFirewall).toBe(true);
    for (const plate of f.w.room.plates!) {
        f.held[0] = plate.id; f.record.cubePlacements.cubeA = 'spawn'; const body = raceInputs(f.ctx);
        f.held[0] = null; f.record.cubePlacements.cubeA = plate.id;
        expect(raceInputs(f.ctx)).toEqual(body);
    }
    f.record.cubePlacements.cubeA = 'receiver'; f.held[0] = 'trace'; f.sync(); expect(f.w.power('spanMaster')).toBe(true);
    f.record.cubePlacements.cubeA = 'spawn'; f.sync(); expect(f.w.power('spanMaster')).toBe(false);
});

it('phase changes are reversible, physical grace is bounded, and only active fake hooks trigger shared fuses', () => {
    const f = setup(), d = definition('race-condition'); f.record.cubePlacements.cubeA = 'receiver'; f.held[0] = 'trace'; f.sync();
    const trigger = { type: 'crumble-trigger', seq: 1, platform: 'crumbleA', trigger: 'hook' } as const;
    expect(d.action(f.ctx, trigger)).toBe(false);
    expect(d.action(f.ctx, { type: 'control', seq: 2, control: 'phase' })).toBe(true); f.sync();
    expect(f.w.power('phaseA')).toBe(false); expect(f.w.power('phaseB')).toBe(true);
    expect(f.w.physicalPower('phaseA')).toBe(true);
    expect(d.action(f.ctx, trigger)).toBe(true); expect(f.crumble.crumbleA.durationMs).toBe(RACE_TIMING.fake);
    f.ctx.now += 351; advanceRace(f.race, f.ctx.now); f.sync(); expect(f.w.physicalPower('phaseA')).toBe(false);
    expect(d.action(f.ctx, { type: 'control', seq: 3, control: 'phase' })).toBe(false); // no grace spam
    f.ctx.now += 300; expect(d.action(f.ctx, { type: 'control', seq: 4, control: 'phase' })).toBe(true);
    f.ctx.now += 900; advanceCrumble(f.crumble, f.ctx.now); f.sync();
    expect(f.w.platforms.find(p => p.def.id === 'crumbleA')!.solid.enabled).toBe(false);
    f.ctx.now += 2400; advanceCrumble(f.crumble, f.ctx.now); f.sync();
    expect(f.crumble.crumbleA.phase).toBe('stable');
});

it('ground speed is 12% faster without changing airborne steering or boost height; gap and hook ranges prevent simple skips', () => {
    const f = setup(), w = f.w; w.player = createPlayer(2500, 1223); step(w, 80, { ...emptyInput(), right: true });
    expect(w.player.vx).toBe(426); expect(PLAYER.maxRunSpeed).toBe(380);
    const ledge = w.room.platforms.find(p => p.id === 'commit-ledge')!;
    for (const elevation of [0, 44]) {
        w.player = createPlayer(3730, 720 - elevation - 17); w.player.grounded = true;
        step(w, 1, { ...emptyInput(), jumpPressed: true, jumpHeld: true }); let feet = Infinity;
        for (let i = 0; i < 85; i++) { step(w, 1, { ...emptyInput(), jumpHeld: true }); feet = Math.min(feet, w.player.y + 17); }
        expect(feet).toBeGreaterThan(ledge.y);
    }
    const span = w.room.platforms.filter(p => p.signal === 'phaseA' || p.signal === 'phaseB');
    expect(span).toHaveLength(5); expect(span.filter(p => p.kind === 'crumble-prototype')).toHaveLength(2);
    for (let i = 0; i < 3; i++) expect(span[i + 2].x - (span[i].x + span[i].w)).toBeGreaterThan(GRAPPLE.maxRange);
    expect(w.room.plates![1].at.x - w.room.plates![0].at.x).toBeGreaterThan(426 * 3.3);
    expect(w.frame.source).toBe('mock-multiplayer'); expect(w.frame.evidence).toBeUndefined();
});

it('visible enclosure walls prevent pulling payloads through cargo or the unsolved right deck', () => {
    const f = setup(), w = f.w;
    w.player = createPlayer(205, 1100); expect(w.cubeReachable('cubeA')).toBe(false);
    Object.assign(w.cubes.cubeA!, { x: 205, y: 1018 }); expect(w.cubeReachable('cubeA')).toBe(false);
    w.player = createPlayer(3570, 1093); expect(w.cubeReachable('cubeB')).toBe(false);
    step(w, 2, { ...emptyInput(), grapplePressed: true, grappleHeld: true, aim: { x: 3570, y: 698 } });
    expect(f.reset.mock.calls.some(c => c[0] === 'cube-pull-start')).toBe(false);
    w.player = createPlayer(3520, 703); expect(w.cubeReachable('cubeB')).toBe(true);
});

it('COMMIT cannot be reached by pressing E through the underside of its ledge', () => {
    const f = setup(), control = vi.spyOn(f.client, 'control').mockImplementation(() => {});
    for (const y of [575, 550]) {
        f.w.player = createPlayer(4000, y); f.w.interact(); expect(control).not.toHaveBeenCalled();
    }
    f.w.player = createPlayer(4000, 513); f.w.player.grounded = true; f.w.interact();
    expect(control).toHaveBeenCalledWith('commit');
});

it.each(['switch', 'relay'] as const)('426-speed takeoff cannot jump the protected C8 %s gap', id => {
    const w = new PuzzleWorld(roomById(id), { checkpoint: 'entry', switchB: false, cubeOnPlate: false, cubeOnPlateB: false });
    w.player = createPlayer(id === 'switch' ? 445 : 465, 543); w.player.grounded = true; w.player.vx = PLAYER.maxGroundRunSpeed;
    step(w, 1, { ...emptyInput(), jumpPressed: true, jumpHeld: true, right: true });
    step(w, 180, { ...emptyInput(), jumpHeld: true, right: true });
    expect(w.deaths).toBeGreaterThan(0);
});
