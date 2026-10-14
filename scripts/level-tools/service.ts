/** Local-only entry. Never imported by server/app.ts or the production frontend. */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { ensureVisitor } from '../../server/identity.ts';
import { attachMultiplayer } from '../../server/multiplayer.ts';
import { atomicJson } from '../../server/atomic-json.ts';
import { importDraft } from '../../src/workbench/imports.ts';
import { validateDraft } from '../../src/workbench/validation.ts';
import { DraftStorage, StorageError, draftRecord, MAX_DOCUMENT_BYTES } from './storage.ts';
import { DraftSessionRegistry } from './session-registry.ts';

export async function startWorkbench(options: { port?: number; draftRoot?: string; dataDir?: string; frontend?: boolean; gameUrl?: () => string | undefined } = {}) {
    const storage = new DraftStorage(options.draftRoot);
    await storage.ready();
    const dataDir = resolve(options.dataDir ?? '.workbench');
    await mkdir(dataDir, { recursive: true });
    const token = randomBytes(32).toString('hex');
    let engineRevision = 'unknown';
    try {
        engineRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
        if (execFileSync('git', ['status', '--porcelain', '--', 'src', 'server', 'scripts/level-tools'], { encoding: 'utf8' }).trim()) engineRevision += '-dirty';
    } catch { /* Source archives have no git metadata. */ }
    const registry = new DraftSessionRegistry();
    let origin = '';
    const json = (res: ServerResponse, code: number, value: unknown) => {
        res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.end(JSON.stringify(value));
    };
    async function body(req: IncomingMessage): Promise<unknown> {
        if (!req.headers['content-type']?.startsWith('application/json')) throw new StorageError('Use Content-Type: application/json', 415);
        const chunks: Buffer[] = []; let size = 0;
        for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += buffer.length;
            if (size > MAX_DOCUMENT_BYTES + 16384) throw new StorageError('Request too large', 413);
            chunks.push(buffer);
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    let vite: ViteDevServer | undefined;
    const server = createServer(async (req, res) => {
        try {
            // A clicked game-menu link may cross localhost -> 127.0.0.1. Only the
            // initial top-level document navigation gets that exception, never APIs.
            if (!origin || req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) {
                json(res, 403, { error: 'Workbench requires its printed loopback origin' }); return;
            }
            const url = new URL(req.url ?? '/', origin);
            const method = req.method ?? 'GET';
            // Saving the game before leaving can outlast transient user activation.
            // Trust only the exact configured loopback game origin, including its port.
            const fromGame = () => {
                try {
                    const game = new URL(options.gameUrl?.() ?? ''), referer = new URL(req.headers.referer ?? '');
                    return game.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(game.hostname)
                        && !game.username && !game.password && referer.origin === game.origin;
                } catch { return false; }
            };
            const allowedDocument = method === 'GET' && (url.pathname === '/' || url.pathname === '/workbench.html')
                && req.headers['sec-fetch-mode'] === 'navigate' && req.headers['sec-fetch-dest'] === 'document'
                && (req.headers['sec-fetch-user'] === '?1' || fromGame());
            if (req.headers['sec-fetch-site'] === 'cross-site' && !allowedDocument) {
                json(res, 403, { error: 'Workbench requires its printed loopback origin' }); return;
            }
            if (url.pathname.startsWith('/api/workbench/')) {
                if (!['GET', 'HEAD'].includes(method) && (req.headers.origin !== origin || req.headers['x-workbench-token'] !== token)) {
                    json(res, 403, { error: 'Local write authorization and same-origin request required' }); return;
                }
                if (url.pathname === '/api/workbench/bootstrap' && method === 'GET') {
                    ensureVisitor(req, res);
                    json(res, 200, { token, draftRoot: storage.root, dataDir, engineRevision, files: await storage.list(), gameUrl: options.gameUrl?.() }); return;
                }
                if (url.pathname === '/api/workbench/files' && method === 'GET') { json(res, 200, { files: await storage.list() }); return; }
                if (url.pathname === '/api/workbench/drafts') {
                    const name = url.searchParams.get('name') ?? '';
                    if (method === 'GET') { json(res, 200, await storage.read(name)); return; }
                    if (method === 'PUT') {
                        const payload = await body(req);
                        if (!payload || typeof payload !== 'object' || !('document' in payload) || !('expectedHash' in payload)
                            || payload.expectedHash !== null && typeof payload.expectedHash !== 'string') throw new StorageError('Expected {document, expectedHash}', 400);
                        json(res, 200, await storage.write(name, payload.document, payload.expectedHash)); return;
                    }
                }
                if (url.pathname === '/api/workbench/import' && method === 'POST') {
                    const payload = await body(req);
                    if (!payload || typeof payload !== 'object' || !('controller' in payload) || typeof payload.controller !== 'string') throw new StorageError('Expected controller factory ID', 400);
                    json(res, 200, await draftRecord(importDraft(payload.controller))); return;
                }
                if (url.pathname === '/api/workbench/recovery') {
                    if (method === 'DELETE') {
                        await unlink(join(dataDir, 'recovery.json')).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; });
                        json(res, 200, { cleared: true }); return;
                    }
                    if (method === 'GET') {
                        try { json(res, 200, JSON.parse(await readFile(join(dataDir, 'recovery.json'), 'utf8'))); }
                        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') json(res, 200, null); else throw error; }
                        return;
                    }
                    if (method === 'PUT') {
                        const payload = await body(req);
                        if (!payload || typeof payload !== 'object' || !('document' in payload)) throw new StorageError('Recovery requires a document', 400);
                        const record = await draftRecord(payload.document);
                        const name = 'name' in payload && typeof payload.name === 'string' ? payload.name.slice(0, 100) : '';
                        const expectedHash = 'expectedHash' in payload && typeof payload.expectedHash === 'string' ? payload.expectedHash : null;
                        await atomicJson(join(dataDir, 'recovery.json'), { document: record.document, name, expectedHash });
                        json(res, 200, { saved: true }); return;
                    }
                }
                if (url.pathname === '/api/workbench/snapshots' && method === 'POST') {
                    const payload = await body(req);
                    if (!payload || typeof payload !== 'object' || !('document' in payload)) throw new StorageError('Snapshot requires a document', 400);
                    const validation = validateDraft(payload.document);
                    if (!validation.playable || !validation.document) { json(res, 422, { error: 'Blocking diagnostics prevent playtesting', diagnostics: validation.diagnostics }); return; }
                    json(res, 201, await registry.register(validation.document)); return;
                }
                const match = url.pathname.match(/^\/api\/workbench\/snapshots\/([a-f0-9]{64})$/);
                if (match && method === 'GET') {
                    const document = registry.document(match[1]);
                    if (!document) throw new StorageError('Frozen draft snapshot unavailable; restart the test from the editor', 404);
                    json(res, 200, { document, hash: match[1] }); return;
                }
                json(res, 404, { error: 'Unknown workbench operation' }); return;
            }
            if (url.pathname === '/api/identity' && method === 'GET') { json(res, 200, { id: ensureVisitor(req, res) }); return; }
            // Never provide the normal progress store from this process.
            if (url.pathname.startsWith('/api/')) { json(res, 404, { error: 'Unavailable in workbench' }); return; }
            if (method !== 'GET' && method !== 'HEAD') { json(res, 405, { error: 'Method not allowed' }); return; }
            if (url.pathname === '/') req.url = '/workbench.html';
            if (vite) vite.middlewares(req, res, () => { res.writeHead(404); res.end('Not found'); });
            else { res.writeHead(404); res.end('No frontend in this service test'); }
        } catch (error) {
            if (error instanceof StorageError) json(res, error.status, { error: error.message, ...(error.record ? { record: error.record } : {}) });
            else json(res, 400, { error: error instanceof Error ? error.message : String(error) });
        }
    });
    let multiplayer: Awaited<ReturnType<typeof attachMultiplayer>> | undefined;
    try {
    vite = options.frontend === false ? undefined : await createViteServer({
        define: { __WORKBENCH_LOCAL__: 'true' },
        configFile: false, root: resolve('.'), appType: 'mpa', base: '/',
        server: { middlewareMode: true, hmr: false, ws: { server, path: '/__workbench-vite' }, watch: { ignored: ['**/Workspace/**', '**/.workbench/**', '**/levels/**'] },
            fs: { strict: true, allow: [resolve('.')], deny: ['**/.git/**', '**/.aws/**', '**/.codex/**', '**/.agents/**', '**/.claude/**', '**/Workspace/**', '**/.env*', '**/*.pem', '**/.workbench/**', '**/levels/**'] } },
        optimizeDeps: { entries: ['workbench.html', 'workbench-runner.html'], include: [] },
    });
    multiplayer = await attachMultiplayer(server, join(dataDir, 'sessions'), { drafts: registry, ignoredUpgradePath: '/__workbench-vite', acceptsUpgrade: req => !!origin && req.headers.host === new URL(origin).host && req.headers.origin === origin });
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(options.port ?? 4174, '127.0.0.1', () => { server.off('error', reject); resolve(); }); });
    } catch (error) {
        server.emit('shutdown'); server.closeAllConnections();
        await Promise.all([vite?.close(), multiplayer?.drained(), new Promise<void>(resolve => server.close(() => resolve()))]);
        throw error;
    }
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Workbench did not bind a TCP port');
    origin = `http://127.0.0.1:${address.port}`;
    let closing: Promise<void> | undefined;
    const close = () => closing ??= (async () => {
        server.emit('shutdown'); server.closeAllConnections();
        await Promise.all([new Promise<void>(resolve => server.close(() => resolve())), vite?.close(), multiplayer?.drained()]);
    })();
    return { server, storage, registry, token, origin, dataDir, engineRevision, close };
}
