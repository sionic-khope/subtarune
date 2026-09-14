# 적(몹)·전투 추가 가이드 — `/enemy` 스킬의 본문

전투는 데이터 + 플러그인이다. 새 적은 데이터, 새 공격 방식은 패턴, 전투 단계의 다른 놀이는 모드가 우선이다. 기존 계약이 실제 요구를 표현하지 못할 때만 공통 API와 호출부를 최소 확장하며, 모드가 상태 기계를 우회하지 않는다. 설계·난도 판단은 [전투 판단](../development/combat-design.md)을 적용한다. 아래 초기 숫자는 예시이며 현재 수치는 실제 적 데이터·파티 진행 상태에서 읽는다.

## 1. 적 한 마리 추가 (5분)
1. **스프라이트**: `assets/enemies/<id>-battle-left.png` — 왼쪽(우리 편)을 바라보는 64×64, 발 pivot [32,60]. 필드에 걸어다니게 하려면 `assets/enemies/<id>-front.png`(48×48 still) 도.
2. **데이터** `src/data/enemies.js` 에 한 항목:
   ```js
   goblin: {
     name: '고블린', hp: 6,                               // 예시 HP. 현재 기본 공격은 game.attack || 1이므로 강화 상태에 따라 타격 횟수가 달라진다.
     image: 'assets/enemies/goblin-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8, money: 30,
     // 대기 애니가 있으면 image 대신 격자 시트(PR #14 규격, 2026-09-11): 64×64 셀 cols×rows, 좌상→우상→좌하→우하 순서로 count 프레임, fps(180ms = 1000/180), px 1(원본 크기). pivot·scale 은 그대로 셀 기준
     // sheet: { src: 'assets/enemies/<id>-battle-idle.png', cols: 2, rows: 2, count: 4, fps: 1000 / 180, px: 1 },
     idle: { swayX: 8, swayY: 2, period: 2.8 },           // 서 있을 때 좌우로 살짝 (정적인 느낌 금지)
     patterns: [ { type: 'shield_wall', kind: 'red' }, { type: 'hammer_slam' } ],   // 턴마다 돌아가며. 아래 3장
     lines: {
       appear: '* 고블린이 나타났다!',
       idle:  ['* 고블린이 코를 판다.{w=0.3} 더럽다.', ...],   // 행동 선택 화면 위 두 줄에 뜨는 나레이션(* 로 시작). **다른 적을 언급 금지**(그 적이 죽어도 뜸)
       speak: ['내 코딱지 받아라.', ...],                    // 적 턴 말풍선(1인칭, 짧게). 탄막 전에 뜨고 준비 시간을 준다
       die:   '* 고블린이 쓰러졌다.',
     },
     // defense: 'dance',                                   // (선택) 이 적의 턴만 다른 모드로 — 4장
   },
   ```
   `src/data/characters.js` 에 `goblin: { name, still: 'assets/enemies/goblin-front.png' }` 를 넣으면 필드 NPC/enemy 엔티티 스프라이트로 쓸 수 있다.
3. **배치** — 둘 중 하나:
   - 필드에 걸어다니는 적: 맵 생성기에 `{'type':'enemy','id':'g1','sprite':'goblin','x':..,'y':..,'wander':40,'enemies':['goblin'],'unless':'<맵>_g1_defeated'}` → 닿으면 표준 조우(`startEncounter`: 징글 → 필드 브금 끊김 → 소용돌이·줌 → 전투 → 이기면 영구 제거·맵 브금 복귀).
   - 컷신 전투: `{ battle: { enemies: ['goblin', 'goblin'], bgm: 'rude_buster', bg: 'teal', flag: '<맵>_goblins_won', intro: ['* 고블린 둘이 길을 막는다!', { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman', text: '* 형 이건 제가…' }] } }` — `intro` 는 전투 안 대사(튜토리얼 기믹). 끝나면 `game.lastBattle.win`.
4. **검증**: `node --test tests/unit/*.test.mjs`(enemies.test 가 hp/lines/패턴 이름/이미지 존재를 검사) → `tests/playtest/run.sh` 대신 범용 하네스 `CHROME_EXE=… node tests/playtest/enemy.mjs goblin` (인트로·잡담·공격·말풍선·탄막 모양·승리·돈·에러 0, 스크린샷 `shots/enemy_goblin_*.png` 을 **눈으로** 본다).
5. `docs/STATE.md` 에 한 줄.

## 2. 대사 규칙 (사용자 확정)
- `idle` 은 나레이션 톤(`* `), 유머는 억빠맨/경섭/요플래를 끌어와도 되지만 **다른 적은 언급 금지**. `speak` 는 1인칭 한 줄, 12px 흰 말풍선에 2~3줄 이내(≈30자).
- 튜토리얼처럼 전투 중 우리 편 대사가 필요하면 `battle.intro` 에 `{speaker, portrait, voice, text}` 로 (첫 전투 억빠맨 4줄 참고). 단위 테스트가 "다른 적 이름·서로/둘이" 를 잡는다.

## 3. 탄막 패턴 — 적의 특징을 살려라 (델타룬 참고, 사용자 2026-09-11)

### 고유성 규칙 (2026-09-12 사용자 확정)

- 다른 전투 몹의 **기믹 원리**는 참고할 수 있다. 새 적의 패턴·탄 모양·배치·타이밍·연출 디자인은 그 적의 신체/소지품/성격에서 새로 설계한다. 기존 패턴을 그대로 호출하거나 색·속도·개수만 바꾼 결과를 신규 디자인으로 취급하지 않는다.
- 공통 엔진(충돌·입력·HP·턴·모드 계약)은 공유한다. 아래 템플릿 표와 과거 몹 예시는 엔진 계약/역사 참고이며 새 적에게 그대로 붙이는 제작 기본값이 아니다. 기존 몹 전체를 요청 없이 소급 수정하지 않는다.
- 구현 전에 각 공격의 **동작 → 전용 실루엣 → 예고 → 회피법**을 한 줄로 정의한다. 확인할 때 이전 몹과 탄의 모양뿐 아니라 이동 경로·순서·피하는 방법도 대조한다.
- 보스 공격에는 전용 효과음을 준비/발사/타격 시점에 사용할 수 있다. 동작 단위로 재생하고 탄/프레임마다 중첩하지 않는다. 다른 캐릭터의 무기 소리를 무관한 보스 공격에 쓰지 않는다. 사용자가 정한 BGM은 유지한다.
- **회피 난도와 피격 벌칙을 구분한다**(2026-09-12 사용자 "피해량이 아니라 패턴이 어려워지는걸"). "패턴을 어렵게" 요청에는 피해량·적 HP·턴 길이를 올리는 것으로 대체하지 않는다. 이동하는 위협의 교차·시간차·변하는 안전 통로·연속 방향 전환을 설계하고, 전후를 같은 소울 속도와 피격 무적시간으로 비교한다. 중앙뿐 아니라 합법적인 구석/가장자리 정지와 단순 왕복/테두리 순환에서 영구 안전 지대가 남는지 확인한다. 동시에 예고를 읽고 이동해 빠져나갈 경로는 남긴다.
델타룬의 적은 **가진 것과 성격이 곧 탄**이다(랜서=창·자전거, 루딘=다이아, 헤더=하트). 우리도 같다: 레드 CS = 방패 벽·방패 조준탄, 블루 CS = 던지는 망치·내리찍는 망치.
- **첫 학습 패턴은 한 가지 피하는 법**을 읽히게 한다. 벽 사이로, 예고 자리 비키기, 포물선 아래로 지나가기 등이다. 후반/격노는 이미 배운 회피를 조합할 수 있으며 동시에 가능한 안전 경로를 검증한다.
- **빠른 탄은 반드시 예고**(점선 `vline`·깜빡임 0.5s) — 언더테일식 "보고 피할 수 있는 공정함". 느린 탄(≤90px/s)은 예고 없이 양으로.
- **수치 범위**: 지속 4~5s, 탄 반지름 4~8, 속도 70~150(예고 있는 낙하는 250까지), 간격 0.5~1.3s, 상자 200×150 기준. 첫 전투 적은 한 턴에 맞아도 1~2번.
- **모양**: `shape` + `kind`(색) + `spin`은 기존 탄 계약이다. 새 적은 전용 실루엣을 `Bullet.draw` 또는 전용 렌더 모듈에 추가한다(외곽선 1px + 2톤, 델타룬 밀도). 새 패턴 등록 계약: `{ duration, update(t, dt, api) }`, `api = { emit, box, soul, rnd, sfx }`. 보스의 `sfx(name)`는 공격 타임라인에서 동작당 한 번 호출한다.
- **턴마다 돌아가며** 쓰이므로 3~4개. 첫 턴은 가장 읽기 쉬운 것. **유형을 섞는다**(사용자 2026-09-11 "주황 선 쏘는 거랑 날아다니는 것만 있다"): 영역 예고 계열 1개 + 대형 1개 + 날아오는 것 1개 + (combo 1개).
- **템플릿 카탈로그** (`src/battle/bullets.js PATTERNS`, 전부 `shape/kind/spin/duration` 공통):

| 유형 | 템플릿 | 피하는 법 | 주요 옵션 | 쓴 예 |
|---|---|---|---|---|
| 날아오는 것 | `rain` 위에서 비 | 빈 세로 줄 찾기 | `rate speed r` | 칼날부리 깃털 비 |
| | `aimed` 가장자리에서 소울 조준 | 옆으로 한 발 | `every speed r` | 포탄 조준 |
| | `sweep` 줄지어 옆으로(한 줄 빔) | 빈 줄로 | `rows gap speed every` | 집게 줄 |
| | `bounce` 상자 안에서 튕김 | 궤적 읽기 | `count speed r` | 튕기는 바위 |
| | `burst` 한 점에서 방사형 | 탄 사이 틈 | `at n speed every` | 대포 산탄 |
| | `homing` 소울을 따라옴 | 계속 움직여 따돌림 | `count speed turn life` | 바위게 물방울 |
| 예고 뒤 덮침 | `slam` 소울 줄에 점선 예고 → 그 줄로 | 예고 줄 비키기 | `from warn speed r` | 늑대 도약·혀·망치 |
| | `hammer_slam`/`hammer_arc`/`shield_wall` | (CS 전용 변형) | | 레드·블루 CS |
| 영역 예고 | `zone` 칸을 빨갛게 → 덮침 | 빨간 칸 밖 / `safe:1` 이면 **한 칸만 안전** | `cols rows count\|safe warn hit every` | 돌거북 내리찍기·대포 광역 |
| | `beam` 선 예고 → 굵은 빔(가로/세로/십자) | 빔 사이·옆 | `dir(h\|v\|alt\|both) count thick warn hit` | 바위게 집게 궤적 |
| | `bomb` 착지 고리 예고 → 파편 | 고리에서 멀리 | `every warn frags fragSpeed r` | 대포 낙하 |
| 대형 | `giant` 띠 예고 → 거대 탄 하나(r 30+) | 띠 밖으로 | `from r speed warn every` | 거대 바위 |
| 조합 | `combo` 둘 동시 | (난이도) | `parts:[…]` | 정글 몹 전부 |

  예고(`warn`)가 있는 유형(slam/zone/beam/giant/bomb)은 **≥0.3s**(`enemies.test`), 영역은 상자 안에만(`patterns.test`). 새 템플릿은 함수 하나 + `patterns.test.mjs` 에 계약 한 줄.
- **하나씩 눈으로**: `node tests/playtest/enemy.mjs <id> --pattern=N` → `enemy_<id>_pN_03_bullets.png`. 예고가 먼저 뜨고(빨간 칸·점선·고리) 그 뒤 덮치는지 본다.
- **시트에 대기 모션이 있는 적**(PR #14 식 4프레임)은 `idle:{swayX:0, swayY:0}` — 좌우 흔들림을 겹치지 않는다(사용자 2026-09-11). 단일 PNG 적만 sway 로 살린다.

## 3.5 전투 배경 — 레지스트리 (2026-09-11)
`src/battle/backgrounds.js`: `registerBattleBg('name', (ctx, battle) => { … })`. 맵 JSON `battleBg` 또는 컷신 `{ battle:{ bg:'name' } }` 로 고른다. 기본 `teal`(청록숲 잎 뭉치), `temple`(고대 사원 광장 무대: 기둥·아치 실루엣, 둥근 판석 무대, 가운데 문양 — 델타룬 왕 전투 참고). 정적 배경은 오프스크린 캔버스에 한 번 그려 캐시한다. 패널(y 246~)·HP 띠가 위에 덮이므로 무대는 y ≤ 262 까지만 의미 있다. `tests/unit/battle-bgs.test.mjs` 가 맵·컷신이 쓰는 이름의 등록을 검사한다.

## 4. 전투 기믹(미니게임) — 모드 플러그인
`src/battle/modes.js` 레지스트리. 공격 단계나 적 턴을 **통째로** 다른 놀이로 바꾼다(리듬게임으로 공격, 춤으로 공격, FPS 모드로 마우스 공격, 적 턴이 퀴즈…).
```js
// src/battle/modes/dance.js — 새 파일
export function createDanceAttack(battle, { member, target }) {
  return { update(dt, input) { /* 입력 판정 → battle.hitEnemy(target, member, dmg) */ return done; }, draw(ctx) { /* 패널 자리(20,246,440,72) 안팎 자유 */ } };
}
// src/battle/modes.js 에 한 줄
registerBattleMode('attack', 'dance', createDanceAttack);
```
- 고르는 곳: 컷신 `{ battle:{ modes:{ attack:'dance' } } }` / 맵 enemy 엔티티 `modes` / 적 데이터 `defense:'quiz'`(그 적의 턴만) / 멤버 `attackMode`.
- 계약: `update` 가 `true` 를 돌려주면 끝. 결과는 `battle.hitEnemy` / `battle.hurtParty` / `battle.setText` 만. 상태 문자열을 직접 바꾸지 않는다. HP 띠·승패 판정은 battle 이 한다. 마우스가 필요하면 `battle.game.canvas` 에 pointer 리스너를 달고 끝날 때 뗀다.
- 예시 `timing`(타이밍 바, `src/battle/modes/timing.js`): `node tests/playtest/enemy.mjs cs_blue --attack=timing` 으로 돌려 본다. 단위 테스트 `battle-modes.test.mjs` 가 계약을 검사한다.

### 전투 중 지원 행동 (2026-09-12 바론 대포)

조정 사례(BUILD 2026-09-12.100): 대포 명중은60피해,12초 차징(마지막3초에 차징음) 뒤3초 발사 연출 중1.4초에 단일 충돌한다. 현재 수치와 해금 조건은 `src/data/baron-cannon.js`의 `BARON_CANNON`을 읽는다. 초기50피해/12+3+3초는 폐기된 값이다.

적 `support:'baron_cannon'`은 전투 로컬 지원 컨트롤러(`src/battle/support/baron-cannon.js`)를 선택한다. 첫 공방 뒤 `afterEnemyPhase()`가 돌려준 interlude의 `update/draw` 동안 일반 메뉴 입력을 잠근다. 대사·해금·충전·타격 시간은 위 데이터 원본에서 읽는다. 스택은 해금 후 살아 있는 바론에 실제 들어간 일반 명중당1이며 피해 수치·대포·0피해·죽은 적은 세지 않는다. 대포 선택은 앞서 계획한 행동을 지우고 파티 전체 한 턴으로 실행하며 성공/실패 모두0으로 소비한다. 재도전은 해금과 스택도 초기화한다.

모드의 선택적 `fullscreen:true`는 검정 배경부터 HP 띠까지 그리기를 위임한다. `dispose()`는 끝/패배/재시도 자원 정리 계약이다. 대포는 `battle.applyCannonDamage(target, BARON_CANNON.damage)`를 호출해 일반 타격 효과음·스택을 제외하고 공통 사망/승리 판정을 사용한다. 모드는 HP나 `battle.state`를 직접 쓰지 않는다. 새 지원 행동 때문에 요청하지 않은 바론 일반 패턴·피해를 변경하지 않는다.

## 5. 체크리스트 (끝나기 전에)
- [ ] `node --test tests/unit/*.test.mjs` 통과 (enemies·audio-assets·battle-modes)
- [ ] `tests/playtest/enemy.mjs <id>` 통과 + 스크린샷 4장 확인 (인트로/준비/탄막/승리)
- [ ] 필드 배치면 그 맵 플레이테스트에 조우 케이스 추가 (teal4.mjs 참고: 조우·승리·돈·영구 제거·브금 복귀)
- [ ] 대사는 사용자 브리핑 그대로, 의심 오타는 보고에 표시
- [ ] `docs/STATE.md` 갱신, `tools/dev/check.sh` 통과, 커밋
