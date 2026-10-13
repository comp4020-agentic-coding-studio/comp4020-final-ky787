import type { LevelContext, LevelDefinition, RoomRecord } from '../../server/coop-state.ts';
import { raceDefinition, freshRace, syncRace, advanceRace, RACE_TIMING } from '../../server/race-state.ts';
import { crossfeedDefinition, freshCrossfeed, syncCrossfeed, advanceCrossfeed } from '../../server/crossfeed-state.ts';
import { LAB_DEFINITIONS } from '../../server/lab-definitions.ts';
import { pairingDefinition } from '../../server/pairing-controller.ts';
import { advanceCrumble, freshCrumble } from '../../server/crumble-state.ts';
import { boxesOverlap } from '../engine/geometry.ts';
import { PLAYER } from '../engine/constants.ts';
import { playerBox } from '../engine/physics.ts';
import { cubeEntries, type CubePlacement, type LevelStateMap, type Plate, type Slot, type CrumbleId } from '../coop/protocol.ts';
import type { ControllerFrame, ControllerInputs, MachineSignal } from '../slice/controller.ts';
import type { RoomMemory } from '../slice/progress.ts';
import { CUBE_SIZE } from '../slice/tuning.ts';
import type { PuzzleWorld, CrumbleAuthority } from '../slice/world.ts';
import { nativeSignal } from './room-adapter.ts';
import { emptyOutputs, draftSignal } from './evaluate.ts';
import { objectPort, type BuiltinControllerId, type DraftDocument, type DraftDevice } from './model.ts';
import { bodyOnDraftDevice, interactWithLocalCube, nearDraftControl, type LocalDraftAuthority } from './runtime.ts';
const registry: { [K in BuiltinControllerId]: LevelDefinition<K> } = { 'race-condition': raceDefinition, 'crossfeed-vault': crossfeedDefinition, 'pairing-bay': pairingDefinition, ...LAB_DEFINITIONS };
function definition<L extends BuiltinControllerId>(id: L): LevelDefinition<L> { return registry[id] as LevelDefinition<L>; }
function context<L extends BuiltinControllerId>(id: L): LevelContext<L> {
    const rules = definition(id);
    // Same discriminant-to-state registry boundary used by server/newRecord; only allowlisted factories reach here.
    const record = { version: 6, party: null, levelInstance: 1, code: 'TEST', level: id, levelState: rules.defaults(), revision: 0, visitors: ['local-preview', null], cubePlacements: Object.fromEntries(rules.cubeIds.map(id => [id, 'spawn'])), checkpoint: 'entry', exitUnlocked: false, reachedExit: [false, false], completed: false, createdAt: '2000-01-01T00:00:00.000Z', updatedAt: '2000-01-01T00:00:00.000Z' } as RoomRecord<L>;
    return { record, held: [null, null], crumble: freshCrumble(), race: freshRace(), crossfeed: freshCrossfeed(), now: 0 };
}
type Projection = { [K in BuiltinControllerId]: { level: K; state: LevelStateMap[K] } }[BuiltinControllerId];
class BuiltinAuthority implements LocalDraftAuthority {
    values: Record<string, boolean> = {}; outputs: Record<string, boolean> = {}; arrived = false; frame: ControllerFrame = { source: 'mock-greybox', outputs: emptyOutputs() };
    inputs: ControllerInputs = { plateA: false, plateB: false, plateC: false, cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: false, switchC: false };
    private ctx: LevelContext<BuiltinControllerId>; private rules: LevelDefinition<BuiltinControllerId>; private previewing = false; private forced?: Record<string, boolean>; private world?: PuzzleWorld; private physical: Partial<Record<MachineSignal, boolean>> = {};
    crumble: CrumbleAuthority;
    constructor(private document: DraftDocument, private slot: Slot, id: BuiltinControllerId) {
        this.ctx = context(id); this.rules = definition(id);
        this.crumble = { sync: w => this.syncCrumble(w), sample: w => { for (const p of w.platforms) { if (p.def.id !== 'crumbleA' && p.def.id !== 'crumbleB' || !p.solid.enabled) continue; const trigger = w.player.grounded && w.player.groundId === p.def.id ? 'foot' : w.player.rope.phase === 'attached' && w.player.rope.anchorId === p.def.id ? 'hook' : null; if (trigger) this.rules.action(this.ctx, { type: 'crumble-trigger', seq: 0, platform: p.def.id, trigger }); } this.syncCrumble(w); } };
        this.project();
    }
    get checkpoint(): RoomMemory['checkpoint'] { return this.ctx.record.checkpoint === 'reunion' ? 'relay' : this.ctx.record.checkpoint; }
    physicalPower(signal: MachineSignal): boolean { const binding = this.document.bindings.find(b => b.invert && draftSignal(b.id) === signal), native = binding ? nativeSignal(binding.output) : signal; const powered = this.forced && Object.hasOwn(this.forced, native) ? this.forced[native] : this.physical[native] ?? !!(this.frame.signals?.[native] ?? this.frame.outputs[native as keyof typeof this.frame.outputs]); return binding ? !powered : powered; }
    private syncCrumble(w: PuzzleWorld) {
        for (const p of w.platforms) { if (p.def.id !== 'crumbleA' && p.def.id !== 'crumbleB') continue; const state = this.ctx.crumble[p.def.id]; if (!state) continue; const broken = state.phase === 'broken'; p.fuseDuration = state.durationMs / 1000 || .6; p.fuse = state.phase === 'warning' ? Math.max(0, state.deadline - this.ctx.now) / 1000 : -1; p.respawn = broken ? Math.max(.001, (state.deadline - this.ctx.now) / 1000) : 0; p.solid.enabled = !broken && (!p.def.signal || this.physicalPower(p.def.signal)); p.solid.grappleable = p.solid.enabled && p.def.hookable !== false; if (broken && w.player.rope.anchorId === p.def.id) w.cancelGrapple(); }
    }
    advance(dt: number) { this.ctx.now += dt * 1000; advanceRace(this.ctx.race, this.ctx.now); if (this.ctx.crossfeed) advanceCrossfeed(this.ctx.crossfeed, this.ctx.now); advanceCrumble(this.ctx.crumble, this.ctx.now); }
    private plate(device: DraftDevice): Plate {
        if (device.legacy === 'plate') return this.ctx.record.level === 'lift-lab' ? 'liftControl' : 'plateA';
        if (device.legacy === 'plateB') return 'finalLeft'; if (device.legacy === 'plateC') return 'finalRight';
        const id = device.id; if (id === 'entry' || id === 'routePower' || id === 'dropA' || id === 'dropB' || id === 'receiver' || id === 'trace' || id === 'return') return id;
        return null;
    }
    private placement(device: DraftDevice): CubePlacement | null {
        if (device.legacy === 'cargoPlate') return 'cargoPlate';
        if (device.id === 'liftCargo' || device.id === 'finalLeft' || device.id === 'finalRight') return device.id;
        const plate = this.plate(device); return plate === 'plateA' || plate === 'liftControl' ? null : plate;
    }
    sample(w: PuzzleWorld) {
        this.world = w; if (this.previewing) return;
        this.ctx.held = [null, null];
        const devices = this.document.geometry.objects.filter(o => o.type === 'device');
        for (const d of devices) if (d.kind !== 'toggle' && d.kind !== 'terminal' && d.kind !== 'socket' && bodyOnDraftDevice(w.player, PLAYER.width, PLAYER.height, d)) { const p = this.plate(d); if (this.rules.acceptsPlate(p, this.ctx.record)) { this.ctx.held[this.slot - 1] = p; break; } }
        for (const [id, cube] of cubeEntries(w.cubes)) {
            const device = !cube.carried && w.pullingCubeId !== id && devices.find(d => d.kind !== 'scanner' && d.kind !== 'toggle' && d.kind !== 'terminal' && bodyOnDraftDevice(cube, CUBE_SIZE, CUBE_SIZE, d));
            const placement = device ? this.placement(device) : null;
            this.ctx.record.cubePlacements[id] = placement && this.rules.acceptsPlacement?.(this.ctx.record, placement) ? placement : 'spawn';
        }
        if (this.ctx.record.level === 'race-condition') { const c = w.cubes.cubeA; if (c && !c.carried && c.grounded && c.groundId === 'cargo-buffer' && this.ctx.race.buffer === 'idle') { this.ctx.race.buffer = 'window'; this.ctx.race.deadline = this.ctx.now + RACE_TIMING.buffer; } }
        syncRace(this.ctx); syncCrossfeed(this.ctx); this.ctx.record.exitUnlocked ||= this.rules.unlock(this.ctx); this.project();
        if (this.ctx.record.exitUnlocked && boxesOverlap(playerBox(w.player), w.room.exit)) this.arrived = true;
    }
    private projection(): Projection { return { level: this.ctx.record.level, state: this.rules.project(this.ctx) } as Projection; }
    private project() {
        const p = this.projection(), base = emptyOutputs(), controls: Record<string, boolean> = {}, plates: Record<string, boolean> = {}; this.physical = {};
        base.exitDoor = this.ctx.record.exitUnlocked;
        let timer: ControllerFrame['timer']; let fading: ControllerFrame['fading'];
        if (p.level === 'race-condition') { const s = p.state, i = s.inputs; this.outputs = { ...s.outputs }; Object.assign(base, { bridge: s.outputs.returnBridge }); this.physical = { ...s.physical }; this.inputs = { plateA: i.dropA, plateB: i.dropB, plateC: i.traceOccupied, cubeOnPlate: i.payloadDelivered, cubeOnPlateB: i.returnOccupied, cubeOnPlateC: false, switchB: i.phase, switchC: i.finalControl }; Object.assign(controls, { phase: i.phase, commit: i.finalControl }); Object.assign(plates, { dropA: i.dropA, dropB: i.dropB, receiver: i.payloadDelivered, trace: i.traceOccupied, return: i.returnOccupied }); timer = { phase: s.buffer.phase, seconds: s.buffer.remainingMs / 1000, fraction: s.buffer.phase === 'idle' ? 1 : s.buffer.remainingMs / s.buffer.durationMs }; }
        else if (p.level === 'crossfeed-vault') { const s = p.state, i = s.inputs; this.outputs = { ...s.outputs }; Object.assign(base, { grappleAnchor: s.outputs.grappleAnchor, bridge: s.outputs.bridge, liftField: s.outputs.liftField, relayGates: s.outputs.relayGates, codePlatformA: s.outputs.galleryAccess, codePlatformB: s.outputs.vaultPower }); this.physical = { ...s.physical }; this.inputs = { plateA: i.plateAOccupied, plateB: i.finalPlateLeftOccupied, plateC: i.finalPlateRightOccupied, cubeOnPlate: i.cubeOnLiftCargo, cubeOnPlateB: i.cubeOnFinalLeft, cubeOnPlateC: i.cubeOnFinalRight, switchB: i.switchB, switchC: i.switchC }; Object.assign(controls, { switchB: i.switchB, switchC: i.switchC, switchD: i.switchD, routeMode: i.routeMode }); Object.assign(plates, { entry: i.plateAOccupied, routePower: i.routePowerOccupied, liftCargo: i.cubeOnLiftCargo, finalLeft: i.cubeOnFinalLeft, finalRight: i.cubeOnFinalRight }); fading = { leftRoute: s.outputs.leftRoute ? 1 : s.handoverMs / 325, rightRoute: s.outputs.rightRoute ? 1 : s.handoverMs / 325 }; }
        else if (p.level === 'pairing-bay') { const i = p.state.inputs, o = p.state.outputs; Object.assign(base, { grappleAnchor: o.grappleAnchor, bridge: o.returnBridge, codePlatformA: o.finalAccess }); this.outputs = { ...base }; this.inputs = { plateA: i.plateAOccupied, plateB: i.finalPlateLeftOccupied, plateC: i.finalPlateRightOccupied, cubeOnPlate: i.cubeOnCargoPlate, cubeOnPlateB: false, cubeOnPlateC: false, switchB: i.switchB, switchC: false }; }
        else { if (p.level === 'relay-lab') { base.relayGates = p.state.relayEnabled; this.inputs.switchB = p.state.relayEnabled; } if (p.level === 'lift-lab') { base.liftField = p.state.liftEnabled; this.inputs.plateA = p.state.lowerHeld; this.inputs.switchC = p.state.liftLatched; } if (p.level === 'boost-lab') { base.bridge = p.state.routeLatched; this.inputs.switchB = p.state.routeLatched; } if (p.level === 'firewall-lab') this.inputs.switchB = p.state.checkpointSet; this.outputs = { ...base }; }
        if (this.forced) Object.assign(this.outputs, this.forced);
        const signals: Partial<Record<MachineSignal, boolean>> = {};
        for (const b of this.document.bindings) { const value = !!this.outputs[b.output] !== !!b.invert; if (b.invert) signals[draftSignal(b.id)] = value; }
        this.frame = { source: 'mock-greybox', outputs: base, signals: { ...this.outputs, ...signals }, controls, plates, ...(timer ? { timer } : {}), ...(fading ? { fading } : {}) };
        if (this.forced?.exitDoor !== undefined) this.frame.outputs.exitDoor = this.forced.exitDoor;
        for (const d of this.document.geometry.objects) if (d.type === 'device') { let v = d.kind === 'toggle' || d.kind === 'terminal' ? controls[d.id] : plates[d.id]; if (d.legacy) { const map = { plate: 'plateA', plateB: 'plateB', plateC: 'plateC', cargoPlate: 'cubeOnPlate', lever: 'switchB', upperLever: 'switchC' } as const; if (d.legacy !== 'cubePad') v = this.inputs[map[d.legacy]]; } this.values[objectPort(d)] = !!v; }
    }
    interact(w: PuzzleWorld) {
        if (interactWithLocalCube(w)) return;
        const d = nearDraftControl(w, this.document); if (!d) return;
        const id = this.ctx.record.level;
        const control = d.legacy === 'lever' ? id === 'relay-lab' ? 'relayPower' : id === 'boost-lab' ? 'boostRoute' : 'firewallCheckpoint' : d.legacy === 'upperLever' ? 'liftLatch' : d.id;
        let accepted = false;
        if (id === 'pairing-bay') accepted = this.rules.action(this.ctx, { type: 'switch', seq: 0 });
        else if (control === 'relayPower' || control === 'boostRoute' || control === 'firewallCheckpoint' || control === 'liftLatch' || control === 'switchB' || control === 'switchC' || control === 'switchD' || control === 'routeMode' || control === 'phase' || control === 'commit') accepted = this.rules.action(this.ctx, { type: 'control', seq: 0, control });
        if (accepted) { syncRace(this.ctx); syncCrossfeed(this.ctx); this.ctx.record.exitUnlocked ||= this.rules.unlock(this.ctx); this.project(); w.events.push({ kind: d.kind === 'terminal' ? 'terminal' : 'switch', at: { x: d.x, y: d.y } }); return d.id; }
    }
    hint(w: PuzzleWorld) { const d = nearDraftControl(w, this.document); return d ? `E · ${d.label ?? d.id}` : cubeEntries(w.cubes).some(([, c]) => c.carried) ? 'E · put down cube' : ''; }
    reset() { if (this.world) for (const [, c] of cubeEntries(this.world.cubes)) if (c.carried) Object.assign(c, this.world.cubeDropTransform(), { carried: false, groundId: null }); }
    cubeReset(id: import('../coop/protocol.ts').CubeId) { if (this.ctx.record.level === 'race-condition' && id === 'cubeA') { this.ctx.race.buffer = 'idle'; this.ctx.race.deadline = 0; this.ctx.race.contactEpoch = -1; } }
    preview(values: Record<string, boolean>, forced?: Record<string, boolean>) {
        // State Preview is diagnostic setup; it is deliberately isolated from gameplay state.
        this.previewing = true; this.forced = forced; this.ctx = context(this.ctx.record.level);
        const sensors = this.document.geometry.objects.filter((o): o is DraftDevice => o.type === 'device' && !!values[objectPort(o)]);
        let slot = 0, cubeIndex = 0;
        for (const d of sensors) { if (d.kind === 'toggle' || d.kind === 'terminal') { const id = this.ctx.record.level; const control = d.legacy === 'lever' ? id === 'relay-lab' ? 'relayPower' : id === 'boost-lab' ? 'boostRoute' : 'firewallCheckpoint' : d.legacy === 'upperLever' ? 'liftLatch' : d.id; if (id === 'pairing-bay') this.rules.action(this.ctx, { type: 'switch', seq: 0 }); else if (control === 'relayPower' || control === 'boostRoute' || control === 'firewallCheckpoint' || control === 'liftLatch' || control === 'switchB' || control === 'switchC' || control === 'switchD' || control === 'routeMode' || control === 'phase' || control === 'commit') this.rules.action(this.ctx, { type: 'control', seq: 0, control }); }
            else if (d.kind === 'socket') { const cube = Object.keys(this.ctx.record.cubePlacements)[cubeIndex++]; if (cube === 'cube' || cube === 'cubeA' || cube === 'cubeB') this.ctx.record.cubePlacements[cube] = this.placement(d) ?? 'spawn'; else throw new Error('Preview requires more cube payloads than this controller owns.'); }
            else if (slot < 2) this.ctx.held[slot++] = this.plate(d);
            else throw new Error('Built-in preview accepts at most two player-held sensors; use physical cube placements through playtesting for additional contacts.'); }
        syncRace(this.ctx); syncCrossfeed(this.ctx); this.ctx.record.exitUnlocked ||= this.rules.unlock(this.ctx); this.project();
    }
    endPreview() { this.previewing = false; this.forced = undefined; }
}
export function createBuiltinAuthority(document: DraftDocument, slot: Slot): LocalDraftAuthority { if (document.controller.kind !== 'builtin') throw new Error('Expected allowlisted built-in controller'); return new BuiltinAuthority(document, slot, document.controller.id); }
