# 봉인 최미스 · BUILD300

상태: exported, 자산 전달 완료. 내장 imagegen 생성. 실제 backend 모델/비용은 도구 미공개로 unknown. 이번 내보내기에 추가 생성 호출은 없다.

승인된 원래 최미스 `assets/sprites/choimis.png`를 참조해 흰/회색 머리, 작은 네모 안경, 넓은 얼굴과 코, 분홍 GAP 의상, 통통한 몸과 모은 다리를 보존했다. 앞쪽 왼편을 보는3/4 앉은 자세1장, 몸통을 감싼 밧줄·뒤로 묶인 손, 망토/꽃/상처 없음. 실제 생성 프롬프트는 `prompt.txt`다.

## 런타임 계약

- 최종 `assets/props/choimis-sealed.png`: **55×90 RGBA**, 단일 프레임. 표시 scale1, 바닥 중심 피벗 `[27.5,89]`(PNG 마지막 행), 중심 피벗 `[27.5,45]`.
- 원본 비율을 유지했다. `70×90`으로 늘리지 않는다. runtime의 기존70px폭 예정 위치는 이미지 중심을 기준으로 조정한다.
- 정지 프레임이므로 프레임 순서/반복/재생시간 없음. 밧줄·몸체는 하나의 생성 자산이며 움직임은 runtime이 소유한다.

## 원본과 처리

- byte-identical 원본 `native-original.png`:1254×1254 RGBA, SHA256 `8277092616c29a3bccc987bc31222b8a0c6af834608cab1b022b7a57a3439bfb`. 도구 반환 원본 경로 `/Users/khope@sionic.ai/.codex/generated_images/01a09daa-6644-71a0-a0b4-284c735f3b96/exec-a9a97055-c5d9-40e1-9e27-8c9c6de463b5.png`.
- 부모가 제공한 `raw.png`, `clean.png`, `pipeline-meta.json`은 보존했다. pipeline의 raw와 도구 원본은 파일 바이트가 달라 별도로 보관한다.
- 128×128 clean에서 alpha≥128 가시 경계 `[41,25,89,104]`를 crop(48×79)하고, NEAREST로55×90에 맞췄다. 반올림 외 비율 변화 없음. 외곽의 매우 희미한 알파 잔여를 경계 선정에서 제외했으며 채색·재합성·몸체 수정은 없다.
- 재현: 저장소 루트에서 `uv run assets/source/naem-jet300/export.py`.
- 최종 SHA256 `88542d688f87bc67c8c95387d3200bff792a26bf3283c24efb553488a2e042ba`. 기계 메타데이터는 `export-meta.json`; 밝고 어두운 배경 미리보기는 `preview-eee8dd.png`/`preview-101925.png`다.

내보내기 단위 검사2개, PNG 디코드/크기, 밝고 어두운 배경 직접 검수로 GAP·안경·밧줄·접힌 다리를 확인했다. 실제 라운지 위치/주변 배우/충돌/대화 화면 검수는 통합 담당이 별도로 진행한다. 자산 준비와 게임 통합 완료를 구분한다.
