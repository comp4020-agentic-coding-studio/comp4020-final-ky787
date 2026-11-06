"""Acquire fresh preservation receipts without rewriting historical packages.

Git is used only to stage exact old package/source blobs in this package's
ignored scratch. Both original five-controller and BYPASS verifiers run unchanged.
This preparation script is separate from the portable read-only audit.
"""
from pathlib import Path
import hashlib
import io
import json
import platform
import subprocess
import sys
import tarfile
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, REPO, git, read, save, require, sha

ACQUISITION = '7e510dbdad54ac2b09ff0021a1067561738d5fa2'
REFERENCE = '1315c3616ce5ac939baf913f9b09b4ebad34132a'
AREA = 'experiments/coop-controllers'


def run_audit(script, cwd):
    command = [sys.executable, '-I', '-B', str(script)]
    process = subprocess.run(command, cwd=cwd, capture_output=True, text=True)
    report = json.loads(process.stdout) if process.returncode == 0 else None
    return {'argv':command, 'cwd':str(cwd), 'exit_code':process.returncode,
        'stderr':process.stderr, 'stdout':process.stdout, 'report':report}


def main():
    scratch = ROOT/'_scratch/historical-reference'
    require(not scratch.exists(), 'Historical scratch already exists; preserve and inspect before another run')
    scratch.mkdir(parents=True)
    archive = git('archive', ACQUISITION, AREA); files = {}; sources = {}
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:') as tar:
        for member in tar:
            target = (scratch/member.name).resolve()
            require(target.is_relative_to(scratch.resolve()) and (member.isdir() or member.isfile()), 'Unsafe Git archive member')
            if member.isdir(): target.mkdir(parents=True, exist_ok=True); continue
            data = tar.extractfile(member).read(); digest = hashlib.sha256(data).hexdigest()
            require(sha(REPO/member.name) == digest, 'Historical evidence changed in current checkout: '+member.name)
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data); files[member.name] = digest
    for chamber in ('handshake','deadlock','use-after-free','crossfeed-vault','race-condition'):
        contract = read(scratch/AREA/chamber/'contract.json')
        require(contract['reference_commit'] == REFERENCE, 'Historical reference differs')
        for path, digest in contract['reference_source_sha256'].items():
            data = git('show', REFERENCE+':'+path)
            require(hashlib.sha256(data).hexdigest() == digest, 'Historical reference blob mismatch')
            target = scratch/path
            require(target.resolve().is_relative_to(scratch.resolve()), 'Unsafe historical source path')
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data); sources[path] = digest
    historical = run_audit(scratch/AREA/'shared/verify_portable.py', scratch)
    bypass_root = REPO/'experiments/coop-controller-studies/bypass-v1'
    bypass = run_audit(bypass_root/'scripts/verify_portable.py', REPO)
    bypass.update(manifest_sha256=sha(bypass_root/'manifest.json'), verifier_sha256=sha(bypass_root/'scripts/verify_portable.py'))
    for path, digest in files.items(): require(sha(REPO/path) == digest, 'Original evidence modified during audit')
    receipt = {'schema':'handshake-v2-historical-preservation/v1', 'historical_acquisition_commit':ACQUISITION,
        'historical_reference_commit':REFERENCE, 'historical_manifest_sha256':sha(REPO/AREA/'manifest.json'),
        'verifier_sha256':sha(REPO/AREA/'shared/verify_portable.py'), 'unchanged_files':len(files),
        'reference_files':sources, 'environment':{'os':platform.platform(), 'python':sys.version},
        **historical, 'bypass_verification':bypass,
        'scope':'Exact unmodified five-controller package bytes audited against historical Git source blobs in isolated scratch; unchanged BYPASS audited in place with its frozen source. No original evidence or current game source was rewritten.'}
    save(ROOT/'evidence/historical-package-verification.json',receipt)
    require(historical['exit_code'] == 0 and historical['report']['status'] == 'PASS', 'Historical verifier failed; receipt retained')
    require(bypass['exit_code'] == 0 and bypass['report']['status'] == 'PASS', 'BYPASS verifier failed; receipt retained')
    print(json.dumps({'status':'PASS', 'historical_chambers':len(historical['report']['chambers']),
        'unchanged_historical_files':len(files), 'historical_reference_files':len(sources), 'unchanged_bypass':'PASS'}))


if __name__ == '__main__': main()
