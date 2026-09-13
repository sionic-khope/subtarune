# 영클 TV 표정·프레임 139

내장 이미지 생성 원본 두 장을 보존했다. `actor/raw-sheet.png`는 `exec-84956042-1a05-4086-b6bd-0a49da3b689d.png`, `frame/raw-sheet.png`는 `exec-98b9b8a6-9f40-424d-ad13-fd521b522328.png`다. 배우 원본 2×2 순서는 smirk/laugh/greet/oh다. 웃음의 ‘ㅋ’와 놀람의 ‘오’는 생성 원본에 있는 눈 표정이다.

## 런타임 규격

- `assets/sprites/youngcle_tv_{smirk,laugh,greet,oh}.png`: 투명192×192. 네 포즈 공통 배율188/627, 머리 중심 x96·곱슬머리 상단 y14. 포즈별 바운딩박스에 맞춰 확대하지 않는다.
- `assets/portraits/youngcle_tv_{smirk,laugh,greet,oh}.png`: 투명96×96 얼굴. 기존 파일 규격과 동일하며 게임에서48×48로 표시한다. 같은 표정 원본에서 얼굴을 잘라 프로젝트의 `monoPortrait` 밝기0.38·흰 실루엣 외곽 규칙으로 변환했다. 표준 런타임 흑백 변환을 다시 적용해도 안전하다.
- `assets/props/youngcle_tv_frame.png`: 투명288×176. 원본 비율을 유지한284×144 그림을 `(2,16)`에 배치했다. 실제 알파 범위 `[2,16,286,160]`.
- 정확한 TV 안쪽 화면 영역: 프레임 이미지 좌상단 기준 **x15,y29,width258,height119**. 오른쪽273·아래148은 제외 경계다. 배우·화면 효과를 이 사각형 안으로 제한한다. 원본 중앙 검정의 알파가 일정하지 않아 최종 내보내기에서 해당 영역 아래에 검정을 합성했다. 영역 전체의 최종 알파는255이며, 꺼진 TV를 위한 런타임 배경 그리기는 필요 없다. 사각형 바깥의 생성 프레임 픽셀은 그대로다.

## 재현

프로젝트 루트에서 실행한다. `SPRITE_PROCESSOR`는 설치된 generate2dsprite 스킬 경로로 지정한다.

```sh
SPRITE_PROCESSOR=/Users/khope@sionic.ai/.codex/skills/generate2dsprite/scripts/generate2dsprite.py
uv run --with pillow --with numpy "$SPRITE_PROCESSOR" process --input assets/source/youngcle139/actor/raw-sheet.png --target npc --mode tv --rows 2 --cols 2 --cell-size 192 --fit-scale 0.88 --align bottom --shared-scale --scale-strategy fit --component-mode all --trim-border 0 --edge-clean-depth 0 --strict-qc --output-dir assets/source/youngcle139/actor/processed
uv run assets/source/youngcle139/export.py
uv run --with pillow --with numpy "$SPRITE_PROCESSOR" process --input assets/source/youngcle139/frame/raw-alpha-clean.png --target asset --mode single --rows 1 --cols 1 --cell-size 288 --fit-scale 0.98 --align center --shared-scale --scale-strategy fit --component-mode all --trim-border 0 --edge-clean-depth 0 --strict-qc --output-dir assets/source/youngcle139/frame/processed
```

배우는 제공된 처리기로 마젠타를 제거한다. TV 프레임은 이미 투명 배경이지만 원본 가장자리에 알파1 등의 희미한 잡점이 있어 알파32 미만만 투명하게 한다. RGB는 바꾸지 않는다. 최종 추출은 `export.py`가 수행하며, 기본 처리기의 LANCZOS 중간물을 런타임에 사용하지 않는다. 배우·프레임 모두 NEAREST 축소만 적용하고 팔레트 양자화·새 포즈 합성·재그림은 하지 않는다. 초상화의 흑백 변환은 대화창 표시 규칙이다.

`export-meta.json`은 배율·기준점·범위, 각 `processed/pipeline-meta.json`은 제공된 처리기의 QC를 기록한다. 배우4/4·프레임1/1 유효하며 빈 프레임·원본/출력 경계 접촉·강제 위치 제한은 없다. 네 표정과 초상화는 각각 `actor/four-expression-preview.png`, `actor/portraits-preview.png`로 확인했다. 내보내기 스크립트는 Ruff·BasedPyright·Python 규칙 검사를 통과했다.
