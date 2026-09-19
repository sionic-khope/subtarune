import { DRUM_DEVIL as C } from '../../data/drum-devil.js';
import { createDrumDevilRescue, loadDrumDevilRescue, drawDrumDevilHero } from './drum-devil-rescue.js';
import { createDrumDevilLastStand } from './drum-devil-last-stand.js';

/** The first HP-one hit interrupts the barrage once and unlocks damage after rescue. */
export function createDrumDevilSupport(battle, { createRescue = createDrumDevilRescue } = {}) {
  if (!battle.enemies.some(e => e.def.support === 'drum_devil')) return null;
  let rescued = false, rescuePending = false, rescueStarted = false;
  let completedTurns = 0;
  let assets = null;
  return {
    get rescued() { return rescued; },
    get rescuePending() { return rescuePending; },
    get completedTurns() { return completedTurns; },
    async load(loadImage) { assets = await loadDrumDevilRescue(loadImage); },
    draw(ctx) { if (rescued && assets) drawDrumDevilHero(ctx, assets, battle.game.time); },
    reset() { rescued = false; rescuePending = false; rescueStarted = false; completedTurns = 0; },
    blocksDamage(enemy) { return enemy.id === 'drum_devil' && !rescued; },
    blockText() { return C.blockedText; },
    adjustPartyDamage(member, damage) { return Math.max(0, Math.min(damage, member.hp - C.playerHpFloor)); },
    onPartyDamage() {
      if (!rescueStarted && battle.members.some(member => !member.down && member.hp <= C.playerHpFloor)) rescuePending = true;
    },
    interruptEnemyPhase() { return rescuePending && !rescueStarted; },
    afterEnemyPhase() {
      if (rescueStarted) return null;
      if (!rescuePending) completedTurns++;
      if (!rescuePending && completedTurns < C.rescueTurn) return null;
      const forced = !rescuePending;
      rescueStarted = true; rescuePending = false;
      const options = { assets, onComplete() { rescued = true; } };
      return forced ? createDrumDevilLastStand(battle, { ...options, createRescue }) : createRescue(battle, options);
    },
    idleFor(enemy) { return rescued && enemy?.id === 'drum_devil' ? [C.rescueIdle] : null; },
  };
}
