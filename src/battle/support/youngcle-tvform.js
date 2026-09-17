// 변신 영클(TV 머리) 전투 지원 모듈(BUILD214 사용자 브리핑): 공격 버튼 없음 — [승부하기(VS)][코인벌기][아이템].
//   - 인트로: 전투 시작 대사 뒤 적 턴 모드 `tvform_intro`(편집노조 흡수·파워업) → 첫 행동 창 막간(땅 내리치기 → [공격하기] 사라짐 → VS 버튼 던지기 → 나레이션).
//   - 코인벌기: 그 턴을 넘기고 적 턴에 코인 패턴(6종 순환: 사방 레이저 → 미로 a → 뿌리기 → 회전 바퀴 → 미로 b → 유도 함선)이 코인 하나를 낸다. 먹으면 +1. 코인벌기를 안 고른 턴은 같은 탄막이 코인 없이(미로는 건너뜀).
//   - 승부하기: 규칙은 다음 브리핑 — 지금은 “승부를 하려면 코인이 필요하다. N코인 남았다.” 만 보여 준다.
import { TVFORM_BATTLE as C } from '../../data/youngcle-tvform-battle.js';
import L from '../../data/locale/ko.js';
import { createMenuIntro } from '../modes/youngcle-tvform-intro.js';

export function createYoungcleTvformSupport(battle) {
  if (!battle.enemies.some(e => e.def.support === 'youngcle_tvform')) return null;
  let coins = C.coinsStart, coinTurn = false, coinIdx = 0, patIdx = 0, openingShown = false, menuIntroShown = false, got = false, pending = null, mazeCount = 0, turn = -1;
  const MAZES = { coin_maze_a: 'a', coin_maze_b: 'b' };
  const self = {
    menuReady: false, mazeVariant: 'a',
    get coins() { return coins; }, get coinTurn() { return coinTurn; }, get turn() { return turn; }, get coinIdx() { return coinIdx; }, get got() { return got; },
    get current() { return coinTurn ? C.coinOrder[(coinIdx - 1 + C.coinOrder.length) % C.coinOrder.length] : null; },
    get mazeCount() { return mazeCount; },
    get hud() { return this.menuReady ? L.battle_coins_hud(coins) : null; },
    get unlocked() { return false; },
    get hint() { return ''; },
    reset() { coins = C.coinsStart; coinTurn = false; coinIdx = 0; patIdx = 0; openingShown = false; menuIntroShown = false; got = false; pending = null; mazeCount = 0; turn = -1; this.menuReady = false; },
    async load() {},
    /** 인트로 대사가 끝나면 한 번: 편집노조 흡수·파워업 모드 */
    openingMode() { if (openingShown) return null; openingShown = true; return 'tvform_intro'; },
    /** 행동 창 버튼: 막간이 끝나기 전엔 기본([공격하기][아이템]), 뒤엔 [승부하기][코인벌기][아이템] */
    buttons() { return this.menuReady ? [{ label: L.battle_duel, kind: 'support', id: 'duel', vs: true, enabled: true }, { label: L.battle_coins, kind: 'support', id: 'coins', enabled: true }, { label: L.battle_item, kind: 'item', enabled: true }] : null; },
    action(id) {
      if (id === 'coins') { coinTurn = true; got = false; return { type: 'skip', member: battle.alive()[0] }; }
      if (id === 'duel') return { type: 'text', text: C.duelNeed(coins) };
      return null;
    },
    idleFor() { if (pending) { const t = pending; pending = null; return [t]; } return this.menuReady ? [`* ${coins}코인 남았다.`] : null; },   // 잡담 자리: 코인 결과 → 그 뒤엔 남은 코인
    /** 적 턴: 코인벌기 턴이면 6종 순환(미로는 모드), 아니면 코인 없는 탄막 4종 순환 */
    enemyModeFor() {
      turn++;
      if (!coinTurn) return null;
      const name = C.coinOrder[coinIdx % C.coinOrder.length]; coinIdx++;
      if (MAZES[name]) { this.mazeVariant = MAZES[name]; mazeCount++; return 'coin_maze'; }
      return null;
    },
    patternsFor() {
      if (coinTurn) { const name = C.coinOrder[(coinIdx - 1 + C.coinOrder.length) % C.coinOrder.length]; if (MAZES[name]) return []; return [{ type: name, coin: true }]; }
      const plain = C.coinOrder.filter(n => !MAZES[n]); const name = plain[patIdx % plain.length]; patIdx++; return [{ type: name, coin: false }];
    },
    onPickup() { coins++; got = true; battle.sfx(C.coin.sfx, { volume: 0.9 }); },
    partyDamage(dmg) { return dmg; },
    onPartyHurt() {},
    /** 적 턴 끝: 첫 번째는 행동 창 막간(공격 버튼 제거·VS 던지기), 코인 턴이면 결과 문구 */
    afterEnemyPhase() {
      if (openingShown && !menuIntroShown) { menuIntroShown = true; return createMenuIntro(battle, this); }
      if (coinTurn) { pending = got ? C.coinGot(coins) : C.coinMiss; coinTurn = false; }
      return null;
    },
  };
  return self;
}
