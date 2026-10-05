import { describe, expect, it } from 'vitest';
import { PuzzleWorld } from '../src/slice/world.ts';
import { roomById } from '../src/slice/rooms.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { grappleBox, emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
import { TracePlayback, hex } from '../src/slice/evidence-presentation.ts';
import { platformAddress, platformListing } from '../src/slice/evidence-render.ts';
import { uplinkEvidence } from '../src/slice/validated-controller.ts';
const world = () => new PuzzleWorld(roomById('uplink'), { ...freshProgress().rooms.uplink, switchB: true, switchC: true, cubeOnPlateC: true, checkpoint: 'upper' });
describe('address slabs as grapple surfaces', () => {
    it('enables the service and upper route slabs, without enabling inactive code or static architecture', () => {
        const w = world();
        for (const p of w.platforms) {
            expect(p.solid.grappleable).toBe(p.def.kind !== 'static' && p.solid.enabled);
            if (p.def.kind === 'code') expect(grappleBox(p.solid)).toEqual({ x: p.def.x, y: p.def.y, w: p.def.w, h: 24 });
        }
        Object.assign(w.player, { x: 2400, y: 800 });
        expect(w.target({ x: 2400, y: 650 })?.solid.id).toBe('service');
        for (let i = 0; i < 30; i++) w.step(FIXED_DT, { ...emptyInput(), grapplePressed: i === 0, grappleHeld: true, aim: { x: 2400, y: 650 } });
        expect(w.player.rope.phase).toBe('attached'); expect(w.player.rope.anchorId).toBe('service');
        w.cancelGrapple();
        Object.assign(w.player, { x: 2720, y: 400 });
        expect(w.target({ x: 2720, y: 166 })?.solid.id).toBe('upper-route');
        // Aim at the decorative listing alone: it never catches the rope.
        Object.assign(w.player, { x: 2750, y: 790 });
        expect(w.target({ x: 2400, y: 790 })).toBeNull();
    });
    it('catches the full crossing bar while keeping its tuned attachment centre', () => {
        const w = new PuzzleWorld(roomById('switch'), { ...freshProgress().rooms.switch, switchB: true });
        Object.assign(w.player, { x: 440, y: 543 });
        const slab = w.platforms.find(p => p.def.id === 'anchor')!;
        expect(grappleBox(slab.solid)).toEqual({ x: 690, y: 220, w: 160, h: 24 });
        expect(w.target({ x: 695, y: 226 })?.point).toEqual({ x: 770, y: 226 });
        expect(w.target({ x: 845, y: 226 })?.point).toEqual({ x: 770, y: 226 });
    });
    it('plausible crumble slabs accept hooks only while present', () => {
        const w = new PuzzleWorld(roomById('uplink'), { ...freshProgress().rooms.uplink, switchC: true, cubeOnPlateB: true }), p = w.platforms.find(p => p.def.id === 'proven-clone')!;
        Object.assign(w.player, { x: 1280, y: 470 });
        expect(w.target({ x: 1280, y: 176 })?.solid.id).toBe(p.def.id);
        Object.assign(w.player, { x: 1280, y: p.def.y - 30, vy: 20 });
        for (let i = 0; i < 170; i++) w.step(FIXED_DT, emptyInput());
        expect(p.solid.enabled).toBe(false); expect(p.solid.grappleable).toBe(false);
        expect(w.target({ x: 1280, y: 176 })).toBeNull();
        for (let i = 0; i < 300; i++) w.step(FIXED_DT, emptyInput());
        expect(p.solid.grappleable).toBe(true);
    });
    it('uses retained addresses for real and proven clone slab headers, with unmodified instructions below', () => {
        const w = world(), replay = new TracePlayback(); replay.update(w.frame, 0);
        for (const p of w.platforms.filter(p => p.def.kind !== 'static')) {
            const lines = platformListing(p, replay)!;
            expect(platformAddress(p, replay)).toBe(hex(lines[0].address));
            for (const line of lines) expect(line).toEqual(uplinkEvidence.raw.instructions.find(i => i.address === line.address));
        }
        expect(platformListing(w.platforms.find(p => p.def.id === 'proven-clone')!, replay)).toHaveLength(6);
    });
});
