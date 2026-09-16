# 플라즈마 배관 유닛 · 케이블 트렁크 (gpt-image-2.5-sunburst, BUILD209)

사용자 2026-09-17 “배경도 뭔가 더 웅장한 배선이랑 플라즈마들 움직이는 그런 맵으로”. 참조 `ref.png` = 기존 반응로·서버 랙 소품 4배(스타일 앵커). 프롬프트 `conduit.prompt.txt`(1536×1024 한 장에 왼쪽 유닛·오른쪽 트렁크, usage `conduit-raw.meta.json`).
- export(PIL): 마젠타 색키 → 열 간격으로 둘로 분리 → 유닛 높이 132 / 트렁크 폭 216 NEAREST → **플라즈마 픽셀(시안·보라)만 굴려서 3프레임**(유닛은 세로 4px, 트렁크는 가로 6px 씩) → `assets/props/ship_conduit.png`(294×132, 98 셀) / `ship_cable_trunk.png`(648×123, 216 셀). 메타 `export-meta.json`.
- 맵 `youngcle20`: 조타 콘솔 양옆 유닛(anim 3, 5fps), 앞 벽 양끝 트렁크(scale 168/216, anim 3, 6fps, 서버 랙 자리), 사이를 잇는 `ship_plasma` 엔티티(`src/world/ship-fx.js`: 케이블 폴리라인 위로 플라즈마 구슬이 흐른다). 전투 배경 `youngcle_factory` 에도 유닛 2개 + 흐르는 구슬.
