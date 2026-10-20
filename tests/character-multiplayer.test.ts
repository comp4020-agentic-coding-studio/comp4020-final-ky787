import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { DEFAULT_CHARACTER_PROFILE, type PublicCharacterProfile } from '../src/character/profile.ts';
import { COOP_CAMPAIGN } from '../src/coop/campaign.ts';
import { parseClientMessage, type CoopLevelId } from '../src/coop/protocol.ts';
import { attachMultiplayer } from '../server/multiplayer.ts';
import { newDraft } from '../src/workbench/model.ts';
import { DraftSessionRegistry } from '../scripts/level-tools/session-registry.ts';
import { avatar, cleanups, connect, directory, identity, kill, launch } from './helpers/coop-server.ts';

const purple: PublicCharacterProfile = { name: 'ShadowByte', colour: 'purple' };
const orange: PublicCharacterProfile = { name: 'ZeroDay', colour: 'orange' };
async function save(url: string, cookie: string, profile: PublicCharacterProfile) {
    const record = await (await fetch(url + '/api/profile', { headers: { Cookie: cookie } })).json();
    const response = await fetch(url + '/api/profile', { method: 'PUT', headers: { Cookie: cookie, Origin: url, 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, revision: record.revision }) });
    expect(response.status).toBe(200);
    return response.json();
}

it('server-owned profiles occupy stable slots through all campaign rooms, live updates, reconnect and restart', async () => {
    const dir = await directory(), app = await launch(dir), host = await identity(app.url), guest = await identity(app.url);
    await save(app.url, host.cookie, purple); await save(app.url, guest.cookie, orange);
    const a = await connect<CoopLevelId>(app.url, host.cookie), b = await connect<CoopLevelId>(app.url, guest.cookie);
    a.send({ type: 'create-party' }); const first = (await a.wait('snapshot')).room;
    expect(first.profiles).toEqual([purple, null]);
    b.send({ type: 'join', code: first.code }); const joined = await b.wait('snapshot');
    expect(joined.slot).toBe(2); expect(joined.room.profiles).toEqual([purple, orange]);
    expect((await a.wait('room', m => m.room.connected[1])).room.profiles).toEqual([purple, orange]);
    expect(JSON.stringify(joined)).not.toContain(host.id); expect(JSON.stringify(joined)).not.toContain(guest.id);
    let sequence = 0, last = joined.room;
    for (const level of COOP_CAMPAIGN) {
        a.send({ type: 'select-level', level: level.id, seq: ++sequence });
        const selected = await a.wait('action-result', m => m.seq === sequence);
        expect(selected.accepted).toBe(true); expect(selected.room.profiles).toEqual([purple, orange]); last = selected.room;
    }
    b.send({ type: 'select-level', level: 'handshake', seq: 1 }); expect((await b.wait('action-result')).accepted).toBe(false);
    const renamed: PublicCharacterProfile = { name: 'ByteRunner', colour: 'lime' };
    await save(app.url, host.cookie, renamed);
    const changed = (await b.wait('room', m => m.room.profiles?.[0]?.name === renamed.name)).room;
    const { profiles: _beforeProfiles, revision: _beforeRevision, ...before } = last;
    const { profiles: _afterProfiles, revision: _afterRevision, ...after } = changed;
    expect(after).toEqual(before); expect(changed.profiles).toEqual([renamed, orange]);
    a.send({ type: 'avatar', seq: 1, avatar }); const streamed = await b.wait('avatar');
    expect(streamed).not.toHaveProperty('profiles'); expect(streamed).not.toHaveProperty('profile');
    // A duplicate display name and colour never merge the underlying visitors or roles.
    await save(app.url, guest.cookie, renamed);
    expect((await a.wait('room', m => m.room.profiles?.[1]?.name === renamed.name)).room.profiles).toEqual([renamed, renamed]);
    await b.close(); const rejoined = await connect<CoopLevelId>(app.url, guest.cookie);
    rejoined.send({ type: 'join', code: first.code }); const restored = await rejoined.wait('snapshot');
    expect(restored.slot).toBe(2); expect(restored.room.profiles).toEqual([renamed, renamed]); expect(restored.room.levelInstance).toBe(last.levelInstance);
    const roomFile = JSON.parse(await readFile(join(dir, 'rooms', first.code + '.json'), 'utf8'));
    expect(roomFile).not.toHaveProperty('profiles'); expect(roomFile.visitors).toEqual([host.id, guest.id]);
    await kill(app.child); const restarted = await launch(dir);
    const reconnect = await connect<CoopLevelId>(restarted.url, guest.cookie); reconnect.send({ type: 'join', code: first.code });
    const loaded = await reconnect.wait('snapshot'); expect(loaded.slot).toBe(2);
    expect(loaded.room.profiles).toEqual([renamed, renamed]); expect(loaded.room.level).toBe(last.level); expect(loaded.room.party).toEqual(last.party);
});

it('internal labs use each member profile and absent or malformed stored profiles safely fall back', async () => {
    const dir = await directory(), app = await launch(dir), host = await identity(app.url), guest = await identity(app.url);
    await save(app.url, host.cookie, purple);
    for (const level of ['pairing-bay', 'relay-lab', 'lift-lab', 'crumble-lab', 'boost-lab', 'firewall-lab'] as const) {
        const a = await connect<CoopLevelId>(app.url, host.cookie), b = await connect<CoopLevelId>(app.url, guest.cookie);
        a.send({ type: 'create', level }); const first = (await a.wait('snapshot')).room;
        b.send({ type: 'join', code: first.code }); const room = (await b.wait('snapshot')).room;
        expect(room.profiles).toEqual([purple, DEFAULT_CHARACTER_PROFILE]);
        await a.close(); await b.close();
    }
    await writeFile(join(dir, 'profiles', guest.id + '.json'), '{broken');
    const a = await connect(app.url, host.cookie), b = await connect(app.url, guest.cookie);
    a.send({ type: 'create', level: 'pairing-bay' }); const first = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: first.code }); expect((await b.wait('snapshot')).room.profiles).toEqual([purple, DEFAULT_CHARACTER_PROFILE]);
    for (const value of [
        { type: 'profile-update', slot: 1, profile: orange },
        { type: 'avatar', seq: 1, avatar, profile: orange },
        { type: 'join', code: first.code, profile: orange },
    ]) expect(parseClientMessage(JSON.stringify(value))).toBeNull();
});

it('public custom rooms share participant appearance and live edits without granting guest restart authority', async () => {
    const dir = await directory(), app = await launch(dir), host = await identity(app.url), guest = await identity(app.url);
    await save(app.url, host.cookie, purple); await save(app.url, guest.cookie, orange);
    const document = newDraft('character-network');
    const upload = await fetch(app.url + '/api/custom/snapshots', { method: 'POST', headers: { Cookie: host.cookie, Origin: app.url }, body: JSON.stringify({ document }) });
    expect(upload.status).toBe(201); const { hash } = await upload.json();
    const a = await connect<'workbench'>(app.url, host.cookie), b = await connect<'workbench'>(app.url, guest.cookie);
    a.send({ type: 'create-draft', hash }); const first = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: first.code }); const second = (await b.wait('snapshot')).room;
    expect(second.profiles).toEqual([purple, orange]);
    const snapshot = await (await fetch(`${app.url}/api/custom/rooms/${first.code}/snapshot`, { headers: { Cookie: guest.cookie } })).json();
    expect(snapshot.document).toEqual(document); expect(JSON.stringify(snapshot.document)).not.toContain('ShadowByte');
    b.send({ type: 'restart-draft', hash, seq: 1 }); expect((await b.wait('action-result')).accepted).toBe(false);
    await save(app.url, guest.cookie, { name: 'GuestChanged', colour: 'red' });
    const changed = (await a.wait('room', m => m.room.profiles?.[1]?.colour === 'red')).room;
    expect(changed.profiles?.[0]).toEqual(purple); expect(changed.levelInstance).toBe(first.levelInstance);
    a.send({ type: 'restart-draft', hash, seq: 1 }); const restarted = await a.wait('action-result');
    expect(restarted.accepted).toBe(true); expect(restarted.room.profiles).toEqual(changed.profiles);
});

it('local developer drafts load visitor profiles and a profile service outage never blocks joining', async () => {
    const dir = await directory(), registry = new DraftSessionRegistry(), frozen = await registry.register(newDraft('profile-lab'));
    const host = '11111111-1111-4111-8111-111111111111', guest = '22222222-2222-4222-8222-222222222222';
    let hostProfile = purple;
    const server = createServer(), multiplayer = await attachMultiplayer(server, dir, { drafts: registry, loadProfile: async visitor => {
        if (visitor === host) return hostProfile;
        throw new Error('Temporary profile service failure');
    } });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    cleanups.push(async () => { multiplayer.shutdown(); await multiplayer.drained(); await new Promise<void>(resolve => server.close(() => resolve())); });
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const a = await connect<'workbench'>(url, `bn_visitor=${host}`), b = await connect<'workbench'>(url, `bn_visitor=${guest}`);
    a.send({ type: 'create-draft', hash: frozen.hash }); const first = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: first.code }); expect((await b.wait('snapshot')).room.profiles).toEqual([purple, DEFAULT_CHARACTER_PROFILE]);
    hostProfile = { name: 'FreshProfile', colour: 'yellow' };
    await multiplayer.profileUpdated(host, purple); // Even a delayed notification reads the latest trusted save.
    expect((await b.wait('room', m => m.room.profiles?.[0]?.colour === 'yellow')).room.profiles).toEqual([hostProfile, DEFAULT_CHARACTER_PROFILE]);
    await multiplayer.profileUpdated(guest, orange);
    expect((await a.wait('room', m => m.room.profiles?.[1]?.name === orange.name)).room.profiles).toEqual([hostProfile, orange]);
    const before = multiplayer.rooms.get(first.code)!.revision;
    await multiplayer.profileUpdated('33333333-3333-4333-8333-333333333333', orange);
    expect(multiplayer.rooms.get(first.code)!.revision).toBe(before);
});
