# PAIRING BAY multiplayer infrastructure

Implemented 2026-10-06, starting at
`55aaa36edc75b3be9bfa9ff6cb54a35e05ae2b65`.
This is a two-player infrastructure/gameplay prototype, awaiting human playtesting.
The four C8 campaign rooms, personal saves and retained CONTROL SPINE binary stay
independent. No shared cubes or multiplayer CONTROL SPINE are implemented.

## Authority and modules

See [ADR 0001](adr/0001-multiplayer-authority.md).

```text
Browser A / Browser B
        HTTPS + WSS (same origin /ws)
                    |
                 Fly proxy
                    |
        existing Node process :8080
        static + /api/progress + /api/identity + /ws
                    |
                  /data
```

`server/app.ts` attaches `server/multiplayer.ts` to its existing HTTP server.
There is no extra production process, service or public port. Fly's one machine,
256 MB allocation, volume and auto-stop settings are unchanged. `ws` **8.22.0** is
the sole production dependency (`@types/ws` 8.18.2 is development-only).
The [ws upgrade/heartbeat documentation](https://github.com/websockets/ws#client-authentication)
informs the use of `noServer`, authenticated upgrade handling and ping/pong.
The Docker runtime copies pruned production dependencies and the shared protocol.

The browser derives `ws://host/ws` or `wss://host/ws` from the current page URL.
Vite proxies `/api`, `/readme` and `/ws` to the same Node server on 8080; the
browser still sees only its current origin. `pnpm dev` now starts both listeners
in one development process, waits for the backend before exposing Vite, and
closes both on Ctrl+C. Its backend binds to loopback; `--host` can expose the
Vite origin for LAN testing. Fly terminates TLS. The upgrade reads
the HTTP cookie header and checks the request Origin against Host.

| Module | Responsibility |
| --- | --- |
| `src/coop/protocol.ts` | Explicit wire types, strict runtime client validation, code normalization, revision ordering |
| `server/identity.ts` | Shared C8 visitor-cookie parsing/establishment and origin check |
| `server/pairing-state.ts` | Coordinate-free authoritative mock room contract and durable schema |
| `server/multiplayer.ts` | Slots, sessions, serialized logical mutations, persistence, socket lifecycle and avatar forwarding |
| `src/coop/client.ts` | Identity bootstrap, WebSocket/rejoin/backoff, counters and semantic reports |
| `src/coop/authority.ts` | Physical sensors and accepted-state adapter; never evaluates shared outputs |
| `src/coop/pairing-bay.ts` | Hand-authored chamber geometry and per-slot spawn/checkpoint positions |
| `src/coop/remote.ts` | Bounded presentation-only interpolation |

`PuzzleWorld` has an optional `WorldAuthority` interface. Without it, C8 follows
its existing controller path. With it, local sensors report intent and accepted
server inputs/outputs drive the same platforms, door and grapple rules. No
platform, grapple or rope-jump tuning changed. The campaign `ROOM_IDS` and save
schema remain unchanged; `pairing-bay` is a separate world ID.

## Identity, session and UI

The menu preserves all four single-player rooms and adds **CREATE ROOM** and
**JOIN ROOM**. A room code chooses a shared session. The existing anonymous
`bn_visitor` UUID identifies the browser and owns a player slot in that session.
`GET /api/identity` establishes that same HttpOnly, SameSite=Lax, one-year cookie
before upgrade, even if `/api/progress` has not run. It adds Secure behind HTTPS.
There is no second identity system or account.

Codes are four characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L),
randomly generated with crypto and checked against both loaded and persisted
rooms. Collisions retry; input is trimmed and uppercased, then validated exactly.
Invalid, unknown and full rooms have distinct visible errors. There are exactly
two reserved visitor-owned slots, no spectators. Disconnecting does not free a
slot for an unrelated visitor. Create a new room to choose a different partner.

The room code, local slot, both connection states and partner status stay visible.
**COPY CODE** beside the room code copies it to the clipboard and confirms success;
if clipboard access is unavailable, the code remains selectable for manual copy.
Play starts only after the initial authoritative snapshot. A visitor may move
while waiting for a partner. The initial P1 spawn is off Plate A. The same tab
remembers the code in `sessionStorage` and automatically rejoins after refresh;
a new tab/profile can enter a remembered code manually. A second tab with the
same cookie replaces the older socket for that slot; the old tab shows an
explicit replacement message and stops retrying. It never becomes Player 3.

Co-op does not write campaign progress. Leaving a room returns to the individual's
campaign menu and existing checkpoint. Pause releases local momentary occupancy;
resuming reports fresh physical occupancy. A connected background window may
remain standing on a plate. Blur clears held movement and silences audio without
turning a still-connected player into a disconnect.

## PAIRING BAY contract

The chamber is 1,850 × 780. It has no cube. The near bank ends at x=460 and the
far bank begins at x=880. Its 420-unit death gap and anchor centre (770,226)
reuse the accepted SWITCH traversal proportions. Player 1 starts at (150,543),
Player 2 at (405,543). Static banks remain solid and unhookable. The code anchor
and bridge are ghosted/non-solid when inactive and lit/solid/hookable when enabled.

| Semantic input | Ownership/meaning |
| --- | --- |
| `player1OnPlateA` | P1's connected body on Plate A (250,560) |
| `switchB` | P2 interaction at Switch B (1060,560), latched forever |
| `finalPlateLeftOccupied` | A connected body on left final plate (1370,560) |
| `finalPlateRightOccupied` | A connected body on right final plate (1610,560) |

Each slot reports **one** of `plateA`, `finalLeft`, `finalRight`, or `null`.
P2 cannot operate A; P1 cannot operate B. Final occupancy is accepted only after
B is latched. Reports carry no caller-chosen slot or visitor ID.

| Authoritative output/state | Rule |
| --- | --- |
| `grappleAnchor` | P1 currently occupies A |
| `returnBridge` | B has latched |
| `exitDoor` | B latched, both players connected, left AND right final plates occupied |
| checkpoint | `entry` initially; `reunion` when B latches |
| completion | Latched when the exit first opens with two distinct bodies |

Phase 1: P1 holds A while P2 uses the powered grapple slab to cross. Withdrawing
A disables the slab and releases its attached rope through the existing rules.
Phase 2: P2 presses E at B; the return bridge materializes and the shared reunion
checkpoint is saved. P1 walks across. Phase 3: each player stands on a different
final plate; both see the exit open and **PAIRING COMPLETE**. Completion is saved
at that simultaneous condition, so neither player has to abandon a plate to
reach the doorway. Leaving a final plate closes the door but retains completion.

The server knows none of these coordinates. With client-authoritative physics,
the owning browser is trusted to report its own legitimate physical interaction.
It could lie about its own location. This is an explicit course-scale trust
tradeoff, not anti-cheat. The server enforces ownership, phase, one plate per
body, connected membership and monotonic action sequences. A lone connected
player cannot occupy both final inputs, even by rapidly alternating reports.

All PAIRING BAY machinery/text is labelled **mock multiplayer / test controller**.
It has no native address, trace, OLLVM provenance or crumble. C8 evidence bytes
and validated five-input/seven-output UPLINK contract are untouched.

## Protocol, revisions and limits

Client messages are JSON discriminated by `type`:

| Type | Fields |
| --- | --- |
| `create` | none |
| `join` | `code` |
| `avatar` | `seq`, bounded `avatar` (`x`, `y`, `vx`, `vy`, `facing`, `grounded`, optional visual rope tip as object or null) |
| `occupancy` | `seq`, `plate` (single enum or null) |
| `switch` | `seq` (the room's sole switch) |
| `leave`, `ping` | none |

Server messages: `snapshot` (assigned slot and full room), `room` (full accepted
state at a newer revision), `avatar` (server-owned slot, stream ID, sequence and
bounded visual snapshot), `error` (public code/message) and `pong`. Full room
state includes level, code, revision, assigned/connected slots, inputs, outputs,
checkpoint and completion. Other visitors' UUIDs are never broadcast.

Every accepted shared mutation increments the durable room revision. Writes
complete before its revision is acknowledged/broadcast. On close, the body is
removed immediately from in-memory logic, then the durable updated revision is
broadcast. A storage failure closes room connections rather than acknowledge
unsaved changes. Clients apply ordinary room updates only when their code matches
and revision increases. A new connection's initial snapshot establishes its
baseline; missed messages are never replayed. Semantic sequence numbers are
per-socket and independent of room revisions; stale reports are rejected.

Movement is sent at up to 20 Hz, forwarded only to the partner and never enters
the logical mutation queue or disk. Coordinates are finite and bounded to
±10,000; velocities to ±2,000 (validation bounds, not server physics). Remote
avatars interpolate about 100 ms behind arrivals using at most 12 samples.
Large respawn discontinuities snap, and new streams reset old sequence/buffer
state. When no new sample arrives, presentation holds the last position rather
than extrapolating indefinitely. No player-player collision exists; remote
avatars cannot activate local sensors or become grapple/collision surfaces.
The original ninja drawing is reused with cyan P1 and violet P2 accents.

Payloads are limited to 2 KiB, exact keys/types are validated, binary messages
are rejected, and no user-provided paths are accepted. Each socket has a token
bucket (40 messages/sec, 80 burst), at most eight queued semantic operations;
the service bounds total queued work (256), peers (128) and loaded rooms (64).
Slow recipients exceeding 64 KiB buffered outbound data are disconnected.
Server heartbeat runs every 5 seconds; a missed pong terminates the socket on
the next pass. Unjoined sockets expire after 15 seconds. Graceful socket closes
release on handling; a physically severed network is detected within roughly
5–10 seconds, since the server cannot observe it instantaneously.

## Persistence and recovery

```text
/data/<visitor UUID>.json   existing C8 envelope, version-3 campaign progress
/data/rooms/<CODE>.json     version-1 shared co-op logical record
```

No campaign file moves and no new campaign migration is necessary. Existing
version-1/2-to-3 migrations and corrupt-save behavior still pass. The shared
atomic writer preserves temporary-file fsync, rename and directory fsync with
mode 0600 and acknowledgement after durability, under the single-writer model.

A room record stores version, code, level, revision, the two visitor assignments,
B latch, checkpoint, completion, and creation/update timestamps. Even momentary
changes persist only the revised logical record: **no plate occupancy, connection
flags, position, velocity, grapple, socket or interpolation data is saved**.
Movement alone causes no writes. Corrupt existing room files fail closed without
replacement. Reserved codes include persisted rooms, even when unloaded.

An inactive in-memory room unloads after five minutes, checked every 30 seconds.
Its file is retained and loads again by code. Persisted rooms are not automatically
deleted. Capacity exhaustion returns an explicit busy/unavailable result; this is
a small single-machine prototype, not an unbounded matchmaking service.

On disconnect the avatar and momentary plate state disappear; B, completion and
checkpoint remain. Retries start around 300 ms, double to a 5-second maximum
plus up to 150 ms jitter. The client also has handshake and server-message
timeouts. On reconnect the same visitor receives a complete snapshot and spawns
at the current shared checkpoint: entry spawns above, or reunion P1 (1050,543)
and P2 (1150,543). Both are off plates on static ground. A live checkpoint update
does not teleport either player; only reset/death/rejoin reconstructs position.

## Feedback and diagnostics

F1 / Debug exposes transport state/URL, room code, local visitor and slot,
connected slots, revision, accepted inputs/outputs, server-message age, traffic
counters, consecutive reconnect attempts, remote-snapshot age and checkpoint.
Normal HUD omits these diagnostics. Connection confirmation uses an existing cue.
Plate/code/bridge/door/switch sounds observe applied authoritative transitions;
reporting local intent does not play the same shared sound again. Rejoin creates
a silent machinery baseline and only plays connection confirmation.

## Running and validation

```sh
pnpm install --frozen-lockfile
pnpm dev                             # Vite on 5173 + real API/WS on 8080
# Or test the production server separately:
pnpm build
DATA_DIR=.local-data pnpm start        # HTTP/API/WS on 8080
pnpm typecheck
pnpm test:unit
pnpm test                            # live HTTP + WebSocket spec on 8080
pnpm check:browser                   # full C8 browser route
pnpm check:multiplayer               # own temporary server, two isolated contexts, actual restart
BN_TEST_TLS=1 pnpm check:multiplayer  # test-only TLS proxy + Secure cookies + WSS
```

Development needs no prebuilt `dist`. Its saves default to `.local-data/`, or
`DATA_DIR` when provided. `pnpm dev --host` exposes the frontend for LAN testing;
`--port` selects the frontend port and `DEV_API_PORT` selects the backend port.
The launcher configures the proxy from the backend's actual listening port.
It preserves the frontend Host header so same-origin campaign writes and
WebSocket upgrades pass the backend's origin check. Vite reloads frontend edits;
restart `pnpm dev` after changing server code.
If running the backend separately, use `pnpm dev:server` and `pnpm dev:client`
in two terminals. Do not start a second backend on an occupied port 8080.

`BROWSER_BIN=/path/to/chromium-compatible-browser` selects the browser. The local
machine's Snap Chromium could not launch with the temporary profile; installed
Brave worked. TLS tests need `openssl`; certificate exceptions are confined to
that temporary test browser. The proxy is test infrastructure, not a deployment
service. Browser scripts accept an optional URL and screenshot directory:

```sh
pnpm check:multiplayer http://localhost:5173/ /tmp/pairing-vite
pnpm check:multiplayer https://comp4020-final-ky787.fly.dev/ /tmp/pairing-fly
```

An explicit URL tests that app without restarting it. Use the Fly command **after
an authorized deployment**; this implementation pass does not push or deploy.
For manual play use a normal window + private window, two different browsers, or
isolated profiles. Two windows sharing the same cookie represent the same player.
Create in the first, copy its displayed code, join in the second. Walk P1 onto A,
hold click + D toward the anchor as P2, release on the rightward swing, press E
at B, cross as P1, and occupy separate final plates. Try refresh and closing P1
while holding A before completing the chamber.

Validation recorded in this pass:

- Typecheck, production build and unchanged pinned 32-state UPLINK bundle pass.
- 200 unit/server tests pass; two pre-existing conditional skips remain. Coverage
  includes actual SIGKILL/restart, C8 migrations, code collisions, capacity/slots,
  old-socket replacement, stale actions/revisions, release, latches, two-body
  completion, malformed/oversized messages, origin checks and idle unloading.
  Development launcher tests also cover HTTP/WS proxying, same-origin campaign
  saves, SIGINT/SIGTERM cleanup, persistence across restart and occupied ports.
- The complete existing C8 browser route passes 115 assertions, including both
  CONTROL SPINE solutions, saved checkpoints, campaign reset and audio. It also
  passes through the combined development server and its Origin-preserving proxy.
- Two isolated actual browser contexts complete PAIRING BAY with ordinary
  keyboard/mouse input. Neither world nor controller state is mutated by the
  browser test. Remote motion, refresh during the bridge phase, deliberate
  disconnect on A, and automatic rejoin after actual server restart pass.
- The HTTPS/WSS proxy run passes 25 checks. Propagation upper bounds (including
  physical approach/input duration) are A **464 ms**, B **66 ms**, final plate
  **492 ms**. These are local measurements, not Fly/WAN latency claims.
- The combined `pnpm dev` two-browser run passes 21 checks, with A **508 ms**,
  B **63 ms**, final plate **499 ms**, including the same physical-input overhead.
- All three running-app HTTP/WebSocket specifications pass on the shared origin.
- Docker daemon access is unavailable on this machine. The exact runtime COPY
  file set with installed/pruned production dependencies successfully serves
  static HTTP, visitor identity and `/ws` room creation from a temporary directory.
  An actual image build remains for CI/deployment validation.

Screenshots and exact logs are in `docs/playtest/pairing-*`.

## Limits and next acceptance step

Human review is still needed for legibility, cooperation, grapple timing and
listening balance. No remote Fly deployment was performed; local HTTPS/WSS
forwarding is verified, while Fly auto-stop timing and WAN latency remain to
be measured after deployment. Vite's existing large retained-evidence chunk
advisory remains. Touch multiplayer has not been validated.

There is no anti-cheat or host migration because there is no host browser.
Clearing cookies loses anonymous slot ownership. Full rooms retain reservations
indefinitely; persisted files need eventual explicit housekeeping if usage grows.
Loss of the very first create response before a code is received can leave an
unused saved room when the client retries creation; no gameplay has started yet.
Subsequent reconnects always rejoin the acknowledged code. No durable state is
deleted automatically.

Stop for manual playtesting. After acceptance, the separate next work is shared
cube arbitration, possibly multiplayer RELAY, then a genuine cooperative CONTROL
SPINE redesign. New binary controllers should follow stabilized co-op contracts.
C9 reflection content is left to the user.
