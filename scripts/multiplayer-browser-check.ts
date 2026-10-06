#!/usr/bin/env node
/** Two isolated real Chromium contexts; only keyboard/mouse gameplay and read-only snapshots.
 * With no URL, owns a temporary production server and tests an actual process restart too.
 * Optional URL supports localhost/Vite or the deployed same-origin HTTPS/WSS app.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as createHttpsServer } from 'node:https';
import { request } from 'node:http';
import { execFileSync } from 'node:child_process';
import type { Duplex } from 'node:stream';
import type { SliceGame } from '../src/slice/game.ts';
type Snapshot = ReturnType<SliceGame['snapshot']>;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const checks: string[] = [], propagation: Record<string, number> = {};
const shots = process.argv[3] ?? join(tmpdir(), 'bn-pairing-shots');
const temporary = await mkdtemp(join(tmpdir(), 'bn-pairing-browser-'));
await mkdir(shots, { recursive: true });
let app: ChildProcess | undefined, browser: ChildProcess | undefined;
let root: Cdp | undefined;
const clients: Cdp[] = [];
let proxy: ReturnType<typeof createHttpsServer> | undefined;
const proxySockets = new Set<Duplex>();
/** Test-only TLS terminator models Fly forwarding to the unchanged plain HTTP process. */
async function tlsOrigin(backend: string): Promise<string> {
    const key = join(temporary, 'test-key.pem'), cert = join(temporary, 'test-cert.pem');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert,
        '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost'], { stdio: 'ignore' });
    const target = new URL(backend);
    const forward = (req: import('node:http').IncomingMessage) => request({ hostname: target.hostname, port: target.port, path: req.url,
        method: req.method, headers: { ...req.headers, 'x-forwarded-proto': 'https' } });
    proxy = createHttpsServer({ key: await readFile(key), cert: await readFile(cert) }, (req, res) => {
        const upstream = forward(req);
        upstream.on('response', reply => { res.writeHead(reply.statusCode!, reply.headers); reply.pipe(res); });
        upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
    });
    proxy.on('connection', socket => { proxySockets.add(socket); socket.on('close', () => proxySockets.delete(socket)); });
    proxy.on('upgrade', (req, socket, head) => {
        const upstream = forward(req);
        upstream.on('upgrade', (reply, remote, received) => {
            socket.write(`HTTP/1.1 ${reply.statusCode} Switching Protocols\r\n${Object.entries(reply.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
            if (head.length) remote.write(head); if (received.length) socket.write(received);
            socket.pipe(remote); remote.pipe(socket);
            socket.on('error', () => remote.destroy()); remote.on('error', () => socket.destroy());
            socket.on('close', () => remote.destroy()); remote.on('close', () => socket.destroy());
        });
        upstream.on('response', () => socket.destroy()); upstream.on('error', () => socket.destroy()); upstream.end();
    });
    await new Promise<void>(resolve => proxy!.listen(0, '127.0.0.1', resolve));
    return `https://127.0.0.1:${(proxy.address() as { port: number }).port}/`;
}
async function startServer(port = 0): Promise<string> {
    app = spawn(process.execPath, ['server/app.ts'], { env: { ...process.env, PORT: String(port), DATA_DIR: join(temporary, 'data') }, stdio: ['ignore', 'pipe', 'pipe'] });
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('App start timed out')), 6000);
        app!.once('error', reject);
        app!.stdout!.on('data', b => { const p = String(b).match(/listening on (\d+)/)?.[1]; if (p) { clearTimeout(timeout); resolve(`http://127.0.0.1:${p}/`); } });
        app!.stderr!.on('data', b => process.stderr.write(b));
    });
}
class Cdp {
    socket: WebSocket;
    next = 0;
    pending = new Map<number, { resolve: (value: any) => void; reject: (e: Error) => void }>();
    errors: string[] = [];
    constructor(url: string) {
        this.socket = new WebSocket(url);
        this.socket.onmessage = event => {
            const m = JSON.parse(String(event.data));
            if (m.id) {
                const p = this.pending.get(m.id); this.pending.delete(m.id);
                if (m.error) p?.reject(new Error(JSON.stringify(m.error))); else p?.resolve(m.result);
            } else if (m.method === 'Runtime.exceptionThrown') this.errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
            else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') this.errors.push(m.params.args.map((a: { value: unknown }) => a.value).join(' '));
        };
    }
    async open() { await new Promise<void>((resolve, reject) => { this.socket.onopen = () => resolve(); this.socket.onerror = () => reject(new Error('CDP connection failed')); }); return this; }
    send(method: string, params: Record<string, unknown> = {}): Promise<any> {
        const id = ++this.next;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 10000);
            this.pending.set(id, { resolve: result => { clearTimeout(timeout); resolve(result); }, reject: e => { clearTimeout(timeout); reject(e); } });
            this.socket.send(JSON.stringify({ id, method, params }));
        });
    }
    async read<T>(expression: string): Promise<T> {
        const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'Browser evaluation failed');
        return result.result.value;
    }
}
async function launchBrowser(): Promise<string> {
    const profile = join(temporary, 'chrome');
    for (const executable of [process.env.BROWSER_BIN, 'chromium', 'chromium-browser', 'google-chrome', 'brave-browser'].filter(Boolean) as string[]) {
        browser = spawn(executable, ['--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
            ...(process.env.BN_TEST_TLS ? ['--ignore-certificate-errors'] : []),
            '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
            `--user-data-dir=${profile}`, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
        let failed = false; browser.on('error', () => { failed = true; });
        for (let i = 0; i < 80 && !failed; i++) {
            try { const [port, path] = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); return `ws://127.0.0.1:${port}${path}`; }
            catch { await sleep(100); }
        }
        browser.kill();
    }
    throw new Error('No usable Chromium. Set BROWSER_BIN to its executable.');
}
async function page(url: string, debuggerUrl: string): Promise<Cdp> {
    const { browserContextId } = await root!.send('Target.createBrowserContext');
    const { targetId } = await root!.send('Target.createTarget', { url: 'about:blank', browserContextId });
    const client = await new Cdp(`${new URL(debuggerUrl).origin.replace('http', 'ws')}/devtools/page/${targetId}`).open();
    clients.push(client);
    await client.send('Runtime.enable'); await client.send('Page.enable');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
    await client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await client.send('Page.navigate', { url });
    await wait(client, 'campaign loaded', s => s.persistence.visitor !== '');
    return client;
}
const snapshot = (p: Cdp) => p.read<Snapshot>('binaryNinja.snapshot()');
async function wait(p: Cdp, label: string, predicate: (s: Snapshot) => boolean, timeout = 10000): Promise<Snapshot> {
    const end = Date.now() + timeout;
    let last: Snapshot | undefined;
    do {
        if (await p.read('!!globalThis.binaryNinja')) { last = await snapshot(p); if (predicate(last)) return last; }
        await sleep(20);
    } while (Date.now() < end);
    throw new Error(`${label}: ${JSON.stringify(last)}`);
}
function check(label: string, ok: boolean, detail = '') {
    const line = `${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`;
    checks.push(line); process.stdout.write(line + '\n'); if (!ok) throw new Error(line);
}
async function click(p: Cdp, selector: string) {
    const at = await p.read<{ x: number; y: number }>(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button: 'left', buttons: 1, clickCount: 1 });
    await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(80);
}
const keys: Record<string, [string, number]> = { KeyA: ['a', 65], KeyD: ['d', 68], KeyE: ['e', 69], Space: [' ', 32], Tab: ['Tab', 9] };
async function key(p: Cdp, code: string, down: boolean) {
    const [key, vk] = keys[code];
    await p.send('Input.dispatchKeyEvent', { type: down ? 'rawKeyDown' : 'keyUp', code, key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
}
async function tap(p: Cdp, code: string) { await key(p, code, true); await sleep(55); await key(p, code, false); }
async function walk(p: Cdp, x: number) {
    const state = await snapshot(p), code = state.player.x < x ? 'KeyD' : 'KeyA';
    await key(p, code, true);
    try { await wait(p, `walk to ${x}`, s => code === 'KeyD' ? s.player.x >= x : s.player.x <= x, 12000); }
    finally { await key(p, code, false); await sleep(160); }
}
async function mouse(p: Cdp, x: number, y: number, down: boolean) {
    const at = await p.read<{ x: number; y: number }>(`(()=>{const c=binaryNinja.renderer.camera,r=binaryNinja.canvas.getBoundingClientRect();return {x:(${x}-c.originX())*c.zoom+r.left,y:(${y}-c.originY())*c.zoom+r.top};})()`);
    await p.send('Input.dispatchMouseEvent', { type: down ? 'mousePressed' : 'mouseReleased', ...at, button: 'left', buttons: down ? 1 : 0, clickCount: 1 });
}
async function shot(p: Cdp, name: string) { const data = await p.send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(shots, name + '.png'), Buffer.from(data.data, 'base64')); }

try {
    const backend = process.argv[2] ?? await startServer();
    const base = process.env.BN_TEST_TLS ? await tlsOrigin(backend) : backend;
    const url = new URL(base).href;
    const debugUrl = await launchBrowser(); root = await new Cdp(debugUrl).open();
    const a = await page(url, debugUrl), b = await page(url, debugUrl);
    const originalProgress = (await snapshot(a)).progress;
    check('two isolated visitors', (await snapshot(a)).persistence.visitor !== (await snapshot(b)).persistence.visitor);
    await click(a, '#create-room');
    await wait(a, 'created room', s => s.multiplayer?.websocket === 'CONNECTED');
    const code = await a.read<string>('document.querySelector("#room-code").textContent');
    check('displayed human-readable room code', /^[A-HJKMNP-Z2-9]{4}$/.test(code), code);
    check('Player 1 waiting UI', (await a.read<string>('document.querySelector("#coop-state").textContent')).includes('WAITING FOR PARTNER'));
    await shot(a, 'pairing-waiting');
    await click(b, '#join-code'); await b.send('Input.insertText', { text: code.toLowerCase() }); await click(b, '#join-room');
    await wait(a, 'both connected on A', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    const joined = await wait(b, 'both connected on B', s => !!s.multiplayer?.shared?.connected.every(Boolean));
    check('UI join gives Player 2', joined.multiplayer?.slot === 2 && (await snapshot(a)).multiplayer?.slot === 1);
    check('WebSocket uses the page host/protocol and /ws', joined.multiplayer?.url === base.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws');
    if (process.env.BN_TEST_TLS) {
        const cookies = await a.send('Network.getCookies', { urls: [base] });
        check('TLS proxy assigns one Secure HttpOnly visitor cookie', cookies.cookies.filter((c: { name: string; secure: boolean; httpOnly: boolean }) => c.name === 'bn_visitor' && c.secure && c.httpOnly).length === 1);
    }
    await wait(a, 'remote avatar on A', s => !!s.multiplayer?.remote);
    await wait(b, 'remote avatar on B', s => !!s.multiplayer?.remote);
    check('both clients render remote avatars', true);
    const start = Date.now(); await walk(a, 250);
    await wait(b, 'anchor powered remotely', s => s.outputs.grappleAnchor);
    propagation.plateA = Date.now() - start;
    check('Plate A propagates in under one second including approach', propagation.plateA <= 1000, `${propagation.plateA} ms`);
    await wait(b, 'remote movement visible', s => (s.multiplayer?.remote?.x ?? 0) > 210);
    check('remote avatar moves through ordinary input', true);
    await shot(b, 'pairing-anchor-powered');

    await a.send('Page.navigate', { url: 'about:blank' });
    const absent = await wait(b, 'disconnect releases A', s => s.multiplayer?.shared?.connected[0] === false && !s.outputs.grappleAnchor);
    check('disconnect removes avatar and releases anchor', !absent.multiplayer?.remote);
    check('partner disconnected visible', (await b.read<string>('document.querySelector("#coop-state").textContent')).includes('PARTNER DISCONNECTED'));
    await shot(b, 'pairing-disconnected');
    const history = await a.send('Page.getNavigationHistory');
    await a.send('Page.navigateToHistoryEntry', { entryId: history.entries[history.currentIndex - 1].id });
    const returned = await wait(a, 'same-tab back-navigation reconnect', s => s.multiplayer?.websocket === 'CONNECTED');
    check('reconnect reclaims P1 without stale plate occupancy', returned.multiplayer?.slot === 1 && !returned.inputs.plateA && returned.player.x < 200);
    await walk(a, 250); await wait(b, 'anchor restored by fresh occupancy', s => s.outputs.grappleAnchor);

    await walk(b, 430);
    const deaths = (await snapshot(b)).deaths;
    await key(b, 'KeyD', true); await mouse(b, 770, 226, true);
    await wait(b, 'real hook attachment', s => s.player.rope.phase === 'attached');
    await wait(b, 'rightward grapple release', s => s.player.x > 860 && s.player.y < 510 && s.player.vx > 0);
    await shot(b, 'pairing-grapple');
    await mouse(b, 770, 226, false);
    await wait(b, 'far bank', s => s.player.x > 965 && s.player.grounded);
    await key(b, 'KeyD', false); await sleep(160);
    check('Player 2 crosses with normal grapple input', (await snapshot(b)).deaths === deaths);
    await walk(b, 1050);
    const switchAt = Date.now(); await tap(b, 'KeyE');
    await wait(a, 'remote bridge latch', s => s.outputs.bridge);
    propagation.switchB = Date.now() - switchAt;
    check('Switch B bridge propagates in under one second', propagation.switchB <= 1000, `${propagation.switchB} ms`);
    check('shared reunion checkpoint', (await snapshot(a)).multiplayer?.shared?.checkpoint === 'reunion');
    await shot(a, 'pairing-return-bridge');
    await b.send('Page.reload');
    const refreshed = await wait(b, 'refresh restores Player 2', s => s.multiplayer?.websocket === 'CONNECTED' && s.checkpoint === 'relay');
    check('refresh retains slot/latch/checkpoint', refreshed.multiplayer?.slot === 2 && refreshed.outputs.bridge && refreshed.player.x >= 1100);
    await walk(a, 1160);
    check('Player 1 traverses the materialized return bridge', (await snapshot(a)).player.x > 1000 && (await snapshot(a)).deaths === 0);

    if (!process.argv[2]) {
        const port = Number(new URL(backend).port), old = app!, exited = once(old, 'exit'); old.kill('SIGKILL'); await exited;
        await wait(a, 'automatic reconnect state', s => s.multiplayer?.websocket === 'RECONNECTING');
        check('unexpected server loss shows RECONNECTING', true);
        await startServer(port);
        await wait(a, 'A rejoins after process restart', s => s.multiplayer?.websocket === 'CONNECTED' && !!s.multiplayer.shared?.connected.every(Boolean));
        await wait(b, 'B rejoins after process restart', s => s.multiplayer?.websocket === 'CONNECTED' && !!s.multiplayer.shared?.connected.every(Boolean));
        const restoredA = await snapshot(a), restoredB = await snapshot(b);
        check('both automatic reconnects preserve slots and shared checkpoint', restoredA.multiplayer?.slot === 1 && restoredB.multiplayer?.slot === 2 && restoredA.outputs.bridge && restoredB.outputs.bridge && restoredA.player.x >= 1000 && restoredB.player.x >= 1100);
        check('process restart restores no body-held input', !restoredA.inputs.plateA && !restoredA.inputs.plateB && !restoredA.inputs.plateC);
    }
    await walk(a, 1370); await wait(b, 'left final plate visible', s => s.multiplayer?.shared?.inputs.finalPlateLeftOccupied === true);
    check('one final plate cannot complete', !(await snapshot(b)).outputs.exitDoor && !(await snapshot(b)).multiplayer?.shared?.completed);
    await walk(b, 1490);
    const finalAt = Date.now(); await walk(b, 1610);
    await wait(a, 'A completes', s => !!s.multiplayer?.shared?.completed && s.outputs.exitDoor);
    await wait(b, 'B completes', s => !!s.multiplayer?.shared?.completed && s.outputs.exitDoor);
    propagation.finalPlate = Date.now() - finalAt;
    check('final plate propagates in under one second including approach', propagation.finalPlate <= 1000, `${propagation.finalPlate} ms`);
    check('two distinct bodies open exit and complete on both clients', true);
    await shot(a, 'pairing-complete-p1'); await shot(b, 'pairing-complete-p2');
    await click(a, '#debug-toggle'); await shot(a, 'pairing-debug');
    const campaign = (await snapshot(a)).progress;
    check('co-op leaves personal campaign save unchanged', JSON.stringify(campaign) === JSON.stringify(originalProgress));
    check('no browser exceptions or console errors', clients.every(c => !c.errors.length), clients.flatMap(c => c.errors).join('\n'));
    await writeFile(join(shots, 'pairing-browser.json'), JSON.stringify({ checks, propagation, url: base, processRestart: !process.argv[2] }, null, 2));
} catch (e) {
    for (let i = 0; i < clients.length; i++) await shot(clients[i], `pairing-failure-${i}`).catch(() => {});
    process.stderr.write(String(e) + '\n'); process.exitCode = 1;
} finally {
    await writeFile(join(shots, 'pairing-browser.txt'), checks.join('\n') + '\n');
    for (const c of clients) c.socket.close(); root?.socket.close();
    for (const socket of proxySockets) socket.destroy();
    if (proxy) await new Promise<void>(resolve => proxy!.close(() => resolve()));
    if (app && app.exitCode === null && app.signalCode === null) { const stopped = once(app, 'exit'); app.kill('SIGTERM'); await stopped; }
    if (browser && browser.exitCode === null && browser.signalCode === null) { const stopped = once(browser, 'exit'); browser.kill(); await stopped; }
    await rm(temporary, { recursive: true, force: true });
}
