/** Execute the pinned TypeScript evaluator on the finalized HANDSHAKE v2 draft.
 * Derived from bypass-v1/scripts/reference.mjs; see reference/identity.json.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateDraft, draftFrame, draftSignal, initialDeviceValues } from '../reference/src/workbench/evaluate.ts';
import { objectPort } from '../reference/src/workbench/model.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const bytes=p=>readFileSync(resolve(root,p));
const read=p=>JSON.parse(bytes(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const contract=read('contract.json'), identity=read('reference/identity.json');
for(const [p,r] of Object.entries(identity.files)) assert.equal(sha(bytes('reference/'+p)),r.sha256,p);
assert.equal(sha(bytes('reference/request.json')),contract.request_sha256);
assert.equal(contract.reference_commit,identity.reference_commit);
assert.equal(contract.chamber_id,'handshake-v2');
const document=read('reference/levels/drafts/handshake-v2.json');
assert.equal(sha(bytes('reference/levels/drafts/handshake-v2.json')),identity.canonical_document_sha256);
const inputNames=contract.inputs.map(f=>f.name), outputNames=contract.outputs.map(f=>f.name);
assert.deepEqual(inputNames,['crossing','liftPlate','link','maintenance','exitSocket']);
assert.deepEqual(outputNames,['crossingPower','liftPower','relayPower','firewallActive','exitReady']);
assert.deepEqual(contract.inputs.map(f=>f.game_port).sort(),document.geometry.objects.filter(o=>o.type==='device').map(objectPort).sort());
assert.deepEqual(document.controller.outputs,Object.fromEntries(contract.outputs.map(f=>[f.name,f.expression])));
assert.deepEqual(document.controller.outputs.firewallActive,{op:'not',arg:{op:'ref',id:'maintenance.value'}});
assert.deepEqual(document.controller.outputs.exitReady,{op:'ref',id:'exitSocket.occupied'});
const compact=b=>({id:b.id,output:b.output,target:b.target,property:b.property,invert:!!b.invert});
assert.deepEqual(document.bindings.map(compact),contract.bindings.map(compact));
assert(document.bindings.every(b=>!b.invert));
const cases=[];
for(let id=0;id<32;id++) {
    const inputs=Object.fromEntries(inputNames.map((name,bit)=>[name,(id>>>bit)&1]));
    const values={...initialDeviceValues(document),...Object.fromEntries(contract.inputs.map(f=>[f.game_port,!!inputs[f.name]]))};
    const raw=evaluateDraft(document,values), frame=draftFrame(document,values,raw);
    const expected_outputs=Object.fromEntries(outputNames.map(name=>[name,Number(raw[name])]));
    const resolved_bindings=Object.fromEntries(document.bindings.map(b=>[b.id,Number(frame.signals[draftSignal(b.id)])]));
    assert.equal(contract.reference_vectors[id].case_id,id);
    assert.deepEqual(Object.values(inputs),contract.reference_vectors[id].inputs);
    assert.deepEqual(Object.values(expected_outputs),contract.reference_vectors[id].outputs);
    assert.equal(expected_outputs.firewallActive,1-inputs.maintenance);
    assert.equal(expected_outputs.exitReady,inputs.exitSocket);
    assert.equal(Number(frame.outputs.exitDoor),inputs.exitSocket);
    for(const binding of document.bindings) assert.equal(resolved_bindings[binding.id],expected_outputs[binding.output]);
    cases.push({id,inputs,expected_outputs,resolved_bindings,exit_unlock_requested:Number(frame.outputs.exitDoor)});
}
// Holding each controlling bit fixed, all other Boolean choices leave its output unchanged.
for(const [output,input] of [['crossingPower','crossing'],['liftPower','liftPlate'],['relayPower','link'],['firewallActive','maintenance'],['exitReady','exitSocket']]) {
    for(const value of [0,1]) {
        const rows=cases.filter(c=>c.inputs[input]===value);
        assert.equal(rows.length,16);
        assert.equal(new Set(rows.map(c=>c.expected_outputs[output])).size,1);
    }
}
console.log(JSON.stringify({schema:'coop-native-reference/v1',chamber_id:'handshake-v2',reference_commit:contract.reference_commit,
    reference_implementation:['src/workbench/evaluate.ts:evaluateDraft','src/workbench/evaluate.ts:draftFrame'],
    reference_source_sha256:contract.reference_source_sha256,contract_sha256:sha(bytes('contract.json')),
    generator_path:'../scripts/reference.mjs',generator_sha256:sha(readFileSync(fileURLToPath(import.meta.url))),runtime:process.version,
    input_names:inputNames,output_names:outputNames,input_encoding:contract.coverage.encoding,
    coverage:{kind:'exhaustive_boolean',input_count:5,case_count:32},
    initial_inputs:Object.fromEntries(contract.inputs.map(f=>[f.name,Number(initialDeviceValues(document)[f.game_port])])),cases,sequences:[],
    limits:['Executes the committed TypeScript evaluator against the exact finalized AUTHORED draft; C and retained request vectors are not the oracle.',
        'All 32 abstract Boolean vectors are checked, including combinations physically unreachable before maintenance.',
        'Occupancy, commitments, physics, latch persistence and two distinct arrivals remain game-owned; no ordered state-machine or traversal test is claimed.',
        'This acquisition does not replace the released campaign HANDSHAKE or its historical five-input/four-output specimen.']},null,2));
