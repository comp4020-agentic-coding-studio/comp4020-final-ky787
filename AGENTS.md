# Binary Ninja — COMP8020 / COMP4020

- Gameplay comes first: hand-authored cooperative platform puzzles, never
  physical layouts generated from CFGs. C8 is four rooms (three tutorials plus UPLINK) for one player;
  keep it independent of PAIRING BAY co-op sessions on the existing Node server.
  No accounts or new binaries in this multiplayer infrastructure pass.
- Keep `Workspace/binary_ninja/comp4020-crit5-Ky787` and
  `Workspace/seeing_through_obfuscation` read-only. Preserve research artifacts
  in `Workspace/binary_binja_redesign`; dated notes belong in its `handoffs/`.
- Inspect before replacing. Reuse movement, collision, camera, cube, grapple,
  effects and relevant tests. Make small coherent architectural changes.
- Separate binary evidence, coordinate-free controller signals, hand-authored
  geometry and presentation/physics. Physical inputs drive a replaceable
  controller adapter; its outputs drive machinery.
- CONTROL SPINE is the fourth room, still ID `uplink`: preserve its validated
  five-input/seven-output contract. Several physical objects may share one
  retained output/region; never present them as separate native blocks.
- Tutorial controllers and all string effects remain authored/mock; UPLINK uses
  retained validated OLLVM evidence. Prototype crumble is not obfuscator evidence. Never invent binary facts or infer bogusness from
  non-execution. Final binary-backed crumble requires retained proof.
- Distinguish always-solid architecture, ghosted/non-solid inactive code,
  illuminated/solid active code and prototype crumble. Enabled floating code
  slabs accept hooks across their address bars; static architecture stays
  unhookable. Cap range and swing energy. Cube hooks pull cubes.
- Persist meaningful progress (rooms, checkpoints, mechanics, bounded events),
  not physics, on `/data`. Separate visitor progress from room state for later
  shared state. Returning visitors must visibly continue their progress.
- Use proportionate validation. Do not run the full suite after every edit. For small/local changes, run the narrowest relevant tests plus typecheck where appropriate. Documentation-only, Git-only and push-only tasks require no gameplay test suite. Run browser routes, multiplayer end-to-end tests, persistence restart tests and full builds only when the affected subsystem or task warrants them. Before major milestones/releases, run the complete relevant suite. Never weaken tests to hide failures.
- Put durable design/contracts in project documentation; handoffs are not
  authoritative evidence. Stop for manual playtesting before expanding the
  accepted puzzle or its validated binary contract.
