import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { PLAYER } from '../src/engine/constants.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { parseDraft } from '../src/workbench/validation.ts';

it('the B3 baffle rejects the demonstrated B-powered climb to ASSIST before the C handoff', () => {
    const document = parseDraft(JSON.parse(readFileSync(new URL('../levels/drafts/use-after-free.json', import.meta.url), 'utf8')));
    const refuge = document.geometry.objects.find(o => o.id === 'refugeC');
    if (refuge?.type !== 'platform') throw new Error('Missing canonical C refuge');
    // Explicit section setup: C has been reached, B remains occupied, and C
    // has not been operated. This is not a full-room or multiplayer proof.
    const r = createRuntime(document, 1, { start: { x: refuge.x + refuge.w / 2, y: refuge.y - PLAYER.height / 2 } });
    r.setPartnerInputs({ 'plateB.occupied': true });
    r.step();
    // A real discovered exploit, before the baffle: these bounded inputs landed
    // on B3, reset its rope-jump budget, then reached ASSIST in 2.758 seconds.
    // Direction, jump edge, hook aim (null releases). Each action lasts 10 ticks.
    const route: readonly (readonly [-1 | 0 | 1, boolean, 'b1' | 'b2' | 'b3' | null])[] = [
        [-1, true, 'b1'], [0, false, 'b1'], [0, true, null], [1, false, 'b3'],
        [1, false, 'b1'], [0, false, 'b1'], [-1, true, 'b3'], [-1, true, 'b3'],
        [-1, true, 'b3'], [1, false, 'b1'], [1, true, null], [0, false, 'b1'],
        [0, true, 'b1'], [1, true, null], [1, false, 'b3'], [0, false, 'b1'],
        [-1, false, 'b1'], [-1, true, 'b3'], [-1, true, 'b3'], [-1, true, 'b3'],
        [0, false, 'b1'], [1, true, null], [-1, true, null], [0, false, 'b1'],
        [-1, true, 'b1'], [-1, true, 'b2'], [1, true, null], [1, true, null],
        [1, false, 'b1'], [1, true, null], [0, true, null], [0, false, 'b1'], [1, false, 'b2'],
    ];
    for (const [direction, jump, anchorId] of route) {
        const anchor = anchorId ? document.geometry.objects.find(o => o.id === anchorId) : undefined;
        if (anchorId && anchor?.type !== 'platform') throw new Error(`Missing canonical ${anchorId}`);
        const aim = anchor?.type === 'platform' ? { x: anchor.x + anchor.w / 2, y: anchor.y + 6 } : { x: 0, y: 0 };
        for (let n = 0; n < 10; n++) {
            r.step({ ...emptyInput(), left: direction < 0, right: direction > 0, jumpHeld: true,
                jumpPressed: n === 0 && jump, grappleHeld: !!anchorId, grapplePressed: n === 0 && !!anchorId, aim });
            expect(r.world.player.groundId).not.toBe('summit');
            expect(r.authority.values['assist.occupied']).toBe(false);
            expect(r.authority.outputs.exitReady).toBe(false);
        }
    }
    expect(r.authority.outputs.routeB).toBe(true);
    expect(r.authority.outputs.routeC).toBe(false);
    expect(r.world.deaths).toBe(0);
});
