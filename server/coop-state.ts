import { CODE_PATTERN, isCoopLevel, type ClientMessage, type CoopLevelId, type CubePlacement, type LevelStateMap, type Plate, type SharedCube, type SharedRoom } from '../src/coop/protocol.ts';
import { UUID } from './identity.ts';
import { freshCube } from './cube-state.ts';
import { freshCrumble, type CrumbleRuntime } from './crumble-state.ts';
import { readLegacyPairingRecord } from './pairing-state.ts';
import { LEVEL_DEFINITIONS } from './level-definitions.ts';

export interface DurableStates {
    'pairing-bay': { switchB: boolean };
    'relay-lab': { relayEnabled: boolean };
    'lift-lab': { liftLatched: boolean };
    'boost-lab': { routeLatched: boolean };
    'crumble-lab': { tested: { foot: boolean; hook: boolean } };
}
export interface SessionRecord {
    version: 4; code: string; revision: number; visitors: [string, string | null];
    checkpoint: 'entry' | 'reunion' | 'upper';
    exitUnlocked: boolean; reachedExit: [boolean, boolean]; completed: boolean;
    createdAt: string; updatedAt: string;
}
export type RoomRecord<L extends CoopLevelId = CoopLevelId> = { [K in L]: SessionRecord & {
    level: K; levelState: DurableStates[K]; cubePlacement: K extends 'crumble-lab' ? null : CubePlacement;
} }[L];
export type SemanticAction = Extract<ClientMessage, { type: 'switch' | 'control' | 'crumble-trigger' }>;
export interface LevelContext<L extends CoopLevelId = CoopLevelId> {
    record: RoomRecord<L>; held: [Plate, Plate]; crumble: CrumbleRuntime; now: number;
}
export interface LevelDefinition<L extends CoopLevelId> {
    cube: boolean;
    defaults(): DurableStates[L];
    valid(record: RoomRecord<L>): boolean;
    acceptsPlate(plate: Plate, record: RoomRecord<L>): boolean;
    action(context: LevelContext<L>, message: SemanticAction): boolean;
    project(context: LevelContext<L>): LevelStateMap[L];
    unlock(context: LevelContext<L>): boolean;
    cubeEnabled(record: RoomRecord<L>): boolean;
}
/** The only registry cast: each implementation is indexed by the same discriminant. */
export function definition<L extends CoopLevelId>(level: L): LevelDefinition<L> {
    return LEVEL_DEFINITIONS[level] as LevelDefinition<L>;
}
export function newRecord<L extends CoopLevelId>(code: string, visitor: string, level: L, now = new Date().toISOString()): RoomRecord<L> {
    return { version: 4, code, level, levelState: definition(level).defaults(), revision: 0, visitors: [visitor, null],
        cubePlacement: definition(level).cube ? 'spawn' : null, checkpoint: 'entry', exitUnlocked: false,
        reachedExit: [false, false], completed: false, createdAt: now, updatedAt: now } as RoomRecord<L>;
}
export function validRecord(value: unknown, code: string): value is RoomRecord {
    if (!value || typeof value !== 'object') return false;
    const r = value as RoomRecord;
    return r.version === 4 && r.code === code && CODE_PATTERN.test(code) && isCoopLevel(r.level)
        && Number.isSafeInteger(r.revision) && r.revision >= 0
        && Array.isArray(r.visitors) && r.visitors.length === 2 && UUID.test(r.visitors[0])
        && (r.visitors[1] === null || UUID.test(r.visitors[1]) && r.visitors[1] !== r.visitors[0])
        && typeof r.exitUnlocked === 'boolean' && typeof r.completed === 'boolean'
        && Array.isArray(r.reachedExit) && r.reachedExit.length === 2 && r.reachedExit.every(v => typeof v === 'boolean')
        && (!r.reachedExit[1] || r.visitors[1] !== null) && (!r.reachedExit.some(Boolean) || r.exitUnlocked)
        && r.completed === r.reachedExit.every(Boolean)
        && typeof r.createdAt === 'string' && Number.isFinite(Date.parse(r.createdAt))
        && typeof r.updatedAt === 'string' && Number.isFinite(Date.parse(r.updatedAt))
        && !!r.levelState && typeof r.levelState === 'object' && definition(r.level).valid(r);
}
export function readRoomRecord(value: unknown, code: string): RoomRecord | null {
    if (validRecord(value, code)) return value;
    const old = readLegacyPairingRecord(value, code);
    if (!old) return null;
    const { switchB, ...session } = old;
    const migrated = { ...session, version: 4, levelState: { switchB } };
    return validRecord(migrated, code) ? migrated : null;
}
export function sharedRoom<L extends CoopLevelId>(record: RoomRecord<L>, connected: [boolean, boolean], plates: [Plate, Plate],
    cube: SharedCube | null = definition(record.level).cube ? freshCube() : null, crumble = freshCrumble(), now = Date.now()): SharedRoom<L> {
    const held = plates.map((p, i) => connected[i] ? p : null) as [Plate, Plate];
    return { code: record.code, level: record.level, revision: record.revision, assigned: [true, record.visitors[1] !== null], connected,
        levelState: definition(record.level).project({ record, held, crumble, now }),
        cube: cube ? { ...cube, transform: cube.transform ? { ...cube.transform } : null } : null, cubePlacement: record.cubePlacement,
        checkpoint: record.checkpoint, exitUnlocked: record.exitUnlocked, reachedExit: [...record.reachedExit], completed: record.completed } as SharedRoom<L>;
}
