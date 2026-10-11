import { expect, it, vi } from 'vitest';
import { newRecord, freshCubes, sharedRoom, definition } from '../server/coop-state.ts';
import { freshCrumble, advanceCrumble } from '../server/crumble-state.ts';
import { freshRace } from '../server/race-state.ts';
import { freshCrossfeed } from '../server/crossfeed-state.ts';
import { assignCube } from '../server/cube-state.ts';
import { CoopClient } from '../src/coop/client.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { crossfeedVault } from '../src/coop/crossfeed-vault.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { emptyInput, createPlayer, type InputState } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import type { CubeId, Plate } from '../src/coop/protocol.ts';

it.each(['left', 'right'] as const)('%s route supports three real swings, including unstable support, with either payload or no payload', side => {
    for (const payload of [null, 'cubeA', 'cubeB'] as (CubeId | null)[]) {
        const record = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', 'crossfeed-vault');
        Object.assign(record.levelState, { switchC: true, switchD: true, routeMode: side === 'right' }); record.checkpoint = 'upper';
        const ctx = { record, held: ['routePower', null] as [Plate, Plate], crumble: freshCrumble(), race: freshRace(), crossfeed: freshCrossfeed(), now: 1000 };
        const cubes = freshCubes(record.level); for (const c of Object.values(cubes)) assignCube(c, 1);
        if (payload) cubes[payload]!.holder = 1;
        const client = new CoopClient(() => {}, () => {}); client.slot = 1; client.status = 'CONNECTED';
        const view = () => sharedRoom(record, [true, true], ctx.held, cubes, ctx.crumble, ctx.now, ctx.race, ctx.crossfeed);
        client.room = view(); const authority = createCoopAuthority(client.room, client);
        vi.spyOn(client, 'occupy').mockImplementation(() => {}); vi.spyOn(client, 'cubeOccupancy').mockImplementation(() => {});
        vi.spyOn(client, 'reachExit').mockImplementation(() => {});
        const reset = vi.spyOn(client, 'cubeAction').mockReturnValue(false);
        vi.spyOn(client, 'triggerCrumble').mockImplementation((platform, trigger) => {
            definition(record.level).action(ctx, { type: 'crumble-trigger', seq: 1, platform, trigger });
        });
        const w = new PuzzleWorld(crossfeedVault(1), { checkpoint: 'upper', switchB: false, cubeOnPlate: false, cubeOnPlateB: false }, undefined, authority);
        w.player = createPlayer(side === 'left' ? 1400 : 4260, side === 'left' ? 733 : 633); w.player.grounded = true;
        const input = { ...emptyInput(), right: side === 'left', left: side === 'right' }, dir = side === 'left' ? 1 : -1;
        const tick = (patch: Partial<InputState> = {}) => {
            ctx.now += FIXED_DT * 1000; advanceCrumble(ctx.crumble, ctx.now); client.room = view(); authority.room = client.room;
            client.roomReceivedAt = performance.now(); w.step(FIXED_DT, { ...input, ...patch });
        };
        const until = (label: string, predicate: () => boolean, patch: Partial<InputState> = {}, max = 500) => {
            for (let i = 0; i < max && !predicate(); i++) tick(patch);
            expect(predicate(), `${side}/${payload}: ${label}: ${JSON.stringify({ x: w.player.x, y: w.player.y, vx: w.player.vx, vy: w.player.vy, ground: w.player.groundId, rope: w.player.rope, deaths: w.deaths })}`).toBe(true);
        };
        const anchors = side === 'left' ? [{ id: 'left1', x: 1540, y: 356 }, { id: 'crumbleA', x: 1990, y: 276 }, { id: 'left3', x: 2440, y: 356 }]
            : [{ id: 'right1', x: 4100, y: 186 }, { id: 'crumbleB', x: 3640, y: 156 }, { id: 'right3', x: 3180, y: 306 }];
        tick({ jumpPressed: true, jumpHeld: true }); until('launch jump', () => w.player.y < (side === 'left' ? 650 : 550), { jumpHeld: true });
        input.grappleHeld = true; input.aim = anchors[0]; tick({ grapplePressed: true });
        until('first attach', () => w.player.rope.anchorId === anchors[0].id);
        for (const target of anchors.slice(1)) {
            until('release arc', () => (w.player.x - w.player.rope.anchor.x) * dir > 90 && w.player.vx * dir > 450 && w.player.vy < 0);
            tick({ jumpPressed: true, jumpHeld: true }); tick({ grappleHeld: false });
            input.aim = target; tick({ grapplePressed: true }); until(target.id, () => w.player.rope.anchorId === target.id);
            if (target.id.startsWith('crumble')) {
                tick(); expect(ctx.crumble[target.id as 'crumbleA' | 'crumbleB'].phase).toBe('warning');
            }
            if (payload) expect(w.cubes[payload]!.carried).toBe(true);
        }
        until('final arc', () => (w.player.x - w.player.rope.anchor.x) * dir > 90 && w.player.vx * dir > 350 && w.player.vy < 0);
        input.grappleHeld = false; tick();
        for (let n = 0; n < 400 && !w.player.grounded; n++) {
            const stop = w.player.x + w.player.vx * Math.abs(w.player.vx) / 3800, target = side === 'left' ? 2680 : 2860;
            tick({ right: stop < target, left: stop >= target });
        }
        expect(w.player.groundId).toBe('vault-cargo-deck'); expect(w.deaths).toBe(0); expect(reset).not.toHaveBeenCalled();
        if (payload) expect(w.cubes[payload]!.carried).toBe(true);
    }
});
