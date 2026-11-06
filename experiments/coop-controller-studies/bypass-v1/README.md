# BYPASS v1 — independent Windows native acquisition

Verified acquisition only; no live controller registration or frontend change.
This package implements the finalized four-input BYPASS decision layer. The
historical five-chamber acquisition in `../../coop-controllers/` stays frozen.
The obsolete six-input/final-scanner design is not used.

## Frozen reference and specimens

| Identity | Exact value |
| --- | --- |
| Game/request source commit | `a209122ba1e3b54c6d329a94c01276b9550c9189` |
| Released and matching draft level SHA-256 | `38fc3c7e1393caa034eb840f96bca9d1a79bae466d46db01b3a45b04144ec9cb` |
| `docs/native-requests/bypass.json` SHA-256 | `af24de094de2926bf47e4ea8d01536ff999f69b58030ff88993acb06792fb469` |
| Clean PE SHA-256 | `85ec3623042a89256e89d89fa028b1cc8019ada2c33ead04761c67ccf6371343` |
| BCF PE SHA-256 | `af1ad2ec9562728c94f21a764bb0be450bad5541a0cb1b0d6eb696087d4b2e74` |
| OLLVM Clang 16.0.6 executable SHA-256 | `0d0392508af664396606f4e006922e57573690272a4e5a39f7e60e6543b710be` |

`reference/identity.json` records exact Git blob IDs and SHA-256 values for the
request's eight source files, two additional evaluator runtime imports and the
request Markdown. `reference/request.json` is the unmodified request blob.
The minimal frozen source snapshot avoids importing moving `main` or normalizing
the checkout's existing source files. The package's `.gitattributes` preserves all
retained bytes across Windows/Linux. `manifest.json` inventories the entire package
and its required, read-only historical tools/pass-source dependencies.

## ABI and ownership

`void bn_evaluate(const ControllerInputs *in, ControllerOutputs *out)` uses
Microsoft x64: RCX=input, RDX=output. Each buffer is 16 bytes, little-endian,
four aligned consecutive `uint32_t` fields. Canonical input domain is 0/1.
Case ID is `anchorHold + 2*link + 4*bypassHold + 8*override`.

| Offset | Input | Game port | Output | Expression |
| ---: | --- | --- | --- | --- |
| 0 | anchorHold | anchorHold.occupied | anchorPower | anchorHold OR link |
| 4 | link | link.value | bridgePower | link |
| 8 | bypassHold | bypassHold.occupied | firewallActive | NOT (bypassHold OR override) |
| 12 | override | override.value | exitReady | constant 1 |

The input and output columns describe separate buffers. Every output is written
on every call, including zeros. Bindings are uninverted: `anchorFeed` maps
anchorPower to `anchor.active`; `bridgeFeed` maps bridgePower to `bridge.active`;
`barrierA` and `barrierB` map the single firewallActive output to
`firewallA.active` and `firewallB.active`; `exitFeed` maps exitReady to `exit.unlock`.

**exitReady has no zero alternative, player-input requirement or genuine puzzle
branch.** It requests unlock even in case 0. The game owns exit latching, both
physical arrivals and campaign completion. Occupancy, accepted one-use LINK and
OVERRIDE commitments, persistence, checkpoints, death/reset, physics, networking,
1.4-second crumble warning and 2.6-second recovery also remain game-owned.

## Observations and proof

- Actual pinned TypeScript `evaluateDraft` and `draftFrame` executed against the
  released document under Node 24.19.0: all 16 abstract vectors. The C controller
  is not the oracle. Raw evaluator JSON and process status are retained.
- Both actual Windows PEs ran all 16 vectors plus nine ordered snapshots:
  **50 successful evaluations**, zero native failures, exit status 0 and empty
  stderr. The clean harness poisons every output with `0xA5A5A5A5` before each call.
  Retained stdout JSONL is subprocess text capture with newline normalization;
  archives, parsed rows, full input streams and hashes are retained.
- Ordered case IDs: `0,1,3,2,6,2,6,14,10`: initial, anchor hold, accepted LINK,
  anchor release, temporary bypass, early release, bypass again, accepted OVERRIDE,
  later bypass release. These are decision snapshots with supplied commitment
  state, not execution of the commitment reducer or proof of physical reachability
  or WebSocket authorization.
- Exact clean PE: 155 controller bytes, 37 instructions, 12 blocks, 16 edges.
  Exact BCF PE: 1,622 bytes, 476 instructions, 77 blocks, 105 edges.
  Image base `0x140000000`; BCF controller RVA `[0x1000,0x1656)`.
- All 16 BCF cases have bounded Unicorn instruction traces, separate from Windows
  native stdout. They execute the exact linked helper instructions, including
  `_chkstk`; no success stub substitutes for those instructions. Each trace
  agrees with native results and commits all four outputs: **64 observed writes**.
- Retained exact-pattern/bit-vector proof covers **24 opaque guards and 12 bogus
  clones**. The stdlib verifier independently checks the native patterns and parity
  argument, IR/assembly/label mapping and incoming transfers without Z3. See
  `evidence/bogus-proof.json.gz` and `../../coop-controllers/shared/PROOF.md` for
  assumptions. The actual predicate uses `x*(x-1)` despite the pass-source comment
  saying `x*(x+1)`. Non-observation is not the proof.

All compiler and native invocations used the permitted Windows host environment.
No failed sandbox PE launch is counted as a native observation. There was no
BYPASS compiler/native failure in this acquisition. A development-only verifier
check initially expected the poison literal with a `u` suffix; it was corrected
to check the harness's actual `UINT32_C(...)` assignments, without changing any
source specimen, binary or observation.

## Small, authentic fragments

`fragments.json` contains 17 selectable excerpts, each three to five unchanged
instructions from one real raw block. Five input reads and five separate branches
retain the saved Boolean across the intervening opaque guard. Branch flags come
from the later `TEST AL,1`, not an earlier input CMP. The input-pointer slot is
`[RBP-0x20]`; the output-pointer slot is `[RBP-0x28]`, established by the prologue.
`evidence/decision-mappings.json` includes comparison addresses, stack spills,
reloads, trace steps, branch outcomes and exact IR line citations.

| Output | Offset | Real zero-store RVA | Real one-store RVA |
| --- | ---: | --- | --- |
| anchorPower | 0 | `0x11D2` | `0x1167` |
| bridgePower | 4 | `0x131F` | `0x12B3` |
| firewallActive | 8 | `0x1477` | `0x14E3` |
| exitReady | 12 | **None** | `0x154F` |

`evidence/trace-summary.json` maps each site to exact bytes, VA/RVA, raw block,
value and case IDs. `evidence/fragment-compositions.json.gz` provides 64 per-case,
per-output compositions with explicit omitted trace steps and block chains.
Do not stitch separate excerpts into a fictional basic block. A bogus exit clone
is not an alternative result. Authored unstable platforms and their timing are
not manifestations of this proof.

`integration.json` is a proposal with the established ABI/store mapping shape.
An accepted output may select a matching store labelled STATE-LINKED. Only an
exact four-input retained trace may animate EMULATED REPLAY; missing inputs
disable replay. Neither mode represents live native execution.

## Read-only verification on Linux or Windows

From repository root, Python 3.10+ standard library only:

```sh
python3 -I -B experiments/coop-controller-studies/bypass-v1/scripts/verify_portable.py
```

On Windows use the same arguments with `python` or an absolute Python executable.
The audit reads retained evidence; it does not compile, execute Windows PEs,
invoke Node/Git/Z3, emulate instructions or rewrite files. It verifies inventory,
all 16 vectors, ordered native records, exact PE bytes/CFG, register/flag/memory
chronology, output writes, proof associations and rederived fragment boundaries.
Seven in-memory corruption fixtures cover bad stores/bytes/chronology, missing
cases and invented exit-zero/input requirements. Linux OS execution is left for
the recipient; Windows execution with isolated stdlib Python (`-I -B`) passed.

Run this from a checkout containing the unchanged `experiments/coop-controllers/`
dependencies; do not copy this folder alone. The narrow helper adapter maps BYPASS
to this package and its frozen reference, leaving the original verifier untouched.

The original five-chamber verifier also passed unchanged. Its historical reference
is `1315c3616ce5ac939baf913f9b09b4ebad34132a`, not current `main`.
`evidence/historical-package-verification.json` retains the full receipt: 192
original acquisition files matched commit `7e510dbdad54ac2b09ff0021a1067561738d5fa2`,
and 21 exact historical game-source blobs were supplied in ignored scratch.
`scripts/check-historical.py` documents that isolation and requires Git; it is
separate from the read-only BYPASS verifier. No original evidence or current game
source was changed to make the old verifier pass.

## Acquisition provenance and reproduction boundaries

Compiler: `D:\VM_Shared_Folder\software\ollvm\original_ollvm\clang.exe`.
MSVC link: `E:\Visual Studio\VC\Tools\MSVC\14.51.36231\bin\Hostx64\x64\link.exe`.
`build_or_identity/identity.json` records executable, native source, object and
six CRT/SDK library identities; `toolchain-probe.json` records the fresh version
and advertised BCF flags. `commands.json` contains every resolved argv, working
directory, status and compiler/linker output.

Both variants emit frontend IR **once** with `-m64 -O0 -fno-stack-protector
-fno-discard-value-names -S -emit-llvm`. BCF additionally uses:

```text
-mllvm -bcf -mllvm -bcf_prob=100 -mllvm -bcf_loop=1
-mllvm -aesSeed=00112233445566778899AABBCCDDEEFF
```

The same frozen IR is lowered with `-m64 -O0 -Xclang -disable-llvm-passes -x ir
-S -masm=intel`. Zero-byte audit symbols are inserted into that assembly. Both
unlabelled and labelled COFF bytes/relocations were compared and resolved against
the final PE/link map. The harness is compiled separately without BCF. Link flags
include `/MACHINE:X64 /SUBSYSTEM:CONSOLE /INCREMENTAL:NO /OPT:NOREF /OPT:NOICF
/Brepro /DYNAMICBASE:NO /NOIMPLIB` and the retained map. Disposable COFF objects
are ignored; their hashes/comparison reports remain evidence.

Acquisition order was `pin-reference.py`, `adapt-tools.py`, `prepare.py`, `build.py`,
`validate_native.py --environment windows-host`,
`analyze.py <absolute-package-path> --trace-limit 16`,
`prove_bogus.py <absolute-package-path>`, `curate.py`, `check-historical.py`, then
manifest creation and the portable audit. Analysis used Python 3.13.9, pefile
2024.8.26, Capstone 5.0.7, Unicorn 2.1.4 and Z3 4.16.0. These producer dependencies
are unnecessary for portable verification. `scripts/reuse-map.json` records every
literal adaptation of the five established producer/proof tools. Do not rerun
producers over frozen evidence: use a new package/version for new acquisitions.

The portable audit cannot independently authenticate capture history, prove a
toolchain supply chain or rerun the discarded COFF comparison. Proof assumes
ordinary function entry, intact code/flags, successful loads/calls and valid
distinct buffers. Emulation uses synthetic mapped memory and initial PE globals;
it is not a Windows process/security model. No noncanonical inputs, arbitrary
pointers, physical playability, server authorization or live integration is claimed.

## Linux integration follow-up

First run the portable verifier and compare the pinned request/level hashes.
Add a narrow BYPASS package/reference-location mapping if the consumer still
assumes the historical five-chamber root or commit. Respect `exitReady:[1]` and its
single store; do not require both output values or synthesize a condition.
Keep the two physical barriers on one firewallActive signal, and keep the server
state machine and crumble lifecycle outside native code. Review integration
separately before marking BYPASS native-backed. Git carries this evidence;
the UTC-dated shared filesystem handoff is a separate delivery, not experiment
authority.
