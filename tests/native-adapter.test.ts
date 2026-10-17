import { describe, it, expect } from 'vitest';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHAMBER_CONTRACTS, NATIVE_CHAMBERS, caseIdForInputs, type NativeChamberId } from '../server/native/contracts.ts';
import { nativeController } from '../server/native/adapter.ts';
import { evaluateDraft } from '../src/workbench/evaluate.ts';
import { crossfeedOutputs } from '../server/crossfeed-state.ts';
import { raceInputs, raceOutputs, freshRace } from '../server/race-state.ts';
import { CAMPAIGN_DOCUMENTS } from '../src/coop/authored-campaign.ts';

const PKG = join(process.cwd(), 'experiments', 'coop-controllers');
function nativeRows(chamber: NativeChamberId) {
    const bytes = readFileSync(join(PKG, chamber, 'evidence', 'native-results.json.gz'));
    return JSON.parse(gunzipSync(bytes).toString('utf8')) as {
        rows: { id: number | string; inputs: number[]; expected: number[]; clean: number[]; bcf: number[] }[];
    };
}

describe('native adapter: tables load and self-verify', () => {
    for (const chamber of NATIVE_CHAMBERS) {
        it(`${chamber}: loads, verifies hash and matches contract shape`, () => {
            const ctrl = nativeController(chamber);
            expect(ctrl.contract.caseCount).toBe(CHAMBER_CONTRACTS[chamber].caseCount);
            expect(ctrl.meta.output_names).toEqual([...CHAMBER_CONTRACTS[chamber].outputs]);
        });
    }
});

describe('native adapter: every table entry equals retained native BCF results', () => {
    for (const chamber of NATIVE_CHAMBERS) {
        it(`${chamber}: all ${CHAMBER_CONTRACTS[chamber].caseCount} cases match native-results.json.gz`, () => {
            const ctrl = nativeController(chamber);
            const contract = CHAMBER_CONTRACTS[chamber];
            const { rows } = nativeRows(chamber);
            let checked = 0;
            for (const row of rows) {
                if (typeof row.id !== 'number') continue;
                // id must match the input encoding
                expect(caseIdForInputs(contract, row.inputs)).toBe(row.id);
                const out = ctrl.outputsForCase(row.id);
                const vector = contract.outputs.map(n => (out[n] ? 1 : 0));
                expect(vector).toEqual(row.bcf);
                expect(row.bcf).toEqual(row.expected);
                expect(row.bcf).toEqual(row.clean);
                checked++;
            }
            expect(checked).toBe(contract.caseCount);
        });
    }
});

describe('native adapter: differential vs independent TypeScript oracle', () => {
    for (const chamber of ['handshake', 'deadlock', 'use-after-free'] as const) {
        it(`${chamber}: native table equals declarative evaluateDraft for all cases`, () => {
            const ctrl = nativeController(chamber);
            const contract = CHAMBER_CONTRACTS[chamber];
            const doc = CAMPAIGN_DOCUMENTS[chamber];
            const ports = contract.inputs.map(name => {
                const dev = doc.geometry.objects.find((o: { id?: string }) => o.id === name)!;
                const kind = (dev as { kind: string }).kind;
                return `${name}.${kind === 'toggle' || kind === 'terminal' ? 'value' : 'occupied'}`;
            });
            for (let id = 0; id < contract.caseCount; id++) {
                const values: Record<string, boolean> = {};
                ports.forEach((port, bit) => { values[port] = !!((id >> bit) & 1); });
                const oracle = evaluateDraft(doc, values);
                const native = ctrl.outputsForCase(id);
                for (const name of contract.outputs) expect(native[name]).toBe(!!oracle[name]);
            }
        });
    }

    it('crossfeed-vault: native table equals crossfeedOutputs for all 16384 cases', () => {
        const ctrl = nativeController('crossfeed-vault');
        const contract = CHAMBER_CONTRACTS['crossfeed-vault'];
        const occupancy: [string, string][] = [['plateAOccupied', 'entry'], ['routePowerOccupied', 'routePower'],
            ['finalPlateLeftOccupied', 'finalLeft'], ['finalPlateRightOccupied', 'finalRight']];
        const cubes: [string, string][] = [['cubeOnLiftCargo', 'liftCargo'], ['cubeOnFinalLeft', 'finalLeft'], ['cubeOnFinalRight', 'finalRight']];
        for (let id = 0; id < contract.caseCount; id++) {
            const bit = (i: number) => (id >> i) & 1;
            const flags = Object.fromEntries(contract.inputs.map((n, i) => [n, bit(i)]));
            const ctx = {
                record: {
                    level: 'crossfeed-vault' as const,
                    levelState: { chamberRevision: 2 as const, switchB: !!flags.switchB, switchC: !!flags.switchC, switchD: !!flags.switchD, routeMode: !!flags.routeMode },
                    exitUnlocked: !!flags.exitUnlocked,
                    cubePlacements: Object.fromEntries(cubes.filter(([k]) => flags[k]).map(([, v], i) => [`c${i}`, v])),
                },
                held: occupancy.filter(([k]) => flags[k]).map(([, v]) => v),
            } as unknown as Parameters<typeof crossfeedOutputs>[0];
            const raw = crossfeedOutputs(ctx);
            const native = ctrl.outputsForCase(id);
            for (const name of ['grappleAnchor', 'bridge', 'liftField', 'serviceAccess', 'relayGates', 'leftRoute', 'rightRoute', 'galleryAccess', 'vaultPower', 'vaultReturn'] as const) {
                expect(native[name]).toBe(raw[name]);
            }
            // exitDoor projects record.exitUnlocked; physical* with no grace active equals raw route.
            expect(native.exitDoor).toBe(!!flags.exitUnlocked);
            expect(native.physicalLeftRoute).toBe(raw.leftRoute || !!flags.leftGraceActive);
            expect(native.physicalRightRoute).toBe(raw.rightRoute || !!flags.rightGraceActive);
        }
    });

    it('race-condition: native table equals raceOutputs for all 4096 cases', () => {
        const ctrl = nativeController('race-condition');
        const contract = CHAMBER_CONTRACTS['race-condition'];
        const phases = ['idle', 'window', 'released', 'expired'] as const;
        const plates: [string, string][] = [['dropA', 'dropA'], ['dropB', 'dropB'], ['payloadDelivered', 'receiver'], ['traceOccupied', 'trace'], ['returnOccupied', 'return']];
        for (let id = 0; id < contract.caseCount; id++) {
            const mask = id >>> 2;
            const bufferPhase = id & 3;
            const flags = Object.fromEntries(contract.inputs.slice(0, 10).map((n, i) => [n, (mask >> i) & 1]));
            const ctx = {
                record: { level: 'race-condition' as const, levelState: { phase: !!flags.phase, finalControl: !!flags.finalControl },
                    exitUnlocked: !!flags.exitUnlocked, cubePlacements: {} as Record<string, string> },
                held: plates.filter(([k]) => flags[k]).map(([, v]) => v),
            } as unknown as Parameters<typeof raceInputs>[0];
            const inputs = raceInputs(ctx);
            const raw = raceOutputs(inputs, phases[bufferPhase], !!flags.exitUnlocked);
            const native = ctrl.outputsForCase(id);
            for (const name of ['topBridge', 'bufferBridge', 'safetyFirewall', 'raceFirewall', 'spanMaster', 'phaseA', 'phaseB', 'returnBridge'] as const) {
                expect(native[name]).toBe(raw[name]);
            }
            expect(native.exitDoor).toBe(!!flags.exitUnlocked);
            // physical* = raw OR grace; phase overlap grace still requires spanMaster.
            expect(native.physicalPhaseA).toBe(raw.phaseA || (!!flags.phaseGraceActive && raw.spanMaster));
            expect(native.physicalPhaseB).toBe(raw.phaseB || (!!flags.phaseGraceActive && raw.spanMaster));
            expect(native.physicalReturnBridge).toBe(raw.returnBridge || !!flags.returnGraceActive);
        }
    });
});

describe('native adapter: fails loudly, never silently falls back', () => {
    it('rejects an out-of-range case id', () => {
        const ctrl = nativeController('handshake');
        expect(() => ctrl.outputsForCase(32)).toThrow(/out of range/);
        expect(() => ctrl.outputsForCase(-1)).toThrow(/out of range/);
    });
    it('rejects a missing input field', () => {
        const ctrl = nativeController('handshake');
        expect(() => ctrl.caseId({ crossing: 1 })).toThrow(/missing input/);
    });
    it('rejects a race bufferPhase outside its enum domain', () => {
        const ctrl = nativeController('race-condition');
        const base = Object.fromEntries(CHAMBER_CONTRACTS['race-condition'].inputs.map(n => [n, 0]));
        expect(() => ctrl.caseId({ ...base, bufferPhase: 4 })).toThrow(/out of domain/);
    });
});

void freshRace;
