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
let scenario = '';
let shotPrefix = '';
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
    await root!.send('Browser.grantPermissions', { origin: new URL(url).origin, browserContextId, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
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
    const line = `${ok ? 'PASS' : 'FAIL'} ${scenario}${label}${detail ? ` — ${detail}` : ''}`;
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
async function shot(p: Cdp, name: string) { const data = await p.send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(shots, shotPrefix + name + '.png'), Buffer.from(data.data, 'base64')); }

try {
    const backend = process.argv[2] ?? await startServer();
    const base = process.env.BN_TEST_TLS ? await tlsOrigin(backend) : backend;
    const url = new URL(base).href;
    const debugUrl = await launchBrowser(); root = await new Cdp(debugUrl).open();
    for (const holderSlot of [1, 2] as const) {
        const runnerSlot = holderSlot === 1 ? 2 : 1;
        scenario = `[P${holderSlot} holds / P${runnerSlot} runs] `; shotPrefix = `p${holderSlot}-holds-`;
        const a = await page(url, debugUrl), b = await page(url, debugUrl);
        const holder = holderSlot === 1 ? a : b, runner = holderSlot === 1 ? b : a;
        const originalProgress = [(await snapshot(a)).progress, (await snapshot(b)).progress];
        check('two isolated visitors', (await snapshot(a)).persistence.visitor !== (await snapshot(b)).persistence.visitor);
        await click(a, '#create-room');
        await wait(a, 'created room', s => s.multiplayer?.websocket === 'CONNECTED');
        const code = await a.read<string>('document.querySelector("#room-code").textContent');
        check('displayed human-readable room code', /^[A-HJKMNP-Z2-9]{4}$/.test(code), code);
        check('Player 1 waiting UI', (await a.read<string>('document.querySelector("#coop-state").textContent')).includes('WAITING FOR PARTNER'));
        await click(a, '#copy-room-code');
        check('COPY CODE writes the actual clipboard', await a.read('navigator.clipboard.readText()') === code);
        await shot(a, 'pairing-waiting');
        await click(b, '#join-code'); await b.send('Input.insertText', { text: code.toLowerCase() }); await click(b, '#join-room');
        await wait(a, 'both connected on A', s => !!s.multiplayer?.shared?.connected.every(Boolean));
        const joined = await wait(b, 'both connected on B', s => !!s.multiplayer?.shared?.connected.every(Boolean));
        check('UI join gives distinct slots', joined.multiplayer?.slot === 2 && (await snapshot(a)).multiplayer?.slot === 1);
        check('WebSocket uses the page host/protocol and /ws', joined.multiplayer?.url === base.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws');
        if (process.env.BN_TEST_TLS) {
            const cookies = await a.send('Network.getCookies', { urls: [base] });
            check('TLS proxy assigns one Secure HttpOnly visitor cookie', cookies.cookies.filter((c: { name: string; secure: boolean; httpOnly: boolean }) => c.name === 'bn_visitor' && c.secure && c.httpOnly).length === 1);
        }
        await wait(a, 'remote avatar on A', s => !!s.multiplayer?.remote);
        await wait(b, 'remote avatar on B', s => !!s.multiplayer?.remote);
        check('both clients render remote avatars', true);
        const start = Date.now(); await walk(holder, 250);
        await wait(runner, 'anchor powered remotely', s => s.outputs.grappleAnchor);
        const plateMs = propagation[`p${holderSlot}Holds.plateA`] = Date.now() - start;
        check('Plate A propagates in under one second including approach', plateMs <= 1000, `${plateMs} ms`);
        await wait(runner, 'remote movement visible', s => Math.abs((s.multiplayer?.remote?.x ?? 0) - 250) < 60);
        check('remote avatar moves through ordinary input', true);
        await shot(runner, 'pairing-anchor-powered');

        await holder.send('Page.navigate', { url: 'about:blank' });
        const absent = await wait(runner, 'disconnect releases A', s => s.multiplayer?.shared?.connected[holderSlot - 1] === false && !s.outputs.grappleAnchor);
        check('disconnect removes avatar and releases anchor', !absent.multiplayer?.remote);
        check('partner disconnected visible', (await runner.read<string>('document.querySelector("#coop-state").textContent')).includes('PARTNER DISCONNECTED'));
        await shot(runner, 'pairing-disconnected');
        const history = await holder.send('Page.getNavigationHistory');
        await holder.send('Page.navigateToHistoryEntry', { entryId: history.entries[history.currentIndex - 1].id });
        const returned = await wait(holder, 'same-tab back-navigation reconnect', s => s.multiplayer?.websocket === 'CONNECTED');
        check('reconnect reclaims holder slot without stale occupancy', returned.multiplayer?.slot === holderSlot && !returned.inputs.plateA && Math.abs(returned.player.x - (holderSlot === 1 ? 150 : 405)) < 10);
        await walk(holder, 250); await wait(runner, 'anchor restored by fresh occupancy', s => s.outputs.grappleAnchor);

        await walk(runner, 430);
        const deaths = (await snapshot(runner)).deaths;
        await key(runner, 'KeyD', true); await mouse(runner, 770, 226, true);
        await wait(runner, 'real hook attachment', s => s.player.rope.phase === 'attached');
        await wait(runner, 'rightward grapple release', s => s.player.x > 860 && s.player.y < 510 && s.player.vx > 0);
        await shot(runner, 'pairing-grapple');
        await mouse(runner, 770, 226, false);
        await wait(runner, 'far bank', s => s.player.x > 965 && s.player.grounded);
        await key(runner, 'KeyD', false); await sleep(160);
        check(`Player ${runnerSlot} crosses with normal grapple input`, (await snapshot(runner)).deaths === deaths);
        await walk(runner, 1050);
        const switchAt = Date.now(); await tap(runner, 'KeyE');
        await wait(holder, 'remote bridge latch', s => s.outputs.bridge);
        const switchMs = propagation[`p${holderSlot}Holds.switchB`] = Date.now() - switchAt;
        check('Switch B bridge propagates in under one second', switchMs <= 1000, `${switchMs} ms`);
        check('shared reunion checkpoint', (await snapshot(holder)).multiplayer?.shared?.checkpoint === 'reunion');
        await shot(holder, 'pairing-return-bridge');
        await runner.send('Page.reload');
        const refreshed = await wait(runner, 'refresh restores runner', s => s.multiplayer?.websocket === 'CONNECTED' && s.checkpoint === 'relay');
        check('refresh retains slot/latch/checkpoint', refreshed.multiplayer?.slot === runnerSlot && refreshed.outputs.bridge && Math.abs(refreshed.player.x - (runnerSlot === 1 ? 1050 : 1150)) < 10);
        await walk(holder, 1160);
        check(`Player ${holderSlot} traverses the materialized bridge`, (await snapshot(holder)).player.x > 1000 && (await snapshot(holder)).deaths === 0);

        // Swap the final-plate assignment as well as the first traversal roles.
        await walk(holder, 1370); await wait(runner, 'left final plate visible', s => s.multiplayer?.shared?.inputs.finalPlateLeftOccupied === true);
        check('one final plate cannot unlock or complete', !(await snapshot(runner)).outputs.exitDoor && !(await snapshot(runner)).multiplayer?.shared?.completed);
        await walk(runner, 1490);
        const beforeDoor = (await snapshot(holder)).audio.played.door ?? 0;
        const beforeComplete = (await snapshot(holder)).audio.played.complete ?? 0;
        const finalAt = Date.now(); await walk(runner, 1610);
        await wait(holder, 'holder sees unlock', s => !!s.multiplayer?.shared?.exitUnlocked && s.outputs.exitDoor);
        await wait(runner, 'runner sees unlock', s => !!s.multiplayer?.shared?.exitUnlocked && s.outputs.exitDoor);
        const finalMs = propagation[`p${holderSlot}Holds.finalPlate`] = Date.now() - finalAt;
        check('final unlock propagates in under one second including approach', finalMs <= 1000, `${finalMs} ms`);
        const unlocked = await snapshot(holder);
        check('two distinct bodies unlock without completing', !unlocked.multiplayer?.shared?.completed && unlocked.multiplayer?.shared?.reachedExit.every(v => !v) === true);
        check('unlock message is visible', (await holder.read<string>('document.querySelector("#coop-state").textContent')).includes('EXIT UNLOCKED'));
        await shot(holder, 'pairing-unlocked');
        // Regroup between the plates before either player approaches the exit.
        await walk(holder, 1490); await walk(runner, 1500);
        const released = await wait(holder, 'both final plates released', s => !s.inputs.plateB && !s.inputs.plateC);
        check('leaving both plates keeps the door open, with no arrivals', released.outputs.exitDoor && !released.multiplayer?.shared?.completed && released.multiplayer?.shared?.reachedExit.every(v => !v) === true);
        check('unlock plays one door cue and no completion cue', (released.audio.played.door ?? 0) === beforeDoor + 1 && (released.audio.played.complete ?? 0) === beforeComplete);
        await walk(holder, 1740);
        const firstArrival = await wait(runner, 'first physical arrival accepted', s => !!s.multiplayer?.shared?.reachedExit[holderSlot - 1]);
        check('first distinct arrival cannot complete', !firstArrival.multiplayer?.shared?.completed && !firstArrival.multiplayer?.shared?.reachedExit[runnerSlot - 1]);
        check('arrival count is visible', (await runner.read<string>('document.querySelector("#exit-arrivals").textContent')).includes('1 / 2 ARRIVED'));
        await shot(runner, 'pairing-first-arrival');
        await walk(holder, 1680); // Leaving the zone does not erase semantic arrival credit.
        check('arrival remains recorded after leaving the exit', !!(await snapshot(holder)).multiplayer?.shared?.reachedExit[holderSlot - 1]);

        if (!process.argv[2]) {
            const port = Number(new URL(backend).port), old = app!, exited = once(old, 'exit'); old.kill('SIGKILL'); await exited;
            await wait(holder, 'automatic reconnect state', s => s.multiplayer?.websocket === 'RECONNECTING');
            check('unexpected server loss shows RECONNECTING', true);
            await startServer(port);
            await wait(a, 'A rejoins after process restart', s => s.multiplayer?.websocket === 'CONNECTED' && !!s.multiplayer.shared?.connected.every(Boolean));
            await wait(b, 'B rejoins after process restart', s => s.multiplayer?.websocket === 'CONNECTED' && !!s.multiplayer.shared?.connected.every(Boolean));
        } else {
            await holder.send('Page.reload');
            await wait(holder, 'arrival credit after refresh', s => s.multiplayer?.websocket === 'CONNECTED');
        }
        const restored = await snapshot(holder);
        check('recovery preserves slot, checkpoint, unlock and first arrival', restored.multiplayer?.slot === holderSlot && restored.checkpoint === 'relay' && restored.outputs.bridge && restored.outputs.exitDoor && !!restored.multiplayer?.shared?.reachedExit[holderSlot - 1] && !restored.multiplayer?.shared?.reachedExit[runnerSlot - 1] && !restored.multiplayer?.shared?.completed);
        check('recovery restores no body-held input', !restored.inputs.plateA && !restored.inputs.plateB && !restored.inputs.plateC);
        await walk(holder, 1740); // Regroup naturally; its previously earned arrival is still credited.
        await walk(runner, 1800);
        await wait(a, 'A completes after both arrivals', s => !!s.multiplayer?.shared?.completed && s.outputs.exitDoor);
        await wait(b, 'B completes after both arrivals', s => !!s.multiplayer?.shared?.completed && s.outputs.exitDoor);
        check('both physical arrivals complete on both clients', (await snapshot(a)).multiplayer?.shared?.reachedExit.every(Boolean) === true);
        check('completion cue waits for the second arrival and plays once', ((await snapshot(holder)).audio.played.complete ?? 0) === beforeComplete + 1);
        await shot(a, 'pairing-complete-p1'); await shot(b, 'pairing-complete-p2');
        await click(a, '#debug-toggle'); await shot(a, 'pairing-debug');
        check('co-op preserves both personal campaign saves', JSON.stringify([(await snapshot(a)).progress, (await snapshot(b)).progress]) === JSON.stringify(originalProgress));
        await a.send('Page.navigate', { url: 'about:blank' }); await b.send('Page.navigate', { url: 'about:blank' });
    }
    scenario = ''; shotPrefix = '';
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
