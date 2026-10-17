"""Read-only, standard-library audit of retained cooperative controller evidence.

This does not execute PE specimens, re-run the Windows oracle comparison, rebuild
code, or replace native observations with inferred execution. Run with Python
3.11+ and -I -B. All paths resolve from this script, independently of cwd.
"""
from pathlib import Path
from collections import Counter
from itertools import product
import argparse
import gzip
import hashlib
import json
import runpy
import struct
import re
import copy

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
REFERENCE_COMMIT = "1315c3616ce5ac939baf913f9b09b4ebad34132a"
CHAMBERS = ["handshake", "crossfeed-vault", "race-condition", "deadlock", "use-after-free"]


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    path = Path(path)
    data = path.read_bytes()
    if path.suffix == ".gz":
        data = gzip.decompress(data)
    return json.loads(data.decode("utf-8-sig"))


def local(base, relative):
    path = (base / relative).resolve()
    require(path.is_relative_to(REPO), f"Evidence path escapes repository: {relative}")
    require(not set(path.parts) & {"_build", "node_modules", ".workbench"}, "Portable audit depends on disposable files")
    return path


class PE:
    def __init__(self, path):
        self.data = Path(path).read_bytes()
        require(self.data[:2] == b"MZ", "Missing DOS signature")
        nt = struct.unpack_from("<I", self.data, 0x3c)[0]
        require(self.data[nt:nt+4] == b"PE\0\0", "Missing PE signature")
        machine, count = struct.unpack_from("<HH", self.data, nt+4)
        opt_size = struct.unpack_from("<H", self.data, nt+20)[0]
        opt = nt+24
        require(machine == 0x8664 and struct.unpack_from("<H", self.data, opt)[0] == 0x20b, "Expected AMD64 PE32+")
        self.base = struct.unpack_from("<Q", self.data, opt+24)[0]
        self.directories = [struct.unpack_from("<II", self.data, opt+112+8*i) for i in range(16)]
        self.sections = []
        for i in range(count):
            record = opt+opt_size+40*i
            virtual_size, rva, raw_size, offset = struct.unpack_from("<IIII", self.data, record+8)
            self.sections.append((rva, virtual_size, raw_size, offset))

    def at(self, rva, size):
        for start, _, length, offset in self.sections:
            if start <= rva and rva+size <= start+length:
                return self.data[offset+rva-start:offset+rva-start+size]
        raise ValueError(f"RVA {rva:#x} + {size} has no file-backed PE bytes")

    def string_at(self, rva):
        data = bytearray()
        for i in range(4096):
            byte = self.at(rva+i, 1)[0]
            if byte == 0:
                return data.decode("ascii")
            data.append(byte)
        raise ValueError("Unterminated PE export string")

    def function_extent(self, name="bn_evaluate"):
        export_rva, _ = self.directories[0]
        functions, names, eat, name_table, ordinal_table = struct.unpack_from("<IIIII", self.at(export_rva,40), 20)
        entries = []
        for index in range(names):
            name_rva = struct.unpack("<I", self.at(name_table+4*index,4))[0]
            if self.string_at(name_rva) == name:
                ordinal = struct.unpack("<H", self.at(ordinal_table+2*index,2))[0]
                require(ordinal < functions, "Invalid export ordinal")
                entries.append(struct.unpack("<I", self.at(eat+4*ordinal,4))[0])
        require(len(entries) == 1, "Controller export missing or duplicated")
        pdata, size = self.directories[3]
        extents = [struct.unpack("<III", self.at(pdata+i,12)) for i in range(0,size,12)]
        selected = [(lo,hi) for lo,hi,_ in extents if lo == entries[0]]
        require(len(selected) == 1 and selected[0][1] > entries[0], "Missing exact controller .pdata extent")
        return selected[0]


def contract_check(chamber):
    folder = ROOT / chamber
    contract = read(folder / "contract.json")
    require(contract["schema"] == "coop-native-contract/v1" and contract["chamber_id"] == chamber, "Contract identity mismatch")
    require(contract["reference_commit"] == REFERENCE_COMMIT, "Unexpected reference commit")
    for relative, sha in contract["reference_source_sha256"].items():
        require(digest(local(REPO, relative)) == sha, f"Game reference source hash mismatch: {relative}")
    for direction in ("inputs", "outputs"):
        fields = contract[direction]
        require(fields and len({f["name"] for f in fields}) == len(fields), "Empty/duplicate ABI fields")
        for index, field in enumerate(fields):
            require(field["offset"] == 4*index and field["width_bits"] == 32, "Named uint32 ABI offsets differ")
            require(field["domain"] and len(set(field["domain"])) == len(field["domain"]) and all(type(v) is int and 0 <= v <= 0xffffffff for v in field["domain"]), "Invalid canonical ABI domain")
    abi = contract["abi"]
    require(abi["target"] == "bn_evaluate" and abi["input_register"] == "RCX" and abi["output_register"] == "RDX" and abi["return_type"] == "void", "Controller ABI mismatch")
    require(abi["input_size"] == 4*len(contract["inputs"]) and abi["output_size"] == 4*len(contract["outputs"]), "Controller ABI struct size mismatch")
    if chamber in ("handshake", "deadlock", "use-after-free"):
        document = read(REPO / f"levels/campaign/{chamber}.json")
        definitions = document["controller"]["outputs"]
        require({f["name"] for f in contract["outputs"]} == set(definitions), "Contract omits/adds raw declarative output")
        for field in contract["outputs"]:
            require(field["expression"] == definitions[field["name"]], "Native contract changed authoritative expression")
        require([{k:b[k] for k in ("id","output","target","property")} | {"invert":bool(b.get("invert"))} for b in contract["bindings"]] == [{k:b[k] for k in ("id","output","target","property")} | {"invert":bool(b.get("invert"))} for b in document["bindings"]], "Binding mapping or inversion differs from game JSON")
    return contract


def declarative_value(expression, inputs, definitions):
    op = expression["op"]
    if op == "const": return expression["value"]
    if op == "ref":
        name = expression["id"]
        return declarative_value(definitions[name], inputs, definitions) if name in definitions else bool(inputs[name])
    if op == "not": return not declarative_value(expression["arg"], inputs, definitions)
    if op == "and": return all(declarative_value(e,inputs,definitions) for e in expression["args"])
    if op == "or": return any(declarative_value(e,inputs,definitions) for e in expression["args"])
    raise ValueError("Unknown declarative expression operation")


def reference_check(chamber, contract):
    folder = ROOT / chamber
    path = folder / "evidence/reference-vectors.json"
    if not path.exists(): path = path.with_suffix(".json.gz")
    reference = read(path)
    require(reference["schema"] == "coop-native-reference/v1" and reference["chamber_id"] == chamber and reference["reference_commit"] == REFERENCE_COMMIT, "Reference identity mismatch")
    require(reference["contract_sha256"] == digest(folder / "contract.json"), "Reference contract hash mismatch")
    require(reference["reference_source_sha256"] == contract["reference_source_sha256"], "Reference source identity mismatch")
    generator = reference.get("generator_path","experiments/coop-controllers/shared/reference_declarative.mjs")
    require(digest(local(REPO,generator)) == reference["generator_sha256"], "Reference generator hash mismatch")
    inputs = [f["name"] for f in contract["inputs"]]
    outputs = [f["name"] for f in contract["outputs"]]
    require(reference["input_names"] == inputs and reference["output_names"] == outputs, "Reference field order mismatch")
    cases = reference["cases"]
    possible = set(product(*(f["domain"] for f in contract["inputs"])))
    count = reference["coverage"].get("exhaustive_row_count",len(cases))
    exhaustive = cases[:count]
    observed = {tuple(row["inputs"][name] for name in inputs) for row in exhaustive}
    require(observed == possible and len(exhaustive) == len(possible), "Reference lacks unique exhaustive mixed-domain coverage")
    require(len({row["id"] for row in cases}) == len(cases), "Reference case IDs duplicated")
    for row in cases:
        require(set(row["inputs"]) == set(inputs) and set(row["expected_outputs"]) == set(outputs), "Reference named fields missing or extra")
        require(all(type(row["inputs"][f["name"]]) is int and row["inputs"][f["name"]] in f["domain"] for f in contract["inputs"]), "Reference input outside canonical domain")
        for field in contract["outputs"]:
            require(type(row["expected_outputs"][field["name"]]) is int and row["expected_outputs"][field["name"]] in field["domain"], "Reference output outside canonical domain")
        if chamber in ("handshake", "deadlock", "use-after-free"):
            definitions = {f["name"]:f["expression"] for f in contract["outputs"]}
            values = {f["game_port"]:row["inputs"][f["name"]] for f in contract["inputs"]}
            expected = {name:int(declarative_value(definitions[name],values,definitions)) for name in outputs}
            require(row["expected_outputs"] == expected, "Captured actual evaluator result contradicts retained AST")
            resolved = {b["id"]:int(bool(expected[b["output"]]) != b["invert"]) for b in contract["bindings"]}
            require(row["resolved_bindings"] == resolved, "Resolved binding applies wrong/missing/double inversion")
            unlock = next(b for b in contract["bindings"] if b["property"] == "unlock")
            require(row["exit_unlock_requested"] == resolved[unlock["id"]], "Current unlock request confused with server exit latch")
    ids = {row["id"] for row in cases}
    require(all(i in ids for seq in reference["sequences"] for i in seq["case_ids"]), "Sequence references a missing oracle snapshot")
    require(reference["coverage"]["case_count"] == len(cases), "Reference coverage count mismatch")
    if chamber in ("crossfeed-vault","race-condition"):
        temporal_sequence_check(chamber,contract,reference)
    return reference


def temporal_sequence_check(chamber, contract, reference):
    """Cross-check retained reducer observations; does not re-run game reducers."""
    detail = read(ROOT / chamber / "evidence/server-sequences.json")
    require(detail["schema"] == "coop-server-sequences/v1" and detail["chamber_id"] == chamber, "Server sequence identity mismatch")
    for key in ("reference_commit","reference_source_sha256","contract_sha256","generator_sha256","input_names","output_names","coverage"):
        require(detail[key] == reference[key], "Server sequence/reference provenance mismatch")
    require(len(detail["sequences"]) == len(reference["sequences"]), "Server sequence count mismatch")
    cases = {c["id"]:c for c in reference["cases"]}
    seen = set()
    physical = {"physicalLeftRoute":"leftRoute","physicalRightRoute":"rightRoute"} if chamber == "crossfeed-vault" else {"physicalPhaseA":"phaseA","physicalPhaseB":"phaseB","physicalReturnBridge":"returnBridge"}
    for sequence, ref in zip(detail["sequences"],reference["sequences"]):
        require(sequence["id"] == ref["id"] and [s["case_id"] for s in sequence["steps"]] == ref["case_ids"], "Server ordered reducer step references differ")
        prior = None
        for step in sequence["steps"]:
            require(step["record_valid"] is True and step["case_id"] not in seen, "Invalid/duplicate ordered server record")
            if prior is not None: require(step["before"] == prior, "Server sequence before/after continuity mismatch")
            ctx = step["after"]
            prior = ctx
            seen.add(step["case_id"])
            require(step["now_ms"] == ctx["now"] and len(ctx["held"]) == 2 and set(ctx["record"]["cubePlacements"]) == {"cubeA","cubeB"}, "Ordered fixture is not a two-player/two-cube context")
            projection = step["actual_projection"]
            inputs = {k:int(v) for k,v in projection["inputs"].items()}
            inputs["exitUnlocked"] = int(ctx["record"]["exitUnlocked"])
            if chamber == "crossfeed-vault":
                inputs.update(leftGraceActive=int(ctx["now"] < ctx["crossfeed"]["leftUntil"]),rightGraceActive=int(ctx["now"] < ctx["crossfeed"]["rightUntil"]))
            else:
                inputs.update(phaseGraceActive=int(ctx["now"] < ctx["race"]["phaseUntil"]),returnGraceActive=int(ctx["now"] < ctx["race"]["returnUntil"]),bufferPhase=["idle","window","released","expired"].index(ctx["race"]["buffer"]))
                require(projection["buffer"]["phase"] == ctx["race"]["buffer"] and projection["buffer"]["remainingMs"] == (max(0,ctx["race"]["deadline"]-ctx["now"]) if ctx["race"]["buffer"] == "window" else 0), "Retained timer projection contradicts runtime context")
            outputs = {k:int(v) for k,v in projection["outputs"].items()}
            outputs.update({name:int(projection["physical"][signal]) for name,signal in physical.items()})
            outputs["exitUnlockCandidate"] = step["actual_unlock_candidate"]
            case = cases[step["case_id"]]
            require(inputs == case["inputs"] and outputs == case["expected_outputs"], "Actual ordered server projection differs from native reference snapshot")
    require(len(seen) == reference["coverage"]["sequence_snapshot_count"] and seen == {c["id"] for c in reference["cases"][reference["coverage"]["exhaustive_row_count"]:]}, "Ordered sequence snapshot coverage mismatch")


def build_check(chamber, contract):
    folder = ROOT / chamber
    identity = read(folder / "build_or_identity/identity.json")
    require(identity["schema"] == "coop-native-build/v1" and identity["chamber_id"] == chamber and identity["reference_commit"] == REFERENCE_COMMIT, "Build identity mismatch")
    require(identity["contract_sha256"] == digest(folder / "contract.json") and identity["abi"] == contract["abi"], "Build contract/ABI mismatch")
    require(identity["compiler"]["sha256"] == "0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be", "Unexpected OLLVM compiler identity")
    require(identity["seed"] == "00112233445566778899AABBCCDDEEFF", "Build seed differs")
    require(identity["build_script_sha256"] == digest(ROOT / "shared/build.py"), "Retained build script differs from recorded producer")
    for filename, sha in identity["source_sha256"].items():
        require(digest(local(folder / "src", filename)) == sha, "Retained native source hash mismatch")
    builds = {b["variant"]:b for b in identity["builds"]}
    require(set(builds) == {"clean", "bcf"}, "Need distinct clean and BCF builds")
    images = {}
    for variant, build in builds.items():
        require(build["optimization"] == "O0" and build["transformations"] == ([] if variant == "clean" else ["bcf"]), "Unexpected compiler pipeline")
        flags = [] if variant == "clean" else ["-mllvm","-bcf","-mllvm","-bcf_prob=100","-mllvm","-bcf_loop=1","-mllvm","-aesSeed=00112233445566778899AABBCCDDEEFF"]
        require(build["frontend_extra_flags"] == flags, "Obfuscation flags missing/changed")
        binary = local(folder,build["binary_path"])
        require(digest(binary) == build["binary_sha256"], "Native PE hash mismatch")
        artifacts = {"controller.ll":"ir_sha256", "controller.s":"compiler_assembly_sha256", "controller.labelled.s":"labelled_assembly_sha256", "controller.map":"link_map_sha256", "assembly_labels.json":"label_manifest_sha256"}
        prefix = folder / "build_or_identity" / variant
        for name, key in artifacts.items():
            require(digest(prefix / name) == build[key], f"Build evidence hash mismatch: {chamber}/{variant}/{name}")
        original = (prefix / "controller.s").read_text(encoding="utf-8")
        marked = (prefix / "controller.labelled.s").read_text(encoding="utf-8")
        stripped = "\n".join(line for line in marked.splitlines() if not re.match(r"^\s*\.globl\s+audit_LBB\d+_\d+\s*$",line) and not re.match(r"^audit_LBB\d+_\d+:\s*$",line))+"\n"
        require(stripped == original, "Audit label insertion changes executable assembly")
        images[variant] = PE(binary)
    require(builds["clean"]["binary_sha256"] != builds["bcf"]["binary_sha256"], "Clean/BCF PE identities unexpectedly equal")
    return identity, builds, images


def native_check(chamber, contract, reference, builds):
    folder = ROOT / chamber
    native = read(folder / "evidence/native-results.json.gz")
    require(native["schema"] == "coop-native-results/v1" and native["chamber_id"] == chamber, "Native result identity mismatch")
    require(native["contract_sha256"] == digest(folder / "contract.json") and native["reference_sha256"] == digest(local(folder,native["reference_path"])), "Native reference hash mismatch")
    require(native["input_names"] == reference["input_names"] and native["output_names"] == reference["output_names"], "Native field mapping differs from oracle")
    require(native["case_count"] == len(reference["cases"]) == len(native["rows"]), "Native result count differs from oracle")
    require(native["all_valid"] and native["failed_case_ids"] == [], "Native validation failed")
    observed = {}
    for variant in ("clean","bcf"):
        process = native["processes"][variant]
        require(process["binary_sha256"] == builds[variant]["binary_sha256"] and process["exit_code"] == 0 and process["stderr"] == "", "Native process PE/status mismatch")
        path = local(folder,process["stdout_path"])
        require(digest(path) == process["stdout_file_sha256"], "Native stdout archive hash mismatch")
        raw = gzip.decompress(path.read_bytes())
        require(hashlib.sha256(raw).hexdigest() == process["stdout_sha256"], "Native stdout byte hash mismatch")
        observed[variant] = [json.loads(line) for line in raw.splitlines()]
        require(len(observed[variant]) == process["input_vectors"] == len(native["rows"])+native["ordered_sequence_frames"], "Native stdout frame count mismatch")
    for index, (row, case) in enumerate(zip(native["rows"],reference["cases"])):
        inputs = [case["inputs"][n] for n in native["input_names"]]
        expected = [case["expected_outputs"][n] for n in native["output_names"]]
        require(row["id"] == case["id"] and row["inputs"] == inputs and row["expected"] == expected and row["valid"], "Native row/reference mismatch")
        for variant in ("clean","bcf"):
            require(row[variant] == expected, "Actual native outputs disagree with game reference")
            require(observed[variant][index] == {"inputs":case["inputs"],"outputs":case["expected_outputs"]}, "Parsed native row differs from retained process stdout")
    cases = {c["id"]:c for c in reference["cases"]}
    require(len(native["ordered_sequences"]) == len(reference["sequences"]), "Native ordered sequences missing")
    index = len(native["rows"])
    for actual, sequence in zip(native["ordered_sequences"],reference["sequences"]):
        require(actual["id"] == sequence["id"] and actual["all_valid"] and [s["case_id"] for s in actual["steps"]] == sequence["case_ids"], "Native sequence order differs from actual game oracle")
        for step in actual["steps"]:
            case = cases[step["case_id"]]
            require(step["inputs"] == case["inputs"] and step["expected_outputs"] == case["expected_outputs"] and step["valid"], "Ordered native snapshot differs from reference")
            frame = {"inputs":case["inputs"],"outputs":case["expected_outputs"]}
            for variant in ("clean","bcf"):
                require(step[variant] == observed[variant][index] == frame, "Sequence native result differs from actual retained stdout frame")
            index += 1
    require(index == len(native["rows"])+native["ordered_sequence_frames"], "Extra/missing sequence observations")
    summary = read(folder / "evidence/native-summary.json")
    require(summary["native_result_sha256"] == digest(folder / "evidence/native-results.json.gz") and summary["native_frames"] == 2*index and summary["sequence_count"] == len(native["ordered_sequences"]), "Native summary hash/counts differ from actual retained results")
    for key in set(summary) & set(native):
        require(summary[key] == native[key], "Native summary disagrees with result field: "+key)
    return native


def instruction_bytes(image, instruction):
    code = bytes.fromhex(instruction["bytes"])
    require(code and len(code) == instruction["size"] and image.at(instruction["rva"],len(code)) == code, "Static instruction differs from exact PE bytes")
    require(instruction["address"] == image.base+instruction["rva"], "Instruction VA/RVA mismatch")
    return code


def direct_target(instruction):
    code = bytes.fromhex(instruction["bytes"])
    address = instruction["address"]
    if len(code) == 2 and (code[0] == 0xeb or 0x70 <= code[0] <= 0x7f):
        return address+2+struct.unpack("b",code[1:])[0]
    if len(code) == 5 and code[0] in (0xe8,0xe9):
        return address+5+struct.unpack("<i",code[1:])[0]
    if len(code) == 6 and code[0] == 0x0f and 0x80 <= code[1] <= 0x8f:
        return address+6+struct.unpack("<i",code[2:])[0]
    raise ValueError("Unsupported native direct branch encoding")


def cfg_check(chamber, variant, build, image):
    cfg = read(ROOT / chamber / f"evidence/disassembly-{variant}.json.gz")
    require(cfg["binary"]["sha256"] == build["binary_sha256"], "CFG PE identity mismatch")
    start, end = image.function_extent()
    fn = cfg["function"]
    require(fn["name"] == "bn_evaluate" and (fn["start_rva"],fn["end_rva"]) == (start,end), "CFG function extent differs from PE export/.pdata")
    require(hashlib.sha256(image.at(start,end-start)).hexdigest() == fn["bytes_sha256"], "Controller byte hash differs")
    cursor = start
    by_address = {}
    for instruction in cfg["instructions"]:
        code = instruction_bytes(image,instruction)
        require(instruction["rva"] == cursor, "Instruction stream does not partition function bytes")
        require(instruction["id"] == f'insn_{cursor:08X}', "Unstable native instruction ID")
        by_address[instruction["address"]] = instruction
        cursor += len(code)
    require(cursor == end, "Incomplete controller instruction decoding")
    blocks = {b["id"]:b for b in cfg["blocks"]}
    require(len(blocks) == len(cfg["blocks"]), "Duplicate raw block ID")
    starts = {b["start_va"]:b["id"] for b in blocks.values()}
    addresses, edges = [], []
    for bid, block in blocks.items():
        instructions = block["instructions"]
        require(instructions and block["instruction_addresses"] == [i["address"] for i in instructions], "Block instruction membership differs")
        require(block["start_va"] == instructions[0]["address"] and block["end_va"] == instructions[-1]["address"]+instructions[-1]["size"], "Block extent mismatch")
        require(all(i == by_address[i["address"]] and i["block_id"] == bid for i in instructions), "Static instruction/block back-reference differs")
        addresses += block["instruction_addresses"]
        last = instructions[-1]
        targets = []
        if last["mnemonic"] == "jmp": targets = [(direct_target(last),"jump")]
        elif last["mnemonic"].startswith("j"): targets = [(direct_target(last),"branch_taken"),(block["end_va"],"fallthrough")]
        elif last["mnemonic"] != "ret": targets = [(block["end_va"],"fallthrough")]
        for address, kind in targets:
            require(address in starts, "Control transfer enters interior/noncontroller bytes")
            edges.append((bid,starts[address],kind,last["address"]))
    require(addresses == list(by_address), "Raw blocks do not partition controller instructions")
    recorded = [(e["source"],e["target"],e["kind"],e["evidence_instruction"]) for e in cfg["edges"]]
    require(sorted(edges) == sorted(recorded), "CFG edges disagree with encoded machine transfers")
    audit = cfg["provenance_audit"]
    require(audit["compiler_assembly_sha256"] == build["compiler_assembly_sha256"] and audit["authoritative_labelled_assembly_sha256"] == build["labelled_assembly_sha256"] and audit["transformed_ir_sha256"] == build["ir_sha256"], "Static provenance hash mismatch")
    require(audit["relocated_object_matches_pe_function"] and all(o["identical_bytes"] and o["identical_normalized_relocations"] for o in audit["object_comparison"]), "Recorded object equivalence failed")
    for relocation in audit["resolved_function_relocations"]:
        place = start+relocation["function_offset"]
        require(relocation["relocation_type"] == 4 and relocation["addend"] == 0, "Unexpected linked relocation")
        delta = relocation["target_va"]-(image.base+place+4)
        require(struct.unpack("<i",image.at(place,4))[0] == delta == relocation["resolved_displacement"], "Actual linked PE relocation target mismatch")
    return cfg


GP_REGS = ["rax","rcx","rdx","rbx","rsp","rbp","rsi","rdi","r8","r9","r10","r11","r12","r13","r14","r15"]


def register_value(registers, name, width):
    aliases = {"eax":"rax","ecx":"rcx","edx":"rdx","ebx":"rbx","esi":"rsi","edi":"rdi","ebp":"rbp","esp":"rsp","al":"rax","cl":"rcx","dl":"rdx","bl":"rbx","ax":"rax","cx":"rcx","dx":"rdx"}
    full = aliases.get(name,name)
    if re.fullmatch(r"r(?:[89]|1[0-5])[dwb]",full): full = full[:-1]
    return registers[full] & ((1 << width)-1)


def decode_output_store(instruction, registers):
    """Decode the retained MOV r/m32, imm32 or MOV r/m32, r32 output store."""
    code = bytes.fromhex(instruction["bytes"])
    pos, rex = 0, 0
    if 0x40 <= code[0] <= 0x4f: rex, pos = code[0], 1
    require(not rex & 8, "Output store unexpectedly has 64-bit width")
    opcode, modrm = code[pos], code[pos+1]
    require(opcode in (0xc7,0x89), "Output commit is not an encoded 32-bit MOV")
    pos += 2
    mode, reg, rm = modrm >> 6, (modrm >> 3) & 7, modrm & 7
    require(mode != 3, "Output store has register destination")
    base = 0
    if rm == 4:
        sib = code[pos]; pos += 1
        scale, index, base_field = sib >> 6, (sib >> 3) & 7, sib & 7
        if index != 4 or rex & 2: base += registers[GP_REGS[index+ (8 if rex & 2 else 0)]] << scale
        if mode == 0 and base_field == 5:
            base += struct.unpack("<i",code[pos:pos+4])[0]; pos += 4
        else: base += registers[GP_REGS[base_field+ (8 if rex & 1 else 0)]]
    elif mode == 0 and rm == 5:
        base = instruction["address"]+len(code)+struct.unpack("<i",code[pos:pos+4])[0]; pos += 4
    else: base = registers[GP_REGS[rm+ (8 if rex & 1 else 0)]]
    if mode == 1: base += struct.unpack("b",code[pos:pos+1])[0]; pos += 1
    elif mode == 2: base += struct.unpack("<i",code[pos:pos+4])[0]; pos += 4
    if opcode == 0xc7:
        require(reg == 0, "Unexpected immediate MOV extension")
        value = int.from_bytes(code[pos:pos+4],"little"); pos += 4
    else: value = registers[GP_REGS[reg+ (8 if rex & 4 else 0)]] & 0xffffffff
    require(pos == len(code), "Unexpected bytes after output store")
    return base, value


def trace_check(trace, case, contract, cfg, image, build):
    require(trace["state_id"] == case["id"] and trace["trace_id"] == f'bcf_case_{case["id"]}' and trace["inputs"] == case["inputs"], "Trace case identity mismatch")
    require(trace["binary_sha256"] == build["binary_sha256"] and trace["stop_reason"] == "controller_return_sentinel" and trace["execution_error"] is None, "Trace binary or termination mismatch")
    fields = [f["name"] for f in contract["outputs"]]
    expected = case["expected_outputs"]
    model = trace["machine_model"]
    require(model["entry"] == "bn_evaluate" and model["input_layout"] == {f["name"]:f["offset"] for f in contract["inputs"]} and model["output_layout"] == {f["name"]:f["offset"] for f in contract["outputs"]}, "Trace ABI differs from contract")
    input_base, output_base = model["input_address"], model["output_address"]
    registers = dict(trace["initial_registers"])
    require(registers["rcx"] == input_base and registers["rdx"] == output_base and registers["rip"] == cfg["function"]["start_va"], "Trace argument/entry registers mismatch")
    require(trace["initial_outputs"] == dict.fromkeys(fields,0xa5a5a5a5), "Trace output sentinel missing")
    descriptors = {i["id"]:i for i in cfg["instructions"]}
    for ins in trace["helper_instructions"]:
        require(ins["id"] not in descriptors, "Linked helper overlaps controller")
        instruction_bytes(image,ins)
        descriptors[ins["id"]] = ins
    memory = {}
    for base, values in [(input_base,[case["inputs"][f["name"]] for f in contract["inputs"]]),(output_base,[0xa5a5a5a5]*len(fields))]:
        for offset, value in enumerate(values):
            memory.update({base+4*offset+j:byte for j,byte in enumerate(value.to_bytes(4,"little"))})
    memory.update({registers["rsp"]+j:byte for j,byte in enumerate(model["return_sentinel"].to_bytes(8,"little"))})
    flags = trace["initial_flags"]
    call_stack, writes = [], []
    for index, step in enumerate(trace["steps"]):
        instruction = descriptors[step["instruction_ref"]]
        code = instruction_bytes(image,instruction)
        require(step["index"] == index and step["address"] == instruction["address"] == registers["rip"] and step["rva"] == instruction["rva"], "Trace instruction chronology mismatch")
        require(step["flags_before"] == flags, "Trace flag chronology mismatch")
        require((step["scope"] == "controller" and step["block_id"] == instruction["block_id"]) if "block_id" in instruction else (step["scope"] == "linked_helper" and step["block_id"] is None), "Trace controller/helper classification mismatch")
        comparison = step.get("comparison")
        if comparison:
            require(comparison["snapshot_phase"] == "before_instruction" and comparison["operation"] == instruction["mnemonic"], "Comparison snapshot metadata mismatch")
            for operand in comparison["operands"]:
                width, unsigned = operand["width"], operand["unsigned"]
                require(operand["signed"] == unsigned-((1 << width) if unsigned >> (width-1) else 0), "Comparison signed/unsigned disagreement")
                if operand["kind"] == "register": require(register_value(registers,operand["register"],width) == unsigned, "Comparison register differs from reconstructed pre-state")
                elif operand["kind"] == "memory" and all(operand["address"]+j in memory for j in range(width//8)):
                    require(int.from_bytes(bytes(memory[operand["address"]+j] for j in range(width//8)),"little") == unsigned, "Comparison memory differs from actual preceding writes")
            lhs,rhs = comparison["operands"]
            width,a,b = lhs["width"],lhs["unsigned"],rhs["unsigned"]
            mask,sign = (1 << width)-1,1 << (width-1)
            result = (a-b if comparison["operation"] == "cmp" else a & b) & mask
            expected_flags = (64 if result == 0 else 0) | (128 if result & sign else 0) | (4 if (result & 255).bit_count()%2 == 0 else 0)
            if comparison["operation"] == "cmp": expected_flags |= (1 if a < b else 0) | (2048 if (a ^ b) & (a ^ result) & sign else 0)
            require(step["flags_after"] & 2245 == expected_flags, "Recorded CMP/TEST flags contradict operands")
        for write in step["memory_writes"]:
            address,size = write["address"],write["size"]
            old,new = bytes.fromhex(write["before"]),bytes.fromhex(write["after"])
            require(len(old) == len(new) == size and int.from_bytes(new,"little") == write["value"] % (1 << (8*size)), "Recorded memory write bytes/value mismatch")
            require(not (address < input_base+contract["abi"]["input_size"] and address+size > input_base), "Trace mutated controller inputs")
            require(all(memory.get(address+j,byte) == byte for j,byte in enumerate(old)), "Recorded memory before-value contradicts history")
            memory.update({address+j:byte for j,byte in enumerate(new)})
            if address < output_base+4*len(fields) and address+size > output_base:
                require(size == 4 and output_base <= address and (address-output_base)%4 == 0, "Output write crosses field boundary")
                require(decode_output_store(instruction,registers) == (address,write["value"]), "Encoded PE output store disagrees with observed commit")
                writes.append((index,fields[(address-output_base)//4],write))
        next_address = step["address"]+len(code)
        branch = step.get("branch")
        mnemonic = instruction["mnemonic"]
        if mnemonic == "jmp": next_address = direct_target(instruction)
        elif mnemonic.startswith("j"):
            require(branch and branch["kind"] == "conditional", "Missing conditional branch observation")
            cf,pf,zf,sf,of = (bool(flags & n) for n in (1,4,64,128,2048))
            condition = (code[1] if code[0] == 0x0f else code[0]) & 15
            taken = [of,not of,cf,not cf,zf,not zf,cf or zf,not cf and not zf,sf,not sf,pf,not pf,sf != of,sf == of,zf or sf != of,not zf and sf == of][condition]
            target = direct_target(instruction)
            require(branch["taken"] == taken and branch["flags_used"] == flags and branch["target_address"] == target and branch["fallthrough_address"] == next_address, "Branch observation contradicts exact Jcc/flags")
            next_address = target if taken else next_address
        elif mnemonic == "call":
            require(branch and branch["kind"] == "call" and branch["return_address"] == next_address, "Helper call metadata mismatch")
            call_stack.append(next_address)
            next_address = direct_target(instruction)
            require(branch["target_address"] == next_address, "Linked helper call target mismatch")
        elif mnemonic == "ret":
            require(branch and branch["kind"] == "return", "Missing native return observation")
            next_address = call_stack.pop() if call_stack else model["return_sentinel"]
            require(int.from_bytes(bytes(memory[registers["rsp"]+j] for j in range(8)),"little") == next_address, "Return target differs from recorded stack bytes")
        if branch: require(branch["next_address"] == next_address, "Branch next address mismatch")
        for name, pair in step["register_changes"].items():
            require(registers[name] == pair[0], "Register delta before-value breaks chronology")
            registers[name] = pair[1]
        require(registers["rip"] == next_address, "Recorded RIP contradicts machine control flow")
        flags = step["flags_after"]
    require(registers["rip"] == model["return_sentinel"] and not call_stack, "Trace does not return normally")
    blocks = {b["id"]:b for b in cfg["blocks"]}
    occurrences = trace["raw_occurrences"]
    counts,covered = Counter(),[]
    edges = {(e["source"],e["target"]) for e in cfg["edges"]}
    for index, occurrence in enumerate(occurrences):
        bid,indices = occurrence["block_id"],occurrence["step_indices"]
        counts[bid] += 1
        require(occurrence["id"] == f'{trace["trace_id"]}:raw:{index:03d}' and occurrence["index"] == index and occurrence["visit_number"] == counts[bid], "Raw occurrence ID/visit chronology mismatch")
        require(indices == sorted(set(indices)) and occurrence["start_step"] == indices[0] and occurrence["end_step"] == indices[-1], "Raw occurrence span mismatch")
        require([trace["steps"][i]["address"] for i in indices] == blocks[bid]["instruction_addresses"], "Occurrence differs from complete actual block instruction order")
        require(all(trace["steps"][i]["raw_occurrence_id"] == occurrence["id"] and trace["steps"][i]["block_id"] == bid for i in indices), "Step/occurrence linkage mismatch")
        following = occurrences[index+1] if index+1 < len(occurrences) else None
        require(occurrence["next_occurrence_id"] == (following["id"] if following else None) and occurrence["next_block_id"] == (following["block_id"] if following else None), "Next occurrence is not chronological")
        if following: require((bid,following["block_id"]) in edges, "Observed transition absent from raw CFG")
        covered += indices
    require(covered == [s["index"] for s in trace["steps"] if s["scope"] == "controller"], "Raw occurrences omit/duplicate executed controller steps")
    require(len(writes) == len(trace["semantic_events"]) == len(fields) and {w[1] for w in writes} == set(fields), "Every output must have exactly one actual commit")
    state = dict.fromkeys(fields,0xa5a5a5a5)
    for ordinal, ((index,name,write),event) in enumerate(zip(writes,trace["semantic_events"])):
        step = trace["steps"][index]
        ins = descriptors[step["instruction_ref"]]
        require(event["id"] == f'{trace["trace_id"]}:output:{ordinal:02d}' and event["trace_id"] == trace["trace_id"] and event["state_id"] == case["id"] and event["inputs"] == case["inputs"], "Output event identity mismatch")
        require(event["output"] == name and event["kind"] == "output_write" and event["value"] == write["value"] == expected[name] and type(event["bool_value"]) is bool and int(event["bool_value"]) == write["value"], "Output event differs from actual write or game reference")
        require(event["step_index"] == index and event["instruction_address"] == ins["address"] and event["instruction_rva"] == ins["rva"] and event["instruction_text"] == ins["mnemonic"]+" "+ins["op_str"], "Output event instruction mismatch")
        require(event["instruction"] == {k:v for k,v in ins.items() if k != "block_id"}, "Output instruction bytes/descriptor differs from PE")
        require(event["raw_block_id"] == step["block_id"] and event["raw_occurrence_id"] == step["raw_occurrence_id"], "Output event occurrence mismatch")
        require(event["memory_address"] == write["address"] and event["memory_before"] == write["before"] == "a5a5a5a5" and event["memory_after"] == write["after"], "Output event is not actual sentinel replacement")
        occurrence = next(o for o in occurrences if o["id"] == event["raw_occurrence_id"])
        require(event["underlying_instruction_addresses"] == [trace["steps"][i]["address"] for i in occurrence["step_indices"] if i <= index], "Output lineage prefix differs from executed occurrence")
        state[name] = write["value"]
        require(event["state_after"] == state, "Output state not sampled after commit")
    final = {name:int.from_bytes(bytes(memory[output_base+4*i+j] for j in range(4)),"little") for i,name in enumerate(fields)}
    require(final == expected == trace["final_outputs"] == trace["expected_outputs"] == trace["native_outputs"], "Final trace/native/reference output disagreement")
    require(trace["validation"]["ok"] and trace["validation"]["errors"] == [] and trace["validation"]["output_event_count"] == len(fields), "Recorded trace validation failed")


def trace_pack_check(chamber, contract, reference, cfg, image, build):
    folder = ROOT / chamber
    pack = read(folder / "evidence/representative-traces.json.gz")
    require(pack["schema"] == "coop-native-traces/v1" and pack["chamber_id"] == chamber, "Trace pack identity mismatch")
    require(pack["contract_sha256"] == digest(folder / "contract.json") and pack["native_results_sha256"] == digest(folder / "evidence/native-results.json.gz"), "Trace pack contract/native hashes differ")
    require(pack["analyzer_sha256"] == digest(ROOT / "shared/analyze.py"), "Retained trace producer differs from recorded version")
    selection = pack["selection"]
    traces = pack["traces"]
    require(selection["retained_trace_count"] == len(traces) and selection["available_case_count"] == len(reference["cases"]) and selection["case_ids"] == [t["state_id"] for t in traces], "Trace selection claims differ from retained cases")
    require(len(set(selection["case_ids"])) == len(traces), "Duplicate retained trace case")
    if selection["exhaustive_cases"]: require(set(selection["case_ids"]) == {c["id"] for c in reference["cases"]}, "Trace coverage falsely claims exhaustive")
    cases = {c["id"]:c for c in reference["cases"]}
    for trace in traces:
        require(trace["state_id"] in cases, "Trace references nonexistent oracle case")
        trace_check(trace,cases[trace["state_id"]],contract,cfg,image,build)
    for block in cfg["blocks"]:
        observed = {t["state_id"] for t in traces if any(o["block_id"] == block["id"] for o in t["raw_occurrences"])}
        require(set(block["observed_by_states"]) == observed, "Static block observed-case annotation contradicts retained traces")
    summary = read(folder / "evidence/trace-summary.json")
    require(summary["all_valid"] and summary["chamber_id"] == chamber and summary["trace_count"] == len(traces) and summary["selection"] == selection, "Trace summary coverage mismatch")
    for artifact in [summary["trace_artifact"], *summary["cfg_artifacts"].values()]:
        require(digest(local(folder,artifact["path"])) == artifact["sha256"], "Trace summary artifact hash mismatch")
    events = [e for t in traces for e in t["semantic_events"]]
    sites = {(e["output"],e["instruction_address"]) for e in events}
    require(sites == {(s["output"],s["instruction_address"]) for s in summary["output_store_sites"]}, "Output store summary invents/omits an observed site")
    offsets = {f["name"]:f["offset"] for f in contract["outputs"]}
    for site in summary["output_store_sites"]:
        selected = [e for e in events if (e["output"],e["instruction_address"]) == (site["output"],site["instruction_address"])]
        first = selected[0]
        require(site["byte_offset"] == offsets[site["output"]] and site["instruction_rva"] == first["instruction_rva"] and site["instruction"] == first["instruction"] and site["raw_block_id"] == first["raw_block_id"], "Output store-site descriptor mismatch")
        require(set(site["case_ids"]) == {e["state_id"] for e in selected} and site["observed_values"] == sorted({e["value"] for e in selected}), "Output store-site observation coverage mismatch")
    require(summary["output_value_coverage"] == {f["name"]:sorted({e["value"] for e in events if e["output"] == f["name"]}) for f in contract["outputs"]}, "Output value summary differs from actual commits")
    require(summary["runs"] == [{"trace_id":t["trace_id"],"case_id":t["state_id"],"instructions":len(t["steps"]),"output_events":len(t["semantic_events"]),"validation":t["validation"]} for t in traces], "Per-run trace summary differs")
    return pack


def retained_inventory(folder, recursive=True):
    files = folder.rglob("*") if recursive else folder.iterdir()
    return {p.relative_to(folder).as_posix() for p in files if p.is_file() and
            not {"_build","__pycache__"} & set(p.relative_to(folder).parts) and
            p.suffix not in {".pyc",".log",".exp",".lib"} and p != folder / "manifest.json" and
            not (folder == ROOT and p.name == "verification-report.json")}


def integration_check(chamber, contract):
    folder = ROOT / chamber
    mapping = read(folder / "integration.json")
    summary = read(folder / "evidence/trace-summary.json")
    require(mapping["schema"] == "coop-native-integration/v1" and mapping["chamber_id"] == chamber and mapping["status"] == "proposal_only_no_live_integration", "Integration proposal identity/scope mismatch")
    require(mapping["contract_sha256"] == digest(folder / "contract.json") and mapping["trace_summary_sha256"] == digest(folder / "evidence/trace-summary.json"), "Integration mapping evidence hash mismatch")
    require(len(mapping["outputs"]) == len(contract["outputs"]) and mapping["server_owned"] == contract["server_owned"], "Integration output/server-owned contract mismatch")
    for output, field in zip(mapping["outputs"],contract["outputs"]):
        require({k:output[k] for k in field} == field, "Integration named output/offset/domain differs from ABI")
        require(output["memory"] == f"uint32_t at the output buffer supplied in RDX + {field['offset']} bytes", "Integration memory address description mismatch")
        require(output["bindings"] == [b for b in contract["bindings"] if b["output"] == field["name"] or b.get("physical_output") == field["name"]], "Integration binding mapping/inversion/physical projection mismatch")
        require(output["verified_bcf_store_sites"] == [s for s in summary["output_store_sites"] if s["output"] == field["name"]] and output["observed_values"] == summary["output_value_coverage"][field["name"]], "Integration native store sites/value coverage mismatch")


def manifest_files(folder, manifest, recursive=True):
    files = manifest["files"]
    require(set(files) == retained_inventory(folder,recursive), "Manifest inventory missing/extra retained files: "+str(folder.name))
    for relative, sha in files.items():
        require(isinstance(relative,str) and "\\" not in relative and ":" not in relative and relative == Path(relative).as_posix() and not Path(relative).is_absolute() and ".." not in Path(relative).parts, "Manifest path is not a portable relative path")
        path = (folder / relative).resolve()
        require(path.is_relative_to(folder.resolve()), "Manifest path escapes its evidence area")
        require(isinstance(sha,str) and re.fullmatch(r"[0-9a-f]{64}",sha) and digest(path) == sha, "Manifest file hash mismatch: "+relative)


def manifest_check():
    package = read(ROOT / "manifest.json")
    require(package["schema"] == "coop-native-package/v1" and package["reference_commit"] == REFERENCE_COMMIT and set(package["chambers"]) == set(CHAMBERS), "Package manifest identity/chamber set mismatch")
    manifest_files(ROOT,package,False)
    for chamber, ref in package["chambers"].items():
        require(ref["manifest_path"] == f"{chamber}/manifest.json", "Package chamber manifest path mismatch")
        path = ROOT / ref["manifest_path"]
        require(digest(path) == ref["sha256"], "Package chamber manifest hash mismatch")
        manifest = read(path)
        require(manifest["schema"] == "coop-native-manifest/v1" and manifest["chamber_id"] == chamber and manifest["reference_commit"] == REFERENCE_COMMIT and manifest["contract_sha256"] == digest(ROOT / chamber / "contract.json"), "Chamber manifest identity mismatch")
        manifest_files(ROOT / chamber,manifest)
        contract = read(ROOT / chamber / "contract.json")
        identity = read(ROOT / chamber / "build_or_identity/identity.json")
        require(manifest["reference_source_sha256"] == contract["reference_source_sha256"] and manifest["abi"] == contract["abi"] and manifest["coverage"] == contract["coverage"], "Manifest contract claims differ from retained contract")
        for key in ("compiler","linker","seed","builds"):
            require(manifest[key] == identity[key], "Manifest build claims differ from retained identity")
        require(manifest["native_source_sha256"] == identity["source_sha256"] and manifest["exact_commands"] == read(ROOT / chamber / "build_or_identity/commands.json"), "Manifest native source/command claims mismatch")
        require(manifest["native_verification"] == read(ROOT / chamber / "evidence/native-summary.json"), "Manifest native verification summary mismatch")
        summary = read(ROOT / chamber / "evidence/trace-summary.json")
        require(manifest["trace_provenance"] == {k:summary[k] for k in ("tools","trace_artifact","cfg_artifacts","selection","cfg_metrics")}, "Manifest trace provenance summary mismatch")
    ref = package["shared"]
    require(ref["manifest_path"] == "shared/manifest.json" and ref["sha256"] == digest(ROOT / "shared/manifest.json"), "Shared manifest identity/hash mismatch")
    shared = read(ROOT / "shared/manifest.json")
    require(shared["schema"] == "coop-native-shared-manifest/v1" and shared["reference_commit"] == REFERENCE_COMMIT, "Shared manifest schema/reference identity mismatch")
    manifest_files(ROOT / "shared",shared)
    return package


def negative_checks(chamber, contract, reference, cfg, image, build, trace):
    """Small in-memory corruption fixtures; never change retained artifacts."""
    case = next(c for c in reference["cases"] if c["id"] == trace["state_id"])
    def bad_event(t): t["semantic_events"][0]["value"] ^= 1
    def bad_instruction(t): t["semantic_events"][0]["instruction"]["bytes"] = "90"
    def wrong_occurrence(t): t["raw_occurrences"][0]["next_occurrence_id"] = None
    def wrong_register(t): t["steps"][0]["register_changes"]["rsp"][0] += 8
    results = []
    for mutate in (bad_event,bad_instruction,wrong_occurrence,wrong_register):
        changed = copy.deepcopy(trace)
        mutate(changed)
        try: trace_check(changed,case,contract,cfg,image,build)
        except ValueError as error: results.append({"case":mutate.__name__,"rejected":True,"reason":str(error)})
        else: raise ValueError("Portable verifier accepted deliberate trace corruption: "+mutate.__name__)
    # Inject only the loaded reference object, keeping all on-disk bytes intact.
    original_read = globals()["read"]
    target = (ROOT / chamber / "evidence/reference-vectors.json").resolve()
    if not target.exists(): target = target.with_suffix(".json.gz")
    altered = copy.deepcopy(reference)
    altered["cases"].pop(0)
    try:
        globals()["read"] = lambda path: altered if Path(path).resolve() == target else original_read(path)
        try: reference_check(chamber,contract)
        except ValueError as error: results.append({"case":"missing_exhaustive_case","rejected":True,"reason":str(error)})
        else: raise ValueError("Portable verifier accepted missing exhaustive reference case")
    finally: globals()["read"] = original_read
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("chambers", nargs="*", help="Optional chamber IDs; defaults to all five")
    args = parser.parse_args()
    require(len(set(args.chambers)) == len(args.chambers) and all(c in CHAMBERS for c in args.chambers), "Unknown or duplicate requested chamber")
    manifest_check()
    results = []
    negatives = []
    for chamber in args.chambers or CHAMBERS:
        contract = contract_check(chamber)
        reference = reference_check(chamber, contract)
        identity, builds, images = build_check(chamber,contract)
        native = native_check(chamber,contract,reference,builds)
        integration_check(chamber,contract)
        cfgs = {v:cfg_check(chamber,v,builds[v],images[v]) for v in builds}
        pack = trace_pack_check(chamber,contract,reference,cfgs["bcf"],images["bcf"],builds["bcf"])
        helper = runpy.run_path(str(ROOT / "shared/verify_proof.py"))
        proof = helper["check_proof"](ROOT / chamber,cfgs["bcf"],images["bcf"],pack["traces"],builds["bcf"])
        require(len(cfgs["bcf"]["instructions"]) > len(cfgs["clean"]["instructions"]) and len(cfgs["bcf"]["blocks"]) > len(cfgs["clean"]["blocks"]), "BCF did not demonstrably expand controller instructions and CFG")
        if not negatives: negatives = negative_checks(chamber,contract,reference,cfgs["bcf"],images["bcf"],builds["bcf"],pack["traces"][0])
        results.append({"chamber_id":chamber,"status":"PASS","inputs":len(contract["inputs"]),"outputs":len(contract["outputs"]),"exhaustive_cases":reference["coverage"].get("exhaustive_row_count",len(reference["cases"])),"reference_cases":len(reference["cases"]),"ordered_sequence_snapshots":native["ordered_sequence_frames"],"native_frames":2*(len(native["rows"])+native["ordered_sequence_frames"]),"retained_traces":len(pack["traces"]),"trace_coverage_exhaustive":pack["selection"]["exhaustive_cases"],"output_commits":sum(len(t["semantic_events"]) for t in pack["traces"]),"opaque_guards":proof["guard_count"],"proven_clones":proof["clone_count"],"binary_sha256":{v:b["binary_sha256"] for v,b in builds.items()}})
    report = {"schema":"coop-native-portable-verification/v1","status":"PASS","read_only":True,"reference_commit":REFERENCE_COMMIT,"manifest_sha256":digest(ROOT / "manifest.json"),"verifier_sha256":digest(Path(__file__)),"proof_verifier_sha256":digest(ROOT / "shared/verify_proof.py"),"chambers":results,"negative_checks":negatives,
        "checks":["Exact retained-file inventories and SHA-256 manifests","Authoritative game source hashes, native ABI and raw/resolved bindings","Unique exhaustive canonical input products and independent retained declarative AST evaluation","Actual server sequence snapshot chronology and projection references","Clean/BCF native stdout and every named expected output, including ordered invocation streams","PE export/.pdata boundaries, exact instruction bytes, block partitions and encoded CFG edges","Trace register/flag/memory chronology, actual linked helpers, raw occurrences and committed native output stores","Retained output-site/value coverage summaries","Exact BCF native guard patterns, analytical parity proof and clone/IR/incoming-transfer provenance","BCF instruction and CFG growth relative to clean baseline"],
        "limitations":["Read-only consistency audit: does not execute Windows PEs, re-run the game oracle, rebuild, emulate instructions, or invoke SMT.","Windows native execution remains the authority for observed native outputs; retained file checks alone cannot independently authenticate observation capture.","Trace executions are Unicorn runs of exact linked PE bytes and are separate from native Windows process observations.","Recorded object byte/relocation equivalence is hash-bound; disposable COFF objects are not required.","Temporal native controllers implement stateless projection only. Ordered server reducer observations do not mean the PE implements timer scheduling, persistence, occupancy arbitration or event acceptance.","Bogus-code proof is conditional on ordinary entry, intact code/flags, successful loads and normal calls; unobserved blocks alone are not proof.","No live campaign integration, authored geometry or physics change is certified by this package."]}
    print(json.dumps(report,indent=2))


if __name__ == "__main__":
    main()
