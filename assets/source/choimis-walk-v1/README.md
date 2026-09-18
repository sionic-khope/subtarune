# 최미스 이동 v1

내장 `image_gen`으로 만든 원본을 기계적으로 분할한4방향×4프레임 후보. 흰 뾰족머리·네모 안경·긴 코·이를 보이는 입·뚱뚱한 몸·분홍 의상과 모은 다리를 유지한다. 입 없음 규칙은 적용하지 않는다. 큰 보폭 대신 제한된 꼼지락/셔플이며16개의 독립된 큰 걷기 포즈라고 주장하지 않는다.

`choimis.png`/`sheet-transparent.png`:256×256 RGBA,64px 제작셀, down/up/left/right, 열0→1→2→3 반복. 제작 발 기준은(32,60), 정지는 각 행0번. 방향 GIF는160ms/프레임 미리보기이며 실제 엔진 속도는 기존 이동 애니메이터를 따른다. 원본의 방향 순서는 down/left/right/up이다. 게임용은 제작본을 정수 NEAREST2배 확대한 `runtime-128.png`(512×512,128px셀, 피벗64,120)를 `assets/sprites/choimis.png`로 쓴다. 체형이나 픽셀을 새로 만들지 않고 기존 동료와 비교해 성인 크기인 가시 높이 약69~70논리px로 표시한다.64px 제작본을 그대로 게임에 넣었을 때의 약34~35px는 작은 이전 미리보기다.

원본은 실제 alpha가 있으므로 전체 색키를 끄고 분홍 옷을 보존했다. alpha128 이진화 뒤 전체 공통 영역(10,10)-(1210,1250)을 잘라300×310셀로 분할한다. 공통 배율0.1734193548·NEAREST와 공통 신발 바닥 y60으로 출력하며, 프레임별 체형 늘이기·해부학 수정·색 재설계는 없다. 최종1px 투명 경계에 붙은 고채도 녹색/빨강/마젠타11px만 투명 처리했고 분홍 옷의 높은 green값은 제외한다. 정확한 마스크는 export.py/qc-meta.json이다. 중간 `processor/`는 표준 처리기의 geometry/QC 산출물이며 LANCZOS 그림은 납품에 쓰지 않는다.

재현: `uv run export.py /absolute/path/to/generate2dsprite.py`. 게임 저장소에서는 `uv run assets/source/choimis-walk-v1/export.py tools/sprites/sheet_processor.py`로 실행한다. `raw-sheet.png`·`prompt-used.txt`·`reference.png`와 함께 실행한다. 공급자는 Codex 내장 이미지 도구이며 숨겨진 모델명/usage/요금은 unknown이다.

검수:16개 비어 있지 않은 프레임, 원본/출력 경계 접촉0, clamp0, 공통 스케일; 자세 크기CV 약0.0200. 최종 프레임의 bbox는 `qc-meta.json`. `preview-4x.png`와4개 GIF로 얼굴·발·방향을 검수한다. 사용자의 최종 외형 승인과 게임 등록/배포 상태는 별도다. 자세 차이가 작고64px에서 이빨 세부가 작게 읽히는 한계가 있다.
