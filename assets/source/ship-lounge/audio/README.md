# 엄청대박인배 라운지 BGM

사용자 지정곡을 전체 길이로 변환했다. 다른 곡 대체, 구간 편집, 피치·속도 변경, 음량 정규화 없음.

- 요청 URL: https://www.youtube.com/watch?v=GrCp8AHdgEM&list=PLKXdyINOQYsaHwm4rJ0QDFzsaZQNQjF0U&index=14
- 단일 영상 ID: `GrCp8AHdgEM` (플레이리스트는 내려받지 않음)
- yt-dlp 조회 제목: `14. Welcome to the Green Room (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox`
- 업로더: `Toby Fox`
- 업로드 날짜: `20250604`
- 영상 표시 길이: 95초
- 취득일: 2026-09-18
- 런타임 파일: `assets/audio/bgm/ship_lounge.mp3`
- 형식: MP3, 48,000 Hz, stereo, 95.004458초, 2,010,860바이트
- SHA-256: `3c418bb148c925f191e1b97290255bf81edca8fd33fe70e5f7557ca54cac815e`

## 재현

yt-dlp 2026.08.19에서 실제 선택된 포맷은 251(Opus/WebM). ffmpeg를 통한 MP3 q2 포맷 변환만 수행했다.

```sh
uvx --from yt-dlp yt-dlp --no-playlist -f '251/bestaudio' -x --audio-format mp3 --audio-quality 2 -o 'assets/audio/bgm/ship_lounge.%(ext)s' 'https://www.youtube.com/watch?v=GrCp8AHdgEM'
ffmpeg -v error -i assets/audio/bgm/ship_lounge.mp3 -f null -
```

전체 ffmpeg 디코드 오류 0개·종료 코드 0. 실제 맵 진입 시 음악 큐·음량·루프·이탈 정리는 게임 통합 QA에서 확인한다. 파일 확보와 청취·통합 검증은 별개다. 원곡 권리는 Toby Fox 등 권리자에게 있으며, 이 출처 기록이 배포 이용허락을 의미하지 않는다.
