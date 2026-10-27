# Dark substrate and restrained data flow — 2026-10-28

Baseline: fetched `main` at `4b92994`. Static terrain now uses a near-black
`#101b24`–`#0a1219` substrate, dimmer chips and etched traces, and a crisp
desaturated contact edge. Short blue-grey packets move slowly along fixed edge
paths; the architectural body and circuit layout stay stationary.

Death fields retain their approved crimson/magenta appearance. New short signals
travel along selected scanlines and existing right-angle boundary paths at varied
steady speeds. They use the existing presentation clock and motion gate. Pause
and reduced motion produce a stable image; the death field's reduced-motion
pixels exactly match the approved renderer.

Runtime changes are limited to `src/slice/terrain-render.ts` and one call in
`src/slice/render.ts` passing presentation time and motion state. Both helpers
retain viewport culling, world anchoring and clipping to the existing rectangles.
No new assets or framework are used. [Rendering contract](../../terrain-art.md).

## Gameplay review

Actual production-game screenshots use ordinary player cameras and the existing
held Tab overview. Both visitors were checked in all five chambers at 1920×1080
and 1024×768. No world state or camera transforms were injected.

| Review | Captures |
| --- | --- |
| CROSSFEED lift off | [1920](screenshots/crossfeed-lift-off-1920.png), [1024](screenshots/crossfeed-lift-off-1024.png) |
| Same area, lift on | [1920](screenshots/crossfeed-lift-on-1920.png), [1024](screenshots/crossfeed-lift-on-1024.png) |
| HANDSHAKE broad floors | [1920](screenshots/handshake-player-1-1920.png), [1024](screenshots/handshake-player-1-1024.png) |
| RACE walls, ledges and active code | [1920](screenshots/race-condition-player-1-1920.png), [1024](screenshots/race-condition-player-1-1024.png) |
| DEADLOCK tall structure | [1024](screenshots/deadlock-player-1-1024.png) |
| USE AFTER FREE small ledges | [1024](screenshots/use-after-free-player-1-1024.png) |
| Death-field animation times | [4.05s](screenshots/crossfeed-flow-frame-0.png), [5.83s](screenshots/crossfeed-flow-frame-1.png), [7.63s](screenshots/crossfeed-flow-frame-2.png) |
| Reduced motion | [1920](screenshots/crossfeed-reduced-motion-1920.png), [1024](screenshots/crossfeed-reduced-motion-1024.png) |
| Paused terrain | [1920](screenshots/crossfeed-paused-1920.png) |
| Overview | [HANDSHAKE 1024](screenshots/handshake-overview-1024.png) |

[Animation clip](crossfeed-flow.webm) records the actual 1920-wide gameplay canvas.
[Screenshot index](screenshots.json) records source paths and hashes. Full captures
remain in `.workbench/reports/2026-10-28-terrain-flow/`.

The grey `GRAVITY LIFT / SIGNAL OFF` lettering reads against the darker substrate;
powered blue rails and labels are clearly more prominent. The approved lift
renderer is unchanged. For the paired captures, the route walks the observer
just left of the future cargo footprint so the legitimate cube drop does not
nudge the observer's camera. Both follow cameras match within one world unit.

Fine circuitry and edge motion intentionally recede at overview scale. The
contact silhouette and lethal boundary remain visible there. The still images
show packet positions; the clip is the better review of their restrained motion.

## Validation

- `pnpm typecheck`: passed.
- `pnpm test:unit tests/terrain-render.test.ts tests/platform-grapple.test.ts`:
  [13 passed](checks/unit.txt). Tests retain bounded work, offscreen rejection,
  immutable boxes, clipping/state restoration and static terrain remaining
  unhookable. Exact command comparison proves only edge dash phase changes.
- `pnpm build`: [passed](checks/build.txt), including retained UPLINK verification;
  the existing bundle-size advisory remains.
- `BN_TERRAIN_BASELINE=.workbench/reports/2026-10-28-terrain-flow/approved-terrain.ts
  BN_SHOTS=.workbench/reports/2026-10-28-terrain-flow/initial pnpm check:terrain`:
  [99 assertions passed](checks/checks.txt), including [61 raster checks](checks/raster-checks.json).
  The approved source is `git show 4b92994:src/slice/terrain-render.ts`.
  Pixel checks cover shapes down to 2×2, 0.5×/1×/2× zoom, clipping, panning,
  fixed substrate and deterministic motion. All three approved death-field
  still comparisons are exact. Gradient dithering permits at most one channel
  value for the isolated substrate and two for panning/gameplay; moving signals
  must exceed eight, preventing dithering from being counted as animation.
- [Actual canvas samples](checks/motion-observations.json) confirm movement in
  death signals and static edges, with zero change inside the floor. Both pause
  and reduced-motion comparisons have zero changed channel values in all three
  sampled regions while presentation time advances.
- `BN_TERRAIN_REVIEW=1 BN_CROSSFEED_FORWARD_ONLY=1
  BN_SHOTS=.workbench/reports/2026-10-28-terrain-flow/crossfeed pnpm check:crossfeed`:
  complete two-visitor real-input solve, including lift, checkpoint, firewall
  reset, both three-hook cargo routes, final sockets and both exit arrivals.
  [Route assertions](checks/crossfeed.txt) and [lift observations](checks/lift-observations.json)
  are retained. No browser runtime errors.

[Preservation hashes](preservation.json) verify 150 gameplay, geometry, server,
audio, evidence, other renderer and deployment files against the baseline.
The main renderer changes only its static-helper clock arguments; code/crumble
artwork and all interaction logic remain untouched. Unrelated local edits were
preserved. Test/review changes are confined to the terrain tests, terrain browser
helpers and an optional CROSSFEED capture hook.
