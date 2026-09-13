# 오방순 이동 자산

내장 image_gen으로 사진 정체성과 프로젝트 도트 원본을 참조해 생성했다. 큰 얼굴, 약2등신 몸(머리 장식 제외), 붉은 높은 올림머리·긴 땋은 머리, 가지에 달린 붉은 원형 장식, 붉고 검은 눈화장·검은 입술·검은 상의를 보존했다. 사진에 없는 검은 바지와 짧은 부츠는 전신 제작 보완이다. 전투·음성·배치는 이 패키지 범위 밖이다.

- 런타임: `obangsun.png`, RGBA256×256,64×64셀,16프레임.
- 엔진 행: down / up / left / right. 열: 기본 / 발A / 기본 / 발B.
- 발 기준점: 셀내(32,61), 실제 신발 최하단은 y60~61. 권장160ms/프레임.
- `preview.png`:1024×1024,4배 NEAREST 확대.
- `down|up|left|right-{0..3}.png`: 방향별 프레임. 같은 이름의 GIF/strip 포함.
- 원본: `raw-sheet.png`,1254×1254. 행 down/left/right/up.
- 참조 사진: 스튜디오 `assets/references/obangsun149/original.png`.
- 최종 프롬프트: `prompt-used.txt`.

## 재현

스튜디오 루트에서 다음 명령으로 마젠타 제거와 원본의 안전성을 검사한다.

```sh
uv run --with pillow --with numpy /Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py process --input output/sprites/obangsun149/raw-sheet.png --target player --mode player_sheet --output-dir output/sprites/obangsun149/processed --prompt-file output/sprites/obangsun149/prompt-used.txt --cell-size 64 --fit-scale 0.88 --align feet --shared-scale --component-mode largest --scale-strategy fit --strict-qc --max-body-scale-cv 0.08 --max-anchor-y-std 0.05 --duration 160
uv run output/sprites/obangsun149/assemble.py
```

기본 처리기의 축소본은 LANCZOS이므로 `processed/` 시트와 GIF는 진단 이력이다. 납품 PNG/GIF는 `assemble.py`가 투명화한 원본을313×313의 고정 셀로 나누고 전 셀을 동일하게60×60 NEAREST축소하여 새로 만든다. 같은 방향의4장은 공통 샘플링 격자와 동일한 붙이기 위치를 사용한다. 프레임별 바운딩박스 확대·축소나 독립 중앙정렬은 하지 않는다.

## 확인 결과

원본16프레임의 empty/edge-touch/paste-clamp는 모두0, body_scale_cv0.01098, anchor_y_std0.02592로 기본 엄격 QC를 통과했다. 최종 NEAREST 시트의16장도 빈 프레임과 셀 경계 접촉이0이다(`final-qc.json`). 장식·땋은 머리·신발이 온전히 들어가며, 후면에 얼굴이 없고 방향별 발 움직임이 있다. 생성 단계에서 약간의 머리장식·색면 변화는 남는다. 맵에서의 크기·걷기 재생은 이 자산 제작 단계에서 검증하지 않았다.
