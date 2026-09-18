#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "scipy", "pydantic>=2", "typer"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run tools/rhythm/tvtime_layer.py --help
# ──────────────────
"""Source-aligned TV Time harmonic playback asset."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Final, Literal

import numpy as np
import typer
from numpy.typing import NDArray
from pydantic import BaseModel, ConfigDict, Field
from scipy import ndimage, signal

RATE: Final = 22050
FFT: Final = 1024
HOP: Final = 128
RADIUS: Final = 0.060
FloatArray = NDArray[np.float32]
ComplexArray = NDArray[np.complex64]


class Note(BaseModel):
    model_config = ConfigDict(frozen=True, extra="allow")
    t: float = Field(ge=0)
    lane: Literal["L", "R"]
    pitch: int
    sourceT: float | None = None
    soundDur: float | None = None


class Chart(BaseModel):
    model_config = ConfigDict(frozen=True, extra="allow")
    duration: float = Field(gt=0)
    notes: list[Note]
    sourceNotes: list[Note] | None = None


def analyze(samples: FloatArray) -> ComplexArray:
    """Frame k is centered on source sample k * HOP (zero padding at edges)."""
    return signal.stft(samples, fs=RATE, nperseg=FFT, noverlap=FFT - HOP,
                       boundary="zeros", padded=True)[2].astype(np.complex64)


def reconstruct(spectrum: ComplexArray, sample_count: int) -> FloatArray:
    """Remove exactly the center padding, retaining the original sample axis."""
    return signal.istft(spectrum, fs=RATE, nperseg=FFT, noverlap=FFT - HOP,
                        boundary=True)[1][:sample_count].astype(np.float32)


def harmonic_layer(samples: FloatArray) -> FloatArray:
    """Soft HPSS mask preserves complex phase; frequency rolloff reduces bass/drums."""
    spectrum = analyze(samples)
    magnitude = np.abs(spectrum)
    harmonic = ndimage.median_filter(magnitude, size=(1, 31))
    percussive = ndimage.median_filter(magnitude, size=(31, 1))
    mask = harmonic ** 2 / (harmonic ** 2 + 2 * percussive ** 2 + 1e-12)
    frequency = np.fft.rfftfreq(FFT, 1 / RATE)
    band = (1 - np.exp(-(frequency / 300) ** 6)) * np.exp(-(frequency / 6200) ** 8)
    result = reconstruct((spectrum * mask * band[:, None]).astype(np.complex64), len(samples))
    peak = float(np.max(np.abs(result)))
    return result * (0.94 / max(peak, 1e-8))


def refine_times(samples: FloatArray, original: NDArray[np.float64]) -> NDArray[np.float64]:
    """Match nearest harmonic spectral attack within 60 ms; never quantize to a beat."""
    magnitude = np.abs(analyze(samples))
    flux = np.maximum(0, np.diff(magnitude, axis=1, prepend=magnitude[:, :1])).sum(axis=0)
    peaks = signal.find_peaks(flux, distance=5, prominence=float(np.max(flux)) * 0.015)[0]
    # STFT boundary='zeros' makes returned frame times FFT CENTERS, not starts.
    attacks = peaks * HOP / RATE
    result = original.copy()
    for index, time in enumerate(original):
        nearby = attacks[np.abs(attacks - time) <= RADIUS]
        if len(nearby):
            result[index] = nearby[np.argmin(np.abs(nearby - time))]
    return result


def decode(path: Path) -> FloatArray:
    result = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le",
                             "-ac", "1", "-ar", str(RATE), "pipe:1"], check=True, capture_output=True)
    return np.frombuffer(result.stdout, dtype="<f4").copy()


def select_attack_indices(times: NDArray[np.float64]) -> NDArray[np.intp]:
    selected: list[int] = []
    for index, time in enumerate(times):
        if selected and time - times[selected[-1]] < 0.18:
            continue
        if sum(times[prior] > time - 2 for prior in selected[-6:]) >= 6:
            continue
        selected.append(index)
    return np.array(selected, dtype=np.intp)


def envelope_distance(samples: FloatArray, times: NDArray[np.float64]) -> float | None:
    """Independent time-domain QA: distance to nearest rising 8 ms RMS-envelope peak."""
    envelope = np.sqrt(np.maximum(0, ndimage.uniform_filter1d(samples.astype(np.float64) ** 2, size=177)))
    slope = np.maximum(0, envelope[110:] - envelope[:-110])
    peaks = signal.find_peaks(slope, distance=330, prominence=float(slope.max()) * 0.02)[0]
    attacks = (peaks + 55) / RATE
    if len(attacks) == 0:
        return None
    return round(float(np.median([np.min(np.abs(attacks - time)) for time in times]) * 1000), 3)


def main(
    source: Path = Path("assets/audio/bgm/youngcle_tvform_battle.mp3"),
    chart: Path = Path("assets/rhythm/tvtime.json"),
    output: Path = Path("assets/audio/sfx/tvtime_melody.ogg"),
) -> None:
    """Extract the user's existing BGM harmonic layer and refine its existing note times."""
    original_chart = Chart.model_validate_json(chart.read_text(encoding="utf-8"))
    samples = decode(source)
    processed = harmonic_layer(samples)
    source_notes = original_chart.sourceNotes or original_chart.notes
    original = np.array([note.sourceT if note.sourceT is not None else note.t for note in source_notes])
    corrected = np.round(refine_times(processed, original), 6)
    selected = select_attack_indices(corrected)
    notes = []
    for position, index in enumerate(selected):
        note = source_notes[index]
        time = float(corrected[index])
        next_time = float(corrected[selected[position + 1]]) if position + 1 < len(selected) else len(samples) / RATE
        notes.append(note.model_copy(update={"t": time, "sourceT": float(original[index]),
                                             "soundDur": round(min(1.65, next_time - time - 0.012), 6)}))
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", "1",
                    "-i", "pipe:0", "-ar", "48000", "-c:a", "libopus", "-b:a", "112k", str(output)],
                   input=processed.astype("<f4").tobytes(), check=True)
    decoded = decode(output)
    metrics = {
        "source": source.as_posix(), "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "asset": output.as_posix(), "sampleRate": RATE, "codec": "opus", "sourceSamples": len(samples),
        "decodedSamples": len(decoded), "duration": len(decoded) / RATE,
        "originalNotes": len(source_notes), "retainedNotes": len(notes), "removedNotes": len(source_notes) - len(notes),
        "fftSize": FFT, "hopSamples": HOP, "frameTime": "center", "timeShift": 0,
        "maxCorrectionMs": round(float(np.max(np.abs(corrected - original))) * 1000, 3),
        "medianCorrectionMs": round(float(np.median(np.abs(corrected - original))) * 1000, 3),
        "envelopeMedianDistanceBeforeMs": envelope_distance(processed, original[selected]),
        "envelopeMedianDistanceAfterMs": envelope_distance(processed, corrected[selected]),
        "decodedPeak": round(float(np.max(np.abs(decoded))), 6),
        "method": "phase-preserving HPSS harmonic midrange; not an isolated lead transcription",
    }
    result = original_chart.model_copy(update={"notes": notes, "sourceNotes": source_notes})
    payload = result.model_dump(exclude_none=True)
    payload["melodyLayer"] = metrics
    chart.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    typer.echo(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    typer.run(main)
