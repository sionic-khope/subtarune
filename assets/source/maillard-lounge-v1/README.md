# 마이야르호 라운지 자산

입구는 기존 `maillard_hold_walls.png`를 목재·철제 결속·팔레트 참고로 사용해 내장 imagegen으로 새로 생성했다. 오른쪽으로 걷던 플레이어가 선내로 들어가는 큰 열린 입구다. 프롬프트·원본·처리 메타데이터는 `entrance/`에 보존한다.

가공: `generate2dsprite.py process --target asset --mode single --rows 1 --cols 1 --cell-size 384 --fit-scale 0.94 --align feet --component-mode all --trim-border 0 --edge-clean-depth 0 --strict-qc`. 마젠타 배경만 제거한 후 알파 여백을 잘라 `assets/props/maillard_lounge_entrance.png`(360×263)로 사용한다. 검정 통로는 투명하게 지우지 않는다.

실내 벽은 기존 선창 벽의 원본 픽셀 조각을 반복해1536×896로 배치한 `assets/props/maillard_lounge_walls.png`다. 그림을 늘리거나 다시 그리지 않았다. 위160px·옆32px·아래64px 경계와 왼쪽y384~512 출입구가 맵 충돌과 대응한다. 재현은 `uv run tools/sprites/prepare_lounge.py`.

바닥 `assets/tiles/maillard_deck.png`, 마나샘 `assets/props/blue_buff.png`(3프레임4fps)는 기존 자산 그대로다. 지금은 공간 디자인만 구현하며 마나샘은 움직이는 소품이다. 회복·추가 인물·가구·이벤트는 후속 브리핑을 기다린다. 지정 BGM 출처는 `assets/audio/maillard-lounge-credits.json`.
