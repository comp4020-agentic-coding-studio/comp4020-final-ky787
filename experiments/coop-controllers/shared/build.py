"""Build one chamber with the recorded compiler; never run the reference oracle.

Only controller.c receives BCF. Frozen IR, zero-byte audit labels and COFF
control objects reuse the validated UPLINK methodology. Existing PEs are frozen.
"""
from pathlib import Path
import argparse, hashlib, json, os, re, subprocess

AREA = Path(__file__).resolve().parents[1]
CLANG = Path(r'D:\VM_Shared_Folder\software\ollvm\original_ollvm\clang.exe')
LINK = Path(r'E:\Visual Studio\VC\Tools\MSVC\14.51.36231\bin\Hostx64\x64\link.exe')
COMPILER_SHA = '0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be'
SEED = '00112233445566778899AABBCCDDEEFF'
FLAGS = ['-mllvm','-bcf','-mllvm','-bcf_prob=100','-mllvm','-bcf_loop=1','-mllvm','-aesSeed='+SEED]

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(p,v):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(v,indent=2)+'\n',encoding='utf-8',newline='\n')

def harness(contract):
    inputs, outputs = contract['inputs'], contract['outputs']
    n=len(inputs)
    declarations='\n'.join(f'    in.{f["name"]} = values[{i}];' for i,f in enumerate(inputs))
    sentinel='\n'.join(f'    out.{f["name"]} = UINT32_C(0xA5A5A5A5);' for f in outputs)
    formats=lambda fs: ','.join('\\"'+f['name']+'\\":%u' for f in fs)
    params=', '.join('(unsigned)in.'+f['name'] for f in inputs)+', '+', '.join('(unsigned)out.'+f['name'] for f in outputs)
    domains='\n'.join(f'    if (index == {i}) return '+ ' || '.join(f'value == {v}u' for v in f['domain'])+';' for i,f in enumerate(inputs))
    return f'''#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include "controller.h"
/* Clean harness only: parse canonical vectors, invoke actual target, print fields.
 * No expected outputs, timer scheduling or gameplay expressions are computed here. */
static int allowed(unsigned index, unsigned long value) {{
{domains}
    return 0;
}}
static int number(const char *text, unsigned index, uint32_t *out) {{
    char *end; unsigned long value;
    if (*text < '0' || *text > '9') return 0;
    errno = 0; value = strtoul(text, &end, 10);
    if (errno || *end || !allowed(index,value)) return 0;
    *out = (uint32_t)value; return 1;
}}
static void evaluate(const uint32_t values[{n}]) {{
    ControllerInputs in; ControllerOutputs out;
{declarations}
{sentinel}
    bn_evaluate(&in,&out);
    printf("{{\\"inputs\\":{{{formats(inputs)}}},\\"outputs\\":{{{formats(outputs)}}}}}\\n", {params});
}}
int main(int argc,char **argv) {{
    uint32_t values[{n}]; unsigned i;
    if (argc == {n+1}) {{
        for(i=0;i<{n};i++) if(!number(argv[i+1],i,&values[i])) return 2;
        evaluate(values); return 0;
    }}
    if (argc != 1) return 2;
    char line[4096];
    while(fgets(line,sizeof(line),stdin)) {{
        char *p=line,*start;
        for(i=0;i<{n};i++) {{
            while(*p==' ' || *p=='\\t') p++;
            start=p; while(*p && *p!=' ' && *p!='\\t' && *p!='\\n' && *p!='\\r') p++;
            if(p==start) return 2;
            if(*p) *p++='\\0';
            if(!number(start,i,&values[i])) return 2;
        }}
        while(*p==' ' || *p=='\\t' || *p=='\\r' || *p=='\\n') p++;
        if(*p) return 2;
        evaluate(values);
    }}
    return ferror(stdin) ? 3 : 0;
}}
'''

def main():
    ap=argparse.ArgumentParser();ap.add_argument('chamber');args=ap.parse_args()
    root=AREA/args.chamber; contract=json.loads((root/'contract.json').read_text())
    assert root.parent==AREA and contract['chamber_id']==args.chamber
    if (root/'bin').exists(): raise SystemExit('Existing binary directory: use a new specimen version, never silently overwrite.')
    assert sha(CLANG)==COMPILER_SHA
    ident=root/'build_or_identity'; temp=root/'_build'; temp.mkdir(parents=True,exist_ok=True)
    (root/'bin').mkdir(); ident.mkdir(exist_ok=True)
    (root/'src/harness.c').write_text(harness(contract),encoding='utf-8',newline='\n')
    vs=subprocess.run('cmd.exe /d /s /c "call "E:\\Visual Studio\\Common7\\Tools\\VsDevCmd.bat" -no_logo -arch=amd64 -host_arch=amd64 -vcvars_ver=14.51 >NUL && set"',capture_output=True,text=True,check=True)
    env=dict(os.environ)
    for line in vs.stdout.splitlines():
        if '=' in line and not line.startswith('='):
            k,v=line.split('=',1)
            for old in list(env):
                if old.lower()==k.lower():del env[old]
            env[k]=v
    env['TEMP']=env['TMP']=str(temp)
    commands=[]
    def run(argv,name):
        argv=list(map(str,argv));p=subprocess.run(argv,cwd=root,env=env,capture_output=True,text=True,timeout=120)
        commands.append(dict(name=name,argv=argv,cwd=str(root),exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr))
        save(ident/'commands.json',commands)
        if p.returncode:raise RuntimeError(f'{name}: {p.stderr}')
        return p.stdout
    version=run([CLANG,'--version'],'compiler_version')
    base=[CLANG,'-m64','-O0','-fno-stack-protector','-fno-discard-value-names']
    run([*base,'-c',root/'src/harness.c','-o',temp/'harness.obj'],'clean_harness')
    records=[]
    for variant in ['clean','bcf']:
        out=ident/variant;out.mkdir(exist_ok=True)
        extra=[] if variant=='clean' else FLAGS
        ll,asm=out/'controller.ll',out/'controller.s'
        run([*base,*extra,'-S','-emit-llvm',root/'src/controller.c','-o',ll],variant+'_freeze_ir')
        run([CLANG,'-m64','-O0','-Xclang','-disable-llvm-passes','-x','ir','-S','-masm=intel',ll,'-o',asm],variant+'_lower_frozen_ir')
        labels=[];lines=[]
        for line in asm.read_text().splitlines():
            m=re.match(r'^(\.LBB\d+_\d+):\s*(?:#\s*%([^\s]+))?',line)
            if m:
                symbol='audit_'+m[1][1:];lines.extend(['\t.globl '+symbol,symbol+':'])
                labels.append(dict(symbol=symbol,assembly_label=m[1],ir_block=m[2]))
            lines.append(line)
        marked=out/'controller.labelled.s';marked.write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')
        save(out/'assembly_labels.json',labels)
        run([CLANG,'-m64','-c',asm,'-o',temp/f'{variant}.unlabelled.obj'],variant+'_assemble_control')
        obj=temp/f'{variant}.obj';run([CLANG,'-m64','-c',marked,'-o',obj],variant+'_assemble_labelled')
        exe=root/'bin'/('clean_x64.exe' if variant=='clean' else 'obfuscated_x64.exe')
        run([LINK,'/NOLOGO',obj,temp/'harness.obj','libcmt.lib','oldnames.lib','legacy_stdio_definitions.lib',f'/OUT:{exe}','/MACHINE:X64','/SUBSYSTEM:CONSOLE',f'/MAP:{out/"controller.map"}','/INCREMENTAL:NO','/OPT:NOREF','/OPT:NOICF','/Brepro','/DYNAMICBASE:NO','/NOIMPLIB'],variant+'_link')
        records.append(dict(variant=variant,optimization='O0',transformations=[] if variant=='clean' else ['bcf'],frontend_extra_flags=extra,binary_path=exe.relative_to(root).as_posix(),binary_sha256=sha(exe),ir_sha256=sha(ll),compiler_assembly_sha256=sha(asm),labelled_assembly_sha256=sha(marked),link_map_sha256=sha(out/'controller.map'),label_manifest_sha256=sha(out/'assembly_labels.json')))
    lookup=lambda k:next((v for name,v in env.items() if name.lower()==k.lower()),None)
    libraries={}
    for name in ['libcmt.lib','oldnames.lib','legacy_stdio_definitions.lib']:
        p=next(Path(d)/name for d in lookup('LIB').split(';') if (Path(d)/name).is_file())
        libraries[name]=dict(path=str(p),sha256=sha(p))
    save(ident/'identity.json',dict(schema='coop-native-build/v1',chamber_id=args.chamber,reference_commit=contract['reference_commit'],contract_sha256=sha(root/'contract.json'),compiler=dict(path=str(CLANG),sha256=sha(CLANG),version=version),linker=dict(path=str(LINK),sha256=sha(LINK)),seed=SEED,build_script_sha256=sha(__file__),source_sha256={p.name:sha(p) for p in sorted((root/'src').glob('*'))},object_sha256={p.name:sha(p) for p in sorted(temp.glob('*.obj'))},abi=contract['abi'],runtime=dict(environment={k:lookup(k) for k in ['VCToolsVersion','WindowsSDKVersion','INCLUDE','LIB']},libraries=libraries),builds=records))
    print(json.dumps(dict(chamber=args.chamber,builds=records),indent=2))

if __name__=='__main__':main()
