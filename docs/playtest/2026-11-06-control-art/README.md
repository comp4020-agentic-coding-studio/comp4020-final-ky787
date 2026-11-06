# Onboarding hints and signal switches — 2026-11-06

Base: `f7c732381348fdfdcd40e0291fdbcf55f03ba6cf`. Presentation polish only;
no room geometry, movement, grapple, controller, evidence, music or save changes.

The new [signal actuator](../../signal-switch-art.md) replaces the common old
rectangle/lever drawing, including equivalent builder objects. Distinct floating
terminals and breakpoint pedestals retain their existing artwork. The inventory
covers all four tutorials and six campaign rooms; the shared branch also serves
the optional internal labs. [Onboarding signs](../../onboarding-signs.md) document
exact placements and the held-cube diagram.

## Captures

All retained images use the normal gameplay camera. The RELAY, CONTROL SPINE and
RACE close-up fixtures explicitly place the player on an existing floor, then
send real E input. They verify rendering and interaction, not traversal.

| Capture | Observation |
| --- | --- |
| [PRESSURE](pressure-hint.png) | Cube pickup hint, followed by an actual pickup. |
| [SWITCH](switch-hint.png) | Two environmental lines and the new ready lever, before powering the anchor. |
| [HANDSHAKE](handshake-boost.png) | Boost pictogram beside the actual partner-held cube during the complete route. |
| [RELAY](relay-latched-fixture.png) | Green locked handle after real E in an isolated section fixture. |
| [CONTROL SPINE](control-spine-active-fixture.png) | Cyan reversible switch, prompt and CONTROL WING caption separated. |
| [RACE, 1024px](race-phase-fixture.png) | PHASE clear of TRACE ENABLE; both player names remain distinguishable and clear of the housing. |

RACE retains PHASE(655,720) and TRACE(615,720). The actuator's bottom is y696;
the pad's idle tread starts at y714 (18-unit gap). The full timed route still
operates PHASE while holding TRACE. No scenario coordinates or assertions change.

## Checks

- TypeScript and production build pass (existing bundle-size advisory only).
- 91 focused tests in six files pass: slice, hero presentation, authored campaign,
  RACE physics/controller, CROSSFEED world, and camera reveals.
- Focused production-browser script: 60 checks pass across all nine updated public
  levers using E,
  reversal or latch semantics, two-client agreement, 1024-wide hint readability,
  character-label clearance and paused/reduced-motion stillness. Its isolated
  setups are labelled in the script and report; no output/device values are forced.
- Existing SWITCH onboarding route: 18 checks pass, including actual PRESSURE
  pickup, mouse-free jump/hold/swing/release, touch crossing and pause release safety.
- Existing HANDSHAKE maintenance route: 37 checks pass, including the full
  59-step two-player solve, partner-held boost, two arrivals and zero deaths.
- Existing forward RACE route: 27 checks pass: timed cargo, five-anchor traversal, four
  keyboard release transfers, deliberate recovery, cube substitution and both arrivals.

Commands: `pnpm typecheck`, `pnpm build`, focused Vitest selection, and
`node scripts/{control-art,switch-onboarding,maintenance,race}-browser-check.ts`.
RACE used `BN_RACE_FORWARD_ONLY=1`. `BN_SHOT_FILTER` restricted route captures;
no new screenshot framework or full-campaign replay was needed for renderer-only
changes. Raw reports remain in `.workbench/reports/control-art/`.

During review, the elevated prompt initially met the existing nameplate row;
both player labels now clear the actuator and its text. CONTROL WING moved up
25 units. An initial stillness sample ran during camera settling; final samples
wait for follow-camera settlement. These checks and agent visual inspection do
not claim human playtest acceptance or cover every possible transient crowding
of players, ropes and names.
