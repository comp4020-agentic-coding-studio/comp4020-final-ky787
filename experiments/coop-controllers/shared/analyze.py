"""Extract audited PE CFGs and real Unicorn executions for a supplied chamber.
Adapted from the frozen UPLINK analyzer; no prior workspace is imported at runtime.
Native/reference results are required before extraction. Emulation executes linked
helpers and does not claim to reproduce Windows startup or server temporal state.
"""
from __future__ import annotations

import argparse
import gzip
import collections
import hashlib
import json
import re
import struct
from pathlib import Path
from typing import Any

import pefile
from capstone import Cs, CS_ARCH_X86, CS_MODE_64, CS_GRP_CALL, CS_GRP_JUMP, CS_GRP_RET
from capstone.x86_const import X86_INS_JMP, X86_OP_IMM, X86_OP_MEM, X86_OP_REG
from unicorn import Uc, UC_ARCH_X86, UC_MODE_64, UC_PROT_ALL, UC_HOOK_MEM_WRITE
import unicorn.x86_const as ux

ROOT = None
IDENT = None
FUNCTION = 'bn_evaluate'
CONTRACT = None
IDENTITY = None
PAGE = 0x1000
STACK_BASE, STACK_SIZE = 0x60000000, 0x200000
SENTINEL, INPUT_BASE, OUTPUT_BASE = 0x70000000, 0x71000000, 0x72000000
REG_NAMES = ['rax','rbx','rcx','rdx','rsi','rdi','rbp','rsp',*[f'r{i}' for i in range(8,16)],'rip']
REGS = {name:getattr(ux, 'UC_X86_REG_'+name.upper()) for name in REG_NAMES}
FLAG_BITS = {'CF':0,'PF':2,'AF':4,'ZF':6,'SF':7,'TF':8,'IF':9,'DF':10,'OF':11}
MD = Cs(CS_ARCH_X86, CS_MODE_64)
MD.detail = True


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = (json.dumps(data,separators=(',',':'))+'\n').encode()
    if path.suffix == '.gz':
        path.write_bytes(gzip.compress(payload,mtime=0))
    else:
        path.write_bytes(payload)


def signed(value, width):
    mask = (1 << width)-1
    value &= mask
    return value-(1 << width) if value & (1 << (width-1)) else value


def pe_exports(pe):
    base = int(pe.OPTIONAL_HEADER.ImageBase)
    return {item.name.decode('ascii'):base+int(item.address)
            for item in pe.DIRECTORY_ENTRY_EXPORT.symbols if item.name}


def function_extent(pe, address):
    """Require exact .pdata evidence; do not use the old next-export fallback."""
    base = int(pe.OPTIONAL_HEADER.ImageBase)
    matches = [e for e in getattr(pe, 'DIRECTORY_ENTRY_EXCEPTION', [])
               if int(e.struct.BeginAddress) == address-base]
    assert len(matches) == 1, 'Need one exact exception-directory function boundary'
    end = base+int(matches[0].struct.EndAddress)
    section = pe.get_section_by_rva(address-base)
    assert section and section.Characteristics & 0x20000000
    assert end <= base+section.VirtualAddress+max(section.Misc_VirtualSize,section.SizeOfRawData)
    return address, end, 'Exact exported entry + PE x64 exception directory BeginAddress/EndAddress'


def immediate_target(insn):
    return next((int(o.imm) for o in insn.operands if o.type == X86_OP_IMM), None)


def read_coff(path):
    """Small read-only AMD64 COFF parser retaining symbol section identity."""
    data = path.read_bytes()
    machine,nsec,timestamp,sptr,nsyms,opt,flags = struct.unpack_from('<HHIIIHH',data)
    assert machine == 0x8664 and opt == 0
    string_start = sptr+nsyms*18
    def name(raw):
        if raw[:4] == b'\0'*4:
            pos = string_start+struct.unpack_from('<I',raw,4)[0]
            return data[pos:data.index(b'\0',pos)].decode()
        return raw.rstrip(b'\0').decode()
    sections = []
    for i in range(nsec):
        fields = struct.unpack_from('<8sIIIIIIHHI',data,20+i*40)
        nm,vsize,va,size,ptr,rptr,lptr,nrel,nline,char = fields
        sections.append(dict(index=i+1,name=nm.rstrip(b'\0').decode(),size=size,
                             bytes=data[ptr:ptr+size],relocation_ptr=rptr,
                             relocation_count=nrel,characteristics=char))
    symbols = {}
    i = 0
    while i < nsyms:
        raw,value,section,typ,storage,aux = struct.unpack_from('<8sIhHBB',data,sptr+i*18)
        symbols[i] = dict(name=name(raw),value=value,section=section,type=typ,storage=storage)
        i += 1+aux
    by_name = {s['name']:s for s in symbols.values()}
    for sec in sections:
        sec['relocations'] = []
        for i in range(sec['relocation_count']):
            offset,symbol_id,kind = struct.unpack_from('<IIH',data,sec['relocation_ptr']+10*i)
            sec['relocations'].append(dict(offset=offset,type=kind,symbol=symbols[symbol_id]))
    return dict(sections=sections,symbols=by_name)


def link_symbols(path):
    result = {}
    for line in path.read_text().splitlines():
        m = re.match(r'^\s*[0-9A-Fa-f]{4}:[0-9A-Fa-f]{8}\s+(\S+)\s+([0-9A-Fa-f]{16})\b',line)
        if m: result[m[1]] = int(m[2],16)
    return result


def parse_ir(path):
    blocks = {}
    current = None
    active = False
    for line in path.read_text().splitlines():
        if re.match(r'^define\b.*@'+FUNCTION+r'\(',line): active = True
        if not active: continue
        if line == '}': break
        m = re.match(r'^([-A-Za-z$._0-9]+):',line)
        if m:
            current = m[1]
            blocks[current] = []
        elif current and line.strip() and not line.lstrip().startswith(';'):
            blocks[current].append(line.strip())
    return blocks


def audit_provenance(variant, pe, start, end):
    directory = IDENT/variant
    for filename in (f'{variant}.obj',f'{variant}.unlabelled.obj'):
        assert sha(ROOT/'_build'/filename) == IDENTITY['object_sha256'][filename], 'Frozen COFF identity changed'
    labelled = read_coff(ROOT/'_build'/f'{variant}.obj')
    original = read_coff(ROOT/'_build'/f'{variant}.unlabelled.obj')
    text1 = [s for s in labelled['sections'] if s['name'].startswith('.text')]
    text2 = [s for s in original['sections'] if s['name'].startswith('.text')]
    assert len(text1) == len(text2)
    checks = []
    for a,b in zip(text1,text2):
        assert a['name'] == b['name'] and a['bytes'] == b['bytes'], 'Audit labels changed .text bytes'
        assert a['relocations'] == b['relocations'], 'Audit labels changed normalized relocations'
        checks.append(dict(section=a['name'],bytes=len(a['bytes']),
                           sha256=hashlib.sha256(a['bytes']).hexdigest(),
                           identical_bytes=True,identical_normalized_relocations=True,
                           relocation_count=len(a['relocations'])))
    fn = labelled['symbols'][FUNCTION]
    sec = labelled['sections'][fn['section']-1]
    names = link_symbols(directory/'controller.map')
    assert names[FUNCTION] == start
    function_bytes = bytearray(sec['bytes'][fn['value']:fn['value']+end-start])
    assert len(function_bytes) == end-start
    relocations = []
    for relocation in sec['relocations']:
        offset = relocation['offset']-fn['value']
        if not 0 <= offset < len(function_bytes): continue
        assert 4 <= relocation['type'] <= 9, 'Unexpected controller relocation kind'
        sym = relocation['symbol']
        target = names[sym['name']]
        addend = struct.unpack_from('<i',function_bytes,offset)[0]
        value = target+addend-(start+offset+4+(relocation['type']-4))
        struct.pack_into('<i',function_bytes,offset,value)
        relocations.append(dict(function_offset=offset,symbol=sym['name'],target_va=target,
                                relocation_type=relocation['type'],addend=addend,
                                resolved_displacement=value))
    actual = pe.get_data(start-int(pe.OPTIONAL_HEADER.ImageBase),end-start)
    assert bytes(function_bytes) == actual, 'Relocated authoritative COFF bytes differ from PE function'
    ir = parse_ir(directory/'controller.ll')
    labels = json.loads((directory/'assembly_labels.json').read_text())
    leaders = {start:[dict(ir_block='entry',assembly_label='function entry',symbol=FUNCTION,
                          va=start,object_offset=fn['value'])]}
    mapped = []
    for label in labels:
        s = labelled['symbols'][label['symbol']]
        assert s['section'] == fn['section'], 'Function and audit label must share COFF section'
        expected = start+s['value']-fn['value']
        assert names[label['symbol']] == expected and start <= expected < end
        assert label['ir_block'] in ir, 'Assembly block comment must name frozen IR block'
        item = dict(**label,va=expected,object_offset=s['value'])
        leaders.setdefault(expected,[]).append(item)
        mapped.append(item)
    return leaders,ir,dict(
        method='Frozen transformed IR -> compiler assembly -> zero-byte audit symbols -> same-section COFF offsets -> linker map -> exact PE bytes',
        compiler_assembly_sha256=sha(directory/'controller.s'),
        authoritative_labelled_assembly_sha256=sha(directory/'controller.labelled.s'),
        transformed_ir_sha256=sha(directory/'controller.ll'),
        object_comparison=checks,relocated_object_matches_pe_function=True,
        resolved_function_relocations=relocations,audit_labels=mapped,
        cloned_ir_blocks=[name for name in ir if 'alteredBB' in name],
        bogus_policy='Clone origin requires frozen IR alteredBB name and exact assembly/COFF/link/PE mapping. Non-execution alone never establishes bogusness.',
        scope='This proves compiler clone origin, not universal infeasibility for arbitrary machine state.')


def build_cfg(decoded, instructions, start, end, base, extra_leaders, ir):
    """Adapted from pipeline.build_cfg with explicit inherited IR-region provenance."""
    by_address = {int(i.address):i for i in decoded}
    leaders = {start,*extra_leaders}
    assert all(a in by_address for a in leaders), 'Assembly audit leader is not an instruction boundary'
    for index,insn in enumerate(decoded):
        if CS_GRP_JUMP in insn.groups:
            target = immediate_target(insn)
            if target is not None:
                assert target in by_address, 'Controller branch exits target or lands between instructions'
                leaders.add(target)
            if index+1 < len(decoded): leaders.add(int(decoded[index+1].address))
        elif CS_GRP_RET in insn.groups or insn.mnemonic in ('ud2','int3'):
            if index+1 < len(decoded): leaders.add(int(decoded[index+1].address))
    blocks, address_to_block = [], {}
    sorted_leaders = sorted(leaders)
    regions = sorted(extra_leaders)
    for index,leader in enumerate(sorted_leaders):
        boundary = sorted_leaders[index+1] if index+1 < len(sorted_leaders) else end
        owned = [i for i in instructions if leader <= i['address'] < boundary]
        assert owned
        block_id = f'bb_{leader-base:08X}'
        for item in owned:
            address_to_block[item['address']] = block_id
            item['block_id'] = block_id
        labels = extra_leaders[max(r for r in regions if r <= leader)]
        names = [l['ir_block'] for l in labels]
        bogus = any('alteredBB' in name for name in names)
        blocks.append(dict(id=block_id,start_va=leader,start_rva=leader-base,
                           end_va=owned[-1]['address']+owned[-1]['size'],
                           instruction_addresses=[i['address'] for i in owned],instructions=owned,
                           successors=[],predecessors=[],compiler_labels=labels,
                           provenance=dict(classification='obfuscator_clone' if bogus else 'unknown',
                               evidence=dict(strength='strong',method='Exact inherited compiler IR block region',labels=labels) if bogus else None)))
    edges = []
    def edge(block,target,kind,address):
        assert target in address_to_block, 'Unresolved direct CFG destination'
        edges.append(dict(source=block['id'],target=address_to_block[target],kind=kind,evidence_instruction=address))
    for block in blocks:
        insn = by_address[block['instruction_addresses'][-1]]
        block['terminator'] = dict(address=insn.address,mnemonic=insn.mnemonic,op_str=insn.op_str)
        if CS_GRP_RET in insn.groups: block['branch_type']='return'
        elif insn.mnemonic in ('ud2','int3'): block['branch_type']='trap'
        elif CS_GRP_JUMP in insn.groups:
            target = immediate_target(insn)
            block['branch_type'] = 'unconditional_direct' if insn.id == X86_INS_JMP else 'conditional_direct'
            if target is None:
                block['branch_type']='unresolved_indirect'
                raise AssertionError('Indirect controller branch needs explicit recovery')
            edge(block,target,'jump' if insn.id == X86_INS_JMP else 'branch_taken',insn.address)
            if insn.id != X86_INS_JMP: edge(block,insn.address+insn.size,'fallthrough',insn.address)
        else:
            block['branch_type']='fallthrough'
            if insn.address+insn.size < end: edge(block,insn.address+insn.size,'fallthrough',insn.address)
    by_id = {b['id']:b for b in blocks}
    for e in edges:
        by_id[e['source']]['successors'].append(dict(target=e['target'],kind=e['kind']))
        by_id[e['target']]['predecessors'].append(dict(source=e['source'],kind=e['kind']))
    return blocks,edges


def analyze(variant):
    build = next(b for b in IDENTITY['builds'] if b['variant'] == variant)
    binary = ROOT/build['binary_path']
    assert sha(binary) == build['binary_sha256'], 'PE identity changed'
    pe = pefile.PE(str(binary),fast_load=False)
    base = int(pe.OPTIONAL_HEADER.ImageBase)
    start,end,boundary = function_extent(pe,pe_exports(pe)[FUNCTION])
    leaders,ir,audit = audit_provenance(variant,pe,start,end)
    raw = pe.get_data(start-base,end-start)
    decoded = list(MD.disasm(raw,start))
    cursor = start
    for insn in decoded:
        assert insn.address == cursor, 'Incomplete/gapped decoding'
        cursor += insn.size
    assert cursor == end, 'Disassembly must consume exact function extent'
    instructions = [dict(address=i.address,rva=i.address-base,size=i.size,bytes=bytes(i.bytes).hex(' '),
                         mnemonic=i.mnemonic,op_str=i.op_str) for i in decoded]
    for item in instructions: item['id'] = f"insn_{item['rva']:08X}"
    blocks,edges = build_cfg(decoded,instructions,start,end,base,leaders,ir)
    for b in blocks:
        if variant=='clean': b['provenance']['classification']='source_control_flow'
    analysis = dict(schema='coop-native-cfg/v1',variant=variant,
                    binary=dict(path=str(binary.relative_to(ROOT)).replace('\\','/'),sha256=sha(binary),image_base=base),
                    function=dict(name=FUNCTION,start_va=start,start_rva=start-base,end_va=end,end_rva=end-base,
                                  boundary_source=boundary,bytes_sha256=hashlib.sha256(raw).hexdigest(),complete_decoding=True),
                    convention='Linear sweep within exact .pdata extent; leaders at function entry, direct branch targets, instructions following branches/returns, and audited compiler labels. Calls remain inside caller blocks. Compiler provenance is inherited until the next audited IR block label.',
                    instructions=instructions,blocks=blocks,edges=edges,provenance_audit=audit)
    return pe,analysis


def operand_value(uc,insn,operand):
    width = operand.size*8
    if operand.type==X86_OP_IMM:
        value = int(operand.imm)&((1<<width)-1)
        return dict(kind='immediate',width=width,unsigned=value,signed=signed(value,width))
    if operand.type==X86_OP_REG:
        name=insn.reg_name(operand.reg)
        value=int(uc.reg_read(getattr(ux,'UC_X86_REG_'+name.upper())))
        return dict(kind='register',register=name,width=width,unsigned=value,signed=signed(value,width))
    if operand.type==X86_OP_MEM:
        memory=operand.mem
        address=memory.disp
        if memory.base:
            name=insn.reg_name(memory.base)
            address += insn.address+insn.size if name=='rip' else int(uc.reg_read(getattr(ux,'UC_X86_REG_'+name.upper())))
        if memory.index:
            address += int(uc.reg_read(getattr(ux,'UC_X86_REG_'+insn.reg_name(memory.index).upper())))*memory.scale
        address &= (1<<64)-1
        value=int.from_bytes(bytes(uc.mem_read(address,operand.size)),'little')
        return dict(kind='memory',address=address,width=width,unsigned=value,signed=signed(value,width))
    raise AssertionError('Unsupported concrete operand')


INPUT_NAMES = []
OUTPUT_NAMES = []
OUTPUT_SENTINEL = 0xA5A5A5A5


def output_frame(uc):
    values = struct.unpack('<'+str(len(OUTPUT_NAMES))+'I',bytes(uc.mem_read(OUTPUT_BASE,4*len(OUTPUT_NAMES))))
    return dict(zip(OUTPUT_NAMES,values))


def registers(uc):
    return {name:int(uc.reg_read(reg)) for name,reg in REGS.items()}


def instruction_descriptor(insn,base):
    return dict(id=f'insn_{insn.address-base:08X}',address=insn.address,rva=insn.address-base,
                size=insn.size,bytes=bytes(insn.bytes).hex(' '),mnemonic=insn.mnemonic,op_str=insn.op_str)


def trace_controller(pe,analysis,state_id,native_state):
    """Execute the exact controller and linked helpers; preserve every occurrence.

    Windows x64 initialization and single stepping derive from the previous
    validated analyzer. Register snapshots are represented as initial state plus
    explicit before/after deltas, while memory-write bytes remain chronological.
    """
    variant=analysis['variant']
    trace_id=f'{variant}_case_{state_id}'
    inputs=native_state['inputs']
    expected=native_state['expected_outputs']
    base=int(pe.OPTIONAL_HEADER.ImageBase)
    uc=Uc(UC_ARCH_X86,UC_MODE_64)
    image_size=int(pe.OPTIONAL_HEADER.SizeOfImage)
    uc.mem_map(base,(image_size+PAGE-1)&~(PAGE-1),UC_PROT_ALL)
    uc.mem_write(base,pe.get_memory_mapped_image()[:image_size])
    uc.mem_map(STACK_BASE,STACK_SIZE,UC_PROT_ALL)
    uc.mem_map(0,PAGE,UC_PROT_ALL)
    uc.mem_write(0x10,STACK_BASE.to_bytes(8,'little'))
    uc.mem_map(SENTINEL,PAGE,UC_PROT_ALL)
    uc.mem_write(SENTINEL,b'\xCC')
    uc.mem_map(INPUT_BASE,PAGE,UC_PROT_ALL)
    input_bytes=struct.pack('<'+str(len(INPUT_NAMES))+'I',*(inputs[name] for name in INPUT_NAMES))
    uc.mem_write(INPUT_BASE,input_bytes)
    uc.mem_map(OUTPUT_BASE,PAGE,UC_PROT_ALL)
    uc.mem_write(OUTPUT_BASE,struct.pack('<'+str(len(OUTPUT_NAMES))+'I',*([OUTPUT_SENTINEL]*len(OUTPUT_NAMES))))
    rsp=STACK_BASE+STACK_SIZE-0x28
    uc.mem_write(rsp,SENTINEL.to_bytes(8,'little'))
    uc.reg_write(ux.UC_X86_REG_RSP,rsp)
    uc.reg_write(ux.UC_X86_REG_RCX,INPUT_BASE)
    uc.reg_write(ux.UC_X86_REG_RDX,OUTPUT_BASE)
    uc.reg_write(ux.UC_X86_REG_RIP,analysis['function']['start_va'])
    initial_registers=registers(uc)
    initial_flags=int(uc.reg_read(ux.UC_X86_REG_EFLAGS))
    by_address={i['address']:b for b in analysis['blocks'] for i in b['instructions']}
    instruction_by_address={i['address']:i for i in analysis['instructions']}
    executable_ranges=[(base+s.VirtualAddress,base+s.VirtualAddress+max(s.Misc_VirtualSize,s.SizeOfRawData))
                       for s in pe.sections if s.Characteristics & 0x20000000]
    steps,occurrences,events,errors=[],[],[],[]
    helpers={}
    counts=collections.Counter()
    active_block=None
    writes=[]
    def write_hook(engine,access,address,size,value,_):
        writes.append(dict(address=address,size=size,value=value&((1<<(size*8))-1),
                           before=bytes(engine.mem_read(address,size)).hex()))
    uc.hook_add(UC_HOOK_MEM_WRITE,write_hook)
    execution_error=None
    while int(uc.reg_read(ux.UC_X86_REG_RIP))!=SENTINEL:
        index=len(steps)
        try:
            if index >= 100000: raise RuntimeError('Instruction limit exceeded')
            address=int(uc.reg_read(ux.UC_X86_REG_RIP))
            if not any(a<=address<b for a,b in executable_ranges):
                raise RuntimeError(f'Execution escaped PE executable sections: {address:#x}')
            insn=next(MD.disasm(bytes(uc.mem_read(address,15)),address,count=1))
            descriptor=instruction_descriptor(insn,base)
            block=by_address.get(address)
            block_id=block['id'] if block else None
            if block:
                assert descriptor['bytes']==instruction_by_address[address]['bytes'], 'Runtime code differs from frozen CFG'
                previous=steps[-1] if steps else None
                is_transfer=(previous and previous.get('branch') and previous['scope']=='controller')
                if block_id!=active_block or (address==block['start_va'] and is_transfer):
                    counts[block_id]+=1
                    occurrences.append(dict(id=f'{trace_id}:raw:{len(occurrences):03d}',index=len(occurrences),
                                            block_id=block_id,visit_number=counts[block_id],
                                            start_step=index,end_step=index,step_indices=[],
                                            next_occurrence_id=None,next_block_id=None))
                    active_block=block_id
                occurrences[-1]['step_indices'].append(index)
                occurrences[-1]['end_step']=index
            else:
                helpers[descriptor['id']]=descriptor
            pre=registers(uc)
            flags_before=int(uc.reg_read(ux.UC_X86_REG_EFLAGS))
            comparison=None
            if insn.mnemonic in ('cmp','test'):
                comparison=dict(operation=insn.mnemonic,
                                operands=[operand_value(uc,insn,o) for o in insn.operands],
                                snapshot_phase='before_instruction')
            writes.clear()
            uc.emu_start(address,SENTINEL,count=1)
            post=registers(uc)
            flags_after=int(uc.reg_read(ux.UC_X86_REG_EFLAGS))
            next_address=post['rip']
            branch=None
            if CS_GRP_JUMP in insn.groups:
                target=immediate_target(insn)
                branch=dict(kind='unconditional' if insn.id==X86_INS_JMP else 'conditional',
                            mnemonic=insn.mnemonic,target_address=target,fallthrough_address=address+insn.size,
                            next_address=next_address,taken=next_address==target,flags_used=flags_before)
            elif CS_GRP_CALL in insn.groups:
                branch=dict(kind='call',target_address=next_address,return_address=address+insn.size,next_address=next_address)
            elif CS_GRP_RET in insn.groups:
                branch=dict(kind='return',next_address=next_address)
            committed=[]
            for write in writes:
                item=dict(**write,after=bytes(uc.mem_read(write['address'],write['size'])).hex())
                committed.append(item)
                if INPUT_BASE <= write['address'] < INPUT_BASE+4*len(INPUT_NAMES):
                    errors.append(f'Controller mutated input bytes at step {index}')
                if OUTPUT_BASE <= write['address'] < OUTPUT_BASE+4*len(OUTPUT_NAMES):
                    if write['size']!=4 or (write['address']-OUTPUT_BASE)%4:
                        raise RuntimeError(f'Unexpected output write width/alignment at step {index}')
                    if not block: raise RuntimeError('Output write occurred outside controller')
                    name=OUTPUT_NAMES[(write['address']-OUTPUT_BASE)//4]
                    after=output_frame(uc)
                    value=after[name]
                    if value not in CONTRACT['outputs'][(write['address']-OUTPUT_BASE)//4]['domain']: errors.append(f'Noncanonical output {name}={value} at step {index}')
                    occurrence=occurrences[-1]
                    # Prefix is context, not a claim of a complete backward data-flow slice.
                    addresses=[steps[s]['address'] for s in occurrence['step_indices'] if s<index]+[address]
                    events.append(dict(id=f'{trace_id}:output:{len(events):02d}',trace_id=trace_id,
                                       state_id=state_id,inputs=inputs,kind='output_write',output=name,
                                       value=value,bool_value=bool(value),instruction_address=address,
                                       instruction_rva=address-base,instruction_text=f'{insn.mnemonic} {insn.op_str}',
                                       instruction=descriptor,raw_block_id=block_id,raw_occurrence_id=occurrence['id'],
                                       step_index=index,memory_address=write['address'],memory_before=item['before'],
                                       memory_after=item['after'],underlying_instruction_addresses=addresses,
                                       underlying_instruction_scope='Executed controller prefix within this raw occurrence',
                                       state_after=after,evidence='Actual output-field write while emulating exact PE instructions, sampled after instruction committed; separately checked against native Windows result'))
            step=dict(index=index,address=address,rva=address-base,block_id=block_id,
                      scope='controller' if block else 'linked_helper',instruction_ref=descriptor['id'],
                      register_changes={name:[pre[name],post[name]] for name in REG_NAMES if pre[name]!=post[name]},
                      flags_before=flags_before,flags_after=flags_after,memory_writes=committed)
            if comparison: step['comparison']=comparison
            if branch: step['branch']=branch
            if block: step['raw_occurrence_id']=occurrences[-1]['id']
            steps.append(step)
        except Exception as exc:
            execution_error=f'{type(exc).__name__}: {exc}'
            errors.append(f'Execution failed at step {index}: {execution_error}')
            break
    for index,occurrence in enumerate(occurrences[:-1]):
        occurrence['next_occurrence_id']=occurrences[index+1]['id']
        occurrence['next_block_id']=occurrences[index+1]['block_id']
    final=output_frame(uc)
    native_outputs=native_state[variant]['result']['outputs']
    if final!=expected: errors.append('Final emulated outputs differ from retained actual-game reference oracle')
    if final!=native_outputs: errors.append('Final emulated outputs differ from retained native result')
    if inputs!=native_state['inputs']: errors.append('Trace input frame differs from retained native input')
    if expected!=native_state['expected_outputs']: errors.append('Independent oracle differs from retained expected output')
    if native_state[variant]['binary_sha256']!=analysis['binary']['sha256']: errors.append('Native binary identity differs')
    if bytes(uc.mem_read(INPUT_BASE,4*len(INPUT_NAMES)))!=input_bytes: errors.append('Input memory changed')
    if set(e['output'] for e in events)!=set(OUTPUT_NAMES): errors.append('Not every output has an actual committed write')
    last_event={e['output']:e['value'] for e in events}
    if last_event!=final: errors.append('Last committed semantic writes do not reconstruct final output frame')
    pairs={(e['source'],e['target']) for e in analysis['edges']}
    if not all((a['block_id'],b['block_id']) in pairs for a,b in zip(occurrences,occurrences[1:])):
        errors.append('Chronological target transition missing from raw CFG')
    if any(by_address[s['address']]['provenance']['classification']=='obfuscator_clone'
           for s in steps if s['scope']=='controller'):
        errors.append('An origin-mapped BCF clone executed; requires proof investigation')
    normal_return=int(uc.reg_read(ux.UC_X86_REG_RIP))==SENTINEL and execution_error is None
    if not normal_return: errors.append('Controller did not return to sentinel')
    return dict(schema='coop-native-trace/v1',trace_id=trace_id,variant=variant,state_id=state_id,
                inputs=inputs,binary_sha256=analysis['binary']['sha256'],
                machine_model=dict(architecture='Windows x64',entry=FUNCTION,return_type='void',
                                   input_pointer_register='rcx',output_pointer_register='rdx',
                                   input_address=INPUT_BASE,output_address=OUTPUT_BASE,
                                   input_layout={name:4*i for i,name in enumerate(INPUT_NAMES)},
                                   output_layout={name:4*i for i,name in enumerate(OUTPUT_NAMES)},field_width=32,
                                   stack_base=STACK_BASE,stack_size=STACK_SIZE,return_sentinel=SENTINEL,
                                   gs_base=0,gs_stack_limit_address=0x10,gs_stack_limit_value=STACK_BASE,
                                   helper_policy='Execute actual linked helper instructions; no success stubs',
                                   global_state='Exact PE initial bytes; CRT entry and initializers are not executed',
                                   permissions='Image, stack and argument pages mapped RWX for emulation; no OS page-protection claim'),
                instruction_source=f'disassembly-{variant}.json.gz',
                register_encoding='initial_registers then chronological register_changes[name]=[before,after]',
                initial_registers=initial_registers,initial_flags=initial_flags,flag_bits=FLAG_BITS,
                initial_outputs={name:OUTPUT_SENTINEL for name in OUTPUT_NAMES},
                stop_reason='controller_return_sentinel' if normal_return else 'execution_failure',
                execution_error=execution_error,steps=steps,helper_instructions=list(helpers.values()),
                raw_occurrences=occurrences,semantic_events=events,final_outputs=final,
                expected_outputs=expected,native_outputs=native_outputs,
                validation=dict(ok=not errors,errors=errors,normal_return=normal_return,
                                output_event_count=len(events),native_output_matches=final==native_outputs,
                                expected_output_matches=final==expected))


def read(path):
    data=path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix=='.gz' else data)


def select_rows(rows, limit):
    """Greedy named input/output value coverage, with deterministic endpoint seeds.

    This selection is not an exhaustive branch/store-site claim. Actual decoded
    store sites and trace coverage are reported after execution, not invented.
    """
    if len(rows)<=limit:
        return rows,dict(method='Every retained reference/native case',exhaustive_cases=True)
    features=lambda row: {('in',n,v) for n,v in zip(INPUT_NAMES,row['inputs'])} | {('out',n,v) for n,v in zip(OUTPUT_NAMES,row['expected'])}
    positions={row['id']:index for index,row in enumerate(rows)}
    selected=[rows[0],rows[-1]]
    covered=set().union(*(features(r) for r in selected))
    remaining=[r for r in rows if r['id'] not in {s['id'] for s in selected}]
    output_tuples={tuple(r['expected']) for r in selected}
    while remaining and len(selected)<limit:
        best=max(remaining,key=lambda r:(len(features(r)-covered),tuple(r['expected']) not in output_tuples,-positions[r['id']]))
        if not (features(best)-covered) and tuple(best['expected']) in output_tuples:
            # Include evenly spaced cases once field/complete-output values add no new information.
            target=(len(selected)*len(rows))//limit
            best=min(remaining,key=lambda r:(abs(positions[r['id']]-target),positions[r['id']]))
        selected.append(best);covered|=features(best);output_tuples.add(tuple(best['expected']));remaining.remove(best)
    return sorted(selected,key=lambda r:positions[r['id']]),dict(method='Endpoints, then greedy named input/output value and complete-output-frame diversity; deterministic distributed cases fill remaining slots',exhaustive_cases=False,
        limitation='Representative dynamic evidence; no claim of exhaustive control-flow or output-store-site execution.')


def main():
    global ROOT,IDENT,CONTRACT,IDENTITY,FUNCTION,INPUT_NAMES,OUTPUT_NAMES
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root',type=Path,help='Controller experiment directory')
    parser.add_argument('--trace-limit',type=int,default=32)
    args=parser.parse_args()
    ROOT=args.root.resolve();IDENT=ROOT/'build_or_identity'
    area=Path(__file__).resolve().parents[1]
    assert ROOT.parent==area and ROOT.name in ('handshake','deadlock','use-after-free','crossfeed-vault','race-condition'), 'Only a new co-op controller experiment may be written'
    assert 1<=args.trace_limit<=64
    CONTRACT=read(ROOT/'contract.json');IDENTITY=read(IDENT/'identity.json')
    FUNCTION=CONTRACT['abi']['target']
    assert FUNCTION=='bn_evaluate' and IDENTITY['abi']==CONTRACT['abi']
    assert sha(ROOT/'contract.json')==IDENTITY['contract_sha256']
    INPUT_NAMES=[f['name'] for f in CONTRACT['inputs']];OUTPUT_NAMES=[f['name'] for f in CONTRACT['outputs']]
    for key,names in [('inputs',INPUT_NAMES),('outputs',OUTPUT_NAMES)]:
        assert [(f['offset'],f['width_bits']) for f in CONTRACT[key]]==[(4*i,32) for i in range(len(names))]
        assert len(set(names))==len(names) and 0<4*len(names)<=PAGE
    native_path=ROOT/'evidence/native-results.json.gz';native=read(native_path)
    assert native['all_valid'] and not native['failed_case_ids'] and all(row['valid'] for row in native['rows']), 'Native gate has not passed'
    assert native['input_names']==INPUT_NAMES and native['output_names']==OUTPUT_NAMES
    assert native['contract_sha256']==sha(ROOT/'contract.json')
    assert sha(ROOT/native['reference_path'])==native['reference_sha256']
    assert len(native['rows'])==native['case_count'] and len({r['id'] for r in native['rows']})==len(native['rows'])
    selected,selection=select_rows(native['rows'],args.trace_limit)
    selection.update(case_ids=[row['id'] for row in selected],available_case_count=len(native['rows']),retained_trace_count=len(selected),trace_limit=args.trace_limit)
    builds={b['variant']:b for b in IDENTITY['builds']}
    cfgs={};traces=[]
    for variant in ('clean','bcf'):
        assert native['processes'][variant]['binary_sha256']==builds[variant]['binary_sha256'] and native['processes'][variant]['exit_code']==0
        pe,analysis=analyze(variant);cfgs[variant]=analysis
        analysis['contract_sha256']=sha(ROOT/'contract.json')
        analysis['analyzer_sha256']=sha(__file__)
        if variant=='bcf':
            for row in selected:
                inputs=dict(zip(INPUT_NAMES,row['inputs']));expected=dict(zip(OUTPUT_NAMES,row['expected']))
                assert len(inputs)==len(row['inputs'])==len(INPUT_NAMES) and len(expected)==len(row['expected'])==len(OUTPUT_NAMES)
                for field,value in zip(CONTRACT['inputs'],row['inputs']):assert value in field['domain']
                assert row['bcf']==row['clean']==row['expected']
                state=dict(inputs=inputs,expected_outputs=expected,**{v:dict(result=dict(outputs=dict(zip(OUTPUT_NAMES,row[v]))),binary_sha256=builds[v]['binary_sha256']) for v in ('clean','bcf')})
                trace=trace_controller(pe,analysis,row['id'],state)
                traces.append(trace)
                assert trace['validation']['ok'], trace['validation']
            for block in analysis['blocks']:
                observed=[t['state_id'] for t in traces if any(o['block_id']==block['id'] for o in t['raw_occurrences'])]
                block['observed_by_states']=observed
                block['classification']='obfuscator_clone' if block['provenance']['classification']=='obfuscator_clone' else 'observed_real' if observed else 'unknown'
        else:
            for block in analysis['blocks']:
                block['observed_by_states']=[];block['classification']='source_control_flow'
            analysis['coverage_note']='Native Windows comparison covers the retained cases; instruction-level emulation retained only for BCF.'
        save(ROOT/'evidence'/f'disassembly-{variant}.json.gz',analysis)
    assert cfgs['clean']['function']['bytes_sha256']!=cfgs['bcf']['function']['bytes_sha256'], 'BCF target machine code did not change'
    assert len(cfgs['bcf']['blocks'])>len(cfgs['clean']['blocks']), 'Expected BCF CFG expansion absent'
    trace_path=ROOT/'evidence/representative-traces.json.gz'
    pack=dict(schema='coop-native-traces/v1',chamber_id=CONTRACT['chamber_id'],contract_sha256=sha(ROOT/'contract.json'),
              native_results_sha256=sha(native_path),analyzer_sha256=sha(__file__),selection=selection,traces=traces)
    save(trace_path,pack)
    sites={}
    for trace in traces:
        for event in trace['semantic_events']:
            key=(event['output'],event['instruction_rva'])
            site=sites.setdefault(key,dict(output=key[0],byte_offset=4*OUTPUT_NAMES.index(key[0]),instruction_rva=key[1],instruction_address=event['instruction_address'],instruction=event['instruction'],raw_block_id=event['raw_block_id'],observed_values=[],case_ids=[]))
            if event['value'] not in site['observed_values']:site['observed_values'].append(event['value'])
            if trace['state_id'] not in site['case_ids']:site['case_ids'].append(trace['state_id'])
    summary=dict(schema='coop-native-trace-summary/v1',chamber_id=CONTRACT['chamber_id'],all_valid=True,trace_count=len(traces),selection=selection,
        tools=dict(pefile=pefile.__version__,capstone=__import__('capstone').__version__,unicorn=__import__('unicorn').__version__),
        trace_artifact=dict(path='evidence/representative-traces.json.gz',sha256=sha(trace_path)),
        cfg_artifacts={v:dict(path=f'evidence/disassembly-{v}.json.gz',sha256=sha(ROOT/'evidence'/f'disassembly-{v}.json.gz')) for v in cfgs},
        cfg_metrics={v:dict(blocks=len(a['blocks']),edges=len(a['edges']),instructions=len(a['instructions']),function_bytes=a['function']['end_va']-a['function']['start_va'],clone_origin_blocks=sum(b['provenance']['classification']=='obfuscator_clone' for b in a['blocks'])) for v,a in cfgs.items()},
        output_store_sites=sorted(sites.values(),key=lambda site:(site['byte_offset'],site['instruction_rva'])),
        output_value_coverage={name:sorted({event['value'] for t in traces for event in t['semantic_events'] if event['output']==name}) for name in OUTPUT_NAMES},
        limitations=['Static CFG is decoded, not an execution trace. Unobserved blocks remain unknown unless linked proof establishes impossibility.','Traces emulate exact PE instructions from bn_evaluate and linked helpers; native Windows stdout independently validates the final output frame.','Executed occurrence prefixes provide calculation context, not a complete backwards data-flow slice.','Server event ordering and timers remain supplied reference state, not emulated native scheduling.'],
        runs=[dict(trace_id=t['trace_id'],case_id=t['state_id'],instructions=len(t['steps']),output_events=len(t['semantic_events']),validation=t['validation']) for t in traces])
    save(ROOT/'evidence/trace-summary.json',summary)
    print(json.dumps(dict(chamber=CONTRACT['chamber_id'],status='PASS',trace_count=len(traces),cfg_metrics=summary['cfg_metrics'],output_store_sites=len(sites)),indent=2))


if __name__=='__main__':main()


