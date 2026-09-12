# 바론 대포 방어 전용 도트

검정 화면용으로 새로 생성한 흰색 용준·쮼앰대포·왼쪽을 보는 바론 얼굴입니다. 기존 컬러 이동·전투 그림은 교체하지 않습니다. 게임 규칙과 대사는 `src/data/baron-cannon.js`, 배치·프레임 선택은 `src/battle/modes/cannon-guard.js`가 기준입니다.

| 런타임 PNG (`assets/battle/cannon-guard/`) | 전체 크기 | 셀 / 순서 |
| --- | --- | --- |
| `yongjun.png` | 192×192 | 96×96, 좌상→우상→좌하→우하 |
| `cannon.png` | 256×256 | 128×128, 같은 순서 |
| `baron.png` | 384×384 | 192×192, 같은 순서 |

세 파일은 투명 RGBA 시트입니다. 전체 시트를 한 장처럼 그리지 않고 2×2 셀을 잘라 사용합니다. 용준은 뚱뚱한 몸·검정 바가지 머리·치아 보이는 입·무안경, 대포는 돼지코 포구와 나무 바퀴, 바론은 뿔과 여러 눈·송곳니를 유지합니다. 보라 브레스와 충전·명중 입자는 런타임에서 그립니다.

## 원본과 재추출

각 캐릭터 폴더의 `raw-sheet.png`와 `prompt.txt`는 builtin image_gen 생성 기록입니다. 바론은 처음 시트의 아래쪽 뿔이 셀 경계에 닿아 **`raw-sheet-v2.png`와 `prompt-v2.txt`를 최종본**으로 사용했습니다. 최초 바론은 제작 이력이며 적용하지 않습니다.

추출은 `generate2dsprite` 스킬의 `scripts/generate2dsprite.py process`를 사용했습니다. 공통 옵션은 `--rows 2 --cols 2 --fit-scale 0.90 --shared-scale --component-mode all --trim-border 0 --edge-clean-depth 0 --strict-qc --duration 180`입니다. 용준 `--target npc --mode idle --cell-size 96 --align feet`, 대포 `--target asset --mode idle --cell-size 128 --align bottom`, 바론 `--target creature --mode idle --cell-size 192 --align center`. 상세 변환 수치·각 프레임 사각형은 각 `pipeline-meta.json`에 있습니다.

색키 제거와 공통 최근접 배율만 적용했으며 PNG 색 양자화·외곽선 침식·수작업 재그리기는 하지 않았습니다. 최종 세 시트는 빈 프레임·잘림·셀 경계 침범 검사를 통과했습니다. 원본 효과음과 가공 명령은 `design/audio/references.md`의 바론 대포 방어 항목을 참고합니다.
