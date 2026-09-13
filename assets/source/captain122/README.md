# 선장실 입구·김은별컴퍼니

내장 image_gen 생성 원본: `eunbyeol/raw-sheet.png`, `door/raw.png`. 프롬프트는 각 폴더 `prompt.txt`, 사용자 외형 참조는 `reference.png`다. NPC 원본은 front/left/right/back16포즈. 정장 바지·구두는 보완이며 기본 성격·관계를 추가하지 않았다.

## 실행용 자산

- `assets/sprites/eunbyeol.png`: RGBA256×256,4×4,64px셀,down/up/left/right. 정지→왼발→정지→오른발,180ms. PNG 색 양자화 없이 최근접 축소.
- `assets/props/captain_door.png`: RGBA192×192, 정면 목재 양문·황동 조타륜 문장. 임의 배경 없음.
- `assets/audio/voices/eunbyeol.mp3`: macOS Yuna TTS ‘냐’ 단음,1.12배 피치·길이0.17초·페이드. 실제 사람 발화/음성 복제가 아닌 합성 블립. 원본 `voice/yuna-nya.aiff`.

## 재현

`uv run assets/source/captain122/prepare.py`는 균등4분할에서 잘리는 양갈래를 보존하도록 측정한 칸 경계를352px 정방형으로 다시 배치하고 문을 NEAREST로192px캔버스에 넣는다. 원본의 색/형태를 새로 그리지 않는다.

`generate2dsprite.py process --input assets/source/captain122/eunbyeol/raw-grid.png --target npc --mode walk --output-dir assets/source/captain122/eunbyeol/processed --rows 4 --cols 4 --cell-size 64 --fit-scale 0.86 --align feet --shared-scale --component-mode largest --component-padding 0 --edge-clean-depth 0 --trim-border 0 --strict-qc --duration 180`

처리 스킬 기본 확대본 대신 `uv run assets/source/lounge-npcs-v1/export.py assets/source/captain122/eunbyeol --row-order 0,3,1,2`로 측정된 원본 영역을 NEAREST로 다시 추출한다. `processed/pipeline-meta.json`과 `export-manifest.json`이 재현 기준이며, `processed`의 보간 미리보기는 런타임 자산이 아니다. 모든16프레임은 잘림·출력 테두리 접촉·빈 프레임 없이 통과했다.

선장실 바닥/벽/항해도/조타대/창문은 기존 프로젝트 네이티브 그림 도구 `tools/art/captain_set.py`로 생성하며 NPC와 입구 문을 대체하지 않는다. 아직 보스나 전투를 추가하지 않았다.
