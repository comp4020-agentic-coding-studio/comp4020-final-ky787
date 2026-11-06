"""Extract only exact reference Git blobs, without a mutable full game checkout."""
from pathlib import Path
from datetime import datetime, timezone
import json
import sys
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *

require(not (ROOT/'reference').exists(),'Reference already frozen; do not overwrite')
raw=git('show',COMMIT+':docs/native-requests/bypass.json')
require(hashlib.sha256(raw).hexdigest()==REQUEST_SHA,'Requested source commit/request not available')
request=json.loads(raw)
paths=list(request['reference_source_sha256'])+['src/engine/constants.ts','src/slice/tuning.ts','docs/native-requests/bypass.md']
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
    'integration_status':'acquisition_only_no_live_integration','constant_outputs':{'exitReady':1}}
save(ROOT/'contract.json',contract)
handoff=Path(r'E:\Workspace\binary_binja_redesign\handoffs\2026-11-06T053513Z-bypass-native-request-linux.md')
require(COMMIT in handoff.read_text() and REQUEST_SHA in handoff.read_text(),'Shared handoff pin mismatch')
save(ROOT/'reference/identity.json',{'schema':'bypass-reference-snapshot/v1','reference_commit':COMMIT,
    'request_path':'docs/native-requests/bypass.json','request_sha256':REQUEST_SHA,
    'canonical_document_sha256':LEVEL_SHA,'files':records,
    'method':'git show exact commit:path bytes; isolated source snapshot; never imports moving checkout files',
    'runtime_import_closure':['src/workbench/evaluate.ts','src/workbench/model.ts','src/engine/constants.ts','src/slice/tuning.ts'],
    'shared_handoff':{'path':str(handoff),'sha256':sha(handoff)},'captured_utc':datetime.now(timezone.utc).isoformat()})
tracked=git('ls-files','-z').decode().split('\0')
save(ROOT/'evidence/preservation-baseline.json',{'schema':'bypass-preservation/v1','base_commit':git('rev-parse','HEAD').decode().strip(),
    'working_file_sha256':{p:sha(REPO/p) for p in tracked if p and not p.startswith(ROOT.relative_to(REPO).as_posix()+'/')}})
print(json.dumps({'status':'PASS','source_commit':COMMIT,'request_sha256':REQUEST_SHA,'level_sha256':LEVEL_SHA,'isolated_source_files':len(paths)}))
