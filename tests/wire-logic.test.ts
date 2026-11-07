import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { newRecord, sharedRoom } from '../server/coop-state.ts';
import { crossfeedInputs, crossfeedOutputs, freshCrossfeed } from '../server/crossfeed-state.ts';
import { freshRace, raceOutputs } from '../server/race-state.ts';
import { freshCrumble } from '../server/crumble-state.ts';
import { CoopClient } from '../src/coop/client.ts';
import { CrossfeedAuthority } from '../src/coop/crossfeed-authority.ts';
import { crossfeedVault } from '../src/coop/crossfeed-vault.ts';
import { RaceAuthority } from '../src/coop/race-authority.ts';
import { raceCondition } from '../src/coop/race-condition.ts';
import type { RaceInputs, RaceOutputs, CrossfeedOutputs, Plate } from '../src/coop/protocol.ts';
import type { ControllerFrame } from '../src/slice/controller.ts';
import type { MachineConnection } from '../src/slice/connections.ts';
import { declarativeWireLogic, logicState, withWireLogic } from '../src/slice/wire-logic.ts';
import { draftFrame, emptyOutputs, evaluateDraft, initialDeviceValues } from '../src/workbench/evaluate.ts';
import { draftRoom } from '../src/workbench/room-adapter.ts';
import { parseDraft } from '../src/workbench/validation.ts';

const visitor = '11111111-1111-4111-8111-111111111111';
const crossfeed = withWireLogic(crossfeedVault(1).wires!, 'crossfeed-vault');
const race = withWireLogic(raceCondition(1).wires!, 'race-condition');
const acceptedFrame = (inputs: Record<string, boolean>, outputs: Record<string, boolean>, bufferPhase?: string): ControllerFrame => ({
    source: 'mock-multiplayer', outputs: emptyOutputs(), circuit: { inputs, outputs, bufferPhase },
});
function state(link: MachineConnection, frame: ControllerFrame) {
    const result = logicState(link, frame); expect(result).not.toBeNull(); return result!;
}

it('maps every temporal fanout from its real rule, preserving endpoints and the original room objects', () => {
    for (const [id, room] of [['crossfeed-vault', crossfeedVault(1)], ['race-condition', raceCondition(1)]] as const) {
        const before = structuredClone(room), links = withWireLogic(room.wires!, id);
        expect(room).toEqual(before);
        expect(withWireLogic(links, id)).toEqual(links);
        for (const [index, link] of links.entries()) {
            expect(link.points[0]).toEqual(room.wires![index].points[0]);
            expect(link.points.at(-1)).toEqual(room.wires![index].points.at(-1));
        }
    }
    expect(crossfeed.filter(w => w.output === 'relayGates' && w.logic)).toHaveLength(2);
    expect(crossfeed.filter(w => w.output === 'leftRoute' && w.logic)).toHaveLength(3);
    expect(crossfeed.filter(w => w.output === 'rightRoute' && w.logic)).toHaveLength(3);
    expect(race.filter(w => w.output === 'phaseA' && w.logic)).toHaveLength(3);
    expect(race.filter(w => w.output === 'phaseB' && w.logic)).toHaveLength(2);
    expect(race.filter(w => ['topBridge', 'bufferBridge', 'safetyFirewall'].includes(w.output) && w.logic)).toHaveLength(3);
});

it('CROSSFEED stages agree with the actual TS rule for all 16 routing/enable combinations', () => {
    const record = newRecord('ABCD', visitor, 'crossfeed-vault');
    for (let bits = 0; bits < 16; bits++) {
        const [switchB, switchC, routeMode, power] = Array.from({ length: 4 }, (_, n) => !!(bits & (1 << n)));
        Object.assign(record.levelState, { switchB, switchC, routeMode });
        const ctx = { record, held: [power ? 'routePower' : null, null] as [Plate, Plate] };
        const inputs = crossfeedInputs(ctx), outputs = crossfeedOutputs(ctx), frame = acceptedFrame({ ...inputs }, { ...outputs });
        for (const link of crossfeed.filter(w => w.logic)) {
            const actual = state(link, frame), relay = link.output === 'relayGates', inverse = relay || link.output === 'leftRoute';
            expect(actual.source).toBe(relay ? switchB : routeMode);
            expect(actual.stages.map(s => s.op)).toEqual(inverse ? ['NOT', 'AND'] : ['AND']);
            if (inverse) expect(actual.stages[0].output).toBe(!(relay ? switchB : routeMode));
            expect(actual.stages.at(-1)!.side.map(s => s.value)).toEqual(relay ? [switchC] : [switchC, power]);
            expect(actual.final).toBe(outputs[link.output as keyof CrossfeedOutputs]);
            expect(actual.stages.at(-1)!.output).toBe(actual.final);
            expect(actual.coherent).toBe(true);
        }
    }
});

it('RACE stages agree with all 128 Boolean combinations in each of its four accepted buffer phases', () => {
    const keys: (keyof RaceInputs)[] = ['dropA', 'dropB', 'payloadDelivered', 'traceOccupied', 'phase', 'returnOccupied', 'finalControl'];
    for (const buffer of ['idle', 'window', 'released', 'expired'] as const) for (let bits = 0; bits < 128; bits++) {
        const inputs = Object.fromEntries(keys.map((key, n) => [key, !!(bits & (1 << n))])) as unknown as RaceInputs;
        const outputs = raceOutputs(inputs, buffer, false), frame = acceptedFrame({ ...inputs }, { ...outputs }, buffer);
        for (const link of race.filter(w => w.logic)) {
            const actual = state(link, frame), phase = link.output === 'phaseA' || link.output === 'phaseB';
            expect(actual.source).toBe(phase ? inputs.phase : link.output === 'topBridge' ? inputs.dropA : inputs.dropB);
            const operations = link.output === 'topBridge' ? ['NOT'] : link.output === 'phaseB' ? ['AND']
                : link.output === 'safetyFirewall' ? ['NOT', 'OR'] : ['NOT', 'AND'];
            expect(actual.stages.map(s => s.op)).toEqual(operations);
            if (operations[0] === 'NOT') expect(actual.stages[0].output).toBe(!actual.source);
            if (link.output === 'bufferBridge') expect(actual.stages[1].side.map(s => s.value)).toEqual([buffer === 'idle' || buffer === 'window']);
            if (link.output === 'safetyFirewall') expect(actual.stages[1].side.map(s => s.value)).toEqual([buffer === 'expired']);
            if (phase) expect(actual.stages.at(-1)!.side.map(s => s.value)).toEqual([outputs.spanMaster]);
            expect(actual.final).toBe(outputs[link.output as keyof RaceOutputs]);
            expect(actual.stages.at(-1)!.output).toBe(actual.final);
            expect(actual.coherent).toBe(true);
        }
    }
});

it('missing accepted ports stay unknown and inconsistent outputs are not rewritten to fit the diagram', () => {
    const link = crossfeed.find(w => w.output === 'leftRoute')!;
    const predicted: ControllerFrame = { source: 'mock-multiplayer', outputs: { ...emptyOutputs(), relayGates: true },
        controls: { routeMode: false, switchC: true }, plates: { routePower: true }, signals: { leftRoute: true } };
    expect(state(link, predicted)).toMatchObject({ source: null, final: null, coherent: false });
    const partial = acceptedFrame({ switchC: true, routePowerOccupied: true }, { leftRoute: true });
    expect(state(link, partial)).toMatchObject({ source: null, final: true, coherent: false });
    expect(state(link, partial).stages.every(s => s.output === null)).toBe(true);
    const inconsistent = acceptedFrame({ routeMode: false, switchC: true, routePowerOccupied: true }, { leftRoute: false });
    expect(state(link, inconsistent)).toMatchObject({ source: false, final: false, coherent: false });
    expect(state(link, inconsistent).stages.at(-1)!.output).toBe(true);
    const buffer = race.find(w => w.output === 'bufferBridge')!;
    for (const unavailable of [undefined, 'not-an-accepted-phase']) {
        const frame = acceptedFrame({ dropB: false }, { bufferBridge: true }, unavailable);
        frame.timer = { phase: 'window', seconds: 0, fraction: 0 };
        const actual = state(buffer, frame);
        expect(actual.stages[0].output).toBe(true);
        expect(actual.stages[1].side[0].value).toBeNull(); expect(actual.stages[1].output).toBeNull(); expect(actual.coherent).toBe(false);
    }
    expect(logicState(crossfeed.find(w => !w.logic)!, predicted)).toBeNull();
});

it('CROSSFEED circuitry uses accepted toggles even when local routing predicts the opposite state', () => {
    const record = newRecord('ABCD', visitor, 'crossfeed-vault');
    record.levelState.switchC = true; record.cubePlacements.cubeA = 'routePower';
    const client = new CoopClient(() => {}, () => {}), room = sharedRoom(record, [true, true], [null, null]);
    client.room = room; client.pendingRouting.set('switchB', { seq: 1, value: true }); client.pendingRouting.set('routeMode', { seq: 2, value: true });
    const authority = new CrossfeedAuthority(room, client), frame = authority.frame;
    expect(frame.signals).toMatchObject({ relayGates: false, leftRoute: false, rightRoute: true });
    expect(frame.controls).toMatchObject({ switchB: true, routeMode: true });
    for (const output of ['relayGates', 'leftRoute']) expect(state(crossfeed.find(w => w.output === output)!, frame)).toMatchObject({ source: false, final: true, coherent: true });
    expect(state(crossfeed.find(w => w.output === 'rightRoute')!, frame)).toMatchObject({ source: false, final: false, coherent: true });
});

it('RACE circuitry ignores pending phase and keeps the accepted buffer enum when its displayed countdown reaches zero', () => {
    const record = newRecord('ABCD', visitor, 'race-condition'); record.cubePlacements.cubeA = 'receiver';
    const timer = freshRace(); timer.buffer = 'window'; timer.deadline = 1001;
    const client = new CoopClient(() => {}, () => {}), room = sharedRoom(record, [true, true], ['trace', null], null, freshCrumble(), 1000, timer);
    client.room = room; client.roomReceivedAt = performance.now() - 1000; client.pendingPhase = { seq: 1, value: true };
    const authority = new RaceAuthority(room, client), frame = authority.frame;
    expect(authority.inputs.switchB).toBe(true); expect(frame.signals?.phaseA).toBe(false);
    expect(state(race.find(w => w.output === 'phaseA')!, frame)).toMatchObject({ source: false, final: true, coherent: true });
    expect(frame.timer).toMatchObject({ phase: 'window', seconds: 0 });
    expect(state(race.find(w => w.output === 'bufferBridge')!, frame).stages[1].side[0].value).toBe(true);
});

it('server grace can retain a physical route without changing its accepted raw circuit result', () => {
    const crossRecord = newRecord('ABCD', visitor, 'crossfeed-vault'); crossRecord.levelState.switchC = true;
    const grace = freshCrossfeed(); grace.leftUntil = 1325;
    const client = new CoopClient(() => {}, () => {});
    const crossRoom = sharedRoom(crossRecord, [true, true], [null, null], null, freshCrumble(), 1000, freshRace(), grace);
    const crossAuthority = new CrossfeedAuthority(crossRoom, client);
    expect(crossAuthority.physicalPower('leftRoute')).toBe(true);
    expect(state(crossfeed.find(w => w.output === 'leftRoute')!, crossAuthority.frame)).toMatchObject({ source: false, final: false, coherent: true });
    const raceRecord = newRecord('EFGH', visitor, 'race-condition'); raceRecord.levelState.phase = true; raceRecord.cubePlacements.cubeA = 'receiver';
    const raceGrace = freshRace(); raceGrace.phaseUntil = 1350;
    const raceRoom = sharedRoom(raceRecord, [true, true], ['trace', null], null, freshCrumble(), 1000, raceGrace);
    const raceAuthority = new RaceAuthority(raceRoom, client);
    expect(raceAuthority.physicalPower('phaseA')).toBe(true);
    expect(state(race.find(w => w.output === 'phaseA')!, raceAuthority.frame)).toMatchObject({ source: true, final: false, coherent: true });
    raceAuthority.room = sharedRoom(raceRecord, [true, true], [null, null], null, freshCrumble(), 1000, raceGrace);
    expect(raceAuthority.physicalPower('phaseA')).toBe(false);
});

const campaign = (id: string) => parseDraft(JSON.parse(readFileSync(`levels/campaign/${id}.json`, 'utf8')));
it.each(['handshake', 'deadlock', 'use-after-free'])('%s diagram agrees with its actual declarative bindings for every device vector', id => {
    const document = campaign(id), before = structuredClone(document), links = draftRoom(document).wires!.filter(w => w.logic);
    expect(document).toEqual(before); expect(links.length).toBeGreaterThan(0);
    const ports = Object.keys(initialDeviceValues(document));
    for (let bits = 0; bits < 2 ** ports.length; bits++) {
        const values = Object.fromEntries(ports.map((port, n) => [port, !!(bits & (1 << n))]));
        const frame = draftFrame(document, values, evaluateDraft(document, values));
        for (const link of links) {
            const actual = state(link, frame);
            expect(actual.final).toBe(frame.signals![link.output]); expect(actual.coherent).toBe(true);
        }
    }
    const sequences = Object.fromEntries(links.map(w => [w.id, w.logic!.stages.map(s => s.op)]));
    if (id === 'handshake') expect(sequences).toEqual({ maintenanceFirewallWire: ['NOT'] });
    if (id === 'deadlock') expect(sequences).toEqual({ 'safe-not-firewall': ['NOT'], 'feed-not-service': ['NOT', 'AND', 'OR'] });
    if (id === 'use-after-free') {
        expect(sequences).toEqual({ assistWire: ['AND'] });
        const frame = draftFrame(document, { ...initialDeviceValues(document), 'assist.occupied': true, 'plateC.occupied': true },
            evaluateDraft(document, { ...initialDeviceValues(document), 'assist.occupied': true, 'plateC.occupied': true }));
        expect(state(links[0], frame)).toMatchObject({ source: true, stages: [{ op: 'AND', side: [{ value: false }], output: false }], final: false });
    }
});

it('ambiguous or unrelated declarative sources do not become guessed inverter modules', () => {
    const document = campaign('handshake'), wire = document.presentation.wires.find(w => w.id === 'maintenanceFirewallWire')!;
    const binding = document.bindings.find(b => b.id === wire.binding)!;
    const duplicate = structuredClone(document), device = duplicate.geometry.objects.find(o => o.id === 'maintenance')!;
    duplicate.geometry.objects.push({ ...device, id: 'otherMaintenance' });
    expect(declarativeWireLogic(duplicate, wire, binding)).toEqual({});
    const unrelated = structuredClone(document);
    if (unrelated.controller.kind !== 'declarative') throw new Error('Expected declarative fixture');
    unrelated.controller.outputs.firewallActive = { op: 'not', arg: { op: 'ref', id: 'link.value' } };
    expect(declarativeWireLogic(unrelated, wire, binding)).toEqual({});
});
