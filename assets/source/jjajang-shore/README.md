# 짜장섬 해안 런타임 자산

나무 3종은 스튜디오의 `output/tiles/jjajang-forest-v1` 원본을 그대로 재사용한다. 검정 숲/차콜 길은 사용자의 검정 방향을 반영한 내장 imagegen 결과 `output/tiles/jjajang-forest-black-v2/palette-preview.png`에서 직접 추출한다. 모래는 새 내장 imagegen 원본을 사용한다. 초기 구현의 v1 명도 재매핑 결과 세 종류를 모두 교체했으며 최종 타일에는 색칠이나 팔레트 변환이 없다.

- `v1/`: 나무 원본 및 초기 후보 추적용 타일; 검정/길 타일의 최종 픽셀 원본이 아님
- `black-v2/palette-preview.png`: 거의 검정인 숲과 차콜 길의 최신 색 기준 시안
- `assets/tiles/jjajang_forest_black.png`: v2 원본의 소품 없는 `(640,32,742,134)` 영역을 NEAREST로 32×32 축소
- `assets/tiles/jjajang_path_black.png`: v2 중앙 공터의 `(650,400,752,502)` 영역을 NEAREST로 32×32 축소
- `assets/tiles/jjajang_sand.png`: `sand-raw.png` 전체 1254×1254를 NEAREST로 32×32 축소; 새 생성 원본 색상 그대로
- `assets/props/jjajang_tree_1.png`~`3.png`: v1 나무를 픽셀 변경 없이 복사

## 재현 및 검사

`uv run tools/sprites/prepare_jjajang_shore.py`는 v2 원본 RGB를 직접 자르고 최근접 축소하며 모래는 전체 원본을 최근접 축소한다. 명도 재매핑, 새 색상 도입, 그리기, 경계 합성은 하지 않는다. 실제 v2 원본은 1536×1024 RGB이며 `black-v2/palette-preview.png`는 스튜디오 파일과 바이트 동일하다. 원본 SHA-256: `81b9b307ac0f37e98225f3b7f18ad10f84971fbc103476ab3acbdf4150864ed7`.

`terrain-export.json`에 추출 좌표·규격·원본/결과 SHA를 보관한다. `terrain-repeat-preview.png`는 최종 세 타일을 각각 3×3 반복한 4배 확대 검수 이미지다. 눈에 띄는 격자 경계나 투명 틈은 없지만, 시안에서 추출한 자연 질감이므로 모든 맞닿는 가장자리가 수학적으로 같은 자동 타일셋이라고 주장하지 않는다. 세 최종 파일은 각각 32×32 RGB 불투명이며 원본 crop/NEAREST 출력과 픽셀 바이트가 동일함을 검사했다. 처리기 basedpyright 0 오류/경고, no-excuse 검사 통과.

## 새 모래 원본

생성 ID `exec-99c8b45d-df57-4912-868a-4a76de8f0d13`, 내장 `image_gen` 사용. 부모 작업이 원본 생성과 정확한 프롬프트 기록을 소유한다. 다음은 요구 요약이며 원문 프롬프트를 사칭하지 않는다: 검정 v2의 도트 재질을 참고한 차분한 베이지색 JRPG 모래 단일 타일, 희박한 알갱이, 소품·길·물·글자·테두리 없음, 32px 논리 해상도, 전체 불투명. 내부 모델·품질 설정·토큰·실청구액은 공개되지 않아 unknown이다.
