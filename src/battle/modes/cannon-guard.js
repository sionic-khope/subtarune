import { BARON_CANNON } from '../../data/baron-cannon.js';
import { FONT } from '../../ui/font.js';
import { drawHeart } from '../../core/gfx.js';
import L from '../../data/locale/ko.js';

export const GUARD_BOARD = Object.freeze({ x: 8, y: 12, w: 464, h: 304 });
export const GUARD_LANES = Object.freeze([78, 162, 246]);
const SOUL_X = 166, MOUTH_X = 340, MOUTH_Y = 166, MUZZLE_X = 105, MUZZLE_Y = 162;
const WARN = 0.6, TRAVEL = 1.1, BLOCK_FLASH = 0.28;
const FRAME_ENTER = 0.65, HELPERS_ENTER = 2, BARON_ENTER = 1.3;
const ENTRY_SECONDS = FRAME_ENTER + HELPERS_ENTER + BARON_ENTER;
const ROWS = [1, 0, 2, 1, 2, 0, 1, 0, 2, 1, 0, 2];
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
  return ROWS.map((lane, i) => ({ lane, at: 0.1 + i * 0.9, warn: WARN, travel: TRAVEL, launched: false, resolved: false, blocked: false }));
}

export function cannonShotPosition(time) {
  const progress = clamp(time / BARON_CANNON.shotTravelSeconds, 0, 1);
  return { x: Math.round(MUZZLE_X + (MOUTH_X - MUZZLE_X) * progress), y: Math.round(MUZZLE_Y + (MOUTH_Y - MUZZLE_Y) * progress), arrived: progress === 1 };
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
        entryStage: phase !== 'enter' ? 'complete' : phaseTime < FRAME_ENTER ? 'frame' : phaseTime < FRAME_ENTER + HELPERS_ENTER ? 'helpers' : 'baron',
        projectile: phase === 'fire' ? cannonShotPosition(phaseTime) : null,
        breaths: breaths.map((b) => ({ ...b })), assetsReady: Object.values(art).every((a) => a.ready) };
    },
    update(dt, input) {
      if (disposed || phase === 'done') return true;
      phaseTime += dt;
      if (phase === 'enter') {
        if (!Object.values(art).every((a) => a.ready)) phaseTime = Math.min(phaseTime, FRAME_ENTER);
        if (phaseTime >= ENTRY_SECONDS) line('charge', 'charge-dialogue');
      } else if (phase === 'charge-dialogue') {
        if (phaseTime >= 0.2 && battle.typed && input.just('confirm')) line('controls', 'controls-dialogue');
      } else if (phase === 'controls-dialogue') {
        advanceDialogue(input, 'guard');
        if (phase === 'guard') battle.sfx('baron_roar');
      } else if (guarding()) {
        move(dt, input);
        elapsed += dt;
        for (const breath of breaths) {
          if (!breath.launched && elapsed >= breath.at + breath.warn) {
            breath.launched = true;
            battle.sfx('cannon_guard_breath');
          }
          if (breath.resolved || elapsed < breath.at + breath.warn + breath.travel) continue;
          breath.resolved = true;
          if (breath.lane !== lane) { battle.sfx('baron_slam'); line('failure', 'failure-dialogue'); return false; }
          breath.blocked = true;
          blocked++;
          battle.sfx('cannon_guard_block');
        }
        if (phase === 'guard' && elapsed >= BARON_CANNON.chargeSeconds - BARON_CANNON.focusSeconds) {
          change('focus');
          battle.sfx('cannon_guard_charge');
        }
        if (elapsed >= BARON_CANNON.chargeSeconds) {
          change('fire');
          battle.sfx('cannon_guard_fire');
        }
      } else if (phase === 'fire') {
        if (!damageApplied && cannonShotPosition(phaseTime).arrived) {
          damageApplied = true;
          battle.applyCannonDamage(target, BARON_CANNON.damage);
          battle.sfx('baron_slam');
          battle.showLine(BARON_CANNON.dialogue.damage);
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
      const entry = phase === 'enter' ? ease(phaseTime / FRAME_ENTER) : 1;
      drawBoard(ctx, entry, lane);
      const helperEntry = phase === 'enter' ? clamp((phaseTime - FRAME_ENTER) / HELPERS_ENTER, 0, 1) : 1;
      const baronEntry = phase === 'enter' ? clamp((phaseTime - FRAME_ENTER - HELPERS_ENTER) / BARON_ENTER, 0, 1) : 1;
      let leftX = 470 * (1 - helperEntry), leftY = 0, rotation = 0;
      if (phase === 'leave') leftX = -190 * ease(phaseTime / 0.85);
      if (phase === 'fly') { leftX = -260 * phaseTime; leftY = -220 * phaseTime + 60 * phaseTime ** 2; rotation = -phaseTime * 7; }
      const walking = (phase === 'enter' && helperEntry > 0 && helperEntry < 1) || phase === 'leave';
      const yongjunFrame = walking ? Math.floor(phaseTime / 0.16) % 2 : phase === 'success-dialogue' ? 3 : phase === 'focus' || phase === 'fire' ? 2 : 0;
      const cannonFrame = phase === 'focus' ? 1 : phase === 'fire' ? 2 + Math.floor(phaseTime / 0.14) % 2 : 0;
      ctx.save();
      ctx.beginPath(); ctx.rect(10, 14, 460, 300); ctx.clip();
      ctx.save();
      ctx.translate(Math.round(64 + leftX), Math.round(173 + leftY)); ctx.rotate(rotation);
      if (walking) ctx.scale(-1, 1);
      drawFrame(ctx, art.yongjun.image, yongjunFrame, 96, -54, -37, 0.625);
      const recoil = phase === 'fire' ? -Math.max(0, 7 - phaseTime * 9) : 0;
      drawFrame(ctx, art.cannon.image, cannonFrame, 128, -32 + recoil, -58, 0.625);
      ctx.restore();
      const hitShake = phase === 'fire' && damageApplied ? Math.round(Math.sin(phaseTime * 57) * Math.max(0, 6 - phaseTime * 2)) : 0;
      const exhaling = guarding() && breaths.some((b) => elapsed >= b.at + b.warn && elapsed <= b.at + b.warn + b.travel + BLOCK_FLASH);
      const baronFrame = phase === 'fire' && damageApplied ? 3 : exhaling ? 2 : guarding() ? 1 : 0;
      drawFrame(ctx, art.baron.image, baronFrame, 192, 288 + Math.round(192 * (1 - baronEntry)) + hitShake, 50);
      ctx.restore();
      if (!['failure-dialogue', 'fly', 'leave', 'done'].includes(phase)) {
        if (guarding()) for (const breath of breaths) drawBreath(ctx, breath, elapsed);
        if (guarding() || phase.endsWith('-dialogue')) {
          ctx.save(); ctx.translate(SOUL_X - 7, GUARD_LANES[lane] - 7); ctx.scale(2, 2);
          drawHeart(ctx, 0, 0, COLORS.heart); ctx.restore();
        }
      }
      if (guarding()) {
        drawCharge(ctx, elapsed, phase === 'focus');
        ctx.fillStyle = COLORS.white;
        ctx.fillText(L.battle_cannon_guard_hint, 134, 326);
      }
      if (phase === 'fire') drawCannonFire(ctx, phaseTime, hitShake, art.shot?.image);
      if (phase === 'failure-dialogue' && phaseTime < 0.35) {
        const miss = breaths.find((b) => b.resolved && !b.blocked), k = clamp(phaseTime / 0.2, 0, 1);
        const x = SOUL_X + (MUZZLE_X - SOUL_X) * k, fromY = GUARD_LANES[miss.lane];
        const y = fromY + (MUZZLE_Y - fromY) * k;
        if (art.acid?.image) drawFrame(ctx, art.acid.image, Math.floor(phaseTime / 0.08) % 4, 64, x - 26, y - 26, 0.8125);
        else pixelGlobule(ctx, x, y, 24, COLORS.purple);
      }
      if (phase.endsWith('-dialogue') || (phase === 'fire' && damageApplied)) battle.drawTextBox(ctx);
      ctx.restore();
    },
    dispose() { disposed = true; },
  };
  return mode;
}

function drawFrame(ctx, image, frame, cell, x, y, scale = 1) {
  if (!image) return;
  ctx.drawImage(image, (frame % 2) * cell, Math.floor(frame / 2) * cell, cell, cell, Math.round(x), Math.round(y), Math.round(cell * scale), Math.round(cell * scale));
}

function drawBoard(ctx, opening, lane) {
  const b = GUARD_BOARD, height = Math.round(72 + (b.h - 72) * opening), y = Math.round(b.y + (b.h - height) / 2);
  ctx.strokeStyle = COLORS.white; ctx.lineWidth = 2;
  ctx.strokeRect(b.x, y, b.w, height);
  if (opening < 0.95) return;
  ctx.strokeStyle = COLORS.line;
  for (const lineY of [120, 204]) { ctx.beginPath(); ctx.moveTo(b.x + 2, lineY); ctx.lineTo(b.x + b.w - 2, lineY); ctx.stroke(); }
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(SOUL_X - 16, GUARD_LANES[lane] - 11, 2, 22);
}

function drawBreath(ctx, breath, time) {
  const age = time - breath.at, y = GUARD_LANES[breath.lane];
  if (age < 0 || age > breath.warn + breath.travel + BLOCK_FLASH) return;
  if (age < breath.warn) {
    ctx.fillStyle = COLORS.purple; ctx.globalAlpha = 0.08;
    ctx.fillRect(10, y - 37, 460, 74);
    ctx.strokeStyle = COLORS.core; ctx.globalAlpha = 0.5 + age / breath.warn * 0.5;
    ctx.lineWidth = 2;
    for (let x = SOUL_X + 24; x < MOUTH_X - 20; x += 14) { ctx.fillStyle = COLORS.core; ctx.fillRect(x, y - 1, 6, 2); }
    ctx.beginPath(); ctx.moveTo(SOUL_X + 30, y - 7); ctx.lineTo(SOUL_X + 22, y); ctx.lineTo(SOUL_X + 30, y + 7); ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    const k = clamp((age - breath.warn) / breath.travel, 0, 1);
    const length = (MOUTH_X - SOUL_X - 12) * k;
    const afterBlock = breath.blocked ? clamp((age - breath.warn - breath.travel) / BLOCK_FLASH, 0, 1) : 0;
    ctx.globalAlpha = 1 - afterBlock;
    for (let d = Math.ceil(length * afterBlock / 2) * 2; d <= length; d += 2) {
      const u = d / Math.max(1, length), tip = clamp((length - d + 2) / 20, 0.1, 1);
      const wave = Math.sin(d * 0.12 - time * 21);
      const center = MOUTH_Y + (y - MOUTH_Y) * d / (MOUTH_X - SOUL_X - 12) + wave * Math.sin(u * Math.PI) * 4;
      const width = (5 + 13 * Math.sin(u * Math.PI * 0.8)) * tip;
      const upper = Math.max(2, Math.round((width + Math.sin(d * 0.27 - time * 17) * 4 * u * tip) / 2) * 2);
      const lower = Math.max(2, Math.round((width * 0.7 + Math.cos(d * 0.19 - time * 24) * 5 * u * tip) / 2) * 2);
      const x = Math.round(MOUTH_X - d), top = Math.round(center / 2) * 2 - upper;
      ctx.fillStyle = COLORS.line; ctx.fillRect(x, top - 2, 2, upper + lower + 4);
      ctx.fillStyle = COLORS.purple; ctx.fillRect(x, top, 2, upper + lower);
      const streak = (d - time * 115 + 10000) % 34;
      const coreY = Math.round((center + wave * 2 * u) / 2) * 2;
      ctx.fillStyle = COLORS.core;
      if (streak < 23 || d < 8) ctx.fillRect(x, coreY - 2, 2, Math.max(2, Math.round(width * 0.3 / 2) * 2));
      if (u > 0.2 && streak > 25 && width > 9) ctx.fillRect(x, top + 4, 2, 2);
    }
    ctx.globalAlpha = 1;
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

function drawCharge(ctx, elapsed, focus) {
  const total = BARON_CANNON.chargeSeconds, f = clamp(elapsed / total, 0, 1);
  ctx.fillStyle = COLORS.line; ctx.fillRect(20, 44, 96, 6);
  ctx.fillStyle = COLORS.white; ctx.fillRect(20, 44, Math.round(96 * f), 6);
  ctx.fillText(L.battle_cannon_guard_charging, 20, 22);
  ctx.fillText(L.battle_cannon_guard_seconds(Math.ceil(Math.max(0, total - elapsed))), 78, 22);
  const count = 8 + Math.floor(f * 8);
  for (let i = 0; i < count; i++) {
    const a = i * Math.PI * 2 / count + elapsed * (focus ? 3 : 1.8);
    const radius = 8 + ((i / count + 1 - elapsed * (focus ? 0.85 : 0.5)) % 1 + 1) % 1 * 32;
    const x = Math.round(MUZZLE_X + Math.cos(a) * radius), y = Math.round(MUZZLE_Y + Math.sin(a) * radius);
    ctx.fillStyle = i % 2 ? COLORS.white : COLORS.core; ctx.fillRect(x, y, 2 + Math.round(f * 3), 2 + Math.round(f * 3));
  }
  pixelGlobule(ctx, MUZZLE_X, MUZZLE_Y, 3 + Math.round(f * 11), COLORS.core);
  pixelGlobule(ctx, MUZZLE_X, MUZZLE_Y, 2 + Math.round(f * 6), COLORS.white);
}

function pixelGlobule(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  const r = Math.max(2, Math.round(radius));
  for (let dy = -r; dy < r; dy += 3) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy)) / 3) * 3;
    if (half) ctx.fillRect(Math.round(x - half), Math.round(y + dy), half * 2, 3);
  }
}

function drawCannonFire(ctx, time, hitShake, image) {
  const shot = cannonShotPosition(time);
  if (!shot.arrived) {
    for (let i = 3; i > 0; i--) pixelGlobule(ctx, shot.x - 18 - i * 7, shot.y, 10 - i * 2, i % 2 ? COLORS.core : COLORS.white);
    const scale = 0.35 + 0.65 * clamp(time / 0.25, 0, 1);
    if (image) drawFrame(ctx, image, Math.floor(time / 0.13) % 4, 96, shot.x - 48 * scale, shot.y - 48 * scale, scale);
    else { pixelGlobule(ctx, shot.x, shot.y, 36 * scale, COLORS.core); pixelGlobule(ctx, shot.x, shot.y, 25 * scale, COLORS.white); }
    return;
  }
  const impact = time - BARON_CANNON.shotTravelSeconds, fade = clamp(1 - impact / 1.15, 0, 1);
  const cx = MOUTH_X + hitShake;
  ctx.save();
  ctx.beginPath(); ctx.rect(228, 40, 232, 202); ctx.clip();
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, d = 16 + impact * (22 + i % 3 * 10);
    ctx.globalAlpha = Math.min(0.65, impact * 3) * fade;
    pixelGlobule(ctx, cx + Math.cos(a) * d, MOUTH_Y + Math.sin(a) * d - impact * 14, 10 + impact * 15, COLORS.line);
  }
  for (let ring = 0; ring < 2; ring++) {
    const age = impact - ring * 0.1;
    if (age < 0 || age > 0.65) continue;
    const radius = 22 + age * 112;
    ctx.globalAlpha = (1 - age / 0.65) * 0.85;
    ctx.fillStyle = ring ? COLORS.white : COLORS.core;
    for (let i = 0; i < 72; i++) {
      const a = i * Math.PI / 36;
      ctx.fillRect(Math.round((cx + Math.cos(a) * radius) / 3) * 3, Math.round((MOUTH_Y + Math.sin(a) * radius * 0.8) / 3) * 3, 3, 3);
    }
  }
  const burst = clamp(1 - impact / 0.42, 0, 1);
  if (burst > 0) {
    ctx.globalAlpha = burst;
    pixelBurst(ctx, cx, MOUTH_Y, 58 + impact * 65, 24, COLORS.purple);
    pixelBurst(ctx, cx, MOUTH_Y, 47 + impact * 45, 18, COLORS.core);
    pixelBurst(ctx, cx, MOUTH_Y, 32 * burst, 15 * burst, COLORS.white);
  }
  ctx.globalAlpha = fade;
  for (let i = 0; i < 32; i++) {
    const a = i * 2.4, d = 15 + impact * (58 + i % 5 * 16);
    const x = cx + Math.cos(a) * d, y = MOUTH_Y + Math.sin(a) * d + impact * impact * 22;
    ctx.fillStyle = i % 3 ? COLORS.core : COLORS.white;
    for (let tail = 0; tail < 3; tail++) {
      const size = tail ? 2 : 4;
      ctx.fillRect(Math.round(x - Math.cos(a) * tail * 4), Math.round(y - Math.sin(a) * tail * 4), size, size);
    }
  }
  ctx.restore();
  ctx.fillStyle = COLORS.white; ctx.fillText(String(BARON_CANNON.damage), MOUTH_X + 20, MOUTH_Y - 50 - Math.min(20, impact * 10));
}

function pixelBurst(ctx, x, y, outer, inner, color) {
  const points = Array.from({ length: 20 }, (_, i) => {
    const a = i * Math.PI / 10, r = i % 2 ? inner : outer * (0.78 + (i % 6) * 0.05);
    return [x + Math.cos(a) * r, y + Math.sin(a) * r];
  });
  ctx.fillStyle = color;
  for (let row = Math.floor((y - outer) / 3) * 3; row <= y + outer; row += 3) {
    const crossings = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
      if ((ay <= row && by > row) || (by <= row && ay > row)) crossings.push(ax + (row - ay) * (bx - ax) / (by - ay));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const left = Math.round(crossings[i] / 3) * 3, right = Math.round(crossings[i + 1] / 3) * 3;
      if (right > left) ctx.fillRect(left, row, right - left, 3);
    }
  }
}
