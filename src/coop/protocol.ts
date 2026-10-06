/** Wire contract: shared logic is coordinate-free; avatars are disposable presentation. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_PATTERN = /^[A-HJKMNP-Z2-9]{4}$/;
export type Slot = 1 | 2;
export type Plate = 'plateA' | 'finalLeft' | 'finalRight' | null;
export interface Avatar {
    x: number; y: number; vx: number; vy: number;
    facing: -1 | 1; grounded: boolean;
    rope: { x: number; y: number } | null;
}
export interface SharedRoom {
    code: string;
    level: 'pairing-bay';
    revision: number;
    assigned: [boolean, boolean];
    connected: [boolean, boolean];
    inputs: { player1OnPlateA: boolean; switchB: boolean; finalPlateLeftOccupied: boolean; finalPlateRightOccupied: boolean };
    outputs: { grappleAnchor: boolean; returnBridge: boolean; exitDoor: boolean };
    checkpoint: 'entry' | 'reunion';
    completed: boolean;
}
export type ClientMessage =
    | { type: 'create' }
    | { type: 'join'; code: string }
    | { type: 'avatar'; seq: number; avatar: Avatar }
    | { type: 'occupancy'; seq: number; plate: Plate }
    | { type: 'switch'; seq: number }
    | { type: 'leave' }
    | { type: 'ping' };
export type ServerMessage =
    | { type: 'snapshot'; slot: Slot; room: SharedRoom }
    | { type: 'room'; room: SharedRoom }
    | { type: 'avatar'; slot: Slot; stream: number; seq: number; avatar: Avatar }
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
export function validAvatar(v: unknown): v is Avatar {
    return object(v) && keys(v, ['x', 'y', 'vx', 'vy', 'facing', 'grounded', 'rope'])
        && number(v.x, 10000) && number(v.y, 10000) && number(v.vx, 2000) && number(v.vy, 2000)
        && (v.facing === 1 || v.facing === -1) && typeof v.grounded === 'boolean'
        && (v.rope === null || object(v.rope) && keys(v.rope, ['x', 'y']) && number(v.rope.x, 10000) && number(v.rope.y, 10000));
}
/** Strict keys also reject attempts to inject slot, visitor, outputs or revisions. */
export function parseClientMessage(raw: string): ClientMessage | null {
    let v: unknown;
    try { v = JSON.parse(raw); } catch { return null; }
    if (!object(v)) return null;
    if (['create', 'leave', 'ping'].includes(v.type as string) && keys(v, ['type'])) return v as ClientMessage;
    if (v.type === 'join' && keys(v, ['type', 'code']) && typeof v.code === 'string' && v.code.length <= 32) return v as ClientMessage;
    if (v.type === 'avatar' && keys(v, ['type', 'seq', 'avatar']) && sequence(v.seq) && validAvatar(v.avatar)) return v as ClientMessage;
    if (v.type === 'occupancy' && keys(v, ['type', 'seq', 'plate']) && sequence(v.seq)
        && [null, 'plateA', 'finalLeft', 'finalRight'].includes(v.plate as Plate)) return v as ClientMessage;
    if (v.type === 'switch' && keys(v, ['type', 'seq']) && sequence(v.seq)) return v as ClientMessage;
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
