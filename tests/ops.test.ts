import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, request, type IncomingMessage } from 'node:http';
import { JSDOM } from 'jsdom';
import { createOperations, type OperationsOptions } from '../server/ops.ts';
import { opsPage, opsScript } from '../server/ops-page.ts';
import { Telemetry, type TelemetrySnapshot } from '../server/telemetry.ts';

const TOKEN = 'test-operations-credential-unique';
const shutdowns: (() => Promise<void>)[] = [];
afterEach(async () => { for (const close of shutdowns.splice(0)) await close(); });

async function setup(options: OperationsOptions = {}) {
    const telemetry = new Telemetry({ sink: { write: () => true }, salt: 'ops-test', now: options.now });
    const ops = createOperations(telemetry, { token: TOKEN, ...options });
    const server = createServer(async (req, res) => {
        if (!await ops.handle(req, res, new URL(req.url ?? '/', 'http://localhost'))) { res.writeHead(404); res.end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    shutdowns.push(async () => {
        ops.close(); telemetry.close();
        server.closeAllConnections();
        await new Promise<void>(resolve => server.close(() => resolve()));
    });
    async function login(value = TOKEN, extraHeaders: Record<string, string> = {}) {
        return fetch(origin + '/api/ops/session', {
            method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...extraHeaders },
            body: JSON.stringify({ token: value }),
        });
    }
    return { telemetry, ops, server, origin, login };
}
function cookie(response: Response) { return response.headers.get('set-cookie')!.split(';')[0]; }
async function stream(origin: string, auth: string) {
    let response!: IncomingMessage, buffer = '';
    const snapshots: TelemetrySnapshot[] = [];
    const req = request(origin + '/api/ops/events', { headers: { Cookie: auth } });
    await new Promise<void>((resolve, reject) => {
        req.once('error', reject);
        req.once('response', res => {
            response = res; res.setEncoding('utf8');
            res.on('data', chunk => {
                buffer += chunk;
                let boundary: number;
                while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                    const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
                    const data = frame.split('\n').find(line => line.startsWith('data: '));
                    if (data) snapshots.push(JSON.parse(data.slice(6)));
                }
            });
            resolve();
        });
        req.end();
    });
    return { response, snapshots, close: () => req.destroy() };
}
async function until(check: () => boolean, timeout = 2000) {
    const end = Date.now() + timeout;
    while (!check() && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 10));
    expect(check()).toBe(true);
}

describe('private operations access', () => {
    it('serves a data-free login shell; requires authentication for snapshots and streams', async () => {
        const app = await setup();
        app.telemetry.emit('player_connected', { player: 'SecretName', visitor: 'private-identity' });
        const page = await fetch(app.origin + '/ops');
        expect(page.status).toBe(200);
        expect(await page.text()).not.toContain('SecretName');
        expect(page.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(page.headers.get('content-security-policy')).not.toContain('unsafe-inline');
        expect(page.headers.get('cache-control')).toBe('no-store');
        for (const path of ['/api/ops/snapshot', '/api/ops/events']) {
            const denied = await fetch(app.origin + path);
            expect(denied.status).toBe(401);
            expect(await denied.text()).not.toContain('SecretName');
        }
        expect((await fetch(app.origin + '/ops/assets/app.js')).status).toBe(200);
    });
    it('disables private access with no credential configured', async () => {
        const app = await setup({ token: '' });
        for (const path of ['/ops', '/api/ops/snapshot', '/api/ops/events']) expect((await fetch(app.origin + path)).status).toBe(503);
        expect((await app.login()).status).toBe(503);
    });
    it('rejects bad credentials and issues an opaque HttpOnly strict session with TLS protection', async () => {
        const app = await setup();
        expect((await app.login('wrong')).status).toBe(401);
        const authenticated = await app.login();
        expect(authenticated.status).toBe(200);
        const setCookie = authenticated.headers.get('set-cookie')!;
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('SameSite=Strict');
        expect(setCookie).toContain('Max-Age=28800');
        expect(setCookie).not.toContain(TOKEN);
        expect(setCookie).not.toContain('Secure');
        expect((await fetch(app.origin + '/api/ops/snapshot', { headers: { Cookie: cookie(authenticated) } })).status).toBe(200);
        const secure = await app.login(TOKEN, { Origin: app.origin.replace('http:', 'https:'), 'X-Forwarded-Proto': 'https' });
        expect(secure.headers.get('set-cookie')).toContain('; Secure');
    });
    it('requires matching scheme and host Origin for login/logout and rejects cross-origin reads', async () => {
        const app = await setup();
        for (const origin of ['', 'null', 'https://evil.example', app.origin.replace('http:', 'https:')]) {
            expect((await app.login(TOKEN, { Origin: origin })).status).toBe(403);
        }
        const auth = cookie(await app.login());
        expect((await fetch(app.origin + '/api/ops/session', { method: 'DELETE', headers: { Cookie: auth } })).status).toBe(403);
        expect((await fetch(app.origin + '/api/ops/snapshot', { headers: { Cookie: auth, Origin: 'https://evil.example' } })).status).toBe(403);
        expect((await fetch(app.origin + '/api/ops/events', { headers: { Cookie: auth, 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    });
    it('expires and revokes sessions and closes their streams on logout', async () => {
        let now = Date.now();
        const app = await setup({ now: () => now, sessionDurationMs: 2000, heartbeatMs: 20 });
        const auth = cookie(await app.login());
        const live = await stream(app.origin, auth);
        await until(() => live.snapshots.length > 0);
        const loggedOut = await fetch(app.origin + '/api/ops/session', { method: 'DELETE', headers: { Origin: app.origin, Cookie: auth } });
        expect(loggedOut.status).toBe(200);
        expect(loggedOut.headers.get('set-cookie')).toContain('Max-Age=0');
        await until(() => live.response.complete);
        expect((await fetch(app.origin + '/api/ops/snapshot', { headers: { Cookie: auth } })).status).toBe(401);
        const another = cookie(await app.login());
        const expiring = await stream(app.origin, another);
        now += 2001;
        await until(() => expiring.response.complete);
        expect((await fetch(app.origin + '/api/ops/snapshot', { headers: { Cookie: another } })).status).toBe(401);
    });
    it('bounds credential attempts without keeping client IP addresses', async () => {
        let now = Date.now();
        const app = await setup({ now: () => now });
        for (let i = 0; i < 12; i++) expect((await app.login('wrong')).status).toBe(401);
        const limited = await app.login();
        expect(limited.status).toBe(429); expect(limited.headers.get('retry-after')).toBe('60');
        now += 60_000;
        expect((await app.login()).status).toBe(200);
        expect(app.telemetry.snapshot().events).toHaveLength(0);
    });
    it('rejects oversized or non-JSON credential requests', async () => {
        const app = await setup();
        const oversized = await app.login('x'.repeat(3000));
        expect(oversized.status).toBe(413);
        expect((await fetch(app.origin + '/api/ops/session', { method: 'POST', headers: { Origin: app.origin }, body: TOKEN })).status).toBe(415);
    });
});

describe('bounded live operations stream', () => {
    it('isolates heartbeat snapshot failures and resumes updates when the observer recovers', async () => {
        const app = await setup({ heartbeatMs: 20 });
        const live = await stream(app.origin, cookie(await app.login()));
        await until(() => live.snapshots.length > 0);
        const snapshot = vi.spyOn(app.telemetry, 'snapshot').mockImplementation(() => { throw new Error('Observer unavailable'); });
        await new Promise(resolve => setTimeout(resolve, 65));
        expect(snapshot).toHaveBeenCalled();
        expect(live.response.destroyed).toBe(false);
        snapshot.mockRestore();
        const before = live.snapshots.length;
        await until(() => live.snapshots.length > before);
        live.close();
    });
    it('refreshes recent gauges on heartbeat while the game is idle', async () => {
        let now = Date.now();
        const app = await setup({ now: () => now, heartbeatMs: 20 });
        app.telemetry.observeAction({ accepted: true, queueMs: 1, totalMs: 2, persistMs: 0 });
        const live = await stream(app.origin, cookie(await app.login()));
        await until(() => live.snapshots.some(snapshot => snapshot.metrics.recentAcceptedActions === 1));
        now += 61_000;
        await until(() => live.snapshots.at(-1)?.metrics.recentAcceptedActions === 0);
        expect(live.snapshots.at(-1)?.metrics.acceptedActions).toBe(1);
        live.close();
    });
    it('sends an initial snapshot, accepted activity, reconnect history and updated connection counts', async () => {
        const app = await setup();
        const auth = cookie(await app.login());
        const live = await stream(app.origin, auth);
        expect(live.response.statusCode).toBe(200);
        expect(live.response.headers['content-type']).toContain('text/event-stream');
        await until(() => live.snapshots.length === 1);
        app.telemetry.upsertSession({
            id: 'secret-party-one', chamber: 'deadlock', status: 'playing',
            players: [{ visitor: 'one', name: 'ShadowByte', colour: 'purple', slot: 1, connected: true }],
            progress: ['PAYLOAD ONE accepted'],
        });
        app.telemetry.upsertSession({
            id: 'secret-party-two', chamber: 'handshake', status: 'lobby',
            players: [{ visitor: 'two', name: 'ShadowByte', colour: 'orange', slot: 1, connected: true }],
        });
        app.telemetry.emit('payload_docked', { session: 'secret-party-one', chamber: 'deadlock', player: 'ShadowByte', playerSlot: 1 }, { cubeName: 'Cube A', receiverName: 'PAYLOAD ONE' });
        await until(() => live.snapshots.some(s => s.events.some(e => e.event === 'payload_docked')));
        const latest = live.snapshots.at(-1)!;
        expect(latest.metrics.connectedPlayers).toBe(2);
        expect(latest.sessions).toHaveLength(2);
        expect(new Set(latest.sessions.map(s => s.sessionRef)).size).toBe(2);
        expect(JSON.stringify(latest)).not.toContain('secret-party');
        live.close();
        const reconnected = await stream(app.origin, auth);
        await until(() => reconnected.snapshots.length === 1);
        expect(reconnected.snapshots[0].events.at(-1)?.event).toBe('payload_docked');
        app.telemetry.upsertSession({ id: 'secret-party-one', chamber: 'deadlock', status: 'playing', players: [{ name: 'ShadowByte', slot: 1, connected: false }] });
        await until(() => reconnected.snapshots.at(-1)?.metrics.connectedPlayers === 1);
        reconnected.close();
    });
    it('keeps all 250 history entries readable without treating normal HTTP backpressure as failure', async () => {
        const app = await setup();
        for (let i = 0; i < 250; i++) app.telemetry.emit('control_toggled', { session: 'room', player: 'ShadowByte', chamber: 'deadlock', playerSlot: 1 }, {
            controlId: `draft:toggle-${i}`, controlName: 'LONG CONTROL DISPLAY LABEL', enabled: Boolean(i % 2), source: 'authoritative_controller',
        });
        const auth = cookie(await app.login()), live = await stream(app.origin, auth);
        await until(() => live.snapshots.length > 0);
        expect(live.snapshots[0].events).toHaveLength(250);
        expect(live.response.destroyed).toBe(false);
        expect(Buffer.byteLength(JSON.stringify(live.snapshots[0]))).toBeGreaterThan(64 * 1024);
        live.close();
    });
    it('bounds stream slots and frees them when clients close', async () => {
        const app = await setup({ maxStreams: 2 });
        const auth = cookie(await app.login());
        const first = await stream(app.origin, auth), second = await stream(app.origin, auth);
        expect((await fetch(app.origin + '/api/ops/events', { headers: { Cookie: auth } })).status).toBe(429);
        first.close(); await new Promise(resolve => setTimeout(resolve, 30));
        const replacement = await stream(app.origin, auth);
        expect(replacement.response.statusCode).toBe(200);
        app.ops.close();
        await until(() => second.response.complete && replacement.response.complete);
    });
});

describe('operations page rendering', () => {
    it('uses text nodes for names and metadata, associates sessions, and renders authoritative event descriptions', async () => {
        const telemetry = new Telemetry({ sink: { write: () => true } });
        const value = telemetry.snapshot(); telemetry.close();
        // Deliberately bypass server sanitization to verify the browser remains safe independently.
        value.events = [{
            id: 1, timestamp: new Date().toISOString(), level: 'info', event: 'payload_docked',
            player: '<img src=x onerror=alert(1)>', playerSlot: 1, sessionRef: 'session-first',
            chamber: 'deadlock', cubeName: 'Cube A', receiverName: 'PAYLOAD ONE', actor: 'reporting_player',
        }, { id: 2, timestamp: new Date().toISOString(), level: 'info', event: 'lift_power_changed', chamber: 'deadlock', outputName: 'CARGO LIFT', enabled: true }];
        value.sessions = [{ sessionRef: 'session-first', chamber: 'deadlock', status: 'playing', updatedAt: value.timestamp, players: [{ name: '<script>bad()</script>', slot: 1, colour: 'purple', connected: true }], progress: ['PAYLOAD ONE accepted'] }];
        value.metrics.connectedPlayers = 1;
        const dom = new JSDOM(opsPage(true), { url: 'http://localhost/ops', runScripts: 'outside-only' });
        const win = dom.window;
        class FakeEventSource { static CLOSED = 2; addEventListener() {} close() {} }
        Object.assign(win, { fetch: async () => ({ ok: true, status: 200, json: async () => value }), EventSource: FakeEventSource });
        win.eval(opsScript);
        await until(() => !win.document.getElementById('ops-dashboard')!.hidden);
        expect(win.document.querySelector('#ops-events img')).toBeNull();
        expect(win.document.querySelector('#ops-sessions script')).toBeNull();
        expect(win.document.querySelector('#ops-events')!.textContent).toContain('Cube A accepted at PAYLOAD ONE');
        expect(win.document.querySelector('#ops-events')!.textContent).toContain('CARGO LIFT powered ON');
        expect(win.document.querySelector('#ops-events')!.textContent).toContain('session-first / DEADLOCK / reporter <img src=x onerror=alert(1)> [P1]');
        expect(win.document.querySelector('#ops-sessions')!.textContent).toContain('<script>bad()</script>');
        expect(win.document.querySelector('[data-metric=connectedPlayers]')!.textContent).toBe('1');
        const severity = win.document.getElementById('ops-severity') as HTMLSelectElement;
        severity.value = 'error'; severity.dispatchEvent(new win.Event('change'));
        expect(win.document.querySelector('#ops-events')!.textContent).toContain('No matching activity yet');
        win.dispatchEvent(new win.Event('pagehide')); win.close();
    });
});
