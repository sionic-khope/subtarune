# 청소부 (janitor-v1, BUILD226, 2026-09-18)

사용자 브리핑: "캐릭터 등록 일단 하나 할 건데 [그림] 이걸로 청소부인데 살짝 이거에서 조금 진짜 조금만 더 허약한 + 우리 섭타룬 버전으로", "이름이 청소부고 목소리는 형섭 목소리에서 할아버지 느낌으로", "거슨 목소리 델타룬 참고하면 됨",
"청소부 전투 스프라이트도 새로 만들 건데 [거슨 그림] 이거 왼쪽 오른쪽 보고 있는 모습(적군일 때 아군일 때) — 대사 칠 때나 전투폼일 때 좌우상하 움직일 때 스프라이트, 실제 인게임 전투에서는 [루리웹 gif]처럼 코사크 댄스를 추고 뒤에 망치는 붉은 깃발로 재구성. 두 사진과 링크는 자세 참고용".

## 공급자
OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 1장), quality high, 1024×1024. 전송본 프롬프트·모델·참조는 `*-raw.prompt.txt`, usage 는 `*-raw.meta.json`, 로그 `gen-*.log`. 각 시트 raw 1회로 채택(재생성 없음).

| 산출 | raw | 참조(`--ref`) | export | runtime |
|---|---|---|---|---|
| 걷기 4방향×4 | `walk-raw.png` (4×4, 256 셀; 행 순서 down/left/right/up) | `walk-ref.png` = 사용자 그림(`reference.png`) + 나람 필드 정면 프레임 4배(도트 밀도) | `youngcle-hover-battle-v1/export.py walk-raw.png 4 4 128 0.72 walk-runtime-rawrows.png 120 largest`(배율 0.4208) → 행 재배열 [down, up, left, right] | `assets/sprites/janitor.png` 512×512(128 셀), pivot [64,120], 정면 가시 91px(형섭 100·최미스 96) |
| 전투폼 서 있기(깃발) | `stance-raw.png` (2×2) | `stance-ref.png` = 걷기 raw 정면 프레임(정체성) + 거슨 그림 4배(자세만) | `export.py stance-raw.png 2 2 128 0.86 … 118 largest`(배율 0.2452) | `assets/enemies/janitor-stance-left.png` 256×256, 왼쪽 향함(적일 때). `janitor-stance-right.png` = 셀별 좌우 반전(아군일 때) |
| 코사크 댄스(전투 대기) | `dance-raw.png` (2×2: 차기·모으기·차기·모으기, 장대 등 뒤 가로, 붉은 깃발) | `dance-ref.png` = 전투폼 raw 프레임(정체성) + gif 3프레임 3배(자세만) | `export.py dance-raw.png 2 2 128 0.86 … 118 largest` | `assets/enemies/janitor-dance.png` 256×256, 왼쪽 향함 |

참조 원본: `reference.png`(사용자 그림), `gerson-pose-ref.png`(델타룬 거슨, 자세만), `gerson-dance-ref.gif` + `gerson-dance-contact.png`(루리웹 700058/17735 의 gif, 자세만). 거슨의 색·등껍질·망치·스카프는 쓰지 않는다.

## 목소리
`audio/janitor.mp3` → `assets/audio/voices/janitor.mp3`. 형섭 샘플(`hyungsub.mp3`, 가재맨 '넌' 0.26s)을 ffmpeg 로 변형:
```
ffmpeg -i assets/audio/voices/hyungsub.mp3 -af "asetrate=48000*0.68,aresample=48000,highpass=f=100,lowpass=f=1900,tremolo=f=28:d=0.55,bass=g=5:f=170,volume=1.7,alimiter=limit=0.95:level=false" -ac 1 -ar 44100 -map_metadata -1 -c:a libmp3lame -q:a 2 audio/janitor.mp3
```
-7반음·저역·떨림으로 할아버지 느낌(거슨처럼 낮고 갈라진 소리; 1차 -5반음에서 사용자 “쫌만 더 늙은 느낌” 으로 더 낮춤). 0.38s. `VOICES.janitor` rate 0.86·cut·minGap 0.1.

## 등록
`src/data/characters.js janitor`(이름 청소부, voice janitor, sheet janitor.png, stillPivot [64,120]). 전투 시트는 적/아군 정의(enemies.js)가 브리핑되면 `sheet`/`dance` 로 연결한다 — 사용자 “실제 인게임 전투에서는 코사크 댄스”, 전투폼 이동·대사 때는 stance-left/right.

## 검수
- 걷기: 16프레임 비어 있지 않음, 셀 경계 접촉 0, 2·4열 반대 보폭, 뒷모습 얼굴 없음(`preview-walk-2x.png`, `preview-size-compare.png`).
- 전투폼: 4프레임 왼쪽 3/4, 깃발 셀 안(`preview-stance-2x.png`). 댄스: 차기/모으기 교대(`preview-dance-3x.png`). 1·3번 차는 다리가 같은 쪽으로 보이는 한계(4프레임 루프로는 읽힘).
