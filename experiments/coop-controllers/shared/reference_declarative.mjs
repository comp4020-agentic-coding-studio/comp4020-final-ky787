/** Read-only oracle: execute the game's actual evaluator and binding resolver.
 * Usage: node experiments/coop-controllers/shared/reference_declarative.mjs handshake
 * Stdout is the complete JSON reference table. No native C is imported or interpreted.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { evaluateDraft, draftFrame, draftSignal, initialDeviceValues } from '../../../src/workbench/evaluate.ts';
import { objectPort } from '../../../src/workbench/model.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const chamber = process.argv[2];
if (!['handshake', 'deadlock', 'use-after-free'].includes(chamber)) throw new Error('Expected an authored campaign chamber ID');
const read = relative => readFileSync(resolve(root, relative));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const contractPath = `experiments/coop-controllers/${chamber}/contract.json`;
const contract = JSON.parse(read(contractPath));
for (const [path, hash] of Object.entries(contract.reference_source_sha256)) {
    if (digest(read(path)) !== hash) throw new Error(`Reference source changed: ${path}`);
}
const document = JSON.parse(read(`levels/campaign/${chamber}.json`));
if (document.controller.kind !== 'declarative') throw new Error('Expected declarative controller');
const names = contract.inputs.map(f => f.name), outputNames = contract.outputs.map(f => f.name);
if (JSON.stringify([...outputNames].sort()) !== JSON.stringify(Object.keys(document.controller.outputs).sort())) throw new Error('Contract omits or invents raw outputs');
const devices = document.geometry.objects.filter(o => o.type === 'device');
if (JSON.stringify(contract.inputs.map(f => f.game_port).sort()) !== JSON.stringify(devices.map(objectPort).sort())) throw new Error('Contract input/device set differs');
const cases = [];
for (let id = 0; id < 2 ** names.length; id++) {
    const inputs = Object.fromEntries(names.map((name, bit) => [name, (id >>> bit) & 1]));
    const values = { ...initialDeviceValues(document), ...Object.fromEntries(contract.inputs.map(f => [f.game_port, !!inputs[f.name]])) };
    const raw = evaluateDraft(document, values);
    // No exitUnlocked override: this records the current unlock decision, not a latched server door.
    const frame = draftFrame(document, values, raw);
    const expected_outputs = Object.fromEntries(outputNames.map(name => [name, Number(raw[name])]));
    const resolved_bindings = Object.fromEntries(document.bindings.map(binding => [binding.id, Number(frame.signals[draftSignal(binding.id)])]));
    cases.push({ id, inputs, expected_outputs, resolved_bindings, exit_unlock_requested: Number(frame.outputs.exitDoor) });
}
const defaults = initialDeviceValues(document);
const defaultInputs = Object.fromEntries(contract.inputs.map(f => [f.name, Number(defaults[f.game_port])]));
const all = cases.length - 1;
const sequences = [
    { id: 'all-off-on-off', scope: 'Ordered stateless snapshots; no native/server persistence is simulated', case_ids: [0, all, 0] },
    ...names.map((name, bit) => ({ id: `single-${name}-reversible`, scope: 'One canonical input rises then falls', case_ids: [0, 2 ** bit, 0, all, all ^ (2 ** bit), all] })),
];
console.log(JSON.stringify({
    schema: 'coop-native-reference/v1', chamber_id: chamber,
    reference_commit: contract.reference_commit,
    reference_implementation: ['src/workbench/evaluate.ts:evaluateDraft', 'src/workbench/evaluate.ts:draftFrame'],
    reference_source_sha256: contract.reference_source_sha256,
    contract_sha256: digest(read(contractPath)), generator_sha256: digest(readFileSync(fileURLToPath(import.meta.url))),
    runtime: process.version, input_names: names, output_names: outputNames,
    input_encoding: 'case id bit i is inputs[i]; canonical uint32 0 or 1',
    coverage: { kind: 'exhaustive_boolean', input_count: names.length, case_count: cases.length },
    initial_inputs: defaultInputs,
    cases, sequences,
    limits: ['Uses the actual game evaluator; does not execute or interpret native C.',
        'Raw outputs and once-inverted resolved bindings are separate.',
        'Exit latches, two-player arrivals, control persistence, crumble timing, occupancy arbitration and physics remain server/game responsibilities.'],
}, null, 2));
