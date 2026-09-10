# ADR-0001: 데이터 기반 전투 스프라이트 미리보기

## Status

Accepted

## Date

2026-09-10

## Last Verified

2026-09-10

## Decision Makers

사용자, 구현 에이전트

## Summary

전투 시스템 없이도 생성된 전투 스프라이트를 실제 게임 Canvas에서 검증할 경로가 필요하다. 별도 미리보기 상태가 프레임 메타데이터를 소비하고, 아틀라스를 처음 열 때만 투명 프레임으로 가공해 재사용하도록 결정했다.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Custom HTML5 Canvas 2D / ES2022 |
| **Domain** | Rendering / UI / Animation / Input |
| **Knowledge Risk** | LOW — 표준 Canvas 2D API만 사용 |
| **References Consulted** | `CLAUDE.md`, `src/CLAUDE.md`, `DESIGN.md`, `docs/STATE.md` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | 실제 브라우저에서 지연 로드, 대기 루프, 공격 1회, 선택, 복귀, 누락 이미지 상태를 확인 |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | 이후 전투 연출이 같은 프레임 재생 계약을 재사용할 수 있음 |
| **Blocks** | None |
| **Ordering Note** | 실제 전투 규칙보다 먼저 스프라이트 재생 계약만 확정함 |

## Context

### Problem Statement

전투 대기와 공격 아틀라스는 있지만 이를 게임 렌더러에서 확인하는 화면이나 재생기가 없다. 생성 원본은 마젠타 배경이며 무기 효과가 일정한 셀 경계를 넘기 때문에 균등 분할로는 프레임을 올바르게 재생할 수 없다.

### Current State

게임은 `field`, `menu`, `title` 상태를 갖는 단일 Canvas 루프다. 필드 캐릭터 시트는 걷기 전용이며 전투 모션과 프레임별 피벗을 표현하지 않는다.

### Constraints

- 전투, 적, 체력, 턴, 스토리 트리거를 만들지 않는다.
- 480×360 논리 화면, 기존 FONT, Input 추상화, 픽셀 보간 비활성화를 유지한다.
- 일반 부팅에서는 1536×1024 아틀라스를 요청하거나 가공하지 않는다.
- 마젠타 제거와 인접 프레임 제외는 로드 시 한 번만 수행한다.
- 미리보기를 닫아도 현재 맵, 좌표, 플래그, 저장 데이터는 바뀌지 않는다.

### Requirements

- 세 캐릭터의 대기 4프레임을 반복한다.
- 선택한 캐릭터의 공격 4프레임을 한 번 재생한 뒤 대기로 돌아간다.
- 공격 중 재입력은 현재 공격을 다시 시작하지 않는다.
- 이미지가 없으면 가짜 대체 무기 없이 실패 상태를 표시하고 X로 나갈 수 있다.

## Decision

`src/ui/battle-preview.js`가 미리보기의 수명주기, 입력, 시간 기반 프레임 선택, 렌더링을 소유한다. `src/data/battle-sprites.js`는 소스 경로, 배율, 프레임별 `rect`, `pivot`, `duration`, 선택적 `exclude`를 소유한다. `Game.openBattlePreview()`와 `Game.closeBattlePreview()`가 필드와 미리보기 상태 사이의 유일한 전환점이다.

### Architecture

```
테스트룸 표지판 / ?battle=1
          |
          v
Game.openBattlePreview() --> BattlePreview.open()
          |                         |
          |                         v
     상태 전환              atlas lazy load
          |                 rect crop + chroma key
          v                         |
Input abstraction ----------> cached frame canvases
          |                         |
          +---- update/draw <-------+
                    |
                    v
            Game.closeBattlePreview()
                    |
                    v
              기존 field 복귀
```

### Key Interfaces

```js
game.openBattlePreview();
game.closeBattlePreview();

new BattlePreview({ sprites, preview, strings, onClose }).open();
playbackFrameAt(frames, elapsedSeconds, loop);
```

### Implementation Guidelines

프레임은 균등 분할하지 않고 데이터의 사각형과 피벗을 사용한다. 공격 완료 여부는 누적 프레임 지속 시간으로 계산하며 렌더 프레임 속도에 의존하지 않는다. 픽셀 탐색과 `clearRect`는 캐시 생성 단계에만 둔다.

## Alternatives Considered

### Alternative 1: 균등한 4열 분할

- **Description**: 각 아틀라스 행을 폭 384의 네 셀로 자른다.
- **Pros**: 설정이 단순하다.
- **Cons**: 칼 궤적과 발이 이웃 셀 경계를 넘어 잘리거나 섞인다.
- **Estimated Effort**: 낮음
- **Rejection Reason**: 실제 생성 프레임의 경계를 보존하지 못한다.

### Alternative 2: 매 프레임 원본 아틀라스에서 색상 키 처리

- **Description**: 렌더 루프마다 현재 사각형을 읽고 마젠타 픽셀을 지운다.
- **Pros**: 별도 프레임 캐시가 필요 없다.
- **Cons**: 큰 픽셀 버퍼를 반복해서 읽어 60fps 예산을 침해한다.
- **Estimated Effort**: 중간
- **Rejection Reason**: 정적 아트 가공을 매 프레임 반복할 이유가 없다.

## Consequences

### Positive

- 실제 엔진의 Canvas, 입력, 타이밍으로 전투 모션을 확인한다.
- 이후 전투 연출도 데이터와 재생기를 재사용할 수 있다.
- 일반 필드 부팅 비용은 변하지 않는다.

### Negative

- 처음 미리보기를 열 때 세 장의 큰 이미지 디코딩과 프레임 캐시 생성 비용이 든다.
- 생성 아틀라스의 경계가 바뀌면 메타데이터를 함께 조정해야 한다.

### Neutral

- 원본 RGB PNG는 그대로 보존되고 투명도는 런타임 캐시에만 존재한다.

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| 잘못된 프레임 경계로 이웃 그림이 섞임 | 중간 | 중간 | 프레임별 rect와 exclude, 브라우저 캡처 검증 |
| 이미지 한 장 로드 실패 | 낮음 | 낮음 | 캐릭터별 실패 표시와 항상 가능한 X 복귀 |
| 공격 입력이 연속 재시작됨 | 중간 | 중간 | attack 상태에서는 재시작 요청 거부, 단위/브라우저 테스트 |

## Performance Implications

| Metric | Before | Expected After | Budget |
|--------|--------|---------------|--------|
| CPU (frame time) | 기존 필드 루프 | drawImage 3회와 시간 계산 | JS 프레임 4ms 미만 |
| Memory | 전투 캐시 없음 | 열린 뒤 24개 crop Canvas | 총 100MB 미만 |
| Load Time | 전투 에셋 요청 없음 | 일반 부팅 동일, 최초 미리보기만 지연 | 일반 부팅 추가 요청 0 |
| Network | 전투 에셋 요청 없음 | 최초 미리보기에서 PNG 3장 1회 | 브라우저 캐시 재사용 |

## Migration Plan

1. 미리보기 모듈과 프레임 데이터를 연결한다.
2. 테스트룸 표지판과 개발 URL로 접근 경로를 제공한다.
3. 단위 테스트와 실제 브라우저 캡처로 동작을 확인한다.

**Rollback plan**: `Game`의 상태 훅과 테스트룸 진입점, 미리보기 모듈을 제거하면 기존 필드 동작으로 돌아간다. 저장 데이터 마이그레이션은 없다.

## Validation Criteria

- [x] `?map=test&battle=1`에서 세 캐릭터 대기가 보인다.
- [x] 좌우 선택과 C 공격 1회 후 대기 복귀가 동작한다.
- [x] 공격 중 C 재입력으로 첫 프레임이 재시작되지 않는다.
- [x] X가 같은 맵과 좌표의 필드로 복귀한다.
- [x] 일반 부팅에서 `assets/battle/*.png` 요청이 없다.

검증 증거: `.omo/evidence/battle-preview/summary.md`

## GDD Requirements Addressed

Foundational — no GDD requirement. Enables: 향후 전투 연출이 검증된 스프라이트 재생 계약을 재사용한다.

## Related

- `DESIGN.md`의 전투 모션 미리보기 및 움직임 규칙
- `src/ui/battle-preview.js`
- `src/data/battle-sprites.js`
