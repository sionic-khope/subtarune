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

## 크기·배치·배경 (2026-09-11 포스트모텀 docs/postmortems/2026-09-11-teal9-boss-sizing.md)
- **전투 그림은 480×360 안, 패널 윗선(y 246) 위에 전부** 들어와야 한다. 둘이면 각 ≤ 144px(96 셀 × 1.5), `def.dx/dy` 로 발을 144/246 에 두고 가로 40px 엇갈림. `tests/playtest/enemy.mjs` 가 그림 사각형을 재서 막는다 — 스크린샷에서 가장자리에 걸린 그림이 있으면 실패다.
- 필드 NPC 로도 서는 적(`CHARACTERS.stillScale`)은 이벤트 카메라(대화창 위 230px) 안에 전신이 들어오는 크기까지만(64px 그림이면 ≤ 1.8배). 배치는 사각형으로 계산해 파티·서로와 안 겹치게, `tests/playtest/<맵>.mjs` 에 검사 한 줄.
- 배경: `src/battle/backgrounds.js` 레지스트리 — `registerBattleBg('name', (ctx, battle) => …)`, 맵 `battleBg` 또는 `{battle:{bg}}` 로 고른다. 기본 `teal`, 보스 무대 `temple`(사원 광장·문양). 새 배경은 함수 하나 + 캐시 캔버스, `tests/unit/battle-bgs.test.mjs` 가 이름 등록을 검사한다.

## 준비된 스프라이트(브리핑 오면 바로 등록, 2026-09-11)
- **바론**(PR #15, LoL 바론 모티브 보스): 필드 정면 `assets/enemies/baron-front.png` 160×160(앵커 80,148, `CHARACTERS.baron` 등록됨, 1.43배 229px — 대화 중 보이는 높이 230 꽉 참이라 카메라를 화자별로) / 전투 `assets/enemies/baron-battle-idle.png` 512×512 2×2 셀 256 240ms → `sheet:{cols:2,rows:2,count:4,fps:1000/240,px:1}, pivot:[128,238]`. **축소·자동 크기 정규화 금지**(보스 규격). 전투 패널 위 246px 안에 들어오는지 `enemy.mjs` 그림 사각형으로 확인하고 `dy`·`scale` 로 맞춘다.
- **용준·쥰희 나무 대포**(PR #15): `assets/props/wooden_cannon.png` 128×128 3/4 정지 1장(바닥 앵커 64,119) — 무기 단독 자산, 발사·반동 애니 없음(필요하면 `/art` 로 띠 추가).
