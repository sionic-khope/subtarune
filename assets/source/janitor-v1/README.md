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
사용자 “거슨하고 비슷하게” → “거슨 목소리가 이게 아닌데”(웃음 음절이 아니라 **말할 때 나는 텍스트음**). 디컴파일 저장소엔 4장 텍스트음이 없어 유튜브 효과음 클립 [VHS-OAgYyJM](https://www.youtube.com/watch?v=VHS-OAgYyJM) “Deltarune sound effects: weapon throw (damage-Mr. Gerson’s talking)”(Esperanza Platinum-Soundtrack Keeper, 2026-08-11)에서 3.345~4.36초의 말하는 소리(0.1초 간격 블립 10회)를 찾아 첫 블립 하나를 그대로 잘랐다(원본 `audio/yt_VHS-OAgYyJM.webm`, 분석용 `gerson_talk_16k.wav`):
```
ffmpeg -ss 3.345 -t 0.105 -i audio/yt_VHS-OAgYyJM.webm -af "afade=t=in:st=0:d=0.003,afade=t=out:st=0.085:d=0.02,volume=1.3,alimiter=limit=0.95:level=false" -ac 1 -ar 44100 -map_metadata -1 -c:a libmp3lame -q:a 2 audio/janitor.mp3
```
`VOICES.janitor` rate 0.9439(반키 톤다운)·level 0.72(0.85 에서 -15%, 사용자 “15퍼만 크기 줄여”)·cut·minGap 0.08. 이전 본(형섭 변형, snd_dadtxt 변형, 거슨 웃음 음절)은 전부 폐기. 게임 원본 텍스트음 ogg 가 들어오면 같은 자리에 교체한다.

## 걷기 시트 2차 (지팡이)
사용자 “왜 화면이 밝아지고 나선 지팡이 안 짚고 있냐”: 지팡이 짚은 4방향 걷기 시트를 새로 생성(`walk-cane.prompt.txt`, 참조 `walk-cane-ref.png` = 정면 프레임 + 지팡이 옆모습 raw, raw `walk-cane-raw.png` 4×4, 행 down/left/right/up). export `youngcle-hover-battle-v1/export.py walk-cane-raw.png 4 4 128 0.72 walk-cane-rawrows.png 120 largest`(배율 0.4114) → 행 재배열 → `assets/sprites/janitor.png`(정면 가시 89px). 실루엣 `janitor_shadow.png` = 이 시트를 검게(`build_shadow.py`). 이전 지팡이 없는 시트는 `janitor-walk-128.png`.

## 등록
`src/data/characters.js janitor`(이름 청소부, voice janitor, sheet janitor.png, stillPivot [64,120]). 전투 시트는 적/아군 정의(enemies.js)가 브리핑되면 `sheet`/`dance` 로 연결한다 — 사용자 “실제 인게임 전투에서는 코사크 댄스”, 전투폼 이동·대사 때는 stance-left/right.

## 검수
- 걷기: 16프레임 비어 있지 않음, 셀 경계 접촉 0, 2·4열 반대 보폭, 뒷모습 얼굴 없음(`preview-walk-2x.png`, `preview-size-compare.png`).
- 전투폼: 4프레임 왼쪽 3/4, 깃발 셀 안(`preview-stance-2x.png`). 댄스: 차기/모으기 교대(`preview-dance-3x.png`). 1·3번 차는 다리가 같은 쪽으로 보이는 한계(4프레임 루프로는 읽힘).

## 웃음 (BUILD227)
사용자 “청소부 웃음도 만들어줘 약간 호탕하게 웃는 느낌이고 얼굴 올려서, 쥰희 웃음마냥”: `laugh.prompt.txt`(참조 `laugh-ref.png` = 지팡이 정면 프레임 4배) → `laugh-raw.png`(2×2 512 셀, 얼굴 들고 눈 감고 크게 웃음, 손은 배·지팡이 유지) 를 raw 그대로 `assets/sprites/janitor-laugh.png` 로 두고 `CHARACTER_MOTIONS.janitor.laugh` 가 마젠타 색키로 쓴다(pivot·scale 은 `laugh-contract.json`). 소리 `assets/audio/sfx/laugh_janitor.mp3` = 거슨 웃음 클립 앞 1.6초.

## 웃음 2판 (BUILD228, 2026-09-19)

사용자 “청소부 웃음 모션 스프라이트 마음에 안 들어, 거슨 웃음 마냥 뭔가 할아버지 느낌 더 나야 하는데 웃을 때”: `laugh2.prompt.txt`(같은 참조 `laugh-ref.png`; 고개를 뒤로 젖혀 하늘 보기, 잇몸 보이는 큰 입, 눈가 주름·눈 꼭 감음, 굽은 등·들썩이는 어깨, 배 두드림, 지팡이에 몸을 기댐) → `laugh2-raw.png`(2×2 512 셀) 를 raw 그대로 `assets/sprites/janitor-laugh.png` 로 교체. 프레임별 pivot(발 가운데·밑변) 은 `laugh-contract.json` → `CHARACTER_MOTIONS.janitor.laugh`(scale 0.1076 유지). 1판 raw(`laugh-raw.png`) 는 보관.
