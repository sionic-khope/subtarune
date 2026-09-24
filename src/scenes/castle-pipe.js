import { Prop, SCREEN_W, SCREEN_H } from '../world/world.js';
import { makeWaiter } from '../ui/cutscene.js';

export const CASTLE_PIPE = 'castle_return_pipe';
export const CASTLE_MARIO = 'castle_return_mario';

export function cancelCastlePipe(game) {
  game.castlePipe?.dispose();
}

export function jumpIntoCastlePipe(game) {
  const pipe = game.entities.find(entity => entity.id === CASTLE_PIPE);
  const actors = [game.player, game.entities.find(entity => entity.id === CASTLE_MARIO)];
  const map = game.map, script = game.dialogue.script;
  pipe.solid = false;
  const waiter = makeWaiter(game, { parallel: actors.map((actor, index) => ({
    hop: index ? CASTLE_MARIO : 'player',
    by: [pipe.drawX + pipe.iw / 2 + (index ? 12 : -12) - actor.w / 2 - actor.x,
      pipe.drawY + 4 - actor.h - actor.y],
    height: index ? 44 : 50, duration: 0.7, keep: true, sfx: index ? 'mario_jump' : 'jump',
  })) });
  let done = false;
  return new Promise(resolve => {
    const finish = () => {
      done = true;
      for (const actor of actors) actor.hopY = 0;
      if (game.castlePipe === owner) game.castlePipe = null;
      resolve();
    };
    const owner = { dispose: finish };
    game.castlePipe = owner;
    game.background.push({ update(dt) {
      if (done) return true;
      if (game.map === map && game.dialogue.script === script && !waiter.update(dt)) return false;
      finish(); return true;
    } });
  });
}

/** The upright pipe uses its ground line, not opacity, to emerge and retract. */
export function animateCastlePipe(game, retract = false) {
  const pipe = game.entities.find(entity => entity.id === CASTLE_PIPE);
  const map = game.map, script = game.dialogue.script;
  const floor = pipe.drawY + pipe.ih;
  let elapsed = 0, done = false;
  pipe.visible = true; pipe.solid = false;
  pipe.draw = function(ctx, cam) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-SCREEN_W * 2, -SCREEN_H * 4, SCREEN_W * 5, floor - cam.y + SCREEN_H * 4); ctx.clip();
    const progress = Math.min(1, elapsed / 0.9);
    const ease = progress * progress * (3 - 2 * progress);
    ctx.translate(0, Math.round(pipe.ih * (retract ? ease : 1 - ease)));
    Prop.prototype.draw.call(pipe, ctx, cam); ctx.restore();
  };
  game.sound.sfx('mario_pipe');
  return new Promise(resolve => {
    const finish = cancelled => {
      done = true;
      delete pipe.draw;
      pipe.visible = !retract && !cancelled;
      pipe.solid = !retract && !cancelled;
      if (game.castlePipe === owner) game.castlePipe = null;
      resolve();
    };
    const owner = { dispose: () => finish(true) };
    game.castlePipe = owner;
    game.background.push({ update(dt) {
      if (done) return true;
      elapsed += dt;
      const cancelled = game.map !== map || game.dialogue.script !== script;
      if (!cancelled && elapsed < 0.9) return false;
      finish(cancelled); return true;
    } });
  });
}

/** Both passengers descend beneath the pipe lip, preserving their original sheets. */
export function submergeCastlePassengers(game) {
  const actors = [game.player, game.entities.find(entity => entity.id === CASTLE_MARIO)];
  const map = game.map, script = game.dialogue.script;
  let elapsed = 0, done = false;
  for (const actor of actors) actor.emerge = { depth: 80, progress: 1 };
  game.sound.sfx('mario_pipe');
  return new Promise(resolve => {
    const finish = () => {
      done = true;
      for (const actor of actors) {
        actor.visible = false; actor.emerge = null; actor.def.visualScale = 1;
      }
      if (game.castlePipe === owner) game.castlePipe = null;
      resolve();
    };
    const owner = { dispose: finish };
    game.castlePipe = owner;
    game.background.push({ update(dt) {
      if (done) return true;
      elapsed += dt;
      const progress = Math.min(1, elapsed / 0.65);
      for (const actor of actors) {
        actor.emerge.progress = 1 - progress;
        actor.def.visualScale = 1 - progress * 0.65;
      }
      if (game.map === map && game.dialogue.script === script && progress < 1) return false;
      finish(); return true;
    } });
  });
}
