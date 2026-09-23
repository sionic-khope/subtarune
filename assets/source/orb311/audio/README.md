# Castle orb room audio provenance

## Exact user-selected BGM

- URL: https://www.youtube.com/watch?v=byUCuhB8r5Q
- Video ID: `byUCuhB8r5Q`
- Public metadata title: `46. The distance between two (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`
- Display uploader: `Toby Fox`; channel ID: `UC26hbdeqyPRl7VsnK1UhFPw`
- Upload date: 2025-06-04; displayed duration: 47 seconds.
- Acquired format: `251`, WebM/Opus, 48 kHz stereo, 47.441000 seconds, 829,963 bytes.
- Availability: public. Metadata license field was null; this is source identification, not a separate redistribution permission.

No existing source-ID or track-title match was found in the project before acquisition. The exact requested public audio was obtained with the existing yt-dlp route; no browser cookies, authentication, paid APIs, or substitute track were used.

## Runtime asset

`assets/audio/bgm/castle_orb.mp3` is the full track at its original speed and pitch, converted once using libmp3lame quality 2. There is no trim, fade, loudness normalization, repeated segment, or musical edit. Looping belongs to the runtime BGM player.

- MP3, 48 kHz, stereo.
- Duration: 47.426771 seconds. The 0.014229-second container/codec difference is not a content edit.
- Size: 968,276 bytes.
- Measured full-track mean: -23.9 dBFS; peak: -8.3 dBFS. No gain processing was applied.
- SHA-256: `a9d2724410568ea0ab4aa6f47efde1ab1e25d9fb45eb59b35670b8ccdeff812f`.
- Source WebM SHA-256: `7b90d08286962c3e7c3ea946cb805c5b95460965a7efbceba2eb3dd57880eb6e`.
- Full ffmpeg decode exited 0. Subjective listening and in-game playback are not covered by this file verification.

## Reproduction

```sh
uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node \
  -f '251/bestaudio' --write-info-json \
  -o '/tmp/subtarune-orb311-audio.BJDprf/%(id)s.%(ext)s' \
  'https://www.youtube.com/watch?v=byUCuhB8r5Q'
ffmpeg -v error -i /tmp/subtarune-orb311-audio.BJDprf/byUCuhB8r5Q.webm \
  -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/castle_orb.mp3
ffmpeg -v error -i assets/audio/bgm/castle_orb.mp3 -f null -
```

Raw acquisition audio and metadata remain in the named temporary directory, outside the distributable asset tree. Metadata contains expiring stream URLs and is not copied into source control. This source record preserves only stable public identification and hashes. Monetary cost: 0.

## Existing SFX candidates, not new assets

These recommendations are grounded in existing labels and scene usage, not claimed listening:

- Orb contact/energy buildup: `power` (0.712971 s), the existing `snd_power` energy-preparation cue. Suggested volume 0.55–0.65 once when the hand makes contact.
- Rising transfer: `spearappear` (0.536961 s), already used by warm-bidet `bossVanish` and janitor/Choimis ascent. Suggested volume 0.7 once at the outgoing pulse.
- Right seal static: `static_burst` (0.22 s), the existing synthesized crackle used in television/static scenes. Two discrete low-volume pulses fit the requested stutter; do not leave a loop running.
- Purple seal illumination: `great_shine` (2.258073 s), the existing `snd_great_shine` energy/reunion cue. Suggested volume 0.55 once at the actual purple-light reveal, with its tail allowed to decay.

Existing source references: `design/audio/references.md`, `assets/source/subrio169/README.md`, and `assets/source/janitor-asgore-parry/README.md`. No common SFX bytes were changed.
