# 거대·뚱뚱 나람 4방향 시트 (naram-giant-v1, BUILD202)

사용자 2026-09-16 조종실 브리핑 “나람 스프라이트 더 거대하고 뚱뚱하게 재구성”.

- 공급자: OpenGateway `openai/gpt-image-2`, images/edits(참조 `ref.png` = 승인 시트 `assets/sprites/naram.png` 2배). 프롬프트 `walk.prompt.txt`(전송본 `walk-raw.prompt.txt`, usage `walk-raw.meta.json`). 1회 생성.
- raw: `walk-raw.png` 1024×1024, 4×4(256 셀). 행 순서 down/up/left/right(요청 순서대로 나옴), 열 중립/발A/중립/발B. 군복 얼룩·웃는 얼굴 유지, 배가 훨씬 크고 팔다리가 짧다.
- 특이: 옆모습 두 줄의 발이 셀 아랫변에 닿아 그 아래 줄 셀 위에 조각으로 떨어졌다 → `export.py` 가 아랫줄 셀 위쪽의 작은 성분(높이<40)을 윗줄로 되돌리고 셀마다 가장 큰 성분만 남긴다(largest).
- export: `../youngcle-hover-battle-v1/export.py walk-raw.png 4 4 96 0.92 assets/sprites/naram_giant.png 90 largest` — 시트당 배율 하나(0.362) NEAREST, 발 y90, 이진 알파.
- runtime: `assets/sprites/naram_giant.png` 384×384, 96px 셀(필드 48px = 기존 64px 셀 캐릭터의 1.5배), `CHARACTERS.naram_giant` stillPivot [48, 90], voice naram(기존). 조종실 실험체(youngcle20 `ship_naram`).
