import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { afterEach } from 'vitest';
import type { CoopLevelId, ServerMessage } from '../../src/coop/protocol.ts';

export const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
export const avatar = { x: 200, y: 543, vx: 0, vy: 0, facing: 1 as const, grounded: true, rope: null };
export async function directory() { const dir = await mkdtemp(join(tmpdir(), 'bn-coop-')); cleanups.push(() => rm(dir, { recursive: true, force: true })); return dir; }
export async function launch(dir: string) {
    const child = spawn(process.execPath, ['server/app.ts'], { env: { ...process.env, PORT: '0', DATA_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
    cleanups.push(async () => { if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill('SIGKILL'); await exit; } });
    const url = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Server did not start')), 5000);
        child.once('error', reject);
        child.stdout!.on('data', b => { const port = String(b).match(/listening on (\d+)/)?.[1]; if (port) { clearTimeout(timeout); resolve(`http://127.0.0.1:${port}`); } });
    });
    return { url, child };
}
export async function kill(child: ChildProcess) { const exit = once(child, 'exit'); child.kill('SIGKILL'); await exit; }
export async function identity(url: string) {
    const res = await fetch(`${url}/api/identity`);
    return { cookie: res.headers.get('set-cookie')!.split(';')[0], id: (await res.json()).id as string };
}
export async function connect<L extends CoopLevelId = 'pairing-bay'>(url: string, cookie: string) {
    const ws = new WebSocket(url.replace('http', 'ws') + '/ws', { headers: { Cookie: cookie, Origin: url } });
    const messages: ServerMessage<L>[] = [];
    const listeners = new Set<() => void>();
    ws.on('message', bytes => { messages.push(JSON.parse(bytes.toString())); for (const fn of listeners) fn(); });
    ws.on('error', () => {});
    await once(ws, 'open');
    cleanups.push(async () => { if (ws.readyState === WebSocket.CLOSED) return; const closed = once(ws, 'close'); ws.terminate(); await closed; });
    async function wait<T extends ServerMessage<L>['type']>(type: T, predicate: (value: Extract<ServerMessage<L>, { type: T }>) => boolean = () => true): Promise<Extract<ServerMessage<L>, { type: T }>> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { listeners.delete(check); reject(new Error(`Timed out waiting for ${type}: ${JSON.stringify(messages)}`)); }, 4000);
            function check() {
                const i = messages.findIndex(m => m.type === type && predicate(m as Extract<ServerMessage<L>, { type: T }>));
                if (i < 0) return;
                const m = messages.splice(i, 1)[0]; clearTimeout(timeout); listeners.delete(check); resolve(m as Extract<ServerMessage<L>, { type: T }>);
            }
            listeners.add(check); check();
        });
    }
    return { ws, messages, wait, send: (value: unknown) => ws.send(JSON.stringify(value)),
        close: async () => { const closed = once(ws, 'close'); ws.close(); await closed; } };
}
