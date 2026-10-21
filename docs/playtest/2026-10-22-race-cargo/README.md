# RACE cargo panel — 22 October 2026

Production Chromium/Brave captures from `pnpm check:race-cargo-browser`. Two independent visitor identities use real movement and accepted server interactions. No world/controller state injection or camera override is used in this gallery. Semantic study fixtures are tested separately in `tests/race-cargo.test.ts`.

The images were personally inspected for Canvas text and geometry. Native instruction text is 11 CSS pixels in assembly mode, including normal cargo operator zoom around 0.78. The 1024 × 768 view deliberately uses a compact summary with the complete Evidence view accessible from the existing button. A nearby view uses two columns; operator views compare all four sections in one row.

| Screenshot | Operator / accepted state | Viewport | Camera zoom |
| --- | --- | --- | ---: |
| [initial-nearby-1600](initial-nearby-1600.png) | nearby follow; A=0, B=0, idle; T/B/S/R 1/1/1/0 | 1600 × 900 | 1.048 |
| [window-drop-a-1600](window-drop-a-1600.png) | dropA; A=1, B=0, window; T/B/S/R 0/1/1/0 | 1600 × 900 | 0.783 |
| [released-clear-drop-b-1600](released-clear-drop-b-1600.png) | dropB; A=0, B=1, released; T/B/S/R 1/0/0/0 | 1600 × 900 | 0.875 |
| [receiver-arrival-drop-b-1600](receiver-arrival-drop-b-1600.png) | dropB; A=0, B=1, idle; T/B/S/R 1/0/0/0 | 1600 × 900 | 0.780 |
| [drop-b-small-1024](drop-b-small-1024.png) | dropB; A=0, B=1, idle; T/B/S/R 1/0/0/0 | 1024 × 768 | 0.519 |
| [drop-b-reduced-motion-1600](drop-b-reduced-motion-1600.png) | dropB; A=0, B=1, idle; T/B/S/R 1/0/0/0 | 1600 × 900 | 0.775 |
| [expired-drop-a-1600](expired-drop-a-1600.png) | dropA; A=1, B=0, expired; T/B/S/R 0/0/1/0 | 1600 × 900 | 0.780 |
| [overlap-drop-b-1600](overlap-drop-b-1600.png) | dropB; A=1, B=1, released; T/B/S/R 0/0/0/1 | 1600 × 900 | 0.882 |
| [overlap-drop-a-1600](overlap-drop-a-1600.png) | dropA; A=1, B=1, idle; T/B/S/R 0/0/0/1 | 1600 × 900 | 0.781 |
| [Evidence alternatives and provenance](inspector-buffer-1600.png) | Paused BUFFER SUPPORT; genuine writes at RVA 14B6 and 144A, bytes, blocks, specimen/hash and study | 1600 × 1000 | Existing inspector |

The released/clear and overlap DROP B captures are taken during the existing camera reveal, before it has finished easing toward the chute. The later receiver-arrival B view shows its settled framing. The A overlap capture may already show the accepted reset to idle with both controls still held: the interlock remains active. These are separate accepted evaluations, not a continuous CPU trace. Expiry here occurs with A still held; the study tests also cover A released, exact-deadline ordering, late B and reset while B remains held.

The [structured review](cargo-browser-review.json) records accepted values, phase/status, selected fragment/store IDs, individual fragment instructions, bounds, camera, viewport and measured Canvas font transforms. `timely-checks.txt`, `expiry-checks.txt` and `overlap-checks.txt` record the actual input-driven assertions. The expiry flow includes a successful second real attempt and receiver delivery.

Completion logs are under [checks/](checks/). The full campaign regression completed all five chambers using real controls, including the RACE grapple chain, two arrivals, reconnects and server restart recovery. The separate world-assembly review checks exact PE-derived instruction identities and contiguity within each grouped fragment while retaining the existing flat-panel assertions.

Automated traversal and agent screenshot inspection are not two-person human acceptance. Remaining review: whether 11-pixel code is comfortable on the intended displays, the wide versus compact layout transition, and how well the feedback teaches timing during a first attempt. No merge, deployment or chamber expansion is included.
