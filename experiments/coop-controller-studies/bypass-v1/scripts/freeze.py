"""Acquisition-time manifest writer; not part of the read-only verification path."""
from pathlib import Path
import sys
sys.dont_write_bytecode = True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, REPO, SHARED, COMMIT, REQUEST_SHA, LEVEL_SHA, read, save, sha
from verify_portable import inventory

if __name__ == '__main__':
    contract=read(ROOT/'contract.json'); identity=read(ROOT/'build_or_identity/identity.json')
    summary=read(ROOT/'evidence/trace-summary.json'); reuse=read(ROOT/'scripts/reuse-map.json')
    external=[REPO/r['source'] for r in reuse['tools'].values()]+[SHARED/'verify_portable.py']
    external += [p for p in (SHARED/'ollvm_source').rglob('*') if p.is_file()]
    manifest={'schema':'coop-native-manifest/v1','chamber_id':'bypass','reference_commit':COMMIT,'request_sha256':REQUEST_SHA,
        'canonical_document_sha256':LEVEL_SHA,'contract_sha256':sha(ROOT/'contract.json'),
        'reference_source_sha256':contract['reference_source_sha256'],'native_source_sha256':identity['source_sha256'],
        'compiler':identity['compiler'],'linker':identity['linker'],'seed':identity['seed'],'builds':identity['builds'],
        'exact_commands':{'path':'build_or_identity/commands.json','sha256':sha(ROOT/'build_or_identity/commands.json')},
        'abi':contract['abi'],'input_output_mapping':{'inputs':contract['inputs'],'outputs':contract['outputs'],'bindings':contract['bindings']},
        'coverage':{'exhaustive_vectors':16,'ordered_snapshots_per_variant':9,'native_evaluations':50,'emulator_traces':16},
        'constant_outputs':{'exitReady':1},'native_verification':{'path':'evidence/native-results.json.gz','sha256':sha(ROOT/'evidence/native-results.json.gz')},
        'trace_provenance':{k:summary[k] for k in ('tools','trace_artifact','cfg_artifacts','selection','cfg_metrics')},
        'integration_status':'proposal_only_no_live_integration',
        'external_read_only_files':{p.relative_to(REPO).as_posix():sha(p) for p in sorted(set(external))},
        'inventory_policy':'Every package file except manifest.json itself, _build/, _scratch/, __pycache__/ and .pyc; exact bytes preserved by package .gitattributes.',
        'known_limits':['Stateless decision layer only; game owns commitments, timers, occupancy, latches and arrivals.',
            'Portable audit verifies retained observations; it does not rerun Windows PEs or the TypeScript evaluator.',
            'Only canonical 0/1 inputs and valid distinct buffers are covered; no arbitrary-pointer claim.',
            'Linux OS execution of the verifier is a delivery follow-up; isolated standard-library Windows execution is retained in the handoff.',
            'Crumble lifecycle remains authored gameplay; no connection to proven bogus clones is implied.'],
        'files':inventory()}
    save(ROOT/'manifest.json',manifest)
    print('Manifest SHA-256: '+sha(ROOT/'manifest.json'))
