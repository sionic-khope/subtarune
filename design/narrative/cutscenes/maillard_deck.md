# 마이야르호 갑판과 추격 동선

사용자 2026-09-12: 납치된 용준을 쫓는 동안 다른 영역/뒤쪽/왼쪽 길로 가지 못하게 하고, 전함 등장 뒤 바다와 해가 보이는 나무 갑판에서 조작을 돌려준다.

## 추격 출구

`obj4_abduction_done` 이후 `obj5_maillard_done` 전까지 `storyExitScript()`가 모든 Door 진입을 판정한다. 진행 방향은 obj4 → obj3 → obj2 → obj5다. 돌아가는 문과 obj2의 왼쪽 출구는 맵을 바꾸지 않고 억빠맨의 `* 형 지금 이럴때가 아니에요.`만 보여준다. 같은 출구 위에서 키를 계속 눌러도 대사가 반복되지 않는다. 기존 추격 브금은 건드리지 않는다. 과거 저장이 obj0/obj1에 있을 때는 obj0 → obj1 → obj2로 합류할 수 있다.

## 갑판 도착

- 지도: `maillard_deck`, 스폰: `arrival` (308,264), 크기: 640×448.
- 전용 생성 타일 `assets/tiles/maillard_deck.png`를 `M`으로 반복한다. 해와 바다는 `maillard_sea` 원경이다.
- 바닥은 x32..608, y160..416. 외곽은 막히며, 출구/추가 소품/후속 대사는 없다.
- 주인공 세 명이 서고 걸을 공간을 확보한다. 기존 아이템·돈·동료를 유지하고 새 전투를 시작하지 않는다.
- Q의 `obj5_after`는 전함 등장 직전, `maillard_deck`는 등장 완료 뒤다. 후자는 `obj5_maillard_done`을 포함하며 나무총을 중복 지급하지 않는다.

검증: `tests/unit/chase-route-deck.test.mjs`, 맵 경계/연결/배치 감사, `tests/playtest/chase-routes-deck.mjs`의 실제 방향키 출구 차단·진행 방향 통과·갑판 이동/바다 경계.
