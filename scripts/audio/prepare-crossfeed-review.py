#!/usr/bin/env python3
"""Review-only CC0 candidates. Never writes runtime music or its catalogue.

Requires Python 3 and FFmpeg. Sources are hash-pinned; previews retain each short
author loop with a 350 ms cyclic overlap, constant loudness gain, and no limiting.
"""
import argparse
import array
import hashlib
import html
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
RATE = 44100
CROSSFADE = 0.35
SOURCES = [
    ('shadow-dark', 'Shadow / dark', 'shadow-2', 'shadow_dark_0.mp3', '66d80d7bde892f04bbc871b129bc27c016acd2f168d4a79aef754dfa2a884636'),
    ('shadow-light', 'Shadow / light', 'shadow-2', 'shadow_light_0.mp3', '899227be94d8ba78c833327a738a883ca360560327e72f4ec71dd2f10a4e9007'),
    ('shadow-original', 'Shadow / original', 'shadow-2', 'shadow_0.mp3', 'e76a74cd3e163d349ce64d7ee4e0567c5711c8234afc9c5dc5a8b4421e9f4004'),
    ('pynchon', 'PYNCHON', 'pynchon', 'pynchon.mp3', '295bc30016587d909a8b1d494cc7fb13550f5c74807221e9eb0eb9f2769d4e3b'),
    ('loaben', 'Loaben', 'loaben', 'loaben_3.mp3', '9fdc98717a1e40393e79d44e177c7ebb13ff07663985ddf67cd157460bf6cd7c'),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decode(path):
    data = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(RATE), '-ac', '2', '-f', 'f32le', '-'])
    samples = array.array('f')
    samples.frombytes(data)
    return samples


def measure(path):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af',
                             'loudnorm=I=-23:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, check=True)
    log = result.stderr.decode()
    values = json.loads(log[log.rfind('{'):])
    return {name: float(values[key]) for name, key in
            [('integratedLufs', 'input_i'), ('truePeakDbtp', 'input_tp'), ('loudnessRangeLu', 'input_lra')]}


def encode(samples, target, gain=0):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(RATE), '-ac', '2', '-i', '-',
                    '-af', f'volume={gain}dB', '-c:a', 'libvorbis', '-q:a', '5', '-fflags', '+bitexact', '-flags:a', '+bitexact',
                    str(target)], input=samples.tobytes(), check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=ROOT / '.workbench/audio-crossfeed-review')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/playtest/2026-10-27-crossfeed-listening')
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    before = {p.name: sha(p) for p in (ROOT / 'public/audio/music').iterdir() if p.is_file()}
    tracks = []
    with tempfile.TemporaryDirectory(prefix='bn-crossfeed-review-') as temporary:
        for slug, title, page, filename, expected in SOURCES:
            source = args.cache / filename
            url = 'https://opengameart.org/sites/default/files/' + filename
            if not source.exists():
                with urllib.request.urlopen(url) as response:
                    source.write_bytes(response.read())
            if sha(source) != expected:
                raise ValueError('Source bytes changed: ' + filename)
            samples = decode(source)
            frames = round(CROSSFADE * RATE)
            overlap = frames * 2
            # Rotate the start beyond the overlap, then blend the source tail into
            # its head. At wrap, adjacent original samples meet; no silence/fadeout.
            loop = samples[overlap:-overlap]
            for frame in range(frames):
                t = frame / (frames - 1)
                mix = t * t * (3 - 2 * t)
                for channel in range(2):
                    index = frame * 2 + channel
                    loop.append(samples[len(samples) - overlap + index] * (1 - mix) + samples[index] * mix)
            wav = Path(temporary) / 'loop.wav'
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(RATE), '-ac', '2', '-i', '-',
                            '-c:a', 'pcm_f32le', str(wav)], input=loop.tobytes(), check=True)
            source_levels = measure(wav)
            gain = -23 - source_levels['integratedLufs']
            if source_levels['truePeakDbtp'] + gain > -1:
                raise ValueError('Loudness match would require limiting: ' + title)
            target = args.output / (slug + '.ogg')
            encode(loop, target, gain)
            levels = measure(target)
            if abs(levels['integratedLufs'] + 23) > .2 or levels['truePeakDbtp'] >= -1:
                raise ValueError('Preview loudness/peak verification failed: ' + title)
            decoded = decode(target)
            # An explicit tail -> head audition also works on players with loop latency.
            seam = decoded[-4 * RATE * 2:] + decoded[:4 * RATE * 2]
            encode(seam, args.output / (slug + '-seam.ogg'))
            tracks.append({'id': slug, 'title': title, 'author': 'James Gargette (cinameng)',
                           'source': 'https://opengameart.org/content/' + page, 'download': url,
                           'license': 'CC0-1.0', 'sourceSha256': expected, 'file': target.name, 'sha256': sha(target),
                           'sourceDurationSeconds': len(samples) / (RATE * 2), 'durationSeconds': len(decoded) / (RATE * 2),
                           'cyclicOverlapSeconds': CROSSFADE, 'constantGainDb': round(gain, 2), **levels,
                           'decodedBoundaryJump': max(abs(decoded[channel] - decoded[-2 + channel]) for channel in range(2)),
                           'seamFile': slug + '-seam.ogg'})
    reference = args.output / 'algate-reference.ogg'
    shutil.copyfile(ROOT / 'public/audio/music/deadlock.ogg', reference)
    manifest = {'reviewDate': '2026-10-27', 'status': 'Awaiting human listening approval; CROSSFEED unchanged',
                'licenseUrl': 'https://creativecommons.org/publicdomain/zero/1.0/',
                'processing': 'Complete short source loops with 350 ms smooth cyclic tail/head overlap; constant gain to -23 LUFS; stereo 44.1 kHz Vorbis q5. No EQ, compression, limiting, tempo change or added notes. Seam excerpts are the last four seconds followed by the first four.',
                'reference': {'file': reference.name, 'title': 'Algate / approved DEADLOCK master',
                              'source': 'https://opengameart.org/content/algate', 'sha256': sha(reference), **measure(reference)},
                'playerVolume': .25, 'candidates': tracks, 'preservedRuntimeHashes': before,
                'reviewMethod': 'Source research and signal checks, not a perceptual audition. Human review must judge repetition, intensity and musical seams.'}
    after = {p.name: sha(p) for p in (ROOT / 'public/audio/music').iterdir() if p.is_file()}
    if before != after:
        raise ValueError('Runtime soundtrack changed during review preparation')
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    rows = ''.join(f'''<article><h2>{html.escape(track['title'])}</h2>
<p>{track['durationSeconds']:.2f} s · {track['integratedLufs']:.2f} LUFS · <a href="{track['source']}">CC0 source</a></p>
<audio controls loop preload="metadata" src="{track['file']}"></audio>
<details><summary>Eight-second loop seam (wrap at 4 s)</summary><audio controls preload="none" src="{track['seamFile']}"></audio></details></article>''' for track in tracks)
    (args.output / 'index.html').write_text(f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Binary Ninja — CROSSFEED listening comparison</title><style>
body{{max-width:900px;margin:32px auto;padding:0 20px;background:#0c1720;color:#e4f1f5;font:16px/1.5 system-ui}}h1,h2,a{{color:#64e6d5}}h2{{font-size:20px;margin:0}}article{{background:#152732;border:1px solid #365365;border-radius:12px;padding:18px;margin:16px 0}}audio{{width:100%;margin:6px 0}}summary{{cursor:pointer}}p{{margin:8px 0 14px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0 16px}}label{{display:flex;align-items:center;gap:12px;flex-wrap:wrap}}small{{color:#a6bdc9}}
</style><h1>CROSSFEED / listening comparison</h1>
<p>Awaiting human selection. The game still uses <em>Through the Sewers</em>. Compare these short loops with DEADLOCK’s approved <em>Algate</em>: a restrained, steady background for a cooperative puzzle.</p>
<label>Comparison volume <input id="volume" type="range" min="0" max="1" step=".01" value=".25"><output id="value">25%</output></label>
<p><small>Common master loudness near −23 LUFS; playback starts at the new 25% music default. One recording plays at a time. Full candidate previews repeat; seam excerpts cross the join at 4 seconds.</small></p>
<article><h2>Algate / DEADLOCK reference</h2><p>Approved master, copied byte-for-byte · <a href="https://opengameart.org/content/algate">CC0 source</a></p><audio controls loop preload="metadata" src="algate-reference.ogg"></audio></article>
<div class="grid">{rows}</div>
<p>Suggested comparison: Algate, Shadow dark, Shadow light, Shadow original, Loaben, then PYNCHON. Shadow is described by its author as ambient techno; PYNCHON as a short futuristic glitch/synth loop; Loaben as a mysterious futuristic loop. These descriptions guide the order, not a listening verdict.</p>
<p>Choose by listening: Is the beat comfortable through repeated puzzle attempts? Does it leave room for conversation and effects? Does the loop join feel natural? All five previews are review edits; no candidate is approved or installed.</p>
<p><small>James Gargette (cinameng), CC0. Previews use a 350 ms cyclic overlap and constant loudness matching, without tempo changes, compression or EQ. Source hashes, processing and measurements are in <a href="manifest.json">manifest.json</a>. Signal checks do not establish subjective musical fit.</small></p>
<script>const players=[...document.querySelectorAll('audio')],volume=document.querySelector('#volume');for(const player of players){{player.volume=.25;player.addEventListener('play',()=>players.filter(other=>other!==player).forEach(other=>other.pause()));}}volume.addEventListener('input',()=>{{players.forEach(player=>player.volume=Number(volume.value));document.querySelector('#value').value=Math.round(Number(volume.value)*100)+'%';}});</script></html>''')
    print(args.output / 'index.html')
    for track in tracks:
        print(track['title'], round(track['durationSeconds'], 3), 's', track['integratedLufs'], 'LUFS', track['truePeakDbtp'], 'dBTP')


if __name__ == '__main__':
    main()
