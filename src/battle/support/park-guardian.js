import { PARK_GUARDIAN as C } from '../../data/park-guardian.js';
import L from '../../data/locale/ko.js';

export function drawParkCostume(ctx, image, enemy, progress) {
  if (!image) return;
  const scale = enemy.def.scale, startY = enemy.y - 42 * scale;
  const x = enemy.x + C.shell.landingDx * progress;
  const y = startY + (enemy.y + C.shell.landingDy - startY) * progress - 4 * C.shell.lift * progress * (1 - progress);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(C.shell.turn * progress);
  ctx.drawImage(image, -48 * scale, -48 * scale, 96 * scale, 96 * scale); ctx.restore();
}

/** Costume immunity, contact charge and phase boundaries belong to the support, not a mode. */
export function createParkGuardianSupport(battle) {
  const enemy = battle.enemies.find(e => e.def.support === 'park_strip');
  if (!enemy) return null;
  let unlocked = false, introduced = false, charge = 0, phase = 'costume', turns = 0, skipBoundary = false;
  let dogImage = null, emptyImage = null;
  const standing = () => battle.alive().find(m => m.id === 'ppaman' && m.hp > 0);
  const live = () => !enemy.dead && enemy.hp > 0 && !(enemy.dying > 0);
  return {
    get unlocked() { return unlocked; },
    get charge() { return charge; },
    get requiredHits() { return C.requiredHits; },
    get phase() { return phase; },
    get turns() { return turns; },
    get emptyImage() { return emptyImage; },
    get ready() { return unlocked && phase === 'costume' && charge === C.requiredHits && !!standing() && live(); },
    get hint() { return !standing() ? L.battle_strip_down : phase !== 'costume' ? L.battle_strip_exposed(turns) : L.battle_strip_wait(C.requiredHits - charge); },
    get button() { return { label: `${L.battle_strip} ${charge}/${C.requiredHits}`, icon: 'strip', enabled: this.ready }; },
    async load(loadImage) {
      [dogImage, emptyImage] = await Promise.all([loadImage(enemy.def.forms.dog.sheet.src), loadImage(C.emptyCostume)]);
    },
    reset() {
      unlocked = false; introduced = false; charge = 0; phase = 'costume'; turns = 0; skipBoundary = false;
      enemy.formDef = null; enemy.formImage = null; enemy.patternPose = null;
    },
    blocksDamage(target) { return target === enemy && phase !== 'dog'; },
    poseFor(target) { return target === enemy && phase === 'costume' ? { sheet: charge >= 9 ? 'adjust' : charge >= 6 ? 'slipping' : charge >= 3 ? 'loose' : 'dance' } : null; },
    onContact(target, damage, source) {
      if (target === enemy && live() && phase === 'costume' && damage > 0 && source === 'ordinary') charge = Math.min(C.requiredHits, charge + 1);
    },
    patternsFor(target) { return target === enemy && phase === 'dog' ? enemy.def.forms.dog.patterns : null; },
    speechFor(target) { return target === enemy && phase === 'dog' ? enemy.def.forms.dog.lines.speak : null; },
    idleFor(target) { return target === enemy && phase === 'dog' ? [L.battle_strip_exposed(turns)] : null; },
    draw(ctx) { if (phase === 'dog' && !battle.gimmick && live()) drawParkCostume(ctx, emptyImage, enemy, 1); },
    action() {
      if (!this.ready) return null;
      charge = 0; phase = 'stripping';
      return { type: 'support', mode: 'park_strip', member: standing(), target: enemy };
    },
    expose(target) {
      if (target !== enemy || phase !== 'stripping' || !live()) return false;
      phase = 'dog'; turns = C.exposedTurns; skipBoundary = true;
      enemy.formDef = enemy.def.forms.dog; enemy.formImage = dogImage; enemy.patternIdx = 0;
      enemy.patternPose = null; enemy.blink = 0;
      return true;
    },
    afterEnemyPhase() {
      if (!live()) return null;
      if (!introduced) {
        introduced = true;
        let index = 0, hold = 0;
        battle.showLine(C.introLines[index]);
        return {
          get snapshot() { return { phase: 'talk', line: index }; },
          update(dt, input) {
            hold += dt;
            if (!input.just('confirm') || hold < 0.15) return false;
            if (!battle.typed) { battle.shown = battle.text.length; return false; }
            if (++index === C.introLines.length) { unlocked = true; return true; }
            battle.showLine(C.introLines[index]); hold = 0;
            return false;
          },
          draw(ctx) { battle.drawTextBox(ctx); },
        };
      }
      if (phase !== 'dog') return null;
      // The support action consumed its own party round. Only later menus offer attacks.
      if (skipBoundary) { skipBoundary = false; return null; }
      if (--turns > 0) return null;
      phase = 'rewearing';
      let elapsed = 0;
      battle.setText(L.battle_strip_rewear);
      return {
        get snapshot() { return { phase: 'rewearing', elapsed }; },
        update(dt) {
          elapsed += dt;
          const k = Math.min(1, elapsed / C.rewearSeconds);
          if (k >= 0.55) {
            enemy.formDef = null; enemy.formImage = null;
            enemy.patternPose = { sheet: 'adjust', frame: Math.min(3, Math.floor((k - 0.55) / 0.45 * 4)) };
          }
          if (k < 1) return false;
          phase = 'costume'; charge = 0; enemy.patternPose = null; enemy.patternIdx = 0;
          return true;
        },
        draw(ctx) {
          const k = Math.min(1, elapsed / C.rewearSeconds);
          if (k < 0.55) drawParkCostume(ctx, emptyImage, enemy, 1 - k / 0.55);
          battle.drawTextBox(ctx);
        },
      };
    },
  };
}
