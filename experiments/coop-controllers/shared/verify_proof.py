"""Independent, read-only, standard-library verifier for retained co-op BCF proof.

Called by verify_bundle.py. It never imports the proof producer, invokes a solver,
executes a binary, assembles code, or writes a file. Its analytical check concerns
this exact decoded instruction pattern, not arbitrary x86 programs.
"""
from pathlib import Path
import gzip
import hashlib
import json
import re


def require(condition, message):
    if not condition:
        raise ValueError('BCF proof: ' + message)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    path=Path(path);data=path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix=='.gz' else data)


def number(value):
    return int(value, 0) if isinstance(value, str) else int(value)


def local(root, relative):
    path = (root / relative).resolve()
    require(path.is_relative_to(root) or path.is_relative_to(root.parent/'shared/ollvm_source'), 'Evidence path escapes experiment/shared retained source')
    return path


def transfer(instruction, base):
    """Read direct relative control transfers from actual checked instruction bytes."""
    data = bytes.fromhex(instruction['bytes'])
    address = instruction['address']
    if data[0] == 0xE9 and len(data) == 5:
        return ('jump', address + 5 + int.from_bytes(data[1:], 'little', signed=True))
    if data[0] == 0xEB and len(data) == 2:
        return ('jump', address + 2 + int.from_bytes(data[1:], 'little', signed=True))
    if data[0] == 0xE8 and len(data) == 5:
        return ('call', address + 5 + int.from_bytes(data[1:], 'little', signed=True))
    if 0x70 <= data[0] <= 0x7F and len(data) == 2:
        return ('conditional', address + 2 + int.from_bytes(data[1:], 'little', signed=True))
    if len(data) == 6 and data[0] == 0x0F and 0x80 <= data[1] <= 0x8F:
        return ('conditional', address + 6 + int.from_bytes(data[2:], 'little', signed=True))
    if data[0] in (0xC3, 0xC2):
        require(len(data) == (1 if data[0] == 0xC3 else 3), 'Invalid RET bytes')
        return ('return', None)
    position = 0
    while position < len(data) and (0x40 <= data[position] <= 0x4F or data[position] in
                                   (0x26, 0x2E, 0x36, 0x3E, 0x64, 0x65, 0x66, 0x67, 0xF0, 0xF2, 0xF3)):
        position += 1
    if position+1 < len(data) and data[position] == 0xFF:
        require(((data[position+1] >> 3) & 7) not in (2, 3, 4, 5), 'Indirect/far control transfer is outside this proof')
    require(not instruction['mnemonic'].startswith('j') and instruction['mnemonic'] not in
            ('call', 'ret', 'retf', 'iret', 'iretd', 'iretq', 'loop', 'loope', 'loopne'),
            'Unrecognized control-transfer encoding')
    return None


def check_proof(root, cfg, image, traces, build):
    root = Path(root).resolve()
    proof_path = root / 'evidence/bogus-proof.json.gz'
    proof = read(proof_path)
    require(proof['schema'] == 'coop-native-bcf-proof/v1', 'Wrong proof schema')
    require(proof['binary_sha256'] == build['binary_sha256'] == cfg['binary']['sha256'], 'Binary identity mismatch')
    require(proof['guard_count']==len(proof['guards'])==2*len(proof['clones']) and proof['clone_count']==len(proof['clones'])>0,'Unexpected frozen guard/clone counts')
    require(proof['contract_sha256']==sha(root/'contract.json'),'Proof contract differs')
    require(all(proof['solver'][field] == 'unsat' for field in
                ('false_jne_condition', 'signed_cmp_flag_equivalence', 'ir_native_predicate_equivalence')),
            'Missing successful recorded solver result')
    require(proof['formula'] == '(((x * (x - 1)) mod 2^32) & 1) == 0 OR signed_i32(y) < 10',
            'Unexpected stated predicate')
    require(proof['assumptions'] and 'no x=y=0 assumption' in proof['quantification'], 'Missing proof scope')

    for item in proof['artifacts'].values():
        require(sha(local(root, item['path'])) == item['sha256'], 'Artifact hash mismatch: ' + item['path'])
    for item in [proof['cross_checks']['raw_cfg'], proof['cross_checks']['traces']]:
        require(sha(local(root, item['path'])) == item['sha256'], 'Cross-check artifact hash mismatch: ' + item['path'])
    identity = read(root / 'build_or_identity/identity.json')
    require(identity['compiler']['sha256'] == proof['compiler_source']['compiler_sha256'] ==
            '0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be', 'Compiler source identity mismatch')
    source_manifest = read(root.parent / 'shared/ollvm_source/manifest.json')
    for source in source_manifest['file_records']:
        require(sha(local(root, '../shared/ollvm_source/' + source['path'])) == source['sha256'], 'Pass-source hash mismatch')
    require(source_manifest['release_commit'] == 'fe39b37ebdbce04d34a5c653b888d68ba4d394c9' and
            source_manifest['head'] == '5cbfb7245415f6b8e9f845e70c848eeb1605045f', 'Unexpected source revision')
    require(source_manifest['bcf_executable_code_equal_after_comment_whitespace_removal'], 'Source code provenance differs')

    base = image.base
    start = number(proof['target']['start_rva']) + base
    end = number(proof['target']['end_rva_exclusive']) + base
    require(proof['target']['name'] == 'bn_evaluate' and
            start == cfg['function']['start_va'] and end == cfg['function']['end_va'], 'Target extent mismatch')
    require(hashlib.sha256(image.at(start-base, end-start)).hexdigest() == proof['target']['bytes_sha256'],
            'Target code hash mismatch')
    instructions = cfg['instructions']
    by_address = {i['address']: i for i in instructions}
    require(len(by_address) == len(instructions), 'Duplicate instruction address')
    cursor = start
    for instruction in instructions:
        data = bytes.fromhex(instruction['bytes'])
        require(instruction['address'] == cursor and instruction['rva'] == cursor-base and
                instruction['size'] == len(data) and image.at(cursor-base, len(data)) == data,
                'Instruction coverage/PE bytes differ')
        cursor += len(data)
    require(cursor == end, 'Incomplete native extent coverage')
    transfers = [(i, transfer(i, base)) for i in instructions]
    transfers = [(i, t) for i,t in transfers if t is not None]
    for instruction, (_, target) in transfers:
        require(target is None or not start <= target < end or target in by_address,
                'Static transfer enters an instruction interior')

    symbols = {}
    for line in (root / 'build_or_identity/bcf/controller.map').read_text().splitlines():
        match = re.match(r'^\s*[0-9a-fA-F]{4}:[0-9a-fA-F]{8}\s+(\S+)\s+([0-9a-fA-F]{16})\s', line)
        if match:
            symbols[match[1]] = int(match[2], 16)
    require(symbols['bn_evaluate'] == start, 'Map target entry differs')
    labels = read(root / 'build_or_identity/bcf/assembly_labels.json')
    original = (root / 'build_or_identity/bcf/controller.s').read_text()
    marked = (root / 'build_or_identity/bcf/controller.labelled.s').read_text()
    stripped = '\n'.join(line for line in marked.splitlines()
                         if not re.match(r'^\s*\.globl\s+audit_LBB\d+_\d+\s*$', line)
                         and not re.match(r'^audit_LBB\d+_\d+:\s*$', line)) + '\n'
    require(stripped == original, 'Label insertion changed assembly instructions')
    ir_address = {'entry': start}
    for label in labels:
        match = re.search(r'^' + re.escape(label['assembly_label']) + r':\s*#\s*%(\S+)', original, re.M)
        require(match and match[1] == label['ir_block'], 'Assembly comment mapping differs')
        ir_address[label['ir_block']] = symbols[label['symbol']]
        require(symbols[label['symbol']] in by_address, 'IR label is not an instruction boundary')
    ir_blocks = {}
    name = None
    for line in (root / 'build_or_identity/bcf/controller.ll').read_text().splitlines():
        match = re.match(r'^([A-Za-z0-9_.]+):', line)
        if match:
            name = match[1]
            ir_blocks[name] = []
        elif name and line.startswith('  '):
            ir_blocks[name].append(line.strip())
    expected_ir_guards = {}
    for name, lines in ir_blocks.items():
        match = re.fullmatch(r'br i1 (%\d+), label %(\S+), label %(\S+alteredBB)', lines[-1]) if lines else None
        if not match:
            continue
        tail = lines[-9:]
        require(len(tail) == 9, 'IR predicate truncated')
        x = re.fullmatch(r'(%\d+) = load i32, ptr @x, align 4', tail[0])
        y = re.fullmatch(r'(%\d+) = load i32, ptr @y, align 4', tail[1])
        require(x and y, 'IR load pattern differs')
        definitions = [line.split(' = ',1)[0] for line in tail[2:8]]
        expected = [f'{definitions[0]} = sub i32 {x[1]}, 1',
                    f'{definitions[1]} = mul i32 {x[1]}, {definitions[0]}',
                    f'{definitions[2]} = urem i32 {definitions[1]}, 2',
                    f'{definitions[3]} = icmp eq i32 {definitions[2]}, 0',
                    f'{definitions[4]} = icmp slt i32 {y[1]}, 10',
                    f'{definitions[5]} = or i1 {definitions[3]}, {definitions[4]}']
        require(tail[2:8] == expected and match[1] == definitions[-1], 'IR predicate SSA wiring differs')
        expected_ir_guards[name] = (match[2], match[3])
    require(len(expected_ir_guards) == proof['guard_count'], 'Retained IR guard coverage differs')

    # Independent analytical argument: modulo 2^32 preserves bit zero. x and
    # x-1 have opposite parity, hence their product bit zero is always zero.
    # CMP/SETE therefore produces AL=1. SETL produces CL in {0,1}, so OR AL,CL
    # remains 1, TEST AL,1 clears ZF and JNE must be taken for every x/y.
    # Signed y comparison cannot invalidate an OR whose first term is true.
    require(all((parity * ((parity-1) & 1)) & 1 == 0 for parity in (0, 1)), 'Parity identity failed')
    require(all((1 | setl_result) & 1 == 1 for setl_result in (0, 1)), 'OR/TEST identity failed')
    encoded = [bytes.fromhex(h) for h in ('89c2', '83ea01', '0fafc2', '83e001', '83f800',
                                        '0f94c0', '83f90a', '0f9cc1', '08c8', 'a801')]
    blocks = cfg['blocks']
    def block_at(address):
        matches = [b for b in blocks if b['start_va'] <= address < b['end_va']]
        require(len(matches) == 1, 'Instruction lacks a unique raw block')
        return matches[0]
    guard_by_id = {}
    seen_owners = set()
    for guard in proof['guards']:
        require(guard['id'] not in guard_by_id, 'Duplicate guard ID')
        guard_by_id[guard['id']] = guard
        require(guard['ir_block'] in expected_ir_guards and guard['ir_block'] not in seen_owners,
                'Missing/duplicate IR guard owner')
        seen_owners.add(guard['ir_block'])
        require(expected_ir_guards[guard['ir_block']] == (guard['true_ir'], guard['false_ir']), 'Guard IR successor differs')
        native_start = number(guard['predicate_start_rva']) + base
        owner_start = ir_address[guard['ir_block']]
        owner_end = min([v for v in ir_address.values() if v > owner_start] + [end])
        require(owner_start <= native_start < owner_end, 'Native predicate is outside mapped IR block')
        cursor = native_start
        sequence = []
        for prefix, symbol in ((b'\x8b\x05', 'x'), (b'\x8b\x0d', 'y')):
            data = image.at(cursor-base, 6)
            require(data[:2] == prefix and cursor+6+int.from_bytes(data[2:], 'little', signed=True) == symbols[symbol],
                    'Native global load encoding/address differs')
            sequence.append(by_address[cursor]); cursor += 6
        for data in encoded:
            require(image.at(cursor-base, len(data)) == data, 'Native opaque arithmetic/flags encoding differs')
            sequence.append(by_address[cursor]); cursor += len(data)
        branch = by_address[cursor]
        require(bytes.fromhex(branch['bytes']) == b'\x75\x05', 'Native JNE encoding differs')
        sequence.append(branch); cursor += 2
        false_jump = by_address[cursor]
        require(bytes.fromhex(false_jump['bytes'])[:1] == b'\xe9' and false_jump['size'] == 5, 'Native false trampoline encoding differs')
        sequence.append(false_jump)
        require(number(guard['branch_rva'])+base == branch['address'] and
                number(guard['false_edge_trampoline_rva'])+base == false_jump['address'], 'Guard branch RVA differs')
        require(transfer(branch,base) == ('conditional', ir_address[guard['true_ir']]) and
                transfer(false_jump,base) == ('jump',ir_address[guard['false_ir']]), 'Native branch polarity/target differs')
        require(number(guard['true_target_rva'])+base == ir_address[guard['true_ir']] and
                number(guard['clone_target_rva'])+base == ir_address[guard['false_ir']], 'Recorded guard successor differs')
        require(guard['universally_taken'] is True and guard['false_edge_solver_result'] == 'unsat', 'Guard proof claim differs')
        require(guard['branch_block_id'] == block_at(branch['address'])['id'] and
                guard['false_trampoline_block_id'] == block_at(false_jump['address'])['id'], 'Guard raw block differs')
        require(len(sequence) == len(guard['instructions']) == 14, 'Guard instruction count differs')
        for instruction, recorded in zip(sequence,guard['instructions']):
            require(number(recorded['rva']) == instruction['rva'] and number(recorded['va']) == instruction['address']
                    and bytes.fromhex(recorded['bytes']) == bytes.fromhex(instruction['bytes'])
                    and recorded['text'] == (instruction['mnemonic']+' '+instruction['op_str']).strip(), 'Guard instruction evidence differs')
        require(not any(target is not None and native_start < target <= false_jump['address']
                        for _,(_,target) in transfers), 'A static transfer bypasses part of the predicate or enters its false trampoline')
    require(seen_owners == set(expected_ir_guards), 'Not every IR guard is proven')

    if isinstance(traces,dict):
        traces = list(traces.values())
    pack=read(root/'evidence/representative-traces.json.gz')
    require(len(traces)==len(pack['traces'])==len({t['state_id'] for t in traces})>0 and traces==pack['traces'],'Trace coverage differs from retained selection')
    require(all(t['binary_sha256'] == build['binary_sha256'] and t['validation']['ok'] for t in traces), 'Trace identity/validation differs')
    clones = {clone['ir_block']:clone for clone in proof['clones']}
    require(len(clones) == proof['clone_count'] and set(clones) == {name for name in ir_blocks if 'alteredBB' in name}, 'Clone IR coverage differs')
    for name,clone in clones.items():
        lo = number(clone['start_rva'])+base
        hi = number(clone['end_rva_exclusive'])+base
        require(lo == ir_address[name] and hi == min([v for v in ir_address.values() if v > lo]+[end]), 'Clone range differs')
        sequence = [i for i in instructions if lo <= i['address'] < hi]
        raw = [b for b in blocks if lo <= b['start_va'] < hi]
        require([b['id'] for b in raw] == clone['raw_block_ids'] and raw[0]['start_va'] == lo and raw[-1]['end_va'] == hi,
                'Clone raw region differs')
        require(len(sequence) == clone['instruction_count'] == len(clone['instructions']), 'Clone instruction count differs')
        for instruction,recorded in zip(sequence,clone['instructions']):
            require(number(recorded['rva']) == instruction['rva'] and number(recorded['va']) == instruction['address']
                    and bytes.fromhex(recorded['bytes']) == bytes.fromhex(instruction['bytes'])
                    and recorded['text'] == (instruction['mnemonic']+' '+instruction['op_str']).strip(), 'Clone instruction evidence differs')
        expected_guards = [g for g in proof['guards'] if g['false_ir'] == name]
        require(len(expected_guards) == 2 and clone['guard_ids'] == [g['id'] for g in expected_guards], 'Clone guards differ')
        expected_incoming = {number(g['false_edge_trampoline_rva'])+base for g in expected_guards}
        actual_incoming = [(i,t) for i,t in transfers if t[1] is not None and lo <= t[1] < hi]
        require({i['address'] for i,_ in actual_incoming} == expected_incoming and
                all(t == ('jump',lo) for _,t in actual_incoming), 'Unexpected branch/call into clone or its interior')
        preceding = next(i for i in instructions if i['address']+i['size'] == lo)
        preceding_transfer=transfer(preceding,base)
        require(preceding_transfer is not None and preceding_transfer[0] in ('jump','return'),'Physical fallthrough enters clone')
        original_name = name.replace('alteredBB','')
        require(clone['original_ir_block'] == original_name and ir_blocks[name][-1] == 'br label %'+original_name and
                transfer(sequence[-1],base) == ('jump',ir_address[original_name]) and
                number(clone['exit_target_rva'])+base == ir_address[original_name], 'Clone return mapping differs')
        label = next(label for label in labels if label['ir_block'] == name)
        require(clone['assembly_label'] == label['assembly_label'] and clone['symbol'] == label['symbol'], 'Clone audit label differs')
        require(clone['classification'] == 'obfuscator_generated_bogus' and clone['confidence'] == 'strong', 'Clone classification differs')
        observations = {str(t['state_id']):sum(lo <= step['address'] < hi for step in t['steps']) for t in traces}
        require(not any(observations.values()) and observations == clone['observed_instruction_counts_by_state'] and
                clone['reached_by_any_permitted_run'] is False, 'Concrete clone coverage contradicts proof')
        # Check raw edges independently of the proof's branch list.
        interior_ids = set(clone['raw_block_ids'])
        incoming_edges = [e for e in cfg['edges'] if e['target'] in interior_ids and e['source'] not in interior_ids]
        require({e['evidence_instruction'] for e in incoming_edges} == expected_incoming,
                'Raw CFG has an unexpected incoming clone edge')
    return proof
