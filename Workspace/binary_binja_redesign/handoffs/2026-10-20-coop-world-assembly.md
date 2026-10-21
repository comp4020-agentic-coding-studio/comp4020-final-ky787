# Cooperative world assembly — 20 October 2026

## Delivery boundary

Implemented on `feat/coop-world-assembly`, based on `origin/main` at
`a04614fefe6bbc65eaa710095555dccb2e60549e`, in the isolated worktree
`/tmp/binary-ninja-coop-world-assembly`. The original working tree's unrelated
CLAUDE, draft and historical-handoff edits were preserved.

This branch is for review after Crit 10. **No merge, deployment, production
configuration or credential changes were performed.** The repository deployment
workflow only deploys main. Local browser results below are not production checks.

## Implementation

All five native campaign chambers now display genuine static output-store
excerpts beside selected machinery, with shared native addresses on associated
code platforms. HANDSHAKE was implemented and visually reviewed first. Separate
cosmetic mappings then placed CROSSFEED routes, RACE phases and wire diagnostics,
DEADLOCK equipment, and USE AFTER FREE route/lift panels.

The deterministic generator reads existing integration mappings, acquired
disassembly and frozen PEs. It validates source identities, PE bytes, addresses,
RVAs, decoded instructions, basic-block membership, contiguous order, output
stores and actual object bindings. Five lazy `.world.json` files total **68,893
uncompressed bytes**. `pnpm check:native` now includes their read-only provenance
check. No acquired artifacts, canonical campaign JSON, controller tables or
physical room definitions were rewritten.

Excerpts contain two pointer loads and their recorded write-one store, labelled
`STATIC / WRITE 1`. They identify output-buffer access, not the whole Boolean
calculation or a current CPU execution path. The store-row marker is static.
Accepted raw values and physical power/open status are separate.

The loader consumes accepted room snapshots, excludes custom drafts and solo
rooms, caches successes and guards loading races. Failure preserves ordinary
labels and gameplay; it never generates replacement assembly. The renderer
culls offscreen panels and collapses listings below 0.8 zoom. There are no
controller, physics, hitbox, protocol, server or persistence changes.

Special cases remain explicit:

- Shared route platforms reuse one native store identity.
- CROSSFEED and RACE physical projections retain server-owned grace/timing.
- `assistBlocked` retains its raw value and inverted lift-power binding.
- RACE `spanMaster` identifies the existing `receiver-master` wire. It has no
  synthetic machinery binding; the panel reports `SIGNAL` with physical state
  absent.
- Exit requests remain distinct from the server's durable latch.
- USE AFTER FREE instability is authored gameplay, never labelled proven bogus.
- CONTROL SPINE retains its existing evidence renderer and trace behavior.

The durable contract and regeneration instructions are in
[`docs/native-world-assembly.md`](../../../docs/native-world-assembly.md).

## Validation

| Command / review | Result |
| --- | --- |
| `pnpm typecheck` | Pass, including final signal-only mapping |
| `pnpm check` | Pass: 734 unit tests across 76 files, 3 pre-existing skips; 3 HTTP tests across 2 files |
| `pnpm build` | Pass; existing large-chunk advisory remains |
| `pnpm check:native` | Pass: 21 existing generated artifacts plus 5 world artifacts |
| `pnpm check:native-evidence` | Pass: 9 browser checks |
| `pnpm check:world-assembly` | Pass: 156 browser assertions |
| `BN_NATIVE_WORLD_REVIEW=1 pnpm check:campaign` | Pass: all five real-input two-player solves, 151 checks, 72 read-only native render observations |
| `pnpm check:public-coop` | Pass: 49 browser checks |
| `pnpm check:workbench` | Pass: 56 browser checks |
| `pnpm check:character` | Pass: 77 browser checks |
| `pnpm check:observability` | Pass: 19 browser checks, including actual cooperative activity/completion |
| Frozen source audit | 220 tracked binary/acquisition/table/campaign/CONTROL SPINE files byte-identical to HEAD |

The final unit run includes 51 focused world-evidence, loading/state and rendering
tests. Coverage includes tamper rejection, shared mappings, inversion, local
prediction versus accepted state, exact chamber isolation, cache/races, missing
assets, reduced display detail and wire-only signal semantics.

The HTTP portion of `pnpm check` requires a running server. An initial attempt
without one failed at that prerequisite; the complete command was rerun
successfully with an isolated temporary-data server. The character browser test
also exposed an existing synchronization race: profile readiness precedes
persisted-party reconnect. It now explicitly waits for the saved HANDSHAKE
connection before leaving it. All existing assertions remain; the complete
character test passed afterward.

The complete campaign solve preceded the last RACE cosmetic panel adjustment and
wire diagnostic. Final typecheck, full unit/native checks, production build and
all five chambers' focused browser review were rerun afterward. No puzzle or
input-route logic changed.

Local command logs and result summaries are in `/tmp/bn-world-regression/`.
The full 79-file campaign capture remains in the worktree's ignored
`.workbench/reports/native-world-campaign/`; seven representative route images
and its check/observation reports are retained in the reviewed directory.

## Visual review and performance

[`docs/playtest/2026-10-20-coop-world-assembly/README.md`](../../../docs/playtest/2026-10-20-coop-world-assembly/README.md)
indexes 27 focused browser captures plus the representative physical-route
captures. Actual Canvas text and visible pixels were checked against each
chamber's acquired instructions. Screenshots were inspected for overlap,
readability, names, machinery visibility, overview behavior and CONTROL SPINE
regression.

Layout corrections moved panels away from the HANDSHAKE checkpoint/exit banner,
DEADLOCK formula, RACE phase caption/firewalls, and USE AFTER FREE headers/retry
shelves. The narrow CROSSFEED gallery header omits redundant status text so its
native address fits. Purple cubes and green receivers retain their appearance.
The art harness only adjusts the presentation camera; active/inactive HANDSHAKE
uses real accepted player contact. Full campaign captures retain the normal
moving camera and real input routes.

A bounded local headless sample of 120 animation-frame intervals after ten
warm-up frames measured median 16.7 ms and p95/max 16.8 ms with three visible
panels. The missing-asset view with zero panels measured the same intervals.
This is an observation, **not an isolated benchmark or production performance
claim**: connection counts differed and bounded Canvas instrumentation was
enabled. No telemetry, network messages or server work were added.

## Remaining limitations and review

Static stores intentionally do not show full logical calculations or claim
execution without a matching trace. Overview omits assembly detail. Normal
moving players/cubes and existing HUD elements can pass in front of decoration;
panels near viewport edges are naturally clipped. The runtime validates asset
shape/specimen; exact cryptographic provenance is checked during generation and
tests rather than downloading binaries to the browser.

No blocking local regression remains. Human review after Crit 10 is still
required before merging or deploying this feature.
