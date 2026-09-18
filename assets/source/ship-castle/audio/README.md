# 엄청대박인배 납치·성 출현 연출 BGM

사용자가 지정한 단일 영상 전체를 MP3로 변환했다. 대체곡, 트리밍, 피치·속도 변경, 음량 정규화, 새 페이드 가공 없음.

- 요청 URL: https://www.youtube.com/watch?v=TBVteb9Z6ps&list=PLwjEXrvFo-2B7iCX61eOThc_oGihi84l9&index=125
- 영상 ID: `TBVteb9Z6ps` (`--no-playlist`로 이 영상만 취득)
- 조회 제목: `38. BURNING EYES (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`
- 업로더 표시명: `Toby Fox`
- 업로드 날짜: `20250604`
- 표시 길이: 69초
- 취득일: 2026-09-18
- 런타임 파일: `assets/audio/bgm/ship_castle.mp3`
- 형식: MP3, 48,000 Hz, stereo, 69.334792초, 1,649,084바이트
- SHA-256: `c3cfd74862a2dbf696ec3be5fe8598fb6fd63f36bfb2dd47e23c83e27d985b98`

## 재현·검증

yt-dlp 2026.08.19의 실제 선택 포맷은 251(Opus/WebM)이며, ffmpeg의 MP3 q2 변환만 수행했다.

```sh
uvx --from yt-dlp yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2 -o 'assets/audio/bgm/ship_castle.%(ext)s' 'https://www.youtube.com/watch?v=TBVteb9Z6ps'
ffprobe -v error -show_entries format=duration,size:stream=codec_name,sample_rate,channels -of json assets/audio/bgm/ship_castle.mp3
ffmpeg -v error -i assets/audio/bgm/ship_castle.mp3 -f null -
shasum -a 256 assets/audio/bgm/ship_castle.mp3
```

전체 ffmpeg 디코드 종료 코드 0, 오류 0개. yt-dlp의 JavaScript runtime 미설정 경고는 있었지만 포맷 251 다운로드와 변환은 성공했다. 게임 내 큐·연속 재생·중단 정리는 통합 QA 범위이며 자산 검사만으로 청취 승인 또는 연출 검증 완료를 주장하지 않는다.

원곡 권리는 Toby Fox 등 해당 권리자에게 있다. 위 메타데이터는 지정 영상의 표시값이며, 출처 기록이 이용허락 확인을 뜻하지 않는다.
