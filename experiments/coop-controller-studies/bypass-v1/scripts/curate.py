"""Derive honest, separate excerpts from the retained BYPASS PE and all 16 traces.

Read/spill/branch checks follow the established race-cargo-v1 curation method;
all addresses, slots, predicates and observations here belong to this new PE.
derive() is read-only so the portable audit can recompute the catalogue.
"""
from pathlib import Path
import re
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, read, save, sha, require, OUTPUTS

RULES = [
    ('anchor-hold', 'anchorPower', 'anchorHold', 0x1079, 0x1085, 0x107c, -0x11, 0x10b3, 0x10b8),
    ('anchor-link', 'anchorPower', 'link', 0x10ea, 0x10fb, 0x10f1, -0x31, 0x1129, 0x112e),
    ('bridge-link', 'bridgePower', 'link', 0x1236, 0x1247, 0x123d, -0x32, 0x1275, 0x127a),
    ('firewall-hold', 'firewallActive', 'bypassHold', 0x1384, 0x1395, 0x138b, -0x33, 0x13c3, 0x13c8),
    ('firewall-override', 'firewallActive', 'override', 0x13fa, 0x140b, 0x1401, -0x34, 0x1439, 0x143e),
]


def snapshots(trace):
    registers = dict(trace['initial_registers']); result = []
    for step in trace['steps']:
        before = dict(registers)
        for name, (_, value) in step['register_changes'].items(): registers[name] = value
        result.append((before, dict(registers)))
    return result


def derive():
    cfg = read(ROOT/'evidence/disassembly-bcf.json.gz')
    traces = read(ROOT/'evidence/representative-traces.json.gz')['traces']
    summary = read(ROOT/'evidence/trace-summary.json')
    contract = read(ROOT/'contract.json')
    proof = read(ROOT/'evidence/bogus-proof.json.gz')
    instructions = {i['rva']: i for i in cfg['instructions']}
    blocks = {b['id']: b for b in cfg['blocks']}
    registers = {t['trace_id']: snapshots(t) for t in traces}
    fields = {f['name']: f for f in contract['inputs']}
    ir = {}; current = None
    for number, line in enumerate((ROOT/'build_or_identity/bcf/controller.ll').read_text().splitlines(), 1):
        match = re.match(r'^([-A-Za-z$._0-9]+):', line)
        if match: current = match[1]; ir[current] = []
        elif current and line.strip() and not line.lstrip().startswith(';'):
            ir[current].append({'line': number, 'text': line.strip()})
        if line == '}': current = None
    fragments = []; conditions = []

    def fragment(fid, output, role, start, end, context, association=None, store=None):
        selected = [i for i in cfg['instructions'] if start <= i['rva'] < end]
        require(selected and selected[0]['rva'] == start and selected[-1]['rva']+selected[-1]['size'] == end, 'Inexact fragment boundary')
        block = blocks[selected[0]['block_id']]
        require(all(i['block_id'] == block['id'] for i in selected) and 3 <= len(selected) <= 5, 'Fragment is not a small real block subsequence')
        support = []
        for t in traces:
            steps = [s for s in t['steps'] if start <= s['rva'] < end]
            if not steps: continue
            require([s['rva'] for s in steps] == [i['rva'] for i in selected], 'Partial or repeated fragment needs separate representation')
            support.append({'trace_id': t['trace_id'], 'case_id': t['state_id'], 'step_indices': [s['index'] for s in steps], 'raw_occurrence_id': steps[0]['raw_occurrence_id']})
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
            ('RAX already points to the saved input-pointer slot; 0x1076 stored original RCX there.' if rid == 'anchor-hold' else 'Two MOVs restore the input pointer through [RBP-0x20].'), association)
        bf = fragment(rid+'.branch', output, 'puzzle_branch', reload, branch+instructions[branch]['size'],
            f'Reload the saved Boolean from RBP{spill:+#x}; TEST AL,1 provides JNE flags. Intervening opaque guards clobber AL/flags; they are not player inputs.', association)
        between = [g for g in proof['guards'] if end <= int(g['predicate_start_rva'], 16) and int(g['branch_rva'], 16) < reload]
        require(len(between) == 1, 'Expected one intervening proven guard')
        support = []
        for t in traces:
            comp = next((s for s in t['steps'] if s['rva'] == compare), None)
            jump = next((s for s in t['steps'] if s['rva'] == branch), None)
            if comp is None:
                require(jump is None, 'Decision bypasses its input read'); continue
            require(jump is not None, 'Read does not reach its branch')
            operand, zero = comp['comparison']['operands']
            require(operand['kind'] == 'memory' and operand['width'] == 32 and operand['address'] == t['machine_model']['input_address']+field['offset'] and operand['unsigned'] == t['inputs'][name], 'Wrong input-field association')
            require(comp['comparison']['operation'] == 'cmp' and zero['kind'] == 'immediate' and zero['unsigned'] == 0, 'Wrong input comparison')
            truth = int(operand['unsigned'] != 0)
            addr = registers[t['trace_id']][comp['index']][0]['rbp']+spill
            writes = [(s,w) for s in t['steps'][comp['index']:jump['index']] for w in s['memory_writes'] if w['address'] <= addr < w['address']+w['size']]
            require(len(writes) == 1 and writes[0][1]['address'] == addr and writes[0][1]['size'] == 1 and writes[0][1]['value'] == truth, 'Saved predicate changed across guard')
            load = next(s for s in t['steps'][comp['index']:jump['index']] if s['rva'] == reload)
            require(registers[t['trace_id']][load['index']][1]['rax'] & 255 == truth and jump['branch']['taken'] == bool(truth), 'Reload/branch contradicts input predicate')
            support.append({'trace_id': t['trace_id'], 'case_id': t['state_id'], 'comparison_step': comp['index'], 'input_address': operand['address'], 'input_value': operand['unsigned'], 'predicate_value': truth, 'spill_address': addr, 'spill_step': writes[0][0]['index'], 'reload_step': load['index'], 'branch_step': jump['index'], 'branch_observation': jump['branch']})
        labels = blocks[instructions[compare]['block_id']]['compiler_labels']+blocks[instructions[branch]['block_id']]['compiler_labels']
        conditions.append({'id': rid, 'output': output, 'input': association, 'predicate': 'uint32_input != 0', 'spill_offset_from_rbp': spill,
            'read_fragment_id': rf['id'], 'branch_fragment_id': bf['id'], 'guard_between_read_and_branch': between[0]['id'],
            'native_successors': blocks[instructions[branch]['block_id']]['successors'],
            'ir_checks': {label['ir_block']: ir[label['ir_block']] for label in labels}, 'support': support})

    for site in summary['output_store_sites']:
        require(len(site['observed_values']) == 1, 'Store is not a fixed immediate')
        value = site['observed_values'][0]; ins = instructions[site['instruction_rva']]; block = blocks[ins['block_id']]
        fragment(site['output']+f'.write-{value}', site['output'], 'output_store', block['start_rva'], ins['rva']+ins['size'],
            'Restore original RDX output pointer through [RBP-0x28] and write this exact immediate. '+
            ('Constant-one assignment; no input predicate or zero alternative.' if site['output'] == 'exitReady' else 'This is a genuine observed result alternative.'), store=site)
    sections = []
    for output in OUTPUTS:
        selected = [f for f in fragments if f['output'] == output]
        sections.append({'output': output, 'condition_fragment_ids': [f['id'] for f in selected if f['role'] != 'output_store'],
            'store_alternatives': {str(f['verified_output_store']['observed_values'][0]): f['id'] for f in selected if f['role'] == 'output_store'},
            'required_accepted_inputs': list(dict.fromkeys(c['input']['name'] for c in conditions if c['output'] == output)),
            'constant': 1 if output == 'exitReady' else None})
    compositions = []
    for t in traces:
        for output in OUTPUTS:
            selected = [(f,s) for f in fragments if f['output'] == output for s in f['supporting_traces'] if s['trace_id'] == t['trace_id']]
            selected.sort(key=lambda pair: pair[1]['step_indices'][0]); gaps = []
            for (left, ls), (right, rs) in zip(selected, selected[1:]):
                lo, hi = ls['step_indices'][-1]+1, rs['step_indices'][0]
                if hi > lo:
                    gaps.append({'after_fragment_id': left['id'], 'before_fragment_id': right['id'], 'start_step': lo, 'end_step_exclusive': hi,
                        'omitted_instruction_count': hi-lo, 'omitted_rvas': [s['rva'] for s in t['steps'][lo:hi]],
                        'raw_block_chain': list(dict.fromkeys(s['block_id'] for s in t['steps'][lo:hi]))})
            compositions.append({'case_id': t['state_id'], 'trace_id': t['trace_id'], 'output': output,
                'fragment_ids_in_execution_order': [f['id'] for f,s in selected], 'gaps': gaps})
    constant = {'output': 'exitReady', 'value': 1, 'input_requirements': [], 'condition_fragment_ids': [],
        'valid_store_rvas': [0x154f], 'zero_alternative': None,
        'scope': 'All 16 canonical Boolean vectors and all nine ordered snapshots; ordinary ABI entry, valid distinct buffers and intact code. Output is a constant unlock request, not arrival/latch state.'}
    catalogue = {'schema': 'bypass-fragments/v1', 'binary_sha256': proof['binary_sha256'], 'image_base': cfg['binary']['image_base'],
        'controller_bounds': cfg['function'], 'fragments': fragments, 'sections': sections, 'constant_output': constant,
        'identity_rule': 'Each fragment is one contiguous subsequence of a real raw block. Separate fragments must retain separate address labels and explicit gaps.',
        'presentation_rule': 'Accepted output selects a real store as STATE-LINKED. Only an exact four-input retained trace may animate EMULATED REPLAY. Neither mode is live native execution; missing inputs disable replay. Bogus clones are never valid result alternatives.'}
    decisions = {'schema': 'bypass-decisions/v1', 'binary_sha256': proof['binary_sha256'], 'conditions': conditions, 'constant_output': constant,
        'scope': 'Five field predicates implement the first three outputs with short-circuit control flow. Firewall true input predicates reach its zero store. Entry/prologue establishes RCX/RDX pointer slots; assumptions are not arbitrary corrupted machine states.'}
    composition = {'schema': 'bypass-fragment-compositions/v1', 'trace_sha256': sha(ROOT/'evidence/representative-traces.json.gz'), 'compositions': compositions}
    integration = {'schema': 'coop-native-integration/v1', 'chamber_id': 'bypass', 'status': 'proposal_only_no_live_integration',
        'contract_sha256': sha(ROOT/'contract.json'), 'trace_summary_sha256': sha(ROOT/'evidence/trace-summary.json'), 'constant_outputs': {'exitReady': 1},
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
    print('PASS: 17 real fragments, five predicates, seven stores; exitReady has only constant one.')
