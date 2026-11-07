/** Small authored logic modules, not claims about native instruction placement. */
import type { Vec2 } from '../engine/geometry.ts';
import type { ControllerFrame } from './controller.ts';
import type { MachineConnection } from './connections.ts';
import { logicState, logicValue, type LogicValue } from './wire-logic.ts';

export interface GateInk {
    id: string; op: string; at: Vec2; direction: Vec2;
    input: LogicValue; output: LogicValue; inputAt: Vec2; outputAt: Vec2;
    bounds: { x: number; y: number; w: number; h: number };
}
export interface CircuitInk {
    gates: GateInk[];
    wires: { id: string; state: ReturnType<typeof logicState> }[];
    unavailable: string[];
}
export type WirePaint = (points: readonly Vec2[], state: LogicValue, colour: string) => void;
const add = (p: Vec2, v: Vec2, distance: number): Vec2 => ({ x: p.x + v.x * distance, y: p.y + v.y * distance });
const length = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);
function pathLength(points: readonly Vec2[]) { return points.slice(1).reduce((sum, p, n) => sum + length(points[n], p), 0); }
export function wirePoint(points: readonly Vec2[], distance: number) {
    let remaining = Math.max(0, distance);
    for (let n = 1; n < points.length; n++) {
        const from = points[n - 1], to = points[n], d = length(from, to);
        if (!d) continue;
        const direction = { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
        if (remaining <= d || n === points.length - 1) return { at: add(from, direction, Math.min(d, remaining)), direction };
        remaining -= d;
    }
    return { at: points[0], direction: { x: 1, y: 0 } };
}
export function wireSlice(points: readonly Vec2[], start: number, end: number): Vec2[] {
    if (end <= start) return [];
    const result = [wirePoint(points, start).at]; let distance = 0;
    for (let n = 1; n < points.length; n++) {
        distance += length(points[n - 1], points[n]);
        if (distance > start && distance < end) result.push(points[n]);
    }
    result.push(wirePoint(points, end).at); return result;
}
function gate(id: string, op: string, at: Vec2, direction: Vec2, input: LogicValue, output: LogicValue): GateInk {
    const extent = Math.abs(direction.x) > .5 ? 31 : 19;
    return { id, op, at, direction, input, output, inputAt: add(at, direction, -extent), outputAt: add(at, direction, extent),
        bounds: { x: at.x - 28, y: at.y - 16, w: 56, h: 32 } };
}
const ink = (value: LogicValue) => value === true ? '#64e6d5' : value === false ? '#71849c' : '#605e60';
function drawGate(c: CanvasRenderingContext2D, node: GateInk) {
    const { x, y, w, h } = node.bounds;
    c.save(); c.globalAlpha = 1; c.setLineDash([]); c.lineDashOffset = 0;
    c.fillStyle = '#111820'; c.strokeStyle = '#aa864d'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(x + 6, y); c.lineTo(x + w - 6, y); c.lineTo(x + w, y + 6);
    c.lineTo(x + w, y + h - 6); c.lineTo(x + w - 6, y + h); c.lineTo(x + 6, y + h);
    c.lineTo(x, y + h - 6); c.lineTo(x, y + 6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffd76a'; c.font = node.op === 'NOT' ? 'bold 14px monospace' : 'bold 12px monospace';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(node.op, node.at.x, node.at.y);
    // Square input and ringed output remain distinguishable in either state.
    c.fillStyle = ink(node.input); c.fillRect(node.inputAt.x - 2.5, node.inputAt.y - 2.5, 5, 5);
    c.strokeStyle = ink(node.output); c.fillStyle = '#111820'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(node.outputAt.x, node.outputAt.y, 3, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
}
/** Normal wires are painted first. Circuit input/intermediate paths then own the
 * common source trunk; opposite branches have separate authored local routes. */
export function drawGateConnections(c: CanvasRenderingContext2D, links: readonly MachineConnection[], frame: ControllerFrame, paint: WirePaint): CircuitInk {
    const result: CircuitInk = { gates: [], wires: [], unavailable: [] }, nodes = new Map<string, GateInk>(), paths = new Set<string>();
    const captions: { label: string; at: Vec2; value: LogicValue }[] = [];
    const segment = (points: Vec2[], state: LogicValue, colour: string, semantic: string) => {
        if (points.length < 2) return;
        const id = JSON.stringify([semantic, points]);
        if (paths.has(id)) return; paths.add(id); paint(points, state, colour);
    };
    for (const link of links) {
        if (!link.logic && !link.inverted) continue;
        const colour = link.output === 'relayGates' ? '#b59bff' : '#64e6d5', state = logicState(link, frame);
        result.wires.push({ id: link.id, state });
        if (!link.logic || !state) {
            result.unavailable.push(link.id);
            const distance = Math.min(100, pathLength(link.points) / 2), p = wirePoint(link.points, distance);
            const node = gate(`unknown:${link.id}`, '?', p.at, p.direction, null, null);
            nodes.set(node.id, node); segment(link.points, null, colour, node.id); continue;
        }
        if (!state.coherent) result.unavailable.push(link.id);
        let previous = 0, value = state.source;
        const total = pathLength(link.points), source = JSON.stringify(link.logic.source);
        for (const [n, stage] of link.logic.stages.entries()) {
            const distance = Math.min(total - 24, stage.distance), p = wirePoint(link.points, distance);
            const prefix = JSON.stringify([source, link.logic.stages.slice(0, n + 1).map(s => ({ op: s.op, side: s.side }))]);
            const id = `${prefix}@${p.at.x},${p.at.y}`, s = state.stages[n];
            const node = gate(id, stage.op, p.at, p.direction, s.input, s.output), extent = length(node.at, node.inputAt);
            segment(wireSlice(link.points, previous, distance - extent), value, colour, n ? JSON.stringify([source, link.logic.stages.slice(0, n).map(s => ({ op: s.op, side: s.side }))]) : source);
            if (!nodes.has(id)) {
                nodes.set(id, node);
                const normal = { x: -p.direction.y * (stage.sideDirection ?? -1), y: p.direction.x * (stage.sideDirection ?? -1) };
                for (const [k, input] of (stage.side ?? []).entries()) {
                    const slot = (k - ((stage.side?.length ?? 1) - 1) / 2) * 18;
                    const end = add(add(p.at, p.direction, slot), normal, Math.abs(normal.x) > .5 ? 29 : 17);
                    const start = add(end, normal, input.expr.op === 'not' ? 94 : 38);
                    const sideState = s.side[k].value;
                    if (input.expr.op === 'not') {
                        const at = add(end, normal, 44), direction = { x: -normal.x, y: -normal.y };
                        const sideNode = gate(`${id}:side:${k}`, 'NOT', at, direction, logicValue(input.expr.arg, frame), sideState);
                        nodes.set(sideNode.id, sideNode);
                        segment([start, sideNode.inputAt], sideNode.input, colour, sideNode.id + ':input');
                        segment([sideNode.outputAt, end], sideState, colour, sideNode.id + ':output');
                    } else segment([start, end], sideState, colour, `${id}:side:${k}`);
                    captions.push({ label: input.label, at: add(start, normal, Math.abs(normal.x) > .5 ? 30 : 11), value: input.expr.op === 'not' ? logicValue(input.expr.arg, frame) : sideState });
                }
            }
            previous = distance + extent; value = s.output;
        }
        segment(wireSlice(link.points, previous, total), state.final, colour, JSON.stringify(link.logic.final));
    }
    // Housing is opaque and last: no scan or pulse crosses a logic module.
    for (const node of nodes.values()) { drawGate(c, node); result.gates.push(node); }
    c.save(); c.globalAlpha = 1; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '10px monospace';
    for (const caption of captions) { c.fillStyle = '#111820'; const w = c.measureText(caption.label).width; c.fillRect(caption.at.x - w / 2 - 3, caption.at.y - 7, w + 6, 14); c.fillStyle = ink(caption.value); c.fillText(caption.label, caption.at.x, caption.at.y); }
    c.restore(); return result;
}
