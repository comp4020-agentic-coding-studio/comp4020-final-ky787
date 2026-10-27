# Binary Ninja audio credits

## Sound effects — updated 2026-10-27

All 21 shipped effect files use **CC0 1.0**. Thirteen of the original 14 files
remain byte-for-byte; landing now uses the human-approved Kenney Impact Sounds
sample. Seven effects were added earlier on 2026-10-26; completion was replaced
with the explicitly selected SRG774 recording on 2026-10-27. The retired generic
`confirm.ogg` remains credited and shipped, but
is not loaded: 20 distinct effect buffers now decode at runtime.

The effect files total 335,751 bytes; active effects total 312,286 bytes.
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
| `room-complete.ogg` | **Victory.mp3 / SRG774** (`victory_4.mp3` download) | [Dark Sci-Fi Audio Pack](https://opengameart.org/content/dark-sci-fi-audio-pack), CC0 1.0. Complete 5.877551-second original stereo recording, constant +11.274436 dB gain, 44.1 kHz Vorbis q4. No EQ, compression, trimming, pitch changes, synthesis or replacement arrangement. |
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
only the selected Victory recording from its pinned original download.
`--effects <filename>...` selects specific managed effects; `--all` explicitly
rebuilds all eight managed files. `--effects landing.ogg` reproduces the approved
landing independently. The Music
Jingles archive and licence remain as provenance for the earlier completion
sample preserved in the dated A/B review; it has no current runtime use.

The former generic confirmation has a dominant frequency near 3.14 kHz and
99.955% of its measured spectral energy above 1.8 kHz. The new switch, latch,
checkpoint and breakpoint-confirmation files measure 0–2.621% above that threshold.
These are signal measurements, not subjective listening judgments.
The seven added samples retain headroom; their decoded peaks
range from −10.213 to −7.934 dBFS before runtime gains and the effects-volume control.

Switch, latch, checkpoint, deployment, flag confirmation and completion have
separate samples. One observed state update emits each cue at most once and
chooses one machinery activation (door, relay, lift, then code) when several
outputs change together. The engine permits at most two concurrent machinery
voices, reduces lift/relay activation gains, and gives completion one foreground
voice. A finite music-duck hold covers the **actual decoded AudioBuffer duration**
(5.888 seconds in the tested browser; file fallback 5.878 seconds). The existing
**450 ms** ramp then restores normal view-dependent
music levels, including
while a co-op victory screen remains open. Grapple, cube and pressure-plate samples and gains remain
unchanged. Hero timing still follows authored presentation state, including one
deployment and one confirmation per newly activated breakpoint.

The [original Victory download](https://opengameart.org/sites/default/files/victory_4.mp3)
is 235,101 bytes. Its original submission explicitly identifies SRG774 and
dedicates the pack to CC0 1.0; verified on **2026-10-27**. Attribution is optional,
but the artist and source remain credited. Source masters stay outside the game
bundle. The previous NES jingle and synthesized chord are rejected historical
versions, not sources for the current effect.

- Original SHA-256: `208916af7b2b26ee70171a964595ace1ccaf4534abfbfa816d340179e13fe289`.
- Runtime SHA-256: `2a407d2107124ff7e7bae23b8d1228311a77f43028b24a7695781a28e6f1d743`.
- Final output: 70,464 bytes, all 259,200 original samples per channel, stereo,
  −21.16 LUFS integrated, −8.19 dB true peak. Existing completion gain 0.65 and
  default Effects 65% yield approximately −28.64 LUFS / −15.67 dBTP. The existing
  18% completion music mix remains; only its hold duration changes.

Two builds with the recorded FFmpeg version produced identical bytes. All other
20 effect files and all seven music files, their catalogue records and playback
gains are unchanged. Human listening selected the recording; the agent assessed
licensing, integrity, levels and actual browser triggering, not subjective sound.

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

The historical [toggle/completion A/B review](docs/playtest/2026-10-26-audio-refinement/sfx-ab.html)
compares the previous mechanical toggle and NES jingle with the October 26 versions
at the same runtime gains and default 65% Effects level. Its
[manifest](docs/playtest/2026-10-26-audio-refinement/sfx-ab.json) retains both versions'
source records, measurements, hashes, and proof that the other 19 effect files are
unchanged. The [earlier SFX review](docs/playtest/2026-10-26-audio/sfx-review.html)
is historical: it contains the previous toggle and jingle alongside the still-current
deployment/confirmation pair and grapple/cube/plate references. Its original
Ogg, timestamp manifest and [measurements](docs/playtest/2026-10-26-audio/sfx-measurements.json)
remain unchanged. `python3 scripts/audio/review-sfx.py` creates a separate current-cue
montage in `docs/playtest/2026-10-27-victory-audio/`, leaving both historical reviews
intact. The agent cannot hear tool playback, so a
perceptual audition is not claimed.

The original project and research share were read-only. The small named cue,
cooldown, voice-limit and loop-mixing design adapts the original project's
`src/audio/audio-manager.ts`; buffer playback and this chamber's event adapter
are new. Sounds are authored game feedback, not retained OLLVM execution evidence.

## Music — final human selections, 2026-10-27

All seven runtime soundtrack files use **CC0 1.0**, verified on their original
OpenGameArt pages. They total **11,725,794 bytes** and retain the approximately
−23 LUFS mastering target, existing runtime gains and current Music preferences.

| Scene | Track / author | Original source |
| --- | --- | --- |
| Main menu; PRESSURE and SWITCH | Claimed by the Void — vitalezzz | [Original submission](https://opengameart.org/content/claimed-by-the-void) |
| HANDSHAKE | Loaben — James Gargette (cinameng) | [Original submission](https://opengameart.org/content/loaben), [exact MP3](https://opengameart.org/sites/default/files/loaben_3.mp3) |
| CROSSFEED VAULT | Shadow — James Gargette (cinameng) | [Original submission](https://opengameart.org/content/shadow-2), [regular shadow.mp3 download](https://opengameart.org/sites/default/files/shadow_0.mp3) |
| RACE CONDITION | Hyperton — Sudocolon | [Original submission](https://opengameart.org/content/hyperton) |
| DEADLOCK | Algate — James Gargette (cinameng) | [Original submission](https://opengameart.org/content/algate) |
| USE AFTER FREE | Neural Malfunction — vitalezzz | [Original submission](https://opengameart.org/content/neural-malfunction) |
| Solo RELAY and CONTROL SPINE (`uplink`) | Celestial Harmony — vitalezzz | [Original submission](https://opengameart.org/content/celestial-harmony) |

The user explicitly approved Loaben for HANDSHAKE and regular Shadow for
CROSSFEED after listening. Both source pages identify cinameng / James Gargette
and CC0, verified 2026-10-27. Shadow dark/light were not selected. Kuia and
Through the Sewers are superseded historical choices.

Both new masters preserve the **complete original recordings**, respectively
1,582,848 and 2,321,280 samples per channel (35.892245 / 52.636735 seconds).
Only constant gain (+7.46 / +7.71 dB), a 128-sample-per-side boundary de-click
(5.8 ms total, without shortening), and stereo 44.1 kHz Vorbis q4 encoding are
applied. No trimming, cyclic overlap, EQ, compression, pitch/tempo changes,
new notes or replacement arrangement. The earlier review excerpts are not
runtime sources. Final levels are −23.01 / −23.03 LUFS integrated and
−9.16 / −10.83 dBTP.

The other five recordings, their catalogue metadata and gains remain unchanged,
particularly DEADLOCK's Algate. PRESSURE/SWITCH retain the menu theme;
RELAY/CONTROL SPINE retain the exact Celestial Harmony tutorial file and quieter
solo mix. The 25% new-user Music default, all saved volume preferences, Effects,
mute, crossfades, loop playback and ducking are unchanged.

The [catalogue](public/audio/music/catalogue.json) records source/download URLs,
source/output hashes, licenses, sample counts and measured levels. The
[selection notes](docs/audio-selection.md) and
[preservation report](docs/playtest/2026-10-27-approved-soundtracks/verification.json)
record exact identity and reproducibility. CC0 permits redistribution and
adaptation without mandatory attribution; credits remain as provenance and
courtesy. Source masters stay in the external cache.

[prepare-music.py](scripts/prepare-music.py) rebuilds only the two selected
recordings from hash-pinned originals and verifies the other five before and
after preparation. Two builds produced identical bytes. The
[current playback page](docs/playtest/2026-10-27-approved-soundtracks/index.html)
contains the full runtime masters and separate seam checks; dated earlier
listening pages remain historical. Human listening made the final selections;
programmatic analysis checked identity, timing, levels and playback only.
