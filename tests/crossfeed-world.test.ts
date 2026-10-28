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
import { AudioPresentation } from '../src/slice/audio-presentation.ts';
import { ReceiverPresentation, payloadReceivers } from '../src/slice/receiver-presentation.ts';
import { floatingControlHousing } from '../src/slice/maintenance-render.ts';

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
function unlock(f: ReturnType<typeof setup>) { f.record.levelState.switchC = true; f.record.checkpoint = 'upper'; f.sync(); }

it.each(['entry', 'routePower', 'liftCargo', 'finalLeft', 'finalRight'] as const)('%s contact uses its semantic cue once, without replaying accepted snapshots', placement => {
    const f = setup(), audio = { play: vi.fn(), setLoop: vi.fn(), stopAll: vi.fn() }, sound = new AudioPresentation(audio);
    const receivers = new ReceiverPresentation(); receivers.reset(payloadReceivers(f.world));
    const observe = () => { sound.observe(f.world, []); for (const c of receivers.update(payloadReceivers(f.world), .016, true)) audio.play(c.cue); };
    sound.reset(f.world); f.record.cubePlacements.cubeA = placement; f.sync(); observe();
    f.sync(); observe();
    const cargo = placement !== 'entry' && placement !== 'routePower';
    expect(audio.play.mock.calls.filter(c => c[0] === 'plate')).toHaveLength(cargo ? 0 : 1);
    expect(audio.play.mock.calls.filter(c => c[0] === 'payloadConfirm')).toHaveLength(cargo ? 1 : 0);
});

it('both loose cubes simulate and support independently; ordinary plate reports remain separate from local body reports', () => {
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

it('route ghosts fade against the accepted deadline without creating a local collision timer', () => {
    const f = setup(); unlock(f); f.record.cubePlacements.cubeA = 'routePower'; f.sync();
    const room = f.authority.room;
    if (room.level !== 'crossfeed-vault') throw new Error('Wrong test chamber');
    const state = room.levelState, now = performance.now();
    state.inputs.routeMode = true; state.outputs.leftRoute = false; state.outputs.rightRoute = true;
    state.physical = { leftRoute: true, rightRoute: true }; state.handoverMs = 325; f.client.roomReceivedAt = now;
    const clock = vi.spyOn(performance, 'now').mockReturnValue(now + 200);
    expect(f.authority.frame.fading?.leftRoute).toBeCloseTo(125 / 325);
    expect(f.world.physicalPower('leftRoute')).toBe(true);
    // A later snapshot carries the remaining deadline, not a fresh full fade.
    state.handoverMs = 125; f.client.roomReceivedAt = now + 200;
    expect(f.authority.frame.fading?.leftRoute).toBeCloseTo(125 / 325);
    clock.mockReturnValue(now + 400); expect(f.authority.frame.fading?.leftRoute).toBe(0);
    expect(f.world.physicalPower('leftRoute')).toBe(true);
    state.physical.leftRoute = false; expect(f.world.physicalPower('leftRoute')).toBe(false);
    clock.mockRestore();
});

it('lift cargo ignores bodies; C makes the lift permanent and changes only future local respawn', () => {
    const f = setup(), w = f.world;
    w.player = createPlayer(1750, 1483); step(w, 4); expect(f.occupancy).toHaveBeenLastCalledWith('spawn', 'cubeB');
    expect(w.frame.outputs.liftField).toBe(false);
    f.record.levelState.switchB = true; f.record.cubePlacements.cubeA = 'liftCargo'; f.sync();
    expect(w.frame.outputs.liftField).toBe(true);
    f.record.cubePlacements.cubeA = 'spawn'; f.sync(); expect(w.frame.outputs.liftField).toBe(false);
    const before = { x: w.player.x, y: w.player.y }; unlock(f);
    expect(w.frame.outputs.liftField).toBe(true); expect(w.frame.outputs.relayGates).toBe(false);
    expect(w.power('serviceAccess')).toBe(true);
    f.record.levelState.switchB = false; f.sync(); expect(w.frame.outputs.relayGates).toBe(true);
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
    expect(w.cubes.cubeB!.x).toBeGreaterThan(3736); expect(w.gates[0].cooldown('cubeB')).toBeGreaterThan(0);
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
        expect(w.target({ x: 4150, y: 750 })).toBeNull();
    }
    expect(w.platforms.filter(p => p.def.signal === 'vaultPower').every(p => !p.solid.enabled)).toBe(true);
    expect(w.room.cubePads![1].at.y - w.room.plateB!.y).toBeGreaterThan(44 + 82 + 131);
    expect(w.room.cubes).toHaveLength(2); expect(w.frame.source).toBe('mock-multiplayer'); expect(w.frame.evidence).toBeUndefined();
});

it('new plates and payload sockets sample independently; service access stays safe in bridge mode', () => {
    const f = setup(), w = f.world; unlock(f);
    f.record.levelState.switchB = true; f.sync();
    expect(w.gates[0].enabled).toBe(false); expect(w.platforms.find(p => p.def.id === 'service-door')!.solid.enabled).toBe(false);
    for (const pad of [...w.room.plates!, ...w.room.cubePads!]) {
        Object.assign(w.cubes.cubeA!, { x: pad.at.x, y: pad.at.y - 22, grounded: true, carried: false });
        f.occupancy.mockClear(); f.authority.sample(w);
        expect(f.occupancy).toHaveBeenCalledWith(pad.id, 'cubeA');
        expect(w.cubePlacementPosition('cubeA', pad.id)).toEqual({ x: pad.at.x, y: pad.at.y - 22 });
    }
    for (const point of [w.room.spawn, w.room.upperCheckpoint!]) {
        expect(w.platforms.filter(p => p.def.kind === 'static' && !p.def.openWhen).some(p =>
            point.x >= p.def.x && point.x <= p.def.x + p.def.w && point.y + 17 === p.def.y)).toBe(true);
    }
});

it('the powered right launch stays out of grapple reach below the boost ledge; terminal cannot be used through its underside', () => {
    const f = setup(), w = f.world; unlock(f); f.record.levelState.routeMode = true; f.record.cubePlacements.cubeA = 'routePower'; f.sync();
    for (const elevation of [0, 44]) for (const x of [3620, 3900, 4100, 4290]) {
        w.player = createPlayer(x, 940 - 131 - 17 - elevation);
        for (const p of w.room.platforms.filter(p => p.signal === 'rightRoute')) expect(w.target({ x: p.x + p.w / 2, y: p.y + 6 })).toBeNull();
    }
    const action = vi.spyOn(f.client, 'control').mockReturnValue(true);
    w.player = createPlayer(4200, 790); w.player.grounded = false; w.interact(); expect(action).not.toHaveBeenCalled();
    w.player = createPlayer(4200, 733); w.player.grounded = true; w.interact(); expect(action).toHaveBeenCalledWith('switchD');
});

it('floating buttons: SYSTEM ONLINE needs a real catwalk jump, D still needs the boost ledge, and neither art overlaps nearby machinery', () => {
    const f = setup(), w = f.world; f.record.checkpoint = 'upper'; f.sync();
    const action = vi.spyOn(f.client, 'control').mockReturnValue(true);
    const system = w.room.controls!.find(c => c.id === 'switchC')!, gallery = w.room.controls!.find(c => c.id === 'switchD')!;
    expect(system.floating && gallery.floating && system.kind === 'terminal' && gallery.kind === 'terminal').toBe(true);
    const catwalk = w.room.platforms.find(p => p.id === 'control-catwalk')!;
    // Standing anywhere on the catwalk never reaches the hovering housing.
    for (let x = catwalk.x + 15; x <= catwalk.x + catwalk.w - 15; x += 10) {
        w.player = createPlayer(x, catwalk.y - PLAYER.height / 2); w.player.grounded = true;
        expect(w.interactionHint()).not.toBe('E · SYSTEM ONLINE');
    }
    // A real tap jump from the catwalk beneath it, with physics stepping, offers and presses it mid-air.
    for (const held of [false, true]) {
        action.mockClear();
        w.player = createPlayer(system.at.x, catwalk.y - PLAYER.height / 2); w.player.grounded = true;
        step(w, 1, { ...emptyInput(), jumpPressed: true, jumpHeld: held });
        let offered = false;
        for (let i = 0; i < 40 && !offered; i++) { step(w, 1, { ...emptyInput(), jumpHeld: held }); offered = w.interactionHint() === 'E · SYSTEM ONLINE'; }
        expect(offered, held ? 'held jump' : 'tap jump').toBe(true);
        expect(w.player.grounded).toBe(false);
        w.interact(); expect(action).toHaveBeenCalledWith('switchC');
    }
    // D keeps its boost puzzle: a full held floor jump from the gallery below never offers it.
    for (const x of [4080, 4200, 4300]) {
        w.player = createPlayer(x, 940 - PLAYER.height / 2); w.player.grounded = true;
        step(w, 1, { ...emptyInput(), jumpPressed: true, jumpHeld: true });
        for (let i = 0; i < 90; i++) { step(w, 1, { ...emptyInput(), jumpHeld: true }); expect(w.interactionHint()).not.toBe('E · D / GALLERY ACCESS'); }
    }
    // Housings stay clear of solid architecture, the breakpoint pedestal and the D launch slab.
    const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const control of [system, gallery]) {
        const housing = floatingControlHousing(control.at);
        for (const p of w.room.platforms) expect(overlaps(housing, p), `${control.id} housing vs ${p.id}`).toBe(false);
    }
    const breakpoint = w.room.breakpoints![0].at;
    expect(overlaps(floatingControlHousing(system.at), { x: breakpoint.x - 82, y: breakpoint.y - 102, w: 164, h: 102 })).toBe(false);
});

it.each(['left', 'right'] as const)('%s route cannot skip the unstable middle hook with a direct rope-jump transfer', side => {
    const f = setup(), w = f.world; unlock(f);
    f.record.levelState.switchD = true; f.record.levelState.routeMode = side === 'right';
    f.record.cubePlacements.cubeB = 'routePower'; f.cubes.cubeA!.holder = 1; f.sync();
    w.player = createPlayer(side === 'left' ? 1400 : 4260, side === 'left' ? 733 : 633); w.player.grounded = true;
    const dir = side === 'left' ? 1 : -1;
    const input = { ...emptyInput(), right: dir === 1, left: dir === -1 };
    const first = w.room.platforms.find(p => p.id === `${side}1`)!, last = w.room.platforms.find(p => p.id === `${side}3`)!;
    step(w, 1, { ...input, jumpPressed: true, jumpHeld: true });
    for (let i = 0; i < 60 && w.player.y >= (side === 'left' ? 650 : 550); i++) step(w, 1, { ...input, jumpHeld: true });
    input.aim = { x: first.x + first.w / 2, y: first.y + 6 }; input.grappleHeld = true;
    step(w, 1, { ...input, grapplePressed: true });
    for (let i = 0; i < 400 && !((w.player.x - w.player.rope.anchor.x) * dir > 90 && w.player.vx * dir > 450 && w.player.vy < 0); i++) step(w, 1, input);
    expect(w.player.rope.anchorId).toBe(first.id);
    step(w, 1, { ...input, jumpPressed: true, jumpHeld: true }); step(w, 1, { ...input, grappleHeld: false });
    input.aim = { x: last.x + last.w / 2, y: last.y + 6 };
    let caught = false;
    for (let i = 0; i < 240 && !w.player.grounded && !caught; i++) {
        step(w, 1, { ...input, grapplePressed: true }); caught = w.player.rope.anchorId === last.id;
    }
    expect(caught).toBe(false);
});

it('the visible vault bulkhead prevents one cargo route from serving both sockets, and opens after exit commit', () => {
    const f = setup(), w = f.world; unlock(f);
    w.player = createPlayer(2690, 633); w.player.grounded = true;
    step(w, 1, { ...emptyInput(), right: true, jumpPressed: true, jumpHeld: true });
    step(w, 100, { ...emptyInput(), right: true, jumpHeld: true });
    expect(w.player.x).toBeLessThan(2744);
    Object.assign(w.cubes.cubeB!, { x: 2805, y: 628 }); expect(w.cubeReachable('cubeB')).toBe(false);
    expect(w.cubeDropTransform().x).toBeLessThan(2744); // No through-wall drop.
    f.record.exitUnlocked = true; f.sync();
    expect(w.platforms.find(p => p.def.id === 'vault-divider')!.solid.enabled).toBe(false);
});

it('a solo runner cannot jump the first gap and two resting destination cubes leave a safe player relay lane', () => {
    const f = setup(), w = f.world;
    w.player = createPlayer(1980, 1483); w.player.grounded = true;
    step(w, 1, { ...emptyInput(), jumpPressed: true, jumpHeld: true, right: true });
    step(w, 120, { ...emptyInput(), jumpHeld: true, right: true });
    expect(w.deaths).toBeGreaterThan(0); expect(w.frame.outputs.bridge).toBe(false);
    unlock(f); Object.assign(w.cubes.cubeA!, { x: 3790, y: 918, grounded: true }); Object.assign(w.cubes.cubeB!, { x: 3834, y: 918, grounded: true });
    w.player = createPlayer(308, 1483); step(w);
    expect(w.player.x).toBeGreaterThan(3856); expect(w.player.x).toBeLessThan(w.room.width);
    expect(w.solids.filter(s => s.enabled).some(s => boxesOverlap(playerBox(w.player), s))).toBe(false);
});


it.each(['cubeA', 'cubeB'] as const)('%s lifts through the generic physics path and accepted destruction revokes its partner support', id => {
    const f = setup(), w = f.world; unlock(f);
    Object.assign(w.cubes[id]!, { x: 1510, y: 1478, grounded: false }); step(w, 120);
    expect(w.cubes[id]!.y).toBeLessThan(1300);
    assignCube(f.cubes[id]!, 2); f.cubes[id]!.holder = 2;
    f.cubes[id]!.transform = { x: 3980, y: 880, vx: 0, vy: 0, grounded: false };
    f.client.remote.push({ x: 3980, y: 923, vx: 0, vy: 0, grounded: true, facing: 1, rope: null }, 1, 1, performance.now()); f.sync();
    w.player = createPlayer(3980, 841); w.player.grounded = true; w.player.groundId = `partner-cube-support:${id}`;
    expect(w.partnerCubeSupport).not.toBeNull();
    interactCube(f.cubes[id]!, 2, { type: 'cube-reset', cubeId: id, seq: 1, epoch: f.cubes[id]!.epoch, cause: 'firewall' }); f.sync(); step(w);
    expect(w.partnerCubeSupport).toBeNull(); expect(w.player.grounded).toBe(false); expect(w.player.vy).toBeGreaterThan(0); expect(w.deaths).toBe(0);
});
