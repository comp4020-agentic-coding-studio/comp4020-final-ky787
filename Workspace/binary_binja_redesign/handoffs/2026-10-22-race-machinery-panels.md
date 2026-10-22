# RACE distributed machinery panels — 22 October 2026

Base: current `main` / `origin/main` at
`5069e24f1a595b7a4652cd95aae14af815152da6`. Delivery follows AGENTS.md: focused
commit on main, normal push, existing CI-gated Fly deployment. The unrelated
CLAUDE.md changes, three deleted historical handoffs and draft-room edit were
preserved and excluded from the implementation commit.

Modernised spanMaster, phaseA, phaseB, returnBridge and exitDoor. Each is a fixed
328 × 124 world decoration near its existing machinery location, using the cargo
blocks' 12px monospace, quiet backing, muted code and restrained green/red store
accent. Three to five authentic instructions and one short authored decoded
string replace diagnostic headers/addresses/RAW/POWER/GRACE/LATCH footers.
Camera pans, zoom and viewport size only scale/cull them; they never reflow.
Visual review raised only EXIT from y=570 to y=530 to clear Cube B's route.

The four cargo blocks, their excerpts, positions and animations remain unchanged.
The old renderer suppresses all nine superseded RACE listings when their accepted
presentation views are present, including asset-loading/failure states. Original
static platform address identities and other chambers are retained.

New durable contract: `docs/race-machinery-panels.md`. Implementation:
`src/coop/race-machinery-{types,evidence,integrity,inspector}.ts`,
`src/slice/race-machinery-{presentation,render}.ts`, with narrow integration in
game/render/native-inspector and existing binding semantics. The new generator
is `scripts/native/race-machinery-evidence.ts`; no evidence machinery was rebuilt.

Recovered all ten already-observed genuine stores from the original acquisition:
span `198A/191E`, phase A `1B4D/1AE1`, phase B `1D10/1CA4`, return `1E5E/1DF2`,
exit `1FAC/1F40` (RVA, zero/one). Displayed static context includes the saved
master CMP, phase saved-Boolean reload/TEST/JNE, phase CMP/SETNE, and return
CMP/SETNE/spill. Separate excerpts keep explicit `...` in gameplay and full
boundaries/bytes/addresses/block IDs in Evidence. Opaque guards are excluded;
JNE operands retain their actual destinations. No trace execution is inferred.

`race-condition.machinery.json` is **16,753 bytes / 24,000 budget**, 20 fragments.
Build verification checks manifest source hashes, exact PE bytes, block order,
contiguity, observed store identity/value/output offset and existing targets.
Runtime SHA-256 pinning, caching, stale-response protection and failure isolation
keep the new asset independent of gameplay and cargo. Large disassembly/trace
files load only on explicit Evidence access.

Raw accepted native output selects the actual store. Existing physical bindings
select phase/return power strings and colours, including server grace; EXIT uses
the persisted unlock; SPAN is only a wire signal. No local grace timer is added.
Authored strings reveal over 0.4s; store/power transitions pulse over 0.45s.
Repeated snapshots do not restart them. Disconnects mute last-known code, fresh
receipt is required after reconnect, and pause/reduced motion settles effects.

Validation completed:

- TypeScript plus 107 focused cargo/machinery/world rendering, evidence and
  provenance tests passed.
- `pnpm check:native` passed, including original tables/world assets and both
  compact RACE checks; production build passed (existing chunk-size advisory).
- `pnpm check:world-assembly`: 178 assertions passed; other chambers, CONTROL
  SPINE, custom isolation and fallback retained.
- `pnpm check:race-machinery-browser`: 97 assertions; real two-visitor route
  completed, including five grapple platforms and both exit arrivals. Real
  phase grace was observed with raw A false, physical A true and its zero-store.
- Cargo browser regression: 54 assertions passed, timely transfer, expiry and
  second attempt, overlap, ordinary operator views and reduced motion.
- `pnpm check:native-evidence`: 9 assertions passed; RACE inspector also checked
  in the completed RACE route.
- Frozen study Python audit and `reference.mjs --check` passed before/after.

Screenshots and detailed view/state/viewport index:
`docs/playtest/2026-10-22-race-machinery/README.md`. Personally inspected nearby
active/inactive, ordinary operator, 1024-wide, zoomed-out, cargo comparison and
Evidence screenshots. Camera-only detail framing is clearly labelled, separate
from live input-driven state changes. No remaining automated failures.

No acquisition/study files, PE, native tables, protocol, controller, server
scheduling, physics, collisions, grappling, cube authority, persistence, geometry,
camera behaviour or Level Builder changes. Evidence limits remain: state-linked
decoration is not live trace replay; phase B power is not proof every authored
unstable platform is currently solid; platform headers are static identities.
Remaining human review is visual preference/contrast on other machines, not an
uncompleted cooperative route.
