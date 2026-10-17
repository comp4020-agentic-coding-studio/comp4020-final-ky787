/**
 * Native-verified controller adapter.
 *
 * The multiplayer server builds a canonical input vector from accepted game
 * state, encodes it to a case id using the shared contract, and reads the
 * corresponding native BCF output vector from the verified lookup table. The
 * returned values are the retained Windows-native results; the Linux server
 * never executes the PE.
 *
 * A missing, invalid or unmapped state throws. A native-backed chamber never
 * silently falls back to a recomputed mock expression (see spec section 5).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAMBER_CONTRACTS, caseIdForInputs, isNativeChamber, type ChamberContract, type NativeChamberId } from './contracts.ts';
import { loadTable, readCase, type LoadedTable, type NativeTable } from './table-format.ts';

const TABLE_DIR = fileURLToPath(new URL('./tables/', import.meta.url));

const cache = new Map<NativeChamberId, NativeControllerTable>();

export class NativeControllerTable {
    readonly chamber: NativeChamberId;
    private readonly table: LoadedTable;
    constructor(chamber: NativeChamberId, meta: NativeTable, contract: ChamberContract) {
        this.chamber = chamber;
        this.table = loadTable(meta, contract);
    }
    get meta(): NativeTable { return this.table.meta; }
    get contract(): ChamberContract { return this.table.contract; }

    /** Declarative chambers: [inputName, authoredDevicePort] pairs in contract order. */
    get gamePorts(): readonly { name: string; port: string }[] {
        return this.contract.inputs.map((name, i) => {
            const port = this.meta.input_game_ports[i];
            if (!port) throw new Error(`native ${this.chamber}: input ${name} has no authored game port`);
            return { name, port };
        });
    }

    /** Encode a named input snapshot (booleans + optional enum) to its case id. */
    caseId(inputs: Readonly<Record<string, number | boolean>>): number {
        const vector = this.contract.inputs.map(name => {
            const raw = inputs[name];
            if (raw === undefined) throw new Error(`native ${this.chamber}: missing input ${name}`);
            if (this.contract.enumInput?.name === name) {
                const v = Number(raw);
                if (!Number.isInteger(v) || v < 0 || v >= this.contract.enumInput.values) throw new Error(`native ${this.chamber}: ${name} out of domain: ${raw}`);
                return v;
            }
            return raw ? 1 : 0;
        });
        return caseIdForInputs(this.contract, vector);
    }

    /** Return the native output vector for a case id as named booleans. */
    outputsForCase(caseId: number): Record<string, boolean> {
        if (!Number.isInteger(caseId) || caseId < 0 || caseId >= this.contract.caseCount) {
            throw new Error(`native ${this.chamber}: case id ${caseId} out of range`);
        }
        const bits = readCase(this.table.packed, caseId, this.contract.outputs.length);
        return Object.fromEntries(this.contract.outputs.map((name, i) => [name, bits[i] === 1]));
    }

    /** Encode inputs and return named native outputs in one step. */
    evaluate(inputs: Readonly<Record<string, number | boolean>>): Record<string, boolean> {
        return this.outputsForCase(this.caseId(inputs));
    }
}

export function nativeController(chamber: NativeChamberId): NativeControllerTable {
    const existing = cache.get(chamber);
    if (existing) return existing;
    const contract = CHAMBER_CONTRACTS[chamber];
    let meta: NativeTable;
    try {
        meta = JSON.parse(readFileSync(join(TABLE_DIR, `${chamber}.json`), 'utf8')) as NativeTable;
    } catch (error) {
        throw new Error(`native ${chamber}: verified lookup table unavailable (run pnpm gen:native): ${(error as Error).message}`);
    }
    const built = new NativeControllerTable(chamber, meta, contract);
    cache.set(chamber, built);
    return built;
}

export const hasNativeController = (chamber: unknown): chamber is NativeChamberId => isNativeChamber(chamber);
