import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { TelemetrySnapshot } from './telemetry.ts';
import { opsPage, opsScript, opsStyles } from './ops-page.ts';

interface TelemetrySource {
    snapshot(): TelemetrySnapshot;
    subscribe(listener: (snapshot: TelemetrySnapshot) => void): () => void;
}
export interface OperationsOptions {
    token?: string;
    now?: () => number;
    sessionDurationMs?: number;
    heartbeatMs?: number;
    maxStreams?: number;
}
interface Session { expires: number; streams: Set<ServerResponse> }
interface StreamState { blocked: boolean; pending?: TelemetrySnapshot; deadline?: NodeJS.Timeout }

const COOKIE = 'bn_ops';
const digest = (value: string) => createHash('sha256').update(value).digest();
const secureRequest = (req: IncomingMessage) =>
    Boolean((req.socket as { encrypted?: boolean }).encrypted) || req.headers['x-forwarded-proto'] === 'https';

/** Independent, bounded administration sessions. No visitor identity or gameplay state is involved. */
export function createOperations(telemetry: TelemetrySource, options: OperationsOptions = {}) {
    const token = options.token ?? process.env.OBSERVABILITY_TOKEN ?? '';
    const configuredHash = token ? digest(token) : null;
    const now = options.now ?? Date.now;
    const lifetime = options.sessionDurationMs ?? 8 * 60 * 60 * 1000;
    const sessions = new Map<string, Session>();
    const streams = new Set<ServerResponse>();
    const streamStates = new Map<ServerResponse, StreamState>();
    const maxStreams = options.maxStreams ?? 16;
    let closed = false;
    let loginWindow = now();
    let loginAttempts = 0;

    function endSession(key: string, session: Session) {
        for (const res of [...session.streams]) res.end();
        sessions.delete(key);
    }
    function prune() {
        for (const [key, session] of sessions) if (session.expires <= now()) endSession(key, session);
    }
    function sessionFor(req: IncomingMessage): [string, Session] | undefined {
        prune();
        const value = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
        if (!value || !/^[a-zA-Z0-9_-]{43}$/.test(value)) return;
        const key = digest(value).toString('hex');
        const session = sessions.get(key);
        return session ? [key, session] : undefined;
    }
    function headers(res: ServerResponse) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    }
    function json(res: ServerResponse, status: number, value: unknown) {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(value));
    }
    function sameOrigin(req: IncomingMessage): boolean {
        if (!req.headers.origin || req.headers['sec-fetch-site'] === 'cross-site') return false;
        try {
            const origin = new URL(req.headers.origin);
            return origin.origin === `${secureRequest(req) ? 'https' : 'http'}://${req.headers.host}`;
        } catch { return false; }
    }
    function cookie(req: IncomingMessage, value: string, age: number) {
        return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secureRequest(req) ? '; Secure' : ''}`;
    }
    function writeSnapshot(res: ServerResponse, snapshot: TelemetrySnapshot) {
        if (res.destroyed || res.writableEnded) return;
        // An operations tab must never back up the gameplay process with queued network writes.
        const state = streamStates.get(res);
        if (!state) return;
        if (state.blocked) { state.pending = snapshot; return; }
        const frame = `event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`;
        if (Buffer.byteLength(frame) > 1024 * 1024) { res.destroy(); return; }
        if (!res.write(frame)) {
            state.blocked = true;
            state.deadline = setTimeout(() => res.destroy(), 5_000);
            state.deadline.unref();
        }
    }
    const unsubscribe = telemetry.subscribe(snapshot => {
        prune();
        for (const res of [...streams]) {
            try { writeSnapshot(res, snapshot); } catch { res.destroy(); }
        }
    });
    const heartbeat = setInterval(() => {
        prune();
        let snapshot: TelemetrySnapshot | undefined;
        // A failed observer must not escape an interval callback into the game server.
        try { if (streams.size) snapshot = telemetry.snapshot(); } catch { /* Retry on the next heartbeat. */ }
        for (const res of [...streams]) {
            try {
                if (!streamStates.get(res)?.blocked) res.write(': heartbeat\n\n');
                if (snapshot) writeSnapshot(res, snapshot);
            } catch { res.destroy(); }
        }
    }, options.heartbeatMs ?? 15_000);
    heartbeat.unref();

    async function handle(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
        const path = url.pathname;
        if (path !== '/ops' && path !== '/ops/' && !path.startsWith('/ops/') && !path.startsWith('/api/ops/')) return false;
        headers(res);
        if (closed) { json(res, 503, { error: 'Operations are shutting down.' }); return true; }
        if (path === '/ops/assets/app.js' || path === '/ops/assets/app.css') {
            if (req.method !== 'GET' && req.method !== 'HEAD') { json(res, 405, { error: 'Method not allowed.' }); return true; }
            res.writeHead(200, { 'Content-Type': path.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8' });
            res.end(req.method === 'HEAD' ? undefined : path.endsWith('.js') ? opsScript : opsStyles);
            return true;
        }
        if (path === '/ops' || path === '/ops/') {
            if (req.method !== 'GET' && req.method !== 'HEAD') { json(res, 405, { error: 'Method not allowed.' }); return true; }
            res.writeHead(configuredHash ? 200 : 503, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(req.method === 'HEAD' ? undefined : opsPage(Boolean(configuredHash)));
            return true;
        }
        if (!configuredHash) { json(res, 503, { error: 'Private operations access is disabled. Configure OBSERVABILITY_TOKEN on the server.' }); return true; }
        if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && !sameOrigin(req))) {
            json(res, 403, { error: 'Same-origin access is required.' }); return true;
        }
        if (path === '/api/ops/session' && req.method === 'POST') {
            if (!sameOrigin(req)) { json(res, 403, { error: 'A matching Origin header is required.' }); return true; }
            if (now() - loginWindow >= 60_000) { loginWindow = now(); loginAttempts = 0; }
            if (++loginAttempts > 12) {
                res.setHeader('Retry-After', String(Math.max(1, Math.ceil((60_000 - (now() - loginWindow)) / 1000))));
                json(res, 429, { error: 'Too many login attempts. Retry in one minute.' }); return true;
            }
            if (!req.headers['content-type']?.startsWith('application/json')) { json(res, 415, { error: 'Send JSON.' }); return true; }
            let body = '', size = 0;
            const deadline = setTimeout(() => req.destroy(), 5_000);
            try {
                for await (const chunk of req) {
                    size += Buffer.byteLength(chunk);
                    if (size > 2048) { json(res, 413, { error: 'Login request is too large.' }); return true; }
                    body += chunk;
                }
                let supplied: unknown;
                try { supplied = JSON.parse(body)?.token; } catch { /* Invalid input follows the same response as a bad credential. */ }
                if (typeof supplied !== 'string' || supplied.length > 512 || !timingSafeEqual(digest(supplied), configuredHash)) {
                    json(res, 401, { error: 'The administrator credential was not accepted.' }); return true;
                }
            } catch {
                if (!res.destroyed) json(res, 400, { error: 'Unable to read login request.' });
                return true;
            } finally { clearTimeout(deadline); }
            prune();
            const existing = sessionFor(req);
            if (existing) endSession(...existing);
            while (sessions.size >= 8) {
                const oldest = sessions.entries().next().value;
                if (oldest) endSession(...oldest);
            }
            const value = randomBytes(32).toString('base64url');
            sessions.set(digest(value).toString('hex'), { expires: now() + lifetime, streams: new Set() });
            res.setHeader('Set-Cookie', cookie(req, value, Math.floor(lifetime / 1000)));
            json(res, 200, { ok: true }); return true;
        }
        const authenticated = sessionFor(req);
        if (!authenticated) { json(res, 401, { error: 'Administrator authentication required.' }); return true; }
        if (path === '/api/ops/session' && req.method === 'DELETE') {
            if (!sameOrigin(req)) { json(res, 403, { error: 'A matching Origin header is required.' }); return true; }
            endSession(...authenticated);
            res.setHeader('Set-Cookie', cookie(req, '', 0));
            json(res, 200, { ok: true }); return true;
        }
        if (path === '/api/ops/snapshot' && req.method === 'GET') {
            json(res, 200, telemetry.snapshot()); return true;
        }
        if (path === '/api/ops/events' && req.method === 'GET') {
            if (streams.size >= maxStreams || authenticated[1].streams.size >= 2) {
                res.setHeader('Retry-After', '15');
                json(res, 429, { error: 'Too many operations streams. Close an unused operations tab.' }); return true;
            }
            res.writeHead(200, {
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Connection': 'keep-alive', 'X-Accel-Buffering': 'no',
            });
            res.flushHeaders();
            streams.add(res);
            authenticated[1].streams.add(res);
            const state: StreamState = { blocked: false };
            streamStates.set(res, state);
            const drain = () => {
                clearTimeout(state.deadline);
                state.blocked = false;
                const pending = state.pending;
                state.pending = undefined;
                if (pending) {
                    try { writeSnapshot(res, pending); } catch { res.destroy(); }
                }
            };
            const cleanup = () => {
                clearTimeout(state.deadline);
                state.pending = undefined;
                streams.delete(res); streamStates.delete(res); authenticated[1].streams.delete(res);
                res.removeListener('drain', drain);
            };
            res.on('drain', drain);
            res.once('close', cleanup);
            res.once('error', cleanup);
            res.write('retry: 2000\n\n');
            writeSnapshot(res, telemetry.snapshot());
            return true;
        }
        json(res, 404, { error: 'Operations endpoint not found.' }); return true;
    }
    function close() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        for (const [key, session] of sessions) endSession(key, session);
        for (const res of [...streams]) res.end();
        streams.clear();
    }
    return { handle, close };
}
