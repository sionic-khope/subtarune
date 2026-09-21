# 벚꽃 숲 9 러너 장애물 (run-obstacles-sakura-v1, BUILD282, 2026-09-21)

사용자 브리핑: “파란호리이 분홍색 나뭇가지랑 나뭇잎들 쳐낼수있는 기믹 한 15초정도 달리는 맵 … 파란호리이 기믹 참고잘하고”.
- 공급자: OpenGateway `openai/gpt-image-2.5-sunburst`, 1024×1024 2×2 셀(`obstacles.prompt.txt`, `gen.log`). raw 1회 채택: 꽃 잎 무더기·큰 꽃·꽃가지·꽃잎 다발(토리이 굽이 길 `run-obstacles-v1` 의 분홍판).
- `export.py`: 마젠타 색키 → 셀 bbox → 폭 기준 축소(원판과 같은 폭 22/22/64/16) → `assets/props/run_sakura_leaf_1.png`, `run_sakura_leaf_2.png`, `run_sakura_branch.png`, `run_sakura_petals.png`. 크기는 `runtime-contract.json`.
- 러너 쪽: `runner-core.js OBSTACLES.sakura_*`(물리는 원판과 같음), `runner.js OBSTACLE_IMAGES`, 맵 `meta.runs.a.types`(순서)·`petals`(쳐낼 때 조각 색 분홍)·`water:false`(물결·물보라·물걸음 없음).
