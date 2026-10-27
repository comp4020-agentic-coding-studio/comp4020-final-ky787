# Binary Ninja soundtrack selection — 2026-10-26

**Current revision: explicit human listening selections, 2026-10-26.**
HANDSHAKE uses **Kuia** and CROSSFEED VAULT uses **Through the Sewers**.
Seven runtime files total **14,250,748 bytes (14.25 MB)**. All four protected
recordings and the solo tutorial recording retain their exact bytes, metadata,
scene assignments and playback gains. The current contract follows immediately;
the earlier selection rounds below are historical.

**2026-10-27 review pending:** human playtesting requested a quieter CROSSFEED
choice. [Shadow (dark, light and original), PYNCHON and Loaben](playtest/2026-10-27-crossfeed-listening/index.html)
are prepared beside the unchanged Algate reference, with loop-ready previews
and separate seam excerpts. All candidates are James Gargette/cinameng CC0
recordings from their linked OpenGameArt pages. The comparison starts at the new
25% Music default; source hashes, exact edits and loudness measurements are in
its [manifest](playtest/2026-10-27-crossfeed-listening/manifest.json).
No replacement is approved: every runtime track, including Through the Sewers,
and the runtime catalogue remain byte-for-byte unchanged.

## Human-approved recordings and preparation

The user chose these tracks by listening. No further candidate ranking or
agent listening judgment is used for this pass. Source pages and direct
downloads were verified on 2026-10-26. Both pages explicitly specify
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), allowing public
redistribution and adaptation without mandatory attribution. Credits are kept
as provenance and courtesy. Original masters remain in an external cache.

| Scene | Human-selected original | Final duration | LUFS-I | True peak | Bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| HANDSHAKE | [Kuia](https://opengameart.org/content/kuia) — James Gargette (cinameng), `kuia.mp3` | 47.177143 s | −23.04 | −6.48 dBTP | 554,860 |
| CROSSFEED VAULT | [Through the Sewers](https://opengameart.org/content/t-t-free-cyberpunk-pack-2) — Alexander Ehlers (tricksntraps), `through_the_sewers_1766bpm.ogg` | 196.364172 s | −23.07 | −11.44 dBTP | 3,058,280 |

- Kuia retains **all 2,080,512 decoded source samples**, including the complete
  musical period. The old 24-second comparison excerpt is not used as a source.
- Through the Sewers uses source samples `[1,940,400, 10,952,860)` at 44.1 kHz,
  or 44.000–248.364172 s, with an eight-second/352,800-sample equal-power cyclic
  overlap. Output: 8,659,660 samples. This preserves the central arrangement
  while removing opening silence/sparse introduction and the faded ending.
  The tail at 240.364172 s is matched to the head at 44 s by three-band transient
  envelopes (mean cosine similarity 0.664). That match guides the edit, not track
  selection. **The unusual filename is not a verified BPM measurement**;
  `tempoBpm` is null. No time stretching is applied.
- Both use the existing 28 Hz high-pass / 14 kHz low-pass, constant gain to
  approximately −23 LUFS, 128-sample wrap de-click per side before and after
  filtering, stereo 44.1 kHz Vorbis quality 4. Gains are +0.51 dB and −15.34 dB
  respectively. No compression, new notes or runtime mix changes.
- Final decoded files have no 100 ms window below −60 dBFS. Boundary jumps are
  0.002646 and 0.000218 full-scale. These checks detect silence/discontinuities;
  the agent cannot hear the final musical seam. Both complete loops and seam
  excerpts are on the [current listening page](playtest/2026-10-26-approved-audio/index.html).

| File | Original SHA-256 | Runtime SHA-256 |
| --- | --- | --- |
| `handshake.ogg` | `11a5d1a983a7d0d134aea3e9264acf923ca5eea0591ba722642a43724d73fd7e` | `52e97ddbd7f41873b4d9bb324b91767a6ef6f319cc50635457ff094659ca707d` |
| `crossfeed-vault.ogg` | `a248f7bd3b0260bacd3cf4eb5bc325c6b15cc359334527b9734c3d4b6ced5f99` | `7a2a43c259b95f46cc95e88ea6fb86b45a496e70eb36c1a4a76ff85145457fd6` |

Direct originals: [kuia.mp3](https://opengameart.org/sites/default/files/kuia.mp3),
[through_the_sewers_1766bpm.ogg](https://opengameart.org/sites/default/files/through_the_sewers_1766bpm.ogg).
Complete metadata is in the [runtime catalogue](../public/audio/music/catalogue.json).

PRESSURE and SWITCH still use the menu theme. Solo RELAY and CONTROL SPINE
still use `tutorial-relay.ogg` (Celestial Harmony), hash
`06557728c1d6dfd813857807f1c6fd7fe6eedfbe0ff8b0bf6a91b5b444dd69ab`.
`MusicPlayer`, scene gains, crossfades, pause/visibility, preferences and reconnect
code are unchanged. The [preservation report](playtest/2026-10-26-approved-audio/verification.json)
records before/after hashes for all runtime audio and retained playback code.

### Reproduce the current approved assets

Requires Python 3, NumPy, SciPy and FFmpeg/ffprobe. Two runs with FFmpeg
6.1.1-3ubuntu5 produced identical hashes for both tracks and the landing sample.

```sh
python3 scripts/prepare-music.py --cache /tmp/bn-approved-audio
python3 scripts/audio/build-sfx.py --cache /tmp/bn-approved-audio --effects landing.ogg
```

The music command rebuilds **only the two approved replacements**, plus separate
eight-second seam excerpts (last four seconds followed by first four, with
independent preview loudness matching). `--skip-review` omits those excerpts.
It requires the committed seven-track catalogue and verifies the preserved five
files before and after processing, without rewriting them or their metadata.
`--output` and `--review-dir` can redirect outputs. The SFX command above explicitly
rebuilds **landing only**. Its current default builds the separately human-selected
Victory recording, documented in [audio credits](../AUDIO_CREDITS.md).
The runtime does not load any review artifacts.

## Historical initial selection (superseded for HANDSHAKE and CROSSFEED)

The following initial six-track record and its montage are retained as history.
Its totals, two replaced scene assignments, runtime hashes and command-line
options describe the initial export; use the human-approved section above for the
current seven-track catalogue and targeted generator command.

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

## Historical human-feedback refinement — 2026-10-26

This records commit `c865475` before the user's explicit Kuia/Through the Sewers
selections. Its files, measurements and reproduction behavior are historical;
the current generator and catalogue follow the human-approved section above.

Human playtesting approved the menu and the RACE CONDITION, DEADLOCK and USE
AFTER FREE choices. The first two co-op tracks needed a more continuous
**drum/bass groove**: accessible techno for HANDSHAKE and a stronger mid-speed
pulse for CROSSFEED VAULT. The original HANDSHAKE track fits tutorial RELAY and
is retained there unchanged. This revision changes those two co-op recordings
only. It does not infer that genre labels or a higher BPM by themselves satisfy
the feedback.

### Selection evidence and its limits

Seven additional original-source CC0 candidates from five credited artists were
downloaded and decoded, beyond the original vitalezzz selections. Original
submission pages, linked downloads and license declarations were checked on
**2026-10-26**. [Candidate analysis](playtest/2026-10-26-audio-refinement/candidate-analysis.json)
records full download hashes and each eight-second window's measurements.

The analysis separates likely transient energy from sustained energy with a
median-filter harmonic/percussive mask, then counts positive envelope attacks
in 35–180 Hz and 2–9 kHz bands. A complete eight-second window passes the pulse
continuity proxy when it has at least eight low-band and twelve high-band
attacks. The table reports the whole original, before scene edits. This method
can count synth transients as well as drums. It is **not** source separation,
instrument recognition, a measure of musical quality, or a substitute for
listening. In particular, the human-approved Algate has a lower proxy value than
many candidates; larger numbers are not automatically better music.

| Candidate and author | Percussive energy fraction | Pulse-continuous windows | Decision from structure and source description |
| --- | ---: | ---: | --- |
| [Tower Defense Theme](https://opengameart.org/content/tower-defense-theme), DST / Deceased Superior Technician | 0.324 | 100% | **HANDSHAKE.** Original describes a game loop and mellow techno. Its embedded 130 BPM tag supports bar-aligned editing; sustained attacks throughout and a longer changing arrangement support the requested accessible techno direction. Use the central body, rather than its sparse opening/outro. |
| [Kuia](https://opengameart.org/content/kuia), James Gargette / cinameng | 0.595 | 100% | **HANDSHAKE alternate.** Original identifies lo-fi techno; especially strong, regular transient energy. Its 47-second native cycle is shorter and offers less structural change, so it remains a review alternative. |
| [Return of Tower Defense Theme](https://opengameart.org/content/return-of-tower-defense-theme), DST | 0.205 | 100% | Another viable long techno loop; less transient-dominant than the selected DST recording. |
| [Jumping Cyborg](https://opengameart.org/content/t-t-free-cyberpunk-pack-2), Alexander Ehlers / tricksntraps | 0.279 | 90.9% | **CROSSFEED VAULT.** Artist filename specifies 110 BPM. Select the sustained later passage, avoiding the low-band breakdown around 96–112 s and the ending fade. Stronger relative transient energy than the retired track without relying on a faster tempo. |
| [New Factory](https://opengameart.org/content/t-t-free-cyberpunk-pack-2), Alexander Ehlers / tricksntraps | 0.357 | 93.8% | **CROSSFEED alternate.** 129 BPM in the original filename; very regular high-band attacks. Review edit excludes the bass-light passage around 32–40 s and ending fade. It is faster and the retained passage shorter than the selected 110 BPM recording. |
| [Technological Messup](https://opengameart.org/content/technological-messup), Centurion_of_war | 0.329 | 100% | Viable loop, but low-band 95th-percentile attack gap is 0.755 s versus 0.546 s for Jumping Cyborg; the creator's combat/boss framing is a less direct fit for the intended mid-speed puzzle direction. |
| [City Loop](https://opengameart.org/content/city-loop-0), wipics | 0.213 | 100% | Viable upbeat electronic alternative; its 56-second cycle and less transient-dominant structure offer less benefit for this specific revision. |

The retired HANDSHAKE measured **0.106 / 84.2%** and retired CROSSFEED
**0.176 / 95.2%** under the same whole-file proxy. The selected edits must retain
continuous low/high attacks after trimming; those final-file measurements are
recorded in the review manifest and runtime catalogue. The intended increase is
in sustained rhythm prominence, not a simple BPM increase.

The **final decoded HANDSHAKE edit** measures 0.305 transient energy and **100%**
pulse-continuous complete windows; **final CROSSFEED** measures 0.252 and **100%**.
These are relative-energy and continuity improvements over the retired files,
with no claim that the proxy establishes subjective groove quality.

No acoustic-perception facility became available during this refinement. The
agent has **not** claimed to hear, prefer or subjectively approve these new
tracks. The choices remain a structural recommendation shaped by human feedback.
The supplied comparisons make the remaining listening judgment concrete.

### Prior runtime edits and provenance

All seven runtime files remain stereo 44.1 kHz Ogg Vorbis. Common mastering for
the two replacements is unchanged: 28 Hz high-pass, 14 kHz low-pass, constant
gain to approximately −23 LUFS, 128-sample cyclic de-click on each side before
and after filtering, Vorbis quality 4. No new notes, tempo changes or dynamic
compression were introduced.

| Runtime file | Recording | Duration | LUFS-I | True peak | Bytes |
| --- | --- | ---: | ---: | ---: | ---: |
| `menu.ogg` | Claimed by the Void — preserved | 195.000 s | -23.06 | -11.84 dBTP | 2,808,275 |
| `handshake.ogg` | Tower Defense Theme — new | 147.692 s | -23.04 | -7.94 dBTP | 2,214,254 |
| `crossfeed-vault.ogg` | Jumping Cyborg — new | 122.182 s | -23.06 | -10.14 dBTP | 1,912,829 |
| `race-condition.ogg` | Hyperton — preserved | 96.000 s | -23.01 | -9.29 dBTP | 1,566,283 |
| `deadlock.ogg` | Algate — preserved | 120.945 s | -22.99 | -8.38 dBTP | 1,608,353 |
| `use-after-free.ogg` | Neural Malfunction — preserved | 152.920 s | -23.11 | -9.11 dBTP | 2,240,300 |
| `tutorial-relay.ogg` | Celestial Harmony — exact former HANDSHAKE | 155.077 s | -23.07 | -10.49 dBTP | 2,414,397 |

**Total: 14,764,691 bytes**, below the existing 18 MB limit. The two new loops
are extended 148/122-second passages, not short drum fragments repeated to
inflate their durations.

- HANDSHAKE takes source samples `[1303751, 8142643)` and overlaps 325,662
  samples at the circular seam. These are bars 16–100 at the embedded 130 BPM,
  with a 1,105-sample MP3 start offset and a four-bar overlap. Result: 6,513,230
  samples. Constant gain: −10.33 dB.
- CROSSFEED takes source samples `[5003345, 10776436)` (approximately
  113.455–244.364 s) and overlaps 384,873 samples, four bars at the supplied
  110 BPM. Result: 5,388,218 samples. Constant gain: −14.25 dB.
- Tutorial RELAY is a byte-for-byte file copy of the old HANDSHAKE, with its
  full original source/processing/hash metadata preserved under the new scene.
  The original embedded title is deliberately retained too; there is no
  re-encoding just to rename that tag.

| Role | Original download SHA-256 | Exact download |
| --- | --- | --- |
| New HANDSHAKE | `07cc9cd797c8ea6738b1bd740526f2610fd2ec0115774294ebda3a5ed8e62a30` | [DST-TowerDefenseTheme_1.mp3](https://opengameart.org/sites/default/files/DST-TowerDefenseTheme_1.mp3) |
| New CROSSFEED | `7d768754fc82f5b41a6a33c682d3572b6824f3b69d95d080f6386c7fd2a25696` | [jumping_cyborg_110bpm.ogg](https://opengameart.org/sites/default/files/jumping_cyborg_110bpm.ogg) |
| HANDSHAKE alternate | `11a5d1a983a7d0d134aea3e9264acf923ca5eea0591ba722642a43724d73fd7e` | [kuia.mp3](https://opengameart.org/sites/default/files/kuia.mp3) |
| CROSSFEED alternate | `3365dd3d25697a54e843678d75f49732cd0bc88bfd3ccb574b39f0ed65fa7291` | [new_factory_129bpm_0.ogg](https://opengameart.org/sites/default/files/new_factory_129bpm_0.ogg) |

Each original page explicitly selects [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
The Cyberpunk pack credits Alexander Ehlers, Kuia credits James Gargette, and
the DST MP3 embeds the expanded artist name Deceased Superior Technician. Those
credits and provenance remain even though CC0 does not require attribution.
Original downloads stay in the external cache, outside the shipped bundle.

| Runtime verification | SHA-256 |
| --- | --- |
| New HANDSHAKE | `71795cfc2d7970b27a4136f3c2621a85bc624056e7cd76a2ea5edcddfde1ad02` |
| New CROSSFEED | `6615826a5e2a29d685a52e643ab55a6f732e082ea7c4bf3e5daa728a143e0886` |
| Tutorial RELAY = old HANDSHAKE | `06557728c1d6dfd813857807f1c6fd7fe6eedfbe0ff8b0bf6a91b5b444dd69ab` |

The four approved hashes remain the same as in the historical table. Their
files and complete metadata entries are preserved, not regenerated. Both new
OGGs have zero 100 ms windows below −60 dBFS. Their decoded last/first sample
jumps are 0.000114 and 0.001823 full-scale respectively. Two runs using the
recorded FFmpeg version produced identical replacement hashes. These checks
cover file integrity, gaps and discontinuities; humans should judge the actual
musical seam using the preview controls.

### Targeted reproduction and A/B listening

The generator at `c865475` required Python 3, NumPy, SciPy and FFmpeg/ffprobe:

```sh
python3 scripts/prepare-music.py
```

Its default rebuilds **only HANDSHAKE and CROSSFEED**, then the review excerpts.
It validates hard-pinned hashes for the approved four and preserved tutorial
before and after processing, and verifies their metadata remains unchanged.
It will copy the old HANDSHAKE to tutorial RELAY only during an initial
migration when the known old bytes still exist; otherwise it asks for the
committed preserved file. It never recreates approved tracks. `--skip-review`
limits the command to the two runtime replacements. `--cache`, `--output` (an
existing catalogue with approved assets) and `--review-dir` are supported;
the old `--review` montage option belongs only to the historical export.

The [listening page](playtest/2026-10-26-audio-refinement/index.html) offers old,
new and alternate for each chamber. Every body clip is **24 seconds**, and every
seam clip is **four seconds from the end followed by four from the start** of
its corresponding full loop. Each clip is independently normalized to about
−23 LUFS, with 15 ms start/end fades only at the outer preview boundaries.
There is no fade inserted at the middle of the seam demonstration. Full source
or edited-loop positions, normalization gain, final measured loudness, licenses,
hashes and per-window pulse analyses are in the
[review manifest](playtest/2026-10-26-audio-refinement/manifest.json).

The old CROSSFEED baseline is reconstructed only in a temporary directory and
its full encoded SHA is checked against the retired asset. The old HANDSHAKE
baseline reads the unchanged tutorial file. The Kuia alternative retains the
author-supplied short loop; the New Factory alternative uses bars 24–68 at
129 BPM with a four-bar cyclic overlap (74.419 s). Neither alternate ships in
the runtime music directory. [Original metadata for the retired pair](playtest/2026-10-26-audio-refinement/previous-assets.json)
remains available, and the historical six-track montage is not overwritten.
