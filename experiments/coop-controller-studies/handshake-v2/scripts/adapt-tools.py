"""Create narrowly scoped copies once; retain each exact upstream identity and patch.

No original acquisition script is edited. Algorithms are unchanged: adaptation
only scopes paths, supplies HANDSHAKE-v2 identity, records input streams and libraries.
"""
from pathlib import Path
import sys
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *

specs={
 'build.py':[
  ("ap=argparse.ArgumentParser();ap.add_argument('chamber');args=ap.parse_args()", "ap=argparse.ArgumentParser();ap.add_argument('chamber',nargs='?',default='handshake-v2',choices=['handshake-v2']);args=ap.parse_args()"),
  ("root=AREA/args.chamber; contract=", "from common import verify_reference\n    verify_reference()\n    root=AREA; contract="),
  ("assert root.parent==AREA and contract['chamber_id']==args.chamber", "assert root==Path(__file__).resolve().parents[1] and contract['chamber_id']=='handshake-v2'"),
  ("for name in ['libcmt.lib','oldnames.lib','legacy_stdio_definitions.lib']:", "for name in ['libcmt.lib','oldnames.lib','legacy_stdio_definitions.lib','libvcruntime.lib','libucrt.lib','kernel32.lib']:"),
  ("runtime=dict(environment=", "runtime=dict(environment_setup_exit_code=vs.returncode,environment_setup_stderr=vs.stderr,environment="),
 ],
 'validate_native.py':[
  ("ap=argparse.ArgumentParser();ap.add_argument('chamber');args=ap.parse_args()", "ap=argparse.ArgumentParser();ap.add_argument('chamber',nargs='?',default='handshake-v2',choices=['handshake-v2']);ap.add_argument('--environment',choices=['sandbox','windows-host'],required=True);args=ap.parse_args()"),
  ("root=AREA/args.chamber;ev=", "root=AREA;ev="),
  ("f'native-{variant}-stdout.jsonl.gz'", "f'native-{variant}-{args.environment}-stdout.jsonl.gz'"),
  ("status.update(binary_sha256=sha(exe)", "status.update(execution_environment=args.environment,input_stream=stdin,binary_sha256=sha(exe)"),
  ("if not report['all_valid']:raise SystemExit('Native failures retained; build not accepted.')", "if not report['all_valid']:\n        save(ev/f'native-failed-{args.environment}.json',report)\n        raise SystemExit('Native failures retained; build not accepted.')"),
 ],
 'analyze.py':[
  ("assert ROOT.parent==area and ROOT.name in ('handshake','deadlock','use-after-free','crossfeed-vault','race-condition'), 'Only a new co-op controller experiment may be written'", "assert ROOT==Path(__file__).resolve().parents[1], 'Only this independent HANDSHAKE-v2 package may be written'"),
 ],
 'prove_bogus.py':[
  ("require(ROOT.parent==area and ROOT.name in ('handshake','deadlock','use-after-free','crossfeed-vault','race-condition'),'Only new co-op experiments allowed')", "require(ROOT==Path(__file__).resolve().parents[1],'Only this independent HANDSHAKE-v2 package allowed')"),
  ("ROOT.parent / 'shared' / 'ollvm_source' / 'manifest.json'", "ROOT.parents[1] / 'coop-controllers/shared/ollvm_source/manifest.json'"),
  ("'../shared/ollvm_source/", "'../../coop-controllers/shared/ollvm_source/"),
 ],
 'verify_proof.py':[
  ("root.parent/'shared/ollvm_source'", "root.parents[1]/'coop-controllers/shared/ollvm_source'"),
  ("root.parent / 'shared/ollvm_source/manifest.json'", "root.parents[1] / 'coop-controllers/shared/ollvm_source/manifest.json'"),
  ("'../shared/ollvm_source/'", "'../../coop-controllers/shared/ollvm_source/'"),
 ],
}
records={}
for name,replacements in specs.items():
    source=SHARED/name; target=ROOT/'scripts'/name
    require(not target.exists(),'Adapted tool already exists: '+name)
    text=source.read_text()
    applied=[]
    for old,new in replacements:
        count=text.count(old); require(count>0,'Upstream patch context changed: '+name)
        text=text.replace(old,new); applied.append({'old':old,'new':new,'matches':count})
    target.write_text('# HANDSHAKE-v2-scoped adaptation; see scripts/reuse-map.json for exact provenance.\n'+text,encoding='utf-8',newline='\n')
    records[name]={'source':source.relative_to(REPO).as_posix(),'source_sha256':sha(source),'adapted_sha256':sha(target),'replacements':applied}
save(ROOT/'scripts/reuse-map.json',{'schema':'handshake-v2-tool-reuse/v1','adaptation_generator_sha256':sha(__file__),'tools':records,
    'read_only_portable_helper':{'path':(SHARED/'verify_portable.py').relative_to(REPO).as_posix(),'sha256':sha(SHARED/'verify_portable.py')}})
print(json.dumps({'status':'PASS','scoped_tool_copies':len(records),'originals_modified':False}))
