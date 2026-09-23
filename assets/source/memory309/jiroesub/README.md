# 지뢰섭 그림자 팔레트 · BUILD309

사용자 요청: 기존 지뢰섭의 얼굴·의상 정체성·포즈를 유지하면서 그림자 가재맨처럼 어두운 힘의 색으로 수정.
편집 대상은308의 `jiroesub-battle.png`와 `jiroesub-web.png`. 실행 전 파일은 `before-battle.png`, `before-web.png`로 보존했다. `assets/sprites/gajaeman_shadow.png`는 **색 기준만**으로 첨부했다. 가재맨의 안경/붉은 눈/머리/옷은 가져오지 않았다.

## 납품

- `assets/enemies/jiroesub-battle.png`:256×256, 2열×2행,128px셀. 0대기/1팔 올림/2시전/3회복.
- `assets/enemies/jiroesub-front.png`:128×128, 전투0번과 동일.
- `assets/enemies/jiroesub-web.png`:128×128, 돌아보는 뒷모습 시전.
- 모든 몸체의 알파 bbox 키100px, 발끝y120, 피벗(64,120). 전투4셀은 같은 원본→출력 배율0.20945454545454548을 공유한다.
- 기존 playback 계약 유지:0대기,1(220ms)→2(180ms)→3(260ms)→0, release2. `runtime-animation.gif`는0에500ms hold를 넣은 검수용 반복이다.

피부는 청회색, 머리/큰 의상 영역은 청색 기가 있는 먹색, 리본/프릴/머리 안쪽/캔/가방 포인트는 낮은 채도의 보라분홍이다. 두 눈·큰 U자 코·별도 입 없음·안경 없음이 유지된다. 코드로 색을 덧칠하거나 얼굴/포즈를 새로 그리지 않았다.

## 생성과 계보

Codex 내장 `image_gen` edit2회. backend 모델 ID/품질/usage/비용은 **unknown**. 외부API 미사용.
편집 대상과 색 기준을 `view_image`로 확인한 뒤 실제 `referenced_image_paths`에 전달했다.

1. `prompt-battle.txt` 그대로 사용. 참조=before-battle + gajaeman_shadow. 결과 `battle-raw.png`.
2. `prompt-web.txt` 그대로 사용. 참조=before-web + 새 battle-raw + gajaeman_shadow. 결과 `web-raw.png`.

각 raw는1280×1280 RGBA이다. 이미지 모델의 색 편집이므로 원본과 픽셀 단위로 정확히 동일한 geometry라고 주장하지 않는다. 포즈·소품·얼굴 정체성을 전후 비교로 확인했고, 윤곽 픽셀의 미세한 차이는 있다. 최종 승인/게임 화면 확인은 별도 통합 검수다.

## 후처리 재현

308의 기계적 추출·발 정렬 절차를 재사용했다. 실제 processor는 `/Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py`. 타 환경에서는 설치된 해당 스킬 경로로 대체한다.

```sh
uv run --with pillow --with numpy python <processor> process --input assets/source/memory309/jiroesub/battle-raw.png --target npc --mode combat --rows 2 --cols 2 --output-dir assets/source/memory309/jiroesub/battle-processed --cell-size 128 --fit-scale 0.81 --align feet --shared-scale --scale-strategy fit --component-mode largest --trim-border 0 --strict-qc --max-body-scale-cv 0.08 --max-anchor-y-std 0.05 --duration 160 --prompt-file assets/source/memory309/jiroesub/prompt-battle.txt --write-scale-profile assets/source/memory309/jiroesub/scale-profile.json --profile-name jiroesub-shadow
uv run --with pillow --with numpy python <processor> process --input assets/source/memory309/jiroesub/web-raw.png --target npc --mode single --rows 1 --cols 1 --output-dir assets/source/memory309/jiroesub/web-processed --cell-size 128 --fit-scale 0.79 --align feet --shared-scale --component-mode largest --trim-border 0 --strict-qc --prompt-file assets/source/memory309/jiroesub/prompt-web.txt
sh assets/source/memory309/jiroesub/export.sh
```

최초 전투fit0.79는97~98px라 기존99~100px보다 작았다. 모든4셀을 함께fit0.81로 재추출해100px로 맞췄다. 프레임별 독립 resize는 없다. 웹 단일 이미지는 별도 raw 해상도/구도이므로 전투raw셀 profile 재사용을 주장하지 않는다. 최종 인체·머리 비율을 전후 비교했다.

## 검수

`battle-processed/pipeline-meta.json`와 `web-processed/pipeline-meta.json`의 strict QC 통과: source/output edge-touch0, clamp0, empty0. `final-qc.json`은 실제 최종PNG의 bbox, 발끝, alpha0/255, pivot x오차0.5px 미만을 기록한다. front는 전투0번 복사다.

`comparison-battle-2x.png`는 왼쪽308/오른쪽309, `comparison-web-2x.png`도 왼쪽308/오른쪽309다. 생성자가 최종 모든 프레임의 얼굴·의상/소품·포즈·발을 확인했다. 그림자색의 눈과 코는 읽히고 얼굴을 가리는 새 이펙트는 없다. 이미지 생성 편집의 미세 윤곽차이와 기존 어깨 위습 감소를 숨기지 않는다. 사용자 승인 및 실제 게임 장면 검수와 구분한다.
