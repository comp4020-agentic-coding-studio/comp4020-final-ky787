# Crit 10 observability

Binary Ninja records accepted cooperative gameplay transitions as structured server-side JSON and exposes a private, read-only dashboard at `/ops`. This supports the [Crit 10 brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/10-fly-by-instruments/): independent visitors act on shared state while the presenter explains who did what from server observations.

The existing anonymous `bn_visitor` identity still owns profile saves and party slots. Cosmetic names are not unique identities. Existing room membership, host-only chamber selection, ownership, stream-generation and reconnect checks remain authoritative. The dashboard cannot send gameplay actions, modify profiles or change party state.

## Access and configuration

`OBSERVABILITY_TOKEN` is a separate administrator credential, supplied through the server environment. If absent, `/ops` shows a disabled screen and every private data route returns 503. The public login shell and static assets contain no player information. Never place the credential in a URL, committed configuration, screenshot or command-line argument.

For a local production-style run, use a Bash terminal and enter a long, random credential from a password manager at the hidden prompt:

```bash
pnpm build
read -r -s -p 'Local operations credential: ' OBSERVABILITY_TOKEN
export OBSERVABILITY_TOKEN
DATA_DIR=.local-data PORT=8080 pnpm start
```

Open `http://localhost:8080/ops` and enter that credential. After stopping the server, `unset OBSERVABILITY_TOKEN` removes it from that shell. The normal `pnpm dev` workflow also inherits the exported environment variable; use the server origin for operations.

**Production setup is an explicit owner action.** These instructions do not configure a production secret. To enable access on Fly, enter the chosen credential at a hidden prompt, then import it through stdin:

```bash
read -r -s -p 'Production operations credential: ' BN_OPS_SECRET
printf 'OBSERVABILITY_TOKEN=%s\n' "$BN_OPS_SECRET" | mise exec -- flyctl secrets import -a comp4020-final-ky787
unset BN_OPS_SECRET
```

Fly's [secret import command](https://docs.fly.io/flyctl/cmd/fly_secrets_import) accepts `NAME=VALUE` through stdin and applies the secret to the application. This may restart the machine. Use a single-line credential of at most 512 characters; 32 or more random characters is recommended. Changing the secret or restarting the process invalidates existing operations sessions. Deployment credentials are independent and unchanged.

Visit `https://comp4020-final-ky787.fly.dev/ops`. A successful same-origin login creates an eight-hour random `bn_ops` session cookie: HTTP-only, `SameSite=Strict`, and `Secure` over HTTPS. Only a hash of its random value is held in memory. The administrator token is compared with constant-time digest comparison, is never returned, and is not stored by the page. **LOCK DASHBOARD** invalidates the session and closes its streams. There are at most eight sessions, two streams per session and sixteen streams globally. Login attempts share a bounded twelve-attempt/minute limit; incorrect login values and request bodies are never logged.

| Route | Purpose | Server access control |
| --- | --- | --- |
| `/ops` | Login shell and operations interface | No private data in HTML |
| `POST /api/ops/session` | Administrator login | Configured token, same-origin JSON request |
| `DELETE /api/ops/session` | Log out | Existing session and matching origin |
| `GET /api/ops/snapshot` | Current metrics, sessions and history | Existing unexpired session |
| `GET /api/ops/events` | Live Server-Sent Events | Existing unexpired session |

Private responses are non-cacheable. Same-origin checks, a restrictive Content Security Policy and `textContent` rendering prevent user display names or event fields from becoming executable markup. Unauthorized snapshot/stream requests return 401 when operations are configured.

## Event schema and privacy

`server/telemetry.ts` emits one JSON object per stdout line. A typical accepted transition has this shape; the pseudonyms below are illustrative:

```json
{"id":18,"timestamp":"2026-10-20T17:30:19.000Z","level":"info","event":"payload_docked","visitorRef":"visitor-8cfb7150a913","sessionRef":"session-39f78af11c70","chamber":"deadlock","player":"ShadowByte","playerSlot":1,"levelInstance":2,"source":"accepted_controller_input","cubeId":"draft:cubeA","cubeName":"Cube A","receiverId":"draft:payloadOne","receiverName":"PAYLOAD 1","active":true,"actor":"reporting_player"}
```

Every event includes an increasing process-local `id`, ISO 8601 UTC `timestamp`, `level` (`info`, `warn`, `error`) and machine-readable `event`. Chamber, cosmetic name, player slot and references appear where meaningful. Event-specific metadata uses an explicit allowlist of bounded strings, booleans and finite numbers. Free-form exception messages, request bodies and payloads are not accepted fields.

Visitor and session references are distinct HMAC-SHA256 pseudonyms, truncated to twelve hexadecimal characters using a random secret generated each process start. Raw visitor UUIDs, cookies, room-join codes, IP addresses, headers and credentials are not emitted. References are consistent within one process but intentionally change after restart; they are not authentication tokens. Same-name players remain distinguishable by session reference and slot. Validated cosmetic names and colours appear in the private dashboard and server activity logs.

## Recorded transitions

`server/gameplay-telemetry.ts` compares small semantic projections before and after accepted operations. Durable transitions are observed after their existing successful persistence path. Observations never become part of the controller, room save or level JSON.

| Events | Meaning and authority |
| --- | --- |
| `party_created`, `player_joined_party` | Membership accepted by the existing server room/party rules |
| `player_connected`, `player_reconnected`, `player_disconnected` | Current room participant connection lifecycle; no duplicates from ordinary room snapshots |
| `chamber_selected`, `chamber_started` | Existing authorized room/chamber changes, including accepted restart |
| `control_activated`, `control_toggled` | Accepted change to a controller input, with real control ID and available authored label |
| `pressure_plate_activated`, `pressure_plate_released`, `sensor_activated`, `sensor_released` | Accepted occupancy changes; continued contact creates no repeat event |
| `cube_picked_up`, `cube_dropped`, `cube_reset` | Accepted cube ownership/action transitions |
| `payload_docked`, `payload_removed` | Accepted socket input confirmed in the controller projection, with cube and receiver IDs; disposable cube movement is insufficient |
| `cube_placed`, `cube_removed` | Accepted placement on another supported sensor, distinguished from socket payload delivery |
| `relay_power_changed`, `lift_power_changed`, `controller_output_changed` | Actual changes in server controller outputs; physical handover state is explicitly prefixed `physical:` |
| `buffer_phase_changed`, `platform_phase_changed` | Actual accepted phase transitions, including server-owned timers; countdown ticks are omitted |
| `checkpoint_activated`, `exit_unlocked` | Accepted checkpoint or controller exit transition |
| `player_reached_exit`, `chamber_completed` | Existing accepted exit/completion rules; reloading or reconnecting to completed state does not create a fresh completion |
| `player_reset` | Accepted `local-reset`; it does **not** claim a death or distinguish death from manual reset |
| `character_created`, `character_updated` | Only after a validated profile successfully reaches atomic persistence; failed/stale saves and profile fetches emit neither |
| `server_started`, `server_shutdown` | Process service lifecycle |
| `room_operation_rejected`, `rate_limit_reached` | Bounded warnings with fixed server codes; no raw rejected packets |
| `room_persistence_failed`, `multiplayer_operation_failed` | Failure on an existing multiplayer server path, with bounded operation metadata |
| `persistence_failed`, `request_failed` | Existing HTTP progress/profile/storage failure, with fixed operation/code metadata |
| `rate_limited` | Existing public custom-level upload/download limit reached |
| `multiplayer_queue_slow`, `persistence_slow` | Multiplayer queue/persistence delay of at least 250 ms, or HTTP profile/progress persistence of at least 100 ms; subject to warning deduplication |

Profile updates refresh connected room summaries using the existing validated profile propagation.

Physical movement and contact originate in existing client simulation. Telemetry reports the server's accepted semantic state, not an independent physics simulation or anti-cheat proof. `source` identifies accepted actions, controller inputs/outputs, disconnect effects and `server_timer` transitions where relevant. For receiver contacts, `actor: "reporting_player"` identifies the client reporting accepted contact; it does not prove that person carried the cube. The dashboard says the cube was accepted at the receiver and shows the reporter separately. An associated player is the participant whose accepted action triggered that transition; server-only transitions need not invent an actor. Native evidence and controller decisions are unchanged.

## Live dashboard and bounded overhead

The dashboard displays current connected participant slots, active parties and playing chamber instances. Two parties in the same chamber count as two active instances. Session cards retain chamber, anonymous session label, names, colours, slots, lobby/playing/completed status and compact accepted progress. A disconnected party drops out of current sessions; its recent events remain in bounded history.

The feed retains machine event names alongside readable descriptions and session/chamber context. Filters select severity or chamber. Pausing the feed pauses presentation only; it never pauses gameplay. The dashboard receives an initial snapshot and coalesced changes over SSE, with fifteen-second heartbeats and automatic reconnection. Reconnect fetches the current bounded history, rather than promising permanent replay. Slow operations clients retain at most one replacement snapshot and are disconnected after five seconds of sustained backpressure.

| Resource | Bound / interpretation |
| --- | --- |
| Recent events | Last 250 records, oldest first in the API |
| Session summaries | At most 256; two participants and eight short progress lines each |
| Action/error recent window | Sixty one-second aggregate buckets |
| Latency samples | Most recent 128 semantic actions/persisted actions; mean and p95, not a time-window histogram |
| Cumulative counters | Accepted/failed semantic actions, completions and errors since process start |
| Stdout pending queue | 256 records; batches of 32 asynchronous writes and stream backpressure |
| Event flood ceiling | 250 records/second; further records counted as `suppressedEvents` |
| Warning/error output | Twelve/ten seconds globally and one per event/session/visitor key per ten seconds; at most 64 deduplication keys |
| Dashboard notifications | Coalesced to at most ten/second; at most sixteen internal subscribers |

Counters continue to track activity when output is suppressed or stdout is backed up. `droppedLogs`, `suppressedWarnings` and `suppressedEvents` expose loss rather than implying complete capture. Rejected actions never increment accepted-action totals. Avatar packets, cube transforms, heartbeats, repeated occupancy and room snapshots do not emit gameplay events. No per-frame history is retained.

Stdout and dashboard callbacks execute outside the gameplay semantic queue. Exceptions, broken pipes and subscriber failures are isolated. Telemetry performs no disk writes and never waits for dashboard clients. It shares the existing single Node process and 256 MB machine; there is no new database or service. A process restart resets counters, pseudonyms, history and administrator sessions, so uptime is prominently displayed. Fly captures application stdout independently of this in-memory store; it is not a promise of indefinite log retention.

## Demonstrating and debugging

1. Configure the secret explicitly, deploy, open `/ops`, sign in, and verify **LIVE**. Keep this dashboard as the presenter's only game-facing view.
2. Give classmates the normal game URL in separate Chrome profiles. They initialize their own characters and create/join a party through the normal menu.
3. Narrate names with their P1/P2 slots and anonymous session label. Watch lobby participation, host chamber selection and chamber start in the feed.
4. Have both players solve a chamber. In DEADLOCK, observe accepted controls, lift output, specific cube/socket deliveries, checkpoint/exit transitions and finally both exit entries and completion. Describe only events actually present.
5. Have another pair create a second party. Compare independent session cards and use the chamber filter without mixing same-name players across parties.
6. Ask one participant to disconnect and reconnect; confirm current gauges change and that completed chambers do not increment again merely because of reconnect.

The course brief documents terminal log tailing as a fallback:

```bash
mise exec -- flyctl logs -a comp4020-final-ky787
```

Application activity appears as structured JSON inside Fly's log output. Do not copy raw deployment configuration or credential values into a handoff. The dashboard requires no connection to the Fly API and no deployment token.

Focused validation and the real browser demonstration are available as:

```bash
pnpm exec vitest run --config vitest.unit.config.ts tests/telemetry.test.ts tests/gameplay-telemetry.test.ts tests/ops.test.ts tests/app-telemetry.test.ts
pnpm check:observability
```

The browser check uses independent visitors and actual game interactions, observes the protected operations interface, and captures screenshots. After the owner has configured the production secret, the same test can verify the deployed dashboard:

```bash
read -r -s -p 'Production operations credential: ' OBSERVABILITY_TOKEN
export OBSERVABILITY_TOKEN
BN_BASE_URL=https://comp4020-final-ky787.fly.dev/ BN_SHOTS=/tmp/bn-ops-production pnpm check:observability
unset OBSERVABILITY_TOKEN
```

This creates fresh test visitors and parties through the actual UI. Keep production screenshots and snapshots private because other active users may appear. Publish aggregate test results rather than production activity records. Consult the dated implementation handoff for actual commands run, screenshot paths, deployment evidence and outstanding checks; running local checks does not establish that production has been verified.

## Deliberate limitations

- Solo C8 physics and local Level Builder playtests have no equivalent server-authoritative semantic stream. Their movement/puzzle activity is not inferred from HTTP requests. Cooperative campaign, internal labs and public custom multiplayer hosted by the game server use the shared observation layer. The separate local workbench server does not publish into the game server’s operations dashboard.
- The process holds only recent history. This is a live operations view, not permanent analytics, cross-machine aggregation or a movement replay system.
- Signals report existing accepted rules, including client-reported reset/contact facts. They cannot prove an unobserved death, reconstruct exact trajectories or explain why an individual chose an action.
- Custom-level labels may fall back to real object IDs where an authored campaign label is unavailable. Profiles remain external to level JSON.
- The dashboard is read-only. It intentionally offers no room editing, kicking, account management or gameplay overrides.
