"""Re-run actual TS references and all ten existing Windows PEs; never rebuild."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
IDS = ('handshake', 'crossfeed-vault', 'race-condition', 'deadlock', 'use-after-free')


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    files = [p for name in IDS for p in (ROOT/name).rglob('*') if p.is_file()
             and ('evidence' in p.parts or p.suffix == '.exe')]
    before = {p.relative_to(ROOT).as_posix(): sha(p) for p in files}
    checks = []
    for name in ('handshake','deadlock','use-after-free'):
        cmd = ['node', str(ROOT/'shared/reference_declarative.mjs'),name]
        run = subprocess.run(cmd,cwd=REPO,capture_output=True,text=True,encoding='utf-8')
        equivalent = run.returncode == 0 and json.loads(run.stdout) == json.loads((ROOT/name/'evidence/reference-vectors.json').read_bytes())
        checks.append({'command':cmd,'exit_code':run.returncode,'semantic_reference_match':equivalent,'stderr':run.stderr})
        assert equivalent, name+' reference changed'
    for name in ('crossfeed-vault','race-condition'):
        cmd = ['node', str(ROOT/'shared/reference_temporal.mjs'),name]
        run = subprocess.run(cmd,cwd=REPO,capture_output=True,text=True,encoding='utf-8')
        checks.append({'command':cmd,'exit_code':run.returncode,'stdout':run.stdout,'stderr':run.stderr})
        assert run.returncode == 0, run.stderr
    for name in IDS:
        cmd = [sys.executable,'-B',str(ROOT/'shared/validate_native.py'),name]
        run = subprocess.run(cmd,cwd=REPO,capture_output=True,text=True,encoding='utf-8')
        checks.append({'command':cmd,'exit_code':run.returncode,'stdout':run.stdout,'stderr':run.stderr})
        assert run.returncode == 0, name+' native failed'
    after = {p.relative_to(ROOT).as_posix(): sha(p) for p in files}
    changed = [p for p in before if before[p] != after[p]]
    result = {'schema':'coop-native-final-rerun/v1','status':'PASS' if not changed else 'FAIL',
              'method':'Fresh actual TypeScript reference evaluation and fresh native Windows execution of all ten unchanged PEs',
              'checks':checks,'retained_evidence_and_pe_files_checked':len(files),
              'all_evidence_and_binary_bytes_unchanged':not changed,'changed_files':changed}
    (ROOT/'final-native-rerun.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'status':result['status'],'checks':len(checks),'unchanged_artifacts':len(files),'changed':changed}))
    assert not changed


if __name__ == '__main__':
    main()
