import { PLAYER } from '../engine/constants.ts';
import { CUBE_SIZE } from '../slice/tuning.ts';
import type { Vec2, Box } from '../engine/geometry.ts';

/** v1 world units are game pixels: +x right, +y down. Array order is preserved within the existing renderer layers. */
export const DRAFT_VERSION = 1;
export const DRAFT_LIMITS = { bytes: 1_000_000, objects: 384, cubes: 8, devices: 48, relayPairs: 8, outputs: 64, bindings: 192, wires: 192, wirePoints: 64, expressionNodes: 256, expressionDepth: 16, dimension: 9000, coordinate: 10000 } as const;
export const DRAFT_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export type DraftExpression = { op: 'const'; value: boolean } | { op: 'ref'; id: string } | { op: 'not'; arg: DraftExpression } | { op: 'and' | 'or'; args: DraftExpression[] };
export type BuiltinControllerId = 'race-condition' | 'crossfeed-vault' | 'relay-lab' | 'lift-lab' | 'crumble-lab' | 'boost-lab' | 'firewall-lab' | 'pairing-bay';
export type DraftController = { kind: 'declarative'; outputs: Record<string, DraftExpression> } | { kind: 'builtin'; id: BuiltinControllerId; version: 1 };
interface ObjectBase extends Vec2 { id: string; label?: string }
export type CodeActivation = 'always-powered' | 'signal' | 'always-inactive';
/** Version-1 omission retains the old controlled semantics, even when a binding is missing. */
export const codeActivation = (platform: DraftPlatform): CodeActivation => platform.activation ?? 'signal';
export interface DraftPlatform extends ObjectBase { type: 'platform'; w: number; h: number; kind: 'static' | 'code' | 'unstable'; activation?: CodeActivation; hookable?: boolean; anchor?: boolean; blocksCubeInteraction?: boolean; hookCrumbleDelay?: number; crumbleDelay?: number; respawnDelay?: number; listingOffsetX?: number; assemblyBinding?: string }
export interface DraftSpawn extends ObjectBase { type: 'spawn'; slot: 1 | 2 }
/** Player centre; pedestal has a separate floor-contact breakpoint object. */
export interface DraftCheckpoint extends ObjectBase { type: 'checkpoint'; slot: 1 | 2; checkpoint: 'relay' | 'upper' }
/** Automatic floor-level checkpoint; activationControl is a retained legacy association, never a proximity-triggered puzzle input. */
export interface DraftBreakpoint extends ObjectBase { type: 'breakpoint'; checkpoint: 'relay' | 'upper'; activationControl?: string }
/** Cube centre, including imported named cube homes. */
export interface DraftCube extends ObjectBase { type: 'cube'; mark: string }
/** Device x is centre; y is its floor contact. Occupancy ports are `id.occupied`, controls `id.value`. */
export interface DraftDevice extends ObjectBase { type: 'device'; kind: 'plate' | 'socket' | 'scanner' | 'toggle' | 'terminal'; initial?: boolean; checkpoint?: 'relay' | 'upper'; legacy?: 'plate' | 'plateB' | 'plateC' | 'cargoPlate' | 'lever' | 'upperLever' | 'cubePad' }
export interface DraftLift extends ObjectBase { type: 'lift'; w: number; h: number }
export interface DraftRelay extends ObjectBase { type: 'relay'; w: number; h: number; pair: string; exitSide: -1 | 1; nativeId?: string }
export interface DraftFirewall extends ObjectBase { type: 'firewall'; orientation: 'horizontal' | 'vertical'; length: number; thickness: number }
export interface DraftHazard extends ObjectBase { type: 'hazard'; w: number; h: number }
export interface DraftExit extends ObjectBase { type: 'exit'; w: number; h: number; latch: boolean; arrivals: 1 | 2 }
/** Optional imported cube recovery centre; no executable semantics. */
export interface DraftMarker extends ObjectBase { type: 'marker'; role: 'cargoRecovery' }
export type DraftObject = DraftPlatform | DraftSpawn | DraftCheckpoint | DraftBreakpoint | DraftCube | DraftDevice | DraftLift | DraftRelay | DraftFirewall | DraftHazard | DraftExit | DraftMarker;
export type BindingProperty = 'active' | 'open' | 'power' | 'unlock';
export interface DraftBinding { id: string; output: string; target: string; property: BindingProperty; invert?: boolean }
export interface DraftWire { id: string; binding?: string; output?: string; points: Vec2[]; invertedLabel?: boolean; legacyInput?: string; sourcePowered?: boolean }
export interface DraftLabel extends Vec2 { id: string; text: string }
export interface DraftReveal { id: string; source: string; platformIds?: string[]; bounds?: Box; padding?: number; duration?: number }
export interface DraftDocument {
    version: 1; id: string; title: string; instruction: string;
    geometry: { width: number; height: number; objects: DraftObject[] };
    controller: DraftController;
    bindings: DraftBinding[];
    presentation: { wires: DraftWire[]; labels: DraftLabel[]; cameraReveals: DraftReveal[]; display: Vec2 };
    /** Explicit device port values, NOT forced outputs. */
    previewStates: Record<string, Record<string, boolean>>;
    editor: { hidden: string[]; locked: string[]; grid: number; snap: boolean };
    imported?: { factory: BuiltinControllerId; warnings: string[] };
}
export interface DraftDiagnostic { code: string; severity: 'error' | 'warning' | 'info'; objectId?: string; message: string }
export interface DraftValidation { document: DraftDocument | null; diagnostics: DraftDiagnostic[]; structural: boolean; playable: boolean }
export const objectPort = (object: DraftDevice) => `${object.id}.${object.kind === 'toggle' || object.kind === 'terminal' ? 'value' : 'occupied'}`;
export function objectBounds(object: DraftObject): Box {
    if ('w' in object) return { x: object.x, y: object.y, w: object.w, h: object.h };
    if (object.type === 'firewall') return { x: object.x, y: object.y, w: object.orientation === 'horizontal' ? object.length : object.thickness, h: object.orientation === 'vertical' ? object.length : object.thickness };
    if (object.type === 'cube') return { x: object.x - CUBE_SIZE / 2, y: object.y - CUBE_SIZE / 2, w: CUBE_SIZE, h: CUBE_SIZE };
    if (object.type === 'spawn' || object.type === 'checkpoint') return { x: object.x - PLAYER.width / 2, y: object.y - PLAYER.height / 2, w: PLAYER.width, h: PLAYER.height };
    return { x: object.x - 45, y: object.y - 55, w: 90, h: 55 };
}
export function cloneDraft(document: DraftDocument): DraftDocument { return structuredClone(document); }
/** Sort object keys only. Preserve authored object/point/operand array order. */
export function serializeDraft(document: DraftDocument): string {
    const normalize = (value: unknown): unknown => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object'
        ? Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => [k, normalize(v)])) : value;
    return JSON.stringify(normalize(document), null, 2) + '\n';
}
export async function draftHash(document: DraftDocument): Promise<string> {
    const bytes = new TextEncoder().encode(serializeDraft(document));
    const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export function newDraft(id = 'untitled'): DraftDocument {
    return { version: 1, id, title: 'UNTITLED DRAFT', instruction: 'HOLD THE PLATE. ROUTE THE POWER.', geometry: { width: 1500, height: 850, objects: [
        { type: 'spawn', id: 'player1', slot: 1, x: 120, y: 663 }, { type: 'spawn', id: 'player2', slot: 2, x: 200, y: 663 },
        { type: 'platform', id: 'floor', kind: 'static', x: 0, y: 680, w: 1500, h: 170 },
        { type: 'cube', id: 'payload', x: 310, y: 658, mark: 'A' }, { type: 'device', id: 'powerPlate', kind: 'plate', x: 440, y: 680, label: 'POWER' },
        { type: 'device', id: 'routeLever', kind: 'toggle', x: 610, y: 680, label: 'ROUTE' },
        { type: 'platform', id: 'route', kind: 'code', x: 820, y: 440, w: 240, h: 30, label: 'CONTROLLED ROUTE', hookable: true },
        { type: 'exit', id: 'exit', x: 1360, y: 540, w: 80, h: 140, latch: true, arrivals: 2 },
    ] }, controller: { kind: 'declarative', outputs: { routePower: { op: 'and', args: [{ op: 'ref', id: 'powerPlate.occupied' }, { op: 'not', arg: { op: 'ref', id: 'routeLever.value' } }] }, exitReady: { op: 'ref', id: 'routeLever.value' } } }, bindings: [
        { id: 'routeBinding', output: 'routePower', target: 'route', property: 'active' }, { id: 'exitBinding', output: 'exitReady', target: 'exit', property: 'unlock' },
    ], presentation: { display: { x: 900, y: 300 }, labels: [], cameraReveals: [], wires: [
        { id: 'routeWire', binding: 'routeBinding', points: [{ x: 440, y: 668 }, { x: 440, y: 380 }, { x: 940, y: 380 }, { x: 940, y: 440 }] },
    ] }, previewStates: { idle: {}, 'left-powered': { 'powerPlate.occupied': true, 'routeLever.value': false } }, editor: { hidden: [], locked: [], grid: 20, snap: true } };
}
