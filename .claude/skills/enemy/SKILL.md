---
name: enemy
description: "SUBTARUNE 적(몹)·전투 추가 — 적 데이터(대사·탄막·돈), 필드 배치 또는 컷신 전투, 적 특징을 살린 탄막 패턴(델타룬 지침), 전투 기믹 모드(리듬·춤·FPS 같은 미니게임 플러그인)까지 버그 없이 한 번에. '몹 추가', '적 추가', '전투 넣어', '탄막 패턴', '보스', '전투 기믹' 요청에 사용."
argument-hint: "[적 id] [설명: 어떤 적, 어디에, 대사·기믹]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Write, Edit, Bash
model: opus
---

# Enemy (적·전투 추가)

본문은 `docs/battle/adding-enemies.md` — **먼저 읽는다**. 여기는 순서와 절대 규칙만.

## 순서
1. `docs/STATE.md` 전투 항목 + `docs/battle/adding-enemies.md` 읽기.
2. 스프라이트(`assets/enemies/<id>-battle-left.png` 64×64 pivot 32,60, 또는 대기 4프레임 격자 시트 `-battle-idle.png` 128×128 → `sheet:{cols:2,rows:2,count:4,fps:1000/180,px:1}`; 필드용 `-front.png` 48×48) — 사용자 PR 로 오는 게 기본, 오기 전엔 자리표시로 그려 두고 같은 파일명으로 덮는다.
3. `src/data/enemies.js` 항목: name/hp/image/pivot/scale/damage/money/idle/patterns/lines{appear, idle[], speak[], die}. 대사는 사용자 브리핑 **그대로**.
4. 탄막: 적의 **소지품·성격이 탄**이 되게(방패 벽, 던지는 망치…). **유형을 섞는다** — 영역 예고(`zone`/`beam`/`bomb`) 1 + 대형(`giant`) 1 + 날아오는 것(`rain/aimed/sweep/bounce/burst/homing`) 1 + `combo` 1. 카탈로그·옵션·피하는 법은 `docs/battle/adding-enemies.md §3` 표. 새 템플릿은 `bullets.js PATTERNS` 함수 하나 + `tests/unit/patterns.test.mjs` 계약. 빠른 탄·영역은 예고 ≥0.3s. 시트 대기 모션이 있으면 `idle sway 0`. 템플릿마다 `node tests/playtest/enemy.mjs <id> --pattern=N` 으로 스크린샷을 본다.
5. 배치: 맵 생성기 `enemy` 엔티티(걸어다님·쫓아옴·표준 조우) 또는 컷신 `{battle}` 노드(intro 대사·flag).
6. 기믹이 있으면 `src/battle/modes/<name>.js` 를 만들고 `modes.js` 에 등록, `{battle:{modes}}` 또는 `def.defense` 로 고른다. 엔진 상태 기계는 건드리지 않는다.
7. 검증: `node --test tests/unit/*.test.mjs` → `CHROME_EXE=… node tests/playtest/enemy.mjs <id> [--attack=<mode>]` → 스크린샷 4장 Read → 필드 배치면 맵 플레이테스트에 조우 케이스 → `tools/dev/check.sh` → STATE.md → 커밋.

## 절대 규칙
- **JS 는 `tools/dev/patch.py` 로만** 고친다(서버가 작업 트리를 그대로 서빙). 한 줄 문장 끝 `//` 금지.
- `idle` 문구에 다른 적 이름·"서로/둘이" 금지(죽은 뒤에도 뜸). `speak` 는 1인칭 한 줄.
- 사용자가 고른 사운드·대사·레이아웃은 바꾸지 않는다. 전투 UI 구성은 델타룬이 기본값.
- 헤드리스 통과 ≠ 완료 — 탄막 스크린샷에서 모양이 보이는지, 예고가 먼저 뜨는지 눈으로 본다.

## 파티 쓰러짐·부활·게임 오버 (엔진 규칙, 2026-09-11 사용자 확정 — 적을 추가할 때 건드리지 않는다)
- 탄막 피해는 서 있는 멤버 중 무작위(`hurtParty`). HP 0 → `down`: 누워서 행동 불능(메뉴·아이템 대상에서 건너뜀), 라운드(적 턴 끝 `afterEnemyPhase`)마다 회복 반짝임, `DOWN_TURNS`(3) 번째 라운드에 `REVIVE_RATIO`(반피)로 부활. 승리 시 쓰러진 멤버도 반피로 일어난다.
- **게임 오버는 전원이 쓰러졌을 때만** → GAME OVER + [다시 도전하기] → 징글 뒤 같은 전투 처음부터(`beginRetry` → `load()`). 컷신 전투(튜토리얼)도 같은 경로.
- 적 피해량(`damage`)을 정할 때 이 규칙을 전제로: 한 명이 두 번 맞고 쓰러지는 정도(10~14)가 표준 3인 파티 기준. 검증 `tests/playtest/battle_lose.mjs`.
