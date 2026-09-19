import { JANITOR_HERO_ACTIONS as C } from '../../data/janitor-hero-actions.js';
import { DRUM_DEVIL_RESCUE as R } from '../../data/drum-devil-rescue.js';
import { drawDrumDevilHero } from './drum-devil-rescue.js';
import { drawEmote } from '../../world/world.js';

const totalAttack = C.attack.holds.reduce((sum, hold) => sum + hold, 0);
const releaseAt = C.attack.holds.slice(0, 3).reduce((sum, hold) => sum + hold, 0);
const windupAt = C.intercept.notice + C.intercept.teleport * 2;
const laughAt = windupAt + totalAttack;
const returnAt = laughAt + C.intercept.laugh;
const settledAt = returnAt + C.intercept.teleport * 2;

export async function loadJanitorHeroActions(loadImage) {
  const [heroAttack, heroEnergy] = await Promise.all([loadImage(C.attack.src), loadImage(C.energy.src)]);
  return { heroAttack, heroEnergy };
}

function frameAt(time) {
  let remaining = Math.max(0, time), frame = 0;
  while (frame < C.attack.holds.length - 1 && remaining >= C.attack.holds[frame]) remaining -= C.attack.holds[frame++];
  return frame;
}

function drawFrame(ctx, image, def, position, frame = 0) {
  if (!image) return;
  ctx.drawImage(image, frame % def.cols * def.cell, Math.floor(frame / def.cols) * def.cell, def.cell, def.cell,
    Math.round(position.x - def.pivot[0]), Math.round(position.y - def.pivot[1]), def.cell, def.cell);
}

function drawTeleport(ctx, position, progress) {
  const spread = 4 + Math.sin(progress * Math.PI) * 28;
  ctx.save(); ctx.globalAlpha = Math.sin(progress * Math.PI); ctx.fillStyle = '#e6e1ff';
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    ctx.fillRect(Math.round(position.x + Math.cos(angle) * spread - 2),
      Math.round(position.y - 38 + Math.sin(angle) * spread * 1.4 - 4), 4, 8);
  }
  ctx.restore();
}

function createAction(battle, { assets, target, barrel, onHit, onDeflect }, intercept) {
  const home = { x: R.hero.home[0], y: R.hero.home[1] };
  let elapsed = 0, anticipation = 0, disposed = false, released = false, contacted = false;
  let position = { ...home }, contact = null;
  const cues = new Set();
  const cue = (name, sound, volume = 0.8) => {
    if (cues.has(name)) return;
    cues.add(name); battle.sfx(sound, { volume });
  };
  const duration = intercept ? settledAt + C.intercept.settle : totalAttack + C.assistHold;
  const attackTime = () => Math.max(0, elapsed - (intercept ? windupAt : 0));
  const phase = () => {
    if (elapsed >= duration) return 'done';
    if (!intercept) return attackTime() >= totalAttack ? 'recover' : 'attack';
    if (elapsed < C.intercept.notice) return 'notice';
    if (elapsed < C.intercept.notice + C.intercept.teleport) return 'teleport-out';
    if (elapsed < windupAt) return 'teleport-in';
    if (elapsed < laughAt) return 'attack';
    if (elapsed < returnAt) return 'laugh';
    if (elapsed < returnAt + C.intercept.teleport) return 'return-out';
    if (elapsed < settledAt) return 'return-in';
    return 'settle';
  };
  const energy = () => {
    if (!released) return null;
    const age = attackTime() - releaseAt;
    if (age > C.energy.flight + C.energy.impactHold) return null;
    const from = intercept ? contact : { x: home.x + C.energy.origin[0], y: home.y + C.energy.origin[1] };
    const to = intercept ? { x: from.x + 150, y: from.y - 85 }
      : { x: target.x + C.energy.target[0], y: target.y + C.energy.target[1] };
    const progress = Math.min(1, age / C.energy.flight);
    return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress,
      age, frame: Math.min(C.energy.count - 1, Math.floor(age * C.energy.fps)), layers: 3 };
  };
  if (intercept) cue('notice', C.sounds.notice);
  return {
    get backgroundBody() { return intercept && ['notice', 'settle', 'done'].includes(phase()); },
    get snapshot() { return { kind: intercept ? 'janitor-intercept' : 'janitor-attack', phase: phase(), elapsed,
      position: { ...position }, frame: frameAt(attackTime()), released, contacted, contact, energy: energy(), anticipation, duration: duration + anticipation }; },
    update(dt) {
      if (disposed) return true;
      elapsed += dt;
      if (intercept) {
        if (!contacted && barrel.y < C.intercept.minimumRootY + C.attack.contactOffset[1]) {
          const wait = Math.max(0, elapsed - (windupAt + releaseAt - 0.000001));
          elapsed -= wait; anticipation += wait;
        }
        if (elapsed >= C.intercept.notice) cue('teleport-out', C.sounds.teleport, 0.65);
        if (elapsed >= C.intercept.notice + C.intercept.teleport) {
          cue('teleport-in', C.sounds.teleport, 0.65);
          if (!contacted) position = { x: barrel.x - C.attack.contactOffset[0],
            y: Math.max(C.intercept.minimumRootY, barrel.y - C.attack.contactOffset[1]) };
        }
      }
      if (!released && elapsed >= (intercept ? windupAt : 0) + releaseAt) {
        released = true; cue('release', C.sounds.release);
        if (intercept) {
          contact = { x: barrel.x, y: barrel.y }; contacted = true;
          cue('hit', C.sounds.hit, 0.85); onDeflect();
        }
      }
      if (!intercept && !contacted && elapsed >= releaseAt + C.energy.flight) {
        contacted = true; contact = { x: target.x + C.energy.target[0], y: target.y + C.energy.target[1] };
        cue('hit', C.sounds.hit, 0.85); onHit();
      }
      if (intercept && elapsed >= laughAt) cue('laugh', C.sounds.laugh);
      if (intercept && elapsed >= returnAt) cue('return-out', C.sounds.teleport, 0.65);
      if (intercept && elapsed >= returnAt + C.intercept.teleport) {
        cue('return-in', C.sounds.teleport, 0.65); position = { ...home };
      }
      return elapsed >= duration;
    },
    drawBody(ctx) {
      if (disposed) return;
      const current = phase(), at = [position.x, position.y];
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 480, 318); ctx.clip();
      if (current === 'notice' || current === 'settle' || current === 'done') {
        drawDrumDevilHero(ctx, assets, battle.game.time, at);
      } else if (current === 'laugh') drawFrame(ctx, assets.laugh, R.laugh, position);
      else if (current === 'attack' || current === 'recover') drawFrame(ctx, assets.heroAttack, C.attack, position, frameAt(attackTime()));
      else {
        const start = current === 'teleport-out' ? C.intercept.notice : current === 'teleport-in'
          ? C.intercept.notice + C.intercept.teleport : current === 'return-out' ? returnAt : returnAt + C.intercept.teleport;
        drawTeleport(ctx, position, Math.min(1, (elapsed - start) / C.intercept.teleport));
      }
      ctx.restore();
    },
    drawEffects(ctx) {
      if (disposed) return;
      const wave = energy();
      const notice = phase() === 'notice';
      if (!wave && !notice) return;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 480, 318); ctx.clip();
      if (notice) drawEmote(ctx, { kind: '!', t: elapsed }, home.x, home.y - C.intercept.headOffset);
      if (wave) drawFrame(ctx, assets.heroEnergy, C.energy, wave, wave.frame);
      ctx.restore();
    },
    draw(ctx) { this.drawBody(ctx); this.drawEffects(ctx); },
    dispose() { disposed = true; },
  };
}

export function createJanitorHeroAttack(battle, options) { return createAction(battle, options, false); }
export function createJanitorHeroIntercept(battle, options) { return createAction(battle, options, true); }
