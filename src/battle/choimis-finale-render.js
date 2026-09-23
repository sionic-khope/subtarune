import { CHOIMIS_FINALE as C } from '../data/choimis-finale.js';
import { BATTLE_BGS } from './backgrounds.js';
import { darkSmokeWaiter, drawDarkSmoke } from '../ui/dark-smoke.js';
import { heartPixels, pinkChargeAura } from './modes/choimis-pink-shooter.js';
import { FONT } from '../ui/font.js';

const P = C.palette;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, progress) => a + (b - a) * clamp(progress);
function flower(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  const px = Math.round(x), py = Math.round(y), s = Math.round(size);
  ctx.fillRect(px - s, py - 1, s * 2 + 1, 3); ctx.fillRect(px - 1, py - s, 3, s * 2 + 1);
  ctx.fillStyle = P.flowerCenter; ctx.fillRect(px, py, 1, 1);
}
function gather(ctx, state, enemy) {
  const progress = clamp(state.phaseTime / C.seconds.gather), wrap = clamp((progress - 0.55) / 0.45);
  const scale = enemy.def.scale ?? 1, scaleY = scale * (enemy.def.scaleY ?? 1);
  const pivot = enemy.def.actions?.raise?.pivot || enemy.def.pivot || [80, 152];
  const cx = state.boss.x + (mix(C.gather.palm[0], C.gather.body[0], wrap) - pivot[0]) * scale;
  const cy = state.boss.y + (mix(C.gather.palm[1], C.gather.body[1], wrap) - pivot[1]) * scaleY;
  for (let index = 0; index < C.flowerCount; index++) {
    const angle = index * 2.399 + state.phaseTime * (1 + index % 4 * 0.16);
    const targetRadius = Math.sqrt(index / C.flowerCount) * C.gather.radius;
    const radius = mix(310 + index % 9 * 12, targetRadius, progress);
    ctx.globalAlpha = 0.45 + progress * 0.55;
    flower(ctx, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.88, index % 7 ? 2 : 4, index % 3 ? P.flowerPetal : P.flowerHighlight);
  }
  ctx.globalAlpha = 1;
}
function heart(ctx, point, size = 1, color = P.heart) {
  ctx.fillStyle = color;
  for (const pixel of heartPixels('right')) ctx.fillRect(Math.round(point.x + pixel.x * size), Math.round(point.y + pixel.y * size), size, size);
}
function drawCharge(ctx, state) {
  const progress = clamp(state.phaseTime / C.seconds.autocharge);
  if (progress <= 0) return;
  ctx.globalAlpha = progress * 0.2; heart(ctx, state.heart, 1 + Math.floor(progress * 3), P.chargeGlow);
  ctx.globalAlpha = 0.2 + progress * 0.8;
  for (const streak of pinkChargeAura(state.heart.x, state.heart.y, progress, state.phaseTime)) {
    ctx.save(); ctx.translate(Math.round(streak.x), Math.round(streak.y)); ctx.rotate(streak.angle);
    ctx.fillStyle = progress > 0.9 ? P.energyWhite : P.chargeStreak; ctx.fillRect(-2 - progress * 4, -1, 4 + progress * 8, 2 + Math.floor(progress * 2)); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawBeam(ctx, state) {
  const travel = state.phase === 'shot' ? clamp(state.phaseTime / C.seconds.shot) : 1;
  const point = state.impactPoint;
  const angle = Math.atan2(point.y - state.heart.y, point.x - state.heart.x);
  const contact = { x: point.x - Math.cos(angle) * 24, y: point.y - Math.sin(angle) * 24 };
  const target = { x: mix(contact.x, C.impact.beamEndX, state.beamReach),
    y: mix(contact.y, state.heart.y + Math.tan(angle) * (C.impact.beamEndX - state.heart.x), state.beamReach) };
  const head = { x: mix(state.heart.x + 15, target.x, travel), y: mix(state.heart.y, target.y, travel) };
  const dx = head.x - state.heart.x, dy = head.y - state.heart.y, length = Math.hypot(dx, dy);
  ctx.save(); ctx.translate(Math.round(state.heart.x), Math.round(state.heart.y)); ctx.rotate(Math.atan2(dy, dx));
  ctx.globalAlpha = Math.min(1, state.beamWidth * 4);
  for (const [width, color] of [[38, P.beamOuter], [24, P.beamInner], [10, P.energyWhite]]) {
    const thickness = Math.max(1, Math.round(width * state.beamWidth));
    ctx.fillStyle = color; ctx.fillRect(8, -Math.round(thickness / 2), Math.max(0, length - 8), thickness);
  }
  if (state.phase !== 'beam-fade') heart(ctx, { x: length, y: 0 }, 4, P.energyWhite); ctx.restore();
}

/** Draws the finale over its existing sky; the smoke state belongs only to this renderer. */
export function createChoimisFinaleRenderer(battle, enemy) {
  const smokeGame = { time: 0, entities: [], darkSmoke: null };
  let smokeWaiter = null;
  const normal = (ctx, state) => {
    const image = enemy.projectiles?.normal;
    if (!image) return;
    const cell = image.width / 4, scale = 0.58;
    ctx.drawImage(image, 0, 0, cell, image.height / 4, Math.round(state.boss.x - 64 * scale), Math.round(state.boss.y - 120 * scale), Math.round(cell * scale), Math.round(image.height / 4 * scale));
  };
  return {
    beginSmoke(boss) {
      smokeGame.entities = [{ id: 'boss', x: boss.x, y: boss.y - 38, w: 0, h: 30 }];
      smokeWaiter = darkSmokeWaiter(smokeGame, { mode: 'dissipate', from: 'boss', duration: C.seconds.smoke, veil: 0 });
    },
    updateSmoke(dt) { smokeGame.time += dt; smokeWaiter?.update(dt); },
    draw(ctx, state, assault) {
      const background = BATTLE_BGS[battle.cfg.bg] || BATTLE_BGS.choimis_sky;
      const showParty = ['intro-talk', 'raise', 'gather', 'transform-white'].includes(state.phase);
      background(ctx, { ...battle, openingActorAlpha: () => showParty ? 1 : 0 });
      if (['reveal', 'gap-talk', 'assault'].includes(state.phase)) {
        assault?.draw(ctx);
        if (state.transitionWhite > 0) {
          ctx.save(); ctx.globalAlpha = state.transitionWhite; ctx.fillStyle = P.energyWhite; ctx.fillRect(0, 0, 480, 360); ctx.restore();
        }
        if (state.phase === 'gap-talk') { ctx.font = FONT; ctx.textBaseline = 'top'; battle.drawTextBox(ctx); }
        return;
      }
      if (showParty) for (const member of battle.members) battle.drawMember?.(ctx, member);
      if (state.normal) normal(ctx, state);
      else {
        let frame, sheet = 'idle';
        if (state.phase === 'raise') { sheet = 'raise'; frame = C.raiseFrames.filter(time => state.phaseTime >= time).length; }
        if (state.phase === 'gather' || state.phase === 'transform-white') { sheet = 'raise'; frame = 2; }
        const progress = state.phase === 'impact' || state.phase === 'beam-fade' ? clamp(state.impactTime / ((C.seconds.impact - C.impact.hitstop) * C.impact.timeScale)) : state.phase === 'flash' ? 1 : 0;
        const recoil = C.impact.recoil * Math.sin(progress * Math.PI / 2);
        const shake = state.phase === 'impact' ? Math.round(Math.sin(state.phaseTime * 90) * 4 * (1 - progress)) : 0;
        if (['impact', 'beam-fade', 'flash'].includes(state.phase)) frame = 0;
        battle.drawEnemy?.(ctx, { ...enemy, blink: 0, shake: 0, popup: null, patternPose: { x: state.boss.x + recoil + shake, y: state.boss.y - recoil / 3, sheet, frame } });
      }
      if (state.phase === 'gather') gather(ctx, state, enemy);
      if (state.phase === 'transform-white') {
        gather(ctx, { ...state, phaseTime: C.seconds.gather + state.phaseTime }, enemy);
        ctx.save(); ctx.globalAlpha = state.transitionWhite; ctx.fillStyle = P.energyWhite; ctx.fillRect(0, 0, 480, 360); ctx.restore();
      }
      if (!showParty && state.phase !== 'done') heart(ctx, state.heart);
      if (state.phase === 'autocharge') drawCharge(ctx, state);
      if (['shot', 'impact', 'beam-fade'].includes(state.phase)) drawBeam(ctx, state);
      if (['bursts', 'impact', 'beam-fade'].includes(state.phase)) {
        const finisher = state.phase !== 'bursts', power = 2;
        for (let index = 0; index < 36; index++) {
          const angle = index * 2.399, age = finisher ? state.impactTime + 0.015 : (state.phaseTime + index % 4 * 0.1) % 0.4;
          const radius = age * 220 * power * (0.6 + index % 4 * 0.16);
          const point = finisher ? state.impactPoint : { x: state.boss.x, y: state.boss.y - 38 };
          flower(ctx, point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius, 2 + index % 3, index % 2 ? P.energyWhite : P.impactPetal);
        }
      }
      if (state.phase === 'smoke') drawDarkSmoke(ctx, smokeGame, { x: 0, y: 0 });
      const white = state.impactFlash || (state.phase === 'bursts' && state.phaseTime < 0.075) ? 1 : state.finalWhite;
      if (white > 0) { ctx.save(); ctx.globalAlpha = white; ctx.fillStyle = P.energyWhite; ctx.fillRect(0, 0, 480, 360); ctx.restore(); }
      if (state.phase.endsWith('talk')) { ctx.font = FONT; ctx.textBaseline = 'top'; battle.drawTextBox(ctx); }
    },
    dispose() { smokeGame.darkSmoke = null; smokeWaiter = null; },
  };
}
