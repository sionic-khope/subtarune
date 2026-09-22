import { Battle } from '../battle/battle.js';
import { BATTLE_PREVIEW, BATTLE_SPRITES } from '../data/battle-sprites.js';
import { ENEMIES } from '../data/enemies.js';
import { clearChoimisFlowerEffects } from '../data/cutscenes/choimis_flower.js';
import { makeCanvas } from '../core/gfx.js';
import { makeTransparentFrame } from '../ui/battle-preview.js';
import { CHAR_SCALE } from '../world/world.js';
import { cancelChoimisSkyAnimations, getChoimisSkyState, waitForChoimisSkyAnimation } from './choimis-sky-timeline.js';

const RAISE_SRC = 'assets/enemies/choimis-flower-raise.png';
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const BATTLE_ACTOR_SCALE = 0.66;
const PINK_PETALS = Object.freeze(['#ff86b7', '#ffb1d0', '#ffd7e8']);
const BOSS_BATTLE_HEIGHT = 123 * ENEMIES.choimis_flower.scale;
export const CHOIMIS_SKY_SCALE = Object.freeze({
  battleReady: Object.freeze({ hyungsub: 101 / (2 * 349), gyeongsub: 98 / (2 * 359), ppaman: 99 / (2 * 305) }),
  raisedHand: 103 / (2 * 123),
  bossToHyungsub: BOSS_BATTLE_HEIGHT / (349 * BATTLE_SPRITES.hyungsub.scale * BATTLE_ACTOR_SCALE),
  raisedHandBattleHeight: BOSS_BATTLE_HEIGHT,
  raisedHandFrameHeight: 131,
});

const entity = (game, id) => id === 'player' ? game.player : game.entities.find(item => item.id === id && !item.dead);

function battleMotion(image, id) {
  const definition = BATTLE_SPRITES[id];
  const frame = makeTransparentFrame(image, definition.idle[0], BATTLE_PREVIEW.colorKey, makeCanvas);
  return { scale: CHOIMIS_SKY_SCALE.battleReady[id], faces: 'right', frames: [{ ...frame, duration: 1 }] };
}

function raiseMotion(image) {
  const durations = [0.30, 0.35, 0.35, 0.45];
  const frames = Array.from({ length: 4 }, (_, index) => makeTransparentFrame(image, {
    rect: [(index % 2) * 160, Math.floor(index / 2) * 160, 160, 160],
    pivot: [80, 152], duration: durations[index],
  }, { rMin: 256, gMax: -1, bMin: 256 }, makeCanvas));
  return {
    scale: CHOIMIS_SKY_SCALE.raisedHand,
    frames: [...frames, { ...frames[3], duration: 3600 }],
  };
}

function setLoop(actor, definition) {
  if (!actor || !definition) return;
  actor.motion = { ...definition, loop: true, elapsed: 0, index: 0 };
  actor.moving = false;
  actor.frame = 0;
}

export async function prepareChoimisSky(game) {
  const state = getChoimisSkyState(game);
  game.sound.preloadBgm('choimis_battle');
  const ids = ['hyungsub', 'gyeongsub', 'ppaman'];
  const [raise, ...images] = await Promise.all([
    game.mapAssets.image(RAISE_SRC),
    ...ids.map(id => game.mapAssets.image(BATTLE_SPRITES[id].src)),
    Battle.preload(game, ['choimis_flower']),
    game.sound.loadSfxFiles(['great_shine', 'choimis_flower_seup', 'weaponpull']),
  ]);
  if (state.cancelled || game.choimisSky !== state) return;
  state.motions = Object.fromEntries(ids.map((id, index) => [id, images[index] ? battleMotion(images[index], id) : null]));
  state.raise = raise ? raiseMotion(raise) : null;
}

export function riseChoimisFromBelow(game) {
  const boss = entity(game, 'choimis_sky_boss');
  if (!boss) throw new Error('choimis sky boss is missing from the night cliff');
  const state = getChoimisSkyState(game);
  boss.visible = true;
  boss.hopY = -230;
  boss.facing = 'down';
  const ghosts = game.choimisFlower || (game.choimisFlower = { ghosts: [], cancelled: false });
  ghosts.cancelled = false;
  let trail = 0;
  const view = { x: boss.x - 104, y: boss.y - 12, w: 0, h: 0 };
  game.camera.target = view;
  game.camera.locked = false;
  return waitForChoimisSkyAnimation(game, state, 2.8, (progress, dt) => {
    const settle = Math.sin(progress * Math.PI * 3) * 12 * (1 - progress);
    boss.hopY = -230 * (1 - progress) + settle;
    view.y = boss.y - 12 - Math.max(0, boss.hopY) * 0.12;
    trail += dt;
    for (const ghost of ghosts.ghosts) ghost.age += dt;
    ghosts.ghosts = ghosts.ghosts.filter(ghost => ghost.age < 0.42);
    if (trail < 0.07 || progress >= 0.98) return;
    trail = 0;
    const snapshot = Object.assign(Object.create(Object.getPrototypeOf(boss)), boss, {
      def: { ...boss.def }, motion: null, jitter: null, emote: null,
    });
    ghosts.ghosts.push({ actor: snapshot, age: 0 });
  }).then(completed => {
    if (!completed || game.choimisSky !== state) return;
    boss.hopY = 0; ghosts.ghosts = []; state.boss = boss;
  });
}

export function playChoimisSkyCue(game) {
  const boss = entity(game, 'choimis_sky_boss');
  const state = game.choimisSky;
  setLoop(boss, state?.raise);
  game.sound.sfx('great_shine', { volume: 0.8 });
  if (game.sound.muted) return Promise.resolve();
  const clip = game.sound.files.choimis_flower_seup?.cloneNode();
  if (!clip) return Promise.resolve();
  clip.volume = 0.9;
  state.clip = clip;
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clip.removeEventListener('ended', finish);
      clip.removeEventListener('error', finish);
      if (state.clip === clip) state.clip = null;
      state.finishClip = null;
      resolve();
    };
    state.finishClip = finish;
    clip.addEventListener('ended', finish, { once: true });
    clip.addEventListener('error', finish, { once: true });
    clip.play().catch(finish);
  });
}

export function gatherChoimisSkyPollen(game) {
  const state = getChoimisSkyState(game);
  const actors = [...PARTY.map(id => entity(game, id)), entity(game, 'choimis_sky_boss')].filter(Boolean);
  state.actors = actors;
  state.phase = 'gather';
  state.progress = 0;
  state.windTime = 0;
  state.pollen = actors.flatMap((actor, actorIndex) => Array.from({ length: 56 }, (_, index) => ({
    actor, actorIndex, angle: index * 2.399 + actorIndex * 0.7,
    radius: 42 + (index * 13 % 46), cloudX: (index * 17 % 74) - 37,
    cloudY: (index * 11 % 18) - 9, size: index % 5 === 0 ? 3 : 2,
    color: PINK_PETALS[(index + actorIndex) % PINK_PETALS.length],
  })));
  state.loosePetals = Array.from({ length: 36 }, (_, index) => ({
    x: (index * 67 % 520) - 20, y: (index * 43 % 250) - 10,
    speed: 18 + (index % 5) * 7, phase: index * 0.71,
    size: index % 6 === 0 ? 3 : 2, color: PINK_PETALS[index % PINK_PETALS.length],
  }));
  return waitForChoimisSkyAnimation(game, state, 2.4, progress => { state.progress = progress; }).then(completed => {
    if (completed && game.choimisSky === state) state.phase = 'cloud';
  });
}

export function ascendChoimisSky(game) {
  const state = getChoimisSkyState(game);
  const members = [game.player, entity(game, 'gyeongsub'), entity(game, 'ppaman')].filter(Boolean);
  const ids = [game.playerSprite || 'hyungsub', 'gyeongsub', 'ppaman'];
  members.forEach((actor, index) => setLoop(actor, state.motions?.[ids[index]]));
  game.sound.sfx('weaponpull', { volume: 0.75 });
  const actors = state.actors;
  const cameraY = game.camera.y;
  const targets = [[84, 104], [84, 164], [84, 224], [396, 176]];
  const starts = actors.map(actor => [actor.x + actor.w / 2 - game.camera.x, actor.y + actor.h - game.camera.y]);
  const motionScales = actors.map(actor => actor.motion?.scale || 0);
  game.camera.locked = true;
  state.phase = 'rise';
  return waitForChoimisSkyAnimation(game, state, 5.2, (progress, dt) => {
    const rise = 470 * progress;
    game.camera.y = cameraY - rise;
    state.progress = progress;
    state.windTime += dt;
    const zoom = 1 - 0.16 * progress;
    game.zoom.s = zoom;
    game.zoom.smax = 1;
    actors.forEach((actor, index) => {
      actor.hopY = rise;
      const [startX, startY] = starts[index];
      const [targetX, targetY] = targets[index];
      const intendedX = startX + (targetX - startX) * progress;
      const intendedY = startY + (targetY - startY) * progress;
      const baseX = actor.x + actor.w / 2 - game.camera.x;
      const baseY = actor.y + actor.h - actor.hopY - game.camera.y;
      const scaledX = 240 + (baseX - 240) * zoom;
      const scaledY = 180 + (baseY - 180) * zoom;
      actor.flyX = (intendedX - scaledX) / zoom;
      actor.flyY = (intendedY - scaledY) / zoom;
      if (!actor.motion) return;
      const initialScale = motionScales[index];
      const finalScale = actor === state.boss
        ? CHOIMIS_SKY_SCALE.raisedHandBattleHeight / (CHOIMIS_SKY_SCALE.raisedHandFrameHeight * CHAR_SCALE * zoom)
        : BATTLE_SPRITES[ids[index]].scale * BATTLE_ACTOR_SCALE / (CHAR_SCALE * zoom);
      actor.motion.scale = initialScale + (finalScale - initialScale) * progress;
    });
  });
}

export function drawChoimisSkyPollen(ctx, game, cam) {
  const state = game.choimisSky;
  if (!state?.pollen || !state.actors?.length) return;
  const progress = state.phase === 'gather' ? state.progress : 1;
  ctx.save();
  for (const particle of state.pollen) {
    const actor = particle.actor;
    const footX = actor.x + actor.w / 2 - cam.x + (actor.flyX || 0);
    const footY = actor.y + actor.h - (actor.hopY || 0) - cam.y + (actor.flyY || 0) + 8;
    const startX = footX + Math.cos(particle.angle) * particle.radius;
    const startY = footY - 52 + Math.sin(particle.angle) * particle.radius * 0.55;
    const x = startX + (footX + particle.cloudX - startX) * progress;
    const y = startY + (footY + particle.cloudY - startY) * progress;
    ctx.globalAlpha = 0.35 + progress * 0.55;
    ctx.fillStyle = particle.color;
    ctx.fillRect(Math.round(x), Math.round(y), particle.size, particle.size);
  }
  if (state.phase === 'rise') for (const petal of state.loosePetals) {
    const x = (petal.x + state.windTime * petal.speed + 520) % 520 - 20;
    const y = petal.y + Math.sin(state.windTime * 2.2 + petal.phase) * 7;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = petal.color;
    ctx.fillRect(Math.round(x), Math.round(y), petal.size + 1, petal.size);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function clearChoimisSky(game) {
  const state = game.choimisSky;
  if (!state) return;
  cancelChoimisSkyAnimations(game, state);
  state?.clip?.pause();
  state?.finishClip?.();
  if (state?.actors) for (const actor of state.actors) {
    actor.hopY = 0;
    actor.flyX = 0;
    actor.flyY = 0;
    actor.motion = null;
  }
  const boss = entity(game, 'choimis_sky_boss');
  if (boss) { boss.visible = false; boss.hopY = 0; boss.flyX = 0; boss.flyY = 0; boss.motion = null; }
  clearChoimisFlowerEffects(game);
  if (game.choimisSky === state) game.choimisSky = null;
  game.zoom = { s: 1, fx: 0, fy: 0, smax: 1, tween: null };
  if (game.player) { game.camera.target = game.player; game.camera.locked = false; }
}
