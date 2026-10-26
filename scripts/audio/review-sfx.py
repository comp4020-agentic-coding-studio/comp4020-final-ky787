#!/usr/bin/env python3
"""Create a labeled before/after audition montage from shipped effects (FFmpeg required)."""
import array
import html
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'docs/playtest/2026-10-26-audio'
RATE = 44100
MASTER = .65
# Each event is (offset seconds, file, runtime gain, runtime playback rate).
SECTIONS = [
    ('Previous generic confirmation / completion', [(0, 'confirm.ogg', .5, 1)]),
    ('New switch: short mechanical click', [(0, 'switch-click.ogg', .48, 1)]),
    ('New latch: low rising pulse', [(0, 'latch-confirm.ogg', .5, 1)]),
    ('New checkpoint: short two-tone confirmation', [(0, 'checkpoint.ogg', .48, 1)]),
    ('New breakpoint: deployment, then flag confirmation at 1.2s', [(0, 'breakpoint-deploy.ogg', .5, 1), (1.2, 'breakpoint-confirm.ogg', .54, 1)]),
    ('New room completion: rising 8-bit phrase', [(0, 'room-complete.ogg', .65, 1)]),
    ('Previous simultaneous switch / code / relay activation', [(0, 'confirm.ogg', .32, 1.15), (0, 'firewall-open.ogg', .32 * .75, 1), (0, 'relay-on.ogg', .6, 1)]),
    ('New simultaneous switch / relay activation (one machinery cue)', [(0, 'switch-click.ogg', .48, 1), (0, 'relay-on.ogg', .36, 1)]),
    ('New isolated code activation', [(0, 'code-power.ogg', .3 * .75, 1)]),
    ('Unchanged grapple fire / attach', [(0, 'grapple-fire.ogg', .38, 1), (.45, 'grapple-attach.ogg', .55, 1)]),
    ('Unchanged cube pickup / drop / plate', [(0, 'metal-touch.ogg', .45, 1.2), (.65, 'metal-touch.ogg', .55, .85), (1.3, 'metal-touch.ogg', .65 * .8, 1)]),
]


def decode(name, speed):
    path = ROOT / 'public/audio' / name
    filters = f'aformat=channel_layouts=mono,aresample={RATE},asetrate={round(RATE * speed)},aresample={RATE}'
    data = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-af', filters, '-f', 'f32le', '-'])
    result = array.array('f')
    result.frombytes(data)
    return result


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    montage = array.array('f', [0.0] * round(.4 * RATE))
    timings = []
    for title, events in SECTIONS:
        start = len(montage) / RATE
        section = array.array('f')
        for offset, name, gain, speed in events:
            samples = decode(name, speed)
            index = round(offset * RATE)
            section.extend([0.0] * max(0, index + len(samples) - len(section)))
            for i, sample in enumerate(samples):
                section[index + i] += sample * gain * MASTER
        end = start + len(section) / RATE
        timings.append({'title': title, 'startSeconds': round(start, 3), 'endSeconds': round(end, 3),
                        'events': [{'offsetSeconds': offset, 'file': name, 'gain': gain, 'rate': speed} for offset, name, gain, speed in events]})
        montage.extend(section)
        montage.extend([0.0] * round(.8 * RATE))
    peak = max(abs(n) for n in montage)
    if peak >= 1:
        raise ValueError('The review mix clips; do not normalize away the runtime-level comparison.')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', '-',
                    '-c:a', 'libvorbis', '-q:a', '5', '-fflags', '+bitexact', '-flags:a', '+bitexact', str(OUTPUT / 'sfx-review.ogg')], input=montage.tobytes(), check=True)
    manifest = {'effectsVolume': MASTER, 'musicIncluded': False, 'peakBeforeEncoding': round(peak, 6),
                'durationSeconds': round(len(montage) / RATE, 3), 'sections': timings,
                'reviewStatus': 'Playable artifact and signal measurements; no claim of perceptual listening by the coding agent.'}
    (OUTPUT / 'sfx-review.json').write_text(json.dumps(manifest, indent=2) + '\n')
    rows = ''.join(f'<tr><td><button data-start="{item["startSeconds"]}">{item["startSeconds"]:.2f}s</button></td><td>{html.escape(item["title"])}</td></tr>' for item in timings)
    (OUTPUT / 'sfx-review.html').write_text(f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Binary Ninja — sound effect review</title><style>body{{max-width:850px;margin:40px auto;padding:0 20px;background:#091420;color:#e4f3fa;font:16px/1.6 system-ui}}h1{{color:#64e6d5}}audio{{width:100%}}table{{width:100%;border-collapse:collapse}}td{{padding:9px;border-bottom:1px solid #294251}}button{{color:#64e6d5;background:#142634;border:1px solid #365868;padding:6px;cursor:pointer}}small{{color:#a1b7c9}}</style>
<h1>Binary Ninja / SFX review</h1><p>Before/after cues at the default 65% Effects level. Breakpoint confirmation follows deployment at the existing 1.2-second flag timing. Music is omitted so the effects remain easy to compare.</p>
<audio id="review" controls preload="metadata" src="sfx-review.ogg"></audio><table><thead><tr><th>Play from</th><th>Sequence</th></tr></thead><tbody>{rows}</tbody></table>
<p><small>This playable montage supports human listening review. The coding agent verified source licenses, samples, levels and in-game cue behavior; it cannot claim a perceptual audition from those checks.</small></p>
<script>document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>{{const audio=document.querySelector('#review');audio.currentTime=Number(button.dataset.start);audio.play().catch(()=>{{}})}}));</script></html>''')
    print('Review:', OUTPUT / 'sfx-review.html', '| duration:', manifest['durationSeconds'], '| peak:', peak)


if __name__ == '__main__':
    main()
