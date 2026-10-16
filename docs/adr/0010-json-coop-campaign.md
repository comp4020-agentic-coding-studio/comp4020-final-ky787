# Release authored JSON chambers into the cooperative campaign

2026-10-16. Campaign integration explicitly requested after the draft delivery.
Human two-player playtesting has not been claimed or inferred from that request.

## Campaign and source of truth

The public order in `src/coop/campaign.ts` is HANDSHAKE, CROSSFEED VAULT,
RACE CONDITION, DEADLOCK, USE AFTER FREE. New parties begin in a HANDSHAKE
lobby. The host can select any chamber; NEXT follows this order, and each
chamber still requires two accepted physical exit arrivals. CAMPAIGN COMPLETE
requires all five badges, even when chambers were selected out of order.

The three new releases are canonical Level Workbench JSON snapshots under
`levels/campaign/`. Their geometry, controllers, camera reveals and metadata are
identical to the tested drafts at promotion. `levels/drafts/` remains editable
without changing the released campaign. A future release updates the campaign
snapshot deliberately and reruns validation and physical traversal checks.
The builder/CLI can import these released rooms into independent editable copies.

`src/coop/authored-campaign.ts` shares these documents between the client and
server. `draftRoom` adapts them to the existing engine; a small registry wrapper
supplies their campaign IDs. There are no new bespoke geometry factories.
The existing workbench declarative server definition and client authority were
extracted into shared modules; custom sessions and these campaign chambers use
the same implementations. All controllers remain authored/mock. Single-player
C8, movement constants, existing chamber geometry and CONTROL SPINE evidence
are unchanged.

## Authority, persistence and compatibility

Named JSON campaign rooms use the existing version-6 persistent party schema.
They save checkpoints, terminal/toggle values, semantic cube placements, exit
unlock/arrivals and badges. They do not save body occupancy, cube transforms or
holders, rope state, crumble deadlines or other live physics. Resume rebuilds
slot-specific checkpoint positions and saved cube placements through the shared
engine. Old CROSSFEED/RACE parties retain their current chamber, membership,
generation and badges; they do not restart at HANDSHAKE. No schema bump is needed.

The server admits namespaced sensor/control/cube/crumble IDs only according to
the active released document. Existing sender, generation, cube epoch and
physics-owner checks remain. JSON campaign rooms use the bounded JSON sensor
message budget (8 KB) and a stream allowance based on the actual cube count;
older built-in rooms keep their 2 KB message limit. Changing chambers clears
both per-player and per-cube JSON contact caches alongside other transient state.
The trusted client contact/physics model itself has not changed.

Public custom-level sessions retain their separate temporary snapshot lifecycle,
URLs and membership. Importing or saving a browser draft does not publish it,
modify these releases or award campaign progress. Production images explicitly
include `levels/campaign/` for Node's JSON module imports.

## Verification

`tests/authored-campaign.test.ts` checks canonical validation/imports, both slot
spawns, server-authoritative controls and cube ownership, reversible outputs,
two-arrival completion, generation rejection, clean replay and crash recovery.
Restart checks reconstruct checkpoint and cube positions without persisted
physics. Party tests cover a pre-expansion version-6 victory continuing into
DEADLOCK with its original code, players and badges.

`pnpm check:campaign` exercises all five chambers in one party using two isolated
browser identities and real movement/interactions. The JSON chamber routes replay
the existing bounded `levels/scenarios/*.json` with every assertion retained.
The adapter only reads observations; it never sets controller outputs or body
positions. This check also covers NEXT, pause/selection, stale packets, completion
badges, host/guest reconnect and SIGKILL recovery. Reports include the released
document hash and per-step observations/screenshots. Run after `pnpm build`:

```sh
BN_SHOTS=.workbench/reports/campaign pnpm check:campaign
pnpm exec vitest run --config vitest.unit.config.ts \
  tests/authored-campaign.test.ts tests/party-server.test.ts tests/party-menu.test.ts
```

The individual [chamber assessments](../chambers/README.md) retain their physical
and human-playtest limitations. Campaign availability does not establish blind
solve times, accessibility or freedom from every shortcut. Human checks should
include two different computers, swapped roles, missed grapples/catches, reconnect
during a partial delivery, and the host's chamber selection/victory controls.
