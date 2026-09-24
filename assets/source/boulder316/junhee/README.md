# 쥰희 바위 밀기316

최종 `assets/sprites/junhee-boulder-push316.png`는256×256 RGBA,128px셀2×2, 공통 발 피벗64,120이다. 오른쪽을 보는 버티기→강하게 밀기→낮게 힘주기→여전히 미는 회복4포즈를240/200/280/220ms 반복한다. 모든 프레임의 바닥은120, 손바닥 접촉면은x112다. 손 접점 y는 대략75/79/88/76이며 바위 접촉 높이와 맞출 때 이 차이를 고려한다. 장면의 바위와 손 겹침은 통합자가 실제 화면에서 확인한다.

## 정체성과 크기

`assets/sprites/junhee.png`를 직접 확인하고 유일한 생성 참조로 첨부했다. 원본은368×360,92×90셀4×4이고 오른쪽 중립 프레임의 불투명 몸 높이는85px, 기존 일반 월드 배율0.715에서60.775px다. 새 모션의 몸 높이는84/79/75/81px, `motion.scale:0.5`에 공통 `CHAR_SCALE:1.43`을 곱하면 약60/56/54/58px다. 웅크린 포즈를 프레임별 확대하여 억지로 같은 키로 만들지 않는다.

분홍 몸과 배, 큰 돼지코, 파란 눈, 처진 귀, 작은 검은 머리카락, 짧고 굵은 팔다리, 곱슬 꼬리와 둥근 체형을 유지한다. 두 팔을 앞으로 뻗고 다리를 넓게 버텨 실제 밀기로 읽힌다. 무기·바위·벽·먼지·그림자는 없다. 기존 이동/웃음 PNG는 수정하지 않았다.

## 생성·재현

내장 image_gen1회이며 모델/quality/비용은 unknown. 정확한 호출문은 `prompt-used.txt`, 원본1254×1254 RGBA는 `raw-sheet.png`다. 원 도구 경로는 `/Users/khope@sionic.ai/.codex/generated_images/01a0ceb3-fd8e-7991-b9a8-7c984c346ba0/exec-178c3a63-06d4-4360-a15f-6a8db174039b.png`다. 반환된 실제 알파를 보존하며 외부 API나 수작업 포즈 합성을 사용하지 않았다.

```sh
uv run --with numpy --with pillow /Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py process --input assets/source/boulder316/junhee/raw-sheet.png --target npc --mode attack --rows 2 --cols 2 --output-dir assets/source/boulder316/junhee/processed --cell-size 128 --fit-scale 0.9 --align feet --scale-strategy preserve --shared-scale --component-mode largest --trim-border 0 --edge-clean-depth 0 --strict-qc --prompt-file assets/source/boulder316/junhee/prompt-used.txt --duration 200
node assets/source/boulder316/junhee/export.cjs
```

스킬 경로와 sharp설치를 실행 환경에 맞춘다. 별도 모듈은 `SPRITE_SHARP`로 지정한다. `export.cjs`는 processor의 셀 로컬crop에 원본 셀 원점을 더하고, 첫 crop높이411 기준85/411 공통배율 NEAREST, 알파128 이진화, 투명여백 제거, feet120/handPlane112로 평행이동한다. 그림을 새로 그리거나 프레임별 몸 배율을 바꾸지 않는다. `processed/sheet-transparent.png`는 중간 LANCZOS 결과라 런타임에 사용하지 않는다.

## 확인 범위

최종4프레임 모두 nonempty/서로 다른 해시, 마젠타0, 셀 가장자리 접촉0, 알파0/255, feet120을 확인했다. 실제값은 `final-qc.json`. `contact-preview-3x.png`로 파란 눈·귀·코·손/발 전체와 네 가지 팔/무릎/상체 자세를 눈으로 확인했다. 마지막 포즈 역시 중립 서기가 아닌 버티기다.

`push-preview.gif`는4프레임200ms씩 동작 비교용이고 실제 권장 큐는 `contract.json`의240/200/280/220ms다. 이 자산 작업은 실제 게임 재생/바위 접점/복귀 cleanup검사를 대신하지 않는다. LSP hook은 외부worktree scope오류를 냈으며 실제 export와 node문법검사는 성공했다.
