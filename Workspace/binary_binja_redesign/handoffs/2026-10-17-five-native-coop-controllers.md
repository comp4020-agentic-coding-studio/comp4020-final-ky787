# Five native co-op controllers: Windows acquisition handoff

2026-10-17. Reference game commit: `1315c3616ce5ac939baf913f9b09b4ebad34132a`.
Delivery branch: `codex/coop-native-controllers`; the delivery commit is the commit containing this note.
This handoff is a working summary. Authoritative evidence lives in
`experiments/coop-controllers/README.md`, each chamber contract/manifest and its retained evidence.

Five clean/BCF PE pairs are acquired and verified. No live campaign integration was performed.
HANDSHAKE passed its full native proof-of-concept gate before the remaining binaries were built.

| Chamber directory | Inputs / outputs | Exhaustive vectors | Extra ordered snapshots | Total native calls across both PEs |
| --- | ---: | ---: | ---: | ---: |
| handshake | 5 / 4 | 32 | 33 replay frames | 130 |
| crossfeed-vault | 14 / 14 | 16,384 | 35 extra rows, then 35 replay frames | 32,908 |
| race-condition | 11 / 13 | 4,096 | 41 extra rows, then 41 replay frames | 8,356 |
| deadlock | 6 / 5 | 64 | 39 replay frames | 206 |
| use-after-free | 5 / 6 | 32 | 33 replay frames | 130 |

Every directory contains `src/controller.c`, `src/controller.h`, `src/harness.c`,
`bin/clean_x64.exe`, `bin/obfuscated_x64.exe`, `contract.json`, `manifest.json`,
`integration.json`, exact build commands, native stdout/results, raw clean/BCF CFGs,
representative instruction traces, output commit observations and a guarded BCF-clone proof.
The package README lists all ten SHA-256 hashes and direct artifact paths.

Compiler: OLLVM Clang 16.0.6, x86_64-pc-windows-msvc, SHA-256
`0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be`.
Controller flags: `-m64 -O0 -fno-stack-protector -fno-discard-value-names`;
BCF adds `-mllvm -bcf -mllvm -bcf_prob=100 -mllvm -bcf_loop=1
-mllvm -aesSeed=00112233445566778899AABBCCDDEEFF`.
Frozen IR, assembly audit labels, original/labelled COFF equivalence and MSVC link maps retain the machine-code identity chain.
The installed Hikari compiler and other advertised passes were inspected, not used for these specimens.

Native comparisons: 41,730 actual Windows invocations, zero mismatches. The final rerun re-evaluated actual game TypeScript
and re-executed all ten PEs; all 64 retained evidence/binary files compared at that point were byte-unchanged.
Analysis: 160 selected Unicorn traces of exact PE bytes, 1,344 output commits, 84 distinct store sites,
336 opaque guards and 168 proven altered clones under the documented normal-entry/intact-code assumptions.
Every output has 0/1 observations. Emulator instruction traces and native Windows process results are distinct evidence sources.

The Linux-compatible verifier uses only Python's standard library and reads only. It checks manifests, original game source hashes,
canonical input completeness, raw/resolved binding semantics, native stdout consistency, sequence links, exact PE/CFG bytes,
trace chronology/output commits, integration-store mappings and the concrete analytical parity proof.
It does not execute Windows PEs, rerun TS, emulate traces or authenticate historical capture by hashing alone.
Use the whole repository checkout: authoritative game reference sources remain at their ordinary repository paths.

Important integration constraints:

- RCX and RDX point to separate uint32 input/output structs; field offsets and initial values are explicit in each contract.
- Feed accepted server state to the adapter. Keep geometry, player/cube authority, prediction, persistence and timer scheduling in existing systems.
- DEADLOCK retains `serviceRelay = (safe && !feed) || payloadReady`.
- USE AFTER FREE returns raw `assistBlocked`; apply its finalLift binding inversion exactly once. The retry bindings also retain their existing inversions.
- CROSSFEED/RACE implement combinational projections, including explicit grace statuses. RACE additionally accepts enum bufferPhase (idle/window/released/expired), not an invented Boolean timer.
- `exitUnlockCandidate` is the current server predicate; `exitDoor` reflects the separately persisted latch. The native function does not latch the exit or complete player arrivals.
- Auxiliary physical outputs power the same machinery bindings as their raw signals. Crumble still requires the server's non-broken phase. No authored unstable platform is mapped to a bogus clone.
- `spanMaster` feeds receiver-wire/prediction logic; it is not a separate platform. Multiple objects may share one signal/native region.
- Exhaustive temporal cases cover the abstract domain, not physical reachability. Ordered valid-record fixtures exercise real reducers and exact time boundaries, with accepted contacts seeded separately from network authorization.
- Restart fixtures do not cover CROSSFEED restart during active grace or RACE restart during an in-flight buffer window. No whole native state-machine equivalence is claimed.

From the repository root on Windows:

```powershell
python -B experiments/coop-controllers/shared/final_native_check.py
python -I -B experiments/coop-controllers/shared/verify_portable.py
```

The first command uses Node 24 and actual existing Windows PEs and refreshes deterministic observations.
Initial sandbox PE launch failure (WinError 623) is retained; normal host execution passed unchanged binaries.
From Linux, without compiler/native-analysis dependencies:

```sh
python3 -I -B experiments/coop-controllers/shared/verify_portable.py
```

Project checks: typecheck, existing CONTROL SPINE bundle audit and production build pass.
Focused co-op tests are **52 passed / 14 failed** on this Windows host. Failures are `ROOM_UNAVAILABLE` during storage acknowledgement;
the unchanged atomic JSON helper reproduces `EPERM` on directory fsync after writing the file.
Running outside the sandbox gives the same result. `project-checks.json` and `storage-probe.json` retain this evidence.
WSL is absent. Run these existing suites on Linux before integration; do not treat native acquisition as a green multiplayer release gate.
All original 555 tracked checkout files were preserved byte-for-byte.

Next phase: consume and independently check the package on Linux, rerun the storage-backed suites there, then design/test the adapter separately.
Keep the current campaign mock controllers active until that integration has been verified. Do not regenerate CONTROL SPINE.
