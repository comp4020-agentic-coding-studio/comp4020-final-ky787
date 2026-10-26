import { expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApp } from '../server/app.ts';

it('serves seekable audio with bounded byte ranges, HEAD and rejected unsatisfiable ranges', async () => {
    const data = await mkdtemp(join(tmpdir(), 'bn-stream-'));
    const app = await createApp(data, resolve('public'));
    try {
        await new Promise<void>(r => app.listen(0, '127.0.0.1', r));
        const origin = `http://127.0.0.1:${(app.address() as {port: number}).port}`;
        const url = `${origin}/audio/grapple-fire.ogg`, bytes = await readFile('public/audio/grapple-fire.ogg');
        const get = await fetch(url); expect(get.status).toBe(200);
        expect(get.headers.get('accept-ranges')).toBe('bytes');
        expect(get.headers.get('content-type')).toBe('audio/ogg');
        expect(Buffer.from(await get.arrayBuffer())).toEqual(bytes);
        const head = await fetch(url, { method: 'HEAD' }); expect(head.status).toBe(200);
        expect(head.headers.get('content-length')).toBe(String(bytes.length)); expect(await head.text()).toBe('');
        for (const [range, start, end] of [['bytes=16-63', 16, 63], ['bytes=-20', bytes.length - 20, bytes.length - 1], ['bytes=100-', 100, bytes.length - 1], ['bytes=50-999999', 50, bytes.length - 1]] as const) {
            const part = await fetch(url, { headers: { range } }); expect(part.status).toBe(206);
            expect(part.headers.get('content-range')).toBe(`bytes ${start}-${end}/${bytes.length}`);
            expect(Buffer.from(await part.arrayBuffer())).toEqual(bytes.subarray(start, end + 1));
        }
        for (const range of ['bytes=999999-', 'bytes=10-5', 'bytes=-0', 'bytes=-', 'bytes=1-2,4-5', 'bytes=NaN-']) {
            const bad = await fetch(url, { headers: { range } }); expect(bad.status).toBe(416);
            expect(bad.headers.get('content-range')).toBe(`bytes */${bytes.length}`); expect(await bad.text()).toBe('');
        }
        const stale = await fetch(url, { headers: { range: 'bytes=3-5', 'if-range': '"old"' } });
        expect(stale.status).toBe(200); expect((await stale.arrayBuffer()).byteLength).toBe(bytes.length);
        expect((await fetch(`${origin}/audio/missing.ogg`)).status).toBe(404);
    } finally { await new Promise<void>(r => app.close(() => r())); await rm(data, { recursive: true, force: true }); }
});
