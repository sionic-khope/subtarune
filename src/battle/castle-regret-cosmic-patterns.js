// BUILD315: stone weaving and stellar magic alternate readable windows in the duo.
export const REGRET_COSMIC_TIMING = Object.freeze({ duration: 6.8, warn: 0.6, slot: 1.7, active: 1.55 });
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const point = (b, u, v) => ({ x: b.x + b.w * u, y: b.y + b.h * v });
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const lineDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const f = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - f * dx, p.y - a.y - f * dy);
};
const disk = (x, y, r) => ({ type: 'disk', x, y, r });
const stone = (x, y, r) => ({ type: 'poly', points: [[-1, -0.3], [-0.5, -1], [0.6, -0.8], [1, 0.2], [0.4, 1], [-0.7, 0.8]].map(([u, v]) => ({ x: x + u * r, y: y + v * r })) });
const rect = (x, y, w, h) => ({ type: 'poly', points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] });

function geometryHits(g, p) {
  const r = Math.max(0, p.r - 2);
  if (g.type === 'disk') return Math.hypot(p.x - g.x, p.y - g.y) <= g.r + r;
  if (g.type === 'ring') {
    const d = Math.hypot(p.x - g.x, p.y - g.y);
    return Math.abs(d - g.r) <= g.width / 2 + r
      && Math.abs(angleDelta(Math.atan2(p.y - g.y, p.x - g.x), g.gap)) > g.open;
  }
  let inside = false;
  for (let i = 0, j = g.points.length - 1; i < g.points.length; j = i++) {
    const a = g.points[i], b = g.points[j];
    if (lineDistance(p, a, b) <= r) return true;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function drawGeometry(ctx, g, warning, cosmic) {
  ctx.beginPath();
  if (g.type === 'disk') ctx.arc(g.x, g.y, g.r, 0, TAU);
  else if (g.type === 'ring') ctx.arc(g.x, g.y, g.r, g.gap + g.open, g.gap + TAU - g.open);
  else { g.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); }
  ctx.strokeStyle = warning ? '#a8a8a8' : '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = warning ? 1 : (g.width || 1);
  ctx.setLineDash(warning ? [3, 4] : []);
  if (warning || g.type === 'ring') ctx.stroke();
  else ctx.fill();
  if (warning) return;
  ctx.fillStyle = '#111';
  if (g.type === 'disk') {
    if (cosmic) { ctx.fillRect(g.x - g.r * 0.55, g.y - 1, g.r * 1.1, 2); ctx.fillRect(g.x - 1, g.y - g.r * 0.55, 2, g.r * 1.1); }
    else { ctx.fillRect(g.x - g.r * 0.4, g.y - g.r * 0.4, g.r * 0.75, 2); ctx.fillRect(g.x + 1, g.y, 2, g.r * 0.55); }
  }
  if (g.type === 'poly' && !cosmic) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.stroke();
  }
}

function hazard(api, shape, life, geometry, warningGeometry = geometry, warn = REGRET_COSMIC_TIMING.warn) {
  const cosmic = shape.startsWith('aurelion');
  return api.emit({ ...point(api.box, 0.5, 0.5), r: 0, shape, life, warn,
    hitShape(s, soul) { return s.age >= s.warn && s.age < s.life && geometry(s).some(g => geometryHits(g, soul)); },
    drawShape(ctx, s) {
      if (s.age >= s.life) return;
      const warning = s.age < s.warn;
      ctx.save(); ctx.beginPath(); ctx.rect(api.box.x, api.box.y, api.box.w, api.box.h); ctx.clip();
      for (const g of (warning ? warningGeometry : geometry)(s)) drawGeometry(ctx, g, warning, cosmic);
      ctx.restore();
    },
  });
}

// Late frames may skip obsolete casts, but never compress a new warning or stack catch-up volleys.
function alternatingCasts(offset, cast, sounds, o) {
  const duration = o.duration ?? REGRET_COSMIC_TIMING.duration;
  const beats = [offset, offset + 3.4];
  let index = 0, begun = -10, released = true, windowEnd = -1;
  return { duration, update(t, dt, api) {
    if (t >= duration) { api.present?.(null); return; }
    while (index < beats.length && t >= beats[index]) {
      const at = beats[index++];
      if (t - at > 0.35 || at + REGRET_COSMIC_TIMING.active > duration) continue;
      begun = t; windowEnd = at + REGRET_COSMIC_TIMING.active; released = false;
      cast(api, index - 1, windowEnd - t);
      api.sfx?.(sounds[0]);
    }
    const age = t - begun;
    if (!released && age >= REGRET_COSMIC_TIMING.warn) { released = true; api.sfx?.(sounds[1]); }
    api.present?.(t >= windowEnd ? null : { sheet: 'cast', frame: age < REGRET_COSMIC_TIMING.warn ? 1 : 2 });
  } };
}

// Five faceted stones thread one locked lane; their worked ground persists after the volley.
function threadedVolley(o = {}) {
  return alternatingCasts(0, (api, wave, life) => {
    const b = api.box, y = clamp(api.soul.y, b.y + 12, b.y + b.h - 12), fromLeft = wave % 2 === 0;
    const start = fromLeft ? b.x + 7 : b.x + b.w - 7, direction = fromLeft ? 1 : -1;
    for (let rock = 0; rock < 5; rock++) {
      const delay = rock * 0.07;
      hazard(api, 'taliyah_threaded_stone', life, s => {
        if (s.age < s.warn + delay) return [];
        const x = start + direction * (s.age - s.warn - delay) * (b.w / 0.58);
        return [stone(x, y, 7)];
      }, () => [rect(b.x + 3, y - 7, b.w - 6, 14)]);
    }
    hazard(api, 'taliyah_worked_ground', life,
      () => [rect(b.x + 4, y - 8, b.w - 8, 16)], undefined, 1.02);
  }, ['spearappear', 'impact'], o);
}

// Fracture a locked row while protruding earth mines occupy alternating pockets above and below it.
function unraveledShove(o = {}) {
  return alternatingCasts(0, (api, wave, life) => {
    const b = api.box, y = clamp(api.soul.y, b.y + 12, b.y + b.h - 12);
    hazard(api, 'taliyah_seismic_shove', life, () => [rect(b.x + 3, y - 9, b.w - 6, 18)]);
    for (let i = 0; i < 4; i++) {
      const p = point(b, (i + 0.5) / 4, (i + wave) % 2 ? 0.24 : 0.76);
      hazard(api, 'taliyah_unraveled_mine', life, () => [stone(p.x, p.y, 13)]);
    }
  }, ['locker', 'baron_slam'], o);
}

// Jagged wall spurs leave offset passages; a short aimed cross-wall prevents edge camping.
function weaversWall(o = {}) {
  return alternatingCasts(0, (api, wave, life) => {
    const b = api.box, y = clamp(api.soul.y, b.y + 12, b.y + b.h - 12);
    for (let i = 0; i < 2; i++) {
      const x = b.x + b.w * (i ? 0.7 : 0.3), gap = b.y + b.h * ((i + wave) % 2 ? 0.7 : 0.3), half = 30;
      hazard(api, 'taliyah_wall_spur', life, () => [
        rect(x - 8, b.y + 3, 16, Math.max(0, gap - half - b.y - 3)),
        rect(x - 8, gap + half, 16, Math.max(0, b.y + b.h - 3 - gap - half)),
      ]);
    }
    hazard(api, 'taliyah_wall_crosspiece', life, () => [rect(b.x + 3, y - 6, b.w - 6, 12)]);
  }, ['locker', 'baron_eruption'], o);
}

// A locked black-hole core and inward accretion arc leave an inward-facing exit through the stars.
function singularity(o = {}) {
  return alternatingCasts(1.7, (api, wave, life) => {
    const b = api.box, center = { x: api.soul.x, y: api.soul.y };
    const gap = Math.atan2(b.y + b.h / 2 - center.y, b.x + b.w / 2 - center.x);
    hazard(api, 'aurelion_singularity_core', life, () => [disk(center.x, center.y, 25)]);
    hazard(api, 'aurelion_accretion_stars', life, s => [{ type: 'ring', ...center, r: 65 - clamp(s.age - s.warn, 0, 0.95) * 32, width: 7, gap, open: 1.05 }]);
  }, ['great_shine', 'power'], o);
}

// The dragon locks its breath direction during windup; step perpendicular to the widening light cone.
function breathOfLight(o = {}) {
  return alternatingCasts(1.7, (api, wave, life) => {
    const b = api.box, origin = point(b, wave % 2 ? 0.98 : 0.02, 0.5);
    const angle = Math.atan2(api.soul.y - origin.y, api.soul.x - origin.x);
    const length = Math.hypot(b.w, b.h) + 10, width = 0.13;
    const tip = a => ({ x: origin.x + Math.cos(a) * length, y: origin.y + Math.sin(a) * length });
    const cone = { type: 'poly', points: [origin, tip(angle - width), tip(angle + width)] };
    hazard(api, 'aurelion_locked_breath', life, () => [cone]);
  }, ['great_shine', 'furnace_blast'], o);
}

// A falling star strikes its marked disk, then a broken shockwave expands; the stardust notch is the exit.
function fallingStar(o = {}) {
  return alternatingCasts(1.7, (api, wave, life) => {
    const b = api.box, center = { x: api.soul.x, y: api.soul.y };
    const gap = Math.atan2(b.y + b.h / 2 - center.y, b.x + b.w / 2 - center.x);
    hazard(api, 'aurelion_falling_star', Math.min(life, 0.86), () => [disk(center.x, center.y, 24)]);
    hazard(api, 'aurelion_stardust_shockwave', life, s => [{ type: 'ring', ...center,
      r: 27 + Math.max(0, s.age - s.warn) * 90, width: 7, gap, open: 0.85 }],
    () => [{ type: 'ring', ...center, r: 34, width: 7, gap, open: 0.85 }], 0.78);
  }, ['great_shine', 'baron_slam'], o);
}

export const CASTLE_REGRET_COSMIC_PATTERNS = {
  taliyah_threaded_volley: threadedVolley,
  taliyah_unraveled_shove: unraveledShove,
  taliyah_weavers_wall: weaversWall,
  aurelion_singularity: singularity,
  aurelion_breath_of_light: breathOfLight,
  aurelion_falling_star: fallingStar,
};
