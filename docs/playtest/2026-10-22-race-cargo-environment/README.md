# Fixed RACE cargo decoration — 22 October 2026

Production browser captures from two independent visitors using real controls. No camera override or controller/world-state injection was used. The nearby pair is a real floor walk; the overview uses Tab. Screenshots were personally inspected for actual Canvas text, fixed placement, clipping and machinery visibility.

These supersede the earlier dashboard gallery. Four blocks remain at world x=800/1152/1504/1856, y=960, each 328 × 124, with 12 world-unit text. Compare the row with the firewall and lower wires during the pan and zoom: the relative placement stays fixed. Small or partly offscreen text is intentional; there is no compact substitution.

| Screenshot | View / state | Viewport | Zoom | Accepted A/B/phase |
| --- | --- | --- | ---: | --- |
| [initial-nearby-1600](initial-nearby-1600.png) | Initial follow camera; first blocks naturally visible | 1600 × 900 | 1.048 | 0/0/idle |
| [nearby-pan-left-1600](nearby-pan-left-1600.png) | Nearby floor walk, left side of camera pan | 1600 × 900 | 1.051 | 0/0/idle |
| [nearby-pan-right-1600](nearby-pan-right-1600.png) | Nearby floor walk, right side; readable full row | 1600 × 900 | 1.051 | 0/0/idle |
| [nearby-overview-1600](nearby-overview-1600.png) | Tab overview from the same nearby position | 1600 × 900 | 0.384 | 0/0/idle |
| [window-drop-a-1600](window-drop-a-1600.png) | Ordinary DROP A; decoded BUFFER HOLDING | 1600 × 900 | 0.781 | 1/0/window |
| [released-clear-drop-b-1600](released-clear-drop-b-1600.png) | Ordinary DROP B reveal; release/clear strings decoding | 1600 × 900 | 0.868 | 0/1/released |
| [receiver-arrival-drop-b-1600](receiver-arrival-drop-b-1600.png) | Settled DROP B; decoded BUFFER RELEASED and SAFETY BEAM CLEAR | 1600 × 900 | 0.780 | 0/1/idle |
| [drop-b-small-1024](drop-b-small-1024.png) | Same DROP B state at smaller desktop size | 1024 × 768 | 0.520 | 0/1/idle |
| [drop-b-reduced-motion-1600](drop-b-reduced-motion-1600.png) | DROP B with reduced motion | 1600 × 900 | 0.775 | 0/1/idle |
| [expired-drop-a-1600](expired-drop-a-1600.png) | DROP A; accepted expiry with string decoding | 1600 × 900 | 0.780 | 1/0/expired |
| [overlap-drop-b-1600](overlap-drop-b-1600.png) | DROP B; overlap string decoding | 1600 × 900 | 0.875 | 1/1/released |
| [overlap-drop-a-1600](overlap-drop-a-1600.png) | DROP A; overlap remains active across reset | 1600 × 900 | 0.780 | 1/1/idle |
| [overlap-settled-drop-b-1600](overlap-settled-drop-b-1600.png) | DROP B; fully decoded INTERLOCK ACTIVE | 1600 × 900 | 0.813 | 1/1/idle |
| [Evidence inspector](inspector-buffer-1600.png) | Full genuine alternatives and provenance retained | 1600 × 1000 | — | Paused |

Transient captures intentionally show the authored hex reveal. Native instructions never decode or scramble. The nearby, active-window and settled DROP B captures show completed strings. The accepted phase can reset during overlap while both controls remain held; the interlock remains active.

The [structured receipt](cargo-browser-review.json) retains fixed block bounds, culling visibility, exact native fragments, selected stores, raw accepted values, target/revealed messages, colours, camera and measured Canvas font transforms. The concise per-mode checks and [completion logs](checks/) are retained alongside the images.

Validation: 44 focused cargo/native-render tests; typecheck; unchanged cargo asset checker (25,595 bytes); production build; 54 real cargo browser assertions; 168 shared world-assembly assertions. No full campaign replay was needed for this cosmetic revision. CI runs the repository gate before Fly deployment.

Detailed binary provenance remains in Evidence. The ordinary view is optional environmental flavour, with the level and machinery carrying the puzzle.
