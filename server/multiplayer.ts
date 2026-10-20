import { GameplayTelemetry } from './gameplay-telemetry.ts';
import type { Telemetry } from './telemetry.ts';
import { DEFAULT_CHARACTER_PROFILE, parseCharacterProfile, type PublicCharacterProfile } from '../src/character/profile.ts';
import type { CharacterProfiles } from '../src/coop/protocol.ts';
import { isAuthoredCampaignLevel } from '../src/coop/campaign.ts';
import { isDeclarativeLevel } from '../src/coop/protocol.ts';
import { advanceCrossfeed, crossfeedDue, freshCrossfeed, syncCrossfeed, type CrossfeedRuntime } from './crossfeed-state.ts';
import { nativeCrossfeedProjection } from './native/temporal.ts';
import { newParty, selectChamber, completeParty } from './party-state.ts';
import type { Server, IncomingMessage } from 'node:http';
import { randomInt } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { CODE_ALPHABET, normalizeCode, parseClientMessage, type ClientMessage, type Plate, type ServerMessage, type SharedCube, type CubeMap, type Slot, type SessionLevelId, type DraftSessionMetadata, type DraftId, validDraftMetadata } from '../src/coop/protocol.ts';
import { acceptCubeSnapshot, assignCube, interactCube } from './cube-state.ts';
import { atomicJson } from './atomic-json.ts';
import { sameOrigin, visitorCookie } from './identity.ts';
import { definition, newRecord, sharedRoom, freshCubes, readRoomRecord, type RoomRecord, type LevelDefinition } from './coop-state.ts';
import { advanceCrumble, crumbleDue, freshCrumble, type CrumbleRuntime } from './crumble-state.ts';

import { advanceRace, freshRace, raceDue, syncRace, RACE_TIMING, type RaceRuntime } from './race-state.ts';
import { PUBLIC_DRAFT_LIMITS } from './public-drafts.ts';

interface Peer {
    ws: WebSocket; visitor: string; room?: Room; slot?: Slot;
    custom: boolean;
    actionSeq: number; avatarSeq: number; stream: number; alive: boolean; joinedAt: number;
    tokens: number; refilled: number; pending: number;
}
export type FrozenDraftSession = { metadata: DraftSessionMetadata; coopError?: string; breakpoints?: readonly string[] } & (
    { level: Exclude<SessionLevelId, 'workbench'> } | { level: 'workbench'; definition: LevelDefinition<'workbench'> });
export interface FrozenDraftRegistry {
    get(hash: string): FrozenDraftSession | undefined;
    temporary?: boolean;
    canCreate?(hash: string, visitor: string): boolean;
    retain?(hash: string, visitor: string, code: string): void;
    release?(code: string): void;
    sweep?(): void;
}
interface Room {
    profiles: CharacterProfiles;
    draft?: FrozenDraftSession; draftHeld: [DraftId[], DraftId[]]; draftCubeContacts: CubeMap<DraftId[]>;
    record: RoomRecord; peers: [Peer | null, Peer | null]; plates: [Plate, Plate];
    cubes: CubeMap<SharedCube>; crumble: CrumbleRuntime; race: RaceRuntime; crossfeed: CrossfeedRuntime; revision: number; needsPersist: boolean;
    idleSince: number; failed: boolean; transitioning?: boolean;
}
export interface ActionTiming { action: string; accepted?: boolean; queueMs: number; persistMs: number; totalMs: number; durable: boolean }
export interface MultiplayerOptions {
    /** Optional, fail-open observer. Never becomes part of authoritative state. */
    telemetry?: Telemetry;
    /** Reads appearance using the server's HttpOnly visitor identity, never a client slot claim. */
    loadProfile?: (visitor: string) => Promise<PublicCharacterProfile | null>;
    /** Local snapshots or the bounded, temporary public registry. */
    drafts?: FrozenDraftRegistry;
    /** Local services can enforce their bound origin as well as ordinary same-origin checks. */
    acceptsUpgrade?: (request: IncomingMessage) => boolean;
    /** Explicit local development transport owned by the service, never gameplay. */
    ignoredUpgradePath?: string;
    idleMs?: number; sweepMs?: number; generateCode?: () => string;
    /** Test harness only; never delays transform traffic. */
    semanticDelayMs?: number;
    onActionTiming?: (timing: ActionTiming) => void;
}
export function generateCode(): string {
    return Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
}
/** One process, one volume, bounded memory. No world geometry or physics imports. */
export async function attachMultiplayer(server: Server, dataDir: string, options: MultiplayerOptions = {}) {
    const observer = new GameplayTelemetry(options.telemetry);
    const observe = (work: (telemetry: Telemetry) => void) => { if (options.telemetry) try { work(options.telemetry); } catch { /* Gameplay survives observer failures. */ } };
    const directory = join(dataDir, 'rooms');
    await mkdir(directory, { recursive: true });
    const rooms = new Map<string, Room>();
    const peers = new Set<Peer>();
    const expired = new Set<string>();
    const temporary = (room: Room) => !!room.draft && !!options.drafts?.temporary;
    function expire(room: Room) {
        room.failed = true;
        for (const peer of room.peers) if (peer) { error(peer, 'ROOM_EXPIRED', 'This temporary custom room expired. Ask the host to start a new room from their saved level.'); peer.ws.close(1000, 'Room expired'); }
        observe(t => t.emit('room_expired', { session: room.record.code, chamber: room.record.level }, { reason: 'temporary_room_lifetime' }, 'warn'));
        observer.remove(room); rooms.delete(room.record.code); options.drafts?.release?.(room.record.code);
        expired.add(room.record.code); if (expired.size > 64) expired.delete(expired.values().next().value!);
    }
    const elapsed = (room: Room) => Date.now() - Date.parse(room.record.createdAt) >= PUBLIC_DRAFT_LIMITS.lifetimeMs
        || room.peers.every(p => !p) && Date.now() - room.idleSince >= PUBLIC_DRAFT_LIMITS.abandonedMs;
    const wss = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
    let queue = Promise.resolve();
    let queued = 0;
    let stream = 0;
    // Only semantic events enter this queue. Avatar/cube traffic never waits for disk.
    function serial(work: () => Promise<void>) {
        queued++;
        queue = queue.then(work).catch(() => { observe(t => t.emit('multiplayer_operation_failed', {}, { operation: 'semantic_queue' }, 'error')); }).finally(() => { queued--; });
        return queue;
    }
    function send(peer: Peer, message: ServerMessage) {
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        if (peer.ws.bufferedAmount > 65536) { peer.ws.terminate(); return; }
        peer.ws.send(JSON.stringify(message));
    }
    const error = (peer: Peer, code: string, message = code.replaceAll('_', ' ')) => {
        // Fixed server codes only: never include payloads, join codes or arbitrary error text.
        observe(t => t.emit(code === 'RATE_LIMITED' ? 'rate_limit_reached' : 'room_operation_rejected',
            peer.room ? observer.context(peer.room, peer.slot) : { visitor: peer.visitor }, { code }, 'warn'));
        send(peer, { type: 'error', code, message });
    };
    // Registry discrimination guarantees the rule and record have the same level.
    const rules = (room: Room): LevelDefinition<SessionLevelId> => room.draft?.level === 'workbench' ? room.draft.definition as LevelDefinition<SessionLevelId> : definition(room.record.level);
    const view = (room: Room) => ({ ...sharedRoom(room.record, room.peers.map(Boolean) as [boolean, boolean], room.plates, room.cubes, room.crumble, Date.now(), room.race, room.crossfeed, rules(room), room.draftHeld, room.draftCubeContacts), revision: room.revision, profiles: room.profiles });
    // Explicit durable projection. Live occupancy, owners, streams and transforms are absent.
    const durable = (room: Room) => JSON.stringify([room.record.levelState, room.record.checkpoint, room.record.cubePlacements,
        room.record.exitUnlocked, room.record.reachedExit, room.record.completed, room.record.party, room.record.level, room.record.levelInstance, room.record.draft]);
    const broadcast = (room: Room) => { for (const p of room.peers) if (p) send(p, { type: 'room', room: view(room) }); };
    const ownsSlot = (p: Peer): p is Peer & { room: Room; slot: Slot } => !!p.room && !!p.slot && p.room.peers[p.slot - 1] === p && !p.room.failed;
    async function persist(room: Room) {
        room.record.updatedAt = new Date().toISOString();
        if (temporary(room)) return;
        try { await atomicJson(join(directory, `${room.record.code}.json`), room.record); }
        catch {
            // Fail closed. Never keep accepting changes that cannot be acknowledged durably.
            observe(t => t.emit('room_persistence_failed', { session: room.record.code, chamber: room.record.level }, { operation: 'room_save' }, 'error'));
            observer.remove(room); room.failed = true;
            for (const p of room.peers) if (p) { error(p, 'ROOM_UNAVAILABLE'); p.ws.close(1011, 'Room storage unavailable'); }
            room.peers = [null, null]; room.plates = [null, null];
            rooms.delete(room.record.code);
            throw new Error('Room storage unavailable');
        }
    }
    async function appearance(visitor: string): Promise<PublicCharacterProfile> {
        try { return parseCharacterProfile(await options.loadProfile?.(visitor)) ?? { ...DEFAULT_CHARACTER_PROFILE }; }
        catch { return { ...DEFAULT_CHARACTER_PROFILE }; } // A profile outage never disables an existing party.
    }
    async function load(code: string): Promise<Room | null> {
        const current = rooms.get(code);
        if (current) { if (temporary(current) && elapsed(current)) { expire(current); return null; } return current; }
        let value: unknown;
        try { value = JSON.parse(await readFile(join(directory, `${code}.json`), 'utf8')); }
        catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
        const metadata = value && typeof value === 'object' && 'draft' in value ? value.draft : undefined;
        const frozen = validDraftMetadata(metadata) ? options.drafts?.get(metadata.hash) : undefined;
        if (metadata && (!frozen || JSON.stringify(frozen.metadata) !== JSON.stringify(metadata))) throw new Error('Draft snapshot or controller unavailable');
        const record = readRoomRecord(value, code, frozen?.level === 'workbench' ? frozen.definition : undefined);
        if (!record) throw new Error('Invalid room record');
        if (rooms.size >= 64) throw new Error('Room capacity');
        const profiles = await Promise.all(record.visitors.map(visitor => visitor ? appearance(visitor) : null)) as CharacterProfiles;
        const room: Room = { profiles, draft: frozen, draftHeld: [[], []], draftCubeContacts: {}, record, revision: record.revision, needsPersist: record !== value, cubes: freshCubes(record.level, frozen?.level === 'workbench' ? frozen.definition as LevelDefinition<SessionLevelId> : definition(record.level)), crumble: freshCrumble(), race: freshRace(), crossfeed: freshCrossfeed(), peers: [null, null], plates: [null, null], idleSince: Date.now(), failed: false };
        rooms.set(code, room);
        return room;
    }
    async function disconnect(peer: Peer) {
        if (!ownsSlot(peer)) return;
        const room = peer.room, index = peer.slot - 1;
        observer.event('player_disconnected', room, peer.slot);
        room.peers[index] = null; room.plates[index] = null; room.draftHeld[index] = []; room.idleSince = Date.now();
        for (const cube of Object.values(room.cubes)) if (cube.physicsAuthority === peer.slot) {
            const remaining = room.peers.findIndex(Boolean);
            assignCube(cube, remaining < 0 ? null : (remaining + 1) as Slot);
        }
        syncCoop(room);
        room.revision++;
        broadcast(room);
        observer.transition(room, () => rules(room).project(context(room)), undefined, undefined, 'player_disconnect');
        Object.assign(peer, { room: undefined, slot: undefined });
    }
    function draftRecord(code: string, visitor: string, frozen: FrozenDraftSession): RoomRecord {
        const record = frozen.level === 'workbench' ? newRecord(code, visitor, frozen.level, undefined, frozen.definition) : newRecord(code, visitor, frozen.level);
        record.draft = structuredClone(frozen.metadata); record.party = null; return record;
    }
    async function enter(peer: Peer, message: Extract<ClientMessage, { type: 'create' | 'create-party' | 'create-draft' | 'join' }>, timing: ActionTiming) {
        if (peer.room) { error(peer, 'ALREADY_JOINED'); return; }
        const custom = !!options.drafts?.temporary && (message.type === 'create-draft' || message.type === 'join' && !!rooms.get(normalizeCode(message.code) ?? '')?.draft);
        if (custom && !peer.custom) {
            if ([...peers].filter(p => p.custom).length >= 24 || peers.size >= 96) { error(peer, 'SERVER_BUSY', 'Custom rooms are busy. Please try again later.'); return; }
            peer.custom = true;
        }
        let room: Room | null = null;
        if (message.type === 'create' || message.type === 'create-party' || message.type === 'create-draft') {
            if (rooms.size >= (message.type === 'create-draft' && options.drafts?.temporary ? 56 : 64)) { error(peer, 'SERVER_BUSY'); return; }
            if (message.type === 'create-draft' && options.drafts?.canCreate && !options.drafts.canCreate(message.hash, peer.visitor)) {
                error(peer, 'DRAFT_UNAVAILABLE', 'This upload expired or belongs to another visitor. Start a new session from your level.'); return;
            }
            let code = '';
            for (let i = 0; i < 100; i++) {
                const candidate = (options.generateCode ?? generateCode)();
                if (!normalizeCode(candidate) || rooms.has(candidate) || expired.has(candidate)) continue;
                try { await stat(join(directory, `${candidate}.json`)); }
                catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; code = candidate; break; }
            }
            if (!code) { error(peer, 'SERVER_BUSY'); return; }
            const frozen = message.type === 'create-draft' ? options.drafts?.get(message.hash) : undefined;
            if (message.type === 'create-draft' && !frozen) { error(peer, 'DRAFT_UNAVAILABLE', 'Draft snapshot or controller version is unavailable'); return; }
            if (frozen?.coopError) { error(peer, 'DRAFT_NOT_COOP_COMPATIBLE', frozen.coopError); return; }
            const record = frozen ? draftRecord(code, peer.visitor, frozen) : message.type === 'create-party' ? newParty(code, peer.visitor) : newRecord(code, peer.visitor, message.type === 'create' ? message.level ?? 'pairing-bay' : 'pairing-bay');
            const level = record.level;
            room = { profiles: [null, null], record, draft: frozen, draftHeld: [[], []], draftCubeContacts: {}, revision: 0, needsPersist: true,
                cubes: freshCubes(level, frozen?.level === 'workbench' ? frozen.definition as LevelDefinition<SessionLevelId> : definition(level)), crumble: freshCrumble(), race: freshRace(), crossfeed: freshCrossfeed(),
                peers: [null, null], plates: [null, null], idleSince: Date.now(), failed: false };
            rooms.set(code, room);
            if (frozen) options.drafts?.retain?.(frozen.metadata.hash, peer.visitor, code);
        } else {
            const code = normalizeCode(message.code);
            if (!code) { error(peer, 'INVALID_CODE', 'ENTER A FOUR-CHARACTER ROOM CODE'); return; }
            room = await load(code);
            if (!room) { error(peer, expired.has(code) ? 'ROOM_EXPIRED' : 'ROOM_NOT_FOUND', expired.has(code) ? 'This temporary room expired. Ask the host to create a new room.' : 'Room not found. Check the code; temporary rooms are lost after a server restart.'); return; }
        }
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        const profile = await appearance(peer.visitor);
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        let index = room.record.visitors.indexOf(peer.visitor);
        const returning = message.type === 'join' && index >= 0;
        const newlyJoined = message.type !== 'join' || index < 0;
        if (index < 0) {
            if (room.record.visitors[1]) { error(peer, 'ROOM_FULL'); return; }
            index = 1;
            room.record.visitors[1] = peer.visitor; room.needsPersist = true;
        }
        room.profiles[index] = profile;
        const previous = room.peers[index];
        if (previous) {
            // Retire first: queued old-socket actions/close cannot affect the replacement.
            previous.room = undefined; previous.slot = undefined;
            error(previous, 'SESSION_REPLACED', 'THIS PLAYER OPENED IN ANOTHER TAB');
            previous.ws.close(4001, 'Player reconnected elsewhere');
        }
        peer.room = room; peer.slot = (index + 1) as Slot;
        room.peers[index] = peer; room.plates[index] = null; room.draftHeld[index] = []; room.revision++;
        // A replacement is a release too: a refreshed browser is never a ghost holder.
        for (const cube of Object.values(room.cubes)) if (previous && cube.physicsAuthority === peer.slot) {
            const partner = room.peers[1 - index];
            assignCube(cube, partner?.slot ?? peer.slot);
        } else if (cube.physicsAuthority === null) {
            assignCube(cube, room.peers[0] ? 1 : 2);
        }
        syncCoop(room);
        if (room.needsPersist) {
            room.record.revision = room.revision;
            // Preserve ActionTiming.durable's existing gameplay-action convention.
            // Membership persistence still contributes its measured latency below.
            const start = performance.now();
            try { await persist(room); } finally { timing.persistMs = performance.now() - start; }
            room.needsPersist = false;
        }
        send(peer, { type: 'snapshot', slot: peer.slot, room: view(room) });
        broadcast(room);
        timing.accepted = true;
        if (message.type !== 'join') observer.event('party_created', room, peer.slot);
        observer.event(returning ? 'player_reconnected' : 'player_connected', room, peer.slot);
        if (newlyJoined) observer.event('player_joined_party', room, peer.slot);
        if (message.type !== 'join' && room.record.party?.phase !== 'lobby') observer.event('chamber_started', room, peer.slot);
        // Restored rooms establish a baseline; snapshots never replay old completions/deliveries.
        observer.transition(room, () => rules(room).project(context(room)), undefined, undefined, 'player_connect');
    }
    async function action(peer: Peer, message: ClientMessage, timing: ActionTiming) {
        if (peer.ws.readyState !== WebSocket.OPEN) return;
        if (message.type === 'create' || message.type === 'create-party' || message.type === 'create-draft' || message.type === 'join') { await enter(peer, message, timing); return; }
        if (message.type === 'leave') { timing.accepted = ownsSlot(peer); await disconnect(peer); peer.ws.close(1000, 'Left room'); return; }
        if (!ownsSlot(peer)) { error(peer, 'NOT_JOINED'); return; }
        if (!('seq' in message) || message.type === 'avatar' || message.type === 'cube') return;
        const result = (accepted: boolean) => { timing.accepted = accepted; send(peer, { type: 'action-result', seq: message.seq, accepted, room: view(peer.room) }); };
        if (message.seq <= peer.actionSeq) { result(false); error(peer, 'STALE_ACTION'); return; }
        peer.actionSeq = message.seq;
        const room = peer.room, index = peer.slot - 1, before = durable(room);
        if (!currentInstance(room, message)) { result(false); return; }
        if (message.type === 'crumble-trigger' && !isDeclarativeLevel(room.record.level) && message.platform !== 'crumbleA' && message.platform !== 'crumbleB') { result(false); return; }
        if (message.type === 'restart-draft') {
            const frozen = options.drafts?.get(message.hash);
            if (!room.record.draft || peer.slot !== 1 || !frozen || frozen.coopError || temporary(room) && message.hash !== room.record.draft.hash || room.record.levelInstance >= Number.MAX_SAFE_INTEGER) { result(false); return; }
            const previous = room.record, fresh = draftRecord(previous.code, previous.visitors[0], frozen);
            fresh.visitors = [...previous.visitors]; fresh.levelInstance = previous.levelInstance + 1; fresh.createdAt = previous.createdAt;
            room.transitioning = true; room.record = fresh; room.draft = frozen; room.plates = [null, null]; room.draftHeld = [[], []]; room.draftCubeContacts = {};
            room.cubes = freshCubes(fresh.level, rules(room)); room.crumble = freshCrumble(); room.race = freshRace(); room.crossfeed = freshCrossfeed();
            for (const cube of Object.values(room.cubes)) assignCube(cube, room.peers[0] ? 1 : 2);
            for (const member of room.peers) if (member) member.stream = ++stream;
            fresh.revision = ++room.revision; timing.durable = true;
            const start = performance.now();
            try { await persist(room); } finally { timing.persistMs = performance.now() - start; }
            room.transitioning = false;
            result(true); broadcast(room);
            observer.event('chamber_started', room, peer.slot, { reason: 'custom_restart' });
            observer.baseline(room, () => rules(room).project(context(room))); return;
        }
        if (message.type === 'select-level') {
            if (room.record.draft) { result(false); return; }
            const selected = selectChamber(room.record, peer.visitor, message.level);
            if (!selected) { result(false); return; }
            room.transitioning = true;
            room.record = selected; room.plates = [null, null]; room.draftHeld = [[], []]; room.draftCubeContacts = {};
            room.cubes = freshCubes(selected.level); room.crumble = freshCrumble(); room.race = freshRace(); room.crossfeed = freshCrossfeed();
            const simulator = room.peers[0] ? 1 : 2;
            for (const cube of Object.values(room.cubes)) assignCube(cube, simulator);
            for (const member of room.peers) if (member) member.stream = ++stream;
            room.record.revision = ++room.revision;
            timing.durable = true;
            const start = performance.now();
            try { await persist(room); } finally { timing.persistMs = performance.now() - start; }
            room.transitioning = false;
            result(true); broadcast(room);
            observer.event('chamber_selected', room, peer.slot); observer.event('chamber_started', room, peer.slot);
            observer.baseline(room, () => rules(room).project(context(room))); return;
        }
        if (room.record.party && room.record.party.phase !== 'playing') { result(false); return; }
        if (room.record.level === 'race-condition' && advanceRace(room.race, Date.now())) { room.revision++; broadcast(room); observer.transition(room, () => rules(room).project(context(room)), undefined, undefined, 'server_timer'); }
        if ('epoch' in message) {
            const denied = () => { result(false); send(peer, { type: 'cube-denied', levelInstance: room.record.levelInstance, cubeId: message.cubeId, seq: message.seq }); };
            const cube = room.cubes[message.cubeId], def = rules(room);
            if (!cube || !def.cubeIds.includes(message.cubeId)) { denied(); return; }
            if (message.type === 'draft-cube-occupancy') {
                if (!isDeclarativeLevel(room.record.level) || message.epoch !== cube.epoch || cube.physicsAuthority !== peer.slot
                    || message.devices.length > 0 && (cube.holder !== null || cube.pulling) || message.devices.some(id => !def.acceptsPlacement?.(room.record, id))) { denied(); return; }
                if (JSON.stringify(room.draftCubeContacts[message.cubeId]) === JSON.stringify(message.devices)) { result(true); return; }
                room.draftCubeContacts[message.cubeId] = [...message.devices]; room.record.cubePlacements[message.cubeId] = message.devices[0] ?? 'spawn';
            } else if (message.type === 'cube-contact') {
                if (room.record.level !== 'race-condition' || message.cubeId !== 'cubeA'
                    || message.epoch !== cube.epoch || cube.physicsAuthority !== peer.slot || cube.holder || cube.pulling
                    || room.race.buffer !== 'idle' || room.race.contactEpoch === cube.epoch || room.record.cubePlacements.cubeA !== 'spawn') { denied(); return; }
                room.race.contactEpoch = cube.epoch; room.race.buffer = 'window'; room.race.deadline = Date.now() + RACE_TIMING.buffer;
            } else if (message.type === 'cube-occupancy') {
                const placement = message.placement;
                if (message.epoch !== cube.epoch || cube.physicsAuthority !== peer.slot
                    || placement !== 'spawn' && (!def.cubeEnabled(room.record, message.cubeId) || cube.holder !== null || cube.pulling
                        || !def.acceptsPlacement?.(room.record, placement)
                        || !['entry', 'routePower'].includes(placement) && room.record.level !== 'race-condition' && !isDeclarativeLevel(room.record.level) && Object.entries(room.record.cubePlacements).some(([id, p]) => id !== message.cubeId && p === placement))) { denied(); return; }
                if (room.record.cubePlacements[message.cubeId] === placement) { result(true); return; }
                room.record.cubePlacements[message.cubeId] = placement;
            } else {
                const anotherControlled = Object.entries(room.cubes).some(([id, c]) => id !== message.cubeId
                    && (c.holder === peer.slot || c.pulling && c.physicsAuthority === peer.slot));
                if ((message.type === 'cube-pickup' || message.type === 'cube-pull-start') && anotherControlled
                    || message.type !== 'cube-reset' && !def.cubeEnabled(room.record, message.cubeId)
                    || !interactCube(cube, peer.slot, message)) { denied(); return; }
                if (message.type !== 'cube-pull-stop') { room.record.cubePlacements[message.cubeId] = 'spawn'; delete room.draftCubeContacts[message.cubeId]; }
                if (message.type === 'cube-reset' && message.cubeId === 'cubeA' && room.record.level === 'race-condition') {
                    room.race.buffer = 'idle'; room.race.deadline = 0;
                }
            }
            await commitAction(room, before, timing);
            result(true); broadcast(room);
            observer.transition(room, () => rules(room).project(context(room)), peer.slot, message);
            return;
        }
        const def = rules(room);
        if (message.type === 'checkpoint' && room.draft && !room.draft.breakpoints?.includes(message.breakpoint)) { result(false); return; }
        if (message.type === 'draft-occupancy') {
            if (!isDeclarativeLevel(room.record.level) || message.devices.some(id => !def.acceptsPlate(id, room.record))) { result(false); return; }
            if (JSON.stringify(room.draftHeld[index]) === JSON.stringify(message.devices)) { result(true); return; }
            room.draftHeld[index] = [...message.devices];
        } else if (message.type === 'occupancy') {
            if (!def.acceptsPlate(message.plate, room.record)) { result(false); error(peer, 'INVALID_ACTION'); return; }
            if (room.plates[index] === message.plate) { result(true); return; }
            room.plates[index] = message.plate;
        } else if (message.type === 'local-reset') {
            // Death/reset affects this body only. A pending pickup is serialized before this release.
            room.plates[index] = null; room.draftHeld[index] = [];
            for (const cube of Object.values(room.cubes)) if (cube.physicsAuthority === peer.slot && (cube.holder || cube.pulling)) assignCube(cube, peer.slot);
        } else if (message.type === 'exit') {
            if (!room.record.exitUnlocked) { result(false); error(peer, 'INVALID_ACTION'); return; }
            if (room.record.reachedExit[index]) { result(true); return; }
            room.record.reachedExit[index] = true;
        } else if (message.type === 'switch' || message.type === 'control' || message.type === 'crumble-trigger' || message.type === 'checkpoint') {
            if (!def.action(context(room), message)) { result(false); return; }
            if (message.type !== 'crumble-trigger' && durable(room) === before) { result(true); return; }
        } else return;
        await commitAction(room, before, timing);
        result(true); broadcast(room);
        observer.transition(room, () => rules(room).project(context(room)), peer.slot, message);
    }
    function context(room: Room) {
        return { draftCubeContacts: room.draftCubeContacts, draftHeld: room.draftHeld.map((p, i) => room.peers[i] ? p : []) as [DraftId[], DraftId[]], record: room.record, held: room.plates.map((p, i) => room.peers[i] ? p : null) as [Plate, Plate], crumble: room.crumble, race: room.race, crossfeed: room.crossfeed, now: Date.now() };
    }
    // Campaign CROSSFEED is native-backed; a custom draft with the crossfeed builtin keeps the mock.
    // Both agree on raw route outputs, so grace falling edges are identical either way.
    const syncCoop = (room: Room) => {
        const ctx = context(room);
        syncRace(ctx);
        syncCrossfeed(ctx, room.record.level === 'crossfeed-vault' && !room.record.draft ? nativeCrossfeedProjection : undefined);
    };
    async function commitAction(room: Room, before: string, timing: ActionTiming) {
        syncCoop(room);
        if (rules(room).unlock(context(room))) room.record.exitUnlocked = true;
        room.record.completed = room.record.reachedExit.every(Boolean);
        completeParty(room.record);
        room.revision++;
        if (durable(room) !== before) {
            timing.durable = true;
            room.record.revision = room.revision;
            const start = performance.now();
            try { await persist(room); } finally { timing.persistMs = performance.now() - start; }
        }
    }
    function currentInstance(room: Room, message: ClientMessage): boolean {
        return !room.transitioning && (message.levelInstance === room.record.levelInstance
            || !room.record.party && !room.record.draft && message.levelInstance === undefined);
    }
    function acceptsStream(peer: Peer, message: ClientMessage): peer is Peer & { room: Room; slot: Slot } {
        return ownsSlot(peer) && currentInstance(peer.room, message)
            && (!peer.room.record.party || peer.room.record.party.phase === 'playing');
    }
    server.on('upgrade', (req, socket, head) => {
        const visitor = visitorCookie(req);
        const reject = (status: number) => { socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\n\r\n`); };
        if (options.acceptsUpgrade && !options.acceptsUpgrade(req)) { reject(403); return; }
        if (options.ignoredUpgradePath && req.url?.split('?')[0] === options.ignoredUpgradePath) return;
        const custom = req.url === '/ws?custom=1' && !!options.drafts?.temporary;
        if (req.url !== '/ws' && !custom) { reject(404); return; }
        if (!sameOrigin(req)) { reject(403); return; }
        if (!visitor) { reject(401); return; }
        if (peers.size >= 128) { reject(503); return; }
        if (custom && ([...peers].filter(p => p.custom).length >= 24 || peers.size >= 96)) { reject(503); return; }
        wss.handleUpgrade(req, socket, head, ws => {
            const peer: Peer = { ws, visitor, custom, actionSeq: -1, avatarSeq: -1, stream: ++stream, alive: true, joinedAt: Date.now(), tokens: 120, refilled: Date.now(), pending: 0 };
            peers.add(peer);
            ws.on('error', () => {}); // Protocol violations close this socket, never the process.
            ws.on('pong', () => { peer.alive = true; });
            ws.on('close', () => { peers.delete(peer); serial(() => disconnect(peer)); });
            ws.on('message', (bytes, binary) => {
                // Only JSON rooms need larger sensor lists; other campaign/fixture messages retain the 2 KB budget.
                const authored = isAuthoredCampaignLevel(peer.room?.record.level);
                const limit = authored || options.drafts && (!options.drafts.temporary || peer.custom || peer.room?.draft) ? 8192 : 2048;
                const length = Array.isArray(bytes) ? bytes.reduce((n, b) => n + b.byteLength, 0) : bytes.byteLength;
                if (length > limit) { ws.close(1009, 'Message too large'); return; }
                const now = Date.now();
                // Avatar + two independent cube streams = 60 Hz; retain bounded input headroom.
                const cubeCount = peer.room && (authored || peer.room.record.draft) ? Math.min(8, Object.keys(peer.room.cubes).length) : 2;
                const rate = Math.max(90, 30 + cubeCount * 20);
                peer.tokens = Math.min(Math.max(120, rate * 1.5), peer.tokens + (now - peer.refilled) * rate / 1000); peer.refilled = now;
                if (--peer.tokens < 0 || peer.pending >= (peer.custom ? 8 : authored || peer.room?.record.draft ? 20 : 8) || queued >= (peer.custom ? 64 : 256)) { error(peer, 'RATE_LIMITED'); ws.close(1008, 'Too many messages'); return; }
                const message = binary ? null : parseClientMessage(bytes.toString(), authored || !!options.drafts);
                if (!message) { error(peer, 'INVALID_MESSAGE'); ws.close(1008, 'Invalid message'); return; }
                if (message.type === 'ping') { send(peer, { type: 'pong' }); return; }
                if (message.type === 'cube') {
                    if (!acceptsStream(peer, message)) return;
                    const cube = peer.room.cubes[message.cubeId];
                    if (!cube || !acceptCubeSnapshot(cube, peer.slot, message)) return;
                    for (const other of peer.room.peers) if (other && other !== peer)
                        send(other, { ...message, levelInstance: peer.room.record.levelInstance, transform: cube.transform! });
                    return;
                }
                if (message.type === 'avatar') {
                    if (!acceptsStream(peer, message) || message.seq <= peer.avatarSeq) return;
                    peer.avatarSeq = message.seq;
                    for (const other of peer.room.peers) if (other && other !== peer)
                        send(other, { type: 'avatar', levelInstance: peer.room.record.levelInstance, slot: peer.slot, stream: peer.stream, seq: message.seq, avatar: message.avatar, ...(message.discontinuity ? { discontinuity: message.discontinuity } : {}) });
                    return;
                }
                peer.pending++;
                const receivedAt = performance.now();
                const readyAt = receivedAt + ('seq' in message ? Math.max(0, Math.min(1000, options.semanticDelayMs ?? 0)) : 0);
                serial(async () => {
                    const wait = readyAt - performance.now();
                    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
                    const timing: ActionTiming = { action: message.type, queueMs: performance.now() - receivedAt, persistMs: 0, totalMs: 0, durable: false };
                    try { await action(peer, message, timing); }
                    catch { observe(t => t.emit('multiplayer_operation_failed', peer.room ? observer.context(peer.room, peer.slot) : { visitor: peer.visitor }, { operation: message.type }, 'error')); error(peer, 'ROOM_UNAVAILABLE', 'ROOM UNAVAILABLE — PLEASE RETRY'); }
                    finally {
                        peer.pending--; timing.totalMs = performance.now() - receivedAt;
                        observe(t => t.observeAction({ ...timing, durable: timing.durable || timing.persistMs > 0, accepted: timing.accepted === true }));
                        options.onActionTiming?.(timing);
                    }
                });
            });
        });
    });
    const heartbeat = setInterval(() => {
        for (const p of peers) {
            if (!p.alive || !p.room && Date.now() - p.joinedAt > 15000) { p.ws.terminate(); continue; }
            p.alive = false; p.ws.ping();
        }
    }, 5000);
    const sweep = setInterval(() => {
        for (const [code, room] of rooms) {
            if (temporary(room)) { if (elapsed(room)) expire(room); }
            else if (room.peers.every(p => !p) && Date.now() - room.idleSince > (options.idleMs ?? 300000)) { observer.remove(room); rooms.delete(code); }
        }
        options.drafts?.sweep?.();
    }, options.sweepMs ?? 30000);
    // A single bounded clock wakes only due rooms; phase changes share the semantic queue.
    let timerQueued = false;
    const machineryClock = setInterval(() => {
        if (timerQueued || ![...rooms.values()].some(r => crumbleDue(r.crumble, Date.now()) || r.record.level === 'race-condition' && raceDue(r.race, Date.now()) || r.record.level === 'crossfeed-vault' && crossfeedDue(r.crossfeed, Date.now()))) return;
        timerQueued = true;
        serial(async () => {
            try {
                for (const room of rooms.values()) if (!room.failed) {
                    const crumbleChanged = advanceCrumble(room.crumble, Date.now());
                    const raceChanged = room.record.level === 'race-condition' && advanceRace(room.race, Date.now());
                    const crossfeedChanged = room.record.level === 'crossfeed-vault' && advanceCrossfeed(room.crossfeed, Date.now());
                    if (crumbleChanged || raceChanged || crossfeedChanged) { room.revision++; broadcast(room); observer.transition(room, () => rules(room).project(context(room)), undefined, undefined, 'server_timer'); }
                }
            } finally { timerQueued = false; }
        });
    }, 20);
    heartbeat.unref(); sweep.unref(); machineryClock.unref();
    const shutdown = () => { clearInterval(heartbeat); clearInterval(sweep); clearInterval(machineryClock); for (const p of peers) p.ws.terminate(); wss.close(); };
    server.on('close', shutdown);
    server.on('shutdown', shutdown);
    return { rooms, shutdown, drained: () => queue,
        /** Called only after a trusted profile save. No WebSocket message may set appearance. */
        profileUpdated(visitor: string, profile: PublicCharacterProfile): Promise<void> {
            const sanitized = parseCharacterProfile(profile);
            if (!sanitized) return Promise.resolve();
            return serial(async () => {
                // Re-read when available so rapid/tab-concurrent saves cannot publish stale appearance.
                let current = sanitized;
                if (options.loadProfile) try { current = parseCharacterProfile(await options.loadProfile(visitor)) ?? sanitized; }
                catch { /* A trusted successful save is still usable if the follow-up read fails. */ }
                for (const room of rooms.values()) {
                    const index = room.record.visitors.indexOf(visitor);
                    if (room.failed || index < 0 || JSON.stringify(room.profiles[index]) === JSON.stringify(current)) continue;
                    room.profiles[index] = { ...current };
                    room.revision++; broadcast(room); observer.session(room);
                }
            });
        },
        snapshotFor(code: string, visitor: string) {
            const room = rooms.get(code);
            if (!room || !temporary(room)) return undefined;
            if (elapsed(room)) { expire(room); return undefined; }
            return room.record.visitors.includes(visitor) ? room.record.draft?.hash : undefined;
        },
    };
}
