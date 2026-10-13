import { describe, expect, it } from 'vitest';
import { newDraft, serializeDraft } from '../src/workbench/model.ts';
import { DraftHistory, connectDevice, createEntity, deleteEntities, duplicateEntities, renameEntity, translateEntities } from '../src/workbench/editor-operations.ts';
import { evaluateDraft } from '../src/workbench/evaluate.ts';
import { validateDraft } from '../src/workbench/validation.ts';

describe('workbench editor document operations', () => {
    it('records one undo transaction for a whole move gesture and clears redo on a fresh edit', () => {
        const start = newDraft('history'), history = new DraftHistory(start), before = structuredClone(history.document);
        for (let i = 0; i < 150; i++) history.document.geometry.objects[0].x += 1;
        history.commit(history.document, before);
        expect(history.document.geometry.objects[0].x).toBe(270);
        expect(history.undo()).toBe(true); expect(serializeDraft(history.document)).toBe(serializeDraft(start));
        expect(history.undo()).toBe(false); expect(history.redo()).toBe(true);
        history.undo(); history.change(d => { d.title = 'Changed'; }); expect(history.canRedo).toBe(false);
    });
    it('duplicates selected logic dependency trees and remaps internal controls without breaking external references', () => {
        const draft = newDraft('duplicate');
        const ids = duplicateEntities(draft, new Set(['powerPlate', 'route']), { x: 100, y: 0 });
        expect(ids).toEqual(['powerPlate_copy', 'route_copy']);
        expect(draft.geometry.objects.find(o => o.id === 'powerPlate_copy')?.x).toBe(540);
        const binding = draft.bindings.find(b => b.target === 'route_copy')!;
        expect(binding.output).toBe('routePower_copy');
        if (draft.controller.kind !== 'declarative') throw new Error('fixture');
        expect(draft.controller.outputs.routePower_copy).toEqual({ op: 'and', args: [{ op: 'ref', id: 'powerPlate_copy.occupied' }, { op: 'not', arg: { op: 'ref', id: 'routeLever.value' } }] });
        expect(draft.presentation.wires.find(w => w.binding === binding.id)?.points[0].x).toBe(540);
        expect(evaluateDraft(draft, { 'powerPlate_copy.occupied': true, 'routeLever.value': false })).toMatchObject({ routePower: false, routePower_copy: true });
        expect(validateDraft(draft).playable).toBe(true);
    });
    it('copies multiple relay pairs to fresh independent pair IDs', () => {
        const draft = newDraft('relay-copy'); createEntity(draft, 'relay', { x: 20, y: 200 }); createEntity(draft, 'relay', { x: 620, y: 200 });
        const originals = draft.geometry.objects.filter(o => o.type === 'relay');
        const copies = duplicateEntities(draft, new Set(originals.map(o => o.id)));
        const pairs = draft.geometry.objects.flatMap(o => o.type === 'relay' && copies.includes(o.id) ? [o.pair] : []);
        expect(new Set(pairs).size).toBe(2); expect(pairs.filter(p => p === pairs[0])).toHaveLength(2);
        expect(originals.some(o => pairs.includes(o.pair))).toBe(false);
    });
    it('device connection creates actual typed logic and a separate visible route', () => {
        const draft = newDraft('connect'), target = createEntity(draft, 'code', { x: 300, y: 220 });
        connectDevice(draft, 'routeLever', target);
        const binding = draft.bindings.find(b => b.target === target)!;
        expect(binding.property).toBe('active'); expect(draft.presentation.wires.some(w => w.binding === binding.id)).toBe(true);
        const before = evaluateDraft(draft, { 'routeLever.value': true });
        const wire = draft.presentation.wires.find(w => w.binding === binding.id)!;
        translateEntities(draft, new Set([wire.id]), { x: 800, y: -400 });
        expect(evaluateDraft(draft, { 'routeLever.value': true })).toEqual(before);
        expect(before[binding.output]).toBe(true);
    });
    it('rename preserves device expression and saved-state meaning; deletion keeps dangling source diagnostics', () => {
        const draft = newDraft('rename'); renameEntity(draft, 'powerPlate', 'cargoPlate');
        expect(draft.previewStates['left-powered']['cargoPlate.occupied']).toBe(true);
        expect(evaluateDraft(draft, draft.previewStates['left-powered']).routePower).toBe(true);
        deleteEntities(draft, new Set(['cargoPlate']));
        expect(validateDraft(draft).playable).toBe(false);
        expect(validateDraft(draft).diagnostics.some(d => d.severity === 'error' && d.message.includes('cargoPlate'))).toBe(true);
    });
    it('numeric draft mutations preserve drawing order and keep history snapshots independent', () => {
        const history = new DraftHistory(newDraft('order')), before = serializeDraft(history.document);
        history.change(d => translateEntities(d, new Set(['route', 'payload']), { x: 20, y: -40 }));
        expect(history.document.geometry.objects.map(o => o.id)).toEqual(newDraft().geometry.objects.map(o => o.id));
        history.undo(); expect(serializeDraft(history.document)).toBe(before);
    });
});
