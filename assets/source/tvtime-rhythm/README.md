# TV Time source-aligned rhythm layer

Source: the user's existing `assets/audio/bgm/youngcle_tvform_battle.mp3`
(`It's Tv Time!`, original selected video `ttz22bFLZqQ`). The BGM file is unchanged.
SHA-256: `a08813f422c7ab18d154730ad80c619be927e7797c7a4bc8efad000428385d57`.

Output: `assets/audio/sfx/tvtime_melody.ogg`, mono Opus in OGG, 48 kHz encoded,
2,788,547 bytes. This is an additional keyed performance layer, not replacement BGM.
It keeps the actual recorded pitches/timbres rather than synthesizing guessed MIDI notes.
HPSS does not completely isolate the lead: chords and some percussion remain.

## Reproduction

Run from repository root:

```
uv run tools/rhythm/tvtime_layer.py --help
uv run tools/rhythm/tvtime_layer.py
uv run --with numpy --with scipy --with pydantic --with typer --with pytest pytest tools/rhythm/test_tvtime_layer.py -q
```

The tool uses ffmpeg for decoding/Opus encoding, NumPy for phase-preserving spectra,
SciPy median filters for HPSS (31-frame temporal harmonic median versus 31-bin
percussive median), Pydantic for chart input, and Typer for the CLI. The spectral
mask smoothly removes bass below approximately 300 Hz and rolls off above 6.2 kHz.
Analysis uses 22,050 Hz, 1,024-sample Hann FFTs and 128-sample hops. FFT frame zero
is centered on source sample zero; inverse reconstruction removes that same padding.
No time stretch, pitch shift, leading trim, or new melody is introduced.

Each of the 479 original events is matched to the nearest harmonic-flux peak
within 60 ms, retaining lanes and old `pitch` as QA metadata. A greedy spacing pass
retains 434 events and drops 45 that would violate the existing 180 ms minimum gap
or six-note maximum in a rolling two-second window. Events are not shifted back to
manufacture spacing. The original candidates are retained in `sourceNotes` for
deterministic regeneration. No beat-grid snapping
is applied after this source measurement. The chart retains BPM 148 and offset
0.176 as tempo metadata, not forced event times.

## Runtime contract

- `note.t`: corrected absolute source time, seconds.
- `note.sourceT`: original event time before this correction; also makes reruns stable.
- `note.soundDur`: keyed sample segment duration, at most 1.65 s and ending at least
  12 ms before the next event. It is separate from the existing gameplay hold `dur`.
- `note.pitch`: old estimated MIDI value retained for comparison only; do not synthesize it.
- `melodyLayer.asset`: output file path; use the same source time as the playing BGM.
- `melodyLayer.sampleRate`: verification/analysis rate (22,050 Hz), not encoded rate.
- `melodyLayer.sourceSamples/decodedSamples`: sample counts at that verification rate.
- Media looping uses the actual HTMLAudioElement duration, not this decoded duration.
  Browser MP3 playback can include a longer padded tail. The runtime uses that media
  period for chart copies and sample offsets, and never wraps the shorter layer early.

## Observed verification

Source and decoded layer both contain 3,781,575 samples at 22,050 Hz: exactly
171.5 s. OGG container duration is 171.5065 s because it includes Opus pre-skip;
decoded playback excludes that codec delay. Decoded peak is 0.941712, below clipping.
Median event correction is 13.143 ms; maximum is 43.265 ms.

Independent time-domain check uses rising peaks of an 8 ms RMS envelope, not the
spectral-flux detector used to change events. Median distance to those attacks
improves from 5.294 ms to 3.719 ms on the retained events. This is an alignment diagnostic, not proof of
handwritten melody transcription or a claim that every event is a lead-note attack.

Six synthetic tests pass: exact impulse sample position through FFT reconstruction,
sustained-sine phase preservation and headroom, known gated-tone attack within
12 ms, no invented corrections on silence, and missing evidence reported for silent
envelope measurements, and source-time-preserving density selection. A separate 10–20 s source/layer waveform correlation peaks at
zero samples of lag. The actual CLI `--help`, successful
full generation, and invalid source path were run. Playback/feel verification is
owned by the runtime integration pass; these measurements are not listening approval.

Algorithm API references: [SciPy STFT](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.stft.html),
[inverse STFT](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.istft.html),
[median filter](https://docs.scipy.org/doc/scipy/reference/generated/scipy.ndimage.median_filter.html).
