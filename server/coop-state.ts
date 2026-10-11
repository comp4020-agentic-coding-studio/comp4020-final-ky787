import { CODE_PATTERN, isCoopLevel, cubeEntries, type CubeId, type CubeMap, type ClientMessage, type CoopLevelId, type CubePlacement, type LevelStateMap, type Plate, type SharedCube, type SharedRoom } from '../src/coop/protocol.ts';
import { isCampaignLevel, type PartyState } from '../src/coop/campaign.ts';
import { UUID } from './identity.ts';
import { freshCube } from './cube-state.ts';
import { freshCrumble, type CrumbleRuntime } from './crumble-state.ts';
import { readLegacyPairingRecord } from './pairing-state.ts';
import { LEVEL_DEFINITIONS } from './level-definitions.ts';
import { freshRace, type RaceRuntime } from './race-state.ts';
import { freshCrossfeed, type CrossfeedRuntime } from './crossfeed-state.ts';

export interface DurableStates {
    'race-condition': { phase: boolean; finalControl: boolean };
    'crossfeed-vault': { chamberRevision: 2; switchB: boolean; switchC: boolean; switchD: boolean; routeMode: boolean; legacyVictory?: true };
    'pairing-bay': { switchB: boolean };
    'relay-lab': { relayEnabled: boolean };
    'lift-lab': { liftLatched: boolean };
    'boost-lab': { routeLatched: boolean };
    'firewall-lab': { checkpointSet: boolean };
    'crumble-lab': { tested: { foot: boolean; hook: boolean } };
}
export interface SessionRecord {
    version: 6; party: PartyState | null; levelInstance: number; code: string; revision: number; visitors: [string, string | null];
    checkpoint: 'entry' | 'reunion' | 'upper';
    exitUnlocked: boolean; reachedExit: [boolean, boolean]; completed: boolean;
    createdAt: string; updatedAt: string;
}
export type RoomRecord<L extends CoopLevelId = CoopLevelId> = { [K in L]: SessionRecord & {
    level: K; levelState: DurableStates[K]; cubePlacements: CubeMap<CubePlacement>;
} }[L];
export type SemanticAction = Extract<ClientMessage, { type: 'switch' | 'control' | 'crumble-trigger' }>;
export interface LevelContext<L extends CoopLevelId = CoopLevelId> {
    record: RoomRecord<L>; held: [Plate, Plate]; crumble: CrumbleRuntime; race: RaceRuntime; crossfeed?: CrossfeedRuntime; now: number;
}
export interface LevelDefinition<L extends CoopLevelId> {
    cubeIds: readonly CubeId[];
    defaults(): DurableStates[L];
    valid(record: RoomRecord<L>): boolean;
    acceptsPlate(plate: Plate, record: RoomRecord<L>): boolean;
    action(context: LevelContext<L>, message: SemanticAction): boolean;
    project(context: LevelContext<L>): LevelStateMap[L];
    unlock(context: LevelContext<L>): boolean;
    cubeEnabled(record: RoomRecord<L>, id: CubeId): boolean;
    acceptsPlacement?(record: RoomRecord<L>, placement: CubePlacement): boolean;
}
/** The only registry cast: each implementation is indexed by the same discriminant. */
export function definition<L extends CoopLevelId>(level: L): LevelDefinition<L> {
    return LEVEL_DEFINITIONS[level] as LevelDefinition<L>;
}
export function newRecord<L extends CoopLevelId>(code: string, visitor: string, level: L, now = new Date().toISOString()): RoomRecord<L> {
    return { version: 6, party: isCampaignLevel(level) ? { phase: 'playing', completedLevels: [] } : null, levelInstance: 1, code, level, levelState: definition(level).defaults(), revision: 0, visitors: [visitor, null],
        cubePlacements: Object.fromEntries(definition(level).cubeIds.map(id => [id, 'spawn'])), checkpoint: 'entry', exitUnlocked: false,
        reachedExit: [false, false], completed: false, createdAt: now, updatedAt: now } as RoomRecord<L>;
}
export function validRecord(value: unknown, code: string): value is RoomRecord {
    if (!validChamber(value, code, 6)) return false;
    return validSession(value as RoomRecord);
}
function validSession(r: RoomRecord): boolean {
    if (!Number.isSafeInteger(r.levelInstance) || r.levelInstance < 1) return false;
    if (!isCampaignLevel(r.level)) return r.party === null;
    const p = r.party;
    return !!p && Object.keys(p).length === 2 && ['lobby', 'playing', 'victory'].includes(p.phase)
        && Array.isArray(p.completedLevels) && p.completedLevels.every(isCampaignLevel)
        && new Set(p.completedLevels).size === p.completedLevels.length
        && (p.phase === 'victory') === r.completed && (!r.completed || p.completedLevels.includes(r.level))
        && (p.phase !== 'lobby' || r.levelInstance === 1 && r.revision >= 0 && !r.exitUnlocked
            && r.checkpoint === 'entry' && !p.completedLevels.length
            && JSON.stringify(r.levelState) === JSON.stringify(definition(r.level).defaults())
            && Object.values(r.cubePlacements).every(v => v === 'spawn'));
}
function validChamber(value: unknown, code: string, version: number, legacyCrossfeed = false): boolean {
    if (!value || typeof value !== 'object') return false;
    const r = value as RoomRecord;
    const def = legacyCrossfeed ? legacyCrossfeedRules : definition(r.level);
    return r.version === version && r.code === code && CODE_PATTERN.test(code) && isCoopLevel(r.level)
        && Number.isSafeInteger(r.revision) && r.revision >= 0
        && Array.isArray(r.visitors) && r.visitors.length === 2 && UUID.test(r.visitors[0])
        && (r.visitors[1] === null || UUID.test(r.visitors[1]) && r.visitors[1] !== r.visitors[0])
        && typeof r.exitUnlocked === 'boolean' && typeof r.completed === 'boolean'
        && Array.isArray(r.reachedExit) && r.reachedExit.length === 2 && r.reachedExit.every(v => typeof v === 'boolean')
        && (!r.reachedExit[1] || r.visitors[1] !== null) && (!r.reachedExit.some(Boolean) || r.exitUnlocked)
        && r.completed === r.reachedExit.every(Boolean)
        && typeof r.createdAt === 'string' && Number.isFinite(Date.parse(r.createdAt))
        && typeof r.updatedAt === 'string' && Number.isFinite(Date.parse(r.updatedAt))
        && !!r.levelState && typeof r.levelState === 'object'
        && !!r.cubePlacements && typeof r.cubePlacements === 'object' && !Array.isArray(r.cubePlacements)
        && Object.keys(r.cubePlacements).length === definition(r.level).cubeIds.length
        && definition(r.level).cubeIds.every(id => r.cubePlacements[id] === 'spawn' || def.acceptsPlacement?.(r, r.cubePlacements[id]!))
        && def.valid(r);
}
/** Validate the old contract before migrating; never reinterpret its latches as v2. */
const legacyCrossfeedRules = {
    acceptsPlacement: (r: RoomRecord, p: CubePlacement) => r.level === 'crossfeed-vault' && (p === 'liftCargo' && r.levelState.switchB
        || (p === 'finalLeft' || p === 'finalRight') && r.levelState.switchD),
    valid: (r: RoomRecord) => r.level === 'crossfeed-vault' && Object.keys(r.levelState).length === 3
        && (['switchB', 'switchC', 'switchD'] as const).every(k => typeof r.levelState[k] === 'boolean')
        && (!r.levelState.switchC || r.levelState.switchB) && (!r.levelState.switchD || r.levelState.switchC)
        && r.checkpoint === (r.levelState.switchC ? 'upper' : 'entry')
        && (!r.exitUnlocked || r.levelState.switchD && r.visitors[1] !== null)
        && ['liftCargo', 'finalLeft', 'finalRight'].every(p => Object.values(r.cubePlacements).filter(v => v === p).length <= 1),
};
export function readRoomRecord(value: unknown, code: string): RoomRecord | null {
    if (validRecord(value, code)) return value;
    if (value && typeof value === 'object' && 'level' in value && value.level === 'crossfeed-vault'
        && 'version' in value && (value.version === 5 || value.version === 6) && validChamber(value, code, value.version, true)) {
        const old = value as RoomRecord<'crossfeed-vault'>;
        const session = old.version === 6 ? old : { ...old, levelInstance: 1,
            party: { phase: old.completed ? 'victory' as const : 'playing' as const, completedLevels: old.completed ? ['crossfeed-vault' as const] : [] } };
        if (session.party?.phase === 'lobby' && Object.values(old.levelState).some(Boolean)) return null;
        // A legacy lobby's defaults differ but its membership/generation rules do not.
        if (!validSession(session.party?.phase === 'lobby' ? { ...session, levelState: definition('crossfeed-vault').defaults() } : session)) return null;
        const fresh = newRecord(code, old.visitors[0], 'crossfeed-vault', old.createdAt);
        fresh.visitors = [...old.visitors]; fresh.updatedAt = old.updatedAt; fresh.revision = old.revision + 1;
        fresh.levelInstance = session.party!.phase === 'lobby' ? 1 : session.levelInstance + 1;
        fresh.party = { ...session.party!, completedLevels: [...session.party!.completedLevels] };
        if (old.completed) {
            // Retain the earned v1 victory without inventing solved v2 switches.
            fresh.levelState.legacyVictory = true; fresh.exitUnlocked = true; fresh.completed = true; fresh.reachedExit = [true, true];
        }
        return validRecord(fresh, code) ? fresh : null;
    }
    if (validChamber(value, code, 5)) {
        const old = value as RoomRecord;
        const migrated = { ...old, version: 6, levelInstance: 1,
            party: isCampaignLevel(old.level) ? { phase: old.completed ? 'victory' : 'playing', completedLevels: old.completed ? [old.level] : [] } : null };
        return validRecord(migrated, code) ? migrated : null;
    }
    if (value && typeof value === 'object' && 'version' in value && value.version === 4) {
        const { cubePlacement, ...session } = value as Record<string, unknown>;
        if (!isCoopLevel(session.level) || session.level === 'crossfeed-vault' || session.level === 'race-condition') return null;
        if (session.level === 'crumble-lab' ? cubePlacement !== null : !['spawn', 'cargoPlate'].includes(cubePlacement as string)) return null;
        const migrated = { ...session, version: 5, cubePlacements: session.level === 'crumble-lab' ? {} : { cube: cubePlacement } };
        return readRoomRecord(migrated, code);
    }
    const old = readLegacyPairingRecord(value, code);
    if (!old) return null;
    const { switchB, cubePlacement, ...session } = old;
    const migrated = { ...session, version: 5, cubePlacements: { cube: cubePlacement }, levelState: { switchB } };
    return readRoomRecord(migrated, code);
}
export const freshCubes = (level: CoopLevelId): CubeMap<SharedCube> => Object.fromEntries(definition(level).cubeIds.map(id => [id, freshCube()]));
export function sharedRoom<L extends CoopLevelId>(record: RoomRecord<L>, connected: [boolean, boolean], plates: [Plate, Plate],
    cube: CubeMap<SharedCube> | SharedCube | null = freshCubes(record.level), crumble = freshCrumble(), now = Date.now(), race = freshRace(), crossfeed = freshCrossfeed()): SharedRoom<L> {
    const held = plates.map((p, i) => connected[i] ? p : null) as [Plate, Plate];
    const collection = cube && 'holder' in cube ? { cube } : cube ?? {};
    const cubes = Object.fromEntries(cubeEntries(collection).map(([id, c]) => [id, { ...c, transform: c.transform ? { ...c.transform } : null }]));
    return { party: record.party ? { ...record.party, completedLevels: [...record.party.completedLevels] } : null, levelInstance: record.levelInstance, code: record.code, level: record.level, revision: record.revision, assigned: [true, record.visitors[1] !== null], connected,
        levelState: definition(record.level).project({ record, held, crumble, race, crossfeed, now }),
        cubes, cubePlacements: { ...record.cubePlacements },
        cube: cubes.cube ?? null, cubePlacement: record.cubePlacements.cube ?? null,
        checkpoint: record.checkpoint, exitUnlocked: record.exitUnlocked, reachedExit: [...record.reachedExit], completed: record.completed } as unknown as SharedRoom<L>;
}
