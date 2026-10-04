# C8 vertical slice — updated 2026-10-05

Status: three tutorials plus UPLINK; awaiting human puzzle/feel testing. This is
a gameplay prototype, not an accepted specification for a new binary.

## Design and room layouts

The default experience supersedes the four wiring/input tutorials. No new
binary, trace, account, multiplayer service or generated CFG layout was added.
The old data, replay, sockets and their tests are retained; the new entry point
imports only the C8 slice. The previous Binary Ninja and obfuscation research
workspaces were read but not modified.

| Room | Hand-authored layout | Physical solution |
| --- | --- | --- |
| PRESSURE | 1,250 × 720; continuous floor at y=560; cube at x=310, plate at x=610, exit at x=1,130 | E carries/drops the cube. Either a player or resting cube depresses the plate. Leave the cube there to hold the door open, then hop past the solid cube. |
| SWITCH | 1,420 × 780; near bank ends x=460, far bank starts x=880; 420-unit pit; lever x=300; anchor ring (770,226) | Lever ON makes the ghost card solid and enables its marked ring. Hold click and move right, or jump and tap Space again at the highlighted target. Release on the rightward swing; the far bank is broad. |
| RELAY | 2,000 × 800; Plate A x=375; banks end/start x=480/920; 440-unit pit; anchor (780,226); bridge lever x=1,080; Plate B (1,270,470) | Cube holds A while the player crosses. The lever permanently locks the bridge and code steps ON and sets the far-bank checkpoint. Retrieve the cube across the bridge and carry it to B to hold the exit open. A lower crumble detour drops onto a safe recovery floor. |

RELAY's steps are y=470 and y=410, then an exit shelf at y=350. The inactive
card at y=320 remains non-solid; it is not classified as bogus. The amber
crumble at y=520 arms for 0.6 s after contact, disappears for 2.4 s, and
reappears. Falling from it lands on architecture at y=650; a y=550 step gets
back onto the intended path. The recovery step and first code platform are widened
to leave space beside the cube now occupying Plate B. The pit is the lethal portion. Death respawns
immediately with a brief flash, preserving switches and cubes left on plates.

The future cooperative reading is visible across one open gap: one player
holds A, another crosses and locks the bridge lever, then the first walks the
return bridge. A cube can then replace a player on Plate B to hold the exit.
The single-player route requires that return crossing to retrieve the cube. No network
semantics are implemented or implied.

## UPLINK: the first retrieval puzzle

All new machinery, strings and controller signals are **mock-greybox**. No new
binary was generated and no obfuscator evidence is asserted. This room is a
candidate physical state machine for human playtesting, not yet a specification
for a real obfuscated controller.

UPLINK is 2,440 × 1,100. The lower floor is y=860, the upper decks y=260: a
600-unit ascent. Near architecture ends at x=480 and resumes at x=960, leaving
a 480-unit death gap. Plate A is at (320,860); the ring is at (780,526).
The cube cannot be pulled from A by someone standing on the far bank. The
initial marked anchor is the only grapple target, well below the upper decks.

The relay switch at (1140,860) powers the fixed R1 pair, whose two doorways are
at x=120 and x=1300. Both face right into clear floor space. Plate B (1510,860)
powers the 240-unit-wide lift shaft at x=1630–1870; the field extends from y=860
to y=150. Its top gently holds riders above the upper landing instead of ejecting
them. The upper latch is at (1970,260). A 100-unit safe drop between the control
deck (1870–2130) and payload deck (2230–2440) provides a return route to the
machinery floor and a forgiving jump to the node. Node C is at (2320,260).
The final exit is back to the left, at (1110,120), on a separate upper shelf.

Intended solution:

1. Put the cube on A; grapple across the gap. Power the relay with the far lever.
   This sets the far checkpoint. The relay switch remains a genuine ON/OFF toggle.
2. Enter gate B to return to the near side. Retrieve the cube, carry it through
   A → B, and leave it on Plate B. The grapple turns off; the lift powers up.
3. Ride the lift, steer right onto the broad control deck, and operate the upper
   latch. It permanently holds lift power, lights the service landing, and sets
   the upper checkpoint. The final route remains ghosted and the exit closed.
4. Drop through the safe gap to the floor, return for the cube on B, and ride
   the now-latched lift carrying it. Jump the short deck gap and put it on C.
5. C requires a **cube payload**: player occupancy alone does not qualify. It
   materialises the upper return route across the lift and opens the exit.
   Leave the cube on C, jump back onto the control deck and follow the new route
   left to the exit. Being on the payload deck does not remotely finish the room.

The environment states the goal, “GET THE PAYLOAD TO THE UPPER NODE”, and labels
mechanisms. It does not print this solution. The relay and upper latch each
create a reason to go back for a cube that had to be left behind. The lower
floor is safe except for the initial grapple pit. Falling from the upper area
costs travel, not a full puzzle reset. R returns to the latest checkpoint.

Future co-op interpretation: one player can hold A while another crosses and
powers the relay; either can then return through the pair. A player can hold B
while a partner rides and latches the lift, freeing the first player to move.
The final cargo condition currently requires the cube. These are physical roles,
not implemented multiplayer or synchronization semantics.

## Reusable LiftField and RelayGatePair contracts

`src/slice/machinery.ts` owns transient powered devices. Room definitions supply
geometry and named output signals; the world binds controller outputs to their
power. The controller never sees coordinates, particles, bodies or timers.
`machinery-render.ts` draws the industrial emitter, ascending scan/code fragments,
and paired upright relay frames. Both devices have dark/off and illuminated/on
states and activation pulses. `MachinePresentation.describe` accepts an optional
output name for per-machine string feedback (RELAY LINK ESTABLISHED, LIFT FIELD
ONLINE, ROUTE UNLOCKED, UPLINK READY). These remain replaceable cosmetic effects.

**LiftField:** player and loose cube simulation accept the same optional
`VerticalMotion` influence. Within a powered volume it replaces gravity with
acceleration toward a bounded vertical target (1,800 units/s², maximum ascent
240 units/s); the target slows toward a hover at the top. Horizontal speed is
capped at 240 inside the field, with 1,000 units/s² of extra braking when no
horizontal input is held. This lets riders settle in the shaft without continual
counter-steering. The field provides useful steering but no swing-energy
launch. Exiting or switching off immediately restores ordinary gravity and
collision, preserving position and current bounded velocity. Entering a lift
cancels an attached grapple. Carried cubes follow the rider once and receive no
independent field force. No lift timers or velocities are saved.

**RelayGatePair:** two fixed authored upright gates share one pair ID and one
output. Player and loose cubes use the same bidirectional overlap transport.
Each entity has a 0.65 s cooldown. Arrivals are placed 18 units beyond the frame
plus the entity half-width, at the destination floor, facing outward in velocity.
Horizontal velocity is preserved up to 240; vertical velocity resets to zero.
The player rope, jump buffer and coyote timer are cleared. A carried cube moves
with its rider, and the entire payload clearance is checked at the destination.
Blocked or out-of-room destinations reject transport. Stationary arrivals do not
bounce back. There is no arbitrary portal placement or high-speed portal fling.

## Reuse and module boundaries

- `src/engine/physics.ts`: reused fixed-step AABB movement, coyote time, buffered
  variable-height jumping, one-way collision, cube body physics and old rope
  implementation. Original grapple inspected in the previous Crit 5 source.
- `src/render/ninja.ts`: original Crit 5 character drawing, including dark body,
  glowing visor/outline/halo, scarf, velocity lean, afterglow and running legs.
- `src/render/camera.ts`, `src/ui/input.ts`, `src/render/fx.ts`: reused smoothing,
  look-ahead, edge-latched input, overview framing and particle effects.
- `src/slice/rooms.ts`: coordinates and authored object definitions only.
- `src/slice/world.ts`: pressure sensors, toggle/carry interactions, bodies,
  hazards, crumble timers, signal-to-object bindings and logical checkpoints.
- `src/slice/controller.ts`: pure, coordinate-free controller interface.
- `src/slice/presentation.ts`: replaceable machine/string presentation adapter.
- `src/slice/game.ts`, `storage.ts`, `progress.ts`: lifecycle, persistence client
  and versioned shared schema, separate from simulation.

Static architecture is always solid and unhookable. Code cards follow named
output signals for collision/illumination. Only cards explicitly marked as
anchors expose a grapple point. The authored crumble type is named
`crumble-prototype`; it must never acquire an evidence-backed bogus label
without retained experimental proof. The interface/header/debug view labels
all current controllers and displayed string effects as mock.

## Mock controller contract for a later trace adapter

`RoomController.evaluate(roomId, inputs)` returns a `ControllerFrame` containing
`source` and `outputs`. The shipping adapter always uses `source: mock-greybox`.
There are no fabricated opcodes, addresses, traces or obfuscator provenance.

Inputs, all booleans:

- `plateA`, `plateB`: momentary physical occupancy by a grounded player or loose cube.
- `cubeOnPlate`, `cubeOnPlateB`: cube-specific occupancy of A and B, for diagnostics
  and logical saves. Each implies its corresponding plate input. One cube cannot
  occupy both plates at once.
- `switchB`: persistent lever state, retained on death/reload. It toggles in SWITCH
  and UPLINK (relay power), and locks ON after its first activation in RELAY.
- `switchC`: UPLINK's upper lift latch, owned by physical room state and never
  cleared by another interaction. It also records the upper checkpoint.
- `plateC`, `cubeOnPlateC`: upper node occupancy and cube-specific occupancy.
  The final UPLINK payload condition explicitly requires the cube.

| Output | PRESSURE | SWITCH | RELAY | UPLINK |
| --- | --- | --- | --- | --- |
| `exitDoor` | `plateA` | `switchB` | `switchB && plateB` | `switchC && cubeOnPlateC` |
| `grappleAnchor` | false | `switchB` | `plateA` | `plateA` |
| `bridge` | false | false | `switchB` | false |
| `codePlatformA` | false | false | `switchB` | `switchC` (service landing) |
| `codePlatformB` | false | false | `switchB` | `switchC && cubeOnPlateC` (upper return route) |
| `relayGates` | false | false | false | `switchB` |
| `liftField` | false | false | false | `plateB || switchC` |

The evaluator is combinational; the physical lever owns its toggle/latched state.
A/B cube flags do not independently override plate inputs; C is the explicit
cargo sensor. Tests enumerate all 256 boolean combinations in all 4 rooms, including physically inconsistent
combinations, so the mock contract is unambiguous. Future retained exhaustive
traces can implement the same adapter. Neither the binary nor its trace data
should own geometry, physics, crumble guesses or animation timing.

World output transitions pulse the bound platforms. `MachinePresentation`
receives the controller frame and selects authored text for the display. Its
hex-to-readable animation is deliberately cosmetic. Replace this presentation
adapter with genuine retained string-decoding events when available; current
text is not Hikari, Polaris, Tigress or OLLVM evidence.

## Character, cube and controls after playtest feedback

The character uses the actual previous game's canvas drawing routine, not a new
approximation. Gameplay collision remains 22 × 34. C8 cubes grew from 36 to
44 units per side (legacy socket cubes keep their previous size).

A resting loose cube is a solid collider for the player. It supports standing
and jumping while continuing to press its plate. Carried/falling cubes do not
act as airborne platforms. Grappling the cube under the player's feet is
rejected so it cannot become a self-lifting elevator. Cube simulation excludes
its own player-only collider.

Space on the ground jumps. A new Space press while airborne consumes the jump
only if the same probe used by the visible targeting hint finds an active marked
anchor. That press latches the rope; another Space press releases it. Key release
alone does not detach a keyboard hook. Clicking takes over with the existing
hold/release behaviour. Landing, respawning, opening the menu, losing focus or
losing the anchor signal clears the keyboard latch. W/up remain ordinary jump
aliases. No automatic hook is fired merely by continuing to hold a ground jump.

## Grapple tuning and known limits

| Setting | C8 value |
| --- | --- |
| Maximum range | 500 world units |
| Aim assist | 26 units around a 20 × 20 marked target; hook snaps to the ring |
| Automatic reel speed / minimum rope | 250 units/s / 200 units |
| Attached gravity | 1.35 × normal gravity |
| Swing acceleration | 1,350 units/s² |
| Swing damping | exponential 0.25 horizontal / 0.9 vertical per second |
| Attached velocity cap | 800 units/s overall; upward speed limited to 360, including after rope correction |
| Release cap / retained momentum | 740 units/s overall / 100% horizontal, 55% vertical; upward speed limited to 240 |
| Release boost / attached jump kick | zero / none |
| Cube pull | up to 330 units/s, with low gravity and normal body collision |

The old reel added inward momentum every simulation step. C8 approaches a
bounded inward speed instead. Alternating left/right input for 30 simulated
seconds remained under the cap. Releasing/re-hooking cannot stack the old
jump kick; inactive anchors release attached ropes immediately. Cubes never
enter the swing-anchor list. Cube pulling is disabled in PRESSURE with all
other grapple input.

Initial tuning stranded the player below the anchor and made the far-bank
release too narrow. Testing led to higher rings, shorter (still unjumpable)
gaps and the current reel speed. Successful browser crossings start near the
lip, hold click + D, and release on the first rightward swing. The intended
route needs neither jump-launching nor manual reeling.

The 2026-10-05 tuning restores more sideways carry without the old upward
release kick. Horizontal drag is lower; vertical drag and upward-only caps
keep the arc shallow while preserving gravity on the downward swing. In the
same simulated SWITCH crossing, the release begins at about 696 horizontal
units/s versus 607 previously; removing the old release loss retains almost
all of that speed. With movement released too, the player rises less than 16
units after detaching and lands safely beyond x=990. Ordinary jumps are unchanged.

No runaway speed was observed in the stress or browser tests. This is not an
exhaustive exploit proof: targeting does not currently reject a marked anchor
behind intervening architecture, and a player can repeatedly re-hook the same
marked target. Current rooms keep anchor sightlines open. Speeds/ranges remain
bounded. Do not generalise these layouts into unrestricted traversal without
further testing.

## Persistence and deployment

`server/app.ts` is a dependency-free Node 24 HTTP server replacing BusyBox. It
serves `dist/`, the complete escaped README at `/readme/`, and same-origin
`GET/PUT /api/progress`. The Docker image copies only the build, server and two
shared schema/controller modules. Fly configuration, one-machine sizing and
its `/data` mount are unchanged. This task does not deploy or push the commit.

An HttpOnly, SameSite=Lax, one-year UUID cookie identifies a visitor (Secure
behind Fly HTTPS). `/data/<visitor UUID>.json` contains an envelope with visitor
ID, revision, update time and version-3 progress:

- current and completed rooms;
- per-room switch/bridge latch, cube-on-Plate-A/B and entry/far-bank checkpoint;
- discovered mechanics/notable actions and the last 40 timestamped events.

Writes validate schema and body size, serialize per visitor, fsync a temporary
file, atomically rename it and fsync the directory before acknowledgement.
Revision mismatches return 409 so competing tabs cannot silently overwrite.
Missing files mean new progress; unreadable/corrupt existing files return 503
without being replaced. This design targets the configured single process and
volume, not multiple server writers.

The client writes only logical changes/events, coalesces pending saves, retries
network failures, and reports pending/confirmed/conflicting status. No player
position, velocity, rope or frame snapshots are persisted. Cube-on-plate saves
reconstruct a cube at the correct plate, including B; other loose cubes return to authored spawn.
A carried cube therefore need not be rescued after returning to the site.

Existing version-1/2 saves migrate in memory to version 3. Version 1 gains an
empty Plate B as before. All old rooms, visitor identity, revisions, mechanics,
completion and history are preserved. A visitor who finished the three tutorials
continues into UPLINK; other visitors keep their current room. The next successful
write persists the new schema.

UPLINK adds three room-memory booleans: `switchC`, `cubeOnPlateC`, and
`cubeTransferred`, plus an `upper` checkpoint value. The transferred flag records
that the payload reached the relay side; it is recovery information, not a
controller input. An unplaced/in-transit cube restores to the safe cargo dock at
(1400,838) after transfer, or its original spawn beforehand. Important A/B/C plate
placements restore exactly. Upper checkpoint spawn is on static architecture;
restoring never depends on an inactive code platform. The two new latches/room
checkpoints and final payload are covered by real process-restart tests.

`DATA_DIR` overrides `/data` locally. Visitor progression and room memory are
separate schema fields, so later shared room state can have its own identity
and authority. This is not already a multiplayer persistence layer. Clearing
cookies loses the browser's reference to its anonymous save. Initial API
failure offers explicitly unsaved play; it does not pretend local state was
written to the server.

## UPLINK playtest review and remaining questions

Automated playback completed UPLINK without a death, using ordinary input events
and no world/controller overrides. Both gate directions, two lift rides, safe
return drop, upper deck jump and final return route worked. The browser pauses
and reloads at each new checkpoint. The lift ride now releases the movement key
and waits for the top; it does not rely on a frame-perfect release or continual
scripted counter-steering. Screenshots show the overview, gate cargo, lift ride,
upper payload and restored save.

The first lift pass inherited too much unsteered air drift. That was awkward in
control review: releasing D near the shaft centre could carry the rider out
before reaching the top. Field-only braking fixes that, without changing the
grapple's horizontal momentum. An additional RELAY reload test initially tried
to walk through its restored solid cube; the test now approaches beside the cube
before jumping onto it. The older RELAY approach also used a timed coast after
jumping the cube; on one run that put the hook start beyond the bank and left the player hanging short
of the release point. The browser now lands on the bank before aiming, using
normal directional braking. No tutorial geometry was changed to accommodate tests.

Manual playtesting still needs to answer:

- Are the matching R1 gate labels and illuminated frames enough to suggest a
  return trip, without a step-by-step instruction? Gate activation is by walking
  into the frame; accidental entry near a powered gate may initially surprise.
- Does LIFT LATCH / LOCKED make it clear that B's cube is now free to move? Its
  lamp, persistent lift, and newly active service platform provide feedback.
- Does the safe upper drop read as a useful return route? It is deliberately
  not a death pit, but a player may initially avoid dropping back to the floor.
- The final code route crosses an active lift. Walking through it gives a brief,
  bounded rise before landing back on the route. This is traversable; whether
  that feels useful or unnecessary remains a human feel question.

No brute-force exploit proof is claimed. Tests cover gap jumps, near-cube pull
range, initial grapple/re-hook ascent, cube-assisted jumps, taking B's cube before
latching, final cube-only occupancy, and blocked/out-of-room gate exits. Known
through-wall hook targeting remains a limitation of the inherited grapple;
UPLINK keeps the only anchor below and out of range of its upper machinery.

## Validation and playtest observations

- `pnpm typecheck`: passed.
- `pnpm test:unit`: 120 passed, 2 existing conditional tests skipped for tutorial
  rooms without pits; existing gameplay assertions retained.
- `pnpm build`: passed; the default bundle excludes the previous binary tutorial.
- `pnpm test`: both original HTTP invariants passed against the production server.
- `pnpm check:browser`: real CDP keyboard/mouse route through all four rooms,
  including a deliberate failed jump, cube pull, mouse and Space grapple
  crossings, permanent return bridge, A-to-B transfer, standing on the cube,
  checkpoint reset, reload/continue with B held, and crumble recovery,
  final completion save, debug state, screenshots and zero console errors. UPLINK
  adds both gate directions, carrying through a gate, both lift rides, cube retrieval,
  upper payload, and reloads at both new checkpoints.
- Restart test: save RELAY, SIGKILL the server, launch a new process on the same
  temporary `/data`-style directory, load the same cookie, compare saved state.
  Also checks independent visitors, conflicting writes, bad payloads, bounded
  request sizes and preservation of corrupt files. The HTTP suite also migrates
  real on-disk version-1 and version-2 saves. Client tests cover visible
  unsaved startup, retry/coalescing and conflict handling.

Automation confirms reachability and behaviour, not whether a person finds it
fun. Remaining points for manual playtesting:

1. Holding the grapple indefinitely leaves a pendulum rather than completing
   traversal. Release timing still needs teaching; missed releases are quickly
   recoverable. The first tuning was too unforgiving and has been revised.
2. A cube is put down in front of the player, not directly underneath. Wide
   plates tolerate placement errors, but a player may initially overshoot.
3. The crumble is recoverable, but its recovery route requires turning left and
   jumping back up. The unstable/prototype label may make it less tempting. After adding the
   solid cube to B, the first/recovery steps were widened to leave a clear route
   back up beside it.
4. RELAY's title scrolls out of view as the camera follows; the plate, gap,
   anchor and switch retain useful sightlines. Tab gives a full-room overview.
5. Touch controls are inherited but unvalidated; desktop was tested at 1600×900
   and the menu inspected at 960×640. No Docker/Fly deployment test was run.

Screenshots retained in `docs/playtest/` show the implemented rooms and restored
continue screen. The next step is a human playtest of this slice, not a new
obfuscated controller. UPLINK-specific screenshots use the `uplink-` prefix.
