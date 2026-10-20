import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.ts';
import { ProfileStore } from '../server/profiles.ts';
import { Telemetry } from '../server/telemetry.ts';
import { freshProgress } from '../src/slice/progress.ts';

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
async function setup(failing = false) {
    const directory = await mkdtemp(join(tmpdir(), 'bn-app-telemetry-'));
    cleanups.push(() => rm(directory, { recursive: true, force: true }));
    const telemetry = new Telemetry({ sink: { write: () => true } });
    const profiles = new ProfileStore(directory);
    if (failing) profiles.save = async () => { throw new Error('private storage failure'); };
    const server = await createApp(directory, undefined, { telemetry, profiles, operations: { token: '' } });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    cleanups.push(async () => { server.emit('shutdown'); await new Promise<void>(resolve => server.close(() => resolve())); });
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const response = await fetch(url + '/api/identity');
    const visitor = (await response.json()).id;
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const save = (revision: number, name: string) => fetch(url + '/api/profile', {
        method: 'PUT', headers: { cookie, origin: url, 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, profile: { name, colour: 'purple' } }),
    });
    return { telemetry, url, visitor, cookie, save };
}
it('records profile creation/update only after durable saves, never reads, conflicts or campaign resets', async () => {
    const h = await setup();
    expect((await h.save(0, 'ShadowByte')).status).toBe(200);
    expect((await h.save(0, 'StaleName')).status).toBe(409);
    expect((await h.save(1, 'ZeroDay')).status).toBe(200);
    await fetch(h.url + '/api/profile', { headers: { cookie: h.cookie } });
    const progress = await fetch(h.url + '/api/progress', { method: 'PUT', headers: { cookie: h.cookie, origin: h.url }, body: JSON.stringify({ revision: 0, progress: freshProgress() }) });
    expect(progress.status).toBe(200);
    const events = h.telemetry.snapshot().events.filter(e => e.event.startsWith('character_'));
    expect(events.map(e => [e.event, e.player, e.colour, e.revision])).toEqual([
        ['character_created', 'ShadowByte', 'purple', 1], ['character_updated', 'ZeroDay', 'purple', 2],
    ]);
    expect(events.every(e => e.visitorRef === h.telemetry.ref('visitor', h.visitor))).toBe(true);
    expect(JSON.stringify(h.telemetry.snapshot())).not.toContain(h.visitor);
    expect((await (await fetch(h.url + '/api/profile', { headers: { cookie: h.cookie } })).json()).profile.name).toBe('ZeroDay');
});
it('does not announce a character when its persistent save fails', async () => {
    const h = await setup(true);
    expect((await h.save(0, 'ShadowByte')).status).toBe(503);
    const events = h.telemetry.snapshot().events;
    expect(events.some(e => e.event === 'persistence_failed' && e.operation === 'profile_save')).toBe(true);
    expect(events.some(e => e.event.startsWith('character_'))).toBe(false);
    expect(JSON.stringify(events)).not.toContain('private storage failure');
});
