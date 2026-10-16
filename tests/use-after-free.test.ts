import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyInput, type InputState } from '../src/engine/physics.ts';
import { createRuntime, type DraftRuntime } from '../src/workbench/runtime.ts';
import { ContextualCamera } from '../src/slice/camera-reveals.ts';
import { draftFrame, evaluateDraft } from '../src/workbench/evaluate.ts';
import { requirePlayable } from '../src/workbench/validation.ts';

const draft = () => requirePlayable(JSON.parse(readFileSync('levels/drafts/use-after-free.json', 'utf8')));
function step(runtime: DraftRuntime, seconds: number, input: InputState = emptyInput()) {
    for (let n = 0; n < Math.round(seconds * 120); n++) {
        runtime.step(input);
        input.grapplePressed = false;
        input.jumpPressed = false;
    }
}
describe('USE AFTER FREE authored mock chamber', () => {
    it('keeps three ordinary unstable operators, nine controlled anchors, and resolved handover logic', () => {
        const document = draft();
        expect(document.geometry.objects.filter(o => o.type === 'platform' && o.kind === 'unstable')).toHaveLength(12);
        for (const name of ['A', 'B', 'C']) {
            const operator = document.geometry.objects.find(o => o.id === `operator${name}`);
            const plate = document.geometry.objects.find(o => o.id === `plate${name}`);
            expect(operator).toMatchObject({ type: 'platform', kind: 'unstable', hookable: false, crumbleDelay: 24 });
            expect(plate).toMatchObject({ type: 'device', kind: 'plate', y: operator?.y });
        }
        for (let mask = 0; mask < 16; mask++) {
            const [a, b, c, assist] = [1, 2, 4, 8].map(bit => !!(mask & bit));
            const values = { 'plateA.occupied': a, 'plateB.occupied': b, 'plateC.occupied': c, 'assist.occupied': assist };
            const outputs = evaluateDraft(document, values), frame = draftFrame(document, values, outputs);
            expect(outputs.routeA).toBe(a);
            expect(outputs.routeB).toBe(b && !a);
            expect(outputs.routeC).toBe(c && !b);
            expect(frame.signals?.['draft:assistBinding']).toBe(assist && !c);
        }
    });
    it('each operator frames its supported route without adopting a remote pressure plate camera', () => {
        const operator = createRuntime(draft(), 2, { start: { x: 1345, y: 1933 } });
        step(operator, .1);
        const camera = new ContextualCamera();
        expect(camera.update(operator.world, 1 / 60, false)).toMatchObject({ kind: 'plate', id: 'draft:plateA' });
        const traveler = createRuntime(draft());
        traveler.setPartnerInputs({ 'plateA.occupied': true });
        step(traveler, .1);
        expect(new ContextualCamera().update(traveler.world, 1 / 60, false).kind).toBe('follow');
        const reveals = draft().presentation.cameraReveals;
        expect(reveals.map(r => r.source).sort()).toEqual(['assist', 'launch', 'plateA', 'plateB', 'plateC']);
        for (const letter of ['A', 'B', 'C']) expect(reveals.find(r => r.source === `plate${letter}`)?.platformIds)
            .toEqual([...([1, 2, 3].map(n => `${letter.toLowerCase()}${n}`)), ...(letter === 'A' ? [] : [`retry${letter}`])]);
    });
    it('real grounded occupancy on an unstable operator clears on the next physics update after collapse', () => {
        // Explicit isolated start: engine/contact proof, not a cooperative completion claim.
        const runtime = createRuntime(draft(), 1, { start: { x: 1345, y: 1933 } });
        const floor = runtime.world.platforms.find(p => p.def.id === 'operatorA')!;
        step(runtime, .1);
        expect(runtime.world.player.groundId).toBe('operatorA');
        expect(runtime.snapshot().outputs.routeA).toBe(true);
        let updates = 0;
        while (floor.solid.enabled && updates++ < 3000) runtime.step(emptyInput());
        expect(floor.solid.enabled).toBe(false);
        runtime.step(emptyInput());
        expect(runtime.world.player.grounded).toBe(false);
        expect(runtime.snapshot().deviceValues['plateA.occupied']).toBe(false);
        expect(runtime.snapshot().outputs.routeA).toBe(false);
        step(runtime, 1);
        expect(runtime.world.player.groundId).toBe('catchMiddle');
        expect(runtime.world.deaths).toBe(0);
    });
    it.each([
        { port: 'plateB.occupied', start: { x: 1250, y: 2033 }, catchId: 'retryB', left: false, ground: 'refugeA' },
        { port: 'plateC.occupied', start: { x: 590, y: 1743 }, catchId: 'retryC', left: true, ground: 'refugeB' },
    ])('$catchId permits an ordinary jump back to its permanent launch refuge', ({ port, start, catchId, left, ground }) => {
        // Initial catch setup is an explicitly isolated recovery section check.
        const runtime = createRuntime(draft(), 1, { start });
        runtime.setPartnerInputs({ [port]: true });
        step(runtime, .1);
        expect(runtime.world.player.groundId).toBe(catchId === 'retryB' ? 'retryB' : 'retryC');
        const input = { ...emptyInput(), left, right: !left, jumpPressed: true, jumpHeld: true };
        let landed = false;
        for (let n = 0; n < 120; n++) {
            runtime.step(input); input.jumpPressed = false;
            if (runtime.world.player.groundId === ground) { landed = true; break; }
        }
        expect(landed, JSON.stringify(runtime.snapshot().player)).toBe(true);
        expect(runtime.world.deaths).toBe(0);
    });
    it.each([
        { name: 'A lower to B', start: { x: 1000, y: 2333 }, port: 'plateA.occupied', jump: false, anchors: [['a1', 1.8], ['a2', .85], ['a3', 1.2]], ground: 'refugeB' },
        { name: 'B reversed arc to C', start: { x: 1500, y: 1933 }, port: 'plateB.occupied', jump: true, anchors: [['b1', .95], ['b2', 1.3], ['b3', .9]], ground: 'refugeC' },
        { name: 'C rising catch to summit', start: { x: 350, y: 1633 }, port: 'plateC.occupied', jump: true, anchors: [['c1', .95], ['c2', .8], ['c3', 1.8]], ground: 'summit' },
    ])('$name uses each real anchor and a bounded rope jump', ({ start, port, jump, anchors, ground }) => {
        // Labelled one-player section diagnostics: the browser scenario supplies the actual partner.
        const document = draft(), runtime = createRuntime(document, 1, { start });
        runtime.setPartnerInputs({ [port]: true });
        let input = emptyInput(); step(runtime, .1, input);
        if (jump) { input = { ...emptyInput(), left: port === 'plateB.occupied', right: port === 'plateC.occupied', jumpPressed: true, jumpHeld: true }; step(runtime, .18, input); }
        for (const [index, entry] of anchors.entries()) {
            const [id, seconds] = entry as [string, number];
            if (index > 0) { input.jumpPressed = true; input.jumpHeld = true; step(runtime, .06, input); }
            input.grappleHeld = false; step(runtime, .01, input);
            const target = document.geometry.objects.find(o => o.id === id);
            if (target?.type !== 'platform') throw new Error(`Missing anchor ${id}`);
            const left = port === 'plateA.occupied' || id === 'b1';
            input = { ...emptyInput(), left, right: !left && id !== 'c1', grappleHeld: true, grapplePressed: true, aim: { x: target.x + target.w / 2, y: target.y + 12 } };
            step(runtime, seconds, input);
            expect(runtime.world.player.rope.anchorId).toBe(id);
        }
        input.jumpPressed = true; input.jumpHeld = true; step(runtime, .5, input);
        expect(runtime.world.player.groundId, JSON.stringify(runtime.snapshot().player)).toBe(ground);
        expect(runtime.world.deaths).toBe(0);
    });
});
