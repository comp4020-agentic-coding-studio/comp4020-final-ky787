import { expect, it, vi } from 'vitest';
import { newRecord, freshCubes, sharedRoom } from '../server/coop-state.ts';
import { assignCube, interactCube } from '../server/cube-state.ts';
import { SharedCubeAuthority } from '../src/coop/cube.ts';
import { LocalPrediction } from '../src/coop/prediction.ts';
import { RemoteAvatar, RemoteCube } from '../src/coop/remote.ts';
import { cubeAvailable, type CoopLevelId, type CubeAction, type CubeId, type CubeTransform } from '../src/coop/protocol.ts';
import { crossfeedVault } from '../src/coop/crossfeed-vault.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { createPlayer, emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { directory, launch, kill, identity, connect } from './helpers/coop-server.ts';

// Isolate the reported interaction at each authored payload, without operating
// unrelated controls. World positioning here is a unit fixture, not a browser route.
it.each([1, 2] as const)('P%s offers, predicts and retains accessible A/B pickup before any progression', slot => {
    for (const id of ['cubeA', 'cubeB'] as const) {
        const r = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', 'crossfeed-vault'), cubes = freshCubes(r.level);
        for (const c of Object.values(cubes)) assignCube(c, 1);
        const replicas = { cubeA: new RemoteCube(), cubeB: new RemoteCube() }, prediction = new LocalPrediction();
        let seq = 0;
        const client = { slot, connected: true, room: sharedRoom(r, [true, true], [null, null], cubes), prediction,
            ownsCube: false, remote: new RemoteAvatar(), remoteCube: new RemoteCube(), cubeReplica: (id: CubeId) => replicas[id as 'cubeA' | 'cubeB'],
            cubeOccupancy: vi.fn(), cubeAction: vi.fn((kind: CubeAction | 'cube-drop', _t?: CubeTransform, id: CubeId = 'cube') =>
                prediction.begin(kind, ++seq, cubes[id]!.epoch, 1, performance.now(), id)) };
        const authorities = { cubeA: new SharedCubeAuthority(client, 'cubeA'), cubeB: new SharedCubeAuthority(client, 'cubeB') };
        const w = new PuzzleWorld(crossfeedVault(slot), { checkpoint: 'entry', switchB: false, cubeOnPlate: false, cubeOnPlateB: false }, undefined,
            { cubes: authorities, get frame() { return { source: 'mock-multiplayer' as const, outputs: client.room.levelState.outputs }; },
                inputs: { plateA: false, plateB: false, plateC: false, cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: false, switchC: false },
                checkpoint: 'entry', sample() {}, interact() {}, hint() { return ''; } });
        const sync = () => {
            client.room = sharedRoom(r, [true, true], [null, null], cubes);
            for (const name of ['cubeA', 'cubeB'] as const) replicas[name].reset(cubes[name]!, performance.now());
            w.syncAuthority();
        };
        sync(); w.player = createPlayer(w.cubes[id]!.x - 40, w.room.spawn.y);
        expect(w.cubeReachable(id)).toBe(true);
        expect(cubeAvailable(client.room, id), `${id}: client availability`).toBe(true);
        expect(authorities[id].hint(w)).toBe('E · carry cube');
        expect(authorities[id].interact(w)).toBe(true);
        expect(prediction.cube?.cubeId).toBe(id); expect(w.cubes[id]!.carried).toBe(true);
        expect(interactCube(cubes[id]!, slot, { type: 'cube-pickup', cubeId: id, seq, epoch: cubes[id]!.epoch })).toBe(true);
        client.room = sharedRoom(r, [true, true], [null, null], cubes);
        prediction.resolve(seq, 1, true, client.room, slot, performance.now()); sync();
        for (let i = 0; i < 180; i++) w.step(FIXED_DT, emptyInput());
        expect(w.cubes[id]!.carried).toBe(true); expect(cubes[id]!.holder).toBe(slot);
        expect(client.cubeAction.mock.calls.some(c => c[0] === 'cube-reset')).toBe(false);
        expect(w.cubes[id]!.x).toBe(w.player.x);
        expect(cubes[id === 'cubeA' ? 'cubeB' : 'cubeA']!.holder).toBeNull();
    }
});

it('party selection, replay, reset, reconnect and restart accept either slot for both fresh payloads', async () => {
    const dir = await directory(); let app = await launch(dir);
    const ids = [await identity(app.url), await identity(app.url)];
    let peers = [await connect<CoopLevelId>(app.url, ids[0].cookie), await connect<CoopLevelId>(app.url, ids[1].cookie)];
    peers[0].send({ type: 'create-party' }); const initial = (await peers[0].wait('snapshot')).room;
    peers[1].send({ type: 'join', code: initial.code }); await peers[1].wait('snapshot');
    let sequences = [0, 0];
    const act = async (slot: number, msg: Record<string, unknown>) => {
        const seq = ++sequences[slot - 1], p = peers[slot - 1]; p.send({ ...msg, seq });
        return p.wait('action-result', m => m.seq === seq);
    };
    let r = (await act(1, { type: 'select-level', level: 'crossfeed-vault' })).room;
    const exercise = async () => {
        for (const slot of [1, 2]) for (const cubeId of ['cubeA', 'cubeB'] as const) {
            const otherId = cubeId === 'cubeA' ? 'cubeB' : 'cubeA', before = r.cubes[otherId];
            let result = await act(slot, { type: 'cube-pickup', cubeId, epoch: r.cubes[cubeId]!.epoch });
            expect(result.accepted, `instance ${r.levelInstance}, P${slot}, ${cubeId}`).toBe(true); r = result.room;
            expect(r.cubes[cubeId]!.holder).toBe(slot); expect(r.cubes[otherId]).toEqual(before);
            expect((await act(slot, { type: 'cube-pickup', cubeId: otherId, epoch: r.cubes[otherId]!.epoch })).accepted).toBe(false);
            expect((await act(3 - slot, { type: 'cube-pickup', cubeId, epoch: r.cubes[cubeId]!.epoch })).accepted).toBe(false);
            result = await act(slot, { type: 'cube-reset', cubeId, epoch: r.cubes[cubeId]!.epoch, cause: 'firewall' });
            expect(result.accepted).toBe(true); r = result.room;
            expect(r.cubePlacements[cubeId]).toBe('spawn'); expect(r.cubes[otherId]).toEqual(before);
            result = await act(slot, { type: 'cube-pull-start', cubeId, epoch: r.cubes[cubeId]!.epoch });
            expect(result.accepted).toBe(true); r = result.room;
            result = await act(slot, { type: 'cube-pickup', cubeId, epoch: r.cubes[cubeId]!.epoch });
            expect(result.accepted).toBe(true); r = result.room;
            result = await act(slot, { type: 'cube-drop', cubeId, epoch: r.cubes[cubeId]!.epoch,
                transform: { x: cubeId === 'cubeA' ? 2760 : 510, y: 1478, vx: 0, vy: 0, grounded: true } });
            expect(result.accepted).toBe(true); r = result.room;
        }
    };
    await exercise();
    await act(1, { type: 'select-level', level: 'race-condition' });
    r = (await act(1, { type: 'select-level', level: 'crossfeed-vault' })).room; await exercise();
    for (let i = 0; i < 2; i++) {
        await peers[i].close(); peers[i] = await connect<CoopLevelId>(app.url, ids[i].cookie); sequences[i] = 0;
        peers[i].send({ type: 'join', code: r.code }); r = (await peers[i].wait('snapshot')).room;
    }
    await exercise();
    await kill(app.child); app = await launch(dir); sequences = [0, 0];
    peers = [await connect<CoopLevelId>(app.url, ids[0].cookie), await connect<CoopLevelId>(app.url, ids[1].cookie)];
    for (const p of peers) { p.send({ type: 'join', code: r.code }); r = (await p.wait('snapshot')).room; }
    await exercise();
});
