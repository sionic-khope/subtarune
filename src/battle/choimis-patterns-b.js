import { monoPortrait } from '../core/gfx.js';
import { FONT } from '../ui/font.js';
import { CHOIMIS_RAP_VIDEO } from './choimis-rap-video.js';

const TAU = Math.PI * 2;
const WHITE = new WeakMap();
const FASHION_ALPHA = new WeakMap();
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function clipArena(ctx, box) {
  ctx.beginPath(); ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6); ctx.clip();
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

function lyricBullet(api, text, order, column, options, timing) {
  const box = { ...api.box }, warn = Math.max(0.3, options.warn ?? 0.48), speed = options.speed ?? 136;
  const fontSize = options.fontSize ?? 14, w = /[\uAC00-\uD7A3]/u.test(text) ? fontSize : fontSize * 0.65, h = fontSize;
  const x = box.x + box.w * column, spawnY = box.y + fontSize / 2 + 3;
  api.emit({ shape: 'choimis_lyric', text, lines: [text], fontSize, order, column, direction: 'down', spawnY, x, y: spawnY,
    w, h, r: 0, warn, age: timing.age, fallAt: timing.fallAt, safeColumns: timing.safeColumns, life: warn + (box.h + fontSize) / speed, box,
    steer(b) { b.y = b.spawnY + Math.max(0, b.age - b.warn) * speed; },
    hitShape(b, soul) {
      if (b.age < b.warn || b.age >= b.life || soul.x < box.x + 3 || soul.x > box.x + box.w - 3
        || soul.y < box.y + 3 || soul.y > box.y + box.h - 3) return false;
      const dx = Math.max(0, Math.abs(soul.x - b.x) - b.w / 2), dy = Math.max(0, Math.abs(soul.y - b.y) - b.h / 2);
      return Math.hypot(dx, dy) <= Math.max(0, soul.r - 2);
    },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box); ctx.font = FONT.replace(/^\d+px/, `${b.fontSize}px`); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (b.age < b.warn) {
        ctx.strokeStyle = '#ff83bc'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.strokeRect(Math.round(b.x - b.w / 2), box.y + 4, b.w, box.h - 8); ctx.setLineDash([]);
      }
      ctx.fillStyle = b.age < b.warn ? '#ff83bc' : '#fff';
      ctx.fillText(b.text, Math.round(b.x), Math.round(b.y));
      ctx.restore();
    },
  });
}

function missBullet(api, wave, slot, safeGap, options) {
  const box = { ...api.box }, direction = wave % 2 ? -1 : 1;
  const warn = Math.max(0.3, options.warn ?? 0.42), speed = options.missSpeed ?? 280;
  const w = 54, h = 22, edgeOffset = 34;
  const yOffsets = safeGap === 'bottom' ? [18, 52, 86] : [box.h - 18, box.h - 52, box.h - 86];
  const spawnX = direction > 0 ? box.x - edgeOffset : box.x + box.w + edgeOffset;
  const flight = (box.w + edgeOffset * 2) / speed;
  api.emit({ shape: 'choimis_miss', text: 'MISS', wave, slot, safeGap, direction,
    fromEdge: direction > 0 ? 'left' : 'right', spawnX, x: spawnX, y: box.y + yOffsets[slot],
    w, h, r: 0, warn, flight, life: warn + flight, box,
    steer(b) { b.x = b.spawnX + b.direction * Math.max(0, b.age - b.warn) * speed; },
    hitShape(b, soul) {
      if (b.age < b.warn) return false;
      const cx = clamp(soul.x, b.x - b.w / 2, b.x + b.w / 2);
      const cy = clamp(soul.y, b.y - b.h / 2, b.y + b.h / 2);
      return Math.hypot(soul.x - cx, soul.y - cy) <= Math.max(0, soul.r - 2);
    },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box); ctx.font = FONT.replace(/^\d+px/, '14px'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (b.age < b.warn) {
        ctx.strokeStyle = '#ff70ad'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.strokeRect(box.x + 4, Math.round(b.y - b.h / 2), box.w - 8, b.h); ctx.setLineDash([]);
        ctx.fillStyle = '#ff85bd'; ctx.fillText(b.text, Math.round(b.x), Math.round(b.y + 1));
      } else {
        ctx.fillStyle = '#ff4f9c'; ctx.fillRect(Math.round(b.x - b.w / 2), Math.round(b.y - b.h / 2), b.w, b.h);
        ctx.fillStyle = '#8f174f'; ctx.fillRect(Math.round(b.x - b.w / 2 + 2), Math.round(b.y - b.h / 2 + 2), b.w - 4, b.h - 4);
        ctx.fillStyle = '#fff'; ctx.fillText(b.text, Math.round(b.x), Math.round(b.y + 1));
      }
      ctx.restore();
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

function outfitBullet(api, look, direction, entryAt, safeGap, options) {
  const box = { ...api.box }, style = OUTFITS[look], alphaFrame = fashionFrames(api.images?.fashion)?.[look];
  const sourceBbox = alphaFrame?.bbox || style.bbox, sourceW = sourceBbox[2] - sourceBbox[0], sourceH = sourceBbox[3] - sourceBbox[1];
  const scale = Math.min(48 / sourceW, 60 / sourceH), w = Math.round(sourceW * scale), h = Math.round(sourceH * scale);
  const warn = Math.max(0.3, options.warn ?? 0.55), speed = options.speed ?? 126;
  const lanes = [box.y + 31, box.y + box.h - 31, box.y + 58, box.y + box.h - 58], spawnX = direction > 0 ? box.x - 34 : box.x + box.w + 34;
  api.emit({ shape: 'choimis_outfit', look, profile: style.profile, direction, entryAt, safeGap, spawnX, x: spawnX, y: lanes[look],
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
    const duration = 19;
    const glyphs = Array.from(options.lyrics ?? '').filter(glyph => !/\s/u.test(glyph));
    const columns = [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95];
    const warn = Math.max(0.3, options.warn ?? 0.48), start = Math.max(3, options.lyricStart ?? 3);
    const every = options.every ?? 0.085, burstSize = options.burstSize ?? 7, burstPause = options.burstPause ?? 0.45;
    let started = false, ended = false, video = null, index = 0;
    return { duration, update(t, dt, api) {
      if (!started) { started = true; video = api.startRapVideo?.(CHOIMIS_RAP_VIDEO) || null;
        const box = { ...api.box }; api.emit({ shape: 'choimis_mic', x: box.x + box.w / 2, y: box.y + box.h / 2, r: 0,
        warn: Math.max(start, options.micWarn ?? 3), life: duration + 0.1, box, image: api.images?.mic,
        spriteScale: options.micScale ?? 0.506, spritePivot: [80, 152], sourceBodyHeight: 123, hitShape: micHit, drawShape: drawMic }); }
      api.syncRapVideo?.(video, t);
      while (glyphs.length && t < duration) {
        const burst = Math.floor(index / burstSize), slot = index % burstSize;
        const fallAt = start + index * every + burst * burstPause, at = fallAt - warn;
        if (t < at || fallAt + (api.box.h + (options.fontSize ?? 14)) / (options.speed ?? 136) >= duration - 0.2) break;
        const gap = Math.floor(burst / 3) % 2 ? 5 : 0, safeColumns = columns.slice(gap, gap + 2);
        const lanes = columns.filter((column, lane) => lane < gap || lane >= gap + 2);
        const column = lanes[(slot * 2 + burst) % lanes.length];
        lyricBullet(api, glyphs[index % glyphs.length], index, column, options, { age: t - at, fallAt, safeColumns }); index++;
      }
      if (!ended && t + dt >= duration) { ended = true; api.stopRapVideo?.(video); }
    } };
  },

  choimis_seup: (options = {}) => {
    const duration = options.duration ?? 6.4;
    const waves = [
      { at: 0.8, safeGap: 'bottom' }, { at: 2.15, safeGap: 'top' },
      { at: 3.5, safeGap: 'bottom' }, { at: 4.85, safeGap: 'top' },
    ];
    let started = false, ended = false, miss = 0;
    return { duration, update(t, dt, api) {
      if (!started) { started = true; api.sfx?.('choimis_seup_miss'); api.present?.({ sheet: 'idle', frame: 0 }); }
      while (miss < waves.length * 3) { const wave = Math.floor(miss / 3), slot = miss % 3, spec = waves[wave];
        if (t < spec.at + slot * 0.12) break; missBullet(api, wave, slot, spec.safeGap, options); miss++; }
      if (!ended && t >= duration - 0.2) { ended = true; api.present?.(null); }
    } };
  },

  choimis_fashion: (options = {}) => {
    const duration = options.duration ?? 7.5;
    const remarkDelay = Math.max(0.3, options.warn ?? 0.55);
    const entries = [
      { at: 0.35, safeGap: 'bottom' }, { at: 1.55, safeGap: 'top' },
      { at: 2.65, safeGap: 'bottom' }, { at: 4, safeGap: 'top' },
    ];
    let ended = false, look = 0, remark = 0;
    return { duration, update(t, dt, api) {
      while (look < OUTFITS.length && t >= entries[look].at) { const entry = entries[look]; api.present?.({ sheet: 'idle', frame: look });
        outfitBullet(api, look, look % 2 ? -1 : 1, entry.at, entry.safeGap, options); look++; }
      while (remark < entries.length && t >= entries[remark].at + remarkDelay) {
        if (options.lines?.[remark]) api.say?.(options.lines[remark], 1);
        remark++;
      }
      if (!ended && t >= duration - 0.2) { ended = true; api.present?.(null); }
    } };
  },
};
