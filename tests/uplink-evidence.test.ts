import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { INPUT_BITS, OUTPUT_FIELDS, UPLINK_PE, UPLINK_SHA, validateUplinkBundle } from '../src/data/uplink-bundle.ts';
import { roomController, uplinkEvidence as bundle, uplinkStateKey, validatedTraceController } from '../src/slice/validated-controller.ts';
import type { ControllerInputs } from '../src/slice/controller.ts';
import { TracePlayback, bogusInstructions, evidenceDetails, machineExcerpt, provenCrumble } from '../src/slice/evidence-presentation.ts';
import { PuzzleWorld } from '../src/slice/world.ts';
import { roomById } from '../src/slice/rooms.ts';
import { freshProgress } from '../src/slice/progress.ts';
import { emptyInput } from '../src/engine/physics.ts';
import { FIXED_DT } from '../src/engine/constants.ts';
const inputNames = ['plateA', 'switchB', 'plateB', 'switchC', 'cubeOnPlateC', 'cubeOnPlate', 'cubeOnPlateB', 'plateC'] as const;
const inputs = (key: number) => Object.fromEntries(inputNames.map((name, bit) => [name, !!(key & (1 << bit))])) as unknown as ControllerInputs;

describe('retained UPLINK controller evidence', () => {
    it('pins the bytes validated by the portable verifier and keeps the runtime copy exact', () => {
        const bytes = readFileSync('game_data/uplink_controller_ollvm_bcf_v1.json');
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(UPLINK_SHA);
        const source = 'Workspace/binary_binja_redesign/game_data/uplink_controller_ollvm_bcf_v1.json';
        if (existsSync(source)) expect(bytes.equals(readFileSync(source))).toBe(true);
        expect(validateUplinkBundle(JSON.parse(bytes.toString())).identity.bcf_pe_sha256).toBe(UPLINK_PE);
    });
    it('projects all 256 physical combinations to the authoritative 32 native output frames', () => {
        for (let frontendKey = 0; frontendKey < 256; frontendKey++) {
            const i = inputs(frontendKey), key = uplinkStateKey(i);
            expect(key).toBe(frontendKey & 31);
            const row = bundle.state_table.find(r => INPUT_BITS.every(name => r.inputs[name] === Number(i[name])))!;
            const frame = roomController.evaluate('uplink', i);
            expect(frame.source).toBe('validated-trace');
            expect(frame.evidence?.stateId).toBe(row.state_id);
            expect(frame.evidence?.traceId).toBe(row.trace_id);
            expect(frame.outputs).toEqual(row.expected_outputs);
            for (const name of OUTPUT_FIELDS) expect(frame.outputs[name]).toBe(row.bcf_native.outputs[name] === 1);
        }
        for (const room of ['pressure', 'switch', 'relay'] as const) expect(roomController.evaluate(room, inputs(255)).source).toBe('mock-greybox');
        expect(() => validatedTraceController.evaluate('pressure', inputs(0))).toThrow();
    });
    it.each([
        ['schema', (b: typeof bundle) => { b.schema_version = 2; }],
        ['specimen', (b: typeof bundle) => { b.specimen_id = 'invented'; }],
        ['PE', (b: typeof bundle) => { b.identity.bcf_pe_sha256 = 'wrong'; }],
        ['coverage', (b: typeof bundle) => { b.state_table.pop(); }],
        ['duplicate key', (b: typeof bundle) => { b.state_table[1].state_id = 0; }],
        ['input encoding', (b: typeof bundle) => { b.input_contract.fields[0].bit = 2; }],
        ['missing output', (b: typeof bundle) => { b.output_contract.fields.pop(); }],
        ['native disagreement', (b: typeof bundle) => { b.state_table[0].bcf_native.outputs.exitDoor = 1; }],
        ['trace reference', (b: typeof bundle) => { b.state_table[0].trace_id = 'invented'; }],
        ['occurrence', (b: typeof bundle) => { b.traces[0].raw_occurrences[0].visit_number = 3; }],
        ['event order', (b: typeof bundle) => { b.traces[0].semantic_events.reverse(); }],
        ['fake assembly', (b: typeof bundle) => { b.traces[0].semantic_events[0].instruction_text = 'nop'; }],
        ['region mapping', (b: typeof bundle) => { b.presentation_regions[0].instruction_addresses[0] = 1; }],
        ['machine binding', (b: typeof bundle) => { b.machine_bindings[0].region_ids = ['invented']; }],
        ['clone proof', (b: typeof bundle) => { b.bogus_candidates[0].proof_id = 'invented'; }],
        ['clone assembly', (b: typeof bundle) => { b.bogus_candidates[0].instructions[0].text = 'nop'; }],
        ['string claims', (b: typeof bundle) => { b.presentation_messages.decoded_by_binary = true; }],
    ])('rejects inconsistent %s rather than falling back', (_, mutate) => {
        const changed = structuredClone(bundle); mutate(changed);
        expect(() => validateUplinkBundle(changed)).toThrow('Invalid validated UPLINK bundle');
    });
    it('shows only mapped real assembly, including the actual commit, for every state and binding', () => {
        for (const trace of bundle.traces) for (const binding of bundle.machine_bindings) {
            const lines = machineExcerpt(binding.id, trace);
            const event = trace.semantic_events.find(e => e.output === binding.signal)!;
            expect(lines.length).toBeGreaterThanOrEqual(3); expect(lines.length).toBeLessThanOrEqual(6);
            expect(lines.some(i => i.address === event.instruction_address)).toBe(true);
            const addresses = bundle.presentation_regions.filter(r => binding.region_ids.includes(r.id)).flatMap(r => r.instruction_addresses);
            for (const line of lines) {
                expect(addresses).toContain(line.address);
                expect(line).toEqual(bundle.raw.instructions.find(i => i.address === line.address));
            }
        }
        const room = roomById('uplink');
        for (const binding of bundle.machine_bindings) {
            const obj = binding.frontend_object;
            if (obj.collection === 'platforms') expect(room.platforms.find(p => p.id === obj.id)?.signal).toBe(binding.signal);
            else if (obj.collection === 'gates') expect(room.gates!.find(p => p.id === obj.id)?.signal).toBe(binding.signal);
            else if (obj.collection === 'lifts') expect(room.lifts!.find(p => p.id === obj.id)?.signal).toBe(binding.signal);
            else expect(obj.property).toBe('exit');
        }
    });
    it('replays real chronological commits including repeated visits and does not delay the output frame', () => {
        for (let key = 0; key < 32; key++) {
            const frame = validatedTraceController.evaluate('uplink', inputs(key));
            const replay = new TracePlayback(); replay.update(frame, 0);
            expect(replay.events).toEqual([]);
            expect(frame.outputs).toEqual(bundle.state_table[key].expected_outputs);
            const seen: string[] = [];
            for (let n = 0; n < 600; n++) {
                replay.update(frame, 1 / 180);
                for (const event of replay.events) if (!seen.includes(event.id)) seen.push(event.id);
                if (replay.occurrence) expect(replay.trace!.raw_occurrences).toContain(replay.occurrence);
            }
            expect(seen).toEqual(replay.trace!.semantic_events.map(e => e.id));
            const next = validatedTraceController.evaluate('uplink', inputs((key + 1) % 32));
            replay.update(next, 0);
            expect(replay.step).toBe(0); expect(replay.events).toEqual([]);
            expect(replay.trace!.id).toBe(next.evidence!.traceId);
        }
        for (const t of bundle.traces) expect(new Set(t.raw_occurrences.map(o => o.id)).size).toBe(t.raw_occurrences.length);
        // This specimen has no repeated raw visits; preserve the exported visit identity anyway.
    });
    it('links the optional crumble to actual clone proof, keeps all instructions, and recovers safely', () => {
        const room = roomById('uplink'), p = room.platforms.find(p => p.id === 'proven-clone')!;
        expect(p.evidenceId).toBe(provenCrumble.proof_id);
        expect(bundle.proof_evidence.clones.some(c => c.id === p.evidenceId)).toBe(true);
        expect(bogusInstructions().map(i => `${i.mnemonic} ${i.op_str}`.trim())).toEqual(provenCrumble.instructions.map(i => i.text));
        expect(evidenceDetails(provenCrumble.id, bundle.traces[0])).toContain('PROVEN BOGUS');
        const w = new PuzzleWorld(room, freshProgress().rooms.uplink);
        Object.assign(w.player, { x: 2320, y: 710, vy: 20 });
        const tick = (n: number) => { for (let i = 0; i < n; i++) w.step(FIXED_DT, emptyInput()); };
        tick(20); expect(w.player.groundId).toBe(p.id);
        tick(140); expect(w.player.groundId).toBe('far'); expect(w.deaths).toBe(0);
        expect(w.platforms.find(s => s.def.id === p.id)!.solid.enabled).toBe(false);
        tick(300); expect(w.platforms.find(s => s.def.id === p.id)!.solid.enabled).toBe(true);
        expect(w.frame.outputs.exitDoor).toBe(false);
    });
    it.each([
        { checkpoint: 'relay' as const, switchB: true, cubeOnPlate: true },
        { checkpoint: 'upper' as const, switchB: true, switchC: true, cubeOnPlateB: true, cubeTransferred: true },
        { checkpoint: 'upper' as const, switchB: true, switchC: true, cubeOnPlateC: true, cubeTransferred: true },
    ])('reconstructs the validated frame at saved $checkpoint', memory => {
        const w = new PuzzleWorld(roomById('uplink'), { ...freshProgress().rooms.uplink, ...memory });
        const restored = new PuzzleWorld(roomById('uplink'), JSON.parse(JSON.stringify(w.memory())));
        expect(restored.frame).toEqual(w.frame); expect(restored.frame.source).toBe('validated-trace');
        expect(restored.frame.outputs).toEqual(bundle.state_table[uplinkStateKey(restored.inputs)].expected_outputs);
        expect(JSON.stringify(w.memory())).not.toMatch(/trace|velocity|animation|seconds/);
    });
});
