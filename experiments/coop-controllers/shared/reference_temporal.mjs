/** Actual current game oracle for temporal chambers.
 * node experiments/coop-controllers/shared/reference_temporal.mjs <chamber> --init
 * --init writes the initial contract/header; omit it for hash-pinned regeneration.
 * Expected outputs come only from imported game project/unlock functions.
 * Synthetic exhaustive contexts cover a total abstract snapshot function, not
 * reachable two-player gameplay. Ordered fixtures retain actual valid records.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crossfeedInputs, crossfeedDefinition as cf, freshCrossfeed, syncCrossfeed, advanceCrossfeed, CROSSFEED_TIMING } from '../../../server/crossfeed-state.ts';
import { raceInputs, raceDefinition as race, freshRace, syncRace, advanceRace, RACE_TIMING } from '../../../server/race-state.ts';
import { freshCrumble, advanceCrumble } from '../../../server/crumble-state.ts';
import { newRecord, validRecord, readRoomRecord } from '../../../server/coop-state.ts';
import { crossfeedVault } from '../../../src/coop/crossfeed-vault.ts';
import { raceCondition } from '../../../src/coop/race-condition.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const chamber = process.argv[2], isCF = chamber === 'crossfeed-vault';
assert(['crossfeed-vault', 'race-condition'].includes(chamber));
const base = resolve(ROOT, 'experiments/coop-controllers', chamber);
const referenceCommit = '1315c3616ce5ac939baf913f9b09b4ebad34132a';
const rule = isCF ? cf : race, extractor = isCF ? crossfeedInputs : raceInputs;
const phases = ['idle', 'window', 'released', 'expired'];
const sha = b => createHash('sha256').update(b).digest('hex');
const read = p => readFileSync(resolve(ROOT, p));
const save = (p, value, compressed = false) => {
    const bytes = Buffer.from(JSON.stringify(value, null, compressed ? 0 : 2) + '\n');
    writeFileSync(resolve(base, p), compressed ? gzipSync(bytes, { level: 9 }) : bytes);
};
const inputSpecs = isCF ? [
    ['switchB', 'Persisted reversible TRANSFER MODE toggle'],
    ['switchC', 'Persisted SYSTEM ONLINE terminal latch'],
    ['switchD', 'Persisted GALLERY ACCESS terminal latch'],
    ['routeMode', 'Persisted ROUTE SELECT toggle'],
    ['plateAOccupied', 'entry ordinary plate: body or cube'],
    ['routePowerOccupied', 'routePower ordinary plate: body or cube'],
    ['cubeOnLiftCargo', 'At least one cube in liftCargo socket'],
    ['cubeOnFinalLeft', 'At least one cube in finalLeft socket'],
    ['cubeOnFinalRight', 'At least one cube in finalRight socket'],
    ['finalPlateLeftOccupied', 'Body-only finalLeft scanner occupancy; distinct from socket'],
    ['finalPlateRightOccupied', 'Body-only finalRight scanner occupancy; distinct from socket'],
    ['exitUnlocked', 'Existing durable server exit latch'],
    ['leftGraceActive', 'Server now < crossfeed.leftUntil; clock not evaluated in native code'],
    ['rightGraceActive', 'Server now < crossfeed.rightUntil; clock not evaluated in native code'],
] : [
    ['dropA', 'dropA ordinary plate occupied by body or cube'],
    ['dropB', 'dropB ordinary plate occupied by body or cube'],
    ['payloadDelivered', 'receiver ordinary plate occupied by body or cube; not a permanent delivery bit'],
    ['traceOccupied', 'trace ordinary plate occupied by body or cube'],
    ['phase', 'Persisted reversible PHASE toggle'],
    ['returnOccupied', 'return ordinary plate occupied by body or cube'],
    ['finalControl', 'Persisted COMMIT terminal latch'],
    ['exitUnlocked', 'Existing durable server exit latch'],
    ['phaseGraceActive', 'Server now < race.phaseUntil; phase overlap still requires master power'],
    ['returnGraceActive', 'Server now < race.returnUntil'],
    ['bufferPhase', 'Server buffer phase: 0 idle, 1 window, 2 released, 3 expired'],
];
const rawOutputs = isCF ? ['grappleAnchor','bridge','liftField','serviceAccess','relayGates','leftRoute','rightRoute','galleryAccess','vaultPower','vaultReturn','exitDoor']
    : ['topBridge','bufferBridge','safetyFirewall','raceFirewall','spanMaster','phaseA','phaseB','returnBridge','exitDoor'];
const physical = isCF ? { physicalLeftRoute: 'leftRoute', physicalRightRoute: 'rightRoute' }
    : { physicalPhaseA: 'phaseA', physicalPhaseB: 'phaseB', physicalReturnBridge: 'returnBridge' };
const names = inputSpecs.map(x => x[0]), outputNames = [...rawOutputs,...Object.keys(physical),'exitUnlockCandidate'];
const limits = [
    'Exhaustive cases are synthetic abstract projections, not a claim that all vectors are reachable with two players and two cubes.',
    'Synthetic contexts may exceed two body contacts or two cube entries and may combine runtime flags that sync would normalize. Every abstract input is nevertheless roundtripped through the actual current extractor/status projection.',
    'Ordered fixtures use valid current records, exactly cubeA/cubeB and two body slots. They test reducers and snapshots, not geometry/reachability, WebSocket authorization, cube ownership or epoch acceptance.',
    'Native code is stateless: it does not advance clocks, set latches, persist records, process arrivals, schedule crumble or authorize actions.',
    'Raw signals, grace-inclusive physical power, current unlock candidate and existing durable exit door are separate outputs.',
    'Crumble remains authored gameplay timing. Its warning/broken/stable observations are server evidence, never OLLVM/bogus-block evidence.',
];
const room = (isCF ? crossfeedVault : raceCondition)(1);
const bindings = [];
for (const [collection, objects] of [['platforms',room.platforms],['lifts',room.lifts],['gates',room.gates],['firewalls',room.firewalls]]) {
    for (const object of objects ?? []) for (const property of ['signal','openWhen']) {
        if (!object[property]) continue;
        const output = object[property]; assert(rawOutputs.includes(output));
        const physicalOutput = Object.keys(physical).find(k => physical[k] === output);
        bindings.push({ id: `${collection}:${object.id}:${property}`, output, target: object.id, collection, property, invert: false,
            ...(physicalOutput ? { physical_output: physicalOutput } : {}),
            ...(object.kind === 'crumble-prototype' ? { additional_server_constraint: 'authored crumble warning/broken/stable runtime' } : {}),
            resolution: property === 'openWhen' ? 'True opens/removes this static barrier' : 'Direct resolved signal; any physical_output is the grace-inclusive power projection',
        });
    }
}
bindings.push({ id:'exit', output:'exitDoor', target:'exit', property:'unlocked', invert:false, resolution:'Existing server latch; player arrivals and party completion remain server-owned' });
const sourceFiles = [isCF ? 'server/crossfeed-state.ts' : 'server/race-state.ts', 'server/crumble-state.ts', 'server/coop-state.ts', 'server/multiplayer.ts', 'src/coop/protocol.ts', `src/coop/${chamber}.ts`, `docs/${chamber}.md`, 'docs/adr/0008-reversible-coop-machinery.md'];
const reference_source_sha256 = Object.fromEntries(sourceFiles.map(p => [p, sha(read(p))]));
const exhaustiveRows = isCF ? 16384 : 4096;
const inputEncoding = isCF ? 'numeric case id bit i is inputs[i]' : 'numeric case id = (10-Boolean mask << 2) | bufferPhase; Boolean bit i is inputs[i] for i < 10';
const contract = {
    schema:'coop-native-contract/v1', chamber_id:chamber, reference_commit:referenceCommit,
    reference_kind:'actual_server_projection_and_reducers', reference_source_sha256,
    abi:{target:'bn_evaluate',architecture:'Windows x64',calling_convention:'Microsoft x64',input_register:'RCX',output_register:'RDX',return_type:'void',input_size:names.length*4,output_size:outputNames.length*4,endianness:'little',alignment:4,stateful:false},
    inputs:inputSpecs.map(([name,meaning],i)=>({name,offset:4*i,width_bits:32,domain:name==='bufferPhase'?[0,1,2,3]:[0,1],meaning,initial:0,...(name==='bufferPhase'?{enum:Object.fromEntries(phases.map((v,i)=>[i,v]))}:{bit:i})})),
    outputs:outputNames.map((name,i)=>({name,offset:4*i,width_bits:32,domain:[0,1],kind:name==='exitUnlockCandidate'?'unlock_candidate':physical[name]?'physical_projection':name==='exitDoor'?'persisted_latch_projection':'raw_combinational',
        meaning:name==='exitUnlockCandidate'?'Current actual definition.unlock(ctx) predicate; does not itself set the server latch':physical[name]?`Current actual project(ctx).physical.${physical[name]}`:name==='exitDoor'?'Existing record.exitUnlocked; stays true after inputs are removed':`Current actual project(ctx).outputs.${name}`,
        ...(rawOutputs.includes(name)?{game_signal:name}:{})})),
    bindings,
    coverage:{kind:'exhaustive_abstract_projection',input_count:names.length,exhaustive_row_count:exhaustiveRows,row_count:exhaustiveRows,encoding:inputEncoding,reachability:'Full abstract input product; runtime and finite-actor constraints are not asserted for synthetic contexts'},
    initial_state:{inputs:Object.fromEntries(names.map(n=>[n,0])),native_outputs:'Every output written on every stateless invocation',harness_output_sentinel:0xA5A5A5A5},
    server_owned:['Input occupancy arbitration and body/cube authority','Timer deadlines and status extraction','Control acceptance, cooldown and persisted latches','Checkpoint and persisted semantic cube placement','Exit latch updates, player arrivals and party completion','Crumble runtime and physics/collision geometry'],
    timer_contract:isCF?{handover_ms:CROSSFEED_TIMING.handover,toggle_interval_ms:CROSSFEED_TIMING.toggleInterval,crumble_warning_ms:CROSSFEED_TIMING.fake,crumble_broken_ms:2400}:{buffer_ms:RACE_TIMING.buffer,handover_ms:RACE_TIMING.handover,toggle_interval_ms:RACE_TIMING.toggleInterval,crumble_warning_ms:RACE_TIMING.fake,crumble_broken_ms:2400,buffer_phase_enum:Object.fromEntries(phases.map((v,i)=>[i,v]))},
    exit_semantics:{existing_latch:'exitDoor',current_candidate:'exitUnlockCandidate',coordinator:'server/multiplayer.ts:commitAction calls actual definition.unlock and then sets record.exitUnlocked=true; arrivals remain separate'},
    limits,integration_status:'acquisition_only; live campaign remains unchanged',
};
mkdirSync(resolve(base,'src'),{recursive:true}); mkdirSync(resolve(base,'evidence'),{recursive:true});
if (process.argv.includes('--init')) {
    save('contract.json',contract);
    const guard='BN_'+chamber.toUpperCase().replaceAll('-','_')+'_CONTROLLER_H';
    const fields=(type,ns)=>`typedef struct ${type} {\n${ns.map(n=>`    uint32_t ${n};`).join('\n')}\n} ${type};\n`;
    const offsets=(type,ns)=>ns.map((n,i)=>`_Static_assert(offsetof(${type}, ${n}) == ${i*4}, "${type}.${n} offset");`).join('\n');
    writeFileSync(resolve(base,'src/controller.h'),`#ifndef ${guard}\n#define ${guard}\n#include <stdint.h>\n#include <stddef.h>\n\n${fields('ControllerInputs',names)}\n${fields('ControllerOutputs',outputNames)}\n_Static_assert(sizeof(ControllerInputs) == ${4*names.length}, "Input ABI size");\n_Static_assert(sizeof(ControllerOutputs) == ${4*outputNames.length}, "Output ABI size");\n${offsets('ControllerInputs',names)}\n${offsets('ControllerOutputs',outputNames)}\n__declspec(dllexport) __declspec(noinline)\nvoid bn_evaluate(const ControllerInputs *inputs, ControllerOutputs *outputs);\n#endif\n`);
} else {
    assert.deepEqual(JSON.parse(readFileSync(resolve(base,'contract.json'),'utf8')),contract,'Frozen contract/source identities changed');
}

function extracted(ctx) {
    return Object.fromEntries(names.map(name=>[name, name==='exitUnlocked'?Number(ctx.record.exitUnlocked):name==='leftGraceActive'?Number(ctx.now<ctx.crossfeed.leftUntil):name==='rightGraceActive'?Number(ctx.now<ctx.crossfeed.rightUntil):name==='phaseGraceActive'?Number(ctx.now<ctx.race.phaseUntil):name==='returnGraceActive'?Number(ctx.now<ctx.race.returnUntil):name==='bufferPhase'?phases.indexOf(ctx.race.buffer):Number(extractor(ctx)[name])]));
}
function expected(ctx) {
    const project=rule.project(ctx);
    assert.deepEqual(Object.keys(project.outputs).sort(),[...rawOutputs].sort());
    const outputs={...project.outputs,...Object.fromEntries(Object.entries(physical).map(([name,signal])=>[name,project.physical[signal]])),exitUnlockCandidate:rule.unlock(ctx)};
    for (const name of outputNames) assert.equal(typeof outputs[name],'boolean',`Non-Boolean actual output ${name}`);
    return Object.fromEntries(outputNames.map(n=>[n,Number(outputs[n])]));
}
function synthetic(inputs) {
    const a=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,k==='bufferPhase'?v:!!v]));
    const occupied=isCF?[['plateAOccupied','entry'],['routePowerOccupied','routePower'],['finalPlateLeftOccupied','finalLeft'],['finalPlateRightOccupied','finalRight']]
        :[['dropA','dropA'],['dropB','dropB'],['payloadDelivered','receiver'],['traceOccupied','trace'],['returnOccupied','return']];
    const cubes=isCF?[['cubeOnLiftCargo','liftCargo'],['cubeOnFinalLeft','finalLeft'],['cubeOnFinalRight','finalRight']]:[];
    return {record:{level:chamber,levelState:a,exitUnlocked:a.exitUnlocked,cubePlacements:Object.fromEntries(cubes.filter(([k])=>a[k]).map(([,v],i)=>[`abstractCube${i}`,v]))},
        held:occupied.filter(([k])=>a[k]).map(([,v])=>v),now:1000,crumble:freshCrumble(),
        crossfeed:{...freshCrossfeed(),leftUntil:a.leftGraceActive?1001:0,rightUntil:a.rightGraceActive?1001:0},
        race:{...freshRace(),buffer:phases[a.bufferPhase??0],phaseUntil:a.phaseGraceActive?1001:0,returnUntil:a.returnGraceActive?1001:0}};
}
const cases=[];
for(let id=0;id<exhaustiveRows;id++) {
    const mask=isCF?id:id>>>2;
    const inputs=Object.fromEntries(names.map((n,i)=>[n,n==='bufferPhase'?id&3:(mask>>>i)&1]));
    const ctx=synthetic(inputs); assert.deepEqual(extracted(ctx),inputs,`Abstract input roundtrip ${id}`);
    cases.push({id,inputs,expected_outputs:expected(ctx)});
}

// Ordered tests use actual reducers. Event-fixture plumbing below changes accepted
// contacts/placements and server-owned state; it never computes expected outputs.
const visitorA='11111111-1111-4111-8111-111111111111', visitorB='22222222-2222-4222-8222-222222222222';
function fresh() {
    const record=newRecord('ABCD',visitorA,chamber,'2026-10-17T00:00:00.000Z'); record.visitors[1]=visitorB;
    return {record,held:[null,null],now:1000,crossfeed:freshCrossfeed(),race:freshRace(),crumble:freshCrumble()};
}
const sequences=[], detailed=[];
function scenario(id, run) {
    let ctx=fresh(); const rows=[], steps=[];
    function step(label, change=()=>{}, check=()=>{}) {
        const before=structuredClone(ctx), result=change(ctx);
        syncRace(ctx); syncCrossfeed(ctx);
        assert.equal(ctx.held.length,2); assert.deepEqual(Object.keys(ctx.record.cubePlacements).sort(),['cubeA','cubeB']);
        assert(validRecord(ctx.record,'ABCD'),`Invalid ordered record ${id}:${label}`);
        for (const p of ctx.held) assert(rule.acceptsPlate(p,ctx.record));
        const project=rule.project(ctx); check(ctx,project,result);
        const caseId=`seq:${id}:${label}`;
        const row={id:caseId,inputs:extracted(ctx),expected_outputs:expected(ctx)};
        assert.deepEqual(extracted(synthetic(row.inputs)),row.inputs);
        cases.push(row); rows.push(caseId);
        steps.push({case_id:caseId,event:label,now_ms:ctx.now,action_result:result??null,before,after:structuredClone(ctx),actual_projection:project,actual_unlock_candidate:Number(rule.unlock(ctx)),record_valid:true});
    }
    const time=(t)=>{ctx.now=t;advanceRace(ctx.race,t);advanceCrossfeed(ctx.crossfeed,t);advanceCrumble(ctx.crumble,t);};
    const action=(control)=>rule.action(ctx,{type:'control',control});
    const reload=()=>{const persisted=JSON.parse(JSON.stringify(ctx.record)); const loaded=readRoomRecord(persisted,'ABCD');assert(loaded);ctx={...fresh(),record:loaded,now:ctx.now};};
    run({step,time,action,reload,get:()=>ctx});
    const scope='Ordered actual exported server reducers and project/unlock; accepted semantic contacts/placements supplied by fixture, transport authorization/geometry excluded';
    sequences.push({id,scope,case_ids:rows}); detailed.push({id,scope,steps});
}
const eq=(a,b)=>assert.deepEqual(a,b);
if(isCF) {
    scenario('service-and-independent-checkpoint',({step,action,get})=>{
        step('initial');
        step('body-entry',c=>c.held[0]='entry',(_,p)=>eq(p.outputs.grappleAnchor,true));
        step('toggle-transfer',()=>action('switchB'),(_,p)=>eq([p.outputs.bridge,p.outputs.grappleAnchor],[true,false]));
        step('cube-cargo',c=>c.record.cubePlacements.cubeA='liftCargo',(_,p)=>eq(p.outputs.liftField,true));
        step('remove-cargo',c=>c.record.cubePlacements.cubeA='spawn',(_,p)=>eq(p.outputs.liftField,false));
        step('terminal-system',()=>action('switchC'),(c,p)=>eq([c.record.checkpoint,p.outputs.liftField,p.outputs.serviceAccess],['entry',true,true]));
        step('checkpoint',()=>cf.action(get(),{type:'checkpoint',breakpoint:'system-online'}),(c)=>eq(c.record.checkpoint,'upper'));
        step('toggle-transfer-off',()=>action('switchB'),(_,p)=>eq(p.outputs.relayGates,true));
        step('gallery-terminal',()=>action('switchD'),(_,p)=>eq([p.outputs.galleryAccess,p.outputs.leftRoute,p.outputs.rightRoute],[true,false,false]));
    });
    scenario('routes-grace-cooldown-and-crumble',({step,time,action,get})=>{
        step('select-before-power',()=>action('routeMode'),(_,p)=>eq([p.outputs.leftRoute,p.outputs.rightRoute],[false,false]));
        step('system',()=>action('switchC'));
        step('power-right',c=>c.held[0]='routePower',(_,p)=>eq(p.outputs.rightRoute,true));
        step('crumble-warning',()=>cf.action(get(),{type:'crumble-trigger',platform:'crumbleB',trigger:'hook'}),(_,p,r)=>eq([r,p.platforms.crumbleB.phase],[true,'warning']));
        step('toggle-649-rejected',()=>{time(1649);return action('routeMode');},(_,p,r)=>eq([r,p.outputs.rightRoute],[false,true]));
        step('toggle-650-accepted',()=>{time(1650);return action('routeMode');},(c,p,r)=>eq([r,p.outputs.leftRoute,p.outputs.rightRoute,p.physical.rightRoute,c.crossfeed.rightUntil],[true,true,false,true,1975]));
        step('grace-324',()=>time(1974),(c,p)=>eq([p.physical.rightRoute,c.crossfeed.rightUntil],[true,1975]));
        step('grace-325',()=>time(1975),(_,p)=>eq(p.physical.rightRoute,false));
        step('next-toggle-649-rejected',()=>{time(2299);return action('routeMode');},(_,__,r)=>eq(r,false));
        step('next-toggle-650',()=>{time(2300);return action('routeMode');},(_,p,r)=>eq([r,p.outputs.rightRoute],[true,true]));
        step('power-removed',c=>{time(2400);c.held[0]=null;},(c,p)=>eq([p.outputs.rightRoute,p.physical.rightRoute,c.crossfeed.rightUntil],[false,true,2725]));
        step('snapshot-no-extension',()=>time(2500),(c)=>eq(c.crossfeed.rightUntil,2725));
        step('power-restored',c=>{time(2550);c.held[0]='routePower';},c=>eq(c.crossfeed.rightUntil,0));
        step('fuse-1649',()=>time(2649),(_,p)=>eq(p.platforms.crumbleB.phase,'warning'));
        step('fuse-1650',()=>time(2650),(_,p)=>eq(p.platforms.crumbleB.phase,'broken'));
        step('broken-2399',()=>time(5049),(_,p)=>eq(p.platforms.crumbleB.phase,'broken'));
        step('broken-2400',()=>time(5050),(_,p)=>eq(p.platforms.crumbleB.phase,'stable'));
    });
    scenario('payload-scanners-latch-and-restart',({step,action,reload})=>{
        step('system',()=>action('switchC'));
        step('gallery',()=>action('switchD'));
        step('left-payload',c=>c.record.cubePlacements.cubeA='finalLeft',(_,p)=>eq(p.outputs.vaultPower,false));
        step('right-payload',c=>c.record.cubePlacements.cubeB='finalRight',(c,p)=>eq([p.outputs.vaultPower,p.outputs.vaultReturn,cf.unlock(c)],[true,true,false]));
        step('left-body',c=>c.held[0]='finalLeft',c=>eq(cf.unlock(c),false));
        step('right-body-candidate',c=>c.held[1]='finalRight',(c,p)=>eq([cf.unlock(c),p.outputs.exitDoor],[true,false]));
        step('coordinator-latch',c=>{assert(cf.unlock(c));c.record.exitUnlocked=true;},(_,p)=>eq(p.outputs.exitDoor,true));
        step('payload-removed',c=>c.record.cubePlacements.cubeB='spawn',(c,p)=>eq([cf.unlock(c),p.outputs.vaultPower,p.outputs.exitDoor],[false,false,true]));
        step('restart-readRoomRecord',()=>reload(),(c,p)=>eq([c.held,c.record.levelState.switchC,c.record.levelState.switchD,p.outputs.exitDoor,c.crossfeed],[[null,null],true,true,true,freshCrossfeed()]));
    });
} else {
    const seedWindow=c=>{assert.equal(c.race.buffer,'idle');c.race.contactEpoch=1;c.race.buffer='window';c.race.deadline=c.now+RACE_TIMING.buffer;};
    scenario('buffer-release-before-deadline',({step,time})=>{
        step('initial');
        step('drop-a-body',c=>c.held[0]='dropA',(_,p)=>eq(p.outputs.topBridge,false));
        step('accepted-buffer-contact-seed',seedWindow,(_,p)=>eq(p.buffer.phase,'window'));
        step('drop-a-released',c=>c.held[0]=null,(_,p)=>eq(p.outputs.topBridge,true));
        step('b-at-deadline-minus-one',c=>{time(3799);c.held[1]='dropB';},(_,p)=>eq([p.buffer.phase,p.outputs.safetyFirewall],['released',false]));
        step('b-released-no-recatch',c=>c.held[1]=null,(_,p)=>eq([p.buffer.phase,p.outputs.bufferBridge],['released',false]));
        step('receiver-cube',c=>c.record.cubePlacements.cubeA='receiver',(c,p)=>eq([p.buffer.phase,c.record.checkpoint],['idle','reunion']));
    });
    scenario('buffer-expiry-before-late-b',({step,time})=>{
        step('accepted-buffer-contact-seed',seedWindow);
        step('deadline-minus-one',()=>time(3799),(_,p)=>eq(p.buffer.phase,'window'));
        step('deadline-exact-expired',()=>time(3800),(_,p)=>eq([p.buffer.phase,p.outputs.safetyFirewall],['expired',true]));
        step('b-at-deadline-after-advance',c=>c.held[1]='dropB',(_,p)=>eq([p.buffer.phase,p.outputs.safetyFirewall,p.outputs.bufferBridge],['expired',true,false]));
        step('deadline-plus-one',()=>time(3801),(_,p)=>eq(p.buffer.phase,'expired'));
        step('accepted-cube-reset-seed',c=>{c.record.cubePlacements.cubeA='spawn';c.race.buffer='idle';c.race.deadline=0;},(_,p)=>eq(p.buffer.phase,'idle'));
        step('release-b-after-reset',c=>c.held[1]=null,(_,p)=>eq(p.outputs.bufferBridge,true));
    });
    scenario('phase-master-grace-cooldown-and-crumble',({step,time,action,get})=>{
        step('receiver-and-trace',c=>{c.record.cubePlacements.cubeA='receiver';c.held[0]='trace';},(_,p)=>eq([p.outputs.phaseA,p.outputs.phaseB],[true,false]));
        step('phase-toggle',()=>action('phase'),(_,p,r)=>eq([r,p.outputs.phaseA,p.outputs.phaseB,p.physical.phaseA,p.physical.phaseB],[true,false,true,true,true]));
        step('crumble-warning',()=>race.action(get(),{type:'crumble-trigger',platform:'crumbleA',trigger:'foot'}),(_,p,r)=>eq([r,p.platforms.crumbleA.phase],[true,'warning']));
        step('grace-349',()=>time(1349),(_,p)=>eq(p.physical.phaseA,true));
        step('grace-350',()=>time(1350),(_,p)=>eq(p.physical.phaseA,false));
        step('toggle-649-rejected',()=>{time(1649);return action('phase');},(_,__,r)=>eq(r,false));
        step('toggle-650',()=>{time(1650);return action('phase');},(_,p,r)=>eq([r,p.outputs.phaseA,p.physical.phaseB],[true,true,true]));
        step('master-removed-during-grace',c=>{time(1651);c.held[0]=null;},(_,p)=>eq([p.outputs.spanMaster,p.physical.phaseA,p.physical.phaseB],[false,false,false]));
        step('master-restored-during-grace',c=>{time(1652);c.held[0]='trace';},(_,p)=>eq([p.physical.phaseA,p.physical.phaseB],[true,true]));
        step('fuse-1549',()=>time(2549),(_,p)=>eq(p.platforms.crumbleA.phase,'warning'));
        step('fuse-1550',()=>time(2550),(_,p)=>eq(p.platforms.crumbleA.phase,'broken'));
        step('broken-2399',()=>time(4949),(_,p)=>eq(p.platforms.crumbleA.phase,'broken'));
        step('broken-2400',()=>time(4950),(_,p)=>eq(p.platforms.crumbleA.phase,'stable'));
    });
    scenario('return-grace-and-cube-substitution',({step,time})=>{
        step('body-return',c=>c.held[1]='return');
        step('body-leaves',c=>{time(1100);c.held[1]=null;},(c,p)=>eq([p.outputs.returnBridge,p.physical.returnBridge,c.race.returnUntil],[false,true,1450]));
        step('repeat-snapshot',()=>time(1200),c=>eq(c.race.returnUntil,1450));
        step('return-349',()=>time(1449),(_,p)=>eq(p.physical.returnBridge,true));
        step('return-350',()=>time(1450),(_,p)=>eq(p.physical.returnBridge,false));
        step('cube-substitutes',c=>c.record.cubePlacements.cubeB='return',(c,p)=>eq([p.outputs.returnBridge,c.race.returnUntil],[true,0]));
        step('cube-removed',c=>c.record.cubePlacements.cubeB='spawn',(_,p)=>eq([p.outputs.returnBridge,p.physical.returnBridge],[false,true]));
    });
    scenario('commit-payload-latch-and-restart',({step,action,reload})=>{
        step('commit-before-payload',()=>action('commit'),c=>eq(race.unlock(c),false));
        step('payload-delivered',c=>c.record.cubePlacements.cubeA='receiver',(c,p)=>eq([race.unlock(c),p.outputs.exitDoor,c.record.checkpoint],[true,false,'reunion']));
        step('coordinator-latch',c=>{assert(race.unlock(c));c.record.exitUnlocked=true;},(_,p)=>eq(p.outputs.exitDoor,true));
        step('phase-set',()=>action('phase'));
        step('restart-delivered',()=>reload(),(c,p)=>eq([c.held,c.record.levelState.phase,c.record.levelState.finalControl,p.inputs.payloadDelivered,p.buffer.phase,p.outputs.exitDoor],[[null,null],true,true,true,'idle',true]));
        step('payload-removed',c=>c.record.cubePlacements.cubeA='spawn',(c,p)=>eq([race.unlock(c),p.outputs.spanMaster,p.outputs.exitDoor],[false,false,true]));
        step('restart-without-payload',()=>reload(),(c,p)=>eq([c.record.checkpoint,p.inputs.payloadDelivered,p.outputs.exitDoor,c.race],['reunion',false,true,freshRace()]));
    });
}
const metadata={schema:'coop-native-reference/v1',chamber_id:chamber,reference_commit:referenceCommit,
    reference_implementation:[`server/${isCF?'crossfeed':'race'}-state.ts:definition.project/definition.unlock/definition.action/sync/advance`,'server/crumble-state.ts:advanceCrumble','server/coop-state.ts:validRecord/readRoomRecord'],
    reference_source_sha256,contract_sha256:sha(readFileSync(resolve(base,'contract.json'))),generator_path:'experiments/coop-controllers/shared/reference_temporal.mjs',generator_sha256:sha(readFileSync(fileURLToPath(import.meta.url))),runtime:process.version,input_names:names,output_names:outputNames,input_encoding:inputEncoding,
    coverage:{kind:'exhaustive_abstract_projection_plus_ordered_reducers',input_count:names.length,exhaustive_row_count:exhaustiveRows,sequence_snapshot_count:cases.length-exhaustiveRows,case_count:cases.length,all_abstract_inputs_roundtripped:true,all_ordered_records_valid:true},initial_inputs:contract.initial_state.inputs,limits};
save('evidence/reference-vectors.json.gz',{...metadata,cases,sequences},true);
save('evidence/server-sequences.json',{...metadata,schema:'coop-server-sequences/v1',coordinator_scope:['Accepted body contacts and cube semantic placements are fixture inputs, not a WebSocket reimplementation.','RACE buffer contact/reset seed the post-authorization runtime documented in server/multiplayer.ts:264-285; authority/epoch rejection is excluded.','coordinator-latch assigns the existing durable latch only after actual definition.unlock succeeds, matching server/multiplayer.ts:321-322. The prior candidate snapshot is intentionally pre-latch.','Restart serializes and validates the actual record with readRoomRecord, recreates fresh runtime and body contacts, and then uses the actual sync functions.'],sequences:detailed});
console.log(JSON.stringify({chamber_id:chamber,...metadata.coverage,sequence_count:sequences.length,reference_sha256:sha(readFileSync(resolve(base,'evidence/reference-vectors.json.gz')))}));
