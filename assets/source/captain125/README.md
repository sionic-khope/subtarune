# 선장실 정체 공개 자산

내장 image_gen으로 생성한 원본·프롬프트와 결정론적 추출 결과다. 일반 형섭/쥰희를 대체하지 않는 사건 전용 자산이다.

- `gajaeman_shadow`: 입 없는 형섭 외형의 검정/회색 분신·붉은 눈,4방향16프레임.
- `junhee_mankatsuki`: 만카츠키 쥰희. 분홍 돼지·붉은 눈·검정 붉은 구름 망토·이타치 가르마 머리와 낮은 묶음,4방향16프레임. `cloak-before-hair.png`와 그 프롬프트는 머리 추가 전 중간 원본이며 최종 결과는 `raw-sheet.png`다.
- `junhee_point`: 원래 분홍 쥰희가 요플래를 가리키는 정지 자세.
- `mankatsuki_idle`, `mankatsuki_attack`: 왼쪽을 보는 적군 전투 대기4프레임·공격6프레임. 실제 전투 등록은 후속 작업이며 규격/프레임 시간/피벗은 [전투 계약](mankatsuki_idle/README.md)을 따른다.
- `audio`: 지정 두 음악·효과음·낮은 형섭 목소리의 출처 및 가공 기록.

기존 `assets/sprites/hyungsub.png`와 `junhee.png`를 정체성/도트 참조로 사용했다. 기본 변신 쥰희 시트→머리 추가 수정본 순서로 생성했고 전투 두 액션은 최종 머리 포함 시트를 참조했다. 투명화·측정 셀 재배치·공통배율·NEAREST 외의 형태 수정은 이미지 생성으로 수행했다. 처리 중간 보간 미리보기는 런타임 파일이 아니다.

컷신 사용 방법·현재 상태는 `design/narrative/cutscenes/captain_reveal.md`와 `docs/STATE.md`가 기준이다.
