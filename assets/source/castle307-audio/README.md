# 성 로비·오른쪽 회랑307 BGM

2026-09-23 사용자 지정 두 영상의 오디오 전체를 사용한다. 기존 `assets/source`, `design/audio`, `src`, `tools`에서 두 영상 ID와 곡 제목을 검색했으며 같은 곡의 기존 등록은 없었다. 새로운 효과음이나 음성은 생성하지 않았다.

## 출처와 런타임 자산

| 키 | 지정 영상·확인된 제목 | 전체 MP3 길이 | 크기 |
| --- | --- | --- | --- |
| `castle_gajaeman` | [iRMn2HlCRFI](https://www.youtube.com/watch?v=iRMn2HlCRFI), `67. SPAWN (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox` | 76.091792초 | 1,741,484바이트 |
| `castle_right` | [Jp7kfYH4VaE](https://www.youtube.com/watch?v=Jp7kfYH4VaE), `60. The Second Sanctuary (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox` | 170.260333초 | 3,649,292바이트 |

런타임 파일은 `assets/audio/bgm/<키>.mp3`다. 둘 다 48kHz 스테레오, libmp3lame quality 2. 잘라내기·반복 편집·속도·피치·페이드·음량 정규화 없이 포맷251 Opus 전체를 MP3로 변환했다. WebM 길이는 각각76.101초와170.281초이며 컨테이너/코덱 패딩 외 시간 편집은 없다.

일반 웹 페이지 열기는 throttled로 실패했다. 공개 yt-dlp 메타데이터로 두 영상의 ID·제목·업로더 표시명 `Toby Fox`, 채널 `UC26hbdeqyPRl7VsnK1UhFPw`, 게시일20250604를 확인했다. 메타데이터의 `license`는 null이며 게임 배포용 별도 이용허락을 확인했다는 뜻이 아니다. 설명에 적힌 [크레딧](https://www.materiacollective.com/music/deltarune-chapter-34-original-game-soundtrack)과 [이용 안내](https://materiamusicpub.com/youtube-faq/)는 출처 참조이며 이번 작업에서 별도 권리 확인은 하지 않았다.

## 재현과 검증

```sh
uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o '/tmp/subtarune-castle307-audio.7dDUYy/%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=iRMn2HlCRFI' 'https://www.youtube.com/watch?v=Jp7kfYH4VaE'
ffmpeg -v error -i /tmp/subtarune-castle307-audio.7dDUYy/iRMn2HlCRFI.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/castle_gajaeman.mp3
ffmpeg -v error -i /tmp/subtarune-castle307-audio.7dDUYy/Jp7kfYH4VaE.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/castle_right.mp3
ffprobe -v error -show_entries format=duration,size:stream=codec_name,sample_rate,channels -of json assets/audio/bgm/castle_gajaeman.mp3
ffmpeg -v error -i assets/audio/bgm/castle_gajaeman.mp3 -f null -
ffmpeg -v error -i assets/audio/bgm/castle_right.mp3 -f null -
```

- 도구: yt-dlp2026.08.19, ffmpeg9.0.1. 다운로드 중 일부 JS challenge/format 경고가 있었지만 요청한 포맷251 두 파일은 완전히 다운로드되었다. 로그인·쿠키·유료 API를 사용하지 않았다.
- 두 파일 전체 디코드 종료 코드0. ffmpeg volumedetect: SPAWN 평균−14.1dBFS/peak0.0dBFS, The Second Sanctuary 평균−17.4dBFS/peak−0.0dBFS. 원본 레벨을 보존했으며 게임 내 믹스는 기존 BGM volume으로 제어한다.
- 이 검증은 파일 규격·디코드 검사다. 실제 장면의 재생 시작/종료와 사람의 청취 평가는 통합 QA가 담당하며, 여기서 완료했다고 주장하지 않는다.
- 원본 오디오 및 전체 정보 JSON은 `/tmp/subtarune-castle307-audio.7dDUYy/`의 각 영상ID `.webm`/`.info.json`에 보존했다. 서명된 일시 URL 등이 포함되는 원본 정보 JSON은 커밋하지 않고 안전한 요약 `metadata.json`만 보관한다. 유료 생성/API 비용0.

| 파일 | SHA256 |
| --- | --- |
| `castle_gajaeman.mp3` | `6e61bf5689ec5b75983e93216fdb8bfd954e65384969fda99eaf2c3b12977a9a` |
| `castle_right.mp3` | `bad80820a33672b7c569a3e6bca48bcd379840ef1091964499537cf92b20cbe4` |
| `iRMn2HlCRFI.webm` | `af452bb600d0e30ab9a0ed938376b20e06195403b200ff227ced9cc8f13c2d18` |
| `Jp7kfYH4VaE.webm` | `2d99488b9ac9f9648763b833c7e07f2ee8fd1ec9915bf417bc5a27417d38db55` |

## 기존 효과음 재사용 계약

- 영클 레이저: `src/data/youngcle-special.js`의 기존 `laser_charge`→`laser_zap`; 짧은 회전 발사에 긴 `laser_beam`을 계속 중첩하지 않는다. 벽 명중 `break1`/`thud`/짧은 `rumble`을 낮게 조합하고 같은 발사마다 모든 소리를 겹치지 않는다.
- 오른쪽 철문: 기존 `src/data/cutscenes/ship_gate.js`의 `locker` 큐가 철컥 용도다.
- 이동/회전: 기존 `whoosh` 또는 짧은 `rocket` 재사용, 대사 동안 불필요한 지속 이동음을 남기지 않는다.
- 오브제맵 걸음: `src/data/footsteps.js`의 `WATER_WALK` 전체 루프+tail 계약을 사용한다. 메마른 성 바닥에는 `src/world/tiles.js`의 `FOREST_STEP`처럼 `{ ...WATER_WALK, ripple: false }`. 걸음마다 별도 one-shot을 재생하면 과거의 끊김 문제가 재발한다.
