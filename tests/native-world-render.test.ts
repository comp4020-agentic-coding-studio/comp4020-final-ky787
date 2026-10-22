import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { NativeWorldRenderer } from '../src/slice/native-world-render.ts';
import { raceCondition } from '../src/coop/race-condition.ts';
import { NativeWorldEvidence } from '../src/coop/native-world-evidence.ts';
import type { NativeWorldArtifact } from '../src/coop/native-world-types.ts';
import type { PuzzleWorld } from '../src/slice/world.ts';

function fixture() {
    const evidence = new NativeWorldEvidence();
    evidence.data = JSON.parse(readFileSync('public/evidence/coop/handshake.world.json', 'utf8')) as NativeWorldArtifact;
    evidence.state = { chamber: 'handshake', levelInstance: 1, revision: 1, connected: true,
        outputs: { crossingPower: false, liftPower: false, relayPower: false, exitReady: false }, physical: {}, exitUnlocked: false };
    const painted: string[] = [];
    const c = { save() {}, restore() {}, fillRect() {}, strokeRect() {}, fillText(value: string) { painted.push(value); } } as unknown as CanvasRenderingContext2D;
    // The rendering boundary deliberately requires only the room identity, not physics/frame outputs.
    const world = { room: { id: 'handshake' } } as PuzzleWorld;
    return { evidence, painted, c, world, renderer: new NativeWorldRenderer() };
}
const view = { x: 0, y: 0, w: 2300, h: 1400 };
describe('native world presentation is bounded static decoration', () => {
    it('retains HANDSHAKE fixed-write-one evidence/header identity while raw output changes', () => {
        const f = fixture(), excerpt = structuredClone(f.evidence.data!.outputs[0].excerpt);
        expect(excerpt.instructions.at(-1)?.op_str).toBe('dword ptr [rax], 1');
        const off = f.renderer.header(f.evidence, 'handshake', 'draft:nearAnchor');
        expect(off?.powered).toBe(false);
        f.evidence.state!.outputs = { ...f.evidence.state!.outputs, crossingPower: true };
        const on = f.renderer.header(f.evidence, 'handshake', 'draft:nearAnchor');
        expect(on?.powered).toBe(true); expect(on?.address).toBe(off?.address);
        expect(f.evidence.data!.outputs[0].excerpt).toEqual(excerpt);
    });
    it('suppresses all 25 superseded diagnostics even at overview zoom or evidence failure', () => {
        const f = fixture();
        for (const chamber of ['handshake', 'crossfeed-vault', 'deadlock', 'use-after-free'] as const) {
            f.evidence.data = JSON.parse(readFileSync(`public/evidence/coop/${chamber}.world.json`, 'utf8'));
            f.evidence.state!.chamber = chamber;
            for (const zoom of [.25, .8, 1.2]) {
                expect(f.renderer.draw(f.c, { room: { id: chamber } } as PuzzleWorld, f.evidence, view, zoom, .016, true)).toEqual([]);
            }
            f.evidence.data = null;
            expect(f.renderer.draw(f.c, { room: { id: chamber } } as PuzzleWorld, f.evidence, view, 1, .016, true)).toEqual([]);
        }
        expect(f.painted).toEqual([]);
    });
    it('does not expose a previous specimen in another chamber or ordinary labels on failure', () => {
        const f = fixture();
        expect(f.renderer.draw(f.c, { room: { id: 'deadlock' } } as PuzzleWorld, f.evidence, view, 1, .016, true)).toEqual([]);
        expect(f.renderer.header(f.evidence, 'deadlock', 'draft:nearAnchor')).toBeNull();
        f.evidence.data = null;
        expect(f.renderer.header(f.evidence, 'handshake', 'draft:nearAnchor')).toBeNull();
        expect(f.renderer.draw(f.c, f.world, f.evidence, view, 1, .016, true)).toEqual([]);
    });
    it('presents spanMaster as a verified wire signal without inventing physical power', () => {
        const f = fixture();
        f.evidence.data = JSON.parse(readFileSync('public/evidence/coop/race-condition.world.json', 'utf8'));
        f.evidence.state = { chamber: 'race-condition', levelInstance: 2, revision: 3, connected: true,
            outputs: { spanMaster: true }, physical: {}, exitUnlocked: false };
        const world = { room: raceCondition(1) } as PuzzleWorld;
        const panel = f.renderer.draw(f.c, world, f.evidence, view, 1, .016, true).find(p => p.output === 'spanMaster');
        expect(panel).toMatchObject({ objectId: 'receiver-master', raw: true, physical: null, static: true });
        expect(f.painted).toContain('RAW 1 · SIGNAL ON');
        expect(f.evidence.data!.outputs.find(o => o.name === 'spanMaster')!.bindings).toEqual([]);
        world.room.wires = world.room.wires!.filter(w => w.id !== 'receiver-master');
        expect(f.renderer.draw(f.c, world, f.evidence, view, 1, .016, true).some(p => p.output === 'spanMaster')).toBe(false);
    });
    it('shared platform headers retain the same native identity and accepted status', () => {
        const f = fixture();
        const near = f.renderer.header(f.evidence, 'handshake', 'draft:nearAnchor');
        expect(near).toEqual(f.renderer.header(f.evidence, 'handshake', 'draft:farAnchor'));
        expect(near?.powered).toBe(false);
        f.evidence.state!.connected = false;
        expect(f.renderer.header(f.evidence, 'handshake', 'draft:nearAnchor')?.powered).toBeNull();
    });
    it('suppresses only cargo replacements and keeps the other RACE panels at their original placements', () => {
        const f = fixture();
        f.evidence.data = JSON.parse(readFileSync('public/evidence/coop/race-condition.world.json', 'utf8'));
        f.evidence.state = { chamber: 'race-condition', levelInstance: 2, revision: 3, connected: true,
            outputs: {}, physical: {}, exitUnlocked: false };
        const world = { room: raceCondition(1) } as PuzzleWorld;
        const panels = f.renderer.draw(f.c, world, f.evidence, { ...view, w: 4200 }, 1, .016, true, true);
        expect(panels.map(p => p.output)).toEqual(['spanMaster', 'phaseA', 'phaseB', 'returnBridge', 'exitDoor']);
        expect(panels.map(p => [p.bounds.x, p.bounds.y])).toEqual([[740, 540], [900, 390], [1420, 400], [2520, 760], [3500, 570]]);
        expect(f.renderer.draw(f.c, world, f.evidence, { ...view, w: 4200 }, 1, .016, true, true, true)).toEqual([]);
    });
});
