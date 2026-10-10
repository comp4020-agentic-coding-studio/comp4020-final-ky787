# Static authored firewalls use local contact and accepted cube resets

Date: 2026-10-11. Status: implemented; awaiting two-computer acceptance.
Starting HEAD: `d85106d9ef91c444d8931ffd597ea65f56aa861b`.

## Decision

Add explicit `FirewallDef` room data (`id`, top-left position, orientation,
length, optional thickness). Derive one lethal rectangle, shared by contact and
rendering. It is always active, non-solid and unhookable. Only Crit 5's visual
language and an already-approved CC0 sound are reused; none of its timed or
moving state machine is ported. This firewall is a game-authored hazard and is
not binary/obfuscator evidence.

Player contact remains local and uses the existing death/shared-checkpoint rule.
It records cause `firewall`; the partner and durable room progress are untouched.
The accepted cube simulator alone detects actual cube contact, including the
overhead carry pose and grapple pull. It requests semantic `cube-reset` with
current epoch and cause. No geometry or player physics moves to the server.

The server serializes reset with existing cube actions: authenticate current
authority/epoch/sequence, clear holder and pull, advance epoch, clear transform,
retain connected authority, and restore durable placement `spawn`. Changed
placement is written before the accepted result/broadcast. The frontend resolves
the original authored spawn. Old transform epochs cannot resurrect the cube.
Disconnect uses existing transfer rules. This trusts the simulator's physical
sensor report, consistent with the existing multiplayer model; no anti-cheat.

For responsiveness, the simulator hides the contacted cube and stops pull,
simulation and publication immediately. It waits for an in-flight cube action
before reporting against the accepted epoch. Reconciliation creates the reset
truth; authority loss/denial/disconnect cannot manufacture a second cube. An
ephemeral accepted reset marker identifies effects and cancels stale carry/pull
prediction, without persisting physical state. New joins start silently.

Payload contact precedes player death/release. A cube-only hit leaves its holder
alive; touching both kills the local player normally as well. Boost support is
not tested as a hazard body and disappears with the accepted holder reset.
Relay/lift integration checks cube contact after transport; firewalls never
enter relay clearance. Existing cooldowns, grants and movement remain intact.

## Scope and consequences

FIREWALL LAB (`firewall-lab`) demonstrates both orientations/different lengths,
local checkpoint deaths, repeated loose/carried/pulled destruction and a physical
two-player finish. Its entry checkpoint switch only opens the exit. No hazard
timer/state needs synchronization or persistence.

The effect can lag for the remote peer by the reset round trip. Collision uses
fixed-step boxes; the small glow/emitter posts are decoration. Authors must place
spawns/checkpoints outside beams. C8, CONTROL SPINE, retained binary evidence,
existing final stages and general player collision are unchanged. Stop at this
milestone for manual two-computer testing.
