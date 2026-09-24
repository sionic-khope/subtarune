import { SCREEN_W } from '../core/layout.js';
import { FONT } from '../ui/font.js';
import L from '../data/locale/ko.js';

export const BOULDER_PUSH = Object.freeze({ stages: 10, mashTarget: 35, feedback: 0.58,
  finishHold: 0.65, gauge: { x: 110, y: 45, w: 260, h: 14 } });
const RESTORED = ['flyX', 'hopY', 'spin', 'moving', 'frame', 'animPhase', 'hoverT', 'driven', 'facing'];
const entity = (game, id) => id === 'player' ? game.player : game.entities.find(e => e.id === id);
const clamp = value => Math.max(0, Math.min(1, value));

/** Fresh confirm edges advance ten timing stages, then a separate final mash.
 * onStage(stage, delta) owns persistent world displacement; onFinish owns launch effects.
 * Call update while the script action awaits, draw after the world, and clear on map/title/QA.
 * Cancellation resolves {completed:false}; this controller never writes story/save flags.
 */
export function startCastleBoulderPush(game, config = {}) {
  clearCastleBoulderPush(game);
  const pushers = [...new Set(config.push || [])].filter(id => id !== 'youngcle')
    .map(id => entity(game, id)).filter(Boolean);
  const tremble = config.tremble ? entity(game, config.tremble) : null;
  const originals = new Map([...new Set([...pushers, tremble].filter(Boolean))]
    .map(actor => [actor, Object.fromEntries(RESTORED.map(key => [key, actor[key]]))]));
  return new Promise(resolve => {
    game.castleBoulderPush = { config, resolve, pushers, tremble, originals, map: game.map,
      stage: 0, phase: 'timing', marker: 0, travel: 0, count: 0, elapsed: 0,
      feedback: 0, press: 0, exert: 0, idle: 0, armed: false, settled: false,
      bark: '', barkTime: 0, barkShown: 0, sparks: [], result: null, judgedStage: 0 };
  });
}

export function castleBoulderTarget(stage) {
  const width = 0.25 - Math.min(9, stage) * 0.012;
  const center = [0.5, 0.68, 0.34, 0.6, 0.42][stage % 5];
  return { left: center - width / 2, right: center + width / 2 };
}

function settle(game, state, completed) {
  if (state.settled) return;
  state.settled = true;
  for (const [actor, saved] of state.originals) for (const key of RESTORED) {
    if (saved[key] === undefined) delete actor[key]; else actor[key] = saved[key];
  }
  state.sparks.length = 0;
  if (game.castleBoulderPush === state) game.castleBoulderPush = null;
  state.resolve({ completed });
}

export function clearCastleBoulderPush(game) {
  if (game.castleBoulderPush) settle(game, game.castleBoulderPush, false);
}

function burst(state, progress, count) {
  for (let i = 0; i < count; i++) state.sparks.push({ k: progress, x: 0, y: 0,
    vx: Math.cos(i * 2.4) * 28, vy: -24 - (i % 4) * 11, t: 0, life: 0.42 });
}

function exert(game, state, strength) {
  state.exert = strength;
  state.press = 0.14;
  game.shake = { time: 0.12, amp: strength > 0.8 ? 2 : 1 };
}

export function updateCastleBoulderPush(game, dt, input) {
  const state = game.castleBoulderPush;
  if (!state) return;
  if (state.map !== game.map) { clearCastleBoulderPush(game); return; }
  state.elapsed += dt;
  state.press = Math.max(0, state.press - dt);
  state.exert = Math.max(0, state.exert - dt * 2.5);
  state.barkTime = Math.max(0, state.barkTime - dt);
  const shown = Math.min(state.bark.length, Math.floor((1.4 - state.barkTime) * 28));
  if (state.barkTime > 0 && shown > state.barkShown) game.sound?.blip('junhee');
  state.barkShown = shown;
  for (const [i, actor] of state.pushers.entries()) {
    const saved = state.originals.get(actor);
    actor.facing = 'right'; actor.moving = state.exert > 0;
    actor.animate?.(dt, 10);
    actor.driven = true;
    actor.flyX = (saved.flyX || 0) + state.exert * 5;
    actor.hopY = (saved.hopY || 0) + Math.sin(clamp(state.exert) * Math.PI) * (2 + i % 3);
    actor.spin = (saved.spin || 0) + state.exert * 0.09;
  }
  if (state.tremble) state.tremble.flyX = (state.originals.get(state.tremble).flyX || 0)
    + Math.sin(state.elapsed * 55) * (0.4 + state.exert * 1.5);
  for (const spark of state.sparks) { spark.t += dt; spark.x += spark.vx * dt; spark.y += spark.vy * dt; }
  state.sparks = state.sparks.filter(spark => spark.t < spark.life);
  if (state.phase === 'complete') {
    state.feedback -= dt;
    if (state.feedback <= 0) {
      settle(game, state, true);
      state.config.onFinish?.();
    }
    return;
  }
  const pressed = input.just('confirm');
  const held = input.down ? input.down('confirm') : pressed;
  if (!held && !pressed) state.armed = true;
  const fresh = pressed && state.armed;
  if (pressed) state.armed = false;
  if (state.feedback > 0) {
    state.feedback = Math.max(0, state.feedback - dt);
    if (state.feedback === 0 && state.stage === BOULDER_PUSH.stages) {
      state.phase = 'mash'; state.result = null; state.armed = false;
      state.bark = ''; state.barkTime = 0;
    }
    return;
  }
  if (state.phase === 'timing') {
    if (fresh) {
      const zone = castleBoulderTarget(state.stage);
      const hit = state.marker >= zone.left && state.marker <= zone.right;
      const previous = state.stage;
      state.judgedStage = previous;
      state.stage = hit ? state.stage + 1 : Math.max(0, state.stage - 1);
      state.result = hit ? 'hit' : 'miss'; state.feedback = BOULDER_PUSH.feedback;
      state.config.onStage?.(state.stage, state.stage - previous);
      if (hit) {
        // colorgame.js clearStage: preserve the user's chosen colour-game success cue and pitch.
        game.sound?.sfx('great_shine', { volume: 0.55, rate: 1 });
        exert(game, state, 1); burst(state, state.marker, 10);
        const barks = state.config.barks || [];
        state.bark = barks[(state.stage - 1) % barks.length] || '';
        state.barkTime = 1.4; state.barkShown = 0;
      } else {
        game.sound?.sfx('cancel', { volume: 0.45 });
        state.bark = state.config.missBark || ''; state.barkTime = 1.4; state.barkShown = 0;
      }
      return;
    }
    // Judge the last visible marker before moving it: display and input share one boundary.
    state.travel = (state.travel + dt * (0.88 + state.stage * 0.035)) % 2;
    state.marker = state.travel <= 1 ? state.travel : 2 - state.travel;
  } else {
    state.idle += dt;
    if (fresh) {
      state.count = Math.min(BOULDER_PUSH.mashTarget, state.count + 1);
      game.sound?.sfx('click', { volume: 0.25, rate: 1 });
      state.idle = 0; exert(game, state, 0.7);
      burst(state, state.count / BOULDER_PUSH.mashTarget, 3);
      if (state.count === BOULDER_PUSH.mashTarget) {
        state.phase = 'complete'; state.feedback = BOULDER_PUSH.finishHold;
        state.exert = 1; burst(state, 1, 16);
      }
    } else if (state.idle > 1.2) state.count = Math.max(0, state.count - dt * 1.2);
  }
}

function outlinedText(ctx, text, x, y, color) {
  ctx.fillStyle = '#000';
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillText(text, x + dx, y + dy);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

export function drawCastleBoulderPush(game, ctx) {
  const state = game.castleBoulderPush;
  if (!state) return;
  const { x, y, w, h } = BOULDER_PUSH.gauge;
  const mash = state.phase !== 'timing';
  ctx.save(); ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  outlinedText(ctx, mash ? L.boulder_push_mash : `${state.stage} / ${BOULDER_PUSH.stages}`, SCREEN_W / 2, 18, '#fff');
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
  if (mash) {
    ctx.fillStyle = state.phase === 'complete' ? '#fff' : '#ffe066';
    ctx.fillRect(x, y, Math.round(w * state.count / BOULDER_PUSH.mashTarget), h);
  } else {
    const zone = castleBoulderTarget(state.feedback > 0 ? state.judgedStage : state.stage);
    const zx = Math.round(x + w * zone.left), zw = Math.round(w * (zone.right - zone.left));
    ctx.fillStyle = '#ffe066'; ctx.fillRect(zx, y, zw, h);
    ctx.fillStyle = '#fff'; ctx.fillRect(zx, y - 5, 2, 3); ctx.fillRect(zx + zw - 2, y - 5, 2, 3);
    const mx = Math.round(x + state.marker * w);
    ctx.fillStyle = state.result === 'miss' && state.feedback > 0 ? '#ff2b4a' : '#fff';
    ctx.fillRect(mx - 2, y - 5, 4, h + 10);
    ctx.fillStyle = '#000'; ctx.fillRect(mx - 1, y, 2, h);
  }
  ctx.fillStyle = state.press > 0 ? '#ffe066' : '#fff';
  ctx.fillRect(x + w + 13, y - 4 + (state.press > 0 ? 2 : 0), 24, 24);
  ctx.fillStyle = '#000'; ctx.fillRect(x + w + 15, y - 2 + (state.press > 0 ? 2 : 0), 20, 20);
  outlinedText(ctx, 'C', x + w + 25, y + (state.press > 0 ? 4 : 2), '#fff');
  if (state.barkTime > 0) outlinedText(ctx, state.bark.slice(0, state.barkShown), SCREEN_W / 2, y + 31, '#fff');
  for (const spark of state.sparks) {
    ctx.globalAlpha = 1 - spark.t / spark.life; ctx.fillStyle = '#ffe066';
    ctx.fillRect(Math.round(x + spark.k * w + spark.x), Math.round(y + spark.y), 2, 2);
  }
  ctx.restore();
}
