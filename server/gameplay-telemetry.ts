import { CAMPAIGN_DOCUMENTS } from '../src/coop/authored-campaign.ts';
import { isAuthoredCampaignLevel } from '../src/coop/campaign.ts';
import type { CharacterProfiles, ClientMessage, CubeMap, DraftId, SharedCube, Slot } from '../src/coop/protocol.ts';
import type { RoomRecord } from './coop-state.ts';
import type { Telemetry, TelemetryContext } from './telemetry.ts';

/** The observer reads accepted semantic state only. It never retains body transforms or room records. */
export interface ObservableRoom {
    record: RoomRecord;
    profiles: CharacterProfiles;
    peers: readonly unknown[];
    cubes: CubeMap<SharedCube>;
    draftCubeContacts: CubeMap<DraftId[]>;
}
interface Observation {
    instance: number;
    checkpoint: string;
    exitUnlocked: boolean;
    completed: boolean;
    reachedExit: boolean[];
    controls: Record<string, boolean>;
    sensors: Record<string, boolean>;
    outputs: Record<string, boolean>;
    phases: Record<string, string>;
    deliveries: Record<string, string[]>;
}
const words = (id: string) => id.replace(/^draft:/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_.]/g, ' ').toUpperCase();
const documentFor = (room: ObservableRoom) => !room.record.draft && isAuthoredCampaignLevel(room.record.level) ? CAMPAIGN_DOCUMENTS[room.record.level] : undefined;
function objectInfo(room: ObservableRoom, id: string) {
    const object = documentFor(room)?.geometry.objects.find(o => o.id === id.replace(/^draft:/, '').replace(/\.(occupied|value)$/, ''));
    return { label: object && 'label' in object && typeof object.label === 'string' ? object.label : words(id),
        kind: object?.type === 'device' ? object.kind : undefined,
        cube: object?.type === 'cube' && object.mark ? `Cube ${object.mark}` : words(id) };
}
const booleans = (value: unknown): Record<string, boolean> => value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')) : {};
const occupancyKeys: Record<string, string> = {
    plateAOccupied: 'plateA', finalPlateLeftOccupied: 'finalLeft', finalPlateRightOccupied: 'finalRight',
    routePowerOccupied: 'routePower', dropA: 'dropA', dropB: 'dropB', traceOccupied: 'trace', returnOccupied: 'return', lowerHeld: 'liftControl',
};
const placementInputs: Record<string, string> = {
    cargoPlate: 'cubeOnCargoPlate', liftCargo: 'cubeOnLiftCargo', finalLeft: 'cubeOnFinalLeft', finalRight: 'cubeOnFinalRight', receiver: 'payloadDelivered',
};
function observation(room: ObservableRoom, projection: unknown): Observation {
    const p = projection as Record<string, unknown>, devices = booleans(p.devices), inputs = booleans(p.inputs);
    const state = room.record.levelState;
    const controls = 'devices' in state ? { ...state.devices } : booleans(state);
    const sensors: Record<string, boolean> = {};
    for (const [id, active] of Object.entries(devices)) if (id.endsWith('.occupied') && objectInfo(room, id).kind !== 'socket') sensors[`draft:${id.slice(0, -9)}`] = active;
    for (const [key, id] of Object.entries(occupancyKeys)) if (typeof inputs[key] === 'boolean') sensors[key === 'plateAOccupied' && room.record.level === 'crossfeed-vault' ? 'entry' : id] = inputs[key];
    if (typeof p.lowerHeld === 'boolean') sensors.liftControl = p.lowerHeld;
    const outputs = { ...booleans(p.outputs) };
    if (typeof p.relayEnabled === 'boolean') outputs.relayEnabled = p.relayEnabled;
    if (typeof p.liftEnabled === 'boolean') outputs.liftEnabled = p.liftEnabled;
    if (typeof p.routeLatched === 'boolean') outputs.routeLatched = p.routeLatched;
    // Physical handover grace is distinct from native logical outputs; never count countdown ticks.
    for (const [key, value] of Object.entries(booleans(p.physical))) outputs[`physical:${key}`] = value;
    const phases: Record<string, string> = {};
    if (p.buffer && typeof p.buffer === 'object' && 'phase' in p.buffer && typeof p.buffer.phase === 'string') phases.buffer = p.buffer.phase;
    if (p.platforms && typeof p.platforms === 'object') for (const [id, platform] of Object.entries(p.platforms)) {
        if (platform && typeof platform === 'object' && 'phase' in platform && typeof platform.phase === 'string') phases[id] = platform.phase;
    }
    const deliveries: Record<string, string[]> = {};
    for (const [id, placement] of Object.entries(room.record.cubePlacements)) {
        const contacts = room.draftCubeContacts[id as DraftId] ?? (placement === 'spawn' ? [] : [placement]);
        deliveries[id] = contacts.filter(contact => {
            if (contact.startsWith('draft:')) return devices[`${contact.slice(6)}.occupied`] === true;
            // These are accepted controller inputs, never inferred from disposable transforms.
            const input = placementInputs[contact];
            return input ? inputs[input] === true : true;
        });
    }
    return { instance: room.record.levelInstance, checkpoint: room.record.checkpoint, exitUnlocked: room.record.exitUnlocked,
        completed: room.record.completed, reachedExit: [...room.record.reachedExit], controls, sensors, outputs, phases, deliveries };
}

/** All public entry points are fail-open for gameplay, including projections supplied by the caller. */
export class GameplayTelemetry {
    private previous = new WeakMap<ObservableRoom, Observation>();
    private telemetry?: Telemetry;
    constructor(telemetry?: Telemetry) { this.telemetry = telemetry; }
    private safely(work: (telemetry: Telemetry) => void): void { if (this.telemetry) try { work(this.telemetry); } catch { /* Observability must never reject gameplay. */ } }
    context(room: ObservableRoom, slot?: Slot): TelemetryContext {
        return { session: room.record.code, chamber: room.record.level,
            ...(slot ? { visitor: room.record.visitors[slot - 1] ?? undefined, player: room.profiles[slot - 1]?.name ?? 'Ninja', playerSlot: slot } : {}) };
    }
    event(event: string, room: ObservableRoom, slot?: Slot, fields: Record<string, string | number | boolean> = {}): void {
        this.safely(t => t.emit(event, this.context(room, slot), { levelInstance: room.record.levelInstance, ...fields }));
    }
    remove(room: ObservableRoom): void { this.safely(t => t.removeSession(room.record.code)); }
    baseline(room: ObservableRoom, project: () => unknown): void {
        this.safely(() => { this.previous.set(room, observation(room, project())); this.session(room); });
    }
    session(room: ObservableRoom): void {
        this.safely(t => {
            if (!room.peers.some(Boolean)) { t.removeSession(room.record.code); return; }
            const previous = this.previous.get(room);
            const delivered = previous ? Object.values(previous.deliveries).filter(ids => ids.length).length : 0;
            t.upsertSession({ id: room.record.code, chamber: room.record.level,
                status: room.record.completed ? 'completed' : room.record.party?.phase === 'lobby' ? 'lobby' : 'playing',
                players: room.record.visitors.flatMap((visitor, i) => visitor ? [{ visitor, name: room.profiles[i]?.name ?? 'Ninja',
                    colour: room.profiles[i]?.colour, slot: (i + 1) as Slot, connected: !!room.peers[i] }] : []),
                progress: [room.record.exitUnlocked ? 'EXIT UNLOCKED' : 'EXIT LOCKED', `${delivered}/${Object.keys(room.cubes).length} cubes on accepted sensors`,
                    `${room.record.reachedExit.filter(Boolean).length}/2 at exit`, ...(room.record.checkpoint !== 'entry' ? [`CHECKPOINT: ${words(room.record.checkpoint)}`] : [])] });
        });
    }
    transition(room: ObservableRoom, project: () => unknown, slot?: Slot, action?: ClientMessage, source = 'accepted_action'): void {
        this.safely(t => {
            const after = observation(room, project()), before = this.previous.get(room);
            this.previous.set(room, after);
            if (!before || before.instance !== after.instance) { this.session(room); return; }
            const emit = (event: string, fields: Record<string, string | number | boolean> = {}, actor: Slot | null = slot ?? null) => t.emit(event,
                this.context(room, actor ?? undefined), { levelInstance: room.record.levelInstance, source, ...fields });
            if (action?.type === 'control' || action?.type === 'switch') {
                const id = action.type === 'switch' ? 'switchB' : action.control;
                const key = id.startsWith('draft:') ? `${id.slice(6)}.value` : ({ relayPower: 'relayEnabled', liftLatch: 'liftLatched', boostRoute: 'routeLatched', firewallCheckpoint: 'checkpointSet', commit: 'finalControl' } as Record<string, string>)[id] ?? id;
                if (before.controls[key] !== after.controls[key] && typeof after.controls[key] === 'boolean') emit(objectInfo(room, id).kind === 'terminal' ? 'control_activated' : 'control_toggled',
                    { controlId: id, controlName: objectInfo(room, id).label, enabled: after.controls[key] });
            }
            for (const [id, active] of Object.entries(after.sensors)) if (before.sensors[id] !== undefined && before.sensors[id] !== active)
                emit(objectInfo(room, id).kind === 'plate' || !id.startsWith('draft:') ? active ? 'pressure_plate_activated' : 'pressure_plate_released' : active ? 'sensor_activated' : 'sensor_released', { controlId: id, controlName: objectInfo(room, id).label, active });
            if (action && 'cubeId' in action) {
                const names = { cubeId: action.cubeId, cubeName: objectInfo(room, action.cubeId).cube };
                if (action.type === 'cube-pickup') emit('cube_picked_up', names);
                if (action.type === 'cube-drop') emit('cube_dropped', names);
                if (action.type === 'cube-reset') emit('cube_reset', { ...names, reason: action.cause, source: 'accepted_client_reset' });
            }
            if (action?.type === 'local-reset') emit('player_reset', { reason: 'local_reset', source: 'accepted_client_reset' });
            for (const [cubeId, contacts] of Object.entries(after.deliveries)) {
                const old = before.deliveries[cubeId] ?? [];
                for (const [ids, active] of [[contacts.filter(id => !old.includes(id)), true], [old.filter(id => !contacts.includes(id)), false]] as const) for (const id of ids) {
                    const receiver = objectInfo(room, id), socket = receiver.kind === 'socket' || id === 'receiver';
                    emit(socket ? active ? 'payload_docked' : 'payload_removed' : active ? 'cube_placed' : 'cube_removed',
                        { cubeId, cubeName: objectInfo(room, cubeId).cube, receiverId: id, receiverName: receiver.label, active, actor: slot ? action?.type === 'draft-cube-occupancy' || action?.type === 'cube-occupancy' ? 'reporting_player' : 'acting_player' : 'server', source: 'accepted_controller_input' });
                }
            }
            for (const [id, enabled] of Object.entries(after.outputs)) if (before.outputs[id] !== undefined && before.outputs[id] !== enabled) {
                const event = /relay/i.test(id) ? 'relay_power_changed' : /lift/i.test(id) ? 'lift_power_changed' : 'controller_output_changed';
                const graceExpired = id.startsWith('physical:') && !enabled && before.outputs[id.slice(9)] === after.outputs[id.slice(9)];
                emit(event, { outputId: id, outputName: words(id), enabled, source: source === 'server_timer' || graceExpired ? 'server_timer' : 'authoritative_controller' }, graceExpired ? null : slot ?? null);
            }
            for (const [id, phase] of Object.entries(after.phases)) if (before.phases[id] !== undefined && before.phases[id] !== phase)
                emit(id === 'buffer' ? 'buffer_phase_changed' : 'platform_phase_changed', { controlId: id, phase, previousPhase: before.phases[id] });
            if (before.checkpoint !== after.checkpoint) emit('checkpoint_activated', { checkpointId: action?.type === 'checkpoint' ? action.breakpoint : after.checkpoint });
            if (!before.exitUnlocked && after.exitUnlocked) emit('exit_unlocked', { source: 'authoritative_controller' });
            for (const [i, reached] of after.reachedExit.entries()) if (reached && !before.reachedExit[i]) emit('player_reached_exit', {}, (i + 1) as Slot);
            if (!before.completed && after.completed) t.emit('chamber_completed', this.context(room), { levelInstance: room.record.levelInstance, source: 'authoritative_controller' });
            this.session(room);
        });
    }
}
