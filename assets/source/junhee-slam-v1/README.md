# 쥰희 기어오기·점프슬램 시트 (junhee-slam-v1, BUILD208)

사용자 2026-09-17 “쥰희가 슬금슬금 맵에서 천천히 기어나온다 … 점프하면서 덩크슛포즈도 지으샘 … 마이야르 점프슬램!!!!!!!!!!!!”.

- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 `ref.png` = 쥰희 필드 시트). 프롬프트 `slam.prompt.txt`(전송본 `slam-raw.prompt.txt`, usage `slam-raw.meta.json`). 1024×1024, 2×2 = 0·1 기어가기(오른쪽으로) / 2 웅크림 / 3 덩크 점프.
- export: `export.py slam-raw.png 2 2 96 0.9 assets/sprites/junhee_slam.png 90 largest` — 배율 0.1957(`export-meta.json`).
- runtime: `assets/sprites/junhee_slam.png` 192×192(96 셀 2×2). 적 턴 모드 `youngcle_finale` 가 셀을 1배(96px)로 그린다(처음 0.62배는 파티보다 작아 보여 올림). 원본 쥰희 시트와 인상이 조금 다를 수 있음 — 사용자 확인 필요.
