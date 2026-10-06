import { once } from 'node:events';
import { WebSocket } from 'ws';
import { expect, inject, it } from 'vitest';
import { websocketUrl } from '../src/coop/protocol.ts';

it('serves identity, campaign API and WebSocket upgrades on the same app origin', async () => {
    const origin = new URL(inject('baseUrl')).origin;
    const identity = await fetch(origin + '/api/identity');
    expect(identity.status).toBe(200);
    const cookie = identity.headers.get('set-cookie')!;
    expect(cookie).toContain('HttpOnly');
    if (origin.startsWith('https:')) expect(cookie).toContain('Secure');
    const { id } = await identity.json();
    const progress = await (await fetch(origin + '/api/progress', { headers: { Cookie: cookie.split(';')[0] } })).json();
    expect(progress.id).toBe(id);
    const ws = new WebSocket(websocketUrl(origin), { headers: { Origin: origin, Cookie: cookie.split(';')[0] }, handshakeTimeout: 5000 });
    try {
        await once(ws, 'open');
        const message = once(ws, 'message');
        ws.send(JSON.stringify({ type: 'ping' }));
        expect(JSON.parse((await message)[0].toString())).toEqual({ type: 'pong' });
    } finally { ws.terminate(); }
});
