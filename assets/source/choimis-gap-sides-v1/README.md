# 최미스 옆모습 GAP (BUILD279)

사용자 2026-09-21 “아직 최미스 스프라이트 gap 없는 부분 있는 듯 옆모습이랑 등 점검”. 원본 걷기 시트(`choimis-before.png` = BUILD278 까지의 `assets/sprites/choimis.png`)는 정면 행에만 GAP 글자가 있고 옆모습·뒷모습 행엔 없었다.
`gap_sides.py`: 정면 0번 칸의 GAP 글자 픽셀을 그대로 떼어 가로 45% 로 줄여 옆모습(left/right) 여덟 칸의 셔츠 앞쪽에 얹는다(새로 그리지 않음). 뒷모습(up)은 티셔츠 등이라 글자 없음(원본 그대로). 결과 `choimis-after.png` → `assets/sprites/choimis.png`, 가면 시트는 `assets/source/sakura6-v1/mask_overlay.py` 를 다시 돌려 따라온다.
