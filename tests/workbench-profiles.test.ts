import { once } from 'node:events';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { ProfileStore } from '../server/profiles.ts';
import { startWorkbench } from '../scripts/level-tools/service.ts';
import { newDraft } from '../src/workbench/model.ts';
import { cleanups, connect, directory, identity } from './helpers/coop-server.ts';

it.each(['localhost', '127.0.0.1'])('the %s development game and local builder share anonymous profiles and live room updates', async browserHost => {
    const root = await directory(), data = join(root, 'game'), profiles = new ProfileStore(data);
    const app = await createApp(data, join(root, 'site'), { profiles });
    app.listen(0, '127.0.0.1'); await once(app, 'listening');
    const game = `http://${browserHost}:${(app.address() as { port: number }).port}`;
    cleanups.push(async () => { app.emit('shutdown'); app.closeAllConnections(); await new Promise<void>(resolve => app.close(() => resolve())); });
    const workbench = await startWorkbench({ port: 0, draftRoot: join(root, 'drafts'), dataDir: join(root, 'workbench'), frontend: false,
        browserHost, profiles, gameUrl: () => game + '/' });
    cleanups.push(() => workbench.close());
    expect(new URL(workbench.origin).hostname).toBe(new URL(game).hostname);
    const host = await identity(game), guest = await identity(game);
    const first = { name: 'WorkbenchHost', colour: 'purple' }, second = { name: 'WorkbenchGuest', colour: 'orange' };
    async function save(cookie: string, profile: object, revision = 0) {
        const response = await fetch(game + '/api/profile', { method: 'PUT', headers: { Cookie: cookie, Origin: game, 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, revision }) });
        expect(response.status).toBe(200);
    }
    await save(host.cookie, first); await save(guest.cookie, second);
    const lookup = await fetch(workbench.origin + '/api/profile', { headers: { Cookie: host.cookie } });
    expect(lookup.headers.get('set-cookie')).toBeNull(); expect(await lookup.json()).toEqual({ profile: first, revision: 1 });
    expect((await (await fetch(workbench.origin + '/api/identity', { headers: { Cookie: host.cookie } })).json()).id).toBe(host.id);
    expect((await fetch(workbench.origin + '/api/profile', { method: 'PUT', headers: { Cookie: host.cookie, Origin: workbench.origin }, body: '{}' })).status).toBe(404);
    expect((await fetch(workbench.origin + '/api/profile', { headers: { Cookie: host.cookie, Origin: game } })).status).toBe(403);
    expect((await fetch(workbench.origin + '/api/progress', { headers: { Cookie: host.cookie } })).status).toBe(404);
    const document = newDraft('shared-profile-test'), frozen = await workbench.registry.register(document);
    const a = await connect<'workbench'>(workbench.origin, host.cookie), b = await connect<'workbench'>(workbench.origin, guest.cookie);
    a.send({ type: 'create-draft', hash: frozen.hash }); const firstRoom = (await a.wait('snapshot')).room;
    b.send({ type: 'join', code: firstRoom.code }); const joined = await b.wait('snapshot');
    expect(joined.slot).toBe(2); expect(joined.room.profiles).toEqual([first, second]);
    const changed = { name: 'ChangedInGame', colour: 'pink' };
    await save(host.cookie, changed, 1);
    const update = (await b.wait('room', message => message.room.profiles?.[0]?.name === changed.name)).room;
    expect(update.profiles).toEqual([changed, second]); expect(update.levelInstance).toBe(firstRoom.levelInstance);
    const { profiles: _previousProfiles, revision: _previousRevision, ...previousState } = joined.room;
    const { profiles: _changedProfiles, revision: _changedRevision, ...changedState } = update;
    expect(changedState).toEqual(previousState);
    expect((await (await fetch(workbench.origin + '/api/profile', { headers: { Cookie: host.cookie } })).json()).profile).toEqual(changed);
    b.send({ type: 'restart-draft', hash: frozen.hash, seq: 1 }); expect((await b.wait('action-result')).accepted).toBe(false);
    a.send({ type: 'restart-draft', hash: frozen.hash, seq: 1 }); const restarted = await a.wait('action-result');
    expect(restarted.accepted).toBe(true); expect(restarted.room.profiles).toEqual([changed, second]);
    expect(workbench.registry.document(frozen.hash)).toEqual(document);
});
