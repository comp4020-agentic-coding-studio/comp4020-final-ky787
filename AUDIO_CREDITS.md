# C8 sound credits — 2026-10-05

All 14 shipped effects use **CC0 1.0**. Sources were checked online on 2026-10-05.
The selected Ogg files total 233,364 bytes. Runtime paths are under `public/audio/`;
no runtime download from a third-party site or the research share is needed.

| Runtime file | Original / author | Source and processing |
| --- | --- | --- |
| `grapple-fire.ogg`, `grapple-attach.ogg` | `laserSmall_002.ogg`, `laserSmall_003.ogg` / Kenney | [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds). Reused byte-for-byte from Crit 5's normalised Vorbis effects. Fire also supplies quieter pitched jump/rope-jump cues. |
| `grapple-reel.ogg` | `computerNoise_002.ogg` / Kenney | Same pack; Crit 5's high-pass filtered reel loop, unchanged. |
| `crumble-start.ogg` | `computerNoise_003.ogg` / Kenney | Same pack; Crit 5's 0.78-second filtered/tremolo corruption warning, unchanged. |
| `crumble-break.ogg` | `explosionCrunch_000.ogg` + `forceField_004.ogg` / Kenney | Same pack; Crit 5's normalised mix, unchanged. Also reused at a lower playback rate for death. |
| `firewall-open.ogg` | `forceField_001.ogg` / Kenney | Same pack; Crit 5's normalised cue, unchanged. Now signals code machinery activation/deactivation. |
| `landing.ogg`, `confirm.ogg` | `landing.ogg`, `beep_message.ogg` / yd | [Platformer Sounds](https://opengameart.org/content/platformer-sounds-terminal-interaction-door-shots-bang-and-footsteps). Crit 5's repaired/trimmed Vorbis files, unchanged. Confirm supplies switch/latch/completion cues. |
| `teleport.ogg` | `teleport_02.ogg` / rubberduck | [50 CC0 Sci-Fi SFX](https://opengameart.org/content/50-cc0-sci-fi-sfx). New download, downmixed to mono, short edge fades, peak level set to −6 dB, Vorbis q4. |
| `lift-on.ogg`, `relay-on.ogg` | `forceField_000.ogg`, `forceField_003.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. Lower runtime rates distinguish powering off. |
| `lift-hum.ogg` | `spaceEngineLow_003.ogg` / Kenney | New download from Sci-Fi Sounds. 1,800 Hz low-pass, short edge fades, −6 dB peak, mono Vorbis q4. Quiet distance-mixed loop. |
| `door-open.ogg` | `doorOpen_000.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. |
| `metal-touch.ogg` | `impactMetal_002.ogg` / Kenney | New download from Sci-Fi Sounds. Mono, short edge fades, −6 dB peak, Vorbis q4. Rate/gain variants for plates and cube pickup/drop. |

Full per-file source URLs, exact FFmpeg filter chains, original/new-file hashes
and output hashes are retained in [public/audio/credits.json](public/audio/credits.json).
The original Kenney pack licence is retained in `public/audio/Kenney-License.txt`.
The licence dedication is [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

The original project and research share were read-only. The small named cue,
cooldown, voice-limit and loop-mixing design adapts the original project's
`src/audio/audio-manager.ts`; buffer playback and this chamber's event adapter
are new. Sounds are authored game feedback, not retained OLLVM execution evidence.
