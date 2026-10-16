# PAYLOAD RECEIVER — visual design

The receiver is an open cargo dock with a layered bevelled base, exposed guide
arms, structural ribs, fasteners, a recessed status display and illuminated
power channels. It shares materials with ENTRY POINT, BREAKPOINT and the exit
gate, but has a low, open silhouette. It is original Canvas artwork and an
authored machinery metaphor, not binary evidence.

See the [browser gallery](playtest/2026-10-16-receivers/index.html) or its
[single-image version](playtest/2026-10-16-receivers/gallery.png). Captures use
actual rendering and real input in public custom multiplayer, the Level Builder
and a complete DEADLOCK solve. The flat asset-review fixture is a test scene,
not an additional chamber. Diagnostic State Preview is labelled separately in
the full ignored report directory.

## Motion and feedback

| State | Presentation | Timing |
| --- | --- | --- |
| Empty | Amber pilot, AWAITING PAYLOAD, faint electrical sweep across the open bay | Subtle idle |
| Accepted cube | Cyan pilot and PAYLOAD DETECTED immediately; guides settle, scan crosses cargo, a pulse follows the base circuitry | Engagement 0–240 ms; scan 120–740 ms; transfer 480–900 ms |
| Occupied | Quiet cyan circuit pulse and stationary open guides | Steady idle |
| Removed | Amber status immediately; cyan illumination retracts and guide shoes release | 400 ms |

Nothing closes over or locks the cube. Rear components draw before cargo;
shallow front shoes and the scan draw after cargo but before players and ropes.
The cube face, letter and silhouette remain visible. A later delivery can
legitimately trigger another detection; repeated accepted snapshots cannot.

The original 90-unit sensor tread and 44-unit cube dimensions remain unchanged.
The existing sensor permits a cube centre within 59 units of the pad centre
while resting at its floor height. Initial browser review exposed valid
off-centre cargo overhanging narrow guides. The final upper guide opening and
scan span accommodate those placements; the base and illuminated tread remain
centred on the actual sensor. Decorative arms add no colliders or grapple targets.
No visual snapping, delayed power or additional interaction was introduced.

Below 0.72 camera zoom, anchored status badges retain screen-sized text. Nearby
receivers use separate label lanes so DEADLOCK's three statuses do not obscure
one another in the shaft overview. At normal zoom, the inset display and a
small machine/name caption suffice. The camera and aiming transform are unchanged.

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

`receiver-presentation.ts` selects the genuine cube-only inputs and owns a
disposable per-ID clock. `HeroPresentation.reset` baselines loading/reconnection
to active idle without sound or scan replay. Stopped editor State Preview also
settles immediately. `receiver-render.ts` consumes those values through the
shared `PuzzleRenderer` used by campaign, custom sessions and local previews.
Animation poses are exposed as read-only `heroAssets.receivers` diagnostics.

The confirmation reuses credited `relay-on.ogg`: gain .28, playback rate 1.3 and
180 ms cooldown. It uses the existing gesture unlock, mute, volume, distance
attenuation and bounded voice pool. Receiver edges do not also play the generic
plate click. Simultaneous nearby confirmations may coalesce under the existing
audio cooldown; each receiver's visual transition remains independent. Local
developer/editor previews remain silent, as before; multiplayer uses game audio.

## Checks and review limits

```sh
pnpm typecheck
pnpm test:unit tests/receiver-presentation.test.ts tests/hero-presentation.test.ts tests/audio.test.ts tests/payload-socket.test.ts
pnpm build
pnpm check:receivers
node scripts/receiver-local-check.ts
node scripts/receiver-gallery.ts
pnpm check:campaign
pnpm check:public-coop
```

Receiver tests cover physical player exclusion, carrying, accepted placement,
removal, redelivery, two-client agreement, independent clocks, no repeated
confirmation, and silent reconnection. Browser captures include the local
physics preview and the stopped editor State Preview. DEADLOCK's canonical
71-step route still includes the manual final hatch catch, all three live
payloads and both physical exit arrivals.

On 2026-10-16, validation passed: typecheck/build; 571 unit tests (2 existing
skips) and 3 HTTP tests; 22 dedicated receiver browser checks; the 11-step
local CLI two-player contact test; 78 full campaign checks; 49 public custom
multiplayer checks; 56 workbench checks; and the retained evidence checks.

Reports and full captures are in `.workbench/reports/2026-10-16-receivers/`;
selected original browser crops and compact views are retained with the gallery.
Human art/audio acceptance remains useful; automated browser checks are not a
claim of human playtesting. Other machinery, checkpoint behaviour, native binary
evidence, movement and payload sensor semantics remain unchanged.
