# Five verified native co-op controllers

Windows acquisition, 2026-10-17, based on game commit `1315c3616ce5ac939baf913f9b09b4ebad34132a`.
All five clean and BCF specimens match the actual current game oracle over their full declared finite input domains.
No campaign code, existing evidence, geometry, public Level Builder behaviour or server logic was changed.
HANDSHAKE passed before the other binaries were built; its `evidence/phase-b-gate.json` retains that gate.

## Coverage and deliverables

Each chamber link lists its controller source, clean/BCF PE, contract, disassembly, traces, proof and signal-to-store mapping.
All fields are uint32, Windows x64 RCX/RDX input/output pointers. Controllers are stateless decision layers.
Inputs/outputs below are field counts, not physical object counts.

| Chamber | Inputs / outputs | Exhaustive vectors | Additional snapshots | Ordered sequences / frames per PE | Total native calls, both PEs |
| --- | ---: | ---: | ---: | ---: | ---: |
{{COVERAGE}}

The additional CROSSFEED/RACE snapshots also occur in the case comparison set, then are replayed in sequence order.
HANDSHAKE/DEADLOCK/USE AFTER FREE sequences reference existing exhaustive rows.
Native subprocess stdout, parsed named outputs and mismatch checks are retained independently for both builds.
The harness contains no expected-output logic. Every output is checked, including zero values and inverted physical bindings.

## Compiler and frozen builds

OLLVM Clang 16.0.6, `x86_64-pc-windows-msvc`, SHA-256
`0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be`, installed at
`D:\VM_Shared_Folder\software\ollvm\original_ollvm\clang.exe`.
Common controller frontend flags: `-m64 -O0 -fno-stack-protector -fno-discard-value-names`.
BCF adds exactly:

```text
-mllvm -bcf -mllvm -bcf_prob=100 -mllvm -bcf_loop=1
-mllvm -aesSeed=00112233445566778899AABBCCDDEEFF
```

The clean build has no obfuscation pass. Both use separately compiled clean harness code.
Each frontend invocation freezes LLVM IR once. Lowering uses `-m64 -O0 -Xclang -disable-llvm-passes -x ir -S -masm=intel`.
Zero-byte audit labels associate frozen IR blocks, compiler assembly, linker symbols and PE instruction regions;
the original/labelled COFF comparison is retained in the analysis provenance.

MSVC linker 14.51.36248.0 from the explicit 14.51.36231 tools directory, SDK 10.0.26100.0, static CRT:
`libcmt.lib oldnames.lib legacy_stdio_definitions.lib`.
Link flags: `/MACHINE:X64 /SUBSYSTEM:CONSOLE /INCREMENTAL:NO /OPT:NOREF /OPT:NOICF /Brepro /DYNAMICBASE:NO /NOIMPLIB` plus `/OUT` and `/MAP`.
Every resolved command, return code, source/IR/assembly/map hash and runtime library hash is retained in each
`build_or_identity/` directory and manifest. These are frozen specimens, not a claim of byte-identical rebuilds across toolchains or paths.

[Toolchain discovery](shared/toolchain.json) records installed OLLVM, Hikari, MSVC, LLVM analysis tools and supported flags.
Hikari and other passes were discovered but not used; advertised support is not a verified combination.
LLDB's local missing-python311.dll probe failure is retained. Capstone/pefile/Unicorn/Z3 provide the successful analysis path.

| Chamber | Build / PE | SHA-256 |
| --- | --- | --- |
{{BINARIES}}

## Evidence and proposed integration

| Chamber | Instructions clean / BCF | Blocks clean / BCF | Proven altered clones | Selected BCF traces |
| --- | ---: | ---: | ---: | ---: |
{{CFGS}}

Static CFGs contain decoded instructions and inferred direct edges. Representative traces are actual Unicorn execution
of exact PE bytes, with register/memory changes, observed branches and output-store events; they are not hardware debugger traces.
They agree with independently recorded Windows-native output. All outputs have representative 0 and 1 commits.
The [proof method](shared/PROOF.md) distinguishes exact guarded clone infeasibility from mere non-observation.
Calculation prefixes provide context, not a complete backwards data-flow analysis. Selected traces do not imply exhaustive path coverage.

Each `integration.json` joins the existing signal and machinery binding to its output-buffer byte offset,
observed BCF store instruction/RVA/block, observed values and case IDs. Output memory is caller-owned; store RVAs identify code.
Multiple machines can share one signal and native region. Authored crumble platforms have no invented mapping to proven clones.
The live game remains on its current controllers until a separately verified integration.

For declarative levels, feed canonical input snapshots into the native adapter, then resolve existing bindings once.
DEADLOCK's completed three-payload state powers serviceRelay. USE AFTER FREE keeps raw assistBlocked and applies its finalLift inversion once.
Raw exitReady/payloadReady requests remain distinct from the server's durable unlocked state and required two-player arrivals.

CROSSFEED/RACE expose actual `project(ctx)` outputs, auxiliary grace-inclusive power and the separate `definition.unlock(ctx)` candidate.
`exitDoor` projects the existing latch; native code never sets it. `spanMaster` is a wire/prediction signal, not a new physical platform.
The server retains accepted events, input arbitration, cooldown, clocks, latches, checkpoints, ownership, crumble and completion.
RACE's 4-valued bufferPhase is explicit; native code does not implement the buffer scheduler or reducer.
Exhaustive abstract vectors include combinations impossible with two actors/cubes or normalized away by sync.
Ordered fixtures instead use valid records, exactly two cubes/two body slots and actual current TS reducers/projections,
including exact deadlines, rejection boundaries, reversals, payload removal and persisted latch behaviour.
They do not prove geometric reachability or WebSocket/epoch authorization. Detailed actions and before/after state are in
each temporal chamber's `evidence/server-sequences.json`.
These fixtures do not exercise CROSSFEED restart during active grace or RACE restart during an in-flight buffer window.
Grace outputs power the same authored objects as their logical outputs; crumble collision also requires a non-broken phase.
Accepted server/native snapshots exclude temporary local pending-action prediction and decorative fading.

## Rerun checks

From the repository root on Windows, with Python 3 and Node 24 (native TS imports):

```powershell
# Reference oracles execute current game TypeScript, independent of native C.
# Existing declarative references are frozen; stdout can be compared without replacing them.
node experiments/coop-controllers/shared/reference_declarative.mjs handshake
node experiments/coop-controllers/shared/reference_temporal.mjs crossfeed-vault
node experiments/coop-controllers/shared/reference_temporal.mjs race-condition

$ids = 'handshake','crossfeed-vault','race-condition','deadlock','use-after-free'
foreach ($id in $ids) {
  python -B experiments/coop-controllers/shared/validate_native.py $id
  if ($LASTEXITCODE -ne 0) { throw "Native comparison failed: $id" }
}
python -I -B experiments/coop-controllers/shared/verify_portable.py
```

`validate_native.py` executes existing PEs and refreshes deterministic native observations; it never builds a PE.
The acquisition sandbox could not initially launch the PEs (WinError 623); host execution of the same hashes passed.
HANDSHAKE's initial failure is retained. Use a normal host terminal if the same sandbox restriction occurs.
Optional evidence regeneration requires `python -m pip install -r experiments/coop-controllers/shared/requirements-analysis.txt`:

```powershell
python -B experiments/coop-controllers/shared/analyze.py experiments/coop-controllers/handshake
python -B experiments/coop-controllers/shared/prove_bogus.py experiments/coop-controllers/handshake --check
```

The producer relocation audit requires acquisition COFF intermediates in ignored `_build/`; the portable checker does not.
`shared/build.py CHAMBER` documents initial builds and refuses to overwrite a frozen `bin/` directory.
Use a separate acquisition copy for any rebuild and retain it as a new specimen, with new validation; do not replace these PEs.

On Linux, from the checkout root, Python 3.10+ standard library only:

```sh
python3 -I -B experiments/coop-controllers/shared/verify_portable.py
```

The verifier reads only, validates inventories/hashes, named contracts, exhaustive domains, native stdout consistency,
sequence links, PE/CFG bytes, trace references/commits and the exact BCF parity proof. It neither runs Windows PEs
nor rebuilds the compiler, reruns the TS oracle, emulates traces or independently attests historical observations.
Native Windows execution remains the native-output authority. `verification-report.json` is a captured report,
excluded from manifest hashing to avoid a hash cycle; rerun the verifier to establish current status.
The portable verifier was exercised here under isolated Windows Python with only the standard library; a Linux runtime is not installed on this host.
Nested `.gitattributes` preserves exact evidence bytes across Windows and Linux checkouts.

## Existing project checks and preserved limitations

[Project checks](project-checks.json): TypeScript typecheck, UPLINK bundle audit and production build passed.
Focused co-op tests: **52 passed, 14 failed**. All 14 fail while creating/persisting rooms with `ROOM_UNAVAILABLE`.
The unchanged `server/atomic-json.ts` reproduces Windows directory `fsync` failure (`EPERM`) in
[storage-probe.json](storage-probe.json), after successfully writing the test JSON.
Retrying outside the process sandbox gives the same failures. WSL is not installed; Linux server tests remain a handoff requirement.
No test, storage implementation or game logic was changed to make these checks pass. Earlier environment failures and build warnings remain recorded.

The original 555 tracked checkout files are hash-preserved; see `preservation-report.json` and `shared/reference-lock.json`.
`final-native-rerun.json` records fresh reference evaluation and all ten PE reruns with unchanged retained evidence bytes.
The package retains ten modest PE files, compact gzip traces/results/proofs, source and IR/assembly/link maps needed for identity audits.
Disposable objects, libraries, debugger logs and test/build scratch data are ignored. A package manifest links the five chamber
manifests and shared scripts. `shared/package.py` is an explicit packaging writer, never part of read-only verification.
