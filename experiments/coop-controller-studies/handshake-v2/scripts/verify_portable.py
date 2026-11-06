"""Standard-library, read-only HANDSHAKE v2 retained-evidence audit.

Uses the unchanged original acquisition verifier with narrowly scoped paths.
No Git, Node, compiler, PE execution, emulator, SMT solver or writes are required.
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

CHAMBER = 'handshake-v2'
ADAPTATION_PREFIX = '# HANDSHAKE-v2-scoped adaptation; see scripts/reuse-map.json for exact provenance.\n'


def inventory():
    return {p.relative_to(ROOT).as_posix(): sha(p) for p in ROOT.rglob('*') if p.is_file()
        and not {'_build', '_scratch', '__pycache__'} & set(p.relative_to(ROOT).parts)
        and p.suffix != '.pyc' and p != ROOT/'manifest.json'}


def package_local(base, relative):
    target = (base/relative).resolve()
    require(target.is_relative_to(ROOT), 'Portable helper attempted an out-of-package path')
    return target


class PackageRoots:
    def __truediv__(self, name):
        path = PurePosixPath(name)
        require(path.parts and path.parts[0] in (CHAMBER, 'shared'), 'Unexpected legacy chamber path')
        base = ROOT if path.parts[0] == CHAMBER else ROOT/'scripts'
        return package_local(base, Path(*path.parts[1:]))


def check_provenance(manifest):
    require(manifest['schema'] == 'coop-native-manifest/v1' and manifest['chamber_id'] == CHAMBER
        and manifest['reference_commit'] == COMMIT, 'Wrong package identity')
    require(manifest['request_sha256'] == REQUEST_SHA and manifest['canonical_document_sha256'] == LEVEL_SHA, 'Wrong request/draft pin')
    require(manifest['files'] == inventory(), 'Package inventory or exact file bytes changed')
    for relative, digest in manifest['external_read_only_files'].items():
        path = (REPO/relative).resolve()
        allowed = path.is_relative_to(SHARED) or path.is_relative_to(REPO/'experiments/coop-controller-studies/bypass-v1/scripts')
        require(allowed and sha(path) == digest, 'Original read-only helper/source changed: '+relative)
    reuse = read(ROOT/'scripts/reuse-map.json')
    require(reuse['schema'] == 'handshake-v2-tool-reuse/v1', 'Wrong adaptation provenance')
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
        require((ROOT/'scripts'/name).read_bytes() == (ADAPTATION_PREFIX+text).encode()
            and sha(ROOT/'scripts'/name) == record['adapted_sha256'], 'Undocumented pipeline adaptation: '+name)
    identity = read(ROOT/'reference/identity.json')
    require(identity['reference_commit'] == COMMIT and identity['request_sha256'] == REQUEST_SHA
        and identity['canonical_document_sha256'] == LEVEL_SHA, 'Wrong reference snapshot identity')
    require(set(identity['foundation_tool_reuse']) == {'common.py','pin-reference.py','reference.mjs'}, 'Missing foundation tool provenance')
    for name, record in identity['foundation_tool_reuse'].items():
        original = (REPO/record['source_path']).resolve()
        require(original == REPO/'experiments/coop-controller-studies/bypass-v1/scripts'/name
            and sha(original) == record['source_sha256'] == manifest['external_read_only_files'][record['source_path']]
            and sha(ROOT/'scripts'/name) == record['adapted_sha256'], 'Foundation adaptation or original BYPASS source changed')
    for relative, record in identity['files'].items():
        path = package_local(ROOT/'reference', relative); data = path.read_bytes()
        require(sha(path) == record['sha256'] and hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            == record['git_blob'], 'Frozen Git blob bytes differ')


def check_reference(auditor, contract, reference):
    request = verify_reference()
    expected = {**request, 'reference_commit': COMMIT, 'request_sha256': REQUEST_SHA,
        'integration_status': 'acquisition_only_no_live_integration'}
    require(contract == expected, 'Acquisition contract changed the pinned request')
    require(reference['coverage'] == {'kind':'exhaustive_boolean', 'input_count':5, 'case_count':32}, 'Domain is not exactly 32 Boolean cases')
    require([row['id'] for row in reference['cases']] == list(range(32)) and reference['sequences'] == [], 'Wrong case order or invented sequence')
    require('constant_outputs' not in reference and 'constant_outputs' not in contract, 'Unexpected constant output')
    definitions = {f['name']:f['expression'] for f in contract['outputs']}
    for field, output in zip(contract['inputs'], contract['outputs']):
        expression = {'op':'ref', 'id':field['game_port']}
        if output['name'] == 'firewallActive': expression = {'op':'not', 'arg':expression}
        require(output['expression'] == expression, 'Output adds a hidden dependency or inversion: '+output['name'])
    for row in reference['cases']:
        require(row['inputs'] == {name:(row['id'] >> bit) & 1 for bit,name in enumerate(INPUTS)}, 'Wrong least-significant-bit case encoding')
        values = {f['game_port']:row['inputs'][f['name']] for f in contract['inputs']}
        outputs = {name:int(auditor.declarative_value(definitions[name],values,definitions)) for name in OUTPUTS}
        require(row['expected_outputs'] == outputs, 'Actual TS result contradicts finalized draft AST')
        for name, input_name in zip(OUTPUTS, INPUTS):
            expected_value = row['inputs'][input_name] ^ int(name == 'firewallActive')
            require(outputs[name] == expected_value, 'Output differs from its sole input: '+name)
        bindings = {b['id']:int(bool(outputs[b['output']]) != bool(b['invert'])) for b in contract['bindings']}
        require(all(b['invert'] is False for b in contract['bindings']), 'Binding inverted an already evaluated expression')
        require(row['resolved_bindings'] == bindings and row['exit_unlock_requested'] == bindings['exitPower'], 'Binding/raw unlock mismatch')
    require([reference['cases'][16]['expected_outputs'][name] for name in OUTPUTS] == [0,0,0,1,1], 'Payload-only case acquired a hidden maintenance gate')
    # Pair every case with every one-bit neighbor: only the matching output may change.
    cases = reference['cases']
    for row in cases:
        for bit, affected in enumerate(OUTPUTS):
            neighbor = cases[row['id'] ^ (1 << bit)]
            changed = [name for name in OUTPUTS if row['expected_outputs'][name] != neighbor['expected_outputs'][name]]
            require(changed == [affected], 'An output has an extra dependency or ignores its input')


def check_capture(identity, native, reference):
    probe = read(ROOT/'build_or_identity/toolchain-probe.json')
    require(probe['sha256'] == COMPILER_SHA and all(p['exit_code'] == 0 for p in probe['observations']), 'Compiler probe failed')
    version, capabilities = probe['observations']
    require('clang version 16.0.6' in version['output'] and hashlib.sha256(version['output'].encode()).hexdigest()
        == version['full_output_sha256'], 'Wrong compiler version capture')
    require(all(flag in capabilities['output'] for flag in ('--bcf ', '--bcf_prob=', '--bcf_loop=', '--aesSeed=')), 'Missing compiler capability')
    commands = read(ROOT/'build_or_identity/commands.json')
    require(len(commands) == 12 and all(c['exit_code'] == 0 for c in commands), 'Build command failure or missing command')
    frontends = [c for c in commands if '-emit-llvm' in c['argv']]
    lowers = [c for c in commands if '-disable-llvm-passes' in c['argv']]
    require(len(frontends) == len(lowers) == 2 and all('-O0' in c['argv'] for c in frontends+lowers), 'Frontend frozen more than once or wrong lowering')
    for frontend, lower in zip(frontends, lowers):
        require(frontend['argv'][frontend['argv'].index('-o')+1] in lower['argv'], 'Lowering did not consume the frozen IR')
    require(identity['runtime']['environment_setup_exit_code'] == 0 and set(identity['runtime']['libraries'])
        == {'libcmt.lib','oldnames.lib','legacy_stdio_definitions.lib','libvcruntime.lib','libucrt.lib','kernel32.lib'}, 'Runtime tool/library capture missing')
    for record in identity['runtime']['libraries'].values():
        require(record['path'] and re.fullmatch('[0-9a-f]{64}',record['sha256']), 'Invalid runtime library identity')
    capture = read(ROOT/'evidence/reference-process.json')
    require(capture['exit_code'] == 0 and capture['stderr'] == '' and capture['stdout_sha256'] == sha(ROOT/'evidence/reference-vectors.json')
        and capture['generator_sha256'] == sha(ROOT/'scripts/reference.mjs'), 'Actual TypeScript evaluator capture differs')
    stdin = ''.join(' '.join(str(c['inputs'][n]) for n in INPUTS)+'\n' for c in reference['cases'])
    for process in native['processes'].values():
        require(process['execution_environment'] == 'windows-host' and process['input_stream'] == stdin, 'Native host/input stream differs')
    harness = (ROOT/'src/harness.c').read_text(); call = harness.index('bn_evaluate(&in,&out);')
    require(all(harness.index(f'out.{name} = UINT32_C(0xA5A5A5A5);') < call for name in OUTPUTS), 'Missing pre-call poisoned output field')


def check_output_evidence(catalogue, pack, summary):
    require(catalogue['schema'] == 'handshake-v2-fragments/v1', 'Wrong fragment version')
    require('constant_output' not in catalogue and 'constant_outputs' not in catalogue, 'Wrong constant-output claim')
    require([s['output'] for s in catalogue['sections']] == OUTPUTS, 'Fragment output sections differ from ABI')
    for section, name, input_name in zip(catalogue['sections'], OUTPUTS, INPUTS):
        require(section['required_accepted_inputs'] == [input_name] and 'constant' not in section, 'Fragment has extra/missing input dependency')
        require(set(section['store_alternatives']) == {'0','1'}, 'Missing genuine zero/one alternative')
        require(summary['output_value_coverage'][name] == [0,1], 'Output not observed at both Boolean values')
        selected = [f for f in catalogue['fragments'] if f['output'] == name and f.get('verified_output_store')]
        require({f['id'] for f in selected} == set(section['store_alternatives'].values()), 'Alternative does not reference a genuine output fragment')
        for value, fid in section['store_alternatives'].items():
            fragment = next(f for f in selected if f['id'] == fid); site = fragment['verified_output_store']
            require(site in summary['output_store_sites'] and site['observed_values'] == [int(value)]
                and site['case_ids'], 'Fabricated output store or observed value')
    for trace in pack['traces']:
        for name, input_name in zip(OUTPUTS, INPUTS):
            events = [e for e in trace['semantic_events'] if e['output'] == name]
            require(len(events) == 1 and events[0]['value'] == trace['inputs'][input_name] ^ int(name == 'firewallActive'), 'Native commit violates sole input dependency')


def check_receipts():
    historical = read(ROOT/'evidence/historical-package-verification.json')
    require(historical['schema'] == 'handshake-v2-historical-preservation/v1' and historical['exit_code'] == 0
        and historical['stderr'] == '' and historical['report']['status'] == 'PASS'
        and json.loads(historical['stdout']) == historical['report'], 'Historical audit receipt failed')
    require(historical['historical_reference_commit'] == '1315c3616ce5ac939baf913f9b09b4ebad34132a'
        and historical['historical_acquisition_commit'] == '7e510dbdad54ac2b09ff0021a1067561738d5fa2'
        and len(historical['report']['chambers']) == 5 and all(c['status'] == 'PASS' for c in historical['report']['chambers']), 'Historical source isolation/chambers differ')
    area = REPO/'experiments/coop-controllers'
    require(historical['historical_manifest_sha256'] == sha(area/'manifest.json')
        and historical['verifier_sha256'] == sha(area/'shared/verify_portable.py'), 'Historical package identity changed')
    bypass = historical['bypass_verification']
    require(bypass['exit_code'] == 0 and bypass['stderr'] == '' and bypass['report']['status'] == 'PASS'
        and json.loads(bypass['stdout']) == bypass['report'], 'Unchanged BYPASS audit failed')
    require(bypass['manifest_sha256'] == sha(REPO/'experiments/coop-controller-studies/bypass-v1/manifest.json')
        and bypass['verifier_sha256'] == sha(REPO/'experiments/coop-controller-studies/bypass-v1/scripts/verify_portable.py'), 'BYPASS identity changed')
    acquisition = read(ROOT/'evidence/acquisition-checks.json')
    baseline = read(ROOT/'evidence/preservation-baseline.json')
    require(acquisition['schema'] == 'handshake-v2-acquisition-checks/v1' and acquisition['status'] == 'PASS'
        and acquisition['changed_files'] == [] and acquisition['baseline_commit'] == baseline['base_commit']
        and acquisition['pre_existing_files_unchanged'] == len(baseline['working_file_sha256']), 'Checkout preservation receipt failed')
    capture = acquisition['fresh_ts_evaluator']
    require(capture['exit_code'] == 0 and capture['stderr'] == '' and capture['byte_equal_to_retained_capture']
        and capture['stdout_sha256'] == sha(ROOT/'evidence/reference-vectors.json'), 'Fresh acquisition oracle receipt differs')


def coverage(reference, native, pack):
    return {'exhaustive_vectors':len(reference['cases']), 'ordered_snapshots_per_variant':native['ordered_sequence_frames'],
        'native_evaluations':sum(p['input_vectors'] for p in native['processes'].values()), 'emulator_traces':len(pack['traces'])}


def check_manifest(manifest, contract, identity, reference, native, pack, summary):
    require(manifest['contract_sha256'] == sha(ROOT/'contract.json') and manifest['reference_source_sha256'] == contract['reference_source_sha256']
        and manifest['native_source_sha256'] == identity['source_sha256'] and manifest['abi'] == contract['abi'], 'Manifest source/ABI summary differs')
    for key in ('compiler','linker','seed','builds'): require(manifest[key] == identity[key], 'Manifest build summary differs: '+key)
    require(manifest['coverage'] == coverage(reference,native,pack) and 'constant_outputs' not in manifest, 'Manifest coverage or output claim differs')
    require(manifest['input_output_mapping'] == {key:contract[key] for key in ('inputs','outputs','bindings')}, 'Manifest mapping differs')
    for key, path in (('exact_commands','build_or_identity/commands.json'), ('native_verification','evidence/native-results.json.gz')):
        require(manifest[key] == {'path':path, 'sha256':sha(ROOT/path)}, 'Manifest artifact summary differs')
    require(manifest['trace_provenance'] == {k:summary[k] for k in ('tools','trace_artifact','cfg_artifacts','selection','cfg_metrics')}
        and manifest['integration_status'] == 'proposal_only_no_live_integration', 'Manifest trace/scope summary differs')


def main():
    manifest = read(ROOT/'manifest.json'); check_provenance(manifest)
    auditor = load(SHARED/'verify_portable.py')
    auditor.ROOT = PackageRoots(); auditor.REPO = ROOT/'reference'; auditor.REFERENCE_COMMIT = COMMIT; auditor.local = package_local
    contract = auditor.contract_check(CHAMBER)
    reference = auditor.reference_check(CHAMBER,contract); check_reference(auditor,contract,reference)
    identity, builds, images = auditor.build_check(CHAMBER,contract)
    native = auditor.native_check(CHAMBER,contract,reference,builds); check_capture(identity,native,reference)
    auditor.integration_check(CHAMBER,contract)
    cfgs = {v:auditor.cfg_check(CHAMBER,v,builds[v],images[v]) for v in builds}
    pack = auditor.trace_pack_check(CHAMBER,contract,reference,cfgs['bcf'],images['bcf'],builds['bcf'])
    require(pack['selection']['exhaustive_cases'] and pack['selection']['case_ids'] == list(range(32)), 'Missing exhaustive BCF traces')
    proof = load(ROOT/'scripts/verify_proof.py').check_proof(ROOT,cfgs['bcf'],images['bcf'],pack['traces'],builds['bcf'])
    catalogue = read(ROOT/'fragments.json'); summary = read(ROOT/'evidence/trace-summary.json')
    check_output_evidence(catalogue,pack,summary)
    expected_curations = load(ROOT/'scripts/curate.py').derive()
    for path, expected in expected_curations.items(): require(read(ROOT/path) == expected, 'Curation contradicts native bytes/trace context: '+path)
    check_receipts(); check_manifest(manifest,contract,identity,reference,native,pack,summary)
    negatives = auditor.negative_checks(CHAMBER,contract,reference,cfgs['bcf'],images['bcf'],builds['bcf'],pack['traces'][0])
    for label in ('missing_firewall_inversion','hidden_exit_maintenance_gate','double_binding_inversion'):
        changed = copy.deepcopy(reference)
        if label == 'missing_firewall_inversion': changed['cases'][0]['expected_outputs']['firewallActive'] = 0
        elif label == 'hidden_exit_maintenance_gate': changed['cases'][16]['expected_outputs']['exitReady'] = 0
        else: changed['cases'][0]['resolved_bindings']['payloadFirewallPower'] = 0
        try: check_reference(auditor,contract,changed)
        except ValueError as error: negatives.append({'case':label, 'rejected':True, 'reason':str(error)})
        else: raise ValueError('Accepted forged HANDSHAKE v2 semantics: '+label)
    print(json.dumps({'schema':'handshake-v2-portable-verification/v1', 'status':'PASS', 'read_only':True, 'reference_commit':COMMIT,
        'manifest_sha256':sha(ROOT/'manifest.json'), 'verifier_sha256':sha(__file__), 'inventory_files':len(manifest['files']),
        **coverage(reference,native,pack), 'output_commits':sum(len(t['semantic_events']) for t in pack['traces']),
        'store_sites':len(summary['output_store_sites']), 'fragments':len(catalogue['fragments']),
        'opaque_guards':proof['guard_count'], 'proven_clones':proof['clone_count'],
        'sole_input_dependencies':dict(zip(OUTPUTS,INPUTS)), 'inverted_outputs':['firewallActive'],
        'historical_five_chamber_receipt':'PASS', 'unchanged_bypass_receipt':'PASS', 'negative_checks':negatives,
        'limits':['Retained-evidence audit only: no fresh PE, Node, compiler, emulator, Git or SMT execution.',
            'Hashes establish consistency, not independent authentication of native capture or toolchain supply chain.',
            'Original COFF objects are disposable; their byte/relocation comparison report is retained and hash-bound.',
            'Proof assumes normal ABI entry, intact code/flags, successful loads and valid distinct buffers; non-observation is not proof.',
            'No campaign registration, physics, occupancy authorization, commitment reducer, arrival count or persistence is certified.']},indent=2))


if __name__ == '__main__': main()
