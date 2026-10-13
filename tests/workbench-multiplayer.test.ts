import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { once } from 'node:events';
import { expect, it } from 'vitest';
import { directory, connect, cleanups, avatar } from './helpers/coop-server.ts';
import { attachMultiplayer } from '../server/multiplayer.ts';
import { DraftSessionRegistry } from '../scripts/level-tools/session-registry.ts';
import { newDraft, serializeDraft } from '../src/workbench/model.ts';
import { parseClientMessage } from '../src/coop/protocol.ts';

async function fixture(cubeCount = 3) {
    const dir = await directory(), registry = new DraftSessionRegistry(), document = newDraft('network-fixture');
    document.geometry.objects.push({ type: 'cube', id: 'second', x: 340, y: 658, mark: 'B' }, { type: 'cube', id: 'third', x: 390, y: 658, mark: 'C' },
        { type: 'platform', id: 'unstable', kind: 'unstable', x: 1100, y: 430, w: 120, h: 30, crumbleDelay: .05, respawnDelay: .06 });
    for (let i = 3; i < cubeCount; i++) document.geometry.objects.push({ type: 'cube', id: `extra${i}`, x: 500 + i * 50, y: 658, mark: String(i) });
    const frozen = await registry.register(document);
    const server = createServer(); const multiplayer = await attachMultiplayer(server, dir, { drafts: registry });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    cleanups.push(async () => { multiplayer.shutdown(); await multiplayer.drained(); await new Promise<void>(r => server.close(() => r())); });
    const a = await connect<'workbench'>(url, 'bn_visitor=11111111-1111-4111-8111-111111111111');
    const b = await connect<'workbench'>(url, 'bn_visitor=22222222-2222-4222-8222-222222222222');
    a.send({ type: 'create-draft', hash: frozen.hash }); const first = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: first.code }); await b.wait('snapshot');
    const sequences = [0, 0];
    const act = async (slot: 1 | 2, message: object) => { const client = slot === 1 ? a : b, seq = ++sequences[slot - 1]; client.send({ ...message, seq }); return client.wait('action-result', m => m.seq === seq); };
    return { a, b, first, act, registry, document, frozen, dir, multiplayer };
}

it('draft message namespace is disabled in the production parser, malformed IDs rejected everywhere', () => {
    const create = JSON.stringify({ type: 'create-draft', hash: 'a'.repeat(64) });
    expect(parseClientMessage(create)).toBeNull(); expect(parseClientMessage(create, true)).not.toBeNull();
    const action = { type: 'control', seq: 1, control: 'draft:routeLever' };
    expect(parseClientMessage(JSON.stringify(action))).toBeNull(); expect(parseClientMessage(JSON.stringify(action), true)).not.toBeNull();
    for (const control of ['draft:../escape', 'draft:__proto__', 'draft:', 'draft:a'.padEnd(80, 'x')])
        expect(parseClientMessage(JSON.stringify({ ...action, control }), true)).toBeNull();
});

it('three independently arbitrated cubes, body/cube power, toggles, and two distinct arrivals share one frozen draft', async () => {
    const f = await fixture(), ids = ['draft:payload', 'draft:second', 'draft:third'] as const;
    expect(f.first.party).toBeNull(); expect(f.first.draft?.hash).toBe(f.frozen.hash); expect(Object.keys(f.first.cubes)).toEqual(ids);
    const powered = await f.act(1, { type: 'draft-occupancy', devices: ['draft:powerPlate'] });
    expect(powered.room.levelState.outputs.routePower).toBe(true);
    await f.act(1, { type: 'cube-occupancy', cubeId: ids[0], epoch: f.first.cubes[ids[0]]!.epoch, placement: 'draft:powerPlate' });
    const released = await f.act(1, { type: 'draft-occupancy', devices: [] });
    expect(released.room.levelState.outputs.routePower).toBe(true);
    const picked = await f.act(2, { type: 'cube-pickup', cubeId: ids[0], epoch: f.first.cubes[ids[0]]!.epoch });
    expect(picked.accepted).toBe(true); expect(picked.room.cubes[ids[0]]!.holder).toBe(2);
    const another = await f.act(2, { type: 'cube-pickup', cubeId: ids[1], epoch: f.first.cubes[ids[1]]!.epoch });
    expect(another.accepted).toBe(false);
    const transformed = { x: 620, y: 600, vx: 0, vy: 0, grounded: false };
    f.a.send({ type: 'cube', cubeId: ids[0], epoch: picked.room.cubes[ids[0]]!.epoch, seq: 1, transform: transformed });
    f.b.send({ type: 'cube', cubeId: ids[0], epoch: picked.room.cubes[ids[0]]!.epoch, seq: 1, transform: transformed });
    expect((await f.a.wait('cube')).transform).toEqual(transformed);
    expect(f.b.messages.some(m => m.type === 'cube')).toBe(false);
    const thirdBefore = picked.room.cubes[ids[2]]!.epoch;
    const reset = await f.act(1, { type: 'cube-reset', cubeId: ids[1], epoch: f.first.cubes[ids[1]]!.epoch, cause: 'recovery' });
    expect(reset.room.cubes[ids[1]]!.lastReset?.cause).toBe('recovery'); expect(reset.room.cubes[ids[2]]!.epoch).toBe(thirdBefore);
    await f.act(2, { type: 'control', control: 'draft:routeLever' });
    await f.act(2, { type: 'control', control: 'draft:routeLever' });
    const firstArrival = await f.act(1, { type: 'exit' });
    expect(firstArrival.room.exitUnlocked).toBe(true); expect(firstArrival.room.completed).toBe(false);
    const duplicate = await f.act(1, { type: 'exit' }); expect(duplicate.room.reachedExit).toEqual([true, false]);
    const complete = await f.act(2, { type: 'exit' }); expect(complete.room.completed).toBe(true); expect(complete.room.party).toBeNull();
    const saved = JSON.parse(await readFile(join(f.dir, 'rooms', f.first.code + '.json'), 'utf8'));
    expect(saved.party).toBeNull(); expect(saved.draft.hash).toBe(f.frozen.hash);
});

it('edits remain frozen until host restart, then old actions/transforms are rejected and both peers get a new generation', async () => {
    const f = await fixture(), before = serializeDraft(f.registry.document(f.frozen.hash)!);
    f.document.geometry.width += 200;
    const next = await f.registry.register(f.document);
    expect(serializeDraft(f.registry.document(f.frozen.hash)!)).toBe(before);
    const unchanged = await f.act(1, { type: 'control', control: 'draft:routeLever' }); expect(unchanged.room.draft?.hash).toBe(f.frozen.hash);
    expect((await f.act(2, { type: 'restart-draft', hash: next.hash })).accepted).toBe(false);
    const restarted = await f.act(1, { type: 'restart-draft', hash: next.hash });
    expect(restarted.accepted).toBe(true); expect(restarted.room.levelInstance).toBe(2); expect(restarted.room.draft?.hash).toBe(next.hash);
    expect((await f.b.wait('room', m => m.room.levelInstance === 2)).room.draft?.hash).toBe(next.hash);
    for (const patch of [{ levelInstance: 1 }, { levelInstance: undefined }]) {
        const old = await f.act(1, { type: 'control', control: 'draft:routeLever', ...patch });
        expect(old.accepted).toBe(false); expect(old.room.levelState.devices['routeLever.value']).toBe(false);
    }
    f.a.sendRaw({ type: 'avatar', seq: 999, levelInstance: 1, avatar });
    f.a.sendRaw({ type: 'cube', seq: 999, levelInstance: 1, cubeId: 'draft:payload', epoch: restarted.room.cubes['draft:payload'].epoch,
        transform: { x: 99, y: 99, vx: 0, vy: 0, grounded: true } });
    const probe = await f.act(1, { type: 'draft-occupancy', devices: [] });
    expect(probe.room.cubes['draft:payload'].transform).toBeNull(); expect(f.b.messages.some(m => m.type === 'avatar' || m.type === 'cube')).toBe(false);
    f.a.send({ type: 'avatar', seq: 1, avatar }); expect((await f.b.wait('avatar')).levelInstance).toBe(2);
});

it('draft crumble phases are server-owned with per-object timings and independent reset', async () => {
    const f = await fixture();
    const warning = await f.act(2, { type: 'crumble-trigger', platform: 'draft:unstable', trigger: 'foot' });
    expect(warning.accepted).toBe(true); expect(warning.room.levelState.platforms['draft:unstable'].phase).toBe('warning');
    await f.b.wait('room', m => m.room.levelState.platforms['draft:unstable'].phase === 'broken');
    await f.b.wait('room', m => m.room.levelState.platforms['draft:unstable'].phase === 'stable' && m.room.revision > warning.room.revision);
    expect((await f.act(1, { type: 'crumble-trigger', platform: 'draft:missing', trigger: 'foot' })).accepted).toBe(false);
});

it('eight cubes retain bounded rate limits while allowing one avatar and eight legitimate 20 Hz streams', async () => {
    const f = await fixture(8), ids = Object.keys(f.first.cubes);
    expect(ids).toHaveLength(8);
    for (let seq = 1; seq <= 50; seq++) {
        f.a.send({ type: 'avatar', seq, avatar });
        for (const id of ids) f.a.send({ type: 'cube', cubeId: id, epoch: f.first.cubes[id as `draft:${string}`].epoch, seq,
            transform: { x: 600, y: 650, vx: 0, vy: 0, grounded: true } });
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(f.a.ws.readyState).toBe(1);
    expect(f.b.messages.filter(m => m.type === 'cube')).toHaveLength(400);
    expect((await f.act(1, { type: 'draft-occupancy', devices: [] })).accepted).toBe(true);
});

it('single-arrival/nonlatched documents remain renderable but co-op fails clearly', async () => {
    const f = await fixture();
    const exit = f.document.geometry.objects.find(o => o.type === 'exit')!;
    if (exit.type !== 'exit') throw new Error('Expected exit fixture');
    exit.arrivals = 1; exit.latch = false;
    const local = await f.registry.register(f.document);
    expect(f.registry.document(local.hash)?.geometry.objects.find(o => o.type === 'exit')).toMatchObject({ arrivals: 1, latch: false });
    const c = await connect<'workbench'>(f.a.ws.url.replace('ws://', 'http://').replace('/ws', ''), 'bn_visitor=33333333-3333-4333-8333-333333333333');
    c.send({ type: 'create-draft', hash: local.hash });
    const error = await c.wait('error'); expect(error.code).toBe('DRAFT_NOT_COOP_COMPATIBLE'); expect(error.message).toContain('two distinct arrivals');
});

it('one authoritative cube can occupy overlapping ordinary plates and sockets without powering a scanner', async () => {
    const f = await fixture();
    f.document.geometry.objects.push({ type: 'device', id: 'secondPlate', kind: 'plate', x: 440, y: 680 }, { type: 'device', id: 'socket', kind: 'socket', x: 440, y: 680 }, { type: 'device', id: 'scanner', kind: 'scanner', x: 440, y: 680 });
    const next = await f.registry.register(f.document), restarted = await f.act(1, { type: 'restart-draft', hash: next.hash });
    const epoch = restarted.room.cubes['draft:payload'].epoch;
    const sampled = await f.act(1, { type: 'draft-cube-occupancy', cubeId: 'draft:payload', epoch, devices: ['draft:powerPlate', 'draft:secondPlate', 'draft:socket'] });
    expect(sampled.room.levelState.devices).toMatchObject({ 'powerPlate.occupied': true, 'secondPlate.occupied': true, 'socket.occupied': true, 'scanner.occupied': false });
    expect((await f.act(2, { type: 'draft-cube-occupancy', cubeId: 'draft:payload', epoch, devices: [] })).accepted).toBe(false);
    expect((await f.act(1, { type: 'draft-cube-occupancy', cubeId: 'draft:payload', epoch, devices: ['draft:scanner'] })).accepted).toBe(false);
    const empty = await f.act(1, { type: 'draft-cube-occupancy', cubeId: 'draft:payload', epoch, devices: [] });
    expect(empty.room.levelState.devices['secondPlate.occupied']).toBe(false);
});
