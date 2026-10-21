# Cooperative native assembly — browser visual review

Captured from the production build on 20 October 2026 with two independent
local browser identities, `ShadowByte` and `ZeroDay`, created through the actual
character onboarding UI. These are local test sessions; no production activity
or production credentials are included.

`pnpm check:world-assembly` passed **156 assertions**. The read-only render
observations and assertion results are in [browser-review.json](browser-review.json).
The initial HANDSHAKE layout was reviewed and corrected before other chamber
placements were added; [handshake-gate.json](handshake-gate.json) retains that
36-check acceptance gate.

The art captures use the existing presentation-camera override to frame machinery
at normal zoom without moving players, cubes or controller state. The HANDSHAKE
active/inactive comparison uses a real player's accepted pressure-plate contact.
Physical solvability is checked separately by the existing complete campaign
input routes, with `BN_NATIVE_WORLD_REVIEW=1` observing the rendered native values
at those routes' existing capture points. That full five-chamber solve passed
**151 checks** and retained **72 read-only render observations** in the
[physical campaign report](physical-campaign/native-world-physical-route.json),
with its [check results](physical-campaign/checks.txt). Those routes retain their
existing input timing and naturally moving gameplay camera.

## Captures inspected

| View | Captures | Review |
| --- | --- | --- |
| HANDSHAKE crossing | [Inactive](handshake-crossing-inactive.png), [active](handshake-crossing-active.png) | Shared anchors retain the same native store address; one three-instruction listing changes its accepted power status. |
| HANDSHAKE machinery and players | [Lift/relay](handshake-lift-relay.png), [exit](handshake-exit.png), [both names](handshake-both-players.png) | Panels clear the breakpoint mast, entry frame, payload receiver and exit banner. Both player names remain readable. |
| CROSSFEED upper routes | [Left](crossfeed-left-route.png), [right/gallery](crossfeed-right-route-gallery.png) | Distinct authentic route stores; shared route headers remain compact. The narrow gallery-launch header omits the redundant GHOST text so its address fits. |
| CROSSFEED cargo | [Cargo machinery](crossfeed-cargo-machinery.png) | Lift, anchor and return-bridge excerpts avoid cargo, controls and the recovery deck. |
| RACE CONDITION | [Phase A/B](race-phase-a-b.png), [cargo/firewalls](race-cargo-firewalls.png), [exit](race-exit.png) | Firewalls and phase control remain visible. The buffer listing clears PHASE/OFF and the existing timer display. `spanMaster` identifies an existing wire signal and claims no physical machinery binding. The excerpts are static stores, not timer implementations. |
| DEADLOCK | [Lower lift](deadlock-lower-lift.png), [shaft firewall](deadlock-shaft-firewall.png), [upper payload gallery](deadlock-upper-payload.png) | Lower panel clears the authored formula. Upper panels leave all three receivers, service relay and hatch visible; no code platforms were introduced. |
| USE AFTER FREE | [Route A](use-after-free-route-a.png), [route B](use-after-free-route-b.png), [route C](use-after-free-route-c.png) | Listings clear neighboring platform headers and retry shelves. Authored unstable platforms retain their instability labels and never acquire a bogus-code claim. |
| USE AFTER FREE final machinery | [Assist inversion](use-after-free-assist-inversion.png), [final lift/exit](use-after-free-final-lift-exit.png) | The initial raw `assistBlocked=1` is shown separately from physical lift power OFF, explicitly marked INVERTED. |
| Overview scale | [HANDSHAKE](handshake-overview.png), [CROSSFEED](crossfeed-vault-overview.png), [RACE](race-condition-overview.png), [DEADLOCK](deadlock-overview.png), [USE AFTER FREE](use-after-free-overview.png) | Expanded listings collapse to readable output identifiers. The tall rooms avoid repeated code down their shafts; overlapping compact labels are omitted. |
| Existing CONTROL SPINE | [Existing service listing](control-spine-existing-service-assembly.png) | The original retained-evidence renderer remains in use; no cooperative overlay asset is requested. Compare the earlier [service capture](../control-spine-service-assembly.png), which depicts a different accepted gameplay state. |
| Isolation and failure | [Public custom room](public-custom-no-native-overlay.png), [missing asset](missing-asset-gameplay-fallback.png) | Public custom play retains its own authored presentation. A browser-blocked world asset leaves ordinary platform labels, responsive movement and a connected controller session. |

At each reviewed view, native instructions recorded by the renderer were compared
with their own chamber's acquired disassembly: address, RVA, size, bytes, mnemonic, operands,
basic block and contiguous order. Each emphasized store was checked against that
output's recorded store sites. Canvas text calls and visible pixels independently
confirm that the instructions were drawn, rather than merely present in a
snapshot. The test also checks accepted raw values, inversion, the wire-only
`spanMaster` signal with no invented physical state, reconnect,
per-chamber cache reuse and exclusion from custom rooms.

## Frame observations and limits

[frame-observations.json](frame-observations.json) retains measurements made before
parallel regression runs. With the fixed HANDSHAKE camera, 120 animation-frame
intervals after ten warm-up frames measured median **16.7 ms**, p95 **16.8 ms** and
maximum **16.8 ms** with three visible native panels. The asset-unavailable view
with zero panels measured the same intervals. Canvas text instrumentation was
bounded; pixel readback was disabled while measuring.

These are local headless rendering observations, not an isolated performance
benchmark or a production latency claim. The views had different connection
counts. No server or physics code is part of this rendering layer.

The small excerpts show pointer loads and a verified write-one store; they do not
prove the preceding full Boolean calculation or claim current CPU execution.
Panels remain static while their separately displayed accepted values change.
Overview intentionally omits most instruction detail. Listings near the viewport
edge are naturally clipped, and normal moving characters can pass in front of
world decoration.
