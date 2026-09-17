# 조종실 전투 배경 앞 벽 (gpt-image-2.5-sunburst, BUILD210)

사용자 2026-09-17 “배경도 더 웅장하게”, “맵 가운데에 영클 얼굴로 된 발판 그거 있어야 한다니까”, “바닥도”. 참조 `ref.png` = 기존 공장 배경 + 플라즈마 배관 소품(스타일 앵커). 프롬프트 `wall.prompt.txt`(전송본 `wall-raw.prompt.txt`, usage `wall-raw.meta.json`): 거대한 케이블 다발·플라즈마 배관 유닛 2·대형 레이더 모니터·파이프·환기구·경고 띠.
- export: `wall-raw.png` 1536×1024 → `assets/backdrops/ship_battle_wall.png` 480×320 NEAREST. 전투 배경 `youngcle_bridge`(src/battle/backgrounds.js)가 y −40 에서 그려 윗부분(케이블·배관·모니터 상단) 100px 를 벽으로 쓰고, 그 아래는 조종실 철판 타일(youngcle_iron_blue) + 가운데 영클 얼굴 강철 로고(맵과 같은 `ship_floor_logo.png`, 156px) + 이음새·양옆 케이블 위로 흐르는 플라즈마 구슬.
- 시안 3개(y −40/−70/−100) 중 케이블과 모니터가 함께 보이는 −40 채택.
