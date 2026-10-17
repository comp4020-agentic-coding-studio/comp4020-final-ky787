import { newDraft, type DraftDocument } from '../../src/workbench/model.ts';

/** Diagnostic art/physical-contact fixture, not a campaign chamber. */
export function machineryReview(): DraftDocument {
    const d = newDraft('pressure-lift-art-review');
    d.title = 'PRESSURE + GRAVITY / ASSET REVIEW';
    d.instruction = 'LIVE CONTACT / REVERSIBLE POWER';
    d.geometry = { width: 2440, height: 900, objects: [
        { type: 'spawn', id: 'p1', slot: 1, x: 180, y: 683 },
        { type: 'spawn', id: 'p2', slot: 2, x: 290, y: 683 },
        { type: 'platform', kind: 'static', id: 'floor', x: 0, y: 700, w: 2440, h: 200 },
        { type: 'platform', kind: 'static', id: 'upper', x: 1320, y: 170, w: 360, h: 28 },
        { type: 'platform', kind: 'static', id: 'step', x: 1630, y: 610, w: 130, h: 20 },
        { type: 'platform', kind: 'unstable', id: 'operator', x: 1780, y: 520, w: 200, h: 24,
            crumbleDelay: 6, hookCrumbleDelay: 6, respawnDelay: 3, hookable: false, label: 'TEMPORARY FOOTING' },
        { type: 'device', kind: 'plate', id: 'feed', label: 'FEED / HOLD TO POWER', x: 650, y: 700 },
        { type: 'device', kind: 'socket', id: 'receiver', label: 'PAYLOAD', x: 850, y: 700 },
        { type: 'device', kind: 'plate', id: 'unstable', label: 'HOLD / TEMPORARY', x: 1870, y: 520 },
        { type: 'lift', id: 'lift', x: 1080, y: 120, w: 240, h: 580 },
        { type: 'lift', id: 'wide', x: 2020, y: 400, w: 340, h: 300 },
        { type: 'cube', id: 'cargoA', mark: 'A', x: 930, y: 678 },
        { type: 'cube', id: 'cargoB', mark: 'B', x: 1500, y: 678 },
        { type: 'exit', id: 'exit', x: 2340, y: 560, w: 80, h: 140, latch: true, arrivals: 2 },
    ] };
    d.controller = { kind: 'declarative', outputs: {
        feedPower: { op: 'ref', id: 'feed.occupied' }, temporaryPower: { op: 'ref', id: 'unstable.occupied' },
        ready: { op: 'ref', id: 'receiver.occupied' },
    } };
    d.bindings = [
        { id: 'liftPower', output: 'feedPower', target: 'lift', property: 'power' },
        { id: 'widePower', output: 'temporaryPower', target: 'wide', property: 'power' },
        { id: 'exitPower', output: 'ready', target: 'exit', property: 'unlock' },
    ];
    d.presentation = { display: { x: 400, y: 300 }, labels: [], cameraReveals: [], wires: [
        { id: 'feedWire', binding: 'liftPower', points: [{ x: 650, y: 690 }, { x: 650, y: 600 }, { x: 1060, y: 600 }, { x: 1080, y: 690 }] },
        { id: 'temporaryWire', binding: 'widePower', points: [{ x: 1870, y: 510 }, { x: 1980, y: 510 }, { x: 1980, y: 690 }, { x: 2020, y: 690 }] },
    ] };
    d.previewStates = { empty: {}, powered: { 'feed.occupied': true, 'unstable.occupied': true } };
    return d;
}
