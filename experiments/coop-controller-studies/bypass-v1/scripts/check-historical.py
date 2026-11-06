"""Recheck unchanged five-chamber evidence against its historical source, in scratch.

This preparation tool requires Git and writes only this package's ignored scratch
and a new receipt. It is separate from the portable, read-only BYPASS verifier.
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


def main():
    scratch = ROOT/'_scratch/historical-reference'
    require(not scratch.exists(), 'Historical scratch already exists; preserve it and inspect before another run')
    scratch.mkdir(parents=True)
    archive = git('archive', ACQUISITION, AREA)
    files = {}; sources = {}
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:') as tar:
        for member in tar:
            target = (scratch/member.name).resolve()
            require(target.is_relative_to(scratch.resolve()) and (member.isdir() or member.isfile()), 'Unsafe Git archive member')
            if member.isdir(): target.mkdir(parents=True, exist_ok=True); continue
            data = tar.extractfile(member).read(); digest = hashlib.sha256(data).hexdigest()
            require(sha(REPO/member.name) == digest, 'Historical evidence changed in current checkout: '+member.name)
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
            files[member.name] = digest
    for chamber in ('handshake','deadlock','use-after-free','crossfeed-vault','race-condition'):
        contract = read(scratch/AREA/chamber/'contract.json')
        require(contract['reference_commit'] == REFERENCE, 'Historical reference differs')
        for path, digest in contract['reference_source_sha256'].items():
            data = git('show', REFERENCE+':'+path)
            require(hashlib.sha256(data).hexdigest() == digest, 'Historical reference blob mismatch')
            target = scratch/path
            require(target.resolve().is_relative_to(scratch.resolve()), 'Unsafe historical source path')
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data); sources[path] = digest
    command = [sys.executable, '-I', '-B', str(scratch/AREA/'shared/verify_portable.py')]
    process = subprocess.run(command, cwd=scratch, capture_output=True, text=True)
    for path, digest in files.items(): require(sha(REPO/path) == digest, 'Original evidence modified during audit')
    report = json.loads(process.stdout) if process.returncode == 0 else None
    receipt = {'schema': 'bypass-historical-preservation/v1', 'historical_acquisition_commit': ACQUISITION,
        'historical_reference_commit': REFERENCE, 'historical_manifest_sha256': sha(REPO/AREA/'manifest.json'),
        'verifier_sha256': sha(REPO/AREA/'shared/verify_portable.py'), 'unchanged_files': len(files),
        'reference_files': sources, 'environment': {'os': platform.platform(), 'python': sys.version},
        'argv': command, 'cwd': str(scratch), 'exit_code': process.returncode, 'stderr': process.stderr,
        'stdout': process.stdout, 'report': report,
        'scope': 'Exact unmodified historical package bytes, audited against exact historical Git reference blobs in isolated scratch; no original evidence or current game source was rewritten.'}
    save(ROOT/'evidence/historical-package-verification.json', receipt)
    require(process.returncode == 0 and report['status'] == 'PASS', 'Historical verifier failed; receipt retained')
    print(json.dumps({'status': 'PASS', 'historical_chambers': len(report['chambers']), 'unchanged_files': len(files), 'reference_files': len(sources)}))


if __name__ == '__main__': main()
