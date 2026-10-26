#!/usr/bin/env python3
"""Rebuild the six CC0 soundtrack assets. Requires Python 3 + numpy, FFmpeg/ffprobe.

Downloads are SHA-256 pinned. Original masters stay in a temporary/cache directory;
only bounded Vorbis assets, their manifest and an optional review montage ship.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.request
import zipfile

import numpy as np

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
    ("menu", "void"), ("handshake", "celestial"), ("crossfeed-vault", "moment"),
    ("race-condition", "hyperton"), ("deadlock", "algate"), ("use-after-free", "neural"),
]


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
    """Beat-aligned wrap: tail -> head, then continue at the head's next sample.

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


def arrange(scene: str, path: Path, work: Path) -> tuple[np.ndarray, dict]:
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
        if scene == "handshake":
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


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=Path(tempfile.gettempdir()) / "bn-music-sources")
    parser.add_argument("--output", type=Path, default=ROOT / "public/audio/music")
    parser.add_argument("--review", type=Path, default=ROOT / "docs/playtest/2026-10-26-audio/music-review.ogg")
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    for source in SOURCES.values():
        source["download"] = "https://opengameart.org/sites/default/files/" + source["file"]
    manifest = {"verifiedAt": VERIFIED, "license": "CC0-1.0", "licenseUrl": LICENSE_URL,
                "reviewMethod": "Original-source licensing/descriptions plus decoded structural analysis. No subjective acoustic audition was available to the agent.",
                "encoding": {"codec": "vorbis", "sampleRate": RATE, "channels": 2, "quality": 4, "targetIntegratedLufs": -23},
                "ffmpegVersion": command(["ffmpeg", "-version"], text=True).stdout.splitlines()[0], "assets": []}
    montage = []
    with tempfile.TemporaryDirectory(prefix="bn-music-build-") as temporary:
        work = Path(temporary)
        for scene, source_id in SCENES:
            source = SOURCES[source_id]
            original = download(source, args.cache)
            audio, edits = arrange(scene, original, work)
            arranged = work / f"{scene}-arranged.wav"
            filtered = work / f"{scene}-filtered.wav"
            write_pcm(arranged, audio)
            command(["ffmpeg", "-v", "error", "-y", "-i", str(arranged), "-af", "highpass=f=28,lowpass=f=14000", "-c:a", "pcm_f32le", str(filtered)])
            pre = measure(filtered)
            gain = round(-23 - pre["integratedLufs"], 3)
            # Filtering can change boundary phase. Re-close the final filtered
            # sample boundary before encoding, preserving a click-free wrap.
            mastered = declick(decode(filtered)) * (10 ** (gain / 20))
            master = work / f"{scene}-master.wav"
            write_pcm(master, mastered)
            output = args.output / f"{scene}.ogg"
            command(["ffmpeg", "-v", "error", "-y", "-i", str(master), "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
                     "-c:a", "libvorbis", "-q:a", "4", "-metadata", f"title={source['title']} - Binary Ninja {scene} edit", "-metadata", f"artist={source['author']}",
                     "-metadata", "license=CC0-1.0", "-metadata", f"source={source['page']}", str(output)])
            decoded = decode(output)
            loudness = measure(output)
            seam = analyse_pcm(decoded)
            duration = len(decoded) / RATE
            edits.update({"filter": "highpass=f=28,lowpass=f=14000", "constantGainDb": gain, "dynamicCompression": False,
                          "finalBoundaryDeclickSamplesPerSide": 128, "encodedSamples": len(decoded)})
            processing = "Authored-source loop arrangement/trim described in edits; 28 Hz high-pass and 14 kHz low-pass; constant gain to -23 LUFS; 128-sample wrap de-click on each side before and after filtering; stereo 44.1 kHz Vorbis quality 4. No time-stretching or added notes."
            asset = {"file": output.name, "scene": scene, "title": source["title"], "author": source["author"], "source": source["page"], "download": source["download"],
                     "license": "CC0-1.0", "licenseUrl": LICENSE_URL, "sourceSha256": source["hash"], "sha256": sha(output), "bytes": output.stat().st_size,
                     "duration": round(duration, 6), "processing": processing, "edits": edits, **loudness, "loopAnalysis": seam}
            manifest["assets"].append(asset)
            print(json.dumps({k: asset[k] for k in ["file", "bytes", "duration", "integratedLufs", "truePeakDbtp"]}), flush=True)
            assert abs(loudness["integratedLufs"] + 23) < .35, (scene, loudness)
            assert loudness["truePeakDbtp"] < -3, (scene, loudness)
            assert seam["longestSilenceBelowMinus60DbSeconds"] < .2, (scene, seam)
            # Six 16s chapters: 12s representative excerpt, then 2s before and
            # 2s after its actual wrap. Timeline is documented for human review.
            excerpt = decoded[30 * RATE:42 * RATE]
            montage.append(np.concatenate([excerpt, decoded[-2 * RATE:], decoded[:2 * RATE]]))
        manifest["totalBytes"] = sum(item["bytes"] for item in manifest["assets"])
        assert 8_000_000 <= manifest["totalBytes"] <= 18_000_000, manifest["totalBytes"]
        (args.output / "catalogue.json").write_text(json.dumps(manifest, indent=2) + "\n")
        args.review.parent.mkdir(parents=True, exist_ok=True)
        review = work / "music-review.wav"
        write_pcm(review, np.concatenate(montage))
        command(["ffmpeg", "-v", "error", "-y", "-i", str(review), "-map_metadata", "-1", "-c:a", "libvorbis", "-q:a", "4", "-metadata", "title=Binary Ninja music review - six scene excerpts and loop seams", str(args.review)])
        print(f"Total runtime music: {manifest['totalBytes']} bytes; review: {args.review}")


if __name__ == "__main__":
    main()
