# Binary Ninja: Pressure / Switch / Relay

A single-player, three-room greybox for a future cooperative platform-puzzle
game. Gameplay comes first: carry a cube, hold a plate, wake a grapple anchor,
and make a way across. Rooms are hand-authored.

**C8 uses explicit mock controllers.** Code displays, string reveals and the
crumble example are gameplay prototypes, not validated obfuscator evidence.
No new binary or multiplayer is included. The earlier binary-backed tutorial
and its evidence/replay tests remain in the repository, outside the default game.

## How to play

1. **PRESSURE:** put the cube on the button to open the exit, then hop past it.
2. **SWITCH:** flip the lever to materialise the marked grapple platform. Hold
   left click on its ring while moving right, then release as you swing right.
3. **RELAY:** leave the cube on Plate A, grapple across and lock the return bridge
   with its lever. Walk back for the cube and carry it to Plate B on the first
   raised platform to open the exit. Jump onto the cube or over it to climb the
   remaining code steps. The unstable prototype has a safe recovery floor.

A/D or arrows move. Space/W jumps. Aim at a marked ring to preview the grapple;
press Space again in midair to hook that highlighted target, then once more to
release. A tap holds the rope for you. Hold left click and release still works.
E picks up/puts down a cube or uses a nearby lever. RELAY's bridge lever locks
ON permanently; SWITCH's lever remains an ON/OFF toggle.
Click-hold a cube in RELAY to pull it towards you. S drops through code platforms.
R returns to the checkpoint without clearing solved machinery. Tab shows the
room overview. Escape opens the menu. F1 shows inputs, outputs and save state.
The debug panel can return a lost cube to its spawn.

This pass is tuned and tested for desktop keyboard and mouse. Inherited touch
controls are present; touch gameplay has not been tuned or validated.

## Saved progress

An anonymous browser cookie identifies your server save. Returning to the same
site/browser offers **CONTINUE — [ROOM]**. Completed rooms, logical checkpoint,
switch state, cube-on-Plate-A/B state, discovered mechanics and the last 40 notable
events survive reload and server restart. Loose cube positions and velocities
are not saved. Existing version-1 saves are migrated without losing progress. Cookies must be retained to find the same save.

The footer says **Saved on server** only after acknowledgement. Failed saves
remain pending and retry; if the initial connection fails, the menu offers a
retry or explicitly unsaved play. Another tab changing the save produces a
reload notice rather than silently overwriting it.

## Development

Node 24.21+ and pnpm 11. No runtime server dependencies.

```sh
pnpm install
pnpm build
DATA_DIR=.local-data pnpm start  # http://localhost:8080 (game + save API + /readme/)
```

For frontend development, leave that server running and run `pnpm dev` in
another terminal. Vite proxies `/api` and `/readme` to port 8080. `pnpm preview`
alone is static and does not provide persistence.

```sh
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test            # running app at APP_URL, default http://localhost:8080
pnpm check:browser  # same default; optional URL and screenshot directory arguments
```

The Docker image uses one Node HTTP process, with Fly's existing volume at
`/data`. Local `DATA_DIR` overrides keep test saves separate. The persistence
suite kills and restarts a real server with the same temporary data directory.
The course HTTP invariants remain unchanged; Docker is not required locally.

## Design and playtest notes

See [the C8 architecture, controller contract and playtest record](docs/c8-vertical-slice.md).
Stop here for manual playtesting before designing a real binary around the
state machine. The old game and research workspaces remain read-only.
