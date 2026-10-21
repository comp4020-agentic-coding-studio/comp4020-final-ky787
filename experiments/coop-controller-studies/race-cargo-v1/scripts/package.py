"""Seal the new study only, after its producers and documentation are complete."""
from pathlib import Path
import json
import sys

sys.dont_write_bytecode = True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *


def main():
    baseline = read(STUDY/'evidence/preservation-baseline.json')
    require(all(sha(REPO/p) == value for p,value in baseline['tracked_file_sha256'].items()), 'Pre-study tracked file changed; do not reseal it')
    reference = read(STUDY/'evidence/current-reference.json')
    prefixes = ('experiments/coop-controllers/race-condition/', 'experiments/coop-controllers/shared/')
    paths = {p for p in baseline['tracked_file_sha256'] if p.startswith(prefixes)}
    paths.update(['experiments/coop-controllers/README.md','experiments/coop-controllers/manifest.json'])
    paths.update(reference['current_source_sha256'])
    files = {p.relative_to(STUDY).as_posix():sha(p) for p in sorted(STUDY.rglob('*'))
        if p.is_file() and not {'_scratch','__pycache__'} & set(p.parts)
        and p.name not in ('manifest.json','verification-report.json') and p.suffix != '.pyc'}
    prefix = 'experiments/coop-controller-studies/race-cargo-v1/scripts/'
    commands = {
        'windows_production_from_repo_root': [
            'node '+prefix+'reference.mjs',
            "& 'C:\\Users\\royga\\anaconda3\\python.exe' -B "+prefix+'trace-cargo.py',
            "& 'C:\\Users\\royga\\anaconda3\\python.exe' -B "+prefix+'curate.py',
            "& 'C:\\Users\\royga\\anaconda3\\python.exe' -B "+prefix+'package.py'],
        'read_only_verification_from_repo_root': [
            'python3 -I -B '+prefix+'verify-study.py',
            'node '+prefix+'reference.mjs --check'],
        'windows_isolated_verification_used': "& 'C:\\Users\\royga\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe' -I -B "+prefix+'verify-study.py --preservation',
    }
    write(STUDY/'manifest.json',{
        'schema':'race-cargo-study-manifest/v1','study':'race-cargo-v1','date':'2026-10-22',
        'analyzed_revision':REVISION,'specimen_sha256':HASHES,
        'historical_reference_commit':reference['historical_reference_commit'],
        'historical_reference_source_sha256':reference['historical_source_sha256'],
        'current_reference_source_sha256':reference['current_source_sha256'],
        'tools':{**read(STUDY/'evidence/targeted-traces.json.gz')['tools'],'node':reference['node'],
            'portable_audit':'Python 3.11+ standard library; no Capstone/Unicorn/Windows required'},
        'reused_file_sha256':{p:sha(REPO/p) for p in sorted(paths)},'files':files,
        'inventory_excludes':['manifest.json (self)','verification-report.json (recomputed audit receipt)','_scratch/','__pycache__/','*.pyc'],
        'commands':commands,
        'scope':['Only RACE cargo decisions; no binary compilation, game/frontend change, controller-table or world-assembly change.',
            'Unicorn executes exact retained PE instructions; real Windows PE stdout is separately recorded.',
            'Original 4096 output rows support value independence. Checked local CFG predicates plus guard proof support local branch selection. Neither establishes the whole-function path for other input backgrounds.',
            'Scenario snapshots use actual current server reducers and independent mockRaceProjection, with post-authorization contact/reset fixtures. They do not simulate physics or authorize actions.',
            'Seven selected traces are referenced in place. Ten missing exact cases were acquired in this study. All original evidence remains immutable.',
            'verify-study.py checks retained evidence only. reference.mjs --check independently replays current source functions without writes.',
            'The manifest is an integrity index, not a cryptographic signature or replacement for checking bytes and semantics.']})
    print(json.dumps({'status':'PASS','study_files':len(files),'reused_files':len(paths),'pre_study_files_unchanged':len(baseline['tracked_file_sha256'])}))


if __name__ == '__main__':
    main()
