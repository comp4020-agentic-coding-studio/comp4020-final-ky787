# Native-backed cooperative controllers (verified OLLVM BCF lookup)

2026-10-17. The five released cooperative campaign chambers now take their
server-authoritative machinery decisions from verified Windows-native OLLVM-16
Bogus-Control-Flow controller results, not from mock TypeScript expressions.

Acquisition package: `experiments/coop-controllers/` (delivered on
`origin/codex/coop-native-controllers`, commit `7e510db`). Integration branch:
`feat/coop-native-integration`. `main` is unchanged.

## Why a lookup architecture, not live PE execution

The experiment binaries are Windows x64 PEs; the game is hosted on Linux. The
production server must never execute the PEs. Instead, this follows the CONTROL
SPINE precedent: read the verified native results, build compact deterministic
lookup artifacts, validate them against the acquired evidence, and consume those
verified results inside the existing server controllers. The interface states
this honestly: `VALIDATED OLLVM BCF` / `NATIVE-VERIFIED OUTPUTS`, with the note
that the Linux server reads a verified lookup table and does not execute the PE.

## Generation pipeline

`scripts/native/generate-tables.ts` (run with `pnpm gen:native`, checked with
`pnpm check:native`) reads the acquired package and emits:

- `server/native/tables/<chamber>.json` — a bit-packed Boolean truth table whose
  values are the retained native BCF outputs, indexed by case id. Server-only;
  never imported into the browser bundle. All five tables total ~100 KB.
- `public/evidence/coop/*.{evidence,traces,disasm}.json` and `manifest.json` —
  compact lazy-loaded evidence for the inspector, served from `dist/evidence/coop/`,
  never bundled into the game JavaScript.

The generator refuses to write if any case's native BCF result disagrees with the
retained clean/expected results, if a case id does not match the encoding of its
own input vector, or if PE/contract identities drift. `pnpm check:native`
verifies the committed artifacts are reproducible and in `pnpm check`.

### Case-id encoding (single source of truth: `server/native/contracts.ts`)

- declarative chambers and CROSSFEED: `id = Σ input[i] << i`.
- RACE: `id = (boolMask << 2) | bufferPhase`, where `bufferPhase` is the
  four-valued enum `0 idle / 1 window / 2 released / 3 expired`, not a Boolean.

## What is native-backed, and what stays server-owned

The native controllers are stateless combinational decision layers. The server
keeps everything else: occupancy arbitration, player/cube ownership, persistent
controls, checkpoints, timer scheduling, crumble state, exit latching, two-player
arrivals, multiplayer generations/revisions, and the RACE buffer scheduler and
CROSSFEED grace clocks.

### Declarative chambers (HANDSHAKE, DEADLOCK, USE AFTER FREE)

`declarativeDefinition(draft, evaluateOutputs?)` takes a pluggable output
evaluator. Custom/workbench sessions keep the authored mock (`evaluateDraft`);
the released campaign chambers inject `nativeDeclarativeEvaluator(chamber)`
(`server/native/declarative.ts`), which maps resolved device values to native
inputs via the contract's game-port mapping and returns the retained native
outputs. All binding inversions remain in `draftFrame`, applied exactly once —
USE AFTER FREE's `assistBlocked → finalLift` inversion and the retry-shelf
inversions are unchanged. DEADLOCK's `serviceRelay = (SAFE AND NOT FEED) OR
payloadReady` and `payloadReady = payloadOne AND payloadTwo AND payloadThree`
are preserved exactly (verified against the native table).

### Temporal chambers (CROSSFEED VAULT, RACE CONDITION)

`crossfeedDefinitionWith(projection)` / `raceDefinitionWith(projection)` take a
pluggable projection. The default (`mockCrossfeedProjection` /
`mockRaceProjection`) is the authored TypeScript oracle, kept browser-safe for
custom/workbench local preview. The server registry injects the native
projections (`server/native/temporal.ts`), which feed the server's current
temporal observations — including the explicit grace-status inputs and RACE's
`bufferPhase` enum — into the native table and return the three native output
classes the state modules already consume:

- raw combinational outputs (`project(ctx).outputs`),
- grace-inclusive physical power (`project(ctx).physical`),
- the current `exitUnlockCandidate` (`definition.unlock(ctx)`), which the server
  latches separately into `exitDoor`.

The native controller does not advance clocks, latch the exit, schedule the
buffer, or complete arrivals. `exitDoor` continues to project the persisted
server latch; native code never sets it.

## Browser boundary

The runtime adapter (`server/native/adapter.ts`) reads table files with
`node:fs`, so it must never reach the browser bundle. The temporal state modules
therefore stay browser-safe (no native import); only the server registry
(`server/level-definitions.ts`) and `server/multiplayer.ts` import the native
projections. `server/native/contracts.ts` has no Node imports, so the browser
evidence inspector reuses it for the case-id encoding. The production
browser-boundary audit (`vite.config.ts`) passes.

Server `.ts` runs directly under Node's strip-only TypeScript, so these modules
use no parameter properties, enums, namespaces or decorators.

## Evidence inspector

A separate reusable adapter (`src/coop/native-evidence.ts`,
`src/coop/native-inspector.ts`) renders into the existing `#evidence` aside for
native-backed co-op chambers, leaving the CONTROL SPINE inspector untouched. It
lazy-loads the compact evidence on open. For a current declarative state with a
matching retained trace it shows that exact trace; otherwise it shows the
validated outputs, the verified static output-store sites, and a clearly labelled
representative sample, and says no matching dynamic trace was retained. Proven
bogus clones are exposed with their proof formula, assumptions and limitations,
and are never presented as executed code or mapped to an authored crumble
platform.

## Verification

- Portable verifier `shared/verify_portable.py` PASSES at the acquisition commit
  (`7e510db`); the evidence package under `experiments/` is byte-unchanged. On
  the integration branch the verifier's reference-source-hash pin intentionally
  flags the four integrated server files (`declarative-state.ts`,
  `crossfeed-state.ts`, `race-state.ts`, `multiplayer.ts`); the authored
  controller semantics it validates (`levels/campaign/*.json`,
  `src/workbench/evaluate.ts`, `src/coop/{crossfeed-vault,race-condition}.ts`)
  are unchanged.
- `tests/native-adapter.test.ts` checks every table entry against the retained
  native results and independently against the TypeScript oracle, for all
  exhaustive cases of all five chambers (32/64/32/16384/4096), plus physical and
  unlock-candidate projections and loud-failure behaviour.
- `pnpm check:campaign` solves all five chambers with real two-player input and
  the native-backed server controller enabled.
- `pnpm check:native-evidence` confirms the inspector renders real native data.

A missing or stale table makes the native-backed chamber throw; it never
silently falls back to the mock while labelled binary-backed.
