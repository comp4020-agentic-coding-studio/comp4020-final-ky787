/** Wire contract: shared logic is coordinate-free; avatars are disposable presentation. */
import type { PublicCharacterProfile } from '../character/profile.ts';
import { isCampaignLevel, AUTHORED_CAMPAIGN_LEVELS, isAuthoredCampaignLevel, type AuthoredCampaignLevel, type CampaignLevel, type PartyState } from './campaign.ts';
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_PATTERN = /^[A-HJKMNP-Z2-9]{4}$/;
export type Slot = 1 | 2;
/** Public appearance only; tuple position is the authoritative player slot. */
export type CharacterProfiles = [PublicCharacterProfile | null, PublicCharacterProfile | null];
export const COOP_LEVELS = ['pairing-bay', 'relay-lab', 'lift-lab', 'crumble-lab', 'boost-lab', 'firewall-lab', 'crossfeed-vault', 'race-condition', ...AUTHORED_CAMPAIGN_LEVELS] as const;
export type CoopLevelId = typeof COOP_LEVELS[number];
export type SessionLevelId = CoopLevelId | 'workbench';
export type DeclarativeLevelId = AuthoredCampaignLevel | 'workbench';
export const isDeclarativeLevel = (level: unknown): level is DeclarativeLevelId => level === 'workbench' || isAuthoredCampaignLevel(level);
/** JSON object IDs are namespaced; older built-in controllers keep literal allowlists. */
export type DraftId = `draft:${string}`;
export const validDraftId = (v: unknown): v is DraftId => typeof v === 'string' && /^draft:[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v);
export interface DraftSessionMetadata { hash: string; controller: { id: string; version: number } }
export const validDraftMetadata = (v: unknown): v is DraftSessionMetadata => object(v) && keys(v, ['hash', 'controller'])
    && typeof v.hash === 'string' && /^[a-f0-9]{64}$/.test(v.hash) && object(v.controller)
    && keys(v.controller, ['id', 'version']) && typeof v.controller.id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v.controller.id)
    && Number.isSafeInteger(v.controller.version) && Number(v.controller.version) > 0;
export const isCoopLevel = (v: unknown): v is CoopLevelId => COOP_LEVELS.includes(v as CoopLevelId);
export const PRESSURE_PLATES = ['dropA', 'dropB', 'receiver', 'trace', 'return'] as const;
export const CROSSFEED_PLATES = ['entry', 'routePower'] as const;
export const CROSSFEED_HANDOVER_MS = 325;
export type PressurePlateId = typeof PRESSURE_PLATES[number] | typeof CROSSFEED_PLATES[number] | DraftId;
export type Plate = 'plateA' | 'finalLeft' | 'finalRight' | 'liftControl' | PressurePlateId | null;
export type Discontinuity = 'relay' | 'respawn' | 'recovery';
export type CrumbleId = 'crumbleA' | 'crumbleB' | DraftId;
export type CrumbleTrigger = 'foot' | 'hook';
export interface CrumblePhase { phase: 'stable' | 'warning' | 'broken'; remainingMs: number; durationMs: number }
export interface CubeTransform { x: number; y: number; vx: number; vy: number; grounded: boolean }
export const CUBE_IDS = ['cube', 'cubeA', 'cubeB'] as const;
export type CubeId = typeof CUBE_IDS[number] | DraftId;
export type CubeMap<T> = Partial<Record<typeof CUBE_IDS[number], T>> & Record<DraftId, T>;
export const cubeEntries = <T>(map: CubeMap<T>): [CubeId, T][] => Object.entries(map) as [CubeId, T][];
export type CubePlacement = 'spawn' | 'cargoPlate' | 'liftCargo' | 'finalLeft' | 'finalRight' | PressurePlateId;
export type CubeResetCause = 'firewall' | 'recovery';
/** Ephemeral server arbitration, separate from both body reports and durable placement. */
export interface SharedCube {
    holder: Slot | null; physicsAuthority: Slot | null; pulling: boolean;
    epoch: number; seq: number; transform: CubeTransform | null;
    /** Ephemeral accepted reset marker, retained across later grants for presentation. */
    lastReset?: { epoch: number; cause: CubeResetCause };
}
export type CubeAction = 'cube-pickup' | 'cube-pull-start' | 'cube-pull-stop' | 'cube-reset';
export interface Avatar {
    x: number; y: number; vx: number; vy: number;
    facing: -1 | 1; grounded: boolean;
    rope: { x: number; y: number } | null;
}
export interface RaceInputs {
    dropA: boolean; dropB: boolean; payloadDelivered: boolean; traceOccupied: boolean;
    phase: boolean; returnOccupied: boolean; finalControl: boolean;
}
export interface RaceOutputs {
    topBridge: boolean; bufferBridge: boolean; safetyFirewall: boolean; raceFirewall: boolean;
    spanMaster: boolean; phaseA: boolean; phaseB: boolean; returnBridge: boolean; exitDoor: boolean;
}
export interface CrossfeedOutputs {
    grappleAnchor: boolean; bridge: boolean; liftField: boolean; relayGates: boolean; serviceAccess: boolean;
    leftRoute: boolean; rightRoute: boolean; galleryAccess: boolean; vaultPower: boolean; vaultReturn: boolean; exitDoor: boolean;
}
export interface DeclarativeLevelState { devices: Record<string, boolean>; outputs: Record<string, boolean>; platforms: Record<CrumbleId, CrumblePhase> }
export interface LevelStateMap extends Record<AuthoredCampaignLevel, DeclarativeLevelState> {
    workbench: DeclarativeLevelState;
    'race-condition': {
        inputs: RaceInputs; outputs: RaceOutputs;
        physical: { phaseA: boolean; phaseB: boolean; returnBridge: boolean };
        handoverMs: number;
        buffer: { phase: 'idle' | 'window' | 'released' | 'expired'; remainingMs: number; durationMs: number };
        platforms: Record<CrumbleId, CrumblePhase>;
    };
    'crossfeed-vault': {
        inputs: { plateAOccupied: boolean; switchB: boolean; cubeOnLiftCargo: boolean; switchC: boolean; switchD: boolean; routePowerOccupied: boolean; routeMode: boolean;
            cubeOnFinalLeft: boolean; cubeOnFinalRight: boolean; finalPlateLeftOccupied: boolean; finalPlateRightOccupied: boolean };
        outputs: CrossfeedOutputs;
        physical: { leftRoute: boolean; rightRoute: boolean };
        handoverMs: number; platforms: Record<CrumbleId, CrumblePhase>;
    };
    'pairing-bay': {
        inputs: { plateAOccupied: boolean; switchB: boolean; cubeOnCargoPlate: boolean; finalPlateLeftOccupied: boolean; finalPlateRightOccupied: boolean };
        outputs: { grappleAnchor: boolean; returnBridge: boolean; finalAccess: boolean; exitDoor: boolean };
    };
    'relay-lab': { relayEnabled: boolean };
    'lift-lab': { lowerHeld: boolean; liftLatched: boolean; liftEnabled: boolean };
    'boost-lab': { routeLatched: boolean };
    'firewall-lab': { checkpointSet: boolean };
    'crumble-lab': { tested: { foot: boolean; hook: boolean }; platforms: Record<CrumbleId, CrumblePhase> };
}
interface SharedSession {
    /** Optional for older fixtures; populated by the server from visitor membership. */
    profiles?: CharacterProfiles;
    draft?: DraftSessionMetadata;
    party: PartyState | null;
    levelInstance: number;
    cubes: CubeMap<SharedCube>;
    cubePlacements: CubeMap<CubePlacement>;
    code: string;
    revision: number;
    assigned: [boolean, boolean];
    connected: [boolean, boolean];
    checkpoint: 'entry' | 'reunion' | 'upper';
    exitUnlocked: boolean;
    reachedExit: [boolean, boolean];
    completed: boolean;
}
export type SharedRoom<L extends SessionLevelId = SessionLevelId> = { [K in L]: SharedSession & { level: K; levelState: LevelStateMap[K] }
    & (K extends 'crumble-lab' | 'crossfeed-vault' | 'race-condition' | DeclarativeLevelId ? { cube: null; cubePlacement: null } : { cube: SharedCube; cubePlacement: CubePlacement }) }[L];
export type SessionRoom = SharedRoom<SessionLevelId>;
export const cubeAvailable = (room: SessionRoom | null, id: CubeId = 'cube'): boolean => !!room?.cubes[id]
    && (room.level !== 'pairing-bay' || room.levelState.inputs.switchB);
type ClientPayload =
    | { type: 'create-draft'; hash: string }
    | { type: 'restart-draft'; seq: number; hash: string }
    | { type: 'create-party' }
    | { type: 'select-level'; seq: number; level: CampaignLevel }
    | { type: 'create'; level?: CoopLevelId }
    | { type: 'join'; code: string }
    | { type: 'avatar'; seq: number; avatar: Avatar; discontinuity?: Discontinuity }
    | { type: 'cube'; cubeId: CubeId; epoch: number; seq: number; transform: CubeTransform; discontinuity?: Discontinuity }
    | { type: Exclude<CubeAction, 'cube-reset'>; cubeId: CubeId; seq: number; epoch: number }
    | { type: 'cube-reset'; cubeId: CubeId; seq: number; epoch: number; cause: CubeResetCause }
    | { type: 'cube-drop'; cubeId: CubeId; seq: number; epoch: number; transform: CubeTransform }
    | { type: 'draft-cube-occupancy'; cubeId: DraftId; seq: number; epoch: number; devices: DraftId[] }
    | { type: 'cube-occupancy'; cubeId: CubeId; seq: number; epoch: number; placement: CubePlacement }
    | { type: 'cube-contact'; cubeId: CubeId; seq: number; epoch: number; sensor: 'buffer' }
    | { type: 'draft-occupancy'; seq: number; devices: DraftId[] }
    | { type: 'occupancy'; seq: number; plate: Plate }
    | { type: 'switch'; seq: number }
    | { type: 'checkpoint'; seq: number; breakpoint: 'system-online' | DraftId }
    | { type: 'control'; seq: number; control: DraftId | 'relayPower' | 'liftLatch' | 'boostRoute' | 'firewallCheckpoint' | 'switchB' | 'switchC' | 'switchD' | 'routeMode' | 'phase' | 'commit' }
    | { type: 'crumble-trigger'; seq: number; platform: CrumbleId; trigger: CrumbleTrigger }
    | { type: 'local-reset'; seq: number }
    | { type: 'exit'; seq: number }
    | { type: 'leave' }
    | { type: 'ping' };
/** Legacy fixed-level fixtures may omit generation; parties must always supply it. */
export type ClientMessage = ClientPayload & { levelInstance?: number };
export type ServerMessage<L extends SessionLevelId = SessionLevelId> =
    | { type: 'snapshot'; slot: Slot; room: SharedRoom<L> }
    | { type: 'room'; room: SharedRoom<L> }
    | { type: 'avatar'; levelInstance?: number; slot: Slot; stream: number; seq: number; avatar: Avatar; discontinuity?: Discontinuity }
    | { type: 'cube'; levelInstance?: number; cubeId: CubeId; epoch: number; seq: number; transform: CubeTransform; discontinuity?: Discontinuity }
    | { type: 'cube-denied'; levelInstance?: number; cubeId: CubeId; seq: number }
    | { type: 'action-result'; seq: number; accepted: boolean; room: SharedRoom<L> }
    | { type: 'error'; code: string; message: string }
    | { type: 'pong' };
export function normalizeCode(value: string): string | null {
    const code = value.trim().toUpperCase();
    return CODE_PATTERN.test(code) ? code : null;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const number = (v: unknown, limit: number) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
const sequence = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;
const streamKeys = (v: Record<string, unknown>, names: string[]) => keys(v, names)
    || keys(v, [...names, 'discontinuity']) && ['relay', 'respawn', 'recovery'].includes(v.discontinuity as string);
export function validCubeTransform(v: unknown): v is CubeTransform {
    return object(v) && keys(v, ['x', 'y', 'vx', 'vy', 'grounded'])
        && number(v.x, 10000) && number(v.y, 10000) && number(v.vx, 2000) && number(v.vy, 2000)
        && typeof v.grounded === 'boolean';
}
export function validAvatar(v: unknown): v is Avatar {
    return object(v) && keys(v, ['x', 'y', 'vx', 'vy', 'facing', 'grounded', 'rope'])
        && number(v.x, 10000) && number(v.y, 10000) && number(v.vx, 2000) && number(v.vy, 2000)
        && (v.facing === 1 || v.facing === -1) && typeof v.grounded === 'boolean'
        && (v.rope === null || object(v.rope) && keys(v.rope, ['x', 'y']) && number(v.rope.x, 10000) && number(v.rope.y, 10000));
}
/** Strict keys also reject attempts to inject slot, visitor, outputs or revisions. */
export function parseClientMessage(raw: string, allowDrafts = false): ClientMessage | null {
    if (raw.length > (allowDrafts ? 8192 : 2048)) return null;
    let v: unknown;
    try { v = JSON.parse(raw); } catch { return null; }
    if (!object(v)) return null;
    const { levelInstance, ...payload } = v;
    if (Object.hasOwn(v, 'levelInstance') && (!sequence(levelInstance) || (levelInstance as number) < 1 || !Object.hasOwn(v, 'seq'))) return null;
    if ((v.type === 'select-level' || v.type === 'restart-draft') && levelInstance === undefined) return null;
    const message = parsePayload(payload, allowDrafts);
    return message ? { ...message, ...(levelInstance !== undefined ? { levelInstance: levelInstance as number } : {}) } : null;
}
function parsePayload(v: Record<string, unknown>, allowDrafts: boolean): ClientMessage | null {
    if (allowDrafts && v.type === 'create-draft' && keys(v, ['type', 'hash']) && typeof v.hash === 'string' && /^[a-f0-9]{64}$/.test(v.hash)) return v as ClientMessage;
    if (allowDrafts && v.type === 'restart-draft' && keys(v, ['type', 'seq', 'hash']) && sequence(v.seq) && typeof v.hash === 'string' && /^[a-f0-9]{64}$/.test(v.hash)) return v as ClientMessage;
    if (v.type === 'create-party' && keys(v, ['type'])) return { type: 'create-party' };
    if (v.type === 'select-level' && keys(v, ['type', 'seq', 'level']) && sequence(v.seq) && isCampaignLevel(v.level)) return v as ClientMessage;
    if (['create', 'leave', 'ping'].includes(v.type as string) && keys(v, ['type'])) return v as ClientMessage;
    if (v.type === 'create' && keys(v, ['type', 'level']) && isCoopLevel(v.level)) return v as ClientMessage;
    if (v.type === 'join' && keys(v, ['type', 'code']) && typeof v.code === 'string' && v.code.length <= 32) return v as ClientMessage;
    if (v.type === 'avatar' && streamKeys(v, ['type', 'seq', 'avatar']) && sequence(v.seq) && validAvatar(v.avatar)) return v as ClientMessage;
    if (typeof v.type === 'string' && (v.type === 'cube' || v.type.startsWith('cube-')) && !CUBE_IDS.includes(v.cubeId as typeof CUBE_IDS[number]) && !(allowDrafts && validDraftId(v.cubeId))) return null;
    if ((v.type === 'cube' && streamKeys(v, ['type', 'cubeId', 'seq', 'epoch', 'transform']) || v.type === 'cube-drop' && keys(v, ['type', 'cubeId', 'seq', 'epoch', 'transform']))
        && sequence(v.seq) && sequence(v.epoch) && validCubeTransform(v.transform)) return v as ClientMessage;
    if (['cube-pickup', 'cube-pull-start', 'cube-pull-stop'].includes(v.type as string)
        && keys(v, ['type', 'cubeId', 'seq', 'epoch']) && sequence(v.seq) && sequence(v.epoch)) return v as ClientMessage;
    if (v.type === 'cube-reset' && keys(v, ['type', 'cubeId', 'seq', 'epoch', 'cause']) && ['firewall', 'recovery'].includes(v.cause as string)
        && sequence(v.seq) && sequence(v.epoch)) return v as ClientMessage;
    if (v.type === 'cube-occupancy' && keys(v, ['type', 'cubeId', 'seq', 'epoch', 'placement'])
        && sequence(v.seq) && sequence(v.epoch) && (['spawn', 'cargoPlate', 'liftCargo', 'finalLeft', 'finalRight', ...PRESSURE_PLATES, ...CROSSFEED_PLATES].includes(v.placement as string) || allowDrafts && validDraftId(v.placement))) return v as ClientMessage;
    if (v.type === 'cube-contact' && keys(v, ['type', 'cubeId', 'seq', 'epoch', 'sensor']) && v.sensor === 'buffer'
        && sequence(v.seq) && sequence(v.epoch)) return v as ClientMessage;
    if (allowDrafts && v.type === 'draft-cube-occupancy' && keys(v, ['type', 'cubeId', 'seq', 'epoch', 'devices']) && sequence(v.seq) && sequence(v.epoch) && validDraftId(v.cubeId) && Array.isArray(v.devices) && v.devices.length <= 48 && v.devices.every(validDraftId) && new Set(v.devices).size === v.devices.length) return v as ClientMessage;
    if (allowDrafts && v.type === 'draft-occupancy' && keys(v, ['type', 'seq', 'devices']) && sequence(v.seq) && Array.isArray(v.devices) && v.devices.length <= 48 && v.devices.every(validDraftId) && new Set(v.devices).size === v.devices.length) return v as ClientMessage;
    if (v.type === 'occupancy' && keys(v, ['type', 'seq', 'plate']) && sequence(v.seq)
        && ([null, 'plateA', 'finalLeft', 'finalRight', 'liftControl', ...PRESSURE_PLATES, ...CROSSFEED_PLATES].some(p => p === v.plate) || allowDrafts && validDraftId(v.plate))) return v as ClientMessage;
    if (['switch', 'exit', 'local-reset'].includes(v.type as string) && keys(v, ['type', 'seq']) && sequence(v.seq)) return v as ClientMessage;
    if (v.type === 'checkpoint' && keys(v, ['type', 'seq', 'breakpoint']) && sequence(v.seq)
        && (v.breakpoint === 'system-online' || allowDrafts && validDraftId(v.breakpoint))) return v as ClientMessage;
    if (v.type === 'control' && keys(v, ['type', 'seq', 'control']) && sequence(v.seq)
        && (['relayPower', 'liftLatch', 'boostRoute', 'firewallCheckpoint', 'switchB', 'switchC', 'switchD', 'routeMode', 'phase', 'commit'].includes(v.control as string) || allowDrafts && validDraftId(v.control))) return v as ClientMessage;
    if (v.type === 'crumble-trigger' && keys(v, ['type', 'seq', 'platform', 'trigger']) && sequence(v.seq)
        && (['crumbleA', 'crumbleB'].includes(v.platform as string) || allowDrafts && validDraftId(v.platform)) && ['foot', 'hook'].includes(v.trigger as string)) return v as ClientMessage;
    return null;
}
export function websocketUrl(page: string): string {
    const url = new URL('/ws', page);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.href;
}
/** An initial snapshot resets the connection epoch; ordinary updates must advance it. */
export function newerRoom(current: SessionRoom | null, incoming: SessionRoom): boolean {
    return !current || current.code === incoming.code && incoming.levelInstance >= current.levelInstance && incoming.revision > current.revision;
}
