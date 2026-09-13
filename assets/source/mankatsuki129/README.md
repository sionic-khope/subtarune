# 타코 소환 공격

내장 image_gen으로 쥰희(타코)의 큰 코·늘어진 귀를 유지한 흰 얼굴 공격 4프레임을 생성했다. 음식 타코가 아니라 기존 쥰희 얼굴 소환체다. 원본과 최종 프롬프트를 함께 보존한다.

- 런타임: `assets/projectiles/mankatsuki-taco.png`, RGBA 256×64, 가로 4프레임, 중심 피벗32,32.
- 순서: 입 닫기 → 열기 → 크게 벌리고 돌진 → 닫으며 회복. 본체의 기존 대기/공격 PNG는 교체하지 않는다.
- 원본: `raw-sheet.png`, 1254×1254, 2×2. 참조: 기존 `mankatsuki-shuriken.png`, `mankatsuki-pig.png`의 밀도와 스튜디오 `pink-pig.png` 얼굴.
- 가공: generate2dsprite process, rows2/cols2/cell64/fit0.86/center/shared-scale/largest, edge-clean-depth0/trim-border0/strict-qc. 마젠타 제거와 공통 NEAREST 축소, 색 양자화·외곽선 침식 없음. `processed/pipeline-meta.json`에 재현 옵션과 프레임 경계/QC 보관.
- 실제 런타임은 `uv run assets/source/captain125/junhee_point/export.py assets/source/mankatsuki129 assets/projectiles/mankatsuki-taco.png`로 NEAREST 재추출한 `strip-transparent.png`다. `processed/` 보간 미리보기는 런타임이 아니다. 원본 스프라이트나 게임 UI를 코드로 그려 대체하지 않았다.
- 처리 QC: 빈 프레임·테두리 접촉·잘림0. 게임에서는42px로 그리고 귀와 투명 여백을 제외한 중심 반경12px만 피격 판정이다.
