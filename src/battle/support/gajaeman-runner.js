import { GJ_RUNNER as C } from '../../data/gajaeman-runner.js';

/** BUILD363 노을 땅 가재맨 달리기 결전: 필드의 SunsetRun 을 이어받아 전용 모드만 쓴다(쳐냄 외 피해 없음). */
export function createGajaemanRunnerSupport(battle) {
  if (!battle.enemies.some(enemy => enemy.def.support === 'gajaeman_runner')) return null;
  return {
    load() { return battle.game.sound.loadSfxFiles?.(Object.values(C.sfx)); },
    reset() { battle.game.sound.walk?.(null); },
    preemptiveMode() {
      const run = battle.game.castleDescent?.run;
      if (run && !battle.cfg.sunsetRun) battle.cfg.sunsetRun = run;
      return 'gajaeman_runner';
    },
    openingMode() { return 'gajaeman_runner'; },
    enemyModeFor() { return 'gajaeman_runner'; },
    blocksDamage(enemy, source) { return source !== 'gajaeman_counter'; },
    adjustDamage() { return 1; },
    afterEnemyPhase() { return null; },
  };
}
