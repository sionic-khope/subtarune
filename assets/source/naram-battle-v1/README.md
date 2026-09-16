# 나람이 전투 대기 시트 (naram-battle-v1, BUILD207)

- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 `ref.png` = 필드 `naram_giant.png` 정면). 프롬프트 `idle.prompt.txt`(전송본 `idle-raw.prompt.txt`, usage `idle-raw.meta.json`, 로그 `gen.log`).
- raw: `idle-raw.png` 1024×1024, 2×2(512 셀), 마젠타 배경, 왼쪽을 보는 대기 4프레임(배 두드림).
- export: `export.py idle-raw.png 2 2 128 0.86 assets/enemies/naram-battle-idle.png 118 largest` — 배율 0.2566(`export-meta.json`).
- runtime: `assets/enemies/naram-battle-idle.png` 256×256(128 셀 2×2). enemies.js `naram_giant`(untargetable). 내려찍기 패턴의 몸통 탄은 필드 `naram_giant.png`(걷기 프레임) 그대로.
