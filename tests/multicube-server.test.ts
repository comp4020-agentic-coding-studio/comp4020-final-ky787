import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { directory, launch, kill, identity, connect, avatar } from './helpers/coop-server.ts';
import { newRecord, readRoomRecord, validRecord } from '../server/coop-state.ts';
import { parseClientMessage, type CubeId } from '../src/coop/protocol.ts';

async function setup() {
    const dir = await directory(), app = await launch(dir), identities = [await identity(app.url), await identity(app.url)];
    const a = await connect<'crossfeed-vault'>(app.url, identities[0].cookie);
    a.send({ type: 'create', level: 'crossfeed-vault' }); const initial = (await a.wait('snapshot')).room;
    const b = await connect<'crossfeed-vault'>(app.url, identities[1].cookie);
    b.send({ type: 'join', code: initial.code }); await b.wait('snapshot');
    const peers = [a, b], sequences = [0, 0];
    const act = async (slot: number, message: Record<string, unknown>) => {
        const seq = ++sequences[slot - 1], p = peers[slot - 1]; p.send({ ...message, seq });
        return p.wait('action-result', m => m.seq === seq);
    };
    await act(1, { type: 'control', control: 'switchB' });
    const ready = await act(2, { type: 'control', control: 'switchC' });
    return { dir, app, identities, peers, act, room: ready.room };
}
const transform = (x: number) => ({ x, y: 500, vx: 0, vy: 0, grounded: true });

it.each([1, 2])('P%s and partner independently hold two cubes; one player cannot control both', async slot => {
    const f = await setup(), other = 3 - slot, a = f.room.cubes.cubeA!, b = f.room.cubes.cubeB!;
    const first = await f.act(slot, { type: 'cube-pickup', cubeId: 'cubeA', epoch: a.epoch });
    expect(first.accepted).toBe(true); expect(first.room.cubes.cubeB).toEqual(b);
    for (const type of ['cube-pickup', 'cube-pull-start']) {
        expect((await f.act(slot, { type, cubeId: 'cubeB', epoch: b.epoch })).accepted).toBe(false);
    }
    const second = await f.act(other, { type: 'cube-pickup', cubeId: 'cubeB', epoch: b.epoch });
    expect(second.accepted).toBe(true); expect(second.room.cubes.cubeA).toEqual(first.room.cubes.cubeA);
    expect(second.room.cubes.cubeA!.holder).toBe(slot); expect(second.room.cubes.cubeB!.holder).toBe(other);
    const race = await f.act(other, { type: 'cube-pickup', cubeId: 'cubeA', epoch: a.epoch });
    expect(race.accepted).toBe(false); expect(race.room.cubes).toEqual(second.room.cubes);
    const reset = await f.act(slot, { type: 'local-reset' });
    expect(reset.room.cubes.cubeA!.holder).toBeNull(); expect(reset.room.cubes.cubeB).toEqual(second.room.cubes.cubeB);
    await f.peers[other - 1].close();
    const released = await f.peers[slot - 1].wait('room', m => m.room.cubes.cubeB!.holder === null && !m.room.connected[other - 1]);
    expect(released.room.cubes.cubeB!.physicsAuthority).toBe(slot);
});

it('streams, relay discontinuities and firewall epochs stay independent; only the simulator can reset', async () => {
    const f = await setup(), [a, b] = f.peers;
    a.send({ type: 'cube', cubeId: 'cubeA', epoch: f.room.cubes.cubeA!.epoch, seq: 70, transform: transform(1750) });
    await b.wait('cube', m => m.cubeId === 'cubeA');
    a.send({ type: 'cube', cubeId: 'cubeB', epoch: f.room.cubes.cubeB!.epoch, seq: 1, transform: transform(3280), discontinuity: 'relay' });
    expect((await b.wait('cube', m => m.cubeId === 'cubeB')).discontinuity).toBe('relay');
    expect((await f.act(2, { type: 'cube-reset', cubeId: 'cubeB', epoch: f.room.cubes.cubeB!.epoch, cause: 'firewall' })).accepted).toBe(false);
    const before = (await f.act(1, { type: 'cube-occupancy', cubeId: 'cubeA', epoch: f.room.cubes.cubeA!.epoch, placement: 'liftCargo' })).room;
    const reset = await f.act(1, { type: 'cube-reset', cubeId: 'cubeB', epoch: f.room.cubes.cubeB!.epoch, cause: 'firewall' });
    expect(reset.accepted).toBe(true); expect(reset.room.cubes.cubeA).toEqual(before.cubes.cubeA);
    expect(reset.room.cubePlacements).toEqual({ cubeA: 'liftCargo', cubeB: 'spawn' });
    expect(reset.room.cubes.cubeB).toMatchObject({ epoch: before.cubes.cubeB!.epoch + 1, seq: -1, transform: null, holder: null, pulling: false });
    a.send({ type: 'cube', cubeId: 'cubeB', epoch: before.cubes.cubeB!.epoch, seq: 999, transform: transform(9999) });
    a.send({ type: 'cube', cubeId: 'cubeA', epoch: before.cubes.cubeA!.epoch - 1, seq: 999, transform: transform(9999) });
    const stale = await f.act(1, { type: 'cube-pickup', cubeId: 'cubeB', epoch: before.cubes.cubeB!.epoch });
    expect(stale.accepted).toBe(false); expect(stale.room.cubes).toEqual(reset.room.cubes);
    expect((await f.act(1, { type: 'cube-reset', cubeId: 'cube', epoch: 1, cause: 'firewall' })).accepted).toBe(false);
    const disk = JSON.parse(await readFile(join(f.dir, 'rooms', f.room.code + '.json'), 'utf8'));
    expect(disk.cubePlacements).toEqual(reset.room.cubePlacements);
    expect(Object.keys(disk)).not.toContain('cubes');
});

it.each([false, true])('final pads accept swapped=%s assignment; distinct cubes and bodies are simultaneously required', async swapped => {
    const f = await setup(); await f.act(1, { type: 'control', control: 'switchD' });
    const left: CubeId = swapped ? 'cubeB' : 'cubeA', right: CubeId = swapped ? 'cubeA' : 'cubeB';
    const dock = (id: CubeId, placement: string) => f.act(1, { type: 'cube-occupancy', cubeId: id, epoch: f.room.cubes[id]!.epoch, placement });
    await dock(left, 'finalLeft');
    const one = await dock(left, 'finalRight');
    expect(one.room.levelState.outputs.codePlatformB).toBe(false);
    expect((await dock(right, 'finalRight')).accepted).toBe(false); // single capacity
    await dock(left, 'finalLeft'); const pair = await dock(right, 'finalRight');
    expect(pair.room.levelState.outputs.codePlatformB).toBe(true); expect(pair.room.exitUnlocked).toBe(false);
    await f.act(1, { type: 'occupancy', plate: 'finalLeft' });
    expect((await f.act(1, { type: 'occupancy', plate: 'finalRight' })).room.exitUnlocked).toBe(false);
    await dock(left, 'spawn'); await f.act(2, { type: 'occupancy', plate: 'finalLeft' });
    expect((await f.act(1, { type: 'exit' })).accepted).toBe(false);
    const unlocked = await dock(left, 'finalLeft'); expect(unlocked.room.exitUnlocked).toBe(true);
    await f.act(1, { type: 'occupancy', plate: null }); await f.act(2, { type: 'occupancy', plate: null });
    expect((await f.act(1, { type: 'exit' })).room.completed).toBe(false);
    expect((await f.act(1, { type: 'exit' })).room.completed).toBe(false);
    expect((await f.act(2, { type: 'exit' })).room.completed).toBe(true);
});

it('two durable cube placements survive restart without ephemeral ownership or transforms', async () => {
    const f = await setup(); await f.act(1, { type: 'control', control: 'switchD' });
    for (const [cubeId, placement] of [['cubeA', 'finalRight'], ['cubeB', 'finalLeft']] as const)
        await f.act(1, { type: 'cube-occupancy', cubeId, epoch: f.room.cubes[cubeId]!.epoch, placement });
    await kill(f.app.child); const restarted = await launch(f.dir), p = await connect<'crossfeed-vault'>(restarted.url, f.identities[1].cookie);
    p.send({ type: 'join', code: f.room.code }); const restored = (await p.wait('snapshot')).room;
    expect(restored.cubePlacements).toEqual({ cubeA: 'finalRight', cubeB: 'finalLeft' });
    expect(restored.checkpoint).toBe('upper'); expect(restored.levelState.outputs.codePlatformB).toBe(true);
    for (const c of Object.values(restored.cubes)) expect(c).toMatchObject({ physicsAuthority: 2, holder: null, pulling: false, transform: null, seq: -1 });
});

it('one browser can publish avatar and two cube streams at 20 Hz with bounded rate-limit headroom', async () => {
    const f = await setup(), [a, b] = f.peers;
    for (let seq = 1; seq <= 50; seq++) {
        a.send({ type: 'avatar', seq, avatar });
        for (const cubeId of ['cubeA', 'cubeB'] as const) a.send({ type: 'cube', cubeId, epoch: f.room.cubes[cubeId]!.epoch, seq, transform: transform(seq) });
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    for (const cubeId of ['cubeA', 'cubeB']) expect((await b.wait('cube', m => m.cubeId === cubeId && m.seq === 50)).transform.x).toBe(50);
    expect((await f.act(1, { type: 'local-reset' })).accepted).toBe(true);
});

it('strict cube identity and version-4 migrations preserve existing one-cube and cubeless rooms', () => {
    const msg = { type: 'cube-pickup', seq: 1, epoch: 1 };
    expect(parseClientMessage(JSON.stringify(msg))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ ...msg, cubeId: 'invented' }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ ...msg, cubeId: 'cubeA', holder: 1 }))).toBeNull();
    for (const level of ['pairing-bay', 'relay-lab', 'lift-lab', 'boost-lab', 'firewall-lab', 'crumble-lab'] as const) {
        const r = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', level);
        const { cubePlacements, ...rest } = r;
        const old = { ...rest, version: 4, cubePlacement: level === 'crumble-lab' ? null : 'spawn' };
        expect(readRoomRecord(old, r.code)).toEqual(r); expect(validRecord(r, r.code)).toBe(true);
        expect(readRoomRecord({ ...old, cubePlacement: 'unknown' }, r.code)).toBeNull();
    }
    const pairing = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', 'pairing-bay');
    pairing.levelState.switchB = true; pairing.checkpoint = 'reunion'; pairing.cubePlacements.cube = 'cargoPlate';
    const { cubePlacements, ...session } = pairing;
    expect(readRoomRecord({ ...session, version: 4, cubePlacement: cubePlacements.cube }, pairing.code)).toEqual(pairing);
    const chamber = newRecord('ABCD', pairing.visitors[0], 'crossfeed-vault');
    expect(readRoomRecord({ ...chamber, levelState: { switchB: false, switchC: false, unknown: false } }, chamber.code)).toBeNull();
});
