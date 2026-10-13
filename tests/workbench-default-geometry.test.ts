import { describe, expect, it } from 'vitest';
import { newDraft } from '../src/workbench/model.ts';
import { validateDraft } from '../src/workbench/validation.ts';

function firewallDraft() {
    const draft = newDraft('default-hazard');
    if (draft.controller.kind !== 'declarative') throw new Error('fixture');
    draft.controller.outputs.firewallPower = { op: 'ref', id: 'routeLever.value' };
    const lever = draft.geometry.objects.find(o => o.id === 'routeLever');
    if (lever?.type !== 'device') throw new Error('fixture');
    lever.initial = true;
    draft.geometry.objects.push({ id: 'beam', type: 'firewall', x: 300, y: 620, orientation: 'vertical', length: 60, thickness: 20 });
    draft.bindings.push({ id: 'beamPower', output: 'firewallPower', target: 'beam', property: 'active' });
    return draft;
}

describe('default-powered geometry diagnostics', () => {
    it('warns when a cube home overlaps an initially powered firewall', () => {
        const validation = validateDraft(firewallDraft());
        expect(validation.playable).toBe(true);
        expect(validation.diagnostics).toContainEqual(expect.objectContaining({ code: 'cube.hazard', severity: 'warning', objectId: 'payload', message: expect.stringContaining("'beam'") }));
    });
    it('applies destination inversion once and does not warn for an inactive beam', () => {
        const draft = firewallDraft(), binding = draft.bindings.find(b => b.id === 'beamPower')!;
        binding.invert = true;
        expect(validateDraft(draft).diagnostics.some(d => d.code === 'cube.hazard')).toBe(false);
        const lever = draft.geometry.objects.find(o => o.id === 'routeLever');
        if (lever?.type !== 'device') throw new Error('fixture');
        lever.initial = false;
        expect(validateDraft(draft).diagnostics.some(d => d.code === 'cube.hazard')).toBe(true);
    });
    it('does not evaluate unresolved or cyclic logic or invent a powered state', () => {
        for (const missing of [false, true]) {
            const draft = firewallDraft();
            if (draft.controller.kind !== 'declarative') throw new Error('fixture');
            draft.controller.outputs.firewallPower = { op: 'ref', id: missing ? 'missing.value' : 'firewallPower' };
            expect(() => validateDraft(draft)).not.toThrow();
            const validation = validateDraft(draft);
            expect(validation.playable).toBe(false);
            expect(validation.diagnostics.some(d => d.code === (missing ? 'logic.reference' : 'logic.cycle'))).toBe(true);
            expect(validation.diagnostics.some(d => d.code === 'cube.hazard')).toBe(false);
        }
    });
    it('blocks a spawn intersecting default-powered code while retaining ghost spawn space', () => {
        const draft = newDraft('powered-spawn');
        const platform = draft.geometry.objects.find(o => o.id === 'route');
        if (platform?.type !== 'platform' || draft.controller.kind !== 'declarative') throw new Error('fixture');
        Object.assign(platform, { x: 100, y: 650, w: 50, h: 30 });
        draft.controller.outputs.routePower = { op: 'const', value: true };
        expect(validateDraft(draft).diagnostics).toContainEqual(expect.objectContaining({ code: 'spawn.powered-intersection', severity: 'error', objectId: 'player1' }));
        draft.bindings.find(b => b.target === 'route')!.invert = true;
        expect(validateDraft(draft).diagnostics.some(d => d.code === 'spawn.powered-intersection')).toBe(false);
        expect(validateDraft(draft).playable).toBe(true);
    });
});
