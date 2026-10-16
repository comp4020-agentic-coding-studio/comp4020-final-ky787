import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { CARRY, PLAYER } from '../src/engine/constants.ts';
import { emptyInput, type InputState } from '../src/engine/physics.ts';
import { CUBE_SIZE } from '../src/slice/tuning.ts';
import type { CubeAuthority } from '../src/slice/world.ts';
import { createRuntime, nearDraftControl } from '../src/workbench/runtime.ts';
import { parseDraft } from '../src/workbench/validation.ts';

const document = parseDraft(JSON.parse(readFileSync(new URL('../levels/drafts/handshake.json', import.meta.url), 'utf8')));
const object = (id: string) => {
    const found = document.geometry.objects.find(o => o.id === id);
    if (!found) throw new Error(`Missing HANDSHAKE object ${id}`);
    return found;
};
const tick = (runtime: ReturnType<typeof createRuntime>, input: Partial<InputState> = {}) => runtime.step({ ...emptyInput(), ...input });
const settle = (runtime: ReturnType<typeof createRuntime>, steps = 80) => { for (let n = 0; n < steps; n++) tick(runtime); };

it.each(Array.from({ length: 13 }, (_, n) => n - 1))('solo floor/coyote launch %s cannot extract the alcove cube from below without powered traversal', delay => {
    const r = createRuntime(document), cube = r.world.cubes['draft:payload']!, home = { x: cube.x, y: cube.y }, bay = object('centralBay');
    let jumped = false, off = -1, pulled = false, attached = false;
    for (let n = 0; n < 400; n++) {
        if (r.world.player.x < bay.x - PLAYER.width / 2 + 1 && off < 0) off = n;
        const jump = !jumped && (delay < 0 ? r.world.player.x < bay.x + 10 : off >= 0 && n - off >= delay);
        if (jump) jumped = true;
        tick(r, { left: r.world.player.x > bay.x - 500, jumpPressed: jump, jumpHeld: true,
            grapplePressed: r.world.player.x < bay.x + 60, grappleHeld: true, aim: { x: cube.x, y: cube.y } });
        pulled ||= r.world.pullingCube;
        attached ||= r.world.player.rope.phase === 'attached';
    }
    expect(jumped).toBe(true);
    expect(pulled).toBe(false);
    expect(attached).toBe(false);
    expect({ x: cube.x, y: cube.y }).toEqual(home);
    expect(r.world.deaths).toBe(0);
    expect(r.world.player.groundId).toBe('recoveryFloor');
});

it('a missed unpowered crossing has a real-input walk and two-jump recovery to the central bay', () => {
    const r = createRuntime(document), step = object('returnStep'), bay = object('centralBay');
    for (let n = 0; n < 400 && r.world.player.x > step.x - 180; n++) tick(r, { left: true });
    settle(r);
    expect(r.world.player.groundId).toBe('recoveryFloor');
    for (let n = 0; n < 180 && r.world.player.x < step.x - 55; n++) tick(r, { right: true });
    settle(r, 12);
    for (let n = 0; n < 85; n++) tick(r, { right: r.world.player.x < step.x + 50, jumpPressed: n === 0, jumpHeld: true });
    expect(r.world.player.groundId).toBe('returnStep');
    for (let n = 0; n < 85; n++) tick(r, { right: r.world.player.x < bay.x + 70, jumpPressed: n === 0, jumpHeld: true });
    expect(r.world.player.groundId).toBe('centralBay');
    expect(r.world.deaths).toBe(0);
});

// Section fixtures only: setup on the authored gallery after transport. These
// verify physical boost separation, not a full-room or network completion route.
function galleryFixture(mode: 'floor' | 'loose' | 'partner-held') {
    const gallery = object('serviceGallery'), ledge = object('maintenanceLedge'), x = ledge.x - 75;
    const r = createRuntime(document, 1, { start: { x, y: gallery.y - PLAYER.height / 2 } });
    const cube = r.world.cubes['draft:payload']!;
    if (mode === 'loose') {
        Object.assign(cube, { x, y: gallery.y - CUBE_SIZE / 2, vx: 0, vy: 0, grounded: true, groundId: 'serviceGallery', carried: false });
        Object.assign(r.world.player, { y: gallery.y - CUBE_SIZE - PLAYER.height / 2, grounded: true });
    } else if (mode === 'partner-held') {
        const cubeY = gallery.y - PLAYER.height - CARRY.holdGap - CUBE_SIZE / 2;
        const support: CubeAuthority = {
            simulates: false, heldLocally: false,
            partnerSupport: { cubeId: 'draft:payload', carrier: 2, surface: { id: 'partner-cube-support:draft:payload', x: x - CUBE_SIZE / 2,
                y: cubeY - CUBE_SIZE / 2, w: CUBE_SIZE, h: 1, enabled: true, oneWay: true, grappleable: false } },
            sync(world) { Object.assign(world.cubes['draft:payload']!, { x, y: cubeY, vx: 0, vy: 0, grounded: false, carried: true }); },
            pull() { return false; }, cancelPull() {}, release() {},
        };
        r.authority.cubes = { 'draft:payload': support };
        settle(r, 2);
        for (let n = 0; n < 72; n++) tick(r, { jumpPressed: n === 0, jumpHeld: true });
        expect(r.world.groundedOnPartnerCube).toBe(true);
    }
    settle(r, 2);
    return r;
}

it.each(['floor', 'loose'] as const)('%s cube gallery jump cannot reach maintenance or operate its terminal from underneath', mode => {
    const r = galleryFixture(mode), ledge = object('maintenanceLedge');
    let highestFeet = Infinity;
    for (let n = 0; n < 100; n++) {
        tick(r, { right: true, jumpPressed: n === 0, jumpHeld: true });
        highestFeet = Math.min(highestFeet, r.world.player.y + PLAYER.height / 2);
        expect(r.world.player.groundId).not.toBe('maintenanceLedge');
        expect(nearDraftControl(r.world, document)?.id).not.toBe('maintenance');
    }
    expect(highestFeet).toBeGreaterThan(ledge.y + 5);
    expect(r.snapshot().deviceValues['maintenance.value']).toBe(false);
});

it('jumping onto a stationary partner-held cube then jumping again reaches the canonical maintenance ledge', () => {
    const r = galleryFixture('partner-held'), terminal = object('maintenance');
    for (let n = 0; n < 95; n++) tick(r, { right: r.world.player.x < terminal.x - 10, jumpPressed: n === 0, jumpHeld: true });
    expect(r.world.player.groundId).toBe('maintenanceLedge');
    expect(nearDraftControl(r.world, document)?.id).toBe('maintenance');
    expect(r.world.deaths).toBe(0);
});
