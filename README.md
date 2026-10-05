# Binary Ninja: Pressure / Switch / Relay / Control Spine

A single-player, four-room greybox for a future cooperative platform-puzzle
game. Gameplay comes first: carry a cube, hold a plate, wake a grapple anchor,
enable lifts and fixed relay gates, and route a payload upstairs. Rooms are hand-authored.

**CONTROL SPINE (UPLINK) uses a validated OLLVM-16 BCF controller**, with retained real assembly
and an optional proof-backed bogus-code platform. The first three rooms still
use mock controllers. Room geometry, physics, crumble timing and all string
reveals remain authored game abstractions. No multiplayer is included. The
earlier binary-backed tutorial and its tests remain outside the default game.

## How to play

1. **PRESSURE:** put the cube on the button to open the exit, then hop past it.
2. **SWITCH:** flip the lever to materialise the marked grapple platform. Hold
   left click on its code slab while moving right, then release as you swing right.
3. **RELAY:** leave the cube on Plate A, grapple across and lock the return bridge
   with its lever. Walk back for the cube and carry it to Plate B on the first
   raised platform to open the exit. Jump onto the cube or over it to climb the
   remaining code steps. The unstable prototype has a safe recovery floor.
4. **CONTROL SPINE:** route the payload to the core node in a large machine hall. Observe which controls power the
   relay, lift and upper route; some machinery lets you return for the cube.

A/D or arrows move. Space/W jumps. Aim at an enabled code slab to preview the grapple;
press Space again in midair to hook that highlighted target, then once more to
release. A tap holds the rope for you. Hold left click and release still works.
E picks up/puts down a cube or uses a nearby lever. RELAY's bridge lever locks
ON permanently; SWITCH's lever and CONTROL SPINE's relay power remain ON/OFF toggles.
CONTROL SPINE's upper lift latch locks ON. Walk into powered relay doorways to travel
in either direction; a carried cube comes with you. Steer within the Lift Field
to rise, then step sideways onto the upper deck.
Click-hold a cube in RELAY or CONTROL SPINE to pull it towards you. S drops through code platforms.
R returns to the checkpoint without clearing solved machinery. Tab shows the
room overview. Escape opens the menu. F1 shows inputs, outputs, trace activity and save state.
The start/pause menu lets you choose any of the four rooms. Each room keeps its
saved checkpoint and puzzle progress; selecting a room does not mark it complete.
The debug panel can return a lost cube to its spawn. In CONTROL SPINE, **Evidence** pauses
play for full assembly, retained trace occurrences and clone provenance. Code
platforms show their real addresses with assembly and authored strings below;
all enabled code slabs accept the hook. Static floors remain unhookable. Assembly
playback explains machinery that has already responded; it never delays controls.
Selected machine messages use authored single-byte XOR (0x5A), separate from the
retained OLLVM assembly. Node C reveals a new upper route back across the hall.

This pass is tuned and tested for desktop keyboard and mouse. Inherited touch
controls are present; touch gameplay has not been tuned or validated.

## Saved progress

An anonymous browser cookie identifies your server save. Returning to the same
site/browser offers **CONTINUE — [ROOM]**. Older UPLINK saves resume as CONTROL SPINE,
with their checkpoints and payload placement retained. Completed rooms, logical checkpoint,
switch state, cube-on-Plate-A/B state, discovered mechanics and the last 40 notable
events survive reload and server restart. Loose cube positions and velocities
are not saved. Existing version-1/2 saves migrate to version 3 without losing progress; visitors
who completed the three tutorials continue directly into UPLINK. UPLINK saves
its upper latch, cargo checkpoint and final payload placement. Cookies must be retained to find the same save.

Use **Menu → Reset all progress…** to start over at PRESSURE. Confirming clears
all rooms, checkpoints, discoveries and activity while keeping your anonymous
visitor ID. Cancel or Escape leaves progress untouched. Wait for **Saved on server**
before closing the page.

The footer says **Saved on server** only after acknowledgement. Failed saves
remain pending and retry; if the initial connection fails, the menu offers a
retry or explicitly unsaved play. Another tab changing the save produces a
reload notice rather than silently overwriting it.

## Development

Node 24.21+ and pnpm 11. No runtime server dependencies.

```sh
pnpm install
pnpm build                    # includes pinned UPLINK bundle validation
DATA_DIR=.local-data pnpm start  # http://localhost:8080 (game + save API + /readme/)
```

For frontend development, leave that server running and run `pnpm dev` in
another terminal. Vite proxies `/api` and `/readme` to port 8080. `pnpm preview`
alone is static and does not provide persistence.

```sh
pnpm typecheck
pnpm test:unit
pnpm build                    # includes pinned UPLINK bundle validation
pnpm test            # running app at APP_URL, default http://localhost:8080
pnpm check:browser  # same default; optional URL and screenshot directory arguments
```

The Docker image uses one Node HTTP process, with Fly's existing volume at
`/data`. Local `DATA_DIR` overrides keep test saves separate. The persistence
suite kills and restarts a real server with the same temporary data directory.
The course HTTP invariants remain unchanged; Docker is not required locally.

## Design and playtest notes

See [the C8 architecture, controller contract and playtest record](docs/c8-vertical-slice.md).
Stop here for manual playtesting of the CONTROL SPINE showcase before
extending the binary or mechanics. The old game and research workspaces remain read-only.
