"""Extract exact finalized Git blobs without copying a mutable game checkout.

Derived from bypass-v1/scripts/pin-reference.py; provenance is retained below.
"""
from pathlib import Path
from datetime import datetime, timezone
import json
import sys
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *

require(not (ROOT/'reference').exists(),'Reference already frozen; do not overwrite')
require(git('rev-parse','HEAD').decode().strip()==COMMIT,'Capture baseline at the requested source revision')
tracked=git('ls-files','-z').decode().split('\0')
save(ROOT/'evidence/preservation-baseline.json',{'schema':'handshake-v2-preservation/v1','base_commit':COMMIT,
    'working_file_sha256':{p:sha(REPO/p) for p in tracked if p and not p.startswith(ROOT.relative_to(REPO).as_posix()+'/')}})
raw=git('show',COMMIT+':docs/native-requests/handshake-v2.json')
require(hashlib.sha256(raw).hexdigest()==REQUEST_SHA,'Requested source commit/request not available')
request=json.loads(raw)
paths=list(request['reference_source_sha256'])+['src/engine/constants.ts','src/slice/tuning.ts','docs/chambers/handshake-v2.md']
records={}
for path in paths:
    data=git('show',COMMIT+':'+path); dest=ROOT/'reference'/path
    if path in request['reference_source_sha256']:
        require(hashlib.sha256(data).hexdigest()==request['reference_source_sha256'][path],'Git source hash mismatch: '+path)
    dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(data)
    records[path]={'sha256':sha(dest),'git_blob':git('rev-parse',COMMIT+':'+path).decode().strip()}
(ROOT/'reference/request.json').write_bytes(raw)
verify_reference()
contract={**request,'reference_commit':COMMIT,'request_sha256':REQUEST_SHA,
    'integration_status':'acquisition_only_no_live_integration'}
save(ROOT/'contract.json',contract)
handoff=Path(r'E:\Workspace\binary_binja_redesign\handoffs\2026-11-06T071647Z-handshake-v2-firewall-linux.md')
require(COMMIT in handoff.read_text(encoding='utf-8') and REQUEST_SHA in handoff.read_text(encoding='utf-8'),'Shared handoff pin mismatch')
reuse={}
for name in ('common.py','pin-reference.py','reference.mjs'):
    source=REPO/'experiments/coop-controller-studies/bypass-v1/scripts'/name
    reuse[name]={'source_path':source.relative_to(REPO).as_posix(),'source_sha256':sha(source),'adapted_sha256':sha(ROOT/'scripts'/name)}
save(ROOT/'reference/identity.json',{'schema':'handshake-v2-reference-snapshot/v1','reference_commit':COMMIT,
    'request_path':'docs/native-requests/handshake-v2.json','request_sha256':REQUEST_SHA,
    'canonical_document_path':'levels/drafts/handshake-v2.json','canonical_document_sha256':LEVEL_SHA,'files':records,
    'method':'git show exact commit:path bytes; isolated source snapshot; never imports moving checkout files',
    'runtime_import_closure':['src/workbench/evaluate.ts','src/workbench/model.ts','src/engine/constants.ts','src/slice/tuning.ts'],
    'foundation_tool_reuse':reuse,
    'foundation_adaptation':'Version/source pins, five-field ABI, direct/NOT controller assertions, finalized draft-only reference, 32 exhaustive vectors and no invented ordered state-machine tests.',
    'shared_handoff':{'path':str(handoff),'sha256':sha(handoff)},'captured_utc':datetime.now(timezone.utc).isoformat()})
print(json.dumps({'status':'PASS','source_commit':COMMIT,'request_sha256':REQUEST_SHA,'level_sha256':LEVEL_SHA,'isolated_source_files':len(paths)}))
