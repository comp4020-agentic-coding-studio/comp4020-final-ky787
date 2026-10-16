# PAYLOAD RECEIVER and energy payload — visual design

The receiver is a compact debugger interface: one shallow dark base, short
registration brackets, a cube-sized open bay and thin illuminated circuit traces.
Its outer width is 94 world units, down from the previous industrial arms' 188;
the solid guides rise 16 units instead of 55. The original 90-unit contact strip
remains visible. The larger arms, ribs, fasteners and scanner beam are removed.

The movable payload keeps its 44-unit square containment frame. Four bright
corners surround a softly pulsing cyan energy core, internal circuit channels
and a clear A/B/C mark where authored. Loose/carried frames use amber terminals;
docked frames use cyan. The receiver draws behind the cube, then adds small
front connections at its edge terminals, leaving the core and mark visible.
This is original Canvas artwork and an authored metaphor, not binary evidence.

See the [revised browser gallery](playtest/2026-10-16-payload-interface/index.html)
or [single-image gallery](playtest/2026-10-16-payload-interface/gallery.png).
These are actual production browser captures with physical input. The flat
review fixture is a test scene, not another chamber. The
[previous industrial version](playtest/2026-10-16-receivers/index.html) is retained
for comparison.

## States and alignment

| State | Presentation |
| --- | --- |
| Awaiting | Amber status, AWAITING PAYLOAD, faint registration marks and idle base traces |
| Accepted | PAYLOAD DETECTED immediately; corner guides brighten over 180 ms, connecting traces energize over 400 ms, a base pulse spreads from 160–660 ms |
| Powered | Fixed centred cube, cyan terminals, quiet core pulse and tiny moving highlights on the connecting traces |
| Removed | Connections shut off immediately, amber status returns, base illumination retracts over 280 ms |

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
not wait for that cosmetic alignment.** Connecting traces then engage without
a second sound. This prevents snapping a cube into a player or pushing them into
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
`receiver-render.ts` draws the compact base and connections; `payload-render.ts`
draws the containment frame/core in every room. All run through the shared
`PuzzleRenderer` in campaign, public custom sessions, developer multiplayer and
local physics preview. No level JSON, controller expressions, server occupancy
rules, movement constants, evidence, checkpoint or persistence contracts changed.

## Validation

```sh
pnpm typecheck
pnpm test:unit tests/payload-docking.test.ts tests/receiver-presentation.test.ts tests/shared-cube.test.ts tests/payload-socket.test.ts tests/deadlock-physics.test.ts
pnpm build
pnpm check:receivers
node scripts/receiver-local-check.ts
node scripts/receiver-gallery.ts
pnpm check:campaign
```

Tests cover off-centre placements, repeatable body/visual alignment, cube support,
E pickup, grapple removal, loss of flooring, obstruction/overlapping-sensor guards,
player exclusion, independent receivers, two-client agreement, one sound per
delivery, and silent reconnection. DEADLOCK's authored-start solve includes the
physical final FEED-to-relay hatch catch, three live deliveries and both arrivals.
Reports are under `.workbench/reports/2026-10-16-payload-interface/`; selected
browser captures are retained in the gallery. Automated review is not human art
or two-player acceptance. Broader machinery redesign remains outside this pass.
