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
function render(links: MachineConnection[], powered: boolean, seconds: number, motion = true) {
    const paints: Paint[] = [];
    let path: PathCommand[] = [], dash: number[] = [];
    const c = {
        strokeStyle: '', fillStyle: '', globalAlpha: 1, lineWidth: 1, lineDashOffset: 0, font: '',
        save() {}, restore() {}, beginPath() { path = []; },
        moveTo(x: number, y: number) { path.push(['moveTo', x, y]); },
        lineTo(x: number, y: number) { path.push(['lineTo', x, y]); },
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
    const world = { inputs, frame, elapsed: seconds } as PuzzleWorld;
    const before = structuredClone(world);
    drawConnections(c as unknown as CanvasRenderingContext2D, links, world, motion);
    expect(world).toEqual(before);
    return paints;
}

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
it.each([false, true])('NOT stays opaque and deduplicated for %s shared inverted trunks', powered => {
    const links = [{ ...elbow, inverted: true }, { ...elbow, id: 'branch', inverted: true,
        points: [...elbow.points.slice(0, 2), { x: 800, y: 180 }] }, { ...elbow, id: 'ordinary' }];
    for (const motion of [false, true]) {
        const paints = render(links, powered, 7, motion), labels = paints.filter(p => p.kind === 'text'), backing = paints.filter(p => p.kind === 'rect');
        expect(labels).toHaveLength(1); expect(backing).toHaveLength(1);
        expect(labels[0]).toMatchObject({ text: 'NOT', colour: '#ffd76a', font: 'bold 14px monospace', alpha: 1 });
        expect(backing[0]).toMatchObject({ colour: '#111820', alpha: 1 });
        expect(paints.at(-1)).toBe(labels[0]);
        expect(render([{ ...elbow, inverted: false }], powered, 7, motion).some(p => p.kind === 'text' || p.kind === 'rect')).toBe(false);
    }
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
