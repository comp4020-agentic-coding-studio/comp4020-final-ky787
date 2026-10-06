import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { afterEach, expect, it } from 'vitest';
import { freshProgress } from '../src/slice/progress.ts';

const children: ChildProcess[] = [], directories: string[] = [], sockets: WebSocket[] = [];
afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.terminate();
    for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    }
    for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true });
});
async function directory() { const dir = await mkdtemp(join(tmpdir(), 'bn-dev-')); directories.push(dir); return dir; }
function launch(data: string, apiPort = 0) {
    const child = spawn(process.execPath, ['scripts/dev.ts', '--host', '127.0.0.1', '--port', '0'], {
        env: { ...process.env, DATA_DIR: data, DEV_API_PORT: String(apiPort), NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    let output = '';
    child.stdout!.on('data', b => { output += b; }); child.stderr!.on('data', b => { output += b; });
    return { child, output: () => output };
}
async function start(data: string) {
    const app = launch(data);
    const urls = await new Promise<{ api: string; frontend: string }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Development startup timed out: ${app.output()}`)), 12000);
        const check = () => {
            const api = app.output().match(/API \+ WebSocket ready: (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
            const frontend = app.output().match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)\//)?.[1];
            if (api && frontend) { clearTimeout(timeout); resolve({ api, frontend }); }
        };
        app.child.stdout!.on('data', check);
        app.child.once('error', e => { clearTimeout(timeout); reject(e); });
        app.child.once('exit', () => { clearTimeout(timeout); reject(new Error(app.output())); });
        check();
    });
    return { ...app, ...urls };
}
async function stop(child: ChildProcess, signal: NodeJS.Signals) {
    const result = once(child, 'exit', { signal: AbortSignal.timeout(8000) }); child.kill(signal); return await result;
}
async function connect(origin: string, cookie: string, message: unknown) {
    const ws = new WebSocket(origin.replace('http:', 'ws:') + '/ws', { headers: { Origin: origin, Cookie: cookie }, handshakeTimeout: 3000 });
    sockets.push(ws); await once(ws, 'open');
    const response = once(ws, 'message', { signal: AbortSignal.timeout(3000) }); ws.send(JSON.stringify(message));
    return { ws, snapshot: JSON.parse((await response)[0].toString()) };
}

it('one dev command serves Vite, proxies HTTP and /ws, shuts down both listeners and retains saves on restart', async () => {
    const dir = await directory();
    let app = await start(dir);
    const html = await fetch(app.frontend);
    expect(await html.text()).toContain('/@vite/client');
    const identity = await fetch(app.frontend + '/api/identity'); expect(identity.status).toBe(200);
    const cookie = identity.headers.get('set-cookie')!.split(';')[0], id = (await identity.json()).id;
    const loaded = await (await fetch(app.frontend + '/api/progress', { headers: { Cookie: cookie } })).json();
    expect(loaded.id).toBe(id);
    const progress = freshProgress(); progress.currentRoom = 'relay';
    expect((await fetch(app.frontend + '/api/progress', { method: 'PUT', headers: { Cookie: cookie, Origin: app.frontend, 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: 0, progress }) })).status).toBe(200);
    expect((await fetch(app.frontend + '/readme/')).status).toBe(200);
    const first = await connect(app.frontend, cookie, { type: 'create' });
    expect(first.snapshot.type).toBe('snapshot'); expect(first.snapshot.slot).toBe(1);
    const closed = once(first.ws, 'close');
    expect((await stop(app.child, 'SIGINT'))[0]).toBe(0); await closed;
    for (const url of [app.frontend, app.api]) await expect(fetch(url, { signal: AbortSignal.timeout(1000) })).rejects.toThrow();
    app = await start(dir);
    expect((await (await fetch(app.frontend + '/api/progress', { headers: { Cookie: cookie } })).json()).progress).toEqual(progress);
    const second = await connect(app.frontend, cookie, { type: 'join', code: first.snapshot.room.code });
    expect(second.snapshot.slot).toBe(1); expect(second.snapshot.room.code).toBe(first.snapshot.room.code);
    expect(app.output()).not.toContain('ECONNREFUSED');
    const secondClosed = once(second.ws, 'close');
    expect((await stop(app.child, 'SIGTERM'))[0]).toBe(0); await secondClosed;
    for (const url of [app.frontend, app.api]) await expect(fetch(url, { signal: AbortSignal.timeout(1000) })).rejects.toThrow();
});

it('reports an occupied API port clearly without stopping the existing listener', async () => {
    const busy = createServer((_, res) => res.end('existing backend'));
    await new Promise<void>(resolve => busy.listen(0, '127.0.0.1', resolve));
    try {
        const port = (busy.address() as AddressInfo).port, app = launch(await directory(), port);
        expect((await once(app.child, 'exit', { signal: AbortSignal.timeout(8000) }))[0]).toBe(1);
        expect(app.output()).toContain(`Port ${port} is already in use`);
        expect(app.output()).toContain('pnpm dev:client');
        expect(await (await fetch(`http://127.0.0.1:${port}`)).text()).toBe('existing backend');
    } finally { await new Promise<void>(resolve => busy.close(() => resolve())); }
});
