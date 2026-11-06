import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDraft, validateDraft } from '../src/workbench/validation.ts';
import { evaluateDraft } from '../src/workbench/evaluate.ts';
import { createRuntime, validateStart, sampleDevices } from '../src/workbench/runtime.ts';
import { emptyInput, findGrappleTarget } from '../src/engine/physics.ts';
import { GRAPPLE } from '../src/engine/constants.ts';
import { pressurePads } from '../src/slice/machinery-presentation.ts';
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

  it('preserves three control expressions and always opens the exit for all 16 vectors', () => {
    for (let bits = 0; bits < 16; bits++) {
      const [hold, link, bypass, override] = Array.from({ length: 4 }, (_, i) => !!(bits & (1 << i)));
      expect(evaluateDraft(draft, { 'anchorHold.occupied': hold, 'link.value': link, 'bypassHold.occupied': bypass,
        'override.value': override })).toEqual({
        anchorPower: hold || link, bridgePower: link, firewallActive: !(bypass || override), exitReady: true,
      });
    }
  });


  it('starts physically open without commitments and renders the two body-only scanners once as modern pads', () => {
    const r = createRuntime(draft), w = r.world;
    expect(w.frame.outputs.exitDoor).toBe(true);
    expect(r.snapshot().outputs).toEqual({ anchorPower: false, bridgePower: false, firewallActive: true, exitReady: true });
    expect(Object.keys(r.snapshot().deviceValues)).toEqual(['anchorHold.occupied', 'link.value', 'bypassHold.occupied', 'override.value']);
    const scanners = draft.geometry.objects.filter(o => o.type === 'device' && o.kind === 'scanner');
    expect(scanners.map(o => o.id)).toEqual(['anchorHold', 'bypassHold']);
    for (const scanner of scanners) {
      // Isolated sampling fixture: a loose cube on each existing scanner must not activate it.
      const cubes = { cube: { x: scanner.x, y: scanner.y - 22, grounded: true, carried: false } };
      const cubeOnly = { ...w, cubes, cubeIsResetting: () => false } as unknown as typeof w;
      expect(sampleDevices(draft, cubeOnly)[scanner.id + '.occupied']).toBe(false);
      const occupied = createRuntime(draft, 1, { start: { x: scanner.x, y: scanner.y - 17 } }); tick(occupied, 3);
      expect(occupied.snapshot().deviceValues[scanner.id + '.occupied']).toBe(true);
      expect(pressurePads(occupied.world).find(p => p.id === 'draft:' + scanner.id)).toMatchObject({ active: true, scanner: true });
    }
    const pads = pressurePads(w);
    expect(pads.map(p => [p.id, p.scanner, p.active])).toEqual([
      ['draft:anchorHold', true, false], ['draft:bypassHold', true, false],
    ]);
    // The renderer's existing at-reference exclusion removes each from the fallback.
    expect(w.room.plates!.filter(p => !pads.some(pad => pad.at === p.at))).toEqual([]);
  });

  it('freezes the actual four-input reference snapshot and all ABI vectors for Windows', () => {
    const request = JSON.parse(readFileSync('docs/native-requests/bypass.json', 'utf8'));
    expect(request.inputs.map((i: any) => [i.name, i.game_port, i.offset, i.bit, i.initial])).toEqual([
      ['anchorHold', 'anchorHold.occupied', 0, 0, 0], ['link', 'link.value', 4, 1, 0],
      ['bypassHold', 'bypassHold.occupied', 8, 2, 0], ['override', 'override.value', 12, 3, 0],
    ]);
    expect(request.outputs.map((o: any) => [o.name, o.offset])).toEqual([
      ['anchorPower', 0], ['bridgePower', 4], ['firewallActive', 8], ['exitReady', 12],
    ]);
    expect(request.reference_vectors).toHaveLength(16);
    for (const vector of request.reference_vectors) {
      const values = Object.fromEntries(request.inputs.map((input: any, i: number) => [input.game_port, !!(vector.case_id & (1 << i))]));
      const outputs = evaluateDraft(draft, values);
      expect(vector.inputs).toEqual(request.inputs.map((_: unknown, i: number) => (vector.case_id >> i) & 1));
      expect(vector.outputs).toEqual(request.outputs.map((o: any) => Number(outputs[o.name])));
    }
    expect(request.reference_vectors[0].outputs).toEqual([0, 0, 1, 1]);
    expect(request.outputs.map((o: any) => o.expression)).toEqual(request.outputs.map((o: any) =>
      draft.controller.kind === 'declarative' ? draft.controller.outputs[o.name] : undefined));
    expect(request.bindings.map(({ invert, resolved_signal, resolution, ...b }: any) => b)).toEqual(draft.bindings);
    expect(request.bindings.every((b: any) => b.invert === false)).toBe(true);
    for (const [path, hash] of Object.entries(request.reference_source_sha256)) {
      // The acquisition snapshot stays frozen; native registration intentionally
      // changes only the current level-definitions adapter selection.
      const frozen = `experiments/coop-controller-studies/bypass-v1/reference/${path}`;
      expect(createHash('sha256').update(readFileSync(frozen)).digest('hex'), frozen).toBe(hash);
      if (path !== 'server/level-definitions.ts')
        expect(createHash('sha256').update(readFileSync(path)).digest('hex'), path).toBe(hash);
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
