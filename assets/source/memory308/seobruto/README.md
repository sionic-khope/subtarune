# 섭루토 전투 몸체 · memory308

첨부 원본의 노란 머리·나뭇잎 머리띠·둥근 안경·반짝이는 두 눈·넓은 볼·큰 U자 코·별도 입 없음·주황/남색 닌자 의상을 보존한다. 왼쪽 아래 3/4 시점의 중립→모으기→손 내밀기→복귀 4단계다. 어깨 뒤의 작은 어두운 기운은 얼굴을 가리지 않으며, 탄막용 구슬은 이 몸체 이미지에 포함하지 않는다.

## 납품 계약

- `assets/enemies/seobruto-battle.png`: RGBA 256×256, 2행×2열, 각 셀128×128, 행 우선 인덱스0~3.
- `assets/enemies/seobruto-front.png`: 첫 중립 셀과 픽셀이 같은128×128 필드 정지용 PNG. 파일명과 달리 정면이 아닌 동일한 왼쪽 아래3/4 모습이다.
- 공통 피벗 `(64,120)`, 실제 알파 높이100/100/99/99px, 발 바닥 exclusive y=120.
- 중립0 유지. 시전은0→1→2→3→0, 권장 시간280/240/160/240ms, 한 번 재생 후0 복귀. 발사 시점2.
- `runtime-contract.json`에 각 셀 bbox·동일 배율0.2·발 위치·프레임 순서·시간을 기록한다. 이미지 검수와 런타임 통합 검수는 별개다.

## 원본과 실제 생성

- 정체성 입력: `assets/references/memory308-seobruto.png`.
- 도트 스타일 입력: `references/hyungsub-style.png` (`assets/sprites/hyungsub.png`의 사본).
- 도구: Codex 내장 `image_gen`, 2회 호출. backend 모델·품질·usage·실제 비용은 도구가 제공하지 않아 unknown.
- `prompt-used.txt`로 첫 생성. `raw-draft-front.png`는 얼굴 정체성이 맞지만 정면 시점이어서 미채택.
- `prompt-facing-edit.txt`로 첫 생성물을 참조해 시점을 교정. 최종 생성 원본은 `raw-sheet.png` (1254×1254 RGBA).
- 원본은 실제 투명 알파를 포함한다. 초기 프롬프트의 마젠타 요청과 달리 투명 결과를 받아 원본 알파를 사용했다. 낮은 알파의 잡음이 셀 가장자리에 존재하여 기계적으로128 임계값을 적용했다. 색 양자화·얼굴 손그림·프레임별 몸체 배율 보정은 하지 않았다.

## 재현

`export.sh`의 첫 이미지 처리 블록은 raw 알파를128 기준으로 이진화한다. 이후 기존 generate2dsprite 처리기의 strict QC를 아래와 같이 실행한다(설치 위치에 따라 PROCESSOR 경로만 변경).

```bash
uv run --with pillow --with numpy python "$PROCESSOR" process \
  --input assets/source/memory308/seobruto/raw-binary-alpha.png \
  --target npc --mode cast --rows 2 --cols 2 \
  --output-dir assets/source/memory308/seobruto/processed \
  --cell-size 128 --fit-scale 0.78 --align feet --shared-scale \
  --scale-strategy fit --component-mode all --trim-border 0 --edge-clean-depth 0 \
  --strict-qc --max-body-scale-cv 0.08 --max-anchor-y-std 0.05 \
  --duration 150 --prompt-file assets/source/memory308/seobruto/prompt-used.txt
bash assets/source/memory308/seobruto/export.sh
```

처리기 기본 축소가 LANCZOS이므로 `processed/`는 진단 중간물이며 게임에 사용하지 않는다. `export.sh`가 같은 원본 셀을 공통0.2배 NEAREST로 다시 추출하고 신발 범위 중심을x64, 발 바닥을y120에 맞춘다. 프레임별 확대/축소는 없다.

## 검수

최종4셀을 `preview.png`, 원래 형섭과 동일 PNG 배율을 `scale-comparison.png`, 재생 미리보기를 `animation.gif`로 보관했다. 네 단계의 손 자세가 구별되고 얼굴과 의상·시점이 유지된다. 최종 PNG를 직접 열어 셀 전체와 형섭 대비 크기를 확인했다.

기존 처리기 strict QC: 빈 셀0, 셀 경계 접촉0, paste clamp0, body_scale_cv0.00757, anchor_y_std0.03551. 최종 PNG 별도 검사:4셀 모두 비어 있지 않음, 알파0/255만 존재, 마젠타 잔여0, 잘림/셀 경계 접촉0. `front`는0번 셀과 동일. 생성자 시각 검수 완료이며 독립 검수와 런타임 재생 검수는 상위 작업에서 확인한다.
