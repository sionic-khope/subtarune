# BUILD125 audio provenance

Retrieved2026-09-13. The two YouTube tracks were explicitly chosen by the user.

| Video ID | Exact metadata title | Uploader | Upload date | Metadata duration | Download format |
|---|---|---|---|---|---|
| XEdoMoV4D6k | ANOTHER HIM | Toby Fox |2018-11-17|48s|251|
| _km4FuXOCbs | I'm Very Bad | Toby Fox |2018-11-17|14s|251|

```sh
yt-dlp --no-playlist -f '251/bestaudio' --write-info-json -o '/tmp/captain125-%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=XEdoMoV4D6k' 'https://www.youtube.com/watch?v=_km4FuXOCbs'
ffmpeg -i /tmp/captain125-XEdoMoV4D6k.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/captain_reveal.mp3
ffmpeg -i /tmp/captain125-_km4FuXOCbs.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/captain_mankatsuki.mp3
ffmpeg -i assets/source/captain125/audio/snd_punchheavythunder.wav -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/sfx/captain_thunder.mp3
ffmpeg -i assets/source/captain125/audio/snd_rurus_appear.ogg -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/sfx/captain_transform.mp3
cp assets/audio/voices/hyungsub.mp3 assets/audio/voices/gajaeman_shadow.mp3
```

The MP3 conversions preserve the full source, rate, pitch and gain; no trimming or fades. The voice copy is toned down only in runtime playback configuration, from hyungsub rate0.92 to shadow rate0.86.

Game SFX source revision: `TeamBlossomDevs/DeltaruneDecomp_beta@154f9a97b8f18fa6974e917c4c4e774bde6b7eba`.

- [snd_punchheavythunder](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_punchheavythunder/snd_punchheavythunder), WAV container with no original extension, stored here as `.wav`. It is byte-identical to the previously sourced snd_chargeshot_fire sample; no cannon processing was applied here.
- [snd_rurus_appear](https://github.com/TeamBlossomDevs/DeltaruneDecomp_beta/blob/154f9a97b8f18fa6974e917c4c4e774bde6b7eba/sounds/snd_rurus_appear/snd_rurus_appear.ogg), Rouxls appearance sound.

These are archived game samples, not a publisher download site. Rights remain with the original owners; this provenance does not assert a separate reuse license.

| File | SHA256 |
|---|---|
| captain_reveal.mp3 |96f98e13baced06bb7887bd7f1dff47c646f1ef4d6bfbdf574dce40db171ece8|
| captain_mankatsuki.mp3 |df3552e0d8f1f08029923f8e4973ed9143fb64ad74bfada35626c3fed910c504|
| gajaeman_shadow.mp3 (=hyungsub.mp3) |39c4ecbd566b4e79da17df72f0b3c17f891c279f6daf52de76bd134551da78b2|
| captain_thunder.mp3 |d970b86a6baf1018de3cd90246589205dc371c3b844e8b5185bc7e2ce3dda302|
| captain_transform.mp3 |ad9486b103d261c06bd6c2d917d51adf0b9710ab809ee673b9110f97ec8fd3a4|
| snd_punchheavythunder.wav |59acdd7fdb558333a25be9cb50fdac490c5b6b2e1f99a9f8ce7cb1079c90c7e6|
| snd_rurus_appear.ogg |a55f77023e0bcb6181094cbc844cc04a7130aaebcaa07766a0a7afa7892223fc|

ffprobe and ffmpeg full decode passed for all five runtime files. Detailed durations, channels and measured levels are in `design/audio/references.md`. This verification does not claim subjective listening or browser integration testing.
