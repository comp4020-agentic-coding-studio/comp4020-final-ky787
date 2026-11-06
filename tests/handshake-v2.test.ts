import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CARRY, PLAYER } from '../src/engine/constants.ts';
import { emptyInput, type InputState } from '../src/engine/physics.ts';
import { CUBE_SIZE } from '../src/slice/tuning.ts';
import { evaluateDraft } from '../src/workbench/evaluate.ts';
import { createRuntime, nearDraftControl } from '../src/workbench/runtime.ts';
import { parseDraft, validateDraft } from '../src/workbench/validation.ts';
import { draftHash } from '../src/workbench/model.ts';
import { parseScenario } from '../scripts/level-tools/scenario.ts';

const draft = parseDraft(JSON.parse(readFileSync('levels/drafts/handshake-v2.json', 'utf8')));
const released = parseDraft(JSON.parse(readFileSync('levels/campaign/handshake.json', 'utf8')));
const object = (id: string) => draft.geometry.objects.find(o => o.id === id)!;
const tick = (r: ReturnType<typeof createRuntime>, input: Partial<InputState> = {}, interact = false) => r.step({ ...emptyInput(), ...input }, interact);
const settle = (r: ReturnType<typeof createRuntime>, n = 60) => { for (let i = 0; i < n; i++) tick(r); };
const gallery = object('serviceGallery');

describe('HANDSHAKE v2 authored prototype (isolated physics fixtures, not full-room evidence)', () => {
    it('validates the frozen v2 draft and its exact campaign promotion', () => {
        expect(validateDraft(draft).diagnostics).toEqual([]);
        const scenario = parseScenario(JSON.parse(readFileSync('levels/scenarios/handshake-v2.json', 'utf8')));
        expect(scenario).toMatchObject({ mode: 'coop', scope: 'full-room' });
        expect(scenario.actors.every(a => !a.start)).toBe(true);
        expect(draft.id).toBe('handshake-v2');
        expect(draft.presentation.music).toBe('handshake');
        expect(released).toEqual(JSON.parse(readFileSync('levels/drafts/handshake.json', 'utf8')));
        expect(released).toEqual({ ...draft, id: 'handshake', title: 'HANDSHAKE' });
        expect(object('exit')).toMatchObject({ latch: true, arrivals: 2 });
    });

    it('checks all 32 vectors: payload alone controls exit, maintenance only clears the new firewall', () => {
        for (let bits = 0; bits < 32; bits++) {
            const [crossing, lift, link, maintenance, payload] = Array.from({ length: 5 }, (_, i) => !!(bits & (1 << i)));
            const values = { 'crossing.occupied': crossing, 'liftPlate.occupied': lift, 'link.value': link,
                'maintenance.value': maintenance, 'exitSocket.occupied': payload };
            expect(evaluateDraft(draft, values)).toEqual({ crossingPower: crossing, liftPower: lift, relayPower: link,
                firewallActive: !maintenance, exitReady: payload });
            expect(evaluateDraft(released, values)).toEqual(evaluateDraft(draft, values));
        }
        const r = createRuntime(draft);
        expect(r.world.firewalls[0].enabled).toBe(true);
        expect(r.world.frame.outputs.exitDoor).toBe(false);
    });

    it('pins the Windows request to this canonical draft, actual evaluator and explicit ABI order', async () => {
        const request = JSON.parse(readFileSync('docs/native-requests/handshake-v2.json', 'utf8'));
        expect(request.canonical_document_sha256).toBe(await draftHash(draft));
        for (const [path, hash] of Object.entries(request.reference_source_sha256))
            expect(createHash('sha256').update(readFileSync(path)).digest('hex'), path).toBe(hash);
        expect(request.inputs.map((i: any) => [i.name, i.game_port, i.offset, i.bit])).toEqual([
            ['crossing', 'crossing.occupied', 0, 0], ['liftPlate', 'liftPlate.occupied', 4, 1],
            ['link', 'link.value', 8, 2], ['maintenance', 'maintenance.value', 12, 3], ['exitSocket', 'exitSocket.occupied', 16, 4],
        ]);
        expect(request.outputs.map((o: any) => [o.name, o.offset])).toEqual([
            ['crossingPower', 0], ['liftPower', 4], ['relayPower', 8], ['firewallActive', 12], ['exitReady', 16],
        ]);
        expect(request.reference_vectors).toHaveLength(32);
        for (const v of request.reference_vectors) {
            expect(v.inputs).toEqual(request.inputs.map((_: unknown, i: number) => (v.case_id >> i) & 1));
            const result = evaluateDraft(draft, Object.fromEntries(request.inputs.map((input: any, i: number) => [input.game_port, !!v.inputs[i]])));
            expect(v.outputs).toEqual(request.outputs.map((o: any) => Number(result[o.name])));
        }
        expect(request.initial_state.outputs).toEqual([0, 0, 0, 1, 0]);
        expect(request.outputs.map((o: any) => o.expression)).toEqual(request.outputs.map((o: any) =>
            draft.controller.kind === 'declarative' ? draft.controller.outputs[o.name] : undefined));
        expect(request.bindings.map(({ invert, resolved_signal, resolution, ...b }: any) => b)).toEqual(draft.bindings);
        expect(request.bindings.every((b: any) => b.invert === false)).toBe(true);
    });

    it.each([1920, 1960, 2000, 2020, 2038])('a running jump at x=%i cannot cross the active beam', launch => {
        const r = createRuntime(draft, 1, { start: { x: 1900, y: 933 } }); settle(r, 3);
        let jumped = false;
        for (let n = 0; n < 220 && !r.world.deaths; n++) {
            const press: boolean = !jumped && r.world.player.x >= launch;
            jumped ||= press; tick(r, { right: true, jumpPressed: press });
            expect(r.world.frame.outputs.exitDoor).toBe(false);
        }
        expect(jumped).toBe(true); expect(r.world.deaths).toBe(1);
        expect(r.world.lastDeath).toMatchObject({ cause: 'firewall', firewallId: 'payloadFirewall' });
        expect(r.world.player.x).toBe(1780);
    });

    it.each([2020, 2030, 2037])('dropping from x=%i cannot place the carried payload beyond the live beam', x => {
        const r = createRuntime(draft, 1, { start: { x, y: 933 } }); settle(r, 3);
        const cube = r.world.cubes['draft:payload']!;
        Object.assign(cube, { x, y: 933 - PLAYER.height / 2 - CARRY.holdGap - CUBE_SIZE / 2, carried: true });
        r.world.player.facing = 1;
        tick(r, {}, true); settle(r);
        expect(r.recording.events.some(e => e.kind === 'cube-firewall')).toBe(true);
        expect(cube.x).toBe(100); expect(r.world.frame.outputs.exitDoor).toBe(false);
        expect(r.world.deaths).toBe(0);
    });

    it('even a cube pull from the far side resets cargo at the beam instead of delivering it', () => {
        // Deliberately stronger isolated fixture: the avatar starts beyond the barrier.
        const r = createRuntime(draft, 1, { start: { x: 2210, y: 933 } }); settle(r, 3);
        const cube = r.world.cubes['draft:payload']!;
        Object.assign(cube, { x: 2010, y: 928, vx: 0, vy: 0, grounded: true, groundId: 'centralBay' });
        let pulled = false;
        for (let n = 0; n < 180; n++) {
            tick(r, { grapplePressed: n === 0, grappleHeld: true, aim: { x: cube.x, y: cube.y } });
            pulled ||= r.world.pullingCube;
            expect(r.world.frame.outputs.exitDoor).toBe(false);
        }
        expect(pulled).toBe(true); expect(cube.x).toBe(100);
        expect(r.recording.events.some(e => e.kind === 'cube-firewall')).toBe(true);
    });

    it.each([2098, 2101, 2108, 2115])('even a far-side avatar at x=%i cannot pick cargo across the active beam', x => {
        // Combine the known gallery avatar squeeze with a strongest-case cargo
        // position on the near side. E must not transfer cargo over a thin beam.
        const r = createRuntime(draft, 1, { start: { x, y: 933 } }); settle(r, 3);
        const cube = r.world.cubes['draft:payload']!;
        Object.assign(cube, { x: 2037, y: 928, vx: 0, vy: 0, grounded: true, groundId: 'centralBay' });
        tick(r, {}, true); settle(r, 3);
        expect(cube.carried).toBe(false);
        expect(cube.x).toBeLessThan(2060);
        expect(r.world.frame.outputs.exitDoor).toBe(false);
    });

    it('even the far-wall avatar squeeze leaves cargo above the solid gallery and cannot deliver it', () => {
        const r = createRuntime(draft, 1, { start: { x: 2190, y: gallery.y - PLAYER.height / 2 } }); settle(r, 3);
        const cube = r.world.cubes['draft:payload']!;
        Object.assign(cube, { x: 2190, y: 489, carried: true });
        for (let n = 0; n < 180; n++) tick(r, { right: true, jumpPressed: n === 0 });
        tick(r, {}, true); settle(r);
        // Existing wall/cube depenetration can squeeze the unladen body down at
        // the room edge. It does not move the payload through the gallery.
        expect(r.world.player.groundId).toBe('centralBay');
        for (let n = 0; n < 240; n++) tick(r, { grapplePressed: n === 0, grappleHeld: true,
            aim: { x: cube.x, y: cube.y }, jumpPressed: n === 150 }, n > 150);
        expect(cube.carried).toBe(false);
        expect(cube.groundId).toBe('serviceGallery');
        expect(cube.x).toBeLessThanOrEqual(draft.geometry.width - CUBE_SIZE / 2);
        expect(r.world.frame.outputs.exitDoor).toBe(false); expect(r.world.deaths).toBe(0);
    });

    it('a pull from below cannot draw a gallery payload through the solid ceiling', () => {
        const r = createRuntime(draft, 1, { start: { x: 2200, y: 933 } }); settle(r, 3);
        const cube = r.world.cubes['draft:payload']!;
        Object.assign(cube, { x: 2200, y: 528, vx: 0, vy: 0, grounded: true, groundId: 'serviceGallery' });
        for (let n = 0; n < 240; n++) tick(r, { grapplePressed: n === 0, grappleHeld: true, aim: { x: cube.x, y: cube.y } });
        expect(cube.y).toBeLessThanOrEqual(gallery.y - CUBE_SIZE / 2);
        expect(r.world.frame.outputs.exitDoor).toBe(false);
    });

    it('the elevated floating button still needs the boost; pressing it survives repeated input and respawn', () => {
        const below = createRuntime(draft, 1, { start: { x: 1980, y: 533 } }); settle(below, 3);
        for (let n = 0; n < 100; n++) {
            tick(below, { jumpPressed: n === 0 }, true);
            expect(nearDraftControl(below.world, draft)?.id).not.toBe('maintenance');
        }
        expect(below.snapshot().deviceValues['maintenance.value']).toBe(false);
        const r = createRuntime(draft, 2, { start: { x: 1940, y: 343 } }); settle(r, 3);
        tick(r, {}, true);
        expect(r.snapshot().deviceValues['maintenance.value']).toBe(true);
        tick(r, {}, true); r.world.respawn('reset'); settle(r, 3);
        expect(r.snapshot().deviceValues['maintenance.value']).toBe(true);
        expect(r.world.firewalls[0].enabled).toBe(false);
        expect(r.world.frame.outputs.exitDoor).toBe(false);
    });

    it('an unpowered missed hook and two-jump recovery do not re-enable committed maintenance', () => {
        const r = createRuntime(draft, 2, { start: { x: 1940, y: 343 } }); settle(r, 3);
        tick(r, {}, true); r.world.respawn('reset');
        for (let n = 0; n < 450 && r.world.player.x > 700; n++) tick(r, { left: true });
        tick(r, { grapplePressed: true, grappleHeld: true, aim: { x: 890, y: 650 } }); settle(r);
        expect(r.world.player.rope.phase).not.toBe('attached');
        expect(r.world.player.groundId).toBe('recoveryFloor');
        for (let n = 0; n < 180 && r.world.player.x < 825; n++) tick(r, { right: true }); settle(r, 12);
        for (let n = 0; n < 85; n++) tick(r, { right: r.world.player.x < 930, jumpPressed: n === 0 });
        expect(r.world.player.groundId).toBe('returnStep');
        for (let n = 0; n < 85; n++) tick(r, { right: r.world.player.x < 1070, jumpPressed: n === 0 });
        expect(r.world.player.groundId).toBe('centralBay');
        expect(r.world.deaths).toBe(1); // Only the explicit reset above.
        expect(r.snapshot().deviceValues['maintenance.value']).toBe(true);
        expect(r.world.firewalls[0].enabled).toBe(false);
    });
});
