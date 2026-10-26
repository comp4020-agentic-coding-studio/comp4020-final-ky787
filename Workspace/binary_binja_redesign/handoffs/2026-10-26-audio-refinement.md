# Targeted audio refinement — 2026-10-26 (Australia/Sydney)

Baseline fetched from current main: `9e3320736982389d47418db0aa19d5eacf3a6f0c`.
Human playtesting superseded the first agent's music preferences. This change
replaces only the first two co-op recordings and the completion/ordinary-toggle
samples, preserves solo tutorial music, and bounds completion ducking.

## Implemented selections

| Use | Source | Licence | Final treatment |
| --- | --- | --- | --- |
| HANDSHAKE | [Tower Defense Theme — DST](https://opengameart.org/content/tower-defense-theme) | CC0 1.0 | 147.692s central techno passage; −23.04 LUFS / −7.94 dBTP; 2,214,254 bytes. |
| CROSSFEED VAULT | [Jumping Cyborg — Alexander Ehlers](https://opengameart.org/content/t-t-free-cyberpunk-pack-2) | CC0 1.0 | 122.182s sustained later passage, excluding bass-light breakdown/fade; −23.06 LUFS / −10.14 dBTP; 1,912,829 bytes. |
| Ordinary lever | [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds), `toggle_001.ogg` | CC0 1.0 | Downpitched/filtered digital toggle; 0.197s; −10.213 dBFS decoded peak. |
| Completion | Same pack, `confirmation_002.ogg` | CC0 1.0 | One source tone cycle arranged into a simultaneous 220/330/495Hz chord, soft envelope and quiet accents; 1.55s; −8.027 dBFS peak. No NES melody. |

Source masters remain outside the bundle. Exact downloads, original SHA-256,
processing and output hashes are in `public/audio/{credits.json,music/catalogue.json}`.
CC0 has no mandatory attribution; author/source credits remain as provenance.
Seven candidates across five artists were downloaded, decoded and compared;
Kuia and New Factory are supplied as review-only alternatives.

The two music files retain the existing −23 LUFS target and gain 1. No louder
playback or added compressor substitutes for rhythm. Structural analysis found
low/high transient attacks in every complete eight-second window of both final
edits. This can count synth attacks as well as drums; it does not establish
subjective groove. Human listening remains the preference authority.

## Preservation and behavior

The existing `MusicPlayer` file, streaming/crossfade implementation, mute,
preferences, autoplay, visibility and reconnect behavior are byte-identical.
The other 19 effect files and their metadata are identical. Runtime cue gains
and lever/latch/terminal/breakpoint routing did not change; actual lever tests
confirm the sample replacement reaches ordinary switches without changing liked
latch/checkpoint cues. Controllers, physics, save state, networking and visuals
are untouched.

RELAY and CONTROL SPINE (`uplink`) now select `tutorial-relay.ogg`, an exact copy
of the former HANDSHAKE file. Its SHA-256 is
`06557728c1d6dfd813857807f1c6fd7fe6eedfbe0ff8b0bf6a91b5b444dd69ab`.
Its gain and quiet tutorial mix are unchanged. PRESSURE/SWITCH still select menu.

Completion has a 1.8s duck deadline covering the 1.55s stinger, followed by the
existing 450ms gain transition. Victory previously forced the completion duck
indefinitely; it now returns to the ordinary pause mix after that deadline.
Completion still fires once on accepted completion and does not replay on
reconnect. No new audio framework was introduced.

### Approved recordings: identical before and after

| File | SHA-256 |
| --- | --- |
| `menu.ogg` | `94271d7fac43f54c4240c354b7415ee26b94bcbe93346aed83108a3cca73679e` |
| `race-condition.ogg` | `028f5d98da1a3d1f3d396abd66ac94bca37194316e85b90895a228c59b1073c1` |
| `deadlock.ogg` | `f31f389b69d48b9bbb386ccd40f8cbbae6075034ff5a8a04bdffc35621dd4648` |
| `use-after-free.ogg` | `d6f35d5d59662380eaa5b6cb1a9cd594d519041b79bbf4165afa5b80ca07e3b9` |

Their full catalogue entries, scene mapping and runtime gains also match the
baseline. Both generation scripts default to the targeted replacements; music
generation refuses to rewrite approved recordings. Repeated builds reproduced
identical replacement hashes. Runtime music totals 14,764,691 bytes.

## Review and validation

Open `docs/playtest/2026-10-26-audio-refinement/index.html` locally, or follow its
README's localhost command. Six 24s level-matched music clips compare old/new
and one alternate per chamber; six 8s seam clips and two effects A/B pairs cover
boundaries and cues. The page is outside runtime loading. Desktop and narrow
screenshots, completion/lever screenshots, sources, analyses, exact preservation
proof and full changed-file list are in that folder.

- 47 focused unit tests passed: audio engine, mapping/asset integrity, real
  lever event paths, hero stages and music lifecycle.
- TypeScript passed; production build passed with the existing large-chunk
  advisory. Native UPLINK evidence and browser-module audit passed during build.
- 42 real game-browser checks passed: independent host/guest, physical HANDSHAKE
  solve, single completion over music, finite duck, new-track native looping,
  chamber transitions, pause, reconnect, mute/volumes, visibility/BFCache,
  actual SWITCH walk/E toggles, tutorial soundtrack and blocked-media isolation.
- 24 review-page checks passed: all 14 real gesture/playback buttons, source
  identity/duration, evidence links, no autoplay and 1440px/420px layouts.
- Source licencing, final loudness/true peak/silence/sample-boundary analysis and
  deterministic regeneration passed. All final music is stereo44.1kHz Vorbis.

One initial extended-browser run correctly stopped at CONTROL SPINE's overview;
the route was corrected to click its Start button, then all42 passed. The basic
preview HTTP server initially made Chromium estimate OGG duration; the review
now buffers each short clip on demand for exact seeking/duration. Game streaming
was unchanged. Synthetic lifecycle events and accelerated media seeks are
explicit in the test script; gameplay solves use real input.

The agent cannot hear this environment's audio and does not claim subjective
approval. Remaining tradeoffs are the selected tracks' musical fit, seam feel,
long-session fatigue and masking of spoken co-op communication. Listen at a
consistent volume, then play both first chambers with a partner. Existing
positive feedback for the other four scenes has been preserved exactly.

## Delivery

Commit and push this scoped change directly to main under AGENTS.md. Existing
GitHub checks and the CI-gated Fly deployment workflow are unchanged; deployment
runs only after their gate. The final delivery message records the commit and
observed CI/deployment status. Unrelated CLAUDE.md, draft level and three deleted
historical handoffs were left untouched and excluded from the commit.
