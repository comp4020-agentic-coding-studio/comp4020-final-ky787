# Binary Ninja audio credits

## Sound effects — updated 2026-10-26

All 21 shipped effect files use **CC0 1.0**. Thirteen of the original 14 files
remain byte-for-byte; landing now uses the human-approved Kenney Impact Sounds
sample. Seven effects were added earlier on 2026-10-26. The retired generic
`confirm.ogg` remains credited and shipped, but
is not loaded: 20 distinct effect buffers now decode at runtime.

The effect files total 274,111 bytes; active effects total 250,646 bytes.
Runtime paths are under `public/audio/`;
no runtime download from a third-party site or the research share is needed.

| Runtime file | Original / author | Source and processing |
| --- | --- | --- |
| `grapple-fire.ogg`, `grapple-attach.ogg` | `laserSmall_002.ogg`, `laserSmall_003.ogg` / Kenney | [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds). Reused byte-for-byte from Crit 5's normalised Vorbis effects. Fire also supplies quieter pitched jump/rope-jump cues. |
| `grapple-reel.ogg` | `computerNoise_002.ogg` / Kenney | Same pack; Crit 5's high-pass filtered reel loop, unchanged. |
| `crumble-start.ogg` | `computerNoise_003.ogg` / Kenney | Same pack; Crit 5's 0.78-second filtered/tremolo corruption warning, unchanged. |
| `crumble-break.ogg` | `explosionCrunch_000.ogg` + `forceField_004.ogg` / Kenney | Same pack; Crit 5's normalised mix, unchanged. Also reused at a lower playback rate for death. |
| `firewall-open.ogg` | `forceField_001.ogg` / Kenney | Same pack; Crit 5's normalised cue, unchanged. Retained for firewall contact; ordinary activation now uses `code-power.ogg`. |
| `landing.ogg` | `Audio/impactSoft_medium_000.ogg` / Kenney | [Impact Sounds](https://kenney.nl/assets/impact-sounds). Human-selected sample, mono 44.1 kHz, 35 Hz high-pass / 14 kHz low-pass, 1 ms attack / 15 ms ending fades, constant gain to −6 dBFS peak, Vorbis q4; no compression. Duration 0.115 s. |
| `confirm.ogg` | `beep_message.ogg` / yd | [Platformer Sounds](https://opengameart.org/content/platformer-sounds-terminal-interaction-door-shots-bang-and-footsteps). Crit 5's repaired/trimmed Vorbis file, unchanged; retained only for provenance and historical review. |
| `teleport.ogg` | `teleport_02.ogg` / rubberduck | [50 CC0 Sci-Fi SFX](https://opengameart.org/content/50-cc0-sci-fi-sfx). New download, downmixed to mono, short edge fades, peak level set to −6 dB, Vorbis q4. |
| `lift-on.ogg`, `relay-on.ogg` | `forceField_000.ogg`, `forceField_003.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. Lower runtime rates distinguish powering off. |
| `lift-hum.ogg` | `spaceEngineLow_003.ogg` / Kenney | New download from Sci-Fi Sounds. 1,800 Hz low-pass, short edge fades, −6 dB peak, mono Vorbis q4. Quiet distance-mixed loop. |
| `door-open.ogg` | `doorOpen_000.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. |
| `metal-touch.ogg` | `impactMetal_002.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. Rate/gain variants for plates and cube pickup/drop. |
| `switch-click.ogg` | `Audio/toggle_001.ogg` / Kenney | [Interface Sounds](https://kenney.nl/assets/interface-sounds). Electronic toggle slowed to 65%, 100 Hz high-pass, two 1.4 kHz low-pass stages and edge fades. Duration 0.197 s, −10 dBFS target peak. Replaces the previous mechanical switch sample. |
| `latch-confirm.ogg` | `Audio/maximize_006.ogg` / Kenney | Interface Sounds. Low rising pulse; 70 Hz high-pass / 1.8 kHz low-pass, edge fades, −8 dBFS target peak. |
| `checkpoint.ogg` | `Audio/confirmation_001.ogg` / Kenney | Interface Sounds. Short two-tone cue; 70 Hz high-pass / 1.8 kHz low-pass, edge fades, −8 dBFS target peak. |
| `breakpoint-deploy.ogg` | `Audio/doorOpen_002.ogg` / Kenney | [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds). Slowed to 82%, 60 Hz high-pass / 1.8 kHz low-pass, edge fades, −8 dBFS target peak. Deployment lasts about 0.65 seconds, before the existing flag-confirmation moment. |
| `breakpoint-confirm.ogg` | `Audio/confirmation_004.ogg` / Kenney | Interface Sounds. Slowed to 85%, 70 Hz high-pass / 2.2 kHz low-pass, edge fades, −8 dBFS target peak. The existing 1.2-second flag timing emits it once. |
| `room-complete.ogg` | `Audio/confirmation_002.ogg` / Kenney; Binary Ninja arrangement | Interface Sounds. One stable source-tone cycle is resampled into a simultaneous 220/330/495 Hz chord (root, fifth, ninth; no major third), with a 55 ms attack, 650 ms release and two quiet 75 ms digital accents. Mild saturation, 70 Hz high-pass / 1.5 kHz low-pass, −8 dBFS target peak. Duration 1.55 s; replaces the previous NES jingle. |
| `code-power.ogg` | `Audio/forceField_001.ogg` / Kenney | Sci-Fi Sounds. Trimmed to 0.8 seconds, 55 Hz high-pass / 2 kHz low-pass, edge fades, −9 dBFS target peak. A quiet activation bed separate from firewall contact. |

Full per-file source URLs, exact FFmpeg filter chains, original/new-file hashes
and output hashes are retained in [public/audio/credits.json](public/audio/credits.json).
The original Kenney pack licences are retained in `public/audio/Kenney-License.txt`,
`public/audio/Kenney-Interface-License.txt`, `public/audio/Kenney-Impact-License.txt`,
and `public/audio/Kenney-Music-Jingles-License.txt`.
The licence dedication is [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

The four original Kenney asset pages and embedded pack licences were verified
on 2026-10-26. The credits JSON records official download URLs, archive hashes,
individual original hashes, exact FFmpeg filter chains, output hashes and
decoded levels/durations. Run `python3 scripts/audio/build-sfx.py` to reproduce
only the approved landing from the pinned Impact Sounds archive.
`--effects <filename>...` selects specific managed effects; `--all` explicitly
rebuilds all eight managed files. **Completion remains unchanged in this pass,
pending human selection.** The Music
Jingles archive and licence remain as provenance for the earlier completion
sample preserved in the dated A/B review; it has no current runtime use.

The former generic confirmation has a dominant frequency near 3.14 kHz and
99.955% of its measured spectral energy above 1.8 kHz. The new switch, latch,
checkpoint and breakpoint-confirmation files measure 0–2.621% above that threshold.
The refined completion measures 0.000105% above 1.8 kHz, with a decoded peak of
−8.027 dBFS and RMS of −18.757 dBFS. These are signal measurements, not subjective
listening judgments. The seven added samples retain headroom; their decoded peaks
range from −10.213 to −7.934 dBFS before runtime gains and the effects-volume control.

Switch, latch, checkpoint, deployment, flag confirmation and completion have
separate samples. One observed state update emits each cue at most once and
chooses one machinery activation (door, relay, lift, then code) when several
outputs change together. The engine permits at most two concurrent machinery
voices, reduces lift/relay activation gains, and gives completion its own chord
above earlier effects. Its 1.55-second tail is covered by a finite 1.8-second
music-duck hold; normal view-dependent music levels return afterward, including
while a co-op victory screen remains open. Grapple, cube and pressure-plate samples and gains remain
unchanged. Hero timing still follows authored presentation state, including one
deployment and one confirmation per newly activated breakpoint.

Lever-shaped toggles and lift latches now share the existing digital `switch`
cue once per accepted interaction. Upper lift levers retain latch confirmation
at 30% of its previous level; an accompanying checkpoint is suppressed as before.
Ordinary lever checkpoints retain a quiet 40% confirmation. Actual rectangular
terminals keep their existing latch cue; breakpoint stations keep their staged
deployment/confirmation. Controller events and acceptance rules are unchanged.

Landing retains its existing `min(1, landingSpeed / 700)` attenuation and 0.12 s
cooldown. The new sample's first-50-ms RMS is −16.238 dBFS; runtime gain 0.81
(previously 0.40) makes that onset **3.02 dB stronger** than the previous sample
at the same fall speed. This is a loudness proxy, not a claim of agent listening.
Full-speed/full-Effects peak remains below −7.8 dBFS (about −11.6 dBFS at default
65% Effects). Repeated observations cannot replay a footfall. Landing directly
on a newly pressed local plate uses the unchanged plate impact without layering
another landing; unrelated remote/cube plate activity does not suppress it.

The [focused toggle/completion A/B review](docs/playtest/2026-10-26-audio-refinement/sfx-ab.html)
compares the previous mechanical toggle and NES jingle with their replacements
at the same runtime gains and default 65% Effects level. Its
[manifest](docs/playtest/2026-10-26-audio-refinement/sfx-ab.json) retains both versions'
source records, measurements, hashes, and proof that the other 19 effect files are
unchanged. The [earlier SFX review](docs/playtest/2026-10-26-audio/sfx-review.html)
is historical: it contains the previous toggle and jingle alongside the still-current
deployment/confirmation pair and grapple/cube/plate references. Its original
Ogg, timestamp manifest and [measurements](docs/playtest/2026-10-26-audio/sfx-measurements.json)
remain unchanged. `python3 scripts/audio/review-sfx.py` creates a separate current-cue
montage in the refinement folder. The agent cannot hear tool playback, so a
perceptual audition is not claimed.

The original project and research share were read-only. The small named cue,
cooldown, voice-limit and loop-mixing design adapts the original project's
`src/audio/audio-manager.ts`; buffer playback and this chamber's event adapter
are new. Sounds are authored game feedback, not retained OLLVM execution evidence.

## Music — refined after human playtest, 2026-10-26

All seven runtime soundtrack files use **CC0 1.0**, verified on their original
OpenGameArt pages. They total **14,250,748 bytes** and retain the existing
approximately −23 LUFS mastering target and runtime gains.

| Scene | Track / author | Original source |
| --- | --- | --- |
| Main menu; PRESSURE and SWITCH | Claimed by the Void — vitalezzz | [Original submission](https://opengameart.org/content/claimed-by-the-void) |
| HANDSHAKE | Kuia — James Gargette (cinameng) | [Original submission](https://opengameart.org/content/kuia) |
| CROSSFEED VAULT | Through the Sewers — Alexander Ehlers (tricksntraps) | [Original submission](https://opengameart.org/content/t-t-free-cyberpunk-pack-2) |
| RACE CONDITION | Hyperton — Sudocolon | [Original submission](https://opengameart.org/content/hyperton) |
| DEADLOCK | Algate — James Gargette (cinameng) | [Original submission](https://opengameart.org/content/algate) |
| USE AFTER FREE | Neural Malfunction — vitalezzz | [Original submission](https://opengameart.org/content/neural-malfunction) |
| Solo RELAY and CONTROL SPINE (`uplink`) | Celestial Harmony — vitalezzz | [Original submission](https://opengameart.org/content/celestial-harmony) |

The four human-approved recordings (menu, RACE, DEADLOCK and USE AFTER FREE)
remain byte-for-byte identical, with unchanged mastering, scene assignments and
gains. `tutorial-relay.ogg` is an exact copy of the previous HANDSHAKE file,
so changing the first co-op chamber does not change either later solo tutorial.
PRESSURE/SWITCH still use the menu theme. The existing quieter tutorial mix is
unchanged. No WATCHDOG level or copyrighted television soundtrack is included.

Human listening tests explicitly selected these recordings. HANDSHAKE uses the
**complete 47.177-second original Kuia loop**, not the old 24-second comparison.
CROSSFEED uses a 196.364-second loop from the exact original
`through_the_sewers_1766bpm.ogg`; the filename does not establish tempo. An
eight-second cyclic blend joins similar rhythmic envelopes, excluding the sparse
opening and faded ending. Final levels are **−23.04 LUFS / −6.48 dBTP** and
**−23.07 LUFS / −11.44 dBTP** respectively. Constant gain preserves dynamics;
no time stretching, new notes or compression were introduced.

The [music catalogue](public/audio/music/catalogue.json) records original URLs,
source/output hashes, author, licence, exact edits, durations, encoded sizes and
measured loudness. [Selection notes](docs/audio-selection.md) compare additional
CC0 candidates and document source verification and structural evidence.
CC0 permits redistribution and adaptation without mandatory attribution;
artist credits are retained as provenance and courtesy.

The [current listening page](docs/playtest/2026-10-26-approved-audio/index.html)
plays the complete runtime loops and separate seam excerpts. The
[previous A/B page](docs/playtest/2026-10-26-audio-refinement/index.html) is a
historical comparison containing Tower Defense Theme, Jumping Cyborg and the
24-second Kuia alternative; it is not the runtime soundtrack. Review-only
excerpts are outside the runtime bundle. The retired CROSSFEED
source, [Stop For A Moment](https://opengameart.org/content/stop-for-a-moment) by
vitalezzz, remains credited in the review provenance; the original full master
stays outside the bundle. The [earlier montage](docs/playtest/2026-10-26-audio/music-review.ogg)
is a historical record of the first selection.

[prepare-music.py](scripts/prepare-music.py) now rebuilds only the two replacements
and their seam excerpts from pinned originals; it verifies and refuses to
rewrite approved tracks or the preserved tutorial recording. Source masters
remain in the external cache. Audio playback, licence verification and signal
analysis were checked programmatically. The selections come from the user's
listening tests; the agent cannot hear this environment's audio and does not
claim a subjective audition. The final loop edits and landing mix remain
available for human listening in the review page and live game.
