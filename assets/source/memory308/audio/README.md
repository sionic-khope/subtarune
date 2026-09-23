# Castle memory battle BGM provenance

## User-selected source

- URL: <https://www.youtube.com/watch?v=OobVFldn6As>
- Video ID: `OobVFldn6As`
- yt-dlp title: `50. From Now On (Battle 2) (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`
- Display uploader/channel: `Toby Fox`
- Upload date: `2025-06-04`
- Source duration: 113.201000 seconds
- Selected source format: YouTube format `251`, WebM/Opus, 48 kHz stereo,
  1,772,982 bytes.

The normal web fetch was throttled. Public yt-dlp metadata and the format-251
download above supplied the provenance. `license` was null in that metadata;
this records source identity, not a separate redistribution permission.

## Runtime asset and reproduction

`assets/audio/bgm/castle_battle.mp3` is the complete selected track, converted
once with libmp3lame quality 2. It has no trim, repeat edit, speed, pitch,
fade, or loudness processing.

```sh
uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node \
  -f '251/bestaudio' -o '/tmp/subtarune-castle-battle.XXXXXX/%(id)s.%(ext)s' \
  'https://www.youtube.com/watch?v=OobVFldn6As'
ffmpeg -v error -i /tmp/subtarune-castle-battle.XXXXXX/OobVFldn6As.webm \
  -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/castle_battle.mp3
```

## File verification

- Runtime duration: 113.174063 seconds (the 0.026937-second container/codec
  difference is not an edit to the musical content)
- Runtime codec: MP3, 48 kHz, stereo
- Runtime size: 2,388,668 bytes
- Runtime SHA-256: `f538c1d47b10819279f2e4837238bde95be08540f6cd8e9b6df2a522168d3179`
- Downloaded format-251 SHA-256: `15e35b7d9954140885e6b431907fb35e35b9127caf746c2089ca4560ab097817`
- `ffmpeg -v error -i assets/audio/bgm/castle_battle.mp3 -f null -` exited 0.

The downloaded WebM remains only in the temporary acquisition directory; this
provenance record preserves the source identity and reproducible commands.
No paid API or generated-audio service was used; acquisition cost was 0.
