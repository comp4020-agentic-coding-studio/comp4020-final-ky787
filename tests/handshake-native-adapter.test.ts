import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { CHAMBER_CONTRACTS, chamberAcquisitionId, chamberSpecimenId } from '../server/native/contracts.ts';
import { NativeControllerTable, nativeController } from '../server/native/adapter.ts';
import { declarativeCaseId } from '../src/coop/native-evidence.ts';
import { HANDSHAKE_V2_REFERENCE_COMMIT, REFERENCE_COMMIT, chamberPackagePath, chamberReferenceCommit, loadChamberEvidence } from '../scripts/native/package.ts';

describe('HANDSHAKE v2 acquisition and accepted lookup boundary', () => {
    it('selects a separately pinned acquisition while preserving the original specimen', () => {
        expect(chamberAcquisitionId('handshake')).toBe('handshake-v2');
        expect(chamberSpecimenId('handshake')).toBe('handshake-v2_ollvm_bcf');
        expect(chamberPackagePath('handshake')).toBe('experiments/coop-controller-studies/handshake-v2');
        expect(chamberReferenceCommit('handshake')).toBe(HANDSHAKE_V2_REFERENCE_COMMIT);
        expect(HANDSHAKE_V2_REFERENCE_COMMIT).toBe('2532b50e729463f67d2afef700b1830ca6cb7753');
        const original = JSON.parse(readFileSync('experiments/coop-controllers/handshake/contract.json', 'utf8'));
        expect(original.reference_commit).toBe(REFERENCE_COMMIT);
        expect(original.outputs.map((o: { name: string }) => o.name)).toEqual(['crossingPower', 'liftPower', 'relayPower', 'exitReady']);
        expect(original.abi.output_size).toBe(16);
    });

    it('verifies the frozen inventory/request and both promoted documents against all 32 native cases', () => {
        const evidence = loadChamberEvidence('handshake');
        expect(evidence.contract.chamber_id).toBe('handshake-v2');
        expect(evidence.contract.abi).toMatchObject({ input_size: 20, output_size: 20, stateful: false });
        expect(evidence.contractSha).toBe('08ccba38195b3466bfff5fef37e1ede555865de2a1e468cdaa426e5c2f0000e8');
        expect(evidence.results.rows).toHaveLength(32);
        expect(evidence.results.processes.clean.binary_sha256).toBe('a2edb2a7084c142005dc8273f61736c86be478b8510e7a0cd2234db513ccf33b');
        expect(evidence.results.processes.bcf.binary_sha256).toBe('57f7951f364594ebc417e5d93b15ef694595c7ad06ff9fe2d148fd0531cbcda1');
    });

    it('uses five ordered output fields and keeps firewall inversion independent of payload-only unlock', () => {
        const controller = nativeController('handshake');
        expect(controller.meta.acquisition_id).toBe('handshake-v2');
        expect(controller.meta.specimen_id).toBe('handshake-v2_ollvm_bcf');
        expect(controller.contract.outputs).toEqual(['crossingPower', 'liftPower', 'relayPower', 'firewallActive', 'exitReady']);
        expect(controller.gamePorts).toEqual([
            { name: 'crossing', port: 'crossing.occupied' }, { name: 'liftPlate', port: 'liftPlate.occupied' },
            { name: 'link', port: 'link.value' }, { name: 'maintenance', port: 'maintenance.value' },
            { name: 'exitSocket', port: 'exitSocket.occupied' },
        ]);
        expect(controller.outputsForCase(0)).toEqual({ crossingPower: false, liftPower: false, relayPower: false, firewallActive: true, exitReady: false });
        for (let id = 0; id < 32; id++) {
            const output = controller.outputsForCase(id);
            expect(output.firewallActive).toBe(!(id & 8));
            expect(output.exitReady).toBe(!!(id & 16));
        }
        expect(controller.outputsForCase(16)).toMatchObject({ firewallActive: true, exitReady: true });
        expect(controller.outputsForCase(8)).toMatchObject({ firewallActive: false, exitReady: false });
    });

    it('rejects an old specimen identity or corrupt table rather than relabelling/falling back', () => {
        const controller = nativeController('handshake');
        const oldIdentity = { ...controller.meta, specimen_id: 'handshake_ollvm_bcf' };
        expect(() => new NativeControllerTable('handshake', oldIdentity, CHAMBER_CONTRACTS.handshake)).toThrow(/specimen identity/);
        const noAcquisition = { ...controller.meta, acquisition_id: undefined };
        expect(() => new NativeControllerTable('handshake', noAcquisition, CHAMBER_CONTRACTS.handshake)).toThrow(/specimen identity/);
        const broken = { ...controller.meta, packed: Buffer.alloc(32).toString('base64') };
        expect(() => new NativeControllerTable('handshake', broken, CHAMBER_CONTRACTS.handshake)).toThrow(/hash mismatch/);
        expect(() => controller.caseId({ crossing: 0, liftPlate: 0, link: 0, maintenance: 0 })).toThrow(/missing input exitSocket/);
    });

    it('does not claim an exact retained state from missing canonical device ports', () => {
        const values = { 'crossing.occupied': false, 'liftPlate.occupied': false, 'link.value': false,
            'maintenance.value': false, 'exitSocket.occupied': false };
        expect(declarativeCaseId('handshake', values)).toBe(0);
        expect(declarativeCaseId('handshake', { ...values, 'exitSocket.occupied': true })).toBe(16);
        for (const port of Object.keys(values)) {
            const incomplete: Record<string, boolean> = { ...values }; delete incomplete[port];
            expect(declarativeCaseId('handshake', incomplete)).toBeNull();
        }
    });

    it('rejects stale inspector assets instead of mixing an old acquisition with current outputs', async () => {
        vi.resetModules();
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            const data = JSON.parse(readFileSync(`public/${url}`, 'utf8'));
            delete data.acquisition_id;
            if (data.specimen_id) data.specimen_id = 'handshake_ollvm_bcf';
            return { ok: true, json: async () => data };
        }));
        try {
            const { loadEvidence, loadTraces, loadDisasm } = await import('../src/coop/native-evidence.ts');
            await expect(loadEvidence('handshake')).rejects.toThrow(/specimen identity/);
            await expect(loadTraces('handshake')).rejects.toThrow(/acquisition identity/);
            await expect(loadDisasm('handshake')).rejects.toThrow(/acquisition identity/);
        } finally { vi.unstubAllGlobals(); }
    });
});
