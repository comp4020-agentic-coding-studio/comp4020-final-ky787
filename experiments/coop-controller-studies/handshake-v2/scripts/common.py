"""Paths and identities for this independent, frozen HANDSHAKE v2 acquisition.

Derived from bypass-v1/scripts/common.py; provenance is in reference/identity.json.
"""
from pathlib import Path
import gzip
import hashlib
import importlib.util
import json
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
SHARED = REPO/'experiments/coop-controllers/shared'
CHAMBER = 'handshake-v2'
COMMIT = '2532b50e729463f67d2afef700b1830ca6cb7753'
REQUEST_SHA = '5faa53318e3f6f4c19431a9be54657fdec139de18119c1b94838af5ac4bc9d36'
LEVEL_SHA = '47575e0f0765b177a038c63e8696e0e3ad90da4e7c41b417c6d25f2b1118d341'
COMPILER_SHA = '0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be'
INPUTS = ['crossing','liftPlate','link','maintenance','exitSocket']
OUTPUTS = ['crossingPower','liftPower','relayPower','firewallActive','exitReady']


def require(ok, message):
    if not ok: raise ValueError(message)


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    path=Path(path); data=path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix=='.gz' else data)


def save(path, value):
    path=Path(path)
    require(path.resolve().is_relative_to(ROOT),'Writer outside new package')
    path.parent.mkdir(parents=True,exist_ok=True)
    data=(json.dumps(value,indent=2)+'\n').encode()
    path.write_bytes(gzip.compress(data,mtime=0) if path.suffix=='.gz' else data)


def git(*args):
    return subprocess.run(['git','-c','safe.directory='+REPO.as_posix(),*args],cwd=REPO,capture_output=True,check=True).stdout


def load(path):
    path=Path(path)
    spec=importlib.util.spec_from_file_location('handshake_v2_helper_'+path.stem,path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def verify_reference():
    request=read(ROOT/'reference/request.json')
    require(sha(ROOT/'reference/request.json')==REQUEST_SHA,'Wrong HANDSHAKE v2 request')
    require(request['chamber_id']==CHAMBER,'Wrong chamber version')
    for path,digest in request['reference_source_sha256'].items():
        require(sha(ROOT/'reference'/path)==digest,'Frozen reference differs: '+path)
    require(request['canonical_document_sha256']==LEVEL_SHA,'Wrong finalized draft snapshot')
    require([f['name'] for f in request['inputs']]==INPUTS and [f['name'] for f in request['outputs']]==OUTPUTS,'Wrong five-field ABI order')
    require([f['game_port'] for f in request['inputs']]==['crossing.occupied','liftPlate.occupied','link.value','maintenance.value','exitSocket.occupied'],'Wrong device ports')
    for kind in ('inputs','outputs'):
        require([(f['offset'],f['width_bits'],f['domain']) for f in request[kind]]==[(i*4,32,[0,1]) for i in range(5)],'Wrong ABI layout/domain')
    abi=request['abi']
    require(abi['input_size']==20 and abi['output_size']==20 and abi['alignment']==4 and abi['endianness']=='little' and abi['stateful'] is False,'Wrong ABI sizes/state')
    require(abi['input_register']=='RCX' and abi['output_register']=='RDX' and abi['calling_convention']=='Microsoft x64','Wrong pointer ABI')
    expressions={f['name']:f['expression'] for f in request['outputs']}
    expected={name:{'op':'ref','id':f['game_port']} for name,f in zip(OUTPUTS,request['inputs'])}
    expected['firewallActive']={'op':'not','arg':{'op':'ref','id':'maintenance.value'}}
    require(expressions==expected,'Wrong finalized controller expressions')
    document=read(ROOT/'reference/levels/drafts/handshake-v2.json')
    require(sha(ROOT/'reference/levels/drafts/handshake-v2.json')==LEVEL_SHA,'Finalized draft mismatch')
    require(document['controller']['kind']=='declarative' and document['controller']['outputs']==expressions,'Document/controller request differs')
    keys=('id','output','target','property')
    compact=lambda rows:[{**{k:b[k] for k in keys},'invert':bool(b.get('invert'))} for b in rows]
    require(compact(document['bindings'])==compact(request['bindings']),'Binding target/inversion mismatch')
    require(all(not b['invert'] for b in request['bindings']),'Binding inversion must not apply NOT twice')
    require(request['coverage']['row_count']==32 and request['coverage']['input_count']==5,'Incomplete requested Boolean domain')
    require(request['exit_semantics']['latch'] is True and request['exit_semantics']['required_arrivals']==2,'Game-owned exit semantics changed')
    return request
