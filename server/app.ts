import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, open, rename, unlink } from 'node:fs/promises';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshProgress, validProgress, type Progress } from '../src/slice/progress.ts';
interface RecordData {
    id: string;
    revision: number;
    updatedAt: string | null;
    progress: Progress;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
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
            if (record.id !== id || !Number.isInteger(record.revision) || record.revision < 0 || !validProgress(record.progress))
                throw new Error('Invalid saved data');
            return record;
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
                throw e;
            return { id, revision: 0, updatedAt: null, progress: freshProgress() };
        }
    }
    async function save(record: RecordData): Promise<void> {
        const path = join(dataDir, `${record.id}.json`), temp = `${path}.${randomUUID()}.tmp`;
        try {
            const handle = await open(temp, 'wx', 0o600);
            try {
                await handle.writeFile(JSON.stringify(record));
                await handle.sync();
            }
            finally {
                await handle.close();
            }
            await rename(temp, path);
            const directory = await open(dataDir, 'r');
            try {
                await directory.sync();
            }
            finally {
                await directory.close();
            }
        }
        finally {
            await unlink(temp).catch(() => { });
        }
    }
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
    return createServer(async (req, res) => {
        const json = (code: number, value: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
        try {
            const url = new URL(req.url ?? '/', 'http://localhost');
            if (url.pathname === '/api/progress') {
                if (!['GET', 'PUT'].includes(req.method ?? '')) {
                    json(405, { error: 'Method not allowed' });
                    return;
                }
                // Same-origin writes only, including behind Fly's TLS proxy.
                if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
                    json(403, { error: 'Origin mismatch' });
                    return;
                }
                const cookie = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('bn_visitor='))?.slice(11);
                const id = cookie && uuid.test(cookie) ? cookie : randomUUID();
                if (id !== cookie)
                    res.setHeader('Set-Cookie', `bn_visitor=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`);
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
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const server = await createApp(process.env.DATA_DIR ?? '/data');
    server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0', () => console.log(`Binary Ninja listening on ${(server.address() as {
        port: number;
    }).port}`));
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
