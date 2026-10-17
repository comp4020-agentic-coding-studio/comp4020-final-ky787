# Pressure pad / gravity lift visual handoff — 17 October 2026

Starting HEAD: `c6dcb35a0497920f04b24386afa719f097ff79ec`.
Implementation: `ad57235558a57ac8597753bb85ce2f9e16b63da8`.
This follow-up records acceptance and preserves the committed comparison images
when regenerating the gallery from a fresh clone.

## Delivered

Ordinary pads now use a 90-unit illuminated tread, recessed base, exposed short
supports and three pixels of cosmetic compression (140 ms press / 180 ms release).
Amber returns on release; accepted occupancy energizes cyan-blue circuits. An
unsupported pad ghosts from existing platform state. Its caption and base clear
the unstable platform's own annotations.

Lifts use blue emitters, transparent wavering ribbons, sparse upward data flecks,
side circuitry and an open upper stabilization arc. Startup is 640 ms; shutdown
280 ms. Physical power remains immediate. Rendering is camera-culled and bounded
to seven eight-segment ribbons, twenty rail rows and twenty flecks per field.

Reusable `plate-render.ts`, `lift-render.ts` and `machinery-presentation.ts` feed
the existing shared renderer. Animation clocks are local/disposable, repeated
snapshots do not restart them, and reconnect baselines powered idle. Reduced
motion freezes nonessential energy movement. Existing plate and lift audio is
reused; lift edge cues now cover JSON-authored signals as well as native signals.

No geometry, movement physics, sensors, server messages, controller logic,
checkpoint behaviour, payload art/docking or binary evidence changed. Cube-only
receivers and CROSSFEED personnel scanners retain their identities. An ordinary
pad keeps its cube purple. Historical lab personnel-pad contracts are preserved.

## Validation

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Pass |
| `pnpm test:unit` | 603 passed; two conditional skips |
| `pnpm build` | Pass, including existing UPLINK bundle validation |
| `BN_MACHINERY_ART=1 BN_SHOTS=.workbench/reports/2026-10-17-pressure-lift/campaign pnpm check:campaign` | 81 checks; all five full physical solves and restart/reconnect persistence |
| `pnpm check:public-coop` | 49 checks |
| `pnpm check:workbench` | 56 checks |
| `pnpm check:public-builder` | 67 checks, including IndexedDB and production isolation |
| `pnpm check:browser http://127.0.0.1:46383/ .workbench/reports/2026-10-17-pressure-lift/solo` | 120 checks against an isolated production server; now stopped |
| `APP_URL=http://127.0.0.1:46383 pnpm test` | Three HTTP smoke tests |
| `node scripts/machinery-browser-check.ts` | 18 actual-input public multiplayer/editor checks |
| `node scripts/machinery-gallery.ts` | Three gallery checks, including actual video playback |

The full campaign retains DEADLOCK's physical final FEED-to-relay handoff and
manual HATCH catch. Its final arrivals, USE AFTER FREE's unstable handovers,
HANDSHAKE's boost/lift, CROSSFEED's independent checkpoint/machinery and CONTROL
SPINE's validated controller states all pass. No tests were weakened.

The art fixture walks/jumps real players, carries/drops cargo and lets an actual
platform collapse. It also proves body-for-cube substitution: pickup while still
standing on a normal pad correctly keeps it powered until the player leaves.
The separate editor State Preview is explicitly diagnostic. Pixel checks cover
reduced motion after camera settling; independent visual clocks and bounded
drawing are covered by presentation tests.

Full logs, physical observations, frame sequences and captures:
`.workbench/reports/2026-10-17-pressure-lift/` (ignored). The final fixture measured
16.7 ms median/p95 across 170 overview frames; DEADLOCK measured 16.7 ms
median/p95 across 120 full-height overview frames with two active clients.

## Review material and remaining acceptance

Durable design: `docs/pressure-and-gravity.md`.
Browser gallery: `docs/playtest/2026-10-17-pressure-lift/index.html`.
It includes before/after images, player/cube pressure, unsupported footing,
startup/transport/shutdown, compact viewports, editor previews and DEADLOCK.
Five compressed recordings include complete pad/lift power cycles and the real
final cargo catch. Full cycles and final screenshots were visually inspected.

No known functional blocker. Vite still emits its existing bundle-size advisory.
Tiny circuitry and captions naturally become small in shaft overview; use local
framing for those details. Frame timings are local headless measurements, not a
cross-device guarantee. Automated review is not human visual or co-op acceptance.

Human acceptance: play HANDSHAKE's plates/lift, confirm purple cargo on a blue
pad, review DEADLOCK's transport/catch with a friend, and watch a USE AFTER FREE
operator platform release. Check normal/reduced motion and the gallery recordings
at the preferred display size. No further machinery or campaign changes belong
to this milestone.

Pre-existing edits to `CLAUDE.md` and `levels/drafts/blank-room.json` were left
unstaged and untouched. No research artifacts were changed.
