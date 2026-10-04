# C8 vertical slice — 2026-10-04

Status: revised after initial human feedback; awaiting the next human playtest. This is
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
  and locks ON after its first activation in RELAY.

| Output | PRESSURE | SWITCH | RELAY |
| --- | --- | --- | --- |
| `exitDoor` | `plateA` | `switchB` | `switchB && plateB` |
| `grappleAnchor` | false | `switchB` | `plateA` |
| `bridge` | false | false | `switchB` |
| `codePlatformA` | false | false | `switchB` |
| `codePlatformB` | false | false | `switchB` |

The evaluator is combinational; the physical lever owns its toggle/latched state.
Cube flags do not independently override plate inputs. Tests enumerate all
32 boolean combinations in all 3 rooms, including physically inconsistent
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
ID, revision, update time and version-2 progress:

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

Existing version-1 saves migrate in memory to version 2 with Plate B initially
empty; visitor identity, revisions, completion, checkpoints and Plate A placement
are preserved. The next successful write persists the migrated schema.

`DATA_DIR` overrides `/data` locally. Visitor progression and room memory are
separate schema fields, so later shared room state can have its own identity
and authority. This is not already a multiplayer persistence layer. Clearing
cookies loses the browser's reference to its anonymous save. Initial API
failure offers explicitly unsaved play; it does not pretend local state was
written to the server.

## Validation and playtest observations

- `pnpm typecheck`: passed.
- `pnpm test:unit`: 103 passed, 2 existing conditional tests skipped for tutorial
  rooms without pits; none weakened or removed.
- `pnpm build`: passed; the default bundle excludes the previous binary tutorial.
- `pnpm test`: both original HTTP invariants passed against the production server.
- `pnpm check:browser`: real CDP keyboard/mouse route through all three rooms,
  including a deliberate failed jump, cube pull, mouse and Space grapple
  crossings, permanent return bridge, A-to-B transfer, standing on the cube,
  checkpoint reset, reload/continue with B held, and crumble recovery,
  final completion save, debug state, screenshots and zero console errors.
- Restart test: save RELAY, SIGKILL the server, launch a new process on the same
  temporary `/data`-style directory, load the same cookie, compare saved state.
  Also checks independent visitors, conflicting writes, bad payloads, bounded
  request sizes and preservation of corrupt files. The HTTP suite also migrates a real on-disk version-1 save. Client tests cover visible
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
obfuscated controller.
