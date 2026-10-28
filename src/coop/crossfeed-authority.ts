import { PLAYER } from '../engine/constants.ts';
import { SharedCrumbleAuthority } from './crumble.ts';
import type { ControllerFrame, ControllerInputs, MachineSignal } from '../slice/controller.ts';
import type { PuzzleWorld, WorldAuthority } from '../slice/world.ts';
import type { CoopClient } from './client.ts';
import { SharedCubeAuthority } from './cube.ts';
import { bodyOnPlate, sampleExit } from './authority.ts';
import { touchesFloatingControl } from '../slice/maintenance-render.ts';
import { CROSSFEED_HANDOVER_MS, type SharedRoom } from './protocol.ts';

export class CrossfeedAuthority implements WorldAuthority {
    crumble: SharedCrumbleAuthority;
    private previousControls = new Map<string, boolean>();
    cubes: { cubeA: SharedCubeAuthority; cubeB: SharedCubeAuthority };
    constructor(public room: SharedRoom<'crossfeed-vault'>, private client: CoopClient) {
        this.crumble = new SharedCrumbleAuthority(client);
        this.cubes = { cubeA: new SharedCubeAuthority(client, 'cubeA'), cubeB: new SharedCubeAuthority(client, 'cubeB') };
    }
    private selected(id: 'switchB' | 'routeMode') { return this.client.pendingRouting.get(id)?.value ?? this.room.levelState.inputs[id]; }
    get frame(): ControllerFrame {
        const o = this.room.levelState.outputs, i = this.room.levelState.inputs, mode = this.selected('switchB'), route = this.selected('routeMode');
        const remaining = Math.max(0, this.room.levelState.handoverMs - (performance.now() - this.client.roomReceivedAt)) / CROSSFEED_HANDOVER_MS;
        return { source: 'mock-multiplayer', outputs: { exitDoor: o.exitDoor, grappleAnchor: o.grappleAnchor, bridge: o.bridge,
            liftField: o.liftField, relayGates: o.relayGates, codePlatformA: o.galleryAccess, codePlatformB: o.vaultPower },
            signals: { ...o, bridge: mode, grappleAnchor: i.plateAOccupied && !mode, relayGates: i.switchC && !mode,
                leftRoute: i.switchC && i.routePowerOccupied && !route, rightRoute: i.switchC && i.routePowerOccupied && route },
            fading: { leftRoute: o.leftRoute ? 1 : remaining, rightRoute: o.rightRoute ? 1 : remaining },
            controls: { switchB: mode, switchC: i.switchC, switchD: i.switchD, routeMode: route },
            plates: { entry: i.plateAOccupied, routePower: i.routePowerOccupied } };
    }
    physicalPower(signal: MachineSignal): boolean {
        const s = this.room.levelState;
        if (signal === 'leftRoute' || signal === 'rightRoute') return s.physical[signal];
        return !!s.outputs[signal as keyof typeof s.outputs];
    }
    get inputs(): ControllerInputs {
        const i = this.room.levelState.inputs;
        return { plateA: i.plateAOccupied, plateB: i.finalPlateLeftOccupied, plateC: i.finalPlateRightOccupied,
            cubeOnPlate: i.cubeOnLiftCargo, cubeOnPlateB: i.cubeOnFinalLeft, cubeOnPlateC: i.cubeOnFinalRight, switchB: i.switchB, switchC: i.switchC };
    }
    get checkpoint() { return this.room.checkpoint === 'upper' ? 'upper' as const : 'entry' as const; }
    activateBreakpoint(id: string) { if (id === 'system-online') this.client.activateBreakpoint(id); }
    sample(w: PuzzleWorld) {
        for (const cube of Object.values(this.cubes)) cube.sample(w);
        this.client.occupy(w.room.plates?.find(p => bodyOnPlate(w, p.at))?.id
            ?? (bodyOnPlate(w, w.room.plateB) ? 'finalLeft' : bodyOnPlate(w, w.room.plateC) ? 'finalRight' : null));
        for (const control of w.room.controls ?? []) {
            const active = !!this.frame.controls?.[control.id], previous = this.previousControls.get(control.id);
            if (previous !== undefined && active !== previous) w.events.push({ kind: control.kind === 'toggle' ? 'switch' : 'terminal', at: control.at });
            this.previousControls.set(control.id, active);
        }
        sampleExit(w, this.room, this.client.slot!, () => this.client.reachExit());
    }
    private ordered(w: PuzzleWorld) {
        return Object.values(this.cubes).sort((a, b) => Number(b.heldLocally) - Number(a.heldLocally)
            || Math.hypot(w.player.x - w.cubes[a.id]!.x, w.player.y - w.cubes[a.id]!.y) - Math.hypot(w.player.x - w.cubes[b.id]!.x, w.player.y - w.cubes[b.id]!.y));
    }
    private control(w: PuzzleWorld) {
        return w.room.controls?.find(c => c.floating ? touchesFloatingControl(w.player, c.at)
            : (c.kind !== 'terminal' || w.player.grounded && w.player.y + PLAYER.height / 2 <= c.at.y + 5) && Math.hypot(w.player.x - c.at.x, w.player.y - (c.at.y - 25)) < 72);
    }
    interact(w: PuzzleWorld) {
        for (const cube of this.ordered(w)) if (cube.interact(w)) return;
        const control = this.control(w);
        if (control && (control.kind === 'toggle' || !this.frame.controls?.[control.id]) && this.client.control(control.id)) return control.id;
    }
    hint(w: PuzzleWorld) {
        for (const cube of this.ordered(w)) { const hint = cube.hint(w); if (hint) return hint; }
        const control = this.control(w);
        return control ? control.kind !== 'toggle' && this.frame.controls?.[control.id] ? `${control.label} · COMMITTED` : `E · ${control.label}` : '';
    }
}
