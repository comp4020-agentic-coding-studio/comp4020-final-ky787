# HANDSHAKE v2 — 2026-11-06

The separate AUTHORED [draft](../../../levels/drafts/handshake-v2.json) has a
normally active payload firewall. Maintenance disables it permanently; cargo
alone supplies the exit Boolean. The released HANDSHAKE was not modified.
See the [design/Windows request](../../chambers/handshake-v2.md).

Checks on final canonical draft
`49f1ef8a0543f71d7b76ffbe187fcde0801d037ef7bc0eaf2728a32fae3990c6`:

- Validator: playable, zero diagnostics.
- Real-input co-op scenario: **68 steps passed**, both visitors completed with
  `[true,true]` arrivals. P1 had one deliberate firewall death; P2 had one R reset
  after maintenance. P1 simulation time 32.36s is an automated measurement, not
  a new-player completion estimate.
- Focused Vitest: **38 passed** (`handshake-v2`, original `handshake-physics`,
  `connections`). Includes all 32 vectors and pinned request/source hashes.
- `pnpm typecheck` and `pnpm build`: passed; existing chunk-size advisory remains.
- Global NOT presentation: [36 two-client checks and on/off captures](../2026-11-06-inverted-signals/README.md), including 1024×768, reduced motion and pause.
- Diff inspection: released campaign, original HANDSHAKE draft, native evidence,
  movement and audio assets unchanged. No unrelated full campaign replay.

The [route summary](route-summary.json) retains measured checkpoint observations
and all passed step labels. Full local reports/trajectories are under
`.workbench/reports/handshake-v2-final/`, produced by the existing runner.

Four normal-camera 1600×900 captures were inspected:

| State | Capture |
| --- | --- |
| Active beam before deliberate failed jump | [Firewall active](firewall-active-host.png) |
| Floating maintenance committed after held-cube boost | [Maintenance](maintenance-committed-partner.png) |
| Beam off, cargo accepted and exit open | [Payload delivered](payload-delivered-host.png) |
| Both physical arrivals | [Complete](completed-host.png) |

Iteration findings: the checkpoint retry initially returned through the powered
relay too quickly, missing its existing 0.65s cooldown. The scenario now waits on
safe gallery ground and asserts the lower egress position. This changes input
timing only. Relay captions use supported A/B IDs to clear the beam. Existing
physical assertions were retained.

A bounded fixture found an existing avatar-only wall/cube squeeze: dropping cargo
at the far gallery edge can send the body below it. Cargo remains upstairs,
including under sustained pulls and jump/E attempts from below. No payload bypass
was observed; universal shortcut prevention is not claimed. Human playtesting
and a separate Windows native acquisition remain pending.
