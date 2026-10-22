# Co-op environmental assembly — 22 October 2026

Implemented on main from `528a7cc9407d964002097585a43544d2661f7ea6`, after
fetching and confirming origin/main. Delivery uses the existing check-gated Fly
workflow. Unrelated CLAUDE.md/draft changes and three existing handoff deletions
were preserved; instruction files were not rewritten.

All 25 old placements are replaced one-for-one: HANDSHAKE 4, CROSSFEED 10,
DEADLOCK 5, USE AFTER FREE 6. The authoritative
[presentation contract](../../../docs/coop-environmental-assembly.md) contains
the initial plan, final 25-row bounds/target/group table and exact native sites.
The final gallery and labelled ordinary/detail captures are indexed in
[the visual review](../../../docs/playtest/2026-10-22-coop-environment/README.md).

## Implementation

- One shared `environmental-{layout,presentation,render}.ts` subsystem uses fixed
  world rectangles, 12-unit subdued code, a real selected store accent and one
  short authored string. Local groups are adjacent independent snippets without
  an enclosing dashboard. There is no camera-dependent repositioning or reflow.
- HANDSHAKE stays sparse; its lift and relay ended up separate after active LINK
  exposed a wire crossing. CROSSFEED retains ten local placements, including a
  right-route/gallery pair. DEADLOCK's upper completion pair sits above its
  payload wire. USE AFTER FREE follows the climb, with B/C aligned locally and
  assist kept clear of its field and retry wire. Only decoration moved.
- `environmental-{types,evidence,integrity,inspector}.ts` separates native data,
  accepted state and authored presentation. Raw accepted output chooses a real
  zero/one record. Existing bindings separately determine colour/message,
  including CROSSFEED grace, UAF inverted assist and persisted exit latches.
- The .4-second message reveal and .45-second store pulse affect only changed
  members. Initial/unknown/offline/reconnect/reset/pause/reduced-motion handling
  establishes settled baselines; culled blocks still update lifecycle.
- The compact loader caches successful chamber assets, pins exact bytes, rejects
  stale responses and requires a fresh receipt after disconnection. Failures
  remain local; old diagnostic cards stay suppressed. Static platform address
  bars still use the original world assets.
- Evidence exposes both alternatives, context, bytes, VA/RVA, blocks, offsets,
  observed case counts and specimen/source hashes. Existing sample/live trace
  distinctions remain intact. An asynchronous inspector refresh bug caught by
  browser validation was fixed with two focused regression tests.

## Provenance and payload

`scripts/native/environmental-evidence.ts` deterministically generates four
assets, with non-writing checks included in `pnpm check:native`. Every displayed
instruction comes from its own chamber's existing OLLVM-BCF Windows acquisition.
All 50 genuine zero/one stores were recovered and checked against exact PE bytes,
original blocks/order, output offsets and retained trace memory-write records.
There are 100 separate three-instruction fragments. Short context/store subsets
use bare `...`; adjacency never asserts a CFG edge or current execution.

Runtime sizes: HANDSHAKE 12,783/16,000 bytes; CROSSFEED 31,516/40,000;
DEADLOCK 15,568/20,000; UAF 19,044/24,000. Total 78,911 bytes, with only the
current chamber loaded. Original five world assets remain 68,893 bytes under
their unchanged 75 KB guard. No full disassembly or trace payload loads for
ordinary decoration. There are no unavailable store alternatives.

## Validation and visual review

- `pnpm check`: typecheck, every native/generated-asset check, 834 unit tests
  passed (2 existing skips), and three HTTP tests passed.
- `pnpm build` passed; existing large-chunk advisory remains. `pnpm check:evidence`
  passed. Frozen RACE study Python audit and `reference.mjs --check` passed.
- Final `check:world-assembly`: 548 checks, all 25 placements, fixed bounds and
  Canvas text, narrow viewports, culling, Evidence/failure/custom isolation.
- Combined world plus real HANDSHAKE/UAF routes: 622 checks, both arrivals.
  Full five-chamber campaign: 225 checks, all 25 outputs observed at both raw
  values, live CROSSFEED grace, reconnect and server-restart restoration.
- `check:native-evidence`: 9 checks. RACE cargo timely/expiry/overlap: 54 checks.
  Solo C8/CONTROL SPINE route: 120 checks, no console errors.
- Personally inspected final initial/active/locked/unlocked, normal player,
  camera-only detail, overview and 1024×768 views. Active views prompted the
  HANDSHAKE lift, CROSSFEED anchor, UAF B and assist wire-clearance refinements.
  The final gallery identifies camera-only captures separately from real routes.

The first combined route hit a selector-wrapper error on the HANDSHAKE victory
screen; the specific selector probe was corrected and both routes rerun. The
first inspector check exposed the loading-refresh bug noted above. Failure
receipts and successful reruns are retained in the gallery; no gameplay route
assertion or native check was weakened.

All 154 acquisition-manifest files were independently rehashed successfully.
Acquisition/study, binaries/tables/contracts/protocol, server state/timing,
physics/geometry/camera/grappling/cubes, persistence, Level Builder and character
profiles remain unchanged. Nine RACE blocks and CONTROL SPINE implementation,
assets and native contracts are unchanged. Other solo/tutorial/lab/custom rooms
do not acquire this evidence.

Remaining work is human visual/cooperative review. Distant code intentionally
shrinks or clips. Semantic fixtures cover a latched unlock differing from its
raw result; the live route does not claim to have captured that exact divergence.
These are state-linked decorations, not execution replay or proof that every
moving-player/cube combination is visually unobstructed.
