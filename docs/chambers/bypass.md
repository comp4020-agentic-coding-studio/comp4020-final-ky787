# BYPASS — cooperative chamber

BYPASS is the second public co-op chamber: **HANDSHAKE → BYPASS → CROSSFEED VAULT**.
It was promoted on explicit user request on 2026-11-06 after its draft delivery.
Promotion does not claim new human playtesting. This is an **AUTHORED** chamber:
its server-evaluated Boolean controller and prototype crumble have no native
binary provenance or bogus-block proof.

The authoritative release is [`levels/campaign/bypass.json`](../../levels/campaign/bypass.json).
It preserves the tested [`editable draft`](../../levels/drafts/bypass.json) unchanged,
including its controller, geometry, camera reveals and Kuia selection. Canonical
SHA-256: `22b3c4843a98eecaec7e3b17d0a2f96f59aadf9fe374f0952429f55e88dd7709`.
Subsequent draft edits do not change the campaign snapshot.

## Intended route and recovery

1. One player occupies HOLD / ANCHOR while the partner taps Space, holds a second
   Space press to hook the highlighted stable bar, swings with D and releases
   Space to jump onto the far bank. The 420-unit opening is lethal below the swing.
   The scanner occupant is outside hook range; LINK permanently powers the anchor
   and a non-hookable bridge for the waiting player.
2. Regroup at the automatic BREAKPOINT and swap roles. HOLD / BYPASS disables both
   vertical firewalls while the partner walks through and presses OVERRIDE. Early
   release restores both barriers until that one-use terminal commits.
3. Cross two 200-unit unstable slabs, with 100-unit gaps and a permanent middle
   island. Ordinary full-height jumps suffice. Each slab warns for 1.4 seconds
   after foot or hook contact and recovers 2.6 seconds after breaking. Wait on
   permanent ground; re-hooking does not restart the fuse.
4. Occupy LEFT and RIGHT simultaneously, then both physically enter the exit.
   Sequential solo visits do not count. The exit stays latched after unlocking.

The room is 3840 × 880 world units, with walking surfaces at y=680. Entry centres
are P1 (110,663), P2 (430,663); the accepted shared breakpoint changes them to
P1 (1220,663), P2 (1350,663). All four positions are permanent safe ground clear
of scanners. Death preserves LINK, OVERRIDE and the accepted checkpoint, while
held scanner occupancy remains transient. A lagging player can recover forward
once the shared checkpoint is earned. Replay starts a fresh chamber normally.

## Controller contract

Version-1 declarative Boolean AST, six input ports and four outputs:

| Output | Expression | Destination |
| --- | --- | --- |
| `anchorPower` | `anchorHold.occupied OR link.value` | Stable anchor active |
| `bridgePower` | `link.value` | Walking bridge active |
| `firewallActive` | `NOT (bypassHold.occupied OR override.value)` | Both firewalls active |
| `exitReady` | `link.value AND override.value AND leftScan.occupied AND rightScan.occupied` | Exit unlock |

LINK and OVERRIDE are one-use terminals; held inputs are body scanners. The exit
uses `latch=true`, `arrivals=2`. Death fields are constant hazards, crumble uses
the existing shared lifecycle, and the breakpoint is recovery rather than a
controller input. No cube, lift, teleporter or new timing controller is introduced.

## Music and validation

BYPASS uses the complete **47.177143-second Kuia** loop by James Gargette
(cinameng), [CC0 source](https://opengameart.org/content/kuia). The campaign reuses
`public/audio/music/kuia.ogg` unchanged; custom versions select it with
`presentation.music: "kuia"`. Its retained master comes from `60c04fc`, with
SHA-256 `52e97ddbd7f41873b4d9bb324b91767a6ef6f319cc50635457ff094659ca707d`.
See [audio credits](../../AUDIO_CREDITS.md) and [source records](../audio-selection.md).
No new acoustic audition or change to other soundtrack assets is claimed.

The [draft validation record](../playtest/2026-11-06-bypass/README.md) contains
coordinates, four captures and a short recovery clip. The 69-step
[`bypass.json`](../../levels/scenarios/bypass.json) scenario completes the room
with two independent browsers and deliberate failure/recovery checks. The
63-step [swapped-slot route](../../levels/scenarios/bypass-swapped-roles.json)
starts with a fresh mouse-free opening. Labelled isolated fixtures cover the
64 Boolean input combinations, scanner/hook range, ordinary-jump failure and
multiple successful rope-release positions; they do not substitute for the
complete physical solves. The existing campaign check reuses the canonical
scenario against the released room.

Human paired playtesting, especially touch/small-screen comfort, remains
outstanding. The 3–5-minute first-success target is an aspiration, not a measured
time. Recorded routes establish those routes and assertions, not universal
shortcut freedom or a human difficulty rating.

## Campaign promotion checks — 2026-11-06

The complete six-chamber real-input regression passed **87 checks** in one party,
including BYPASS's 69-step solve, HANDSHAKE → BYPASS → CROSSFEED NEXT transitions,
all six badges, host/guest reconnect and SIGKILL recovery in victory and play.
A focused official-page BYPASS solve also verified actual Kuia playback on both
clients. **78 focused tests**, `pnpm typecheck` and `pnpm build` passed. Tests
cover saved LINK/OVERRIDE/checkpoint recovery, transient occupancy/crumble reset,
latched two-arrival completion, replay, and pre-BYPASS five-badge saves retaining
their progress without automatically earning BYPASS. No persistence schema bump.

Only the primary scenario's approach coordinates changed to allow normal braking
inside scanner/terminal reach in the campaign runner; every assertion is retained.
The released geometry/controller and existing rooms are unchanged.

See [campaign checks](../playtest/2026-11-06-bypass-campaign/checks.txt),
[compact results](../playtest/2026-11-06-bypass-campaign/results.json),
[selector](../playtest/2026-11-06-bypass-campaign/selector.png),
[BYPASS in campaign](../playtest/2026-11-06-bypass-campaign/bypass.png), and
[six-chamber completion](../playtest/2026-11-06-bypass-campaign/complete.png).
Detailed local observations remain in `.workbench/reports/bypass-promotion/`.

Play through **Play Co-op → Start Co-op → 02 — BYPASS**, or use NEXT after
HANDSHAKE. Existing parties can choose it through the host's chamber selector.
