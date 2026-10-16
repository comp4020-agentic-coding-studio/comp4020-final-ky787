/** Declarative automation only; no JavaScript strings, teleports or output writes in steps. */
export interface ScenarioCondition { path: string; equals?: string | number | boolean | null; min?: number; max?: number }
export type ScenarioAction = { type: 'key'; actor: string; code: 'KeyA' | 'KeyD' | 'KeyE' | 'KeyR' | 'Space' | 'Tab' | 'KeyS'; down: boolean }
    | { type: 'tap'; actor: string; code: 'KeyE' | 'KeyR' | 'Space' }
    | { type: 'walk'; actor: string; x: number; timeoutMs?: number }
    | { type: 'grapple'; actor: string; target?: string; down: boolean };
export interface ScenarioStep { label: string; capture?: string; actions?: ScenarioAction[]; waitMs?: number; wait?: { actor: string; condition: ScenarioCondition; timeoutMs: number }; assert?: { actor: string; condition: ScenarioCondition }[] }
export interface DraftScenario { version: 1; id: string; scope: 'full-room' | 'section-only' | 'diagnostic'; mode: 'single' | 'coop'; timeoutMs: number;
    actors: { id: string; slot: 1 | 2; start?: { marker?: string; at?: { x: number; y: number } } }[]; steps: ScenarioStep[] }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(`Invalid scenario: ${message}`); }
function keys(v: Record<string, unknown>, allowed: string[], path: string) { check(Object.keys(v).every(k => allowed.includes(k)), `${path} contains unsupported fields`); }
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function parseScenario(value: unknown): DraftScenario {
    check(record(value), 'expected an object'); keys(value, ['version', 'id', 'scope', 'mode', 'timeoutMs', 'actors', 'steps'], 'scenario');
    check(value.version === 1 && typeof value.id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value.id), 'version 1 and valid id required');
    check(['full-room', 'section-only', 'diagnostic'].includes(String(value.scope)), 'explicit scope required');
    check(value.mode === 'single' || value.mode === 'coop', 'mode must be single or coop');
    check(finite(value.timeoutMs) && value.timeoutMs >= 100 && value.timeoutMs <= 300000, 'timeoutMs must be 100..300000');
    check(Array.isArray(value.actors) && value.actors.length === (value.mode === 'coop' ? 2 : 1), 'single uses one actor, coop uses two distinct actors');
    const actors = new Set<string>(), slots = new Set<number>();
    for (const a of value.actors) {
        check(record(a), 'actor object required'); keys(a, ['id', 'slot', 'start'], 'actor');
        check(typeof a.id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(a.id) && !actors.has(a.id), 'actor IDs must be valid and distinct');
        check((a.slot === 1 || a.slot === 2) && !slots.has(a.slot), 'distinct player slots required'); actors.add(a.id); slots.add(a.slot);
        if (a.start !== undefined) {
            check(value.mode === 'single' && value.scope !== 'full-room', 'diagnostic start markers are supported only in section-only/diagnostic local physics tests');
            check(record(a.start), 'start object required'); keys(a.start, ['marker', 'at'], 'start');
            check((typeof a.start.marker === 'string') !== (a.start.at !== undefined), 'start needs exactly one marker or at');
            if (a.start.at !== undefined) { check(record(a.start.at), 'start.at point required'); keys(a.start.at, ['x', 'y'], 'start.at'); check(finite(a.start.at.x) && finite(a.start.at.y), 'start.at requires finite x/y'); }
        }
    }
    check(Array.isArray(value.steps) && value.steps.length > 0 && value.steps.length <= 128, 'steps must contain 1..128 entries');
    const condition = (v: unknown) => {
        check(record(v), 'condition object required'); keys(v, ['path', 'equals', 'min', 'max'], 'condition');
        check(typeof v.path === 'string' && /^(player|cubes|signals|controls|plates|exitUnlocked|completed|session)(\.[A-Za-z0-9_:-]+)*$/.test(v.path) && !v.path.split('.').some(p => ['__proto__', 'prototype', 'constructor'].includes(p)), 'condition path must identify an observable field');
        check(Object.hasOwn(v, 'equals') || finite(v.min) || finite(v.max), 'condition needs equals, min or max');
        if (Object.hasOwn(v, 'equals')) check(v.equals === null || ['string', 'boolean'].includes(typeof v.equals) || finite(v.equals), 'equals must be scalar');
        if (v.min !== undefined) check(finite(v.min), 'finite min required'); if (v.max !== undefined) check(finite(v.max), 'finite max required');
    };
    for (const step of value.steps) {
        check(record(step), 'step object required'); keys(step, ['label', 'capture', 'actions', 'waitMs', 'wait', 'assert'], 'step'); check(typeof step.label === 'string' && step.label.length <= 180, 'step label required');
        if (step.capture !== undefined) check(typeof step.capture === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(step.capture), 'capture must be a bounded filename slug');
        if (step.waitMs !== undefined) check(finite(step.waitMs) && step.waitMs >= 0 && step.waitMs <= 10000, 'waitMs must be 0..10000');
        if (step.actions !== undefined) {
            check(Array.isArray(step.actions) && step.actions.length <= 16, 'at most 16 actions per step');
            for (const action of step.actions) {
                check(record(action) && typeof action.actor === 'string' && actors.has(action.actor), 'action actor must exist');
                if (action.type === 'key' || action.type === 'tap') { keys(action, ['type', 'actor', 'code', ...(action.type === 'key' ? ['down'] : [])], 'key action'); check(['KeyA', 'KeyD', 'KeyE', 'KeyR', 'Space', 'Tab', 'KeyS'].includes(String(action.code)), 'unsupported key'); if (action.type === 'key') check(typeof action.down === 'boolean', 'key.down required'); }
                else if (action.type === 'walk') { keys(action, ['type', 'actor', 'x', 'timeoutMs'], 'walk'); check(finite(action.x), 'walk.x must be finite'); if (action.timeoutMs !== undefined) check(finite(action.timeoutMs) && action.timeoutMs > 0 && action.timeoutMs <= 30000, 'walk timeout bounded to 30000ms'); }
                else if (action.type === 'grapple') { keys(action, ['type', 'actor', 'target', 'down'], 'grapple'); check(typeof action.down === 'boolean' && (!action.down || typeof action.target === 'string'), 'grapple down requires target'); }
                else throw new Error(`Invalid scenario: unsupported action ${String(action.type)}`);
            }
        }
        const assertion = (a: unknown) => { check(record(a), 'assertion object required'); check(typeof a.actor === 'string' && actors.has(a.actor), 'assertion actor must exist'); condition(a.condition); };
        if (step.wait !== undefined) { assertion(step.wait); check(record(step.wait), 'wait'); keys(step.wait, ['actor', 'condition', 'timeoutMs'], 'wait'); check(finite(step.wait.timeoutMs) && step.wait.timeoutMs > 0 && step.wait.timeoutMs <= 30000, 'wait timeout must be 1..30000'); }
        if (step.assert !== undefined) { check(Array.isArray(step.assert) && step.assert.length <= 32, 'at most 32 assertions'); for (const a of step.assert) { assertion(a); keys(a as Record<string, unknown>, ['actor', 'condition'], 'assertion'); } }
    }
    // This cast follows an exhaustive field/discriminant check above.
    return value as unknown as DraftScenario;
}
export function conditionMatches(observation: unknown, condition: ScenarioCondition): boolean {
    let value: unknown = observation;
    for (const part of condition.path.split('.')) { if (!record(value) && !Array.isArray(value)) return false; value = Object.hasOwn(value, part) ? (value as Record<string, unknown>)[part] : undefined; }
    return (!Object.hasOwn(condition, 'equals') || value === condition.equals) && (condition.min === undefined || typeof value === 'number' && value >= condition.min) && (condition.max === undefined || typeof value === 'number' && value <= condition.max);
}
