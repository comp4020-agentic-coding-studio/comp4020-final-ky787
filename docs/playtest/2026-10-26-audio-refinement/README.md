# Audio refinement review — 2026-10-26

Open [index.html](index.html) in a browser, keeping this folder together. It uses
only local clips and needs a real click to start playback. Alternatively, from
the repository root run:

```sh
python3 -m http.server 8874 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8874/docs/playtest/2026-10-26-audio-refinement/>.
The review folder is excluded from the game build and runtime loading.

Compare previous, implemented and alternate music at the same listening volume.
Music clips are individually matched near −23 LUFS; the player applies the
unchanged default 35% Music gain. The effects A/B files already include runtime
cue gains and 65% Effects level. Switching categories adjusts the player's
volume preset; use its volume slider for headphones/speakers. Only one player
exists, so selecting another clip stops the previous one.

The six 24-second body excerpts include both retired tracks. Each also has an
eight-second loop-seam excerpt (last four seconds, first four seconds). Kuia
uses its original short loop; New Factory is a review-only 74.4-second edit.
The two short effects pairs compare previous and implemented toggle/completion.

Human playtesting supplied the preference signal for this change. The agent
verified source licences, actual recurring transient patterns rather than just
BPM/tags, encoded loudness/peaks, sample boundaries, preservation hashes and real
browser behavior. It cannot hear playback in this environment. Whether these
selections feel inviting/driving, tire the listener, or mask speech remains a
human listening judgment. Please also try the implemented tracks during actual
co-op play with spoken communication and the existing effects.

## Evidence

- [Current candidate reasoning](../../audio-selection.md#human-feedback-refinement--2026-10-26).
- [Music excerpts, source pins, processing and levels](manifest.json).
- [Seven original candidate comparisons](candidate-analysis.json).
- [Effects A/B measurements and source processing](sfx-ab.json).
- [Exact before/after preservation hashes](preservation.json).
- [42 real-browser assertions](checks.txt): two independent profiles, physical
  HANDSHAKE solve, one completion stinger, finite duck, host/guest music selection,
  both new native loops, reconnect, pause/visibility/BFCache, actual SWITCH lever
  toggles, tutorial mapping and failed-media isolation.
- [Physical HANDSHAKE route report](handshake-report.json).
- [Completion during music](03-completion-mix.png).
- [SWITCH after real lever on/off interactions](06-switch-lever-audio.png).

[24 listening-page browser assertions](review-checks.txt) passed, including all
14 clip buttons with real media playback and expected durations, evidence links,
one player/no autoplay, and 1440px/420px layouts. [Desktop](review-1440.png) and
[narrow](review-420.png) screenshots were visually inspected. HTTP preview clips
buffer on demand (one short clip at a time) so basic static hosting without byte
ranges still supports correct duration/seeking; direct local-file opening also works.

47 focused unit tests, TypeScript and production build passed. Browser lifecycle
checks use labeled synthetic visibility/blur/BFCache events; loop tests seek
media close to the end and let real native playback wrap. Gameplay progression
uses real controls, not injected puzzle state. Source masters stay outside the
repository. Full final assets live in `public/audio/`; review clips are not
additional runtime tracks.
