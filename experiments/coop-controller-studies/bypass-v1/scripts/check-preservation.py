"""Acquisition-time check of the unchanged checkout and exact Git/TS reference.

Requires Git and Node. Writes a receipt only inside this new package. A future
moving checkout need not match this historical preservation baseline; use the
portable verifier for ordinary retained-evidence checks.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import platform
import subprocess
import sys
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import ROOT, REPO, COMMIT, REQUEST_SHA, require, read, sha, save, git

if __name__ == '__main__':
    baseline=read(ROOT/'evidence/preservation-baseline.json')
    changed=[p for p,digest in baseline['working_file_sha256'].items() if sha(REPO/p) != digest]
    require(not changed,'Pre-existing checkout files changed: '+str(changed))
    snapshot=read(ROOT/'reference/identity.json')
    for path in snapshot['files']:
        require(git('show',COMMIT+':'+path)==(ROOT/'reference'/path).read_bytes(),'Snapshot differs from exact pinned Git blob: '+path)
    require(hashlib.sha256(git('show',COMMIT+':docs/native-requests/bypass.json')).hexdigest()==REQUEST_SHA,'Pinned request Git blob mismatch')
    command=['node',str(ROOT/'scripts/reference.mjs')]
    process=subprocess.run(command,capture_output=True,cwd=REPO)
    require(process.returncode==0 and process.stderr==b'' and process.stdout==(ROOT/'evidence/reference-vectors.json').read_bytes(),'Fresh pinned TypeScript output differs')
    receipt={'schema':'bypass-acquisition-checks/v1','status':'PASS','checked_utc':datetime.now(timezone.utc).isoformat(),
        'platform':platform.platform(),'baseline_commit':baseline['base_commit'],'pre_existing_files_unchanged':len(baseline['working_file_sha256']),
        'changed_files':changed,'snapshot_git_blobs_rechecked':len(snapshot['files'])+1,
        'fresh_ts_evaluator':{'argv':command,'exit_code':process.returncode,'stderr':process.stderr.decode(),
            'stdout_sha256':hashlib.sha256(process.stdout).hexdigest(),'byte_equal_to_retained_capture':True},
        'native_failures':[],'compiler_failures':[],
        'verifier_development_corrections':[{'failure':'Missing poisoned-output harness','cause':'Initial checker expected a u-suffixed literal; existing harness correctly used UINT32_C(0xA5A5A5A5).',
            'fix':'Check each actual UINT32_C assignment before the call; no specimen or observed result changed.'}],
        'scope':'Preservation receipt before delivery; current game/frontend/runtime assets and historical evidence remained unchanged.'}
    save(ROOT/'evidence/acquisition-checks.json',receipt)
    print(json.dumps({k:receipt[k] for k in ('status','pre_existing_files_unchanged','snapshot_git_blobs_rechecked')}))
