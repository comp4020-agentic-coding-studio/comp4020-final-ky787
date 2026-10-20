# Crit 10 observability — 20 October 2026

## Scope and implementation

Started from `a2f1f81a7431c025da2695cd41155da28a0d0c91`. Inspected current HEAD, fetched origin, and read repository instructions. Existing user changes to CLAUDE.md, PROCESS.md, deleted earlier handoffs and levels/drafts/blank-room.json were left untouched and excluded from the feature commit.

The authoritative contract and runbook are in [docs/observability.md](../../../docs/observability.md). This handoff records implementation and validation, not new binary evidence.

- `server/telemetry.ts`: newline-delimited JSON stdout, boot-local HMAC visitor/session references, 250-event history, bounded asynchronous stdout queue, warning/event budgets, current sessions and small latency/counter aggregates. No telemetry disk writes.
- `server/gameplay-telemetry.ts` and hooks in `server/multiplayer.ts`: compare accepted semantic projections after successful existing commits. Record membership, chamber selection/start/completion, controls, plates/sensors, cube ownership, receiver acceptance/removal, checkpoint/exit and server-owned timer edges. Avatar/cube transforms never enter telemetry.
- `server/profiles.ts`: additive post-save subscriber metadata identifies created versus updated profiles after atomic persistence. Files, revision rules and profile API remain unchanged.
- `server/ops.ts` and `server/ops-page.ts`: read-only protected dashboard, eight-hour HTTP-only administration sessions, strict origin checks, no-store/CSP, bounded SSE with initial/live snapshots, heartbeats, automatic reconnect and slow-consumer handling. Missing administrator token disables data access.
- `scripts/observability-browser-check.ts`: four independent game identities and a fifth administrator context; actual onboarding, two parties and a complete real-input DEADLOCK solve. Existing canonical route reused without state injection.

Receiver events identify the accepted reporting participant, not an inferred human carrier. The dashboard describes the cube being accepted at the named receiver and shows the reporter separately. Local resets do not claim deaths. No movement, grapple, controller, payload, checkpoint, exit or authority rules changed; no new client gameplay messages or persistence schemas.

## Validation

Completed locally:

- `pnpm typecheck` — passed.
- `pnpm check` — passed (73 unit-test files: 681 passing, 3 existing skips; HTTP spec: 3 passing).
- `pnpm build` — passed, including CONTROL SPINE retained-bundle validation. Existing large-chunk advisory remains.
- Focused telemetry/operations/gameplay/profile logging tests — 34 passing across four files after final observer refinements.
- `pnpm check:observability` — passed: authentication/invalid credentials, live initial/subsequent snapshots, four independent players/two parties, three actual payload deliveries, named exits/completion, reconnect without duplicate completion, bounded history, safe text rendering and logout revocation.
- WebSocket load coverage — 16 independent visitors/eight parties and 480 actual transform packets, with no activity-event or semantic-action-counter growth from transform traffic.
- `pnpm check:native` — 21 retained artifacts verified; native tables, public evidence, campaign definitions and CONTROL SPINE controller/evidence unchanged.
- `pnpm check:evidence` — passed; personal reflections were not rewritten.

- `pnpm check:campaign` — passed (289.3 seconds).
- `pnpm check:public-coop` — passed (59.1 seconds).
- `pnpm check:character` — passed (40.7 seconds).
- `pnpm check:workbench` — passed (31.3 seconds).

All requested local regressions passed. Production verification is recorded separately below.

The first observability browser run completed DEADLOCK but caught an incorrect test expectation for a terminal activation. DEADLOCK actually uses the HATCH toggle and FEED/SAFE plates. The assertion now checks those actual event categories; the complete rerun passed. No gameplay check was weakened.

## Screenshots and measured sample

[Reviewed local evidence](../../../docs/playtest/2026-10-20-observability/README.md) contains six dashboard screenshots, assertions and a sanitized real snapshot. The screens show locked access, both parties, simultaneous chambers, payload acceptance, completion and reconnection. No credentials, room codes or full visitor UUIDs are included. Private canonical-route reports and failure screenshots are excluded.

The successful local DEADLOCK sample recorded 60 accepted semantic actions, no failed actions/errors/dropped logs, a 0.2 ms queue p95 and 19.9 ms total action p95 (includes persistence). This is a single local sample, not a production benchmark. Telemetry failures, thrown subscribers, blocked/broken stdout and dashboard backpressure are covered separately.

## Production and remaining limitations

The existing public-main GitHub workflow deploys to the single 256 MB Fly machine. Read-only preflight found the existing application running and no configured Fly secrets. No deployment credentials were changed. Creating a production OBSERVABILITY_TOKEN requires the owner's explicit approval, requested separately; do not infer authenticated production readiness from local screenshots.

Solo physics and the separate local workbench server have no gameplay stream in this dashboard. Main-server campaign, labs and public custom co-op share the instrumented observer. Current player gauges count accepted room participant connections, not anonymous page views. History, references and admin sessions reset with the process; stdout capture remains Fly's responsibility. This is accepted-state observation, not independent server physics or anti-cheat verification.
