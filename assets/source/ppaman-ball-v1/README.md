# 억빠맨 보라색 공 (ppaman-ball-v1, BUILD208) — 아이디어 1 나람 볼

사용자 2026-09-17 “억빠맨이 … 자기몸을 둥글게 말아 공모양으로 … 실제로는 보라색공인데 가운데에 억빠맨 얼굴로 변신”.

- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 `ref.png` = 빠맨 전투 시트 정면). 프롬프트 `ball.prompt.txt`(전송본 `ball-raw.prompt.txt`, usage `ball-raw.meta.json`). 1536×1024 한 장에 공 2프레임(기본 / 돌진 찌그러짐).
- export: `export.py ball-raw.png 2 1 96 0.9 assets/sprites/ppaman_ball.png 90 largest` — 배율 0.1215(`export-meta.json`).
- runtime: `assets/sprites/ppaman_ball.png` 192×96(96 셀 2×1). 공격 모드 `youngcle_idea`(idea 1)에서 억빠맨이 상자 안으로 들어가 이 공으로 변신(morph), 관성 조작·C 돌진.
