import { describe, expect, it } from 'vitest';
import { newDraft, serializeDraft, type DraftPlatform } from '../src/workbench/model.ts';
import { createEntity, connectDevice, entityBounds } from '../src/workbench/editor-operations.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { validateDraft } from '../src/workbench/validation.ts';
import { publicTemplate } from '../src/workbench/templates.ts';
import { importDraft } from '../src/workbench/imports.ts';

const code = (draft = newDraft()) => draft.geometry.objects.find(o => o.id === 'route') as DraftPlatform;
describe('shared code-platform activation', () => {
    it('new code is immediately solid and hookable in the actual engine without a binding', () => {
        const draft = newDraft(), id = createEntity(draft, 'code', { x: 500, y: 350 });
        expect(validateDraft(draft).playable).toBe(true);
        const runtime = createRuntime(draft), platform = runtime.world.platforms.find(p => p.def.id === id)!;
        expect(platform.solid.enabled).toBe(true); expect(platform.solid.grappleable).toBe(true);
        runtime.preview({}); expect(platform.solid.enabled).toBe(true);
        expect(draft.bindings.some(b => b.target === id)).toBe(false);
        expect(JSON.parse(serializeDraft(draft)).geometry.objects.find((o: DraftPlatform) => o.id === id).activation).toBe('always-powered');
    });
    it('legacy v1 omissions remain controlled, including missing bindings', () => {
        const draft = newDraft(); expect(code(draft).activation).toBeUndefined();
        const runtime = createRuntime(draft), platform = runtime.world.platforms.find(p => p.def.id === 'route')!;
        expect(platform.solid.enabled).toBe(false);
        runtime.preview({ 'powerPlate.occupied': true }); expect(platform.solid.enabled).toBe(true);
        draft.bindings = draft.bindings.filter(b => b.target !== 'route'); draft.presentation.wires = [];
        expect(validateDraft(draft).diagnostics.some(d => d.code === 'binding.required' && d.objectId === 'route')).toBe(true);
        expect(() => createRuntime(draft)).toThrow();
    });
    it('inactive code is ghosted and cannot catch hooks, even with forced outputs', () => {
        const draft = publicTemplate(), p = code(draft); p.activation = 'always-inactive';
        expect(validateDraft(draft).playable).toBe(true);
        const runtime = createRuntime(draft); runtime.preview({}, { exitReady: true });
        const solid = runtime.world.platforms.find(p => p.def.id === 'route')!.solid;
        expect(solid.enabled).toBe(false); expect(solid.grappleable).toBe(false);
    });
    it('connecting changes constant code to signal mode; deleting its binding stays a blocking error', () => {
        const draft = publicTemplate(); connectDevice(draft, 'powerPlate', 'route');
        expect(code(draft).activation).toBe('signal'); expect(validateDraft(draft).playable).toBe(true);
        draft.bindings = draft.bindings.filter(b => b.target !== 'route');
        expect(validateDraft(draft).playable).toBe(false);
    });
    it('rejects ambiguous bindings, unknown modes and activation on architecture', () => {
        const draft = newDraft(); code(draft).activation = 'always-powered';
        expect(validateDraft(draft).diagnostics.some(d => d.code === 'binding.activation')).toBe(true);
        code(draft).activation = 'execute-code' as never; expect(validateDraft(draft).structural).toBe(false);
        code(draft).activation = 'always-powered'; code(draft).kind = 'static'; expect(validateDraft(draft).structural).toBe(false);
    });
    it('includes constant powered slabs in spawn intersection checks', () => {
        const draft = publicTemplate(); Object.assign(code(draft), { x: 100, y: 650, w: 100, h: 30 });
        expect(validateDraft(draft).diagnostics.some(d => d.code === 'spawn.powered-intersection')).toBe(true);
    });
    it('supports constant powered code in a retained built-in mock controller', () => {
        const draft = importDraft('relay-lab'), id = createEntity(draft, 'code', { x: 500, y: 180 });
        expect(validateDraft(draft).playable).toBe(true);
        const runtime = createRuntime(draft), solid = runtime.world.platforms.find(p => p.def.id === id)!.solid;
        expect(solid.enabled).toBe(true); expect(solid.grappleable).toBe(true);
    });
    it('both public templates validate and are independent copies', () => {
        for (const id of ['beginner', 'signals']) {
            const draft = publicTemplate(id); expect(validateDraft(draft).playable).toBe(true); createRuntime(draft);
            draft.title = 'edit'; expect(publicTemplate(id).title).not.toBe('edit');
        }
    });
    it('rejects fabricated evidence and executable expressions; incomplete camera references cannot recurse', () => {
        const draft = publicTemplate();
        expect(validateDraft({ ...draft, evidence: { source: 'validated-ollvm' } }).structural).toBe(false);
        expect(validateDraft({ ...draft, controller: { kind: 'declarative', outputs: { exploit: { op: 'eval', code: 'alert(1)' } } } }).structural).toBe(false);
        draft.presentation.cameraReveals.push({ id: 'recursive', source: 'powerPlate', platformIds: ['recursive'] });
        expect(validateDraft(draft).playable).toBe(false); expect(entityBounds(draft, 'recursive')).toBeUndefined();
    });
});
