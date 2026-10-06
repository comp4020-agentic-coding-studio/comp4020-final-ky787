import type { Vec2 } from '../engine/geometry.ts';
import type { ControllerInputs, ControllerOutputs } from './controller.ts';
import type { RoomDef } from './rooms.ts';
import type { PuzzleWorld } from './world.ts';

/** Authored physical wiring, NEVER native control-flow edges or trace timing. */
export interface MachineConnection {
    id: string;
    input: keyof ControllerInputs;
    output: keyof ControllerOutputs;
    points: Vec2[];
}
export function roomConnections(r: RoomDef): MachineConnection[] {
    const wires: MachineConnection[] = [];
    const add = (id: string, input: MachineConnection['input'], output: MachineConnection['output'], points: Vec2[]) => wires.push({ id, input, output, points });
    const above = (p: Vec2) => ({ x: p.x, y: p.y - 12 });
    const elbow = (from: Vec2, to: Vec2, y: number) => [from, { x: from.x, y }, { x: to.x, y }, to];
    const anchor = r.platforms.find(p => p.id === 'anchor');
    if (anchor) {
        const source = r.id === 'switch' ? r.lever! : r.plate!;
        add('anchor-feed', r.id === 'switch' ? 'switchB' : 'plateA', 'grappleAnchor',
            [above(source), { x: source.x, y: source.y - 130 }, { x: anchor.x - 75, y: source.y - 130 },
                { x: anchor.x - 75, y: anchor.y + 12 }, { x: anchor.x, y: anchor.y + 12 }]);
    }
    if (r.id === 'uplink') {
        const relay = above(r.lever!), lift = r.lifts![0], upper = above(r.upperLever!);
        for (const gate of r.gates![0].gates)
            add(`relay-${gate.id}`, 'switchB', 'relayGates', elbow(relay, { x: gate.x + gate.w / 2, y: gate.y }, gate.y - 60));
        add('plate-lift', 'plateB', 'liftField', elbow(above(r.plateB!), { x: lift.x, y: r.plateB!.y - 80 }, r.plateB!.y - 80));
        add('latch-lift', 'switchC', 'liftField', elbow(upper, { x: lift.x + lift.w, y: lift.y + 50 }, r.upperLever!.y - 80));
        const service = r.platforms.find(p => p.id === 'service')!;
        add('service-feed', 'switchC', 'codePlatformA', elbow(upper, { x: service.x, y: service.y + 12 }, r.upperLever!.y - 55));
        const node = above(r.plateC!), trunk = [{ x: node.x + 150, y: node.y }, { x: node.x + 150, y: 40 }];
        for (const p of r.platforms.filter(p => p.signal === 'codePlatformB')) {
            // One retained output fans out to several authored objects.
            const x = p.id === 'return-catch' ? p.x : p.x + p.w / 2;
            add(`payload-${p.id}`, 'cubeOnPlateC', 'codePlatformB', [node, ...trunk, { x, y: 40 }, { x, y: p.y }]);
        }
        add('exit-feed', 'cubeOnPlateC', 'exitDoor', [node, ...trunk, { x: r.exit.x + r.exit.w / 2, y: 40 }, { x: r.exit.x + r.exit.w / 2, y: r.exit.y }]);
    } else {
        if (r.id === 'relay' || r.id === 'pairing-bay') for (const p of r.platforms.filter(p => p.signal && p.signal !== 'grappleAnchor'))
            add(`switch-${p.id}`, 'switchB', p.signal!, elbow(above(r.lever!), { x: p.x + p.w / 2, y: p.y }, r.lever!.y - 65));
        const control = r.plateB ?? r.plate ?? r.lever!;
        add('exit-feed', r.plateB ? 'plateB' : r.plate ? 'plateA' : 'switchB', 'exitDoor',
            elbow(above(control), { x: r.exit.x + r.exit.w / 2, y: r.exit.y }, control.y - 85));
        if (r.id === 'pairing-bay') add('exit-right-feed', 'plateC', 'exitDoor',
            elbow(above(r.plateC!), { x: r.exit.x + r.exit.w / 2, y: r.exit.y }, r.plateC!.y - 60));
    }
    return wires;
}
/** Show the source signal even while the destination waits for other inputs. */
export function connectionPowered(link: MachineConnection, w: Pick<PuzzleWorld, 'inputs'>): boolean {
    return w.inputs[link.input];
}
/** Constant-speed motion along the authored wire, not a simulated CPU signal delay. */
export function connectionPulse(points: readonly Vec2[], seconds: number): Vec2 {
    const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    const total = lengths.reduce((sum, d) => sum + d, 0);
    let remaining = total ? ((seconds * 220) % total + total) % total : 0;
    for (let i = 0; i < lengths.length; i++) {
        if (remaining <= lengths[i] && lengths[i] > 0) {
            const t = remaining / lengths[i];
            return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t };
        }
        remaining -= lengths[i];
    }
    return points[0];
}
export function drawConnections(c: CanvasRenderingContext2D, links: readonly MachineConnection[], w: PuzzleWorld): void {
    c.save();
    for (const link of links) {
        const on = connectionPowered(link, w), colour = link.output === 'relayGates' ? '#b59bff' : '#64e6d5';
        c.strokeStyle = on ? colour : '#344955'; c.globalAlpha = on ? .65 : .45;
        c.lineWidth = on ? 2 : 1;
        c.beginPath(); link.points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
        if (!on) continue;
        c.setLineDash([9, 28]); c.lineDashOffset = -w.elapsed * 70; c.globalAlpha = .95; c.stroke();
        c.setLineDash([]); c.lineDashOffset = 0;
        const pulse = connectionPulse(link.points, w.elapsed);
        c.fillStyle = '#d6fff4'; c.beginPath(); c.arc(pulse.x, pulse.y, 3.5, 0, Math.PI * 2); c.fill();
    }
    c.restore();
}
