# 오디오 레퍼런스 (사용자 지정)

유튜브 음원은 저작권 때문에 리포에 넣지 않는다. 아래 링크를 참고해 **직접 mp3/ogg 로 준비한 뒤** 지정 경로에 넣으면 코드 수정 없이 자동 적용된다.
- 효과음: `assets/audio/sfx/<이름>.mp3` 가 있으면 합성음 대신 파일 재생 (`loadSfxFiles`)
- **대사 글자 소리**: `assets/audio/voices/<voice>.mp3` — 블립 **한 샘플**만 넣으면 글자마다 0.1초로 잘라 재생. 톤다운은 `VOICES.<voice>.rate` (1보다 작으면 낮아짐) (`loadVoiceFiles`)

| 용도 | 레퍼런스 | 넣을 경로 | 상태 |
|---|---|---|---|
| 타이틀 인트로 BGM (로고 확대에 맞춤) | https://www.youtube.com/watch?v=Bkd3lU4-y0M | `assets/audio/intro.mp3` | 파일 대기. 받으면 `src/ui/title.js` `ZOOM_DURATION` 을 곡의 '쾅' 지점(초)에 맞춘다 |
| 타이틀 인트로 BGM (이전 후보) | https://www.youtube.com/watch?v=N-9A5952ZvM | — | 대체됨 |
| X(취소/뒤로가기) 효과음 | https://www.youtube.com/watch?v=GPZni8sCraY | `assets/audio/sfx/cancel.mp3` | 파일 대기 (현재 합성음) |
| 전투 진입 사운드 | https://www.youtube.com/watch?v=u-f_zuHgxmM | `assets/audio/sfx/battle_start.mp3` | 나중에 사용 (전투 시스템 미구현) |
| 전투 완료 사운드 | https://www.youtube.com/watch?v=J2ZZCJNX5YI | `assets/audio/sfx/battle_end.mp3` | 나중에 사용 |
| 빠맨 대사 음색 (초반 '띠링'을 톤다운) | https://www.youtube.com/watch?v=4wSPkpzSQQE | `assets/audio/voices/ppaman.mp3` (0.1초 한 샘플) | 파일 대기. 현재 종소리 합성. 톤다운은 `VOICES.ppaman.rate`(0.9) |
| **나레이션** 음색 (이름 없는 `* ~가 있다` 대사) | https://www.youtube.com/watch?v=-XAY6fHBTpI | `assets/audio/voices/narrator.mp3` (0.1초 한 샘플) | 파일 대기. 현재 사인파 합성 |
| **경섭** 대사 음색 (살짝 톤다운) | https://www.youtube.com/watch?v=SyrceIAQJf0 | `assets/audio/voices/gyeongsub.mp3` | 파일 대기. `VOICES.gyeongsub.rate`(0.88) 로 톤다운 |
| **쥰희** 캐릭터 웃음소리 | https://www.youtube.com/watch?v=5z7ugBaZsp8 | `assets/audio/sfx/laugh_junhee.mp3` | 캐릭터 미등장. 스크립트에서 `{ sfx: 'laugh_junhee' }` 로 재생 |

메모: 쥰희 = 웃음소리가 있는 캐릭터 (아직 스프라이트/대사 없음).
