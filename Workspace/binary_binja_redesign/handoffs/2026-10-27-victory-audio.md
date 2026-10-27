# Selected Victory recording — 2026-10-27

Implemented the user's explicitly selected **Victory.mp3 by SRG774** from the
CC0 [Dark Sci-Fi Audio Pack](https://opengameart.org/content/dark-sci-fi-audio-pack).
Fetched main before starting; base `60c04fcddf519b452d9eb9d56ae754ecc6fb6dce`.

- Original: https://opengameart.org/sites/default/files/victory_4.mp3 (235,101 bytes).
- Source SHA-256: `208916af7b2b26ee70171a964595ace1ccaf4534abfbfa816d340179e13fe289`.
- Runtime `public/audio/room-complete.ogg` SHA-256: `2a407d2107124ff7e7bae23b8d1228311a77f43028b24a7695781a28e6f1d743`.
- Complete original stereo recording: 259,200 samples/channel at 44.1 kHz,
  5.877551 s, 70,464 output bytes. Constant +11.274436 dB gain and Vorbis q4 only;
  no synthesis, EQ, compression, pitch changes, trimming or rearrangement.
- Final measurements: −21.16 LUFS / −8.19 dBTP. Existing cue gain 0.65 and default
  Effects 65% give approximately −28.64 LUFS / −15.67 dBTP in game.
- Duck uses the actual loaded AudioBuffer duration, rounded up to milliseconds
  (5.888 s in the tested 48 kHz browser), then the unchanged 450 ms music return.
  A 5.878 s fallback matches the file duration. This accounts for codec padding.

The original source page explicitly dedicates the pack to CC0; checked on
2026-10-27. Attribution is optional; artist/source credits are retained. Original
masters stay outside the game bundle. `scripts/audio/build-sfx.py` now defaults
to this recording; two runs produced identical output hashes. The rejected
synthesised-chord generator is removed. Earlier review artifacts remain historical.

Validation: **56 focused unit tests**, typecheck, production build/native bundle
audit and **53 real-browser checks** passed. Real carry/jump/exit input completed
solo PRESSURE; two independent profiles physically solved HANDSHAKE. Both clients
played the cue once; a completed-party reconnect did not replay it. The complete
decoded stereo duration, duck return, mute, background suspension and failed-asset
isolation were checked. Previous landing/plate/lever and music checks still pass.

All **20 other effect files and seven music files** are hash-identical, including
the approved landing, Kuia and Through the Sewers. Their catalogue records and
gains, lever presentation and streaming music player are unchanged. No controller,
physics, networking, save or completion-authority semantics changed.

Authoritative provenance and mix details: `AUDIO_CREDITS.md`,
`public/audio/credits.json`, `docs/audio-design.md`. Full preservation hashes and
browser evidence: `docs/playtest/2026-10-27-victory-audio/verification.json` and
`browser-checks.txt`. Open that directory's `index.html` for a full-length preview
at default runtime Effects gain. The user supplied the listening judgment;
agent validation covers licensing, signal measurements and actual playback behavior.

Normal main push triggers the existing CI-gated Fly deployment; its outcome is
reported in the final delivery. Unrelated local changes and existing handoff
removals are excluded from this commit.
