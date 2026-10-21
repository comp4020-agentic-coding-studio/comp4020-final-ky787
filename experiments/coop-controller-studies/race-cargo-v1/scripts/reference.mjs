/** Read current independent game functions; write only new study reference observations. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { raceInputs, raceDefinition, mockRaceProjection, syncRace, advanceRace, RACE_TIMING } from '../../../../server/race-state.ts';
import { validRecord } from '../../../../server/coop-state.ts';

const study = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(study, '../../..');
const acquisition = resolve(repo, 'experiments/coop-controllers/race-condition');
const read = p => JSON.parse(readFileSync(p,'utf8'));
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const checkOnly = process.argv.includes('--check');
const save = (p,x) => {
    if (checkOnly) {
        const retained = read(resolve(study,p));
        // The recorded producer version is provenance, not the verifier's runtime.
        assert.deepEqual({...x,node:retained.node},retained);
    } else writeFileSync(resolve(study,p), JSON.stringify(x,null,2)+'\n');
};
const contract = read(resolve(acquisition,'contract.json'));
const retained = read(resolve(acquisition,'evidence/server-sequences.json'));
const phases = ['idle','window','released','expired'];
const originalInitial = retained.sequences[0].steps[0].before;
const initial = () => structuredClone(originalInitial);
const encode = ctx => {
    const i = raceInputs(ctx);
    return Object.fromEntries(contract.inputs.map(f => [f.name, Number(f.name === 'bufferPhase' ? phases.indexOf(ctx.race.buffer)
        : f.name === 'exitUnlocked' ? ctx.record.exitUnlocked : f.name === 'phaseGraceActive' ? ctx.now < ctx.race.phaseUntil
        : f.name === 'returnGraceActive' ? ctx.now < ctx.race.returnUntil : i[f.name])]));
};
const expected = ctx => {
    const p = mockRaceProjection(ctx);
    const outputs = {...p.outputs, physicalPhaseA:p.physical.phaseA,physicalPhaseB:p.physical.phaseB,
        physicalReturnBridge:p.physical.returnBridge,exitUnlockCandidate:p.unlockCandidate};
    return Object.fromEntries(contract.outputs.map(f => [f.name,Number(outputs[f.name])]));
};
const idFor = i => contract.inputs.slice(0,10).reduce((mask,f,bit)=>mask+i[f.name]*2**bit,0)*4+i.bufferPhase;
const cases = new Map();
function remember(ctx,scope) {
    const inputs=encode(ctx), id=idFor(inputs), outputs=expected(ctx);
    if (!cases.has(id)) cases.set(id,{id,inputs,expected_outputs:outputs,scope:[scope]});
    else { assert.deepEqual(cases.get(id).expected_outputs,outputs); cases.get(id).scope.push(scope); }
    return id;
}
for (let a=0;a<2;a++) for(let b=0;b<2;b++) for(let p=0;p<4;p++) {
    const ctx=initial();
    ctx.held=[a?'dropA':null,b?'dropB':null]; ctx.race.buffer=phases[p];
    // No sync: this is the total abstract snapshot function, including combinations sync would normalize.
    const id=remember(ctx,'abstract cargo product; all eight other native Boolean inputs fixed to zero');
    assert.equal(id,(a+2*b)*4+p);
}
const scenarios=[];
const stepScope='One accepted server snapshot -> one separate stateless native call; never continuous CPU execution across game time';
const contact = (ctx,acceptedCubeEpoch=1) => {
    assert.equal(ctx.race.buffer,'idle'); assert.equal(ctx.record.cubePlacements.cubeA,'spawn');
    assert.notEqual(ctx.race.contactEpoch,acceptedCubeEpoch);
    // Coordinator assignment after authorization; epoch is a fixture input,
    // not an invented increment performed by the native controller/reducer.
    ctx.race.contactEpoch=acceptedCubeEpoch; ctx.race.buffer='window'; ctx.race.deadline=ctx.now+RACE_TIMING.buffer;
};
const actions={
    'initial':()=>{}, 'drop-a-body':c=>{c.held[0]='dropA';},
    'accepted-buffer-contact-seed':c=>{contact(c,1);},
    'drop-a-released':c=>{c.held[0]=null;},
    'b-at-deadline-minus-one':c=>{c.held[1]='dropB';},
    'b-released-no-recatch':c=>{c.held[1]=null;},
    'receiver-cube':c=>{c.record.cubePlacements.cubeA='receiver';},
    'deadline-minus-one':()=>{}, 'deadline-exact-expired':()=>{},
    'b-at-deadline-after-advance':c=>{c.held[1]='dropB';}, 'deadline-plus-one':()=>{},
    'accepted-cube-reset-seed':c=>{c.record.cubePlacements.cubeA='spawn';c.race.buffer='idle';c.race.deadline=0;},
    'release-b-after-reset':c=>{c.held[1]=null;},
};
function snapshotStep(ctx,event,now,action,old=null) {
    const before=structuredClone(ctx);
    ctx.now=now;
    const timerAdvanced=advanceRace(ctx.race,now); // Actual multiplayer ordering: expiry BEFORE accepted action.
    const afterTimer=structuredClone(ctx);
    action(ctx);
    const afterAcceptedAction=structuredClone(ctx);
    syncRace(ctx);
    assert(validRecord(ctx.record,ctx.record.code));
    const projection=raceDefinition.project(ctx);
    if(old) {
        assert.deepEqual(ctx,old.after);
        assert.deepEqual(projection,old.actual_projection);
        assert.equal(Number(raceDefinition.unlock(ctx)),old.actual_unlock_candidate);
    }
    const caseId=remember(ctx,`scenario:${event}`);
    return {event,now_ms:now,scope:stepScope,case_id:caseId,
        reused_fixture_case_id:old?.case_id ?? null,
        transition_order:['advanceRace at event time','accepted semantic action (authorization excluded)','syncRace','independent mock projection and encode','separate native evaluation'],
        timer_advanced:timerAdvanced,before,after_timer:afterTimer,after_accepted_action:afterAcceptedAction,after:structuredClone(ctx),
        actual_projection:projection,expected_outputs:expected(ctx),native_inputs:encode(ctx),record_valid:true};
}
for(const id of ['buffer-release-before-deadline','buffer-expiry-before-late-b']) {
    const old=retained.sequences.find(x=>x.id===id), ctx=structuredClone(old.steps[0].before);
    const steps=old.steps.map(s=>snapshotStep(ctx,s.event,s.now_ms,actions[s.event],s));
    scenarios.push({id,kind:'retained fixture replay through current actual server functions',reused_fixture:id,steps});
}
{
    const ctx=initial(), steps=[];
    for(const [event,time,action] of [
        ['initial',1000,()=>{}], ['drop-a-body',1000,actions['drop-a-body']],
        ['accepted-buffer-contact',1000,contact], ['both-controls-held',1100,c=>{c.held[1]='dropB';}],
        ['a-released-clears-overlap',1200,actions['drop-a-released']],
        ['b-released-after-transfer',1300,actions['b-released-no-recatch']],
    ]) steps.push(snapshotStep(ctx,event,time,action));
    assert.equal(steps[3].expected_outputs.raceFirewall,1);
    assert.equal(steps[4].expected_outputs.raceFirewall,0);
    scenarios.push({id:'overlap-interlock',kind:'new ordered accepted-state fixture using current rules',steps});
}
{
    const previous=scenarios.find(s=>s.id==='buffer-expiry-before-late-b');
    const ctx=structuredClone(previous.steps.at(-1).after), steps=[];
    for(const [event,time,action] of [
        ['recovery-start-after-recorded-reset',3801,()=>{}],['second-attempt-drop-a',3900,actions['drop-a-body']],
        ['second-buffer-contact',3901,c=>contact(c,2)],['second-attempt-a-release',3902,actions['drop-a-released']],
        ['second-attempt-b-in-time',6700,actions['b-at-deadline-minus-one']],
    ]) steps.push(snapshotStep(ctx,event,time,action));
    assert.equal(steps.at(-1).after.race.buffer,'released');
    scenarios.push({id:'recovery-and-another-attempt',kind:'new continuation of retained expired/reset sequence',continues:{scenario:previous.id,step_index:previous.steps.length-1},steps});
}
const currentPaths=['server/race-state.ts','server/native/temporal.ts','server/multiplayer.ts','server/coop-state.ts','server/cube-state.ts','server/crumble-state.ts','server/level-definitions.ts','server/native/adapter.ts','server/native/contracts.ts','src/coop/protocol.ts'];
const metadata={schema:'race-cargo-reference/v1',analyzed_revision:'0810cb8c4883c5a8bd979d49612108d39329d0f8',
    historical_reference_commit:contract.reference_commit,historical_source_sha256:contract.reference_source_sha256,
    current_source_sha256:Object.fromEntries(currentPaths.map(p=>[p,sha(resolve(repo,p))])),
    generator_sha256:sha(fileURLToPath(import.meta.url)),node:process.version,
    independent_oracle:'server/race-state.ts:mockRaceProjection/raceOutputs; no lookup-table expected outputs',
    record_validation:'current validRecord; current record registry is native-integrated but projection expected outputs above are independent TypeScript',
    input_names:contract.inputs.map(f=>f.name),output_names:contract.outputs.map(f=>f.name),phases,
    abstract_combinations:16,other_inputs_for_abstract_cases:0,
    accepted_action_scope:['Contacts/placements are post-authorization fixture inputs, not simulated physics or WebSocket acceptance.',
        'Buffer-contact and cube-reset coordinator assignments are explicitly seeded from current multiplayer.ts; actual advanceRace/syncRace perform timer transitions.',
        'The recovery continuation does not test cube epoch authorization or server transport.',
        'Accepted contacts supply cube epoch 1, then 2 after the recovery reset; contactEpoch is assigned that fixture value as in multiplayer.ts, not incremented by syncRace.',
        'No source hash in the frozen acquisition is changed to match the integrated server.']};
save('evidence/current-reference.json',{...metadata,cases:[...cases.values()].sort((a,b)=>a.id-b.id)});
save('evidence/scenario-sequences.json',{...metadata,schema:'race-cargo-scenarios/v1',
    reused_fixture:{path:'experiments/coop-controllers/race-condition/evidence/server-sequences.json',sha256:sha(resolve(acquisition,'evidence/server-sequences.json'))},scenarios});
console.log(JSON.stringify({status:'PASS',mode:checkOnly?'read-only current-function replay':'produce',cases:cases.size,abstract:16,scenarios:scenarios.length,steps:scenarios.reduce((n,s)=>n+s.steps.length,0)}));
