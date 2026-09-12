# ADR-0002: 카트 이동과 음악 동기 일출

2026-09-12 · 채택

## 결정

긴 보행 대신 사용자가 선택한 약8초 접근·약20초 자동 카트를 `MaillardCart` 장면으로 구현한다. 기존 필드/전투를 바꾸지 않고 장면 중에만 이동 입력과 필드 렌더를 넘겨받는다. 승객은 기존 왼쪽 정지 스프라이트를 요플래·빠맨·경섭 순서로 그리며 일반 파티 순서는 보존한다.

`MaillardSunrise`는 맵과 카트가 공유하는 배경·조명이다. 지정곡은 출발 순간0초부터 재생하고 실제 미디어 시계14~18초에 일출을 진행한다. 버퍼링 중에는 음악과 함께 멈추며 음소거는 시간을 멈추지 않는다. 완료된 해는 곡 루프에도 내려가지 않는다. 별도 벽시계 타이머로 음악과 어긋나게 하지 않는다.

## 경계와 재사용

- 수치/에셋 계약: `src/data/maillard-sunrise.js`.
- 연출: `src/scenes/maillard-cart.js`, `src/world/sunrise.js`.
- 배치: `tools/maps/maillard_path.py` → 생성 JSON. 바다와 보행로 판정은 기존 TileMap을 사용한다.
- `maillard_cart_done`은 하차 후에만 저장한다. 완료 입장/이어하기는 하차 지점과 밝은 해를 복원한다.
- 후속 맵은 `backdrop: 'maillard_sunrise'`, `sunrise: { animated: false }`로 고정된 해를 사용할 수 있다. 이번 변경에서 후속 방이나 NPC 대사는 만들지 않는다.
- 밝기 오버레이는 맵/인물 전체에 적용하고 UI·원본 PNG는 변경하지 않는다.

## 확인

`tests/unit/sunrise.test.mjs`, `tests/unit/maillard-path.test.mjs`와 `tests/playtest/maillard-sunrise.mjs`로 음악 시계, 이동 경로, 탑승 순서, 밝기 전환, 하차/이어하기를 확인한다. 실제 중간 프레임은 별도 캡처로 판정한다.
