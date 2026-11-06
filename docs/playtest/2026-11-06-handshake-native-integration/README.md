# HANDSHAKE firewall v2 native integration — 6 November 2026

Linux Codex, starting at `1b9aa192fa26017ca67c46e21a79d2a18c55a25d`.
The [released contract](../../chambers/handshake.md) now consumes the separate
verified v2 package; original evidence remains historical and byte-unchanged.
The final integration commit and observed CI status are recorded after push in
the UTC-dated shared handoff, avoiding a self-referential source SHA here.

## Validation

- Portable read-only verifier: PASS before and after integration; 32 exhaustive
  vectors, 64 retained Windows native evaluations, 32 retained emulator traces,
  160 output commits, 10 stores and 20 authentic fragments; eight corruption
  fixtures rejected. These are retained acquisition checks, not new Linux PE
  executions. [Verifier output](portable-verification.json).
- Actual current TS evaluator and generated lookup match all 32 cases. Initial
  `[0,0,0,1,0]`; maintenance-only leaves exit locked, payload-only enables exit
  independently. Four world panels select genuine zero/one stores; the inspector
  identifies v2 and rejects cached v1 identities.
- `pnpm check:native`, `pnpm typecheck`, `pnpm build`: PASS.
- Focused integration suite: 170 tests PASS. Full release `pnpm test:unit`:
  1,014 PASS, two existing skips. Persistence/reconnect, payload authority, first
  versus second arrival, rendering loading failure/disconnect/reduced-motion and
  isolated physical bypass/recovery fixtures are included.
- `pnpm check:maintenance`: PASS, full 68-step two-visitor physical solve from
  authored spawns, actual keyboard/mouse/E inputs and preserved assertions. Each
  player has one deliberate death/reset; maintenance stays committed through
  recovery. Both arrivals required. No output/player-position injection.
  [Route summary](handshake-route.json), [browser checks](browser-checks.txt).
- Browser maintenance review includes 1024×768 and 800×600, reduced motion,
  repeat-E idempotence and both clients' accepted native firewall/exit states.
  `pnpm check:native-evidence`: nine checks PASS, authentic hash/store/clone
  inspector content and successful return to gameplay.
- HTTP release spec: three tests PASS against the isolated built server at
  port 18081. The first invocation had no server at default port 8080 and timed
  out; it was rerun with explicit APP_URL. `pnpm check:evidence`: PASS.
- 387 tracked acquisition/other evidence/table files compared byte-for-byte
  with the starting commit; all unchanged. Other manifest entries unchanged.
  Producer and consumer hashes: [artifact-hashes.json](artifact-hashes.json).

`pnpm check:campaign`: PASS, one complete run of HANDSHAKE → BYPASS → CROSSFEED
VAULT → RACE CONDITION → DEADLOCK → USE AFTER FREE. Both players physically
arrive, all six badges persist, victory survives server restart, disconnect
handling remains correct, and playing restart retains chamber/code/progress.
No browser runtime errors. [Campaign checks](campaign-checks.txt).

## Normal gameplay captures

Exactly three 1600×900 normal-camera captures from the physical solve:

| Capture | Accepted state shown |
| --- | --- |
| [Firewall active](firewall-active.png) | maintenance=false; firewallActive=true; exit locked |
| [Maintenance committed](maintenance-firewall-disabled.png) | maintenance=true; firewallActive=false; no payload; exit locked |
| [Payload delivered](payload-delivered.png) | cargo in receiver; firewallActive=false; exit open with 0/2 arrivals |

Inspected visually: authentic snippets clear the beam/receiver, relay text fits
its narrowed background area, and maintenance and payload states remain legible.
No assembly is borrowed from the old specimen. No room geometry changed beyond
the approved frozen v2 draft; only the relay/firewall environmental placements
and duplicate presentation caption were adjusted during integration.

## Limits

The existing unladen-avatar squeeze below the far gallery edge remains. Cargo
cannot follow in the retained bounded tests; the approved 26-unit beam rejects
the tested far-side pickup shortcut. This is not a proof against every possible
shortcut, a new-player timing measurement, or human acceptance. Native lookup
verification certifies decisions and retained evidence; game authority, physics
and recovery are checked separately by the tests/routes above.
