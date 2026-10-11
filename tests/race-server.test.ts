import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { directory, launch, kill, identity, connect } from './helpers/coop-server.ts';
import { parseClientMessage } from '../src/coop/protocol.ts';

async function setup() {
    const dir = await directory(), app = await launch(dir), ids = [await identity(app.url), await identity(app.url)];
    const a = await connect<'race-condition'>(app.url, ids[0].cookie);
    a.send({ type: 'create', level: 'race-condition' }); const room = (await a.wait('snapshot')).room;
    const b = await connect<'race-condition'>(app.url, ids[1].cookie); b.send({ type: 'join', code: room.code }); await b.wait('snapshot');
    const peers = [a, b], sequences = [0, 0];
    const act = async (slot: number, message: Record<string, unknown>) => {
        const seq = ++sequences[slot - 1], p = peers[slot - 1]; p.send({ ...message, seq }); return p.wait('action-result', m => m.seq === seq);
    };
    const contact = { type: 'cube-contact', cubeId: 'cubeA', epoch: room.cubes.cubeA!.epoch, sensor: 'buffer' };
    return { dir, app, ids, peers, room, act, contact };
}

it('only the accepted simulator starts one shared buffer window; timeout broadcasts without more input and reset advances A only', async () => {
    const f = await setup();
    expect((await f.act(2, f.contact)).accepted).toBe(false);
    expect((await f.act(1, { ...f.contact, cubeId: 'cubeB' })).accepted).toBe(false);
    const started = await f.act(1, f.contact); expect(started.accepted).toBe(true);
    expect(started.room.levelState.buffer).toMatchObject({ phase: 'window', durationMs: 2800 });
    expect((await f.act(1, f.contact)).accepted).toBe(false);
    const expired = (await f.peers[1].wait('room', m => m.room.levelState.buffer.phase === 'expired')).room;
    expect(expired.levelState.outputs).toMatchObject({ bufferBridge: false, safetyFirewall: true });
    const reset = await f.act(1, { type: 'cube-reset', cubeId: 'cubeA', epoch: f.contact.epoch, cause: 'firewall' });
    expect(reset.room.levelState.buffer.phase).toBe('idle'); expect(reset.room.cubePlacements.cubeA).toBe('spawn');
    expect(reset.room.cubes.cubeA!.epoch).toBe(f.contact.epoch + 1); expect(reset.room.cubes.cubeB).toEqual(f.room.cubes.cubeB);
    expect((await f.act(1, f.contact)).accepted).toBe(false);
});

it.each([1, 2])('P%s can operate either lever/plate role, momentary return revokes after grace, and final delivery needs two arrivals', async slot => {
    const f = await setup(), other = 3 - slot;
    await f.act(slot, { type: 'occupancy', plate: 'dropA' });
    await f.act(1, f.contact);
    const overlap = await f.act(other, { type: 'occupancy', plate: 'dropB' });
    expect(overlap.room.levelState.outputs.raceFirewall).toBe(true);
    const safe = await f.act(slot, { type: 'occupancy', plate: null });
    expect(safe.room.levelState.outputs).toMatchObject({ safetyFirewall: false, raceFirewall: false, bufferBridge: false });
    await f.act(1, { type: 'cube-occupancy', cubeId: 'cubeA', epoch: f.contact.epoch, placement: 'receiver' });
    const trace = await f.act(slot, { type: 'occupancy', plate: 'trace' });
    expect(trace.room.levelState.outputs.phaseA).toBe(true);
    const phase = await f.act(slot, { type: 'control', control: 'phase' });
    expect(phase.room.levelState.outputs).toMatchObject({ phaseA: false, phaseB: true });
    expect(phase.room.levelState.physical).toMatchObject({ phaseA: true, phaseB: true });
    await f.peers[other - 1].wait('room', m => m.room.levelState.inputs.phase && !m.room.levelState.physical.phaseA);
    await f.act(other, { type: 'occupancy', plate: 'return' });
    const off = await f.act(other, { type: 'occupancy', plate: null });
    expect(off.room.levelState.outputs.returnBridge).toBe(false); expect(off.room.levelState.physical.returnBridge).toBe(true);
    await f.peers[slot - 1].wait('room', m => m.room.revision > off.room.revision && !m.room.levelState.physical.returnBridge);
    await f.act(1, { type: 'cube-occupancy', cubeId: 'cubeB', epoch: f.room.cubes.cubeB!.epoch, placement: 'return' });
    const unlock = await f.act(other, { type: 'control', control: 'commit' });
    expect(unlock.room.exitUnlocked).toBe(true);
    const removed = await f.act(1, { type: 'cube-occupancy', cubeId: 'cubeA', epoch: f.contact.epoch, placement: 'spawn' });
    expect(removed.room.levelState.outputs.spanMaster).toBe(false); expect(removed.room.exitUnlocked).toBe(true);
    expect((await f.act(slot, { type: 'exit' })).room.completed).toBe(false);
    expect((await f.act(slot, { type: 'exit' })).room.completed).toBe(false);
    expect((await f.act(other, { type: 'exit' })).room.completed).toBe(true);
});

it('commit alone cannot unlock; restart restores safe semantic placement but never half-expired clocks', async () => {
    const f = await setup(); expect((await f.act(1, { type: 'control', control: 'commit' })).room.exitUnlocked).toBe(false);
    await f.act(1, f.contact);
    const disk = JSON.parse(await readFile(join(f.dir, 'rooms', f.room.code + '.json'), 'utf8'));
    expect(disk).not.toHaveProperty('race'); expect(disk).not.toHaveProperty('crumble');
    expect(disk.cubePlacements).toEqual({ cubeA: 'spawn', cubeB: 'spawn' });
    await kill(f.app.child); const app = await launch(f.dir), p = await connect<'race-condition'>(app.url, f.ids[1].cookie);
    p.send({ type: 'join', code: f.room.code }); const restored = (await p.wait('snapshot')).room;
    expect(restored.levelState.buffer.phase).toBe('idle'); expect(restored.levelState.outputs.topBridge).toBe(true);
    expect(restored.cubes.cubeA).toMatchObject({ holder: null, transform: null, physicsAuthority: 2 });
    expect(parseClientMessage(JSON.stringify({ ...f.contact, seq: 1, deadline: 99999 }))).toBeNull();
});

it('delivered cargo and RETURN restore after restart; removing restored B still receives bounded grace', async () => {
    const f = await setup();
    for (const [cubeId, placement] of [['cubeA', 'receiver'], ['cubeB', 'return']] as const)
        await f.act(1, { type: 'cube-occupancy', cubeId, epoch: f.room.cubes[cubeId]!.epoch, placement });
    await kill(f.app.child); const app = await launch(f.dir), p = await connect<'race-condition'>(app.url, f.ids[1].cookie);
    p.send({ type: 'join', code: f.room.code }); const restored = (await p.wait('snapshot')).room;
    expect(restored.checkpoint).toBe('reunion');
    expect(restored.levelState.inputs).toMatchObject({ payloadDelivered: true, returnOccupied: true, traceOccupied: false });
    expect(restored.levelState.buffer.phase).toBe('idle');
    expect(restored.levelState.outputs.spanMaster).toBe(false);
    p.send({ type: 'cube-pickup', cubeId: 'cubeB', epoch: restored.cubes.cubeB!.epoch, seq: 1 });
    const removed = (await p.wait('action-result')).room;
    expect(removed.levelState.outputs.returnBridge).toBe(false); expect(removed.levelState.physical.returnBridge).toBe(true);
    await p.wait('room', m => m.room.revision > removed.revision && !m.room.levelState.physical.returnBridge);
});
