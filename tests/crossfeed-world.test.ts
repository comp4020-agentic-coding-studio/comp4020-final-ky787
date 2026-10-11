import { expect, it, vi } from 'vitest';
import { newRecord, freshCubes, sharedRoom } from '../server/coop-state.ts';
import { assignCube, interactCube } from '../server/cube-state.ts';
import { CoopClient } from '../src/coop/client.ts';
import { createCoopAuthority } from '../src/coop/lab-authority.ts';
import { crossfeedVault } from '../src/coop/crossfeed-vault.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { createPlayer, emptyInput, playerBox } from '../src/engine/physics.ts';
import { FIXED_DT, PLAYER } from '../src/engine/constants.ts';
import { boxesOverlap } from '../src/engine/geometry.ts';
import { cubeEntries, type CubeId, type Slot } from '../src/coop/protocol.ts';

function setup(slot: Slot = 1) {
    const record = newRecord('ABCD', '11111111-1111-4111-8111-111111111111', 'crossfeed-vault'), cubes = freshCubes(record.level);
    for (const c of Object.values(cubes)) assignCube(c, 1);
    const client = new CoopClient(() => {}, () => {}); client.slot = slot; client.status = 'CONNECTED';
    client.room = sharedRoom(record, [true, true], [null, null], cubes);
    for (const [id, c] of cubeEntries(cubes)) client.cubeReplica(id).reset(c, performance.now());
    const authority = createCoopAuthority(client.room, client);
    const occupancy = vi.spyOn(client, 'cubeOccupancy').mockImplementation(() => {});
    const body = vi.spyOn(client, 'occupy').mockImplementation(() => {});
    vi.spyOn(client, 'reachExit').mockImplementation(() => {});
    const action = vi.spyOn(client, 'cubeAction').mockReturnValue(false);
    const world = new PuzzleWorld(crossfeedVault(slot), { checkpoint: 'entry', switchB: false, cubeOnPlate: false, cubeOnPlateB: false }, undefined, authority);
    const sync = () => {
        client.room = sharedRoom(record, [true, true], [null, null], cubes); authority.room = client.room;
        for (const [id, c] of cubeEntries(cubes)) client.cubeReplica(id).reset(c, performance.now());
        world.syncAuthority();
    };
    return { record, cubes, client, authority, world, occupancy, body, action, sync };
}
function step(w: PuzzleWorld, n = 1, input = emptyInput()) { for (let i = 0; i < n; i++) { w.step(FIXED_DT, input); input.jumpPressed = false; } }
function unlock(f: ReturnType<typeof setup>) { f.record.levelState.switchB = f.record.levelState.switchC = true; f.record.checkpoint = 'upper'; f.sync(); }

it('both loose cubes simulate and support independently; cube A cannot press body Plate A', () => {
    const f = setup(), w = f.world;
    Object.assign(w.cubes.cubeA!, { x: 1850, y: 1300, grounded: false });
    Object.assign(w.cubes.cubeB!, { x: 1700, y: 1200, grounded: false });
    step(w, 100);
    expect(w.cubes.cubeA!.y).toBeCloseTo(1478); expect(w.cubes.cubeB!.y).toBeCloseTo(1478);
    expect(f.body).toHaveBeenLastCalledWith(null); expect(w.frame.outputs.grappleAnchor).toBe(false);
    for (const id of ['cubeA', 'cubeB'] as const) {
        w.player = createPlayer(w.cubes[id]!.x, 1390); step(w, 55);
        expect(w.player.grounded).toBe(true); expect(w.player.groundId).toBe(`cube-body:${id}`);
    }
});

it('lift cargo ignores bodies; C makes the lift permanent and changes only future local respawn', () => {
    const f = setup(), w = f.world;
    w.player = createPlayer(1750, 1483); step(w, 4); expect(f.occupancy).toHaveBeenLastCalledWith('spawn', 'cubeB');
    expect(w.frame.outputs.liftField).toBe(false);
    f.record.levelState.switchB = true; f.record.cubePlacements.cubeA = 'liftCargo'; f.sync();
    expect(w.frame.outputs.liftField).toBe(true);
    f.record.cubePlacements.cubeA = 'spawn'; f.sync(); expect(w.frame.outputs.liftField).toBe(false);
    const before = { x: w.player.x, y: w.player.y }; unlock(f);
    expect(w.frame.outputs.liftField && w.frame.outputs.relayGates).toBe(true);
    expect({ x: w.player.x, y: w.player.y }).toEqual(before);
    w.respawn(); expect(w.player).toMatchObject(w.room.upperCheckpoint!);
});

it.each(['carried', 'loose', 'pulled'] as const)('service firewall catches %s Cube B, only B resets; walking body fits', mode => {
    const f = setup(), w = f.world; unlock(f);
    step(w); const a = { ...w.cubes.cubeA! };
    if (mode === 'carried') { f.cubes.cubeB!.holder = 1; f.sync(); }
    if (mode === 'pulled') { f.cubes.cubeB!.pulling = true; f.sync(); }
    Object.assign(w.cubes.cubeB!, { x: 830, y: mode === 'carried' ? 1440 : 1478, vx: 250, vy: 0, grounded: false });
    w.player = createPlayer(830, 1483); w.player.vx = 250;
    step(w, 30, { ...emptyInput(), right: true });
    expect(f.action).toHaveBeenCalledWith('cube-reset', undefined, 'cubeB', 'firewall');
    expect(w.cubes.cubeA).toEqual(a); expect(w.deaths).toBe(0);
    expect(w.partnerCubeSupport).toBeNull();
    expect(interactCube(f.cubes.cubeB!, 1, { type: 'cube-reset', cubeId: 'cubeB', seq: 1, epoch: f.cubes.cubeB!.epoch, cause: 'firewall' })).toBe(true);
    f.sync(); expect(w.cubes.cubeB).toMatchObject(w.cubeSpawn('cubeB')!); expect(w.cubes.cubeA).toEqual(a);
});

it('Cube B relay discontinuity and death-zone recovery never move Cube A', () => {
    const f = setup(), w = f.world; unlock(f);
    step(w); const a = { ...w.cubes.cubeA! };
    Object.assign(w.cubes.cubeB!, { x: 308, y: 1478 }); step(w);
    expect(w.cubes.cubeB!.x).toBeGreaterThan(3236); expect(w.gates[0].cooldown('cubeB')).toBeGreaterThan(0);
    expect(w.gates[0].cooldown('cubeA')).toBe(0); expect(w.cubes.cubeA).toEqual(a);
    Object.assign(w.cubes.cubeB!, { x: 2200, y: 1700, grounded: false }); step(w);
    expect(f.action).toHaveBeenCalledWith('cube-reset', undefined, 'cubeB', 'recovery'); expect(w.cubes.cubeA).toEqual(a);
});

it.each([1, 2] as const)('P%s lands/jumps on the specific partner-held payload; own carried cube never supports its carrier', slot => {
    const f = setup(slot), w = f.world, partner = (3 - slot) as Slot; unlock(f);
    const id: CubeId = slot === 1 ? 'cubeB' : 'cubeA';
    assignCube(f.cubes[id]!, partner); f.cubes[id]!.holder = partner;
    f.cubes[id]!.transform = { x: 3600, y: 880, vx: 0, vy: 0, grounded: false };
    const now = performance.now(); f.client.remote.push({ x: 3600, y: 923, vx: 0, vy: 0, facing: 1, grounded: true, rope: null }, 1, 1, now);
    f.sync();
    expect(w.partnerCubeSupport?.surface.id).toBe(`partner-cube-support:${id}`);
    expect(w.partnerCubeSupport?.surface).toMatchObject({ oneWay: true, grappleable: false });
    w.player = createPlayer(3600, 817); step(w, 30);
    expect(w.groundedOnPartnerCube).toBe(true);
    step(w, 1, { ...emptyInput(), jumpPressed: true, jumpHeld: true });
    expect(w.player.vy).toBeLessThan(-700); expect(f.cubes[id]!.holder).toBe(partner);
    f.cubes[id]!.holder = null; f.sync(); expect(w.partnerCubeSupport).toBeNull();
    f.cubes[id]!.holder = slot; f.sync(); expect(w.partnerCubeSupport).toBeNull();
});

it('D resists a floor jump, a resting cube and grapple; the two final plates are beyond a held boost until both pads power approaches', () => {
    const f = setup(), w = f.world; unlock(f);
    const ledge = w.room.platforms.find(p => p.id === 'control-ledge')!;
    for (const elevation of [0, 44]) {
        w.player = createPlayer(3600, 940 - elevation - PLAYER.height / 2); w.player.grounded = true;
        step(w, 1, { ...emptyInput(), jumpPressed: true, jumpHeld: true });
        let top = w.player.y + PLAYER.height / 2;
        for (let i = 0; i < 90; i++) { step(w, 1, { ...emptyInput(), jumpHeld: true }); top = Math.min(top, w.player.y + PLAYER.height / 2); }
        expect(top).toBeGreaterThan(ledge.y);
        expect(w.target({ x: 3750, y: 750 })).toBeNull();
    }
    expect(w.platforms.filter(p => p.def.signal === 'codePlatformB').every(p => !p.solid.enabled)).toBe(true);
    expect(w.room.cubePads![1].at.y - w.room.plateB!.y).toBeGreaterThan(44 + 82 + 131);
    expect(w.room.cubes).toHaveLength(2); expect(w.frame.source).toBe('mock-multiplayer'); expect(w.frame.evidence).toBeUndefined();
});

it('a solo runner cannot jump the first gap and two resting destination cubes leave a safe player relay lane', () => {
    const f = setup(), w = f.world;
    w.player = createPlayer(1980, 1483); w.player.grounded = true;
    step(w, 1, { ...emptyInput(), jumpPressed: true, jumpHeld: true, right: true });
    step(w, 120, { ...emptyInput(), jumpHeld: true, right: true });
    expect(w.deaths).toBeGreaterThan(0); expect(w.frame.outputs.bridge).toBe(false);
    unlock(f); Object.assign(w.cubes.cubeA!, { x: 3290, y: 918, grounded: true }); Object.assign(w.cubes.cubeB!, { x: 3334, y: 918, grounded: true });
    w.player = createPlayer(308, 1483); step(w);
    expect(w.player.x).toBeGreaterThan(3356); expect(w.player.x).toBeLessThan(w.room.width);
    expect(w.solids.filter(s => s.enabled).some(s => boxesOverlap(playerBox(w.player), s))).toBe(false);
});


it.each(['cubeA', 'cubeB'] as const)('%s lifts through the generic physics path and accepted destruction revokes its partner support', id => {
    const f = setup(), w = f.world; unlock(f);
    Object.assign(w.cubes[id]!, { x: 1510, y: 1478, grounded: false }); step(w, 120);
    expect(w.cubes[id]!.y).toBeLessThan(1300);
    assignCube(f.cubes[id]!, 2); f.cubes[id]!.holder = 2;
    f.cubes[id]!.transform = { x: 3580, y: 880, vx: 0, vy: 0, grounded: false };
    f.client.remote.push({ x: 3580, y: 923, vx: 0, vy: 0, grounded: true, facing: 1, rope: null }, 1, 1, performance.now()); f.sync();
    w.player = createPlayer(3580, 841); w.player.grounded = true; w.player.groundId = `partner-cube-support:${id}`;
    expect(w.partnerCubeSupport).not.toBeNull();
    interactCube(f.cubes[id]!, 2, { type: 'cube-reset', cubeId: id, seq: 1, epoch: f.cubes[id]!.epoch, cause: 'firewall' }); f.sync(); step(w);
    expect(w.partnerCubeSupport).toBeNull(); expect(w.player.grounded).toBe(false); expect(w.player.vy).toBeGreaterThan(0); expect(w.deaths).toBe(0);
});
