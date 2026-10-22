# Native assembly in cooperative chambers

The cooperative campaign displays genuine Windows x64 instructions from its
existing OLLVM-16 BCF controller specimens. World panels are presentation only:
they do not execute native code, evaluate a controller, or participate in physics.
The server continues using the existing verified native lookup tables described
in [ADR 0011](adr/0011-native-backed-coop-controllers.md).

All 34 existing campaign placements now use fixed environmental code: the nine
RACE [cargo](race-cargo-panel.md)/[machinery](race-machinery-panels.md) blocks and
25 [other co-op blocks](coop-environmental-assembly.md). They select genuine
zero/one stores, use short authored strings and expose detailed evidence on
demand. Assembly supplies atmosphere; machinery and geometry communicate the
puzzle. No dashboard, technical status footer or zoom-dependent floating label
belongs in normal gameplay.

The five original `coop-native-world/v1` assets and their strict validator remain
unchanged. They supply static platform address identities and binding evidence;
their write-one addresses are not the selected state-linked store address.
The sections below document that retained asset contract, not the superseded
three-MOV diagnostic-card design.

## Evidence and generation

Run `pnpm gen:native-world` to regenerate the small world artifacts, or
`pnpm check:native-world` to check them without writing. The world check is also
part of `pnpm check:native` and therefore `pnpm check`.

[`scripts/native/world-evidence.ts`](../scripts/native/world-evidence.ts) reads each
chamber's frozen files under `experiments/coop-controllers/<chamber>/`:

- `integration.json`, which associates verified output-store instructions with
  existing gameplay bindings;
- `evidence/disassembly-bcf.json.gz`, which supplies the exact instructions and
  basic-block order;
- `contract.json`, `manifest.json` and `bin/obfuscated_x64.exe`, which establish
  the specimen identity and permit independent instruction-byte checks.

For each output, the generator selects an acquired store site observed writing
one. The excerpt contains its two preceding pointer-load instructions and the
store, in their original contiguous basic-block order. These three instructions
show output-buffer access and the recorded store site; they do **not** establish
the entire preceding Boolean calculation. Following opaque-guard instructions
are excluded rather than added merely to make a longer listing.

Each `coop-native-world/v1` artifact records the chamber/specimen, PE and contract
SHA-256, image base, source hashes, output kind, byte offset, original bindings,
and a single excerpt per output. Every instruction retains its numeric address,
RVA, size, exact bytes, mnemonic, operands and block ID. The schema is defined in
[`src/coop/native-world-types.ts`](../src/coop/native-world-types.ts).

| Artifact in `public/evidence/coop/` | Uncompressed bytes |
| --- | ---: |
| `handshake.world.json` | 6,502 |
| `crossfeed-vault.world.json` | 24,024 |
| `race-condition.world.json` | 20,166 |
| `deadlock.world.json` | 7,710 |
| `use-after-free.world.json` | 10,491 |
| Total | 68,893 |

The generator verifies acquired source hashes against their retained manifests,
reads the actual PE section table to compare instruction bytes, and checks
addresses, RVAs, exact decoded fields, block membership, ordering and contiguity.
A highlighted store must be recorded for that output and buffer offset. Binding
targets and semantics are checked against the existing canonical JSON or
hand-authored temporal room. The read-only check additionally requires committed
artifacts to equal deterministic regenerated output.

The frozen binaries, acquisition files, native lookup tables, canonical campaign
JSON and temporal controller/room sources are not modified for annotations.
Historical acquisition source hashes remain historical identities; the world
feature does not rewrite them to conceal later server integration changes.

## Authored placement and shared outputs

[`src/slice/native-world-presentation.ts`](../src/slice/native-world-presentation.ts)
contains only authored placement coordinates and existing output/target IDs.
Placement is separate from native evidence and from the physical room geometry.
Machinery panels must resolve to an acquired output binding; signal-only
diagnostics must identify an existing wire with exactly the same native game
signal in the same chamber. A missing association is omitted rather than guessed.

There is one representative decoration per displayed output. Other physical
objects sharing that output reuse the **same** store address in compact platform
headers. Multiple route platforms are not presented as separate native functions
or independently compiled basic blocks.

RACE's `spanMaster` remains associated with the existing `receiver-master` wire,
with no physical platform binding. Its environmental string describes accepted
signal state. It does not invent a machinery binding, CFG edge or timer.
The original assets also retain helper outputs such as unlock candidates without
requiring additional decorations.

Authored unstable platforms retain `UNSTABLE`. They have no mapping to proven
unreachable BCF clones. The detailed evidence inspector remains the separate
place to inspect those proof-backed clones.

## State-linked code and accepted state

`native-world-render.ts` retains static header support and legacy rendering
checks. Its old 25 non-RACE diagnostic listings are unconditionally suppressed,
including while the replacement data is loading or unavailable. RACE's existing
replacement gates remain unchanged. The environmental renderers select separate
verified zero/one records; they never edit an immediate on a fixed native record.
The store accent associates the accepted result with a record, not an instruction
executing. Status and colour independently use accepted binding semantics.

World panels do not load or replay traces. HANDSHAKE and USE AFTER FREE have
exhaustive retained traces; CROSSFEED, RACE and DEADLOCK have representative
coverage. Neither kind of coverage licenses a fabricated current path. The
existing representative-trace inspector remains distinct from the new RACE
cargo detail. CONTROL SPINE's retained trace presentation is unchanged.

[`src/coop/native-world-evidence.ts`](../src/coop/native-world-evidence.ts) copies
only accepted room output snapshots and physical projections. It never consumes
local pending-control prediction. In particular:

- CROSSFEED routes distinguish raw `leftRoute`/`rightRoute` from the existing
  grace-inclusive `physicalLeftRoute`/`physicalRightRoute` projection.
- RACE distinguishes raw phase/return outputs from their physical projections.
  Its countdown, buffer scheduler and temporal transitions remain server-owned.
- USE AFTER FREE retains `assistBlocked` as the raw native output and applies
  the recorded inversion once for the final lift's displayed power.
- Raw declarative exit requests remain separate from the server's durable exit
  latch. Temporal `exitDoor` is a projection of that latch, not a native action
  which creates it.
- Displayed power/open state is not a collision guarantee. Authored crumble
  phases and other physical constraints remain independently authoritative.

A restrained store accent and authored string reveal mark meaningful accepted
changes, not CPU execution. Disconnected panels show subdued last-known state. These presentation
values never flow back into the authoritative controller or physics.

## Browser loading and rendering limits

The world loader fetches `/evidence/coop/<chamber>.world.json` for an eligible
accepted campaign room. The independent environmental loader adds only that
room’s bounded `.environment.json`; RACE retains its two existing compact assets. Large inspector disassembly/traces remain lazy-loaded
separately and are not imported into the default JavaScript bundle. Public custom
rooms, developer drafts, the Level Builder and solo tutorial rooms are excluded;
a custom draft based on a campaign layout does not inherit its specimen.

Successful loads are cached per chamber; concurrent requests are shared. A
request generation check prevents a late response from the previous room
replacing the current chamber. Runtime validation checks the asset's structure,
chamber/specimen identity, output names, contiguous instruction representation
and store membership. Exact acquired provenance is established by the build-time
check, without downloading PEs into browsers.

Loading, malformed-asset and network failures leave ordinary platform labels and
all gameplay functioning. No fallback assembly is generated. Failed loads may
retry on room re-entry or reconnect. Repeated render frames do not repeatedly
fetch or retry failed assets.

Environmental blocks have authored world rectangles, 12-unit monospace, fixed
line slots and short state strings. They scale naturally with the camera and
are culled by their real bounds. They never reflow, dock or become floating name
tags. The .4-second authored reveal and .45-second store pulse respect reduced
motion, pause and connection state. Lifecycle tracking continues while culled.
Room/instance changes and fresh reconnection snapshots establish settled baselines.
No machinery hitboxes, player names, cube authority or camera physics change.

## Verification and review

- `tests/native-world-provenance.test.ts` checks deterministic artifacts, exact
  acquired provenance, tamper rejection, output/object associations, shared
  headers, binding inversion and physical projection mappings.
- `tests/native-world-evidence.test.ts` checks accepted-state resolution, loading,
  chamber changes, stale responses, missing assets and custom-room exclusion.
- `pnpm check:world-assembly` exercises the in-world presentation in actual
  browsers. Screenshots are stored under
  [current environmental review](playtest/2026-10-22-coop-environment/README.md);
  the 20 October gallery records the superseded diagnostic design.
- `BN_NATIVE_WORLD_REVIEW=1 pnpm check:campaign` observes accepted panel values
  at the existing real-input campaign route captures, without changing puzzle
  state or camera framing. The focused art captures use the existing presentation
  camera override and are distinct from the full physical solve.
- Existing campaign, multiplayer, character, workbench, native inspector and
  observability checks remain required regression evidence. Automated provenance
  tests do not constitute visual acceptance or prove geometric solvability.

The dated handoff records the completed visual review, checks and limitations.
Delivery follows current AGENTS.md: reconcile main, commit/push and monitor the
existing CI-gated Fly deployment. Human playtesting may refine decoration;
expanding gameplay or binary contracts remains a separate decision.
