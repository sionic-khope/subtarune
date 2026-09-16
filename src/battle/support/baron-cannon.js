import { BARON_CANNON as C } from '../../data/baron-cannon.js';
import L from '../../data/locale/ko.js';
import { createParkGuardianSupport } from './park-guardian.js';
import { createYoungcleShipSupport } from './youngcle-ship.js';

/** Battle-local support controller; no story flag survives victory or retry. */
export function createBattleSupport(battle) {
  const park = createParkGuardianSupport(battle);
  if (park) return park;
  const ship = createYoungcleShipSupport(battle);
  if (ship) return ship;
  if (!battle.enemies.some((e) => e.def.support === 'baron_cannon')) return null;
  let unlocked = false, introduced = false, charge = 0, sprite = null;
  return {
    get unlocked() { return unlocked; },
    get charge() { return charge; },
    get requiredHits() { return C.requiredHits; },
    get hint() { return L.battle_cannon_wait(Math.max(0, C.requiredHits - charge)); },
    get ready() { return unlocked && charge === C.requiredHits; },
    async load(loadImage) { sprite = await loadImage('assets/sprites/yongjun.png'); },
    reset() { unlocked = false; introduced = false; charge = 0; },
    onHit(enemy, damage, source) {
      if (unlocked && enemy.id === 'baron' && damage > 0 && source === 'ordinary') charge = Math.min(C.requiredHits, charge + 1);
    },
    action() {
      if (!this.ready) return null;
      const target = battle.living().find((e) => e.id === 'baron' && e.hp > 0);
      if (!target) return null;
      charge = 0;
      return { type: 'support', mode: 'cannon_guard', member: battle.alive()[0], target };
    },
    get button() { return { label: `${L.battle_cannon} ${charge}/${C.requiredHits}`, icon: 'cannon', enabled: this.ready }; },
    afterEnemyPhase() {
      if (introduced || !battle.living().some((e) => e.id === 'baron' && e.hp > 0)) return null;
      introduced = true;
      let phase = 'enter', y = C.intro.fromY, elapsed = 0, line = 0, hold = 0;
      battle.setText('');
      return {
        get snapshot() { return { phase, y, line, frame: phase === 'talk' ? 0 : Math.floor(elapsed / C.intro.frameSeconds) % 4 }; },
        update(dt, input) {
          elapsed += dt; hold += dt;
          if (phase === 'enter') {
            y = Math.min(C.intro.toY, y + C.intro.enterSpeed * dt);
            if (y === C.intro.toY) { phase = 'talk'; hold = 0; battle.showLine(C.introLines[line]); }
          } else if (phase === 'talk' && input.just('confirm') && hold >= 0.15) {
            if (!battle.typed) battle.shown = battle.text.length;
            else if (++line < C.introLines.length) { battle.showLine(C.introLines[line]); hold = 0; }
            else { unlocked = true; phase = 'exit'; battle.setText(''); }
          } else if (phase === 'exit') {
            y -= C.intro.speed * dt;
            if (y <= C.intro.fromY) return true;
          }
          return false;
        },
        draw(ctx) {
          if (sprite) {
            const fw = sprite.width / 4, fh = sprite.height / 4, frame = phase === 'talk' ? 0 : Math.floor(elapsed / C.intro.frameSeconds) % 4;
            const w = Math.round(fw * C.intro.scale), h = Math.round(fh * C.intro.scale);
            ctx.drawImage(sprite, frame * fw, phase === 'exit' ? fh : 0, fw, fh, Math.round(C.intro.x - w / 2), Math.round(y - h), w, h);
          }
          if (phase === 'talk') battle.drawTextBox(ctx);
        },
      };
    },
  };
}
