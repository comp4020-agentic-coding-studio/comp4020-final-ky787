"""Paths and identities for this independent, frozen BYPASS acquisition."""
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
COMMIT = 'a209122ba1e3b54c6d329a94c01276b9550c9189'
REQUEST_SHA = 'af24de094de2926bf47e4ea8d01536ff999f69b58030ff88993acb06792fb469'
LEVEL_SHA = '38fc3c7e1393caa034eb840f96bca9d1a79bae466d46db01b3a45b04144ec9cb'
COMPILER_SHA = '0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be'
INPUTS = ['anchorHold','link','bypassHold','override']
OUTPUTS = ['anchorPower','bridgePower','firewallActive','exitReady']


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
    spec=importlib.util.spec_from_file_location('bypass_helper_'+path.stem,path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def verify_reference():
    request=read(ROOT/'reference/request.json')
    require(sha(ROOT/'reference/request.json')==REQUEST_SHA,'Wrong BYPASS request')
    for path,digest in request['reference_source_sha256'].items():
        require(sha(ROOT/'reference'/path)==digest,'Frozen reference differs: '+path)
    require(request['canonical_document_sha256']==LEVEL_SHA,'Wrong level snapshot')
    require([f['name'] for f in request['inputs']]==INPUTS and [f['name'] for f in request['outputs']]==OUTPUTS,'Wrong four-field ABI order')
    require(request['outputs'][-1]['expression']=={'op':'const','value':True},'Exit is not constant true')
    for kind in ('inputs','outputs'):
        require([(f['offset'],f['width_bits'],f['domain']) for f in request[kind]]==[(i*4,32,[0,1]) for i in range(4)],'Wrong ABI layout/domain')
    for version in ('campaign','drafts'):
        document=read(ROOT/f'reference/levels/{version}/bypass.json')
        require(sha(ROOT/f'reference/levels/{version}/bypass.json')==LEVEL_SHA,'Released/draft mismatch')
        require('leftScan' not in json.dumps(document) and 'rightScan' not in json.dumps(document),'Obsolete scanners present')
        require(document['controller']['kind']=='declarative' and document['controller']['outputs']=={f['name']:f['expression'] for f in request['outputs']},'Document/controller request differs')
        keys=('id','output','target','property')
        compact=lambda rows:[{**{k:b[k] for k in keys},'invert':bool(b.get('invert'))} for b in rows]
        require(compact(document['bindings'])==compact(request['bindings']),'Binding target/inversion mismatch')
    return request
