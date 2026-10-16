# Breakpoint and payload behaviour refinement — 2026-10-16

Starting commit: `a50513f79ded7ee26fadedee7005552a21792d5c`.
Tested implementation commit: `565a77e1ecd9c017544c144098b59750c496bb78`.
This handoff is a subsequent documentation-only commit. Unrelated changes to
`CLAUDE.md` and `levels/drafts/blank-room.json` were preserved and excluded.

## Behaviour

- HANDSHAKE and CROSSFEED VAULT retain the campaign's only visible BREAKPOINT
  machines. Either player activates them by grounded contact, without E.
  Detection uses a 54-unit horizontal radius, 6-unit feet-height tolerance and
  a full-solid obstruction check. Walking underneath or on another floor does
  not activate them. Accepted state drives the existing flag, animation and audio.
- A small checkpoint semantic action uses existing membership, slot and level
  generation validation. Named campaign definitions and frozen custom snapshots
  validate the actual breakpoint ID. Duplicate requests do not save or revise
  state again. Clients suppress pending and already-earned requests.
- CROSSFEED's automatic pedestal is at x1120; SYSTEM ONLINE stays at x1210.
  Its E interaction controls machinery independently of the checkpoint.
  HANDSHAKE's maintenance terminal still requires E.
- DEADLOCK and USE AFTER FREE have no breakpoint-only controls or markers;
  death and reset use entry spawns. RACE CONDITION's internal reunion recovery
  remains unchanged. Draft and campaign JSON copies match exactly.
- DEADLOCK service relay is `(SAFE && !FEED) || payloadReady`. The full solve
  still physically lifts and manually catches the last cube after the FEED-to-
  relay handoff. After all three deliveries, the SAFE operator can leave and
  travel upstairs while every cube remains in its socket.
- Payload sockets remain live, resting-cube-only sensors. Removing a cube drops
  the corresponding occupancy and payload-derived relay power; the explicitly
  latched exit remains unlocked. No occupancy or service-relay latch was added.

## Compatibility

The level schema and party persistence version are unchanged. Declarative
breakpoints retain `relay` and `upper` milestones; `activationControl` is inert
legacy metadata, removable in the inspector with undo support. Ordinary
terminal effects remain deliberate interactions. Legacy built-in checkpoint
contracts, including CONTROL SPINE, retain their original controller behaviour.

Old CROSSFEED records with switchC and checkpoint already committed remain
readable; new records permit independent checkpoint and switch state. Known
removed checkpoint-control boolean keys in HANDSHAKE, DEADLOCK and USE AFTER
FREE are accepted when reading existing saves. Previously saved DEADLOCK/UAF
reunion checkpoints fall back to entry markers. No visitor identity, campaign
badge or unrelated progression migration was introduced.

## Validation

All checks below passed. Production-mode browser runs used isolated local data.

- `pnpm typecheck`
- `pnpm check`: 58 unit-test files, 566 passing tests, 2 existing skips; 3 HTTP/spec tests passed.
- `pnpm build`: passed, including retained UPLINK evidence validation; existing bundle-size advisory remains.
- `pnpm check:campaign`: 78 checks across the five-chamber shared campaign,
  reconnect/restart and completion badges. HANDSHAKE/DEADLOCK/USE AFTER FREE
  full authored-start routes used 59/71/43 steps, with zero deaths and both arrivals.
- `pnpm check:checkpoints campaign`: 43 browser checks, including both walking
  roles, accepted feedback once, independent SYSTEM ONLINE, per-slot reset,
  reconnect and persisted server restart.
- `pnpm check:checkpoints public local editor`: 34 checks for automatic custom
  checkpoints in public multiplayer, local draft multiplayer and editor physics.
- Final `pnpm check:checkpoints editor`: 7 checks, including removing the legacy
  control association and undoing it without changing the document.
- `pnpm check:public-coop`: 49 checks, including physical two-player play,
  automatic checkpoint before E, IndexedDB, frozen snapshots, replay and expiry.
- Final targeted checkpoint/campaign tests: 21 passing, including both slots'
  real death/reset paths in DEADLOCK and USE AFTER FREE.
- `pnpm check:evidence`: passed.
- All three campaign JSON validators report no diagnostics; corresponding
  authored drafts are byte-identical. The standalone DEADLOCK CLI solve passed
  all 71 steps in 72.18 simulated seconds with all three payloads retained.

Focused socket tests cover actual local player/cube contact, pickup, drop and
pulling, plus two-client authoritative sensor/relay/exit state. Server tests
cover stale generations, unknown and removed breakpoint IDs, idempotence,
legacy saves and public custom snapshots. Browser acceptance uses actual
walking and input, not direct checkpoint or controller-state assignment.

Reports and full screenshots are in ignored
`.workbench/reports/2026-10-16-checkpoints/`, with automatic browser originals in
`.workbench/reports/automatic-checkpoints/`. Two compact screenshots are retained
in `docs/playtest/2026-10-16-breakpoints/`: `crossfeed-automatic.png` and
`deadlock-service.png`.

## Deployment and acceptance

Push the implementation and this handoff normally to `main`; the existing
GitHub checks workflow deploys to Fly. After deployment, the prepared ignored
`live-check.ts` in the dated report directory runs both HANDSHAKE walking roles
and the complete physical DEADLOCK solve against the public site, writing
`live/report.json` and screenshots. Deployment and live results are reported
separately after that run; this handoff does not claim a pre-deployment result.

Human two-player acceptance is still useful for the feel of the automatic
contact zone and final service-route clarity. No human playtest is claimed.
The multiplayer contact reports intentionally follow the established trusted-
client occupancy model, with the server validating permitted room milestones.
No assets, animations, movement constants, native evidence or new chambers
were introduced. Stop here; PAYLOAD RECEIVER visuals and animation remain the
next separate milestone.
