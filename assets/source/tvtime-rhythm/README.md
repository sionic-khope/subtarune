# TV Time lead chart and keyed rhythm layer

The user's BGM is unchanged: `assets/audio/bgm/youngcle_tvform_battle.mp3`
(ElevenWAV cover “It's Tv Time!”, selected video `ttz22bFLZqQ`).
SHA-256: `a08813f422c7ab18d154730ad80c619be927e7797c7a4bc8efad000428385d57`.

## Center-player chart: explicit melody, not mixed attacks

BUILD221 refined 479 old mixed-frequency candidates within 60 ms and retained434.
That moved timestamps but did not establish which attacks belonged to the lead.
The active chart now comes from the explicit melody score in `lead-score.json`,
independent of old `sourceNotes`. The old candidates/HPSS timing statistics remain
historical diagnostics in the asset, never inputs to this compiler.

Primary transcription: [Hooktheory It's TV Time!](https://www.hooktheory.com/theorytab/view/toby-fox/its-tv-time).
The frozen data records each public section API URL. This is a community melody
transcription, not an official Toby Fox score or a claim of isolated lead audio.
G-major/minor scale degrees and accidentals were converted to MIDI pitches.
Sections start at beats0/48/112/184/280/376, total408 beats at148 BPM.
The score contains443 non-rest lead notes, including repeated pitches and explicit
gaps. Sustained notes do not become repeated taps just because accompaniment attacks.

Independent arrangement cross-check:
[NoteBlock World transcription](https://noteblock.world/song/49JaC2EztF),
NBS SHA-256 `aad274cab8408d67dc62fd167743e10bae42443fc529108c09b7ca713aa11412`.
It corroborates the bridge's first32 beats (184–216) as accompaniment without
guitar lead: no guitar events, low bass doubling only; the lead enters at216.
It also corroborates the outro's principal note heads. The references differ in
some grace ornaments, so those are not presented as a perfect cover transcription.
The bridge lead gap is not audio silence and must not trigger invented fallback pads.

### Recorded-time calibration

Semitone-specific sustained pitch energy was measured on the chosen recording,
not broadband percussion peaks. Fixed section anchors in `lead-score.json` are:

| Section | Seconds after its beat axis |
| --- | ---: |
| Intro | 0.110 |
| Verse | 0.030 |
| Chorus | 0.035 |
| Bridge | 0.010 |
| Solo | 0.045 |
| Outro | 0.020 |

The intro's articulation is later than the other sections; it does not inherit
the old +0.176s mixed-onset beat offset. A local sustained-pitch rise may fine-align
a head by at most25 ms, further limited to10% of either neighboring score gap.
Score order therefore cannot reverse, and fast authored sixteenths cannot collapse.
Absolute pitch octaves in the score are metadata, not synthesized audio; octave
doubling in this cover is considered when measuring attacks.

There is no six-notes-per-two-seconds thinning: real eighth/sixteenth phrases survive.
Only contiguous grace tones shorter than0.2beat join the prior same-section attack
when their gap is at most0.05beat. No grouping crosses a rest. The resulting419
playable heads account for all443 score notes through `note.scoreBeats` (24 grouped
ornaments). The unchanged keyed audio plays the grace run as part of that phrase.
Lanes follow pitch direction: higherR, lowerL, repeated pitchalternates.

`reference-lead.json` is an independent15s chorus replay fixture. It was made from
the public chorus score plus its35ms recording anchor, not from the generated
runtime chart. It has40 heads, including repeated pitches and sustained gaps.
The first lane isL because the preceding verse ends on79 and the chorus starts76.
Independent raw-PCM narrowband checks support the main score pitch classes; neither
those checks nor browser screenshots constitute human listening approval.

## Reproduction

Run from repository root:

```
uv run tools/rhythm/tvtime_lead.py --help
uv run tools/rhythm/tvtime_lead.py
uv run --with numpy --with scipy --with pydantic --with typer --with pytest pytest tools/rhythm/test_tvtime_lead.py tools/rhythm/test_tvtime_layer.py -q
```

The compiler validates the BGM hash, reads the frozen explicit score, and changes
only center `notes` and `leadChart` provenance. Side drums/vocal arrays remain
byte-for-byte equivalent as JSON:
SHA-256 `248994718d505801a035f529bf1502e9207f448772bf4f654cbf2801adf2e620`.
Do not regenerate this chart with the older generic `chart.py --player melody`;
that algorithm does not establish lead identity.

## Unchanged keyed audio asset

`assets/audio/sfx/tvtime_melody.ogg` remains the BUILD221 mono48kHz Opus
harmonic layer,2,788,547 bytes. It is an added performance layer, not replacement BGM.
HPSS does not fully isolate lead: chords and some percussion remain.

```
uv run tools/rhythm/tvtime_layer.py --help
uv run tools/rhythm/tvtime_layer.py
```

The layer builder now preserves chart notes, so rebuilding audio cannot overwrite
the explicit melody score. Its 22,050Hz analysis uses phase-preserving HPSS,
1,024-sample FFT/128-sample hop and31-frame/bin medians. No trim, stretch, or pitch
shift occurs. Source and decoded layer each contain3,781,575 samples (171.5s);
the prior waveform correlation was zero samples of lag. That validates the audio
time axis, not whether every event is a melody note.

## Runtime fields and boundaries

- `note.t`: recorded-time head; `sourceT`: authored beat plus its section anchor.
- `note.beat/section/pitch`: melody-score identity, not the old inferred pitch.
- `note.scoreBeats`: all original heads represented by this playable attack.
- `note.soundDur`: source phrase length, at most1.65s, ending before the next head.
  It is separate from gameplay hold `dur`; this change does not add hold mechanics.
- `leadChart`: source/score hashes, anchors and source/playable/grouped counts.
- `melodyLayer`: unchanged keyed audio asset's historical generation measurements.
- BGM loop period remains the actual HTMLAudioElement duration, not decoded171.5s.
  Browser MP3 padding and all BUILD221 clock/loop corrections must be preserved.
