# 후회의 방 음악 출처

- 사용자 지정: https://www.youtube.com/watch?v=7f1RK1m7qvc
- 제목: 63. The Third Sanctuary (DELTARUNE Chapter 3+4 Soundtrack) - Toby Fox
- 표시 업로더 Toby Fox, 게시2025-06-04, format251 WebM/Opus.
- 일반 웹 조회는 throttled; 공개 yt-dlp 경로로 같은 지정 영상의 전체 음원을 취득했다. 로그인·유료 API·음원 생성은 사용하지 않았다.
- license 메타데이터는 null이며, 이 기록이 별도의 재배포 허가를 뜻하지 않는다.

## 재현

```sh
uvx --from yt-dlp yt-dlp --no-playlist --js-runtimes node:/opt/homebrew/bin/node -f '251/bestaudio' --write-info-json -o '/tmp/subtarune-regret315-audio.Q5CVK5/%(id)s.%(ext)s' 'https://www.youtube.com/watch?v=7f1RK1m7qvc'
ffmpeg -v error -i /tmp/subtarune-regret315-audio.Q5CVK5/7f1RK1m7qvc.webm -map_metadata -1 -c:a libmp3lame -q:a 2 assets/audio/bgm/castle_regret.mp3
```

트리밍·반복 편집·속도·피치·음량 가공 없이 한 번 MP3 변환. 런타임251.715938초,48kHz stereo,5,536,220바이트. 전체 decode 종료0. 원본 메타데이터 duration252초는 반올림 값이다.

- runtime SHA256: `70745492d8715dfd5e2eed9448c9a9ba91a6b948eaf1ffc30d11d09520c4ab48`
- source WebM SHA256: `1a612fde26b76038ae968a4e9aac22f0febf2a4189efb09b8e5a461c638d6ff2`

필드 키는 `castle_regret`, 전투 키는 기존 `castle_battle`. 디코드·브라우저 재생 시계 검증과 주관적 음색 청취는 구분한다.
