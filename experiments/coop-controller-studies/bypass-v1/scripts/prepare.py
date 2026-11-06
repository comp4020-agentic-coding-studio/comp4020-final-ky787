"""Verify compiler capabilities and execute the independent frozen TS reference."""
from pathlib import Path
import subprocess
import sys
import platform
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *

request=verify_reference()
clang=Path(r'D:\VM_Shared_Folder\software\ollvm\original_ollvm\clang.exe')
require(sha(clang)==COMPILER_SHA,'Compiler executable mismatch')
records=[]
for name,args in [('version',['--version']),('capabilities',['-mllvm','--help-hidden','-x','c','-fsyntax-only','NUL'])]:
    p=subprocess.run([str(clang),*args],capture_output=True,text=True,timeout=30)
    output=p.stdout+p.stderr
    records.append({'name':name,'argv':[str(clang),*args],'exit_code':p.returncode,
        'full_output_sha256':hashlib.sha256(output.encode()).hexdigest(),
        'output':output if name=='version' else '\n'.join(line for line in output.splitlines() if any(flag in line for flag in ('--bcf ','--bcf_loop','--bcf_prob','--aesSeed')))})
    require(p.returncode==0,'Compiler capability probe failed')
require('clang version 16.0.6' in records[0]['output'],'Compiler version differs')
require(all(flag in records[1]['output'] for flag in ('--bcf ','--bcf_loop','--bcf_prob','--aesSeed')),'Required BCF options not advertised')
save(ROOT/'build_or_identity/toolchain-probe.json',{'schema':'bypass-toolchain-probe/v1','compiler':str(clang),'sha256':sha(clang),'observations':records,'python':platform.python_version()})
argv=['node',str(ROOT/'scripts/reference.mjs')]
p=subprocess.run(argv,capture_output=True,text=True,encoding='utf-8',timeout=30)
save(ROOT/'evidence/reference-process.json',{'argv':argv,'exit_code':p.returncode,'stderr':p.stderr,'stdout_sha256':hashlib.sha256(p.stdout.encode()).hexdigest(),'generator_sha256':sha(ROOT/'scripts/reference.mjs')})
require(p.returncode==0,'Pinned game evaluator failed: '+p.stderr)
reference=json.loads(p.stdout)
require(len(reference['cases'])==16,'Reference domain incomplete')
(ROOT/'evidence/reference-vectors.json').write_text(p.stdout,encoding='utf-8',newline='\n')
print(json.dumps({'status':'PASS','compiler_sha256':sha(clang),'independent_ts_cases':16,'ordered_snapshots':9}))
