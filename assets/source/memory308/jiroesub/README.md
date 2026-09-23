# 지뢰섭 전투 자산 · memory308

원본 정체성: `assets/references/memory308-jiroesub.png`. 도트 밀도 참조: `assets/sprites/hyungsub.png`.
검은 쌍갈래·분홍 리본/머리 안쪽·넓은 볼·두 눈·큰 U자 코·별도 입 없음·안경 없음·분홍 프릴 상의·검은 치마/부츠·캔·쿠로미 가방을 보존했다.
작은 보라 기운은 얼굴 밖에만 있다. 거미줄 자세는 등을 왼쪽으로 돌린 옷을 입은 만화식 시전 자세다. 거미줄/발사체를 몸체에 굽지 않았다.

## 파일 계약

| 파일 | 크기 / 셀 | 역할 |
| --- | --- | --- |
| `assets/enemies/jiroesub-battle.png` | 256×256 / 128×128, 2열×2행 | 0=대기, 1=캔 든 팔 올림, 2=팔 앞으로 시전, 3=회복 |
| `assets/enemies/jiroesub-front.png` | 128×128 | 전투0번과 같은 대표 이미지 |
| `assets/enemies/jiroesub-web.png` | 128×128 | 뒷모습으로 돌아보며 거미줄 시전하는 단일 자세 |
| `assets/projectiles/jiroesub-kuromi.png` | 64×64 | 독립 쿠로미 인형 투사체 |

몸체 공통 피벗은 (64,120), 전투 방향은 왼쪽 아래 3/4이다. 모든 전투 포즈는 같은 원본→출력 배율0.1620253164556962를 공유하며 프레임별 크기 보정을 하지 않는다. 전투 알파 키는99,99,99,100px, web은101px이다. 최종 alpha는0/255. 쿠로미는 중심(32,32), bbox(6,6,58,58).

제안 재생: 정지0, 시전1(220ms)→2(180ms)→3(260ms)→0. one-shot이며 release는2다. 검수GIF는0(500ms)→1→2→3 loop로 만들었다. web은 별도 정지 hold 후0으로 돌아간다. 게임의 발사/피해/중단 타이밍은 통합 담당 범위다.

## 생성 기록

Codex 내장 `image_gen` 세 번. 이미지 backend 모델 ID/품질/usage/실결제액은 도구가 제공하지 않아 **unknown**이다. 외부 API를 호출하지 않았다. 원본·도트 기준을 `view_image`로 본 뒤 실제 `referenced_image_paths`로 전달했다.

- battle: `prompt-battle.txt`, identity+hyungsub 참조, 출력 `battle-raw.png` (1054×1490). 요청은2×2 정사각 셀이었지만 실제 도구는 직사각 셀을 반환했다. 동등 크기의 2×2 셀로 잘라 최종128px 정사각 셀에 공통 배율로 배치했다.
- web: `prompt-web.txt`, identity+battle 원본 참조, `web-raw.png` (1280×1280).
- kuromi: `prompt-kuromi.txt`, battle 도트/색 참조, `kuromi-raw.png` (1280×1280).

각 원본은 실제 alpha를 포함한다. 생성 프롬프트의 magenta 요청과 달리 도구가 투명 이미지를 반환했으며 alpha를 사용했다. 웹 단일 자세는 원본 해상도/캔버스 비율이 달라 전투 raw-cell profile의 수치로 비교하지 않고, 개별 단일 이미지 축소와 같은128px셀·피벗·최종 몸체/머리 육안 비교로 맞췄다. 전투 `scale-profile.json`은 전투 셀 처리 계약이며 web에 재사용했다고 주장하지 않는다.

## 재현

processor:
`/Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py`.
이 경로는 실행 당시 설치 위치이며 다른 환경에서는 해당 스킬의 processor를 찾는다.

```sh
uv run --with pillow --with numpy python <processor> process --input assets/source/memory308/jiroesub/battle-raw.png --target npc --mode combat --rows 2 --cols 2 --output-dir assets/source/memory308/jiroesub/battle-processed --cell-size 128 --fit-scale 0.80 --align feet --shared-scale --scale-strategy fit --component-mode largest --trim-border 0 --strict-qc --max-body-scale-cv 0.08 --max-anchor-y-std 0.05 --duration 160 --prompt-file assets/source/memory308/jiroesub/prompt-battle.txt --write-scale-profile assets/source/memory308/jiroesub/scale-profile.json --profile-name jiroesub
uv run --with pillow --with numpy python <processor> process --input assets/source/memory308/jiroesub/web-raw.png --target npc --mode single --rows 1 --cols 1 --output-dir assets/source/memory308/jiroesub/web-processed --cell-size 128 --fit-scale 0.79 --align feet --shared-scale --component-mode largest --trim-border 0 --strict-qc --prompt-file assets/source/memory308/jiroesub/prompt-web.txt
uv run --with pillow --with numpy python <processor> process --input assets/source/memory308/jiroesub/kuromi-raw.png --target asset --mode single --rows 1 --cols 1 --output-dir assets/source/memory308/jiroesub/kuromi-processed --cell-size 64 --fit-scale 0.82 --align center --shared-scale --component-mode largest --trim-border 0 --strict-qc --prompt-file assets/source/memory308/jiroesub/prompt-kuromi.txt
sh assets/source/memory308/jiroesub/export.sh
```

후처리는 배경제거/최대 연결요소/NEAREST 공통축소/alpha 이진화/정수 피벗 이동/시트·GIF 조립뿐이다. 얼굴·의상·포즈를 코드로 새로 그리지 않았다.
첫 battle 처리의 기본4px trim은 셀 경계 가까운 보라 기운을 잘라 source-edge 실패였다. 원본을 훼손하지 않고 trim0으로 다시 처리했고 override 없이 strict QC를 통과했다.

## 검수와 한계

`battle-processed/pipeline-meta.json` 및 web/kuromi 대응 파일: strict QC 통과, source/output edge-touch 0, clamp0, empty0. 전투 body_scale_cv=0.01173498, anchor_y_std는0.05 이하.
`final-qc.json`은 실제 납품 PNG의 bbox·binary alpha·발 위치·최종 크기를 기록한다. 모든 전투/웹 발 bbox끝이120이고 피벗x 오차는0.5px 미만이다. pink 의상·귀/리본·스컬이 남아있음을 최종 확대본에서 확인했다.
`battle-preview-3x.png`와 `comparison-2x.png`는 최종 납품PNG의 NEAREST 확대, `runtime-animation.gif`는 실제 납품4프레임으로 만든 모션 확인용이다. 생성자가 네 포즈·얼굴·소품과 전체 윤곽을 육안 검사했다. 독립 검수/사용자 승인과 구분한다. 이 폴더는 자산 납품이며 게임 통합/실제 브라우저 재생 검증은 포함하지 않는다.
