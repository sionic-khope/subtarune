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
2. 스프라이트(`assets/enemies/<id>-battle-left.png` 64×64 pivot 32,60; 필드용 `-front.png` 48×48) — 없으면 `/art` 로 그린다(델타룬 밀도, 외곽선 1px, 2톤).
3. `src/data/enemies.js` 항목: name/hp/image/pivot/scale/damage/money/idle/patterns/lines{appear, idle[], speak[], die}. 대사는 사용자 브리핑 **그대로**.
4. 탄막: 적의 **소지품·성격이 탄**이 되게(방패 벽, 던지는 망치…). 기존 패턴(rain/aimed/sweep/bounce/hammer_arc/shield_wall/hammer_slam)에 `shape/kind/spin` 을 주거나 `bullets.js PATTERNS` 에 함수 하나 추가. 빠른 탄은 예고(`vline`).
5. 배치: 맵 생성기 `enemy` 엔티티(걸어다님·쫓아옴·표준 조우) 또는 컷신 `{battle}` 노드(intro 대사·flag).
6. 기믹이 있으면 `src/battle/modes/<name>.js` 를 만들고 `modes.js` 에 등록, `{battle:{modes}}` 또는 `def.defense` 로 고른다. 엔진 상태 기계는 건드리지 않는다.
7. 검증: `node --test tests/unit/*.test.mjs` → `CHROME_EXE=… node tests/playtest/enemy.mjs <id> [--attack=<mode>]` → 스크린샷 4장 Read → 필드 배치면 맵 플레이테스트에 조우 케이스 → `tools/dev/check.sh` → STATE.md → 커밋.

## 절대 규칙
- **JS 는 `tools/dev/patch.py` 로만** 고친다(서버가 작업 트리를 그대로 서빙). 한 줄 문장 끝 `//` 금지.
- `idle` 문구에 다른 적 이름·"서로/둘이" 금지(죽은 뒤에도 뜸). `speak` 는 1인칭 한 줄.
- 사용자가 고른 사운드·대사·레이아웃은 바꾸지 않는다. 전투 UI 구성은 델타룬이 기본값.
- 헤드리스 통과 ≠ 완료 — 탄막 스크린샷에서 모양이 보이는지, 예고가 먼저 뜨는지 눈으로 본다.
