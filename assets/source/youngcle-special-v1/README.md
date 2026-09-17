# 변신 영클 특별 패턴 자산 5종 — gpt-image-2.5-sunburst (BUILD216)

사용자 2026-09-17 특별 패턴 브리핑. 프롬프트 `*.prompt.txt`(전송본 `*-raw.prompt.txt`, usage `*-raw.meta.json`, 로그 `gen-*.log`).
- `subrio-raw.png`(1536×1024 3×2, 참조 `ref-subrio.png` = 변신 영클 v3 + 섭리오 판테온 시트 ×2): 옆모습 도트 영클 — 걷기 A·B, 발사, 과부하, 쓰러짐, 일어남. export `export.py subrio-raw.png 3 2 64 0.9 assets/sprites/subrio_youngcle.png 60 all`(64 셀, 발 y60, 시트는 오른쪽을 보므로 그릴 때 뒤집음).
- `cry-raw.png`(참조 `ref-tv.png`): 감동해 우는 영클(손수건) → `assets/illustrations/youngcle-cry.png`(폭 240). 리듬 3회 미만 연출.
- `judge-raw.png`(2×2, 참조 `ref-judge.png` = 변신 영클 + 파크가디언 재판관 구도): 가발·법복·망치 재판관 — 대기, 망치 들기, 내리침, 놀라 놓침 → `assets/enemies/youngcle-judge.png`(128 셀 2×2, 파크 재판관과 같은 규격).
- `parkcry-raw.png`(참조 `ref-park.png` = 파크가디언 코스튬 시트): 울고 있는 파크가디언 → `assets/illustrations/park-guardian-cry.png`(높이 96).
- `ball-raw.png`(참조 `ref-tv.png`): 몸을 말아 거대한 공이 된 영클 → `assets/sprites/youngcle_ball.png`(128). 경기장에서는 `whiteSprite`(흰 도트).
- 단일 그림 export 는 PIL 색키(마젠타) → bbox → NEAREST 축소 → 이진 알파(README 옆 명령 없음, BUILD216 세션 스크립트).
