import { TracePlayback } from './evidence-presentation.ts';
import { drawPlatformListings, drawMachineListings, platformAddress } from './evidence-render.ts';
import { drawNinja } from '../render/ninja.ts';
import { CUBE_SIZE, CODE_SLAB_HEIGHT } from './tuning.ts';
import { Camera } from '../render/camera.ts';
import { Particles } from '../render/fx.ts';
import type { Vec2 } from '../engine/geometry.ts';
import { revealMessage, authoredPresentation, type MachinePresentation } from './presentation.ts';
import type { PuzzleWorld } from './world.ts';
import { ROOM_IDS } from './controller.ts';
import { isCoopLevel } from '../coop/protocol.ts';
import { canJumpFromRope, type PlayerState } from '../engine/physics.ts';
import { drawMachinery } from './machinery-render.ts';
import { drawFirewalls } from './firewall-render.ts';
import { drawConnections, roomConnections, type MachineConnection } from './connections.ts';
const C = { bg: '#0c131a', grid: '#15232c', wall: '#21303a', line: '#43545d', ink: '#e2edf1', dim: '#8399a5', cyan: '#64e6d5', amber: '#f9ba68', red: '#fa817e' };
export class PuzzleRenderer {
    replay = new TracePlayback();
    revealBogus = false;
    private returnReveal = 0;
    private exitWasOpen = false;
    connections: MachineConnection[] = [];
    camera = new Camera();
    particles = new Particles();
    private ctx: CanvasRenderingContext2D;
    constructor(readonly canvas: HTMLCanvasElement, private presentation: MachinePresentation = authoredPresentation) { this.ctx = canvas.getContext('2d')!; }
    resize(): void {
        const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        if (this.canvas.width !== Math.round(rect.width * dpr) || this.canvas.height !== Math.round(rect.height * dpr)) {
            this.canvas.width = Math.round(rect.width * dpr);
            this.canvas.height = Math.round(rect.height * dpr);
        }
        this.camera.viewW = rect.width;
        this.camera.viewH = rect.height;
    }
    room(world: PuzzleWorld): void {
        this.connections = roomConnections(world.room);
        this.resize();
        this.camera.setWorld(world.room.width, world.room.height, 740);
        this.camera.snapTo(world.player.x, world.player.y - 100);
        this.particles.clear();
        this.returnReveal = 0;
        this.exitWasOpen = world.frame.outputs.exitDoor;
        this.replay = new TracePlayback();
        this.replay.update(world.frame, 0);
    }
    private text(text: string, x: number, y: number, size = 14, colour = C.dim): void {
        this.ctx.fillStyle = colour;
        this.ctx.font = `${size >= 24 ? '600' : '500'} ${size}px ui-monospace, monospace`;
        this.ctx.fillText(text, x, y);
    }
    private line(x: number, y: number, x2: number, y2: number, colour: string, width = 2): void {
        const c = this.ctx;
        c.strokeStyle = colour;
        c.lineWidth = width;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x2, y2);
        c.stroke();
    }
    private ring(x: number, y: number, radius: number, colour: string): void {
        const c = this.ctx;
        c.strokeStyle = colour;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y, radius, 0, Math.PI * 2);
        c.stroke();
    }
    draw(w: PuzzleWorld, dt: number, aim: Vec2, overview: boolean, players?: { localSlot: 1 | 2; remote: PlayerState | null; reachedExit: [boolean, boolean]; completed: boolean; remotePullingCube?: boolean }): void {
        this.resize();
        this.replay.update(w.frame, dt);
        const c = this.ctx, cam = this.camera, r = w.room;
        // Authored reveal of the final physical route; outputs and controls never wait for it.
        if (r.id === 'uplink' && w.frame.outputs.exitDoor && !this.exitWasOpen) this.returnReveal = 2.2;
        this.exitWasOpen = w.frame.outputs.exitDoor;
        this.returnReveal = Math.max(0, this.returnReveal - dt);
        cam.update(dt, w.player, { x: w.player.vx, y: w.player.vy }, cam.viewW, cam.viewH, overview ? { x: 0, y: 0, w: r.width, h: r.height } : this.returnReveal > 0 ? { x: 0, y: 0, w: r.width, h: 850 } : null, r.id === 'uplink' || r.id === 'lift-lab' ? null : { offsetY: -140, minY: 340, maxY: 390 });
        const dpr = Math.min(devicePixelRatio || 1, 2);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.fillStyle = C.bg;
        c.fillRect(0, 0, cam.viewW, cam.viewH);
        c.scale(cam.zoom, cam.zoom);
        c.translate(-cam.originX(), -cam.originY());
        for (let x = 0; x < r.width; x += 50)
            this.line(x, 0, x, r.height, C.grid, 0.6);
        for (let y = 0; y < r.height; y += 50)
            this.line(0, y, r.width, y, C.grid, 0.6);
        this.text(isCoopLevel(r.id) ? `CO-OP / ${r.title}` : `0${ROOM_IDS.indexOf(r.id) + 1} / ${r.title}`, 80, r.id === 'uplink' ? 935 : 90, 18, C.cyan);
        this.text(r.instruction, 80, r.id === 'uplink' ? 1045 : 132, 27, C.ink);
        drawConnections(c, this.connections, w);
        for (const h of r.hazards) {
            c.fillStyle = '#552a32';
            c.fillRect(h.x, h.y, h.w, h.h);
            for (let x = h.x; x < h.x + h.w; x += 28) {
                c.fillStyle = C.red;
                c.beginPath();
                c.moveTo(x, h.y + 15);
                c.lineTo(x + 12, h.y);
                c.lineTo(x + 24, h.y + 15);
                c.fill();
            }
            this.text('RESET FIELD', h.x + 24, h.y + 43, 13, C.red);
        }
        drawPlatformListings(c, w, this.replay, this.presentation);
        for (const p of w.platforms) {
            const b = p.def.kind === 'static' ? p.def : { ...p.def, h: Math.min(CODE_SLAB_HEIGHT, p.def.h) };
            if (b.kind === 'static') {
                c.fillStyle = C.wall;
                c.fillRect(b.x, b.y, b.w, b.h);
                this.line(b.x, b.y, b.x + b.w, b.y, C.line, 3);
                if (b.w >= 120) this.text('STATIC', b.x + 12, b.y + 27, 9, '#718996');
                for (let x = b.x + 18; x < b.x + b.w; x += 75)
                    this.line(x, b.y + 14, x + 20, b.y + 14, '#31444d', 2);
                continue;
            }
            const crumble = b.kind === 'crumble-prototype' || b.kind === 'crumble-proven';
            const active = p.solid.enabled;
            const colour = crumble ? C.amber : active ? C.cyan : C.dim;
            c.globalAlpha = active ? 1 : 0.4;
            c.fillStyle = crumble ? '#342c24' : active ? '#173d3d' : '#14222b';
            c.fillRect(b.x, b.y, b.w, b.h);
            c.strokeStyle = colour;
            c.lineWidth = active ? 2 : 1;
            c.setLineDash(active ? [] : [5, 5]);
            c.strokeRect(b.x, b.y, b.w, b.h);
            c.setLineDash([]);
            const address = r.id === 'uplink' ? platformAddress(p, this.replay) : null;
            this.text(address ?? b.label ?? b.id, b.x + 8, b.y + Math.min(19, b.h - 7), address ? 11 : 12, colour);
            if (address) {
                const type = crumble ? this.revealBogus ? 'PROVEN BOGUS' : 'UNSTABLE' : active ? 'CODE' : 'GHOST';
                this.text(type, b.x + b.w - type.length * 5.5 - 6, b.y + Math.min(18, b.h - 8), 9, colour);
            }
            if (crumble) {
                if (!address) this.text('prototype', b.x + 12, b.y + 49, 11, C.amber);
                if (p.fuse >= 0) {
                    c.fillStyle = C.amber;
                    c.fillRect(b.x, b.y - 5, b.w * p.fuse / p.fuseDuration, 3);
                    if (ropeOn(p.def.id, w)) this.text('ANCHOR FAILING · RELEASE', b.x - 20, b.y - 18, 12, C.amber);
                }
                if (p.respawn > 0)
                    this.text(`${p.respawn.toFixed(1)}s`, b.x + 50, b.y - 10, 13, C.amber);
            }
            c.globalAlpha = 1;
            if (p.pulse > 0) {
                c.globalAlpha = p.pulse;
                c.strokeStyle = C.cyan;
                c.lineWidth = 3;
                c.strokeRect(b.x - 8 * (1 - p.pulse), b.y - 8 * (1 - p.pulse), b.w + 16 * (1 - p.pulse), b.h + 16 * (1 - p.pulse));
                c.globalAlpha = 1;
            }
        }
        if (r.id === 'uplink') {
            this.text('CONTROL WING', 1030, 1100, 19, C.dim);
            this.text('SERVICE BAY', 2360, 815, 16, C.dim);
            this.text('CORE NODE', 3080, 450, 22, C.cyan);
            this.text('RECOVERY DECK', 2900, 895, 14, C.dim);
            this.text('← RETURN TO LIFT', 2280, 915, 12, C.dim);
            for (const p of w.platforms.filter(p => p.def.signal === 'codePlatformB'))
                this.text(p.def.label!, p.def.x + p.def.w / 2 - 70, p.def.y - 24, 12, p.solid.enabled ? C.cyan : C.dim);
        }
        drawMachinery(c, w, this.presentation);
        drawFirewalls(c, w.firewalls, w.elapsed);
        if (r.id === 'uplink') {
            // Labels sit clear of the shaft edges and are drawn AFTER the field.
            const lift = w.lifts[0].def;
            this.text('LIFT / VERTICAL TRANSPORT', lift.x + 18, lift.y + lift.h - 85, 13, C.dim);
            if (w.inputs.switchC) {
                const feedback = this.presentation.describe(r.id, w.frame, 'liftField');
                this.text(revealMessage(feedback, 1 - w.displayPulse), lift.x + lift.w + 20, r.upperLever!.y + 65, 12, C.cyan);
            }
        }
        const plates = [
            { at: r.plate, active: w.inputs.plateA, depth: w.plateDepth, label: r.id === 'lift-lab' ? 'HOLD / LIFT POWER' : r.id === 'pairing-bay' || r.id === 'relay' || r.id === 'uplink' ? 'PLATE A / ANCHOR' : 'BUTTON' },
            { at: r.plateB, active: w.inputs.plateB, depth: w.plateDepthB, label: r.id === 'pairing-bay' ? 'FINAL / LEFT' : r.id === 'uplink' ? 'PLATE B / LIFT' : 'PLATE B / EXIT' },
            { at: r.plateC, active: r.id === 'pairing-bay' ? w.inputs.plateC : w.inputs.cubeOnPlateC, depth: w.plateDepthC, label: r.id === 'pairing-bay' ? 'FINAL / RIGHT' : 'NODE C / CUBE PAYLOAD' },
            { at: r.cargoPlate, active: w.cargoPlateActive, depth: w.cargoPlateDepth, label: 'CARGO PLATE / CUBE ONLY' },
        ];
        for (const plate of plates) {
            if (!plate.at) continue;
            const { x, y } = plate.at;
            c.fillStyle = '#101c23';
            c.fillRect(x - 51, y - 3, 102, 13);
            c.fillStyle = plate.active ? C.cyan : C.amber;
            c.fillRect(x - 45, y - 9 + plate.depth * 6, 90, 7);
            this.text(plate.label, x - 55, y + 49, 12, plate.active ? C.cyan : C.amber);
        }
        if (r.plateB && r.id === 'relay') {
            if (w.frame.outputs.bridge && !w.frame.outputs.exitDoor) this.text('MOVE THE CUBE TO B', 1090, 355, 16, C.amber);
        }
        for (const lever of [
            { at: r.lever, active: w.inputs.switchB, name: r.id === 'relay-lab' ? 'RELAY POWER' : r.id === 'pairing-bay' ? 'SWITCH B' : r.id === 'relay' ? 'BRIDGE' : r.id === 'uplink' ? 'RELAY POWER' : 'SWITCH', latch: r.id === 'relay' || r.id === 'pairing-bay' || r.id === 'relay-lab' },
            { at: r.upperLever, active: w.inputs.switchC, name: 'LIFT LATCH', latch: true },
        ]) {
            if (!lever.at) continue;
            const { x, y } = lever.at;
            c.fillStyle = C.wall;
            c.fillRect(x - 24, y - 36, 48, 36);
            this.ring(x, y - 33, 8, C.line);
            const dx = lever.active ? 19 : -19;
            this.line(x, y - 33, x + dx, y - 72, lever.active ? C.cyan : C.amber, 6);
            this.ring(x + dx, y - 72, 7, C.ink);
            this.text(`${lever.name} / ${lever.active ? lever.latch ? 'LOCKED' : 'ON' : 'OFF'}`, x - 55, y + 40, 13, lever.active ? C.cyan : C.amber);
        }
        if (r.id !== 'uplink') {
            const feedback = this.presentation.describe(r.id, w.frame);
            const displayOn = feedback.active, message = feedback.text;
            c.fillStyle = '#111f29';
            c.fillRect(r.display.x, r.display.y, 310, 78);
            this.line(r.display.x, r.display.y, r.display.x + 310, r.display.y, displayOn ? C.cyan : C.line, 2);
            this.text(feedback.label, r.display.x + 16, r.display.y + 23, 11, C.dim);
            const decoded = displayOn ? Math.floor(message.length * (1 - w.displayPulse)) : 0;
            const display = message.split('').map((ch, i) => i < decoded ? ch : ((i * 17 + Math.floor(w.elapsed * 8)) % 16).toString(16).toUpperCase()).join('');
            this.text(display, r.display.x + 16, r.display.y + 51, 17, displayOn ? C.cyan : C.dim);
        }
        const e = r.exit;
        c.fillStyle = '#12312f';
        c.fillRect(e.x, e.y, e.w, e.h);
        c.strokeStyle = w.frame.outputs.exitDoor ? C.cyan : C.line;
        c.lineWidth = 3;
        c.strokeRect(e.x, e.y, e.w, e.h);
        c.fillStyle = '#52616a';
        c.fillRect(e.x, e.y, e.w, e.h * (1 - w.doorOpen));
        this.text(r.id === 'uplink' ? '← EXIT' : 'EXIT →', e.x - 6, e.y - 18, 15, C.cyan);
        if (isCoopLevel(r.id)) {
            this.text(players?.completed ? r.id === 'pairing-bay' ? 'PAIRING COMPLETE' : 'LAB COMPLETE' : 'BOTH PLAYERS REQUIRED', e.x - 65, e.y - 46, 12, C.cyan);
            if (w.frame.outputs.exitDoor) this.text(`${players?.reachedExit.filter(Boolean).length ?? 0} / 2 ARRIVED`, e.x + 8, e.y + 38, 12, C.cyan);
        }
        drawMachineListings(c, w, this.replay, this.presentation);
        const checkpoint = w.checkpointPosition();
        this.line(checkpoint.x, checkpoint.y + 17, checkpoint.x, checkpoint.y - 47, C.cyan);
        c.fillStyle = C.cyan;
        c.fillRect(checkpoint.x, checkpoint.y - 47, 20, 10);
        if (w.cube && !w.cubeResetting) {
            const cube = w.cube;
            c.fillStyle = '#393b32';
            c.fillRect(cube.x - CUBE_SIZE / 2, cube.y - CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
            c.strokeStyle = C.amber;
            c.lineWidth = 3;
            c.strokeRect(cube.x - CUBE_SIZE / 2, cube.y - CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE);
            this.ring(cube.x, cube.y, 8, C.amber);
            if (w.pullingCube) {
                c.setLineDash([6, 5]);
                this.line(w.player.x, w.player.y, cube.x, cube.y, C.amber);
                c.setLineDash([]);
            }
            if (players?.remotePullingCube && players.remote) {
                c.setLineDash([6, 5]);
                this.line(players.remote.x, players.remote.y, cube.x, cube.y, C.amber);
                c.setLineDash([]);
            }
        }
        const p = w.player, rope = p.rope;
        if (rope.phase !== 'idle') {
            this.line(p.x, p.y, rope.tip.x, rope.tip.y, C.cyan, 2);
            this.ring(rope.tip.x, rope.tip.y, 4, C.ink);
        }
        const localAccent = players?.localSlot === 2 ? '#b59bff' : C.cyan;
        if (players?.remote) {
            const other = players.remote, accent = players.localSlot === 1 ? '#b59bff' : C.cyan;
            if (other.rope.phase !== 'idle') this.line(other.x, other.y, other.rope.tip.x, other.rope.tip.y, accent);
            drawNinja(c, other, w.elapsed, accent);
            this.text(`PLAYER ${players.localSlot === 1 ? 2 : 1}`, other.x - 32, other.y - 30, 10, accent);
        }
        drawNinja(c, p, w.elapsed, localAccent);
        if (players) this.text(`YOU / P${players.localSlot}`, p.x - 26, p.y - 30, 10, localAccent);
        const hint = w.interactionHint();
        if (hint)
            this.text(hint, p.x - 80, p.y - 72, 15, C.ink);
        const target = w.target(aim);
        if (target) {
            this.ring(target.point.x, target.point.y, 21, C.ink);
            c.setLineDash([3, 8]);
            this.line(p.x, p.y, target.point.x, target.point.y, '#629b99', 1);
            c.setLineDash([]);
            if (!p.grounded && ['idle', 'retracting'].includes(rope.phase)) this.text('SPACE · GRAPPLE', p.x - 65, p.y - 48, 13, C.cyan);
        }
        if (rope.phase === 'attached') this.text(canJumpFromRope(p) ? 'SPACE · JUMP OFF' : 'SPACE · RELEASE', p.x - 65, p.y - 48, 13, C.cyan);
        else if (w.keyboardGrapple) this.text('SPACE · CANCEL HOOK', p.x - 65, p.y - 48, 13, C.cyan);
        if (r.id === 'switch' || r.id === 'relay' || r.id === 'pairing-bay') {
            this.text('HOLD CLICK + D', 305, 440, 15, C.ink);
            this.text('OR SPACE IN THE AIR', 285, 461, 13, C.cyan);
            this.text('Release as you swing right', 310, 483, 12, C.dim);
        }
        if (r.id === 'pairing-bay') {
            this.text('MOCK MULTIPLAYER TEST · NO BINARY EVIDENCE', 80, 170, 12, C.dim);
            this.text('HOLD FOR YOUR PARTNER', 110, 380, 15, C.cyan);
            this.text('RETURN BRIDGE CONTROL', 900, 380, 15, C.cyan);
            this.text('A THIRD HAND', 1170, 410, 14, C.amber);
            this.text('SAFE FLOOR · RETURN TO CARGO', 1200, 660, 12, C.dim);
            this.text(w.frame.outputs.exitDoor ? 'EXIT UNLOCKED · REGROUP →' : 'TWO SIGNALS REQUIRED', 1670, 240, 14, C.ink);
        }
        if (isCoopLevel(r.id) && r.id !== 'pairing-bay') {
            this.text('MOCK MECHANICS LAB · NO BINARY EVIDENCE', 80, 170, 12, C.dim);
            if (r.id === 'relay-lab') {
                this.text('E · POWER CONTROL', 305, 410, 13, C.cyan);
                this.text('TRY LOOSE CARGO, THEN CARRY IT', 80, 355, 13, C.amber);
                this.text('JUMP INTO B TO RETURN', 1045, 590, 12, C.dim);
            } else if (r.id === 'lift-lab') {
                this.text('E · LATCH + SHARED CHECKPOINT', 760, 235, 12, C.cyan);
                this.text('HOLD HERE FOR YOUR PARTNER', 220, 740, 14, C.cyan);
                this.text('R · RESET ONLY YOUR BODY', 805, 455, 12, C.dim);
            } else if (r.id === 'boost-lab') {
                this.text('BOOST HERE', 430, 570, 13, C.cyan);
                this.text('E · OPEN RETURN ROUTE', 640, 350, 12, C.cyan);
            } else if (r.id === 'firewall-lab') {
                this.text('E · SAVE CHECKPOINT', 60, 480, 12, C.cyan);
                this.text('DROP / CARRY / PULL', 350, 450, 13, C.amber);
                this.text('ALWAYS LIVE · JUMP OVER →', 760, 485, 12, C.amber);
            } else {
                this.text('STEP · SHORT WARNING', 400, 485, 12, C.amber);
                this.text('HOOK · LONG WARNING', 865, 275, 12, C.amber);
                this.text('BOTH TESTS UNLOCK THE EXIT', 800, 440, 12, C.dim);
            }
        }
        if (r.id === 'relay')
            this.text('SAFE RECOVERY FLOOR · JUMP BACK UP', 1220, 700, 13, C.dim);
        this.particles.update(dt);
        this.particles.draw(c);
        if (w.deathFlash > 0) {
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.fillStyle = `rgba(250,129,126,${w.deathFlash * .4})`;
            c.fillRect(0, 0, cam.viewW, cam.viewH);
        }
    }
}
function ropeOn(id: string, w: PuzzleWorld): boolean { return w.player.rope.phase === 'attached' && w.player.rope.anchorId === id; }
