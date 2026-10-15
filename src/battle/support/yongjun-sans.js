// 박용준 히든 보스전 지원 모듈(BUILD462): 전투가 열리면 바로 샌즈식 오프닝(modes/yongjun-sans-intro.js), 재도전 때도 다시.
//   HP 100·피함 없음(사용자 “걍 체력 1에서 피한다도 없애고 체력 100으로 둬줘”) — 피해·승패·패턴 순서는 기본 전투 규칙 그대로(패턴 = 적 def.patterns 차례대로, 턴마다 말풍선은 패턴 설정 speak).
import { YONGJUN_SANS as C } from '../../data/yongjun-sans.js';

export function createYongjunSansSupport(battle) {
  if (!battle.enemies.some(enemy => enemy.def.support === 'yongjun_sans')) return null;
  let introPending = true;
  return {
    load() {
      battle.game.sound.preloadBgm?.(C.bgm);
      return battle.game.sound.loadSfxFiles?.([...C.sfx]);
    },
    reset() { introPending = true; },
    preemptiveMode() {
      if (!introPending) return null;
      introPending = false;
      return 'yongjun_sans_intro';
    },
    afterEnemyPhase() { return null; },
  };
}
