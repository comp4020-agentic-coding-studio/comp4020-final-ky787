# BYPASS — cooperative chamber

BYPASS remains public chamber 02: **HANDSHAKE → BYPASS → CROSSFEED VAULT**.
It is **AUTHORED** until verified native evidence is integrated. The four-input
[Windows request](../native-requests/bypass.md) supersedes the earlier six-input
draft/promotion handoffs; no binary evidence has been fabricated or integrated.

The [released room](../../levels/campaign/bypass.json) and
[matching draft](../../levels/drafts/bypass.json) are byte-identical canonical v1
JSON, SHA-256 `38fc3c7e1393caa034eb840f96bca9d1a79bae466d46db01b3a45b04144ec9cb`.
The neutral room objective is **REACH THE EXIT TOGETHER**. Large solution captions
are removed; control labels, E prompts, breakpoint feedback, grapple prompts and
UNSTABLE/fuse warnings remain. Freed space contains no invented assembly.

## Route and recovery

1. HOLD / ANCHOR powers the stable bar over the 420-unit opening. The holder is
   outside grapple range. LINK permanently powers the bar and non-hookable bridge.
2. The automatic BREAKPOINT saves safe slot-specific recovery points. HOLD / BYPASS
   disables both firewalls; OVERRIDE permanently disables them. Early release
   restores them until OVERRIDE is committed.
3. Cross the two 200-unit crumble slabs using ordinary jumps and the permanent
   resting island. Both players physically enter the already-open portal.

There are no final LEFT/RIGHT scanners or hidden terminal completion prerequisites.
The portal is physically open on the first accepted state and after restore.
One arrival cannot complete the chamber; two arrivals award the normal badge.

Room dimensions 3840×880, all remaining objects/geometry, safe landings and exit
placement are unchanged. Entry centres P1 (110,663), P2 (430,663); checkpoint centres
P1 (1220,663), P2 (1350,663). Death preserves LINK, OVERRIDE and checkpoint while
held occupancy is transient. Crumble foot/hook warning is 1.4 s, recovery 2.6 s;
re-hooking does not reset a running fuse. The follower can wait on permanent ground.

## Current controller

Four Boolean inputs in ABI order: `anchorHold.occupied`, `link.value`,
`bypassHold.occupied`, `override.value`. All initially false.

| Output | Expression | Destination |
| --- | --- | --- |
| `anchorPower` | `anchorHold.occupied OR link.value` | Stable anchor active |
| `bridgePower` | `link.value` | Walking bridge active |
| `firewallActive` | `NOT (bypassHold.occupied OR override.value)` | Both firewalls active |
| `exitReady` | `{ "op": "const", "value": true }` | Exit unlock |

Exit binding/latch/arrivals remain `exitFeed`, `latch=true`, `arrivals=2`.
Scanners remain `kind=scanner`, body-only; their modern animated pad artwork and
biometric rails observe accepted state and do not alter occupancy. Cube-sensitive
plates and sockets retain their separate rules. No controller/schema version bump.

Older v6 BYPASS saves preserve membership, checkpoints, commitments, generation,
revision and badges. Loading safely discards only the obsolete Boolean
`leftScan.occupied`/`rightScan.occupied` keys and initializes the open portal. Other
malformed state still fails validation. Replaying resets commitments normally.

## Music, validation and history

Kuia remains the full 47.177143-second CC0 recording by James Gargette/cinameng,
SHA-256 `52e97ddbd7f41873b4d9bb324b91767a6ef6f319cc50635457ff094659ca707d`.
The official mapping and draft's `presentation.music: "kuia"` are unchanged.

Current real-input scenarios: [normal](../../levels/scenarios/bypass.json), 65 steps,
and [swapped roles](../../levels/scenarios/bypass-swapped-roles.json), 59 steps.
They retain hook failures/retry, terminal persistence, safe checkpoints, early
firewall-release death, deliberate crumble collapse/recovery and both arrivals.
After removed scanner visits shortened the route, follower recovery waits on the
actual shared stable state; both original stability assertions remain.
`node scripts/bypass-browser-check.ts` runs both with independent visitors through
the released campaign. Isolated tests cover all 16 vectors, body-only occupancy,
save migration and arrival behavior without substituting for those physical routes.

[Current validation](../playtest/2026-11-06-bypass-native/README.md) records checks
actually run. Earlier [draft](../playtest/2026-11-06-bypass/README.md) and
[promotion](../playtest/2026-11-06-bypass-campaign/results.json) evidence remains
historical: the original 87-check six-chamber regression used the superseded final
scanner puzzle. Human playtesting remains distinct from scripted validation.

Load via **Play Co-op → Start Co-op → 02 — BYPASS**, or NEXT after HANDSHAKE.
