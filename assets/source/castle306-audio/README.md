# 가재맨 성 접근306 BGM

2026-09-23 사용자 지정 영상의 전체 음원을 성 접근 맵 BGM으로 사용한다. 기존 `assets/source/`, `design/audio/`, `src/`에서 영상 ID와 ATRIUM을 검색했으나 같은 곡의 기존 등록은 없었다.

## 출처

- 영상: https://www.youtube.com/watch?v=JygDUsh9W5E
- 제목: `48. ATRIUM (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`
- yt-dlp 공개 메타데이터: 업로더 `Toby Fox`, 채널 `UC26hbdeqyPRl7VsnK1UhFPw`, 업로드20250604, 표시64초, 포맷251(Opus).
- 영상 설명의 크레딧: https://www.materiacollective.com/music/deltarune-chapter-34-original-game-soundtrack
- 영상 설명의 이용 안내: https://materiamusicpub.com/youtube-faq/
- 이 출처 기록은 게임 배포용 별도 이용허락을 확인했다는 뜻이 아니다. 공개 메타데이터에 명시적 CC 라이선스는 없다.

일반 웹 열기는 요청 제한으로 실패했다. `yt-dlp`의 공개 영상 메타데이터와 전체 오디오 다운로드로 ID·제목·채널을 확인했다. 로그인·쿠키를 사용하지 않았다.

## 런타임·검증

- 키: `castle_approach`
- 파일: `assets/audio/bgm/castle_approach.mp3`
- 전체 길이63.680000초, 48kHz stereo MP3, 1,051,940바이트.
- 전체 디코드 성공. float peak−1.285878dBFS, RMS−15.368563dBFS, NaN/Inf0.
- 트리밍·반복 편집·볼륨·피치·속도·페이드 변경 없이 전체 원본을 MP3로 변환했다. 게임의 일반 BGM 루프가 파일 전체를 반복한다.
- `Sound.preloadBgm`/`playBgm`은 파일 이름을 사용하므로 별도 BGM 레지스트리 수정이 없다. 맵 연결과 실제 재생 확인은 맵 통합에서 수행한다. 이 파일 디코드 검사는 실제 장면 청취를 대신하지 않는다.

## 재현

```sh
python3 -m yt_dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o '/tmp/subtarune-castle306-bgm.%(ext)s' 'https://www.youtube.com/watch?v=JygDUsh9W5E'
ffmpeg -i /tmp/subtarune-castle306-bgm.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/castle_approach.mp3
ffprobe -v error -show_entries format=duration,size:stream=codec_name,sample_rate,channels -of json assets/audio/bgm/castle_approach.mp3
ffmpeg -i assets/audio/bgm/castle_approach.mp3 -af astats=metadata=0:reset=0 -f null -
```

원본 WebM과 전체 메타데이터는 `/tmp/subtarune-castle306-bgm.webm`, `/tmp/subtarune-castle306-bgm.info.json`에 보관하며 배포에는 MP3만 포함한다.

| 파일 | SHA256 |
| --- | --- |
| 런타임 MP3 | `3f0f118adbe89174212abab37a39af5a0cd40c0f21b6a16164c9ed91dba11869` |
| 원본 WebM | `10b12d04bf486b212edd9a0ffacde00f388819e6f9f1cb9b859d2a7bfa803abb` |
