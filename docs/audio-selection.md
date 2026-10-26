# Binary Ninja soundtrack selection — 2026-10-26

Six local electronic music loops accompany the title screen and the five co-op
chambers. The runtime files total **13,158,428 bytes (13.16 MB)**. All shipped
sources were published under **CC0 1.0** on their original OpenGameArt submission
pages, checked on **2026-10-26**. The files are bundled with the game; gameplay
never streams music from a third-party music service.

## Review method and its limit

This is a **structural recommendation, not a claimed listening review**. The
agent could inspect published artist descriptions, decoded waveforms, dynamics,
spectrum, periodicity, silence and loop boundaries. FFmpeg/ffplay are installed,
but this environment exposes no acoustic-perception tool to the agent. Running
a player or rendering an audio attachment does not establish that the agent
heard the result. Subjective fit, fatigue over a long session and masking of
speech/effects still need headphone/speaker review by a person.

The [96-second review montage](playtest/2026-10-26-audio/music-review.ogg) makes
that review concrete. It contains six chapters in the table order below. Each
chapter plays 12 seconds from source time 30–42 in the final asset, followed by
the last two seconds and first two seconds of that asset, so the latter four
seconds cross its actual runtime loop seam. Chapter starts: **0:00 menu, 0:16
HANDSHAKE, 0:32 CROSSFEED VAULT, 0:48 RACE CONDITION, 1:04 DEADLOCK, 1:20
USE AFTER FREE**. The montage is a review artifact; it is not loaded by gameplay.

## Candidate comparison and scene assignment

These placements are design inferences from source descriptions and measured
structure; they do not assert a perceptual audition.

| Candidate | Original-source description / objective finding | Decision |
| --- | --- | --- |
| [Claimed by the Void](https://opengameart.org/content/claimed-by-the-void), vitalezzz | Artist supplies an ambient science-fiction loop; the lossless loop is 195 s, with 5.3 LU source loudness range and no silent ending. | **Menu.** Its long native cycle supports lingering on the title screen without a short repeated motif. |
| [Algate](https://opengameart.org/content/algate), James Gargette / cinameng | Author provides a dub-techno pack with full, low, bass and no-kick versions. Each is only 15.118 s. The full/low versions have similar energy; bass/no-kick alone have much sparser energy. | **DEADLOCK.** Arrange the compatible full/low versions into a 120.945 s cycle, with gradual tonal changes and unchanged beat timing. Do not use a bare 15-second repeat. |
| [Hyperton](https://opengameart.org/content/hyperton), Sudocolon | Artist calls it looping electronic menu music. Its decoded 96-second musical period has the highest mean spectral centroid of the selected candidates and low 3.2 LU source dynamic range. | **RACE CONDITION.** Use the comparatively bright, steady structure for the timed chamber. Remove MP3 padding before looping. |
| [Machina](https://www.scottbuckley.com.au/library/machina/), Scott Buckley | Artist describes electronic ambience inspired by older science-fiction scores. The [usage page](https://www.scottbuckley.com.au/library/using-this-music/) specifies CC-BY 4.0 attribution plus distribution/fingerprinting conditions. The direct MP3 download returned HTTP 406 during this review. | **Compared by published description only; not shipped.** The selected CC0 set already covers the scenes without adding a different attribution/distribution path. No claim about its audible quality is made. |
| [Celestial Harmony](https://opengameart.org/content/celestial-harmony), vitalezzz | Artist tags it electronic, piano, space and tranquil. The 190.154 s master has an opening and closing fade, with measured pulse periodicity consistent with 130 BPM. | **HANDSHAKE.** Use a central passage as a welcoming first chamber; replace its faded song ending with a four-bar cyclic blend. |
| [Stop For A Moment](https://opengameart.org/content/stop-for-a-moment), vitalezzz | Artist tags it upbeat electronic/arcade. Measured spectral centroid is lower than Hyperton's; the original 184.755 s recording ends with a fade almost to silence. | **CROSSFEED VAULT.** Retain an extended electronic passage, remove the fade-out, and blend four bars at the wrap. |
| [Neural Malfunction](https://opengameart.org/content/neural-malfunction), vitalezzz | Artist supplies a loopable science-fiction/action track. Its 152.920 s native loop retains continuous energy at both ends and has the widest source dynamic range here (8.2 LU). | **USE AFTER FREE.** Preserve the author's long loop for the later, more demanding chamber; constant gain retains its musical dynamics. |

Four tracks share vitalezzz's electronic production, while the two other sources
provide a rhythm/texture change for distinct chambers. The sparse Algate bass
and no-kick files were examined but not used alone, because their low-energy
sections were a poor basis for a continuous background bed. Tempo estimates are
analysis aids, not artist-supplied metadata; half/double-time ambiguity applies.

## Final runtime assets

All six files are stereo **44,100 Hz Ogg Vorbis, quality 4**, normalized by a
constant gain to approximately **−23 LUFS integrated**. Values below were
measured from the **decoded final OGG**, not merely the input master. True peaks
are at least 8.38 dB below full scale. No dynamics compressor or limiter is
applied; the application owns its music bus gain, independent volume slider,
ducking and transition fades.

| Scene / filename stem | Source title | Duration | LUFS-I | True peak dBTP | Bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| `menu` | Claimed by the Void | 195.000 s | -23.06 | -11.84 | 2,808,275 |
| `handshake` | Celestial Harmony | 155.077 s | -23.07 | -10.49 | 2,414,397 |
| `crossfeed-vault` | Stop For A Moment | 169.846 s | -23.03 | -10.20 | 2,520,820 |
| `race-condition` | Hyperton | 96.000 s | -23.01 | -9.29 | 1,566,283 |
| `deadlock` | Algate | 120.945 s | -22.99 | -8.38 | 1,608,353 |
| `use-after-free` | Neural Malfunction | 152.920 s | -23.11 | -9.11 | 2,240,300 |

The complete machine-readable [catalogue](../public/audio/music/catalogue.json)
records original download and output SHA-256 hashes, exact sample edits,
archive-member hashes, gain, final dynamics and loop checks. None of the final
assets contains a 100 ms decoded window below −60 dBFS. The largest decoded
last-to-first sample difference is 0.005522 full-scale (about −45 dBFS), before
the application's additional playback attenuation. These checks detect gaps and
large discontinuities; they do not prove that a musical transition is pleasing.

## Exact modifications

Processing is implemented in [prepare-music.py](../scripts/prepare-music.py).
Every source is verified against its pinned SHA-256 before use. The sequence is:

1. Decode the pinned original to stereo 44.1 kHz floating-point PCM.
2. Apply the scene edit below. No new musical notes or time stretching are used.
3. Smooth the 128 samples on each side of the circular boundary (256 samples /
   5.805 ms total) with a cubic transition. This retains the cycle duration and
   adds no silent gap.
4. Apply a 28 Hz high-pass and a 14 kHz low-pass to remove subsonic energy and
   limit excessive top-end content; measure integrated loudness.
5. Apply a constant scalar gain to target −23 LUFS, re-close the filtered
   boundary with the same 128-sample operation, then encode Vorbis quality 4.
6. Decode the exported OGG and measure loudness, true peak, silence and its
   actual boundary. Fail the preparation if loudness differs by ≥0.35 LU,
   true peak reaches −3 dBTP, a silent interval reaches 0.2 s, or the six-file
   payload falls outside 8–18 MB.

| Scene | Edit before common mastering |
| --- | --- |
| Menu | Preserve all 8,599,500 samples of the supplied `claimed_by_the_void_loop.flac` native loop. |
| HANDSHAKE | Take source samples `[651323, 7815877)` (approximately 14.769–177.231 s). Crossfade the final 325,662 samples into the first 325,662 samples using sine/cosine equal-power gains; remove that overlap once. This is a four-bar blend at the inferred 130 BPM. Result: 6,838,892 samples. |
| CROSSFEED VAULT | Take samples `[0, 7815877)` (ends at approximately 177.231 s, before the original fade to silence). Use the same 325,662-sample cyclic crossfade. Result: 7,490,215 samples. |
| RACE CONDITION | The decoded MP3 has 4,235,904 samples, including 2,304 padding samples. Trim the first 1,105 and last 1,199 to retain exactly 4,233,600 samples / 96 s. |
| DEADLOCK | Use WAV members `Algate/wav/algate_low.wav` and `Algate/wav/algate.wav`. Order: low, low, full, low, low, full, full, low. During the first 83,339 samples of each section, blend from the preceding variant's corresponding samples using smoothstep gains. All eight original loop lengths are retained, with no missing beats. Result: 5,333,672 samples. |
| USE AFTER FREE | Preserve all 6,743,787 samples of the supplied `neural_malfunction.flac` native loop. |

The two longer crossfades deliberately change which bar begins playback; their
end continues into that same loop start. They do not append a fade-to-zero or an
introductory silence on every iteration. The trimmed Vorbis assets contain no encoder-padding gap. Browser continuity
is checked separately; the media API does not guarantee sample-accurate output.

## Source and license record

[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) permits copying,
adaptation and redistribution, including commercial use, without an attribution
condition. The original pages above explicitly select CC0. Credits are retained
as provenance and courtesy; there is no endorsement claim. All shipped source
licenses were checked on **2026-10-26**. Scott Buckley's candidate is excluded
from the shipped set; its different conditions do not apply to these assets.

| Source / credited author | Original page and exact downloaded file | Download SHA-256 |
| --- | --- | --- |
| Claimed by the Void — vitalezzz | [Original page](https://opengameart.org/content/claimed-by-the-void) · [Download](https://opengameart.org/sites/default/files/claimed_by_the_void_loop.flac) | `067d1c0e0efb47548b3354b6d1293adfbffbfc24bc8eba1f0244a65110985e5d` |
| Celestial Harmony — vitalezzz | [Original page](https://opengameart.org/content/celestial-harmony) · [Download](https://opengameart.org/sites/default/files/celestial_harmony.flac) | `3f3b8831623494863deb6a0cffb51cf4214575da657fd6e57648d84c77487629` |
| Stop For A Moment — vitalezzz | [Original page](https://opengameart.org/content/stop-for-a-moment) · [Download](https://opengameart.org/sites/default/files/stop_for_a_moment.flac) | `00d897231c27894ced10f4542940c354a4abb7e99924b71fbbb3d50addf9546b` |
| Hyperton — Sudocolon | [Original page](https://opengameart.org/content/hyperton) · [Download](https://opengameart.org/sites/default/files/Hyperton.mp3) | `a98dea8138f10ce8b595c63b3fd1652e672a8425c361486234265638932953e3` |
| Algate — James Gargette (cinameng) | [Original page](https://opengameart.org/content/algate) · [Download](https://opengameart.org/sites/default/files/algate.zip) | `394868e3d533f6e447165391ab2876913b712559390bf73f4f839b798ebd8ced` |
| Neural Malfunction — vitalezzz | [Original page](https://opengameart.org/content/neural-malfunction) · [Download](https://opengameart.org/sites/default/files/neural_malfunction.flac) | `8d917f86038c0f284fc6220ba200a16f2be268e5375d5caa7419401dd1e1cee7` |

For Algate the download hash identifies the ZIP, while both selected WAV member
hashes are also retained in the catalogue. Original source masters are cached
outside the repository and are not included in the runtime payload.

| Runtime file | SHA-256 |
| --- | --- |
| `menu.ogg` | `94271d7fac43f54c4240c354b7415ee26b94bcbe93346aed83108a3cca73679e` |
| `handshake.ogg` | `06557728c1d6dfd813857807f1c6fd7fe6eedfbe0ff8b0bf6a91b5b444dd69ab` |
| `crossfeed-vault.ogg` | `963e6c31a72405c8f0c1e63b7524b33398068d16fa50e2f593024ae6503f4062` |
| `race-condition.ogg` | `028f5d98da1a3d1f3d396abd66ac94bca37194316e85b90895a228c59b1073c1` |
| `deadlock.ogg` | `f31f389b69d48b9bbb386ccd40f8cbbae6075034ff5a8a04bdffc35621dd4648` |
| `use-after-free.ogg` | `d6f35d5d59662380eaa5b6cb1a9cd594d519041b79bbf4165afa5b80ca07e3b9` |

## Reproduce and review

Run with Python 3 plus NumPy, FFmpeg and ffprobe available:

```sh
python3 scripts/prepare-music.py
```

By default sources are cached under `/tmp/bn-music-sources`; use `--cache` to
choose a persistent download cache. `--output` and `--review` override the
runtime directory and review montage path. The exact FFmpeg version used for
this export is recorded in `catalogue.json`. Encoding hashes can vary with a
different encoder version; source hashes remain the validation boundary.

For an actual listening review, open the montage in a media player or play it
with `ffplay -nodisp -autoexit docs/playtest/2026-10-26-audio/music-review.ogg`,
then spend a few minutes in each real chamber with sound effects and voice
conversation. Review the cue-to-music balance at the default slider setting,
confirm each loop seam is unobtrusive, and compare menu music with the tutorial's
ducked mix. The agent has not represented those subjective checks as completed.
