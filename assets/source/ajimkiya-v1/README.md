# 아짐키야 4인조 (ajimkiya-v1, BUILD227, 2026-09-18)
사용자 사진(Team Azimkiya, `reference.png`)에서 네 사람: 1 왼쪽 끝(보라·주황 룽기), 2 가운데 검은 후드(파란 룽기), 3 오른쪽 끝(청록 룽기·수염), 4 오른쪽 둘째(흰·자주 줄 룽기·샌들). 자세는 춤(팔 벌림·팔 올림·팔 벌림·한 팔 올림) 4프레임.
- 공급자 OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 `dance-ref.png` = 사진 640px + 청소부 정면 3배 도트 밀도), 1024×1024 2×2. 프롬프트 `ajimkiyaN.prompt.txt`, 각 raw 1회 채택(`ajimkiyaN-raw.png`).
- export: 전투 `youngcle-hover-battle-v1/export.py ajimkiyaN-raw.png 2 2 128 0.86 assets/enemies/ajimkiyaN-dance.png 118 largest`(배율 0.225~0.235). 필드 `assets/props/ajimkiyaN-dance.png` = 128 셀 4프레임 가로 스트립 그대로(512×128, prop anim cols 4 — 사용자 “부족 스프라이트 더 크게”). 미리보기 `preview-field-3x.png`.
- 소리 `audio/`: 사용자 영상 mARppJip_hc → `assets/audio/bgm/ajimkiya_song.mp3`(전체), `assets/audio/sfx/ajimkiya_line.mp3`(4.40~6.80초 = whisper 음성 인식으로 찾은 실제 가창 “가재맨 애미 뒤짐”: 가재맨@4.48 애미@5.72 뒤짐@6.10; 인식 결과 `audio/whisper2/song_src.json`), 전투 브금 QvoQVCBqegU → `assets/audio/bgm/jjajang_battle.mp3`.
- 등록: `enemies.js ajimkiya1~4`, 컷신 `src/data/cutscenes/jjajang_pines.js`, 패턴 `src/battle/ajimkiya-patterns.js`. 계약 `design/narrative/cutscenes/jjajang_pines.md`.
