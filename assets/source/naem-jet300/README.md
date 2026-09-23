# 냄트기 구조 컷신 자산 · BUILD300

상태: exported, 자산 전달 완료. 기준 `8d4c3d2ac7086af17f2be4b3d6f6a71c7cfe5fdc`. 내장 imagegen 생성이며 실제 backend 모델/비용은 도구 미공개로 unknown. 이번 내보내기에서 추가 생성 호출은 하지 않았다.

엄청대박인배 assets/props/youngcle-warship.png의 남색/은색 선체, 청록 창문, 둥근 흑백 문장을 유지한 오른쪽을 향한 구조 제트기 한 장. 조종석은 비워 두고 박용준 승인 스프라이트를 런타임에서 덧그린다. 아래로 길게 내려오는 집게는 세 명이 나란히 매달릴 폭을 확보한다. 탑승자는 원본 PNG에 포함하지 않는다. 제트 배기/바람은 별도 런타임 효과. 원본은 마젠타 단색, 전신 여백 보존, 최근접 축소와 색키만 수행한다. 목표 최대 표시 폭340/높이190 논리px, 대사창 위에 조종석과 집게 탑승자가 모두 보인다.

## 산출물과 기준점

최종 `assets/props/naem-jet.png`: **680×339 RGBA**, 오른쪽 방향 단일 프레임. 중심 피벗 `[340,169.5]`, 공통 runtime scale `0.5`면 **340×169.5** 논리px다. 반복/일회성 프레임 애니메이션은 없고 기체 이동·배기·바람은 런타임 담당이다.

다음 좌표는 출력 PNG의 왼쪽 위를 `[0,0]`으로 한 배우 발 기준점이다. 원본 clean에서 선정한 자리를 crop 원점 `[39,218]`만큼 이동했다.

| 기준점 | clean 좌표 | 출력 PNG 좌표 | 중심 피벗 상대 좌표 |
| --- | --- | --- | --- |
| 조종석 박용준 발 | `[535,337]` | `[496,119]` | `[156,-50.5]` |
| 집게 왼쪽 배우 발 | `[400,519]` | `[361,301]` | `[21,131.5]` |
| 집게 가운데 배우 발 | `[447,519]` | `[408,301]` | `[68,131.5]` |
| 집게 오른쪽 배우 발 | `[495,519]` | `[456,301]` | `[116,131.5]` |

화면 좌표는 `기체 중심 + (기준점 - 피벗) × 0.5`다. 몸을 함께 줄일지는 배우 표시 크기에 따라 runtime에서 결정한다. 빈 조종석·집게를 생성했고 탑승 배우는 별도 승인 시트를 덧그린다.

## 원본과 재현

- 실제 생성 프롬프트는 `prompt.txt`; 참고 자산은 `assets/props/youngcle-warship.png`다.
- byte-identical 생성 원본 `native-original.png`: 1698×926 RGBA, SHA256 `3f2b41e093852d1016fbe3a6e29050c2a7dd2e3a669b657fbf0aef3e55bf74de`. 도구 반환 원본은 `/Users/khope@sionic.ai/.codex/generated_images/01a09daa-6644-71a0-a0b4-284c735f3b96/exec-94a11b60-ed62-4182-8e74-ef1bc58ed3c2.png`다.
- 부모 작업이 제공한 처리 중간본 `processed/raw.png`, `processed/clean.png`와 `processed/pipeline-meta.json`을 보존했다. pipeline의 raw는 원본과 파일 바이트가 달라 별도로 원본을 복사했다. 원본과 중간본을 혼동하지 않는다.
- 입력 clean은768×768. alpha≥128의 가시 경계 `[42,221,716,554]`에3px 여백을 붙여 `[39,218,719,557]`만 crop했다. 희미한 외곽 알파 잔여를 경계 선정에서 제외했으며 crop 안의 RGBA는 변경하지 않았다. 제트기는 resize하지 않았다.
- 재현: 저장소 루트에서 `uv run assets/source/naem-jet300/export.py`. 같은 스크립트가 봉인 최미스도 내보낸다. 자르기/NEAREST 이외 채색·합성·형태 수정은 없다.
- 최종 SHA256 `c13032795f7b749a42758f43c627445506800dab1483b503246e0c0439de26b1`. 기계 메타데이터 `export-meta.json`, 밝고 어두운 미리보기 `preview-eee8dd.png`/`preview-101925.png`.

내보내기 단위 검사2개, PNG 디코드/크기/직접 밝고 어두운 배경 검수로 빈 조종석·기체·집게와 여백을 확인했다. runtime 배우 합성/이동/카메라 검수는 별도 구조 장면 담당의 책임이며 자산 준비만으로 통합 완료를 뜻하지 않는다.

검사 재현: `uv run --with pillow --with pytest pytest --import-mode=importlib assets/source/naem-jet300/test_export.py -q`. Python 문법 검사와 programming 규칙 검사 통과. basedpyright는 오류0개이며 Pillow의 `point`/`resize` 외부 타입 선언에 부분 미정 타입 경고2개가 남는다. 출력 PNG·원본 보존·NEAREST 규칙은 실제 실행과 단위 검사로 확인했다.
