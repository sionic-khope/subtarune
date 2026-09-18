#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "scipy", "pydantic>=2", "typer"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run tools/rhythm/tvtime_lead.py --help
# ──────────────────
"""Compile an explicit melody score against its recorded pitch attacks, never mixed onsets."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Final, Literal

import numpy as np
import typer
from numpy.typing import NDArray
from pydantic import BaseModel, ConfigDict, Field
from scipy import ndimage, signal

from tvtime_layer import RATE, decode

BPM: Final = 148
BEAT: Final = 60 / BPM
FloatArray = NDArray[np.float64]


class ScoreNote(BaseModel):
    model_config = ConfigDict(frozen=True)
    beat: float = Field(ge=0)
    pitch: int = Field(ge=43, le=95)
    duration: float = Field(gt=0)
    section: str
    scoreBeats: list[float] = Field(default_factory=list)
    timeOffset: float = .035


class SectionAnchor(BaseModel):
    model_config = ConfigDict(frozen=True)
    section: str
    offset: float


class Score(BaseModel):
    model_config = ConfigDict(frozen=True, extra="allow")
    sourceSha256: str
    notes: list[ScoreNote] = Field(min_length=1)
    anchors: list[SectionAnchor]


class ChartNote(BaseModel):
    model_config = ConfigDict(frozen=True)
    t: float = Field(ge=0)
    lane: Literal["L", "R"]
    pitch: int
    sourceT: float
    soundDur: float = Field(gt=0, le=1.65)
    beat: float
    section: str
    scoreBeats: list[float]


@dataclass(frozen=True, slots=True)
class PitchEnergy:
    times: FloatArray
    energy: FloatArray


def group_ornaments(score: list[ScoreNote]) -> list[ScoreNote]:
    """Fold contiguous sub-0.2-beat grace tones into the prior attack, retaining every score beat."""
    groups: list[ScoreNote] = []
    for note in score:
        if groups and note.duration < .2 and note.section == groups[-1].section and note.beat-groups[-1].beat-groups[-1].duration <= .05:
            prior = groups[-1]
            groups[-1] = prior.model_copy(update={
                "duration": max(prior.duration, note.beat+note.duration-prior.beat),
                "scoreBeats": [*prior.scoreBeats, note.beat],
            })
        else:
            groups.append(note.model_copy(update={"scoreBeats": [note.beat]}))
    return groups


def pitch_energy(samples: NDArray[np.float32]) -> PitchEnergy:
    """Semitone-resolved sustained energy rejects short broadband drum transients."""
    frequencies, times, spectrum = signal.stft(samples, RATE, nperseg=4096, noverlap=3876)
    magnitude = np.abs(spectrum)
    rows = []
    for pitch in range(43, 96):
        hz = 440 * 2 ** ((pitch - 69) / 12)
        band = np.abs(12 * np.log2(np.maximum(frequencies, 1) / hz)) < .4
        rows.append(np.max(magnitude[band], axis=0))
    energy = np.array(rows, dtype=np.float64)
    energy /= np.maximum(energy.max(axis=0, keepdims=True), 1e-8)
    return PitchEnergy(times=times, energy=energy)


def locate_heads(score: list[ScoreNote], analysis: PitchEnergy, offset: float | None = None) -> FloatArray:
    """Fine-align authored heads within 25 ms, bounded by adjacent score heads."""
    times, energy = analysis.times, analysis.energy
    smoothed = ndimage.median_filter(energy, size=(1, 5))
    heads = []
    for index, note in enumerate(score):
        expected = note.beat * BEAT + (note.timeOffset if offset is None else offset)
        before = (note.beat-score[index-1].beat)*BEAT if index else 1
        after = (score[index+1].beat-note.beat)*BEAT if index+1 < len(score) else 1
        radius = min(.025, before*.1, after*.1)
        candidates = times[(times >= expected-radius) & (times <= expected+radius)]
        shifts = [p for p in (note.pitch-12, note.pitch, note.pitch+12) if 43 <= p <= 95]
        pitch = max(shifts, key=lambda p: float(np.interp(expected + min(.10, note.duration*BEAT*.3), times, smoothed[p-43])))
        curve = smoothed[pitch-43]
        rise = np.interp(candidates+.035, times, curve)-np.interp(candidates-.035, times, curve)
        sustained = np.interp(candidates+.065, times, curve)
        value = rise * sustained - .6*np.abs(candidates-expected)
        measured = float(candidates[int(np.argmax(value))]) if len(candidates) and value.max() > .05 else expected
        heads.append(measured)
    return np.array(heads)


def chart_notes(score: list[ScoreNote], heads: FloatArray) -> list[ChartNote]:
    notes: list[ChartNote] = []
    previous_pitch = score[0].pitch
    lane: Literal["L", "R"] = "R"
    for index, (note, head) in enumerate(zip(score, heads, strict=True)):
        if note.pitch > previous_pitch:
            lane = "R"
        elif note.pitch < previous_pitch:
            lane = "L"
        else:
            lane = "L" if lane == "R" else "R"
        next_head = float(heads[index+1]) if index+1 < len(heads) else float(head)+note.duration*BEAT
        duration = min(1.65, note.duration*BEAT, next_head-float(head)-.012)
        notes.append(ChartNote(t=round(float(head),6), lane=lane, pitch=note.pitch,
                               sourceT=round(note.beat*BEAT+note.timeOffset,6), soundDur=round(duration,6),
                               beat=note.beat, section=note.section, scoreBeats=note.scoreBeats or [note.beat]))
        previous_pitch = note.pitch
    return notes


def main(
    score: Path = Path("assets/source/tvtime-rhythm/lead-score.json"),
    source: Path = Path("assets/audio/bgm/youngcle_tvform_battle.mp3"),
    chart: Path = Path("assets/rhythm/tvtime.json"),
) -> None:
    """Rebuild only center-player notes; preserve side performers and the keyed audio layer."""
    reference = Score.model_validate_json(score.read_text())
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    if source_hash != reference.sourceSha256:
        raise typer.BadParameter("Source recording differs from the frozen lead-score reference")
    analysis = pitch_energy(decode(source))
    anchors = {anchor.section: anchor.offset for anchor in reference.anchors}
    anchored = [note.model_copy(update={"timeOffset": anchors[note.section]}) for note in reference.notes]
    groups = group_ornaments(anchored)
    heads = locate_heads(groups, analysis)
    notes = chart_notes(groups, heads)
    payload = json.loads(chart.read_text())
    payload["notes"] = [note.model_dump() for note in notes]
    payload["leadChart"] = {
        "source": score.as_posix(), "sourceSha256": source_hash,
        "method": "explicit melody score; pitch-specific sustained attacks; no mixed-onset seeds",
        "scoreSha256": hashlib.sha256(score.read_bytes()).hexdigest(),
        "notes": len(notes), "scoreNotes": len(reference.notes),
        "groupedOrnaments": len(reference.notes)-len(notes), "bpm": BPM,
        "anchors": [anchor.model_dump() for anchor in reference.anchors],
    }
    chart.write_text(json.dumps(payload,ensure_ascii=False,separators=(",", ":"))+"\n")
    typer.echo(json.dumps(payload["leadChart"],indent=2))


if __name__ == "__main__":
    typer.run(main)
