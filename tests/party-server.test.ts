import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { directory, launch, kill, identity, connect, avatar } from './helpers/coop-server.ts';
import { COOP_CAMPAIGN, nextChamber } from '../src/coop/campaign.ts';
import { newRecord, readRoomRecord, validRecord } from '../server/coop-state.ts';
import { newParty, selectChamber } from '../server/party-state.ts';
import { parseClientMessage, type CoopLevelId } from '../src/coop/protocol.ts';

async function party() {
    const dir = await directory(), app = await launch(dir), host = await identity(app.url), guest = await identity(app.url);
    const a = await connect<CoopLevelId>(app.url, host.cookie), b = await connect<CoopLevelId>(app.url, guest.cookie);
    a.send({ type: 'create-party' }); const first = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: first.code }); await b.wait('snapshot');
    let seq = [0, 0];
    const act = async (slot: 1 | 2, value: object) => {
        const p = slot === 1 ? a : b, n = ++seq[slot - 1]; p.send({ ...value, seq: n });
        return p.wait('action-result', m => m.seq === n);
    };
    return { dir, app, host, guest, a, b, first, act };
}
it('one public order supplies numbering/next and strict host requests cannot inject identity or state', () => {
    expect(COOP_CAMPAIGN.map(l => l.id)).toEqual(['crossfeed-vault', 'race-condition']);
    expect(nextChamber('crossfeed-vault')).toBe('race-condition'); expect(nextChamber('race-condition')).toBeNull();
    const request = { type: 'select-level', seq: 1, level: 'race-condition', levelInstance: 1 };
    expect(parseClientMessage(JSON.stringify(request))).toEqual(request);
    for (const patch of [{ level: 'boost-lab' }, { levelInstance: 0 }, { levelInstance: 1.5 }, { levelInstance: undefined }, { host: 1 }, { slot: 1 }, { revision: 1 }])
        expect(parseClientMessage(JSON.stringify({ ...request, ...patch }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ type: 'create-party', levelInstance: 1 }))).toBeNull();
});
it('host owns selection across fixed membership; transitions reset live machinery and reject every old-generation input', async () => {
    const f = await party(); expect(f.first.party).toEqual({ phase: 'lobby', completedLevels: [] });
    expect((await f.act(2, { type: 'select-level', level: 'race-condition' })).accepted).toBe(false);
    expect((await f.act(1, { type: 'control', control: 'switchB' })).accepted).toBe(false);
    const started = (await f.act(1, { type: 'select-level', level: 'race-condition' })).room;
    expect(started.levelInstance).toBe(2); expect(started.code).toBe(f.first.code);
    await f.act(1, { type: 'occupancy', plate: 'dropA' });
    const epoch = started.cubes.cubeA!.epoch;
    await f.act(1, { type: 'cube-contact', cubeId: 'cubeA', epoch, sensor: 'buffer' });
    await f.act(1, { type: 'cube-occupancy', cubeId: 'cubeA', epoch, placement: 'receiver' });
    await f.act(1, { type: 'occupancy', plate: 'trace' });
    await f.act(1, { type: 'control', control: 'phase' });
    await f.act(2, { type: 'crumble-trigger', platform: 'crumbleA', trigger: 'hook' });
    const holding = await f.act(2, { type: 'cube-pickup', cubeId: 'cubeB', epoch: started.cubes.cubeB!.epoch });
    expect(holding.room.cubes.cubeB!.holder).toBe(2);
    const next = (await f.act(1, { type: 'select-level', level: 'crossfeed-vault' })).room;
    expect(next).toMatchObject({ code: started.code, levelInstance: 3, checkpoint: 'entry', reachedExit: [false, false], completed: false });
    expect(next.levelState).toMatchObject({ inputs: { switchB: false, switchC: false, switchD: false, plateAOccupied: false } });
    expect(Object.values(next.cubes).every(c => !c.holder && !c.pulling && !c.transform)).toBe(true);
    for (const action of [
        { type: 'control', control: 'switchB' }, { type: 'exit' }, { type: 'occupancy', plate: 'plateA' },
        { type: 'local-reset' }, { type: 'cube-pickup', cubeId: 'cubeA', epoch },
        { type: 'cube-occupancy', cubeId: 'cubeA', epoch, placement: 'liftCargo' },
        { type: 'cube-contact', cubeId: 'cubeA', epoch, sensor: 'buffer' },
        { type: 'crumble-trigger', platform: 'crumbleA', trigger: 'hook' },
        { type: 'select-level', level: 'race-condition' },
    ]) expect((await f.act(1, { ...action, levelInstance: started.levelInstance })).accepted).toBe(false);
    f.a.sendRaw({ type: 'avatar', seq: 900, levelInstance: 2, avatar });
    f.a.sendRaw({ type: 'cube', cubeId: 'cubeA', seq: 900, epoch: next.cubes.cubeA!.epoch, levelInstance: 2, transform: { x: 99, y: 99, vx: 0, vy: 0, grounded: true } });
    const missing = await f.act(1, { type: 'control', control: 'switchB', levelInstance: undefined });
    expect(missing.accepted).toBe(false); expect(missing.room.revision).toBe(next.revision);
    expect(missing.room.cubes.cubeA!.transform).toBeNull(); expect(f.b.messages.some(m => m.type === 'avatar' || m.type === 'cube')).toBe(false);
    f.a.send({ type: 'avatar', seq: 1, avatar }); expect((await f.b.wait('avatar')).levelInstance).toBe(3); // rejected stream did not advance sequence
    const replay = (await f.act(1, { type: 'select-level', level: 'race-condition' })).room;
    expect(replay.levelState).toMatchObject({ buffer: { phase: 'idle' }, platforms: { crumbleA: { phase: 'stable' } }, inputs: { phase: false, traceOccupied: false } });
    expect(replay.levelInstance).toBe(4);
});
it('completion is durable before victory, requires two arrivals, and replays retain badges across SIGKILL', async () => {
    const f = await party(); let r = (await f.act(1, { type: 'select-level', level: 'race-condition' })).room;
    expect((await f.act(1, { type: 'exit' })).accepted).toBe(false);
    await f.act(1, { type: 'cube-occupancy', cubeId: 'cubeA', epoch: r.cubes.cubeA!.epoch, placement: 'receiver' });
    await f.act(2, { type: 'control', control: 'commit' });
    await f.act(1, { type: 'exit' }); r = (await f.act(1, { type: 'exit' })).room;
    expect(r.party!.phase).toBe('playing'); expect(r.reachedExit).toEqual([true, false]);
    r = (await f.act(2, { type: 'exit' })).room;
    expect(r.party).toEqual({ phase: 'victory', completedLevels: ['race-condition'] });
    const path = join(f.dir, 'rooms', r.code + '.json');
    expect(JSON.parse(await readFile(path, 'utf8')).party).toEqual(r.party);
    expect((await f.act(2, { type: 'select-level', level: 'crossfeed-vault' })).accepted).toBe(false);
    await kill(f.app.child); const restart = await launch(f.dir);
    const guest = await connect<CoopLevelId>(restart.url, f.guest.cookie); guest.send({ type: 'join', code: r.code });
    const restored = await guest.wait('snapshot'); expect(restored.slot).toBe(2); expect(restored.room.party).toEqual(r.party);
    guest.send({ type: 'select-level', seq: 1, level: 'crossfeed-vault' }); expect((await guest.wait('action-result')).accepted).toBe(false);
    const host = await connect<CoopLevelId>(restart.url, f.host.cookie); host.send({ type: 'join', code: r.code });
    expect((await host.wait('snapshot')).slot).toBe(1);
    host.send({ type: 'select-level', seq: 1, level: 'race-condition' }); const replay = (await host.wait('action-result')).room;
    expect(replay.party).toEqual({ phase: 'playing', completedLevels: ['race-condition'] });
    expect(replay.levelInstance).toBe(r.levelInstance + 1); expect(replay.completed).toBe(false);
    expect(replay.cubePlacements).toEqual({ cubeA: 'spawn', cubeB: 'spawn' });
    expect(JSON.parse(await readFile(path, 'utf8')).party.completedLevels).toEqual(['race-condition']);
});
it.each(['buffer', 'warning', 'broken'] as const)('restarting RACE during %s clears clocks and denies queued previous-instance actions', async phase => {
    const f = await party(); const r = (await f.act(1, { type: 'select-level', level: 'race-condition' })).room;
    if (phase === 'buffer') {
        const active = await f.act(1, { type: 'cube-contact', cubeId: 'cubeA', epoch: r.cubes.cubeA!.epoch, sensor: 'buffer' });
        expect(active.room.levelState).toMatchObject({ buffer: { phase: 'window' } });
    } else {
        await f.act(1, { type: 'cube-occupancy', cubeId: 'cubeA', epoch: r.cubes.cubeA!.epoch, placement: 'receiver' });
        await f.act(1, { type: 'occupancy', plate: 'trace' }); await f.act(1, { type: 'control', control: 'phase' });
        const warning = await f.act(2, { type: 'crumble-trigger', platform: 'crumbleA', trigger: 'hook' });
        expect(warning.room.levelState).toMatchObject({ platforms: { crumbleA: { phase: 'warning' } } });
        if (phase === 'broken') await f.b.wait('room', m => m.room.level === 'race-condition' && m.room.levelState.platforms.crumbleA.phase === 'broken');
    }
    f.a.sendRaw({ type: 'select-level', seq: 100, levelInstance: r.levelInstance, level: 'race-condition' });
    f.a.sendRaw({ type: 'occupancy', seq: 101, levelInstance: r.levelInstance, plate: 'dropA' });
    const changed = await f.a.wait('action-result', m => m.seq === 100), stale = await f.a.wait('action-result', m => m.seq === 101);
    expect(changed.accepted).toBe(true); expect(stale.accepted).toBe(false);
    expect(stale.room.levelInstance).toBe(r.levelInstance + 1);
    expect(stale.room.levelState).toMatchObject({ buffer: { phase: 'idle', remainingMs: 0 },
        inputs: { dropA: false, traceOccupied: false, phase: false }, platforms: { crumbleA: { phase: 'stable' }, crumbleB: { phase: 'stable' } } });
});
it('SIGKILL during gameplay preserves the current chamber/checkpoint while host reconnects after guest', async () => {
    const f = await party(); await f.act(1, { type: 'select-level', level: 'crossfeed-vault' });
    await f.act(1, { type: 'control', control: 'switchB' });
    let room = (await f.act(2, { type: 'control', control: 'switchC' })).room;
    await f.act(1, { type: 'cube-occupancy', cubeId: 'cubeA', epoch: room.cubes.cubeA!.epoch, placement: 'liftCargo' });
    await kill(f.app.child); const restart = await launch(f.dir);
    const guest = await connect<CoopLevelId>(restart.url, f.guest.cookie); guest.send({ type: 'join', code: room.code });
    room = (await guest.wait('snapshot')).room;
    expect(room).toMatchObject({ level: 'crossfeed-vault', levelInstance: 2, checkpoint: 'upper', cubePlacements: { cubeA: 'liftCargo' }, connected: [false, true] });
    guest.send({ type: 'select-level', seq: 1, level: 'race-condition' }); expect((await guest.wait('action-result')).accepted).toBe(false);
    const host = await connect<CoopLevelId>(restart.url, f.host.cookie); host.send({ type: 'join', code: room.code });
    expect((await host.wait('snapshot')).slot).toBe(1);
    host.send({ type: 'select-level', seq: 1, level: 'race-condition' }); expect((await host.wait('action-result')).accepted).toBe(true);
});
it.each(['crossfeed-vault', 'race-condition', 'boost-lab'] as const)('version-5 %s migrates intact before join acknowledgment', async level => {
    const dir = await directory(), app = await launch(dir), host = await identity(app.url), guest = await identity(app.url);
    const record = newRecord('ABCD', host.id, level); record.visitors[1] = guest.id;
    record.exitUnlocked = true; record.reachedExit = [true, true]; record.completed = true;
    if (record.level === 'crossfeed-vault') { record.levelState = { switchB: true, switchC: true, switchD: true }; record.checkpoint = 'upper'; record.cubePlacements = { cubeA: 'finalRight', cubeB: 'finalLeft' }; }
    if (record.level === 'race-condition') { record.levelState.finalControl = true; record.checkpoint = 'reunion'; record.cubePlacements.cubeA = 'receiver'; }
    if (record.level === 'boost-lab') record.levelState.routeLatched = true;
    const { party: _party, levelInstance: _instance, ...old } = record;
    const legacy = { ...old, version: 5 }; const path = join(dir, 'rooms', 'ABCD.json');
    await mkdir(join(dir, 'rooms'), { recursive: true }); await writeFile(path, JSON.stringify(legacy));
    const a = await connect<CoopLevelId>(app.url, host.cookie); a.send({ type: 'join', code: 'ABCD' });
    const saved = (await a.wait('snapshot')).room;
    expect(saved).toMatchObject({ level, completed: true, cubePlacements: record.cubePlacements, checkpoint: record.checkpoint });
    expect(saved.party).toEqual(level === 'boost-lab' ? null : { phase: 'victory', completedLevels: [level] });
    const disk = JSON.parse(await readFile(path, 'utf8')); expect(disk.version).toBe(6); expect(disk.visitors).toEqual(record.visitors);
    expect(validRecord(disk, 'ABCD')).toBe(true);
});
it('rejects corrupt party records and keeps progress scoped to each code', () => {
    const host = '11111111-1111-4111-8111-111111111111', r = newParty('ABCD', host);
    expect(validRecord(r, r.code)).toBe(true); expect(selectChamber(r, 'guest', 'race-condition')).toBeNull();
    for (const patch of [{ levelInstance: 0 }, { party: null }, { party: { phase: 'victory', completedLevels: [] } },
        { party: { phase: 'playing', completedLevels: ['boost-lab'] } }, { party: { phase: 'playing', completedLevels: ['race-condition', 'race-condition'] } }])
        expect(readRoomRecord({ ...r, ...patch }, r.code)).toBeNull();
    r.party!.completedLevels.push('race-condition'); expect(newParty('EFGH', host).party!.completedLevels).toEqual([]);
});
