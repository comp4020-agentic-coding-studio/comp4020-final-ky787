"""Derive independent excerpts from the frozen HANDSHAKE v2 PE and 32 traces.

Uses the BYPASS curation method, with freshly inspected addresses and predicates.
derive() is read-only and standard-library-only for portable recomputation.
"""
from pathlib import Path
import re
import struct
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, read, save, sha, require, INPUTS, OUTPUTS

# Each tuple identifies this PE's input-read excerpt, comparison, predicate spill,
# and later reload/JNE excerpt. These are identities, not executable substitutes.
RULES = [
    ('crossing', 'crossingPower', 'crossing', 0x1079, 0x1085, 0x107c, -0x11, 0x10b3, 0x10b8),
    ('lift', 'liftPower', 'liftPlate', 0x11c0, 0x11d1, 0x11c7, -0x31, 0x11ff, 0x1204),
    ('relay', 'relayPower', 'link', 0x130e, 0x131f, 0x1315, -0x32, 0x134d, 0x1352),
    ('firewall', 'firewallActive', 'maintenance', 0x145c, 0x146d, 0x1463, -0x33, 0x149b, 0x14a0),
    ('exit', 'exitReady', 'exitSocket', 0x15aa, 0x15bb, 0x15b1, -0x34, 0x15e9, 0x15ee),
]


def snapshots(trace):
    registers = dict(trace['initial_registers']); result = []
    for step in trace['steps']:
        before = dict(registers)
        for name, (_, value) in step['register_changes'].items():
            registers[name] = value
        result.append((before, dict(registers)))
    return result


def pe_reader(path):
    """Map retained RVA bytes without loading or executing the PE."""
    data = path.read_bytes()
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    require(data[:2] == b'MZ' and data[pe:pe+4] == b'PE\0\0', 'Invalid retained PE')
    count = struct.unpack_from('<H', data, pe+6)[0]
    optional_size = struct.unpack_from('<H', data, pe+20)[0]
    table = pe+24+optional_size
    sections = [struct.unpack_from('<8sIIIIIIHHI', data, table+i*40) for i in range(count)]

    def at(rva, size):
        for _, _, va, raw_size, raw, *_ in sections:
            if va <= rva and rva+size <= va+raw_size:
                value = data[raw+rva-va:raw+rva-va+size]
                require(len(value) == size, 'Truncated section')
                return value
        raise ValueError('RVA outside file-backed sections')
    return at


def derive():
    cfg = read(ROOT/'evidence/disassembly-bcf.json.gz')
    traces = read(ROOT/'evidence/representative-traces.json.gz')['traces']
    summary = read(ROOT/'evidence/trace-summary.json')
    contract = read(ROOT/'contract.json')
    proof = read(ROOT/'evidence/bogus-proof.json.gz')
    binary = ROOT/'bin/obfuscated_x64.exe'
    require(sha(binary) == cfg['binary']['sha256'] == proof['binary_sha256'], 'Curation binary identity differs')
    at = pe_reader(binary)
    require([t['state_id'] for t in traces] == list(range(32)), 'Curation requires all 32 cases')
    instructions = {i['rva']: i for i in cfg['instructions']}
    blocks = {b['id']: b for b in cfg['blocks']}
    registers = {t['trace_id']: snapshots(t) for t in traces}
    fields = {f['name']: f for f in contract['inputs']}
    output_fields = {f['name']: f for f in contract['outputs']}
    ir = {}; current = None
    for number, line in enumerate((ROOT/'build_or_identity/bcf/controller.ll').read_text().splitlines(), 1):
        match = re.match(r'^([-A-Za-z$._0-9]+):', line)
        if match:
            current = match[1]; ir[current] = []
        elif current and line.strip() and not line.lstrip().startswith(';'):
            ir[current].append({'line': number, 'text': line.strip()})
        if line == '}': current = None
    fragments = []; conditions = []

    def fragment(fid, output, role, start, end, context, association=None, store=None):
        selected = [i for i in cfg['instructions'] if start <= i['rva'] < end]
        require(selected and selected[0]['rva'] == start and selected[-1]['rva']+selected[-1]['size'] == end, 'Inexact fragment boundary')
        block = blocks[selected[0]['block_id']]
        require(all(i['block_id'] == block['id'] for i in selected) and 3 <= len(selected) <= 5, 'Fragment is not a small real block subsequence')
        require([i['address'] for i in selected] == [a for a in block['instruction_addresses'] if cfg['binary']['image_base']+start <= a < cfg['binary']['image_base']+end], 'Fragment differs from raw block')
        for i, ins in enumerate(selected):
            require(at(ins['rva'], ins['size']) == bytes.fromhex(ins['bytes']), 'Excerpt bytes differ from PE')
            require(ins['address'] == cfg['binary']['image_base']+ins['rva'], 'Excerpt VA differs')
            if i: require(selected[i-1]['rva']+selected[i-1]['size'] == ins['rva'], 'Excerpt is not contiguous')
        support = []
        for t in traces:
            require(t['binary_sha256'] == cfg['binary']['sha256'], 'Trace binary differs')
            steps = [s for s in t['steps'] if start <= s['rva'] < end]
            if not steps: continue
            require([s['rva'] for s in steps] == [i['rva'] for i in selected], 'Partial or repeated fragment needs separate representation')
            indices = [s['index'] for s in steps]
            require(indices == list(range(indices[0], indices[0]+len(indices))), 'Excerpt execution is not contiguous')
            require(len({s['raw_occurrence_id'] for s in steps}) == 1, 'Excerpt spans raw occurrences')
            support.append({'trace_id': t['trace_id'], 'case_id': t['state_id'], 'step_indices': indices, 'raw_occurrence_id': steps[0]['raw_occurrence_id']})
        require(support, 'A non-observed clone cannot be a result alternative')
        result = {'id': fid, 'output': output, 'role': role, 'source_block_id': block['id'],
            'address_range': {'start_rva': start, 'end_rva_exclusive': end, 'start_va': selected[0]['address'], 'end_va_exclusive': selected[-1]['address']+selected[-1]['size']},
            'compiler_labels': block['compiler_labels'], 'instructions': selected, 'context': context,
            'input_fields': [] if association is None else [association], 'verified_output_store': store,
            'supporting_traces': support}
        fragments.append(result)
        return result

    for rid, output, name, start, end, compare, spill, reload, branch in RULES:
        field = fields[name]
        association = {'name': name, 'offset': field['offset'], 'width_bits': 32, 'domain': field['domain'], 'read_rva': compare}
        rf = fragment(rid+'.read', output, 'input_check', start, end,
            'Compare the actual uint32 input with zero, SETNE AL, then preserve it in a stack byte. '+
            ('RAX already points to the saved input-pointer slot; 0x1076 stored original RCX there.' if rid == 'crossing' else 'Two MOVs restore the input pointer through [RBP-0x20].'), association)
        bf = fragment(rid+'.branch', output, 'puzzle_branch', reload, branch+instructions[branch]['size'],
            f'Reload the saved Boolean from RBP{spill:+#x}; TEST AL,1 provides JNE flags. Intervening opaque guards clobber AL/flags; they are not player inputs.', association)
        require([(i['mnemonic'],i['op_str']) for i in rf['instructions'][-2:]] == [('setne','al'),('mov',f'byte ptr [rbp - {hex(-spill)}], al')], 'Expected SETNE/spill encoding differs')
        require([(i['mnemonic'],i['op_str']) for i in bf['instructions'][:2]] == [('mov',f'al, byte ptr [rbp - {hex(-spill)}]'),('test','al, 1')] and bf['instructions'][2]['mnemonic'] == 'jne', 'Expected reload/TEST/JNE differs')
        between = [g for g in proof['guards'] if end <= int(g['predicate_start_rva'], 16) and int(g['branch_rva'], 16) < reload]
        require(len(between) == 1 and between[0]['universally_taken'] is True, 'Expected one intervening proven guard')
        read_labels = blocks[instructions[compare]['block_id']]['compiler_labels']
        branch_labels = blocks[instructions[branch]['block_id']]['compiler_labels']
        require(len(read_labels) == len(branch_labels) == 1, 'Ambiguous IR labels')
        read_ir = ir[read_labels[0]['ir_block']]
        branch_ir = ir[branch_labels[0]['ir_block']]
        gep = [line for line in read_ir if re.fullmatch(r'%'+re.escape(name)+r' = getelementptr inbounds %struct.ControllerInputs, ptr %[-A-Za-z$._0-9]+, i32 0, i32 '+str(field['offset']//4), line['text'])]
        require(len(gep) == 1, 'IR field does not match input layout')
        loads = [re.fullmatch(r'(%[-A-Za-z$._0-9]+) = load i32, ptr %'+re.escape(name)+r', align 4', line['text']) for line in read_ir]
        loads = [m for m in loads if m]
        require(len(loads) == 1, 'IR input load missing')
        predicates = [re.fullmatch(r'(%[-A-Za-z$._0-9]+) = icmp ne i32 '+re.escape(loads[0][1])+r', 0', line['text']) for line in read_ir]
        predicates = [m for m in predicates if m]
        require(len(predicates) == 1 and len(branch_ir) == 1 and re.fullmatch(r'br i1 '+re.escape(predicates[0][1])+r', label %[-A-Za-z$._0-9]+, label %[-A-Za-z$._0-9]+', branch_ir[0]['text']), 'IR saved predicate/branch association differs')
        support = []
        for t in traces:
            comp_steps = [s for s in t['steps'] if s['rva'] == compare]
            jump_steps = [s for s in t['steps'] if s['rva'] == branch]
            require(len(comp_steps) == len(jump_steps) == 1, 'Each input must be read and branched exactly once')
            comp, jump = comp_steps[0], jump_steps[0]
            operand, zero = comp['comparison']['operands']
            require(operand['kind'] == 'memory' and operand['width'] == 32 and operand['address'] == t['machine_model']['input_address']+field['offset'] and operand['unsigned'] == t['inputs'][name], 'Wrong input-field association')
            require(comp['comparison']['operation'] == 'cmp' and zero['kind'] == 'immediate' and zero['unsigned'] == 0, 'Wrong input comparison')
            truth = int(operand['unsigned'] != 0)
            addr = registers[t['trace_id']][comp['index']][0]['rbp']+spill
            writes = [(s,w) for s in t['steps'][comp['index']:jump['index']] for w in s['memory_writes'] if w['address'] <= addr < w['address']+w['size']]
            require(len(writes) == 1 and writes[0][1]['address'] == addr and writes[0][1]['size'] == 1 and writes[0][1]['value'] == truth, 'Saved predicate changed across guard')
            load = next(s for s in t['steps'][comp['index']:jump['index']] if s['rva'] == reload)
            require(registers[t['trace_id']][load['index']][1]['rax'] & 255 == truth and jump['branch']['taken'] == bool(truth), 'Reload/branch contradicts input predicate')
            event = [e for e in t['semantic_events'] if e['kind'] == 'output_write' and e['output'] == output]
            expected = 1-truth if output == 'firewallActive' else truth
            require(len(event) == 1 and event[0]['value'] == expected and event[0]['step_index'] > jump['index'], 'Input predicate does not reach expected output store')
            require(t['final_outputs'][output] == t['native_outputs'][output] == t['expected_outputs'][output] == expected, 'Mapped output differs from native/oracle result')
            support.append({'trace_id': t['trace_id'], 'case_id': t['state_id'], 'comparison_step': comp['index'], 'input_address': operand['address'], 'input_value': operand['unsigned'], 'predicate_value': truth, 'spill_address': addr, 'spill_step': writes[0][0]['index'], 'reload_step': load['index'], 'branch_step': jump['index'], 'branch_observation': jump['branch'], 'output_event_id': event[0]['id'], 'output_store_rva': event[0]['instruction_rva'], 'output_value': expected})
        conditions.append({'id': rid, 'output': output, 'input': association, 'predicate': 'uint32_input != 0', 'spill_offset_from_rbp': spill,
            'read_fragment_id': rf['id'], 'branch_fragment_id': bf['id'], 'guard_between_read_and_branch': between[0]['id'],
            'native_successors': blocks[instructions[branch]['block_id']]['successors'],
            'ir_checks': {label['ir_block']: ir[label['ir_block']] for label in read_labels+branch_labels},
            'output_for_input_zero': 1 if output == 'firewallActive' else 0,
            'output_for_input_one': 0 if output == 'firewallActive' else 1, 'support': support})

    for site in summary['output_store_sites']:
        require(len(site['observed_values']) == 1, 'Store is not a fixed immediate')
        value = site['observed_values'][0]; ins = instructions[site['instruction_rva']]; block = blocks[ins['block_id']]
        f = fragment(site['output']+f'.write-{value}', site['output'], 'output_store', block['start_rva'], ins['rva']+ins['size'],
            'Restore original RDX output pointer through [RBP-0x28] and write this exact immediate. This is a genuine observed result alternative.', store=site)
        require([(i['mnemonic'],i['op_str']) for i in f['instructions'][:2]] == [('mov','rax, qword ptr [rbp - 0x28]'),('mov','rax, qword ptr [rax]')], 'Output-pointer restore differs')
        field = output_fields[site['output']]
        require(site['byte_offset'] == field['offset'], 'Output-store field offset differs')
        labels = block['compiler_labels']
        require(len(labels) == 1, 'Ambiguous store IR origin')
        lines = ir[labels[0]['ir_block']]
        destinations = [re.fullmatch(r'(%[-A-Za-z$._0-9]+) = getelementptr inbounds %struct.ControllerOutputs, ptr %[-A-Za-z$._0-9]+, i32 0, i32 '+str(field['offset']//4), line['text']) for line in lines]
        destinations = [m for m in destinations if m]
        require(len(destinations) == 1 and any(line['text'] == f'store i32 {value}, ptr {destinations[0][1]}, align 4' for line in lines), 'Output store lacks matching IR field/value')
        f['ir_checks'] = {labels[0]['ir_block']: lines}
        actual_cases = []
        for t in traces:
            events = [e for e in t['semantic_events'] if e['instruction_rva'] == site['instruction_rva']]
            if not events: continue
            require(len(events) == 1, 'Repeated output store')
            event = events[0]; step = t['steps'][event['step_index']]
            require(event['output'] == site['output'] and event['value'] == value and event['memory_address'] == t['machine_model']['output_address']+field['offset'], 'Output event association differs')
            require(any(w['address'] == event['memory_address'] and w['size'] == 4 and w['value'] == value for w in step['memory_writes']), 'Output event lacks actual write')
            require(registers[t['trace_id']][step['index']][0]['rax'] == t['machine_model']['output_address'], 'Store pointer is not original output buffer')
            actual_cases.append(t['state_id'])
        require(actual_cases == site['case_ids'] and len(actual_cases) == 16, 'Output store must be observed in exactly 16 Boolean cases')

    sections = []
    for output in OUTPUTS:
        selected = [f for f in fragments if f['output'] == output]
        stores = {str(f['verified_output_store']['observed_values'][0]): f['id'] for f in selected if f['role'] == 'output_store'}
        require(set(stores) == {'0','1'} and len(selected) == 4, 'Every output needs two observed stores and its condition pair')
        sections.append({'output': output, 'condition_fragment_ids': [f['id'] for f in selected if f['role'] != 'output_store'],
            'store_alternatives': stores,
            'required_accepted_inputs': [c['input']['name'] for c in conditions if c['output'] == output]})
    require(sections[-1]['required_accepted_inputs'] == ['exitSocket'], 'Exit must have no maintenance gate')
    compositions = []
    for t in traces:
        for output in OUTPUTS:
            selected = [(f,s) for f in fragments if f['output'] == output for s in f['supporting_traces'] if s['trace_id'] == t['trace_id']]
            selected.sort(key=lambda pair: pair[1]['step_indices'][0]); gaps = []
            require(len(selected) == 3, 'A composition requires read, branch, and one selected store')
            for (left, ls), (right, rs) in zip(selected, selected[1:]):
                lo, hi = ls['step_indices'][-1]+1, rs['step_indices'][0]
                require(hi >= lo, 'Overlapping fragments')
                if hi > lo:
                    gaps.append({'after_fragment_id': left['id'], 'before_fragment_id': right['id'], 'start_step': lo, 'end_step_exclusive': hi,
                        'omitted_instruction_count': hi-lo, 'omitted_rvas': [s['rva'] for s in t['steps'][lo:hi]],
                        'raw_block_chain': list(dict.fromkeys(s['block_id'] for s in t['steps'][lo:hi]))})
            compositions.append({'case_id': t['state_id'], 'trace_id': t['trace_id'], 'output': output,
                'fragment_ids_in_execution_order': [f['id'] for f,s in selected], 'gaps': gaps})
    catalogue = {'schema': 'handshake-v2-fragments/v1', 'binary_sha256': proof['binary_sha256'], 'image_base': cfg['binary']['image_base'],
        'controller_bounds': cfg['function'], 'fragments': fragments, 'sections': sections,
        'identity_rule': 'Each fragment is one contiguous subsequence of a real raw block. Separate fragments must retain separate address labels and explicit gaps.',
        'presentation_rule': 'Accepted output selects a real store as STATE-LINKED. Only an exact five-input retained trace may animate EMULATED REPLAY. Neither mode is live native execution; missing inputs disable replay. Bogus clones are never valid result alternatives.'}
    decisions = {'schema': 'handshake-v2-decisions/v1', 'binary_sha256': proof['binary_sha256'], 'conditions': conditions,
        'scope': 'Five independent field predicates implement five outputs. A true maintenance predicate reaches the firewall zero store; exitReady reads only exitSocket. All 32 canonical Boolean cases support this association. Entry/prologue establishes RCX/RDX pointer slots; assumptions exclude corrupted machine states.'}
    composition = {'schema': 'handshake-v2-fragment-compositions/v1', 'trace_sha256': sha(ROOT/'evidence/representative-traces.json.gz'), 'compositions': compositions}
    integration = {'schema': 'coop-native-integration/v1', 'chamber_id': 'handshake-v2', 'status': 'proposal_only_no_live_integration',
        'contract_sha256': sha(ROOT/'contract.json'), 'trace_summary_sha256': sha(ROOT/'evidence/trace-summary.json'),
        'server_owned': contract['server_owned'], 'outputs': [{**f, 'memory': f"uint32_t at the output buffer supplied in RDX + {f['offset']} bytes",
            'bindings': [b for b in contract['bindings'] if b['output'] == f['name']],
            'verified_bcf_store_sites': [s for s in summary['output_store_sites'] if s['output'] == f['name']],
            'observed_values': summary['output_value_coverage'][f['name']]} for f in contract['outputs']]}
    return {'fragments.json': catalogue, 'evidence/decision-mappings.json': decisions, 'evidence/fragment-compositions.json.gz': composition, 'integration.json': integration}


if __name__ == '__main__':
    artifacts = derive()
    for path, value in artifacts.items():
        require(not (ROOT/path).exists(), 'Refusing to overwrite frozen curation: '+path)
        save(ROOT/path, value)
    print('PASS: 20 real fragments, five independent predicates, ten observed zero/one stores; firewall inverse and exitSocket-only verified.')
