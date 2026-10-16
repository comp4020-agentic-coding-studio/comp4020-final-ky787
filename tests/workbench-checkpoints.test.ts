import { expect, it } from 'vitest';
import { newDraft, objectBounds, serializeDraft } from '../src/workbench/model.ts';
import { createEntity, deleteEntities, DraftHistory, duplicateEntities, ensureCheckpointMarkers } from '../src/workbench/editor-operations.ts';
import { boxesOverlap } from '../src/engine/geometry.ts';
import { validateDraft } from '../src/workbench/validation.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { touchesBreakpoint } from '../src/slice/checkpoints.ts';
import { HeroPresentation } from '../src/slice/hero-presentation.ts';

it('places two clear, separately draggable marker centres in one undoable transaction', () => {
    const history = new DraftHistory(newDraft()), before = serializeDraft(history.document);
    history.change(d => { createEntity(d, 'breakpoint', { x: 600, y: 680 }); });
    const markers = history.document.geometry.objects.filter(o => o.type === 'checkpoint');
    expect(markers.map(o => o.slot)).toEqual([1, 2]); expect(markers.every(o => o.checkpoint === 'relay')).toBe(true);
    expect(boxesOverlap(objectBounds(markers[0]), objectBounds(markers[1]))).toBe(false);
    expect(validateDraft(history.document).playable).toBe(true);
    history.undo(); expect(serializeDraft(history.document)).toBe(before); history.redo();
    expect(history.document.geometry.objects.filter(o => o.type === 'checkpoint')).toHaveLength(2);
});
it('reuses manually placed markers through placement, duplication and pedestal deletion', () => {
    const d = newDraft();
    d.geometry.objects.push({ type: 'checkpoint', id: 'manual', checkpoint: 'relay', slot: 1, x: 100, y: 663 });
    const pedestal = createEntity(d, 'breakpoint', { x: 600, y: 680 });
    const markers = d.geometry.objects.filter(o => o.type === 'checkpoint');
    duplicateEntities(d, new Set([pedestal, ...markers.map(o => o.id)]));
    createEntity(d, 'breakpoint', { x: 900, y: 680 });
    deleteEntities(d, new Set([pedestal]));
    expect(d.geometry.objects.filter(o => o.type === 'checkpoint')).toEqual(markers);
    expect(d.geometry.objects.find(o => o.id === 'manual')).toMatchObject({ x: 100, y: 663 });
    expect(validateDraft(d).playable).toBe(true);
});
it('avoids walls, reset hazards, firewalls and conditional platforms; leaves an actionable missing marker diagnostic when blocked', () => {
    const d = newDraft();
    d.geometry.objects.push({ type: 'hazard', id: 'danger', x: 400, y: 630, w: 100, h: 50 },
        { type: 'platform', kind: 'static', id: 'wall', x: 580, y: 500, w: 60, h: 180 },
        { type: 'firewall', id: 'beam', x: 680, y: 620, orientation: 'vertical', length: 60, thickness: 20 });
    const id = createEntity(d, 'breakpoint', { x: 600, y: 680 });
    const markers = d.geometry.objects.filter(o => o.type === 'checkpoint');
    expect(markers).toHaveLength(2);
    for (const marker of markers) for (const obstacle of d.geometry.objects.filter(o => ['platform', 'hazard', 'firewall'].includes(o.type))) expect(boxesOverlap(objectBounds(marker), objectBounds(obstacle))).toBe(false);
    d.geometry.objects = d.geometry.objects.filter(o => o.type !== 'checkpoint' && !(o.type === 'platform' && o.kind === 'static'));
    const pedestal = d.geometry.objects.find(o => o.id === id)!; if (pedestal.type !== 'breakpoint') throw new Error('fixture');
    ensureCheckpointMarkers(d, pedestal);
    expect(d.geometry.objects.filter(o => o.type === 'checkpoint')).toHaveLength(0);
    expect(validateDraft(d).diagnostics.filter(e => e.code === 'checkpoint.reference')).toHaveLength(2);
});
it('a terminal activates the linked pedestal milestone without teleporting, then each slot respawns at its own marker', () => {
    const d = newDraft(); createEntity(d, 'breakpoint', { x: 600, y: 680 });
    d.geometry.objects.push({ type: 'device', id: 'commit', kind: 'terminal', checkpoint: 'relay', x: 120, y: 680 });
    for (const slot of [1, 2] as const) {
        const runtime = createRuntime(d, slot), marker = d.geometry.objects.find(o => o.type === 'checkpoint' && o.slot === slot)!;
        runtime.world.player.x = 120; // Explicit unit setup, not a gameplay route claim.
        runtime.step(); const before = runtime.world.player.x; runtime.step(emptyInput(), true);
        expect(runtime.world.checkpoint).toBe('relay'); expect(runtime.world.player.x).toBe(before);
        runtime.world.respawn(); expect(runtime.world.player.x).toBe(marker.x); expect(runtime.world.player.y).toBe(marker.y);
    }
});

it.each([1, 2] as const)('newly placed automatic breakpoint accepts Player %i walking without E, deploys once and uses that slot marker', slot => {
    const d = newDraft(); d.geometry.objects = d.geometry.objects.filter(o => o.type !== 'cube');
    createEntity(d, 'breakpoint', { x: 600, y: 680 });
    const runtime = createRuntime(d, slot), w = runtime.world, hero = new HeroPresentation();
    const state = () => ({ checkpoint: w.checkpoint, exitReady: false, completed: false });
    hero.reset(w.room, state()); hero.update(w.room, state(), 0, true);
    const cues: string[] = [];
    for (let i = 0; i < 400 && w.player.x < 720; i++) {
        const before = w.player.x; runtime.step({ ...emptyInput(), right: true });
        expect(Math.abs(w.player.x - before)).toBeLessThan(5); // Walking, never teleport activation.
        cues.push(...hero.update(w.room, state(), 1 / 120, true).map(c => c.cue));
    }
    expect(w.checkpoint).toBe('relay');
    // Re-enter and wait: the same accepted milestone cannot deploy or confirm twice.
    for (let i = 0; i < 350; i++) {
        runtime.step({ ...emptyInput(), left: w.player.x > 600 });
        cues.push(...hero.update(w.room, state(), 1 / 120, true).map(c => c.cue));
    }
    expect(cues.filter(c => c === 'breakpointDeploy')).toHaveLength(1);
    expect(cues.filter(c => c === 'breakpointConfirm')).toHaveLength(1);
    expect(hero.snapshot().breakpoints[0]).toMatchObject({ active: true, flag: 1 });
    const marker = d.geometry.objects.find(o => o.type === 'checkpoint' && o.slot === slot)!;
    w.respawn(); expect(w.player).toMatchObject({ x: marker.x, y: marker.y });
    runtime.restart(); expect(runtime.world.checkpoint).toBe('entry');
});

it('floor-level proximity rejects airborne, underneath, unrelated-floor and wall-separated contact', () => {
    const d = newDraft(); createEntity(d, 'breakpoint', { x: 600, y: 680 });
    const w = createRuntime(d).world, station = w.room.breakpoints![0];
    // Explicit contact fixtures test geometry exclusions, not full traversal.
    Object.assign(w.player, { x: 560, y: 663, grounded: true });
    expect(touchesBreakpoint(w, station)).toBe(true);
    w.player.grounded = false; expect(touchesBreakpoint(w, station)).toBe(false);
    w.player.grounded = true;
    for (const y of [700, 763, 563]) { w.player.y = y; expect(touchesBreakpoint(w, station)).toBe(false); }
    w.player.y = 663;
    w.solids.push({ id: 'partition', x: 580, y: 600, w: 8, h: 80, enabled: true, oneWay: false, grappleable: false });
    expect(touchesBreakpoint(w, station)).toBe(false);
});

it('legacy checkpoint/control documents remain readable but proximity never commits their puzzle input', () => {
    const d = newDraft(); d.geometry.objects = d.geometry.objects.filter(o => o.type !== 'cube');
    const id = createEntity(d, 'breakpoint', { x: 600, y: 680 });
    const station = d.geometry.objects.find(o => o.id === id)!;
    if (station.type !== 'breakpoint') throw new Error('fixture');
    station.activationControl = 'commit';
    d.geometry.objects.find(o => o.id === 'routeLever')!.x = 1000;
    d.geometry.objects.push({ type: 'device', id: 'commit', kind: 'terminal', checkpoint: 'relay', x: 600, y: 680 });
    const runtime = createRuntime(d);
    for (let i = 0; i < 400 && runtime.world.player.x < 600; i++) runtime.step({ ...emptyInput(), right: true });
    expect(runtime.world.checkpoint).toBe('relay'); expect(runtime.authority.values['commit.value']).toBe(false);
    runtime.step(emptyInput(), true); expect(runtime.authority.values['commit.value']).toBe(true);
    // The legacy visual association must not make an obsolete terminal mandatory.
    deleteEntities(d, new Set(['commit']));
    expect(validateDraft(d).playable).toBe(true);
    const edited = createRuntime(d);
    for (let i = 0; i < 400 && edited.world.player.x < 600; i++) edited.step({ ...emptyInput(), right: true });
    expect(edited.world.checkpoint).toBe('relay');
});
