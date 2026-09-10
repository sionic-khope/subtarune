# 적(몹)·전투 추가 가이드 — `/enemy` 스킬의 본문

전투는 데이터 + 플러그인이다. 새 적은 **데이터 한 항목**, 새 공격 방식은 **패턴 함수 하나**, 전투 자체를 바꾸는 기믹(리듬·춤·FPS)은 **모드 파일 하나**로 들어간다. 엔진(`src/battle/battle.js`)은 손대지 않는다.

## 1. 적 한 마리 추가 (5분)
1. **스프라이트**: `assets/enemies/<id>-battle-left.png` — 왼쪽(우리 편)을 바라보는 64×64, 발 pivot [32,60]. 필드에 걸어다니게 하려면 `assets/enemies/<id>-front.png`(48×48 still) 도.
2. **데이터** `src/data/enemies.js` 에 한 항목:
   ```js
   goblin: {
     name: '고블린', hp: 6,                               // hp = 맞아야 하는 횟수(우리 공격은 1 데미지 고정)
     image: 'assets/enemies/goblin-battle-left.png', pivot: [32, 60], scale: 1.4, damage: 8, money: 30,
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
델타룬의 적은 **가진 것과 성격이 곧 탄**이다(랜서=창·자전거, 루딘=다이아, 헤더=하트). 우리도 같다: 레드 CS = 방패 벽·방패 조준탄, 블루 CS = 던지는 망치·내리찍는 망치.
- **한 패턴 = 한 가지 피하는 법**. 벽 사이로(shield_wall), 예고 자리 비키기(hammer_slam), 포물선 아래로 지나가기(hammer_arc). 섞지 않는다.
- **빠른 탄은 반드시 예고**(점선 `vline`·깜빡임 0.5s) — 언더테일식 "보고 피할 수 있는 공정함". 느린 탄(≤90px/s)은 예고 없이 양으로.
- **수치 범위**: 지속 4~5s, 탄 반지름 4~8, 속도 70~150(예고 있는 낙하는 250까지), 간격 0.5~1.3s, 상자 200×150 기준. 첫 전투 적은 한 턴에 맞아도 1~2번.
- **모양**: `shape: 'hammer'|'shield'|'circle'` + `kind`(색) + `spin`. 새 모양은 `Bullet.draw` 에 그림 한 블록(외곽선 1px + 2톤, 델타룬 밀도). 새 패턴은 `bullets.js PATTERNS` 에 함수 하나: `{ duration, update(t, dt, api) }`, `api = { emit, box, soul, rnd }`.
- **턴마다 돌아가며** 쓰이므로 2~3개면 충분. 첫 턴은 가장 읽기 쉬운 것.

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

## 5. 체크리스트 (끝나기 전에)
- [ ] `node --test tests/unit/*.test.mjs` 통과 (enemies·audio-assets·battle-modes)
- [ ] `tests/playtest/enemy.mjs <id>` 통과 + 스크린샷 4장 확인 (인트로/준비/탄막/승리)
- [ ] 필드 배치면 그 맵 플레이테스트에 조우 케이스 추가 (teal4.mjs 참고: 조우·승리·돈·영구 제거·브금 복귀)
- [ ] 대사는 사용자 브리핑 그대로, 의심 오타는 보고에 표시
- [ ] `docs/STATE.md` 갱신, `tools/dev/check.sh` 통과, 커밋
