import { colourHex, DEFAULT_CHARACTER_PROFILE, type PublicCharacterProfile } from '../character/profile.ts';
import { characterForSlot, characterLabel } from '../character/presentation.ts';
import type { CharacterProfiles, Slot } from '../coop/protocol.ts';
import { cubeEntries, isDeclarativeLevel, type CubeId } from '../coop/protocol.ts';
import { isCampaignLevel, isAuthoredCampaignLevel } from '../coop/campaign.ts';
import { NativeWorldEvidence } from '../coop/native-world-evidence.ts';
import { NativeWorldRenderer } from './native-world-render.ts';
import { RaceCargoEvidence } from '../coop/race-cargo-evidence.ts';
import { RaceCargoRenderer } from './race-cargo-render.ts';
import { RaceMachineryEvidence } from '../coop/race-machinery-evidence.ts';
import { RaceMachineryRenderer } from './race-machinery-render.ts';
import { nativeWorldRegionLabel } from './native-world-presentation.ts';
import { TracePlayback } from './evidence-presentation.ts';
import { drawPlatformListings, drawMachineListings, platformAddress } from './evidence-render.ts';
import { drawNinja } from '../render/ninja.ts';
import { CODE_SLAB_HEIGHT } from './tuning.ts';
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
import { ContextualCamera } from './camera-reveals.ts';
import { HeroPresentation, type HeroCue } from './hero-presentation.ts';
import { drawBreakpoint, drawEntryGateways, drawEntryProjection, drawExitGate, drawRespawnMarker } from './hero-render.ts';
import { payloadReceivers } from './receiver-presentation.ts';
import { drawReceivers, drawReceiverLabels } from './receiver-render.ts';
import { drawPayload } from './payload-render.ts';
import { pressurePads } from './machinery-presentation.ts';
import { drawPressurePad, drawPadOutputPulse } from './plate-render.ts';
import { drawGravityLift } from './lift-render.ts';
const C = { bg: '#0c131a', grid: '#15232c', wall: '#21303a', line: '#43545d', ink: '#e2edf1', dim: '#8399a5', cyan: '#64e6d5', amber: '#f9ba68', red: '#fa817e' };
export class PuzzleRenderer {
    /** Solo / editor appearance; multiplayer appearance comes from authoritative slot profiles. */
    profile: PublicCharacterProfile = { ...DEFAULT_CHARACTER_PROFILE };
    nativeWorld = new NativeWorldEvidence();
    nativeWorldDisplay = new NativeWorldRenderer();
    raceCargo = new RaceCargoEvidence();
    raceCargoDisplay = new RaceCargoRenderer();
    raceMachinery = new RaceMachineryEvidence();
    raceMachineryDisplay = new RaceMachineryRenderer();
    replay = new TracePlayback();
    revealBogus = false;
    private returnReveal = 0;
    private exitWasOpen = false;
    private cameraDeaths = 0;
    cameraReveals = new ContextualCamera();
    connections: MachineConnection[] = [];
    camera = new Camera();
    showGrid = true;
    /** Explicit frozen authoring camera; gameplay follow remains the default. */
    editorCamera?: { x: number; y: number; zoom: number };
    particles = new Particles();
    heroes = new HeroPresentation();
    private readonly energyMotionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
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
    room(world: PuzzleWorld, completed = false): void {
        this.connections = roomConnections(world.room);
        this.resize();
        this.camera.setWorld(world.room.width, world.room.height, 740);
        this.camera.snapTo(world.player.x, world.player.y - 100);
        this.particles.clear();
        this.returnReveal = 0;
        this.cameraDeaths = world.deaths;
        this.cameraReveals.reset(world);
        this.exitWasOpen = world.frame.outputs.exitDoor;
        this.heroes.reset(world.room, { checkpoint: world.checkpoint, exitReady: world.frame.outputs.exitDoor, completed, receivers: payloadReceivers(world), pads: pressurePads(world), lifts: world.lifts });
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
    draw(w: PuzzleWorld, dt: number, aim: Vec2, overview: boolean, players?: { profiles?: CharacterProfiles; localSlot: 1 | 2; connected?: boolean; remote: PlayerState | null; reachedExit: [boolean, boolean]; completed: boolean; remotePullingCube?: boolean; remotePullingCubes?: CubeId[] }, running = true, editorCamera = this.editorCamera): HeroCue[] {
        this.resize();
        this.replay.update(w.frame, dt);
        const c = this.ctx, cam = this.camera, r = w.room;
        const receivers = payloadReceivers(w);
        const pads = pressurePads(w);
        const energyMotion = running && players?.connected !== false && !this.energyMotionPreference?.matches;
        const heroCues = this.heroes.update(r, { checkpoint: w.checkpoint, exitReady: w.frame.outputs.exitDoor,
            completed: players?.completed ?? w.exited, receivers, pads, lifts: w.lifts }, dt, running && players?.connected !== false);
        if (w.deaths !== this.cameraDeaths || players?.connected === false) this.returnReveal = 0;
        this.cameraDeaths = w.deaths;
        // Authored reveal of the final physical route; outputs and controls never wait for it.
        if (r.id === 'uplink' && w.frame.outputs.exitDoor && !this.exitWasOpen) this.returnReveal = 2.2;
        this.exitWasOpen = w.frame.outputs.exitDoor;
        this.returnReveal = Math.max(0, this.returnReveal - dt);
        const reveal = this.cameraReveals.update(w, dt, overview, players?.connected !== false,
            this.returnReveal > 0 ? { x: 0, y: 0, w: r.width, h: 850 } : null);
        // JSON shafts need upward hook visibility without the compact tutorial's
        // fixed vertical rail. The 210-unit bias keeps near-500-unit rising
        // catches visible even while follow easing lags a rope jump.
        const rail = isAuthoredCampaignLevel(r.id) ? { offsetY: -210, minY: 0, maxY: r.height }
            : r.id === 'uplink' || r.id === 'lift-lab' || isCampaignLevel(r.id) ? null : { offsetY: -140, minY: 340, maxY: 390 };
        if (!editorCamera) cam.update(dt, w.player, { x: w.player.vx, y: w.player.vy }, cam.viewW, cam.viewH, reveal.frame, rail);
        if (editorCamera) { cam.x = editorCamera.x; cam.y = editorCamera.y; cam.zoom = editorCamera.zoom; }
        const dpr = Math.min(devicePixelRatio || 1, 2);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.fillStyle = C.bg;
        c.fillRect(0, 0, cam.viewW, cam.viewH);
        c.scale(cam.zoom, cam.zoom);
        c.translate(-cam.originX(), -cam.originY());
        if (this.showGrid) for (let x = 0; x < r.width; x += 50)
            this.line(x, 0, x, r.height, C.grid, 0.6);
        if (this.showGrid) for (let y = 0; y < r.height; y += 50)
            this.line(0, y, r.width, y, C.grid, 0.6);
        const visible = { x: cam.originX(), y: cam.originY(), w: cam.viewW / cam.zoom, h: cam.viewH / cam.zoom };
        for (const lift of w.lifts) drawGravityLift(c, lift, this.heroes.machinery.lifts.get(lift.def.id)!, this.heroes.time, visible, cam.zoom, energyMotion, r.id !== 'uplink');
        this.text(r.id === 'workbench' ? `DRAFT / ${r.title}` : isCoopLevel(r.id) ? `CO-OP / ${r.title}` : `0${ROOM_IDS.indexOf(r.id) + 1} / ${r.title}`, 80, r.id === 'uplink' ? 935 : 90, 18, C.cyan);
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
        this.raceCargoDisplay.draw(c, this.raceCargo, r.id, visible, dt, energyMotion, running, performance.now());
        this.raceMachineryDisplay.draw(c, this.raceMachinery, r.id, visible, dt, energyMotion);
        this.nativeWorldDisplay.draw(c, w, this.nativeWorld, visible, cam.zoom, dt, energyMotion, this.raceCargo.state !== null, this.raceMachinery.state !== null);
        drawPlatformListings(c, w, this.replay, this.presentation);
        for (const p of w.platforms) {
            const b = p.def.kind === 'static' ? p.def : { ...p.def, h: Math.min(CODE_SLAB_HEIGHT, p.def.h) };
            if (b.kind === 'static') {
                if (!p.solid.enabled) continue;
                c.fillStyle = C.wall;
                c.fillRect(b.x, b.y, b.w, b.h);
                this.line(b.x, b.y, b.x + b.w, b.y, C.line, 3);
                if (b.w >= 120) this.text('STATIC', b.x + 12, b.y + 27, 9, '#718996');
                for (let x = b.x + 18; x < b.x + b.w; x += 75)
                    this.line(x, b.y + 14, x + 20, b.y + 14, '#31444d', 2);
                continue;
            }
            const crumble = b.kind === 'crumble-prototype' || b.kind === 'crumble-proven';
            const active = p.solid.enabled && (!b.signal || w.power(b.signal));
            const colour = crumble ? C.amber : active ? C.cyan : C.dim;
            const fading = p.solid.enabled && b.signal ? w.frame.fading?.[b.signal] ?? 0 : 0;
            c.globalAlpha = active ? 1 : 0.25 + 0.5 * fading;
            c.fillStyle = crumble ? '#342c24' : active ? '#173d3d' : '#14222b';
            c.fillRect(b.x, b.y, b.w, b.h);
            c.strokeStyle = colour;
            c.lineWidth = active ? 2 : 1;
            c.setLineDash(active ? [] : [5, 5]);
            c.strokeRect(b.x, b.y, b.w, b.h);
            c.setLineDash([]);
            const nativeHeader = cam.zoom >= .65 ? this.nativeWorldDisplay.header(this.nativeWorld, r.id, b.id) : null;
            const address = r.id === 'uplink' ? platformAddress(p, this.replay) : nativeHeader?.address;
            const headerColour = nativeHeader ? nativeHeader.powered ? C.cyan : C.dim : colour;
            c.save();
            if (nativeHeader) c.globalAlpha = 1;
            this.text(address ?? b.label ?? b.id, b.x + 8, b.y + Math.min(19, b.h - 7), address ? 11 : 12, headerColour);
            if (address) {
                const type = crumble ? r.id === 'uplink' && this.revealBogus ? 'PROVEN BOGUS' : 'UNSTABLE' : nativeHeader?.powered === null ? 'UNKNOWN' : (nativeHeader ? nativeHeader.powered : active) ? 'CODE' : 'GHOST';
                if (!nativeHeader || b.w >= address.length * 6.7 + type.length * 5.5 + 20)
                    this.text(type, b.x + b.w - type.length * 5.5 - 6, b.y + Math.min(18, b.h - 8), 9, crumble ? C.amber : headerColour);
                else if (crumble) this.text('UNSTABLE', b.x + 8, b.y + b.h + 14, 9, C.amber);
            }
            c.restore();
            if (crumble) {
                if (!address) this.text(isCampaignLevel(r.id) ? 'UNSTABLE' : 'prototype', b.x + 12, b.y + 49, 11, C.amber);
                if (p.fuse >= 0) {
                    c.fillStyle = C.amber;
                    c.fillRect(b.x, b.y - 5, b.w * p.fuse / p.fuseDuration, 3);
                    if (ropeOn(p.def.id, w)) this.text('ANCHOR FAILING · RELEASE', b.x - 20, b.y - 18, 12, C.amber);
                }
                if (p.respawn > 0)
                    this.text(`${p.respawn.toFixed(1)}s`, b.x + 50, b.y - 10, 13, C.amber);
            }
            c.globalAlpha = 1;
            if (active && p.pulse > 0) {
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
        for (const region of r.regions ?? []) {
            const label = this.nativeWorld.state?.chamber === r.id ? nativeWorldRegionLabel(region.label) : region.label;
            this.text(label, region.at.x, region.at.y, 24, C.dim);
        }
        drawMachinery(c, w);
        for (const lift of w.lifts) drawGravityLift(c, lift, this.heroes.machinery.lifts.get(lift.def.id)!, this.heroes.time, visible, cam.zoom, energyMotion, r.id !== 'uplink', 'emitter');
        drawEntryGateways(c, r, this.heroes, cam.zoom);
        drawFirewalls(c, w.firewalls, w.elapsed);
        if (r.id === 'race-condition') {
            const cargoTimer = this.raceCargoDisplay.view?.timer;
            const timer = cargoTimer && cargoTimer.seconds !== null && cargoTimer.phase !== null ? { ...cargoTimer, seconds: cargoTimer.seconds } : w.frame.timer!;
            c.fillStyle = '#35434b'; c.fillRect(130, 650, 150, 8);
            c.fillStyle = timer.phase === 'expired' ? C.red : C.amber;
            c.fillRect(130, 650, 150 * timer.fraction, 8);
            const held = this.raceCargoDisplay.view && !this.raceCargoDisplay.view.timerLive ? ' · HELD' : '';
            this.text(timer.phase === 'window' ? `${timer.seconds.toFixed(1)}s${held}` : timer.phase === 'expired' ? 'EXPIRED' : timer.phase === 'released' ? 'TRANSFER' : 'BUFFER', 140, 634, 14, C.amber);
        }
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
            { at: r.plate, active: w.inputs.plateA, depth: w.plateDepth, label: r.id === 'crossfeed-vault' ? 'A / SCANNER' : r.id === 'lift-lab' ? 'HOLD / LIFT POWER' : r.id === 'pairing-bay' || r.id === 'relay' || r.id === 'uplink' ? 'PLATE A / ANCHOR' : 'BUTTON' },
            { at: r.plateB, active: w.inputs.plateB, depth: w.plateDepthB, label: r.id === 'crossfeed-vault' ? 'LEFT / SCANNER' : r.id === 'pairing-bay' ? 'FINAL / LEFT' : r.id === 'uplink' ? 'PLATE B / LIFT' : 'PLATE B / EXIT' },
            { at: r.plateC, active: r.id === 'pairing-bay' || r.id === 'crossfeed-vault' ? w.inputs.plateC : w.inputs.cubeOnPlateC, depth: w.plateDepthC, label: r.id === 'crossfeed-vault' ? 'RIGHT / SCANNER' : r.id === 'pairing-bay' ? 'FINAL / RIGHT' : 'NODE C / CUBE PAYLOAD' },
            { at: r.cargoPlate, active: w.cargoPlateActive, depth: w.cargoPlateDepth, label: 'CARGO PLATE / CUBE ONLY' },
            ...(r.plates ?? []).map(p => ({ kind: p.kind, at: p.at, active: w.frame.plates?.[p.id] ?? (p.id === 'dropA' ? w.inputs.plateA : p.id === 'dropB' ? w.inputs.plateB : p.id === 'trace' ? w.inputs.plateC : p.id === 'receiver' ? w.inputs.cubeOnPlate : w.inputs.cubeOnPlateB), depth: 0, label: p.label })),
            ...(r.cubePads ?? []).map(p => ({ at: p.at, active: p.id === 'liftCargo' ? w.inputs.cubeOnPlate : p.id === 'finalLeft' ? w.inputs.cubeOnPlateB : w.inputs.cubeOnPlateC, depth: 0, label: p.label })),
        ];
        for (const plate of plates) {
            if (!plate.at || receivers.some(receiver => receiver.at === plate.at) || pads.some(pad => pad.at === plate.at)) continue;
            const { x, y } = plate.at;
            c.fillStyle = '#101c23';
            c.fillRect(x - 51, y - 3, 102, 13);
            c.fillStyle = plate.active ? C.cyan : C.amber;
            c.fillRect(x - 45, y - 9 + plate.depth * 6, 90, 7);
            if (isDeclarativeLevel(r.id) && 'kind' in plate) {
                if (plate.kind === 'scanner') { this.line(x - 53, y, x - 53, y - 60, C.cyan); this.line(x + 53, y, x + 53, y - 60, C.cyan); this.line(x - 53, y - 48, x + 53, y - 48, '#43636c'); }
            }
            if (r.id === 'crossfeed-vault') {
                if (!r.plates?.some(p => p.at === plate.at)) { this.line(x - 53, y, x - 53, y - 60, C.cyan); this.line(x + 53, y, x + 53, y - 60, C.cyan); this.line(x - 53, y - 48, x + 53, y - 48, '#43636c'); }
            }
            this.text(plate.label, x - 55, y + 49, 12, plate.active ? C.cyan : C.amber);
        }
        for (const pad of pads) {
            const state = this.heroes.machinery.pads.get(pad.id)!;
            drawPressurePad(c, pad, state, this.heroes.time, energyMotion);
            drawPadOutputPulse(c, pad, state, this.connections, w, energyMotion);
        }
        if (r.plateB && r.id === 'relay') {
            if (w.frame.outputs.bridge && !w.frame.outputs.exitDoor) this.text('MOVE THE CUBE TO B', 1090, 355, 16, C.amber);
        }
        for (const lever of [
            { id: 'lever', at: r.lever, active: w.inputs.switchB, name: r.id === 'relay-lab' ? 'RELAY POWER' : r.id === 'pairing-bay' ? 'SWITCH B' : r.id === 'relay' ? 'BRIDGE' : r.id === 'uplink' ? 'RELAY POWER' : 'SWITCH', latch: r.id === 'relay' || r.id === 'pairing-bay' || r.id === 'relay-lab' },
            { id: 'upperLever', at: r.upperLever, active: w.inputs.switchC, name: 'LIFT LATCH', latch: true },
            ...(r.controls ?? []).map(s => ({ id: s.id, at: s.at, active: w.frame.controls?.[s.id] ?? (s.id === 'switchD' ? w.frame.outputs.codePlatformA : s.id === 'phase' ? w.inputs.switchB : s.id === 'commit' ? w.inputs.switchC : w.inputs[s.id as 'switchB' | 'switchC']), name: s.label, latch: s.kind !== 'toggle', terminal: s.kind !== 'toggle' })),
        ]) {
            if (!lever.at || r.breakpoints?.some(b => b.activationControl === lever.id)) continue;
            const { x, y } = lever.at;
            c.fillStyle = C.wall;
            c.fillRect(x - 24, y - 36, 48, 36);
            if ('terminal' in lever && lever.terminal) {
                c.fillStyle = lever.active ? C.cyan : C.amber; c.fillRect(x - 17, y - 31, 34, 19);
                this.text(lever.name + (lever.active ? ' / COMMITTED' : ''), x - 55, y + 40, 13, lever.active ? C.cyan : C.amber); continue;
            }
            this.ring(x, y - 33, 8, C.line);
            const dx = lever.active ? 19 : -19;
            this.line(x, y - 33, x + dx, y - 72, lever.active ? C.cyan : C.amber, 6);
            this.ring(x + dx, y - 72, 7, C.ink);
            this.text(`${lever.name} / ${lever.active ? lever.latch ? 'LOCKED' : 'ON' : 'OFF'}`, x - 55, r.id === 'race-condition' || 'terminal' in lever && !lever.terminal ? y - 90 : y + 40, 13, lever.active ? C.cyan : C.amber);
        }
        if (this.nativeWorld.state?.chamber !== r.id && r.id !== 'uplink' && r.id !== 'crossfeed-vault' && r.id !== 'race-condition') {
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
        drawExitGate(c, r.exit, w.frame.outputs.exitDoor, this.heroes, cam.zoom, isCoopLevel(r.id) ? players?.reachedExit.filter(Boolean).length ?? 0 : undefined);
        drawMachineListings(c, w, this.replay, this.presentation);
        for (const def of r.breakpoints ?? []) {
            const state = this.heroes.breakpoints.get(def.id)!;
            drawBreakpoint(c, def, state.active, state.age, this.heroes.time, cam.zoom);
        }
        if (w.checkpoint !== 'entry' && !r.breakpoints?.some(b => b.checkpoint === w.checkpoint)) drawRespawnMarker(c, w.checkpointPosition());
        drawReceivers(c, receivers, this.heroes.receivers, this.heroes.time, 'rear', energyMotion);
        for (const [id, cube] of cubeEntries(w.cubes)) if (!w.cubeIsResetting(id)) {
            drawPayload(c, cube, r.cubes?.find(c => c.id === id)?.mark, this.heroes.time, id,
                cube.carried || w.pullingCubeId === id ? null : this.heroes.receivers.payloadAge(id), energyMotion);
            if (w.pullingCubeId === id) {
                c.setLineDash([6, 5]);
                this.line(w.player.x, w.player.y, cube.x, cube.y, C.amber);
                c.setLineDash([]);
            }
            if ((players?.remotePullingCubes?.includes(id) || id === 'cube' && players?.remotePullingCube) && players?.remote) {
                c.setLineDash([6, 5]);
                this.line(players.remote.x, players.remote.y, cube.x, cube.y, C.amber);
                c.setLineDash([]);
            }
        }
        drawReceivers(c, receivers, this.heroes.receivers, this.heroes.time, 'front', energyMotion);
        drawReceiverLabels(c, receivers, cam.zoom);
        const p = w.player, rope = p.rope;
        const localProfile = players ? characterForSlot(players.profiles, players.localSlot) : this.profile;
        const localAccent = colourHex(localProfile.colour);
        const remoteSlot = players?.localSlot === 1 ? 2 : 1;
        const remoteProfile = characterForSlot(players?.profiles, remoteSlot);
        if (rope.phase !== 'idle') {
            this.line(p.x, p.y, rope.tip.x, rope.tip.y, localAccent, 2);
            this.ring(rope.tip.x, rope.tip.y, 4, C.ink);
        }
        if (players?.remote) {
            const other = players.remote, accent = colourHex(remoteProfile.colour);
            if (other.rope.phase !== 'idle') this.line(other.x, other.y, other.rope.tip.x, other.rope.tip.y, accent);
            drawNinja(c, other, w.elapsed, accent);
        }
        drawNinja(c, p, w.elapsed, localAccent);
        drawEntryProjection(c, r, this.heroes);
        const hint = w.interactionHint();
        if (hint) {
            const station = r.breakpoints?.find(b => Math.hypot(p.x - b.at.x, p.y - (b.at.y - 25)) < 90);
            if (station) this.text(hint, station.at.x - hint.length * 3.6, station.at.y + 78, 12, C.ink);
            else this.text(hint, p.x - 80, p.y - 72, 15, C.ink);
        }
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
        if (isCoopLevel(r.id) && r.id !== 'pairing-bay' && !isCampaignLevel(r.id)) {
            this.text('MOCK MECHANICS LAB · NO BINARY EVIDENCE', 80, 170, 12, C.dim);
            if (r.id === 'relay-lab') {
                this.text('E · POWER CONTROL', 305, 410, 13, C.cyan);
                this.text('TRY LOOSE CARGO, THEN CARRY IT', 80, 355, 13, C.amber);
                this.text('JUMP INTO B TO RETURN', 1045, 590, 12, C.dim);
            } else if (r.id === 'lift-lab') {
                this.text('E · LATCH + SHARED CHECKPOINT', 760, 235, 12, C.cyan);
                this.text('HOLD HERE FOR YOUR PARTNER', 330, 740, 14, C.cyan);
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
        this.drawCharacterLabels([
            { player: p, profile: localProfile, slot: players?.localSlot, local: true, prompt: !!hint || rope.phase === 'attached' || w.keyboardGrapple || !!target && !p.grounded },
            ...(players?.remote ? [{ player: players.remote, profile: remoteProfile, slot: remoteSlot as Slot, local: false, prompt: false }] : []),
        ], dpr);
        if (w.deathFlash > 0) {
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            c.fillStyle = `rgba(250,129,126,${w.deathFlash * .4})`;
            c.fillRect(0, 0, cam.viewW, cam.viewH);
        }
        return heroCues;
    }
    private drawCharacterLabels(entries: { player: PlayerState; profile: PublicCharacterProfile; slot?: Slot; local: boolean; prompt: boolean }[], dpr: number): void {
        const c = this.ctx, cam = this.camera;
        c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0);
        // CSS-pixel text remains readable during room overview and never changes camera or collision bounds.
        c.font = '500 11px ui-monospace, monospace'; c.textBaseline = 'middle'; c.textAlign = 'center';
        const placed: { x: number; y: number; w: number; h: number }[] = [];
        for (const entry of entries) {
            const text = characterLabel(entry.profile, entry.slot, entry.local, cam.zoom);
            const w = c.measureText(text).width + 16, h = 20;
            const anchorX = (entry.player.x - cam.originX()) * cam.zoom;
            const anchorY = (entry.player.y - cam.originY()) * cam.zoom;
            if (anchorX < -w || anchorX > cam.viewW + w || anchorY < -60 || anchorY > cam.viewH + 80) continue;
            const x = Math.max(4, Math.min(cam.viewW - w - 4, anchorX - w / 2));
            let y = Math.max(4, anchorY - (entry.prompt ? Math.max(88 * cam.zoom, 46) : Math.max(25 * cam.zoom, 19)) - h);
            for (const other of placed) if (x < other.x + other.w + 4 && x + w + 4 > other.x && y < other.y + other.h + 4 && y + h + 4 > other.y) {
                y = other.y - h - 4;
                if (y < 4) y = other.y + other.h + 4;
            }
            placed.push({ x, y, w, h });
            const accent = colourHex(entry.profile.colour);
            c.fillStyle = '#0c131aeb'; c.fillRect(x, y, w, h);
            c.strokeStyle = accent; c.lineWidth = 1;
            c.beginPath(); c.moveTo(x, y + 3); c.lineTo(x, y + h - 3); c.stroke();
            c.fillStyle = C.ink; c.fillText(text, x + w / 2, y + h / 2);
        }
        c.restore();
    }
}
function ropeOn(id: string, w: PuzzleWorld): boolean { return w.player.rope.phase === 'attached' && w.player.rope.anchorId === id; }
