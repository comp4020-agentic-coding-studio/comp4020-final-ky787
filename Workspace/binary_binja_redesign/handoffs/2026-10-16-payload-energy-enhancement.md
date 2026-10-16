# Energy payload presentation — 16 October 2026

Starting HEAD: `8eaa34f190c7c4861ea39d2e24c6b502e20fe193`.
Implementation: `b45babacfc7950b972fd07013f360caf3c0d1485` (main, pushed).
The prior compact receiver/alignment implementation `5f3e815` is preserved.

## Result and boundaries

Free/carried payloads pulse violet. A physically centred, accepted payload connects
through a 680 ms purple-to-green surge, then sustains green energy. Mirrored PCB
branches illuminate inward, pulse outward and retain subtle packet/node motion.
Cube labels and the exact 44-unit outline stay visible. Receivers remain 94 units
wide with the same short guides. Rendering uses bounded local radial gradients;
there is no shadowBlur, particle system or external graphics dependency.

`payload-energy.ts` supplies pure palette/phase values. The existing per-receiver
presentation clock supplies connection age; no animation state goes onto the
server or into saves. Repeated snapshots never restart it. Restored occupied
receivers are settled immediately and silent. Reduced motion is respected live,
with static distinct palettes; paused/editor views settle too.

When accepted occupancy precedes safe centring, receiver status/nodes report green
immediately while the unconnected cube stays purple. Clearing the bay starts the
connection animation without another sound. The existing docking guards are
unchanged. Pickup/pull/revocation ends green immediately. All cube-only classifiers,
pressure plates, audio, dimensions, ownership, physics, sensors, campaign JSON,
checkpoint logic, exit logic and retained binary evidence are unchanged.

## Verification and visual evidence

Reports: `.workbench/reports/2026-10-16-payload-energy/` (ignored).
Gallery: `docs/playtest/2026-10-16-payload-energy/index.html`, `gallery.png`.
Recording: `docs/playtest/2026-10-16-payload-energy/energy-cycle.webm` — 16.966 s,
normal-speed fixed crop of the actual game canvas; no synthetic animation.
The previous cyan gallery remains intact and appears beside the revision.

- `pnpm typecheck`: passed.
- Focused energy/presentation/docking/shared cube/socket/hero tests: 58 passed.
- Complete unit suite: 595 passed, two conditional skips.
- HTTP smoke spec against a running production build: three passed. Initial
  `pnpm check` reached the HTTP spec without a server; its unit/typecheck phases
  passed, and the HTTP phase passed after starting the required server.
- `pnpm build`: passed, including retained UPLINK bundle validation.
- `pnpm check:receivers public editor`: 26 passed. Real movement, actual pixel
  samples over complete free/carried/green cycles, one confirmation per accepted
  delivery, live removal, independent receivers, silent reconnect, live OS reduced
  motion and editor preview. Pixel hashes remain static with reduced motion.
- `pnpm check:receivers campaign`: seven passed. DEADLOCK's authored-start solve,
  physical FEED-to-relay/hatch manoeuvre, three live green receivers, both arrivals.
- `node scripts/receiver-local-check.ts`: 12 physical steps, two developer clients,
  matching accepted contact, canonical bodies, player exclusion and removal.
- `node scripts/receiver-performance-check.ts`: maximum eight cubes / 48 receivers;
  180 frames, median 16.7 ms, p95 16.8 ms in local headless Chromium. This measures
  frame intervals in this environment, not a universal hardware guarantee.
- `node scripts/receiver-gallery.ts`: screenshot links, video metadata and opt-in
  playback checked. Full heartbeat and transition frame sequences inspected.
- `pnpm check:campaign`: 78 passed, all five chambers and persistent party restarts.
  The first run missed USE AFTER FREE's scripted refugeC landing; an isolated
  repeat passed without changing scenarios, layouts or physics. Both reports
  retained (`campaign-first-attempt/`, `campaign/`).
- `pnpm check:evidence`: passed. Protected research/evidence files untouched.

## Deployment

CI/container build, complete checks, evidence/secret scans and Fly deployment
passed: https://github.com/comp4020-agentic-coding-studio/comp4020-final-ky787/actions/runs/38872352856

Live site: https://comp4020-final-ky787.fly.dev/
Nine production-browser checks passed: public builder import/shared receiver
rendering, actual violet frame strokes, two independent campaign visitors, three
accepted centred payloads with electric-green frame/circuit strokes, full physical
DEADLOCK solution and both arrivals with zero deaths. All cargo remained detected.
`live/report.json` and `live/deadlock-report.json` retain results. This handoff is
a documentation-only follow-up to the deployed implementation commit above.

## Human review / limitations

Review the recording and gallery, then carry/drop/pull a payload in the public
builder or DEADLOCK. Check purple/green contrast, A/B/C readability, subtle idle
motion, reduced motion, compact viewport and independent three-receiver operation.
Detailed traces are intentionally subtle at overview scale; outline, status and
colour carry meaning there. Local phases are intentionally not frame synchronized
between clients. Automated review is not human two-player/art acceptance.

Unrelated pre-existing edits to `CLAUDE.md` and `levels/drafts/blank-room.json` were
preserved and excluded from commits. Stop here; no other machinery redesign.
