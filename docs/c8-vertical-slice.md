# C8 vertical slice — updated 2026-10-05

Status: three mock tutorial rooms plus **CONTROL SPINE**, the enlarged
**validated-trace UPLINK** showcase. The existing Windows OLLVM-16 BCF controller
is unchanged; this pass redesigns its physical chamber and adds authored XOR
presentation. Human playtesting is the next acceptance step.

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

## CONTROL SPINE — showcase redesign, 2026-10-05

The fourth room is now **CONTROL SPINE**, retaining room ID `uplink`, save schema
3 and the exact `uplink_controller_ollvm_bcf_v1` adapter. This is a physical
redesign of UPLINK, not a fifth room or a new controller. The player-facing goal
is **ROUTE THE PAYLOAD TO THE CORE NODE**. The three tutorials are unchanged.

The machine hall is **3,540 × 1,460**. The rope-route revision adds overhead
clearance while retaining the lower puzzle's relative dimensions. Entry and
control wings are at y=1220, with the existing 480-unit death gap
between x=480 and x=960. The far wing ends at x=2260. The upper control deck is
at (1870,620), the service slab at (2260,640), and the broad core deck begins at
(2790,620). Node C is at (3310,620). A raised recovery plinth at y=850 supports
the upper payload bay; its 370-unit wall prevents lower-wing jump/cube shortcuts.
The former LOWER WING / `recovery-step` slab is removed. Walk off the upper
control deck to the right for a safe direct drop; cargo-bay recovery returns left
to the lower floor and the latched lift.

The entry overview now **waits for Space**, or a click on PRESS SPACE TO START.
Physics is paused while players inspect the whole chamber. That press is consumed
without jumping or hooking. Menu/Escape and Evidence remain available. Reloads
at established far/upper checkpoints resume normally. Overview framing can zoom
below the normal follow minimum to fit the entire room on smaller screens.

The exit is above the entry at (210,320), on a broad static shelf at y=460.
Four real return anchors have centres (2720,166), (2240,116), (1760,116),
and (800,116). The proven clone fills the intervening position (1280,116).
Each address slab is 200 units wide; the 280-unit gaps are beyond an ordinary
held run-jump. Swing **under** the slabs and transfer to the next target while
moving left. The real output also powers a catch deck at (1010,510), 550 units
wide, below the unstable anchor. The lift ends at y=580, clear of the upper code,
listings and a normal swing. Upper cargo jumps remain 130 and 110 units wide.
Rope acceleration, range, reeling, speed caps and vertical limits are unchanged.

### Intended flow (design notes, not printed in game)

1. Leave the cube on **A (320,1220)**. Its real anchor at (780,886) lights immediately.
   Grapple the first gap, leaving the payload behind. The gap cannot be jumped.
2. Toggle **relay power (1140,1220)**. R1's two fixed gates at x=120 and x=1300 power
   up and the far checkpoint is saved. Return through B → A, retrieve the cube,
   and carry it through A → B. This is the first retrieval loop.
3. Leave the cube on **B (1510,1220)** to power the existing lift at x=1630–1870.
   Ride alone to the upper control deck. Removing B's cube now still cuts power.
4. Set the physical **lift latch (1970,620)**. It stays set, saves the upper
   checkpoint, holds the lift on and illuminates the service slab. The upper
   status says LIFT FIELD LATCHED; the service listing says PAYLOAD STILL REQUIRED.
5. Walk off the right of the control deck and drop to the lower control wing.
   Retrieve B's cube and ride
   the latched lift again, carrying it. This is the second retrieval loop; no
   death reset is part of the solution.
6. Cross the upper bay with two ordinary jumps via the activated service slab.
   Missing a jump lands on the recovery plinth. Walk left and use the latched
   lift to return with the payload intact.
7. Put the cube on **Node C**. Player occupancy alone, including a player carrying
   the cube, does not satisfy the cargo input. Four return anchors and the catch deck appear
   together and the exit unlocks. A 2.2-second authored camera reveal frames the
   new route and distant exit; controls and binary outputs remain immediate.
8. Leave the cube on C. Jump from the left end of the core deck and hook the first
   overhead slab. Transfer along the five-anchor chain, including the unstable
   clone, and release onto the exit shelf. An overloaded clone drops the player
   onto the catch deck; re-hook after it returns. This replaces the earlier
   optional-shortcut design at the player's request.

The puzzle asks the player to free a payload from a previously necessary job
**twice**. Controls are distributed around a lower loop, vertical shaft, upper
cargo bay and separate return loop. Mechanism names and visible power changes
suggest dependencies; no solution checklist or assembly knowledge is required.

### One validated output, several physical objects

| Retained output | Authored physical manifestation | Actual retained presentation binding |
| --- | --- | --- |
| `grappleAnchor` | Initial crossing slab (`anchor`) | `grapple-anchor-display` |
| `relayGates` | Fixed R1 gate pair; assembly beneath its power switch, none on the gates | `relay-control-display` |
| `liftField` | Existing bounded lift volume/emitter; assembly below it | `lift-control-display` |
| `codePlatformA` | Payload-bay `service` slab | `service-landing-display` |
| `codePlatformB` | Four anchors: `upper-route`, `return-mid`, `return-high`, `return-near`; plus `return-catch` | All five share `payload-route-display` |
| `exitDoor` | Exit above the original entry; assembly below its architecture | `exit-display` |
| `bridge` | No physical manifestation; retained value remains false | No invented region |

`assemblyBinding` is frontend presentation metadata for additional manifestations.
The original exported object IDs still resolve. Debug exposes each object's
signal, authored label and explicit binding alias. Evidence explains that repeated
listings are the **same output/region**, not extra native basic blocks. The final
route shows three real instructions per listing, including the actual output
store; other controlled machinery retains up to five. The clone keeps all six.
The elevated return listings are separate from service and LiftField graphics.

The five inputs remain exactly `plateA`, `switchB`, `plateB`, `switchC`,
`cubeOnPlateC`. `validatedTraceController` and the bundle are unchanged. Physical
state selects the same retained row/trace; there are no supplemental mock UPLINK
outputs or coordinate-dependent controller conditions. Switch C's memory remains
in the physical latch. All existing trace occurrences, ordering, semantic writes,
real addresses, raw bytes and inspector provenance remain authoritative.

### Animated control connections

`src/slice/connections.ts` defines authored physical polylines. Dim wires are
visible before activation; a powered wire illuminates and carries moving dashes
and a travelling pulse from its input toward its output. All tutorial controls
also receive these connections. In CONTROL SPINE, wires link A to the crossing,
relay power to both gates, B and the upper latch separately to the lift, the latch
to service, and Node C to the final route and exit. B's wire turns off when its
cube is freed while the latch feed stays visibly powered.

These are **physical wiring diagrams**, not fabricated CFG edges or retained CPU
timing. They consume the already-selected frame and cannot delay or modify it.
The bogus clone has no invented controller feed or successful-trace pulse. Debug
shows each connection's input/output pair and current powered state.

### Authored single-byte XOR presentation

`src/slice/xor-presentation.ts` stores selected messages as encoded byte arrays
with fixed key **0x5A**. `byte XOR 0x5A` produces each character. Activation reveals
characters from left to right, showing the still-encoded bytes as hexadecimal;
there is no random ciphertext, PE execution or cryptographic-security claim.
Messages include RELAY LINK ESTABLISHED, LIFT FIELD ONLINE, LIFT FIELD LATCHED,
PAYLOAD STILL REQUIRED, RETURN PATH UNLOCKED and UPLINK READY.

`MachinePresentation` remains the replaceable adapter. It selects this authored
byte sequence from an already-applied controller frame; presentation never drives
physics. Tests check exact decoded text, inactive masking, partial reveals,
clamped progress and the authored label. Menu, debug and Evidence identify this
as **authored single-byte XOR presentation**, independent of the OLLVM evidence.
This is not an OLLVM/Hikari/Polaris/Tigress string-decoding experiment.

**Real evidence:** unchanged OLLVM PE/controller identity, 32 canonical retained
states, clean/BCF agreement, chronological traces, semantic output writes, curated
assembly regions and linked BCF clone proof. The portable read-only verifier still
passes from the shared experiment. Nothing in that workspace was rebuilt or altered.

**Authored abstraction:** all floor/slab positions, repeated physical manifestations,
collision, grapple, relay and lift physics, crate handling, checkpoint policy,
crumble timers, camera reveal, semantic labels and XOR messages/animation.

### Unstable rope anchor and recovery

`bcf_clone_originalBB71alteredBB` is the one `crumble-proven` slab at **(1180,110)**,
200 × 28, in the final rope chain. Ordinary play shows its real address and
**UNSTABLE**; Evidence's analysis
checkbox can reveal **PROVEN BOGUS** without removing any of its six instructions.
It keeps the same raw block, native range and retained proof described below.

Foot contact keeps the existing 0.6-second fuse. Loading this particular block
with the rope starts a **1.65-second** fuse, with a shrinking bar and ANCHOR FAILING
warning. Re-hooking cannot restart it. Collapse releases its rope immediately;
it returns after 2.4 seconds. The powered `return-catch` deck supports a deliberate
failure below, with Node C and all latches intact. It is high enough to see and
re-hook the returned anchor. Before C, falling here still lands on the lower
control floor without death, but the intended rope chain is unavailable.

The final route now uses the clone as a temporary support, rather than relegating
it to an optional cargo shortcut. Its physical collapse is a metaphor: the successful
controller trace does not execute these unreachable instructions. Nonexecution
alone is never treated as proof.

### Persistence and future co-op

The existing entry/far/upper logical checkpoints still fit their original static
platforms. A/B/C placements reconstruct from the current authored coordinates;
old UPLINK saves therefore place a saved C payload at the new core, without a
schema migration. Transferred loose cargo still restores at the safe lower dock
(1400,1198). No animation, grapple, cooldown, velocity or camera reveal is saved.
Tests reload at relay power, at the upper latch with B occupied, and with the
cube on C; actual server restart tests reconstruct the validated outputs too.

Future roles remain physical and legible: one partner holds A while another
crosses/powers the relay; one holds B while the other sets the upper latch; the
freed partner retrieves the cube. C eventually needs the payload itself. No fake
players, networking, new schema, or multiplayer authority are implemented.

### Playtest review and remaining human questions

The rope revision preserves tests for both retrieval loops, cargo jumps,
checkpoint reloads, cube-only C, lower jump/cube bypasses, initial re-hook ascent,
B losing power, and recovery while the final route is off. It adds five-anchor
traversal, hook-triggered crumble/cancel/respawn, varied starting positions and
transfer delays, clearance above the lift, non-jumpable return gaps, all 32
controller frames' physical wiring and full-room overview framing.

Browser testing exposed a real recovery problem: the initial catch deck was too
low to see/re-hook the returned clone comfortably. Raising it to y=510 makes the
next target visible and reachable from the recovery area. Late-transfer testing
also justified ending the lift just below the upper deck at y=580. These are
geometry adjustments; the controlled rope and lift physics retain their tuning.
The removed descent step is replaced by a direct safe drop. Missing a cargo jump
now costs another lift ride, which should be judged in human playtesting.

Manual playtest questions:

- Does the relay activation suggest the first retrieval without additional hints?
- Does LIFT FIELD LATCHED make the second retrieval obvious enough, while still
  leaving the player to plan the trip?
- Does the direct right-hand drop from the latch read as safe?
- Are the two cargo jumps comfortable with normal held Space, including carrying?
  Recovery keeps solved machinery and the cube, but requires another lift ride.
- Does the 2.2-second route reveal help orientation without feeling disruptive?
  Distant assembly is small during the reveal; normal view/Evidence retain detail.
- Does PRESS SPACE TO START give enough time to orient without feeling like an
  extra interruption? Is the whole-room view clear at small window sizes?
- Are powered lines helpful without making the assembly/rope view too busy?
- Is the unstable anchor's 1.65-second warning readable while moving? Can players
  anticipate the next target and transfer with Space or click without precision?
- Is the five-anchor return satisfying? A release too late in the arc can stall
  the swing; this is not unrestricted horizontal flight. The catch deck and R
  remain recovery options, with the payload kept on C.

Known inherited limit: grapple rays do not occlude behind architecture. The raised
plinth/range checks prevent the obvious lower-wing clone shortcut in this layout;
no exhaustive proof over every possible input sequence is claimed. Human review
of re-hooking and the new upper bay remains useful before accepting the chamber.
The main airborne route uses the clone; the forgiving catch deck can also be
used deliberately as a slower recovery detour. There is no hidden "touched fake
block" completion flag or extra controller input.

### Rope/wiring revision validation — 2026-10-05

- Typecheck, production build and the pinned 32-state bundle/hash check pass.
- Unit tests: **169 passed**, two existing conditional skips; includes actual
  process restarts at relay, upper latch, Node C and after resetting progress.
- Both running-server HTTP invariants and course evidence checks pass.
- Full real keyboard/mouse browser route: **94 assertions**, zero console errors.
  Both the uninterrupted rope chain and deliberate clone-collapse/re-hook route
  finish with zero deaths, and existing tutorial/save/reset assertions remain.
- Screenshots: `docs/playtest/control-spine-rope-*`, including held overview,
  powered wiring, lift clearance, unstable hook warning, collapse and recovery.
  The exact route log is `docs/playtest/control-spine-rope-browser.txt`.

### Initial CONTROL SPINE validation record (before rope revision)

- `pnpm typecheck`, `pnpm build`, pinned bundle/hash validation: passed.
- `pnpm test:unit`: **158 passed**, two existing conditional skips. Includes real
  process-kill/restart persistence at the far, upper-latch and final C states.
- `pnpm test`: both HTTP invariants passed against the Node production server.
- `pnpm check:evidence`: passed (course process/reflection evidence).
- Shared experiment `python3 -I -B verify_bundle.py`: PASS, read-only; 32 states,
  32 traces, 224 semantic commits, six curated regions, retained BCF proof checks.
- Full real-control browser route: **70 assertions passed**, zero CONTROL SPINE
  deaths, zero console errors. No world/controller overrides or external teleports.
  Screenshots and the exact assertion log are retained in `docs/playtest/`.

Useful captures: [overview](playtest/control-spine-overview.png),
[anchor](playtest/control-spine-anchor.png),
[relay](playtest/control-spine-relay-enabled.png),
[lift](playtest/control-spine-lift-rider.png),
[latch](playtest/control-spine-latched.png),
[assembly](playtest/control-spine-service-assembly.png),
[crumble contact](playtest/control-spine-bogus-contact.png),
[safe recovery](playtest/control-spine-bogus-recovered.png),
[Node C](playtest/control-spine-payload.png),
[automatic return reveal](playtest/control-spine-automatic-return-reveal.png),
[return route](playtest/control-spine-return-route.png),
[assertion log](playtest/control-spine-browser.txt).

The existing Vite advisory remains: the retained-evidence game chunk is about
934 KB / 103 KB gzip. No deployment, multiplayer or new binary was attempted.

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
byte-to-readable XOR animation is deliberately authored presentation. Replace this presentation
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
assumptions. It can reveal the unstable clone's classification on the canvas.
The ordered trace HUD appears only with Debug to reduce ordinary play clutter.
The debug panel includes controller state/trace identity, replay cursor and save
state. Inspector/reveal state and trace timing are not saved.

### Proven clone as a physical metaphor

Recommended candidate `bcf_clone_originalBB71alteredBB`, raw block `bb_000018AA`,
native range `0x1400018AA–0x1400018C7` (exclusive), is the unstable support in
CONTROL SPINE's final rope chain. See the current placement/recovery contract
above. Contact retains 0.6 s crumble / 2.4 s respawn; rope load warns for 1.65 s.
The address and all
six native instructions remain unchanged. Normal play says UNSTABLE; the inspector
reveals PROVEN BOGUS and the retained proof. None of those unreachable instructions
are replayed as successful output events.

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
XOR-encoded → readable flavour string. RELAY LINK ESTABLISHED, LIFT FIELD
ONLINE, ROUTE UNLOCKED and UPLINK READY remain `MachinePresentation` effects.
The XOR is authored frontend presentation; no PE string-decoding evidence is claimed.

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

The start/pause menu offers all four rooms from the beginning, with current and
completed status. Selecting a different room saves the outgoing logical state
and restores the selected room at its saved checkpoint. Selecting the current
room resumes play. Visiting a room never marks it complete; reload continues
the selected room. This uses the existing per-room version-3 save without a
schema change. The selector supports mouse and Tab/Space/Enter navigation.
The browser route checks direct UPLINK selection, reload, revisiting completed
rooms and retained cube/latch state. Menu captures are in
`docs/playtest/level-select-menu.png` and `level-select-compact.png` (960×640).

**Reset all progress…** is available from the same menu, including before
completion. Its inline confirmation defaults focus to Cancel; Escape cancels
without resuming play. Confirmation replaces all room memories, completed rooms,
discoveries and activity with fresh PRESSURE progress through the existing
revision-aware save queue. Visitor identity and schema remain unchanged. Reset
is disabled until the server save loads, or if another tab caused a conflict.
Network failures use the normal pending/retry indicator. Browser checks cover
cancel, Escape, confirmation, reload and the cleared validated CONTROL SPINE
frame; server tests verify reset survives process restart, and a client test
checks that an older in-flight save cannot overwrite the reset.

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

## Prior UPLINK playtest review (before CONTROL SPINE)

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

## Earlier vertical-slice validation and playtest observations

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
