import { MALZAHAR_RUNNER as C } from '../../data/malzahar-runner.js';
import { preloadMalzaharBackground } from '../modes/malzahar-background.js';

/** Select a continuous encounter through the ordinary Battle lifecycle. */
export function createMalzaharRunnerSupport(battle) {
  if (!battle.enemies.some(enemy => enemy.def.support === 'malzahar_runner')) return null;
  return {
    load() { return Promise.all([battle.game.sound.loadSfxFiles?.(Object.values(C.sfx)), preloadMalzaharBackground(battle.game)]); },
    reset() { battle.game.sound.walk?.(null); },
    preemptiveMode() {
      if (battle.cfg.runnerState && battle.game.runner) {
        const { runner, player, camera } = battle.game;
        battle.cfg.runnerState = structuredClone(runner.core);
        battle.cfg.runnerView = { x: player.x + player.w / 2 - camera.x,
          groundY: player.y + player.h - camera.y, cameraX: camera.x, cameraY: camera.y };
        runner.finish();
      }
      return 'malzahar_runner';
    },
    openingMode() { return 'malzahar_runner'; },
    enemyModeFor() { return 'malzahar_runner'; },
    blocksDamage(enemy, source) { return source !== 'malzahar_counter'; },
    adjustDamage() { return C.counterDamage; },
  };
}
