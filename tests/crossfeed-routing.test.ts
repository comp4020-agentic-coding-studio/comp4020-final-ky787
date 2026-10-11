import { expect, it } from 'vitest';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { definition, newRecord, readRoomRecord, sharedRoom, validRecord } from '../server/coop-state.ts';
import { advanceCrossfeed, CROSSFEED_TIMING, freshCrossfeed, syncCrossfeed } from '../server/crossfeed-state.ts';
import { advanceCrumble, freshCrumble } from '../server/crumble-state.ts';
import { freshRace } from '../server/race-state.ts';
import { selectChamber } from '../server/party-state.ts';
import type { Plate } from '../src/coop/protocol.ts';
import { connect, directory, identity, launch, kill } from './helpers/coop-server.ts';

const host = '11111111-1111-4111-8111-111111111111', guest = '22222222-2222-4222-8222-222222222222';
function setup() {
    const record = newRecord('ABCD', host, 'crossfeed-vault'); record.visitors[1] = guest;
    const ctx = { record, held: [null, null] as [Plate, Plate], crossfeed: freshCrossfeed(), crumble: freshCrumble(), race: freshRace(), now: 1000 };
    const d = definition(record.level);
    const view = () => d.project(ctx);
    const toggle = (control: 'switchB' | 'switchC' | 'switchD' | 'routeMode') => { const accepted = d.action(ctx, { type: 'control', control, seq: 1 }); syncCrossfeed(ctx); return accepted; };
    return { ctx, record, d, view, toggle };
}
it('universal entry and reversible transfer mode resolve anchor/bridge/relay without closing the service bay', () => {
    const f = setup(); f.ctx.held[0] = 'entry'; expect(f.view().outputs.grappleAnchor).toBe(true);
    f.ctx.held[0] = null; f.record.cubePlacements.cubeA = 'entry'; expect(f.view().outputs.grappleAnchor).toBe(true);
    f.toggle('switchB'); expect(f.view().outputs).toMatchObject({ bridge: true, grappleAnchor: false, relayGates: false });
    f.record.cubePlacements.cubeA = 'liftCargo'; expect(f.view().outputs.liftField).toBe(true);
    f.record.cubePlacements.cubeA = 'spawn'; expect(f.view().outputs.liftField).toBe(false);
    f.toggle('switchC'); expect(f.record.checkpoint).toBe('upper');
    expect(f.view().outputs).toMatchObject({ liftField: true, serviceAccess: true, relayGates: false });
    f.toggle('switchB'); expect(f.view().outputs).toMatchObject({ bridge: false, serviceAccess: true, relayGates: true });
    expect(validRecord(f.record, 'ABCD')).toBe(true);
});
it('route selection works before power; release, reselection and fuse clocks have bounded shared grace', () => {
    const f = setup(); expect(f.toggle('routeMode')).toBe(true);
    expect(f.view().outputs).toMatchObject({ leftRoute: false, rightRoute: false });
    f.toggle('switchC'); f.ctx.held[0] = 'routePower'; syncCrossfeed(f.ctx);
    expect(f.view().outputs).toMatchObject({ leftRoute: false, rightRoute: true });
    const trigger = { type: 'crumble-trigger', platform: 'crumbleB', trigger: 'hook', seq: 1 } as const;
    expect(f.d.action(f.ctx, trigger)).toBe(true); expect(f.d.action(f.ctx, trigger)).toBe(false);
    expect(f.view().platforms.crumbleB).toMatchObject({ phase: 'warning', durationMs: 1650 });
    f.ctx.now += 651; f.toggle('routeMode');
    expect(f.view().outputs).toMatchObject({ leftRoute: true, rightRoute: false }); expect(f.view().physical).toEqual({ leftRoute: true, rightRoute: true });
    expect(f.toggle('routeMode')).toBe(false); // Cannot spam both routes into permanent overlap.
    f.ctx.now += 324; syncCrossfeed(f.ctx); expect(f.view().physical.rightRoute).toBe(true);
    f.ctx.now++; advanceCrossfeed(f.ctx.crossfeed, f.ctx.now); expect(f.view().physical.rightRoute).toBe(false);
    f.ctx.held[0] = null; syncCrossfeed(f.ctx); expect(f.view().outputs.leftRoute).toBe(false); expect(f.view().physical.leftRoute).toBe(true);
    f.ctx.now += CROSSFEED_TIMING.handover; advanceCrossfeed(f.ctx.crossfeed, f.ctx.now); expect(f.view().physical.leftRoute).toBe(false);
    f.ctx.now = 2650; advanceCrumble(f.ctx.crumble, f.ctx.now); expect(f.view().platforms.crumbleB.phase).toBe('broken');
    f.ctx.now += 2400; advanceCrumble(f.ctx.crumble, f.ctx.now); expect(f.view().platforms.crumbleB.phase).toBe('stable');
    f.record.cubePlacements.cubeA = 'routePower'; syncCrossfeed(f.ctx); expect(f.view().outputs.leftRoute).toBe(true);
    f.toggle('switchD'); expect(f.view().outputs).toMatchObject({ galleryAccess: true, leftRoute: true, rightRoute: false });
    f.record.cubePlacements.cubeA = 'spawn'; syncCrossfeed(f.ctx); expect(f.view().outputs).toMatchObject({ galleryAccess: true, leftRoute: false, rightRoute: false });
});
it('two sockets release the operator; two simultaneous scanners remain separate from payloads and arrivals', () => {
    const f = setup(); f.record.cubePlacements.cubeA = 'finalLeft'; expect(f.view().outputs.vaultReturn).toBe(false);
    f.record.cubePlacements.cubeB = 'finalRight'; expect(f.view().outputs).toMatchObject({ vaultReturn: true, vaultPower: true });
    f.ctx.held[0] = 'finalLeft'; expect(f.d.unlock(f.ctx)).toBe(false);
    f.ctx.held[0] = 'finalRight'; expect(f.d.unlock(f.ctx)).toBe(false);
    f.ctx.held[1] = 'finalLeft'; expect(f.d.unlock(f.ctx)).toBe(true);
    f.record.cubePlacements.cubeA = 'spawn'; expect(f.d.unlock(f.ctx)).toBe(false); expect(f.view().outputs.vaultReturn).toBe(false);
});
it.each([5, 6])('version %s v1 attempts migrate explicitly without erasing party identity or earned badges', version => {
    for (const completed of [false, true]) {
        const old = { ...newRecord('ABCD', host, 'crossfeed-vault'), version, levelInstance: 7, visitors: [host, guest],
            levelState: { switchB: true, switchC: true, switchD: true }, checkpoint: 'upper', cubePlacements: { cubeA: 'finalLeft', cubeB: 'finalRight' },
            completed, exitUnlocked: completed, reachedExit: [completed, completed],
            party: { phase: completed ? 'victory' : 'playing', completedLevels: completed ? ['race-condition', 'crossfeed-vault'] : ['race-condition'] } };
        const r = readRoomRecord(old, 'ABCD')!;
        expect(r).not.toBeNull(); expect(r.visitors).toEqual(old.visitors); expect(r.code).toBe(old.code);
        expect(r.levelState).toMatchObject({ chamberRevision: 2, switchB: false, switchC: false, switchD: false, routeMode: false });
        expect(r.cubePlacements).toEqual({ cubeA: 'spawn', cubeB: 'spawn' }); expect(r.checkpoint).toBe('entry');
        expect(r.levelInstance).toBe(version === 6 ? 8 : 2); expect(r.completed).toBe(completed);
        if (version === 6) expect(r.party).toEqual(old.party);
        expect(validRecord(r, 'ABCD')).toBe(true);
        expect(selectChamber(r, host, 'crossfeed-vault')!.levelState).not.toHaveProperty('legacyVictory');
        expect(readRoomRecord({ ...old, levelState: { switchB: false, switchC: true, switchD: false } }, 'ABCD')).toBeNull();
    }
    const race = newRecord('EFGH', host, 'race-condition'); expect(readRoomRecord(race, 'EFGH')).toBe(race);
});
it('both clients receive route expiry and independent unstable warning/collapse/respawn', async () => {
    const app = await launch(await directory()), a = await connect<'crossfeed-vault'>(app.url, (await identity(app.url)).cookie),
        b = await connect<'crossfeed-vault'>(app.url, (await identity(app.url)).cookie);
    a.send({ type: 'create', level: 'crossfeed-vault' }); const r = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: r.code }); await b.wait('snapshot'); let seq = 0;
    const act = async (m: object) => { a.send({ ...m, seq: ++seq }); return (await a.wait('action-result', m => m.seq === seq)).room; };
    await act({ type: 'control', control: 'switchC' }); await act({ type: 'occupancy', plate: 'routePower' });
    for (const platform of ['crumbleA', 'crumbleB'] as const) {
        if (platform === 'crumbleB') await act({ type: 'control', control: 'routeMode' });
        const start = await act({ type: 'crumble-trigger', platform, trigger: 'hook' });
        const other = (await b.wait('room', m => m.room.revision === start.revision)).room;
        expect(other.levelState.outputs).toEqual(start.levelState.outputs); expect(other.levelState.physical).toEqual(start.levelState.physical);
        expect(other.levelState.platforms[platform]).toMatchObject({ phase: 'warning', durationMs: 1650 });
        expect(Math.abs(other.levelState.platforms[platform].remainingMs - start.levelState.platforms[platform].remainingMs)).toBeLessThan(50);
        for (const phase of ['broken', 'stable'] as const) {
            const first = await a.wait('room', m => m.room.revision > start.revision && m.room.levelState.platforms[platform].phase === phase);
            const second = await b.wait('room', m => m.room.revision === first.room.revision);
            expect(second.room.levelState.platforms[platform].phase).toBe(phase);
            expect(second.room.levelState.platforms[platform].durationMs).toBe(first.room.levelState.platforms[platform].durationMs);
        }
    }
    const release = await act({ type: 'occupancy', plate: null });
    expect(release.levelState.outputs.rightRoute).toBe(false); expect(release.levelState.physical.rightRoute).toBe(true);
    for (const p of [a, b]) await p.wait('room', m => m.room.revision > release.revision && !m.room.levelState.physical.rightRoute);
}, 15000);

it.each([false, true])('v6 v1 migration is durable before returning host acknowledgment, completed=%s', async completed => {
    const dir = await directory(), app = await launch(dir), h = await identity(app.url), g = await identity(app.url);
    const old = { ...newRecord('ABCD', h.id, 'crossfeed-vault'), levelInstance: 9, visitors: [h.id, g.id],
        levelState: { switchB: true, switchC: true, switchD: true }, checkpoint: 'upper',
        party: { phase: completed ? 'victory' : 'playing', completedLevels: completed ? ['race-condition', 'crossfeed-vault'] : ['race-condition'] },
        completed, reachedExit: [completed, completed], exitUnlocked: completed, cubePlacements: { cubeA: 'finalLeft', cubeB: 'finalRight' } };
    await mkdir(join(dir, 'rooms'), { recursive: true }); const path = join(dir, 'rooms', 'ABCD.json'); await writeFile(path, JSON.stringify(old));
    const peer = await connect<'crossfeed-vault'>(app.url, h.cookie); peer.send({ type: 'join', code: 'ABCD' });
    const first = await peer.wait('snapshot'), saved = JSON.parse(await readFile(path, 'utf8'));
    expect(first.slot).toBe(1); expect(first.room.levelInstance).toBe(10);
    expect(saved).toMatchObject({ version: 6, levelInstance: 10, completed, visitors: old.visitors, party: old.party, levelState: { chamberRevision: 2 } });
    await kill(app.child); const restarted = await launch(dir), guest = await connect<'crossfeed-vault'>(restarted.url, g.cookie);
    guest.send({ type: 'join', code: 'ABCD' }); const restored = (await guest.wait('snapshot')).room;
    expect(restored.levelInstance).toBe(10); expect(restored.party).toEqual(old.party); expect(restored.completed).toBe(completed);
    expect(restored.cubePlacements).toEqual({ cubeA: 'spawn', cubeB: 'spawn' });
});
