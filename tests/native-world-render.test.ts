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
    it('renders exact native instruction strings and a fixed store annotation even while output is zero', () => {
        const f = fixture();
        const panels = f.renderer.draw(f.c, f.world, f.evidence, view, 1, .016, true);
        expect(panels).toHaveLength(4);
        const crossing = panels.find(p => p.output === 'crossingPower')!;
        expect(crossing.raw).toBe(false); expect(crossing.physical).toBe(false);
        expect(f.painted).toContain('STATIC / WRITE 1');
        for (const i of crossing.instructions) expect(f.painted).toContain(`${i.mnemonic} ${i.op_str}`.trim());
        expect(f.painted.some(v => /executed|bogus/i.test(v))).toBe(false);
        f.evidence.state!.outputs = { ...f.evidence.state!.outputs, crossingPower: true };
        const on = f.renderer.draw(f.c, f.world, f.evidence, view, 1, .016, true).find(p => p.output === 'crossingPower')!;
        expect(on.raw).toBe(true); expect(on.instructions).toEqual(crossing.instructions);
    });
    it('collapses below reading zoom and culls outside the viewport', () => {
        const f = fixture();
        const compact = f.renderer.draw(f.c, f.world, f.evidence, view, .25, .016, true);
        expect(compact.length).toBeGreaterThan(0);
        expect(compact.every(p => !p.expanded && p.instructions.length === 0)).toBe(true);
        expect(f.painted.some(text => text.startsWith('mov '))).toBe(false);
        expect(f.renderer.draw(f.c, f.world, f.evidence, { x: 5000, y: 5000, w: 100, h: 100 }, 1, .016, true)).toEqual([]);
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
});
