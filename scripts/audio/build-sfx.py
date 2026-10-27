#!/usr/bin/env python3
"""Rebuild the human-selected Victory recording from its pinned CC0 original.

Requires Python 3 and FFmpeg. Existing grapple, cube, plate and other retained
assets are never rewritten. Pass --effects for specific additions or --all to
explicitly rebuild all generator-managed effects. Downloads stay in the supplied cache.
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
    'impact-sounds': ('87b4ddecda-1677589768', '029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8'),
    'music-jingles': ('f37e530b9e-1677590399', 'b729ba57959bd58793d2c5cafa348aaf2655d354f3da35ec4729e03ec77197b8'),
}
# name, pack, original path inside archive, processing before peak trim, target dBFS.
EFFECTS = [
    ('landing.ogg', 'impact-sounds', 'Audio/impactSoft_medium_000.ogg',
     'highpass=f=35,lowpass=f=14000,afade=t=in:d=0.001,afade=t=out:st=0.10:d=0.015', -6),
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
    ('room-complete.ogg', 'dark-sci-fi-audio-pack', 'victory_4.mp3', 'anull', -8),
    ('code-power.ogg', 'sci-fi-sounds', 'Audio/forceField_001.ogg',
     'atrim=end=0.8,highpass=f=55,lowpass=f=2000,afade=t=in:d=0.015,afade=t=out:st=0.65:d=0.15', -9),
]
REFINED = ('room-complete.ogg',)
VICTORY = {
    'page': 'https://opengameart.org/content/dark-sci-fi-audio-pack',
    'download': 'https://opengameart.org/sites/default/files/victory_4.mp3',
    'sha256': '208916af7b2b26ee70171a964595ace1ccaf4534abfbfa816d340179e13fe289',
    'author': 'SRG774', 'title': 'Victory', 'original': 'Victory.mp3',
    'license': 'CC0-1.0', 'licenseUrl': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'verified': '2026-10-27',
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def pcm(path, filters=None, channels=1):
    command = ['ffmpeg', '-v', 'error', '-i', str(path)]
    if filters:
        command += ['-af', filters]
    data = subprocess.check_output(command + ['-f', 'f32le', '-ac', str(channels), '-ar', '44100', '-'])
    samples = array.array('f')
    samples.frombytes(data)
    return samples


def loudness(path):
    report = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path),
                             '-af', 'loudnorm=I=-23:TP=-3:LRA=11:print_format=json', '-f', 'null', '-'],
                            check=True, capture_output=True, text=True).stderr
    measured = json.loads(report[report.rfind('{'):])
    # Analysis only: loudnorm output is discarded; the shipped file uses constant gain.
    return {'integratedLufs': float(measured['input_i']), 'truePeakDbtp': float(measured['input_tp'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path('/tmp/bn-sound-overhaul'))
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument('--effects', nargs='+', choices=[effect[0] for effect in EFFECTS])
    selection.add_argument('--all', action='store_true', help='Explicitly rebuild all generator-managed effects')
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
                        'music-jingles': 'Kenney-Music-Jingles-License.txt', 'impact-sounds': 'Kenney-Impact-License.txt'}[pack]
        if not (output / license_file).exists():
            (output / license_file).write_bytes(license_bytes)
        packs[pack] = {'page': f'https://kenney.nl/assets/{pack}', 'archive': url,
                       'archiveSha256': expected, 'licenseFile': license_file,
                       'sourceLicenseSha256': digest(license_bytes), 'verified': '2026-10-26'}
    new_assets = []
    for name, pack, original, chain, target in effects:
        if name == 'room-complete.ogg':
            source = args.cache / original
            if not source.exists():
                source.write_bytes(urllib.request.urlopen(VICTORY['download'], timeout=60).read())
            source_bytes = source.read_bytes()
            if digest(source_bytes) != VICTORY['sha256']:
                raise ValueError('Original Victory recording hash changed; review its provenance before rebuilding.')
            channels, base = 2, chain  # Retain the original stereo image and all samples, with no EQ.
            packs[pack] = {**VICTORY, 'attributionRequired': False,
                           'verification': 'Original submission explicitly dedicates the pack to CC0 and lists Victory.mp3; its download is victory_4.mp3.'}
        else:
            source_bytes = archives[pack].read(original)
            source = args.cache / pack / original
            source.parent.mkdir(parents=True, exist_ok=True)
            source.write_bytes(source_bytes)
            channels, base = 1, 'aformat=channel_layouts=mono,aresample=44100,' + chain
        samples = pcm(source, base, channels)
        peak_db = 20 * math.log10(max(abs(n) for n in samples))
        adjustment = target - peak_db
        filters = base + f',volume={adjustment:.6f}dB'
        destination = output / name
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(source), '-af', filters,
                        '-c:a', 'libvorbis', '-q:a', '4', '-ar', '44100', '-ac', str(channels),
                        '-fflags', '+bitexact', '-flags:a', '+bitexact', str(destination)], check=True)
        data = destination.read_bytes()
        decoded = pcm(destination, channels=channels)
        victory = name == 'room-complete.ogg'
        asset = {'file': name, 'original': VICTORY['original'] if victory else original, 'author': VICTORY['author'] if victory else 'Kenney',
                           'source': packs[pack]['page'], 'download': VICTORY['download'] if victory else packs[pack]['archive'],
                           'pack': pack, 'license': 'CC0-1.0', 'retrieved': VICTORY['verified'] if victory else '2026-10-26',
                           'sourceSha256': digest(source_bytes),
                           **({} if victory else {'sourceArchiveSha256': packs[pack]['archiveSha256']}),
                           'processing': filters + f'; 44.1kHz {"stereo" if victory else "mono"} Vorbis q4; FFmpeg bitexact flags.',
                           'targetPeakDbfs': target, 'decodedPeakDbfs': round(20 * math.log10(max(abs(n) for n in decoded)), 3),
                           'durationSeconds': round(len(decoded) / (44100 * channels), 6),
                           'sha256': digest(data), 'bytes': len(data)}
        if name == 'landing.ogg':
            onset = decoded[:round(.05 * 44100)]
            asset['onsetRms50msDbfs'] = round(20 * math.log10(math.sqrt(sum(n * n for n in onset) / len(onset))), 3)
            asset['selection'] = 'Explicit human listening approval: Kenney impactSoft_medium_000.ogg; constant gain only, no compression.'
        if victory:
            assert len(decoded) == len(samples) == 259200 * 2, 'Retain the complete original stereo recording'
            asset.update({'title': VICTORY['title'], 'sourceFilename': original, 'channels': channels,
                          'sourceDecodedSamplesPerChannel': len(samples) // channels,
                          'decodedSamplesPerChannel': len(decoded) // channels,
                          'fullOriginalRecording': True, 'dynamicCompression': False,
                          'constantGainDb': round(adjustment, 6), 'licenseUrl': VICTORY['licenseUrl'],
                          'selection': 'Explicit human listening selection of SRG774 Victory.mp3; original recording, constant gain and OGG conversion only.',
                          **loudness(destination)})
            asset['ffmpegVersion'] = subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0]
            assert asset['truePeakDbtp'] < -7, 'Keep completion headroom before runtime volume'
        new_assets.append(asset)
        print(name, len(data), 'bytes,', asset['durationSeconds'], 'seconds,', asset['sha256'])
    replacements = {asset['file']: asset for asset in new_assets}
    credits['assets'] = [replacements.pop(asset['file'], asset) for asset in credits['assets']] + list(replacements.values())
    credits['updated'] = '2026-10-27'
    credits.setdefault('sourcePacks', {}).update(packs)
    credits_path.write_text(json.dumps(credits, indent=2) + '\n')
    print('Credited files:', len(credits['assets']), 'Runtime files:', sum(asset.get('runtime', True) for asset in credits['assets']))


if __name__ == '__main__':
    main()
