#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "scipy", "pydantic>=2", "typer", "pytest"]
# ///
# ─── How to run ───
# Run: uv run --with numpy --with scipy --with pydantic --with typer --with pytest pytest tools/rhythm/test_tvtime_lead.py
# ──────────────────
from __future__ import annotations

import numpy as np
import pytest

import tvtime_lead as lead


def test_lead_score_keeps_repeated_heads_and_sustain_rests() -> None:
    # Given a transcribed repeated note, a long sustain, and a rest.
    score = [lead.ScoreNote(beat=b, pitch=p, duration=d, section="fixture") for b,p,d in [(0,67,.5),(.5,67,.5),(1,70,3),(5,72,.5)]]
    # When source notes are converted without mixed onset candidates.
    notes = lead.chart_notes(score, np.array([.03,.23,.43,2.03]))
    # Then all melody heads survive and the sustain contains no invented taps.
    assert len(notes) == 4
    assert [n.lane for n in notes] == ["L","R","R","R"]
    assert notes[2].soundDur <= 3 * 60 / 148


def test_lead_score_does_not_drop_fast_real_eighth_notes() -> None:
    # Given an uninterrupted eight-note melody at 148 BPM.
    score = [lead.ScoreNote(beat=i/2, pitch=67+i%3, duration=.5, section="fixture") for i in range(12)]
    # When chart density is derived from melody rather than a global cap.
    notes = lead.chart_notes(score, np.arange(12)*30/148)
    # Then the real phrase is not thinned to six notes per two seconds.
    assert len(notes) == 12
    assert notes[9].t-notes[0].t < 2


def test_pitch_specific_attack_ignores_louder_drum_at_wrong_time() -> None:
    # Given sustained G followed by C, plus an earlier broadband transient.
    times = np.arange(0, 1, .005)
    pitches = np.zeros((53, len(times)), dtype=np.float64)
    pitches[:, 80:83] = 5
    pitches[72-43, times>=.5] = 1
    score = [lead.ScoreNote(beat=1.2, pitch=72, duration=.5, section="fixture")]
    # When the score's pitch is measured in its local source-time neighborhood.
    measured = lead.locate_heads(score, lead.PitchEnergy(times=times, energy=pitches), offset=.014)
    # Then the sustained pitch entry wins over the drum transient at .4 seconds.
    assert measured[0] == pytest.approx(.5, abs=.02)


def test_grace_runs_group_without_dropping_eighths_or_crossing_rests() -> None:
    score = [lead.ScoreNote(beat=b, pitch=p, duration=d, section="fixture") for b,p,d in [(0,67,1), (1,70,.125), (1.125,72,.125), (1.25,74,.25), (2,76,.125), (3,77,.5)]]
    groups = lead.group_ornaments(score)
    assert [n.beat for n in groups] == [0,1.25,2,3]
    assert groups[0].scoreBeats == [0,1,1.125]
    assert groups[0].duration == 1.25
    assert [beat for n in groups for beat in n.scoreBeats] == [n.beat for n in score]


def test_fine_alignment_cannot_reverse_close_score_heads() -> None:
    times = np.arange(0, 1, .005)
    energy = np.tile(np.sin(times*90)**2, (53,1))
    score = [lead.ScoreNote(beat=b, pitch=72, duration=.125, section="fixture") for b in [1,1.125,1.25]]
    heads = lead.locate_heads(score, lead.PitchEnergy(times=times, energy=energy))
    assert np.min(np.diff(heads)) > .012
