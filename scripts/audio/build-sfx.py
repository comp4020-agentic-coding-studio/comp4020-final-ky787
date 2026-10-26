#!/usr/bin/env python3
"""Rebuild the two refined SFX from pinned original CC0 archives.

Requires Python 3 and FFmpeg. Existing grapple, cube, plate and other retained
assets are never rewritten. Pass --effects for specific additions or --all to
explicitly rebuild all seven additions. Downloads stay in the supplied cache.
"""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
PACKS = {
    'sci-fi-sounds': ('6b296f9ecf-1677589334', '119340f351a5098ad814f78719438c0da355a9ce8a4c8a3af6a8d48aa3d49e04'),
    'interface-sounds': ('fa43c1dd4d-1677589452', 'f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232'),
    'music-jingles': ('f37e530b9e-1677590399', 'b729ba57959bd58793d2c5cafa348aaf2655d354f3da35ec4729e03ec77197b8'),
}
# name, pack, original path inside archive, processing before peak trim, target dBFS.
EFFECTS = [
    ('switch-click.ogg', 'interface-sounds', 'Audio/toggle_001.ogg',
     'asetrate=28665,aresample=44100,atrim=end=0.20,highpass=f=100,lowpass=f=1400,lowpass=f=1400,afade=t=in:d=0.008,afade=t=out:st=0.12:d=0.08', -10),
    ('latch-confirm.ogg', 'interface-sounds', 'Audio/maximize_006.ogg',
     'highpass=f=70,lowpass=f=1800,afade=t=in:d=0.006,afade=t=out:st=0.31:d=0.07', -8),
    ('checkpoint.ogg', 'interface-sounds', 'Audio/confirmation_001.ogg',
     'highpass=f=70,lowpass=f=1800,afade=t=in:d=0.005,afade=t=out:st=0.23:d=0.06', -8),
    ('breakpoint-deploy.ogg', 'sci-fi-sounds', 'Audio/doorOpen_002.ogg',
     'asetrate=36162,aresample=44100,highpass=f=60,lowpass=f=1800,afade=t=in:d=0.008,afade=t=out:st=0.55:d=0.10', -8),
    ('breakpoint-confirm.ogg', 'interface-sounds', 'Audio/confirmation_004.ogg',
     'asetrate=37485,aresample=44100,highpass=f=70,lowpass=f=2200,afade=t=in:d=0.006,afade=t=out:st=0.48:d=0.09', -8),
    ('room-complete.ogg', 'interface-sounds', 'Audio/confirmation_002.ogg',
     'highpass=f=70,lowpass=f=1500,afade=t=in:d=0.015,afade=t=out:st=1.48:d=0.07', -8),
    ('code-power.ogg', 'sci-fi-sounds', 'Audio/forceField_001.ogg',
     'atrim=end=0.8,highpass=f=55,lowpass=f=2000,afade=t=in:d=0.015,afade=t=out:st=0.65:d=0.15', -9),
]
REFINED = ('switch-click.ogg', 'room-complete.ogg')


def digest(data):
    return hashlib.sha256(data).hexdigest()


def pcm(path, filters=None):
    command = ['ffmpeg', '-v', 'error', '-i', str(path)]
    if filters:
        command += ['-af', filters]
    data = subprocess.check_output(command + ['-f', 'f32le', '-ac', '1', '-ar', '44100', '-'])
    samples = array.array('f')
    samples.frombytes(data)
    return samples


def completion_chord(source, destination):
    """Resample one CC0 tone cycle; never retain the source's rising melody.

    Use the first complete upward-zero-crossing cycle after source time .012 s.
    Its exact fractional-sample bounds are recorded in the credits. Three voices
    sound together at 220/330/495 Hz (root, fifth, ninth; no major third), with a
    soft attack and a fading tail. Two quiet 75 ms accents supply the digital
    flourish. All voices use the same source cycle, not additional recordings.
    """
    samples = pcm(source)
    crossings = [index - samples[index] / (samples[index + 1] - samples[index])
                 for index in range(round(.012 * 44100), round(.030 * 44100))
                 if samples[index] <= 0 < samples[index + 1]]
    if len(crossings) < 2:
        raise ValueError('Expected stable source tone was not found')
    start, end = crossings[:2]
    source_peak = max(abs(samples[index]) for index in range(math.floor(start), math.ceil(end) + 1))

    def wave(phase):
        position = start + phase % 1 * (end - start)
        index = math.floor(position)
        value = samples[index] + (samples[index + 1] - samples[index]) * (position - index)
        # Gentle saturation adds low harmonics without a sharp square-wave edge.
        return math.tanh(1.15 * value / source_peak) / math.tanh(1.15)

    result = array.array('f')
    duration = 1.55
    for index in range(round(duration * 44100)):
        time = index / 44100
        attack = min(1, time / .055)
        attack = attack * attack * (3 - 2 * attack)
        release = min(1, max(0, (duration - time) / .65))
        release = release * release * (3 - 2 * release)
        envelope = attack * math.exp(-.85 * time) * release
        chord = sum(gain * wave(time * frequency) for frequency, gain in [(220, .63), (330, .24), (495, .13)])
        accent = 0
        for offset, frequency, gain in [(.11, 660, .055), (.205, 880, .04)]:
            local = (time - offset) / .075
            if 0 < local < 1:
                accent += gain * math.sin(math.pi * local) ** 2 * wave((time - offset) * frequency)
        result.append(envelope * chord + accent)
    # FFmpeg encodes this deterministic PCM intermediate, then applies the exact
    # mastering chain recorded with the output. Keep all intermediates in cache.
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', '44100', '-ac', '1',
                    '-i', '-', '-c:a', 'pcm_f32le', str(destination)], input=result.tobytes(), check=True)
    return {'method': 'One-cycle resampling of the original CC0 tone; mild tanh saturation; simultaneous open-fifth/add9 chord; two quiet digital accents.',
            'sourceCycleStartSample': start, 'sourceCycleEndSample': end,
            'chordFrequenciesHz': [220, 330, 495], 'chordGains': [.63, .24, .13],
            'durationSeconds': duration, 'attackSeconds': .055, 'releaseSeconds': .65,
            'exponentialDecayPerSecond': .85, 'saturation': 1.15,
            'accents': [{'offsetSeconds': .11, 'frequencyHz': 660, 'gain': .055, 'durationSeconds': .075},
                        {'offsetSeconds': .205, 'frequencyHz': 880, 'gain': .04, 'durationSeconds': .075}]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path('/tmp/bn-sound-overhaul'))
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument('--effects', nargs='+', choices=[effect[0] for effect in EFFECTS])
    selection.add_argument('--all', action='store_true', help='Explicitly rebuild all seven additions')
    args = parser.parse_args()
    selected = set(effect[0] for effect in EFFECTS) if args.all else set(args.effects or REFINED)
    effects = [effect for effect in EFFECTS if effect[0] in selected]
    args.cache.mkdir(parents=True, exist_ok=True)
    output = ROOT / 'public/audio'
    credits_path = output / 'credits.json'
    credits = json.loads(credits_path.read_text())
    packs = {}
    archives = {}
    for pack, (version, expected) in PACKS.items():
        if pack not in {effect[1] for effect in effects}:
            continue
        url = f'https://kenney.nl/media/pages/assets/{pack}/{version}/kenney_{pack}.zip'
        archive = args.cache / f'{pack}.zip'
        if not archive.exists():
            archive.write_bytes(urllib.request.urlopen(url, timeout=60).read())
        data = archive.read_bytes()
        if digest(data) != expected:
            raise ValueError(f'Original {pack} archive hash changed; review its provenance before rebuilding.')
        archives[pack] = zipfile.ZipFile(archive)
        license_bytes = archives[pack].read('License.txt')
        if b'CC0' not in license_bytes:
            raise ValueError(f'{pack} has no expected CC0 dedication')
        license_file = {'sci-fi-sounds': 'Kenney-License.txt', 'interface-sounds': 'Kenney-Interface-License.txt',
                        'music-jingles': 'Kenney-Music-Jingles-License.txt'}[pack]
        if not (output / license_file).exists():
            (output / license_file).write_bytes(license_bytes)
        packs[pack] = {'page': f'https://kenney.nl/assets/{pack}', 'archive': url,
                       'archiveSha256': expected, 'licenseFile': license_file,
                       'sourceLicenseSha256': digest(license_bytes), 'verified': '2026-10-26'}
    new_assets = []
    for name, pack, original, chain, target in effects:
        source_bytes = archives[pack].read(original)
        source = args.cache / pack / original
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_bytes(source_bytes)
        arrangement = None
        if name == 'room-complete.ogg':
            arranged = args.cache / 'refined-completion-chord.wav'
            arrangement = completion_chord(source, arranged)
            source = arranged
        base = 'aformat=channel_layouts=mono,aresample=44100,' + chain
        samples = pcm(source, base)
        peak_db = 20 * math.log10(max(abs(n) for n in samples))
        adjustment = target - peak_db
        filters = base + f',volume={adjustment:.6f}dB'
        destination = output / name
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-af', filters,
                        '-c:a', 'libvorbis', '-q:a', '4', '-ar', '44100', '-ac', '1',
                        '-fflags', '+bitexact', '-flags:a', '+bitexact', str(destination)], check=True)
        data = destination.read_bytes()
        decoded = pcm(destination)
        asset = {'file': name, 'original': original, 'author': 'Kenney',
                           'source': packs[pack]['page'], 'download': packs[pack]['archive'],
                           'pack': pack, 'license': 'CC0-1.0', 'retrieved': '2026-10-26',
                           'sourceSha256': digest(source_bytes), 'sourceArchiveSha256': packs[pack]['archiveSha256'],
                           'processing': filters + '; 44.1kHz mono Vorbis q4; FFmpeg bitexact flags.',
                           'targetPeakDbfs': target, 'decodedPeakDbfs': round(20 * math.log10(max(abs(n) for n in decoded)), 3),
                           'durationSeconds': round(len(decoded) / 44100, 6),
                           'sha256': digest(data), 'bytes': len(data)}
        if arrangement:
            asset['arrangement'] = arrangement
            asset['processing'] = 'Cycle resampling and chord arrangement specified in arrangement and scripts/audio/build-sfx.py; ' + asset['processing']
        new_assets.append(asset)
        print(name, len(data), 'bytes,', round(len(decoded) / 44100, 3), 'seconds')
    replacements = {asset['file']: asset for asset in new_assets}
    credits['assets'] = [replacements.pop(asset['file'], asset) for asset in credits['assets']] + list(replacements.values())
    credits['updated'] = '2026-10-26'
    credits.setdefault('sourcePacks', {}).update(packs)
    credits_path.write_text(json.dumps(credits, indent=2) + '\n')
    print('Credited files:', len(credits['assets']), 'Runtime files:', sum(asset.get('runtime', True) for asset in credits['assets']))


if __name__ == '__main__':
    main()
