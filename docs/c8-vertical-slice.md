# C8 vertical slice — updated 2026-10-05

Status: three mock tutorial rooms plus **validated-trace UPLINK**. The accepted
physical puzzle is now driven by the retained Windows OLLVM-16 BCF controller.
Human playtesting remains the next step; this integration does not redesign the puzzle.

## Design and room layouts

The default experience supersedes the four wiring/input tutorials. Linux consumes
the validated Windows export; no binary was rebuilt or executed here. There are
no accounts, multiplayer service or generated CFG layouts.
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

UPLINK controller signals and assembly use **validated-trace** evidence from
`uplink_controller_ollvm_bcf_v1`. Machinery geometry/physics and string reveals
remain authored game abstractions. PRESSURE, SWITCH and RELAY still use
**mock-greybox** controllers; RELAY retains its explicitly unproven crumble prototype.

UPLINK is 2,440 × 1,100. The lower floor is y=860, the upper decks y=260: a
600-unit ascent. Near architecture ends at x=480 and resumes at x=960, leaving
a 480-unit death gap. Plate A is at (320,860); the ring is at (780,526).
The cube cannot be pulled from A by someone standing on the far bank. The
initial crossing slab is well below the upper decks. Other code slabs accept
hooks once enabled; the service/upper route remain off until their controller
conditions hold. The optional crumble is far outside the initial crossing range.

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
   A → B, and leave it on Plate B. The crossing slab turns off; the lift powers up.
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
- `src/slice/validated-controller.ts`: synchronous retained-state adapter;
  `src/data/uplink-bundle.ts`: identity/coverage/reference validation.
- `evidence-presentation.ts`, `evidence-render.ts`, `evidence-inspector.ts`: real
  assembly excerpts, chronological visual replay and optional detailed inspection.
- `src/slice/presentation.ts`: replaceable machine/string presentation adapter.
- `src/slice/game.ts`, `storage.ts`, `progress.ts`: lifecycle, persistence client
  and versioned shared schema, separate from simulation.

Static architecture is always solid and unhookable. Code cards follow named
output signals for collision/illumination. All enabled floating code/crumble slabs accept a grapple across their header;
inactive/absent slabs do not. Static architecture remains unhookable. The authored crumble type is named
`crumble-prototype`; it must never acquire an evidence-backed bogus label
without retained experimental proof. UPLINK also has a separate `crumble-proven` object linked to retained BCF proof.
The header/debug view identifies the active controller source; string effects
remain authored regardless of controller source.

## Controller contract and validated UPLINK adapter

`RoomController.evaluate(roomId, inputs)` returns a `ControllerFrame` containing
`source`, `outputs` and optional retained-state evidence identity.
`roomController` selects `validatedTraceController` for UPLINK and `mockController`
for the three tutorials. Malformed UPLINK data throws; there is no mock fallback.

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
cargo sensor. The table above describes the accepted semantics; the shipping
UPLINK adapter does **not** evaluate those equations. It encodes the five inputs
using the exported bit mapping, selects the retained state, and returns its BCF
native outputs (cross-checked against clean outputs and trace finals). Tests
enumerate all 256 frontend combinations, including inconsistent occupancy flags.
The old mock UPLINK equation remains a regression oracle, never a runtime fallback.
Neither the binary nor its traces own geometry, physics or animation timing.

World output transitions pulse the bound platforms. `MachinePresentation`
receives the controller frame and selects authored text for the display. Its
hex-to-readable animation is deliberately cosmetic. Replace this presentation
adapter with genuine retained string-decoding events when available; current
text is not Hikari, Polaris, Tigress or OLLVM evidence.

## Windows evidence consumed on 2026-10-05

Before integration, frontend HEAD was
`ec1e4ae206f8a90db2da4128b2cbd0938deacfbf`, matching the experiment's accepted design.
The authoritative read-only experiment is
`Workspace/binary_binja_redesign/experiments/uplink_controller_ollvm_bcf_v1`.
Its `python3 -I -B verify_bundle.py` passed directly from the shared filesystem,
without rebuilding/executing a PE or rerunning an emulator. Its limits and full
report are retained in `game_data/uplink-verification.json`.

- Specimen: `uplink_controller_ollvm_bcf_v1`; schema `room-controller/v1`, version 1.
- Browser bundle SHA-256: `87dec9e470119a951eb1486e25d62226c72b34367e754b0a14b4e5a818c4c082`.
- OLLVM BCF PE SHA-256: `1e6e39f015613d03560e1dc49a93a8de43e16ea2f0006ee8809632cc3972aa61`.
- Clean PE SHA-256: `e81b410c5389c6ac8683b0105a1663ff6177fa5f5d1b0f14ff3c78e088147945`.
- 32 logical states / 256 frontend projections, 64 retained clean/BCF native
  observations, 32 retained BCF traces, 224 actual output stores, six curated
  regions, 34 guards and 17 proven clones. Ten portable negative fixtures rejected.

The runtime bundle is a **byte-identical** copy in tracked `game_data/`, with a
small source record. `pnpm check:uplink` pins its SHA-256 and validates its
structure before every build. Runtime validation checks supported schema,
specimen/PE, input bits, all state keys, canonical outputs, native/trace agreement,
raw addresses/bytes/ranges, occurrence identities, semantic store ordering,
curated region bindings and clone proof links. Import failures produce a visible
error screen instead of invented outputs. These checks protect the integration;
they do not replace the experiment's PE/proof verifier.

`Workspace/` is excluded from the Docker image. Neither the deployed Node process
nor browser reads that share. No PE, PDB, virtual environment or build corpus was
copied. Older v1/v2 tutorial data and their tests are retained.

The exact input key is `plateA + 2*switchB + 4*plateB + 8*switchC + 16*cubeOnPlateC`.
`cubeOnPlate`, `cubeOnPlateB` and `plateC` remain physical diagnostics/save state,
not extra binary inputs. All seven outputs are retained: `grappleAnchor`,
`relayGates`, `liftField`, `codePlatformA`, `codePlatformB`, `exitDoor`, `bridge`.
Bridge remains false in this contract. Switch history remains physical room state.

### Real assembly and explanatory replay

The six exported machinery mappings drive assembly displays at the anchor, R1
relay, lift, service landing, upper return route and exit. Each shows 3–5 actual
instructions surrounding its selected retained store. A real excerpt address is
printed on the physical slab, with disassembly and authored string feedback
directly underneath. The inspector retains full address ranges and raw IDs. Excerpts are contiguous within a retained raw
block. The original Binary Ninja address gutter, mnemonic/operand colours and
lit/ghosted block treatment are adapted without changing collision bounds.
Physical code slabs use real native addresses instead of labels such as SERVICE.
Small CODE/GHOST type tags describe game state, not original executable symbols.
Display-to-machine tethers and permanent grapple rings have been removed.
Service and payload regions overlap; the inspector preserves that awkwardness.

Physical outputs update synchronously on input sampling. Independently, the
renderer replays the selected trace's actual chronological instruction addresses,
including helper-call timing. A base 180 retained steps/s and at least 160 ms
between output commits make the seven stores readable, including false writes.
This is presentation time, not simulated CPU speed. Instruction highlights,
commit pulses and the ordered debug HUD commit list refer to retained addresses/events.
Occurrence IDs and visit numbers are preserved (this specimen happens to have no
repeated raw-block visits). A new state restarts its own trace; no artificial edge
joins two evaluations. Brief intermediate states can be superseded visually;
world outputs are never queued behind animation.

The **Evidence** button pauses play and opens full retained regions, raw IDs,
addresses/bytes, all occurrences, chronological commits, PE identity and proof
assumptions. It can reveal the optional clone's classification on the canvas.
The ordered trace HUD appears only with Debug to reduce ordinary play clutter.
The debug panel includes controller state/trace identity, replay cursor and save
state. Inspector/reveal state and trace timing are not saved.

### Proven clone as an optional physical metaphor

Recommended candidate `bcf_clone_originalBB71alteredBB`, raw block `bb_000018AA`,
native range `0x1400018AA–0x1400018C7` (exclusive), is represented by a new optional
200×28 platform at **(2220,740)** above the existing safe floor y=860. This is the
only geometry addition. It is clear of the accepted x=2180 return drop, introduces
no anchor, and cannot reach the upper node. The full solution works without it.
Contact uses the existing 0.6 s crumble / 2.4 s respawn behaviour; falling loses no
puzzle state. The code plaque shows all six real instructions unchanged.

Ordinary play labels the slab with its real native address and a CODE type tag. The inspector exposes its
proof immediately; its reveal checkbox can show its **BOGUS** type without removing
or simplifying any instruction. The clone resembles codePlatformB/exit writes,
but those unreachable instructions are **not** replayed as successful output events.

Proof is linked to `opaque_guard_25` and `opaque_guard_26`, frozen IR clone origin,
actual compiler/native mapping and the retained universal 32-bit parity argument.
Retained proof SHA-256:
`4b84a695dd09f6097a9bae5c2cef2b6eb86e7293cef57a6e520024fefe530eec`.
The portable verifier checks the exact guard forms and incoming control flow
under normal-entry, intact-code/register-flow and successful-load assumptions;
it does not rerun Z3 or claim arbitrary corruption/interior-entry safety.
Nonexecution in the 32 traces alone is **not** the proof. Physical crumbling is a
gameplay metaphor, not a claim that the CPU executes this clone then collapses it.

### Evidence boundary and persistence

**Real:** retained source/controller identity, OLLVM BCF PE identity, exhaustive
canonical-state correctness, chronological traces/output commits, actual assembly,
and linked bogus-clone provenance/proof under the documented assumptions.

**Authored:** all room placements, platform collision, grapple/relay/lift physics,
checkpoint policy, crumble timing, semantic labels, playback speed, and every
encoded-looking → readable flavour string. RELAY LINK ESTABLISHED, LIFT FIELD
ONLINE, ROUTE UNLOCKED and UPLINK READY remain `MachinePresentation` effects.
No string encryption/decoding evidence is claimed by this integration.

Save schema stays version 3. Reload reconstructs switches, latches, checkpoint and
important cube placement, then selects a fresh validated frame. Far checkpoint,
upper checkpoint with B held, and final Node C state are covered by reconstruction
and real server process-restart tests. Animation state is never persisted.

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
| Aim assist | 26 units around the slab address bar (full width, up to 24 high); the main crossing slabs retain their tuned centre snap |
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

Binary-integration review: the first assembly placement crowded the relay lever;
the excerpt is now capped at five instructions and moved clear of the control.
The optional clone retains all six instructions. Normal camera view supports
reading nearby excerpts; overview text is small, so Evidence provides the full
listing at UI scale. Provenance is intentionally detailed and needs scrolling.
Fast plate transitions can interrupt an explanatory replay, while the immediately
applied physical state stays correct. None of these required a physics change.
The existing brief lift rise on the final return route remains unchanged.

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
- `pnpm test:unit`: 145 passed, 2 existing conditional tests skipped for tutorial
  rooms without pits; existing gameplay assertions retained.
- `pnpm build`: passed, including pinned UPLINK validation; the previous binary
  tutorial remains outside the default runtime. Full retained UPLINK data makes
  the game chunk about 930 KB / 101 KB gzip; Vite emits its advisory size warning.
- `pnpm test`: both original HTTP invariants passed against the production server.
- `pnpm check:browser`: real CDP keyboard/mouse route through all four rooms,
  including a deliberate failed jump, cube pull, mouse and Space grapple
  crossings, permanent return bridge, A-to-B transfer, standing on the cube,
  checkpoint reset, reload/continue with B held, and crumble recovery,
  final completion save, debug state, screenshots and zero console errors. UPLINK
  adds both gate directions, carrying through a gate, both lift rides, cube retrieval,
  upper payload, evidence inspection, source/state identity, optional proven-clone
  contact/recovery after completing the main route, and validated frame
  reconstruction at the far, upper and Node C reloads.
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
continue screen. The next step is a human playtest of this integrated slice.
New evidence screenshots use the `uplink-binary-` prefix; earlier greybox
screenshots remain as historical review material.

## Address-slab presentation revision — 2026-10-05

Following playtest feedback, a code object now has one physical address bar,
with actual disassembly and its authored string directly beneath. The renderer
uses the original Crit 5 layering: listings first, collision slabs and controls
above them. Headers read real retained addresses for both live and proven-clone
blocks; semantic machinery names remain available in Evidence. Header addresses
can change with the selected retained branch, just as the instruction excerpt does.

Removed the detached assembly cards/tethers, permanent ring labels, repeated
“REAL x64 / full region in EVIDENCE” footers, the duplicate UPLINK wall string
panel, and decorative UPLINK wiring lines. Trace telemetry is now debug-only;
real execution still highlights instructions and pulses machinery during play.
Equipment listings sit beneath the relay power switch, lift emitter and exit
architecture. Relay gates themselves have no code listing. The switch listing
shows the same retained relay-output region; its location is authored presentation,
not a change to the exported machine binding. This also demonstrates the
under-button display treatment without duplicating another floating panel.
Strings remain authored effects, identified in the menu and evidence inspector.

Regular platforms here means floating code slabs. All enabled code slabs and
present crumble slabs accept hooks across the address bar; ghosted/collapsed
blocks and decorative listings do not. Static floors/ledges remain unhookable.
PRESSURE still disables the grapple. The original crossing attachment centres,
range and swing limits remain unchanged. New code surfaces reuse the existing
ray/preview/Space input path. A centred crossing attachment with a wider catch
surface preserved the accepted low horizontal swing; snapping to a different
bar edge initially reduced momentum and was rejected by the existing tests.

Type labels are small: STATIC on architecture, CODE/GHOST on retained slabs,
and BOGUS only after the inspector reveal. No addresses were invented for the
mock tutorial blocks. The optional clone retains all six real instructions;
its tighter line spacing keeps the last instruction above the recovery floor.

Validation: 149 unit tests pass (two existing conditional skips), typecheck,
pinned-bundle production build and both running-server HTTP invariants pass.
All 56 real-control browser assertions pass, with zero UPLINK deaths, no console
errors, and successful far/upper/Node C reloads. Fresh screenshots and the browser
log use `docs/playtest/uplink-slabs-*`. Existing saved state and retained evidence
bytes are unchanged.
