import { expect, it } from 'vitest';
import { roomConnections, connectionPowered, connectionPulse, drawConnections, type MachineConnection } from '../src/slice/connections.ts';
import { roomById, ROOMS } from '../src/slice/rooms.ts';
import { roomController } from '../src/slice/validated-controller.ts';
import type { ControllerInputs, ControllerFrame } from '../src/slice/controller.ts';
import { Camera } from '../src/render/camera.ts';
import type { PuzzleWorld } from '../src/slice/world.ts';

const emptyInputs = (): ControllerInputs => ({ plateA: false, plateB: false, plateC: false, switchB: false, switchC: false,
    cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false });
const emptyFrame = (): ControllerFrame => ({ source: 'mock-multiplayer', outputs: { exitDoor: false, grappleAnchor: false,
    bridge: false, codePlatformA: false, codePlatformB: false, relayGates: false, liftField: false } });
const elbow: MachineConnection = { id: 'fixture', input: 'plateA', output: 'grappleAnchor',
    points: [{ x: 100, y: 400 }, { x: 100, y: 180 }, { x: 100, y: 180 }, { x: 540, y: 180 }, { x: 540, y: 300 }] };
type PathCommand = [string, ...number[]];
type Paint = { kind: 'stroke' | 'fill' | 'text' | 'rect'; colour: string; alpha: number; width: number;
    dash: number[]; offset: number; path: PathCommand[]; text?: string; font?: string };
/** Small local Canvas recorder, matching the terrain renderer tests. Records
 * actual path/state at paint time rather than a snapshot of every setter. */
function record(links: MachineConnection[], powered: boolean, seconds: number, motion = true, circuit?: ControllerFrame['circuit']) {
    const paints: Paint[] = [];
    let path: PathCommand[] = [], dash: number[] = [];
    const c = {
        strokeStyle: '', fillStyle: '', globalAlpha: 1, lineWidth: 1, lineDashOffset: 0, font: '',
        save() {}, restore() {}, beginPath() { path = []; },
        moveTo(x: number, y: number) { path.push(['moveTo', x, y]); },
        lineTo(x: number, y: number) { path.push(['lineTo', x, y]); },
        closePath() { path.push(['closePath']); },
        arc(x: number, y: number, radius: number, start: number, end: number) { path.push(['arc', x, y, radius, start, end]); },
        setLineDash(value: number[]) { dash = [...value]; },
        measureText() { return { width: 25 }; },
        stroke() { paint('stroke', this.strokeStyle); },
        fill() { paint('fill', this.fillStyle); },
        fillRect(x: number, y: number, width: number, height: number) { paint('rect', this.fillStyle, [['rect', x, y, width, height]]); },
        fillText(text: string, x: number, y: number) { paint('text', this.fillStyle, [['text', x, y]], text); },
    };
    function paint(kind: Paint['kind'], colour: string, geometry = path, text?: string) {
        paints.push({ kind, colour, alpha: c.globalAlpha, width: c.lineWidth, dash: [...dash], offset: c.lineDashOffset,
            path: geometry.map(command => [...command]), ...(text ? { text, font: c.font } : {}) });
    }
    const inputs = { ...emptyInputs(), plateA: !powered }, frame = emptyFrame();
    frame.signals = Object.fromEntries(links.map(link => [link.output, powered]));
    if (circuit) frame.circuit = circuit;
    const world = { inputs, frame, elapsed: seconds } as PuzzleWorld;
    const before = structuredClone(world);
    const diagnostic = drawConnections(c as unknown as CanvasRenderingContext2D, links, world, motion);
    expect(world).toEqual(before);
    return { paints, diagnostic };
}
const render = (links: MachineConnection[], powered: boolean, seconds: number, motion = true) => record(links, powered, seconds, motion).paints;
const inverter = (source = 'feed'): MachineConnection => ({ ...elbow, inverted: true, logic: {
    source: { op: 'ref', id: `input:${source}` }, final: { op: 'ref', id: 'output:grappleAnchor' }, stages: [{ op: 'NOT', distance: 100 }],
} });
const chain = (op: 'AND' | 'OR'): MachineConnection => {
    const link = inverter();
    return { ...link, logic: { ...link.logic!, stages: [...link.logic!.stages,
        { op, distance: 300, side: [{ label: 'ENABLE', expr: { op: 'ref', id: 'input:enable' } }] }] } };
};
const circuitFrame = (feed: boolean, final: boolean, enable = false): NonNullable<ControllerFrame['circuit']> => ({
    inputs: { feed, enable }, outputs: { grappleAnchor: final },
});
const wireStrokes = (paints: Paint[]) => paints.filter(p => p.kind === 'stroke' && p.path.every(command => ['moveTo', 'lineTo'].includes(command[0])));

it('every physical wire has endpoints inside its chamber and a distinct identity', () => {
    for (const room of ROOMS) {
        const wires = roomConnections(room);
        expect(new Set(wires.map(w => w.id)).size).toBe(wires.length);
        for (const wire of wires) {
            expect(wire.points.length).toBeGreaterThanOrEqual(2);
            for (const p of wire.points) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(room.width); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(room.height); }
        }
    }
});
it('UPLINK wiring shows each source across all 32 retained frames, including inputs awaiting another condition', () => {
    const wires = roomConnections(roomById('uplink'));
    for (let key = 0; key < 32; key++) {
        const inputs: ControllerInputs = { plateA: !!(key & 1), switchB: !!(key & 2), plateB: !!(key & 4), switchC: !!(key & 8), cubeOnPlateC: !!(key & 16), plateC: true, cubeOnPlate: false, cubeOnPlateB: false };
        const w = { inputs, frame: roomController.evaluate('uplink', inputs) };
        expect(connectionPowered(wires.find(w => w.id === 'anchor-feed')!, w)).toBe(inputs.plateA);
        expect(connectionPowered(wires.find(w => w.id === 'plate-lift')!, w)).toBe(inputs.plateB);
        expect(connectionPowered(wires.find(w => w.id === 'latch-lift')!, w)).toBe(inputs.switchC);
        expect(connectionPowered(wires.find(w => w.id === 'exit-feed')!, w)).toBe(inputs.cubeOnPlateC);
        for (const wire of wires.filter(w => w.id.startsWith('payload-'))) expect(connectionPowered(wire, w)).toBe(inputs.cubeOnPlateC);
        expect(w.frame.outputs.exitDoor).toBe(inputs.switchC && inputs.cubeOnPlateC);
        expect(w.frame.outputs.codePlatformB).toBe(inputs.switchC && inputs.cubeOnPlateC);
    }
});
it('resolved wires observe accepted signal false before fallback output; source wires keep their authored input semantics', () => {
    const w = { inputs: { ...emptyInputs(), plateA: true }, frame: emptyFrame() };
    w.frame.outputs.grappleAnchor = true;
    w.frame.signals = { grappleAnchor: false };
    expect(connectionPowered(elbow, w)).toBe(false);
    expect(connectionPowered({ ...elbow, resolved: true, inverted: true }, w)).toBe(false);
    expect(connectionPowered({ ...elbow, resolved: false }, w)).toBe(true);
    w.inputs.plateA = false;
    w.frame.signals.grappleAnchor = true;
    expect(connectionPowered(elbow, w)).toBe(true);
    expect(connectionPowered({ ...elbow, resolved: false }, w)).toBe(false);
    delete w.frame.signals;
    expect(connectionPowered(elbow, w)).toBe(true);
    w.frame.outputs.grappleAnchor = false;
    expect(connectionPowered(elbow, w)).toBe(false);
    expect(connectionPowered(elbow, { inputs: w.inputs })).toBe(false);
});
it('legacy switchD and draft source wires retain accepted controls/plates without borrowing destination power', () => {
    const w = { inputs: emptyInputs(), frame: emptyFrame() };
    const draft = { ...elbow, resolved: false, input: 'draft:held' } satisfies MachineConnection;
    w.frame.controls = { 'draft:held': false }; w.frame.plates = { 'draft:held': true };
    expect(connectionPowered(draft, w)).toBe(false);
    delete w.frame.controls['draft:held'];
    expect(connectionPowered(draft, w)).toBe(true);
    w.frame.plates['draft:held'] = false; w.frame.controls['draft:held'] = true;
    expect(connectionPowered(draft, w)).toBe(true);
    w.frame.outputs.codePlatformA = true;
    expect(connectionPowered({ ...elbow, resolved: false, input: 'switchD' }, w)).toBe(true);
    expect(connectionPowered({ ...draft, resolved: true }, w)).toBe(false);
});
it('inactive wiring keeps a complete edged backbone while its faint scan follows the same uninterrupted corners', () => {
    const strokes = render([elbow], false, 2).filter(p => p.kind === 'stroke');
    const backbone = strokes.filter(p => !p.dash.length), scans = strokes.filter(p => p.dash.length);
    expect(backbone).toHaveLength(2); expect(scans).toHaveLength(1);
    expect(backbone[0]).toMatchObject({ colour: '#0b121a', width: 3.8, alpha: .9 });
    expect(backbone[1]).toMatchObject({ colour: '#71849c', width: 1.8, alpha: .85 });
    const fullPath = elbow.points.map((p, i) => [i ? 'lineTo' : 'moveTo', p.x, p.y]);
    for (const stroke of strokes) expect(stroke.path).toEqual(fullPath);
    expect(scans[0]).toMatchObject({ colour: '#a0b3cd', width: 1.3, alpha: .55, dash: [12, 228], offset: -150 });
    const later = render([elbow], false, 4).find(p => p.kind === 'stroke' && p.dash.length)!;
    expect(later.path).toEqual(scans[0].path); expect(later.offset).toBe(-300);
    expect(render([elbow], false, 2).some(p => p.kind === 'fill')).toBe(false);
});
it.each([false, true])('motion-disabled %s wiring remains complete and identical as world time changes', powered => {
    const still = render([elbow], powered, 0, false);
    expect(render([elbow], powered, 100, false)).toEqual(still);
    expect(still.filter(p => p.kind === 'stroke')).toHaveLength(powered ? 1 : 2);
    expect(still.every(p => p.kind === 'stroke' && !p.dash.length && p.offset === 0)).toBe(true);
    expect(render([elbow], powered, 0)).not.toEqual(render([elbow], powered, 2));
});
it.each([['grappleAnchor', '#64e6d5'], ['relayGates', '#b59bff']] as const)(
    'powered %s keeps its existing coloured backbone, dash speed and travelling pulse', (output, colour) => {
        const link = { ...elbow, output }, paints = render([link], true, 1.5);
        const strokes = paints.filter(p => p.kind === 'stroke'), pulse = paints.find(p => p.kind === 'fill')!;
        expect(strokes).toHaveLength(2);
        expect(strokes[0]).toMatchObject({ colour, width: 2, alpha: .65, dash: [] });
        expect(strokes[1]).toMatchObject({ colour, width: 2, alpha: .95, dash: [9, 28], offset: -105 });
        expect(strokes[1].path).toEqual(strokes[0].path);
        const at = connectionPulse(link.points, 1.5);
        expect(pulse).toMatchObject({ colour: '#d6fff4', alpha: .95,
            path: [['arc', at.x, at.y, 3.5, 0, Math.PI * 2]] });
    });
it.each([false, true])('animated %s wires reset their dash before the next complete backbone', powered => {
    const strokes = render([elbow, { ...elbow, id: 'next' }], powered, 3).filter(p => p.kind === 'stroke');
    const nextBackbone = strokes[powered ? 2 : 3];
    expect(nextBackbone.dash).toEqual([]); expect(nextBackbone.offset).toBe(0);
    expect(nextBackbone.path).toEqual(strokes[0].path);
});
it.each([false, true])('NOT modules have opaque housings and truthful ports when their input is %s', source => {
    const link = inverter(), links = [link, { ...link, id: 'branch', points: [...elbow.points.slice(0, 2), { x: 800, y: 180 }] }];
    for (const motion of [false, true]) {
        const { paints, diagnostic } = record(links, false, 7, motion, circuitFrame(source, !source));
        expect(diagnostic.gates).toHaveLength(1); expect(diagnostic.unavailable).toEqual([]);
        const node = diagnostic.gates[0]; expect(node).toMatchObject({ op: 'NOT', input: source, output: !source });
        const labels = paints.filter(p => p.kind === 'text'), housings = paints.filter(p => p.kind === 'fill' && p.path.some(c => c[0] === 'closePath'));
        expect(labels).toHaveLength(1); expect(housings).toHaveLength(1);
        expect(labels[0]).toMatchObject({ text: 'NOT', colour: '#ffd76a', font: 'bold 14px monospace', alpha: 1,
            path: [['text', node.at.x, node.at.y]] });
        expect(housings[0]).toMatchObject({ colour: '#111820', alpha: 1 });
        expect(paints.find(p => p.kind === 'rect' && p.path[0][1] === node.inputAt.x - 2.5)).toMatchObject({
            colour: source ? '#64e6d5' : '#71849c', alpha: 1,
            path: [['rect', node.inputAt.x - 2.5, node.inputAt.y - 2.5, 5, 5]],
        });
        expect(paints.find(p => p.kind === 'stroke' && p.path[0][0] === 'arc' && p.path[0][3] === 3)).toMatchObject({
            colour: source ? '#71849c' : '#64e6d5', alpha: 1,
        });
    }
});
it('module deduplication follows the source and operation, never mere coordinate proximity', () => {
    const first = inverter(), unrelated = { ...inverter('other'), id: 'unrelated' }, frame = circuitFrame(false, true);
    const result = record([first, { ...first, id: 'same-source' }, unrelated], false, 2, true,
        { ...frame, inputs: { ...frame.inputs, other: false } });
    expect(result.diagnostic.gates).toHaveLength(2);
    expect(result.diagnostic.gates[0].at).toEqual(result.diagnostic.gates[1].at);
    expect(result.diagnostic.gates[0].id).not.toBe(result.diagnostic.gates[1].id);
    expect(result.paints.filter(p => p.kind === 'text' && p.text === 'NOT')).toHaveLength(2);
    const and = chain('AND'), or = { ...chain('OR'), id: 'different-operation' };
    const split = record([and, or], false, 2, true, circuitFrame(false, true, true));
    expect(split.diagnostic.gates.map(g => g.op)).toEqual(['NOT', 'AND', 'OR']);
});
it.each([
    ['AND', false, false, false], ['AND', true, true, false], ['AND', false, true, true], ['OR', true, true, true],
] as const)('%s draws source=%s, enable=%s and final=%s as separate animated segments', (op, source, enable, final) => {
    const { paints, diagnostic } = record([chain(op)], false, .73, true, circuitFrame(source, final, enable));
    expect(diagnostic.unavailable).toEqual([]);
    const [not, junction] = diagnostic.gates;
    expect(not).toMatchObject({ op: 'NOT', input: source, output: !source });
    expect(junction).toMatchObject({ op, input: !source, output: final });
    const strokes = wireStrokes(paints);
    const atStart = (point: { x: number; y: number }) => strokes.filter(p => p.path[0][1] === point.x && p.path[0][2] === point.y);
    for (const [start, end, active] of [[elbow.points[0], not.inputAt, source], [not.outputAt, junction.inputAt, !source],
        [junction.outputAt, elbow.points.at(-1)!, final]] as const) {
        const segment = atStart(start);
        expect(segment).toHaveLength(active ? 2 : 3);
        expect(segment.every(p => p.path.at(-1)![1] === end.x && p.path.at(-1)![2] === end.y)).toBe(true);
        expect(segment[0]).toMatchObject(active ? { colour: '#64e6d5', alpha: .65 } : { colour: '#0b121a', alpha: .9 });
        const scan = segment.find(p => p.dash.length)!;
        expect(scan).toMatchObject(active ? { dash: [9, 28], offset: -.73 * 70 } : { dash: [12, 228], offset: -.73 * 75 });
    }
    // Each hot segment owns its pulse; it cannot jump across a module or an
    // unpowered intermediate/final leg just because the destination is active.
    const pulses = paints.filter(p => p.kind === 'fill' && p.colour === '#d6fff4');
    const hot = strokes.filter(p => p.dash.length && p.colour === '#64e6d5');
    expect(pulses).toHaveLength(hot.length);
    expect(pulses.map(p => p.path[0].slice(1, 3))).toEqual(hot.map(p => {
        const point = connectionPulse(p.path.map(command => ({ x: command[1], y: command[2] })), .73);
        return [point.x, point.y];
    }));
    for (const pulse of pulses) for (const node of diagnostic.gates) {
        const [, x, y] = pulse.path[0], b = node.bounds;
        expect(x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h).toBe(true);
    }
    const firstHousing = paints.findIndex(p => p.kind === 'fill' && p.path.some(c => c[0] === 'closePath'));
    expect(paints.slice(firstHousing).some(p => p.dash.length > 0 || p.kind === 'fill' && p.colour === '#d6fff4')).toBe(false);
});
it('motion-disabled inverter and compound modules remain identical as world time changes', () => {
    for (const source of [false, true]) for (const enable of [false, true]) for (const op of ['AND', 'OR'] as const) {
        const final = op === 'AND' ? !source && enable : !source || enable, frame = circuitFrame(source, final, enable);
        const first = record([chain(op)], false, 0, false, frame), later = record([chain(op)], false, 100, false, frame);
        expect(later).toEqual(first);
        expect(first.paints.some(p => p.dash.length || p.kind === 'fill' && p.colour === '#d6fff4')).toBe(false);
        expect(first.diagnostic.gates.map(g => g.op)).toEqual(['NOT', op]);
    }
});
it('unmapped inversion stays neutral and never fabricates a NOT rule from the destination', () => {
    const legacy = { ...elbow, inverted: true };
    for (const destination of [false, true]) {
        const result = record([legacy], destination, 7);
        expect(result.diagnostic.unavailable).toEqual([legacy.id]);
        expect(result.diagnostic.gates).toMatchObject([{ op: '?', input: null, output: null }]);
        expect(result.paints.filter(p => p.kind === 'text').map(p => p.text)).toEqual(['?']);
        expect(wireStrokes(result.paints).map(p => p.colour)).toEqual(['#0b121a', '#605e60']);
        expect(result.paints.some(p => p.dash.length || p.kind === 'fill' && p.colour === '#d6fff4')).toBe(false);
        expect(record([legacy], destination, 0)).toEqual(record([legacy], destination, 100));
    }
    const missingPorts = record([inverter()], true, 7);
    expect(missingPorts.diagnostic.gates).toMatchObject([{ op: 'NOT', input: null, output: null }]);
    expect(wireStrokes(missingPorts.paints).every(p => ['#0b121a', '#605e60'].includes(p.colour))).toBe(true);
    expect(missingPorts.paints.some(p => p.dash.length || p.kind === 'fill' && p.colour === '#d6fff4')).toBe(false);
    const ordinary = record([{ ...elbow, inverted: false }], false, 7);
    expect(ordinary.diagnostic.gates).toEqual([]);
    expect(ordinary.paints.some(p => p.kind === 'text' || p.kind === 'rect')).toBe(false);
});
it('powered pulses travel around a corner and loop without adding gameplay delay', () => {
    const path = [{ x: 0, y: 0 }, { x: 220, y: 0 }, { x: 220, y: 220 }];
    expect(connectionPulse(path, .5)).toEqual({ x: 110, y: 0 });
    expect(connectionPulse(path, 1.5)).toEqual({ x: 220, y: 110 });
    expect(connectionPulse(path, 2.5)).toEqual(connectionPulse(path, .5));
});
it.each([[1600, 744], [960, 500]])('the held overview fits the entire taller chamber at %s×%s', (width, height) => {
    const room = roomById('uplink'), c = new Camera(); c.setWorld(room.width, room.height, 740);
    for (let i = 0; i < 600; i++) c.update(1 / 120, room.spawn, { x: 0, y: 0 }, width, height, { x: 0, y: 0, w: room.width, h: room.height });
    expect(c.originX()).toBeLessThanOrEqual(0); expect(c.originY()).toBeLessThanOrEqual(0);
    expect(c.originX() + width / c.zoom).toBeGreaterThanOrEqual(room.width);
    expect(c.originY() + height / c.zoom).toBeGreaterThanOrEqual(room.height);
});
