# Validated UPLINK playback — 2026-10-05

Production build served by the real Node HTTP/save server. Headless Chromium,
1600×900; compact menu also checked at 960×640. Keyboard and mouse controls only;
no world/controller overrides or external teleportation. The optional clone was
visited after the accepted route had completed, proving it is not required.

- Portable Windows verifier: PASS, read-only; no PE execution/build.
- Typecheck: PASS. Unit tests: 145 passed, 2 existing conditional skips.
- Production build including pinned artifact validation: PASS.
- Running-server HTTP invariants: 2 passed.
- Browser: 56 assertions passed; UPLINK zero deaths, no console errors.
- Far / upper-with-B / final Node C reloads restore validated states 3 / 14 / 26.
- Real process-restart tests reconstruct validated outputs from saved room state.
- [Full browser result](uplink-binary-browser.txt).

Useful captures:

- [Room overview](uplink-binary-overview.png): authored geometry and mapped assembly.
- [Relay cargo](uplink-binary-relay-cargo.png): real assembly separated from authored string effects.
- [Lift ride](uplink-binary-lift-rider.png): accepted physics unchanged.
- [Upper payload](uplink-binary-payload.png): retained final output frame.
- [Assembly inspector](uplink-binary-assembly-inspector.png): full raw region and PE identity.
- [Clone inspector](uplink-binary-bogus-inspector.png): native instructions, guard/proof identity and assumptions.
- [Optional clone contact](uplink-binary-bogus-contact.png): six actual instructions; classification hidden in ordinary play.
- [Continue](uplink-binary-continue-uplink.png): meaningful progress restored.

Review: initially the relay plaque crowded the lever; shortening normal excerpts
to at most five instructions and moving the plaque cleared the control. The clone
still shows all six instructions. Overview text is dense; the paused inspector is
easier to read. Exported service/payload regions overlap and retain that fact.
The accepted final route's slight rise through the active lift remains unchanged.
Vite warns about the ~930 KB game chunk (101 KB gzip), which includes the retained
trace/assembly bundle. No deployment was performed. Human feel testing remains due.
