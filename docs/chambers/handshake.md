# HANDSHAKE — verified firewall v2

The released first co-op chamber uses the approved firewall draft and its separate
Windows-native acquisition. Campaign identity, navigation and saved-party identity
remain `handshake`. The prior five-input/four-output specimen is historical:
[original design record](handshake-v1.md), `experiments/coop-controllers/handshake/`.
It is not used to label or drive the current room.

- Released room: [`levels/campaign/handshake.json`](../../levels/campaign/handshake.json)
- Editable mirror: [`levels/drafts/handshake.json`](../../levels/drafts/handshake.json)
- Frozen acquisition draft: [`levels/drafts/handshake-v2.json`](../../levels/drafts/handshake-v2.json)
- Physical route: [`levels/scenarios/handshake.json`](../../levels/scenarios/handshake.json)
- [Exact request and geometry](handshake-v2.md), [validation/captures](../playtest/2026-11-06-handshake-native-integration/README.md)

## Gameplay and authority

CROSSING powers the two grapple bars across the 600-unit gap. A recovered cube can
hold this plate for the partner. LIFT raises the carrier to the service gallery;
LINK opens the paired relays. One player holds the cube to boost the other onto
the unchanged 190-unit MAINTENANCE COMPLETE ledge. The server accepts this terminal
once and permanently disables the visible payload firewall. Bring the cube back
through the relay and rest it in PAYLOAD; both players physically enter the exit.

The approved vertical firewall is at `(2060,585)`, length 365, thickness 26; the
receiver is at `(2170,950)`. Existing floor/gallery seal the beam's ends. The
breakpoint, spawns, boost, lift, anchors and relay positions remain unchanged.
Movement, cube interaction, checkpoint authority and music are unchanged.

The five Boolean inputs and outputs occupy consecutive four-byte offsets in
separate 20-byte structs (Windows x64 RCX/RDX). Inputs are encoded as bit0 through
bit4 in this order; all 32 vectors have retained clean and BCF results:

| Offset | Input / accepted port | Output / expression |
| --- | --- | --- |
| 0 | crossing / crossing.occupied | crossingPower = crossing.occupied |
| 4 | liftPlate / liftPlate.occupied | liftPower = liftPlate.occupied |
| 8 | link / link.value | relayPower = link.value |
| 12 | maintenance / maintenance.value | firewallActive = NOT maintenance.value |
| 16 | exitSocket / exitSocket.occupied | exitReady = exitSocket.occupied |

Zero input produces `[0,0,0,1,0]`. Payload without maintenance (case 16) produces
`[0,0,0,1,1]`: maintenance is a physical route obstruction, not a hidden exit
Boolean. All bindings are uninverted. The server retains terminal commitment,
accepted cargo ownership/occupancy, exit latching, checkpoint persistence and
`arrivals=2`; none of these stateful responsibilities moves into the native
function. Reconnect/death keeps committed maintenance and the breakpoint. Existing
saves retain their device values, cube, members and exit latch; output projections
are recomputed using v2. A first arrival never completes the room.

## Native provenance and consumer boundary

Package: `experiments/coop-controller-studies/handshake-v2/`, acquired at
`1b9aa192fa26017ca67c46e21a79d2a18c55a25d` from source
`2532b50e729463f67d2afef700b1830ca6cb7753`.

| Pinned producer | SHA-256 |
| --- | --- |
| Frozen draft | `47575e0f0765b177a038c63e8696e0e3ad90da4e7c41b417c6d25f2b1118d341` |
| Request | `5faa53318e3f6f4c19431a9be54657fdec139de18119c1b94838af5ac4bc9d36` |
| Manifest | `8b692223d641d1d443d537df2619a473f40662fea9a0d16ca5a72673fbb4d879` |
| Contract | `08ccba38195b3466bfff5fef37e1ede555865de2a1e468cdaa426e5c2f0000e8` |
| Clean PE | `a2edb2a7084c142005dc8273f61736c86be478b8510e7a0cd2234db513ccf33b` |
| BCF PE | `57f7951f364594ebc417e5d93b15ef694595c7ad06ff9fe2d148fd0531cbcda1` |

The portable verifier is read-only:

```sh
python3 -I -B experiments/coop-controller-studies/handshake-v2/scripts/verify_portable.py
pnpm check:native
```

Generation validates the pinned manifest, request, source files and frozen draft;
the promoted controller, bindings and geometry must match that draft. Every
native row also matches the actual current TS evaluator. The server consumes the
compact `server/native/tables/handshake.json`; it never executes or emulates PEs.
BYPASS's independent pin and every other chamber's historical source pin remain
unchanged. No acquired file is rewritten.

## Environmental assembly and inspector

Four fixed snippets retain crossing, lift and relay coverage and replace the old
exit panel with `firewallActive`. All bytes, addresses, blocks and zero/one store
observations come from v2. The final panel is at `(2140,610)`; the relay panel is
at `(1776,610)` with width 260 to clear the beam. The duplicate authored firewall
caption is suppressed only in the released room. Geometry does not move for art.

| Output | Zero-store RVA | One-store RVA |
| --- | --- | --- |
| crossingPower | 0x115C | 0x10F1 |
| liftPower | 0x12A9 | 0x123D |
| relayPower | 0x13F7 | 0x138B |
| firewallActive | 0x14D9 | 0x1545 |
| exitReady (Evidence only) | 0x1693 | 0x1627 |

World colour/store choice follows accepted raw results. Static fragments do not
claim a live CPU path. The inspector identifies `handshake-v2_ollvm_bcf`, rejects
stale v1 assets, and claims an exact retained frame only when all five device
ports and outputs match; otherwise traces remain labelled samples. Missing
assets isolate presentation failure without altering gameplay. Paused/reduced
motion and disconnected states retain the existing presentation policy.

The frozen integration schema omits the browser's `kind` category. The consumer
generator supplies `raw_combinational` specifically for this verified stateless
package, retaining the frozen file/hash and the stricter older schema checks.

## Limitations

The original unladen-avatar squeeze at the far gallery edge remains; cargo stays
above. The approved 26-unit beam prevents the tested far-side E-pickup reach
shortcut. Bounded real-physics jump, pull, drop and pickup tests are retained;
they are not proof against every possible input sequence. Automated routes do
not establish novice completion time or replace human playtesting. No assembly
was generated or fabricated on Linux.
