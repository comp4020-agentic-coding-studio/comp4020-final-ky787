import { newDraft, type DraftDocument } from '../../src/workbench/model.ts';

/** Flat, explicitly labelled visual/sensor fixture. Not a campaign chamber. */
export function receiverReview(): DraftDocument {
    const d = newDraft('receiver-asset-review');
    d.title = 'PAYLOAD RECEIVER / ASSET REVIEW';
    d.instruction = 'PRESENTATION FIXTURE / LIVE CUBE CONTACT';
    d.geometry = { width: 2000, height: 860, objects: [
        { type: 'spawn', id: 'p1', slot: 1, x: 180, y: 603 },
        { type: 'spawn', id: 'p2', slot: 2, x: 300, y: 603 },
        { type: 'platform', id: 'floor', kind: 'static', x: 0, y: 620, w: 2000, h: 240 },
        { type: 'device', kind: 'socket', id: 'receiver1', label: 'PAYLOAD 01', x: 800, y: 620 },
        { type: 'device', kind: 'plate', id: 'pressure', label: 'PRESSURE / BODY OR CUBE', x: 1080, y: 620 },
        { type: 'device', kind: 'socket', id: 'receiver2', label: 'PAYLOAD 02', x: 1540, y: 620 },
        { type: 'cube', id: 'cargoA', mark: 'A', x: 1250, y: 598 },
        { type: 'cube', id: 'cargoB', mark: 'B', x: 1800, y: 598 },
        { type: 'exit', id: 'exit', x: 1890, y: 480, w: 80, h: 140, latch: true, arrivals: 2 },
    ] };
    d.controller = { kind: 'declarative', outputs: { ready: { op: 'and', args: [
        { op: 'ref', id: 'receiver1.occupied' }, { op: 'ref', id: 'receiver2.occupied' },
    ] } } };
    d.bindings = [{ id: 'exitReady', output: 'ready', target: 'exit', property: 'unlock' }];
    d.presentation = { display: { x: 500, y: 300 }, wires: [], labels: [], cameraReveals: [] };
    d.previewStates = { empty: {}, detected: { 'receiver1.occupied': true, 'receiver2.occupied': true } };
    return d;
}
