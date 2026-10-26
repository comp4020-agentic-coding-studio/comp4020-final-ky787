#!/usr/bin/env python3
"""Rebuild only the two human-selected music assets and loop-seam review excerpts.

Requires Python 3 + numpy + scipy, FFmpeg/ffprobe. Existing approved assets are
hash-checked and never rewritten. Original masters remain outside the repository.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.request
import zipfile

import numpy as np
from scipy import ndimage, signal

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
VERIFIED = "2026-10-26"
LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/"
SOURCES = {
    "void": {"title": "Claimed by the Void", "author": "vitalezzz", "page": "https://opengameart.org/content/claimed-by-the-void", "file": "claimed_by_the_void_loop.flac", "hash": "067d1c0e0efb47548b3354b6d1293adfbffbfc24bc8eba1f0244a65110985e5d"},
    "celestial": {"title": "Celestial Harmony", "author": "vitalezzz", "page": "https://opengameart.org/content/celestial-harmony", "file": "celestial_harmony.flac", "hash": "3f3b8831623494863deb6a0cffb51cf4214575da657fd6e57648d84c77487629"},
    "moment": {"title": "Stop For A Moment", "author": "vitalezzz", "page": "https://opengameart.org/content/stop-for-a-moment", "file": "stop_for_a_moment.flac", "hash": "00d897231c27894ced10f4542940c354a4abb7e99924b71fbbb3d50addf9546b"},
    "hyperton": {"title": "Hyperton", "author": "Sudocolon", "page": "https://opengameart.org/content/hyperton", "file": "Hyperton.mp3", "hash": "a98dea8138f10ce8b595c63b3fd1652e672a8425c361486234265638932953e3"},
    "algate": {"title": "Algate", "author": "James Gargette (cinameng)", "page": "https://opengameart.org/content/algate", "file": "algate.zip", "hash": "394868e3d533f6e447165391ab2876913b712559390bf73f4f839b798ebd8ced"},
    "neural": {"title": "Neural Malfunction", "author": "vitalezzz", "page": "https://opengameart.org/content/neural-malfunction", "file": "neural_malfunction.flac", "hash": "8d917f86038c0f284fc6220ba200a16f2be268e5375d5caa7419401dd1e1cee7"},
}
SCENES = [
    ("handshake", "kuia"), ("crossfeed-vault", "sewers"),
]
SOURCES.update({
    "sewers": {"title": "Through the Sewers", "author": "Alexander Ehlers (tricksntraps)", "page": "https://opengameart.org/content/t-t-free-cyberpunk-pack-2", "file": "through_the_sewers_1766bpm.ogg", "hash": "a248f7bd3b0260bacd3cf4eb5bc325c6b15cc359334527b9734c3d4b6ced5f99"},
    "tower": {"title": "Tower Defense Theme", "author": "DST (Deceased Superior Technician)", "page": "https://opengameart.org/content/tower-defense-theme", "file": "DST-TowerDefenseTheme_1.mp3", "hash": "07cc9cd797c8ea6738b1bd740526f2610fd2ec0115774294ebda3a5ed8e62a30"},
    "cyborg": {"title": "Jumping Cyborg", "author": "Alexander Ehlers (tricksntraps)", "page": "https://opengameart.org/content/t-t-free-cyberpunk-pack-2", "file": "jumping_cyborg_110bpm.ogg", "hash": "7d768754fc82f5b41a6a33c682d3572b6824f3b69d95d080f6386c7fd2a25696"},
    "kuia": {"title": "Kuia", "author": "James Gargette (cinameng)", "page": "https://opengameart.org/content/kuia", "file": "kuia.mp3", "hash": "11a5d1a983a7d0d134aea3e9264acf923ca5eea0591ba722642a43724d73fd7e"},
    "factory": {"title": "New Factory", "author": "Alexander Ehlers (tricksntraps)", "page": "https://opengameart.org/content/t-t-free-cyberpunk-pack-2", "file": "new_factory_129bpm_0.ogg", "hash": "3365dd3d25697a54e843678d75f49732cd0bc88bfd3ccb574b39f0ed65fa7291"},
})
PRESERVED = {
    "menu": "94271d7fac43f54c4240c354b7415ee26b94bcbe93346aed83108a3cca73679e",
    "race-condition": "028f5d98da1a3d1f3d396abd66ac94bca37194316e85b90895a228c59b1073c1",
    "deadlock": "f31f389b69d48b9bbb386ccd40f8cbbae6075034ff5a8a04bdffc35621dd4648",
    "use-after-free": "d6f35d5d59662380eaa5b6cb1a9cd594d519041b79bbf4165afa5b80ca07e3b9",
    "tutorial-relay": "06557728c1d6dfd813857807f1c6fd7fe6eedfbe0ff8b0bf6a91b5b444dd69ab",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def command(args: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=True, capture_output=True, **kwargs)


def download(source: dict, cache: Path) -> Path:
    path = cache / source["file"]
    if not path.exists():
        with urllib.request.urlopen(source["download"], timeout=120) as response:
            path.write_bytes(response.read())
    if sha(path) != source["hash"]:
        raise ValueError(f"Source hash changed: {path}; review the original source before updating the pin")
    return path


def decode(path: Path) -> np.ndarray:
    data = command(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "2", "-ar", str(RATE), "-f", "f32le", "-"]).stdout
    return np.frombuffer(data, dtype="<f4").reshape(-1, 2).copy()


def write_pcm(path: Path, audio: np.ndarray) -> None:
    command(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "2", "-i", "-", "-c:a", "pcm_f32le", str(path)], input=audio.astype("<f4").tobytes())


def crossfade_cycle(audio: np.ndarray, seconds: float) -> np.ndarray:
    """Cyclic blend: tail -> head, then continue at the head's next sample.

    One crossfade's duration is removed; no silence/fade-to-zero is inserted.
    Equal-power gains preserve energy for uncorrelated musical passages.
    """
    n = round(seconds * RATE)
    phase = np.linspace(0, np.pi / 2, n, endpoint=True, dtype=np.float32)[:, None]
    seam = audio[-n:] * np.cos(phase) + audio[:n] * np.sin(phase)
    return np.concatenate([audio[n:-n], seam])


def declick(audio: np.ndarray, width: int = 128) -> np.ndarray:
    """Smooth the last/first 128 samples (5.8ms total), preserving cycle length.

    Cubic smoothstep interpolation joins the neighbourhood across the wrap.
    This removes a discontinuous sample jump without a fade-to-silence gap.
    """
    audio = audio.copy()
    phase = np.linspace(0, 1, width * 2 + 2, dtype=np.float32)[1:-1, None]
    weight = phase * phase * (3 - 2 * phase)
    transition = audio[-width - 1] * (1 - weight) + audio[width] * weight
    audio[-width:] = transition[:width]
    audio[:width] = transition[width:]
    return audio


def measure(path: Path) -> dict:
    report = command(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "loudnorm=I=-23:TP=-3:LRA=11:print_format=json", "-f", "null", "-"], text=True).stderr
    data = json.loads(report[report.rfind("{"):])
    return {"integratedLufs": float(data["input_i"]), "truePeakDbtp": float(data["input_tp"]), "loudnessRangeLu": float(data["input_lra"])}


def analyse_pcm(audio: np.ndarray) -> dict:
    # A 100ms window is long enough to ignore normal zero crossings. This checks
    # inserted silence and decoder edges; it is not a subjective music review.
    window = RATE // 10
    rms = np.array([np.sqrt(np.mean(audio[i:i + window] ** 2)) for i in range(0, len(audio), window)])
    silent = rms < 10 ** (-60 / 20)
    longest = run = 0
    for quiet in silent:
        run = run + 1 if quiet else 0
        longest = max(longest, run)
    edge = audio[:RATE // 4], audio[-RATE // 4:]
    return {
        "longestSilenceBelowMinus60DbSeconds": round(longest * .1, 3),
        "decodedBoundaryJump": round(float(np.max(np.abs(audio[0] - audio[-1]))), 8),
        "firstQuarterSecondRmsDb": round(float(20 * np.log10(np.sqrt(np.mean(edge[0] ** 2)) + 1e-12)), 3),
        "lastQuarterSecondRmsDb": round(float(20 * np.log10(np.sqrt(np.mean(edge[1] ** 2)) + 1e-12)), 3),
    }


def arrange(scene: str, path: Path, work: Path, *, legacy: bool = False) -> tuple[np.ndarray, dict]:
    detail: dict = {}
    if scene == "deadlock":
        with zipfile.ZipFile(path) as archive:
            names = ["Algate/wav/algate_low.wav", "Algate/wav/algate.wav"]
            variants = []
            for index, name in enumerate(names):
                extracted = work / f"algate-{index}.wav"
                extracted.write_bytes(archive.read(name))
                variants.append(decode(extracted))
            detail["archiveMembers"] = [{"file": name, "sha256": hashlib.sha256(archive.read(name)).hexdigest()} for name in names]
        assert len(variants[0]) == len(variants[1])
        order = [0, 0, 1, 0, 0, 1, 1, 0]
        # The original full/low versions are in phase and have equal lengths.
        # Blend corresponding samples during the first bar of each new variant,
        # retaining every beat and the original eight-bar loop duration.
        blend = round(len(variants[0]) / 8)
        phase = np.linspace(0, 1, blend, dtype=np.float32)[:, None]
        phase = phase * phase * (3 - 2 * phase)
        sections = []
        for i, selected in enumerate(order):
            part = variants[selected].copy()
            previous = order[(i - 1) % len(order)]
            part[:blend] = variants[previous][:blend] * (1 - phase) + part[:blend] * phase
            sections.append(part)
        audio = np.concatenate(sections)
        detail.update({"variantOrder": [Path(names[i]).stem for i in order], "variantTransitionSamples": blend})
    else:
        audio = decode(path)
        detail["sourceDecodedSamples"] = len(audio)
        if scene == "review-factory":
            start, end = round(24 * 240 / 129 * RATE), round(68 * 240 / 129 * RATE)
            fade = 4 * 240 / 129
            detail.update({"trimStartSample": start, "trimEndSampleExclusive": end,
                           "cyclicCrossfadeSamples": round(fade * RATE), "sourceTempoBpm": 129,
                           "tempoEvidence": "Author file name new_factory_129bpm.ogg", "reviewOnly": True})
            audio = crossfade_cycle(audio[start:end], fade)
        elif scene == "handshake" and not legacy:
            # Complete author-supplied Kuia loop, including its full musical
            # period. Never substitute the dated 24-second comparison excerpt.
            assert len(audio) == 2080512, "Unexpected original Kuia decode"
            detail.update({"fullOriginalRecording": True, "nativeAuthorLoopPreserved": True,
                           "trimStartSample": 0, "trimEndSampleExclusive": len(audio)})
        elif scene == "crossfeed-vault" and not legacy:
            # Measured matching rhythmic envelopes, not the unusual filename,
            # establish this overlap. Retain the long central arrangement and
            # exclude opening silence/sparse intro and the quiet ending fade.
            start, end, overlap = 1940400, 10952860, 352800
            detail.update({"trimStartSample": start, "trimEndSampleExclusive": end,
                           "cyclicCrossfadeSamples": overlap, "tempoBpm": None,
                           "tempoEvidence": "No verified tempo; 1766bpm is only part of the original filename.",
                           "seamSelection": "Eight-second overlap: 44.000s head and 240.364172s tail, selected by low/mid/high transient-envelope correlation (mean cosine similarity 0.664). No tempo assumption or time stretching."})
            audio = crossfade_cycle(audio[start:end], overlap / RATE)
        elif scene == "handshake":
            # Inferred 130 BPM; retain the central 88 bars, crossfade four bars.
            start, end, fade = round(8 * 240 / 130 * RATE), round(96 * 240 / 130 * RATE), 4 * 240 / 130
            detail.update({"trimStartSample": start, "trimEndSampleExclusive": end, "cyclicCrossfadeSamples": round(fade * RATE), "inferredTempoBpm": 130})
            audio = crossfade_cycle(audio[start:end], fade)
        elif scene == "crossfeed-vault":
            # Exclude the source's fade-out, then blend four full bars at wrap.
            end, fade = round(96 * 240 / 130 * RATE), 4 * 240 / 130
            detail.update({"trimStartSample": 0, "trimEndSampleExclusive": end, "cyclicCrossfadeSamples": round(fade * RATE), "inferredTempoBpm": 130})
            audio = crossfade_cycle(audio[:end], fade)
        elif scene == "race-condition":
            # The downloadable MP3 contains 2304 extra decoded padding samples.
            # Remove 1105 leading and 1199 trailing samples to recover 96s.
            start, end = 1105, 1105 + 96 * RATE
            assert len(audio) == end + 1199
            detail.update({"trimStartSample": start, "trimEndSampleExclusive": end, "removedMp3PaddingSamples": 2304})
            audio = audio[start:end]
        else:
            detail["nativeAuthorLoopPreserved"] = True
    detail["boundaryDeclickSamplesPerSide"] = 128
    return declick(audio), detail



def export_master(scene: str, source: dict, original: Path, output: Path, work: Path,
                  *, legacy: bool = False) -> dict:
    audio, edits = arrange(scene, original, work, legacy=legacy)
    arranged, filtered = work / f"{scene}-arranged.wav", work / f"{scene}-filtered.wav"
    write_pcm(arranged, audio)
    command(["ffmpeg", "-v", "error", "-y", "-i", str(arranged), "-af", "highpass=f=28,lowpass=f=14000", "-c:a", "pcm_f32le", str(filtered)])
    gain = round(-23 - measure(filtered)["integratedLufs"], 3)
    master = work / f"{scene}-master.wav"
    write_pcm(master, declick(decode(filtered)) * (10 ** (gain / 20)))
    command(["ffmpeg", "-v", "error", "-y", "-i", str(master), "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
             "-c:a", "libvorbis", "-q:a", "4", "-metadata", f"title={source['title']} - Binary Ninja {scene} edit", "-metadata", f"artist={source['author']}",
             "-metadata", "license=CC0-1.0", "-metadata", f"source={source['page']}", str(output)])
    decoded = decode(output)
    loudness, seam = measure(output), analyse_pcm(decoded)
    edits.update({"filter": "highpass=f=28,lowpass=f=14000", "constantGainDb": gain, "dynamicCompression": False,
                  "finalBoundaryDeclickSamplesPerSide": 128, "encodedSamples": len(decoded)})
    asset = {"file": output.name, "scene": scene, "title": source["title"], "author": source["author"], "source": source["page"], "download": source["download"],
             "license": "CC0-1.0", "licenseUrl": LICENSE_URL, "sourceSha256": source["hash"], "sha256": sha(output), "bytes": output.stat().st_size,
             "duration": round(len(decoded) / RATE, 6),
             "processing": "Source passage/loop arrangement described exactly in edits; 28 Hz high-pass and 14 kHz low-pass; constant gain to -23 LUFS; 128-sample wrap de-click on each side before and after filtering; stereo 44.1 kHz Vorbis quality 4. No time-stretching, compression or added notes.",
             "edits": edits, **loudness, "loopAnalysis": seam}
    assert abs(loudness["integratedLufs"] + 23) < .35, (scene, loudness)
    assert loudness["truePeakDbtp"] < -3, (scene, loudness)
    assert seam["longestSilenceBelowMinus60DbSeconds"] < .2, (scene, seam)
    print(json.dumps({k: asset[k] for k in ["file", "bytes", "duration", "integratedLufs", "truePeakDbtp", "sha256"]}), flush=True)
    return asset


GROOVE_METHOD = (
    "22.05 kHz mono; STFT 2048 samples/256 hop; median17 harmonic/percussive soft mask P^2/(P^2+H^2); "
    "positive two-frame percussive-band envelope change; peak prominence 32% of 90th percentile and minimum180ms spacing; "
    "full 8s windows pass with >=8 attacks at35-180Hz and >=12 at2-9kHz. "
    "This is a repeatable transient/pulse proxy, not instrument recognition or a listening-quality score."
)


def analyse_groove(path: Path) -> dict:
    sr, hop = 22050, 256
    raw = command(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]).stdout
    x = np.frombuffer(raw, dtype="<f4")
    frequency, time, z = signal.stft(x, fs=sr, nperseg=2048, noverlap=2048-hop)
    magnitude = np.abs(z)
    harmonic = ndimage.median_filter(magnitude, size=(1, 17))
    percussion = ndimage.median_filter(magnitude, size=(17, 1))
    mask = percussion ** 2 / (percussion ** 2 + harmonic ** 2 + 1e-12)
    power = magnitude ** 2
    percussive_power = power * mask
    duration = len(x) / sr
    events, gaps = [], []
    for low, high in [(35, 180), (2000, 9000)]:
        envelope = np.sqrt(percussive_power[(frequency >= low) & (frequency < high)].sum(axis=0))
        flux = np.maximum(envelope[2:] - envelope[:-2], 0)
        peaks, _ = signal.find_peaks(flux, prominence=float(np.percentile(flux, 90) * .32), distance=round(.18 * sr / hop))
        times = time[peaks + 2]
        events.append(times)
        gaps.append(round(float(np.percentile(np.diff(times), 95)), 3) if len(times) > 1 else None)
    windows = []
    for start in np.arange(0, duration, 8):
        selection = (time >= start) & (time < start + 8)
        windows.append({"start": round(float(start), 2), "complete": bool(start + 8 <= duration + .001),
                        "bassAttacks": int(((events[0] >= start) & (events[0] < start + 8)).sum()),
                        "highAttacks": int(((events[1] >= start) & (events[1] < start + 8)).sum()),
                        "percussiveEnergy": round(float(percussive_power[:, selection].sum() / (power[:, selection].sum() + 1e-12)), 3)})
    full = [w for w in windows if w["complete"]]
    passed = [w for w in full if w["bassAttacks"] >= 8 and w["highAttacks"] >= 12]
    return {"file": path.name, "duration": round(duration, 3), "bassAttackRate": round(len(events[0]) / duration, 2),
            "highAttackRate": round(len(events[1]) / duration, 2), "bass95thGap": gaps[0], "high95thGap": gaps[1],
            "percussiveEnergy": round(float(percussive_power.sum() / power.sum()), 3),
            "continuousPulseWindowPercent": round(100 * len(passed) / max(1, len(full)), 1), "windows": windows}


def excerpt(path: Path, output: Path, start: float, work: Path, *, seam: bool = False) -> dict:
    """24s bodies / 8s seams, individually level-matched; no tempo edits."""
    decoded = decode(path)
    original = (np.concatenate([decoded[-4 * RATE:], decoded[:4 * RATE]]) if seam
                else decoded[round(start * RATE):round((start + 24) * RATE)])
    duration = 8 if seam else 24
    assert len(original) == duration * RATE
    clip = work / "excerpt.wav"
    write_pcm(clip, original)
    filtered = work / "excerpt-filtered.wav"
    command(["ffmpeg", "-v", "error", "-y", "-i", str(clip), "-af", "highpass=f=28,lowpass=f=14000", "-c:a", "pcm_f32le", str(filtered)])
    audio = decode(filtered)
    # Only review clips fade 15ms at each edge to avoid UI preview start/stop clicks.
    n = round(.015 * RATE)
    audio[:n] *= np.linspace(0, 1, n)[:, None]
    audio[-n:] *= np.linspace(1, 0, n)[:, None]
    write_pcm(clip, audio)
    gain = round(-23 - measure(clip)["integratedLufs"], 3)
    write_pcm(clip, audio * 10 ** (gain / 20))
    command(["ffmpeg", "-v", "error", "-y", "-i", str(clip), "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-c:a", "libvorbis", "-q:a", "4", str(output)])
    loudness = measure(output)
    assert abs(loudness["integratedLufs"] + 23) < .35
    return {"file": output.name, "sha256": sha(output), "bytes": output.stat().st_size, "duration": duration,
            "excerptStartSeconds": None if seam else start, "sequence": "last4s,first4s" if seam else "body",
            "constantGainDb": gain, "reviewFadeMilliseconds": 15, **loudness}


def validate_preserved(output: Path, manifest: dict) -> dict:
    assets = {a["scene"]: a for a in manifest["assets"]}
    result = {}
    for scene, expected in PRESERVED.items():
        path = output / f"{scene}.ogg"
        assert path.exists() and sha(path) == expected, f"Restore the approved {path}; this script never rebuilds approved assets"
        assert assets[scene]["sha256"] == expected
        result[scene] = expected
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=Path(tempfile.gettempdir()) / "bn-music-sources")
    parser.add_argument("--output", type=Path, default=ROOT / "public/audio/music", help="Existing seven-track catalogue; approved files must already exist")
    parser.add_argument("--review-dir", type=Path, default=ROOT / "docs/playtest/2026-10-26-approved-audio")
    parser.add_argument("--skip-review", action="store_true", help="Only rebuild the two runtime replacements")
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output / "catalogue.json"
    manifest = json.loads(manifest_path.read_text())
    preserved = validate_preserved(args.output, manifest)
    preserved_metadata = {a["scene"]: copy.deepcopy(a) for a in manifest["assets"] if a["scene"] in PRESERVED}
    for source in SOURCES.values():
        source["download"] = "https://opengameart.org/sites/default/files/" + source["file"]
    with tempfile.TemporaryDirectory(prefix="bn-music-refinement-") as temporary:
        work = Path(temporary)
        for scene, source_id in SCENES:
            source = SOURCES[source_id]
            asset = export_master(scene, source, download(source, args.cache), args.output / f"{scene}.ogg", work)
            manifest["assets"] = [asset if a["scene"] == scene else a for a in manifest["assets"]]
        manifest["verifiedAt"] = VERIFIED
        manifest["reviewMethod"] = "Explicit human listening selections. Source licensing and decoded loop/loudness checks by the agent; no claim of agent acoustic audition."
        manifest["totalBytes"] = sum(a["bytes"] for a in manifest["assets"])
        manifest["feedbackRevision"] = {"date": VERIFIED, "replacedScenes": [s for s, _ in SCENES],
                                        "preservedSha256": preserved, "selection": "Explicit human listening selections: complete Kuia and Through the Sewers."}
        manifest["ffmpegVersion"] = command(["ffmpeg", "-version"], text=True).stdout.splitlines()[0]
        assert 8_000_000 <= manifest["totalBytes"] <= 18_000_000
        validate_preserved(args.output, manifest)
        assert preserved_metadata == {a["scene"]: a for a in manifest["assets"] if a["scene"] in PRESERVED}
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
        print(f"Runtime assets/catalogue ready: {manifest['totalBytes']} bytes. Approved four + tutorial bytes unchanged.", flush=True)
        if args.skip_review:
            return
        args.review_dir.mkdir(parents=True, exist_ok=True)
        seams = []
        for scene, _ in SCENES:
            path = args.output / f"{scene}.ogg"
            seams.append({"scene": scene, **excerpt(path, args.review_dir / f"{scene}-seam.ogg", 0, work, seam=True)})
        (args.review_dir / "seams.json").write_text(json.dumps({"date": VERIFIED,
            "method": "Last four seconds followed by first four of each final runtime loop; review-only loudness match. Full originals were used for generation, not these excerpts.",
            "clips": seams}, indent=2) + "\n")
        validate_preserved(args.output, manifest)
        print(f"Two loop seam previews ready: {args.review_dir}")



if __name__ == "__main__":
    main()
