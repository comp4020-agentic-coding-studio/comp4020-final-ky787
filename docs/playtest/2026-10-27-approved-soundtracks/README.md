# Final approved soundtracks — 2026-10-27

The user made the final listening decisions: **Loaben for HANDSHAKE** and
**regular Shadow for CROSSFEED VAULT**, replacing Kuia and Through the Sewers.
Both are James Gargette (cinameng) CC0 recordings. The exact approved downloads
are [loaben_3.mp3](https://opengameart.org/sites/default/files/loaben_3.mp3) and
[shadow_0.mp3](https://opengameart.org/sites/default/files/shadow_0.mp3).
Their source pages are [Loaben](https://opengameart.org/content/loaben) and
[Shadow](https://opengameart.org/content/shadow-2). No alternative search or
automated selection was performed.

[Play the complete shipped masters and seam checks](index.html). To serve the
page locally, run `python3 -m http.server 8787` from the repository root and
open `/docs/playtest/2026-10-27-approved-soundtracks/` on that server.

| Scene | Complete samples/channel | Duration | LUFS-I | True peak | Runtime file |
| --- | ---: | ---: | ---: | ---: | --- |
| HANDSHAKE / Loaben | 1,582,848 | 35.892245 s | −23.01 | −9.16 dBTP | `public/audio/music/handshake.ogg` |
| CROSSFEED / regular Shadow | 2,321,280 | 52.636735 s | −23.03 | −10.83 dBTP | `public/audio/music/crossfeed-vault.ogg` |

The generator uses the full original MP3s, with constant gain and only a
128-sample de-click on each side of the wrap (5.8 ms total). No trimming,
overlap that shortens the loop, EQ, compression, pitch/tempo changes or new
arrangement. The 350 ms-overlapped review previews are not runtime sources.
Vorbis q4 encoding retains every decoded source frame and both channels.
Separate eight-second seam checks preserve runtime master level and join the
last four seconds to the first four; preview start/stop fades do not affect the
runtime files. These are technical checks of the final human choices, not a
new approval gate or a claim of agent acoustic audition.

`scripts/prepare-music.py` now pins these two original source hashes and sample
counts, writes their runtime assets/catalogue records, and generates the seam
checks here. It rejects changes to the five protected recordings. Two separate
builds with the recorded FFmpeg version produced identical masters, catalogue
and seam outputs. [verification.json](verification.json) retains source/output
hashes and the proof that all other audio files, preserved catalogue records,
runtime gains, preference handling, solo mapping and deployment workflow are
unchanged. DEADLOCK's Algate is preserved byte-for-byte.

Validation:

- 35 focused music-asset, music-player, audio-preference and HTTP-stream tests
  passed. Exact regular Shadow and Loaben identities and full sample counts are
  asserted; the five other track hashes and solo tutorial mapping remain pinned.
- TypeScript and production build passed. The existing large-chunk advisory
  remains unrelated to the audio assets.
- `pnpm check:audio` passed against the production build: independent visitors,
  both new track loops, no reload/new deck at wrap, gesture unlock, mute, saved
  levels, fades, pause/completion ducking, each other scene, solo mapping,
  byte-range playback and failed-download fallback. Its HANDSHAKE route uses
  real controls and both physical arrivals.
- The playback page loads all four recordings, verifies both full durations,
  loop wrap, one-at-a-time playback and 25% preview volume.

Logs are retained in [checks/](checks/). The [seam manifest](seams.json) describes
the preview-only files. Raw browser screenshots and snapshots remain in
`.workbench/reports/2026-10-27-approved-soundtracks/`. The earlier environmental
and pause-menu polish was already complete in `8dc02a7`; it is unchanged here.
