// 박용준 히든 보스전 지원 모듈(BUILD462): 전투가 열리면 바로 샌즈식 오프닝(modes/yongjun-sans-intro.js), 재도전 때도 다시.
//   HP 100·피함 없음(사용자 “걍 체력 1에서 피한다도 없애고 체력 100으로 둬줘”) — 피해·승패·패턴 순서는 기본 전투 규칙 그대로(패턴 = 적 def.patterns 차례대로, 턴마다 말풍선은 패턴 설정 speak).
import { YONGJUN_SANS as C } from '../../data/yongjun-sans.js';

export function createYongjunSansSupport(battle) {
  if (!battle.enemies.some(enemy => enemy.def.support === 'yongjun_sans')) return null;
  // opening: intro(오프닝 모드) → attack(메뉴 대신 바로 강공격 턴) → line(“왜 다들 …” 막간) → done
  let introPending = true, opening = 'intro';
  const boss = () => battle.enemies.find(enemy => enemy.def.support === 'yongjun_sans');
  return {
    /** 첫 강공격 턴에만 패턴을 정한다. 평소엔 없음(undefined) → 적 def.patterns 차례·패턴 speak 말풍선 그대로 */
    get patternsFor() { return opening === 'attack' ? (() => [C.openingPattern]) : undefined; },
    silentTurn() { return opening === 'attack'; },
    enemyTurnNext() { if (opening !== 'intro' || introPending) return false; opening = 'attack'; return true; },
    load() {
      battle.game.sound.preloadBgm?.(C.bgm);
      return battle.game.sound.loadSfxFiles?.([...C.sfx, 'sans_blaster_charge', 'sans_blaster_fire', 'sans_blaster_gigatalk', 'sans_bone', 'sans_eye']);
    },
    reset() { introPending = true; opening = 'intro'; },
    preemptiveMode() {
      if (!introPending) return null;
      introPending = false;
      return 'yongjun_sans_intro';
    },
    /** 첫 강공격이 끝나면 말풍선 한 줄(목소리, C) → 메갈로바니아 → 행동 선택. 패턴 차례는 처음부터 */
    afterEnemyPhase() {
      if (opening !== 'attack') return null;
      opening = 'done';
      const enemy = boss(); if (enemy) enemy.patternIdx = 0;
      battle.bubble = { enemy, text: C.afterOpening, shown: 0, t: 0, voice: C.voice };
      let typed = 0;
      return {
        update(dt, input) {
          const b = battle.bubble; if (!b) return true;
          b.t += dt; const n = Math.min(b.text.length, Math.floor(b.t / C.charSeconds));
          for (let i = b.shown; i < n; i++) if (b.text[i] !== ' ') battle.game.sound.blip(C.voice);
          b.shown = n; if (n >= b.text.length) typed += dt;
          if (!input.just('confirm')) return false;
          if (n < b.text.length) { b.shown = b.text.length; b.t = b.text.length * C.charSeconds; return false; }
          if (typed < C.advanceHold) return false;
          battle.bubble = null;
          battle.game.sound.playBgm(C.bgm, { volume: 0.5, fadeIn: 0 });
          return true;
        },
        draw(ctx) { battle.drawTextBox(ctx); },
        dispose() { if (battle.bubble?.text === C.afterOpening) battle.bubble = null; },
      };
    },
  };
}
