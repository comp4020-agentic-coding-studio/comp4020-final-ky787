# Pressure pads and gravity lifts

The October 2026 visual pass gives ordinary pressure pads a recessed electronic
button and gravity lifts a transparent blue energy column. Both use the existing
Canvas renderer in the campaign, public custom sessions, developer multiplayer,
Level Builder State Preview and local physics playtesting.

## Pressure pad

The illuminated tread is 90 world units wide. A 96-unit dark base, beveled top,
short suspension strips and three contact bands distinguish it from a payload
receiver's upright cargo guides. The top travels three pixels in 140 ms on press
and returns in 180 ms on release. This displacement is cosmetic: the sensor,
authored floor, player and cube never move with it.

Amber means unpressed. Accepted contact compresses the surface and illuminates
cyan-blue traces and corner terminals. A short pulse follows an existing powered
output wire; inverted or disabled destinations do not receive a misleading
power pulse. Held pads retain moving packets and a slow heartbeat. Release
immediately restores amber and fades the blue accent while the top rises.

`pressurePads()` audits the existing contracts:

| Device | Presentation |
| --- | --- |
| Declarative `kind: "plate"`, including all five campaign chambers | Pressure pad, accepted `frame.plates[id]` |
| Legacy A/B pads in the solo rooms and mechanics laboratories | Pressure pad, existing accepted room input |
| Legacy PAIRING BAY final personnel pads | Same pad art; their existing personnel contract is unchanged |
| CROSSFEED's body-only scanners | Existing scanner art, unchanged |
| Declarative sockets and existing cube-only payload pads | Existing compact green PAYLOAD RECEIVER, unchanged |
| RACE CONDITION's ordinary pad named `receiver` | Pressure pad; the name does not make it a cube-only sensor |

A cube weighing down a pressure pad remains purple. No receiver state, docking
alignment or colour transfer is created. A pad whose matching supporting platform
is currently non-solid draws a faint dashed outline, derived from existing solid
state. This also prevents a misleading lit pad during the contact-release update
at collapse. Crumble timers and accepted occupancy remain owned by the engine
and authority.

## Gravity lift

The emitter has a compact segmented projection strip and circuit ports. Its
field contains electric-blue ribbons, sparse upward flecks and occasional small
binary glyphs. Side traces illuminate from bottom to top. A soft, open convergence
arc suggests the existing hover region without drawing a fictitious landing.
Fields render behind architecture, hazards, characters and payloads; the emitter
renders above the floor. The centre remains transparent.

Startup takes 640 ms and shutdown 280 ms. Physical power still changes immediately.
The emitter's power status changes immediately too; no visual grace period is
added when a body loses lift support. The existing `LiftField.pulse` contributes
only a startup brightness accent. No acceleration, speed, hover, bounds, hatch,
carry or collision code changes.

Each visible field uses at most seven eight-segment ribbons, twenty rows of guide
detail and twenty flecks. Offscreen fields are culled, and a tall field draws only
its camera-visible slice. Detail density depends on the visible span and zoom,
not total shaft height. There is no particle simulation, fullscreen pass or
`shadowBlur`. Emitter segment counts are bounded too.

## Presentation and accessibility

`machinery-presentation.ts` observes accepted pad contact and `LiftField.enabled`.
Per-device clocks live alongside the existing hero presentation and are disposable.
Repeated snapshots do not restart them. Room load/reconnect and stopped previews
baseline already-active machinery to settled powered idle. Rapid toggles reverse
from the current cosmetic position rather than popping the top or field opacity.

`plate-render.ts` and `lift-render.ts` draw these states; they never write to the
world. Reduced motion freezes packets, ribbons and pulsing and settles state
changes immediately. Shapes, compression, status text and steady illumination
remain. Different device IDs receive different phases.

Existing quiet plate press/release, lift power and nearby lift hum cues are reused.
Lift edge observation now includes JSON-authored signals as well as `liftField`.
Several physical fields sharing one output produce one power cue. Restored power
is silent; existing volume, mute, browser unlocking and cooldowns apply.

No network fields, saved animation state, levels, controllers, sensor dimensions,
checkpoint behaviour, payload assets or validated binary evidence are changed.

## Review and validation

The [browser gallery](playtest/2026-10-17-pressure-lift/index.html) contains actual
production-rendered captures, old/new comparisons and opt-in recordings. Its
fixture is an isolated diagnostic room in `scripts/fixtures/machinery-review.ts`;
its primary route uses two independent visitors, walking, jumping, carrying and
dropping real cubes. Only the separately labelled editor State Preview uses
diagnostic values.

```sh
pnpm typecheck
pnpm test:unit
pnpm build
node scripts/machinery-browser-check.ts
BN_MACHINERY_ART=1 BN_SHOTS=.workbench/reports/2026-10-17-pressure-lift/campaign pnpm check:campaign
pnpm check:public-coop
pnpm check:workbench
pnpm check:browser
node scripts/machinery-gallery.ts
```

The visual route passes 18 checks: accepted contact on both clients, repeated
snapshots, silent reconnect, purple cube weight, actual player/cargo ascent,
weight substitution, power loss and falling cargo, genuine collapse/recovery,
editor preview and local walking. Real pixel samples remain identical under
reduced motion after the follow camera settles and change again when motion
resumes. Before/after captures and complete press/power/release sequences were
visually inspected; pad captions clear the platform's existing annotations.

The full five-room campaign passes 81 checks including the three optional art
checks, both arrivals in every chamber, checkpoint independence, the manual final
DEADLOCK hatch catch, unstable handovers, reconnection and restart persistence.
Public custom multiplayer passes 49 checks, and the local workbench passes 56,
including authority, replay, marker respawn, editor input and save-conflict handling.
The public IndexedDB builder passes 67 checks. The complete solo browser route
passes 120, including CONTROL SPINE's validated states, lift/relay interactions,
reset, visitor persistence and audio controls. The gallery itself passes three
browser checks for complete images, no autoplay and actual video playback.
The local unit suite passes 603 tests with two conditional skips. Production
HTTP smoke checks pass all three tests. TypeScript and production build pass;
Vite retains its pre-existing large-chunk advisory.

The final two-client fixture overview measured 16.7 ms median and p95 across
170 sampled frames. DEADLOCK's full-height overview measured 16.7 ms median and
p95 across 120 frames. These are local headless Chromium measurements, not a
guarantee for other devices. At distant overview scale the tread and circuit
details become small; the silhouettes and steady colour carry the meaning.
Use the normal local camera for small captions and compression details.

Full logs and trajectories remain under
`.workbench/reports/2026-10-17-pressure-lift/`; only selected gallery images and
compressed recordings are committed. The dated handoff records final regression
results and human acceptance steps. Automated visual review does not constitute
human art or two-player acceptance.
