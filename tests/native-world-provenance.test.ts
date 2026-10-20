import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { NATIVE_CHAMBERS } from '../server/native/contracts.ts';
import { raceCondition } from '../src/coop/race-condition.ts';
import type { NativeChamberId } from '../server/native/contracts.ts';
import type { NativeWorldArtifact } from '../src/coop/native-world-types.ts';
import { buildNativeWorldArtifact, serializeNativeWorldArtifact, validateNativeWorldArtifact } from '../scripts/native/world-evidence.ts';
import { WORLD_ASSEMBLY_PLACEMENTS, nativeWorldPlacementBinding, nativeWorldPlatformBinding } from '../src/slice/native-world-presentation.ts';

function artifact(chamber: NativeChamberId = 'handshake'): NativeWorldArtifact {
    return JSON.parse(readFileSync(`public/evidence/coop/${chamber}.world.json`, 'utf8')) as NativeWorldArtifact;
}

describe('world assembly authentic frozen native evidence', () => {
    for (const chamber of NATIVE_CHAMBERS) {
        it(`${chamber}: every displayed instruction matches acquired PE bytes, block order and output stores`, () => {
            const data = artifact(chamber);
            expect(() => validateNativeWorldArtifact(data, chamber)).not.toThrow();
            expect(serializeNativeWorldArtifact(buildNativeWorldArtifact(chamber))).toBe(readFileSync(`public/evidence/coop/${chamber}.world.json`, 'utf8'));
            for (const output of data.outputs) {
                expect(output.excerpt.instructions).toHaveLength(3);
                expect(output.excerpt.instructions.at(-1)?.address).toBe(output.excerpt.store_address);
            }
        });
    }
    it('keeps all five assets below 75 KB total', () => {
        expect(NATIVE_CHAMBERS.reduce((sum, chamber) => sum + statSync(`public/evidence/coop/${chamber}.world.json`).size, 0)).toBeLessThan(75_000);
    });
    it('rejects the wrong chamber, specimen, PE hash or source hash', () => {
        expect(() => validateNativeWorldArtifact(artifact('deadlock'), 'handshake')).toThrow(/specimen/);
        for (const field of ['specimen_id', 'bcf_pe_sha256', 'contract_sha256'] as const) {
            const altered = artifact(); altered[field] = '0'.repeat(64);
            expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/identity|specimen/);
        }
        const altered = artifact(); altered.sources.disassembly_sha256 = '0'.repeat(64);
        expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/source identity/);
    });
    it.each(['address', 'rva', 'size', 'bytes', 'mnemonic', 'op_str', 'block_id'] as const)(
        'rejects fabricated instruction %s even when the JSON remains structurally valid', field => {
            const altered = artifact();
            const instruction = altered.outputs[0].excerpt.instructions[0];
            Object.assign(instruction, { [field]: typeof instruction[field] === 'number' ? Number(instruction[field]) + 1 : `${instruction[field]}0` });
            expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/instruction|block/);
        });
    it('rejects joining authentic instructions from unrelated blocks', () => {
        const altered = artifact();
        altered.outputs[0].excerpt.instructions[1] = structuredClone(altered.outputs[1].excerpt.instructions[1]);
        expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/non-contiguous/);
    });
    it('rejects reordering authentic instructions within a basic block', () => {
        const altered = artifact(); altered.outputs[0].excerpt.instructions.reverse();
        expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/non-contiguous/);
    });
    it('rejects a genuine store for the wrong output, and an invented store address', () => {
        const altered = artifact(); altered.outputs[0].excerpt = structuredClone(altered.outputs[1].excerpt);
        expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/unverified output store/);
        altered.outputs[0].excerpt.store_address += 1;
        expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/unverified output store/);
    });
    it('rejects instruction contamination across chamber specimens', () => {
        const altered = artifact(); altered.outputs[0].excerpt = artifact('deadlock').outputs[0].excerpt;
        expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow();
    });
    it('rejects nonexistent target IDs and changing which output controls a real target', () => {
        const altered = artifact(); altered.outputs[0].bindings[0].target = 'invented-platform';
        expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/binding mismatch/);
        altered.outputs[0].bindings[0].target = 'serviceLift';
        expect(() => validateNativeWorldArtifact(altered, 'handshake')).toThrow(/binding mismatch/);
    });
    it('keeps shared physical objects attached to one static output region', () => {
        const handshake = artifact();
        const crossing = handshake.outputs.find(o => o.name === 'crossingPower')!;
        expect(crossing.bindings.map(b => b.target)).toEqual(['nearAnchor', 'farAnchor']);
        expect(handshake.outputs.filter(o => o.name === 'crossingPower')).toHaveLength(1);
        const crossfeed = artifact('crossfeed-vault');
        expect(crossfeed.outputs.find(o => o.name === 'leftRoute')!.bindings.map(b => b.target)).toEqual(['left1', 'crumbleA', 'left3']);
        expect(crossfeed.outputs.filter(o => o.name === 'leftRoute')).toHaveLength(1);
        const duplicated = artifact(); duplicated.outputs.push(structuredClone(crossing));
        expect(() => validateNativeWorldArtifact(duplicated, 'handshake')).toThrow(/output association/);
    });
    it('preserves USE AFTER FREE final lift inversion independently of the native store value', () => {
        const data = artifact('use-after-free');
        const assist = data.outputs.find(o => o.name === 'assistBlocked')!;
        expect(assist.excerpt.observed_values).toEqual([1]);
        expect(assist.bindings).toMatchObject([{ target: 'finalLift', output: 'assistBlocked', invert: true, resolved_signal: 'draft:assistBinding' }]);
        assist.bindings[0].invert = false;
        expect(() => validateNativeWorldArtifact(data, 'use-after-free')).toThrow(/binding mismatch/);
    });
    it('retains raw route versus grace-inclusive physical output associations', () => {
        const crossfeed = artifact('crossfeed-vault');
        const left = crossfeed.outputs.find(o => o.name === 'leftRoute')!;
        const physical = crossfeed.outputs.find(o => o.name === 'physicalLeftRoute')!;
        expect(left.kind).toBe('raw_combinational'); expect(physical.kind).toBe('physical_projection');
        expect(left.bindings[0]).toMatchObject({ output: 'leftRoute', physical_output: 'physicalLeftRoute' });
        expect(physical.bindings).toEqual(left.bindings);
        expect(left.excerpt.store_address).not.toBe(physical.excerpt.store_address);
        const race = artifact('race-condition');
        expect(race.outputs.find(o => o.name === 'phaseA')!.bindings[0].physical_output).toBe('physicalPhaseA');
        expect(race.outputs.find(o => o.name === 'returnBridge')!.bindings[0].physical_output).toBe('physicalReturnBridge');
    });
    it('keeps static store association separate from execution, server timers and authored instability', () => {
        for (const chamber of NATIVE_CHAMBERS) {
            const data = artifact(chamber);
            expect(data.presentation).toBe('static-output-store');
            expect(serializeNativeWorldArtifact(data)).not.toMatch(/executed|PROVEN BOGUS|trace_id|step_index|countdown|timer_instruction/);
            expect(data.outputs.every(o => o.excerpt.observed_values.length > 0)).toBe(true);
        }
        const data = artifact('race-condition');
        expect(data.outputs.find(o => o.name === 'exitDoor')!.kind).toBe('persisted_latch_projection');
        expect(data.outputs.find(o => o.name === 'spanMaster')!.bindings).toEqual([]);
    });
});

describe('authored panel placements preserve native object associations', () => {
    it('every expanded panel maps to a verified binding or an existing wire for that exact native signal', () => {
        expect(WORLD_ASSEMBLY_PLACEMENTS.handshake?.length).toBeGreaterThan(0);
        for (const chamber of NATIVE_CHAMBERS) {
            const data = artifact(chamber);
            for (const placement of WORLD_ASSEMBLY_PLACEMENTS[chamber] ?? []) {
                expect(Number.isFinite(placement.x) && Number.isFinite(placement.y)).toBe(true);
                const room = chamber === 'race-condition' ? raceCondition(1) : undefined;
                const mapped = nativeWorldPlacementBinding(data, placement, room);
                expect(mapped, `${chamber}/${placement.output}/${placement.target}`).not.toBeNull();
                expect(mapped!.output.name).toBe(placement.output);
                if (placement.kind === 'signal') {
                    expect(mapped!.binding).toBeUndefined();
                    expect(mapped!.wire?.id).toBe(placement.target);
                    expect(mapped!.wire?.output).toBe(mapped!.output.game_signal);
                    expect(room?.wires).toContain(mapped!.wire);
                } else {
                    expect(mapped!.binding?.target).toBe(placement.target);
                    expect(mapped!.output.bindings).toContain(mapped!.binding);
                }
                // Target IDs and binding semantics are checked independently against the live canonical room by this validator.
                expect(() => validateNativeWorldArtifact(data, chamber)).not.toThrow();
            }
        }
    });
    it('uses one expanded representative per displayed output, regardless of physical object count', () => {
        for (const chamber of NATIVE_CHAMBERS) {
            const placements = WORLD_ASSEMBLY_PLACEMENTS[chamber] ?? [];
            expect(new Set(placements.map(p => p.output)).size, chamber).toBe(placements.length);
        }
    });
    it('all compact shared-object headers reuse the same verified store as the expanded panel', () => {
        for (const chamber of NATIVE_CHAMBERS) {
            const data = artifact(chamber);
            for (const placement of WORLD_ASSEMBLY_PLACEMENTS[chamber] ?? []) {
                if (placement.kind === 'signal') continue; // No physical object/header is claimed for a signal-only diagnostic.
                const selected = nativeWorldPlacementBinding(data, placement)!;
                for (const binding of selected.output.bindings) {
                    const id = binding.resolved_signal ? `draft:${binding.target}` : binding.target;
                    const header = nativeWorldPlatformBinding(data, id);
                    expect(header, `${chamber}/${id}`).not.toBeNull();
                    expect(header!.output.name).toBe(selected.output.name);
                    expect(header!.output.excerpt.store_address).toBe(selected.output.excerpt.store_address);
                    expect(header!.output.excerpt).toBe(selected.output.excerpt);
                }
            }
        }
    });
    it('RACE spanMaster is a raw signal diagnostic on its existing receiver-master wire, without a physical binding', () => {
        const data = artifact('race-condition'), room = raceCondition(1);
        const placement = WORLD_ASSEMBLY_PLACEMENTS['race-condition']!.find(p => p.output === 'spanMaster')!;
        expect(placement.kind).toBe('signal');
        expect(placement.target).toBe('receiver-master');
        const association = nativeWorldPlacementBinding(data, placement, room)!;
        expect(association.output.bindings).toEqual([]);
        expect(association.binding).toBeUndefined();
        expect(association.wire).toBe(room.wires!.find(w => w.id === 'receiver-master'));
        expect(association.wire?.output).toBe('spanMaster');
        expect(nativeWorldPlatformBinding(data, 'receiver-master')).toBeNull();
    });
    it('rejects signal diagnostics without the matching chamber and exact existing wire output', () => {
        const data = artifact('race-condition'), room = raceCondition(1);
        const placement = WORLD_ASSEMBLY_PLACEMENTS['race-condition']!.find(p => p.output === 'spanMaster')!;
        expect(nativeWorldPlacementBinding(data, placement)).toBeNull();
        expect(nativeWorldPlacementBinding(data, placement, { ...room, id: 'handshake' })).toBeNull();
        expect(nativeWorldPlacementBinding(data, placement, { ...room, wires: [] })).toBeNull();
        expect(nativeWorldPlacementBinding(data, { ...placement, target: 'invented-wire' }, room)).toBeNull();
        expect(nativeWorldPlacementBinding(data, { ...placement, target: 'phase-span1' }, room)).toBeNull();
        const wrongSignal = { ...room, wires: room.wires!.map(w => w.id === 'receiver-master' ? { ...w, output: 'phaseA' as const } : w) };
        expect(nativeWorldPlacementBinding(data, placement, wrongSignal)).toBeNull();
    });
    it('refuses nonexistent or unrelated targets rather than attaching a plausible-looking excerpt', () => {
        const data = artifact();
        expect(nativeWorldPlacementBinding(data, { output: 'crossingPower', target: 'serviceLift', x: 0, y: 0 })).toBeNull();
        expect(nativeWorldPlacementBinding(data, { output: 'invented-output', target: 'nearAnchor', x: 0, y: 0 })).toBeNull();
        expect(nativeWorldPlatformBinding(data, 'draft:invented-platform')).toBeNull();
    });
});
