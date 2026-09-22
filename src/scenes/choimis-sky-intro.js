import { Battle } from '../battle/battle.js';
import { BATTLE_PREVIEW, BATTLE_SPRITES } from '../data/battle-sprites.js';
import { ENEMIES } from '../data/enemies.js';
import { clearChoimisFlowerEffects } from '../data/cutscenes/choimis_flower.js';
import { makeCanvas } from '../core/gfx.js';
import { makeTransparentFrame } from '../ui/battle-preview.js';
import { CHAR_SCALE } from '../world/world.js';
import { addChoimisSkyLoop, cancelChoimisSkyAnimations, getChoimisSkyState, waitForChoimisSkyAnimation } from './choimis-sky-timeline.js';

const RAISE_SRC = 'assets/enemies/choimis-flower-raise.png';
const CAPE_SRC = ENEMIES.choimis_flower.sheet.src;
const PARTY = ['player', 'gyeongsub', 'ppaman'];
const BATTLE_ACTOR_SCALE = 0.66;
const PINK_PETALS = Object.freeze(['#ff86b7', '#ffb1d0', '#ffd7e8']);
const BOSS_BATTLE_HEIGHT = 117.5 * ENEMIES.choimis_flower.scale;
const BOSS_HOVER = Object.freeze({ height: 48, amplitude: 0, period: 2.4 });
const REVEAL_PAN = Object.freeze({ dx: 64, duration: 2, bossX: 722 });
export const CHOIMIS_SKY_ASCENT = Object.freeze({ distance: 720, duration: 5.2, petalFall: 0.55 });
export const CHOIMIS_CAPE_REVEAL = Object.freeze({ durations: [0.22, 0.16, 0.16, 0.18, 0.18], cueAt: 0.22 });
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

function capeMotion(image) {
  const frames = Array.from({ length: 4 }, (_, index) => makeTransparentFrame(image, {
    rect: [(index % 2) * 160, Math.floor(index / 2) * 160, 160, 160],
    pivot: ENEMIES.choimis_flower.pivot,
    duration: 1 / ENEMIES.choimis_flower.sheet.fps,
  }, { rMin: 256, gMax: -1, bMin: 256 }, makeCanvas));
  const clipped = (capeFrame, right) => {
    const canvas = makeCanvas(160, 160);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, right, 160);
    ctx.clip();
    ctx.drawImage(capeFrame.image, 0, 0);
    ctx.restore();
    return { image: canvas, pivot: ENEMIES.choimis_flower.pivot };
  };
  return {
    frames,
    revealFrames: [
      { ...clipped(frames[0], 104), duration: CHOIMIS_CAPE_REVEAL.durations[0] },
      { ...clipped(frames[0], 118), duration: CHOIMIS_CAPE_REVEAL.durations[1] },
      { ...clipped(frames[1], 140), duration: CHOIMIS_CAPE_REVEAL.durations[2] },
      { ...clipped(frames[2], 160), duration: CHOIMIS_CAPE_REVEAL.durations[3] },
      { ...frames[0], duration: CHOIMIS_CAPE_REVEAL.durations[4] },
    ],
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
  const [raise, cape, ...images] = await Promise.all([
    game.mapAssets.image(RAISE_SRC),
    game.mapAssets.image(CAPE_SRC),
    ...ids.map(id => game.mapAssets.image(BATTLE_SPRITES[id].src)),
    Battle.preload(game, ['choimis_flower']),
    game.sound.loadSfxFiles(['great_shine', 'choimis_flower_seup', 'choimis_flower_sexy', 'wing', 'weaponpull']),
  ]);
  if (state.cancelled || game.choimisSky !== state) return;
  state.motions = Object.fromEntries(ids.map((id, index) => [id, images[index] ? battleMotion(images[index], id) : null]));
  state.raise = raise ? raiseMotion(raise) : null;
  state.cape = cape ? capeMotion(cape) : null;
}

/** Pan beyond the normal right map clamp while Choimis remains hidden below the cliff. */
export function panChoimisSkyReveal(game) {
  const boss = entity(game, 'choimis_sky_boss');
  if (!boss) throw new Error('choimis sky boss is missing from the night cliff');
  const state = getChoimisSkyState(game);
  const startX = game.camera.x;
  const startY = game.camera.y;
  boss.x = REVEAL_PAN.bossX;
  boss.visible = false;
  boss.hopY = -230;
  game.camera.locked = true;
  return waitForChoimisSkyAnimation(game, state, REVEAL_PAN.duration, progress => {
    game.camera.x = startX + REVEAL_PAN.dx * progress;
    game.camera.y = startY;
  }).then(completed => {
    if (completed && game.choimisSky === state) state.revealComplete = true;
  });
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
  game.camera.locked = true;
  return waitForChoimisSkyAnimation(game, state, 2.8, (progress, dt) => {
    const settle = Math.sin(progress * Math.PI * 3) * 12 * (1 - progress);
    boss.hopY = -230 * (1 - progress) + BOSS_HOVER.height * progress + settle;
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
    boss.hopY = BOSS_HOVER.height; ghosts.ghosts = []; state.boss = boss;
    state.hoverTime = 0;
    state.hoverWaiter = addChoimisSkyLoop(game, state, dt => {
      state.hoverTime += dt;
      boss.hopY = BOSS_HOVER.height + Math.sin(state.hoverTime * Math.PI * 2 / BOSS_HOVER.period) * BOSS_HOVER.amplitude;
    });
  });
}

export function playChoimisSkyCue(game) {
  const boss = entity(game, 'choimis_sky_boss');
  const state = game.choimisSky;
  setLoop(boss, state?.raise);
}

function playChoimisSkyVoice(game, state, key) {
  state.clip?.pause();
  state.finishClip?.();
  if (game.sound.muted) return;
  const clip = game.sound.files?.[key]?.cloneNode();
  if (!clip) return;
  clip.volume = 0.9;
  state.clip = clip;
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clip.removeEventListener('ended', finish);
    clip.removeEventListener('error', finish);
    if (state.clip === clip) state.clip = null;
    if (state.finishClip === finish) state.finishClip = null;
  };
  state.finishClip = finish;
  clip.addEventListener('ended', finish, { once: true });
  clip.addEventListener('error', finish, { once: true });
  clip.play().catch(finish);
}

function playChoimisAscentVoice(game, state) {
  if (state.ascentVoiceStarted) return;
  state.ascentVoiceStarted = true;
  playChoimisSkyVoice(game, state, 'choimis_flower_seup');
}

export function gatherChoimisSkyPollen(game) {
  const state = getChoimisSkyState(game);
  state.phase = 'gather';
  state.progress = 0;
  state.windTime = 0;
  if (!state.gatherVoiceStarted) {
    state.gatherVoiceStarted = true;
    game.sound.sfx('great_shine', { volume: 0.8 });
    playChoimisSkyVoice(game, state, 'choimis_flower_sexy');
  }
  const supportActors = PARTY.map(id => entity(game, id)).filter(Boolean);
  const actors = [...supportActors, entity(game, 'choimis_sky_boss')].filter(Boolean);
  state.actors = actors;
  state.pollen = supportActors.flatMap((actor, actorIndex) => Array.from({ length: 56 }, (_, index) => ({
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
  state.gatherPromise = waitForChoimisSkyAnimation(game, state, 2.4, progress => { state.progress = progress; }).then(completed => {
    if (completed && game.choimisSky === state) state.phase = 'cloud';
  });
  return state.gatherPromise;
}

export function startChoimisSkyGather(game) {
  void gatherChoimisSkyPollen(game);
}

export function waitForChoimisSkyGather(game) {
  return game.choimisSky?.gatherPromise;
}

export function ascendChoimisSky(game) {
  const state = getChoimisSkyState(game);
  const members = [game.player, entity(game, 'gyeongsub'), entity(game, 'ppaman')].filter(Boolean);
  const ids = [game.playerSprite || 'hyungsub', 'gyeongsub', 'ppaman'];
  members.forEach((actor, index) => setLoop(actor, state.motions?.[ids[index]]));
  const actors = state.actors;
  state.hoverWaiter?.cancel();
  state.hoverWaiter = null;
  const cameraY = game.camera.y;
  const targets = [[84, 104], [84, 164], [84, 224], [396, 176]];
  const starts = actors.map(actor => [
    actor.x + actor.w / 2 - game.camera.x + (actor.flyX || 0),
    actor.y + actor.h - (actor.hopY || 0) - game.camera.y + (actor.flyY || 0),
  ]);
  const initialHops = actors.map(actor => actor.hopY || 0);
  const motionScales = actors.map(actor => actor.motion?.scale || 0);
  game.camera.locked = true;
  state.phase = 'rise';
  state.progress = 0;
  playChoimisAscentVoice(game, state);
  return waitForChoimisSkyAnimation(game, state, CHOIMIS_SKY_ASCENT.duration, (progress, dt) => {
    const rise = CHOIMIS_SKY_ASCENT.distance * progress;
    game.camera.y = cameraY - rise;
    state.progress = progress;
    state.windTime += dt;
    const zoom = 1 - 0.16 * progress;
    game.zoom.s = zoom;
    game.zoom.smax = 1;
    actors.forEach((actor, index) => {
      actor.hopY = initialHops[index] + rise;
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

export function revealChoimisCape(game) {
  const state = getChoimisSkyState(game);
  const boss = state.boss || entity(game, 'choimis_sky_boss');
  state.phase = 'cape';
  state.capeProgress = 0;
  if (!boss || !state.cape?.revealFrames?.length) { state.capeProgress = 1; return Promise.resolve(); }
  const duration = CHOIMIS_CAPE_REVEAL.durations.reduce((sum, value) => sum + value, 0);
  const scale = ENEMIES.choimis_flower.scale / (CHAR_SCALE * game.zoom.s);
  const motion = { ...state.cape, frames: state.cape.revealFrames, scale, scaleY: ENEMIES.choimis_flower.scaleY, loop: false, elapsed: 0, index: 0 };
  boss.motion = motion;
  boss.moving = false;
  let elapsed = 0;
  let cuePlayed = false;
  return waitForChoimisSkyAnimation(game, state, duration, (progress, dt) => {
    elapsed = Math.min(duration, elapsed + dt);
    state.capeProgress = progress;
    state.windTime += dt;
    if (!cuePlayed && elapsed >= CHOIMIS_CAPE_REVEAL.cueAt) {
      cuePlayed = true;
      game.sound.sfx('wing', { volume: 0.8 });
    }
    let frameTime = elapsed;
    motion.index = motion.frames.length - 1;
    for (let index = 0; index < motion.frames.length; index++) {
      frameTime -= motion.frames[index].duration;
      if (frameTime < 0) { motion.index = index; break; }
    }
    motion.elapsed = elapsed;
  }).then(completed => {
    if (!completed || game.choimisSky !== state) return;
    setLoop(boss, { ...state.cape, scale, scaleY: ENEMIES.choimis_flower.scaleY });
    state.capeProgress = 1;
  });
}

export function readyChoimisSkyBattle(game) {
  game.sound.sfx('weaponpull', { volume: 0.75 });
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
  if (state.phase === 'rise' || state.phase === 'cape') for (const petal of state.loosePetals) {
    const x = (petal.x + state.windTime * petal.speed + 520) % 520 - 20;
    const fall = state.progress * CHOIMIS_SKY_ASCENT.distance * CHOIMIS_SKY_ASCENT.petalFall;
    const y = ((petal.y + fall + 10) % 270 + 270) % 270 - 10 + Math.sin(state.windTime * 2.2 + petal.phase) * 7;
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
