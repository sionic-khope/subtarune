# 위믹스 NPC — 사용자 지정 원본 발췌

- Source: https://www.youtube.com/shorts/uLWnUnSWbGU
- Title: True Damage 에코 스킬 대사 #shorts
- Channel: 리아리토 — https://www.youtube.com/channel/UCzDFU1EY4M1Ivof-yboOTGw
- Upload date: 2021-12-30
- Retrieved: 2026-09-12 (Asia/Seoul)
- Source audio duration: 38.241 s; Opus, 48 kHz, stereo.
- User-requested vicinity: 30–34 seconds; target NPC line is “위믹스~”. The source video's burned-in subtitle actually reads “리믹스!”.
- Delivery: `wemix_remix.mp3`, intended destination `assets/audio/sfx/wemix_remix.mp3`.
- Exact excerpt: source 30.720–32.800 s, 2.080 s duration. Preserves the original game skill voice/effects mixed together; no isolated-voice claim.
- Encoding: MP3, 160 kb/s, 44.1 kHz, stereo, 10 ms fade in and 80 ms fade out. No gain or pitch change.
- SHA-256: `50c865a5d499855a070061ce8b2a4a7511c703b63ee460dff0e5dd367913ab6c`

## Verification evidence and limits

1. Downloaded the exact user-specified URL with existing yt-dlp 2026.08.19. Raw metadata is `source.info.json`; raw audio `source.webm`; source video `video.mp4`.
2. Visually inspected `frames28_35.jpg` and `frames30_33_25.jpg` extracted from the actual source video. The latter is a 7 × 2 grid, row-major, source times 30.00, 30.25, …, 33.25 s. “리믹스!” appears at 30.75 s and persists through approximately 32.25 s. “리플레이!” follows at 33.25 s; excluded from delivery.
3. ffmpeg silencedetect over source 29.5–34.5 s, `noise=-28dB, duration=0.08`, reports preceding quiet interval ending at source 30.840271 s and subsequent quiet interval starting at 32.609146 s. These are amplitude-based boundaries, not linguistic transcription.
4. ffprobe confirms delivered MP3 duration 2.080000 s, 42,884 bytes, two channels, 44,100 Hz. Full ffmpeg decode to null completed without error.
5. Direct auditory inspection was attempted using the audio output helper, but the tool reported “audio content omitted because you do not support audio input”. Therefore no claim of having listened is made. Phrase identity is established from source burned-in text; playback validity from complete decoder success.
6. YouTube automatic Korean captions were requested but returned HTTP 429; no transcript fabricated.

Only the short delivered MP3 belongs in the game repository; keep full source media and metadata outside the repo as required by `design/audio/references.md`. User-provided source for the existing noncommercial fan-game workflow; no new license assertion.
