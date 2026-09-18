# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "scipy", "pydantic>=2", "typer", "pytest"]
# ///
# ─── How to run ───
# Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh
# Run: uv run --with numpy --with scipy --with pydantic --with typer --with pytest pytest tools/rhythm/test_tvtime_layer.py
# ──────────────────
"""Synthetic source-time contracts for the TV Time asset pipeline."""
from __future__ import annotations

import numpy as np
import pytest

import tvtime_layer as layer


def test_roundtrip_keeps_impulse_at_original_sample() -> None:
    # Given an impulse away from a frame boundary.
    samples = np.zeros(22051, dtype=np.float32)
    samples[8765] = 0.7
    # When analysis and synthesis use explicitly centered FFT frames.
    spectrum = layer.analyze(samples)
    rebuilt = layer.reconstruct(spectrum, len(samples))
    # Then neither padding nor the window center shifts source time.
    assert len(rebuilt) == len(samples)
    assert np.argmax(np.abs(rebuilt)) == 8765
    np.testing.assert_allclose(rebuilt, samples, atol=1e-6)


def test_harmonic_layer_preserves_sine_phase_without_clipping() -> None:
    # Given a loud sustained lead and a quieter bass.
    t = np.arange(44100) / 22050
    samples = 2 * np.sin(2 * np.pi * 880 * t) + np.sin(2 * np.pi * 80 * t)
    # When harmonic masking is applied on the original complex spectrum.
    processed = layer.harmonic_layer(samples.astype(np.float32))
    # Then sample count, phase alignment and finite headroom are preserved.
    assert len(processed) == len(samples)
    assert np.max(np.abs(processed)) <= 0.940001
    assert np.isfinite(processed).all()
    assert np.corrcoef(processed[2205:-2205], np.sin(2 * np.pi * 880 * t[2205:-2205]))[0, 1] > 0.98


def test_attack_refinement_follows_known_tone_start() -> None:
    # Given a gated sinusoid beginning at exactly one second.
    t = np.arange(66150) / 22050
    samples = np.sin(2 * np.pi * 880 * t) * ((t >= 1) & (t < 1.4))
    # When a deliberately late chart note is matched to tonal attacks.
    corrected = layer.refine_times(samples.astype(np.float32), np.array([1.035]))
    # Then the result follows source attack time, not FFT window start time.
    assert corrected[0] == pytest.approx(1.0, abs=0.012)


def test_refinement_is_bounded_when_no_attack_exists() -> None:
    # Given silent source audio and notes near both boundaries.
    samples = np.zeros(22050, dtype=np.float32)
    original = np.array([0.0, 0.97])
    # When the source contains no supported correction.
    corrected = layer.refine_times(samples, original)
    # Then arbitrary peaks are not fabricated.
    np.testing.assert_array_equal(corrected, original)


def test_envelope_metric_reports_no_evidence_when_source_is_silent() -> None:
    samples = np.zeros(22050, dtype=np.float32)
    distance = layer.envelope_distance(samples, np.array([0.5]))
    assert distance is None


def test_selected_attacks_keep_source_times_with_original_density_limit() -> None:
    times = np.array([1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 3.01])
    selected = times[layer.select_attack_indices(times)]
    np.testing.assert_allclose(selected, [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 3.01])
    assert np.min(np.diff(selected)) >= 0.18
    assert max(np.count_nonzero((selected > t - 2) & (selected <= t)) for t in selected) <= 6
