# 영클 비행 장치 전투 대기 시트 (youngcle-hover-battle-v1, BUILD202)

사용자 2026-09-16 “이거(비행 장치 영클) 기반한 전투 스프라이트도 만들어줘, 전투 컨셉은 곧”.

- 공급자: OpenGateway `openai/gpt-image-2`, images/edits(참조 1장 `ref.png` = `assets/sprites/youngcle_hover.png` 의 왼쪽·정면 0번 프레임 4배). 프롬프트 `idle.prompt.txt`(실제 전송본 `idle-raw.prompt.txt`, usage `idle-raw.meta.json`). 1회 생성, 반려 없음.
- raw: `idle-raw.png` 1024×1024, 2×2(512 셀), 마젠타 배경. 4프레임 = 중립 / 위로 떠 불꽃 김 / 오른쪽 번개 / 아래로 내려 불꽃 짧고 왼쪽 번개. 전부 왼쪽을 본다.
- export: `export.py idle-raw.png 2 2 128 0.86 assets/enemies/youngcle-hover-battle-idle.png 118 all` — 색키(순수 마젠타) → 셀별 bbox → **시트당 배율 하나**(0.2991) NEAREST → 밑변(꼭지) y118 정렬, 이진 알파. 떨어진 번개 조각도 유지(all). 셀 경계 접촉 0.
- runtime: `assets/enemies/youngcle-hover-battle-idle.png` 256×256, 128px 셀 2×2, 4프레임, 권장 180ms, pivot [64, 118], px 1. 전투 등록(enemies.js `sheet:{src, cols:2, rows:2, count:4, fps:1000/180, px:1}, pivot:[64,118]`)은 전투 컨셉 브리핑 뒤.
- 미리보기: `tools/sprites/viewer.html?dir=assets/enemies&files=youngcle-hover-battle-idle.png&cell=128x128&fps=6`
