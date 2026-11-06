# BYPASS native integration — 6 November 2026

Linux Codex integrated the Windows package from base
`758ae8ef2ab8824b908ff77f3fac9c4a42660612`. The frozen four-input request and
canonical room hashes match the acquisition. Producer/consumer identities and
fixed excerpt coordinates are recorded in [the durable evidence document](../../chambers/bypass-native.md).

## Checks actually run

- `python3 -I -B experiments/coop-controller-studies/bypass-v1/scripts/verify_portable.py`:
  PASS, repeated after implementation with an identical read-only receipt.
  [Retained receipt](portable-verification.json): 16 exhaustive vectors, 50 captured
  Windows clean/BCF evaluations, 16 emulator traces, 64 output commits, seven genuine
  stores and seven rejected negative fixtures. No fresh Linux PE execution claimed.
- `pnpm check:native`: all lookup, world, RACE and environmental generation checks PASS.
  The actual current TS evaluator equals all 16 retained clean/BCF vectors;
  initial output is `[0,0,1,1]`, exitReady is always one.
- `pnpm typecheck`, `pnpm build`, scoped `git diff --check`: PASS.
- 178 focused tests across 13 files PASS: native adapter/package isolation,
  BYPASS state/store selection, renderer/provenance/inspector, load failure,
  disconnect/fresh-receipt gating, reduced motion, two arrivals, old saves,
  body-only occupancy, terminal persistence, checkpoint and crumble behavior.
- `node scripts/bypass-browser-check.ts`: PASS, normal 65 steps and swapped 59 steps,
  two independent visitors from authored starts with real controls and no gameplay
  injection. All scenario assertions remain intact. Intentional deaths: normal
  P1=4/P2=4; swapped P1=4/P2=2. Both physical arrivals complete both routes.
  [Results](results.json), [browser checks](browser-checks.txt).
- A single final `node scripts/campaign-browser-check.ts` regression PASS: all six
  chambers, 87 checks, both arrivals, six badges, disconnect/reconnect and
  SIGKILL/restart persistence. [Campaign checks](campaign-checks.txt).

The initial browser/inspector check detected absent `mapping_limits` metadata in
BYPASS's independent producer format. The consumer generator now supplies explicit
BYPASS presentation limits; acquisition bytes were not changed. Corrected inspector
and physical-route checks pass. Existing historical shape checks remain strict.

All 154 files listed in the original five chamber manifests were hash-checked.
Their generated public evidence assets and tables remain byte-identical; the common
manifest only gains BYPASS. All campaign JSON, the matching draft, movement code,
audio and native acquisition files are unchanged. `server/level-definitions.ts`
now selects the verified native evaluator; reference tests retain the frozen
acquisition copy instead of pretending that registration file has not changed.

## Reviewed normal-camera captures

No camera/editor overrides or player-position injection were used. Code remains
fixed in world coordinates and naturally crops at viewport edges. All three snippets
show 3–4 authentic instructions, selective store colour and one authored string.
The active-anchor capture catches the ordinary authored decoding animation.

- [Initial 1920×1080](bypass-initial-1920.png): inactive anchor/bridge, initially open exit status.
- [Initial 1024×768, reduced motion](bypass-initial-1024-reduced.png): fixed placement and no animated reveal/pulse.
- [Anchor held](bypass-anchor-held-p1.png): accepted one-store and modern body-scanner art.
- [Middle corridor](bypass-section-2-p1.png): active LINK bridge and one shared disabled-firewall section.
- [One arrival](bypass-exit-one-arrival-p1.png): no final scanners/assembly panel; completion still waits for P2.

Raw local reports: `.workbench/reports/bypass-native-integration/` and
`/tmp/bn-bypass-integration-campaign/`. These are local development artifacts;
tracked compact results and the five captures above are the durable record.
CI/deployment outcome and the exact integration commit are recorded in the dated
shared handoff after push. Human playtesting remains separate from scripted checks.
