// 변신 영클(TV 머리) 전투 지원 모듈(BUILD214/215 사용자 브리핑): 보통 [공격하기][아이템].
//   - 인트로: 전투 시작 대사 뒤 적 턴 모드 `tvform_intro`(편집노조 흡수·파워업).
//   - 적 턴: 코인 패턴 6종 순환(사방 레이저 → 미로 a → 뿌리기 → 회전 바퀴 → 미로 b → 유도 함선) — 탄막 후반에 코인 하나, 먹으면 서 있는 동료 모두 회복(“승부 지우고 공격만, 코인은 먹으면 회복”).
import { TVFORM_BATTLE as C } from '../../data/youngcle-tvform-battle.js';
import { YOUNGCLE_SPECIAL as SP } from '../../data/youngcle-special.js';

export function createYoungcleTvformSupport(battle) {
  if (!battle.enemies.some(e => e.def.support === 'youngcle_tvform')) return null;
  let coinIdx = 0, openingShown = false, pending = null, mazeCount = 0, turn = -1, healed = 0, specialIdx = 0;
  const MAZES = { coin_maze_a: 'a', coin_maze_b: 'b' };
  const self = {
    mazeVariant: 'a', specialKind: null,
    get turn() { return turn; }, get coinIdx() { return coinIdx; }, get healed() { return healed; }, get specialIdx() { return specialIdx; },
    get isSpecialTurn() { return turn % 2 === 1; },
    get current() { return C.coinOrder[(coinIdx - 1 + C.coinOrder.length) % C.coinOrder.length]; },
    get mazeCount() { return mazeCount; },
    get unlocked() { return false; },
    get hint() { return ''; },
    reset() { coinIdx = 0; openingShown = false; pending = null; mazeCount = 0; turn = -1; healed = 0; specialIdx = 0; this.specialKind = null; },
    async load() {},
    /** 인트로 대사가 끝나면 한 번: 편집노조 흡수·파워업 모드 */
    openingMode() { if (openingShown) return null; openingShown = true; return 'tvform_intro'; },
    idleFor() { if (pending) { const t = pending; pending = null; return [t]; } return null; },
    /** 적 턴: 일반(코인 6종 순환) → 특별(4종 순환, BUILD216) 번갈아. 일반은 미로면 모드, 나머지는 탄막 */
    enemyModeFor() {
      turn++;
      if (turn % 2 === 1) { this.specialKind = SP.order[specialIdx % SP.order.length]; specialIdx++; return 'tvform_special'; }
      const name = C.coinOrder[coinIdx % C.coinOrder.length]; coinIdx++;
      if (MAZES[name]) { this.mazeVariant = MAZES[name]; mazeCount++; return 'coin_maze'; }
      return null;
    },
    patternsFor() { if (turn % 2 === 1) return []; const name = this.current; return MAZES[name] ? [] : [{ type: name, coin: true }]; },
    /** 코인을 먹으면 서 있는 동료 모두 회복(+heal), 회복 소리·팝업 */
    onPickup() {
      const n = C.coin.heal; healed++;
      for (const m of battle.members) { if (m.down) continue; const before = m.hp; m.hp = Math.min(m.maxHp, m.hp + n); if (m.hp > before) m.popup = { t: 0, text: '+' + (m.hp - before), heal: true }; }
      battle.sfx('heal'); battle.sfx(C.coin.sfx, { volume: 0.8 }); pending = C.healed(n);
    },
    partyDamage(dmg) { return dmg; },
    onPartyHurt() {},
    afterEnemyPhase() { return null; },
  };
  return self;
}
