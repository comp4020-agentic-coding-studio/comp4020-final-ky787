import { PLAYER } from '../engine/constants.ts';
import type { ControllerInputs, MachineSignal } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority } from '../slice/world.ts';
import { CUBE_SIZE } from '../slice/tuning.ts';
import { SharedCubeAuthority } from '../coop/cube.ts';
import { SharedCrumbleAuthority } from '../coop/crumble.ts';
import { bodyOnPlate, sampleExit } from '../coop/authority.ts';
import { createCoopAuthority } from '../coop/lab-authority.ts';
import type { CoopClient } from '../coop/client.ts';
import { cubeEntries, type CubeMap, type SharedRoom, type SessionRoom } from '../coop/protocol.ts';
import { CONSTANT_POWER, draftFrame, draftSignal } from './evaluate.ts';
import { nativeSignal } from './room-adapter.ts';
import { objectPort, type DraftDocument, type DraftDevice } from './model.ts';

export interface DraftCoopAuthority extends WorldAuthority { room: SessionRoom }
class DeclarativeAuthority implements DraftCoopAuthority {
    cubes: CubeMap<SharedCubeAuthority> = {};
    crumble: SharedCrumbleAuthority;
    private devices: DraftDevice[];
    private prior = new Map<string, boolean>();
    constructor(private document: DraftDocument, public room: SharedRoom<'workbench'>, private client: CoopClient) {
        for (const object of document.geometry.objects) if (object.type === 'cube') {
            const id = draftSignal(object.id); this.cubes[id] = new SharedCubeAuthority(client, id);
        }
        this.devices = document.geometry.objects.filter((o): o is DraftDevice => o.type === 'device');
        this.crumble = new SharedCrumbleAuthority(client);
    }
    get frame() { return draftFrame(this.document, this.room.levelState.devices, this.room.levelState.outputs, this.room.exitUnlocked); }
    get inputs(): ControllerInputs { return { plateA: false, plateB: false, plateC: false, cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: false, switchC: false }; }
    get checkpoint() { return this.room.checkpoint === 'reunion' ? 'relay' as const : this.room.checkpoint; }
    sample(w: PuzzleWorld) {
        const sensors = this.devices.filter(o => o.kind !== 'toggle' && o.kind !== 'terminal');
        this.client.occupyDraft(sensors.filter(o => o.kind !== 'socket' && bodyOnPlate(w, o)).map(o => draftSignal(o.id)));
        for (const [id, authority] of cubeEntries(this.cubes)) {
            const c = w.cubes[id], state = this.client.room?.cubes[id];
            if (!this.client.ownsCubeFor(id) || this.client.prediction.cube?.cubeId === id) continue;
            const pads = c && !c.carried && c.grounded && !state?.pulling ? sensors.filter(o => o.kind !== 'scanner'
                && Math.abs(c.x - o.x) < 45 + CUBE_SIZE / 2 - 8 && Math.abs(c.y + CUBE_SIZE / 2 - o.y) < 5) : [];
            authority.cargoVisual = pads.length > 0;
            if (id.startsWith('draft:')) this.client.cubeOccupancyDraft(pads.map(pad => draftSignal(pad.id)), id as `draft:${string}`);
        }
        for (const device of this.devices) {
            const on = !!this.room.levelState.devices[objectPort(device)], prior = this.prior.get(device.id);
            if (prior !== undefined && on !== prior) w.events.push({ kind: device.kind === 'toggle' ? 'switch' : device.kind === 'terminal' ? 'terminal' : 'plate', at: device });
            this.prior.set(device.id, on);
        }
        sampleExit(w, this.room, this.client.slot!, () => this.client.reachExit());
    }
    private ordered(w: PuzzleWorld) {
        return cubeEntries(this.cubes).map(([, c]) => c).sort((a, b) => Number(b.heldLocally) - Number(a.heldLocally)
            || Math.hypot(w.player.x - w.cubes[a.id]!.x, w.player.y - w.cubes[a.id]!.y) - Math.hypot(w.player.x - w.cubes[b.id]!.x, w.player.y - w.cubes[b.id]!.y));
    }
    private control(w: PuzzleWorld) {
        return this.devices.find(o => (o.kind === 'toggle' || o.kind === 'terminal')
            && (o.kind !== 'terminal' || w.player.grounded && w.player.y + PLAYER.height / 2 <= o.y + 5)
            && Math.hypot(w.player.x - o.x, w.player.y - (o.y - 25)) < 72);
    }
    interact(w: PuzzleWorld) {
        for (const cube of this.ordered(w)) if (cube.interact(w)) return;
        const control = this.control(w);
        if (control && (control.kind === 'toggle' || !this.room.levelState.devices[objectPort(control)]) && this.client.control(draftSignal(control.id))) return draftSignal(control.id);
    }
    hint(w: PuzzleWorld) {
        for (const cube of this.ordered(w)) { const hint = cube.hint(w); if (hint) return hint; }
        const control = this.control(w);
        return control ? control.kind === 'terminal' && this.room.levelState.devices[objectPort(control)] ? 'COMMITTED' : `E · ${control.label ?? control.id}` : '';
    }
}
class BoundBuiltinAuthority implements DraftCoopAuthority {
    constructor(private document: DraftDocument, private base: DraftCoopAuthority) {}
    get room() { return this.base.room; }
    set room(value: SessionRoom) { this.base.room = value; }
    get cube() { return this.base.cube; }
    get cubes() { return this.base.cubes; }
    get crumble() { return this.base.crumble; }
    get inputs() { return this.base.inputs; }
    get checkpoint() { return this.base.checkpoint; }
    get frame() {
        const frame = this.base.frame, values: Record<string, boolean> = { ...frame.outputs, ...frame.signals };
        const signals: Partial<Record<MachineSignal, boolean>> = { ...CONSTANT_POWER, ...frame.signals };
        for (const binding of this.document.bindings) if (binding.invert) signals[draftSignal(binding.id)] = !values[binding.output];
        return { ...frame, signals };
    }
    physicalPower(signal: MachineSignal): boolean {
        if (signal === 'draft:activation:on' || signal === 'draft:activation:off') return CONSTANT_POWER[signal];
        const binding = this.document.bindings.find(b => b.invert && draftSignal(b.id) === signal);
        const native = binding ? nativeSignal(binding.output) : signal;
        const values: Partial<Record<MachineSignal, boolean>> = { ...this.base.frame.outputs, ...this.base.frame.signals };
        const powered = this.base.physicalPower ? this.base.physicalPower(native) : !!values[native];
        return binding ? !powered : powered;
    }
    sample(w: PuzzleWorld) { this.base.sample(w); }
    interact(w: PuzzleWorld) { return this.base.interact(w); }
    hint(w: PuzzleWorld) { return this.base.hint(w); }
}
export function createDraftAuthority(document: DraftDocument, room: SessionRoom, client: CoopClient): DraftCoopAuthority {
    const authority: DraftCoopAuthority = room.level === 'workbench' ? new DeclarativeAuthority(document, room, client) : new BoundBuiltinAuthority(document, createCoopAuthority(room, client));
    authority.reset = () => client.localReset();
    authority.discontinuity = (entity, reason, id) => client.markDiscontinuity(entity, reason, id);
    return authority;
}
