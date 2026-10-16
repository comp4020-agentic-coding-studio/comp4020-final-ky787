import { CARRY, FIXED_DT, PLAYER } from '../engine/constants.ts';
import { boxesOverlap, type Vec2 } from '../engine/geometry.ts';
import { emptyInput, playerBox, type InputState } from '../engine/physics.ts';
import { cubeEntries, type Slot } from '../coop/protocol.ts';
import type { ControllerFrame, ControllerInputs } from '../slice/controller.ts';
import type { RoomMemory } from '../slice/progress.ts';
import { CUBE_SIZE } from '../slice/tuning.ts';
import { PuzzleWorld, type WorldAuthority } from '../slice/world.ts';
import { draftFrame, evaluateDraft, initialDeviceValues } from './evaluate.ts';
import { cloneDraft, objectBounds, objectPort, type DraftDocument, type DraftDevice } from './model.ts';
import { draftRoom } from './room-adapter.ts';
import { requirePlayable } from './validation.ts';
import { createBuiltinAuthority } from './builtin-local.ts';
export { draftRoom, cubeRuntimeId } from './room-adapter.ts';
export { draftFrame, evaluateDraft, initialDeviceValues } from './evaluate.ts';
const blankInputs = (): ControllerInputs => ({ plateA: false, plateB: false, plateC: false, cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: false, switchC: false });
export const freshDraftMemory = (): RoomMemory => ({ switchB: false, cubeOnPlate: false, cubeOnPlateB: false, checkpoint: 'entry' });
export function bodyOnDraftDevice(body: { x: number; y: number; grounded: boolean }, width: number, height: number, device: DraftDevice): boolean {
    return body.grounded && Math.abs(body.x - device.x) < 45 + width / 2 - 8 && Math.abs(body.y + height / 2 - device.y) < 5;
}
/** Actual body contacts; ordinary plates accept players or resting cubes, sockets cubes, scanners players. */
export function sampleDevices(document: DraftDocument, world: PuzzleWorld): Record<string, boolean> {
    const values: Record<string, boolean> = {};
    for (const device of document.geometry.objects) if (device.type === 'device' && device.kind !== 'toggle' && device.kind !== 'terminal') {
        const player = device.kind !== 'socket' && bodyOnDraftDevice(world.player, PLAYER.width, PLAYER.height, device);
        const cube = device.kind !== 'scanner' && cubeEntries(world.cubes).some(([id, c]) => !c.carried && world.pullingCubeId !== id && !world.cubeIsResetting(id) && bodyOnDraftDevice(c, CUBE_SIZE, CUBE_SIZE, device));
        values[objectPort(device)] = player || cube;
    }
    return values;
}
export function interactWithLocalCube(world: PuzzleWorld): boolean {
    const carried = cubeEntries(world.cubes).find(([, cube]) => cube.carried);
    if (carried) { Object.assign(carried[1], world.cubeDropTransform(), { carried: false }); return true; }
    const nearest = cubeEntries(world.cubes).filter(([id, c]) => !world.cubeIsResetting(id) && world.cubeReachable(id) && Math.hypot(world.player.x - c.x, world.player.y - c.y) < CARRY.reach)
        .sort(([, a], [, b]) => Math.hypot(a.x - world.player.x, a.y - world.player.y) - Math.hypot(b.x - world.player.x, b.y - world.player.y))[0];
    if (!nearest || !world.canCarryCube()) return false;
    nearest[1].carried = true; nearest[1].grounded = false; world.cancelGrapple(); world.events.push({ kind: 'carry', at: { x: world.player.x, y: world.player.y } }); return true;
}
export function nearDraftControl(world: PuzzleWorld, document: DraftDocument): DraftDevice | undefined {
    return document.geometry.objects.find((o): o is DraftDevice => o.type === 'device' && (o.kind === 'toggle' || o.kind === 'terminal') && (o.kind !== 'terminal' || world.player.grounded && world.player.y + PLAYER.height / 2 <= o.y + 5) && Math.hypot(world.player.x - o.x, world.player.y - (o.y - 25)) < 72);
}
export interface LocalDraftAuthority extends WorldAuthority { preview(values: Record<string, boolean>, forced?: Record<string, boolean>): void; endPreview(): void; advance(dt: number): void; values: Record<string, boolean>; outputs: Record<string, boolean>; arrived: boolean }
class DeclarativeAuthority implements LocalDraftAuthority {
    values: Record<string, boolean>; outputs: Record<string, boolean> = {}; inputs = blankInputs(); checkpoint: RoomMemory['checkpoint'] = 'entry'; arrived = false;
    frame: ControllerFrame; private previewing = false; private overrides: Record<string, boolean> = {}; private exitUnlocked = false; private world?: PuzzleWorld;
    constructor(private document: DraftDocument) { this.values = initialDeviceValues(document); this.outputs = evaluateDraft(document, this.values); this.frame = draftFrame(document, this.values, this.outputs); }
    activateBreakpoint(id: string) {
        const station = this.document.geometry.objects.find(o => o.type === 'breakpoint' && o.id === id);
        if (station?.type === 'breakpoint' && this.checkpoint !== 'upper') this.checkpoint = station.checkpoint;
    }
    sample(world: PuzzleWorld) {
        this.world = world; if (this.previewing) return;
        this.values = { ...this.values, ...sampleDevices(this.document, world), ...this.overrides };
        this.outputs = evaluateDraft(this.document, this.values);
        const resolved = draftFrame(this.document, this.values, this.outputs), exit = this.document.geometry.objects.find(o => o.type === 'exit');
        this.exitUnlocked = !!resolved.outputs.exitDoor || !!(exit?.type === 'exit' && exit.latch && this.exitUnlocked);
        this.frame = draftFrame(this.document, this.values, this.outputs, this.exitUnlocked);
        if (this.exitUnlocked && boxesOverlap(playerBox(world.player), world.room.exit)) { this.arrived = true; if (exit?.type === 'exit' && exit.arrivals === 1) world.exited = true; }
    }
    interact(world: PuzzleWorld) {
        if (interactWithLocalCube(world)) return;
        const control = nearDraftControl(world, this.document); if (!control) return;
        const port = objectPort(control), value = control.kind === 'terminal' || !this.values[port];
        if (this.values[port] === value) return;
        this.values[port] = value; if (control.checkpoint && value && this.checkpoint !== 'upper') this.checkpoint = control.checkpoint;
        world.events.push({ kind: control.kind === 'terminal' ? 'terminal' : 'switch', at: { x: control.x, y: control.y } }); this.sample(world); return `draft:${control.id}`;
    }
    hint(world: PuzzleWorld) { if (cubeEntries(world.cubes).some(([, c]) => c.carried)) return 'E · put down cube'; const c = nearDraftControl(world, this.document); return c ? c.kind === 'terminal' && this.values[objectPort(c)] ? `${c.label ?? c.id} · COMMITTED` : `E · ${c.label ?? c.id}` : cubeEntries(world.cubes).some(([id, c]) => world.cubeReachable(id) && Math.hypot(c.x - world.player.x, c.y - world.player.y) < CARRY.reach) ? 'E · carry cube' : ''; }
    reset() { if (this.world) for (const [, c] of cubeEntries(this.world.cubes)) if (c.carried) Object.assign(c, this.world.cubeDropTransform(), { carried: false, groundId: null }); }
    advance(_dt: number) {}
    preview(values: Record<string, boolean>, forced?: Record<string, boolean>) { this.previewing = true; this.values = { ...initialDeviceValues(this.document), ...values }; this.outputs = evaluateDraft(this.document, this.values, forced); this.frame = draftFrame(this.document, this.values, this.outputs); }
    endPreview() { this.previewing = false; }
    setPartnerInputs(values: Record<string, boolean>) { this.overrides = { ...values }; }
}
export interface TrajectorySample { time: number; player: { x: number; y: number; vx: number; vy: number; grounded: boolean; groundId: string | null; rope: string; target: string | null }; cubes: Record<string, { x: number; y: number; carried: boolean; grounded: boolean }>; signals: Record<string, boolean> }
export interface DraftRecording { version: 1; draftId: string; draftHash?: string; engineRevision?: string; scenario?: string; kind: 'single-player-physics-preview'; samples: TrajectorySample[]; events: { time: number; kind: string; at?: Vec2; details?: unknown }[]; truncated: boolean }
export interface DraftSnapshot extends TrajectorySample { deaths: number; exited: boolean; arrived: boolean; deviceValues: Record<string, boolean>; outputs: Record<string, boolean>; events: PuzzleWorld['events'] }
export function validateStart(world: PuzzleWorld, start: Vec2): string | null {
    if (!Number.isFinite(start.x) || !Number.isFinite(start.y)) return 'Test start must be a finite player centre.';
    const body = { x: start.x - PLAYER.width / 2, y: start.y - PLAYER.height / 2, w: PLAYER.width, h: PLAYER.height };
    if (body.x < 0 || body.y < 0 || body.x + body.w > world.room.width || body.y + body.h > world.room.height) return 'Test start is outside room bounds.';
    if (world.solids.some(s => s.enabled && boxesOverlap(body, s))) return 'Test start intersects active collision geometry.';
    if (world.room.hazards.some(h => boxesOverlap(body, h)) || world.firewalls.some(f => f.enabled && boxesOverlap(body, f.box))) return 'Test start intersects an active reset hazard.';
    return null;
}
export class DraftRuntime {
    readonly document: DraftDocument; world!: PuzzleWorld; authority!: LocalDraftAuthority; recording!: DraftRecording; private lastRope = 'idle'; private lastSignals = ''; private sampleCount = 0;
    constructor(document: DraftDocument, readonly slot: Slot = 1, options: { start?: Vec2 } = {}) { this.document = cloneDraft(requirePlayable(document)); this.restart(options.start); }
    restart(start?: Vec2) {
        this.authority = this.document.controller.kind === 'declarative' ? new DeclarativeAuthority(this.document) : createBuiltinAuthority(this.document, this.slot);
        const room = draftRoom(this.document, this.slot); this.world = new PuzzleWorld(room, freshDraftMemory(), undefined, this.authority);
        if (start) { const issue = validateStart(this.world, start); if (issue) throw new Error(issue); this.world.player.x = start.x; this.world.player.y = start.y; }
        else { const issue = validateStart(this.world, this.world.player); if (issue) throw new Error(issue); }
        this.recording = { version: 1, draftId: this.document.id, kind: 'single-player-physics-preview', samples: [], events: [], truncated: false }; this.lastRope = 'idle'; this.lastSignals = ''; this.sampleCount = 0; this.capture();
    }
    step(input: InputState = emptyInput(), interact = false, dt = FIXED_DT) { if (!Number.isFinite(dt) || dt <= 0 || dt > .05) throw new Error('Physics step must be between 0 and 0.05 seconds.'); this.authority.endPreview(); this.authority.advance(dt); this.world.events = []; this.world.step(dt, input, interact); this.capture(); }
    preview(values: Record<string, boolean>, forced?: Record<string, boolean>) { this.authority.preview(values, forced); this.world.syncAuthority(); return this.snapshot(); }
    /** Explicit one-player diagnostic only; never represented as another avatar or two-player evidence. */
    setPartnerInputs(values: Record<string, boolean>) { if (!(this.authority instanceof DeclarativeAuthority)) throw new Error('Built-in diagnostic inputs use State Preview; connected co-op inputs remain authoritative.'); this.authority.setPartnerInputs(values); }
    snapshot(): DraftSnapshot {
        const p = this.world.player;
        return { time: this.world.elapsed, player: { x: p.x, y: p.y, vx: p.vx, vy: p.vy, grounded: p.grounded, groundId: p.groundId, rope: p.rope.phase, target: p.rope.anchorId },
            cubes: Object.fromEntries(cubeEntries(this.world.cubes).map(([id, c]) => [id, { x: c.x, y: c.y, carried: c.carried, grounded: c.grounded }])), signals: { ...this.authority.outputs }, deaths: this.world.deaths, exited: this.world.exited,
            arrived: this.authority.arrived, deviceValues: { ...this.authority.values }, outputs: { ...this.authority.outputs }, events: structuredClone(this.world.events) };
    }
    private capture() {
        const s = this.snapshot(), r = this.recording;
        if (++this.sampleCount % 4 === 1) { if (r.samples.length < 18000) r.samples.push({ time: s.time, player: s.player, cubes: s.cubes, signals: s.signals }); else r.truncated = true; }
        for (const event of this.world.events) if (r.events.length < 10000) r.events.push({ time: s.time, kind: event.kind, at: { ...event.at }, details: event });
        if (r.events.length < 10000 && this.lastRope === 'attached' && s.player.rope !== 'attached') r.events.push({ time: s.time, kind: 'grapple-release', at: { x: s.player.x, y: s.player.y } }); this.lastRope = s.player.rope;
        const signals = JSON.stringify(s.signals); if (signals !== this.lastSignals) { if (r.events.length < 10000) r.events.push({ time: s.time, kind: 'signals', details: s.signals }); this.lastSignals = signals; }
    }
}
export const createRuntime = (document: DraftDocument, slot: Slot = 1, options: { start?: Vec2 } = {}) => new DraftRuntime(document, slot, options);
export const createDraftRuntime = createRuntime;
