# PAYLOAD RECEIVER and energy payload — visual design

The receiver is a compact debugger interface: one shallow dark base, short
registration brackets, a cube-sized open bay and thin illuminated circuit traces.
Its outer width is 94 world units, down from the previous industrial arms' 188;
the solid guides rise 16 units instead of 55. The original 90-unit contact strip
remains visible. The larger arms, ribs, fasteners and scanner beam are removed.

The movable payload keeps its 44-unit square containment frame. Loose and carried
cargo has a rich violet core and frame (`#B65CFF`), lavender corners (`#DFABFF`)
and a pale core highlight. Connected cargo turns electric green (`#59FF86`), with
bright green terminals (`#BCFFB2`) and dark PCB traces (`#146B48`). A clear A/B/C
mark remains where authored. The receiver draws behind the cube, then adds small
front connections at its edge terminals, leaving the core and mark visible.
This is original Canvas artwork and an authored metaphor, not binary evidence.

See the [animated energy gallery](playtest/2026-10-16-payload-energy/index.html),
[17-second recording](playtest/2026-10-16-payload-energy/energy-cycle.webm) or
[single-image gallery](playtest/2026-10-16-payload-energy/gallery.png).
These are actual production browser captures with physical input. The flat
review fixture is a test scene, not another chamber. The gallery compares the
[previous cyan interface](playtest/2026-10-16-payload-interface/index.html) directly;
its compact dimensions and safe docking implementation are preserved. The
[previous industrial version](playtest/2026-10-16-receivers/index.html) is retained
for comparison.

## States and alignment

| State | Presentation |
| --- | --- |
| Awaiting | Amber status, AWAITING PAYLOAD, faint registration marks and idle base traces |
| Accepted | PAYLOAD DETECTED immediately; a 680 ms local surge changes the centred payload from purple to green; branching traces illuminate in sequence, feed inward, then pulse outward |
| Powered | Fixed centred cube, green core and terminals, offset breathing contours and independent light packets along the PCB branches |
| Removed | Connections shut off immediately, cargo returns to purple and status returns to amber; guide emphasis relaxes over 280 ms without retaining green |

The core heartbeat takes 2.6 seconds. Secondary contours peak out of phase;
containment highlights travel around the inner frame and tiny electrical lines
move within it. Stable ID-derived phase offsets keep nearby cubes from pulsing
together. The outline stays fixed; a faint radial halo extends only ten units
beyond it. No `shadowBlur`, particles, screen flash or camera shake is added.
The receiver uses eight mirrored PCB paths with branching junctions, steady
traces, slower moving packets and a few breathing nodes. It adds no machinery.

`prefers-reduced-motion: reduce` is read live: energy motion and surges stop,
colours settle immediately, and frames, terminal shapes, marks and status text
remain clear. Paused/disconnected play and stopped editor previews also settle
these assets. The gallery video never autoplays. Other machinery is unchanged.

No beam sweeps across the payload. No part closes over it or suggests a lock.
Each receiver tracks its own accepted occupancy edge and local animation clock.
Repeated snapshots do not restart effects. Restored occupied receivers and
stopped State Preview settle silently, including when cube replicas arrive later.
The existing quiet credited confirmation sound, cooldown, mute and gesture unlock
behaviour are unchanged. Local developer/editor previews remain silent.

`payload-docking.ts` centres **accepted, resting** cargo at the receiver's x and
floor y minus 22. It moves the existing cube body with the visible frame, so E
reach, grappling and standing support target the same place. Multiplayer uses
the accepted cube-placement identity and existing owner/transform stream. There
is no docking network action, persistent state, constraint force or timer.
Carry, pull, reset, falling and loss of occupancy release alignment immediately.
The ephemeral `payloadDocks` observation identifies which cube is connected.

A just-dropped cube waits if either player still occupies the canonical bay;
it centres as soon as the space clears. **Live socket power and confirmation do
not wait for that cosmetic alignment.** Until centred, the cube remains purple
and the receiver's green status/nodes report accepted power; traces to the absent
cube stay dark. On centring, the colour transition and connections engage without
a second sound. Restored occupied docks use steady green even if the cube replica
arrives later. This prevents snapping a cube into a player or pushing them into
a wall. The body is never rendered in a fictitious position.

For unusual imported layouts, alignment also refuses a path through architecture,
hazards or other cubes, an unsupported destination, or a move that changes
simultaneous neighbouring sensor contacts. Those cubes keep ordinary physics
and valid live occupancy. Authors should leave a clear supported canonical bay.
These guards do not alter the sensor's existing 59-unit centre tolerance or
five-unit floor-contact tolerance. Ordinary plates never centre their cargo.

Below 0.72 zoom, status badges retain screen-sized text with separate lanes for
nearby receivers. Normal zoom uses the inset screen and small captions. Camera
framing and aiming transforms are unchanged.

## Semantic audit

| Existing device | Receiver appearance? | Reason |
| --- | --- | --- |
| Declarative `kind: "socket"`, including HANDSHAKE and DEADLOCK | Yes | Accepted `frame.plates[id]` is live cube-only occupancy |
| CROSSFEED `liftCargo`, `finalLeft`, `finalRight` cargo pads | Yes | Accepted cube-placement inputs; separate body scanners stay scanners |
| PAIRING BAY `cargoPlate` | Yes | Accepted cube-only cargo input; local `cargoVisual` prediction is ignored |
| CONTROL SPINE `plateC` / NODE C | Yes | Existing cube-only final input; validated five-input/seven-output contract unchanged |
| Tutorial A/B, universal plates, RACE's `receiver` | No | Accept players or cubes; RACE's enclosure limits access physically, not through cube-only sensor semantics |

Workbench's palette says Payload receiver; canonical JSON continues to use
`kind: "socket"`. No level, schema, persistence, server or controller changes
are required. Imported built-in rooms retain the same semantic distinction.

`receiver-presentation.ts` audits cube-only inputs and observes accepted edges;
`receiver-render.ts` draws the compact base and connections; `payload-energy.ts`
provides bounded palette/phase values and `payload-render.ts` draws the frame/core.
All run through the shared
`PuzzleRenderer` in campaign, public custom sessions, developer multiplayer and
local physics preview. No level JSON, controller expressions, server occupancy
rules, movement constants, evidence, checkpoint or persistence contracts changed.

## Validation

```sh
pnpm typecheck
pnpm test:unit tests/payload-energy.test.ts tests/payload-docking.test.ts tests/receiver-presentation.test.ts tests/shared-cube.test.ts tests/payload-socket.test.ts tests/hero-presentation.test.ts
pnpm build
pnpm check:receivers
node scripts/receiver-local-check.ts
node scripts/receiver-performance-check.ts
node scripts/receiver-gallery.ts
pnpm check:campaign
```

Tests cover off-centre placements, repeatable body/visual alignment, cube support,
E pickup, grapple removal, loss of flooring, obstruction/overlapping-sensor guards,
player exclusion, independent receivers, two-client agreement, one sound per
delivery, and silent reconnection. DEADLOCK's authored-start solve includes the
physical final FEED-to-relay hatch catch, three live deliveries and both arrivals.
The focused suite passes 58 checks; the public/editor browser review passes 26,
and DEADLOCK's full solve passes seven campaign/receiver checks. Browser pixel
samples cover full free, carried and powered cycles, immediate removal, and
static reduced-motion states. The 17-second actual canvas recording covers the
same lifecycle; its gallery copy is a fixed crop, at normal speed. Frame sequences
were inspected across the free/powered cycles and the full colour transition.
The complete local unit suite passes 595 tests (two conditional skips), and all
three HTTP smoke checks pass against a running production build. The five-room
campaign passes all 78 checks, including restart persistence. Its first run missed
USE AFTER FREE's scripted `refugeC` landing; the unchanged scenario passed an
isolated repeat. Both reports are retained; no traversal or physics was adjusted.

A separate diagnostic runs the maximum eight cubes and 48 receivers through
the production editor at once: 180 sampled frames, median 16.7 ms, 95th percentile
16.8 ms on this headless Chromium run. This is a bounded local measurement, not
a performance guarantee for every browser/device. Detailed motion becomes subtle
at shaft overview scale; bright outlines, green status and separated badges carry
the meaning there. Local phases need not match exactly between clients.

Reports are under `.workbench/reports/2026-10-16-payload-energy/`; selected
browser captures are retained in the gallery. Automated review is not human art
or two-player acceptance. Broader machinery redesign remains outside this pass.
