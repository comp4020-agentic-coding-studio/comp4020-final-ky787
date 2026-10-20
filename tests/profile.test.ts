import { once } from 'node:events';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { ProfileStore } from '../server/profiles.ts';
import { CHARACTER_COLOURS, colourHex, parseCharacterProfile, validateCharacterProfile, type PublicCharacterProfile } from '../src/character/profile.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { directory, identity, cleanups, launch, kill } from './helpers/coop-server.ts';

const purple: PublicCharacterProfile = { name: 'ShadowByte', colour: 'purple' };
const orange: PublicCharacterProfile = { name: 'ZeroDay', colour: 'orange' };
async function app() {
    const dir = await directory(), server = await createApp(dir);
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    cleanups.push(async () => { server.emit('shutdown'); await new Promise<void>(resolve => server.close(() => resolve())); });
    return { dir, url: `http://127.0.0.1:${(server.address() as { port: number }).port}` };
}
async function put(url: string, cookie: string, profile: unknown, revision = 0, extras: Record<string, unknown> = {}) {
    return fetch(`${url}/api/profile`, { method: 'PUT', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, revision, ...extras }) });
}
async function get(url: string, cookie: string) {
    const response = await fetch(`${url}/api/profile`, { headers: { cookie } });
    expect(response.status).toBe(200); return response.json();
}

it('validates a fixed palette and bounded plain names, trims cosmetic spaces, and rejects controls and markup', () => {
    expect(parseCharacterProfile({ name: '  Shadow Byte_7  ', colour: 'purple' })).toEqual({ name: 'Shadow Byte_7', colour: 'purple' });
    expect(parseCharacterProfile({ name: 'AA', colour: 'cyan' })).not.toBeNull();
    expect(parseCharacterProfile({ name: 'abcdefghijklmnop', colour: 'yellow' })).not.toBeNull();
    for (const name of ['', ' ', 'A', 'abcdefghijklmnopq', '<script>alert(1)', '<img src=x>', 'a\nb', '\tShadowByte', 'ab\u0000', 'AB\u007f', 'Ninja🙂']) {
        const result = validateCharacterProfile({ name, colour: 'cyan' });
        expect(result.ok, name).toBe(false);
        if (!result.ok) expect(result.error.length).toBeGreaterThan(8);
    }
    for (const colour of ['#64E6D5', 'url(javascript:alert(1))', 'transparent', 'CYAN', null, 1])
        expect(parseCharacterProfile({ name: 'Ninja', colour })).toBeNull();
    expect(parseCharacterProfile({ ...purple, visitor: 'somebody-else' })).toBeNull();
    expect(new Set(CHARACTER_COLOURS.map(value => colourHex(value.id))).size).toBe(8);
});

it('issues the existing anonymous cookie for a new profile and never returns the identity in public profile data', async () => {
    const { url, dir } = await app();
    const response = await fetch(`${url}/api/profile`);
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('bn_visitor=');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    expect(await response.json()).toEqual({ profile: null, revision: 0 });
    expect((await readdir(dir)).filter(name => name.endsWith('.json'))).toEqual([]);
    expect(await (await put(url, cookie, { ...purple, name: ' ShadowByte ' })).json()).toEqual({ profile: purple, revision: 1 });
    expect(await get(url, cookie)).toEqual({ profile: purple, revision: 1 });
    expect((await fetch(`${url}/api/profile`, { headers: { cookie } })).headers.get('set-cookie')).toBeNull();
});

it('keeps profile revisions and campaign progress separate, including existing visitors and campaign reset', async () => {
    const { url } = await app(), visitor = await identity(url);
    const progress = freshProgress();
    progress.currentRoom = 'relay'; progress.completedRooms = ['pressure', 'switch'];
    const saveProgress = (revision: number, value: unknown) => fetch(`${url}/api/progress`, {
        method: 'PUT', headers: { cookie: visitor.cookie }, body: JSON.stringify({ revision, progress: value }),
    });
    expect((await saveProgress(0, progress)).status).toBe(200);
    expect(await get(url, visitor.cookie)).toEqual({ profile: null, revision: 0 });
    expect((await put(url, visitor.cookie, purple)).status).toBe(200);
    const retained = await (await fetch(`${url}/api/progress`, { headers: { cookie: visitor.cookie } })).json();
    expect(retained).toMatchObject({ id: visitor.id, revision: 1, progress });
    expect((await saveProgress(1, freshProgress())).status).toBe(200);
    expect(await get(url, visitor.cookie)).toEqual({ profile: purple, revision: 1 });
    expect((await put(url, visitor.cookie, orange, 1)).status).toBe(200);
    const reset = await (await fetch(`${url}/api/progress`, { headers: { cookie: visitor.cookie } })).json();
    expect(reset).toMatchObject({ id: visitor.id, revision: 2, progress: freshProgress() });
});

it('allows identical cosmetic profiles while forbidding one visitor from targeting another profile', async () => {
    const { url } = await app(), a = await identity(url), b = await identity(url);
    expect(a.id).not.toBe(b.id);
    expect((await put(url, a.cookie, purple)).status).toBe(200);
    expect((await put(url, b.cookie, purple)).status).toBe(200);
    expect((await put(url, b.cookie, orange, 1, { id: a.id })).status).toBe(400);
    expect((await put(url, b.cookie, { ...orange, visitor: a.id }, 1)).status).toBe(400);
    // Query parameters are not identity selectors; only the sender's cookie owns the save.
    const query = await fetch(`${url}/api/profile?id=${a.id}`, { method: 'PUT', headers: { cookie: b.cookie }, body: JSON.stringify({ profile: orange, revision: 1 }) });
    expect(query.status).toBe(200);
    expect(await get(url, a.cookie)).toEqual({ profile: purple, revision: 1 });
    expect(await get(url, b.cookie)).toEqual({ profile: orange, revision: 2 });
});

it('rejects invalid, oversized, foreign-origin and malformed requests without changing a saved character', async () => {
    const { url } = await app(), visitor = await identity(url);
    expect((await put(url, visitor.cookie, purple)).status).toBe(200);
    for (const profile of [{ name: 'A'.repeat(17), colour: 'cyan' }, { name: '<script>', colour: 'cyan' }, { name: 'Ninja', colour: '#B59BFF' }, null])
        expect((await put(url, visitor.cookie, profile, 1)).status).toBe(400);
    expect((await put(url, visitor.cookie, { name: 'A'.repeat(2000), colour: 'cyan' }, 1)).status).toBe(413);
    for (const body of ['{', 'null', '[]', '{}', JSON.stringify({ profile: orange, revision: -1 })])
        expect((await fetch(`${url}/api/profile`, { method: 'PUT', headers: { cookie: visitor.cookie }, body })).status).toBe(400);
    expect((await fetch(`${url}/api/profile`, { method: 'PUT', headers: { cookie: visitor.cookie, Origin: 'https://attacker.example' }, body: JSON.stringify({ profile: orange, revision: 1 }) })).status).toBe(403);
    expect((await fetch(`${url}/api/profile`, { method: 'DELETE', headers: { cookie: visitor.cookie } })).status).toBe(405);
    expect(await get(url, visitor.cookie)).toEqual({ profile: purple, revision: 1 });
});

it('serializes simultaneous tab writes and preserves a durable winner across actual server process restart', async () => {
    const dir = await directory(); let running = await launch(dir);
    const visitor = await identity(running.url);
    expect((await put(running.url, visitor.cookie, purple)).status).toBe(200);
    const responses = await Promise.all([put(running.url, visitor.cookie, orange, 1), put(running.url, visitor.cookie, { name: 'SecondTab', colour: 'lime' }, 1)]);
    expect(responses.map(value => value.status).sort()).toEqual([200, 409]);
    const winner = await get(running.url, visitor.cookie);
    expect(winner.revision).toBe(2);
    const conflict = await responses.find(value => value.status === 409)!.json();
    expect(conflict.record).toEqual(winner);
    await kill(running.child); running = await launch(dir);
    expect(await get(running.url, visitor.cookie)).toEqual(winner);
    expect((await readdir(join(dir, 'profiles'))).filter(name => name.endsWith('.tmp'))).toEqual([]);
});

it('recovers malformed stored profiles without disturbing progress and preserves the bytes before explicit replacement', async () => {
    const { url, dir } = await app(), visitor = await identity(url);
    await mkdir(join(dir, 'profiles'), { recursive: true });
    const path = join(dir, 'profiles', `${visitor.id}.json`);
    for (const raw of ['broken json', JSON.stringify({ version: 1, profile: { name: '<img src=x>', colour: 'evil' }, revision: 4 }), 'null']) {
        await writeFile(path, raw);
        expect(await get(url, visitor.cookie)).toEqual({ profile: null, revision: 0 });
        expect(await readFile(path, 'utf8')).toBe(raw);
        expect((await put(url, visitor.cookie, purple)).status).toBe(200);
        expect(JSON.parse(await readFile(join(dir, 'profiles', `${visitor.id}.recovery.json`), 'utf8')).raw).toBe(raw);
        expect(await get(url, visitor.cookie)).toEqual({ profile: purple, revision: 1 });
    }
    expect((await fetch(`${url}/api/progress`, { headers: { cookie: visitor.cookie } })).status).toBe(200);
});

it('publishes only committed profile changes and supports independent visitors without a global profile lock', async () => {
    const store = new ProfileStore(await directory());
    const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
    const changes: { visitor: string; profile: PublicCharacterProfile }[] = [];
    const unsubscribe = store.subscribe((visitor, profile) => changes.push({ visitor, profile }));
    expect((await store.save(a, purple, 0)).ok).toBe(true);
    expect((await store.save(a, orange, 0)).ok).toBe(false);
    expect((await store.save(b, purple, 0)).ok).toBe(true);
    expect(changes).toEqual([{ visitor: a, profile: purple }, { visitor: b, profile: purple }]);
    unsubscribe();
    expect((await store.save(a, orange, 1)).ok).toBe(true);
    expect(changes).toHaveLength(2);
    await expect(store.load('../another-file')).rejects.toThrow('Invalid visitor identity');
});
