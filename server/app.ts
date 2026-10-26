import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshProgress, validProgress, readProgress, type Progress } from '../src/slice/progress.ts';
import { atomicJson } from './atomic-json.ts';
import { streamAudio } from './audio-stream.ts';
import { ensureVisitor, sameOrigin } from './identity.ts';
import { attachMultiplayer } from './multiplayer.ts';
import { PublicDraftRegistry, PublicDraftError, PUBLIC_DRAFT_LIMITS } from './public-drafts.ts';
import { ProfileStore } from './profiles.ts';
import { Telemetry, type TelemetryContext } from './telemetry.ts';
import { createOperations, type OperationsOptions } from './ops.ts';
import { validateCharacterProfile } from '../src/character/profile.ts';
interface RecordData {
    id: string;
    revision: number;
    updatedAt: string | null;
    progress: Progress;
}
/** One Fly machine/volume. Per-visitor serialization + revision checks prevent lost tab writes. */
export async function createApp(dataDir: string, siteDir = resolve('dist'), options: { profiles?: ProfileStore; telemetry?: Telemetry; operations?: OperationsOptions } = {}) {
    await mkdir(dataDir, { recursive: true });
    const profiles = options.profiles ?? new ProfileStore(dataDir);
    const telemetry = options.telemetry ?? new Telemetry();
    const operations = createOperations(telemetry, { token: process.env.OBSERVABILITY_TOKEN, ...options.operations });
    // Observation must never turn an accepted save or gameplay request into a failure.
    const emit = (event: string, context: TelemetryContext = {}, fields: Record<string, unknown> = {}, level: 'info' | 'warn' | 'error' = 'info') => {
        try { telemetry.emit(event, context, fields, level); } catch { /* Observation only. */ }
    };
    const queues = new Map<string, Promise<unknown>>();
    const drafts = new PublicDraftRegistry();
    let uploads = 0;
    async function serial<T>(id: string, work: () => Promise<T>): Promise<T> {
        const previous = queues.get(id) ?? Promise.resolve();
        const next = previous.catch(() => { }).then(work);
        queues.set(id, next);
        try {
            return await next;
        }
        finally {
            if (queues.get(id) === next)
                queues.delete(id);
        }
    }
    async function load(id: string): Promise<RecordData> {
        try {
            const record = JSON.parse(await readFile(join(dataDir, `${id}.json`), 'utf8')) as RecordData;
            const progress = readProgress(record.progress);
            if (record.id !== id || !Number.isInteger(record.revision) || record.revision < 0 || !progress)
                throw new Error('Invalid saved data');
            return { ...record, progress: progress! };
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
                throw e;
            return { id, revision: 0, updatedAt: null, progress: freshProgress() };
        }
    }
    async function save(record: RecordData): Promise<void> {
        const started = performance.now();
        try { await atomicJson(join(dataDir, `${record.id}.json`), record); }
        catch (error) { emit('persistence_failed', { visitor: record.id }, { operation: 'progress_save' }, 'error'); throw error; }
        finally {
            const elapsedMs = performance.now() - started;
            if (elapsedMs >= 100) emit('persistence_slow', { visitor: record.id }, { operation: 'progress_save', elapsedMs }, 'warn');
        }
    }
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg', '.txt': 'text/plain' };
    const server = createServer(async (req, res) => {
        const json = (code: number, value: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
        try {
            const url = new URL(req.url ?? '/', 'http://localhost');
            if (await operations.handle(req, res, url)) return;
            if (url.pathname.startsWith('/api/custom/')) {
                if (!sameOrigin(req)) { json(403, { error: 'Origin mismatch' }); return; }
                const visitor = ensureVisitor(req, res);
                if (url.pathname === '/api/custom/snapshots' && req.method === 'POST') {
                    if (uploads >= 2) { emit('rate_limited', { visitor }, { operation: 'custom_upload' }, 'warn'); json(429, { error: 'Custom uploads are busy. Please retry shortly.' }); return; }
                    uploads++;
                    const deadline = setTimeout(() => req.destroy(), 10_000);
                    try {
                        let size = 0; const chunks: Buffer[] = [];
                        for await (const chunk of req) {
                            size += chunk.length;
                            if (size > PUBLIC_DRAFT_LIMITS.bytes) { json(413, { error: 'Custom multiplayer drafts must be at most 256 KB.' }); return; }
                            chunks.push(Buffer.from(chunk));
                        }
                        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
                        json(201, await drafts.registerFor(visitor, payload?.document));
                    } catch (error) { json(error instanceof PublicDraftError ? error.status : 400, { error: error instanceof Error ? error.message : 'Invalid draft' }); }
                    finally { uploads--; clearTimeout(deadline); }
                    return;
                }
                const match = /^\/api\/custom\/rooms\/([A-Z2-9]{4})\/snapshot$/.exec(url.pathname);
                if (match && req.method === 'GET') {
                    const hash = multiplayer.snapshotFor(match[1], visitor);
                    if (!hash) { json(404, { error: 'Room unavailable or you have not joined. Temporary rooms may expire or be interrupted by a server restart.' }); return; }
                    if (!drafts.allowRead(visitor)) { emit('rate_limited', { visitor }, { operation: 'custom_download' }, 'warn'); json(429, { error: 'Too many snapshot downloads. Wait a minute, then rejoin this room.' }); return; }
                    const document = drafts.document(hash);
                    json(200, { hash, document }); return;
                }
                json(404, { error: 'Custom endpoint not found' }); return;
            }
            if (url.pathname === '/api/identity') {
                if (req.method !== 'GET') { json(405, { error: 'Method not allowed' }); return; }
                if (!sameOrigin(req)) { json(403, { error: 'Origin mismatch' }); return; }
                json(200, { id: ensureVisitor(req, res) });
                return;
            }
            if (url.pathname === '/api/profile') {
                if (req.method !== 'GET' && req.method !== 'PUT') { json(405, { error: 'Method not allowed' }); return; }
                if (!sameOrigin(req)) { json(403, { error: 'Origin mismatch' }); return; }
                const visitor = ensureVisitor(req, res);
                if (req.method === 'GET') { json(200, await profiles.load(visitor)); return; }
                let body = '', size = 0;
                for await (const chunk of req) {
                    size += Buffer.byteLength(chunk);
                    if (size > 1024) { json(413, { error: 'Character profile is too large.' }); return; }
                    body += chunk;
                }
                let payload: Record<string, unknown>;
                try { payload = JSON.parse(body); }
                catch { json(400, { error: 'Invalid JSON' }); return; }
                if (!payload || typeof payload !== 'object' || Array.isArray(payload)
                    || Object.keys(payload).length !== 2 || !Object.hasOwn(payload, 'profile') || !Object.hasOwn(payload, 'revision')
                    || !Number.isSafeInteger(payload.revision) || (payload.revision as number) < 0) {
                    json(400, { error: 'Send a character profile and its current revision.' }); return;
                }
                const validated = validateCharacterProfile(payload.profile);
                if (!validated.ok) { json(400, { error: validated.error }); return; }
                const started = performance.now();
                const saved = await profiles.save(visitor, validated.profile, payload.revision as number).catch(error => {
                    emit('persistence_failed', { visitor, player: validated.profile.name }, { operation: 'profile_save' }, 'error'); throw error;
                });
                const elapsedMs = performance.now() - started;
                if (elapsedMs >= 100) emit('persistence_slow', { visitor, player: validated.profile.name }, { operation: 'profile_save', elapsedMs }, 'warn');
                if (!saved.ok) { json(409, { error: 'Your character changed in another tab. Reload the saved character before editing.', record: saved.record }); return; }
                json(200, saved.record); return;
            }
            if (url.pathname === '/api/progress') {
                if (!['GET', 'PUT'].includes(req.method ?? '')) {
                    json(405, { error: 'Method not allowed' });
                    return;
                }
                // Same-origin writes only, including behind Fly's TLS proxy.
                if (!sameOrigin(req)) {
                    json(403, { error: 'Origin mismatch' });
                    return;
                }
                const id = ensureVisitor(req, res);
                let body = '';
                if (req.method === 'PUT') {
                    for await (const chunk of req) {
                        body += chunk;
                        if (Buffer.byteLength(body) > 24000) {
                            json(413, { error: 'Save too large' });
                            return;
                        }
                    }
                }
                await serial(id, async () => {
                    const record = await load(id);
                    if (req.method === 'GET') {
                        json(200, record);
                        return;
                    }
                    let payload: {
                        revision?: number;
                        progress?: unknown;
                    };
                    try {
                        payload = JSON.parse(body);
                    }
                    catch {
                        json(400, { error: 'Invalid JSON' });
                        return;
                    }
                    if (!payload || !Number.isInteger(payload.revision) || !validProgress(payload.progress)) {
                        json(400, { error: 'Invalid progress' });
                        return;
                    }
                    if (payload.revision !== record.revision) {
                        json(409, { error: 'Progress changed in another tab. Reload to continue.', record });
                        return;
                    }
                    const next = { id, revision: record.revision + 1, updatedAt: new Date().toISOString(), progress: payload.progress };
                    await save(next);
                    json(200, next);
                });
                return;
            }
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                res.writeHead(405);
                res.end();
                return;
            }
            if (url.pathname === '/readme/' || url.pathname === '/readme') {
                const md = await readFile(resolve('README.md'), 'utf8');
                const escaped = md.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(req.method === 'HEAD' ? undefined : `<!doctype html><meta charset="utf-8"><title>Binary Ninja — README</title><pre style="white-space:pre-wrap;max-width:85ch;margin:3rem auto">${escaped}</pre>`);
                return;
            }
            const name = decodeURIComponent(url.pathname);
            const path = resolve(siteDir, `.${name === '/' ? '/index.html' : name}`);
            if (!path.startsWith(resolve(siteDir) + '/')) {
                res.writeHead(403);
                res.end();
                return;
            }
            try {
                if (extname(path) === '.ogg') { await streamAudio(req, res, path); return; }
                const bytes = await readFile(path);
                res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
                res.end(req.method === 'HEAD' ? undefined : bytes);
            }
            catch (e) {
                if (['ENOENT', 'EISDIR'].includes((e as NodeJS.ErrnoException).code ?? '')) {
                    res.writeHead(404);
                    res.end('Not found');
                }
                else
                    throw e;
            }
        }
        catch (error) {
            emit('request_failed', {}, { operation: 'http_request', code: 'UNAVAILABLE' }, 'error');
            if (!res.headersSent)
                json(503, { error: 'Storage unavailable. Your existing save has not been replaced.' });
            else
                res.end();
        }
    });
    const multiplayer = await attachMultiplayer(server, dataDir, { telemetry, drafts, loadProfile: async visitor => (await profiles.load(visitor)).profile, ...(process.env.NODE_ENV === 'test' ? {
        semanticDelayMs: Number(process.env.BN_TEST_SEMANTIC_DELAY_MS) || 0,
    } : {}) });
    const unsubscribeProfiles = profiles.subscribe((visitor, profile, metadata) => {
        emit(metadata.created ? 'character_created' : 'character_updated', { visitor, player: profile.name }, { colour: profile.colour, revision: metadata.revision });
        multiplayer.profileUpdated(visitor, profile);
    });
    server.once('listening', () => emit('server_started', {}, { port: (server.address() as { port: number }).port }));
    let stopped = false;
    const stop = () => {
        if (stopped) return;
        stopped = true;
        emit('server_shutdown');
        unsubscribeProfiles();
        operations.close();
        telemetry.close();
    };
    server.once('shutdown', stop);
    server.once('close', stop);
    return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const server = await createApp(process.env.DATA_DIR ?? '/data');
    server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
    for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { server.emit('shutdown'); server.close(); });
}
