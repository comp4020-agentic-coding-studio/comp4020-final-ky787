import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Media elements can seek/loop without buffering the whole soundtrack on the server. */
export async function streamAudio(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
    const file = await stat(path);
    if (!file.isFile()) throw Object.assign(new Error('Not a file'), { code: 'EISDIR' });
    const headers = { 'Content-Type': 'audio/ogg', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
    let start = 0, end = file.size - 1, partial = false;
    // A validator we do not recognize requires a full representation. HEAD has GET's full metadata.
    const range = req.method === 'GET' && !req.headers['if-range'] ? req.headers.range : undefined;
    if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (match && (match[1] || match[2])) {
            start = match[1] ? Number(match[1]) : Math.max(0, file.size - Number(match[2]));
            end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
            partial = Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < file.size;
        }
        if (!partial) {
            res.writeHead(416, { ...headers, 'Content-Range': `bytes */${file.size}`, 'Content-Length': 0 }); res.end(); return;
        }
    }
    res.writeHead(partial ? 206 : 200, { ...headers, 'Content-Length': Math.max(0, end - start + 1),
        ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${file.size}` } : {}) });
    if (req.method === 'HEAD' || file.size === 0) { res.end(); return; }
    try { await pipeline(createReadStream(path, { start, end }), res); }
    catch (error) { if (!res.destroyed) throw error; /* Navigation commonly cancels a music download. */ }
}
