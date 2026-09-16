# 영클 비행 장치 전투 대기 v3 — 왼쪽 아래 3/4 시점·비웃는 표정 (gpt-image-2.5-sunburst, BUILD209)

사용자 2026-09-17: “인게임 영클 스프라이트 살짝 아예 옆에보기보단 대각 왼쪽아래를 보고있는느낌? 근데 옆을보는건맞고 크기는 10퍼 작았으면함 … 약간 비웃는듯한 느낌도”.

- 참조 `ref.png` = v1 과 같은 필드 시트(왼쪽·정면). 프롬프트 `idle.prompt.txt`(전송본 `idle-raw.prompt.txt`, usage `idle-raw.meta.json`): 45° 돌린 3/4, 머리는 왼쪽 아래를 보고, 반쯤 감은 눈꺼풀·한쪽 올라간 입꼬리(smug sneer), 4프레임(포드 높낮이·불꽃·번개).
- export: `../youngcle-hover-battle-v1/export.py idle-raw.png 2 2 128 0.86 assets/enemies/youngcle-hover-battle-idle.png 118 all`(배율 0.2745, `export-meta.json`). 10% 축소는 `enemies.js youngcle_hover.scale 0.9`.
- v2(BUILD204 sunburst 옆모습)는 `../youngcle-hover-battle-v2/` 에 그대로 보존.
