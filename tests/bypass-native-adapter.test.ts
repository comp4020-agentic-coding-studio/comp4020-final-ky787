import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHAMBER_CONTRACTS, NATIVE_CHAMBERS } from '../server/native/contracts.ts';
import { NativeControllerTable, nativeController } from '../server/native/adapter.ts';
import { BYPASS_REFERENCE_COMMIT, REFERENCE_COMMIT, chamberPackagePath, chamberReferenceCommit, loadChamberEvidence } from '../scripts/native/package.ts';

describe('BYPASS native acquisition isolation', () => {
    it('keeps other acquisitions and the original historical package reference independent', () => {
        expect(chamberPackagePath('bypass')).toBe('experiments/coop-controller-studies/bypass-v1');
        expect(chamberReferenceCommit('bypass')).toBe(BYPASS_REFERENCE_COMMIT);
        expect(BYPASS_REFERENCE_COMMIT).toBe('a209122ba1e3b54c6d329a94c01276b9550c9189');
        expect(REFERENCE_COMMIT).toBe('1315c3616ce5ac939baf913f9b09b4ebad34132a');
        for (const chamber of NATIVE_CHAMBERS.filter(id => id !== 'bypass' && id !== 'handshake')) {
            expect(chamberPackagePath(chamber)).toBe(`experiments/coop-controllers/${chamber}`);
            expect(chamberReferenceCommit(chamber)).toBe(REFERENCE_COMMIT);
        }
        const originalHandshake = JSON.parse(readFileSync('experiments/coop-controllers/handshake/contract.json', 'utf8'));
        expect(originalHandshake.reference_commit).toBe(REFERENCE_COMMIT);
        expect(originalHandshake.outputs.map((o: { name: string }) => o.name)).toEqual(['crossingPower', 'liftPower', 'relayPower', 'exitReady']);
    });

    it('verifies manifest, frozen/current request and documents, and actual TS versus all 16 clean/BCF vectors', () => {
        const evidence = loadChamberEvidence('bypass');
        expect(evidence.contract.reference_commit).toBe(BYPASS_REFERENCE_COMMIT);
        expect(evidence.results.rows.filter(row => typeof row.id === 'number')).toHaveLength(16);
        expect(evidence.results.rows.every(row => row.clean[3] === 1 && row.bcf[3] === 1)).toBe(true);
        expect(evidence.results.processes.clean.binary_sha256).toBe('85ec3623042a89256e89d89fa028b1cc8019ada2c33ead04761c67ccf6371343');
        expect(evidence.results.processes.bcf.binary_sha256).toBe('af1ad2ec9562728c94f21a764bb0be450bad5541a0cb1b0d6eb696087d4b2e74');
    });
});

describe('BYPASS native lookup boundary', () => {
    it('uses four ports in ABI bit order and opens the initial portal without an input', () => {
        const controller = nativeController('bypass');
        expect(controller.gamePorts).toEqual([
            { name: 'anchorHold', port: 'anchorHold.occupied' },
            { name: 'link', port: 'link.value' },
            { name: 'bypassHold', port: 'bypassHold.occupied' },
            { name: 'override', port: 'override.value' },
        ]);
        expect(controller.evaluate({ anchorHold: 0, link: 0, bypassHold: 0, override: 0 }))
            .toEqual({ anchorPower: false, bridgePower: false, firewallActive: true, exitReady: true });
        for (let id = 0; id < 16; id++) expect(controller.outputsForCase(id).exitReady).toBe(true);
    });

    it('rejects missing inputs, invalid cases and a corrupt lookup instead of falling back', () => {
        const controller = nativeController('bypass');
        expect(() => controller.evaluate({ anchorHold: 0, link: 0, bypassHold: 0 })).toThrow(/missing input override/);
        for (const id of [-1, 16, 1.5]) expect(() => controller.outputsForCase(id)).toThrow(/out of range/);
        const broken = { ...controller.meta, packed: Buffer.alloc(16).toString('base64') };
        expect(() => new NativeControllerTable('bypass', broken, CHAMBER_CONTRACTS.bypass)).toThrow(/hash mismatch/);
    });
});
