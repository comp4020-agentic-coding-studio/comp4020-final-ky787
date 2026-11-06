"""Standard-library read-only audit. No Git, Node, native execution or writes.

Uses the unchanged historical verifier as a library with a narrow per-chamber
path/reference mapping, plus revised BYPASS/constant-output and curation checks.
"""
from pathlib import Path, PurePosixPath
import copy
import hashlib
import json
import re
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, REPO, SHARED, COMMIT, REQUEST_SHA, LEVEL_SHA, COMPILER_SHA, INPUTS, OUTPUTS, require, read, sha, load, verify_reference


def inventory():
    return {p.relative_to(ROOT).as_posix(): sha(p) for p in ROOT.rglob('*') if p.is_file()
        and not {'_build','_scratch','__pycache__'} & set(p.relative_to(ROOT).parts)
        and p.suffix != '.pyc' and p != ROOT/'manifest.json'}


def package_local(base, relative):
    target = (base/relative).resolve()
    require(target.is_relative_to(ROOT), 'Portable helper attempted an out-of-package path')
    return target


class PackageRoots:
    def __truediv__(self, name):
        path = PurePosixPath(name)
        require(path.parts[0] in ('bypass','shared'), 'Unexpected legacy chamber path')
        base = ROOT if path.parts[0] == 'bypass' else ROOT/'scripts'
        return package_local(base, Path(*path.parts[1:]))


def check_provenance(manifest):
    require(manifest['schema'] == 'coop-native-manifest/v1' and manifest['chamber_id'] == 'bypass' and manifest['reference_commit'] == COMMIT, 'Wrong package identity')
    require(manifest['files'] == inventory(), 'Package inventory or exact file bytes changed')
    for relative, digest in manifest['external_read_only_files'].items():
        path = (REPO/relative).resolve()
        require(path.is_relative_to(SHARED) and sha(path) == digest, 'Original read-only helper/source changed: '+relative)
    reuse = read(ROOT/'scripts/reuse-map.json')
    require(sha(ROOT/'scripts/adapt-tools.py') == reuse['adaptation_generator_sha256'], 'Adaptation generator changed')
    helper = reuse['read_only_portable_helper']
    require(sha(REPO/helper['path']) == helper['sha256'] == manifest['external_read_only_files'][helper['path']], 'Historical verifier identity changed')
    for name, record in reuse['tools'].items():
        path = REPO/record['source']
        require(sha(path) == record['source_sha256'], 'Adapted tool source changed')
        text = path.read_text()
        for change in record['replacements']:
            require(text.count(change['old']) == change['matches'], 'Adaptation patch context differs')
            text = text.replace(change['old'], change['new'])
        expected = ('# BYPASS-scoped adaptation; see scripts/reuse-map.json for exact provenance.\n'+text).encode()
        require((ROOT/'scripts'/name).read_bytes() == expected and sha(ROOT/'scripts'/name) == record['adapted_sha256'], 'Undocumented pipeline adaptation: '+name)
    identity = read(ROOT/'reference/identity.json')
    require(identity['reference_commit'] == COMMIT and identity['request_sha256'] == REQUEST_SHA and identity['canonical_document_sha256'] == LEVEL_SHA, 'Wrong reference snapshot identity')
    for relative, record in identity['files'].items():
        path = package_local(ROOT/'reference', relative); data = path.read_bytes()
        require(sha(path) == record['sha256'] and hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() == record['git_blob'], 'Frozen Git blob bytes differ')
    return reuse


def check_bypass_reference(auditor, contract, reference):
    request = verify_reference()
    expected = {**request, 'reference_commit': COMMIT, 'request_sha256': REQUEST_SHA,
        'integration_status': 'acquisition_only_no_live_integration', 'constant_outputs': {'exitReady': 1}}
    require(contract == expected, 'Acquisition contract changed the pinned request')
    require(reference['coverage'] == {'kind':'exhaustive_boolean','input_count':4,'case_count':16}, 'BYPASS domain is not exactly 16 cases')
    require([row['id'] for row in reference['cases']] == list(range(16)), 'Wrong case ID order')
    definitions = {f['name']: f['expression'] for f in contract['outputs']}
    for row in reference['cases']:
        require(row['inputs'] == {name:(row['id'] >> bit) & 1 for bit,name in enumerate(INPUTS)}, 'Wrong least-significant-bit case encoding')
        values = {f['game_port']:row['inputs'][f['name']] for f in contract['inputs']}
        outputs = {name:int(auditor.declarative_value(definitions[name],values,definitions)) for name in OUTPUTS}
        require(row['expected_outputs'] == outputs and outputs['exitReady'] == 1, 'Actual TS result contradicts released AST or constant exit')
        bindings = {b['id']:int(bool(outputs[b['output']]) != bool(b['invert'])) for b in contract['bindings']}
        require(row['resolved_bindings'] == bindings and row['exit_unlock_requested'] == bindings['exitFeed'] == 1, 'Binding inversion or exit unlock mismatch')
    require(reference['constant_outputs'] == {'exitReady':1} and len(reference['sequences']) == 1, 'Wrong constant/sequence declaration')
    sequence = reference['sequences'][0]
    require(sequence['case_ids'] == [0,1,3,2,6,2,6,14,10], 'Ordered hold/commit/release snapshots changed')
    for step, case_id in zip(sequence['steps'], sequence['case_ids']):
        require(step['case_id'] == case_id and {k:step[k] for k in reference['cases'][case_id]} == reference['cases'][case_id], 'Sequence snapshot differs from evaluator')
    require(len(sequence['steps']) == 9, 'Missing ordered snapshot')


def check_constant(catalogue, pack):
    section = next(s for s in catalogue['sections'] if s['output'] == 'exitReady')
    require(section == {'output':'exitReady','condition_fragment_ids':[], 'store_alternatives':{'1':'exitReady.write-1'}, 'required_accepted_inputs':[], 'constant':1}, 'Invented conditional or zero exit alternative')
    selected = [f for f in catalogue['fragments'] if f['output'] == 'exitReady']
    require(len(selected) == 1 and selected[0]['id'] == 'exitReady.write-1' and not selected[0]['input_fields'], 'Invented exit fragment')
    store = selected[0]['verified_output_store']
    require(store['instruction_rva'] == 0x154f and store['byte_offset'] == 12 and store['observed_values'] == [1] and store['case_ids'] == list(range(16)), 'Wrong constant-one store')
    require(catalogue['constant_output']['zero_alternative'] is None and catalogue['constant_output']['input_requirements'] == [] and catalogue['constant_output']['value'] == 1, 'False constant-output invariant')
    for trace in pack['traces']:
        events = [e for e in trace['semantic_events'] if e['output'] == 'exitReady']
        require(len(events) == 1 and events[0]['value'] == 1 and events[0]['instruction_rva'] == 0x154f and trace['final_outputs']['exitReady'] == 1, 'Constant output was not overwritten exactly once')


def check_capture(identity, native):
    probe = read(ROOT/'build_or_identity/toolchain-probe.json')
    require(probe['sha256'] == COMPILER_SHA and all(p['exit_code'] == 0 for p in probe['observations']), 'Compiler probe failed')
    version, capabilities = probe['observations']
    require('clang version 16.0.6' in version['output'] and hashlib.sha256(version['output'].encode()).hexdigest() == version['full_output_sha256'], 'Wrong compiler version capture')
    require(all(flag in capabilities['output'] for flag in ('--bcf ', '--bcf_prob=', '--bcf_loop=', '--aesSeed=')), 'Missing compiler capability')
    commands = read(ROOT/'build_or_identity/commands.json')
    require(len(commands) == 12 and all(c['exit_code'] == 0 for c in commands), 'Build command failure or missing command')
    frontends = [c for c in commands if '-emit-llvm' in c['argv']]
    lowers = [c for c in commands if '-disable-llvm-passes' in c['argv']]
    require(len(frontends) == len(lowers) == 2 and all('-O0' in c['argv'] for c in frontends+lowers), 'Frontend frozen more than once or wrong lowering')
    for frontend, lower in zip(frontends, lowers):
        ir_path = frontend['argv'][frontend['argv'].index('-o')+1]
        require(ir_path in lower['argv'], 'Lowering did not consume the frozen IR')
    require(identity['runtime']['environment_setup_exit_code'] == 0 and set(identity['runtime']['libraries']) == {'libcmt.lib','oldnames.lib','legacy_stdio_definitions.lib','libvcruntime.lib','libucrt.lib','kernel32.lib'}, 'Runtime tool/library capture missing')
    for record in identity['runtime']['libraries'].values(): require(record['path'] and re.fullmatch('[0-9a-f]{64}',record['sha256']), 'Invalid runtime library identity')
    reference = read(ROOT/'evidence/reference-vectors.json')
    capture = read(ROOT/'evidence/reference-process.json')
    require(capture['exit_code'] == 0 and capture['stderr'] == '' and capture['stdout_sha256'] == sha(ROOT/'evidence/reference-vectors.json') and capture['generator_sha256'] == sha(ROOT/'scripts/reference.mjs'), 'Actual TypeScript evaluator capture differs')
    ordered = reference['cases']+[reference['cases'][i] for i in reference['sequences'][0]['case_ids']]
    stdin = ''.join(' '.join(str(c['inputs'][n]) for n in INPUTS)+'\n' for c in ordered)
    for process in native['processes'].values():
        require(process['execution_environment'] == 'windows-host' and process['input_stream'] == stdin, 'Native host/input stream differs')
    harness = (ROOT/'src/harness.c').read_text()
    call = harness.index('bn_evaluate(&in,&out);')
    require(all(harness.index(f'out.{name} = UINT32_C(0xA5A5A5A5);') < call for name in OUTPUTS), 'Missing pre-call poisoned output field')


def main():
    manifest = read(ROOT/'manifest.json'); check_provenance(manifest)
    auditor = load(SHARED/'verify_portable.py')
    auditor.ROOT = PackageRoots(); auditor.REPO = ROOT/'reference'; auditor.REFERENCE_COMMIT = COMMIT; auditor.local = package_local
    contract = auditor.contract_check('bypass')
    reference = auditor.reference_check('bypass', contract); check_bypass_reference(auditor, contract, reference)
    identity, builds, images = auditor.build_check('bypass', contract)
    native = auditor.native_check('bypass', contract, reference, builds); check_capture(identity,native)
    auditor.integration_check('bypass', contract)
    cfgs = {v:auditor.cfg_check('bypass',v,builds[v],images[v]) for v in builds}
    pack = auditor.trace_pack_check('bypass',contract,reference,cfgs['bcf'],images['bcf'],builds['bcf'])
    require(pack['selection']['exhaustive_cases'] and pack['selection']['case_ids'] == list(range(16)), 'Missing exhaustive BCF traces')
    proof = load(ROOT/'scripts/verify_proof.py').check_proof(ROOT,cfgs['bcf'],images['bcf'],pack['traces'],builds['bcf'])
    catalogue = read(ROOT/'fragments.json'); check_constant(catalogue,pack)
    expected_curations = load(ROOT/'scripts/curate.py').derive()
    for path, expected in expected_curations.items(): require(read(ROOT/path) == expected, 'Curation contradicts native bytes/trace context: '+path)
    require(len(catalogue['fragments']) == 17 and proof['guard_count'] == 24 and proof['clone_count'] == 12, 'Unexpected curation/proof inventory')
    historical = read(ROOT/'evidence/historical-package-verification.json')
    require(historical['exit_code'] == 0 and historical['stderr'] == '' and historical['report']['status'] == 'PASS' and json.loads(historical['stdout']) == historical['report'], 'Historical audit receipt failed')
    require(historical['historical_reference_commit'] == '1315c3616ce5ac939baf913f9b09b4ebad34132a' and len(historical['report']['chambers']) == 5 and all(c['status'] == 'PASS' for c in historical['report']['chambers']), 'Historical source isolation/chambers differ')
    negatives = auditor.negative_checks('bypass',contract,reference,cfgs['bcf'],images['bcf'],builds['bcf'],pack['traces'][0])
    for name in ('fabricated_exit_zero_alternative','fabricated_exit_input_requirement'):
        changed = copy.deepcopy(catalogue); section = next(s for s in changed['sections'] if s['output'] == 'exitReady')
        if name.endswith('alternative'): section['store_alternatives']['0'] = 'bogus-clone'
        else: section['required_accepted_inputs'] = ['leftScan']
        try: check_constant(changed, pack)
        except ValueError as error: negatives.append({'case':name,'rejected':True,'reason':str(error)})
        else: raise ValueError('Accepted invented exit evidence')
    require(manifest['contract_sha256'] == sha(ROOT/'contract.json') and manifest['builds'] == identity['builds'] and manifest['constant_outputs'] == {'exitReady':1}, 'Manifest summary differs')
    print(json.dumps({'schema':'bypass-portable-verification/v1','status':'PASS','read_only':True,'reference_commit':COMMIT,
        'manifest_sha256':sha(ROOT/'manifest.json'), 'verifier_sha256':sha(__file__), 'inventory_files':len(manifest['files']),
        'native_evaluations':50, 'exhaustive_vectors':16, 'ordered_snapshots_per_variant':9, 'emulator_traces':len(pack['traces']),
        'output_commits':sum(len(t['semantic_events']) for t in pack['traces']), 'store_sites':7,'fragments':len(catalogue['fragments']),
        'opaque_guards':proof['guard_count'],'proven_clones':proof['clone_count'],'constant_outputs':{'exitReady':1},
        'historical_five_chamber_receipt':'PASS','negative_checks':negatives,
        'limits':['Retained-evidence audit only: no fresh PE, Node, compiler, emulator, Git or SMT execution.',
            'Hashes establish consistency, not independent authentication of native capture or toolchain supply chain.',
            'Original COFF objects are disposable; their byte/relocation comparison report is retained and hash-bound.',
            'Proof requires normal ABI entry, intact code/flags, successful loads and valid distinct buffers; non-observation is not proof.',
            'No live registration, physics, timing, occupancy authorization, commitment reducer, arrival count or persistence is certified.']},indent=2))


if __name__ == '__main__': main()
