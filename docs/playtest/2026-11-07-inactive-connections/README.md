# Inactive power-line visibility — 7 November 2026

Linux Codex; base `850787cf7caa869c7d05bdc843d3f942c2d63bc0`.
Presentation only: `src/slice/connections.ts` and its call in `render.ts`.
`connectionPowered()`, connection definitions/endpoints, source-versus-resolved
semantics, inputs, outputs, geometry, physics, saves and native evidence are unchanged.

## Treatment

Inactive connections have a continuous 1.8-world-unit `#71849c` backbone at
0.85 opacity, with a subtle 3.8-unit dark `#0b121a` edge. A separate 1.3-unit
`#a0b3cd` scan at 0.55 opacity uses 12-unit segments separated by 228-unit gaps,
travelling at 75 world units/second. Canvas advances the dash phase over the
entire authored polyline, including its corners; no segment-local resets occur.
The continuous backbone is always present. Scans are cosmetic, not powered-state
or native execution evidence.

Powered cyan/purple lines retain their original widths, opacity, 9/28 dash
pattern, dash speed and 220-unit/second pulse. The renderer passes its existing
`energyMotion` permission. Paused, disconnected and reduced-motion rendering
omits moving marks for both states, leaving the static backbones illuminated.
No timer/loop is added: allowed motion uses the existing world elapsed time.

Amber NOT text, dark backing, 14-unit size, opacity, position and shared-trunk
deduplication are unchanged. They render after every wire/scan so the opaque
backing shields the label.

## Validation

- 35 focused tests PASS (`connections.test.ts`, `workbench-runtime.test.ts`).
  Coverage includes legacy source-input wiring, resolved false versus fallback,
  draft controls/plates, untouched world state, continuous paths, static frames,
  powered animation, and NOT opacity/deduplication.
- `pnpm typecheck` and `pnpm build`: PASS. Existing bundle-size advisory remains.
- Chromium raster checks: inactive contrast improves at zooms 0.45, 0.75 and 1
  on both dark backgrounds. Sum of absolute RGB difference from the background
  is 8.1–15.7× the old raster, not a claim of perceptual brightness or human
  comprehension. All 36 powered colour/time/zoom/background comparisons are
  pixel-identical to the previous renderer. Idle scans visibly advance, cross
  the elbow continuously, and both static states ignore elapsed time.
- The focused browser runner passed 58 checks; the existing CROSSFEED/NOT runner
  passed 36. Actual production Canvas observations confirm moving scan/dash offsets during
  play and no such marks while paused, reduced-motion or disconnected. Continuous
  inactive backbones still render, including overview. Screenshots were inspected
  at normal gameplay scale, including 1024×768.
- HANDSHAKE: real walking onto CROSSING and LIFT, both clients accepting power.
  The powered 1024 capture uses its existing held-pad camera; it is not an editor
  camera. Initial inactive capture uses the ordinary following camera.
- CROSSFEED: existing isolated body-placement fixtures plus real Space/E and
  server-accepted SYSTEM ONLINE, TRANSFER MODE and ROUTE SELECT toggles. Both
  directions and both clients verified. Amber NOT remains legible in on/off,
  1024-wide, reduced-motion and paused views.
- BYPASS: initial anchor/bridge off; real body-held anchor, real LINK commitment,
  held BYPASS disables both beams, release restores them, real OVERRIDE commits
  them off. Remote control locations use labelled body-placement fixtures; this
  is a presentation/interaction review, not a claimed full-room physical solve.
- No unrelated chamber audit or full campaign replay was needed for this visual
  change. CI runs the normal repository gate.

Browser checks and compact observations are retained beside this note. The first
browser iteration incorrectly expected HANDSHAKE's occupied-pad camera to return
to follow mode; the fixture now recognizes its intentional held view. No runtime
camera logic or gameplay assertions were changed.

## Captures

| Room/state | Screenshot |
| --- | --- |
| HANDSHAKE inactive before | [Before](handshake-before.png) |
| HANDSHAKE inactive after | [After](handshake-inactive.png) |
| HANDSHAKE powered, 1024-wide | [Powered](handshake-powered-1024.png) |
| HANDSHAKE overview | [Overview](handshake-overview.png) |
| CROSSFEED relay powered | [TRANSFER off](01-transfer-relay-on-fixture.png) |
| CROSSFEED relay inactive, bridge powered | [TRANSFER on](02-transfer-relay-off-fixture.png) |
| BYPASS initial anchor/bridge | [Initial](bypass-initial.png) |
| BYPASS firewall active | [Before OVERRIDE](bypass-firewall-active.png) |
| BYPASS firewall inactive | [OVERRIDE committed](bypass-override.png) |

Reproduce with the existing production browser harness:

```sh
mkdir -p .workbench/wire-review
git show 850787c:src/slice/connections.ts > .workbench/wire-review/connections-before.ts
pnpm build
BN_WIRE_BASELINE=.workbench/wire-review/connections-before.ts \
  node scripts/connections-browser-check.ts
BN_SHOTS=.workbench/reports/wires-crossfeed \
  BN_SHOT_FILTER='^0[12]-transfer-relay' node scripts/inverted-signals-browser-check.ts
```

Full-screen captures demonstrate normal rendering; raster checks isolate wires
to avoid unrelated terrain/character animation affecting the comparison. Human
playtesting remains the test of first-time puzzle comprehension.
