# 오방순 전투 대기 시트 (obangsun-battle-v1, BUILD207)

사용자 2026-09-17 “인게임 전투 스프라이트 잘 만들어주고”.

- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 1장 `ref.png` = 필드 시트 `obangsun_big.png` 정면 프레임 확대). 프롬프트 `idle.prompt.txt`(전송본 `idle-raw.prompt.txt`, usage `idle-raw.meta.json`, 로그 `gen.log`).
- raw: `idle-raw.png` 1024×1024, 2×2(512 셀), 마젠타 배경, 왼쪽을 보는 대기 4프레임.
- export: `assets/source/youngcle-hover-battle-v1/export.py idle-raw.png 2 2 128 0.86 assets/enemies/obangsun-battle-idle.png 118 largest` — 색키 → bbox → 시트당 배율 하나(0.2548) NEAREST → 발 y118 정렬(`export-meta.json`).
- runtime: `assets/enemies/obangsun-battle-idle.png` 256×256(128 셀 2×2). enemies.js `obangsun`(untargetable, dx 40 dy 6, scale 0.9). 얼굴 탄은 `obangsun-face-v1`.
