import { readFile, rm, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { expect, it } from 'vitest';
import { CODE_PATTERN, normalizeCode, newerRoom, parseClientMessage, websocketUrl } from '../src/coop/protocol.ts';
import { RemoteAvatar } from '../src/coop/remote.ts';
import { attachMultiplayer, generateCode } from '../server/multiplayer.ts';
import { freshProgress } from '../src/slice/progress.ts';

import { avatar, cleanups, directory, launch, kill, identity, connect } from './helpers/coop-server.ts';

async function pair() {
    const dir = await directory(), app = await launch(dir);
    const a = await identity(app.url), b = await identity(app.url);
    const p1 = await connect(app.url, a.cookie); p1.send({ type: 'create' });
    const first = await p1.wait('snapshot');
    const p2 = await connect(app.url, b.cookie); p2.send({ type: 'join', code: first.room.code.toLowerCase() + ' ' });
    await p2.wait('snapshot');
    return { dir, app, a, b, p1, p2, code: first.room.code, first };
}

it('uses bounded explicit messages, normalized unambiguous codes and same-origin ws/wss URLs', () => {
    for (let i = 0; i < 1000; i++) expect(generateCode()).toMatch(CODE_PATTERN);
    expect(normalizeCode(' ab2z ')).toBe('AB2Z');
    for (const code of ['AB01', 'OOOO', 'IIII', 'LLLL', '../X', 'ABCDE', 'AB C']) expect(normalizeCode(code)).toBeNull();
    expect(parseClientMessage('{\"type\":\"exit\",\"seq\":1}')).toEqual({ type: 'exit', seq: 1 });
    for (const field of ['slot', 'visitor', 'completed', 'outputs', 'revision'])
        expect(parseClientMessage(JSON.stringify({ type: 'exit', seq: 1, [field]: 1 }))).toBeNull();
    for (const seq of [-1, 1.5, null, '1']) expect(parseClientMessage(JSON.stringify({ type: 'exit', seq }))).toBeNull();
    expect(websocketUrl('https://example.fly.dev/play')).toBe('wss://example.fly.dev/ws');
    expect(websocketUrl('http://localhost:5173/')).toBe('ws://localhost:5173/ws');
    for (const raw of ['{', 'null', '[]', '{"type":"occupancy","seq":1,"plate":"plateA","slot":2}', JSON.stringify({ type: 'avatar', seq: 1, avatar: { ...avatar, x: 1e30 } })]) expect(parseClientMessage(raw)).toBeNull();
});

it('creates exactly two visitor-owned slots, rejects invalid/unknown/full rooms, and replaces a refreshing socket safely', async () => {
    const { app, a, b, p1, p2, code, first } = await pair();
    expect(first.slot).toBe(1); expect(first.room.code).toMatch(CODE_PATTERN);
    expect(a.id).not.toBe(b.id);
    const third = await identity(app.url), p3 = await connect(app.url, third.cookie);
    p3.send({ type: 'join', code: '0000' }); expect((await p3.wait('error')).code).toBe('INVALID_CODE');
    p3.send({ type: 'join', code: code === 'ZZZZ' ? 'ZZZY' : 'ZZZZ' }); expect((await p3.wait('error')).code).toBe('ROOM_NOT_FOUND');
    p3.send({ type: 'join', code }); expect((await p3.wait('error')).code).toBe('ROOM_FULL');
    p1.send({ type: 'occupancy', seq: 1, plate: 'plateA' });
    await p2.wait('room', m => m.room.levelState.outputs.grappleAnchor);
    const replacement = await connect(app.url, a.cookie); replacement.send({ type: 'join', code });
    const restored = await replacement.wait('snapshot');
    expect(restored.slot).toBe(1); expect(restored.room.connected).toEqual([true, true]);
    expect(restored.room.levelState.outputs.grappleAnchor).toBe(false);
    expect((await p1.wait('error')).code).toBe('SESSION_REPLACED');
    replacement.send({ type: 'occupancy', seq: 1, plate: 'plateA' });
    await p2.wait('room', m => m.room.revision > restored.room.revision && m.room.levelState.outputs.grappleAnchor);
    replacement.send({ type: 'avatar', seq: 1, avatar });
    expect((await p2.wait('avatar')).slot).toBe(1);
});

it.each([1, 2] as const)('slot %s may hold A, its disconnect releases A, and its partner may latch B', async slot => {
    const { app, a, b, p1, p2, code } = await pair();
    const holder = slot === 1 ? p1 : p2, partner = slot === 1 ? p2 : p1;
    holder.send({ type: 'occupancy', seq: 1, plate: 'plateA' });
    const on = await partner.wait('room', m => m.room.levelState.outputs.grappleAnchor);
    expect(on.room.levelState.inputs.plateAOccupied).toBe(true);
    holder.send({ type: 'occupancy', seq: 2, plate: null });
    const off = await partner.wait('room', m => m.room.revision > on.room.revision && !m.room.levelState.outputs.grappleAnchor);
    expect(newerRoom(on.room, off.room)).toBe(true); expect(newerRoom(off.room, on.room)).toBe(false); expect(newerRoom(off.room, off.room)).toBe(false);
    holder.send({ type: 'occupancy', seq: 1, plate: 'plateA' }); expect((await holder.wait('error')).code).toBe('STALE_ACTION');
    holder.send({ type: 'occupancy', seq: 3, plate: 'plateA' }); await partner.wait('room', m => m.room.revision > off.room.revision && m.room.levelState.outputs.grappleAnchor);
    await holder.close(); const disconnected = await partner.wait('room', m => m.room.revision > off.room.revision && !m.room.connected[slot - 1]);
    expect(disconnected.room.levelState.outputs.grappleAnchor).toBe(false);
    partner.send({ type: 'switch', seq: 1 }); const latched = await partner.wait('room', m => m.room.levelState.inputs.switchB);
    expect(latched.room.levelState.outputs.returnBridge).toBe(true); expect(latched.room.checkpoint).toBe('reunion');
    partner.send({ type: 'switch', seq: 2 }); // New sequence, same latch: no extra mutation.
    partner.send({ type: 'occupancy', seq: 3, plate: 'plateA' });
    const held = await partner.wait('room', m => m.room.revision > latched.room.revision);
    expect(held.room.revision).toBe(latched.room.revision + 1); expect(held.room.levelState.outputs.returnBridge).toBe(true);
    await partner.close();
    const returning = await connect(app.url, (slot === 1 ? a : b).cookie); returning.send({ type: 'join', code });
    const restored = await returning.wait('snapshot');
    expect(restored.slot).toBe(slot); expect(restored.room.levelState.outputs.grappleAnchor).toBe(false);
    expect(restored.room.levelState.outputs.returnBridge).toBe(true); expect(restored.room.checkpoint).toBe('reunion');
});

it.each([1, 2] as const)('slot %s on the left unlocks with its partner; both distinct arrivals are still required', async leftSlot => {
    const { app, a, b, p1, p2, code } = await pair();
    const peers = [p1, p2], seq = [0, 0];
    const send = (index: number, message: object) => peers[index].send({ ...message, seq: ++seq[index] });
    send(0, { type: 'exit' }); expect((await p1.wait('error')).code).toBe('INVALID_ACTION');
    send(1, { type: 'occupancy', plate: 'finalLeft' }); expect((await p2.wait('error')).code).toBe('INVALID_ACTION');
    send(0, { type: 'switch' }); let latest = (await p2.wait('room', m => m.room.levelState.inputs.switchB)).room;
    send(0, { type: 'cube-occupancy', cubeId: 'cube' as const, epoch: latest.cube.epoch, placement: 'cargoPlate' });
    latest = (await p2.wait('room', m => m.room.levelState.inputs.cubeOnCargoPlate)).room;
    // One connected body alternating plates can never supply two simultaneous inputs.
    for (const plate of ['finalLeft', 'finalRight', 'finalLeft', 'finalRight', null] as const) {
        send(0, { type: 'occupancy', plate });
        latest = (await p2.wait('room', m => m.room.revision > latest.revision)).room;
        expect(latest.exitUnlocked).toBe(false); expect(latest.completed).toBe(false);
    }
    send(0, { type: 'occupancy', plate: 'finalLeft' }); latest = (await p2.wait('room', m => m.room.revision > latest.revision)).room;
    send(1, { type: 'occupancy', plate: 'finalLeft' }); latest = (await p2.wait('room', m => m.room.revision > latest.revision)).room;
    expect(latest.exitUnlocked).toBe(false); // Two bodies on the same plate also cannot unlock.
    for (const i of [0, 1]) {
        send(i, { type: 'occupancy', plate: null }); latest = (await p2.wait('room', m => m.room.revision > latest.revision)).room;
    }
    send(leftSlot - 1, { type: 'occupancy', plate: 'finalLeft' });
    send(2 - leftSlot, { type: 'occupancy', plate: 'finalRight' });
    latest = (await p2.wait('room', m => m.room.exitUnlocked)).room;
    expect(latest.levelState.outputs.exitDoor).toBe(true); expect(latest.completed).toBe(false); expect(latest.reachedExit).toEqual([false, false]);
    for (const i of [0, 1]) {
        send(i, { type: 'occupancy', plate: null }); latest = (await p2.wait('room', m => m.room.revision > latest.revision)).room;
        expect(latest.levelState.outputs.exitDoor).toBe(true); expect(latest.completed).toBe(false);
    }
    expect(latest.levelState.inputs.finalPlateLeftOccupied || latest.levelState.inputs.finalPlateRightOccupied).toBe(false);
    const first = leftSlot - 1, second = 1 - first;
    send(first, { type: 'exit' }); latest = (await peers[second].wait('room', m => m.room.reachedExit[first])).room;
    expect(latest.reachedExit[second]).toBe(false); expect(latest.completed).toBe(false);
    send(first, { type: 'exit' }); // Duplicate arrival must not count as another body.
    peers[first].send({ type: 'exit', seq: seq[first] }); expect((await peers[first].wait('error')).code).toBe('STALE_ACTION');
    await peers[first].close(); latest = (await peers[second].wait('room', m => m.room.revision > latest.revision && !m.room.connected[first])).room;
    expect(latest.exitUnlocked).toBe(true); expect(latest.levelState.outputs.exitDoor).toBe(true); expect(latest.reachedExit[first]).toBe(true); expect(latest.completed).toBe(false);
    const returning = await connect(app.url, (first === 0 ? a : b).cookie); returning.send({ type: 'join', code });
    const recovered = await returning.wait('snapshot');
    expect(recovered.slot).toBe(leftSlot); expect(recovered.room.reachedExit).toEqual(latest.reachedExit);
    expect(recovered.room.checkpoint).toBe('reunion'); expect(recovered.room.levelState.inputs.plateAOccupied).toBe(false);
    send(second, { type: 'exit' }); const complete = (await returning.wait('room', m => m.room.completed)).room;
    expect(complete.levelState.outputs.exitDoor).toBe(true); expect(complete.reachedExit).toEqual([true, true]);
});

it('persists logical state across SIGKILL/restart with no movement or occupancy, preserving C8 progress', async () => {
    const { dir, app, a, b, p1, p2, code } = await pair();
    const progress = freshProgress(); progress.currentRoom = 'relay'; progress.rooms.relay.switchB = true; progress.rooms.relay.checkpoint = 'relay';
    expect((await fetch(app.url + '/api/progress', { method: 'PUT', headers: { Cookie: a.cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 0, progress }) })).status).toBe(200);
    const stationaryRecord = await readFile(join(dir, 'rooms', `${code}.json`), 'utf8');
    for (let seq = 1; seq <= 20; seq++) p1.send({ type: 'avatar', seq, avatar: { ...avatar, x: avatar.x + seq } });
    await p2.wait('avatar', m => m.seq === 20);
    expect(await readFile(join(dir, 'rooms', `${code}.json`), 'utf8')).toBe(stationaryRecord);
    p1.send({ type: 'occupancy', seq: 1, plate: 'plateA' }); await p2.wait('room', m => m.room.levelState.outputs.grappleAnchor);
    p2.send({ type: 'switch', seq: 1 }); const before = await p1.wait('room', m => m.room.levelState.inputs.switchB);
    p1.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 2, epoch: before.room.cube.epoch, placement: 'cargoPlate' });
    await p2.wait('room', m => m.room.levelState.inputs.cubeOnCargoPlate);
    const disk = JSON.parse(await readFile(join(dir, 'rooms', `${code}.json`), 'utf8'));
    expect(Object.keys(disk).sort()).toEqual(['version', 'party', 'levelInstance', 'cubePlacements', 'code', 'level', 'revision', 'visitors', 'levelState', 'checkpoint', 'exitUnlocked', 'reachedExit', 'completed', 'createdAt', 'updatedAt'].sort());
    expect(disk.visitors).toEqual([a.id, b.id]); expect(disk.checkpoint).toBe('reunion');
    await kill(app.child); const restarted = await launch(dir);
    const rejoined = await connect(restarted.url, a.cookie); rejoined.send({ type: 'join', code });
    const after = await rejoined.wait('snapshot');
    expect(after.slot).toBe(1); expect(after.room.revision).toBeGreaterThan(before.room.revision);
    expect(after.room.checkpoint).toBe('reunion'); expect(after.room.levelState.outputs.returnBridge).toBe(true);
    expect(after.room.levelState.outputs.grappleAnchor).toBe(false); expect(after.room.connected).toEqual([true, false]);
    const campaign = await (await fetch(restarted.url + '/api/progress', { headers: { Cookie: a.cookie } })).json();
    expect(campaign.progress).toEqual(progress); expect(campaign.id).toBe(a.id);
    expect((await readdir(join(dir, 'rooms'))).filter(x => x.endsWith('.tmp'))).toEqual([]);
    const partner = await connect(restarted.url, b.cookie); partner.send({ type: 'join', code }); await partner.wait('snapshot');
    rejoined.send({ type: 'occupancy', seq: 1, plate: 'finalLeft' });
    partner.send({ type: 'occupancy', seq: 1, plate: 'finalRight' });
    const unlocked = await rejoined.wait('room', m => m.room.exitUnlocked);
    expect(unlocked.room.completed).toBe(false);
    rejoined.send({ type: 'occupancy', seq: 2, plate: null }); rejoined.send({ type: 'exit', seq: 3 });
    await partner.wait('room', m => m.room.reachedExit[0]);
    await kill(restarted.child); const afterArrival = await launch(dir);
    const arrived = await connect(afterArrival.url, a.cookie); arrived.send({ type: 'join', code });
    const one = (await arrived.wait('snapshot')).room;
    expect(one.exitUnlocked).toBe(true); expect(one.levelState.outputs.exitDoor).toBe(true); expect(one.completed).toBe(false);
    expect(one.reachedExit).toEqual([true, false]); expect(one.levelState.inputs.finalPlateLeftOccupied || one.levelState.inputs.finalPlateRightOccupied).toBe(false);
    const finishing = await connect(afterArrival.url, b.cookie); finishing.send({ type: 'join', code }); await finishing.wait('snapshot');
    finishing.send({ type: 'exit', seq: 1 }); const completed = await arrived.wait('room', m => m.room.completed);
    await kill(afterArrival.child); const final = await launch(dir);
    const returning = await connect(final.url, a.cookie); returning.send({ type: 'join', code });
    const savedCompletion = (await returning.wait('snapshot')).room;
    expect(savedCompletion.completed).toBe(true); expect(savedCompletion.levelState.outputs.exitDoor).toBe(true);
    expect(savedCompletion.reachedExit).toEqual([true, true]);
    expect(savedCompletion.revision).toBeGreaterThan(completed.room.revision);
});

it('rejects malformed/oversized messages and impersonation, cleans closed sockets, and bounds traffic', async () => {
    const { app, a, p1, p2, code } = await pair();
    p1.send({ type: 'occupancy', seq: 1, plate: 'plateA' }); await p2.wait('room', m => m.room.levelState.outputs.grappleAnchor);
    p1.send({ type: 'occupancy', seq: 2, slot: 2, plate: 'finalLeft' });
    expect((await p1.wait('error')).code).toBe('INVALID_MESSAGE');
    expect((await p2.wait('room', m => !m.room.connected[0])).room.levelState.outputs.grappleAnchor).toBe(false);
    const big = await connect(app.url, a.cookie); const bigClosed = once(big.ws, 'close'); big.ws.send('x'.repeat(4096)); expect((await bigClosed)[0]).toBe(1009);
    const bad = await connect(app.url, a.cookie); bad.ws.send('{'); expect((await bad.wait('error')).code).toBe('INVALID_MESSAGE');
    const fast = await connect(app.url, a.cookie); fast.send({ type: 'join', code }); await fast.wait('snapshot');
    // The 120-token bucket refills at 90/s: the join token may already be back
    // by the time CI receives its snapshot. Exercise a full bucket, then exceed
    // its burst capacity rather than depending on sub-11ms socket scheduling.
    await new Promise(resolve => setTimeout(resolve, 50));
    const rateClosed = once(fast.ws, 'close');
    for (let seq = 0; seq < 240; seq++) fast.send({ type: 'avatar', seq, avatar });
    expect((await fast.wait('error')).code).toBe('RATE_LIMITED');
    expect((await rateClosed)[0]).toBe(1008);
    expect((await p2.wait('room', m => !m.room.connected[0])).room.connected).toEqual([false, true]);
    const impostor = await connect(app.url, a.cookie); impostor.send({ type: 'join', code }); await impostor.wait('snapshot');
    impostor.send({ type: 'exit', seq: 1, slot: 2 }); expect((await impostor.wait('error')).code).toBe('INVALID_MESSAGE');
    const unjoined = await connect(app.url, a.cookie); unjoined.send({ type: 'exit', seq: 1 });
    expect((await unjoined.wait('error')).code).toBe('NOT_JOINED');
});

it.each([false, true])('migrates a version-1 room (old completion %s) into unlock progress without inventing arrivals', async completed => {
    const { dir, app, a, b, p1, p2, code } = await pair();
    p1.send({ type: 'switch', seq: 1 }); await p2.wait('room', m => m.room.levelState.inputs.switchB);
    await kill(app.child);
    const path = join(dir, 'rooms', `${code}.json`), legacy = JSON.parse(await readFile(path, 'utf8'));
    legacy.switchB = legacy.levelState.switchB; delete legacy.levelState; legacy.version = 1; legacy.completed = completed; delete legacy.exitUnlocked; delete legacy.reachedExit; delete legacy.cubePlacements;
    await writeFile(path, JSON.stringify(legacy));
    const restarted = await launch(dir), returning = await connect(restarted.url, a.cookie);
    returning.send({ type: 'join', code }); const migrated = (await returning.wait('snapshot')).room;
    expect(migrated.exitUnlocked).toBe(completed); expect(migrated.levelState.outputs.exitDoor).toBe(completed);
    expect(migrated.completed).toBe(false); expect(migrated.reachedExit).toEqual([false, false]);
    expect(migrated.levelState.outputs.returnBridge).toBe(true); expect(migrated.checkpoint).toBe('reunion');
    const disk = JSON.parse(await readFile(path, 'utf8'));
    expect(disk.version).toBe(6); expect(disk.visitors).toEqual([a.id, b.id]); expect(disk.createdAt).toBe(legacy.createdAt);
    expect(disk.revision).toBeGreaterThan(legacy.revision);
});

it('refuses cross-origin/missing-cookie upgrades and shares visitor identity with HTTPS progress cookies', async () => {
    const app = await launch(await directory()), a = await identity(app.url);
    for (const headers of [{ Origin: app.url }, { Cookie: a.cookie, Origin: 'https://elsewhere.example' }]) {
        const ws = new WebSocket(app.url.replace('http', 'ws') + '/ws', { headers });
        const failure = await new Promise<Error>(resolve => ws.once('error', resolve)); expect(failure.message).toMatch(/401|403/);
    }
    const https = await fetch(app.url + '/api/progress', { headers: { 'x-forwarded-proto': 'https' } });
    expect(https.headers.get('set-cookie')).toContain('Secure'); expect(https.headers.get('set-cookie')).toContain('HttpOnly');
    expect((await (await fetch(app.url + '/api/progress', { headers: { Cookie: a.cookie } })).json()).id).toBe(a.id);
});

it('retries code collisions, unloads idle rooms without deleting them and refuses corrupt records', async () => {
    const dir = await directory(), server = createServer();
    const codes = ['ABCD', 'ABCD', 'ABCE'];
    const service = await attachMultiplayer(server, dir, { generateCode: () => codes.shift() ?? 'ABCF', idleMs: 10, sweepMs: 10 });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    cleanups.push(async () => { service.shutdown(); await service.drained(); await new Promise<void>(resolve => server.close(() => resolve())); });
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const a = 'bn_visitor=11111111-1111-4111-8111-111111111111', b = 'bn_visitor=22222222-2222-4222-8222-222222222222';
    const first = await connect(url, a); first.send({ type: 'create' }); expect((await first.wait('snapshot')).room.code).toBe('ABCD');
    const second = await connect(url, b); second.send({ type: 'create' }); expect((await second.wait('snapshot')).room.code).toBe('ABCE');
    await first.close(); await second.close(); await service.drained();
    await new Promise(resolve => setTimeout(resolve, 60)); expect(service.rooms.size).toBe(0);
    const again = await connect(url, a); again.send({ type: 'join', code: 'ABCD' }); expect((await again.wait('snapshot')).slot).toBe(1);
    await writeFile(join(dir, 'rooms', 'ZZZZ.json'), 'broken');
    const corrupt = await connect(url, b); corrupt.send({ type: 'join', code: 'ZZZZ' }); expect((await corrupt.wait('error')).code).toBe('ROOM_UNAVAILABLE');
    expect(await readFile(join(dir, 'rooms', 'ZZZZ.json'), 'utf8')).toBe('broken');
});

it('smooths remote presentation, ignores stale frames and resets new streams without changing local physics', () => {
    const remote = new RemoteAvatar();
    remote.push(avatar, 1, 1, 1000); remote.push({ ...avatar, x: 300 }, 1, 2, 1100);
    expect(remote.sample(1150)!.x).toBe(250);
    remote.push({ ...avatar, x: 0 }, 1, 1, 1150); expect(remote.sample(1150)!.x).toBe(250);
    remote.push({ ...avatar, x: 1050 }, 2, 0, 1200); expect(remote.sample(1200)!.x).toBe(1050);
    remote.clear(); expect(remote.sample(1500)).toBeNull();
});

const cubeTransform = { x: 1240, y: 490, vx: 55, vy: 80, grounded: false };
it.each([1, 2] as const)('serializes socket pickup races with slot %s first, then drops and hands off without ending the loser session', async firstSlot => {
    const { p1, p2, first } = await pair(), peers = [p1, p2];
    p1.send({ type: 'switch', seq: 1 }); await p2.wait('room', m => m.room.levelState.inputs.switchB);
    const winner = peers[firstSlot - 1], loser = peers[2 - firstSlot];
    winner.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 2, epoch: first.room.cube.epoch });
    // Awaiting acceptance establishes deterministic socket order; pure arbitration also tests same-epoch races.
    const held = (await loser.wait('room', m => m.room.cube.holder === firstSlot)).room;
    loser.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 2, epoch: first.room.cube.epoch });
    expect((await loser.wait('cube-denied')).seq).toBe(2);
    loser.send({ type: 'cube-drop', cubeId: 'cube' as const, seq: 3, epoch: held.cube.epoch, transform: cubeTransform });
    expect((await loser.wait('cube-denied')).seq).toBe(3);
    winner.send({ type: 'cube-drop', cubeId: 'cube' as const, seq: 3, epoch: held.cube.epoch, transform: cubeTransform });
    const dropped = (await loser.wait('room', m => m.room.revision > held.revision && m.room.cube.holder === null)).room;
    expect(dropped.cube.physicsAuthority).toBe(firstSlot); expect(dropped.cube.transform).toEqual(cubeTransform);
    loser.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 4, epoch: dropped.cube.epoch });
    const handoff = (await winner.wait('room', m => m.room.cube.holder === 3 - firstSlot)).room;
    expect(handoff.cube.physicsAuthority).toBe(3 - firstSlot); expect(handoff.connected).toEqual([true, true]);
});

it('accepts exactly one holder when both sockets send pickup in the same turn', async () => {
    const { p1, p2, first } = await pair();
    p1.send({ type: 'switch', seq: 1 }); await p2.wait('room', m => m.room.levelState.inputs.switchB);
    for (const p of [p1, p2]) p.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 2, epoch: first.room.cube.epoch });
    const a = (await p1.wait('room', m => m.room.cube.holder !== null)).room;
    const b = (await p2.wait('room', m => m.room.cube.holder !== null)).room;
    expect(a.cube).toEqual(b.cube); expect([1, 2]).toContain(a.cube.holder);
    await (a.cube.holder === 1 ? p2 : p1).wait('cube-denied');
});

it('forwards only the current cube stream, arbitrates competing pulls, and never persists snapshot traffic', async () => {
    const { dir, code, p1, p2, first } = await pair();
    let epoch = first.room.cube.epoch;
    const path = join(dir, 'rooms', `${code}.json`), before = await readFile(path, 'utf8');
    for (let seq = 1; seq <= 20; seq++) p1.send({ type: 'cube', cubeId: 'cube' as const, epoch, seq, transform: { ...cubeTransform, x: 1200 + seq } });
    const last = await p2.wait('cube', m => m.seq === 20); expect(last.transform.x).toBe(1220);
    expect(await readFile(path, 'utf8')).toBe(before);
    p1.send({ type: 'cube', cubeId: 'cube' as const, epoch, seq: 19, transform: cubeTransform });
    p2.send({ type: 'cube', cubeId: 'cube' as const, epoch, seq: 21, transform: cubeTransform });
    p1.send({ type: 'switch', seq: 1 }); const switched = (await p1.wait('room', m => m.room.levelState.inputs.switchB)).room;
    expect(switched.cube.seq).toBe(20); expect(switched.cube.transform).toEqual(last.transform);
    p2.send({ type: 'cube-pull-start', cubeId: 'cube' as const, seq: 1, epoch });
    const pulling = (await p1.wait('room', m => m.room.cube.pulling)).room;
    expect(pulling.cube.physicsAuthority).toBe(2); expect(pulling.cube.transform).toEqual(last.transform);
    p1.send({ type: 'cube', cubeId: 'cube' as const, epoch, seq: 999, transform: cubeTransform });
    epoch = pulling.cube.epoch;
    p1.send({ type: 'cube-pull-start', cubeId: 'cube' as const, seq: 2, epoch }); await p1.wait('cube-denied');
    p1.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 3, epoch, placement: 'cargoPlate' }); await p1.wait('cube-denied');
    p2.send({ type: 'cube', cubeId: 'cube' as const, seq: 1, epoch, transform: cubeTransform }); await p1.wait('cube', m => m.epoch === epoch);
    p2.send({ type: 'cube-pull-stop', cubeId: 'cube' as const, seq: 2, epoch });
    const stopped = (await p1.wait('room', m => m.room.revision > pulling.revision && !m.room.cube.pulling)).room;
    expect(stopped.cube.physicsAuthority).toBe(2); expect(stopped.cube.transform).toEqual(cubeTransform);
    p2.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 3, epoch, placement: 'cargoPlate' });
    for (const p of [p1, p2]) expect((await p.wait('room', m => m.room.levelState.inputs.cubeOnCargoPlate)).room.levelState.outputs.finalAccess).toBe(true);
    p2.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 4, epoch, placement: 'spawn' });
    expect((await p1.wait('room', m => m.room.revision > stopped.revision + 1)).room.levelState.outputs.finalAccess).toBe(false);
});

it.each([false, true])('transfers disconnected cube authority (carried %s), retaining motion and rejecting old epochs on rejoin', async carried => {
    const { app, code, a, b, p1, p2, first } = await pair();
    let epoch = first.room.cube.epoch;
    // Non-authority disconnect does not revoke or move the cube.
    await p2.close(); const absent = (await p1.wait('room', m => !m.room.connected[1])).room;
    expect(absent.cube.epoch).toBe(epoch); expect(absent.cube.physicsAuthority).toBe(1);
    const partner = await connect(app.url, b.cookie); partner.send({ type: 'join', code }); await partner.wait('snapshot');
    p1.send({ type: 'switch', seq: 1 }); await partner.wait('room', m => m.room.levelState.inputs.switchB);
    if (carried) {
        p1.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 2, epoch });
        epoch = (await partner.wait('room', m => m.room.cube.holder === 1)).room.cube.epoch;
    }
    p1.send({ type: 'cube', cubeId: 'cube' as const, seq: 12, epoch, transform: cubeTransform }); await partner.wait('cube', m => m.seq === 12);
    await p1.close(); const transferred = (await partner.wait('room', m => !m.room.connected[0])).room;
    expect(transferred.cube.holder).toBeNull(); expect(transferred.cube.physicsAuthority).toBe(2);
    expect(transferred.cube.transform).toEqual(cubeTransform); expect(transferred.cube.epoch).toBeGreaterThan(epoch);
    const back = await connect(app.url, a.cookie); back.send({ type: 'join', code }); const returned = (await back.wait('snapshot')).room;
    expect(returned.cube).toEqual(transferred.cube);
    back.send({ type: 'cube', cubeId: 'cube' as const, seq: 999, epoch, transform: { ...cubeTransform, x: 999 } });
    back.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 1, epoch }); await back.wait('cube-denied');
    partner.send({ type: 'cube', cubeId: 'cube' as const, seq: 1, epoch: returned.cube.epoch, transform: { ...cubeTransform, x: 1300 } });
    expect((await back.wait('cube', m => m.epoch === returned.cube.epoch)).transform.x).toBe(1300);
    await back.close(); await partner.close();
    const alone = await connect(app.url, a.cookie); alone.send({ type: 'join', code });
    const resting = (await alone.wait('snapshot')).room;
    expect(resting.cube.transform?.x).toBe(1300); expect(resting.cube.holder).toBeNull(); expect(resting.cube.physicsAuthority).toBe(1);
});

it.each(['spawn', 'cargoPlate'] as const)('restores %s semantically after SIGKILL, with no raw cube state on disk', async placement => {
    const { dir, app, a, p1, p2, code, first } = await pair();
    p1.send({ type: 'switch', seq: 1 }); await p2.wait('room', m => m.room.levelState.inputs.switchB);
    let epoch = first.room.cube.epoch;
    if (placement === 'spawn') {
        p1.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 2, epoch }); epoch = (await p2.wait('room', m => m.room.cube.holder === 1)).room.cube.epoch;
    }
    p1.send({ type: 'cube', cubeId: 'cube' as const, seq: 1, epoch, transform: cubeTransform }); await p2.wait('cube');
    if (placement === 'cargoPlate') {
        p1.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 2, epoch, placement: 'cargoPlate' }); await p2.wait('room', m => m.room.levelState.inputs.cubeOnCargoPlate);
    }
    const disk = JSON.parse(await readFile(join(dir, 'rooms', `${code}.json`), 'utf8'));
    expect(disk.cubePlacements.cube).toBe(placement);
    for (const key of ['cube', 'transform', 'x', 'y', 'vx', 'vy', 'holder', 'physicsAuthority', 'epoch', 'pulling']) expect(disk).not.toHaveProperty(key);
    await kill(app.child); const restarted = await launch(dir), back = await connect(restarted.url, a.cookie);
    back.send({ type: 'join', code }); const restored = (await back.wait('snapshot')).room;
    expect(restored.cubePlacement).toBe(placement); expect(restored.levelState.outputs.finalAccess).toBe(placement === 'cargoPlate');
    expect(restored.cube.transform).toBeNull(); expect(restored.cube.holder).toBeNull(); expect(restored.cube.physicsAuthority).toBe(1);
});

it('writes migrated version-2 progress without losing existing unlock or arrival credit', async () => {
    const { dir, app, a, p1, p2, code } = await pair();
    p1.send({ type: 'switch', seq: 1 }); await p2.wait('room', m => m.room.levelState.inputs.switchB); await kill(app.child);
    const path = join(dir, 'rooms', `${code}.json`), legacy = JSON.parse(await readFile(path, 'utf8'));
    legacy.switchB = legacy.levelState.switchB; delete legacy.levelState; legacy.version = 2; delete legacy.cubePlacements; legacy.exitUnlocked = true; legacy.reachedExit = [true, false];
    await writeFile(path, JSON.stringify(legacy));
    const restarted = await launch(dir), back = await connect(restarted.url, a.cookie); back.send({ type: 'join', code });
    const restored = (await back.wait('snapshot')).room;
    expect(restored.exitUnlocked).toBe(true); expect(restored.reachedExit).toEqual([true, false]); expect(restored.cubePlacement).toBe('spawn');
    expect(JSON.parse(await readFile(path, 'utf8')).version).toBe(6);
});

it('requires cargo as well as two bodies for unlock, then keeps the exit unlocked when cargo is removed', async () => {
    const { p1, p2, first } = await pair(), epoch = first.room.cube.epoch;
    p1.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 1, epoch }); await p1.wait('cube-denied');
    p1.send({ type: 'switch', seq: 2 }); await p2.wait('room', m => m.room.levelState.inputs.switchB);
    p1.send({ type: 'occupancy', seq: 3, plate: 'finalLeft' });
    p2.send({ type: 'occupancy', seq: 1, plate: 'finalRight' });
    const waiting = (await p1.wait('room', m => m.room.levelState.inputs.finalPlateLeftOccupied && m.room.levelState.inputs.finalPlateRightOccupied)).room;
    expect(waiting.exitUnlocked).toBe(false); expect(waiting.levelState.outputs.finalAccess).toBe(false);
    p2.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 2, epoch, placement: 'cargoPlate' }); await p2.wait('cube-denied');
    p1.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 4, epoch, placement: 'cargoPlate' });
    const unlocked = (await p2.wait('room', m => m.room.exitUnlocked)).room;
    expect(unlocked.levelState.outputs.finalAccess).toBe(true); expect(unlocked.completed).toBe(false);
    p1.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 5, epoch, placement: 'spawn' });
    const removed = (await p2.wait('room', m => m.room.revision > unlocked.revision)).room;
    expect(removed.levelState.outputs.finalAccess).toBe(false); expect(removed.exitUnlocked).toBe(true);
});

it('replacing a carrying socket releases to its partner before stale old-socket messages can act', async () => {
    const { app, a, p1, p2, first, code } = await pair();
    p1.send({ type: 'switch', seq: 1 }); await p2.wait('room', m => m.room.levelState.inputs.switchB);
    p1.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 2, epoch: first.room.cube.epoch });
    const held = (await p2.wait('room', m => m.room.cube.holder === 1)).room;
    p1.send({ type: 'cube', cubeId: 'cube' as const, epoch: held.cube.epoch, seq: 1, transform: cubeTransform }); await p2.wait('cube');
    const replacement = await connect(app.url, a.cookie); replacement.send({ type: 'join', code });
    const released = (await replacement.wait('snapshot')).room;
    expect(released.cube.holder).toBeNull(); expect(released.cube.physicsAuthority).toBe(2);
    expect(released.cube.transform).toEqual(cubeTransform); expect(released.cube.epoch).toBeGreaterThan(held.cube.epoch);
    expect((await p1.wait('error')).code).toBe('SESSION_REPLACED');
    replacement.send({ type: 'cube', cubeId: 'cube' as const, epoch: held.cube.epoch, seq: 99, transform: { ...cubeTransform, x: 0 } });
    replacement.send({ type: 'occupancy', seq: 1, plate: 'plateA' });
    expect((await p2.wait('room', m => m.room.levelState.inputs.plateAOccupied)).room.cube.transform).toEqual(cubeTransform);
});

it.each([100, 200])('acknowledges semantic actions under %s ms artificial delay; ephemeral state never rewrites disk', async delay => {
    const dir = await directory(), server = createServer();
    const timings: import('../server/multiplayer.ts').ActionTiming[] = [];
    const service = await attachMultiplayer(server, dir, { semanticDelayMs: delay, onActionTiming: value => timings.push(value) });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    cleanups.push(async () => { service.shutdown(); await service.drained(); await new Promise<void>(resolve => server.close(() => resolve())); });
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const cookie = 'bn_visitor=11111111-1111-4111-8111-111111111111';
    const p1 = await connect(url, cookie), p2 = await connect(url, 'bn_visitor=22222222-2222-4222-8222-222222222222');
    p1.send({ type: 'create' }); const first = await p1.wait('snapshot');
    p2.send({ type: 'join', code: first.room.code }); await p2.wait('snapshot');
    const path = join(dir, 'rooms', `${first.room.code}.json`);
    let disk = await readFile(path, 'utf8');
    p1.send({ type: 'occupancy', seq: 1, plate: 'plateA' });
    const occupied = await p2.wait('room', m => m.room.levelState.inputs.plateAOccupied);
    expect(await readFile(path, 'utf8')).toBe(disk);
    expect(occupied.room.revision).toBeGreaterThan(JSON.parse(disk).revision);
    p1.send({ type: 'switch', seq: 2 });
    // Transform traffic bypasses the delayed semantic queue.
    p1.send({ type: 'avatar', seq: 1, avatar }); await p2.wait('avatar');
    expect(await readFile(path, 'utf8')).toBe(disk);
    const switched = await p1.wait('action-result', m => m.seq === 2);
    expect(switched.accepted).toBe(true); expect(switched.room.levelState.inputs.switchB).toBe(true);
    disk = await readFile(path, 'utf8'); expect(JSON.parse(disk).levelState.switchB).toBe(true);
    let epoch = switched.room.cube.epoch;
    p1.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 3, epoch });
    p2.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 1, epoch });
    const winner = await p1.wait('action-result', m => m.seq === 3), loser = await p2.wait('action-result', m => m.seq === 1);
    expect(winner.accepted).toBe(true); expect(loser.accepted).toBe(false);
    expect(loser.room.cube.holder).toBe(1); epoch = winner.room.cube.epoch;
    expect(await readFile(path, 'utf8')).toBe(disk);
    const transform = { x: 1250, y: 538, vx: 0, vy: 0, grounded: false };
    p1.send({ type: 'cube-drop', cubeId: 'cube' as const, seq: 4, epoch, transform });
    epoch = (await p1.wait('action-result', m => m.seq === 4)).room.cube.epoch;
    p2.send({ type: 'cube-pull-start', cubeId: 'cube' as const, seq: 2, epoch });
    epoch = (await p2.wait('action-result', m => m.seq === 2)).room.cube.epoch;
    p2.send({ type: 'cube-pull-stop', cubeId: 'cube' as const, seq: 3, epoch }); await p2.wait('action-result', m => m.seq === 3);
    await p1.close(); await p2.wait('room', m => !m.room.connected[0]);
    const replacement = await connect(url, cookie); replacement.send({ type: 'join', code: first.room.code }); await replacement.wait('snapshot');
    expect(await readFile(path, 'utf8')).toBe(disk);
    p2.send({ type: 'cube-occupancy', cubeId: 'cube' as const, seq: 4, epoch, placement: 'cargoPlate' }); await p2.wait('action-result', m => m.seq === 4);
    expect(JSON.parse(await readFile(path, 'utf8')).cubePlacements.cube).toBe('cargoPlate');
    p2.send({ type: 'cube-pickup', cubeId: 'cube' as const, seq: 5, epoch }); await p2.wait('action-result', m => m.seq === 5);
    expect(JSON.parse(await readFile(path, 'utf8')).cubePlacements.cube).toBe('spawn');
    expect(timings.filter(t => t.durable).map(t => t.action)).toEqual(['switch', 'cube-occupancy', 'cube-pickup']);
    expect(timings.find(t => t.action === 'cube-drop')).toMatchObject({ durable: false, persistMs: 0 });
    expect(timings.find(t => t.action === 'switch')!.queueMs).toBeGreaterThanOrEqual(delay - 5);
});

it('a durable storage failure closes the room without confirming or broadcasting its predicted switch', async () => {
    const { dir, p1, p2, code } = await pair();
    const path = join(dir, 'rooms', `${code}.json`);
    await rm(path); await mkdir(path); // Atomic rename over a directory must fail, including when tests run as root.
    p1.send({ type: 'occupancy', seq: 1, plate: 'plateA' });
    expect((await p2.wait('room', m => m.room.levelState.inputs.plateAOccupied)).room.levelState.inputs.switchB).toBe(false);
    p1.send({ type: 'switch', seq: 2 });
    expect((await p1.wait('error', m => m.code === 'ROOM_UNAVAILABLE')).code).toBe('ROOM_UNAVAILABLE');
    expect((await p2.wait('error', m => m.code === 'ROOM_UNAVAILABLE')).code).toBe('ROOM_UNAVAILABLE');
    expect([...p1.messages, ...p2.messages].some(m => 'room' in m && m.room.levelState.inputs.switchB)).toBe(false);
});
