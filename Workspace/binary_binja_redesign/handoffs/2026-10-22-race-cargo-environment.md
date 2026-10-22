# Fixed RACE cargo decoration — 22 October 2026

Revised current main from `29cdc78a7193def810b12053abb925b2130f4ba7`.
This supersedes the dashboard presentation recorded in the earlier cargo handoff.
The owning contract is [docs/race-cargo-panel.md](../../../docs/race-cargo-panel.md).

Four quiet code blocks now sit at world x **800, 1152, 1504, 1856**, y **960**,
each **328 × 124**, with 24-unit gaps. They occupy the empty strip below the
horizontal firewall and above the control wires, clear of stairs and DROP B.
Fonts are 12 world units. The ordinary camera transform scales the blocks;
viewport bounds only cull them. There is no inverse scaling, docking, fitting,
operator layout, overview substitution or camera-specific arrangement.

Each block shows three or four exact native instructions, a restrained red/green
accent on the genuine selected store, and one short authored state string using
the existing decoding utility. Upper support includes a CMP; safety includes
the saved-Boolean reload/TEST/JNE. Separate excerpts use only a bare `...` in
gameplay and keep their full boundaries/provenance in diagnostics and Evidence.
No global header, address gutter, raw-input summary, tutorial text or duplicate
timer remains. The chute retains its existing timing display.

Message reveals are independent per mechanism. Accepted buffer contact can
decode BUFFER HOLDING without restarting the other strings. Repeated snapshots,
countdown ticks and revisions do not restart effects; reduced motion, pause,
reconnect and initial/missing state settle them. Disconnect shows muted OFFLINE
strings. Expiry remains distinct from release and no message claims delivery.
Native instructions never scramble. The four obsolete listings stay suppressed,
including asset failure; unavailable blocks show a muted string without invented
instructions. The other five RACE panels keep their original placements: the
dashboard's spanMaster/phaseA/phaseB overrides were removed.

Unchanged: cargo asset/loader/integrity pin and full inspector, study/acquisition,
native tables/binaries, protocol, controllers, server timing, geometry, camera,
physics, player controls and cube authority. The validated asset remains 25,595
bytes. Unrelated local changes in CLAUDE.md, handoffs and the blank draft are
preserved and excluded from this commit.

Validation passed: typecheck; 44 focused cargo/native-render tests; deterministic
cargo asset check; production build; 54 real cargo browser assertions; 168 shared
world-assembly assertions. The production build emits its chunk-size advisory.
No full campaign route replay was needed for this presentation-only revision.
The repository CI gate runs on the main push before automatic Fly deployment.

The [visual review](../../../docs/playtest/2026-10-22-race-cargo-environment/README.md)
contains actual two-visitor captures: a readable nearby row, paired real camera
pans, Tab overview, ordinary A/B views, active/clear/overlap/expired states,
decoded and decoding strings, 1024 × 768, reduced motion and the retained
inspector. Screenshots were personally inspected. Smaller/cropped distant text
is intentional environmental detail; it never chases the viewport.

No remaining test or movement failure. Further human feedback should assess the
quiet environmental feel on the deployed game, not restore the rejected
dashboard's readability-at-every-zoom requirement. Delivery follows AGENTS.md:
commit and push to main, preserve concurrent work, monitor CI/Fly without
bypassing the gate.
