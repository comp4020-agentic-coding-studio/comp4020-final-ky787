/** Authored circuit presentation. Never native instructions, authority or timing. */
import type { Vec2 } from '../engine/geometry.ts';
import type { ControllerFrame } from './controller.ts';
import type { MachineConnection } from './connections.ts';
import type { DraftBinding, DraftDocument, DraftExpression, DraftWire } from '../workbench/model.ts';

export type LogicValue = boolean | null;
export type LogicExpression = DraftExpression;
export interface WireLogicStage {
    op: 'NOT' | 'AND' | 'OR'; distance: number;
    side?: { label: string; expr: LogicExpression }[];
    sideDirection?: 1 | -1;
}
export interface WireLogic {
    source: LogicExpression; final: LogicExpression; stages: WireLogicStage[];
}
const ref = (id: string): LogicExpression => ({ op: 'ref', id });
const side = (label: string, id: string) => ({ label, expr: ref(id) });
const not = (distance: number): WireLogicStage => ({ op: 'NOT', distance });
const junction = (op: 'AND' | 'OR', distance: number, inputs: WireLogicStage['side'], sideDirection: 1 | -1 = -1): WireLogicStage => ({ op, distance, side: inputs, sideDirection });

/** Explicit rule/port mapping: legacy wire.input is NOT a logic source contract. */
export function withWireLogic(links: readonly MachineConnection[], room: string): MachineConnection[] {
    return links.map(link => {
        if (link.logic) return link;
        let source: string | undefined, stages: WireLogicStage[] = [], points = link.points;
        const p = points[0];
        // Builtin import/export can retain presentation routes while omitting
        // runtime metadata. Do not insert the branch jog a second time.
        const separateBranch = (rise: number, offset = 80) => points[1]?.x === p.x && points[1]?.y === p.y - rise
            && points[2]?.x === p.x + offset && points[2]?.y === p.y - rise ? points
            : [p, { x: p.x, y: p.y - rise }, { x: p.x + offset, y: p.y - rise }, { x: p.x + offset, y: points[1].y }, ...points.slice(2)];
        if (room === 'crossfeed-vault') {
            if (link.output === 'relayGates') { source = 'switchB'; stages = [not(180), junction('AND', 260, [side('SYSTEM', 'input:switchC')])]; }
            if (link.output === 'leftRoute' || link.output === 'rightRoute') {
                source = 'routeMode';
                const conditions = [side('SYSTEM', 'input:switchC'), side('POWER', 'input:routePowerOccupied')];
                if (link.output === 'leftRoute') stages = [not(260), junction('AND', 340, conditions)];
                else {
                    // Separate the opposite branch before its states diverge. All
                    // destination endpoints and the long upper routes stay fixed.
                    points = separateBranch(79, 180);
                    stages = [junction('AND', 334, conditions, 1)];
                }
            }
        } else if (room === 'race-condition') {
            if (link.output === 'topBridge') {
                source = 'dropA';
                points = [p, { x: 420, y: p.y }, { x: 420, y: 1100 }, { x: 120, y: 1100 }, points.at(-1)!];
                stages = [not(268)];
            }
            if (link.output === 'bufferBridge' || link.output === 'safetyFirewall') {
                source = 'dropB';
                // One common source jog clears the occupant/name footprint;
                // both branches leave the same inverter before diverging.
                const viaY = link.output === 'bufferBridge' ? 1120 : 1140;
                points = [p, { x: p.x + 100, y: p.y }, { x: p.x + 100, y: viaY }, ...points.slice(-2)];
                stages = [not(170), link.output === 'bufferBridge'
                    ? junction('AND', 468, [side('BUFFER', 'phase:open')], 1)
                    : junction('OR', 353, [side('EXPIRED', 'phase:expired')], -1)];
            }
            if (link.output === 'phaseA' || link.output === 'phaseB') {
                source = 'phase';
                const conditions = [side('SPAN', 'output:spanMaster')];
                if (link.output === 'phaseA') stages = [not(140), junction('AND', 220, conditions)];
                else {
                    points = separateBranch(68);
                    stages = [junction('AND', 300, conditions, 1)];
                }
            }
        }
        return source ? { ...link, points, logic: { source: ref(`input:${source}`), final: ref(`output:${link.output}`), stages } } : link;
    });
}
function read(id: string, frame: ControllerFrame): LogicValue {
    const [kind, ...rest] = id.split(':'), key = rest.join(':');
    if (kind === 'phase') {
        const phase = frame.circuit?.bufferPhase;
        if (!phase || !['idle', 'window', 'released', 'expired'].includes(phase)) return null;
        return key === 'open' ? phase === 'idle' || phase === 'window' : key === 'expired' ? phase === 'expired' : null;
    }
    const value = kind === 'input' ? frame.circuit?.inputs[key] : kind === 'output' ? frame.circuit?.outputs[key]
        : kind === 'control' ? frame.controls?.[key] : kind === 'plate' ? frame.plates?.[key]
            : kind === 'signal' ? frame.signals?.[key as keyof NonNullable<ControllerFrame['signals']>] : undefined;
    return typeof value === 'boolean' ? value : null;
}
export function logicValue(expr: LogicExpression, frame: ControllerFrame): LogicValue {
    if (expr.op === 'ref') return read(expr.id, frame);
    if (expr.op === 'const') return expr.value;
    if (expr.op === 'not') { const v = logicValue(expr.arg, frame); return v === null ? null : !v; }
    const values = expr.args.map(e => logicValue(e, frame));
    // Unknown means unavailable, not a false input silently inferred from output.
    return values.includes(null) ? null : expr.op === 'and' ? values.every(Boolean) : values.some(Boolean);
}
export function logicState(link: MachineConnection, frame: ControllerFrame) {
    if (!link.logic) return null;
    const source = logicValue(link.logic.source, frame), final = logicValue(link.logic.final, frame);
    let value = source;
    const stages = link.logic.stages.map(stage => {
        const input = value, side = (stage.side ?? []).map(s => ({ label: s.label, value: logicValue(s.expr, frame) }));
        value = input === null || side.some(s => s.value === null) ? null
            : stage.op === 'NOT' ? !input : stage.op === 'AND' ? input && side.every(s => s.value) : input || side.some(s => s.value);
        return { op: stage.op, input, side, output: value };
    });
    return { source, stages, final, coherent: value !== null && final !== null && value === final };
}

/** Factor only a single source path through the actual declarative AST. No
 * truth table is changed; unsupported/ambiguous custom diagrams stay unknown. */
export function declarativeWireLogic(draft: DraftDocument, wire: DraftWire, binding?: DraftBinding): { logic?: WireLogic; points?: Vec2[] } {
    if (draft.controller.kind !== 'declarative' || !(wire.invertedLabel || binding?.invert)) return {};
    const defs = draft.controller.outputs, output = binding?.output ?? wire.output;
    if (!output || !defs[output]) return {};
    const expand = (expr: DraftExpression, depth = 0): DraftExpression => {
        if (depth > 32) throw new Error('circuit expression depth');
        if (expr.op === 'ref' && defs[expr.id]) return expand(defs[expr.id], depth + 1);
        if (expr.op === 'not') { const arg = expand(expr.arg, depth + 1); return arg.op === 'not' ? arg.arg : { op: 'not', arg }; }
        if (expr.op === 'and' || expr.op === 'or') return { ...expr, args: expr.args.map(e => expand(e, depth + 1)) };
        return expr;
    };
    const p = wire.points[0];
    const devices = draft.geometry.objects.filter(o => o.type === 'device' && o.x === p.x && Math.abs(o.y - p.y) <= 64);
    if (devices.length !== 1 || devices[0].type !== 'device') return {};
    const device = devices[0], source = `${device.id}.${device.kind === 'toggle' || device.kind === 'terminal' ? 'value' : 'occupied'}`;
    const convert = (e: DraftExpression): LogicExpression => {
        if (e.op === 'ref') {
            const [id, port] = e.id.split('.');
            return ref(`${port === 'value' ? 'control' : 'plate'}:draft:${id}`);
        }
        if (e.op === 'not') return { op: 'not', arg: convert(e.arg) };
        return e.op === 'and' || e.op === 'or' ? { ...e, args: e.args.map(convert) } : e;
    };
    const contains = (e: DraftExpression): boolean => e.op === 'ref' ? e.id === source : e.op === 'not' ? contains(e.arg)
        : e.op === 'and' || e.op === 'or' ? e.args.some(contains) : false;
    const label = (e: DraftExpression): string => {
        const input = e.op === 'not' ? e.arg : e;
        if (input.op === 'ref') return input.id.split('.')[0].replace(/^plate/, '').replace(/^payload/, 'P').toUpperCase();
        return input.op === 'and' && input.args.every(a => a.op === 'ref' && a.id.startsWith('payload')) ? 'PAYLOADS' : 'ENABLE';
    };
    const thread = (e: DraftExpression): WireLogicStage[] | null => {
        if (e.op === 'ref') return e.id === source ? [] : null;
        if (e.op === 'not') { const inner = thread(e.arg); return inner && [...inner, not(0)]; }
        if (e.op !== 'and' && e.op !== 'or') return null;
        const paths = e.args.filter(contains); if (paths.length !== 1) return null;
        const inner = thread(paths[0]);
        return inner && [...inner, junction(e.op === 'and' ? 'AND' : 'OR', 0, e.args.filter(a => a !== paths[0]).map(a => ({ label: label(a), expr: convert(a) })))];
    };
    try {
        const expr = expand(binding?.invert ? { op: 'not', arg: defs[output] } : defs[output]), stages = thread(expr);
        if (!stages?.length) return {};
        let points: Vec2[] | undefined;
        const distances = wire.id === 'maintenanceFirewallWire' ? [222] : wire.id === 'safe-not-firewall' ? [180]
            : wire.id === 'feed-not-service' ? [138, 268, 368] : wire.id === 'assistWire' ? [138] : stages.map((_, n) => 100 + n * 80);
        if (wire.id === 'feed-not-service') points = [p, { x: p.x, y: 2820 }, { x: 680, y: 2820 }, { x: 680, y: 2980 }, wire.points.at(-1)!];
        if (wire.id === 'assistWire') points = [p, { x: p.x, y: 740 }, { x: 1550, y: 740 }, { x: 1550, y: 1120 }, wire.points.at(-1)!];
        stages.forEach((s, n) => s.distance = distances[n] ?? 100 + n * 80);
        return { points, logic: { source: convert({ op: 'ref', id: source }), stages, final: ref(`signal:draft:${binding?.id ?? output}`) } };
    } catch { return {}; }
}
