# Static terrain and death fields

`src/slice/terrain-render.ts` owns two Canvas helpers used by the shared puzzle
renderer, including the campaign, solo tutorials and custom-level preview.
They receive rectangles and the current visible world bounds, not world state.

- `drawStaticPlatform` gives enabled `kind: 'static'` boxes a near-black computational
  substrate, thin desaturated contact edge, etched right-angle circuit branches,
  embedded chips and short segmented buses. Four seeded layouts vary chip size,
  placement and routing; there are no plate seams, bolts, ribs or decorative text.
  Horizontal circuitry uses 208×112 world cells with alternate row offsets;
  upright structures rotate the same vocabulary in 112×208 cells. Thin ledges
  use one simple trace row and narrow walls one vertical column. Very small
  rectangles omit circuits. The substrate runs from `#101b24` to `#0a1219`;
  chips and traces sit below inactive machinery in the visual hierarchy. Short
  blue-grey packets travel along fixed top-edge paths and occasional vertical
  bends, without a glow or full-border pulse. The body, chips and etched routes
  never animate. Native headers and authored text keep their code.
- `drawDeathZone` gives `room.hazards` a near-black crimson interior, inset
  magenta perimeter, interrupted right-angle signals, sparse scanlines and small
  drifting packets. Short illuminated segments travel along selected scanlines
  and the existing broken boundary bends at different steady speeds. The
  approved palette, interior and lethal perimeter remain intact; reduced motion
  retains the exact approved still image. No external glow, solid rail, spikes or labels.
  Existing controller-driven orange firewalls still use `drawFirewalls`.

Both helpers clip all ink to the intersection of the original physics box and
the viewport. Repetition indices come from fixed world coordinates; viewport
changes only select which cells to draw. No resized textures, random frame noise,
offscreen image buffers, shadows or whole-room detail loops are used. Both
helpers receive the existing hero presentation time and energy-motion gate;
pause, disconnected co-op and reduced motion use a stable still pattern. Moving
dash offsets follow fixed world paths: top-edge modules repeat every 256 units,
vertical signals every 240. Their speed is a quiet 11–17 world units/second;
death-field signals travel at 20–35. Culling never changes the path or phase.
The lethal boundary remains visible without animation.

Geometry, enabled-state decisions, solid extents, hookability, collision/reset
logic, cube recovery, camera behaviour, controller outputs and native evidence
are outside these helpers. Code and crumble artwork stays in its existing branch.
Hazards retain their existing draw order behind platforms: for example,
CROSSFEED's 4,320-unit field is mostly concealed by the two solid floors, with
its dangerous openings exposed.

## Review

- `pnpm test:unit tests/terrain-render.test.ts`: offscreen rejection, bounded
  work for huge boxes, immutable inputs, clipping/state restoration and motion.
  An exact command comparison allows only the static edge dash phase to change.
- `pnpm build && pnpm check:terrain`: real Chromium raster checks and both
  player cameras plus Tab overview in all five chambers, at 1920×1080/1024×768.
  The pan comparison allows two RGB channel values for Chromium gradient
  dithering; it does not allow a displaced seam or fragment.
  Optional `BN_TERRAIN_BASELINE=<saved-source-path-relative-to-repo>` also
  compares death-field pixels against the pre-flow approved renderer at three
  times: moving frames must differ and still frames must match exactly. The
  baseline is review input, not a runtime dependency. Actual CROSSFEED canvas
  samples, three timed screenshots and a short WebM verify both moving signals
  and stationary substrate; paused and reduced-motion frames are also checked.
  Interior pixel comparisons allow only the measured 1–2 value raster dithering.
- `BN_TERRAIN_REVIEW=1 BN_CROSSFEED_FORWARD_ONLY=1 pnpm check:crossfeed`:
  matched ordinary-camera lift-off/lift-on captures at both sizes while the
  existing real-input route places Cube A. The complete route still runs,
  including the physical lift, cargo transfer, reset and both exit arrivals.
- `BN_TERRAIN_REVIEW=1 BN_NATIVE_WORLD_REVIEW=1 pnpm check:campaign`:
  ordinary-camera captures at stable powered holds during all five real-input
  solves. The original route, authority and completion assertions still run.
- `BN_TERRAIN_REVIEW=1 pnpm check:browser <server-url> <shots>`:
  all four solo rooms, powered/unpowered and held overview at both sizes,
  alongside the existing movement, grapple, reset and persistence regressions.

Set `BN_SHOTS` to choose the co-op/raster output directory. Recorded reviews:
[approved death-field art](playtest/2026-10-28-terrain/README.md) and
[static cybernetic architecture](playtest/2026-10-28-cyber-terrain/README.md), then
[darker substrate and data flow](playtest/2026-10-28-terrain-flow/README.md).
