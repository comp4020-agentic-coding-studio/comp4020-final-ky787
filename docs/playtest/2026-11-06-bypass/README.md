# BYPASS — authored cooperative draft, 2026-11-06

BYPASS is a complete two-player **DRAFT**, intended for human playtesting between
HANDSHAKE and CROSSFEED VAULT. It is not in the campaign, badges or NEXT navigation.
The 3–5-minute first-success target is a design aspiration, not a measured result.

- Draft: [`levels/drafts/bypass.json`](../../../levels/drafts/bypass.json)
- Full solve and recovery scenario: [`levels/scenarios/bypass.json`](../../../levels/scenarios/bypass.json)
- Reversed physical slots, fresh mouse-free opening: [`bypass-swapped-roles.json`](../../../levels/scenarios/bypass-swapped-roles.json)
- Isolated contract/physics fixtures: [`tests/bypass-draft.test.ts`](../../../tests/bypass-draft.test.ts)
- Controls baseline: `7bf93b2`; ordinary tap jump rises **127.4 world units**.
  No movement, hook range, campaign geometry or native evidence was changed here.

## Load and play

1. Download/export `levels/drafts/bypass.json`. Open **LEVEL BUILDER → OPEN LEVEL
   BUILDER** (or `/workbench.html`) and choose **Import JSON**, selecting that file.
2. Clear object selection to see Draft properties: **Music in co-op = kuia**.
   **TEST WITH FRIEND** launches the current document as a frozen temporary room.
3. Share its invitation link or four-character code with a second browser identity
   (another device/profile/private context). The friend opens the link or uses
   **MY LEVELS → JOIN CUSTOM ROOM**. One visitor cookie represents one player.
4. For ordinary repeat play, **Save** in the builder, return to **MY LEVELS**, and
   choose **PLAY WITH FRIEND** on BYPASS. This freezes the saved version.
5. After editing, start a fresh test room. Existing sessions keep their frozen copy.
   Public rooms are temporary and disappear after server restart/expiry.

Locally, `pnpm dev` exposes the same draft in the filesystem builder. Its
**TEST WITH FRIEND** uses the local draft runner; both workflows play the selected
music after a user gesture. The embedded single-player editor preview stays silent.

## Layout and intended cooperation

Coordinates are world units; rectangles use top-left, devices use floor contact,
and spawns/checkpoint markers use body centres. Permanent walking surfaces are y=680.

| Section / object | Coordinates / extent | Purpose |
| --- | --- | --- |
| Room | 3840 × 880 | Compact left-to-right route |
| Entries / HOLD ANCHOR | (110,663), (430,663) / (270,680) | Entries clear of scanner and takeoff |
| Opening banks / lethal field | Bank ends x=560; far bank starts x=980; field (560,760,420,120) | 420-unit non-jumpable opening, nearby existing respawn |
| Stable anchor | (790,340,160,24); hook point (870,346) | One powered assisted hook; no unstable anchor |
| LINK / bridge | (1100,680) / (560,680,420,28) | Permanent non-hookable walking return |
| BREAKPOINT / markers | (1290,680) / P1 (1220,663), P2 (1350,663) | Automatic shared recovery, safe permanent ground |
| HOLD BYPASS / firewalls | (1460,680) / x=1590 and 1740, y=500, 20×180 | Both barriers off while held |
| Corridor roof / OVERRIDE | (1530,330,300,170) / (1910,680) | Visible obstacle prevents an ordinary jump over beams; terminal beyond live-beam reach |
| Crumble approach | Takeoff bank ends x=2100; slabs (2200,680,200,28), (2780,680,200,28) | Two broad unstable footholds with 100-unit gaps |
| Rest / final landing | Island x=2500..2680; finish x=3080..3840 | Permanent waiting and recovery footholds |
| Crumble death field | (2100,790,980,90) | Visible field beneath both unstable spans |
| LEFT / RIGHT / exit | (3250,680), (3430,680) / (3670,540,80,140) | Separate safe scans, latched two-arrival exit |

One player holds ANCHOR while the other taps Space, presses and holds Space again
in air, swings with D, then releases Space to jump off. The highlighted stable bar
is the actual automatic target. S+release drops; precise mouse hold/release remains
available. LINK keeps the anchor and bridge powered after the operator leaves.

At the breakpoint, swap roles: one holds BYPASS while the other walks through both
barriers and presses E at OVERRIDE. Early release restores both barriers until
OVERRIDE commits. There is no timer or return-route trap.

Each unstable slab has **1.4 s foot warning, 1.4 s hook warning, 2.6 s recovery**.
These are object-local settings using the existing shared lifecycle. A hook does
not grant an indefinite safe rope or restart the running fuse. Ordinary jumps
suffice; wait on the takeoff bank or middle island for a broken slab to return.
Both final scanners must be occupied together, then both players enter the exit.

## Controller and recovery contract

Version-1 declarative Boolean AST, six input ports, four outputs:

```text
anchorPower    = anchorHold.occupied OR link.value
bridgePower    = link.value
firewallActive = NOT (bypassHold.occupied OR override.value)
exitReady      = link.value AND override.value AND leftScan.occupied AND rightScan.occupied
```

`anchorPower → anchor.active`, `bridgePower → bridge.active`, `firewallActive →
firewallA.active + firewallB.active`, `exitReady → exit.unlock`. Exit has
`latch=true`, `arrivals=2`. LINK/OVERRIDE are one-use terminals; all held inputs are
body scanners. The death fields are constant hazards. Breakpoint activation is
recovery, not a controller input.

Ordinary deaths retain terminal commitments and accepted checkpoint. Before the
breakpoint each slot respawns at its entry; afterward each uses its own marker.
The shared checkpoint may legitimately recover a lagging partner forward. Scanner
occupancy is transient. Replay/new custom session resets the room normally.

This is authored/mock gameplay, including prototype crumble. There are no native
instructions, addresses, generated binaries or bogus-block claims. A later
Windows-side evidence task must validate an actual producer/consumer bundle after
human gameplay acceptance; this JSON and its Boolean contract are not native proof.

## Validation and evidence

- Validator: playable, no diagnostics; canonical SHA-256
  `22b3c4843a98eecaec7e3b17d0a2f96f59aadf9fe374f0952429f55e88dd7709`.
- **69-step full-room scenario**: real input, two independent visitors, both
  physical arrivals. Includes unassisted opening failure, deliberate missed manual
  hook, automatic retry, physical bridge use, terminal/death persistence, both
  checkpoint markers, early firewall-release death, crumble warning/collapse/fall/
  recovery, sequential travellers, sequential-scan rejection and simultaneous latch.
- **63-step swapped-slot full solve**: same assertions with slot-specific markers;
  opening uses no mouse action at all. Roles are not restricted to player slots.
- **62 focused tests**, `pnpm typecheck`, and `pnpm build` pass. Contract fixture
  covers all 64 Boolean combinations. Range fixtures cover every integer occupied
  scanner x=223..317; none can hook the bar. Running/coyote jump attempts fail at
  the opening. Three release positions x=900/930/960 all land safely in the labelled
  isolated physics fixture. Those fixtures are not full-room solves.
- **15 public two-client audio checks** pass: both decode the full Kuia loop,
  independent saved Music/Effects levels, mute/resume, respawn/snapshot continuity,
  focus suspension, actual transport reconnect, and menu soundtrack restoration.
  A separate local-runner audio fixture passes for both clients.
- Normal-camera section captures were inspected. The static opening hint was moved
  clear of the dynamic rope-release hint. All environment coordinates stay fixed.

The scripts execute much faster than exploratory human play; their elapsed time
is not a new-player completion-time estimate. Tests establish the specified routes
and failures, not universal shortcut freedom or human difficulty acceptance. Human
paired playtesting, including touch/small-screen comfort, remains required before
campaign integration. Existing campaign replay was not repeated: shared gameplay
code and movement constants are unchanged.

Reproduce with existing tools:

```sh
pnpm level:validate levels/drafts/bypass.json --json
pnpm level:playtest levels/drafts/bypass.json --scenario levels/scenarios/bypass.json --report .workbench/reports/bypass/full
pnpm level:playtest levels/drafts/bypass.json --scenario levels/scenarios/bypass-swapped-roles.json --report .workbench/reports/bypass/swapped
BN_TEST_AUDIO=1 BN_AUDIO_DRAFT=levels/drafts/bypass.json BN_SHOTS=.workbench/reports/bypass/audio pnpm check:audio
```

For optional actual-canvas recording, prefix `level:playtest` with
`BN_RECORD_ACTORS=p1,p2`; it reuses the existing MediaRecorder helper and writes
`gameplay-<actor>.webm` beside the report. `BN_SHOT_FILTER` restricts screenshots.
Detailed local reports and trajectories are under `.workbench/reports/bypass/`;
[`checks.json`](checks.json) retains the compact result summary.

Retained captures: [overview](overview.png), [opening](section-1.png),
[firewall station](section-2.png), [crumble warning](section-3.png), and
[short grapple / crumble recovery clip](grapple-crumble-recovery.webm).
The silent canvas clip cuts between real recorded segments; it is not an unedited
full solve or an audio audition. Playback is checked separately.

## Soundtrack

`presentation.music: "kuia"` explicitly selects the bundled loop for both frozen
custom clients even though the runtime room ID is `workbench`. Missing selectors
retain the previous silent draft behavior; only allowlisted bundled keys are
accepted. No title-derived trust, arbitrary URLs, uploads or campaign registration.

Kuia by James Gargette (cinameng), [CC0 source](https://opengameart.org/content/kuia),
uses the complete **47.177143-second** retained runtime master from `60c04fc`,
not a listening preview. Runtime SHA-256:
`52e97ddbd7f41873b4d9bb324b91767a6ef6f319cc50635457ff094659ca707d`.
See [audio credits](../../../AUDIO_CREDITS.md) and
[provenance/catalogue details](../../audio-selection.md). No new acoustic audition
is claimed; all seven released music assets and all effects remain unchanged.
