"""Fresh compiler identity/capability probe; no native build or oracle substitution."""
from pathlib import Path
import hashlib
import platform
import subprocess
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, COMPILER_SHA, verify_reference, require, sha, save

if __name__ == '__main__':
    verify_reference()
    compiler=Path(r'D:\VM_Shared_Folder\software\ollvm\original_ollvm\clang.exe')
    require(sha(compiler)==COMPILER_SHA,'Wrong OLLVM compiler executable')
    records=[]
    for name,args in [('version',['--version']),('capabilities',['-mllvm','--help-hidden','-x','c','-fsyntax-only','NUL'])]:
        process=subprocess.run([str(compiler),*args],capture_output=True,text=True,timeout=30)
        output=process.stdout+process.stderr
        records.append({'name':name,'argv':[str(compiler),*args],'exit_code':process.returncode,
            'full_output_sha256':hashlib.sha256(output.encode()).hexdigest(),
            'output':output if name=='version' else '\n'.join(line for line in output.splitlines() if any(flag in line for flag in ('--bcf ','--bcf_loop','--bcf_prob','--aesSeed')))})
    save(ROOT/'build_or_identity/toolchain-probe.json',{'schema':'handshake-v2-toolchain-probe/v1','compiler':str(compiler),'sha256':sha(compiler),'observations':records,'python':platform.python_version()})
    require(all(r['exit_code']==0 for r in records),'Compiler probe failure retained')
    require('clang version 16.0.6' in records[0]['output'],'Wrong compiler version')
    require(all(flag in records[1]['output'] for flag in ('--bcf ','--bcf_loop','--bcf_prob','--aesSeed')),'Required flags unavailable')
    print('PASS: exact OLLVM Clang 16.0.6 executable and accepted BCF flags.')
