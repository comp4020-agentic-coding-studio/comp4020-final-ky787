/** Execute the exact pinned game evaluator; never import native C or moving main. */
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
const document=read('reference/levels/campaign/bypass.json');
assert.equal(sha(bytes('reference/levels/campaign/bypass.json')),identity.canonical_document_sha256);
assert.equal(sha(bytes('reference/levels/drafts/bypass.json')),identity.canonical_document_sha256);
const inputNames=contract.inputs.map(f=>f.name), outputNames=contract.outputs.map(f=>f.name);
assert.deepEqual(contract.inputs.map(f=>f.game_port).sort(),document.geometry.objects.filter(o=>o.type==='device').map(objectPort).sort());
assert(!JSON.stringify(document).includes('leftScan')&&!JSON.stringify(document).includes('rightScan'));
assert.deepEqual(document.controller.outputs,Object.fromEntries(contract.outputs.map(f=>[f.name,f.expression])));
assert.deepEqual(document.controller.outputs.exitReady,{op:'const',value:true});
const compact=b=>({id:b.id,output:b.output,target:b.target,property:b.property,invert:!!b.invert});
assert.deepEqual(document.bindings.map(compact),contract.bindings.map(compact));
const cases=[];
for(let id=0;id<16;id++) {
    const inputs=Object.fromEntries(inputNames.map((name,bit)=>[name,(id>>>bit)&1]));
    const values={...initialDeviceValues(document),...Object.fromEntries(contract.inputs.map(f=>[f.game_port,!!inputs[f.name]]))};
    const raw=evaluateDraft(document,values), frame=draftFrame(document,values,raw);
    const expected_outputs=Object.fromEntries(outputNames.map(name=>[name,Number(raw[name])]));
    const resolved_bindings=Object.fromEntries(document.bindings.map(b=>[b.id,Number(frame.signals[draftSignal(b.id)])]));
    assert.deepEqual(Object.values(expected_outputs),contract.reference_vectors[id].outputs);
    assert.equal(expected_outputs.exitReady,1); assert.equal(Number(frame.outputs.exitDoor),1);
    cases.push({id,inputs,expected_outputs,resolved_bindings,exit_unlock_requested:Number(frame.outputs.exitDoor)});
}
const sequence=[['initial',0],['anchor-hold',1],['link-accepted-while-anchor-held',3],['anchor-released-after-link',2],
    ['temporary-bypass',6],['early-bypass-release',2],['bypass-held-again',6],['override-accepted',14],['later-bypass-release',10]];
console.log(JSON.stringify({schema:'coop-native-reference/v1',chamber_id:'bypass',reference_commit:contract.reference_commit,
    reference_implementation:['src/workbench/evaluate.ts:evaluateDraft','src/workbench/evaluate.ts:draftFrame'],
    reference_source_sha256:contract.reference_source_sha256,contract_sha256:sha(bytes('contract.json')),
    generator_path:'../scripts/reference.mjs',generator_sha256:sha(readFileSync(fileURLToPath(import.meta.url))),runtime:process.version,
    input_names:inputNames,output_names:outputNames,input_encoding:contract.coverage.encoding,
    coverage:{kind:'exhaustive_boolean',input_count:4,case_count:16},
    initial_inputs:Object.fromEntries(contract.inputs.map(f=>[f.name,Number(initialDeviceValues(document)[f.game_port])])),cases,
    sequences:[{id:'accepted-commitments-and-hold-releases',scope:'Ordered decision snapshots; accepted commitments are supplied fixture state, not native persistence or server authorization.',
        case_ids:sequence.map(([,id])=>id),steps:sequence.map(([event,id])=>({event,case_id:id,...cases[id]}))}],
    constant_outputs:{exitReady:1},
    limits:['Executes the committed TypeScript evaluator against the exact revised released document; C is not the oracle.',
        'Each snapshot is a separate stateless native evaluation; no physics, occupancy authorization, commitment state machine or timer is implemented here.',
        'The exit unlock request is always true. Two physical arrivals and server latching remain separate. Crumble is authored gameplay.']},null,2));
