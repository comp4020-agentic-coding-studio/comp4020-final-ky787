# Predict locally, reconcile to server authority

Date: 2026-10-06. Status: implemented; real-network responsiveness acceptance pending.
Starting HEAD: `aec24f90b212ee9f051bc7cb3f49e3574b5c0d75`.

Two-computer testing accepted the shared cube but found pickup, drop, pull startup
and Switch B noticeably delayed. Local feedback waited for a server round trip,
and the common semantic mutation path fsynced even purely ephemeral state.

## Alternatives

1. **Wait for authority before all feedback.** Simple reconciliation, but network
   RTT and unnecessary volume waits remain directly visible on each input.
2. **Chosen: predict local interaction, reconcile server results.** Temporary
   presentation/physics starts immediately. An explicit per-request result either
   confirms it seamlessly or restores the accepted state. Server arbitration and
   durable acknowledgment guarantees stay intact.
3. **Fully client-authoritative interaction.** Immediate but permits competing
   holders, divergent shared outputs and invalid persistent progression. Rejected.

## Decision

A local ledger tracks one pending cube action and one pending switch action by
semantic sequence, source epoch and socket generation. It never changes the
accepted room object. Pickup, drop, pull start/stop and Switch B predict local
feedback. While a cube action is pending, even an existing simulator cannot
publish its predicted transform or contact reports. Only a server grant establishes
shared ownership, pull exclusivity and a new cube stream.

The server sends an action result containing sequence, acceptance and current
room. Confirmation retains valid local motion and suppresses duplicate feedback.
Denial snaps ownership/presentation to the latest accepted transform, cancels pull,
and suppresses contradictory carry/drop audio. Old generations/sequences cannot
confirm new actions. Disconnect clears prediction; rejoin reconstructs from truth.
A pull released before its grant sends stop in the granted epoch on confirmation.

The local return bridge may follow predicted Switch B, but cube interactions,
final body plate reports, checkpoint and exit progression check confirmed state.
Cargo plate animation/feedback may reflect local physical contact. Its final-access
platform becomes usable only after server-confirmed durable placement. No other
puzzle output or progression is predicted.

Live room revisions advance for ephemeral mutations with no write. Version-3
`record.revision` stores the last durable live watermark; no schema migration is
needed. Switch/checkpoint, semantic cargo placement, unlock, arrivals, completion,
room creation and slot reservation retain atomic-file/fsync-before-acknowledgment.
An ephemeral event causing a durable transition uses that durable path. The
serial semantic queue remains; snapshots still bypass it. This avoids both disk
churn and exposing an unsaved latch through an overlapping ephemeral broadcast.

## Consequences and validation

Two browsers may briefly predict that they carry the cube during a race, but
exactly one accepted publisher survives. A contested loser can see a correction;
remote players remain subject to network/interpolation delay. This is intentional.
No server physics, geometry change, client-selected owner, weaker identity check,
new binary or multiplayer CONTROL SPINE is introduced.

F1 separates pending prediction from accepted ownership and shows per-action RTT.
Test-only delayed semantic handling and timing callbacks separate queue/fsync
cost from local feedback. Unit/server tests cover stale responses, denied state,
publication gates, disk writes and restart. The real two-context route adds
contested pickup in both orders and disconnect before confirmation under delay.
Local automation does not establish Fly latency or replace two-computer acceptance.

See [the multiplayer contract](../c9-multiplayer.md) for protocol, limits,
recovery rules, commands and measured validation.
