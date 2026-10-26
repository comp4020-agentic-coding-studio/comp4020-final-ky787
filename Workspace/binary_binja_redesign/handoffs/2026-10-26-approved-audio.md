# Human-approved audio implementation — 2026-10-26

Based on current main `c865475981d9d5ac54f3d4e3d13ed983935a4609` after fetching origin.
The user selected these recordings by listening. This pass implements those
choices and fixes lever consistency; it does not select a new completion sound.

| Use | Approved original / CC0 source | Output |
| --- | --- | --- |
| HANDSHAKE | **Kuia — James Gargette (cinameng)**; https://opengameart.org/content/kuia | Full 47.177143-second original musical period, −23.04 LUFS / −6.48 dBTP, 554,860 bytes |
| CROSSFEED VAULT | **Through the Sewers — Alexander Ehlers (tricksntraps)**; https://opengameart.org/content/t-t-free-cyberpunk-pack-2 | Exact `through_the_sewers_1766bpm.ogg` original; 196.364172-second loop, −23.07 LUFS / −11.44 dBTP, 3,058,280 bytes |
| Landing | **Kenney Impact Sounds, `Audio/impactSoft_medium_000.ogg`**; https://kenney.nl/assets/impact-sounds | 0.115102 seconds, −6.01 dBTP, 4,111 bytes; runtime gain 0.81 |

The music retains stereo 44.1 kHz Vorbis q4 and constant-gain mastering.
Kuia uses all 2,080,512 decoded source samples, not the old 24-second excerpt.
Sewers retains source samples [1,940,400, 10,952,860), with an eight-second
cyclic overlap selected using matching transient envelopes. The filename is
not a verified tempo; the catalogue records null BPM. Source masters stay in
`/tmp/bn-approved-audio`, outside the game bundle. CC0 was checked on the original
pages; the official Impact archive licence is retained unchanged. Attribution
is not mandatory under CC0, but artist credits and source URLs remain.

| Asset | Source SHA-256 | Output SHA-256 |
| --- | --- | --- |
| Kuia | `11a5d1a983a7d0d134aea3e9264acf923ca5eea0591ba722642a43724d73fd7e` | `52e97ddbd7f41873b4d9bb324b91767a6ef6f319cc50635457ff094659ca707d` |
| Through the Sewers | `a248f7bd3b0260bacd3cf4eb5bc325c6b15cc359334527b9734c3d4b6ced5f99` | `7a2a43c259b95f46cc95e88ea6fb86b45a496e70eb36c1a4a76ff85145457fd6` |
| Landing original member | `7d3ba0bb5e60a11b5d3e558c141303dcf494256675fbf753c0d252d2cf0481e3` | `199a252e4605bf98130b2d15aa40f50915b826f0d1a58016e8250aebe2ffefd3` |

Impact archive SHA-256:
`029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8`.
Both generators reproduced identical output hashes in two runs using FFmpeg
6.1.1-3ubuntu5. Default commands rebuild only the two music files and landing.
Exact edits and integrity details: `public/audio/music/catalogue.json`,
`public/audio/credits.json`, `docs/audio-selection.md`, and `AUDIO_CREDITS.md`.

Landing retains `min(1, landingSpeed / 700)`, the 0.12-second cooldown and the
existing physical landing threshold. First-50-ms RMS at equal speed is 3.02 dB
stronger than before; maximum runtime peak remains below −7.8 dBFS. No compression
was added. A new local plate press owns its impact instead of layering another
footfall; a distant/cube press cannot suppress an ordinary landing.

Upper lift levers were inconsistent because solo emitted switch + lift-latch,
while co-op emitted lift-latch only; the old adapter suppressed the switch.
Both now use one digital click with quiet 30% latch confirmation. Ordinary
lever checkpoints retain 40% confirmation. Declarative toggles, CROSSFEED toggles
and RACE's phase lever retain the same digital cue. True terminals (including
CROSSFEED switchC/switchD and RACE COMMIT) keep terminal feedback; breakpoint
stations retain their staged deploy/confirm cues. Producers, accepted state,
controller authority, physics and checkpoint/completion semantics are unchanged.

Protected files and complete catalogue entries remain byte-identical:

| Music | Unchanged SHA-256 |
| --- | --- |
| Menu | `94271d7fac43f54c4240c354b7415ee26b94bcbe93346aed83108a3cca73679e` |
| RACE CONDITION | `028f5d98da1a3d1f3d396abd66ac94bca37194316e85b90895a228c59b1073c1` |
| DEADLOCK | `f31f389b69d48b9bbb386ccd40f8cbbae6075034ff5a8a04bdffc35621dd4648` |
| USE AFTER FREE | `d6f35d5d59662380eaa5b6cb1a9cd594d519041b79bbf4165afa5b80ca07e3b9` |

Solo RELAY/uplink still use the unchanged Celestial Harmony tutorial asset;
PRESSURE/SWITCH still use menu. `MusicPlayer`, music catalogue scene/gain mapping
and `SliceGame` are unchanged. All 20 other SFX are unchanged, including
completion SHA-256 `96de80a6cb5015c941eee0a51f76d7548f913d10492c8a8e5b359e78fb9e2ac8`.

Validation passed: 54 focused audio/music/hero unit tests (including hashes,
full Kuia duration, physical falls at four heights, accepted co-op controls and
plate landing); typecheck; production build/native bundle audit; 46 real-browser
audio checks; 29 multiplayer lift checks with both player roles. Browser testing
uses independent profiles and a physical HANDSHAKE solve; it verifies native
loop wrap on both replacements, all chamber transitions, reconnect, one completion
stinger, pause/visibility, mute, failed loads, repeated jumps and plate impact.
Synthetic lifecycle events and accelerated near-end seeking are diagnostic checks,
not claims of manual listening or waiting through every complete music cycle.

Open `docs/playtest/2026-10-26-approved-audio/index.html` for complete runtime
loops, seam excerpts and gentle/normal/large landing previews. Evidence is beside
it in `verification.json`, `audio-browser-checks.txt` and `lift-browser-checks.txt`.
The agent cannot hear playback; human selection is the preference evidence,
while final seam and landing mix quality remain available for human listening.

Delivery follows the normal main push and existing checks → Fly workflow.
The workflow itself is unchanged; its outcome is reported in the final delivery.
Unrelated local changes in CLAUDE.md, blank-room.json and three old handoffs
remain outside this commit. During finalization the research-share mount stalled;
this new handoff is staged at its required repository path from a local copy,
without modifying other research files or removing the mount.
