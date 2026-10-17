/**
 * Read-only helpers for the acquired native co-op controller package.
 *
 * The package lives under `experiments/coop-controllers/`. It is experiment-only
 * data: the generator reads it to build compact runtime artifacts, but nothing
 * here is imported by the server or browser at runtime. The Windows PEs are
 * never executed; only their retained JSON/gzip evidence is read.
 */
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NativeChamberId } from '../../server/native/contracts.ts';

export const PACKAGE_ROOT = join(process.cwd(), 'experiments', 'coop-controllers');
export const REFERENCE_COMMIT = '1315c3616ce5ac939baf913f9b09b4ebad34132a';

export const sha256 = (bytes: Buffer | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export function readBytes(...parts: string[]): Buffer {
    return readFileSync(join(PACKAGE_ROOT, ...parts));
}

export function readJson<T = unknown>(...parts: string[]): T {
    return JSON.parse(readBytes(...parts).toString('utf8')) as T;
}

/** Read a gzip evidence file and return both its parsed JSON and the file hash. */
export function readGzipJson<T = unknown>(...parts: string[]): { value: T; fileSha256: string } {
    const bytes = readBytes(...parts);
    return { value: JSON.parse(gunzipSync(bytes).toString('utf8')) as T, fileSha256: sha256(bytes) };
}

export interface NativeContract {
    schema: string;
    chamber_id: NativeChamberId;
    reference_commit: string;
    reference_kind: string;
    inputs: { name: string; offset: number; domain: number[]; game_port?: string; bit?: number; enum?: Record<string, string> }[];
    outputs: { name: string; offset: number; kind: string; game_signal?: string; expression?: unknown }[];
    bindings: { id: string; output: string; target: string; property: string; invert?: boolean }[];
    coverage: { row_count?: number; exhaustive_row_count?: number; encoding: string };
    abi: Record<string, unknown>;
    exit_semantics?: Record<string, unknown>;
    server_owned?: string[];
}

export interface NativeResults {
    schema: string;
    chamber_id: NativeChamberId;
    contract_sha256: string;
    input_names: string[];
    output_names: string[];
    rows: { id: number | string; inputs: number[]; expected: number[]; clean: number[]; bcf: number[]; valid: boolean }[];
    processes: { clean: { binary_sha256: string }; bcf: { binary_sha256: string } };
    case_count: number;
    all_valid: boolean;
    failed_case_ids: (number | string)[];
}

export function contractPath(chamber: NativeChamberId) { return join('experiments', 'coop-controllers', chamber, 'contract.json'); }

/** Load and sanity-check a chamber's contract and exhaustive native results. */
export function loadChamberEvidence(chamber: NativeChamberId) {
    const contractBytes = readBytes(chamber, 'contract.json');
    const contract = JSON.parse(contractBytes.toString('utf8')) as NativeContract;
    const contractSha = sha256(contractBytes);
    if (contract.chamber_id !== chamber) throw new Error(`${chamber}: contract identity mismatch`);
    if (contract.reference_commit !== REFERENCE_COMMIT) throw new Error(`${chamber}: unexpected reference commit`);

    const results = readGzipJson<NativeResults>(chamber, 'evidence', 'native-results.json.gz');
    if (results.value.chamber_id !== chamber) throw new Error(`${chamber}: native-results identity mismatch`);
    if (results.value.contract_sha256 !== contractSha) throw new Error(`${chamber}: native-results contract hash mismatch`);
    if (!results.value.all_valid || results.value.failed_case_ids.length) throw new Error(`${chamber}: native results report failures`);

    return { contract, contractSha, results: results.value, nativeResultsSha256: results.fileSha256 };
}
