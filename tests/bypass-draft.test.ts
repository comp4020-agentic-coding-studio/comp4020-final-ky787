import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDraft, validateDraft } from '../src/workbench/validation.ts';
import { evaluateDraft } from '../src/workbench/evaluate.ts';
import { createRuntime, validateStart } from '../src/workbench/runtime.ts';
import { emptyInput, findGrappleTarget } from '../src/engine/physics.ts';
import { GRAPPLE } from '../src/engine/constants.ts';
import { parseScenario } from '../scripts/level-tools/scenario.ts';

const draft = parseDraft(JSON.parse(readFileSync('levels/drafts/bypass.json', 'utf8')));
const tick = (r: ReturnType<typeof createRuntime>, n: number) => { for (let i = 0; i < n; i++) r.step(); };

describe('BYPASS authored draft contract (isolated fixtures, not full-room evidence)', () => {
  it('validates the draft and its bounded two-player real-input scenario', () => {
    expect(validateDraft(draft).diagnostics).toEqual([]);
    const scenario = parseScenario(JSON.parse(readFileSync('levels/scenarios/bypass.json', 'utf8')));
    expect(scenario.scope).toBe('full-room'); expect(scenario.mode).toBe('coop');
    expect(scenario.actors.every(a => !a.start)).toBe(true);
    expect(draft.presentation.music).toBe('kuia');
  });

  it('holds, commits and requires simultaneous scans for every input combination', () => {
    for (let bits = 0; bits < 64; bits++) {
      const [hold, link, bypass, override, left, right] = Array.from({ length: 6 }, (_, i) => !!(bits & (1 << i)));
      expect(evaluateDraft(draft, { 'anchorHold.occupied': hold, 'link.value': link, 'bypassHold.occupied': bypass,
        'override.value': override, 'leftScan.occupied': left, 'rightScan.occupied': right })).toEqual({
        anchorPower: hold || link, bridgePower: link, firewallActive: !(bypass || override), exitReady: link && override && left && right,
      });
    }
  });

  it('keeps every occupied operator position outside manual and assisted anchor range', () => {
    // Labelled initial-position fixtures on the scanner. No partner or output injection.
    for (let x = 223; x <= 317; x++) {
      const r = createRuntime(draft, 1, { start: { x, y: 663 } }); tick(r, 3);
      expect(r.snapshot().deviceValues['anchorHold.occupied']).toBe(true);
      expect(r.world.selectedTarget({ x: 870, y: 352 })).toBeNull();
      for (const point of [{ x: 790, y: 340 }, { x: 790, y: 364 }, { x: 870, y: 346 }]) {
        expect(Math.hypot(point.x - x, point.y - 663)).toBeGreaterThan(GRAPPLE.maxRange);
        expect(findGrappleTarget(r.world.player, point, r.world.solids)).toBeNull();
      }
    }
  });

  it('rejects a running ordinary jump, including late coyote input, across the opening', () => {
    for (const launchX of [520, 550, 568, 585]) {
      const r = createRuntime(draft, 2, { start: { x: 400, y: 663 } }); tick(r, 3);
      let jumped = false, maximum = 400;
      for (let n = 0; n < 240 && !r.world.deaths; n++) {
        const press = !jumped && r.world.player.x >= launchX;
        if (press) jumped = true;
        r.step({ ...emptyInput(), right: true, jumpPressed: press });
        maximum = Math.max(maximum, r.world.player.x);
      }
      expect(jumped).toBe(true); expect(r.world.deaths).toBe(1);
      expect(maximum).toBeLessThan(900); // Far bank starts at 980, including body clearance.
    }
  });

  it('allows a comfortable one-hook opening with the final held-Space/release controls', () => {
    // Explicit section fixture: simulated held partner port; full browser scenario supplies a real second body.
    for (const releaseX of [900, 930, 960]) {
      const r = createRuntime(draft, 2, { start: { x: 515, y: 663 } });
      r.setPartnerInputs({ 'anchorHold.occupied': true }); tick(r, 3);
      let attached = false, released = false;
      for (let n = 0; n < 300 && !r.world.deaths && r.world.player.groundId !== 'middleBank'; n++) {
        const input = { ...emptyInput(), right: true };
        if (n === 0) Object.assign(input, { jumpPressed: true, airGrapplePressed: true, airGrappleHeld: true });
        if (n === 1) input.airGrappleReleased = true;
        if (n >= 9 && !released) { input.airGrappleHeld = true; if (n === 9) Object.assign(input, { airGrapplePressed: true, jumpPressed: true }); }
        if (r.world.player.rope.phase === 'attached') { attached = true; expect(r.world.player.rope.anchorId).toBe('anchor'); }
        if (!released && attached && r.world.player.x > releaseX) { input.airGrappleHeld = false; input.airGrappleReleased = true; released = true; }
        r.step(input);
      }
      expect(attached && released).toBe(true); expect(r.world.deaths).toBe(0);
      expect(r.world.player.groundId).toBe('middleBank');
    }
  });

  it('keeps checkpoint bodies safe and off held scanners, and prevents using OVERRIDE through the final live beam', () => {
    for (const slot of [1, 2] as const) {
      const r = createRuntime(draft, slot, { start: { x: slot === 1 ? 1220 : 1350, y: 663 } }); tick(r, 3);
      expect(validateStart(r.world, r.world.player)).toBeNull();
      expect(r.world.player.groundId).toBe('middleBank');
      expect(r.snapshot().deviceValues['anchorHold.occupied']).toBe(false);
      expect(r.snapshot().deviceValues['bypassHold.occupied']).toBe(false);
    }
    const r = createRuntime(draft, 1, { start: { x: 1720, y: 663 } }); tick(r, 3);
    r.step(emptyInput(), true);
    expect(r.snapshot().deviceValues['override.value']).toBe(false);
    expect(r.world.deaths).toBe(0);
  });
});
