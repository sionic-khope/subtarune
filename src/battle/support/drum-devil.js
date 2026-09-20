import { DRUM_DEVIL as C } from '../../data/drum-devil.js';
import { DRUM_DEVIL_RESCUE as R } from '../../data/drum-devil-rescue.js';
import { createDrumDevilRescue, loadDrumDevilRescue, drawDrumDevilHero } from './drum-devil-rescue.js';
import { createDrumDevilLastStand } from './drum-devil-last-stand.js';
import { loadJanitorHeroActions, createJanitorHeroAttack, createJanitorHeroIntercept } from './janitor-hero-actions.js';

/** The first HP-one hit interrupts the barrage once and unlocks damage after rescue. */
export function createDrumDevilSupport(battle, { createRescue = createDrumDevilRescue,
  createAttack = createJanitorHeroAttack, createIntercept = createJanitorHeroIntercept } = {}) {
  if (!battle.enemies.some(e => e.def.support === 'drum_devil')) return null;
  let rescued = false, rescuePending = false, rescueStarted = false;
  let completedTurns = 0;
  let assets = null;
  let action = null, actionKind = null, barrel = null;
  let actionEpoch = 0;
  const player = battle.members.find(member => member.id === 'hyungsub');
  const previousPartyHome = player && [...player.home];
  if (player) player.home = [...C.heroPartyHome];
  const clearAction = () => { actionEpoch++; action?.dispose?.(); action = null; actionKind = null; barrel = null; };
  return {
    get rescued() { return rescued; },
    get boardCenter() { return rescued ? C.heroBoardCenter : undefined; },
    get rescuePending() { return rescuePending; },
    get completedTurns() { return completedTurns; },
    get interceptionActive() { return actionKind === 'intercept'; },
    get actionSnapshot() { return action?.snapshot ?? null; },
    playHeroCue() {
      battle.game.sound.playBgm(R.bgm, { loop: true, fadeIn: R.fade });
    },
    async load(loadImage) { assets = { ...await loadDrumDevilRescue(loadImage), ...await loadJanitorHeroActions(loadImage) }; },
    draw(ctx) { if (actionKind === 'attack' || action?.backgroundBody) action.drawBody(ctx); else if (rescued && assets && !action) drawDrumDevilHero(ctx, assets, battle.game.time); },
    drawOverlay(ctx) { if (actionKind === 'intercept') { if (action.backgroundBody) action.drawEffects(ctx); else action.draw(ctx); } },
    reset() {
      clearAction();
      if (player && previousPartyHome) player.home = [...C.heroPartyHome];
      rescued = false; rescuePending = false; rescueStarted = false; completedTurns = 0;
    },
    dispose() { clearAction(); if (player && previousPartyHome) player.home = previousPartyHome; },
    onProjectile(projectile) { if (rescued && projectile?.purple) barrel = projectile; },
    afterAction(plan) {
      if (!rescued || action || plan?.type !== 'fight' || plan.member?.id !== 'hyungsub'
        || !plan.target || plan.target.dead || plan.target.dying > 0 || plan.target.hp <= 0) return null;
      const target = plan.target, epoch = actionEpoch; let hit = false;
      actionKind = 'attack';
      action = createAttack(battle, { assets, target, onHit() {
        if (hit || epoch !== actionEpoch || !rescued) return; hit = true;
        if (!target.dead && target.dying <= 0 && target.hp > 0) battle.hitEnemy(target, null, C.heroDamage, { source: 'janitor', sound: false });
      } });
      const current = action;
      return { get snapshot() { return current.snapshot; }, draw(ctx) { current.drawEffects(ctx); },
        update(dt, input) { const done = current.update(dt, input); if (done) clearAction(); return done; },
        dispose() { if (action === current) clearAction(); },
      };
    },
    update(dt) {
      if (['win', 'lose', 'ending', 'retry'].includes(battle.state)) { clearAction(); return; }
      if (rescued && !action && barrel && !barrel.intercepted && barrel.age >= C.interceptAfter) {
        const flying = barrel, epoch = actionEpoch; flying.intercepted = true; actionKind = 'intercept';
        let deflected = false;
        action = createIntercept(battle, { assets, barrel: flying, onDeflect() {
          if (deflected || epoch !== actionEpoch || !rescued) return; deflected = true;
          flying.steer = null; flying.vx = C.deflectVelocity[0]; flying.vy = C.deflectVelocity[1];
          [flying.ax, flying.ay] = C.deflectAcceleration;
          flying.spin = C.deflectSpin; flying.life = flying.age + C.deflectLife;
        } });
      }
      if (actionKind === 'intercept' && action.update(dt)) clearAction();
    },
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
