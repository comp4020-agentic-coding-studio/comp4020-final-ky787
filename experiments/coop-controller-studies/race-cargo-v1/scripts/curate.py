"""Derive a small catalogue and explicit gaps from frozen CFG + matching executions."""
from pathlib import Path
from collections import defaultdict
import re
import sys

sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *


def snapshots(trace):
    registers=dict(trace['initial_registers'])
    result=[]
    for step in trace['steps']:
        before=dict(registers)
        for name,(_,value) in step['register_changes'].items(): registers[name]=value
        result.append((before,dict(registers)))
    return result


def ir_blocks():
    lines=(RACE/'build_or_identity/bcf/controller.ll').read_text().splitlines()
    blocks={}; current=None
    for number,line in enumerate(lines,1):
        match=re.match(r'^([-A-Za-z$._0-9]+):',line)
        if match: current=match[1];blocks[current]=[]
        elif current and line.strip() and not line.lstrip().startswith(';'):
            blocks[current].append({'line':number,'text':line.strip()})
        if line=='}': current=None
    return blocks


def main():
    cfg=read(RACE/'evidence/disassembly-bcf.json.gz')
    contract=read(RACE/'contract.json')
    cases=read(STUDY/'cases.json')['cases']
    all_traces=load_traces()
    traces={c['trace']['id']:all_traces[c['trace']['id']] for c in cases}
    by_id={c['id']:c for c in cases}
    by_rva={i['rva']:i for i in cfg['instructions']}
    blocks={b['id']:b for b in cfg['blocks']}
    registers={tid:snapshots(t) for tid,t in traces.items()}
    fields={f['name']:f for f in contract['inputs']}
    out_fields={f['name']:f for f in contract['outputs']}
    proof,guards=guard_maps()
    ir=ir_blocks()
    fragments=[]; observations=[]

    def fragment(fid,section,output,role,start,end,explanation,associations=None,requires=None,store=None):
        instructions=[i for i in cfg['instructions'] if start<=i['rva']<end]
        require(instructions and instructions[0]['rva']==start and instructions[-1]['rva']+instructions[-1]['size']==end,'Fragment boundary is not exact')
        block=blocks[instructions[0]['block_id']]
        require(all(i['block_id']==block['id'] for i in instructions),'Fragment spans a fictional block')
        support=[]
        for tid,trace in traces.items():
            matches=[s for s in trace['steps'] if start<=s['rva']<end]
            if not matches: continue
            require([s['rva'] for s in matches]==[i['rva'] for i in instructions],'Partial fragment execution needs separate representation')
            oid=f'{fid}:{tid}'
            support.append({'observation_id':oid,'trace_id':tid,'case_id':trace['state_id'],
                'step_indices':[s['index'] for s in matches],'raw_occurrence_id':matches[0]['raw_occurrence_id']})
            events=[e for e in trace['semantic_events'] if start<=e['instruction_rva']<end]
            observations.append({'id':oid,'fragment_id':fid,'trace_id':tid,'case_id':trace['state_id'],
                'full_native_inputs':trace['inputs'],'steps':[{'step':s,'registers_before':registers[tid][s['index']][0],
                'registers_after':registers[tid][s['index']][1]} for s in matches],
                'output_events':events,'provenance':by_id[trace['state_id']]['trace']})
        f={'id':fid,'specimen':{'chamber_id':'race-condition','variant':'bcf','sha256':HASHES['bcf'],'image_base':cfg['binary']['image_base']},
            'section':section,'output':output,'role':role,'source_block_id':block['id'],
            'address_range':{'start_rva':start,'end_rva_exclusive':end,'start_va':instructions[0]['address'],'end_va_exclusive':instructions[-1]['address']+instructions[-1]['size']},
            'compiler_labels':block['compiler_labels'],'instructions':instructions,'input_fields':associations or [],
            'requires':requires or [],'supporting_traces':support,'explanation':explanation,
            'evidence_classification':'both' if support else 'statically_established',
            'verified_output_store':store}
        fragments.append(f)
        return f

    fragment('upper-support.input-slot','upper-support','topBridge','pointer_context',0x1183,0x1187,
        'Loads the saved input-pointer slot. Intervening master-local work is not a DROP A condition.',
        requires=['RBP frame and saved input slot established by the actual function prologue.'])
    conditions=[]
    for rule in RULES:
        section=SECTIONS[rule['output']]
        field=fields[rule['field']]
        association={'name':field['name'],'offset':field['offset'],'width_bits':32,'domain':field['domain'],'read_rva':rule['compare']}
        fid=section+'.'+rule['id']
        read_fragment=fragment(fid+'.read',section,rule['output'],'input_check',rule['read_start'],rule['read_end'],
            f"Read {rule['field']}, compare with {rule['constant']}, materialize {rule['operation']} into AL and save it at RBP{rule['spill']:+#x}.",
            [association],requires=[
                'Saved input pointer is established by entry ABI RCX and prologue stack slots.',
                'Upper read starts with RAX already loaded at 0x1183; omitted master-local work 0x1187..0x1196 preserves RAX.' if rule['id']=='upper-a' else 'The first two MOVs restore the input pointer through [RBP-0x28].'])
        branch_ins=by_rva[rule['branch']]
        branch_fragment=fragment(fid+'.branch',section,rule['output'],'puzzle_branch',rule['branch_start'],rule['branch']+branch_ins['size'],
            'Reload the saved puzzle Boolean, TEST its low bit, then JNE. These flags come from this TEST, not the earlier input CMP or an opaque guard.',
            [association],requires=[f"The earlier check saved its Boolean at RBP{rule['spill']:+#x}; intervening BCF guards clobber AL/flags and this stack byte preserves the result."])
        check_block=blocks[by_rva[rule['compare']]['block_id']]
        branch_block=blocks[branch_ins['block_id']]
        intervening=[g for r,g in guards.items() if rule['read_end']<=int(g['predicate_start_rva'],16) and r<rule['branch_start']]
        require(len(intervening)==1,'Expected one exact intervening opaque guard')
        support=[]
        for tid,trace in traces.items():
            comp=next((s for s in trace['steps'] if s['rva']==rule['compare']),None)
            branch=next((s for s in trace['steps'] if s['rva']==rule['branch']),None)
            if comp is None:
                require(branch is None,'Puzzle branch bypassed associated input read')
                continue
            require(branch is not None,'Input check did not reach its decision branch')
            before,after=registers[tid][comp['index']]
            operand=comp['comparison']['operands'][0]
            require(operand['kind']=='memory' and operand['width']==32 and operand['address']==trace['machine_model']['input_address']+field['offset'] and operand['unsigned']==trace['inputs'][field['name']],'Input-field observation mismatch')
            truth=int((operand['unsigned']==rule['constant']) if rule['operation']=='eq' else (operand['unsigned']!=rule['constant']))
            spill_address=before['rbp']+rule['spill']
            writes=[(s,w) for s in trace['steps'][comp['index']:branch['index']] for w in s['memory_writes'] if w['address']<=spill_address<w['address']+w['size']]
            require(len(writes)==1 and writes[0][1]['size']==1 and writes[0][1]['value']==truth,'Comparison spill not preserved across guard')
            reload=next(s for s in trace['steps'][comp['index']:branch['index']] if s['rva']==rule['branch_start'])
            require(registers[tid][reload['index']][1]['rax']&255==truth,'Reloaded puzzle predicate differs from spill')
            require(branch['branch']['taken']==bool(truth),'Puzzle branch outcome mismatch')
            support.append({'trace_id':tid,'case_id':trace['state_id'],'comparison_step':comp['index'],
                'spill_step':writes[0][0]['index'],'reload_step':reload['index'],'branch_step':branch['index'],
                'input_address':operand['address'],'input_value':operand['unsigned'],'predicate_value':truth,
                'spill_address':spill_address,'branch_observation':branch['branch']})
        conditions.append({**rule,'input':association,'read_fragment_id':read_fragment['id'],'branch_fragment_id':branch_fragment['id'],
            'native_successors':branch_block['successors'],'guard_between_read_and_branch':intervening[0]['id'],
            'ir_checks':{label['ir_block']:ir[label['ir_block']] for label in check_block['compiler_labels']+branch_block['compiler_labels']},
            'support':support,'dependency_scope':'This branch consumes only its saved field predicate under normal ABI entry, valid distinct buffers, intact code and guard-proof assumptions.'})
    for output,alternatives in STORES.items():
        for value,rva in sorted(alternatives.items()):
            ins=by_rva[rva]; block=blocks[ins['block_id']]
            store={'output':output,'value':value,'byte_offset':out_fields[output]['offset'],'instruction_rva':rva,
                'instruction_address':ins['address'],'instruction_id':ins['id'],'source_block_id':block['id']}
            fragment(SECTIONS[output]+f'.write-{value}',SECTIONS[output],output,'output_store',block['start_rva'],rva+ins['size'],
                f"The genuine {output}={value} alternative at this distinct PE address; never replace an immediate in the other alternative.",
                requires=['Output pointer slot [RBP-0x38] is established by the original RDX argument; pointer reloads are included.'],store=store)
    example=next(g for g in guards.values() if int(g['predicate_start_rva'],16)==0x11a2)
    fragment('upper-support.opaque-guard-example','upper-support','topBridge','obfuscator_guard',0x11a2,0x11cb,
        'Optional collapsed obfuscation context: tests globals x/y with the proven parity predicate. It does not read DROP A, DROP B or bufferPhase.',
        requires=['Exact retained guard proof; normal-entry/intact-code assumptions from shared/PROOF.md.'])
    catalogue={'schema':'race-cargo-fragments/v1','binary_sha256':HASHES['bcf'],'image_base':cfg['binary']['image_base'],
        'analyzed_revision':REVISION,'fragments':fragments,
        'observations_path':'evidence/fragment-observations.json.gz',
        'identity_rule':'Each excerpt is a contiguous subsequence of one actual raw block; discontiguous excerpts keep separate addresses and explicit omissions.'}
    write(STUDY/'fragments.json',catalogue)
    write(STUDY/'evidence/fragment-observations.json.gz',{'schema':'race-cargo-fragment-observations/v1','observations':observations})

    paths={str(c['id']):selected_path(c['inputs'],cfg) for c in cases}
    # Existing exhaustive PE outputs assess values, independently from path evidence.
    native=read(RACE/'evidence/native-results.json.gz')
    groups=defaultdict(list)
    for row in native['rows']:
        if not isinstance(row['id'],int): continue
        inputs=dict(zip(native['input_names'],row['inputs']))
        groups[(inputs['dropA'],inputs['dropB'],inputs['bufferPhase'])].append(row)
    require(len(groups)==16 and all(len(v)==256 for v in groups.values()),'Frozen output-domain completeness changed')
    value_groups=[]
    for triple,rows in sorted(groups.items()):
        cargo_values={tuple(row['bcf'][:4]) for row in rows}
        require(len(cargo_values)==1 and all(row['clean']==row['bcf']==row['expected'] and row['valid'] for row in rows),'Cargo outputs vary with other inputs or native mismatch')
        value_groups.append({'cargo_inputs':dict(zip(['dropA','dropB','bufferPhase'],triple)),'other_input_combinations':256,
            'cargo_outputs':dict(zip(CARGO,next(iter(cargo_values))))})
    # All 32 old traces are reused for a bounded cross-background comparison only.
    # They are not silently substituted for one of the 17 selected full input vectors.
    cross_checks=[]
    for trace in all_traces.values():
        path=selected_path(trace['inputs'],cfg)
        observed=[o['block_id'] for o in trace['raw_occurrences'] if 0x1183<=blocks[o['block_id']]['start_rva']<0x1877]
        require(observed==path['blocks'],'Observed cargo-local path differs from checked CFG selection')
        cross_checks.append({'trace_id':trace['trace_id'],'case_id':trace['state_id'],'full_inputs':trace['inputs'],
            'block_sequence_matches_local_selection':True,'classification':'dynamic_support_for_this_exact_vector_only'})
    reachable=set(b for p in paths.values() for b in p['blocks'])
    cargo_guards=[g for r,g in guards.items() if by_rva[r]['block_id'] in reachable]
    conditional_rvas={b['instructions'][-1]['rva'] for b in cfg['blocks'] if b['id'] in reachable and b['branch_type']=='conditional_direct'}
    require(conditional_rvas=={r['branch'] for r in RULES}|{int(g['branch_rva'],16) for g in cargo_guards},'Cargo region contains an unexplained conditional')
    write(STUDY/'evidence/decision-mappings.json',{'schema':'race-cargo-decisions/v1','binary_sha256':HASHES['bcf'],
        'conditions':conditions,'cargo_local_range':{'entry_rva':0x1183,'exit_rva_exclusive':0x1877},
        'actual_raw_edges':[e for e in cfg['edges'] if e['source'] in reachable],
        'opaque_guards':cargo_guards,'opaque_guard_count':len(cargo_guards),'static_case_paths':paths,
        'output_dependency_check':{'source_sha256':sha(RACE/'evidence/native-results.json.gz'),'exhaustive_rows':4096,'groups':value_groups},
        'cross_background_trace_checks':cross_checks,
        'conclusion':['All 4096 retained clean/BCF/reference rows give the same four cargo outputs for each fixed A/B/phase triple.',
            'Eight puzzle predicates and the established opaque guards account for every conditional reached in the cargo-local subgraph.',
            'The four cargo decisions use only dropA/dropB/bufferPhase under normal ABI entry and the stated guard assumptions. This is separate from whole-function execution.',
            'The preceding master calculation and later phase/return/exit logic depend on other inputs; their full paths and registers are not implied by these local selections.',
            'RAX/RBP pointer setup, valid distinct argument buffers and preserved spill slots are required; this is not a proof for arbitrary pointers or corrupted state.']})

    fragment_by_id={f['id']:f for f in fragments}
    section_plans=[]
    for output,section in SECTIONS.items():
        rules=[r for r in RULES if r['output']==output]
        section_plans.append({'id':section,'output':output,'machinery':{'topBridge':'cargo-top','bufferBridge':'cargo-buffer','safetyFirewall':'safety-beam','raceFirewall':'race-beam'}[output],
            'required_accepted_inputs':list(dict.fromkeys(r['field'] for r in rules)),
            'condition_fragments':[section+'.'+r['id']+'.'+role for r in rules for role in ('read','branch')],
            'store_alternatives':{str(v):section+f'.write-{v}' for v in (0,1)},
            'state_linked':{'selection':'accepted raw output 0/1 selects the matching real store address',
                'highlight':'Result-associated store accent only; label STATE-LINKED, not EXECUTING.',
                'condition_display':'Static authentic excerpts; do not animate branch/flags from an output value alone.',
                'unknown':'Missing/untrusted accepted output: leave both alternatives static or mark UNKNOWN.'},
            'trace_replay':{'selection':'Exact complete 11-field vector match in cases.json; no representative substitution',
                'highlight':'Only actual step/occurrence observations of that trace. Label EMULATED REPLAY.',
                'unknown':'When full accepted input vector is unavailable or unmatched, disable trace animation and retain state-linked/static mode.'}})
    compositions=[]
    for case in cases:
        trace=traces[case['trace']['id']]
        for output,section in SECTIONS.items():
            selected=[]
            for fragment_record in fragments:
                if fragment_record['section']!=section or fragment_record['role']=='obfuscator_guard': continue
                support=next((s for s in fragment_record['supporting_traces'] if s['trace_id']==trace['trace_id']),None)
                if support: selected.append((fragment_record,support))
            selected.sort(key=lambda pair:pair[1]['step_indices'][0])
            gaps=[]
            for (left,ls),(right,rs) in zip(selected,selected[1:]):
                lo,hi=ls['step_indices'][-1]+1,rs['step_indices'][0]
                omitted=trace['steps'][lo:hi]
                if not omitted: continue
                relevant_occurrences=[o for o in trace['raw_occurrences'] if o['end_step']>=ls['step_indices'][-1] and o['start_step']<=rs['step_indices'][0]]
                chain=[next(e for e in cfg['edges'] if e['source']==a['block_id'] and e['target']==b['block_id']) for a,b in zip(relevant_occurrences,relevant_occurrences[1:])]
                gaps.append({'from_fragment':left['id'],'to_fragment':right['id'],'separator':'... omitted native instructions ...',
                    'step_indices':list(range(lo,hi)),'instruction_rvas':[s['rva'] for s in omitted],
                    'opaque_guard_ids':[guards[s['rva']]['id'] for s in omitted if s['rva'] in guards],
                    'raw_cfg_edge_chain':chain,'is_a_new_direct_cfg_edge':False,
                    'explanation':'This gap may include a proven opaque guard, its real successors, pointer/master setup or jumps. AL and flags can be clobbered; reload the saved predicate before interpreting the displayed gameplay branch.'})
            compositions.append({'case_id':case['id'],'trace_id':trace['trace_id'],'section':section,
                'ordered_fragment_ids':[f['id'] for f,_ in selected],'gaps':gaps,
                'mode':'Observed composite excerpts of one exact evaluation; never one synthetic basic block.'})
    write(STUDY/'panel-plan.json',{'schema':'race-cargo-panel-plan/v1','title':'CARGO TRANSFER CONTROLLER',
        'implementation_status':'proposal only; no frontend/game changes','sections':section_plans,'case_compositions':compositions,
        'global_rules':['Keep each fragment address and source block visible. Omission separators are not arrows or direct CFG edges.',
            'A game state transition starts a separate native evaluation; no CPU trace spans cube flight or timer waiting.',
            'Use accepted state only, not local prediction, interpolation or reconstructed guesses for missing native inputs.',
            'Full-input replay requires an authoritative encoded native frame. Existing output-only world presentation cannot supply this by itself.',
            'Buffer countdown/phase transitions are server timing annotations, never instructions that wait for game time.'],
        'authored_status_suggestions':{'classification':'authored UI text, not PE strings',
            'examples':['UPPER SUPPORT RELEASED','BUFFER HOLDING','TRANSFER CLEAR','INTERLOCK ACTIVE','BUFFER WINDOW EXPIRED']}})
    print(__import__('json').dumps({'status':'PASS','fragments':len(fragments),'conditions':len(conditions),'guards':len(cargo_guards),
        'observations':len(observations),'output_dependency_rows':4096,'cross_background_traces':len(cross_checks)}))


if __name__=='__main__':
    main()
