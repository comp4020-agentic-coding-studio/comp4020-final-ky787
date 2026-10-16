import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { newDraft, type DraftDocument } from '../src/workbench/model.ts';
import { evaluateDraft } from '../src/workbench/evaluate.ts';
import { createRuntime } from '../src/workbench/runtime.ts';
import { emptyInput } from '../src/engine/physics.ts';

const report = '.workbench/reports/2026-10-16-chambers/deadlock';
function clearanceFixture(): DraftDocument {
    const d = newDraft('deadlock-clearance-diagnostic');
    d.geometry = { width: 1000, height: 700, objects: [
        { type: 'spawn', id: 'p1', slot: 1, x: 100, y: 583 }, { type: 'spawn', id: 'p2', slot: 2, x: 50, y: 583 },
        { type: 'platform', id: 'floor', kind: 'static', x: 0, y: 600, w: 1000, h: 100 },
        { type: 'platform', id: 'serviceRoof', kind: 'static', x: 200, y: 100, w: 300, h: 462, blocksCubeInteraction: true },
        { type: 'cube', id: 'payload', x: 100, y: 578, mark: 'D' },
        { type: 'exit', id: 'exit', x: 900, y: 450, w: 80, h: 150, latch: true, arrivals: 2 },
    ] };
    d.controller = { kind: 'declarative', outputs: { closed: { op: 'const', value: false } } };
    d.bindings = [{ id: 'exitBind', output: 'closed', target: 'exit', property: 'unlock' }];
    d.previewStates = { idle: {} };
    d.presentation = { display: { x: 700, y: 250 }, labels: [], wires: [], cameraReveals: [] };
    return d;
}

describe('DEADLOCK isolated real-engine diagnostics (not route completion)', () => {
    it('admits a bare player and rejects the carried payload at 38px clearance', () => {
        const run = (carry: boolean) => {
            const r = createRuntime(clearanceFixture());
            for (let i = 0; i < 3; i++) r.step();
            if (carry) r.step(emptyInput(), true);
            for (let i = 0; i < 160; i++) r.step({ ...emptyInput(), right: true });
            return r.snapshot();
        };
        const bare = run(false), carried = run(true);
        mkdirSync(report, { recursive: true });
        writeFileSync(`${report}/clearance-after.json`, JSON.stringify({ scope: 'isolated diagnostic, not room proof', clearance: 38, playerHeight: 34, cubeHeight: 44, carriedAssemblyHeight: 82, bare, carried }, null, 2) + '\n');
        expect(bare.player.x).toBeGreaterThan(500);
        expect(carried.player.x).toBeLessThanOrEqual(178.01);
        expect(carried.cubes['draft:payload'].carried).toBe(true);
    });
});

function shaftFixture(): DraftDocument {
    const d = newDraft('deadlock-shaft-diagnostic');
    d.geometry = { width: 1800, height: 3100, objects: [
        { type: 'spawn', id: 'p1', slot: 1, x: 400, y: 2983 }, { type: 'spawn', id: 'p2', slot: 2, x: 1500, y: 2983 },
        { type: 'platform', id: 'lowerFloor', kind: 'static', x: 0, y: 3000, w: 1800, h: 100 },
        { type: 'platform', id: 'gallery', kind: 'static', x: 720, y: 1000, w: 1080, h: 28 },
        { type: 'platform', id: 'hatch', kind: 'static', x: 600, y: 1000, w: 120, h: 28, blocksCubeInteraction: true },
        { type: 'platform', id: 'lowerRoof', kind: 'static', x: 485, y: 2600, w: 115, h: 362, blocksCubeInteraction: true },
        { type: 'platform', id: 'upperRoof', kind: 'static', x: 850, y: 800, w: 110, h: 162, blocksCubeInteraction: true },
        { type: 'device', id: 'feed', kind: 'plate', x: 400, y: 3000 },
        { type: 'device', id: 'safe', kind: 'plate', x: 1500, y: 3000 },
        { type: 'device', id: 'hatchToggle', kind: 'toggle', x: 815, y: 1000, initial: true },
        { type: 'lift', id: 'cargoField', x: 600, y: 80, w: 120, h: 2920 },
        { type: 'relay', id: 'serviceLower', pair: 'personnel', x: 550, y: 2962, w: 32, h: 38, exitSide: -1 },
        { type: 'relay', id: 'serviceUpper', pair: 'personnel', x: 900, y: 962, w: 32, h: 38, exitSide: -1 },
        { type: 'cube', id: 'payload', x: 660, y: 2978, mark: 'D' },
        { type: 'exit', id: 'exit', x: 1700, y: 860, w: 80, h: 140, latch: true, arrivals: 2 },
    ] };
    const ref = (id: string) => ({ op: 'ref' as const, id });
    d.controller = { kind: 'declarative', outputs: { cargoLift: { op: 'and', args: [ref('feed.occupied'), ref('safe.occupied')] }, serviceRelay: { op: 'and', args: [ref('safe.occupied'), { op: 'not', arg: ref('feed.occupied') }] }, hatchOpen: ref('hatchToggle.value'), closed: { op: 'const', value: false } } };
    d.bindings = [{ id: 'liftBind', output: 'cargoLift', target: 'cargoField', property: 'power' }, { id: 'lowerBind', output: 'serviceRelay', target: 'serviceLower', property: 'power' }, { id: 'upperBind', output: 'serviceRelay', target: 'serviceUpper', property: 'power' }, { id: 'hatchBind', output: 'hatchOpen', target: 'hatch', property: 'open' }, { id: 'exitBind', output: 'closed', target: 'exit', property: 'unlock' }];
    d.previewStates = { idle: {} }; d.presentation = { display: { x: 1200, y: 1800 }, labels: [], wires: [], cameraReveals: [] };
    return d;
}

describe('DEADLOCK isolated shaft and personnel transfer', () => {
    it('raises loose cargo, hovers, and leaves measured time for FEED operator to relay and close the full-solid hatch', () => {
        const r = createRuntime(shaftFixture());
        r.setPartnerInputs({ 'safe.occupied': true }); // Labelled isolated partner contact; not a co-op/full-room proof.
        let maxRise = 0;
        for (let i = 0; i < 1800; i++) { r.step(); maxRise = Math.max(maxRise, -r.world.cubes['draft:payload']!.vy); }
        const hover = r.snapshot();
        expect(hover.cubes['draft:payload'].y).toBeCloseTo(102, 2);
        expect(maxRise).toBe(240);
        let offAt = -1, arrivedAt = -1;
        for (let i = 0; i < 240; i++) {
            r.step({ ...emptyInput(), right: true });
            if (!r.authority.outputs.cargoLift && offAt < 0) offAt = r.world.elapsed;
            if (r.world.player.y < 1500) { arrivedAt = r.world.elapsed; break; }
        }
        expect(arrivedAt).toBeGreaterThan(0);
        // An actual E interaction, already within range on the gallery; no output write.
        r.step(emptyInput(), true);
        const closedAt = r.world.elapsed, closed = r.snapshot();
        expect(r.authority.outputs.hatchOpen).toBe(false);
        expect(r.world.solids.find(s => s.id === 'hatch')!.oneWay).toBe(false);
        for (let i = 0; i < 240; i++) r.step();
        const landed = r.snapshot();
        expect(landed.cubes['draft:payload'].grounded).toBe(true);
        expect(landed.cubes['draft:payload'].y).toBe(978);
        const landingSample = r.recording.samples.find(s => s.time >= closedAt && s.cubes['draft:payload'].grounded);
        const result = { scope: 'isolated real-engine diagnostic with SAFE partner contact override; not route evidence', topY: 80, hatchY: 1000, lowerY: 3000, maxRise, hover, offAt, arrivedAt, closedAt, offToClose: closedAt - offAt, catchAt: landingSample?.time, remainingCatchMargin: (landingSample?.time ?? 0) - closedAt, closed, landed };
        writeFileSync(`${report}/shaft-feasibility.json`, JSON.stringify(result, null, 2) + '\n');
        expect(result.offToClose).toBeLessThan(.3);
        expect(result.remainingCatchMargin).toBeGreaterThan(.5);
    });

    it('admits a bare player but physically blocks loose cargo at the 38px service entrance', () => {
        const d = shaftFixture();
        const spawn = d.geometry.objects.find(o => o.id === 'p1')!; spawn.x = 640;
        const cube = d.geometry.objects.find(o => o.id === 'payload')!; cube.x = 440;
        const r = createRuntime(d); r.setPartnerInputs({ 'safe.occupied': true });
        for (let i = 0; i < 3; i++) r.step();
        for (let i = 0; i < 240; i++) r.step({ ...emptyInput(), grapplePressed: i === 0, grappleHeld: true, aim: { x: 440, y: 2978 } });
        expect(r.world.cubes['draft:payload']!.x).toBeLessThanOrEqual(463.01);
        expect(r.world.cubes['draft:payload']!.y).toBeGreaterThan(2900);
    });
});


describe('DEADLOCK carry-envelope regressions', () => {
    it('stops the overhead payload under a full-solid ceiling', () => {
        const d = clearanceFixture();
        const roof = d.geometry.objects.find(o => o.id === 'serviceRoof')!;
        if (roof.type !== 'platform') throw new Error('fixture roof');
        Object.assign(roof, { x: 0, y: 400, w: 500, h: 100 });
        const r = createRuntime(d);
        for (let i = 0; i < 3; i++) r.step();
        r.step(emptyInput(), true);
        let highestTop = Infinity;
        for (let i = 0; i < 90; i++) {
            r.step({ ...emptyInput(), jumpPressed: i === 0, jumpHeld: true });
            highestTop = Math.min(highestTop, r.world.cubes['draft:payload']!.y - 22);
        }
        expect(highestTop).toBeGreaterThanOrEqual(500);
        expect(r.world.player.y).toBe(583);
    });

    it('keeps the normal player feet and one-way ascent while carrying', () => {
        const d = clearanceFixture();
        const roof = d.geometry.objects.find(o => o.id === 'serviceRoof')!;
        if (roof.type !== 'platform') throw new Error('fixture roof');
        Object.assign(roof, { kind: 'code', activation: 'always-powered', x: 0, y: 480, w: 500, h: 24 });
        const r = createRuntime(d);
        for (let i = 0; i < 3; i++) r.step();
        r.step(emptyInput(), true);
        let highestPlayer = Infinity;
        for (let i = 0; i < 120; i++) {
            r.step({ ...emptyInput(), jumpPressed: i === 0, jumpHeld: true });
            highestPlayer = Math.min(highestPlayer, r.world.player.y);
        }
        expect(highestPlayer).toBeLessThan(463);
        expect(r.world.player.y).toBe(463);
        expect(r.world.player.groundId).toBe('serviceRoof');
        expect(r.world.cubes['draft:payload']!.carried).toBe(true);
    });
});


describe('DEADLOCK canonical draft contract and recovery diagnostics', () => {
    const document = JSON.parse(readFileSync('levels/drafts/deadlock.json', 'utf8')) as DraftDocument;
    it('keeps the original lift/service allocation before payload completion and independent SAFE firewall inversion', () => {
        for (const [feed, safe, lift, firewall, service] of [
            [false, false, false, true, false], [true, false, false, true, false],
            [false, true, false, false, true], [true, true, true, false, false],
        ]) {
            const out = evaluateDraft(document, { 'feed.occupied': feed, 'safe.occupied': safe });
            expect([out.cargoLift, out.shaftFirewall, out.serviceRelay]).toEqual([lift, firewall, service]);
        }
        const world = createRuntime(document).world;
        const hatch = world.solids.find(s => s.id === 'hatch')!;
        expect(hatch.enabled).toBe(true);
        expect(hatch.oneWay).toBe(false);
        expect(hatch.grappleable).toBe(false);
    });

    it.each(['levels/drafts/deadlock.json', 'levels/campaign/deadlock.json'])('%s uses all three live sockets as an additional service supply', path => {
        const d = JSON.parse(readFileSync(path, 'utf8')) as DraftDocument;
        for (let mask = 0; mask < 32; mask++) {
            const [feed, safe, one, two, three] = [1, 2, 4, 8, 16].map(bit => !!(mask & bit));
            const allPayloads = one && two && three;
            const out = evaluateDraft(d, { 'feed.occupied': feed, 'safe.occupied': safe,
                'payloadOne.occupied': one, 'payloadTwo.occupied': two, 'payloadThree.occupied': three });
            expect(out.payloadReady).toBe(allPayloads);
            expect(out.serviceRelay).toBe(safe && !feed || allPayloads);
            expect(out.cargoLift).toBe(feed && safe);
            expect(out.shaftFirewall).toBe(!safe);
        }
    });

    it('keeps personnel service powered after SAFE releases, then clears it on real socket pickup while the exit remains latched', () => {
        const d = JSON.parse(readFileSync('levels/campaign/deadlock.json', 'utf8')) as DraftDocument;
        const sockets = ['payloadOne', 'payloadTwo', 'payloadThree'].map(id => {
            const object = d.geometry.objects.find(o => o.id === id);
            if (object?.type !== 'device' || object.kind !== 'socket') throw new Error(`Missing canonical socket ${id}`);
            return object;
        });
        // Explicit gallery section fixture: delivered cubes are staged at the
        // authored sockets, then gravity/contact sampling and actual E input run.
        // This does not claim to deliver cargo or solve the room cooperatively.
        const r = createRuntime(d, 1, { start: { x: sockets[1].x - 40, y: sockets[1].y - 17 } });
        ['draft:cubeA', 'draft:cubeB', 'draft:cubeC'].forEach((id, index) => {
            Object.assign(r.world.cubes[id as `draft:${string}`]!, { x: sockets[index].x, y: sockets[index].y - 22,
                vx: 0, vy: 0, grounded: false, groundId: null, carried: false });
        });
        r.setPartnerInputs({ 'safe.occupied': true });
        for (let n = 0; n < 6; n++) r.step();
        expect(r.authority.outputs.payloadReady).toBe(true);
        expect(r.world.frame.outputs.exitDoor).toBe(true);
        r.setPartnerInputs({}); // Labelled partner release in this isolated section.
        r.step();
        expect(r.authority.values['safe.occupied']).toBe(false);
        expect(r.authority.outputs.serviceRelay).toBe(true);
        expect(r.world.gates.every(g => g.enabled)).toBe(true);

        r.step(emptyInput(), true);
        expect(r.world.cubes['draft:cubeB']!.carried).toBe(true);
        expect(r.authority.values['payloadTwo.occupied']).toBe(false);
        expect(r.authority.outputs.payloadReady).toBe(false);
        expect(r.authority.outputs.serviceRelay).toBe(false);
        expect(r.world.gates.every(g => !g.enabled)).toBe(true);
        expect(r.world.frame.outputs.exitDoor).toBe(true);

        r.setPartnerInputs({ 'safe.occupied': true });
        r.step();
        expect(r.authority.outputs.serviceRelay).toBe(true);
        r.setPartnerInputs({ 'safe.occupied': true, 'feed.occupied': true });
        r.step();
        expect(r.authority.outputs.serviceRelay).toBe(false);
        expect(r.world.frame.outputs.exitDoor).toBe(true);
    });

    it('resets only the named cube touching the authored shaft firewall', () => {
        const r = createRuntime(document);
        const before = r.snapshot();
        // Explicit isolated setup at the live beam, never used in the full-room route.
        Object.assign(r.world.cubes['draft:cubeA']!, { x: 660, y: 2490, grounded: false, groundId: null });
        r.step();
        const after = r.snapshot();
        expect(after.cubes['draft:cubeA'].x).toBe(500);
        expect(after.cubes['draft:cubeA'].y).toBe(2978);
        for (const id of ['draft:cubeB', 'draft:cubeC']) expect(after.cubes[id]).toEqual(before.cubes[id]);
        expect(after.events.some(e => e.kind === 'cube-firewall')).toBe(true);
        writeFileSync(`${report}/named-cube-recovery.json`, JSON.stringify({ scope: 'isolated firewall contact setup; not route evidence', before, after }, null, 2) + '\n');
    });
});

describe('DEADLOCK carried return through the open hatch', () => {
    it('clears the gallery lip without a false wide-foot collision or horizontal ejection', () => {
        const d = JSON.parse(readFileSync('levels/drafts/deadlock.json', 'utf8')) as DraftDocument;
        const hatch = d.geometry.objects.find(o => o.id === 'hatchToggle');
        if (hatch?.type !== 'device') throw new Error('Missing HATCH fixture control');
        hatch.initial = true;
        // Explicit section setup reproduces the measured recovery lip contact.
        const r = createRuntime(d, 1, { start: { x: 711.284, y: 976.372 } });
        Object.assign(r.world.player, { vx: -426, vy: 772.083, grounded: false });
        r.world.cubes['draft:cubeB']!.carried = true;
        r.setPartnerInputs({ 'safe.occupied': true });
        for (let i = 0; i < 15; i++) {
            r.step({ ...emptyInput(), left: true });
            expect(r.world.player.x).toBeLessThan(720);
        }
        let braking = 0;
        while (r.world.player.vx < 0 && braking++ < 120) r.step({ ...emptyInput(), right: true });
        for (let i = 0; i < 240; i++) r.step();
        expect(r.world.deaths).toBe(0);
        expect(r.world.player.groundId).toBe('lowerFloor');
        expect(r.world.player.x).toBeGreaterThan(590);
        expect(r.world.player.x).toBeLessThan(720);
        expect(r.world.cubes['draft:cubeB']!.carried).toBe(true);
        expect(r.world.cubes['draft:cubeB']!.y).toBe(2940);
    });
});
