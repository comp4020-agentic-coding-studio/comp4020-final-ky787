# Static terrain and death fields

`src/slice/terrain-render.ts` owns two Canvas helpers used by the shared puzzle
renderer, including the campaign, solo tutorials and custom-level preview.
They receive rectangles and the current visible world bounds, not world state.

- `drawStaticPlatform` gives enabled `kind: 'static'` boxes a dark computational
  substrate, thin desaturated contact edge, etched right-angle circuit branches,
  embedded chips and short segmented buses. Four seeded layouts vary chip size,
  placement and routing; there are no plate seams, bolts, ribs or decorative text.
  Horizontal circuitry uses 208×112 world cells with alternate row offsets;
  upright structures rotate the same vocabulary in 112×208 cells. Thin ledges
  use one simple trace row and narrow walls one vertical column. Very small
  rectangles omit circuits. Native headers and authored text keep their code.
- `drawDeathZone` gives `room.hazards` a near-black crimson interior, inset
  magenta perimeter, interrupted right-angle signals, sparse scanlines and small
  drifting packets. It adds no external glow, solid rail, spikes or labels.
  Existing controller-driven orange firewalls still use `drawFirewalls`.

Both helpers clip all ink to the intersection of the original physics box and
the viewport. Repetition indices come from fixed world coordinates; viewport
changes only select which cells to draw. No resized textures, random frame noise,
offscreen image buffers, shadows or whole-room detail loops are used. Static
terrain has no clock. Hazard motion uses the existing hero presentation time and
energy-motion gate; pause, disconnected co-op and reduced motion use a stable
still pattern. The lethal boundary remains visible without animation.

Geometry, enabled-state decisions, contact edges, hookability, collision/reset
logic, cube recovery, camera behaviour, controller outputs and native evidence
are outside these helpers. Code and crumble artwork stays in its existing branch.
Hazards retain their existing draw order behind platforms: for example,
CROSSFEED's 4,320-unit field is mostly concealed by the two solid floors, with
its dangerous openings exposed.

## Review

- `pnpm test:unit tests/terrain-render.test.ts`: offscreen rejection, bounded
  work for huge boxes, immutable inputs, clipping/state restoration and motion.
- `pnpm build && pnpm check:terrain`: real Chromium raster checks and both
  player cameras plus Tab overview in all five chambers, at 1920×1080/1024×768.
  The pan comparison allows two RGB channel values for Chromium gradient
  dithering; it does not allow a displaced seam or fragment.
  Optional `BN_TERRAIN_BASELINE=<saved-source-path-relative-to-repo>` also
  compares death-field pixels against a saved approved renderer at three times,
  with motion on and off. The baseline is review input, not a runtime dependency.
- `BN_TERRAIN_REVIEW=1 BN_NATIVE_WORLD_REVIEW=1 pnpm check:campaign`:
  ordinary-camera captures at stable powered holds during all five real-input
  solves. The original route, authority and completion assertions still run.
- `BN_TERRAIN_REVIEW=1 pnpm check:browser <server-url> <shots>`:
  all four solo rooms, powered/unpowered and held overview at both sizes,
  alongside the existing movement, grapple, reset and persistence regressions.

Set `BN_SHOTS` to choose the co-op/raster output directory. Recorded reviews:
[approved death-field art](playtest/2026-10-28-terrain/README.md) and
[static cybernetic architecture](playtest/2026-10-28-cyber-terrain/README.md).
