import { describe, it, expect } from 'vitest';
import { parseScenario, conditionMatches } from '../scripts/level-tools/scenario.ts';
const base = () => ({ version: 1, id: 'test', scope: 'diagnostic', mode: 'single', timeoutMs: 1000, actors: [{ id: 'p1', slot: 1 }], steps: [{ label: 'observe', assert: [{ actor: 'p1', condition: { path: 'player.x', min: 100 } }] }] });
describe('bounded workbench scenarios', () => {
    it('accepts only typed real controls and observable scalar conditions', () => {
        expect(parseScenario(base()).steps).toHaveLength(1);
        expect(conditionMatches({ player: { x: 120 } }, { path: 'player.x', min: 100, max: 140 })).toBe(true);
        expect(conditionMatches({ player: { x: 20 } }, { path: 'player.x', min: 100 })).toBe(false);
        expect(conditionMatches({ player: {} }, { path: 'player.x', equals: null })).toBe(false);
        expect(() => parseScenario({ ...base(), steps: [{ label: 'cheat', actions: [{ type: 'teleport', actor: 'p1', x: 99 }] }] })).toThrow('unsupported action');
        expect(() => parseScenario({ ...base(), steps: [{ label: 'script', eval: 'win()' }] })).toThrow('unsupported fields');
    });
    it('captures named milestones without accepting paths or executable actions', () => {
        expect(parseScenario({ ...base(), steps: [{ label: 'powered', capture: 'powered-02' }] }).steps[0].capture).toBe('powered-02');
        for (const capture of ['../escape', '/tmp/image', 'x.png', 'a'.repeat(65)]) expect(() => parseScenario({ ...base(), steps: [{ label: 'invalid', capture }] })).toThrow('capture');
    });
    it('rejects unbounded waits, unknown actors, duplicate identities and invalid diagnostic setup', () => {
        expect(() => parseScenario({ ...base(), timeoutMs: Infinity })).toThrow();
        expect(() => parseScenario({ ...base(), steps: [{ label: 'wait', wait: { actor: 'ghost', condition: { path: 'completed', equals: true }, timeoutMs: 300 } }] })).toThrow();
        expect(() => parseScenario({ ...base(), mode: 'coop', actors: [{ id: 'p1', slot: 1 }, { id: 'p2', slot: 1 }] })).toThrow();
        expect(() => parseScenario({ ...base(), scope: 'full-room', actors: [{ id: 'p1', slot: 1, start: { marker: 'nearExit' } }] })).toThrow();
        expect(() => parseScenario({ ...base(), steps: [{ label: 'prototype', assert: [{ actor: 'p1', condition: { path: 'player.__proto__', equals: true } }] }] })).toThrow();
    });
});
