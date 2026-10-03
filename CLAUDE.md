# COMP8020 Final Project — Binary Ninja Redesign

This repository contains the final COMP8020/COMP4020 project.

## Important paths

Current redesign/evidence workspace:

`Workspace/binary_binja_redesign`

Previous Binary Ninja game/frontend, read-only reference:

`Workspace/binary_ninja/comp4020-crit5-Ky787`

Windows equivalent:

`E:\Workspace\binary_ninja\comp4020-crit5-Ky787`

Previous obfuscation research, read-only reference:

`Workspace/seeing_through_obfuscation`

Do not modify either previous project unless explicitly instructed.

## Before substantial work

Read the relevant files under:

- `Workspace/binary_binja_redesign/docs/`
- `Workspace/binary_binja_redesign/game_data/README.md`
- the relevant experiment `README.md`
- `Workspace/binary_binja_redesign/handoffs/decisions.md`

Do not rely on old chat context when the repository contains an authoritative answer.

## Project boundaries

The new game uses real validated binary experiments but hand-authored physical levels.

Keep these separate:

- binary facts and experiment evidence;
- coordinate-free gameplay stages/traces;
- hand-authored room geometry;
- frontend presentation and physics.

Never invent or alter binary facts to make the frontend easier.

Do not infer that an unexecuted block is bogus. Use only retained analysis/proof evidence.

## Previous Binary Ninja reuse

Inspect the previous frontend before replacing working systems.

Prefer reusing/adapting its successful:

- player movement;
- jumping and collision;
- camera behaviour;
- platform physics;
- useful debug tooling;
- grapple implementation where appropriate.

Do not reuse its automatically generated physical CFG layout. New rooms are deliberately hand-crafted.

Copy required runtime code/assets into this final repository rather than making the deployed game depend on the old repository.

## Shared agent workflow

Codex produces and validates binary experiments and browser-facing evidence bundles.

Claude primarily implements the hand-authored frontend/gameplay against those bundles.

Temporary Codex ↔ Claude notes belong in:

`Workspace/binary_binja_redesign/handoffs/`

Handoffs are not authoritative evidence. Promote durable conclusions into their owning gameplay, architecture, data-contract or experiment documentation.

## Development

Prefer small coherent changes over unnecessary rewrites.

After substantial changes:

- run relevant tests;
- run type/lint checks where available;
- run the production build;
- preserve useful developer/debug views.

Do not weaken checks to hide failures.

When real experiment data creates awkward gameplay, report the awkwardness rather than silently fabricating cleaner data.
