#!/usr/bin/env python3
"""Rebuild the 2026-10-26 SFX additions from pinned original CC0 archives.

Requires Python 3 and FFmpeg. Existing grapple, cube, plate and other retained
assets are never rewritten. Downloads/extraction stay in the supplied cache.
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
    ('switch-click.ogg', 'interface-sounds', 'Audio/switch_002.ogg',
     'atrim=end=0.18,highpass=f=80,lowpass=f=3000,afade=t=in:d=0.002,afade=t=out:st=0.12:d=0.06', -6),
    ('latch-confirm.ogg', 'interface-sounds', 'Audio/maximize_006.ogg',
     'highpass=f=70,lowpass=f=1800,afade=t=in:d=0.006,afade=t=out:st=0.31:d=0.07', -8),
    ('checkpoint.ogg', 'interface-sounds', 'Audio/confirmation_001.ogg',
     'highpass=f=70,lowpass=f=1800,afade=t=in:d=0.005,afade=t=out:st=0.23:d=0.06', -8),
    ('breakpoint-deploy.ogg', 'sci-fi-sounds', 'Audio/doorOpen_002.ogg',
     'asetrate=36162,aresample=44100,highpass=f=60,lowpass=f=1800,afade=t=in:d=0.008,afade=t=out:st=0.55:d=0.10', -8),
    ('breakpoint-confirm.ogg', 'interface-sounds', 'Audio/confirmation_004.ogg',
     'asetrate=37485,aresample=44100,highpass=f=70,lowpass=f=2200,afade=t=in:d=0.006,afade=t=out:st=0.48:d=0.09', -8),
    ('room-complete.ogg', 'music-jingles', 'Audio/8-Bit jingles/jingles_NES12.ogg',
     'highpass=f=60,lowpass=f=2800,afade=t=in:d=0.005,afade=t=out:st=0.76:d=0.09', -6),
    ('code-power.ogg', 'sci-fi-sounds', 'Audio/forceField_001.ogg',
     'atrim=end=0.8,highpass=f=55,lowpass=f=2000,afade=t=in:d=0.015,afade=t=out:st=0.65:d=0.15', -9),
]


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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path('/tmp/bn-sound-overhaul'))
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    output = ROOT / 'public/audio'
    credits_path = output / 'credits.json'
    credits = json.loads(credits_path.read_text())
    packs = {}
    archives = {}
    for pack, (version, expected) in PACKS.items():
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
        if pack != 'sci-fi-sounds':
            (output / license_file).write_bytes(license_bytes)
        packs[pack] = {'page': f'https://kenney.nl/assets/{pack}', 'archive': url,
                       'archiveSha256': expected, 'licenseFile': license_file,
                       'sourceLicenseSha256': digest(license_bytes), 'verified': '2026-10-26'}
    new_assets = []
    for name, pack, original, chain, target in EFFECTS:
        source_bytes = archives[pack].read(original)
        source = args.cache / pack / original
        source.parent.mkdir(parents=True, exist_ok=True)
        source.write_bytes(source_bytes)
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
        new_assets.append({'file': name, 'original': original, 'author': 'Kenney',
                           'source': packs[pack]['page'], 'download': packs[pack]['archive'],
                           'pack': pack, 'license': 'CC0-1.0', 'retrieved': '2026-10-26',
                           'sourceSha256': digest(source_bytes), 'sourceArchiveSha256': packs[pack]['archiveSha256'],
                           'processing': filters + '; 44.1kHz mono Vorbis q4; FFmpeg bitexact flags.',
                           'targetPeakDbfs': target, 'decodedPeakDbfs': round(20 * math.log10(max(abs(n) for n in decoded)), 3),
                           'durationSeconds': round(len(decoded) / 44100, 6),
                           'sha256': digest(data), 'bytes': len(data)})
        print(name, len(data), 'bytes,', round(len(decoded) / 44100, 3), 'seconds')
    names = {asset['file'] for asset in new_assets}
    credits['assets'] = [asset for asset in credits['assets'] if asset['file'] not in names] + new_assets
    for asset in credits['assets']:
        if asset['file'] == 'confirm.ogg':
            asset['runtime'] = False
            asset['retainedNote'] = 'Legacy generic beep retained unchanged for provenance; new distinct cues replace its runtime uses.'
    credits['updated'] = '2026-10-26'
    credits['sourcePacks'] = packs
    credits_path.write_text(json.dumps(credits, indent=2) + '\n')
    print('Credited files:', len(credits['assets']), 'Runtime files:', sum(asset.get('runtime', True) for asset in credits['assets']))


if __name__ == '__main__':
    main()
