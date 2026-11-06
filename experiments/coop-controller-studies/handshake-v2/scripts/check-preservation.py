"""Acquisition-only checkout preservation and exact pinned Git/TS recheck.

Requires Git and Node; writes a receipt only inside this new package. A later
checkout need not match the acquisition baseline. Ordinary portable verification
does not invoke this script or execute TypeScript/native programs.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import platform
import subprocess
import sys
sys.dont_write_bytecode = True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, REPO, COMMIT, REQUEST_SHA, require, read, sha, save, git

if __name__ == '__main__':
    baseline = read(ROOT/'evidence/preservation-baseline.json')
    changed = [p for p,digest in baseline['working_file_sha256'].items() if not (REPO/p).is_file() or sha(REPO/p) != digest]
    require(not changed, 'Pre-existing checkout files changed: '+str(changed))
    snapshot = read(ROOT/'reference/identity.json')
    for path in snapshot['files']:
        require(git('show', COMMIT+':'+path) == (ROOT/'reference'/path).read_bytes(), 'Snapshot differs from exact pinned Git blob: '+path)
    require(hashlib.sha256(git('show',COMMIT+':docs/native-requests/handshake-v2.json')).hexdigest() == REQUEST_SHA, 'Pinned request Git blob mismatch')
    command = ['node',str(ROOT/'scripts/reference.mjs')]
    process = subprocess.run(command,capture_output=True,cwd=REPO)
    require(process.returncode == 0 and process.stderr == b'' and process.stdout == (ROOT/'evidence/reference-vectors.json').read_bytes(), 'Fresh pinned TypeScript output differs')
    commands = read(ROOT/'build_or_identity/commands.json'); native = read(ROOT/'evidence/native-results.json.gz')
    receipt = {'schema':'handshake-v2-acquisition-checks/v1', 'status':'PASS', 'checked_utc':datetime.now(timezone.utc).isoformat(),
        'platform':platform.platform(), 'baseline_commit':baseline['base_commit'], 'pre_existing_files_unchanged':len(baseline['working_file_sha256']),
        'changed_files':changed, 'snapshot_git_blobs_rechecked':len(snapshot['files'])+1,
        'fresh_ts_evaluator':{'argv':command, 'exit_code':process.returncode, 'stderr':process.stderr.decode(),
            'stdout_sha256':hashlib.sha256(process.stdout).hexdigest(), 'byte_equal_to_retained_capture':True},
        'retained_build_failures':[c for c in commands if c['exit_code'] != 0], 'retained_native_failed_case_ids':native['failed_case_ids'],
        'scope':'Preservation receipt before delivery; all pre-existing tracked working files, released/frontend/runtime assets and historical evidence remained unchanged. Checks are against captured working-file hashes, not a claim that current CRLF files equal canonical Git blob bytes.'}
    save(ROOT/'evidence/acquisition-checks.json',receipt)
    print(json.dumps({k:receipt[k] for k in ('status','pre_existing_files_unchanged','snapshot_git_blobs_rechecked')}))
