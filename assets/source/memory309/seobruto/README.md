# 섭루토 전신 그림자 팔레트 · BUILD309

BUILD308 전투 시트를 내장 `image_gen`으로 편집한 색상 변형이다. 기존 얼굴·의상 형태·왼쪽 아래3/4 시점·중립/모으기/발사/복귀 포즈를 유지하고, 전신 피부를 청회색으로, 머리와 의상을 짙은 남색/먹색으로 바꿨다. 기존 주황은 탁한 황갈색 흔적으로 남는다. 안경·두 눈·큰 U자 코와 입 없는 얼굴이 읽히며, 작은 기존 후방 기운이 얼굴을 가리지 않는다.

## 실제 생성과 계보

- 편집 대상: `references/seobruto-battle308.png`, BUILD308 runtime256×256 사본. 원래 필드 셀은 `references/seobruto-front308.png`로 보존.
- 색상 참조: `references/gajaeman-shadow-palette.png`, 기존 `assets/sprites/gajaeman_shadow.png` 사본. 가재맨의 얼굴/복장/포즈는 복제하지 않았다.
- 실제 프롬프트: `prompt-used.txt`.
- 내장 `image_gen` 편집1회. 반환 원본 `raw-sheet.png`, RGBA1254×1254.
- 도구 반환 원본 경로: `/Users/khope@sionic.ai/.codex/generated_images/01a0cde0-2d6a-77e1-9fc0-b8f46f705654/exec-2a029507-a342-44af-af80-b64dcb4209f3.png`. 해당 파일을 복사했고 도구 원본을 보존했다.
- backend 모델·품질·usage·비용은 공개되지 않아 unknown. 외부 API나 코드 팔레트 치환을 사용하지 않았다.
- 원본·참조 SHA256은 `qc.json`에 기록했다. 이전 전체 제작 계약은 `assets/source/memory308/seobruto/README.md`.

## 납품과 검수

`assets/enemies/seobruto-battle.png`256×256, 2×2·셀128×128. `assets/enemies/seobruto-front.png`는 첫 중립 셀과 동일128×128이다. 모든 셀은 발 피벗64,120과 실제 알파 높이100px를 공유한다. 순서·권장 시간은 기존대로 중립280ms→모으기240ms→발사160ms→복귀240ms 후 중립0으로 돌아간다.

`preview.png`에서 최종4셀을 확인했고 `before-after.png`에서 BUILD308과 같은 배율로 비교했다. 모든 포즈의 손 위치·시점·얼굴·복장 형태가 유지되고 전신 색이 변했다. 모델 재출력에 따른 미세 외곽 픽셀 차이가 있으므로 바이트 단위 동일 윤곽을 주장하지 않는다. 각 셀의 이전 알파와 IoU를 `qc.json`에 기록했다.

기존 generate2dsprite strict QC 통과: 빈 셀0, 셀 경계 접촉0, paste clamp0, body_scale_cv0.00868, anchor_y_std0.00069. 최종 PNG도 이진알파0/255·마젠타 잔여0·발바닥y120·첫 셀 일치 확인. 작성자 시각 검사 완료이며 게임 재생/독립 검수는 상위 통합 작업에서 수행한다.

## 처리 재현

`raw-binary-alpha.png`는 생성 원본 알파에128 임계값만 적용한 중간물이다. 해당 파일을 기존 처리기로 검사한 명령은 다음과 같다. PROCESSOR는 설치된 generate2dsprite의 `scripts/generate2dsprite.py` 경로다.

```bash
uv run --with pillow --with numpy python "$PROCESSOR" process \
  --input assets/source/memory309/seobruto/raw-binary-alpha.png \
  --target npc --mode cast --rows 2 --cols 2 \
  --output-dir assets/source/memory309/seobruto/processed \
  --cell-size 128 --fit-scale 0.78 --align feet --shared-scale \
  --scale-strategy fit --component-mode all --trim-border 0 --edge-clean-depth 0 \
  --strict-qc --max-body-scale-cv 0.08 --max-anchor-y-std 0.05 \
  --duration 150 --prompt-file assets/source/memory309/seobruto/prompt-used.txt
bash assets/source/memory309/seobruto/export.sh
```

기존 처리기는 진단용이며 기본 LANCZOS 중간물을 납품하지 않는다. `export.sh`가 생성 원본 알파 정리·그리드 추출·공통100/490배 NEAREST 축소·발 중심 정렬·PNG/GIF 조립만 수행한다. 색을 그리거나 바꾸는 코드는 없다.
