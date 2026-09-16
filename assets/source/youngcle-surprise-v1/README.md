# 영클 놀람 시트 (youngcle-surprise-v1, BUILD208)

사용자 2026-09-17 “영클도 놀라서 뒤에 처다보는 스프라이트만들어서 놀라는 퀸음성과 함께”, 아이디어 3 “(오 소리와 함께 뒤를 봄) 어디???”.

- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, images/edits(참조 `ref.png` = 비행 장치 전투 대기 프레임). 프롬프트 `surprise.prompt.txt`(전송본 `surprise-raw.prompt.txt`, usage `surprise-raw.meta.json`). 1536×1024 한 장에 2프레임(오른쪽 뒤를 돌아봄 / 놀라 입 벌림·땀).
- export: `export.py surprise-raw.png 2 1 128 0.86 assets/enemies/youngcle-surprise.png 118 all` — 배율 0.1564, 땀·번개 조각 유지(`export-meta.json`).
- runtime: `assets/enemies/youngcle-surprise.png` 256×128(128 셀 2×1). enemies.js `youngcle_hover.actions.surprise`; `patternPose {sheet:'surprise', frame}` 로 방심(아이디어 3)·나람 볼 충돌·오방순 충돌·점프슬램에서 쓴다.
