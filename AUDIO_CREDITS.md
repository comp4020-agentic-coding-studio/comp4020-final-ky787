# Binary Ninja audio credits

## Sound effects — updated 2026-10-26

All 21 shipped effect files use **CC0 1.0**. The original 14 files are preserved
byte-for-byte; seven effects were added from the original Kenney archives on
2026-10-26. The retired generic `confirm.ogg` remains credited and shipped, but
is not loaded: 20 distinct effect buffers now decode at runtime.

The effect files total 280,331 bytes; active effects total 256,866 bytes.
Runtime paths are under `public/audio/`;
no runtime download from a third-party site or the research share is needed.

| Runtime file | Original / author | Source and processing |
| --- | --- | --- |
| `grapple-fire.ogg`, `grapple-attach.ogg` | `laserSmall_002.ogg`, `laserSmall_003.ogg` / Kenney | [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds). Reused byte-for-byte from Crit 5's normalised Vorbis effects. Fire also supplies quieter pitched jump/rope-jump cues. |
| `grapple-reel.ogg` | `computerNoise_002.ogg` / Kenney | Same pack; Crit 5's high-pass filtered reel loop, unchanged. |
| `crumble-start.ogg` | `computerNoise_003.ogg` / Kenney | Same pack; Crit 5's 0.78-second filtered/tremolo corruption warning, unchanged. |
| `crumble-break.ogg` | `explosionCrunch_000.ogg` + `forceField_004.ogg` / Kenney | Same pack; Crit 5's normalised mix, unchanged. Also reused at a lower playback rate for death. |
| `firewall-open.ogg` | `forceField_001.ogg` / Kenney | Same pack; Crit 5's normalised cue, unchanged. Retained for firewall contact; ordinary activation now uses `code-power.ogg`. |
| `landing.ogg`, `confirm.ogg` | `landing.ogg`, `beep_message.ogg` / yd | [Platformer Sounds](https://opengameart.org/content/platformer-sounds-terminal-interaction-door-shots-bang-and-footsteps). Crit 5's repaired/trimmed Vorbis files, unchanged. Landing remains active; the generic confirmation is retained only for provenance and before/after review. |
| `teleport.ogg` | `teleport_02.ogg` / rubberduck | [50 CC0 Sci-Fi SFX](https://opengameart.org/content/50-cc0-sci-fi-sfx). New download, downmixed to mono, short edge fades, peak level set to −6 dB, Vorbis q4. |
| `lift-on.ogg`, `relay-on.ogg` | `forceField_000.ogg`, `forceField_003.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. Lower runtime rates distinguish powering off. |
| `lift-hum.ogg` | `spaceEngineLow_003.ogg` / Kenney | New download from Sci-Fi Sounds. 1,800 Hz low-pass, short edge fades, −6 dB peak, mono Vorbis q4. Quiet distance-mixed loop. |
| `door-open.ogg` | `doorOpen_000.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. |
| `metal-touch.ogg` | `impactMetal_002.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. Rate/gain variants for plates and cube pickup/drop. |
| `switch-click.ogg` | `Audio/switch_002.ogg` / Kenney | [Interface Sounds](https://kenney.nl/assets/interface-sounds). Trimmed to a short click, 80 Hz high-pass / 3 kHz low-pass, edge fades, −6 dBFS target peak. |
| `latch-confirm.ogg` | `Audio/maximize_006.ogg` / Kenney | Interface Sounds. Low rising pulse; 70 Hz high-pass / 1.8 kHz low-pass, edge fades, −8 dBFS target peak. |
| `checkpoint.ogg` | `Audio/confirmation_001.ogg` / Kenney | Interface Sounds. Short two-tone cue; 70 Hz high-pass / 1.8 kHz low-pass, edge fades, −8 dBFS target peak. |
| `breakpoint-deploy.ogg` | `Audio/doorOpen_002.ogg` / Kenney | [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds). Slowed to 82%, 60 Hz high-pass / 1.8 kHz low-pass, edge fades, −8 dBFS target peak. Deployment lasts about 0.65 seconds, before the existing flag-confirmation moment. |
| `breakpoint-confirm.ogg` | `Audio/confirmation_004.ogg` / Kenney | Interface Sounds. Slowed to 85%, 70 Hz high-pass / 2.2 kHz low-pass, edge fades, −8 dBFS target peak. The existing 1.2-second flag timing emits it once. |
| `room-complete.ogg` | `Audio/8-Bit jingles/jingles_NES12.ogg` / Kenney | [Music Jingles](https://kenney.nl/assets/music-jingles). Rising 8-bit phrase, 60 Hz high-pass / 2.8 kHz low-pass, edge fades, −6 dBFS target peak. Used only for completion. |
| `code-power.ogg` | `Audio/forceField_001.ogg` / Kenney | Sci-Fi Sounds. Trimmed to 0.8 seconds, 55 Hz high-pass / 2 kHz low-pass, edge fades, −9 dBFS target peak. A quiet activation bed separate from firewall contact. |

Full per-file source URLs, exact FFmpeg filter chains, original/new-file hashes
and output hashes are retained in [public/audio/credits.json](public/audio/credits.json).
The original Kenney pack licences are retained in `public/audio/Kenney-License.txt`,
`public/audio/Kenney-Interface-License.txt`, and `public/audio/Kenney-Music-Jingles-License.txt`.
The licence dedication is [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

The three original Kenney asset pages and embedded pack licences were verified
on 2026-10-26. The credits JSON records official download URLs, archive hashes,
individual original hashes, exact FFmpeg filter chains, output hashes and
decoded levels/durations. Run `python3 scripts/audio/build-sfx.py` to reproduce
the new effects from those pinned archives; it leaves the original files untouched.

The former generic confirmation has a dominant frequency near 3.14 kHz and
99.955% of its measured spectral energy above 1.8 kHz. The new switch, latch,
checkpoint and breakpoint-confirmation files measure 0–1.162% above that threshold.
These are signal measurements, not subjective listening judgments. Their samples
retain headroom; the new decoded peaks range from −9.042 to −5.660 dBFS before
runtime gains and the effects-volume control.

Switch, latch, checkpoint, deployment, flag confirmation and completion have
separate samples. One observed state update emits each cue at most once and
chooses one machinery activation (door, relay, lift, then code) when several
outputs change together. The engine permits at most two concurrent machinery
voices, reduces lift/relay activation gains, and gives completion its own phrase
above earlier effects. Grapple, cube and pressure-plate samples and gains remain
unchanged. Hero timing still follows authored presentation state, including one
deployment and one confirmation per newly activated breakpoint.

The [playable SFX review](docs/playtest/2026-10-26-audio/sfx-review.html) compares
old/new cues at the default 65% effects level, including the deployment/confirmation
pair and unchanged grapple/cube/plate references. Its Ogg and timestamp manifest
are alongside it; `python3 scripts/audio/review-sfx.py` rebuilds them. The agent
cannot hear tool playback, so a perceptual audition is not claimed. Measurements
are retained in [sfx-measurements.json](docs/playtest/2026-10-26-audio/sfx-measurements.json).

The original project and research share were read-only. The small named cue,
cooldown, voice-limit and loop-mixing design adapts the original project's
`src/audio/audio-manager.ts`; buffer playback and this chamber's event adapter
are new. Sounds are authored game feedback, not retained OLLVM execution evidence.

## Music — 2026-10-26

All six soundtrack sources are **CC0 1.0**, verified on their original
OpenGameArt pages on 2026-10-26. The game ships local stereo Vorbis edits totaling
13,158,428 bytes; each is 96–195 seconds and mastered near −23 LUFS.

| Scene | Track / author | Original source |
| --- | --- | --- |
| Main menu | Claimed by the Void — vitalezzz | [Original submission](https://opengameart.org/content/claimed-by-the-void) |
| HANDSHAKE | Celestial Harmony — vitalezzz | [Original submission](https://opengameart.org/content/celestial-harmony) |
| CROSSFEED VAULT | Stop For A Moment — vitalezzz | [Original submission](https://opengameart.org/content/stop-for-a-moment) |
| RACE CONDITION | Hyperton — Sudocolon | [Original submission](https://opengameart.org/content/hyperton) |
| DEADLOCK | Algate — James Gargette (cinameng) | [Original submission](https://opengameart.org/content/algate) |
| USE AFTER FREE | Neural Malfunction — vitalezzz | [Original submission](https://opengameart.org/content/neural-malfunction) |

Tutorials reuse the menu/HANDSHAKE selections at a quieter level. No WATCHDOG
level or copyrighted television soundtrack is included. Scott Buckley's
Machina was compared from its source description but is not distributed.

The [music catalogue](public/audio/music/catalogue.json) records original URLs,
source/output hashes, author, license, exact edits, durations, encoded sizes and
measured loudness. [Selection notes](docs/audio-selection.md) compare the
candidates and explain the loop edits. [prepare-music.py](scripts/prepare-music.py)
reproduces them from pinned downloads. The
[96-second review montage](docs/playtest/2026-10-26-audio/music-review.ogg) contains
six scene excerpts and their loop seams. As with effects, subjective acoustic
review remains for a human; automated playback and signal analysis are not
represented as listening.
