"""Read-only stdlib audit of this study; no PE execution or evidence rewriting.

Python 3.11+: python -I -B path/to/verify-study.py [--preservation]
Use reference.mjs --check separately to replay the actual TypeScript functions.
"""
from pathlib import Path
from collections import defaultdict
from itertools import product
import argparse
import copy
import json
import re
import runpy
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *


def repo_file(relative):
    path = (REPO / relative).resolve()
    require(path.is_relative_to(REPO) and path.is_file(), f'Invalid evidence path: {relative}')
    return path


def inventory():
    return {p.relative_to(STUDY).as_posix(): sha(p) for p in sorted(STUDY.rglob('*'))
            if p.is_file() and not {'_scratch', '__pycache__'} & set(p.parts)
            and p.name not in ('manifest.json', 'verification-report.json') and p.suffix != '.pyc'}


def registers_for(trace):
    regs = dict(trace['initial_registers'])
    result = []
    for step in trace['steps']:
        before = dict(regs)
        for reg, (old, new) in step['register_changes'].items():
            require(regs[reg] == old, 'Register chronology differs')
            regs[reg] = new
        result.append((before, dict(regs)))
    return result


def check_cases(pack, reference, contract):
    cases = pack['cases']
    names = [f['name'] for f in contract['inputs']]
    require(pack['binary_sha256'] == HASHES['bcf'], 'Case specimen identity differs')
    require(pack['input_names'] == names and pack['output_names'] == reference['output_names'], 'Case field ordering differs')
    require([c['id'] for c in cases] == list(range(17)), 'Missing/duplicate targeted input case')
    require(pack['abstract_cases'] == 16 and pack['additional_scenario_case_ids'] == [16], 'Case scope differs')
    require(pack['fixed_other_inputs'] == dict.fromkeys(names[2:10], 0), 'Abstract background differs')
    for case, ref in zip(cases, reference['cases']):
        require({k:case[k] for k in ref} == ref and case['id'] == case_id(case['inputs']), 'Current reference/case mismatch')
        require(list(case['inputs']) == names and all(type(case['inputs'][f['name']]) is int and case['inputs'][f['name']] in f['domain'] for f in contract['inputs']), 'Incomplete/invalid full vector')
        require(case['abstract_cargo_case'] == (case['id'] < 16), 'Reachability scope differs')
        if case['id'] < 16:
            require(all(case['inputs'][n] == 0 for n in names[2:10]), 'Abstract background is not fixed')
    require({(c['inputs']['dropA'],c['inputs']['dropB'],c['inputs']['bufferPhase']) for c in cases[:16]} == set(product(range(2),range(2),range(4))), 'Cargo product incomplete')
    require(pack['reused_count'] == 7 and pack['new_count'] == 10, 'Trace acquisition scope differs')


def check_native(native, reference, scenarios):
    require(native['reference_sha256'] == sha(STUDY/'evidence/current-reference.json') and native['scenario_sha256'] == sha(STUDY/'evidence/scenario-sequences.json'), 'Fresh native reference identity differs')
    require(native['producer_sha256'] == sha(STUDY/'scripts/trace-cargo.py'), 'Native producer identity differs')
    cases = reference['cases']
    steps = [s for scenario in scenarios['scenarios'] for s in scenario['steps']]
    require((len(cases),len(steps),native['native_calls'],native['unique_cases'],native['ordered_frames_per_pe']) == (17,25,84,17,25), 'Native comparison coverage differs')
    frames = [{'inputs':c['inputs'],'outputs':c['expected_outputs']} for c in cases]
    frames += [{'inputs':s['native_inputs'],'outputs':s['expected_outputs']} for s in steps]
    stream = ''.join(' '.join(str(f['inputs'][n]) for n in reference['input_names'])+'\n' for f in frames)
    for variant, process in native['processes'].items():
        require(variant in HASHES and process['binary_sha256'] == HASHES[variant], 'Native process specimen mismatch')
        require(process['input_stream'] == stream and process['exit_code'] == 0 and process['stderr'] == '', 'Native process failed or supplied another vector')
        require([json.loads(line) for line in process['stdout'].splitlines()] == frames, 'Actual native stdout disagrees with full reference frame')
    require(set(native['processes']) == {'clean','bcf'} and native['all_valid'], 'Missing native variant')
    require(len(native['rows']) == 17 and len(native['ordered_scenario_rows']) == 25, 'Native rows missing')
    for row, case, frame in zip(native['rows'], cases, frames):
        require(row == {'id':case['id'],'inputs':case['inputs'],'expected_outputs':case['expected_outputs'],'clean':frame,'bcf':frame,'valid':True}, 'Decoded native row differs from stdout')
    for row, step, frame in zip(native['ordered_scenario_rows'], steps, frames[17:]):
        require(row == {'event':step['event'],'case_id':step['case_id'],'clean':frame,'bcf':frame,'valid':True}, 'Ordered native row differs from stdout')


def check_scenarios(pack, cases):
    by_id = {c['id']:c for c in cases}
    old = read(RACE/'evidence/server-sequences.json')
    require(pack['reused_fixture']['sha256'] == sha(RACE/'evidence/server-sequences.json'), 'Scenario fixture identity differs')
    scenarios = {s['id']:s for s in pack['scenarios']}
    require(len(scenarios) == 4, 'Scenario set differs')
    for scenario in scenarios.values():
        previous = None
        for step in scenario['steps']:
            if previous is not None: require(step['before'] == previous, 'Scenario snapshots are not ordered')
            previous = step['after']
            case = by_id[step['case_id']]
            require(step['native_inputs'] == case['inputs'] and step['expected_outputs'] == case['expected_outputs'], 'Scenario evaluation is not an exact recorded frame')
            require(step['after_timer']['now'] == step['now_ms'] == step['after']['now'], 'Scenario clock differs')
            require(step['transition_order'][0].startswith('advanceRace') and step['transition_order'][-1] == 'separate native evaluation', 'Server/native boundary ordering missing')
            before, timer, action, after = (step[k] for k in ('before','after_timer','after_accepted_action','after'))
            r, t = before['race'], timer['race']
            if r['buffer'] == 'window' and step['now_ms'] >= r['deadline']:
                require(t['buffer'] == 'expired' and step['timer_advanced'], 'Timer expiry was not applied before action')
            require(PHASES[case['inputs']['bufferPhase']] == after['race']['buffer'], 'Four-valued phase encoding differs')
            if action['race']['buffer'] == 'window' and case['inputs']['dropB'] and not case['inputs']['payloadDelivered']:
                require(after['race']['buffer'] == 'released' and after['race']['deadline'] == 0, 'Window release not synchronized')
        if scenario.get('reused_fixture'):
            retained = next(s for s in old['sequences'] if s['id'] == scenario['reused_fixture'])
            require(len(retained['steps']) == len(scenario['steps']), 'Retained sequence truncated')
            for step, prior in zip(scenario['steps'], retained['steps']):
                require(all(step[k] == prior[k] for k in ('event','now_ms','before','after','actual_projection')), 'Retained fixture behavior changed')
        if scenario.get('continues'):
            origin = scenario['continues']
            require(scenario['steps'][0]['before'] == scenarios[origin['scenario']]['steps'][origin['step_index']]['after'], 'Recovery continuation disconnects from reset')
    late = next(s for s in scenarios['buffer-expiry-before-late-b']['steps'] if s['event'] == 'b-at-deadline-after-advance')
    require(late['now_ms'] == 3800 and late['after_timer']['race']['buffer'] == late['after']['race']['buffer'] == 'expired' and late['expected_outputs']['safetyFirewall'] == 1, 'Late B erased the expired attempt')


def check_fragment(fragment, ctx):
    cfg, image, auditor = ctx['cfg'], ctx['image'], ctx['auditor']
    require(fragment['specimen'] == {'chamber_id':'race-condition','variant':'bcf','sha256':HASHES['bcf'],'image_base':image.base}, 'Fragment specimen identity mismatch')
    block = ctx['blocks'][fragment['source_block_id']]
    lo, hi = fragment['address_range']['start_rva'], fragment['address_range']['end_rva_exclusive']
    actual = [i for i in block['instructions'] if lo <= i['rva'] < hi]
    require(actual and fragment['instructions'] == actual, 'Fragment bytes/order/block membership mismatch')
    require(fragment['compiler_labels'] == block['compiler_labels'] and lo == actual[0]['rva'] and hi == actual[-1]['rva']+actual[-1]['size'], 'Fragment boundaries/labels differ')
    require(fragment['address_range'] == {'start_rva':lo,'end_rva_exclusive':hi,'start_va':image.base+lo,'end_va_exclusive':image.base+hi}, 'Fragment VA/RVA identity differs')
    for ins in actual: auditor['instruction_bytes'](image,ins)
    require(fragment['section'] == SECTIONS[fragment['output']], 'Fragment section/output association differs')
    supports = []
    for case in ctx['cases']:
        trace = ctx['traces'][case['trace']['id']]
        steps = [s for s in trace['steps'] if lo <= s['rva'] < hi]
        if not steps: continue
        require([s['rva'] for s in steps] == [i['rva'] for i in actual], 'Partial/noncontiguous fragment observation')
        support = {'observation_id':fragment['id']+':'+trace['trace_id'],'trace_id':trace['trace_id'],'case_id':case['id'],'step_indices':[s['index'] for s in steps],'raw_occurrence_id':steps[0]['raw_occurrence_id']}
        supports.append(support)
        events = [e for e in trace['semantic_events'] if lo <= e['instruction_rva'] < hi]
        obs = ctx['observations'][support['observation_id']]
        require(obs == {'id':support['observation_id'],'fragment_id':fragment['id'],'trace_id':trace['trace_id'],'case_id':case['id'],
            'full_native_inputs':case['inputs'],'steps':[{'step':s,'registers_before':ctx['registers'][trace['trace_id']][s['index']][0],
            'registers_after':ctx['registers'][trace['trace_id']][s['index']][1]} for s in steps],
            'output_events':events,'provenance':case['trace']}, 'Curated observation differs from exact trace/register reconstruction')
    require(fragment['supporting_traces'] == supports and supports and fragment['evidence_classification'] == 'both', 'Fragment support/classification differs')
    if fragment['role'] == 'output_store':
        store = fragment['verified_output_store']; ins = actual[-1]
        value, output = store['value'], fragment['output']
        require(ins['rva'] == STORES[output][value] and fragment['id'] == SECTIONS[output]+f'.write-{value}', 'Wrong real store alternative')
        offset = next(f['offset'] for f in ctx['contract']['outputs'] if f['name'] == output)
        require(store == {'output':output,'value':value,'byte_offset':offset,'instruction_rva':ins['rva'],'instruction_address':ins['address'],'instruction_id':ins['id'],'source_block_id':block['id']}, 'Store identity/layout differs')
        for support in supports:
            trace = ctx['traces'][support['trace_id']]; step = support['step_indices'][-1]
            require(auditor['decode_output_store'](ins,ctx['registers'][trace['trace_id']][step][0]) == (trace['machine_model']['output_address']+offset,value), 'Encoded store is not the advertised output/value')
    else: require(fragment['verified_output_store'] is None, 'Non-store fragment claims an output commit')


def check_conditions(mappings, ctx):
    by_rva = {i['rva']:i for i in ctx['cfg']['instructions']}
    require(len(mappings['conditions']) == 8, 'Puzzle predicate count differs')
    ir_lines = (RACE/'build_or_identity/bcf/controller.ll').read_text().splitlines()
    for mapping, rule in zip(mappings['conditions'], RULES):
        require({k:mapping[k] for k in rule} == rule, 'Puzzle condition association differs')
        field = next(f for f in ctx['contract']['inputs'] if f['name'] == rule['field'])
        association = {'name':field['name'],'offset':field['offset'],'width_bits':32,'domain':field['domain'],'read_rva':rule['compare']}
        require(mapping['input'] == association, 'Input field identity/layout differs')
        read_fragment = ctx['fragments'][mapping['read_fragment_id']]
        branch_fragment = ctx['fragments'][mapping['branch_fragment_id']]
        require(read_fragment['input_fields'] == branch_fragment['input_fields'] == [association], 'Displayed field association differs')
        # Decode the exact small native patterns independently of the catalogue's prose.
        offset = field['offset']; displacement = rule['spill'] & 255
        cmp_code = bytes([0x83,0x38,rule['constant']]) if not offset else bytes([0x83,0x78,offset,rule['constant']])
        prefix = bytes.fromhex('48 8b 00') if rule['id'] == 'upper-a' else bytes.fromhex('48 8b 45 d8 48 8b 00')
        expected = prefix+cmp_code+bytes([0x0f,0x94 if rule['operation']=='eq' else 0x95,0xc0,0x88,0x45,displacement])
        require(ctx['image'].at(rule['read_start'],rule['read_end']-rule['read_start']) == expected, 'Native input/CMP/SETcc/spill pattern differs')
        require(ctx['image'].at(rule['branch_start'],5) == bytes([0x8a,0x45,displacement,0xa8,1]), 'Native predicate reload/TEST differs')
        branch = by_rva[rule['branch']]
        require(branch['mnemonic'] == 'jne' and mapping['native_successors'] == ctx['blocks'][branch['block_id']]['successors'], 'Native puzzle branch/successors differ')
        # Follow typed IR field -> load -> icmp -> consuming br, with exact line citations.
        lines = [x['text'] for records in mapping['ir_checks'].values() for x in records]
        for records in mapping['ir_checks'].values():
            require(all(ir_lines[x['line']-1].strip() == x['text'] for x in records), 'IR citation differs')
        gep = next((re.fullmatch(r'(%\S+) = getelementptr inbounds %struct.ControllerInputs, ptr (%\S+), i32 0, i32 '+str(offset//4), line) for line in lines if 'getelementptr' in line), None)
        require(gep is not None, 'Typed input field association absent')
        loaded = next((m for line in lines if (m:=re.fullmatch(r'(%\S+) = load i32, ptr '+re.escape(gep[1])+r', align 4',line))), None)
        require(loaded is not None, 'Typed field load missing')
        comparison = next((m for line in lines if (m:=re.fullmatch(r'(%\S+) = icmp '+rule['operation']+' i32 '+re.escape(loaded[1])+', '+str(rule['constant']),line))), None)
        require(comparison is not None and any(line.startswith('br i1 '+comparison[1]+', label ') for line in lines), 'IR branch does not consume this comparison')
        guard = next(g for g in mappings['opaque_guards'] if g['id'] == mapping['guard_between_read_and_branch'])
        require(int(guard['predicate_start_rva'],16) == rule['read_end'] and int(guard['true_target_rva'],16) == rule['branch_start'], 'Intervening opaque guard mapping differs')
        expected_support = []
        for case in ctx['cases']:
            trace = ctx['traces'][case['trace']['id']]; steps = trace['steps']
            cmp_step = next((s for s in steps if s['rva'] == rule['compare']), None)
            if cmp_step is None:
                require(not any(s['rva'] == rule['branch'] for s in steps), 'Branch bypassed its input predicate')
                continue
            decision = next(s for s in steps if s['rva'] == rule['branch'])
            reload = next(s for s in steps if s['rva'] == rule['branch_start'])
            lhs, rhs = cmp_step['comparison']['operands']
            regs = ctx['registers'][trace['trace_id']]
            address = trace['machine_model']['input_address']+offset
            require(lhs['kind'] == 'memory' and lhs['address'] == address == regs[cmp_step['index']][0]['rax']+offset and lhs['width'] == 32 and lhs['unsigned'] == case['inputs'][field['name']], 'CMP did not read the advertised field/value')
            require(rhs['kind'] == 'immediate' and rhs['unsigned'] == rule['constant'], 'CMP immediate differs')
            truth = int(lhs['unsigned'] == rhs['unsigned']) ^ (rule['operation']=='ne')
            spill_address = regs[cmp_step['index']][0]['rbp']+rule['spill']
            writes = [(s,w) for s in steps[cmp_step['index']:decision['index']] for w in s['memory_writes'] if w['address'] <= spill_address < w['address']+w['size']]
            require(len(writes) == 1 and writes[0][1]['size'] == 1 and writes[0][1]['value'] == truth, 'Puzzle predicate spill clobbered/miscomputed')
            require(regs[cmp_step['index']+1][1]['rax'] & 255 == truth == regs[reload['index']][1]['rax'] & 255, 'SETcc/reload differs from saved Boolean')
            require(decision['branch']['taken'] == bool(truth) and not bool(decision['branch']['flags_used'] & 64) == bool(truth), 'Puzzle branch uses wrong flags/value')
            expected_support.append({'trace_id':trace['trace_id'],'case_id':case['id'],'comparison_step':cmp_step['index'],'spill_step':writes[0][0]['index'],'reload_step':reload['index'],'branch_step':decision['index'],'input_address':address,'input_value':lhs['unsigned'],'predicate_value':truth,'spill_address':spill_address,'branch_observation':decision['branch']})
        require(mapping['support'] == expected_support, 'Condition observation linkage differs')


def check_dependencies(mappings, ctx, native):
    rows = [r for r in native['rows'] if type(r['id']) is int]
    require(len(rows) == 4096 and {r['id'] for r in rows} == set(range(4096)), 'Original exhaustive domain incomplete')
    groups = defaultdict(list)
    for row in rows:
        inputs = dict(zip(native['input_names'],row['inputs']))
        require(row['id'] == case_id(inputs) and row['clean'] == row['bcf'] == row['expected'] and row['valid'], 'Original native differential comparison fails')
        require(all(v in f['domain'] for f,v in zip(ctx['contract']['inputs'],row['inputs'])), 'Original input domain differs')
        groups[(inputs['dropA'],inputs['dropB'],inputs['bufferPhase'])].append(row)
    expected_groups = []
    for (a,b,p), group in sorted(groups.items()):
        require({tuple(r['inputs'][2:10]) for r in group} == set(product(range(2),repeat=8)), 'Background input combinations missing')
        outputs = (int(not a),int(not b and p in (0,1)),int(not b or p==3),int(bool(a and b)))
        require(all(tuple(r['bcf'][:4]) == outputs for r in group), 'Cargo output equation/dependency contradicted')
        expected_groups.append({'cargo_inputs':dict(zip(['dropA','dropB','bufferPhase'],(a,b,p))),'other_input_combinations':256,'cargo_outputs':dict(zip(CARGO,outputs))})
    require(mappings['output_dependency_check'] == {'source_sha256':sha(RACE/'evidence/native-results.json.gz'),'exhaustive_rows':4096,'groups':expected_groups}, 'Output dependency summary differs')
    paths = {str(c['id']):selected_path(c['inputs'],ctx['cfg']) for c in ctx['cases']}
    require(mappings['static_case_paths'] == paths, 'Local selection invents an edge or predicate')
    reachable = {b for p in paths.values() for b in p['blocks']}
    require(mappings['actual_raw_edges'] == [e for e in ctx['cfg']['edges'] if e['source'] in reachable], 'Local raw CFG differs')
    _, guards = guard_maps()
    actual_guards = [g for g in guards.values() if g['branch_block_id'] in reachable]
    require(mappings['opaque_guards'] == actual_guards and mappings['opaque_guard_count'] == 31, 'Cargo guard set differs')
    conditionals = {ctx['blocks'][b]['instructions'][-1]['rva'] for b in reachable if ctx['blocks'][b]['branch_type'] == 'conditional_direct'}
    require(conditionals == {r['branch'] for r in RULES} | {int(g['branch_rva'],16) for g in actual_guards}, 'Unexplained local conditional')
    checks = []
    for tid, trace in ctx['traces'].items():
        observed = [o['block_id'] for o in trace['raw_occurrences'] if 0x1183 <= ctx['blocks'][o['block_id']]['start_rva'] < 0x1877]
        require(observed == selected_path(trace['inputs'],ctx['cfg'])['blocks'], 'Local path changes with the background vector')
        checks.append({'trace_id':tid,'case_id':trace['state_id'],'full_inputs':trace['inputs'],'block_sequence_matches_local_selection':True,'classification':'dynamic_support_for_this_exact_vector_only'})
    require(mappings['cross_background_trace_checks'] == checks and len(checks) == 42, 'Cross-background trace comparison differs')


def check_compositions(panel, ctx):
    compositions = panel['case_compositions']; _, guards = guard_maps()
    require(len(compositions) == 68 and {(c['case_id'],c['section']) for c in compositions} == set(product(range(17),SECTIONS.values())), 'Composite coverage incomplete')
    for composite in compositions:
        case = ctx['cases'][composite['case_id']]; trace = ctx['traces'][case['trace']['id']]
        require(composite['trace_id'] == trace['trace_id'], 'Composite uses an unrelated representative')
        selected = []
        for fragment in ctx['fragments'].values():
            if fragment['section'] != composite['section'] or fragment['role'] == 'obfuscator_guard': continue
            support = next((s for s in fragment['supporting_traces'] if s['trace_id'] == trace['trace_id']), None)
            if support: selected.append((fragment['id'],support['step_indices']))
        selected.sort(key=lambda item:item[1][0])
        require(composite['ordered_fragment_ids'] == [fid for fid,_ in selected], 'Composite instruction order differs from observation')
        expected = []
        for (left,li),(right,ri) in zip(selected,selected[1:]):
            indices = list(range(li[-1]+1,ri[0]))
            if not indices: continue
            occurrences = [o for o in trace['raw_occurrences'] if o['end_step'] >= li[-1] and o['start_step'] <= ri[0]]
            edges = [next(e for e in ctx['cfg']['edges'] if e['source'] == a['block_id'] and e['target'] == b['block_id']) for a,b in zip(occurrences,occurrences[1:])]
            expected.append({'from_fragment':left,'to_fragment':right,'step_indices':indices,'instruction_rvas':[trace['steps'][i]['rva'] for i in indices],
                'opaque_guard_ids':[guards[trace['steps'][i]['rva']]['id'] for i in indices if trace['steps'][i]['rva'] in guards],
                'raw_cfg_edge_chain':edges,'is_a_new_direct_cfg_edge':False})
        require(len(composite['gaps']) == len(expected), 'Omission separator missing')
        for gap, actual in zip(composite['gaps'],expected):
            require({k:gap[k] for k in actual} == actual and gap['separator'] == '... omitted native instructions ...', 'Gap implies invented control flow or hides different instructions')
    require(len(panel['sections']) == 4, 'Panel section count differs')
    for section, (output,sid) in zip(panel['sections'],SECTIONS.items()):
        require(section['id'] == sid and section['output'] == output and section['store_alternatives'] == {str(v):sid+f'.write-{v}' for v in (0,1)}, 'Panel store selection differs')
        require(section['required_accepted_inputs'] == list(dict.fromkeys(r['field'] for r in RULES if r['output'] == output)), 'Panel input dependency differs')
        require(section['trace_replay']['selection'] == 'Exact complete 11-field vector match in cases.json; no representative substitution', 'Unsafe replay selection rule')


def tamper_checks(ctx, panel, pack, reference):
    rejected = []
    def must_reject(name, fn):
        try: fn()
        except ValueError: rejected.append(name)
        else: raise ValueError('Tamper was accepted: '+name)
    sample = next(f for f in ctx['fragments'].values() if f['role'] == 'input_check')
    changed = copy.deepcopy(sample); changed['instructions'][0]['bytes'] = '90'
    must_reject('instruction bytes',lambda:check_fragment(changed,ctx))
    changed = copy.deepcopy(sample); changed['specimen']['sha256'] = '0'*64
    must_reject('specimen identity',lambda:check_fragment(changed,ctx))
    changed = copy.deepcopy(sample); changed['source_block_id'] = 'bb_00001000'
    must_reject('source block identity',lambda:check_fragment(changed,ctx))
    changed = copy.deepcopy(ctx['fragments']['upper-support.write-1']); changed['verified_output_store']['value'] = 0
    must_reject('one-store relabelled zero',lambda:check_fragment(changed,ctx))
    changed_trace = copy.deepcopy(ctx['traces']['bcf_case_0'])
    next(s for s in changed_trace['steps'] if s['rva']==0x11d5)['branch']['target_address'] += 1
    must_reject('branch destination',lambda:ctx['auditor']['trace_check'](changed_trace,ctx['cases'][0],ctx['contract'],ctx['cfg'],ctx['image'],ctx['build']))
    changed_panel = copy.deepcopy(panel)
    gap = next(g for c in changed_panel['case_compositions'] for g in c['gaps'] if g['raw_cfg_edge_chain'])
    gap['raw_cfg_edge_chain'][0]['target'] = 'bb_00001877'
    must_reject('invented gap edge',lambda:check_compositions(changed_panel,ctx))
    changed_pack = copy.deepcopy(pack); changed_pack['cases'].pop(1)
    must_reject('missing four-valued phase case',lambda:check_cases(changed_pack,reference,ctx['contract']))
    return rejected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preservation',action='store_true',help='Also check all 903 files present before this study; requires the analyzed base checkout')
    args = parser.parse_args()
    before = inventory()
    manifest = read(STUDY/'manifest.json')
    require(manifest['analyzed_revision'] == REVISION and manifest['files'] == before, 'Study manifest inventory mismatch')
    external_before = {p:sha(repo_file(p)) for p in manifest['reused_file_sha256']}
    require(external_before == manifest['reused_file_sha256'], 'Reused evidence/current source identity mismatch')
    contract = read(RACE/'contract.json'); identity = read(RACE/'build_or_identity/identity.json')
    builds = {b['variant']:b for b in identity['builds']}; auditor = load_auditor()
    for variant in HASHES:
        require(sha(RACE/builds[variant]['binary_path']) == HASHES[variant] == builds[variant]['binary_sha256'] == manifest['specimen_sha256'][variant], 'Frozen specimen changed')
    image = auditor['PE'](RACE/builds['bcf']['binary_path'])
    cfg = auditor['cfg_check']('race-condition','bcf',builds['bcf'],image)
    reference = read(STUDY/'evidence/current-reference.json'); scenarios = read(STUDY/'evidence/scenario-sequences.json')
    require(reference['historical_source_sha256'] == contract['reference_source_sha256'] and reference['historical_reference_commit'] == contract['reference_commit'], 'Historical reference identity was rewritten')
    require(reference['generator_sha256'] == sha(STUDY/'scripts/reference.mjs'), 'Current reference generator changed')
    require(all(sha(repo_file(p)) == value for p,value in reference['current_source_sha256'].items()), 'Current reference source snapshot differs')
    pack = read(STUDY/'cases.json'); check_cases(pack,reference,contract)
    check_scenarios(scenarios,pack['cases'])
    native = read(STUDY/'evidence/native-comparisons.json'); check_native(native,reference,scenarios)
    old_pack = read(RACE/'evidence/representative-traces.json.gz'); new_pack = read(STUDY/'evidence/targeted-traces.json.gz')
    require(new_pack['binary_sha256'] == HASHES['bcf'] and new_pack['native_comparisons_sha256'] == sha(STUDY/'evidence/native-comparisons.json') and new_pack['analyzer_sha256'] == sha(ACQUISITION/'shared/analyze.py') and new_pack['producer_sha256'] == sha(STUDY/'scripts/trace-cargo.py'), 'New trace provenance differs')
    require([t['state_id'] for t in new_pack['traces']] == [1,2,5,7,9,10,11,13,14,16], 'Unnecessary/missing new exact traces')
    traces = load_traces(); original_native = read(RACE/'evidence/native-results.json.gz')
    original_rows = {r['id']:r for r in original_native['rows']}
    for trace in traces.values():
        row = original_rows[trace['state_id']]
        case = {'id':row['id'],'inputs':dict(zip(original_native['input_names'],row['inputs'])),'expected_outputs':dict(zip(original_native['output_names'],row['expected']))}
        auditor['trace_check'](trace,case,contract,cfg,image,builds['bcf'])
    old_ids = {t['trace_id'] for t in old_pack['traces']}
    for case in pack['cases']:
        trace = traces[case['trace']['id']]
        auditor['trace_check'](trace,case,contract,cfg,image,builds['bcf'])
        reused = trace['trace_id'] in old_ids
        expected_path = 'experiments/coop-controllers/race-condition/evidence/representative-traces.json.gz' if reused else 'experiments/coop-controller-studies/race-cargo-v1/evidence/targeted-traces.json.gz'
        require(case['trace']['path'] == expected_path and case['trace']['origin'] == ('reused_exact_full_input_trace' if reused else 'new_exact_pe_unicorn_execution'), 'Trace selection provenance differs')
    proof = runpy.run_path(str(ACQUISITION/'shared/verify_proof.py'))['check_proof'](RACE,cfg,image,old_pack['traces'],builds['bcf'])
    catalogue = read(STUDY/'fragments.json'); observations = read(STUDY/'evidence/fragment-observations.json.gz')['observations']
    ctx = {'contract':contract,'cases':pack['cases'],'traces':traces,'cfg':cfg,'image':image,'auditor':auditor,'build':builds['bcf'],
        'blocks':{b['id']:b for b in cfg['blocks']},'fragments':{f['id']:f for f in catalogue['fragments']},
        'observations':{o['id']:o for o in observations},'registers':{tid:registers_for(t) for tid,t in traces.items()}}
    require(len(ctx['fragments']) == len(catalogue['fragments']) == 26 and len(ctx['observations']) == len(observations) == 300, 'Catalogue identity/coverage differs')
    require(catalogue['binary_sha256'] == HASHES['bcf'] and catalogue['image_base'] == image.base, 'Catalogue specimen mismatch')
    for fragment in ctx['fragments'].values(): check_fragment(fragment,ctx)
    mappings = read(STUDY/'evidence/decision-mappings.json')
    check_conditions(mappings,ctx); check_dependencies(mappings,ctx,original_native)
    panel = read(STUDY/'panel-plan.json'); check_compositions(panel,ctx)
    negative = tamper_checks(ctx,panel,pack,reference)
    preserved = None
    if args.preservation:
        baseline = read(STUDY/'evidence/preservation-baseline.json')
        require(baseline['analyzed_revision'] == REVISION, 'Preservation revision differs')
        require(all(sha(repo_file(p)) == value for p,value in baseline['tracked_file_sha256'].items()), 'A pre-study tracked file was modified')
        preserved = len(baseline['tracked_file_sha256'])
    require(inventory() == before and {p:sha(repo_file(p)) for p in external_before} == external_before, 'Audit changed retained files')
    print(json.dumps({'schema':'race-cargo-verification/v1','status':'PASS','manifest_sha256':sha(STUDY/'manifest.json'),
        'scope':'retained-evidence audit; no new native execution, hardware tracing or game simulation',
        'specimen_sha256':HASHES,'fragments':26,'conditions':8,'local_opaque_guards':31,'retained_race_guards_rechecked':proof['guard_count'],
        'exact_cases':17,'reused_selected_traces':7,'new_traces':10,'trace_records_checked':42,'native_evaluations_verified':84,
        'original_exhaustive_rows':4096,'scenarios':4,'scenario_steps':25,'compositions':68,'observations':300,
        'tamper_checks_rejected':negative,'pre_study_tracked_files_unchanged':preserved,'read_only':True},indent=2))


if __name__ == '__main__':
    main()
