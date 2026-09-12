# 대포 방어 FX v2

BUILD2026-09-12.97: 내장 이미지 생성으로 만든 산성탄과 단일 중량 대포알. 기존 흰색 용준·대포·바론은 v1 원본을 유지한다.

- `acid/raw-sheet.png` → `assets/battle/cannon-guard/acid.png`: 128×128, 64px 셀 2×2, 왼쪽 진행.
- `shot/raw-sheet.png` → `assets/battle/cannon-guard/shot.png`: 192×192, 96px 셀 2×2, 오른쪽 진행. 한 번 발사하는 단일 대포알이지 광선이 아니다.
- 각 디렉터리의 `prompt.txt`와 `pipeline-meta.json`에 생성 지시와 추출 정보를 보존한다. generate2dsprite로 공유 배율/중앙 정렬, trim0·edge-clean0 추출했다.
- 두 시트 모두 빈 프레임·출력 가장자리 접촉·클램프0. 대포알 원본 가장자리의 희미한 입자로 source-edge 표시4개가 있으나 최종4프레임의 탄환 본체와 꼬리는 잘리지 않았음을 직접 확인했다.

재생·이동·충돌은 `src/battle/modes/cannon-guard.js`. 기존 전투 스프라이트나 전체 게임 이미지 대신 이 모드에서만 사용한다.
