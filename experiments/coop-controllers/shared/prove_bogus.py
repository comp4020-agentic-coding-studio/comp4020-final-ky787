"""Verify this frozen specimen's exact BCF guard pattern and prove false edges UNSAT.

Run with Python + pefile, capstone and z3-solver. This bounded proof verifier
deliberately rejects changed instructions instead of guessing new semantics.
By default writes only the supplied chamber evidence/bogus-proof.json.gz. --check is read-only and
requires recomputed evidence to equal the retained proof. Nothing is compiled.
"""
from pathlib import Path
import argparse
import gzip
import os
import hashlib
import json
import re

import capstone
from capstone.x86_const import X86_OP_IMM, X86_OP_MEM, X86_OP_REG, X86_REG_RIP
import pefile
import z3

ROOT = None
OUT = None
BUILD = None
OUTPUTS = ()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    data=path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix=='.gz' else data)


def require(condition, description):
    if not condition:
        raise ValueError(description)


def rva(va, base):
    return f'0x{va-base:08x}'


def record(insn, base):
    return dict(rva=rva(insn.address, base), va=f'0x{insn.address:x}',
                bytes=insn.bytes.hex(), text=f'{insn.mnemonic} {insn.op_str}'.strip())


def machine_expression():
    """Exact decoded x86 pattern: low32 IMUL; SETE; signed CMP/SETL; OR/TEST."""
    x, y = z3.BitVecs('loaded_x loaded_y', 32)
    eax, ecx = x, y                     # MOV from the two 32-bit globals
    edx = eax                          # MOV EDX,EAX
    edx = edx - z3.BitVecVal(1, 32)     # SUB EDX,1, modulo 2^32
    eax = eax * edx                    # IMUL EAX,EDX, low32 retained
    eax = eax & z3.BitVecVal(1, 32)     # AND EAX,1
    zf_cmp_eax_0 = eax == 0            # CMP EAX,0
    al = z3.If(zf_cmp_eax_0, z3.BitVecVal(1, 8), z3.BitVecVal(0, 8))
    # CMP ECX,10 sets SF and OF. SETL uses SF != OF, not unsigned carry.
    rhs = z3.BitVecVal(10, 32)
    difference = ecx - rhs
    sign = lambda v: z3.Extract(31, 31, v) == 1
    sf = sign(difference)
    of = z3.And(sign(ecx) != sign(rhs), sign(difference) != sign(ecx))
    cl = z3.If(sf != of, z3.BitVecVal(1, 8), z3.BitVecVal(0, 8))
    al = al | cl
    zf_test = (al & z3.BitVecVal(1, 8)) == 0
    jne_taken = z3.Not(zf_test)
    return x, y, jne_taken, sf != of


def prove(condition):
    solver = z3.Solver()
    solver.set(timeout=10000)
    solver.add(condition)
    result = solver.check()
    require(result == z3.unsat, f'Expected UNSAT, got {result}')
    return str(result)


def output_work(ir_lines):
    """Describe clone resemblance from retained typed IR, after native proof."""
    fields = {}
    writes = []
    for line in ir_lines:
        gep = re.fullmatch(r'(%\S+) = getelementptr inbounds %struct\.ControllerOutputs, ptr %\S+, i32 0, i32 (\d+)', line)
        if gep:
            index = int(gep[2])
            require(0 <= index < len(OUTPUTS), 'Unexpected output field index')
            fields[gep[1]] = OUTPUTS[index]
        store = re.fullmatch(r'store i32 (\d+), ptr (%[^,]+), align 4', line)
        if store and store[2] in fields:
            writes.append(dict(output=fields[store[2]], value=int(store[1]), ir_instruction=line))
    return writes


def main():
    global ROOT,OUT,BUILD,OUTPUTS
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root',type=Path,help='New controller experiment directory')
    parser.add_argument('--check', action='store_true', help='Recompute and compare without writing any artifact')
    args = parser.parse_args()
    ROOT=args.root.resolve(); OUT=ROOT/'evidence/bogus-proof.json.gz'; BUILD=ROOT/'build_or_identity/bcf'
    area=Path(__file__).resolve().parents[1]
    require(ROOT.parent==area and ROOT.name in ('handshake','deadlock','use-after-free','crossfeed-vault','race-condition'),'Only new co-op experiments allowed')
    contract=read(ROOT/'contract.json')
    OUTPUTS=tuple(f['name'] for f in contract['outputs'])
    identity = read(ROOT / 'build_or_identity' / 'identity.json')
    build = next(b for b in identity['builds'] if b['variant'] == 'bcf')
    require(identity['abi']['target'] == 'bn_evaluate', 'Wrong controller ABI identity')
    require([(f['name'], f['offset'], f['width_bits']) for f in contract['outputs']] ==
            [(name, index*4, 32) for index, name in enumerate(OUTPUTS)], 'Output ABI/IR field mapping changed')
    source_manifest_path = ROOT.parent / 'shared' / 'ollvm_source' / 'manifest.json'
    source_manifest = read(source_manifest_path)
    for source_file in source_manifest['file_records']:
        require(sha(source_manifest_path.parent/source_file['path']) == source_file['sha256'],
                'Retained obfuscator source snapshot identity changed')
    require(identity['compiler']['sha256'] == '0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be',
            'This proof source provenance applies only to the validated OLLVM16 compiler')
    artifacts = {
        'binary': ROOT / build['binary_path'],
        'transformed_ir': BUILD / 'controller.ll',
        'compiler_assembly': BUILD / 'controller.s',
        'labelled_assembly': BUILD / 'controller.labelled.s',
        'assembly_labels': BUILD / 'assembly_labels.json',
        'link_map': BUILD / 'controller.map',
        'build_identity': ROOT / 'build_or_identity' / 'identity.json',
        'pass_source_manifest': source_manifest_path,
    }
    for name, identity_name in [('binary', 'binary_sha256'), ('transformed_ir', 'ir_sha256'),
                                ('compiler_assembly', 'compiler_assembly_sha256'),
                                ('labelled_assembly', 'labelled_assembly_sha256')]:
        require(sha(artifacts[name]) == build[identity_name], f'Frozen {name} hash mismatch')
    original = artifacts['compiler_assembly'].read_text()
    marked = artifacts['labelled_assembly'].read_text()
    stripped = '\n'.join(line for line in marked.splitlines()
                         if not re.match(r'^\s*\.globl\s+audit_LBB\d+_\d+\s*$', line)
                         and not re.match(r'^audit_LBB\d+_\d+:\s*$', line)) + '\n'
    require(stripped == original, 'Labelled assembly differs beyond zero-byte audit symbol definitions')

    symbols = {}
    for line in artifacts['link_map'].read_text().splitlines():
        m = re.match(r'^\s*[0-9A-Fa-f]{4}:[0-9A-Fa-f]{8}\s+(\S+)\s+([0-9A-Fa-f]{16})\s', line)
        if m:
            symbols[m[1]] = int(m[2], 16)
    labels = read(artifacts['assembly_labels'])
    ir_address = {'entry': symbols['bn_evaluate']}
    for row in labels:
        text = re.search(r'^' + re.escape(row['assembly_label']) + r':\s*#\s*%(\S+)', original, re.M)
        require(text and text[1] == row['ir_block'], 'Assembly comment/IR label mismatch')
        ir_address[row['ir_block']] = symbols[row['symbol']]
    pe = pefile.PE(str(artifacts['binary']))
    base = pe.OPTIONAL_HEADER.ImageBase
    start = symbols['bn_evaluate']
    export = next(e for e in pe.DIRECTORY_ENTRY_EXPORT.symbols if e.name == b'bn_evaluate')
    require(base + export.address == start, 'Export and map disagree')
    extent = next(e.struct for e in pe.DIRECTORY_ENTRY_EXCEPTION if base + e.struct.BeginAddress == start)
    end = base + extent.EndAddress
    code = pe.get_data(start-base, end-start)
    dis = capstone.Cs(capstone.CS_ARCH_X86, capstone.CS_MODE_64)
    dis.detail = True
    instructions = list(dis.disasm(code, start))
    require(sum(i.size for i in instructions) == len(code), 'Incomplete instruction decode')
    by_address = {i.address: i for i in instructions}
    for address in ir_address.values():
        require(address in by_address, 'IR label is not an instruction boundary')

    # Parse only labelled function blocks; validate exact SSA operand wiring for each guard.
    ll = artifacts['transformed_ir'].read_text()
    block_text = {}
    block_name = None
    for line in ll.splitlines():
        m = re.match(r'^([A-Za-z0-9_.]+):', line)
        if m:
            block_name = m[1]
            block_text[block_name] = []
        elif block_name and line.startswith('  '):
            block_text[block_name].append(line.strip())
    ir_guards = []
    for name, lines in block_text.items():
        m = re.fullmatch(r'br i1 (%\d+), label %(\S+), label %(\S+alteredBB)', lines[-1]) if lines else None
        if not m:
            continue
        require(len(lines) >= 9, 'Truncated IR predicate')
        predicate_lines = lines[-9:]
        load_x = re.fullmatch(r'(%\d+) = load i32, ptr @x, align 4', predicate_lines[0])
        load_y = re.fullmatch(r'(%\d+) = load i32, ptr @y, align 4', predicate_lines[1])
        require(load_x and load_y, 'IR global load pattern changed')
        values = []
        for line in predicate_lines[2:8]:
            require(' = ' in line, 'IR definition missing')
            lhs, rhs = line.split(' = ', 1)
            values.append(lhs)
        expected = [
            f'{values[0]} = sub i32 {load_x[1]}, 1',
            f'{values[1]} = mul i32 {load_x[1]}, {values[0]}',
            f'{values[2]} = urem i32 {values[1]}, 2',
            f'{values[3]} = icmp eq i32 {values[2]}, 0',
            f'{values[4]} = icmp slt i32 {load_y[1]}, 10',
            f'{values[5]} = or i1 {values[3]}, {values[4]}',
        ]
        require(predicate_lines[2:8] == expected and m[1] == values[5], 'IR predicate wiring changed')
        ir_guards.append(dict(ir_block=name, true_ir=m[2], false_ir=m[3]))
    clones = sorted(name for name in block_text if 'alteredBB' in name)
    require(clones and len(ir_guards) == 2 * len(clones), 'Each retained clone must have two opaque guards')

    pattern = [('mov', 'edx, eax'), ('sub', 'edx, 1'), ('imul', 'eax, edx'),
               ('and', 'eax, 1'), ('cmp', 'eax, 0'), ('sete', 'al'),
               ('cmp', 'ecx, 0xa'), ('setl', 'cl'), ('or', 'al, cl'), ('test', 'al, 1')]
    x, y, jne_taken, signed_setl = machine_expression()
    formula_unsat = prove(z3.Not(jne_taken))
    setl_equivalence = prove(signed_setl != (y < z3.BitVecVal(10, 32)))
    ir_p = z3.Or(z3.URem(x * (x-1), z3.BitVecVal(2, 32)) == 0, y < z3.BitVecVal(10, 32))
    ir_native_equivalence = prove(jne_taken != ir_p)
    guard_records = []
    for index, ir_guard in enumerate(ir_guards):
        lo = ir_address[ir_guard['ir_block']]
        hi = min([v for v in ir_address.values() if v > lo] + [end])
        found = []
        for n, ins in enumerate(instructions):
            if not lo <= ins.address < hi or n + 13 >= len(instructions):
                continue
            seq = instructions[n:n+14]
            if seq[0].mnemonic != 'mov' or seq[1].mnemonic != 'mov':
                continue
            if [(i.mnemonic, i.op_str) for i in seq[2:12]] != pattern:
                continue
            for inst, reg, global_name in [(seq[0], 'eax', 'x'), (seq[1], 'ecx', 'y')]:
                require(len(inst.operands) == 2 and inst.operands[0].type == X86_OP_REG
                        and inst.reg_name(inst.operands[0].reg) == reg, 'Unexpected load destination')
                operand = inst.operands[1]
                require(operand.type == X86_OP_MEM and operand.size == 4
                        and operand.mem.base == X86_REG_RIP and operand.mem.index == 0,
                        'Global load width/addressing changed')
                require(inst.address + inst.size + operand.mem.disp == symbols[global_name], 'Global address mismatch')
            branch, false_jump = seq[12:14]
            require(branch.mnemonic == 'jne' and false_jump.mnemonic == 'jmp', 'Guard control flow changed')
            require(branch.operands[0].type == X86_OP_IMM and false_jump.operands[0].type == X86_OP_IMM,
                    'Guard target is not direct')
            require(branch.operands[0].imm == ir_address[ir_guard['true_ir']], 'True IR/native target mismatch')
            require(false_jump.operands[0].imm == ir_address[ir_guard['false_ir']], 'False IR/native target mismatch')
            found.append(seq)
        require(len(found) == 1, f'Expected exactly one native guard in {ir_guard["ir_block"]}')
        seq = found[0]
        guard_records.append(dict(
            id=f'opaque_guard_{index+1:02d}', **ir_guard,
            predicate_start_rva=rva(seq[0].address, base), branch_rva=rva(seq[-2].address, base),
            branch_condition='JNE: ZF == 0 after TEST AL,1', universally_taken=True,
            true_target_rva=rva(ir_address[ir_guard['true_ir']], base),
            false_edge_trampoline_rva=rva(seq[-1].address, base),
            clone_target_rva=rva(ir_address[ir_guard['false_ir']], base),
            false_edge_solver_result=formula_unsat,
            instructions=[record(i, base) for i in seq],
        ))

    # Reject hidden target-function entry paths: all branches are direct, every
    # incoming transfer into a clone range is one of the proven false trampolines.
    all_branches = [i for i in instructions if i.group(capstone.CS_GRP_JUMP)]
    require(all(i.operands[0].type == X86_OP_IMM for i in all_branches), 'Indirect target-function branch')
    transfers=[i for i in instructions if i.group(capstone.CS_GRP_JUMP) or i.group(capstone.CS_GRP_CALL)]
    require(all(i.operands[0].type==X86_OP_IMM for i in transfers),'Indirect control transfer outside proof scope')
    for g in guard_records:
        lo=int(g['predicate_start_rva'],16)+base; hi=int(g['false_edge_trampoline_rva'],16)+base
        require(not any(lo < i.operands[0].imm <= hi for i in transfers),'Static transfer bypasses predicate computation or enters its false trampoline')
    cfg_path = ROOT / 'evidence' / 'disassembly-bcf.json.gz'
    cfg = read(cfg_path)
    require(cfg['binary']['sha256'] == build['binary_sha256'], 'Raw CFG has a different PE hash')
    require(cfg['provenance_audit']['relocated_object_matches_pe_function'], 'Object-to-PE byte audit failed')
    require(all(c['identical_bytes'] and c['identical_normalized_relocations']
                for c in cfg['provenance_audit']['object_comparison']), 'Audit labels changed object code')
    trace_path=ROOT/'evidence/representative-traces.json.gz'
    trace_pack=read(trace_path)
    traces={t['state_id']:t for t in trace_pack['traces']}
    require(len(traces)==len(trace_pack['traces']) and traces,'Trace IDs missing or duplicated')
    require(all(t['binary_sha256']==build['binary_sha256'] for t in traces.values()),'Trace PE identity differs')
    require(trace_pack['contract_sha256']==sha(ROOT/'contract.json'),'Trace ABI differs')
    for state_id,trace in traces.items():
        require(trace['trace_id']==f'bcf_case_{state_id}','Trace case identity differs')
        require(trace['validation']['ok'] and trace['validation']['normal_return'],'A selected trace failed')
        require(list(trace['inputs'])==[f['name'] for f in contract['inputs']],'Trace input fields differ')
        require(all(trace['inputs'][f['name']] in f['domain'] for f in contract['inputs']),'Trace input domain differs')
    def block_at(address):
        rows = [b for b in cfg['blocks'] if b['start_va'] <= address < b['end_va']]
        require(len(rows) == 1, 'Native proof instruction lacks unique raw block mapping')
        return rows[0]
    for guard in guard_records:
        guard['branch_block_id'] = block_at(int(guard['branch_rva'],16)+base)['id']
        guard['false_trampoline_block_id'] = block_at(int(guard['false_edge_trampoline_rva'],16)+base)['id']
    clone_records = []
    for clone in clones:
        lo = ir_address[clone]
        hi = min([v for v in ir_address.values() if v > lo] + [end])
        seq = [i for i in instructions if lo <= i.address < hi]
        previous = next(i for i in instructions if i.address+i.size == lo)
        require(previous.mnemonic in ('ret', 'jmp'), 'Fallthrough can enter clone range')
        incoming = [i for i in all_branches if lo <= i.operands[0].imm < hi]
        guards = [g for g in guard_records if g['false_ir'] == clone]
        expected_incoming = {int(g['false_edge_trampoline_rva'], 16)+base for g in guards}
        require(len(guards) == 2 and {i.address for i in incoming} == expected_incoming,
                'Unexpected native incoming clone edge')
        require(all(i.operands[0].imm == lo for i in incoming), 'Incoming edge targets interior clone instruction')
        calls_into = [i for i in instructions if i.group(capstone.CS_GRP_CALL)
                      and i.operands[0].type == X86_OP_IMM and lo <= i.operands[0].imm < hi]
        require(not calls_into, 'Direct call into clone range')
        require(seq[-1].mnemonic == 'jmp', 'Clone exit pattern changed')
        cloned_original = clone.replace('alteredBB', '')
        require(seq[-1].operands[0].imm == ir_address[cloned_original], 'Clone return target differs from original')
        label = next(row for row in labels if row['ir_block'] == clone)
        raw_blocks = [b for b in cfg['blocks'] if lo <= b['start_va'] < hi]
        require(raw_blocks and raw_blocks[0]['start_va'] == lo and raw_blocks[-1]['end_va'] == hi,
                'Clone raw block boundaries differ from compiler IR range')
        require([a for b in raw_blocks for a in b['instruction_addresses']] == [i.address for i in seq],
                'Clone raw CFG instruction coverage mismatch')
        observed = {str(value): sum(lo <= s['address'] < hi for s in trace['steps'])
                    for value, trace in traces.items()}
        require(not any(observed.values()), 'A proven impossible clone was observed in a preset trace')
        clone_records.append(dict(
            id=f'bcf_clone_{clone}', classification='obfuscator_generated_bogus', confidence='strong',
            ir_block=clone, original_ir_block=cloned_original, **{k: label[k] for k in ('assembly_label', 'symbol')},
            start_rva=rva(lo, base), end_rva_exclusive=rva(hi, base),
            raw_block_ids=[b['id'] for b in raw_blocks],
            observed_instruction_counts_by_state=observed,
            reached_by_any_permitted_run=any(observed.values()),
            instruction_count=len(seq), only_unconditional_jump=len(seq) == 1,
            guard_ids=[g['id'] for g in guards],
            incoming_false_trampoline_rvas=[rva(i.address, base) for i in incoming],
            exit_target_rva=rva(seq[-1].operands[0].imm, base),
            proof='Clone origin mapped from frozen IR through exact assembly/link-map audit symbols; both incoming edges follow universally taken JNE guards and are infeasible.',
            instructions=[record(i, base) for i in seq],
        ))
    # Only proved clones are considered. Ranking is editorial presentation
    # metadata, not proof strength or a physical crumble/physics instruction.
    candidates = []
    for clone in clone_records:
        writes = output_work(block_text[clone['ir_block']])
        original_writes = output_work(block_text[clone['original_ir_block']])
        require([(w['output'], w['value']) for w in writes] ==
                [(w['output'], w['value']) for w in original_writes],
                'Cloned output work differs from original source-region assignment')
        clone['semantic_resemblance'] = dict(
            method='Typed GEP field index and constant stores in exact retained clone IR, matched to its original IR block.',
            output_writes=writes,
            note='These assignments describe unreachable clone instructions; they are not semantic output events.')
        if clone['only_unconditional_jump']:
            continue
        pairs = {(w['output'], w['value']) for w in writes}
        payload_enable = False
        score = (200 if payload_enable else 100 if writes else 0) + len(writes)*10 + min(clone['instruction_count'], 9)
        description = ', '.join(f"{w['output']}={w['value']}" for w in writes)
        candidates.append(dict(
            clone_id=clone['id'], raw_block_ids=clone['raw_block_ids'],
            start_rva=clone['start_rva'], end_rva_exclusive=clone['end_rva_exclusive'],
            instruction_count=clone['instruction_count'], semantic_output_resemblance=description or 'Controller setup or intermediate work',
            ranking_score=score,
            reason=('Payload/exit enabling work closely resembles an attractive working route while the proved opaque gates prevent entry.'
                    if payload_enable else 'Several retained instructions visibly clone controller output assignments.'
                    if writes else 'Nontrivial retained native work, but less direct gameplay output meaning.'),
            proof_reference=f"bogus-proof.json.gz#/clones/{clone_records.index(clone)}"))
    candidates.sort(key=lambda candidate: (-candidate['ranking_score'], int(candidate['start_rva'], 16)))
    for rank, candidate in enumerate(candidates, 1):
        candidate['rank'] = rank
    proof = dict(
        schema='coop-native-bcf-proof/v1', chamber_id=contract['chamber_id'],contract_sha256=sha(ROOT/'contract.json'), binary_sha256=build['binary_sha256'],
        target=dict(name='bn_evaluate', start_rva=rva(start, base), end_rva_exclusive=rva(end, base),
                    bytes_sha256=hashlib.sha256(code).hexdigest()),
        artifacts={name: dict(path=os.path.relpath(path,ROOT).replace('\\','/'), sha256=sha(path))
                   for name,path in artifacts.items()},
        cross_checks=dict(raw_cfg=dict(path='evidence/disassembly-bcf.json.gz', sha256=sha(cfg_path)),
                          labelled_object_bytes_and_relocations_unchanged=True,
                          relocated_object_matches_exact_pe=True,
                          traces=dict(path='evidence/representative-traces.json.gz',sha256=sha(trace_path))),
        tools=dict(z3=z3.get_version_string(), capstone=capstone.__version__, pefile=pefile.__version__),
        compiler_source=dict(compiler_sha256=identity['compiler']['sha256'],
                             source_repository=source_manifest['source_repository'],
                             release_tag=source_manifest['release_tag'], release_commit=source_manifest['release_commit'],
                             inspected_head=source_manifest['head'],
                             predicate_source='../shared/ollvm_source/BogusControlFlow.cpp:629-646',
                             clone_source='../shared/ollvm_source/BogusControlFlow.cpp:256-331',
                             warning='Source comments say x*(x+1); executable IR-builder code uses x*(x-1).'),
        method='Exact PE instruction pattern validation plus bit-vector SMT; frozen IR/assembly/audit-symbol native clone mapping.',
        formula='(((x * (x - 1)) mod 2^32) & 1) == 0 OR signed_i32(y) < 10',
        quantification='For every independently loaded pair x,y in 0..2^32-1 at each guard; no x=y=0 assumption.',
        solver=dict(false_jne_condition=formula_unsat, signed_cmp_flag_equivalence=setl_equivalence,
                    ir_native_predicate_equivalence=ir_native_equivalence,
                    counterexample_formula=z3.Not(jne_taken).sexpr()),
        assumptions=[
            'Normal entry through bn_evaluate and decoded direct control flow; no external jump into an interior instruction or clone.',
            'Code bytes and normal x86-64 instruction semantics remain intact; no debugger/exception mechanism rewrites RIP or flags.',
            'The two 32-bit global loads complete successfully; each loaded x and y may be arbitrary and may differ between guards.',
            'Calls use their ordinary ABI and return to their call sites; no stack/control-flow corruption or return-address manipulation.',
            'This establishes clone unreachability under those conditions, not whole-program equivalence for arbitrary inputs/pointers or hardware faults.',
        ],
        limitations=['Concrete non-execution is only a consistency check and is not used as the proof.',
                     'The verifier accepts this exact native instruction pattern; changed binaries must be analyzed again.',
                     'Unused cloned computations can disappear during lowering; exact retained instruction counts determine visual usefulness.'],
        guard_count=len(guard_records), clone_count=len(clone_records), guards=guard_records, clones=clone_records,
        presentation_candidates=candidates,
        recommended_candidate_id=candidates[0]['clone_id'] if candidates else None,
        presentation_ranking_scope='Only native-proved clones are ranked; this suggests code imagery, not coordinates, timing, physics or a new controller effect.',
    )
    if args.check:
        require(OUT.is_file() and read(OUT) == proof, 'Recomputed proof differs from retained proof')
    else:
        OUT.write_bytes(gzip.compress((json.dumps(proof,separators=(',',':'))+'\n').encode(),mtime=0))
    print(json.dumps(dict(status='PASS',guards=len(guard_records),clones=len(clone_records),
                         binary_sha256=build['binary_sha256'],output=str(OUT),read_only=args.check),indent=2))


if __name__ == '__main__':
    main()
