import { MALZAHAR_BACKGROUND as C } from '../../data/malzahar-background.js';
import { BATTLE_SPRITES, BATTLE_PREVIEW } from '../../data/battle-sprites.js';
import { CHARACTERS } from '../../data/characters.js';
import { loadActorFrames, playbackFrameAt } from '../../ui/battle-preview.js';
import { loadCharacterMotions } from '../../world/character-motion.js';
import { makeCanvas, loadImageOptional } from '../../core/gfx.js';

const cache = new WeakMap();
const clamp = value => Math.max(0, Math.min(1, value));

/** Prepare approved action frames once per game; no loading or image processing in draw. */
export function preloadMalzaharBackground(game) {
  if (cache.has(game)) return cache.get(game).promise;
  const assets = {}, load = src => game.mapAssets?.image(src) ?? loadImageOptional(src);
  cache.set(game, assets);
  assets.promise = Promise.all([
    ...['ppaman', 'gyeongsub'].map(async id => { assets[id] = await loadActorFrames(BATTLE_SPRITES[id], BATTLE_PREVIEW.colorKey, makeCanvas, load); }),
    (async () => { assets.warm_bidet = game.characterMotions?.warm_bidet?.axe_strike || (await loadCharacterMotions(load, makeCanvas, ['warm_bidet'])).warm_bidet.axe_strike; })(),
    (async () => { assets.mini_mario = await load(CHARACTERS.mini_mario.still); })(),
    ...C.scenes.map(async ({ enemy }) => {
      const image = await load(`assets/enemies/malzahar-background-${enemy}.png`);
      if (!image || image.width !== C.enemy.cell * C.enemy.cols || image.height !== C.enemy.cell * 2) throw new Error(`Invalid distant castle enemy sheet: ${enemy}`);
      assets[enemy] = image;
    }),
  ]).then(() => {
    if (['ppaman', 'gyeongsub', 'warm_bidet', 'mini_mario'].some(id => !assets[id])) throw new Error('Distant castle skirmish assets failed to load');
    assets.ready = true;
  }).catch(error => { cache.delete(game); throw error; });
  return assets.promise;
}

function drawFrame(ctx, frame, x, y, scale) {
  ctx.drawImage(frame.image, Math.round(x - frame.pivot[0] * scale), Math.round(y - frame.pivot[1] * scale), Math.round(frame.image.width * scale), Math.round(frame.image.height * scale));
}

/** Render small, sequential ally actions behind the fullscreen runner and boss. */
export function drawMalzaharBackground(ctx, elapsed, battle) {
  const assets = cache.get(battle.game);
  if (!assets?.ready || !Number.isFinite(elapsed)) return;
  for (const scene of C.scenes) {
    const time = (elapsed - scene.at) % C.period;
    if (time < 0 || time >= C.duration) continue;
    const alpha = C.alpha * Math.min(clamp(time / C.fade), clamp((C.duration - time) / C.fade));
    const active = time >= C.approach, beat = Math.max(0, time - C.approach) % C.strikePeriod;
    const afterHit = active ? beat - scene.hit : -1, dead = clamp(afterHit / C.dissolve);
    const approach = (1 - clamp(time / C.approach)) * C.approachDistance;
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha;
    ctx.fillStyle = C.colors.stone; ctx.fillRect(C.ledge.left, scene.y, C.ledge.width, C.ledge.depth);
    ctx.fillStyle = C.colors.edge; ctx.fillRect(C.ledge.left, scene.y, C.ledge.width, 2);
    ctx.fillStyle = C.colors.mortar;
    for (let x = C.ledge.left + C.ledge.brick; x < C.ledge.left + C.ledge.width; x += C.ledge.brick) ctx.fillRect(x, scene.y + 2, 1, C.ledge.depth - 2);
    const enemy = C.enemy, enemyBeat = active ? beat : time - C.approach;
    const attackAt = scene.hit - enemy.strike;
    const frame = afterHit >= 0 ? 3 : enemyBeat >= attackAt ? 2 : enemyBeat >= attackAt - enemy.windup ? 1 : 0;
    const lunge = frame === 2 ? Math.sin(clamp((enemyBeat - attackAt) / enemy.strike) * Math.PI / 2) * enemy.lunge : 0;
    ctx.globalAlpha = alpha * (1 - dead);
    const sx = scene.target + approach + dead * C.knockback - lunge, sy = scene.y - Math.sin(dead * Math.PI) * enemy.knockup;
    ctx.drawImage(assets[scene.enemy], frame % enemy.cols * enemy.cell, Math.floor(frame / enemy.cols) * enemy.cell, enemy.cell, enemy.cell, Math.round(sx - enemy.pivot[0] * enemy.scale), Math.round(sy - (enemy.pivot[1] + enemy.bodyHeight / 2) * enemy.scale), Math.round(enemy.cell * enemy.scale), Math.round(enemy.cell * enemy.scale));
    ctx.globalAlpha = alpha;
    if (scene.actor === 'mini_mario') {
      const jump = active ? clamp(beat / C.jumpSeconds) : 0;
      const bounce = afterHit >= 0 && afterHit < C.dissolve ? Math.sin(afterHit / C.dissolve * Math.PI) * C.jumpHeight / 2 : 0;
      const x = active ? scene.x + (scene.target - scene.x) * jump * (1 - dead) : scene.x - approach;
      const head = enemy.bodyHeight * enemy.scale * jump * (1 - dead);
      drawFrame(ctx, { image: assets.mini_mario, pivot: CHARACTERS.mini_mario.stillPivot }, x, scene.y - Math.sin(jump * Math.PI) * C.jumpHeight - head - bounce, scene.scale);
    } else {
      const actor = assets[scene.actor], frames = actor.frames || (active ? actor.attack : actor.run);
      const index = active ? playbackFrameAt(frames, beat, false).index : actor.frames ? 0 : playbackFrameAt(frames, time, true).index;
      drawFrame(ctx, frames[index], scene.x - approach, scene.y, scene.scale);
    }
    if (afterHit >= 0 && afterHit < C.dissolve) {
      ctx.globalAlpha = alpha * (1 - dead); ctx.fillStyle = C.colors.dust;
      for (let i = 0; i < 6; i++) ctx.fillRect(Math.round(scene.target + dead * (i - 1) * 8), Math.round(scene.y - 9 - Math.sin(dead * Math.PI) * (8 + i * 2)), 2, 2);
    }
    ctx.restore();
  }
}
