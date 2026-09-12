# ADR-0002: 카트 이동과 음악 동기 일출

2026-09-12 · 채택

## 결정

약8초 접근·C 탑승/목재 충격음·약10초 주행을 기존 `Raft` 기반 필드 엔티티로 구현한다. .108에서 자동 승차를 C 승차로 변경했다. 승객은 오른쪽 정지 스프라이트를 앞에서부터 요플래·빠맨·경섭 순서로 그리며 `seatClipY` 아래 하체를 가린다. `disembarkPartyGap`으로 하차 공간을 확보하고 파티와 발자국을 함께 복원한다. 일반 파티 순서는 보존한다.

`MaillardSunrise`는 맵의 배경·조명이다. 지정곡은 맵 진입 순간0초부터 재생한다. 실제 미디어 시계14~30초에 어두운 장면의 광량,14~24초에 주황빛 번짐,14~42초에 큰 해를 진행하므로 카트 탑승 시점과 무관하다. 버퍼링 중에는 음악과 함께 멈추며 음소거는 시간을 멈추지 않는다. 완료된 해는 곡 루프에도 내려가지 않는다. 맵의 `followScreenY`는 플레이어를 화면 아래로 배치하고 `rails`는 타일맵 베이크 단계에서 전용 선로를 그린다.

## 경계와 재사용

- 수치/에셋 계약: `src/data/maillard-sunrise.js`.
- 연출: `src/world/world.js`의 필드 탈것과 `src/world/sunrise.js`.
- 배치: `tools/maps/maillard_path.py` → 생성 JSON. 바다와 보행로 판정은 기존 TileMap을 사용한다.
- `maillard_cart_done`은 하차 후에만 저장한다. 일출은 독립 완료 플래그를 쓰며 늦게 탑승한 주행 중에 완료되어도 저장은 안전한 하차까지 미룬다.
- 후속 맵은 `backdrop: 'maillard_sunrise'`, `sunrise: { animated: false }`로 고정된 해를 사용할 수 있다. 이번 변경에서 후속 방이나 NPC 대사는 만들지 않는다.
- 밝기 오버레이는 맵/인물 전체에 적용하고 UI·원본 PNG는 변경하지 않는다.

## 확인

`tests/unit/sunrise.test.mjs`, `tests/unit/maillard-path.test.mjs`와 `tests/playtest/maillard-sunrise.mjs`로 음악 시계, 이동 경로, 탑승 순서, 밝기 전환, 하차/이어하기를 확인한다. 실제 중간 프레임은 별도 캡처로 판정한다.
