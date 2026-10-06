import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshProgress, validProgress, readProgress, type Progress } from '../src/slice/progress.ts';
import { atomicJson } from './atomic-json.ts';
import { ensureVisitor, sameOrigin } from './identity.ts';
import { attachMultiplayer } from './multiplayer.ts';
interface RecordData {
    id: string;
    revision: number;
    updatedAt: string | null;
    progress: Progress;
}
/** One Fly machine/volume. Per-visitor serialization + revision checks prevent lost tab writes. */
export async function createApp(dataDir: string, siteDir = resolve('dist')) {
    await mkdir(dataDir, { recursive: true });
    const queues = new Map<string, Promise<unknown>>();
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
        await atomicJson(join(dataDir, `${record.id}.json`), record);
    }
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ogg': 'audio/ogg', '.txt': 'text/plain' };
    const server = createServer(async (req, res) => {
        const json = (code: number, value: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
        try {
            const url = new URL(req.url ?? '/', 'http://localhost');
            if (url.pathname === '/api/identity') {
                if (req.method !== 'GET') { json(405, { error: 'Method not allowed' }); return; }
                if (!sameOrigin(req)) { json(403, { error: 'Origin mismatch' }); return; }
                json(200, { id: ensureVisitor(req, res) });
                return;
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
            console.error('Request failed:', (error as Error).message);
            if (!res.headersSent)
                json(503, { error: 'Storage unavailable. Your existing save has not been replaced.' });
            else
                res.end();
        }
    });
    await attachMultiplayer(server, dataDir, process.env.NODE_ENV === 'test' ? {
        semanticDelayMs: Number(process.env.BN_TEST_SEMANTIC_DELAY_MS) || 0,
    } : {});
    return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const server = await createApp(process.env.DATA_DIR ?? '/data');
    server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0', () => console.log(`Binary Ninja listening on ${(server.address() as {
        port: number;
    }).port}`));
    process.on('SIGTERM', () => { server.emit('shutdown'); server.close(() => process.exit(0)); });
}
