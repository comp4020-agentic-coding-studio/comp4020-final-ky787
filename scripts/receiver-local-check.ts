/** Local developer multiplayer uses the same renderer through the agent CLI scenario path. */
import { join } from 'node:path';
import { runScenario } from './level-tools/browser-tools.ts';
import { receiverReview } from './fixtures/receiver-review.ts';
import type { DraftScenario, ScenarioStep } from './level-tools/scenario.ts';

const walk = (x: number): ScenarioStep => ({ label: `Walk to ${x}`, actions: [{ type: 'walk', actor: 'host', x }], waitMs: 220 });
const use = (label: string): ScenarioStep => ({ label, actions: [{ type: 'tap', actor: 'host', code: 'KeyE' }] });
const state = (on: boolean, label: string, capture: string): ScenarioStep => ({ label, capture, waitMs: 150,
    wait: { actor: 'host', condition: { path: 'plates.draft:receiver1', equals: on }, timeoutMs: 4000 },
    assert: ['host', 'partner'].map(actor => ({ actor, condition: { path: 'plates.draft:receiver1', equals: on } })) });
const scenario: DraftScenario = { version: 1, id: 'receiver-local-contact', scope: 'diagnostic', mode: 'coop', timeoutMs: 45000,
    actors: [{ id: 'host', slot: 1 }, { id: 'partner', slot: 2 }], steps: [
        { label: 'Authored fixture start', waitMs: 300 }, walk(800), state(false, 'Player cannot occupy receiver', 'empty'),
        walk(1210), use('Pick up cargo'), walk(920), use('Put down cargo'), state(true, 'Accepted cube contact', 'connected'),
        { label: 'Settled powered dock', waitMs: 1200, capture: 'powered' },
        walk(855), use('Remove cargo'), state(false, 'Accepted removal', 'release'),
    ] };
const report = await runScenario(receiverReview(), scenario, join(process.env.BN_SHOTS ?? '.workbench/reports/2026-10-16-payload-energy', 'local'));
if (!report.pass) throw new Error(report.error ?? 'Local receiver scenario failed');
for (const [label, active] of [['Player cannot occupy receiver', false], ['Accepted cube contact', true], ['Accepted removal', false]] as const) {
    const observed = report.results.find(r => r.label === label)!.observed as Record<string, { cubes: Record<string, { x: number; y: number }>; heroAssets: { receivers: { active: boolean; dock: { cube: string; x: number; y: number } | null }[] } }>;
    if (!Object.values(observed).every(s => s.heroAssets.receivers[0].active === active)) throw new Error(`Local receiver rendering disagrees: ${label}`);
    if (active && !Object.values(observed).every(s => s.heroAssets.receivers[0].dock?.cube === 'draft:cargoA'
        && s.heroAssets.receivers[0].dock?.x === 800 && s.cubes['draft:cargoA'].x === 800 && s.cubes['draft:cargoA'].y === 598))
        throw new Error('Local developer clients must share the centred body and visible pose');
}
console.log('PASS local CLI two-player contact: player exclusion, accepted cube, live removal and matching centred bodies/receiver visuals on both clients');
