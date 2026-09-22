import { monoPortrait } from '../core/gfx.js';
import { FONT } from '../ui/font.js';

const TAU = Math.PI * 2;
const WHITE = new WeakMap();
const FASHION_ALPHA = new WeakMap();
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function clipArena(ctx, box) {
  ctx.beginPath(); ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6); ctx.clip();
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy || 1;
  const u = clamp(((px - ax) * dx + (py - ay) * dy) / length, 0, 1);
  return Math.hypot(px - ax - dx * u, py - ay - dy * u);
}

function whiteImage(image) {
  if (!image) return null;
  if (!WHITE.has(image)) {
    try { WHITE.set(image, monoPortrait(image, { scale: 1, threshold: 0.45 })); }
    catch { WHITE.set(image, null); }
  }
  return WHITE.get(image);
}

function micShape(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y - 20, 9, 0, TAU);
  ctx.rect(x - 9, y - 12, 18, 33);
  ctx.rect(x + 7, y - 8, 15, 7);
  ctx.rect(x - 8, y + 19, 6, 14);
  ctx.rect(x + 2, y + 19, 6, 14);
}

function micHit(b, soul) {
  if (b.age < b.warn) return false;
  const dx = soul.x - b.x, dy = soul.y - b.y, r = soul.r;
  const head = Math.hypot(dx, dy + 20) <= 9 + r;
  const torso = dx >= -9 - r && dx <= 9 + r && dy >= -12 - r && dy <= 21 + r;
  const arm = dx >= 7 - r && dx <= 22 + r && dy >= -8 - r && dy <= -1 + r;
  const legs = ((dx >= -8 - r && dx <= -2 + r) || (dx >= 2 - r && dx <= 8 + r)) && dy >= 19 - r && dy <= 33 + r;
  return head || torso || arm || legs;
}

function drawMic(ctx, b) {
  if (b.age < b.warn) {
    ctx.save(); clipArena(ctx, b.box); ctx.strokeStyle = Math.floor(b.age * 12) % 2 ? '#ff77b5' : '#ffd1e6'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); micShape(ctx, b.x, b.y); ctx.stroke(); ctx.restore();
    return;
  }
  ctx.save(); clipArena(ctx, b.box); micShape(ctx, b.x, b.y); ctx.clip();
  const image = whiteImage(b.image);
  if (image) { const fw = image.width / 2, fh = image.height / 2, frame = Math.floor((b.age - b.warn) * 5.5) % 4;
    const dw = fw * b.spriteScale, dh = fh * b.spriteScale, footY = b.y + 33;
    ctx.drawImage(image, frame % 2 * fw, Math.floor(frame / 2) * fh, fw, fh,
      Math.round(b.x - b.spritePivot[0] * b.spriteScale), Math.round(footY - b.spritePivot[1] * b.spriteScale), Math.round(dw), Math.round(dh)); }
  else { ctx.fillStyle = '#fff'; ctx.fillRect(b.x - 24, b.y - 36, 48, 72); }
  ctx.restore();
  ctx.save(); clipArena(ctx, b.box); ctx.fillStyle = '#000'; ctx.fillRect(b.x - 5, b.y - 22, 3, 2); ctx.fillRect(b.x + 2, b.y - 22, 3, 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(b.x + 18, b.y - 8, 3, 17); ctx.fillRect(b.x + 15, b.y + 7, 9, 3); ctx.restore();
}

function lyricBullet(api, text, order, lane, direction, options) {
  const box = { ...api.box }, warn = Math.max(0.3, options.warn ?? 0.45), speed = options.speed ?? 112;
  const w = Math.min(box.w - 10, text.length * 11 + 10), h = 15;
  const spawnX = direction > 0 ? box.x - 34 : box.x + box.w + 34;
  api.emit({ shape: 'choimis_lyric', text, order, lane, direction, spawnX, x: spawnX, y: box.y + lane,
    w, h, r: 0, warn, life: warn + (box.w + 68) / speed, box,
    steer(b) { b.x = b.spawnX + b.direction * Math.max(0, b.age - b.warn) * speed; },
    hitShape(b, soul) {
      if (b.age < b.warn) return false;
      return Math.abs(soul.x - b.x) <= b.w / 2 + soul.r - 2 && Math.abs(soul.y - b.y) <= b.h / 2 + soul.r - 2;
    },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box); ctx.font = FONT.replace(/^\d+px/, '11px'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (b.age < b.warn) {
        ctx.strokeStyle = '#ff83bc'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath();
        ctx.moveTo(box.x + 4, b.y); ctx.lineTo(box.x + box.w - 4, b.y); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = b.age < b.warn ? '#ff83bc' : '#fff'; ctx.fillText(b.text, Math.round(b.x), Math.round(b.y));
      ctx.restore();
    },
  });
}

function breathBullet(api, index, options) {
  const box = { ...api.box }, edge = ['left', 'top', 'right', 'bottom'][index % 4];
  const warn = Math.max(0.3, options.warn ?? 0.45), flight = options.flight ?? 1.05;
  const along = [0.06, 0.5, 0.94][Math.floor(index / 4)];
  const from = edge === 'left' ? { x: box.x - 32, y: box.y + box.h * along }
    : edge === 'right' ? { x: box.x + box.w + 32, y: box.y + box.h * along }
      : edge === 'top' ? { x: box.x + box.w * along, y: box.y - 32 }
        : { x: box.x + box.w * along, y: box.y + box.h + 32 };
  const target = { x: box.x + box.w / 2 + ((index % 3) - 1) * 18, y: box.y + box.h / 2 + ((index % 2) ? 15 : -15) };
  const control = edge === 'left' ? { x: box.x + 54, y: from.y } : edge === 'right' ? { x: box.x + box.w - 54, y: from.y }
    : edge === 'top' ? { x: from.x, y: box.y + 54 } : { x: from.x, y: box.y + box.h - 54 };
  api.emit({ shape: 'choimis_breath', x: from.x, y: from.y, from, control, target, fromEdge: edge,
    r: 6, warn, flight, life: warn + flight + 0.05, box,
    steer(b) { const u = clamp((b.age - b.warn) / b.flight, 0, 1), v = 1 - u; b.x = v * v * b.from.x + 2 * v * u * b.control.x + u * u * b.target.x; b.y = v * v * b.from.y + 2 * v * u * b.control.y + u * u * b.target.y; },
    hitShape(b, soul) { return b.age >= b.warn && Math.hypot(soul.x - b.x, soul.y - b.y) <= b.r + soul.r - 2; },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box);
      if (b.age < b.warn) { ctx.strokeStyle = '#ff78b0'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(b.from.x, b.from.y); ctx.quadraticCurveTo(b.control.x, b.control.y, b.target.x, b.target.y); ctx.stroke(); ctx.setLineDash([]); }
      ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(Math.atan2(b.target.y - b.from.y, b.target.x - b.from.x));
      ctx.fillStyle = '#fff'; ctx.fillRect(-8, -2, 16, 4); ctx.fillRect(-3, -5, 7, 10); ctx.restore();
    },
  });
}

function fingerBeam(api, volley, options) {
  const box = { ...api.box }, warn = Math.max(0.3, options.beamWarn ?? 0.55), hit = options.beamHit ?? 0.35;
  const from = { x: box.x + box.w / 2 + 18, y: box.y + box.h / 2 - 5 };
  const lockedTarget = { x: api.soul.x, y: api.soul.y + (volley % 3 - 1) * 16 };
  const angle = Math.atan2(lockedTarget.y - from.y, lockedTarget.x - from.x), end = { x: from.x + Math.cos(angle) * 320, y: from.y + Math.sin(angle) * 320 };
  api.emit({ shape: 'choimis_finger_beam', x: from.x, y: from.y, from, end, lockedTarget,
    fromEdge: 'center', r: 0, warn, life: warn + hit, width: 8, box,
    hitShape(b, soul) { return b.age >= b.warn && segmentDistance(soul.x, soul.y, b.from.x, b.from.y, b.end.x, b.end.y) <= soul.r + b.width / 2 - 2; },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box); ctx.strokeStyle = b.age < b.warn ? '#ff70ad' : '#fff'; ctx.lineWidth = b.age < b.warn ? 1 : b.width;
      if (b.age < b.warn) ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(b.from.x, b.from.y); ctx.lineTo(b.end.x, b.end.y); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    },
  });
}

const OUTFITS = [
  { profile: 'pink_leopard_suit', bbox: [17, 8, 79, 88] },
  { profile: 'pink_zebra_coat', bbox: [15, 6, 80, 90] },
  { profile: 'pink_checker_idol', bbox: [15, 14, 81, 81] },
  { profile: 'pink_heart_star_jumpsuit', bbox: [15, 6, 80, 89] },
];

function fashionFrames(image) {
  if (!image || typeof document === 'undefined') return null;
  if (FASHION_ALPHA.has(image)) return FASHION_ALPHA.get(image);
  let frames = null;
  try {
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    const fw = image.width / 2, fh = image.height / 2;
    frames = OUTFITS.map((style, look) => {
      const alpha = new Uint8Array(fw * fh), ox = look % 2 * fw, oy = Math.floor(look / 2) * fh;
      let left = fw, top = fh, right = 0, bottom = 0;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        if (pixels[((oy + y) * image.width + ox + x) * 4 + 3] < 128) continue;
        alpha[y * fw + x] = 1; left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
      }
      return right > left && bottom > top ? { alpha, fw, fh, bbox: [left, top, right, bottom] } : { alpha, fw, fh, bbox: style.bbox };
    });
  } catch { frames = null; }
  FASHION_ALPHA.set(image, frames); return frames;
}

function outfitHit(b, soul) {
  if (b.alphaFrame) {
    const { alpha, fw, bbox } = b.alphaFrame, [left, top, right, bottom] = bbox;
    const pixelW = b.w / (right - left), pixelH = b.h / (bottom - top), drawLeft = b.x - b.w / 2, drawTop = b.y - b.h / 2;
    const sx0 = clamp(Math.floor(left + (soul.x - soul.r - drawLeft) / pixelW), left, right - 1);
    const sx1 = clamp(Math.ceil(left + (soul.x + soul.r - drawLeft) / pixelW), left, right - 1);
    const sy0 = clamp(Math.floor(top + (soul.y - soul.r - drawTop) / pixelH), top, bottom - 1);
    const sy1 = clamp(Math.ceil(top + (soul.y + soul.r - drawTop) / pixelH), top, bottom - 1);
    for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) {
      if (!alpha[y * fw + x]) continue;
      const wx = drawLeft + (x - left + 0.5) * pixelW, wy = drawTop + (y - top + 0.5) * pixelH;
      if (Math.hypot(soul.x - wx, soul.y - wy) <= soul.r + Math.max(pixelW, pixelH) / 2) return true;
    }
    return false;
  }
  const dx = Math.abs(soul.x - b.x), dy = soul.y - b.y, r = soul.r;
  if (b.look === 0) return (dx <= b.w * 0.32 + r && dy >= -b.h / 2 - r && dy <= b.h * 0.36 + r)
    || (dx >= b.w * 0.1 - r && dx <= b.w * 0.42 + r && dy >= b.h * 0.2 - r && dy <= b.h / 2 + r);
  if (b.look === 1) return dy >= -b.h / 2 - r && dy <= b.h / 2 + r && dx <= (dy + b.h / 2) / b.h * b.w / 2 + r;
  if (b.look === 2) return (dx <= b.w * 0.3 + r && dy >= -b.h / 2 - r && dy <= 0 + r)
    || (dx >= b.w * 0.1 - r && dx <= b.w * 0.38 + r && dy >= -r && dy <= b.h / 2 + r);
  return (dx / (b.w / 2 + r)) ** 2 + ((dy + b.h * 0.1) / (b.h * 0.24 + r)) ** 2 <= 1
    || (dx <= b.w * 0.25 + r && dy >= -b.h / 2 - r && dy <= b.h / 2 + r);
}

function outfitBullet(api, look, direction, options) {
  const box = { ...api.box }, style = OUTFITS[look], alphaFrame = fashionFrames(api.images?.fashion)?.[look];
  const sourceBbox = alphaFrame?.bbox || style.bbox, sourceW = sourceBbox[2] - sourceBbox[0], sourceH = sourceBbox[3] - sourceBbox[1];
  const scale = Math.min(48 / sourceW, 60 / sourceH), w = Math.round(sourceW * scale), h = Math.round(sourceH * scale);
  const warn = Math.max(0.3, options.warn ?? 0.55), speed = options.speed ?? 126;
  const lanes = [box.y + 35, box.y + box.h - 34, box.y + 61, box.y + box.h - 36], spawnX = direction > 0 ? box.x - 34 : box.x + box.w + 34;
  api.emit({ shape: 'choimis_outfit', look, profile: style.profile, direction, spawnX, x: spawnX, y: lanes[look],
    w, h, sourceBbox, alphaFrame, r: 0, warn, flight: (box.w + 68) / speed, life: warn + (box.w + 68) / speed, box, image: api.images?.fashion,
    steer(b) { b.x = b.spawnX + b.direction * Math.max(0, b.age - b.warn) * speed; },
    hitShape(b, soul) { return b.age >= b.warn && outfitHit(b, soul); },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box);
      if (b.age < b.warn) { ctx.strokeStyle = '#ff67ad'; ctx.setLineDash([4, 4]); ctx.strokeRect(box.x + 4, b.y - b.h / 2, box.w - 8, b.h); ctx.setLineDash([]); }
      if (b.image) { const fw = b.image.width / 2, fh = b.image.height / 2, [sx, sy, right, bottom] = b.sourceBbox;
        ctx.drawImage(b.image, b.look % 2 * fw + sx, Math.floor(b.look / 2) * fh + sy, right - sx, bottom - sy,
          Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2), b.w, b.h); }
      else { ctx.fillStyle = b.look % 2 ? '#ff5aa8' : '#ff9ace'; ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h); }
      ctx.restore();
    },
  });
}

/** 최미스 하늘 보스 후반 세 패턴. 모든 빠른 위협은 고정 예고 뒤 같은 경로로 움직인다. */
export const CHOIMIS_PATTERNS_B = {
  choimis_rap: (options = {}) => {
    const duration = options.duration ?? 8.4;
    const chunks = ['요', '최미스', '래퍼딱지를', '때', '이젠', '앰씨로', '포에버', '포에버'];
    const lanes = [16, 48, 132, 102, 16, 102, 48, 132];
    let started = false, index = 0;
    return { duration, update(t, dt, api) {
      if (!started) { started = true; const box = { ...api.box }; api.emit({ shape: 'choimis_mic', x: box.x + box.w / 2, y: box.y + box.h / 2, r: 0,
        warn: Math.max(0.3, options.micWarn ?? 0.45), life: duration + 0.1, box, image: api.images?.mic,
        spriteScale: options.micScale ?? 0.506, spritePivot: [80, 152], sourceBodyHeight: 123, hitShape: micHit, drawShape: drawMic }); }
      while (index < chunks.length && t >= 0.55 + index * 0.82) { lyricBullet(api, chunks[index], index, lanes[index], index % 2 ? -1 : 1, options); index++; }
    } };
  },

  choimis_seup: (options = {}) => {
    const duration = options.duration ?? 6.4;
    let started = false, ended = false, breath = 0, beam = 0;
    return { duration, update(t, dt, api) {
      if (!started) { started = true; api.sfx?.('choimis_seup_miss'); api.present?.({ sheet: 'idle', frame: 0 }); }
      while (breath < 12 && t >= 0.35 + breath * 0.29) { breathBullet(api, breath, options); breath++; }
      while (beam < 3 && t >= 2.05 + beam * 1.15) { fingerBeam(api, beam, options); beam++; }
      if (!ended && t >= duration - 0.2) { ended = true; api.present?.(null); }
    } };
  },

  choimis_fashion: (options = {}) => {
    const duration = options.duration ?? 7.5;
    let ended = false, look = 0;
    return { duration, update(t, dt, api) {
      while (look < OUTFITS.length && t >= 0.35 + look * 1.55) { api.present?.({ sheet: 'idle', frame: look }); outfitBullet(api, look, look % 2 ? -1 : 1, options); look++; }
      if (!ended && t >= duration - 0.2) { ended = true; api.present?.(null); }
    } };
  },
};
