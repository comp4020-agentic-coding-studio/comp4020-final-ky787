# CROSSFEED listening comparison — awaiting human selection

Open [the listening page](index.html). It includes the approved DEADLOCK
**Algate** master, all three **Shadow** versions, **PYNCHON**, **Loaben**, and
eight-second seam auditions (tail → head at four seconds). The candidates loop
in the player; playback starts at 25%, with only one recording playing at once.
The reference is a byte-for-byte copy of the shipped DEADLOCK track.

| Candidate | Source description / reason to compare | Preview length | Master LUFS |
| --- | --- | ---: | ---: |
| [Shadow / dark](https://opengameart.org/content/shadow-2) | Author describes the family as ambient techno; compare all variants rather than inferring intensity from the filenames | 52.29 s | −23.00 |
| [Shadow / light](https://opengameart.org/content/shadow-2) | Alternate arrangement from the same source page | 52.29 s | −22.98 |
| [Shadow / original](https://opengameart.org/content/shadow-2) | Original version from the same source page | 52.29 s | −23.01 |
| [PYNCHON](https://opengameart.org/content/pynchon) | Short futuristic loop; the author describes glitch/synth and cyberpunk influences | 32.49 s | −23.06 |
| [Loaben](https://opengameart.org/content/loaben) | Author describes a short mysterious futuristic loop | 35.54 s | −23.01 |

The three source pages identify **James Gargette / cinameng** and **CC0**.
The [Algate source](https://opengameart.org/content/algate) supplies the reference.
Suggested listening order: Algate, the Shadow variants, Loaben, then PYNCHON.
This is an order for comparison based on the source descriptions, not an acoustic
ranking. Human listening should judge steady rhythm, repetition, room for
conversation/effects, and whether the musical join feels natural over several
cycles. No candidate has been selected or installed.

Each candidate retains its short source recording with a 350 ms smooth cyclic
tail/head overlap and constant gain to approximately −23 LUFS. No tempo change,
compression, limiter, EQ or new notes are applied. Peaks remain below −8.6 dBTP;
decoded boundary steps are below 0.006 full-scale. The seam excerpts preserve
the same level. These checks catch technical faults; they do not establish
subjective fit or a musically perfect join. See [manifest.json](manifest.json)
for exact source/download URLs, source/output hashes, gains and measurements.

Rebuild with Python 3 and FFmpeg:

```sh
python3 scripts/audio/prepare-crossfeed-review.py
python3 -m http.server 8787 --directory docs/playtest/2026-10-27-crossfeed-listening
```

Then open `http://localhost:8787/`. The browser review decoded and played all
eleven files, checked every candidate's native loop wrap, exclusive playback,
25% initial volume and a 1024-pixel layout. Its [checks](browser-checks.txt) are
retained. Every runtime music file **and catalogue** was hash-checked unchanged,
including CROSSFEED's current Through the Sewers. This folder is review-only
and is not loaded by the game.
