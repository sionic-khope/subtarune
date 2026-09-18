# BUILD225 라운지 바닥

내장 이미지 모델로 만든1254×1254 불투명2×2 타일 원본. 좌상단/우상단은 청회색 철바닥A/B, 좌하단/우하단은 자주색 카펫A/B다.627×627 사분면을 그대로 잘라 NEAREST32×32로 축소한다. 색상·팔레트·음영·접합부를 다시 그리거나 보정하지 않았다.

재현: 저장소 루트에서 `uv run assets/source/ship-lounge225/export.py`. 파일별 crop·최종 해시는 `export.json`, 실제 프롬프트는 `prompt-used.txt`다. 공급자는 Codex 내장 image_gen이며 모델/usage/요금은 도구에서 공개되지 않았다.

앞의3개 산출물만 같은 이름의 `assets/tiles/`에 연결한다. carpet_b_candidate는 비교용 후보로 런타임에 등록하지 않는다. `ship_lounge_runner_trim.png`은 런타임에서 참조하지 않으므로 유지한다. 기존 원본 이력은 `assets/source/ship-lounge/visuals/`, 교체 전3개 PNG는 `previous-runtime/`에 보존한다.

`repeated-tiles-4x.png`는 각 타일3×3 반복이고 `floor-runner-repeat-3x.png`는 철바닥A/B 혼합에 카펫A를 놓은 반복 미리보기다. 최종 방 전체의 동선·NPC·가구 검수는 라운지 담당자가 수행한다.
