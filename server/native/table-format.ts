/**
 * Compact runtime format for a native-verified truth table.
 *
 * Each chamber table stores, for every exhaustive case id, the native output
 * vector as a packed bitfield (one bit per Boolean output, LSB = first output
 * in contract order). The values come from the retained native results, never
 * from a recomputed TypeScript expression.
 *
 * The packed table is small enough to ship inside the server bundle:
 *   CROSSFEED 16384 cases x 14 outputs -> 2 bytes/case -> 32 KB base64.
 * It is intentionally server-only; it is never imported into the browser graph.
 */
import { createHash } from 'node:crypto';
import type { ChamberContract, NativeChamberId } from './contracts.ts';

export interface NativeTable {
    schema: 'coop-native-table/v1';
    chamber_id: NativeChamberId;
    /** SHA-256 of the acquired native-results.json.gz this table was generated from. */
    native_results_sha256: string;
    /** SHA-256 of the acquired contract.json. */
    contract_sha256: string;
    /** Verified obfuscated PE identity, carried for provenance. */
    bcf_pe_sha256: string;
    clean_pe_sha256: string;
    specimen_id: string;
    input_names: readonly string[];
    /** For declarative chambers, the authored draft device port each input reads
     * (e.g. "crossing.occupied"); null for temporal inputs that map through server state. */
    input_game_ports: readonly (string | null)[];
    output_names: readonly string[];
    case_count: number;
    bits_per_case: number;
    /** base64 of the packed little-endian bitfield; case c occupies bits
     * [c * bits_per_case, (c+1) * bits_per_case). */
    packed: string;
    /** SHA-256 over the decoded case/output matrix, pinning the table bytes. */
    table_sha256: string;
}

const bytesPerCase = (bits: number) => Math.ceil(bits / 8);

/** Pack an array of per-case output vectors (each 0/1 numbers in output order). */
export function packTable(rows: readonly (readonly number[])[], bits: number): Uint8Array {
    const stride = bytesPerCase(bits);
    const out = new Uint8Array(rows.length * stride);
    for (let c = 0; c < rows.length; c++) {
        const row = rows[c];
        const base = c * stride;
        for (let b = 0; b < bits; b++) {
            if (row[b] & 1) out[base + (b >> 3)] |= 1 << (b & 7);
        }
    }
    return out;
}

/** Read one case's output vector from a packed table. */
export function readCase(packed: Uint8Array, caseId: number, bits: number): number[] {
    const stride = bytesPerCase(bits);
    const base = caseId * stride;
    const row = new Array<number>(bits);
    for (let b = 0; b < bits; b++) row[b] = (packed[base + (b >> 3)] >> (b & 7)) & 1;
    return row;
}

/** Stable hash over the full decoded matrix, independent of packing details. */
export function matrixHash(rows: readonly (readonly number[])[]): string {
    const h = createHash('sha256');
    for (const row of rows) h.update(row.join(''));
    h.update('\n');
    return h.digest('hex');
}

export function encodeTable(table: Omit<NativeTable, 'packed' | 'table_sha256'>,
    rows: readonly (readonly number[])[]): NativeTable {
    const packed = packTable(rows, table.bits_per_case);
    return { ...table, packed: Buffer.from(packed).toString('base64'), table_sha256: matrixHash(rows) };
}

export interface LoadedTable {
    contract: ChamberContract;
    meta: NativeTable;
    packed: Uint8Array;
}

/** Decode and self-verify a table against its own matrix hash and contract shape. */
export function loadTable(meta: NativeTable, contract: ChamberContract): LoadedTable {
    if (meta.chamber_id !== contract.id) throw new Error(`Native table identity mismatch: ${meta.chamber_id} vs ${contract.id}`);
    if (meta.case_count !== contract.caseCount) throw new Error(`${contract.id}: case count ${meta.case_count} != ${contract.caseCount}`);
    if (meta.bits_per_case !== contract.outputs.length) throw new Error(`${contract.id}: bits_per_case ${meta.bits_per_case} != ${contract.outputs.length}`);
    if (meta.output_names.length !== contract.outputs.length
        || meta.output_names.some((n, i) => n !== contract.outputs[i])) throw new Error(`${contract.id}: output ordering drift`);
    if (meta.input_names.length !== contract.inputs.length
        || meta.input_names.some((n, i) => n !== contract.inputs[i])) throw new Error(`${contract.id}: input ordering drift`);
    if (!Array.isArray(meta.input_game_ports) || meta.input_game_ports.length !== contract.inputs.length) throw new Error(`${contract.id}: input_game_ports arity`);
    const packed = new Uint8Array(Buffer.from(meta.packed, 'base64'));
    const stride = bytesPerCase(meta.bits_per_case);
    if (packed.length !== meta.case_count * stride) throw new Error(`${contract.id}: packed length mismatch`);
    const rows: number[][] = [];
    for (let c = 0; c < meta.case_count; c++) rows.push(readCase(packed, c, meta.bits_per_case));
    if (matrixHash(rows) !== meta.table_sha256) throw new Error(`${contract.id}: table hash mismatch; regenerate native tables`);
    return { contract, meta, packed };
}
