# 영클 얼굴 박힘 (gpt-image-2.5-sunburst, BUILD209) — 전투 뒤 조종실 소품

사용자 2026-09-17 “보스전 맵도 스프라이트 다시 짜서 영클 바닥에 얼굴박혀있고”. 참조 `ref.png` = 필드 비행 장치 시트. 프롬프트 `faceplant.prompt.txt`(전송본 `faceplant-raw.prompt.txt`, usage `faceplant-raw.meta.json`): 거꾸로 머리가 바닥에 박힘, 다리 위로, 포드 옆에 넘어짐·연기, 어지럼 별.
- export(PIL, 마젠타 색키 → bbox → 폭 136 NEAREST, 이진 알파): `assets/props/ship_youngcle_down.png` 136×110(`export-meta.json`).
- 맵 `youngcle20` 소품 `ship_youngcle_down`(YC_DOWN, hidden) — 컷신 `ship_control.js` 가 전투 뒤와 재입장 `after` 에서 보여 주고 영클 NPC·오방순은 숨긴다.
