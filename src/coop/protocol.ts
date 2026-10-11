/** Wire contract: shared logic is coordinate-free; avatars are disposable presentation. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_PATTERN = /^[A-HJKMNP-Z2-9]{4}$/;
export type Slot = 1 | 2;
export const COOP_LEVELS = ['pairing-bay', 'relay-lab', 'lift-lab', 'crumble-lab', 'boost-lab', 'firewall-lab', 'crossfeed-vault'] as const;
export type CoopLevelId = typeof COOP_LEVELS[number];
export const isCoopLevel = (v: unknown): v is CoopLevelId => COOP_LEVELS.includes(v as CoopLevelId);
export type Plate = 'plateA' | 'finalLeft' | 'finalRight' | 'liftControl' | null;
export type Discontinuity = 'relay' | 'respawn' | 'recovery';
export type CrumbleId = 'crumbleA' | 'crumbleB';
export type CrumbleTrigger = 'foot' | 'hook';
export interface CrumblePhase { phase: 'stable' | 'warning' | 'broken'; remainingMs: number; durationMs: number }
export interface CubeTransform { x: number; y: number; vx: number; vy: number; grounded: boolean }
export const CUBE_IDS = ['cube', 'cubeA', 'cubeB'] as const;
export type CubeId = typeof CUBE_IDS[number];
export type CubeMap<T> = Partial<Record<CubeId, T>>;
export const cubeEntries = <T>(map: CubeMap<T>): [CubeId, T][] => Object.entries(map) as [CubeId, T][];
export type CubePlacement = 'spawn' | 'cargoPlate' | 'liftCargo' | 'finalLeft' | 'finalRight';
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
export interface LevelStateMap {
    'crossfeed-vault': {
        inputs: { plateAOccupied: boolean; switchB: boolean; cubeOnLiftCargo: boolean; switchC: boolean; switchD: boolean;
            cubeOnFinalLeft: boolean; cubeOnFinalRight: boolean; finalPlateLeftOccupied: boolean; finalPlateRightOccupied: boolean };
        outputs: { grappleAnchor: boolean; bridge: boolean; liftField: boolean; relayGates: boolean; codePlatformA: boolean; codePlatformB: boolean; exitDoor: boolean };
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
export type SharedRoom<L extends CoopLevelId = CoopLevelId> = { [K in L]: SharedSession & { level: K; levelState: LevelStateMap[K] }
    & (K extends 'crumble-lab' | 'crossfeed-vault' ? { cube: null; cubePlacement: null } : { cube: SharedCube; cubePlacement: CubePlacement }) }[L];
export const cubeAvailable = (room: SharedRoom | null, id: CubeId = 'cube'): boolean => !!room?.cubes[id]
    && (room.level !== 'pairing-bay' || room.levelState.inputs.switchB)
    && (room.level !== 'crossfeed-vault' || (id === 'cubeA' ? room.levelState.inputs.switchB : room.levelState.inputs.switchC));
export type ClientMessage =
    | { type: 'create'; level?: CoopLevelId }
    | { type: 'join'; code: string }
    | { type: 'avatar'; seq: number; avatar: Avatar; discontinuity?: Discontinuity }
    | { type: 'cube'; cubeId: CubeId; epoch: number; seq: number; transform: CubeTransform; discontinuity?: Discontinuity }
    | { type: Exclude<CubeAction, 'cube-reset'>; cubeId: CubeId; seq: number; epoch: number }
    | { type: 'cube-reset'; cubeId: CubeId; seq: number; epoch: number; cause: CubeResetCause }
    | { type: 'cube-drop'; cubeId: CubeId; seq: number; epoch: number; transform: CubeTransform }
    | { type: 'cube-occupancy'; cubeId: CubeId; seq: number; epoch: number; placement: CubePlacement }
    | { type: 'occupancy'; seq: number; plate: Plate }
    | { type: 'switch'; seq: number }
    | { type: 'control'; seq: number; control: 'relayPower' | 'liftLatch' | 'boostRoute' | 'firewallCheckpoint' | 'switchB' | 'switchC' | 'switchD' }
    | { type: 'crumble-trigger'; seq: number; platform: CrumbleId; trigger: CrumbleTrigger }
    | { type: 'local-reset'; seq: number }
    | { type: 'exit'; seq: number }
    | { type: 'leave' }
    | { type: 'ping' };
export type ServerMessage<L extends CoopLevelId = CoopLevelId> =
    | { type: 'snapshot'; slot: Slot; room: SharedRoom<L> }
    | { type: 'room'; room: SharedRoom<L> }
    | { type: 'avatar'; slot: Slot; stream: number; seq: number; avatar: Avatar; discontinuity?: Discontinuity }
    | { type: 'cube'; cubeId: CubeId; epoch: number; seq: number; transform: CubeTransform; discontinuity?: Discontinuity }
    | { type: 'cube-denied'; cubeId: CubeId; seq: number }
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
export function parseClientMessage(raw: string): ClientMessage | null {
    if (raw.length > 2048) return null;
    let v: unknown;
    try { v = JSON.parse(raw); } catch { return null; }
    if (!object(v)) return null;
    if (['create', 'leave', 'ping'].includes(v.type as string) && keys(v, ['type'])) return v as ClientMessage;
    if (v.type === 'create' && keys(v, ['type', 'level']) && isCoopLevel(v.level)) return v as ClientMessage;
    if (v.type === 'join' && keys(v, ['type', 'code']) && typeof v.code === 'string' && v.code.length <= 32) return v as ClientMessage;
    if (v.type === 'avatar' && streamKeys(v, ['type', 'seq', 'avatar']) && sequence(v.seq) && validAvatar(v.avatar)) return v as ClientMessage;
    if (typeof v.type === 'string' && (v.type === 'cube' || v.type.startsWith('cube-')) && !CUBE_IDS.includes(v.cubeId as CubeId)) return null;
    if ((v.type === 'cube' && streamKeys(v, ['type', 'cubeId', 'seq', 'epoch', 'transform']) || v.type === 'cube-drop' && keys(v, ['type', 'cubeId', 'seq', 'epoch', 'transform']))
        && sequence(v.seq) && sequence(v.epoch) && validCubeTransform(v.transform)) return v as ClientMessage;
    if (['cube-pickup', 'cube-pull-start', 'cube-pull-stop'].includes(v.type as string)
        && keys(v, ['type', 'cubeId', 'seq', 'epoch']) && sequence(v.seq) && sequence(v.epoch)) return v as ClientMessage;
    if (v.type === 'cube-reset' && keys(v, ['type', 'cubeId', 'seq', 'epoch', 'cause']) && ['firewall', 'recovery'].includes(v.cause as string)
        && sequence(v.seq) && sequence(v.epoch)) return v as ClientMessage;
    if (v.type === 'cube-occupancy' && keys(v, ['type', 'cubeId', 'seq', 'epoch', 'placement'])
        && sequence(v.seq) && sequence(v.epoch) && ['spawn', 'cargoPlate', 'liftCargo', 'finalLeft', 'finalRight'].includes(v.placement as string)) return v as ClientMessage;
    if (v.type === 'occupancy' && keys(v, ['type', 'seq', 'plate']) && sequence(v.seq)
        && [null, 'plateA', 'finalLeft', 'finalRight', 'liftControl'].includes(v.plate as Plate)) return v as ClientMessage;
    if (['switch', 'exit', 'local-reset'].includes(v.type as string) && keys(v, ['type', 'seq']) && sequence(v.seq)) return v as ClientMessage;
    if (v.type === 'control' && keys(v, ['type', 'seq', 'control']) && sequence(v.seq)
        && ['relayPower', 'liftLatch', 'boostRoute', 'firewallCheckpoint', 'switchB', 'switchC', 'switchD'].includes(v.control as string)) return v as ClientMessage;
    if (v.type === 'crumble-trigger' && keys(v, ['type', 'seq', 'platform', 'trigger']) && sequence(v.seq)
        && ['crumbleA', 'crumbleB'].includes(v.platform as string) && ['foot', 'hook'].includes(v.trigger as string)) return v as ClientMessage;
    return null;
}
export function websocketUrl(page: string): string {
    const url = new URL('/ws', page);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.href;
}
/** An initial snapshot resets the connection epoch; ordinary updates must advance it. */
export function newerRoom(current: SharedRoom | null, incoming: SharedRoom): boolean {
    return !current || current.code === incoming.code && incoming.revision > current.revision;
}
