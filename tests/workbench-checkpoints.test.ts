import { expect, it } from 'vitest';
import { newDraft, objectBounds, serializeDraft } from '../src/workbench/model.ts';
import { createEntity, deleteEntities, DraftHistory, duplicateEntities, ensureCheckpointMarkers } from '../src/workbench/editor-operations.ts';
import { boxesOverlap } from '../src/engine/geometry.ts';
import { validateDraft } from '../src/workbench/validation.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { emptyInput } from '../src/engine/physics.ts';

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
