"""Acquisition-time manifest writer; never called by the read-only verifier."""
from pathlib import Path
import sys
sys.dont_write_bytecode = True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, REPO, SHARED, COMMIT, REQUEST_SHA, LEVEL_SHA, read, save, sha
from verify_portable import inventory, coverage

if __name__ == '__main__':
    contract = read(ROOT/'contract.json'); identity = read(ROOT/'build_or_identity/identity.json')
    summary = read(ROOT/'evidence/trace-summary.json'); reuse = read(ROOT/'scripts/reuse-map.json')
    reference = read(ROOT/'evidence/reference-vectors.json'); native = read(ROOT/'evidence/native-results.json.gz')
    pack = read(ROOT/'evidence/representative-traces.json.gz')
    external = [REPO/r['source'] for r in reuse['tools'].values()]+[SHARED/'verify_portable.py']
    external += [p for p in (SHARED/'ollvm_source').rglob('*') if p.is_file()]
    external += [REPO/r['source_path'] for r in read(ROOT/'reference/identity.json')['foundation_tool_reuse'].values()]
    manifest = {'schema':'coop-native-manifest/v1', 'chamber_id':'handshake-v2', 'reference_commit':COMMIT, 'request_sha256':REQUEST_SHA,
        'canonical_document_sha256':LEVEL_SHA, 'contract_sha256':sha(ROOT/'contract.json'),
        'reference_source_sha256':contract['reference_source_sha256'], 'native_source_sha256':identity['source_sha256'],
        'compiler':identity['compiler'], 'linker':identity['linker'], 'seed':identity['seed'], 'builds':identity['builds'],
        'exact_commands':{'path':'build_or_identity/commands.json', 'sha256':sha(ROOT/'build_or_identity/commands.json')},
        'abi':contract['abi'], 'input_output_mapping':{key:contract[key] for key in ('inputs','outputs','bindings')},
        'coverage':coverage(reference,native,pack),
        'native_verification':{'path':'evidence/native-results.json.gz', 'sha256':sha(ROOT/'evidence/native-results.json.gz')},
        'trace_provenance':{k:summary[k] for k in ('tools','trace_artifact','cfg_artifacts','selection','cfg_metrics')},
        'integration_status':'proposal_only_no_live_integration',
        'external_read_only_files':{p.relative_to(REPO).as_posix():sha(p) for p in sorted(set(external))},
        'inventory_policy':'Every package file except manifest.json itself, _build/, _scratch/, __pycache__/ and .pyc; exact bytes preserved by package .gitattributes.',
        'known_limits':['Stateless decision layer only; the game owns occupancy, latches, commitments, arrivals and movement.',
            'Portable audit verifies retained observations; it does not rerun Windows PEs or the TypeScript evaluator.',
            'Only canonical 0/1 inputs and valid distinct buffers are covered; no arbitrary-pointer claim.',
            'Linux OS execution is a delivery follow-up; acquisition verification ran with isolated standard-library Python on Windows.',
            'Original HANDSHAKE remains frozen; campaign adoption requires a separate integration task.'],
        'files':inventory()}
    save(ROOT/'manifest.json',manifest)
    print('Manifest SHA-256: '+sha(ROOT/'manifest.json'))
