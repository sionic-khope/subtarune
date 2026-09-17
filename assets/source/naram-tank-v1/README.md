# 나람 탱크 4프레임 — gpt-image-2.5-sunburst (BUILD213)

사용자 2026-09-17 “나람이는 탱크 몰고 와서 뭔가 쏘고 그걸 피하는 패턴”. 참조 `ref.png` = 거대 나람 걷기 시트 ×2. 프롬프트 `tank.prompt.txt`(전송본 `tank-raw.prompt.txt`, usage `tank-raw.meta.json`, 로그 `gen.log`): 포탑 해치에 앉은 나람, 왼쪽을 향한 포신, 4프레임 = 궤도 A·B(굴러감), 발사(포구 화염·포신 후퇴), 반동(뒤로 기울고 연기).
- export: `../youngcle-hover-battle-v1/export.py tank-raw.png 2 2 96 0.9 assets/sprites/naram_tank.png 90 all`(배율 0.188) → 192×192(96 셀 2×2). 상자 안에서는 `whiteSprite` 로 흰색 2톤(규칙).
- 연결: `enemies.js naram_giant.projectiles.tank`, 패턴 `youngcle-patterns.js naram_tank`(굴러 들어와 8발: 포물선 포탄(고리 예고 → 폭발·파편) / 직사 포탄(예고선 → 빠른 포탄), 굴러 나감).
