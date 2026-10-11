/** Shared muted browser/session utilities; routes use real input and read-only snapshots. */
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
export type GameSnapshot = ReturnType<SliceGame['snapshot']>;
export class Cdp {
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
export async function coopBrowser<S extends GameSnapshot = GameSnapshot>(options: { shots?: string; internalLabs?: boolean } = {}) {
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const checks: string[] = [];
    const shots = options.shots ?? join(tmpdir(), 'bn-coop-shots');
    const temporary = await mkdtemp(join(tmpdir(), 'bn-coop-browser-'));
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
        app = spawn(process.execPath, ['server/app.ts'], { env: { ...process.env, NODE_ENV: 'test', PORT: String(port), DATA_DIR: join(temporary, 'data') }, stdio: ['ignore', 'pipe', 'pipe'] });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('App start timed out')), 6000);
            app!.once('error', reject);
            app!.stdout!.on('data', b => { const p = String(b).match(/listening on (\d+)/)?.[1]; if (p) { clearTimeout(timeout); resolve(`http://127.0.0.1:${p}/`); } });
            app!.stderr!.on('data', b => process.stderr.write(b));
        });
    }
    async function launchBrowser(): Promise<string> {
        const profile = join(temporary, 'chrome');
        for (const executable of [process.env.BROWSER_BIN, 'chromium', 'chromium-browser', 'google-chrome', 'brave-browser'].filter(Boolean) as string[]) {
            browser = spawn(executable, ['--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
                ...(process.env.BN_TEST_AUDIO === '1' ? [] : ['--mute-audio']),
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
        const target = new URL(url);
        if (options.internalLabs !== false) target.searchParams.set('labs', '1');
        await client.send('Page.navigate', { url: target.href });
        await wait(client, 'campaign loaded', s => s.persistence.visitor !== '');
        return client;
    }
    const snapshot = (p: Cdp) => p.read<S>('binaryNinja.snapshot()');
    async function wait(p: Cdp, label: string, predicate: (s: S) => boolean, timeout = 10000): Promise<S> {
        const end = Date.now() + timeout;
        let last: S | undefined;
        do {
            if (await p.read('!!globalThis.binaryNinja')) { last = await snapshot(p); if (predicate(last)) return last; }
            await sleep(20);
        } while (Date.now() < end);
        throw new Error(`${label}: ${JSON.stringify(last)}`);
    }
    function check(label: string, ok: boolean, detail = '') {
        const line = `${ok ? 'PASS' : 'FAIL'} ${h.scenario}${label}${detail ? ` — ${detail}` : ''}`;
        checks.push(line); process.stdout.write(line + '\n'); if (!ok) throw new Error(line);
    }
    async function click(p: Cdp, selector: string) {
        const at = await p.read<{ x: number; y: number }>(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button: 'left', buttons: 1, clickCount: 1 });
        await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button: 'left', buttons: 0, clickCount: 1 });
        await sleep(80);
    }
    const keys: Record<string, [string, number]> = { KeyA: ['a', 65], KeyD: ['d', 68], KeyE: ['e', 69], Space: [' ', 32], Tab: ['Tab', 9], KeyR: ['r', 82], KeyS: ['s', 83] };
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
    async function shot(p: Cdp, name: string) { const data = await p.send('Page.captureScreenshot', { format: 'png' }); await writeFile(join(shots, h.shotPrefix + name + '.png'), Buffer.from(data.data, 'base64')); }
    async function cleanup() {
        // Brave's launcher may exit before its browser process; close the owned CDP browser too.
        await root?.send('Browser.close').catch(() => {});
        for (const c of clients) c.socket.close(); root?.socket.close();
        for (const socket of proxySockets) socket.destroy();
        if (proxy) await new Promise<void>(resolve => proxy!.close(() => resolve()));
        if (app && app.exitCode === null && app.signalCode === null) { const stopped = once(app, 'exit'); app.kill('SIGTERM'); await stopped; }
        if (browser && browser.exitCode === null && browser.signalCode === null) { const stopped = once(browser, 'exit'); browser.kill(); await stopped; }
        await rm(temporary, { recursive: true, force: true });
    }
    const h = { scenario: '', shotPrefix: '', temporary, shots, checks, clients, sleep,
        startServer, tlsOrigin, page, snapshot, wait, check, click, key, tap, walk, mouse, shot, cleanup,
        get app() { return app; },
        async launch() { const url = await launchBrowser(); root = await new Cdp(url).open(); return url; },
    };
    return h;
}
