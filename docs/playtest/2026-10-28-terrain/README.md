# Static terrain and death-field art — 2026-10-28

Baseline: current `main`, `5977e97`. This is a Canvas presentation change only.
[Preservation hashes](preservation.json) verify 145 files byte-for-byte against
that baseline, including campaign layouts, physics, multiplayer/server logic,
audio, native evidence, firewall rendering and the CI deployment workflow.
Unrelated local edits were excluded.

## Artwork

- Static boxes now use modular blue-grey metal plates, inset seams, tiny bolts,
  an upper contact bevel and a dark underside. Thin ledges omit details that do
  not fit; narrow walls use upright ribs and cross ties. No cyan illumination.
- Death/reset rectangles now use near-black crimson depth, a restrained magenta
  boundary, broken digital signals, sparse scanlines and slowly drifting packets.
  No triangular spikes, repeated warning stencils, bloom or exterior particles.
- Fixed world cells repeat without stretching or reseeding during camera motion.
  All ink is clipped inside the original boxes; only visible cells are processed.
  Pause/reduced motion produces a deterministic still field. Powered firewalls,
  code, crumble, meaningful labels and native listings retain their artwork.

The implementation is in `src/slice/terrain-render.ts`, with two call sites in
`src/slice/render.ts`. [Terrain rendering contract](../../terrain-art.md).

## Actual gameplay screenshots

These are unedited browser captures from the production game. No player,
controller, cube, geometry or camera transforms were injected. Desktop changes
use browser viewport sizing; overview uses the normal held Tab control.

| Example | Captures |
| --- | --- |
| CROSSFEED's 4,320×70 death field | [Normal 1920](screenshots/crossfeed-death-field-1920.png), [reduced motion 1024](screenshots/crossfeed-death-field-reduced-motion-1024.png), [overview 1920](screenshots/crossfeed-overview-1920.png) |
| HANDSHAKE's broad floor | [Normal 1920](screenshots/handshake-floor-1920.png), [overview 1024](screenshots/handshake-overview-1024.png) |
| RACE's 30×652 walls and 22-unit ledges | [Normal 1920](screenshots/race-wall-and-ledges-1920.png), [normal 1024](screenshots/race-wall-and-ledges-1024.png), [overview 1024](screenshots/race-overview-1024.png) |
| DEADLOCK's service wall and labels | [1920](screenshots/deadlock-service-wall-1920.png), [1024](screenshots/deadlock-service-wall-1024.png) |
| USE AFTER FREE's smaller platforms | [Entry 1920](screenshots/use-after-free-entry-1920.png), [overview 1024](screenshots/use-after-free-overview-1024.png) |
| USE AFTER FREE during the summit handover | [Host 1024](screenshots/use-after-free-summit-1024.png), [partner 1920](screenshots/use-after-free-refuge-1920.png) |
| Smaller tutorial death fields | [SWITCH 1920](screenshots/solo-switch-death-field-1920.png), [SWITCH 1024](screenshots/solo-switch-death-field-1024.png), [RELAY overview 1920](screenshots/solo-relay-overview-1920.png) |
| Metal beside powered code | [RACE 1920](screenshots/race-code-and-static-1920.png), [RACE 1024](screenshots/race-code-and-static-1024.png), [RELAY 1024](screenshots/solo-relay-code-and-static-1024.png) |
| Powered machinery and thin ledges | [HANDSHAKE 1024](screenshots/handshake-thin-ledges-powered-1024.png), [DEADLOCK 1024](screenshots/deadlock-powered-gallery-1024.png) |
| Other solo rooms | [PRESSURE floor 1920](screenshots/solo-pressure-floor-1920.png), [CONTROL SPINE 1920](screenshots/solo-control-spine-latched-1920.png), [CONTROL SPINE 1024](screenshots/solo-control-spine-latched-1024.png) |

[Screenshot provenance](screenshots.json) records source paths and hashes.
The complete capture matrix remains in
`.workbench/reports/2026-10-28-terrain/{initial,campaign,solo,uaf}/`.

## Validation

- `pnpm typecheck` and `pnpm build` passed. The existing bundle-size advisory remains.
- 112 tests passed across terrain rendering, solo slice, platform grappling,
  HANDSHAKE/DEADLOCK physics, authored campaign, CROSSFEED world, RACE and native rendering.
- `pnpm check:native` passed: pinned specimens, world/cargo/machinery/environment
  artifacts, native bytes and output stores remain intact.
- `pnpm check:terrain` passed 81 checks: 48 raster contracts plus both ordinary
  player cameras/overview in all five chambers at both requested desktop sizes,
  live reduced motion and browser error checks. Pixel tests cover 2×2 blocks,
  thin ledges, narrow walls and wide fields at 0.5×/1×/2×. Panning tolerates only
  the measured maximum difference of 2/255 per colour channel from Chromium
  gradient dithering.
- Renderer work-count tests confirm that increasing an offscreen rectangle from
  10,000 to one billion units adds no detail work for the same viewport.
- `BN_TERRAIN_REVIEW=1 BN_NATIVE_WORLD_REVIEW=1 pnpm check:campaign` passed
  [272 assertions](checks/campaign.txt): five complete real-input solves with
  one persistent two-visitor party, native accepted-state checks, reconnect and
  server-crash recovery. All 25 native presentation replacements were observed.
- `BN_TERRAIN_REVIEW=1 pnpm check:browser <isolated-url> <shots>` passed
  [122 assertions](checks/solo.txt): all four tutorials, ordinary and overview
  cameras at both sizes, movement/grapple, death/reset, cube handling, checkpoints,
  saved progress and the retained CONTROL SPINE contract.
- The final USE AFTER FREE art captures use its earlier summit ASSIST hold,
  before the automatic victory overlay. A focused [43-step replay](checks/uaf-route-summary.json)
  completed with zero deaths and both arrivals; [capture assertions](checks/uaf-capture.txt)
  confirm gameplay stays visible at both sizes. No runtime changes followed the
  full campaign or solo validation.

## Files

Runtime: `src/slice/terrain-render.ts`, `src/slice/render.ts`.
Validation: `tests/terrain-render.test.ts`, `scripts/terrain-browser-check.ts`,
`scripts/terrain-campaign-review.ts`, optional capture hooks in
`scripts/campaign-browser-check.ts` and `scripts/browser-check.ts`, and the
`check:terrain` command in `package.json`. Documentation: `docs/terrain-art.md`
and this report with 25 screenshots, logs, camera observations and source hashes.

## Limits

The art deliberately stays quiet at overview scale; bolts and scanline fragments
become subpixel while contact edges and the lethal boundary remain readable.
CROSSFEED's existing floors cover most of its full-width death field, so its
exposed gaps are visible in gameplay. That layering and all physics bounds are
preserved. No WATCHDOG or moving-firewall work is included.
