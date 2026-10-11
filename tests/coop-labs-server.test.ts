import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { directory, launch, kill, identity, connect, avatar } from './helpers/coop-server.ts';
import { COOP_LEVELS, parseClientMessage, type CoopLevelId, type Slot } from '../src/coop/protocol.ts';
import { advanceCrumble, freshCrumble, triggerCrumble, crumbleView } from '../server/crumble-state.ts';
import { newRecord, readRoomRecord } from '../server/coop-state.ts';

async function pair<L extends CoopLevelId>(level: L) {
    const dir = await directory(), app = await launch(dir), a = await identity(app.url), b = await identity(app.url);
    const p1 = await connect<L>(app.url, a.cookie); p1.send({ type: 'create', level });
    const first = await p1.wait('snapshot'), code = first.room.code;
    const p2 = await connect<L>(app.url, b.cookie); p2.send({ type: 'join', code });
    const second = await p2.wait('snapshot');
    return { dir, app, a, b, p1, p2, code, first, second };
}
it.each(COOP_LEVELS)('creator selects %s, joiner discovers it, and only that level state is durable', async level => {
    const { dir, code, first, second, app, a } = await pair(level);
    expect(first.room.level).toBe(level); expect(second.room.level).toBe(level);
    expect(Object.keys(first.room.cubes)).toEqual(level === 'crumble-lab' ? [] : level === 'crossfeed-vault' ? ['cubeA', 'cubeB'] : ['cube']);
    expect(first.room.cube === null).toBe(level === 'crumble-lab' || level === 'crossfeed-vault');
    const disk = JSON.parse(await readFile(join(dir, 'rooms', code + '.json'), 'utf8'));
    expect(disk.version).toBe(5); expect(disk.level).toBe(level);
    expect(disk.levelState).toEqual(newRecord(code, a.id, level).levelState);
    for (const name of ['cube', 'plates', 'crumble', 'transform', 'physicsAuthority', 'connected']) expect(disk).not.toHaveProperty(name);
    await kill(app.child); const restarted = await launch(dir), back = await connect(restarted.url, a.cookie);
    back.send({ type: 'join', code }); expect((await back.wait('snapshot')).room.level).toBe(level);
});
it('rejects unknown levels/controls/platforms and extra authority fields at the schema boundary', () => {
    for (const v of [
        { type: 'create', level: 'uplink' }, { type: 'join', code: 'ABCD', level: 'lift-lab' },
        { type: 'control', seq: 1, control: 'exitDoor' }, { type: 'crumble-trigger', seq: 1, platform: 'other', trigger: 'foot' },
        { type: 'crumble-trigger', seq: 1, platform: 'crumbleA', trigger: 'collapse' },
        { type: 'local-reset', seq: 1, slot: 2 }, { type: 'avatar', seq: 1, avatar, discontinuity: 'fly' },
    ]) expect(parseClientMessage(JSON.stringify(v))).toBeNull();
    for (const level of COOP_LEVELS) expect(parseClientMessage(JSON.stringify({ type: 'create', level }))).toEqual({ type: 'create', level });
    const r = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', 'lift-lab');
    expect(readRoomRecord({ ...r, levelState: { relayEnabled: true } }, 'ABCD')).toBeNull();
});
it.each([1, 2] as const)('BOOST LAB P%s upper latch persists the shared return route and requires both arrivals', async slot => {
    const { p1, p2, app, dir, code, a } = await pair('boost-lab'), peers = [p1, p2], climber = peers[slot - 1], holder = peers[2 - slot];
    climber.send({ type: 'exit', seq: 1 });
    expect((await climber.wait('action-result', m => m.seq === 1)).accepted).toBe(false);
    climber.send({ type: 'control', seq: 2, control: 'relayPower' });
    expect((await climber.wait('action-result', m => m.seq === 2)).accepted).toBe(false);
    climber.send({ type: 'control', seq: 3, control: 'boostRoute' });
    const latched = (await holder.wait('room', m => m.room.levelState.routeLatched)).room;
    expect(latched.exitUnlocked).toBe(true); expect(latched.checkpoint).toBe('entry');
    climber.send({ type: 'exit', seq: 4 });
    expect((await holder.wait('room', m => m.room.reachedExit[slot - 1])).room.completed).toBe(false);
    holder.send({ type: 'exit', seq: 1 }); await climber.wait('room', m => m.room.completed);
    const disk = JSON.parse(await readFile(join(dir, 'rooms', code + '.json'), 'utf8'));
    expect(disk.levelState).toEqual({ routeLatched: true }); expect(disk).not.toHaveProperty('partnerSupport');
    await kill(app.child); const restarted = await launch(dir), back = await connect<'boost-lab'>(restarted.url, a.cookie);
    back.send({ type: 'join', code });
    expect((await back.wait('snapshot')).room).toMatchObject({ levelState: { routeLatched: true }, completed: true, cube: { holder: null } });
});
it.each([1, 2] as Slot[])('relay by P%s forwards semantic snaps, keeps cube authority, and requires both arrivals', async slot => {
    const { p1, p2, first, dir, code, app, a } = await pair('relay-lab'), peers = [p1, p2], source = peers[slot - 1], remote = peers[2 - slot];
    source.send({ type: 'control', seq: 1, control: 'liftLatch' }); expect((await source.wait('action-result', m => m.seq === 1)).accepted).toBe(false);
    source.send({ type: 'control', seq: 2, control: 'relayPower' });
    const powered = (await remote.wait('room', m => m.room.levelState.relayEnabled)).room;
    expect(powered.exitUnlocked).toBe(true); expect(powered.completed).toBe(false);
    source.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 3, epoch: first.room.cube.epoch });
    const held = (await remote.wait('room', m => m.room.cube.holder === slot)).room;
    source.send({ type: 'avatar', seq: 1, avatar, discontinuity: 'relay' });
    expect(await remote.wait('avatar')).toMatchObject({ slot, discontinuity: 'relay', avatar });
    const transform = { x: 1080, y: 500, vx: 0, vy: 0, grounded: false };
    source.send({ type: 'cube', cubeId: 'cube' as const, seq: 1, epoch: held.cube.epoch, transform, discontinuity: 'relay' });
    expect(await remote.wait('cube')).toMatchObject({ epoch: held.cube.epoch, discontinuity: 'relay', transform });
    source.send({ type: 'cube-drop', cubeId: 'cube' as const, seq: 4, epoch: held.cube.epoch, transform });
    const dropped = (await remote.wait('room', m => m.room.cube.holder === null && m.room.cube.epoch > held.cube.epoch)).room;
    source.send({ type: 'cube', cubeId: 'cube' as const, seq: 1, epoch: dropped.cube.epoch, transform, discontinuity: 'relay' });
    expect((await remote.wait('cube', m => m.epoch === dropped.cube.epoch)).discontinuity).toBe('relay');
    source.send({ type: 'exit', seq: 5 });
    const arrival = (await remote.wait('room', m => m.room.reachedExit[slot - 1])).room;
    expect(arrival.cube.physicsAuthority).toBe(slot); expect(arrival.cube.epoch).toBe(dropped.cube.epoch); expect(arrival.completed).toBe(false);
    remote.send({ type: 'exit', seq: 1 }); expect((await source.wait('room', m => m.room.completed)).room.reachedExit).toEqual([true, true]);
    expect(JSON.parse(await readFile(join(dir, 'rooms', code + '.json'), 'utf8')).levelState).toEqual({ relayEnabled: true });
    await kill(app.child); const restarted = await launch(dir), back = await connect<'relay-lab'>(restarted.url, a.cookie);
    back.send({ type: 'join', code }); const restored = (await back.wait('snapshot')).room;
    expect(restored.levelState.relayEnabled).toBe(true); expect(restored.completed).toBe(true); expect(restored.cube.transform).toBeNull();
});
it.each([1, 2] as Slot[])('P%s powers the lift, reset releases only that body/carry, and upper checkpoint survives restart', async slot => {
    const { p1, p2, first, dir, app, code, a } = await pair('lift-lab'), peers = [p1, p2], operator = peers[slot - 1], rider = peers[2 - slot];
    operator.send({ type: 'occupancy', seq: 1, plate: 'liftControl' });
    expect((await rider.wait('room', m => m.room.levelState.liftEnabled)).room.levelState.liftLatched).toBe(false);
    operator.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 2, epoch: first.room.cube.epoch }); await rider.wait('room', m => m.room.cube.holder === slot);
    operator.send({ type: 'local-reset', seq: 3 });
    const reset = (await rider.wait('room', m => !m.room.levelState.lowerHeld && m.room.revision > first.room.revision + 2)).room;
    expect(reset.cube.holder).toBeNull(); expect(reset.cube.physicsAuthority).toBe(slot); expect(reset.levelState.liftEnabled).toBe(false);
    operator.send({ type: 'occupancy', seq: 4, plate: 'liftControl' }); await rider.wait('room', m => m.room.levelState.liftEnabled && m.room.revision > reset.revision);
    rider.send({ type: 'control', seq: 1, control: 'liftLatch' }); const upper = (await operator.wait('room', m => m.room.checkpoint === 'upper')).room;
    expect(upper.levelState.liftLatched).toBe(true); expect(upper.completed).toBe(false);
    operator.send({ type: 'local-reset', seq: 5 }); const latched = (await rider.wait('room', m => m.room.revision > upper.revision)).room;
    expect(latched.checkpoint).toBe('upper'); expect(latched.levelState.liftEnabled).toBe(true);
    operator.send({ type: 'exit', seq: 6 }); expect((await rider.wait('room', m => m.room.reachedExit[slot - 1])).room.completed).toBe(false);
    rider.send({ type: 'exit', seq: 2 }); await operator.wait('room', m => m.room.completed);
    await kill(app.child); const restarted = await launch(dir), back = await connect<'lift-lab'>(restarted.url, a.cookie);
    back.send({ type: 'join', code }); const restored = (await back.wait('snapshot')).room;
    expect(restored.checkpoint).toBe('upper'); expect(restored.levelState).toEqual({ lowerHeld: false, liftLatched: true, liftEnabled: true });
    const disk = JSON.parse(await readFile(join(dir, 'rooms', code + '.json'), 'utf8'));
    expect(disk.levelState).toEqual({ liftLatched: true }); expect(restored.completed).toBe(true);
});
it('crumble timing uses the server clock: short foot, longer hook, and one full broken interval', () => {
    const state = freshCrumble();
    expect(triggerCrumble(state, 'crumbleA', 'foot', 100)).toBe(true);
    expect(triggerCrumble(state, 'crumbleA', 'hook', 200)).toBe(false);
    expect(triggerCrumble(state, 'crumbleB', 'hook', 100)).toBe(true);
    expect(advanceCrumble(state, 699)).toBe(false); advanceCrumble(state, 700);
    expect(crumbleView(state, 700)).toEqual({ crumbleA: { phase: 'broken', remainingMs: 2400, durationMs: 2400 }, crumbleB: { phase: 'warning', remainingMs: 1050, durationMs: 1650 } });
    advanceCrumble(state, 1750); expect(state.crumbleB.phase).toBe('broken');
    advanceCrumble(state, 3100); expect(state.crumbleA.phase).toBe('stable'); expect(state.crumbleB.phase).toBe('broken');
    advanceCrumble(state, 4150); expect(state.crumbleB.phase).toBe('stable');
});
it.each([1, 2] as Slot[])('P%s triggers shared crumble, reconnect receives deadlines, reset is local, and process restart reconstructs stable', async slot => {
    const { p1, p2, app, dir, a, b, code } = await pair('crumble-lab'), peers = [p1, p2], source = peers[slot - 1], remote = peers[2 - slot];
    source.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 1, epoch: 0 }); expect((await source.wait('action-result', m => m.seq === 1)).accepted).toBe(false);
    source.send({ type: 'crumble-trigger', seq: 2, platform: 'crumbleA', trigger: 'foot' });
    const warning = (await remote.wait('room', m => m.room.levelState.platforms.crumbleA.phase === 'warning')).room;
    const warningDisk = await readFile(join(dir, 'rooms', code + '.json'), 'utf8');
    expect(warning.levelState.platforms.crumbleA.durationMs).toBe(600); expect(warning.exitUnlocked).toBe(false);
    remote.send({ type: 'crumble-trigger', seq: 1, platform: 'crumbleA', trigger: 'hook' });
    const denied = await remote.wait('action-result', m => m.seq === 1);
    expect(denied.accepted).toBe(false); expect(denied.room.levelState.platforms.crumbleA.durationMs).toBe(600);
    await remote.close(); const returning = await connect<'crumble-lab'>(app.url, (slot === 1 ? b : a).cookie);
    returning.send({ type: 'join', code }); const reconnect = (await returning.wait('snapshot')).room;
    expect(reconnect.levelState.platforms.crumbleA.phase).toBe('warning');
    expect(reconnect.levelState.platforms.crumbleA.remainingMs).toBeLessThanOrEqual(warning.levelState.platforms.crumbleA.remainingMs);
    const broken = (await returning.wait('room', m => m.room.levelState.platforms.crumbleA.phase === 'broken')).room;
    source.send({ type: 'local-reset', seq: 3 });
    expect((await returning.wait('room', m => m.room.revision > broken.revision)).room.levelState.platforms.crumbleA.phase).toBe('broken');
    await returning.close(); const duringBreak = await connect<'crumble-lab'>(app.url, (slot === 1 ? b : a).cookie);
    duringBreak.send({ type: 'join', code }); expect((await duringBreak.wait('snapshot')).room.levelState.platforms.crumbleA.phase).toBe('broken');
    await duringBreak.wait('room', m => m.room.levelState.platforms.crumbleA.phase === 'stable');
    expect(await readFile(join(dir, 'rooms', code + '.json'), 'utf8')).toBe(warningDisk);
    source.send({ type: 'crumble-trigger', seq: 4, platform: 'crumbleB', trigger: 'hook' });
    const hooked = (await duringBreak.wait('room', m => m.room.levelState.platforms.crumbleB.phase === 'warning')).room;
    expect(hooked.levelState.platforms.crumbleB.durationMs).toBe(1650); expect(hooked.exitUnlocked).toBe(true);
    source.send({ type: 'exit', seq: 5 }); expect((await duringBreak.wait('room', m => m.room.reachedExit[slot - 1])).room.completed).toBe(false);
    duringBreak.send({ type: 'exit', seq: 1 }); await source.wait('room', m => m.room.completed);
    const path = join(dir, 'rooms', code + '.json'), disk = JSON.parse(await readFile(path, 'utf8'));
    expect(disk.levelState).toEqual({ tested: { foot: true, hook: true } }); expect(disk.cubePlacements).toEqual({});
    await kill(app.child); const restarted = await launch(dir), back = await connect<'crumble-lab'>(restarted.url, a.cookie);
    back.send({ type: 'join', code }); const restored = (await back.wait('snapshot')).room;
    expect(Object.values(restored.levelState.platforms).every(p => p.phase === 'stable')).toBe(true);
    expect(restored.completed).toBe(true);
});
it('migrates a real version-3 disk file preserving docked cargo and completed arrivals', async () => {
    const { dir, app, a, b, code } = await pair('pairing-bay'); await kill(app.child);
    const path = join(dir, 'rooms', code + '.json'), r = JSON.parse(await readFile(path, 'utf8'));
    delete r.levelState; Object.assign(r, { version: 3, switchB: true, checkpoint: 'reunion', cubePlacement: 'cargoPlate', exitUnlocked: true, reachedExit: [true, true], completed: true });
    await writeFile(path, JSON.stringify(r)); const restarted = await launch(dir), back = await connect(restarted.url, a.cookie);
    back.send({ type: 'join', code }); const restored = (await back.wait('snapshot')).room;
    expect(restored).toMatchObject({ level: 'pairing-bay', checkpoint: 'reunion', cubePlacement: 'cargoPlate', completed: true, reachedExit: [true, true] });
    const disk = JSON.parse(await readFile(path, 'utf8')); expect(disk.version).toBe(5); expect(disk.visitors).toEqual([a.id, b.id]); expect(disk.createdAt).toBe(r.createdAt);
});
