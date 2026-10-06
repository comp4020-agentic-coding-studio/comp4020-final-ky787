import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { afterEach, expect, it } from 'vitest';
import { CODE_PATTERN, normalizeCode, newerRoom, parseClientMessage, websocketUrl, type ServerMessage, type SharedRoom } from '../src/coop/protocol.ts';
import { RemoteAvatar } from '../src/coop/remote.ts';
import { attachMultiplayer, generateCode } from '../server/multiplayer.ts';
import { freshProgress } from '../src/slice/progress.ts';

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
const avatar = { x: 200, y: 543, vx: 0, vy: 0, facing: 1 as const, grounded: true, rope: null };
async function directory() { const dir = await mkdtemp(join(tmpdir(), 'bn-coop-')); cleanups.push(() => rm(dir, { recursive: true, force: true })); return dir; }
async function launch(dir: string) {
    const child = spawn(process.execPath, ['server/app.ts'], { env: { ...process.env, PORT: '0', DATA_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
    cleanups.push(async () => { if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill('SIGKILL'); await exit; } });
    const url = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Server did not start')), 5000);
        child.once('error', reject);
        child.stdout!.on('data', b => { const port = String(b).match(/listening on (\d+)/)?.[1]; if (port) { clearTimeout(timeout); resolve(`http://127.0.0.1:${port}`); } });
    });
    return { url, child };
}
async function kill(child: ChildProcess) { const exit = once(child, 'exit'); child.kill('SIGKILL'); await exit; }
async function identity(url: string) {
    const res = await fetch(`${url}/api/identity`);
    return { cookie: res.headers.get('set-cookie')!.split(';')[0], id: (await res.json()).id as string };
}
async function connect(url: string, cookie: string) {
    const ws = new WebSocket(url.replace('http', 'ws') + '/ws', { headers: { Cookie: cookie, Origin: url } });
    const messages: ServerMessage[] = [];
    const listeners = new Set<() => void>();
    ws.on('message', bytes => { messages.push(JSON.parse(bytes.toString())); for (const fn of listeners) fn(); });
    ws.on('error', () => {});
    await once(ws, 'open');
    cleanups.push(async () => { if (ws.readyState === WebSocket.CLOSED) return; const closed = once(ws, 'close'); ws.terminate(); await closed; });
    async function wait<T extends ServerMessage['type']>(type: T, predicate: (value: Extract<ServerMessage, { type: T }>) => boolean = () => true): Promise<Extract<ServerMessage, { type: T }>> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { listeners.delete(check); reject(new Error(`Timed out waiting for ${type}: ${JSON.stringify(messages)}`)); }, 4000);
            function check() {
                const i = messages.findIndex(m => m.type === type && predicate(m as Extract<ServerMessage, { type: T }>));
                if (i < 0) return;
                const m = messages.splice(i, 1)[0]; clearTimeout(timeout); listeners.delete(check); resolve(m as Extract<ServerMessage, { type: T }>);
            }
            listeners.add(check); check();
        });
    }
    return { ws, messages, wait, send: (value: unknown) => ws.send(JSON.stringify(value)),
        close: async () => { const closed = once(ws, 'close'); ws.close(); await closed; } };
}
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
    await p2.wait('room', m => m.room.outputs.grappleAnchor);
    const replacement = await connect(app.url, a.cookie); replacement.send({ type: 'join', code });
    const restored = await replacement.wait('snapshot');
    expect(restored.slot).toBe(1); expect(restored.room.connected).toEqual([true, true]);
    expect(restored.room.outputs.grappleAnchor).toBe(false);
    expect((await p1.wait('error')).code).toBe('SESSION_REPLACED');
    replacement.send({ type: 'occupancy', seq: 1, plate: 'plateA' });
    await p2.wait('room', m => m.room.revision > restored.room.revision && m.room.outputs.grappleAnchor);
    replacement.send({ type: 'avatar', seq: 1, avatar });
    expect((await p2.wait('avatar')).slot).toBe(1);
});

it('owns puzzle state, releases momentary occupancy on leave/close, latches B and requires two distinct connected bodies', async () => {
    const { app, a, p1, p2, code } = await pair();
    p2.send({ type: 'occupancy', seq: 1, plate: 'plateA' }); expect((await p2.wait('error')).code).toBe('INVALID_ACTION');
    p1.send({ type: 'switch', seq: 1 }); expect((await p1.wait('error')).code).toBe('INVALID_ACTION');
    p1.send({ type: 'occupancy', seq: 2, plate: 'plateA' });
    const on = await p2.wait('room', m => m.room.outputs.grappleAnchor);
    p1.send({ type: 'occupancy', seq: 3, plate: null });
    const off = await p2.wait('room', m => m.room.revision > on.room.revision && !m.room.outputs.grappleAnchor);
    expect(newerRoom(on.room, off.room)).toBe(true); expect(newerRoom(off.room, on.room)).toBe(false); expect(newerRoom(off.room, off.room)).toBe(false);
    p1.send({ type: 'occupancy', seq: 2, plate: 'plateA' }); expect((await p1.wait('error')).code).toBe('STALE_ACTION');
    p1.send({ type: 'occupancy', seq: 4, plate: 'plateA' }); await p2.wait('room', m => m.room.revision > off.room.revision && m.room.outputs.grappleAnchor);
    await p1.close(); const disconnected = await p2.wait('room', m => !m.room.connected[0]);
    expect(disconnected.room.outputs.grappleAnchor).toBe(false);
    p2.send({ type: 'switch', seq: 2 }); const latched = await p2.wait('room', m => m.room.inputs.switchB);
    expect(latched.room.outputs.returnBridge).toBe(true); expect(latched.room.checkpoint).toBe('reunion');
    for (const [seq, plate] of [[3, 'finalLeft'], [4, 'finalRight']] as const) {
        p2.send({ type: 'occupancy', seq, plate });
        const alone = await p2.wait('room', m => m.room.revision > latched.room.revision && m.room.inputs[plate === 'finalLeft' ? 'finalPlateLeftOccupied' : 'finalPlateRightOccupied']);
        expect(alone.room.outputs.exitDoor).toBe(false); expect(alone.room.completed).toBe(false);
    }
    const returning = await connect(app.url, a.cookie); returning.send({ type: 'join', code });
    const snap = await returning.wait('snapshot'); expect(snap.slot).toBe(1); expect(snap.room.inputs.player1OnPlateA).toBe(false);
    returning.send({ type: 'occupancy', seq: 1, plate: 'finalLeft' });
    const complete = await p2.wait('room', m => m.room.completed);
    expect(complete.room.outputs.exitDoor).toBe(true);
    await p2.close(); const closed = await returning.wait('room', m => !m.room.connected[1]);
    expect(closed.room.outputs.exitDoor).toBe(false); expect(closed.room.outputs.returnBridge).toBe(true); expect(closed.room.completed).toBe(true);
});

it('persists logical state across SIGKILL/restart with no movement or occupancy, preserving C8 progress', async () => {
    const { dir, app, a, b, p1, p2, code } = await pair();
    const progress = freshProgress(); progress.currentRoom = 'relay'; progress.rooms.relay.switchB = true; progress.rooms.relay.checkpoint = 'relay';
    expect((await fetch(app.url + '/api/progress', { method: 'PUT', headers: { Cookie: a.cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: 0, progress }) })).status).toBe(200);
    const stationaryRecord = await readFile(join(dir, 'rooms', `${code}.json`), 'utf8');
    for (let seq = 1; seq <= 20; seq++) p1.send({ type: 'avatar', seq, avatar: { ...avatar, x: avatar.x + seq } });
    await p2.wait('avatar', m => m.seq === 20);
    expect(await readFile(join(dir, 'rooms', `${code}.json`), 'utf8')).toBe(stationaryRecord);
    p1.send({ type: 'occupancy', seq: 1, plate: 'plateA' }); await p2.wait('room', m => m.room.outputs.grappleAnchor);
    p2.send({ type: 'switch', seq: 1 }); const before = await p1.wait('room', m => m.room.inputs.switchB);
    const disk = JSON.parse(await readFile(join(dir, 'rooms', `${code}.json`), 'utf8'));
    expect(Object.keys(disk).sort()).toEqual(['version', 'code', 'level', 'revision', 'visitors', 'switchB', 'checkpoint', 'completed', 'createdAt', 'updatedAt'].sort());
    expect(disk.visitors).toEqual([a.id, b.id]); expect(disk.checkpoint).toBe('reunion');
    await kill(app.child); const restarted = await launch(dir);
    const rejoined = await connect(restarted.url, a.cookie); rejoined.send({ type: 'join', code });
    const after = await rejoined.wait('snapshot');
    expect(after.slot).toBe(1); expect(after.room.revision).toBeGreaterThan(before.room.revision);
    expect(after.room.checkpoint).toBe('reunion'); expect(after.room.outputs.returnBridge).toBe(true);
    expect(after.room.outputs.grappleAnchor).toBe(false); expect(after.room.connected).toEqual([true, false]);
    const campaign = await (await fetch(restarted.url + '/api/progress', { headers: { Cookie: a.cookie } })).json();
    expect(campaign.progress).toEqual(progress); expect(campaign.id).toBe(a.id);
    expect((await readdir(join(dir, 'rooms'))).filter(x => x.endsWith('.tmp'))).toEqual([]);
    const partner = await connect(restarted.url, b.cookie); partner.send({ type: 'join', code }); await partner.wait('snapshot');
    rejoined.send({ type: 'occupancy', seq: 1, plate: 'finalLeft' });
    partner.send({ type: 'occupancy', seq: 1, plate: 'finalRight' });
    const completed = await rejoined.wait('room', m => m.room.completed);
    await kill(restarted.child); const final = await launch(dir);
    const returning = await connect(final.url, a.cookie); returning.send({ type: 'join', code });
    const savedCompletion = (await returning.wait('snapshot')).room;
    expect(savedCompletion.completed).toBe(true); expect(savedCompletion.outputs.exitDoor).toBe(false);
    expect(savedCompletion.revision).toBeGreaterThan(completed.room.revision);
});

it('rejects malformed/oversized messages and impersonation, cleans closed sockets, and bounds traffic', async () => {
    const { app, a, p1, p2, code } = await pair();
    p1.send({ type: 'occupancy', seq: 1, plate: 'plateA' }); await p2.wait('room', m => m.room.outputs.grappleAnchor);
    p1.send({ type: 'occupancy', seq: 2, slot: 2, plate: 'finalLeft' });
    expect((await p1.wait('error')).code).toBe('INVALID_MESSAGE');
    expect((await p2.wait('room', m => !m.room.connected[0])).room.outputs.grappleAnchor).toBe(false);
    const big = await connect(app.url, a.cookie); const bigClosed = once(big.ws, 'close'); big.ws.send('x'.repeat(4096)); expect((await bigClosed)[0]).toBe(1009);
    const bad = await connect(app.url, a.cookie); bad.ws.send('{'); expect((await bad.wait('error')).code).toBe('INVALID_MESSAGE');
    const fast = await connect(app.url, a.cookie); fast.send({ type: 'join', code }); await fast.wait('snapshot');
    for (let seq = 0; seq < 120; seq++) fast.send({ type: 'avatar', seq, avatar });
    expect((await fast.wait('error')).code).toBe('RATE_LIMITED');
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
