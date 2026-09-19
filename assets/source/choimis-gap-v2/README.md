# 최미스 GAP 가슴 프린트 v2

사용자 요청: 기존 최미스 분홍 티셔츠 가슴 중앙에 검정 대문자 `GAP` 추가. 정면 4프레임에 적용하며, 뒷모습과 완전 측면에서는 글자가 드러나지 않는다. 기존 얼굴·몸·옷·셔플 동작·발 기준을 보존한다.

`reference.png`는 수정 전 승인 runtime 원본이다. `raw-sheet.png`는 이 원본을 실제 첨부하여 Codex 내장 imagegen으로 편집한 1254×1254 결과이며 전체 몸체 교체용으로 쓰지 않는다. 정확한 프롬프트는 `prompt-used.txt`다. 호출의 backend 모델·품질·usage·비용은 도구 비공개로 unknown이다. 생성 결과 식별자는 `exec-bdf00813-6d8e-49e1-bb47-049ed61a9938`이다.

`export.py`가 생성 이미지의 첫 정면 GAP 글자 영역만 crop하고 검정 획 마스크를 추출한다. 이 마스크를 NEAREST 13×5 논리도트로 재표본화한 뒤 정수 2배로 원본 정면 가슴에 붙인다. 획을 직접 그리거나 폰트로 새 글자를 작성하지 않는다. 다른 부위의 원본 픽셀과 알파는 전부 보존한다. `extracted-logo.png`에 실제 추출 결과를 남긴다. 모든 정면 프레임의 옷 높이가 같으므로 동일한 가슴 좌표를 사용한다.

재현: 저장소 루트에서 `uv run assets/source/choimis-gap-v2/export.py`. 입력은 이 폴더의 `reference.png`와 `raw-sheet.png`이며, 출력 `sheet-transparent.png`와 runtime `assets/sprites/choimis.png`를 생성한다. 기존 exporter의 방향/GIF/NEAREST 미리보기 방식을 사용한다.

규격: 512×512 RGBA, 128×128셀, 4열×4행, 행 down/up/left/right, 열 0→1→2→3 반복, 정지 0번, 발 피벗 (64,120), 기존 runtime 배율 그대로. GIF는 미리보기용 160ms/프레임이며 실제 엔진 속도는 기존 애니메이터를 따른다.

검수: `qc-meta.json`에 전체/허용영역 밖 변경 수, 알파 동일성, 뒷면·측면 동일성, 추출 좌표를 기록한다. 밝은/어두운 미리보기와 `before-after.png`를 직접 확인하여 정면 GAP와 얼굴·몸·발의 보존을 확인했다. runtime 표시/등록/게임 검수와 최종 사용자 승인은 통합 담당 범위다.
