# Binary Ninja — COMP8020 / COMP4020

- Gameplay comes first: hand-authored cooperative platform puzzles, never
  physical layouts generated from CFGs. C8 is three rooms for one player;
  no networking, accounts or new binaries.
- Keep `Workspace/binary_ninja/comp4020-crit5-Ky787` and
  `Workspace/seeing_through_obfuscation` read-only. Preserve research artifacts
  in `Workspace/binary_binja_redesign`; dated notes belong in its `handoffs/`.
- Inspect before replacing. Reuse movement, collision, camera, cube, grapple,
  effects and relevant tests. Make small coherent architectural changes.
- Separate binary evidence, coordinate-free controller signals, hand-authored
  geometry and presentation/physics. Physical inputs drive a replaceable
  controller adapter; its outputs drive machinery.
- C8 mock controllers, strings and crumble examples are gameplay prototypes,
  never obfuscator evidence. Never invent binary facts or infer bogusness from
  non-execution. Final binary-backed crumble requires retained proof.
- Distinguish always-solid architecture, ghosted/non-solid inactive code,
  illuminated/solid active code and prototype crumble. Grapple only marked,
  enabled anchors; cap range and swing energy. Cube hooks pull cubes.
- Persist meaningful progress (rooms, checkpoints, mechanics, bounded events),
  not physics, on `/data`. Separate visitor progress from room state for later
  shared state. Returning visitors must visibly continue their progress.
- Run `pnpm typecheck`, `pnpm test:unit`, `pnpm build`, browser checks and HTTP
  spec tests against a running app. Verify persistence across process restart.
  Docker is only needed for image validation. Never weaken tests to hide failure.
- Put durable design/contracts in project documentation; handoffs are not
  authoritative evidence. Stop after C8 for manual playtesting before binding
  a real binary to this design.
