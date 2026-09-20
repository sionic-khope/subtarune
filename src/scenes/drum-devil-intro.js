import { DRUM_DEVIL } from '../data/drum-devil.js';
import { CHAR_SCALE } from '../world/world.js';
import { loopCharacterMotion } from '../world/character-motion.js';

export const INTRO_THROW = Object.freeze({ windup: 0.6, flight: 1.2, impactHold: 0.8, arc: 32, size: 28, landingGap: 36 });

/** Launch one field barrel from the current raised-hand pose and finish only after impact. */
export function drumDevilThrowWaiter(game) {
  const boss = game.entities.find(entity => entity.id === 'drum_devil');
  const motion = game.characterMotions.drum_devil.throw;
  loopCharacterMotion(boss, { ...motion, frames: [motion.frames[0]] });
  const scale = motion.scale * CHAR_SCALE * (boss.def.visualScale || 1);
  const start = [boss.x + boss.w / 2 + DRUM_DEVIL.hand[0] * scale, boss.y + boss.h + DRUM_DEVIL.hand[1] * scale];
  const target = [game.player.x + game.player.w + INTRO_THROW.landingGap, game.player.y + game.player.h];
  let elapsed = 0, barrel = null, impacted = false;
  return { update(dt) {
    elapsed += dt;
    if (elapsed < INTRO_THROW.windup) return false;
    if (!barrel) {
      const image = game.propImages['assets/props/jjajang_drum.png'];
      const height = INTRO_THROW.size, width = Math.round(image.width / image.height * height);
      barrel = game.spawn({ type: 'prop', id: 'drum_devil_intro_barrel', image: 'assets/props/jjajang_drum.png',
        x: start[0] - width / 2, y: start[1] - height / 2, ix: start[0] - width / 2, iy: start[1] - height / 2,
        w: width, h: height, scale: height / image.height, solid: false, sortY: 10000 });
      loopCharacterMotion(boss, { ...motion, frames: [motion.frames[1]] });
      game.sound.sfx('drum_throw');
    }
    const arrived = elapsed >= INTRO_THROW.windup + INTRO_THROW.flight;
    const progress = arrived ? 1 : (elapsed - INTRO_THROW.windup) / INTRO_THROW.flight;
    const x = start[0] + (target[0] - start[0]) * progress;
    const y = start[1] + (target[1] - start[1]) * progress - INTRO_THROW.arc * 4 * progress * (1 - progress);
    barrel.x = barrel.def.ix = Math.round(x - barrel.w / 2);
    barrel.y = barrel.def.iy = Math.round(y - barrel.h / 2);
    barrel.spin = progress * Math.PI * 2;
    if (progress < 1) return false;
    if (!impacted) {
      impacted = true;
      boss.motion = null;
      game.sound.sfx('impact', { volume: 0.6 });   // 델타룬 snd_impact(사용자 2026-09-20: 착지 ‘띠링’ 이 별로 → 델타룬 공격음)
      game.shake = { time: 0.35, amp: 4 };
    }
    if (elapsed < INTRO_THROW.windup + INTRO_THROW.flight + INTRO_THROW.impactHold) return false;
    barrel.dead = true;
    game.player.motion = null;
    return true;
  } };
}
