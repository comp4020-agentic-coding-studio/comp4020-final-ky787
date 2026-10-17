# Native-backed cooperative controller integration — 2026-10-17

Integration of the five verified Windows-native OLLVM-16 BCF co-op controllers
into the cooperative campaign, so server-authoritative gameplay decisions come
from the verified native-result tables, with authentic native assembly evidence
in the inspector. Handoffs are working notes; the durable contract lives in
`docs/adr/0011-native-backed-coop-controllers.md`.

## 1. Git commits

- Acquisition package / branch base: `7e510db` on `origin/codex/coop-native-controllers`.
- `main` unchanged at `1315c36`.
- Integration branch: `feat/coop-native-integration` (off the acquisition commit).
- Integration commits on top of `7e510db`:
  - `dfa4399` — native BCF result tables drive the five chambers (generator + server).
  - `482b8cd` — native co-op evidence inspector + docs.
  - `92ff7bb` — this handoff.
- Pre-existing unrelated edits to `CLAUDE.md` and `levels/drafts/blank-room.json`
  were preserved and excluded from every commit.

## 2. Portable acquisition verification

`python3 -I -B experiments/coop-controllers/shared/verify_portable.py` PASSES for
all five chambers at the acquisition commit `7e510db`
(`.workbench/reports/2026-10-17-native-integration/verify-at-acquisition-commit.json`).
The `experiments/` package is byte-for-byte unchanged (git clean). On the
integration branch the verifier's reference-source-hash pin intentionally flags
the four integrated server files; the authored controller semantics it validates
(`levels/campaign/*.json`, `src/workbench/evaluate.ts`,
`src/coop/{crossfeed-vault,race-condition}.ts`) are unchanged. The native
evidence package was never modified to make validation pass.

## 3. Linux baseline

Before integration, on Linux: `pnpm typecheck`, `pnpm test:unit` (603 pass / 2
skip), `pnpm build`, `pnpm check:evidence`, `pnpm check:campaign` (78 checks),
`pnpm check:public-coop`, `pnpm check:workbench`, `pnpm check:uplink` all passed.
The 14 Windows room-storage `EPERM`/`fsync` failures reported by acquisition did
not reproduce on Linux. Reports under
`.workbench/reports/2026-10-17-native-integration/baseline/`.

## 4. Generated native artifacts

`scripts/native/generate-tables.ts` (`pnpm gen:native`, verified by
`pnpm check:native`, included in `pnpm check`):

- Server bit-packed truth tables (retained native BCF outputs), ~100 KB total:
  `server/native/tables/{handshake,deadlock,use-after-free,crossfeed-vault,race-condition}.json`.
- Lazy-loaded inspector evidence under `public/evidence/coop/` (served from
  `dist/evidence/coop/`, ~8 MB, never bundled into the game JS): per-chamber
  `*.evidence.json`, `*.traces.json`, `*.disasm.json`, plus `manifest.json`.

Each table records its `native_results_sha256`, `contract_sha256`,
`bcf_pe_sha256`, `clean_pe_sha256` and a `table_sha256` over the decoded matrix.
Each evidence file carries the `source_sha256` of the acquired gzip it was built
from; all match the live package.

## 5. Outputs now native-backed

All five chambers' server-authoritative controller outputs:

- HANDSHAKE: crossingPower, liftPower, relayPower, exitReady.
- DEADLOCK: cargoLift, shaftFirewall, serviceRelay, hatchOpen, payloadReady.
- USE AFTER FREE: launchPower, routeA, routeB, routeC, assistBlocked, exitReady
  (assistBlocked inverted once to finalLift; retry inversions preserved).
- CROSSFEED VAULT: the full combinational projection (raw outputs, grace-inclusive
  physical route power, exitUnlockCandidate).
- RACE CONDITION: the full combinational projection (raw outputs, grace-inclusive
  physical phase/return power, exitUnlockCandidate), with the four-valued
  bufferPhase passed in from the server.

## 6. Mechanics still server-owned

Occupancy arbitration, player/cube ownership, persistent controls, checkpoints,
timer scheduling, crumble state/timing, exit latching, two-player arrivals,
multiplayer generations/revisions; the RACE buffer scheduler and CROSSFEED
grace/toggle clocks. `exitDoor` projects the persisted server latch; native code
never sets it or completes arrivals.

## 7. Displayable native traces

Coverage: HANDSHAKE 32/32 states, USE AFTER FREE 32/32 states, DEADLOCK,
CROSSFEED VAULT and RACE CONDITION 32 representative traces each. For a current
declarative state with a matching retained trace the inspector shows that exact
trace; otherwise it shows validated outputs and verified static store sites, with
a clearly labelled representative sample, and states no matching dynamic trace
was retained.

## 8. Evidence inspector

`src/coop/native-evidence.ts` + `src/coop/native-inspector.ts` render into the
existing `#evidence` aside for native-backed co-op chambers, separate from the
CONTROL SPINE inspector. Lazy-loads on open. Shows the status label
`VALIDATED OLLVM BCF`, the obfuscated PE hash, compiler/pass metadata, current
validated outputs, per-output verified store sites (real instruction bytes/RVAs),
retained/representative traces, and proven-bogus clones with their proof formula,
assumptions and limitations. Never claims the PE executes live on the server;
never maps a bogus clone to an authored crumble platform.

## 9. Known limitations

- Temporal chambers retain representative (not exhaustive) dynamic traces, so the
  current-state inspector view for CROSSFEED/RACE usually shows a labelled sample.
- The standalone `pnpm check:race` browser warm-up (`launchDeck` air-steering
  hops) is flaky on this Linux host independent of this change — it also fails on
  the unmodified baseline (`1315c36`/`7e510db`). RACE is covered deterministically
  by `pnpm check:campaign`.
- Human two-player playtesting remains outstanding (as for the prior campaign).
- Bogus-clone proofs hold under their documented normal-entry/intact-code
  assumptions; an unobserved block is not treated as proven unreachable.

## 10. Full campaign regression

`pnpm check:campaign` — all five chambers solved with two independent browser
identities and real controls, native-backed server controller enabled (not a
mock fallback). Reports in `.workbench/reports/2026-10-17-native-integration/`.

## 11. Browser screenshots

`docs/playtest/2026-10-17-native-coop/handshake-native-evidence.png` — the
HANDSHAKE native evidence inspector showing the verified PE hash, OLLVM metadata
and proven-bogus clones with honest caveats.

## 12. Production-build compatibility

`pnpm build` passes; the browser-boundary audit confirms no Node service reaches
the bundle. The Dockerfile already ships `server/` (native tables) and `dist/`
(evidence). Production depends on neither `experiments/`, a compiler, WSL, nor
the Windows checkout. Fly configuration unchanged.

## 13. Unresolved issues for human review

- Confirm the restrained evidence presentation (button + inspector, no assembly
  over the live playfield) matches the intended feel; a later milestone can add
  contextual previews or bogus-block puzzle mechanics.
- Human two-player playtest of all five native-backed chambers on two machines.
- Decide whether to re-pin the portable verifier's reference-source hashes to the
  integration branch, or keep the acquisition-commit verification as the record.
