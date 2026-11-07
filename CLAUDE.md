# Binary Ninja — COMP8020 / COMP4020

This repository is the final **Binary Ninja** project. `AGENTS.md` and `CLAUDE.md` are **identical mirrors** for different coding-agent harnesses. If either file changes, update the other in the same commit and verify `cmp -s AGENTS.md CLAUDE.md`. Do not add conflicting agent-specific requirements to only one file.

## Current product and scope

- **Solo tutorial:** PRESSURE, SWITCH, RELAY and CONTROL SPINE (internal ID `uplink`). Preserve CONTROL SPINE's validated five-input/seven-output contract.
- **Public co-op campaign (six chambers, in order):** HANDSHAKE, BYPASS, CROSSFEED VAULT, RACE CONDITION, DEADLOCK and USE AFTER FREE. These are hand-authored two-player puzzle-platforming chambers, running through the existing Node/WebSocket party infrastructure. Preserve two-player arrival, reconnect, save, badge and party behaviour.
- **Native-backed campaign:** All six released co-op chambers use verified Windows x64 OLLVM BCF controller results through lookup tables. The server does not execute the Windows PEs. HANDSHAKE uses the separately verified `handshake-v2` acquisition, and BYPASS uses its separately acquired four-input controller. Preserve historical binary specimens and their provenance; do not substitute authored logic or stale tables for current released native contracts.
- **Level Builder:** versioned JSON drafts, GUI/CLI editing, real-physics previews and temporary public test sessions. Drafts are not released campaign levels unless explicitly promoted and tested.
- Proposed **future** chambers and hazards (including WATCHDOG/moving hazards) are **not shipped features** until designed, physically tested, reviewed and deliberately integrated. BYPASS is already a released campaign chamber, not a proposal.
- Gameplay and learnability come first. Do not generate physical room layouts from CFGs or build puzzles around the convenience of an obfuscated binary. Avoid adding accounts, unrelated systems or features that were not requested.

## Paths and authoritative sources

- Work in the **current final-project checkout**. Use repository-relative paths in code and documentation; do not depend on a particular Linux or Windows home directory.
- Shared experiment/agent workspace: `Workspace/binary_binja_redesign/`; handoffs: `Workspace/binary_binja_redesign/handoffs/`. **Resolve and verify that this is the real shared, writable workspace on the current machine** before using it. `Workspace/` is Git-ignored: commits do not synchronise its files across machines. Do not create a misleading empty substitute directory if the shared mount is missing.
- Older references `Workspace/binary_ninja/comp4020-crit5-Ky787` and `Workspace/seeing_through_obfuscation` are **read-only** unless explicitly authorised. Reuse ideas/code by copying what is needed into this repository; never make the deployed game depend on those checkouts.
- Consult relevant current code, `docs/`, `docs/adr/`, `docs/chambers/`, `docs/level-authoring-for-agents.md`, `docs/level-workbench.md`, experiment READMEs and the latest pertinent handoffs before substantial work. Read `handoffs/decisions.md` if it exists, but prefer current source and durable documents over old notes or chat context.
- Durable design decisions, contracts, tests and validated evidence belong in their owning tracked documentation. A handoff is a coordination record, **not** authoritative binary or gameplay evidence.

## Gameplay, authority and evidence boundaries

- Keep these four layers distinct: (1) binary facts and provenance, (2) coordinate-free controller signals/native trace or lookup data, (3) authored level geometry and physical inputs, and (4) presentation/physics. Changes in one layer must not silently fabricate facts in another.
- Physical inputs (players, plates, cubes, toggles and terminals) feed the accepted controller state; accepted outputs power doors, code platforms, relays, lifts and feedback. The server owns authoritative shared puzzle/party state; client visuals do not decide it.
- Genuine native assembly, output stores, bogus-block claims and lookup data require retained validation/provenance. Never invent or alter binary facts to fit a level, call authored visual text native evidence, infer bogusness from non-execution, or treat a prototype crumble as a proven bogus block. Authored wires and visual NOT/logic gates are explanations of accepted signals, not evidence that corresponding physical gate instructions exist in a PE. Follow each chamber's actual documented evidence status.
- If a released native-backed chamber's controller inputs or outputs change, **freeze and validate the revised authored contract, acquire and verify a new binary specimen, then integrate the new lookup/evidence**. Do not silently change gameplay semantics while retaining evidence for an earlier controller. Preserve frozen historical specimens.
- Preserve the distinction between permanently solid/non-hookable static architecture, ghosted/non-solid inactive code, active grappleable code, and prototype versus proof-backed crumble. Preserve collision and jump/grapple/cube behaviour unless gameplay change is explicitly requested.
- Keep solo tutorial progression independent from co-op parties. Persist meaningful visitor/party progress on `/data`, not frame-by-frame physics. Public custom test sessions remain temporary and distinct from official campaign saves/badges.
- For new levels use `levels/drafts/`, the shared workbench JSON schema/validators and bounded real-input scenarios. Only publish to `levels/campaign/` after explicit acceptance and applicable full-room/co-op checks; do not claim generated binaries or experiments have been verified without performing those checks.

## Implementation, tests and deployment

1. Before changes, inspect `git status`, fetch/reconcile current `origin/main`, recent relevant commits, the existing implementations and the specific source-of-truth documents. Preserve other agents' changes; never force-push shared history.
2. Make small coherent changes. Reuse existing physics, rendering, machinery, audio, level-authoring, test and deployment infrastructure where possible. Do not change a validated puzzle/controller contract merely for a visual improvement.
3. Run **proportionate** validation: focused tests and `pnpm typecheck` for code changes; build and relevant real-browser/real-input checks when the changed subsystem warrants them. Test both co-op clients, persistence/reconnect, responsive viewports and authentic evidence whenever those areas are affected. Run the full relevant suite at releases or major milestones. Never weaken checks to conceal failures.
4. For art/UX work, inspect normal-game-camera captures (not just isolated assets), including powered/unpowered, paused/reduced-motion and small-screen states where applicable. Automated pixel checks do not replace human visual/playtest acceptance.
5. Unless requested otherwise, complete tested changes with a commit and push to `main`. Pushing intentionally triggers the existing CI-gated Fly.io deployment; do not bypass checks, overwrite unrelated work or request separate approval for the normal push.

## Mandatory cross-agent handoffs

**Every completed implementation/design/evidence task must produce a concise handoff**, including gameplay, levels, UI/art, audio, bug fixes, infrastructure and binary research. This applies even to a small but meaningful change. A pure question, read-only inspection or trivial editorial correction needs no handoff unless the user requests one.

- After implementation and validation (ideally after commit/push so the SHA is known), **write a real Markdown file** in the verified shared `Workspace/binary_binja_redesign/handoffs/` directory. Use a collision-resistant UTC filename such as `2026-10-28T101500Z-terrain-animation-codex.md`. Do not silently skip it or overwrite another agent's handoff.
- The handoff must state: **task and agent/harness; UTC date; starting/base and resulting commit SHA (or uncommitted status); what changed and why; key files and generated artifact locations; tests actually run and results; relevant binary/data provenance; limitations or user decisions outstanding; next steps for another agent**. Include links to tracked durable docs and concise screenshot/report paths where useful. Never invent tests, proof or human approval; do not put secrets or large generated files in handoffs.
- For cross-agent binary/frontend changes, explicitly describe the producer/consumer contract, bundle or schema version, expected inputs/outputs, provenance, checksums/paths and what the next agent must validate. Do not rely on a chat transcript to convey these details.
- **Verify the handoff file exists and is readable**, then give its exact path in the final response along with the commit and check results. Since `Workspace/` is ignored by Git, a repository push alone is **not** a handoff delivery.
- If work was delegated to subagents or split between binary/frontend agents, the **orchestrating agent owns final handoff delivery**; do not assume another agent recorded it.
- If the shared workspace is missing or unwritable, **report that explicitly** and include the handoff content in the final response for manual placement. Do not claim to have delivered it, fabricate a path or write into an unrelated directory as a substitute.
- Promote stable conclusions into tracked documentation. A later agent should be able to proceed from the checked-in code/docs and the actual shared handoff, without reconstructing decisions from old chats.
