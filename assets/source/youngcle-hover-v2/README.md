# 영클 비행 장치 4방향 시트 v2 (youngcle-hover-v2, BUILD203)

사용자 2026-09-16 “스프라이트 왜 자꾸 니가 처만들어 지피티 안 쓰고 … 영클 너무 작아” — 손으로 합성한 v1(tools/art/youngcle_hover_set.py, 64px 셀)을 폐기하고 gpt-image-2 로 다시 생성, 셀을 112px 로 키움.

- 공급자 OpenGateway `openai/gpt-image-2` edits, 참조 `ref.png` = 왼쪽 승인 걷기 시트 `assets/sprites/youngcle.png` 2배(정체성·도트 밀도) + 오른쪽 사용자 참고 이미지 `ref-vehicle.png`(탈것 색·모양). 프롬프트 `hover.prompt.txt`(전송본 `hover-raw.prompt.txt`, usage `hover-raw.meta.json`). 1회.
- raw `hover-raw.png` 1024×1024, 4×4(256 셀), 행 down/up/left/right, 열 중립/불꽃 김/번개/불꽃 짧고 반대쪽 번개. 정체성(외눈·곱슬 한 가닥·파란 셔츠·초록 배지) 유지, 탈것 = 회녹 윗판·보라 띠·연두 사발·노란 꼭지·금색 로켓·불꽃·하늘색 번개.
- export: `../youngcle-hover-battle-v1/export.py hover-raw.png 4 4 112 0.9 assets/sprites/youngcle_hover.png 104 all` — 시트당 배율 하나(0.499) NEAREST, 꼭지 밑변 y104, 이진 알파, 떨어진 번개 조각 유지. 셀 경계 접촉 0.
- runtime `assets/sprites/youngcle_hover.png` 448×448(112px 셀 → 필드 56px, 기존 64px 셀 캐릭터의 1.75배), `CHARACTERS.youngcle_hover` stillPivot [56, 104] + hover {fps 8, lift 6, bob 2}. 전투 대기 시트는 `youngcle-hover-battle-v1`.
