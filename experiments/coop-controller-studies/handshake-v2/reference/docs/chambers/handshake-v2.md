# HANDSHAKE v2 — staged firewall prototype

This AUTHORED draft makes maintenance clear a visible payload firewall. Resting
cargo alone supplies the exit Boolean. The released HANDSHAKE JSON, original
draft, native lookup/evidence and campaign navigation remain unchanged. No v2
assembly or native acquisition has been performed on Linux.

- [Draft](../../levels/drafts/handshake-v2.json)
- [Full-room two-visitor scenario](../../levels/scenarios/handshake-v2.json)
- [Frozen Windows request](../native-requests/handshake-v2.json)
- [Validation and captures](../playtest/2026-11-06-handshake-v2/README.md)

Canonical draft SHA-256:
`47575e0f0765b177a038c63e8696e0e3ad90da4e7c41b417c6d25f2b1118d341`.
Request SHA-256:
`5faa53318e3f6f4c19431a9be54657fdec139de18119c1b94838af5ac4bc9d36`.
The resulting source commit is in the dated shared handoff, avoiding a
self-referential commit hash in the committed request.

## Controller and Windows acquisition

```text
crossingPower  = crossing.occupied
liftPower     = liftPlate.occupied
relayPower    = link.value
firewallActive = NOT maintenance.value
exitReady     = exitSocket.occupied
```

Windows x64, little endian, four-byte alignment. Each field is Boolean `uint32`
(only 0 or 1). `void bn_evaluate(inputs*, outputs*)` receives RCX/RDX pointers to
separate 20-byte structs. Use this explicit order, not JSON object-key order:

| Offset / input bit | Input | Accepted game port | Output at the same offset |
| --- | --- | --- | --- |
| 0 / 0 | crossing | crossing.occupied | crossingPower |
| 4 / 1 | liftPlate | liftPlate.occupied | liftPower |
| 8 / 2 | link | link.value | relayPower |
| 12 / 3 | maintenance | maintenance.value | firewallActive |
| 16 / 4 | exitSocket | exitSocket.occupied | exitReady |

`case_id = crossing | (liftPlate << 1) | (link << 2) | (maintenance << 3) | (exitSocket << 4)`.
All 32 abstract vectors are retained in the request, evaluated by the actual
`evaluateDraft()`. Zero inputs produce `[0,0,0,1,0]`. Case 16 (payload without
maintenance) produces `[0,0,0,1,1]`. Write all five outputs every invocation.

CROSSING/LIFT accept bodies or resting cargo; PAYLOAD accepts cargo only. LINK is
reversible. MAINTENANCE COMPLETE is a one-use terminal. Occupancy, cube ownership,
terminal persistence, checkpoint, movement and two-arrival exit latching remain
outside the stateless function. There is no hidden maintenance gate on the exit.

The request pins the canonical draft and actual TS reference files, every
binding, initial values and true/false meanings. The two anchors share
crossingPower; the two relay ends share relayPower. Bindings are not inverted:
NOT is in the firewall expression and its wire annotation reflects it once.

Windows must fetch the exact committed snapshot in the shared handoff, verify
these hashes, and acquire a **separate HANDSHAKE v2** clean/BCF package. Retain
source/PE hashes, ABI, exhaustive native results, authentic disassembly and a
portable read-only verifier against the pinned TS evaluator. Do not overwrite or
relabel the released five-input/four-output package or change its historical
reference pin. Return a dated evidence handoff. Campaign integration is a later
task after review.

## Local geometry and presentation

| Object | Change |
| --- | --- |
| payloadFirewall | New vertical beam `(2060,585)`, length 365, thickness 26, ending at floor y950 |
| exitSocket | `(2130,950)` → `(2170,950)`; matching wire follows |
| maintenance | Same `(1980,360)` terminal/ledge; explicit `floating:true` retains the floating artwork in custom sessions |
| maintenanceFirewallWire | `(1980,348) → (2140,348) → (2140,620) → (2069,620)`, with inverted annotation |
| maintenance reveal | Bounds `(1930,560,510,420)`, padding 40, duration 1.2s |
| firewall label | `PAYLOAD FIREWALL` at `(2150,700)` |
| relay captions | Existing `nativeId` presentation names A/B; object IDs, pairing, position and power unchanged |

The existing gallery at y550–585 seals the top; the existing floor seals the
bottom. No new walls or changed jump requirements. The receiver moves 40 units
for clearance, while the exit stays fixed. The elevated held-cube boost,
checkpoint, anchors, lift and relay remain usable. The draft selects the existing
`handshake` soundtrack key; no audio assets or released soundtracks changed.

## Loading and checks

Open **MY LEVELS → Level Builder**, import `levels/drafts/handshake-v2.json`, choose
**TEST WITH FRIEND** (or **PLAY WITH FRIEND**) and share the invitation with a
second browser profile/device. The title is `HANDSHAKE V2 / FIREWALL DRAFT`.
The frozen custom session is temporary and separate from official campaign saves.

```sh
pnpm level:validate levels/drafts/handshake-v2.json --json
pnpm level:playtest levels/drafts/handshake-v2.json \
  --scenario levels/scenarios/handshake-v2.json \
  --report .workbench/reports/handshake-v2
pnpm exec vitest run --config vitest.unit.config.ts \
  tests/handshake-v2.test.ts tests/handshake-physics.test.ts tests/connections.test.ts
```

The route uses real inputs from both authored spawns, preserving the grapple
transfers, cube substitution, lift, relay and held-cube boost assertions. Added
checks cover live-beam jump/death, checkpoint retry, commitment persistence and
first-arrival-is-not-completion. No gameplay state is injected.

Unit tests are labelled isolated fixtures, including bounded jump/drop/pull
attempts, upper-gallery cargo obstruction, button reach and miss/recovery. An
existing corner case remains: dropping cargo against the far gallery wall can
squeeze the unladen avatar below the gallery. Cargo stays upstairs; sustained
pulling/jumping/E from below did not deliver it. Combining a far-side avatar with
near-side cargo exposed an E-pickup bypass through the initial 18-unit beam. The
final 26-unit beam closes that reach gap: two clear cargo centres must be at least
70 units apart, beyond the existing 66-unit pickup reach. Four far-side pickup
fixtures now reject/reset the attempted transfer. Physics was not changed for
the separate avatar squeeze. These checks do not establish universal shortcut
freedom or human playtest acceptance.
