import { PLAYER } from '../engine/constants.ts';
import type { ControllerInputs } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority } from '../slice/world.ts';
import { CUBE_SIZE } from '../slice/tuning.ts';
import { SharedCubeAuthority } from '../coop/cube.ts';
import { SharedCrumbleAuthority } from '../coop/crumble.ts';
import { bodyOnPlate, sampleExit } from '../coop/authority.ts';
import type { CoopClient } from '../coop/client.ts';
import { cubeEntries, type CubeMap, type SharedRoom, type DeclarativeLevelId } from '../coop/protocol.ts';
import { draftFrame, draftSignal } from './evaluate.ts';
import { objectPort, type DraftDocument, type DraftDevice } from './model.ts';

export class DeclarativeAuthority implements WorldAuthority {
    cubes: CubeMap<SharedCubeAuthority> = {};
    crumble: SharedCrumbleAuthority;
    private devices: DraftDevice[];
    private prior = new Map<string, boolean>();
    constructor(private document: DraftDocument, public room: SharedRoom<DeclarativeLevelId>, private client: CoopClient) {
        for (const object of document.geometry.objects) if (object.type === 'cube') {
            const id = draftSignal(object.id); this.cubes[id] = new SharedCubeAuthority(client, id);
        }
        this.devices = document.geometry.objects.filter((o): o is DraftDevice => o.type === 'device');
        this.crumble = new SharedCrumbleAuthority(client);
    }
    get frame() { return draftFrame(this.document, this.room.levelState.devices, this.room.levelState.outputs, this.room.exitUnlocked); }
    get inputs(): ControllerInputs { return { plateA: false, plateB: false, plateC: false, cubeOnPlate: false, cubeOnPlateB: false, cubeOnPlateC: false, switchB: false, switchC: false }; }
    get checkpoint() { return this.room.checkpoint === 'reunion' ? 'relay' as const : this.room.checkpoint; }
    activateBreakpoint(id: string) { this.client.activateBreakpoint(draftSignal(id)); }
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
