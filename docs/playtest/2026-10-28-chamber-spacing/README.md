# Chamber layout and spacing — 2026-10-28

Baseline: `d5817a2` (fetched current `main`). The redesigned machinery (breakpoint
≈164 units wide, pressure pads 96, lift emitter, gateways) had grown into each
other where the original placeholder footprints were smaller. This pass makes
small, coordinated geometry changes to separate them. Mechanics, physics,
controller logic, binary evidence, assets and persistence are unchanged.

All images are actual browser Canvas captures from real two-browser sessions:
real menu, walking and pressure-plate input. Fixed review views use the
renderer's existing presentation-only `editorCamera`; no world or party state
is injected. Full raw matrices remain in `.workbench/reports/2026-10-28-spacing/`
(`before/`, `after-same-camera/`, `after/`, plus solve and campaign reports).
`scripts/spacing-browser-review.ts` reproduces them (`BN_SHOTS`,
`BN_SPACING_VIEWS`, `BN_SPACING_LIFT_PLATE`).

## HANDSHAKE — changed

See the [chamber document](../../chambers/handshake.md#chamber-spacing--2026-10-28)
for the full coordinate table, wire routes and reasoning.

| Area | Before | After (same camera) | After (camera follows moved machinery) |
| --- | --- | --- | --- |
| Start area, both players | [1920](screenshots/handshake-01-start-both-players-before-1920.png) · [1024](screenshots/handshake-01-start-both-players-before-1024.png) | [1920](screenshots/handshake-01-start-both-players-after-same-camera-1920.png) · [1024](screenshots/handshake-01-start-both-players-after-same-camera-1024.png) | [1920](screenshots/handshake-01-start-both-players-after-1920.png) · [1024](screenshots/handshake-01-start-both-players-after-1024.png) |
| BREAKPOINT, lift, pads | [1920](screenshots/handshake-02-breakpoint-lift-pads-before-1920.png) · [1024](screenshots/handshake-02-breakpoint-lift-pads-before-1024.png) | [1920](screenshots/handshake-02-breakpoint-lift-pads-after-same-camera-1920.png) · [1024](screenshots/handshake-02-breakpoint-lift-pads-after-same-camera-1024.png) | [1920](screenshots/handshake-02-breakpoint-lift-pads-after-1920.png) · [1024](screenshots/handshake-02-breakpoint-lift-pads-after-1024.png) |
| Lift powered (real LIFT contact) | [1920](screenshots/handshake-03-lift-powered-before-1920.png) · [1024](screenshots/handshake-03-lift-powered-before-1024.png) | [1920](screenshots/handshake-03-lift-powered-after-same-camera-1920.png) · [1024](screenshots/handshake-03-lift-powered-after-same-camera-1024.png) | [1920](screenshots/handshake-03-lift-powered-after-1920.png) · [1024](screenshots/handshake-03-lift-powered-after-1024.png) |
| Left-hand crossing | [1920](screenshots/handshake-04-crossing-before-1920.png) · [1024](screenshots/handshake-04-crossing-before-1024.png) | [1920](screenshots/handshake-04-crossing-after-same-camera-1920.png) · [1024](screenshots/handshake-04-crossing-after-same-camera-1024.png) | — (crossing unchanged) |
| Zoomed-out overview (Tab) | [1920](screenshots/handshake-05-overview-before-1920.png) · [1024](screenshots/handshake-05-overview-before-1024.png) | [1920](screenshots/handshake-05-overview-after-same-camera-1920.png) · [1024](screenshots/handshake-05-overview-after-same-camera-1024.png) | (overview fits the room) |
| Ordinary follow camera from spawn | [1920](screenshots/handshake-follow-player-1-before-1920.png) · [1024](screenshots/handshake-follow-player-1-before-1024.png) | — | [1920](screenshots/handshake-follow-player-1-after-1920.png) · [1024](screenshots/handshake-follow-player-1-after-1024.png) |

Floor footprint gaps, left to right (pad base ±48, lift field, breakpoint footing
±82, gateway pylons and flare): **before** −28 / −12 / −30 / +48;
**after** +32 / +38 / +40 / +48 (CROSSING → lift → BREAKPOINT → LIFT → ENTRY POINT).

## Other chambers — audited, not changed in this pass

A read-only audit inspected the ordinary-camera and overview captures in
`.workbench/reports/2026-10-28-spacing/before/` for CROSSFEED VAULT, RACE
CONDITION, DEADLOCK and USE AFTER FREE, plus earlier solo captures. It derived
footprints from the render code, then independent skeptics tried to refute each
candidate. Some verifier calls failed when the course API budget ran out, so the
vote is incomplete where marked. These are recorded findings, **not fixed yet**.
Each real fix moves a route-critical pad, spawn or receiver that has its own
tested scenario, so it needs its own solve rerun.

| Room | Finding (severity) | Verifier outcome |
| --- | --- | --- |
| CROSSFEED VAULT | PAYLOAD/LIFT receiver inside the shared ENTRY POINT; lift emitter under its left pylon; plate A 5 units from the right flare (high) | Verification failed (budget). Visible in the before captures |
| CROSSFEED VAULT | SYSTEM ONLINE caption vs ROUTE SELECT caption; exit gateway vs LEFT/RIGHT scanners (medium) | Confirmed, rated medium/low |
| DEADLOCK | FEED pad overlaps the P1 ENTRY POINT pylon by ~44; GATE service caption touches the gateway; P2 gateway vs cube B (high/medium) | Confirmed |
| DEADLOCK | Instruction vs CARGO HOVER label; overview receiver badges vs exit badge (medium) | Confirmed |
| RACE CONDITION | PHASE caption overprinted by its own interaction hint (high) | Confirmed |
| RACE CONDITION | DROP A inside the ENTRY POINT lanes; RECEIVER caption near the gateway header; TRACE vs PHASE (low) | Refuted: readable as is |
| USE AFTER FREE | ASSIST / RELEASE C pad vs the exit gateway's left pylon and arrivals counter (high) | Confirmed, rated medium |
| USE AFTER FREE | Operator-floor captions under mounted pads; instruction labels vs lift fields (low) | Mostly refuted; one caption overlap confirmed low |
| CONTROL SPINE | PLATE A pad vs ENTRY POINT pylon; relay gate A caption vs the gateway header (high/medium) | Confirmed. Validated five-input/seven-output contract: treat changes as high-risk |
| PRESSURE / SWITCH / RELAY | MOCK SIGNAL display vs exit header (PRESSURE, medium); other items low | PRESSURE display confirmed; the rest refuted |

The starting areas of RACE CONDITION and USE AFTER FREE read acceptably at normal
zoom. SWITCH and RELAY were judged acceptable.

## Validation

| Check | Result |
| --- | --- |
| `pnpm level:validate levels/drafts/handshake.json` | Playable, no diagnostics; `draftHash` `788de3d6…`. Campaign and draft are byte-identical |
| `pnpm typecheck` | Pass |
| `pnpm test:unit` | 92 files, 919 passed, 3 pre-existing skips. Includes the HANDSHAKE extraction (13), recovery and boost-separation tests unchanged against the new draft |
| `pnpm check:native` | Pass. All native, world, cargo, machinery and environmental artifacts byte-identical and verified against the moved room |
| `pnpm check:maintenance` | Full 59-step real-input HANDSHAKE solve, both arrivals, zero deaths, 37 PASS / 0 FAIL. The departure walk target moved 1860→1920 to follow the terminal (+60) |
| `BN_WORLD_SKIP_TIMING=1 node scripts/native-world-browser-check.ts --handshake` | Pass. All four moved environmental placements paint authentic instructions with fixed bounds and accepted semantics |
| `pnpm check:campaign` | 79 PASS / 0 FAIL. One persistent party solved all five chambers by real input (HANDSHAKE 59 steps, zero deaths); badges, disconnect and server-restart recovery |
| `scripts/spacing-browser-review.ts` (before / after-same-camera / after) | All capture checks pass at 1920×1080 and 1024×768, no browser errors |

These are automated physical and visual checks, not human playtest acceptance.
