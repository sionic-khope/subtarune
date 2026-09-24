# BUILD318 castle_dark_path

- User-selected URL: https://www.youtube.com/watch?v=sbzmYjE49N4
- Metadata: `62. 13am (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`; uploader Toby Fox; channel `UC26hbdeqyPRl7VsnK1UhFPw`; published2025-06-04; displayed duration91s; audio-only format251, Opus/WebM.
- Runtime: `assets/audio/bgm/castle_dark_path.mp3`, complete91.254438s,48kHz stereo,946460bytes, libmp3lame quality2. No trimming, fade, gain, rate or pitch change.
- Runtime SHA256: `8aaec84c65d3422b6e92b55be6be4b46b82d6260bdc86ba58f1a0a768b361fcf`.
- Source WebM SHA256: `009d1ba417e97d773b5f7f3e7a6c19652bc2b8ceed2b8fbfac8d8323350b4c92`.
- ffprobe confirms codec/rate/channels/duration. Full ffmpeg decode exits0; volumedetect mean−23.5dBFS, peak−8.3dBFS. These are file checks, not a claim of subjective listening or in-game cue verification.
- Acquired2026-09-24. Ordinary web fetch was throttled; initial yt-dlp download returned403. Same exact source succeeded with curl-cffi Chrome TLS impersonation using the existing yt-dlp/ffmpeg pipeline. No alternate recording or track substituted. Temporary source and full metadata live outside the repo at `/private/tmp/subtarune-castle318-audio.jFriYc/`.

```sh
uvx --from 'yt-dlp[default,curl-cffi]' yt-dlp --no-playlist --impersonate chrome --js-runtimes node --remote-components ejs:github --extractor-args 'youtube:player_client=default;formats=missing_pot' -f 'bestaudio/best' --write-info-json -o '/private/tmp/subtarune-castle318-audio.jFriYc/source.%(ext)s' 'https://www.youtube.com/watch?v=sbzmYjE49N4'
ffmpeg -hide_banner -loglevel error -n -i /private/tmp/subtarune-castle318-audio.jFriYc/source.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/castle_dark_path.mp3
```

The audio remains the property of its original rights holders. Source metadata is provenance, not a separate distribution license.
