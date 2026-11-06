/**
 * Read-only helpers for the acquired native co-op controller package.
 *
 * Historical packages live under `experiments/coop-controllers/`; BYPASS and
 * HANDSHAKE v2 have independent `coop-controller-studies/` acquisitions. This is experiment-only
 * data: the generator reads it to build compact runtime artifacts, but nothing
 * here is imported by the server or browser at runtime. The Windows PEs are
 * never executed; only their retained JSON/gzip evidence is read.
 */
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { chamberAcquisitionId, type NativeAcquisitionId, type NativeChamberId } from '../../server/native/contracts.ts';
export { chamberAcquisitionId, chamberSpecimenId } from '../../server/native/contracts.ts';
import { evaluateDraft } from '../../src/workbench/evaluate.ts';
import type { DraftDocument } from '../../src/workbench/model.ts';

export const PACKAGE_ROOT = join(process.cwd(), 'experiments', 'coop-controllers');
export const REFERENCE_COMMIT = '1315c3616ce5ac939baf913f9b09b4ebad34132a';

export const BYPASS_REFERENCE_COMMIT = 'a209122ba1e3b54c6d329a94c01276b9550c9189';
export const BYPASS_MANIFEST_SHA256 = '72ab82a3bdf5c24e2091903993b77a55524b4b98d2f1471d4dc0d90683ced9c9';
export const BYPASS_REQUEST_SHA256 = 'af24de094de2926bf47e4ea8d01536ff999f69b58030ff88993acb06792fb469';
export const BYPASS_DOCUMENT_SHA256 = '38fc3c7e1393caa034eb840f96bca9d1a79bae466d46db01b3a45b04144ec9cb';
export const HANDSHAKE_V2_REFERENCE_COMMIT = '2532b50e729463f67d2afef700b1830ca6cb7753';
export const HANDSHAKE_V2_MANIFEST_SHA256 = '8b692223d641d1d443d537df2619a473f40662fea9a0d16ca5a72673fbb4d879';
export const HANDSHAKE_V2_REQUEST_SHA256 = '5faa53318e3f6f4c19431a9be54657fdec139de18119c1b94838af5ac4bc9d36';
export const HANDSHAKE_V2_DOCUMENT_SHA256 = '47575e0f0765b177a038c63e8696e0e3ad90da4e7c41b417c6d25f2b1118d341';

/** Repository-relative acquisition source, distinct from generated public assets. */
export function chamberPackagePath(chamber: NativeChamberId, ...parts: string[]): string {
    return posix.join('experiments', ...(chamber === 'handshake'
        ? ['coop-controller-studies', 'handshake-v2'] : chamber === 'bypass'
            ? ['coop-controller-studies', 'bypass-v1'] : ['coop-controllers', chamber]), ...parts);
}
export function chamberReferenceCommit(chamber: NativeChamberId): string {
    return chamber === 'handshake' ? HANDSHAKE_V2_REFERENCE_COMMIT : chamber === 'bypass' ? BYPASS_REFERENCE_COMMIT : REFERENCE_COMMIT;
}

export const sha256 = (bytes: Buffer | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export function readBytes(...parts: string[]): Buffer {
    return readFileSync(parts[0] === 'bypass' || parts[0] === 'handshake'
        ? chamberPackagePath(parts[0], ...parts.slice(1)) : join(PACKAGE_ROOT, ...parts));
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
    chamber_id: NativeAcquisitionId;
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
    chamber_id: NativeAcquisitionId;
    contract_sha256: string;
    input_names: string[];
    output_names: string[];
    rows: { id: number | string; inputs: number[]; expected: number[]; clean: number[]; bcf: number[]; valid: boolean }[];
    processes: { clean: { binary_sha256: string }; bcf: { binary_sha256: string } };
    case_count: number;
    all_valid: boolean;
    failed_case_ids: (number | string)[];
}

export function contractPath(chamber: NativeChamberId) { return chamberPackagePath(chamber, 'contract.json'); }

/** Load and sanity-check a chamber's contract and exhaustive native results. */
export function loadChamberEvidence(chamber: NativeChamberId) {
    const contractBytes = readBytes(chamber, 'contract.json');
    const contract = JSON.parse(contractBytes.toString('utf8')) as NativeContract;
    const contractSha = sha256(contractBytes);
    if (contract.chamber_id !== chamberAcquisitionId(chamber)) throw new Error(`${chamber}: contract identity mismatch`);
    if (contract.reference_commit !== chamberReferenceCommit(chamber)) throw new Error(`${chamber}: unexpected reference commit`);

    const results = readGzipJson<NativeResults>(chamber, 'evidence', 'native-results.json.gz');
    if (results.value.chamber_id !== chamberAcquisitionId(chamber)) throw new Error(`${chamber}: native-results identity mismatch`);
    if (results.value.contract_sha256 !== contractSha) throw new Error(`${chamber}: native-results contract hash mismatch`);
    if (!results.value.all_valid || results.value.failed_case_ids.length) throw new Error(`${chamber}: native results report failures`);

    if (chamber === 'bypass') verifyBypassReference(contract, results.value);
    if (chamber === 'handshake') verifyHandshakeReference(contract, results.value);

    return { contract, contractSha, results: results.value, nativeResultsSha256: results.fileSha256 };
}

/** HANDSHAKE v2 is a separate frozen acquisition. Promotion changes the room's
 * title/identity, not its accepted ports, expressions, bindings or physical objects. */
function verifyHandshakeReference(contract: NativeContract, results: NativeResults): void {
    const requireHash = (bytes: Buffer, expected: string, label: string) => {
        if (sha256(bytes) !== expected) throw new Error(`handshake-v2: ${label} hash mismatch`);
    };
    const manifestBytes = readBytes('handshake', 'manifest.json');
    requireHash(manifestBytes, HANDSHAKE_V2_MANIFEST_SHA256, 'frozen manifest');
    const manifest = JSON.parse(manifestBytes.toString('utf8')) as { files: Record<string, string>; external_read_only_files: Record<string, string> };
    for (const [path, digest] of Object.entries(manifest.files)) requireHash(readBytes('handshake', path), digest, path);
    for (const [path, digest] of Object.entries(manifest.external_read_only_files)) requireHash(readFileSync(path), digest, path);
    requireHash(readBytes('handshake', 'reference', 'request.json'), HANDSHAKE_V2_REQUEST_SHA256, 'frozen request');
    requireHash(readFileSync('docs/native-requests/handshake-v2.json'), HANDSHAKE_V2_REQUEST_SHA256, 'current request');
    const frozenBytes = readBytes('handshake', 'reference', 'levels/drafts/handshake-v2.json');
    requireHash(frozenBytes, HANDSHAKE_V2_DOCUMENT_SHA256, 'frozen draft');
    requireHash(readFileSync('levels/drafts/handshake-v2.json'), HANDSHAKE_V2_DOCUMENT_SHA256, 'current acquisition draft');
    const frozen = JSON.parse(frozenBytes.toString('utf8')) as DraftDocument;
    const promoted = ['levels/campaign/handshake.json', 'levels/drafts/handshake.json'].map(path => {
        const draft = JSON.parse(readFileSync(path, 'utf8')) as DraftDocument;
        for (const field of ['controller', 'bindings', 'geometry'] as const) {
            if (!isDeepStrictEqual(draft[field], frozen[field])) throw new Error(`handshake-v2: ${path} ${field} differs from acquired draft`);
        }
        return draft;
    });
    if (results.rows.length !== 32 || new Set(results.rows.map(row => row.id)).size !== 32) throw new Error('handshake-v2: expected exactly 32 exhaustive vectors');
    for (let id = 0; id < 32; id++) {
        const row = results.rows.find(row => row.id === id);
        if (!row) throw new Error(`handshake-v2: missing case ${id}`);
        const inputs = contract.inputs.map((_, bit) => (id >> bit) & 1);
        if (!isDeepStrictEqual(row.inputs, inputs)) throw new Error(`handshake-v2: case ${id} input encoding differs`);
        const values = Object.fromEntries(contract.inputs.map((input, bit) => [input.game_port!, !!inputs[bit]]));
        for (const draft of [frozen, ...promoted]) {
            const actual = evaluateDraft(draft, values), vector = contract.outputs.map(output => Number(actual[output.name]));
            if (actual.firewallActive !== !inputs[3] || actual.exitReady !== !!inputs[4] || ['expected', 'clean', 'bcf'].some(key =>
                !isDeepStrictEqual(vector, row[key as 'expected' | 'clean' | 'bcf']))) throw new Error(`handshake-v2: case ${id} current TypeScript/native contract mismatch`);
        }
    }
}

/** BYPASS's acquisition has an independent pin. Never replace the historical pin
 * or accept a moving controller just because its output field names still match. */
function verifyBypassReference(contract: NativeContract, results: NativeResults): void {
    const requireHash = (bytes: Buffer, expected: string, label: string) => {
        if (sha256(bytes) !== expected) throw new Error(`bypass: ${label} hash mismatch`);
    };
    const manifestBytes = readBytes('bypass', 'manifest.json');
    requireHash(manifestBytes, BYPASS_MANIFEST_SHA256, 'frozen manifest');
    const manifest = JSON.parse(manifestBytes.toString('utf8')) as { files: Record<string, string>; external_read_only_files: Record<string, string> };
    for (const [path, digest] of Object.entries(manifest.files)) requireHash(readBytes('bypass', path), digest, path);
    for (const [path, digest] of Object.entries(manifest.external_read_only_files)) requireHash(readFileSync(path), digest, path);
    requireHash(readBytes('bypass', 'reference', 'request.json'), BYPASS_REQUEST_SHA256, 'frozen request');
    requireHash(readFileSync('docs/native-requests/bypass.json'), BYPASS_REQUEST_SHA256, 'current request');
    for (const path of ['levels/campaign/bypass.json', 'levels/drafts/bypass.json']) {
        requireHash(readBytes('bypass', 'reference', path), BYPASS_DOCUMENT_SHA256, `frozen ${path}`);
        requireHash(readFileSync(path), BYPASS_DOCUMENT_SHA256, `current ${path}`);
    }
    const draft = JSON.parse(readFileSync('levels/campaign/bypass.json', 'utf8')) as DraftDocument;
    const numeric = results.rows.filter(row => typeof row.id === 'number');
    if (numeric.length !== 16 || new Set(numeric.map(row => row.id)).size !== 16) throw new Error('bypass: expected exactly 16 exhaustive vectors');
    for (let id = 0; id < 16; id++) {
        const row = numeric.find(row => row.id === id);
        if (!row) throw new Error(`bypass: missing case ${id}`);
        const inputs = contract.inputs.map((_, bit) => (id >> bit) & 1);
        if (JSON.stringify(row.inputs) !== JSON.stringify(inputs)) throw new Error(`bypass: case ${id} input encoding differs`);
        const values = Object.fromEntries(contract.inputs.map((input, bit) => [input.game_port!, !!inputs[bit]]));
        const actual = evaluateDraft(draft, values);
        const vector = contract.outputs.map(output => Number(actual[output.name]));
        if (actual.exitReady !== true || ['expected', 'clean', 'bcf'].some(key =>
            JSON.stringify(vector) !== JSON.stringify(row[key as 'expected' | 'clean' | 'bcf']))) {
            throw new Error(`bypass: case ${id} current TypeScript/native contract mismatch`);
        }
    }
}
