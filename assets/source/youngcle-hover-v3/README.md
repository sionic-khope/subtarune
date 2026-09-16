# 영클 비행 장치 시트 v3 — gpt-image-2.5 비교·채택 (BUILD204)

사용자 2026-09-16 “2.5 안 쏘?” → 같은 프롬프트·참조(`hover.prompt.txt`, `ref.png` = youngcle-hover-v2 와 동일)로 `openai/gpt-image-2.5-flare`(`hover-flare-raw.png`)·`openai/gpt-image-2.5-sunburst`(`hover-sunburst-raw.png`)를 생성해 v2(gpt-image-2)와 비교했다.
- flare: 눈동자가 단순한 점, 몸이 탈것에 비해 작음, 번개가 낙서처럼 작음 → 반려.
- sunburst: 외눈에 소용돌이 눈동자, 탈것 음영·불꽃이 가장 좋음 → **채택**. `../youngcle-hover-battle-v1/export.py hover-sunburst-raw.png 4 4 112 0.9 assets/sprites/youngcle_hover.png 104 all`(배율 0.4708).
- 이후 전투 대기(youngcle-hover-battle-v2)·대포(ship-cannon-v2)·철창(ship-cage-v2)·glare(youngcle-glare-v3)·나람(naram-giant-v2)도 sunburst 로 다시 생성해 교체. imagegen 기본 모델을 2.5-sunburst 로 바꿈.
