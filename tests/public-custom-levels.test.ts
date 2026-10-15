import { expect, it } from 'vitest';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { PublicDraftRegistry, PUBLIC_DRAFT_LIMITS as limits } from '../server/public-drafts.ts';
import { attachMultiplayer } from '../server/multiplayer.ts';
import { createApp } from '../server/app.ts';
import { newDraft, draftHash, serializeDraft } from '../src/workbench/model.ts';
import { createEntity } from '../src/workbench/editor-operations.ts';
import { directory, identity, connect, cleanups, avatar } from './helpers/coop-server.ts';

async function app() {
    const dir = await directory(), server = await createApp(dir);
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    cleanups.push(async () => { server.emit('shutdown'); await new Promise<void>(resolve => server.close(() => resolve())); });
    return { dir, server, url };
}
it('public uploads are validated and owner-granted, snapshots require membership, replay is host-only and no custom files persist', async () => {
    const { dir, url } = await app(), host = await identity(url), guest = await identity(url), stranger = await identity(url);
    const document = newDraft('public'); createEntity(document, 'breakpoint', { x: 700, y: 680 });
    document.geometry.objects.push({ type: 'device', id: 'commit', kind: 'terminal', checkpoint: 'relay', x: 700, y: 680 });
    const upload = await fetch(url + '/api/custom/snapshots', { method: 'POST', headers: { Cookie: host.cookie, Origin: url }, body: JSON.stringify({ document }) });
    expect(upload.status).toBe(201); const { hash } = await upload.json(); expect(hash).toBe(await draftHash(document));
    const unknown = await connect<'workbench'>(url, stranger.cookie); unknown.send({ type: 'create-draft', hash }); expect((await unknown.wait('error')).code).toBe('DRAFT_UNAVAILABLE');
    expect((await fetch(url + '/api/workbench/snapshots/' + hash, { headers: { Cookie: stranger.cookie } })).status).toBe(404);
    const a = await connect<'workbench'>(url, host.cookie); a.send({ type: 'create-draft', hash }); const first = (await a.wait('snapshot')).room;
    const path = `${url}/api/custom/rooms/${first.code}/snapshot`;
    expect((await fetch(path, { headers: { Cookie: stranger.cookie } })).status).toBe(404);
    expect((await fetch(path, { headers: { Cookie: host.cookie } })).status).toBe(200);
    const b = await connect<'workbench'>(url, guest.cookie); b.send({ type: 'join', code: first.code }); expect((await b.wait('snapshot')).slot).toBe(2);
    expect((await (await fetch(path, { headers: { Cookie: guest.cookie } })).json()).document).toEqual(document);
    unknown.send({ type: 'join', code: first.code }); expect((await unknown.wait('error')).code).toBe('ROOM_FULL');
    b.send({ type: 'restart-draft', hash, seq: 1 }); expect((await b.wait('action-result')).accepted).toBe(false);
    a.send({ type: 'control', control: 'draft:commit', seq: 1 }); const checkpoint = await a.wait('action-result'); expect(checkpoint.room.checkpoint).toBe('reunion');
    a.send({ type: 'select-level', level: 'race-condition', seq: 2 }); expect((await a.wait('action-result')).accepted).toBe(false);
    a.send({ type: 'restart-draft', hash, seq: 3 }); const replay = await a.wait('action-result'); expect(replay.accepted).toBe(true); expect(replay.room.levelInstance).toBe(2); expect(replay.room.checkpoint).toBe('entry'); expect(replay.room.party).toBeNull();
    a.send({ type: 'control', control: 'draft:commit', seq: 4, levelInstance: 1 }); expect((await a.wait('action-result')).accepted).toBe(false);
    a.sendRaw({ type: 'avatar', avatar, seq: 999, levelInstance: 1 });
    const changed = newDraft('replacement'); const registration = await fetch(url + '/api/custom/snapshots', { method: 'POST', headers: { Cookie: host.cookie }, body: JSON.stringify({ document: changed }) });
    a.send({ type: 'restart-draft', hash: (await registration.json()).hash, seq: 5 }); expect((await a.wait('action-result')).accepted).toBe(false);
    expect(await readdir(join(dir, 'rooms'))).toEqual([]); expect((await readdir(dir)).filter(f => f.endsWith('.json'))).toEqual([]);
    const same = await connect<'workbench'>(url, host.cookie); same.send({ type: 'join', code: first.code }); const replaced = await same.wait('snapshot'); expect(replaced.slot).toBe(1); expect(replaced.room.assigned).toEqual([true, true]);
    // The official campaign remains available and persists through its existing path.
    unknown.send({ type: 'create-party' }); const official = (await unknown.wait('snapshot')).room; expect(official.draft).toBeUndefined(); expect(await readdir(join(dir, 'rooms'))).toEqual([official.code + '.json']);
});
it('rejects executable, oversized and incompatible documents and foreign origins without creating files', async () => {
    const { url, dir } = await app(), visitor = await identity(url);
    async function post(body: unknown, origin = url) { return fetch(url + '/api/custom/snapshots', { method: 'POST', headers: { Cookie: visitor.cookie, Origin: origin }, body: JSON.stringify(body) }); }
    expect((await post({ document: newDraft() }, 'https://attacker.example')).status).toBe(403);
    expect((await post({ document: 'x'.repeat(limits.bytes) })).status).toBe(413);
    expect((await post({ document: { ...newDraft(), controller: { kind: 'builtin', id: '../../attack.ts', version: 1 } } })).status).toBe(400);
    expect((await post({ document: { ...newDraft(), controller: { kind: 'declarative', outputs: { attack: { op: 'eval', code: 'process.exit()' } } } } })).status).toBe(400);
    const one = newDraft(); Object.assign(one.geometry.objects.find(o => o.type === 'exit')!, { arrivals: 1 });
    const response = await post({ document: one }); expect(response.status).toBe(400); expect((await response.json()).error).toContain('Physical arrivals: 2');
    expect((await fetch(url + '/api/workbench/drafts', { method: 'PUT', body: '{}' })).status).toBeGreaterThanOrEqual(400);
    expect(await readdir(join(dir, 'rooms'))).toEqual([]);
});
it('bounds registration attempts, per-visitor snapshots, room count and releases expired snapshots', async () => {
    let now = 0; const r = new PublicDraftRegistry(() => now);
    for (let i = 0; i < 3; i++) { const { hash } = await r.registerFor('host', newDraft(`v${i}`)); r.retain(hash, 'host', `AB${i}D`); }
    await expect(r.registerFor('host', newDraft('four'))).rejects.toThrow(/wait a minute/);
    now += limits.windowMs; await expect(r.registerFor('host', newDraft('four'))).rejects.toThrow(/session limit/);
    for (let i = 3; i < limits.rooms; i++) { const { hash } = await r.registerFor(`host${i}`, newDraft(`v${i}`)); r.retain(hash, `host${i}`, `AB${i}D`); }
    await expect(r.registerFor('extra', newDraft('extra'))).rejects.toThrow(/rooms are in use/);
    for (let i = 0; i < limits.rooms; i++) r.release(`AB${i}D`);
    expect(r.stats()).toMatchObject({ rooms: 0, snapshots: 0, bytes: 0 });
    const staged = await r.registerFor('staged', newDraft()); now += limits.stagingMs; r.sweep(); expect(r.get(staged.hash)).toBeUndefined();
});
it('expires active and abandoned public rooms, closes sockets and releases registry state', async () => {
    const dir = await directory(), drafts = new PublicDraftRegistry(), server = createServer();
    const mp = await attachMultiplayer(server, dir, { drafts, sweepMs: 10 }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    cleanups.push(async () => { mp.shutdown(); await mp.drained(); await new Promise<void>(r => server.close(() => r())); });
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`, id = '11111111-1111-4111-8111-111111111111';
    for (const abandoned of [false, true]) {
        const { hash } = await drafts.registerFor(id, newDraft()), a = await connect(url, `bn_visitor=${id}`);
        a.send({ type: 'create-draft', hash }); const { room } = await a.wait('snapshot'), internal = mp.rooms.get(room.code)!;
        if (abandoned) { await a.close(); await mp.drained(); internal.idleSince = Date.now() - limits.abandonedMs - 1; }
        else internal.record.createdAt = new Date(Date.now() - limits.lifetimeMs - 1).toISOString();
        await new Promise(r => setTimeout(r, 35)); expect(mp.rooms.has(room.code)).toBe(false); expect(drafts.stats().snapshots).toBe(0);
        if (!abandoned) expect((await a.wait('error')).code).toBe('ROOM_EXPIRED');
    }
    expect(await readdir(join(dir, 'rooms'))).toEqual([]);
});
it('caps canonical snapshot memory and member download work, including concurrent registration', async () => {
    let now = 0; const r = new PublicDraftRegistry(() => now), d = newDraft('large');
    while (Buffer.byteLength(serializeDraft(d)) < 235_000) d.presentation.wires.push({ id: `wire${d.presentation.wires.length}`, points: Array.from({ length: 64 }, (_, i) => ({ x: i * 10, y: 100 })) });
    const concurrent = await Promise.allSettled([r.registerFor('first', d), r.registerFor('second', d)]);
    expect(concurrent.map(v => v.status).sort()).toEqual(['fulfilled', 'rejected']);
    let bounded = false;
    for (let i = 0; i < 12; i++) {
        try { await r.registerFor(`visitor${i}`, { ...d, id: `large${i}` }); }
        catch (error) { expect(String(error)).toContain('memory is full'); bounded = true; break; }
    }
    expect(bounded).toBe(true); expect(r.stats().bytes).toBeLessThanOrEqual(limits.memory);
    for (let i = 0; i < limits.visitorReads; i++) expect(r.allowRead('reader')).toBe(true);
    expect(r.allowRead('reader')).toBe(false);
    for (let i = limits.visitorReads; i < limits.globalReads; i++) expect(r.allowRead(`reader${i}`)).toBe(true);
    expect(r.allowRead('fresh-reader')).toBe(false);
    now += limits.stagingMs; r.sweep(); expect(r.stats().bytes).toBe(0); expect(r.allowRead('reader')).toBe(true);
});
it('full custom room capacity still admits official parties and classifies normalized custom joins', async () => {
    const dir = await directory(), drafts = new PublicDraftRegistry(), server = createServer();
    const mp = await attachMultiplayer(server, dir, { drafts }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
    cleanups.push(async () => { mp.shutdown(); await mp.drained(); await new Promise<void>(r => server.close(() => r())); });
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    for (let i = 0; i < limits.rooms; i++) {
        const id = `11111111-1111-4111-8111-11111111111${i}`, { hash } = await drafts.registerFor(id, newDraft(`room${i}`));
        const host = await connect(url, `bn_visitor=${id}`); host.send({ type: 'create-draft', hash }); await host.wait('snapshot');
    }
    const guest = await connect(url, 'bn_visitor=22222222-2222-4222-8222-222222222222'), first = [...mp.rooms.values()][0];
    guest.send({ type: 'join', code: first.record.code.toLowerCase() }); await guest.wait('snapshot'); expect(first.peers[1]?.custom).toBe(true);
    const official = await connect(url, 'bn_visitor=33333333-3333-4333-8333-333333333333'); official.send({ type: 'create-party' });
    const { room } = await official.wait('snapshot'); expect(room.party).not.toBeNull(); expect(room.draft).toBeUndefined();
    expect(drafts.stats().rooms).toBe(limits.rooms); expect(await readdir(join(dir, 'rooms'))).toEqual([room.code + '.json']);
});
