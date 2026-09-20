import { JANITOR_HERO_ACTIONS as C } from '../../data/janitor-hero-actions.js';
import { DRUM_DEVIL_RESCUE as R } from '../../data/drum-devil-rescue.js';
import { drawDrumDevilHero, janitorRedAfterimage } from './drum-devil-rescue.js';
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

function drawFrame(ctx, image, def, position, frame = 0, scale = 1) {
  if (!image) return;
  ctx.drawImage(image, frame % def.cols * def.cell, Math.floor(frame / def.cols) * def.cell, def.cell, def.cell,
    Math.round(position.x - def.pivot[0] * scale), Math.round(position.y - def.pivot[1] * scale), Math.round(def.cell * scale), Math.round(def.cell * scale));
}

function createAction(battle, { assets, target, barrel, onHit, onDeflect }, intercept) {
  const home = { x: R.hero.home[0], y: R.hero.home[1] };
  const attackHome = { x: R.hero.attackHome[0], y: R.hero.attackHome[1] };
  const bodyScale = R.hero.scale ?? 1;
  const contactOffset = C.attack.contactOffset.map(value => value * bodyScale);
  const targetPoint = () => ({ x: target.x + C.energy.target[0] * (target.def?.scale ?? 1), y: target.y + C.energy.target[1] * (target.def?.scale ?? 1) });
  let elapsed = 0, anticipation = 0, disposed = false, released = false, contacted = false;
  let position = { ...home }, contact = null;
  let redTrail = null, returnFrom = null;
  const transit = () => {
    const returning = elapsed >= returnAt;
    const from = returning ? returnFrom ?? position : home;
    const to = returning ? home : { x: barrel.x - contactOffset[0], y: Math.max(C.intercept.minimumRootY, barrel.y - contactOffset[1]) };
    const progress = Math.max(0, Math.min(1, (elapsed - (returning ? returnAt : C.intercept.notice)) / (C.intercept.teleport * 2)));
    return { from, to, progress };
  };
  const along = (motion, progress) => ({ x: motion.from.x + (motion.to.x - motion.from.x) * progress,
    y: motion.from.y + (motion.to.y - motion.from.y) * progress });
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
    const from = intercept ? contact : { x: attackHome.x + C.energy.origin[0] * bodyScale, y: attackHome.y + C.energy.origin[1] * bodyScale };
    const to = intercept ? { x: from.x + 150, y: from.y - 85 }
      : targetPoint();
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
      if (!intercept) {
        const windup = Math.min(1, elapsed / C.attack.holds[0]);
        const recovery = Math.max(0, Math.min(1, (elapsed - totalAttack) / C.assistHold));
        position = { x: home.x + (attackHome.x - home.x) * windup * (1 - recovery), y: home.y };
      }
      if (intercept) {
        if (!contacted && barrel.y < C.intercept.minimumRootY + contactOffset[1]) {
          const wait = Math.max(0, elapsed - (windupAt + releaseAt - 0.000001));
          elapsed -= wait; anticipation += wait;
        }
        if (elapsed >= C.intercept.notice) cue('teleport-out', C.sounds.teleport, 0.7);
        if (elapsed >= C.intercept.notice && elapsed < windupAt) position = along(transit(), transit().progress);
        if (elapsed >= windupAt) {
          if (!contacted) position = { x: barrel.x - contactOffset[0],
            y: Math.max(C.intercept.minimumRootY, barrel.y - contactOffset[1]) };
        }
      }
      if (!released && elapsed >= (intercept ? windupAt : 0) + releaseAt) {
        released = true;
        if (!intercept) cue('release', C.sounds.release);
        if (intercept) {
          contact = { x: barrel.x, y: barrel.y }; contacted = true;
          cue('parry', C.sounds.parry, 0.65);
          cue('hit', C.sounds.hit, 0.45); onDeflect();
        }
      }
      if (!intercept && !contacted && elapsed >= releaseAt + C.energy.flight) {
        contacted = true; contact = targetPoint();
        cue('hit', C.sounds.hit, 0.85); onHit();
      }
      if (intercept && elapsed >= laughAt) cue('laugh', C.sounds.laugh);
      if (intercept && elapsed >= returnAt) {
        returnFrom ??= { ...position };
        cue('return-out', C.sounds.teleport, 0.7);
        position = along(transit(), transit().progress);
      }
      return elapsed >= duration;
    },
    drawBody(ctx) {
      if (disposed) return;
      const current = phase(), at = [position.x, position.y];
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 480, 318); ctx.clip();
      if (current === 'notice' || current === 'settle' || current === 'done') {
        drawDrumDevilHero(ctx, assets, battle.game.time, at);
      } else if (current === 'laugh') drawFrame(ctx, assets.laugh, R.laugh, position, 0, bodyScale);
      else if (current === 'attack' || current === 'recover') drawFrame(ctx, assets.heroAttack, C.attack, position, frameAt(attackTime()), bodyScale);
      else {
        const motion = transit();
        if (assets.heroAttack) {
          redTrail ??= janitorRedAfterimage(assets.heroAttack);
          for (let i = C.intercept.trailCount; i > 0; i--) {
            ctx.globalAlpha = 0.48 * (1 - i / (C.intercept.trailCount + 1));
            drawFrame(ctx, redTrail, C.attack, along(motion, Math.max(0, motion.progress - i * C.intercept.trailSpacing)), 0, bodyScale);
          }
          ctx.globalAlpha = 1;
          drawFrame(ctx, assets.heroAttack, C.attack, position, 0, bodyScale);
        }
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
