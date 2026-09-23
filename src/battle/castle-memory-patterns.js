// BUILD308: nine memory attacks; all warning geometry is owned by its later hit shape.
import { whiteSprite } from './youngcle-patterns.js';

export const MEMORY_TIMING = Object.freeze({ warn: 0.6, recovery: 0.32, duration: 6.4 });
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const point = (b, u, v) => ({ x: b.x + b.w * u, y: b.y + b.h * v });
const distanceToLine = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};

// This is a timeline only: each attack below owns its formation and escape rule.
function timeline(duration) {
  let next = 0, pulse = -10, sounded = false;
  return {
    duration,
    due(t, every, limit, action) {
      if (t >= next && t < limit) { next = t + every; pulse = t; sounded = false; action(); }
    },
    pose(t, api, sheet = 'cast') {
      const age = t - pulse;
      if (!sounded && age >= MEMORY_TIMING.warn && age < 2) { sounded = true; api.sfx?.('hit'); }
      api.present?.(age < MEMORY_TIMING.warn ? { sheet: 'cast', frame: 1 }
        : age < MEMORY_TIMING.warn + 0.24 ? { sheet, frame: sheet === 'web' ? 0 : 2 }
          : age < MEMORY_TIMING.warn + 0.24 + MEMORY_TIMING.recovery ? { sheet: 'cast', frame: 3 } : null);
    },
  };
}

function drawOrb(ctx, s) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#09090d'; ctx.lineWidth = 2; ctx.beginPath();
  for (let i = 0; i <= 32; i++) {
    const a = i * 0.38 + s.age * 10, r = s.r * i / 36;
    const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
}
function drawShuriken(ctx, s) {
  ctx.save(); ctx.translate(Math.round(s.x), Math.round(s.y)); ctx.rotate(s.age * 9);
  ctx.fillStyle = '#fff'; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8, r = i % 2 ? s.r * 0.32 : s.r; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.fillStyle = '#08090d'; ctx.fillRect(-2, -2, 4, 4); ctx.restore();
}
function projectile(api, { x, y, vx = 0, vy = 0, r = 8, shape, draw = drawOrb, life = 2.5, ...extras }) {
  return api.emit({ x, y, r, shape, warn: MEMORY_TIMING.warn, life: MEMORY_TIMING.warn + life,
    ...extras,
    steer(s) {
      if (s.age >= s.warn && !s.released) { s.released = true; s.vx = vx; s.vy = vy; }
    },
    hitShape(s, soul) { return s.age >= s.warn && Math.hypot(soul.x - s.x, soul.y - s.y) <= s.r + soul.r - 2; },
    drawShape(ctx, s) {
      ctx.save();
      if (s.age < s.warn) {
        ctx.save(); ctx.beginPath(); ctx.rect(api.box.x, api.box.y, api.box.w, api.box.h); ctx.clip();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#d5cadf'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(s.x, s.y, r + 3, 0, TAU); ctx.stroke();
        const speed = Math.hypot(vx, vy) || 1;
        ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + vx / speed * 270, s.y + vy / speed * 270); ctx.stroke();
        ctx.restore();
      }
      draw(ctx, s); ctx.restore();
    },
  });
}
function line(api, a, b, width, shape, hold = 0.45) {
  return api.emit({ x: a.x, y: a.y, r: 0, a, b, width, shape, warn: MEMORY_TIMING.warn, life: MEMORY_TIMING.warn + hold,
    hitShape(s, soul) { return s.age >= s.warn && distanceToLine(soul, a, b) <= width / 2 + soul.r - 2; },
    drawShape(ctx, s) {
      const warning = s.age < s.warn;
      ctx.save(); ctx.strokeStyle = warning ? '#bda9cf' : '#fff'; ctx.lineWidth = warning ? 1 : width;
      if (warning) ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (!warning && shape === 'memory_web') {
        ctx.strokeStyle = '#17131c'; ctx.lineWidth = 1;
        for (let i = 1; i < 14; i++) { const x = a.x + (b.x - a.x) * i / 14, y = a.y + (b.y - a.y) * i / 14; ctx.beginPath(); ctx.moveTo(x - 2, y - 3); ctx.lineTo(x + 2, y + 3); ctx.stroke(); }
      }
      if (!warning && shape === 'memory_stampede') {
        ctx.fillStyle = '#08090d';
        for (let i = 1; i < 10; i++) { const x = a.x + (b.x - a.x) * i / 10; ctx.fillRect(Math.round(x) - 3, Math.round(a.y) - 6, 3, 12); }
      }
      if (!warning && shape === 'memory_storm') {
        ctx.strokeStyle = '#08090d'; ctx.lineWidth = 1;
        for (let i = 1; i < 6; i++) { const x = a.x + (b.x - a.x) * i / 6, y = a.y + (b.y - a.y) * i / 6; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke(); }
      }
      if (warning) {
        const angle = Math.atan2(b.y - a.y, b.x - a.x), dx = Math.sin(angle) * width / 2, dy = -Math.cos(angle) * width / 2;
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(a.x + dx * side, a.y + dy * side); ctx.lineTo(b.x + dx * side, b.y + dy * side); ctx.stroke(); }
      }
      ctx.restore();
    },
  });
}
function mine(api, p, radius = 20, hold = 0.65) {
  return api.emit({ ...p, r: radius, shape: 'memory_mine', warn: MEMORY_TIMING.warn, life: MEMORY_TIMING.warn + hold,
    hitShape(s, soul) { return s.age >= s.warn && Math.hypot(soul.x - s.x, soul.y - s.y) <= radius + soul.r - 2; },
    drawShape(ctx, s) {
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, radius, 0, TAU);
      if (s.age < s.warn) { ctx.setLineDash([3, 4]); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(s.x - 5, s.y - 3, 10, 6); ctx.fillRect(s.x - 1, s.y - 7, 2, 4); }
      else { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.28; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.fillRect(Math.round(s.x + Math.cos(a) * (radius - 5)) - 2, Math.round(s.y + Math.sin(a) * (radius - 5)) - 2, 4, 4); } }
      ctx.restore();
    },
  });
}
function ring(api, center, radius, gapAngle, shape, hold = 1.2) {
  return api.emit({ ...center, r: radius, gapAngle, shape, warn: MEMORY_TIMING.warn, life: MEMORY_TIMING.warn + hold,
    hitShape(s, soul) {
      const dx = soul.x - s.x, dy = soul.y - s.y, a = Math.atan2(dy, dx);
      const relative = Math.atan2(Math.sin(a - gapAngle), Math.cos(a - gapAngle));
      return s.age >= s.warn && Math.abs(relative) > 0.65 && Math.abs(Math.hypot(dx, dy) - radius) <= 4 + soul.r - 2;
    },
    drawShape(ctx, s) {
      ctx.save(); ctx.strokeStyle = s.age < s.warn ? '#bda9cf' : '#fff'; ctx.lineWidth = s.age < s.warn ? 1 : 8;
      if (s.age < s.warn) ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(s.x, s.y, radius, gapAngle + 0.65, gapAngle + TAU - 0.65); ctx.stroke();
      ctx.restore();
    },
  });
}

// Gather a rotating ball, lock the heart's row, then release from alternating walls.
function rasengan(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 1.16, clock.duration - 1.5, () => {
      const side = wave++ % 2 ? -1 : 1, b = api.box;
      projectile(api, { x: side > 0 ? b.x + 9 : b.x + b.w - 9, y: clamp(api.soul.y, b.y + 18, b.y + b.h - 18), vx: side * 180, r: 13, shape: 'memory_rasengan' });
      api.sfx?.('spearappear');
    }); clock.pose(t, api);
  } };
}
// Six columns fall in volleys; the missing column moves with the next throw.
function shuriken(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 1.08, clock.duration - 1.5, () => {
      const b = api.box, gap = [1, 4, 0, 3][wave++ % 4];
      for (let col = 0; col < 6; col++) if (col !== gap) projectile(api, { ...point(b, (col + 0.5) / 6, 0.04), vy: 175, r: 11, draw: drawShuriken, shape: 'memory_shuriken' });
      api.sfx?.('heavyswing');
    }); clock.pose(t, api);
  } };
}
// A large orb rolls horizontally while one opposite-edge star cuts a diagonal.
function crossThrow(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 1.4, clock.duration - 1.6, () => {
      const b = api.box, side = wave++ % 2 ? -1 : 1, y = b.y + b.h * (wave % 2 ? 0.3 : 0.7);
      projectile(api, { x: side > 0 ? b.x + 8 : b.x + b.w - 8, y, vx: side * 165, r: 14, shape: 'memory_rasengan' });
      const star = point(b, side > 0 ? 0.94 : 0.06, 0.08), dx = api.soul.x - star.x, dy = api.soul.y - star.y, d = Math.hypot(dx, dy) || 1;
      projectile(api, { ...star, vx: dx / d * 150, vy: dy / d * 150, r: 9, draw: drawShuriken, shape: 'memory_shuriken' });
      api.sfx?.('heavyswing');
    }); clock.pose(t, api);
  } };
}
// The generated bunny-hood silhouette drifts from alternating corners, leaving the opposite diagonal.
function kuromi(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 1.12, clock.duration - 1.5, () => {
      const b = api.box, side = wave++ % 2 ? -1 : 1, img = whiteSprite(api.images?.kuromi, 0.08);
      for (const lane of [clamp((api.soul.y - b.y) / b.h, 0.08, 0.92), wave % 2 ? 0.72 : 0.22]) projectile(api, { ...point(b, side > 0 ? 0.06 : 0.94, lane), vx: side * 115, r: 10, shape: 'memory_kuromi',
        draw(ctx, s) { if (img) ctx.drawImage(img, Math.round(s.x - 13), Math.round(s.y - 15), 26, 30); } });
      api.sfx?.('wing');
    }); clock.pose(t, api);
  } };
}
// Sequential mines remember the heart's old position; step away before each marked disk blooms.
function mines(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 0.96, clock.duration - 1.4, () => {
      const b = api.box;
      mine(api, { x: clamp(api.soul.x, b.x + 24, b.x + b.w - 24), y: clamp(api.soul.y, b.y + 24, b.y + b.h - 24) }, 23, 1.0);
      mine(api, point(b, wave++ % 2 ? 0.24 : 0.76, 0.5), 18, 1.0);
      api.sfx?.('locker');
    }); clock.pose(t, api);
  } };
}
// Rear-facing silk leaves a middle wedge; alternate casts mark a mine there to force repositioning.
function web(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 1.4, clock.duration - 1.6, () => {
      const b = api.box, left = wave++ % 2 === 0;
      const origin = point(b, left ? 0.02 : 0.98, 0.5);
      for (const y of [0.08, 0.92]) line(api, origin, point(b, left ? 0.98 : 0.02, y), 6, 'memory_web', 1.1);
      if (wave % 2 === 0) mine(api, { x: clamp(api.soul.x, b.x + 22, b.x + b.w - 22), y: clamp(api.soul.y, b.y + 22, b.y + b.h - 22) }, 18, 0.6);
      api.sfx?.('spearappear');
    }); clock.pose(t, api, 'web');
  } };
}
// Wilding Claw: two successive rakes, with the second offset from the first marked set.
function claw(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 1.08, clock.duration - 1.4, () => {
      const b = api.box, aim = clamp(api.soul.x, b.x + 20, b.x + b.w - 20), slope = wave++ % 2 ? -18 : 18;
      for (let i = 0; i < 3; i++) {
        const x = clamp(aim + (i - 1) * 20, b.x + 7, b.x + b.w - 7);
        line(api, { x: clamp(x - slope, b.x + 5, b.x + b.w - 5), y: b.y + 4 }, { x: clamp(x + slope, b.x + 5, b.x + b.w - 5), y: b.y + b.h - 4 }, 9, 'memory_claw', 0.44);
      }
      api.sfx?.('heavyswing');
    }); clock.pose(t, api);
  } };
}
// Iron Mantle becomes a broken shield ring; Blazing Stampede follows its open side as a lane charge.
function mantleStampede(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 1.48, clock.duration - 1.7, () => {
      const b = api.box, side = wave++ % 2 ? -1 : 1;
      ring(api, point(b, 0.5, 0.5), 45, side > 0 ? 0 : Math.PI, 'memory_mantle', 1.25);
      const y = clamp(api.soul.y, b.y + 12, b.y + b.h - 12);
      line(api, { x: b.x + 4, y }, { x: b.x + b.w - 4, y }, 18, 'memory_stampede', 0.52);
      api.sfx?.('baron_slam');
    }); clock.pose(t, api);
  } };
}
// Wingborne Storm: three feather spokes rotate between casts around a fixed eye; the heart can circle the eye.
function storm(o = {}) {
  const clock = timeline(o.duration ?? MEMORY_TIMING.duration); let wave = 0;
  return { duration: clock.duration, update(t, dt, api) {
    clock.due(t, 1.04, clock.duration - 1.4, () => {
      const b = api.box, center = { x: clamp(api.soul.x, b.x + 18, b.x + b.w - 18), y: clamp(api.soul.y, b.y + 18, b.y + b.h - 18) }, phase = wave++ * 0.7;
      for (let i = 0; i < 3; i++) {
        const a = phase + i * TAU / 3;
        line(api, { x: clamp(center.x + Math.cos(a) * 23, b.x + 4, b.x + b.w - 4), y: clamp(center.y + Math.sin(a) * 23, b.y + 4, b.y + b.h - 4) }, { x: clamp(center.x + Math.cos(a) * 75, b.x + 4, b.x + b.w - 4), y: clamp(center.y + Math.sin(a) * 65, b.y + 4, b.y + b.h - 4) }, 8, 'memory_storm', 0.6);
      }
      mine(api, center, 15, 0.6);
      api.sfx?.('wing');
    }); clock.pose(t, api);
  } };
}

export const CASTLE_MEMORY_PATTERNS = {
  memory_rasengan: rasengan, memory_shuriken: shuriken, memory_cross_throw: crossThrow,
  memory_kuromi: kuromi, memory_mines: mines, memory_web: web,
  memory_claw: claw, memory_mantle_stampede: mantleStampede, memory_storm: storm,
};
