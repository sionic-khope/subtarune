import { BARON_CANNON } from '../../data/baron-cannon.js';
import { FONT } from '../../ui/font.js';
import { drawHeart } from '../../core/gfx.js';
import L from '../../data/locale/ko.js';

export const GUARD_BOARD = Object.freeze({ x: 174, y: 48, w: 114, h: 252 });
export const GUARD_LANES = Object.freeze([90, 174, 258]);
const SOUL_X = 218, MOUTH_X = 340, MOUTH_Y = 176, MUZZLE_X = 151, MUZZLE_Y = 175;
const WARN = 0.7, TRAVEL = 0.4, BLOCK_FLASH = 0.28;
const ROWS = [1, 0, 2, 1, 2, 0, 1, 0, 2, 1, 0, 2, 1, 2];
const COLORS = { white: '#ffffff', line: '#595366', purple: '#8d45db', core: '#ddb8ff', heart: '#ff203a' };
const IMAGE_CACHE = new Map();
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const ease = (n) => 1 - (1 - clamp(n, 0, 1)) ** 3;

function images() {
  return Object.fromEntries(Object.entries(BARON_CANNON.assets).map(([key, src]) => {
    if (!IMAGE_CACHE.has(src)) {
      const item = { image: null, ready: typeof Image === 'undefined' };
      IMAGE_CACHE.set(src, item);
      if (typeof Image !== 'undefined') {
        const image = new Image();
        image.onload = () => { item.image = image; item.ready = true; };
        image.onerror = () => { item.ready = true; };
        image.src = src;
      }
    }
    return [key, IMAGE_CACHE.get(src)];
  }));
}

export function cannonBreaths() {
  return ROWS.map((lane, i) => ({ lane, at: 0.1 + i * 1.05, warn: WARN, travel: TRAVEL, resolved: false, blocked: false }));
}

export function createCannonGuard(battle, { target }) {
  const art = images(), breaths = cannonBreaths();
  let phase = 'enter', phaseTime = 0, elapsed = 0, lane = 1, held = null, repeatAt = 0;
  let blocked = 0, damageApplied = false, disposed = false;
  const change = (next) => { phase = next; phaseTime = 0; };
  const line = (key, next) => { battle.showLine({ ...BARON_CANNON.dialogue[key], portrait: null }); change(next); };
  const guarding = () => phase === 'guard' || phase === 'focus';

  function move(dt, input) {
    const up = input.down('up'), down = input.down('down');
    const dir = up === down ? null : up ? 'up' : 'down';
    if (!dir) { held = null; repeatAt = 0; return; }
    repeatAt -= dt;
    if (dir !== held || input.just(dir) || repeatAt <= 0) {
      lane = clamp(lane + (dir === 'up' ? -1 : 1), 0, 2);
      repeatAt = dir === held ? 0.18 : 0.3;
      held = dir;
    }
  }

  function advanceDialogue(input, next) {
    if (phaseTime >= 0.2 && battle.typed && input.just('confirm')) change(next);
  }

  const mode = {
    fullscreen: true,
    get snapshot() {
      return { phase, phaseTime, elapsed, lane, blocked, damageApplied, disposed,
        breaths: breaths.map((b) => ({ ...b })), assetsReady: Object.values(art).every((a) => a.ready) };
    },
    update(dt, input) {
      if (disposed || phase === 'done') return true;
      phaseTime += dt;
      if (phase === 'enter') {
        if (phaseTime >= 0.85 && Object.values(art).every((a) => a.ready)) line('charge', 'charge-dialogue');
      } else if (phase === 'charge-dialogue') {
        advanceDialogue(input, 'guard');
        if (phase === 'guard') battle.sfx('baron_roar');
      } else if (guarding()) {
        move(dt, input);
        elapsed += dt;
        for (const breath of breaths) {
          if (breath.resolved || elapsed < breath.at + breath.warn + breath.travel) continue;
          breath.resolved = true;
          if (breath.lane !== lane) { battle.sfx('baron_slam'); line('failure', 'failure-dialogue'); return false; }
          breath.blocked = true;
          blocked++;
        }
        if (phase === 'guard' && elapsed >= BARON_CANNON.chargeSeconds) {
          change('focus');
          battle.sfx('cannon_guard_charge');
        }
        if (elapsed >= BARON_CANNON.chargeSeconds + BARON_CANNON.focusSeconds) {
          change('fire');
          battle.sfx('cannon_guard_fire');
        }
      } else if (phase === 'fire') {
        if (!damageApplied && phaseTime >= 0.45) {
          damageApplied = true;
          battle.applyCannonDamage(target, BARON_CANNON.damage);
          battle.sfx('baron_slam');
        }
        if (phaseTime >= BARON_CANNON.fireSeconds) line('success', 'success-dialogue');
      } else if (phase === 'success-dialogue') advanceDialogue(input, 'leave');
      else if (phase === 'failure-dialogue') advanceDialogue(input, 'fly');
      else if ((phase === 'fly' && phaseTime >= 1.2) || (phase === 'leave' && phaseTime >= 0.85)) change('done');
      return phase === 'done';
    },
    draw(ctx) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 480, 360);
      ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      const entry = phase === 'enter' ? ease(phaseTime / 0.85) : 1;
      let leftX = -170 * (1 - entry), leftY = 0, rotation = 0;
      if (phase === 'leave') leftX = -190 * ease(phaseTime / 0.85);
      if (phase === 'fly') { leftX = -260 * phaseTime; leftY = -220 * phaseTime + 60 * phaseTime ** 2; rotation = -phaseTime * 7; }
      const walking = phase === 'enter' || phase === 'leave';
      const yongjunFrame = walking ? Math.floor(phaseTime / 0.16) % 2 : phase === 'success-dialogue' ? 3 : phase === 'focus' || phase === 'fire' ? 2 : 0;
      const cannonFrame = phase === 'focus' ? 1 : phase === 'fire' ? 2 + Math.floor(phaseTime / 0.14) % 2 : 0;
      ctx.save();
      ctx.translate(Math.round(82 + leftX), Math.round(208 + leftY)); ctx.rotate(rotation);
      drawFrame(ctx, art.yongjun.image, yongjunFrame, 96, -82, -78);
      const recoil = phase === 'fire' ? -Math.max(0, 7 - phaseTime * 9) : 0;
      drawFrame(ctx, art.cannon.image, cannonFrame, 128, -47 + recoil, -108);
      ctx.restore();
      const hitShake = phase === 'fire' && damageApplied ? Math.round(Math.sin(phaseTime * 57) * Math.max(0, 6 - phaseTime * 2)) : 0;
      const exhaling = guarding() && breaths.some((b) => elapsed >= b.at + b.warn && elapsed <= b.at + b.warn + b.travel + BLOCK_FLASH);
      const baronFrame = phase === 'fire' && damageApplied ? 3 : exhaling ? 2 : guarding() ? 1 : 0;
      drawFrame(ctx, art.baron.image, baronFrame, 192, 288 + Math.round(192 * (1 - entry)) + hitShake, 60);
      if (!['failure-dialogue', 'fly', 'leave', 'done'].includes(phase)) {
        drawBoard(ctx, entry, lane);
        if (guarding()) for (const breath of breaths) drawBreath(ctx, breath, elapsed);
        if (guarding() || phase === 'charge-dialogue' || phase === 'enter') {
          ctx.save(); ctx.translate(SOUL_X - 7, GUARD_LANES[lane] - 7); ctx.scale(2, 2);
          drawHeart(ctx, 0, 0, COLORS.heart); ctx.restore();
        }
      }
      if (guarding()) {
        drawCharge(ctx, elapsed, phase === 'focus');
        ctx.fillStyle = COLORS.white;
        ctx.fillText(L.battle_cannon_guard_hint, 154, 316);
      }
      if (phase === 'fire') drawCannonFire(ctx, phaseTime, recoil, hitShake);
      if (phase === 'failure-dialogue' && phaseTime < 0.35) {
        const front = SOUL_X + (MUZZLE_X - SOUL_X) * clamp(phaseTime / 0.2, 0, 1);
        drawAcid(ctx, Math.round(front), MUZZLE_Y, MOUTH_X, MOUTH_Y, elapsed + phaseTime);
      }
      if (phase.endsWith('-dialogue')) battle.drawTextBox(ctx);
      ctx.restore();
    },
    dispose() { disposed = true; },
  };
  return mode;
}

function drawFrame(ctx, image, frame, cell, x, y) {
  if (!image) return;
  ctx.drawImage(image, (frame % 2) * cell, Math.floor(frame / 2) * cell, cell, cell, Math.round(x), Math.round(y), cell, cell);
}

function drawBoard(ctx, opening, lane) {
  const b = GUARD_BOARD, height = Math.round(72 + (b.h - 72) * opening), y = Math.round(b.y + (b.h - height) / 2);
  ctx.strokeStyle = COLORS.white; ctx.lineWidth = 2;
  ctx.strokeRect(b.x, y, b.w, height);
  if (opening < 0.95) return;
  ctx.strokeStyle = COLORS.line;
  for (const lineY of [132, 216]) { ctx.beginPath(); ctx.moveTo(b.x, lineY); ctx.lineTo(b.x + b.w, lineY); ctx.stroke(); }
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(b.x - 6, GUARD_LANES[lane] - 9, 3, 18);
}

function drawBreath(ctx, breath, time) {
  const age = time - breath.at, y = GUARD_LANES[breath.lane];
  if (age < 0 || age > breath.warn + breath.travel + BLOCK_FLASH) return;
  if (age < breath.warn) {
    ctx.strokeStyle = COLORS.core; ctx.globalAlpha = 0.5 + age / breath.warn * 0.5;
    ctx.lineWidth = 2;
    ctx.strokeRect(178, y - 28, 106, 56);
    for (let x = 234; x < 294; x += 12) { ctx.fillStyle = COLORS.core; ctx.fillRect(x, y - 1, 6, 2); }
    ctx.beginPath(); ctx.moveTo(240, y - 7); ctx.lineTo(232, y); ctx.lineTo(240, y + 7); ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    const k = clamp((age - breath.warn) / breath.travel, 0, 1);
    const front = Math.round(MOUTH_X + (SOUL_X + 10 - MOUTH_X) * k);
    drawAcid(ctx, front, y, MOUTH_X, MOUTH_Y, time);
    if (breath.blocked) {
      const fade = 1 - (age - breath.warn - breath.travel) / BLOCK_FLASH;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = COLORS.white; ctx.fillRect(SOUL_X + 11, y - 22, 4, 44);
      for (let i = 0; i < 7; i++) {
        const a = -1.3 + i * 0.43, d = 10 + (1 - fade) * 28;
        ctx.fillRect(Math.round(SOUL_X + 15 + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 4, 4);
      }
      ctx.globalAlpha = 1;
    }
  }
}

function drawAcid(ctx, front, y, mouthX, mouthY, time) {
  for (let x = front; x <= mouthX; x += 4) {
    const f = (x - front) / Math.max(1, mouthX - front), cy = Math.round(y + (mouthY - y) * f);
    const half = 18 + Math.round(Math.sin(x * 0.12 + time * 22) * 4);
    ctx.fillStyle = COLORS.purple; ctx.fillRect(x, cy - half, 4, half * 2);
    ctx.fillStyle = COLORS.core; ctx.fillRect(x, cy - 5, 4, 10);
  }
}

function drawCharge(ctx, elapsed, focus) {
  const total = BARON_CANNON.chargeSeconds + BARON_CANNON.focusSeconds;
  ctx.fillStyle = COLORS.line; ctx.fillRect(16, 28, 138, 6);
  ctx.fillStyle = COLORS.white; ctx.fillRect(16, 28, Math.round(138 * Math.min(1, elapsed / BARON_CANNON.chargeSeconds)), 6);
  const remaining = (focus ? total : BARON_CANNON.chargeSeconds) - elapsed;
  ctx.fillText(L.battle_cannon_guard_seconds(Math.ceil(Math.max(0, remaining))), 62, 8);
  if (!focus) return;
  const f = clamp((elapsed - BARON_CANNON.chargeSeconds) / BARON_CANNON.focusSeconds, 0, 1);
  for (let i = 0; i < 14; i++) {
    const a = i * Math.PI * 2 / 14 + elapsed * 2.5;
    const radius = 12 + ((i / 14 + 1 - f * 2) % 1 + 1) % 1 * 60;
    const x = Math.round(MUZZLE_X + Math.cos(a) * radius), y = Math.round(MUZZLE_Y + Math.sin(a) * radius);
    ctx.fillStyle = i % 2 ? COLORS.white : COLORS.core; ctx.fillRect(x, y, 3 + Math.round(f * 3), 3 + Math.round(f * 3));
  }
  ctx.fillStyle = COLORS.white;
  const r = 3 + Math.round(f * 9); ctx.fillRect(MUZZLE_X - r, MUZZLE_Y - r, r * 2, r * 2);
}

function drawCannonFire(ctx, time, recoil, hitShake) {
  const reach = clamp(time / 0.45, 0, 1), tail = clamp((BARON_CANNON.fireSeconds - time) / 0.45, 0, 1);
  const start = Math.round(MUZZLE_X + recoil), target = MOUTH_X + hitShake;
  const end = Math.round(start + (target - start) * reach);
  for (let x = start; x < end; x += 4) {
    const h = Math.round((18 + Math.sin(x * 0.16 - time * 30) * 5) * tail);
    ctx.fillStyle = COLORS.core; ctx.fillRect(x, MOUTH_Y - h, 4, h * 2);
    ctx.fillStyle = COLORS.white; ctx.fillRect(x, MOUTH_Y - Math.round(h * 0.6), 4, Math.round(h * 1.2));
  }
  if (reach === 1) for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + time, d = 18 + (time * 40 + i * 7) % 42;
    ctx.fillStyle = i % 2 ? COLORS.white : COLORS.core;
    ctx.fillRect(Math.round(target + Math.cos(a) * d), Math.round(MOUTH_Y + Math.sin(a) * d), 5, 5);
  }
}
