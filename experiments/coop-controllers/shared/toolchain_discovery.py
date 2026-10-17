"""Read-only Windows tool probes; write only this experiment's discovery report.

No source is compiled. Help advertised options are not treated as validated
transformations. The baseline's actual builds/native comparisons are separate.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import importlib.metadata
import json
import os
import re
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
OLLVM = Path(r'D:\VM_Shared_Folder\software\ollvm\original_ollvm\clang.exe')
HIKARI = Path(r'D:\VM_Shared_Folder\software\ollvm\for_website\hikari15\build-vs-patched\Release\bin\clang.exe')
MSVC = Path(r'E:\Visual Studio\VC\Tools\MSVC\14.51.36231')
LLVM = Path(r'E:\Visual Studio\VC\Tools\Llvm\x64\bin')
VSDEV = Path(r'E:\Visual Studio\Common7\Tools\VsDevCmd.bat')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def probe(argv):
    command = argv if isinstance(argv, str) else [str(a) for a in argv]
    result = subprocess.run(command, capture_output=True, text=True,
                            errors='replace', timeout=60)
    return dict(argv=command, exit_code=result.returncode,
                stdout=result.stdout, stderr=result.stderr)


def executable(path, arguments):
    path = Path(path)
    if not path.is_file():
        return dict(path=str(path), exists=False)
    result = probe([path, *arguments])
    output = result['stdout'] + result['stderr']
    return dict(path=str(path), exists=True, bytes=path.stat().st_size,
                sha256=sha(path), probe=dict(argv=result['argv'], exit_code=result['exit_code'],
                output_excerpt='\n'.join(output.splitlines()[:8]),
                full_output_sha256=hashlib.sha256(output.encode()).hexdigest()))


def compiler(path):
    result = executable(path, ['--version'])
    if not result['exists']:
        return result
    help_result = probe([path, '-mllvm', '--help-hidden', '-x', 'c', '-fsyntax-only', 'NUL'])
    text = help_result['stdout'] + help_result['stderr']
    options = [line.rstrip() for line in text.splitlines() if re.match(
        r'^\s+--(?:aesSeed|bcf(?:_\w+)?|fla|split(?:_num)?|sub(?:_loop|_prob)?|fw_prob|fcoconfig|enable-(?:\w*obf|fco|strcry|funcwra|indibran))(?:[ =]|$)', line)]
    result['advertised_obfuscation_help'] = dict(argv=help_result['argv'], exit_code=help_result['exit_code'],
        lines=options, full_output_sha256=hashlib.sha256(text.encode()).hexdigest(),
        interpretation='Options advertised by this executable; no claim that every pass or combination produces correct or surviving machine-code transformations.')
    return result


def discover():
    tools = {'ollvm16':compiler(OLLVM), 'hikari15':compiler(HIKARI),
             'stock_clang':executable(LLVM/'clang.exe', ['--version']),
             'lld_link':executable(LLVM/'lld-link.exe', ['--version']),
             'llvm_objdump':executable(LLVM/'llvm-objdump.exe', ['--version']),
             'llvm_readobj':executable(LLVM/'llvm-readobj.exe', ['--version']),
             'lldb':executable(LLVM/'lldb.exe', ['--version']),
             'msvc_link':executable(MSVC/'bin/Hostx64/x64/link.exe', ['/?']),
             'msvc_cl':executable(MSVC/'bin/Hostx64/x64/cl.exe', []),
             'dumpbin':executable(MSVC/'bin/Hostx64/x64/dumpbin.exe', ['/?']),
             'python':executable(sys.executable, ['--version']),
             'node':executable(shutil.which('node') or 'node.exe', ['--version'])}
    pnpm = shutil.which('pnpm')
    if pnpm:
        pnpm_result = probe('cmd.exe /d /s /c ""'+pnpm+'" --version"')
        tools['pnpm'] = dict(path=pnpm,sha256=sha(pnpm),probe=pnpm_result)
    package_versions = {}
    for name in ['pefile','capstone','unicorn','z3-solver','triton-library']:
        try:
            package_versions[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            package_versions[name] = None
    command = f'call "{VSDEV}" -no_logo -arch=amd64 -host_arch=amd64 -vcvars_ver=14.51 >NUL && set'
    environment_probe = probe('cmd.exe /d /s /c "'+command+'"')
    environment = {line.split('=',1)[0].upper():line.split('=',1)[1]
                   for line in environment_probe['stdout'].splitlines() if '=' in line and not line.startswith('=')}
    runtime_files = []
    for name in ['libcmt.lib','oldnames.lib','legacy_stdio_definitions.lib','libucrt.lib','kernel32.lib']:
        matches = [Path(folder)/name for folder in environment.get('LIB','').split(';') if folder and (Path(folder)/name).is_file()]
        runtime_files.append(dict(name=name, search_order_matches=[dict(path=str(p),sha256=sha(p)) for p in matches]))
    return dict(schema='coop-controller-toolchain-discovery/v1',
        observed_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        discovery_script_sha256=sha(__file__), platform=sys.platform, python_version=sys.version,
        tools=tools, python_packages=package_versions,
        runtime_environment=dict(argv=environment_probe['argv'],exit_code=environment_probe['exit_code'],
            stderr=environment_probe['stderr'],
            variables={k:environment.get(k) for k in ['VCTOOLSVERSION','VCTOOLSINSTALLDIR','WINDOWSSDKDIR','WINDOWSSDKVERSION','INCLUDE','LIB']},
            resolved_libraries=runtime_files),
        debugger_discovery=dict(cdb_on_path=shutil.which('cdb'),windbg_on_path=shutil.which('windbg'),
            scope='PATH plus Visual Studio x64 LLVM tools; Windows Kits Debuggers/x64 contains support DLLs but no cdb.exe in inspected installation. LLDB availability is a version probe, not a native-debug-session validation.'),
        selected_baseline=dict(compiler='ollvm16',linker='msvc_link',target='x86_64-pc-windows-msvc',
            frontend_flags=['-m64','-O0','-fno-stack-protector','-fno-discard-value-names'],
            obfuscation_flags=['-mllvm','-bcf','-mllvm','-bcf_prob=100','-mllvm','-bcf_loop=1','-mllvm','-aesSeed=00112233445566778899AABBCCDDEEFF'],
            notes=['Same compiler hash as the frozen CONTROL SPINE experiment; exact per-controller commands and runtime/library environment are retained with each new build.',
                   'Only the controller translation unit receives BCF; harness is clean.',
                   'Hikari is the existing locally patched Clang15 compiler; its aesSeed accepts an unsigned integer, unlike this OLLVM16 string seed.',
                   'No compiler was rebuilt or patched. No controller was compiled by discovery.']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stdout', action='store_true', help='Print report instead of writing toolchain.json')
    arguments = parser.parse_args()
    data = discover()
    text = json.dumps(data,indent=2)+'\n'
    if arguments.stdout:
        print(text,end='')
    else:
        (HERE/'toolchain.json').write_text(text,encoding='utf-8')
        print(json.dumps({'report':str(HERE/'toolchain.json'),'sha256':sha(HERE/'toolchain.json')}))
