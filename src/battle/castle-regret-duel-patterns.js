// BUILD315: Master Yi's sword commitments and Syndra's manipulation of dark spheres.
const TAU = Math.PI * 2;
const WARN = 0.6;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const point = (b, u, v) => ({ x: b.x + b.w * u, y: b.y + b.h * v });
const live = s => s.age >= s.warn && s.age < s.life;
const distanceToSegment = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
function clip(ctx, box) {
  ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
}
function segment(ctx, a, b, width, warning) {
  ctx.strokeStyle = warning ? '#c2b7d0' : '#fff'; ctx.lineWidth = width;
  ctx.setLineDash(warning ? [3, 4] : []);
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}
function sphere(ctx, x, y, r) {
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#17121c'; ctx.beginPath(); ctx.arc(x, y, Math.max(1, r - 3), 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), 3, 3);
}
function bladeGeometry(s) {
  return { a: { x: s.x - Math.cos(s.angle) * s.length / 2, y: s.y - Math.sin(s.angle) * s.length / 2 },
    b: { x: s.x + Math.cos(s.angle) * s.length / 2, y: s.y + Math.sin(s.angle) * s.length / 2 } };
}

// Movement is derived from absolute bullet age so a long frame cannot spend warning time in flight.
function missile(api, origin, angle, speed, { warn = WARN, r = 7, sword = false, orbit = 0, phase = 0, life = 2.1 } = {}) {
  const ox = origin.x, oy = origin.y, offsetX = Math.cos(phase) * orbit, offsetY = Math.sin(phase) * orbit;
  const launch = { x: ox + offsetX, y: oy + offsetY };
  return api.emit({ ...launch, r, angle, length: sword ? 24 : 0, width: 6, warn, life: warn + life,
    shape: sword ? 'regret_wuju_blade' : 'regret_dark_sphere',
    steer(s) {
      const flight = Math.max(0, s.age - s.warn);
      if (s.age < s.warn && orbit) {
        const a = phase - (s.warn - s.age) * 3;
        s.x = ox + Math.cos(a) * orbit; s.y = oy + Math.sin(a) * orbit;
      } else { s.x = launch.x + Math.cos(angle) * speed * flight; s.y = launch.y + Math.sin(angle) * speed * flight; }
    },
    hitShape(s, soul) {
      if (!live(s)) return false;
      if (!sword) return Math.hypot(soul.x - s.x, soul.y - s.y) <= r + soul.r - 2;
      const g = bladeGeometry(s);
      return distanceToSegment(soul, g.a, g.b) <= s.width / 2 + soul.r - 2;
    },
    drawShape(ctx, s) {
      clip(ctx, api.box);
      if (s.age < s.warn) {
        const end = { x: launch.x + Math.cos(angle) * 350, y: launch.y + Math.sin(angle) * 350 };
        segment(ctx, launch, end, 1, true);
        if (orbit) { ctx.strokeStyle = '#665b70'; ctx.beginPath(); ctx.arc(ox, oy, orbit, 0, TAU); ctx.stroke(); }
      }
      ctx.setLineDash([]);
      if (sword) {
        const g = bladeGeometry(s); segment(ctx, g.a, g.b, s.width, false);
        const h = { x: g.a.x + Math.cos(angle) * 5, y: g.a.y + Math.sin(angle) * 5 };
        segment(ctx, { x: h.x - Math.sin(angle) * 7, y: h.y + Math.cos(angle) * 7 }, { x: h.x + Math.sin(angle) * 7, y: h.y - Math.cos(angle) * 7 }, 2, false);
        segment(ctx, g.a, g.b, 1, true);
      } else sphere(ctx, s.x, s.y, r);
      ctx.restore();
    },
  });
}

function slash(api, a, b, warn) {
  const width = 8;
  api.emit({ ...point(api.box, 0.5, 0.5), r: 0, a, b, width, warn, life: warn + 0.23, shape: 'regret_alpha_slash',
    hitShape(s, soul) { return live(s) && distanceToSegment(soul, a, b) <= width / 2 + soul.r - 2; },
    drawShape(ctx, s) {
      clip(ctx, api.box);
      segment(ctx, a, b, s.age < warn ? 1 : width, s.age < warn);
      if (s.age < warn) {
        const angle = Math.atan2(b.y - a.y, b.x - a.x), nx = Math.sin(angle) * width / 2, ny = -Math.cos(angle) * width / 2;
        for (const side of [-1, 1]) segment(ctx, { x: a.x + nx * side, y: a.y + ny * side }, { x: b.x + nx * side, y: b.y + ny * side }, 1, true);
        ctx.fillStyle = '#fff';
        for (const p of [a, b]) { ctx.fillRect(p.x - 4, p.y - 1, 8, 2); ctx.fillRect(p.x - 1, p.y - 4, 2, 8); }
      } else segment(ctx, a, b, 1, true);
      ctx.restore();
    },
  });
}

function forceDrop(api, target) {
  const radius = 19, warn = 0.7, hold = 0.22;
  api.emit({ ...target, r: radius, warn, life: warn + hold, shape: 'regret_force_drop',
    hitShape(s, soul) { return live(s) && Math.hypot(soul.x - s.x, soul.y - s.y) <= radius + soul.r - 2; },
    drawShape(ctx, s) {
      clip(ctx, api.box);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash(s.age < warn ? [3, 4] : []);
      ctx.beginPath(); ctx.arc(s.x, s.y, radius, 0, TAU); ctx.stroke();
      if (s.age < warn) {
        const lift = 28 * (1 - s.age / warn);
        segment(ctx, { x: s.x, y: s.y - lift }, target, 1, true);
        ctx.setLineDash([]); sphere(ctx, s.x, s.y - lift, 9 + 10 * s.age / warn);
      } else { sphere(ctx, s.x, s.y, radius); }
      ctx.restore();
    },
  });
  api.emit({ ...target, r: 0, warn: warn + hold, life: warn + hold + 0.65, shape: 'regret_force_ripple',
    hitShape(s, soul) {
      const radiusNow = radius + Math.max(0, s.age - s.warn) * 78;
      return live(s) && Math.abs(Math.hypot(soul.x - s.x, soul.y - s.y) - radiusNow) <= 3 + soul.r - 2;
    },
    drawShape(ctx, s) {
      clip(ctx, api.box);
      ctx.lineWidth = s.age < s.warn ? 1 : 6; ctx.strokeStyle = s.age < s.warn ? '#9786a8' : '#fff';
      ctx.setLineDash(s.age < s.warn ? [2, 6] : []);
      ctx.beginPath(); ctx.arc(s.x, s.y, radius + Math.max(0, s.age - s.warn) * 78, 0, TAU); ctx.stroke(); ctx.restore();
    },
  });
}

function sequence(o, every, tail, prepare, sounds) {
  const duration = o.duration ?? 6.5;
  let next = 0, wave = 0, started = -10, beats = [];
  return { duration, update(t, dt, api) {
    if (t >= next && t < duration - tail) {
      started = t; next = t + every;
      prepare(api, wave++); api.sfx?.('spearappear');
      beats.push(...sounds.map(([delay, cue]) => ({ at: t + delay, cue })));
    }
    for (const beat of beats) if (!beat.done && t >= beat.at) { beat.done = true; api.sfx?.(beat.cue); }
    beats = beats.filter(beat => !beat.done);
    const age = t - started, last = sounds.at(-1)[0];
    api.present?.(t >= duration ? null : age < sounds[0][0] ? { sheet: 'cast', frame: 1 }
      : age < last + 0.23 ? { sheet: 'cast', frame: 2 }
        : age < last + 0.55 ? { sheet: 'cast', frame: 0 } : null);
  } };
}

// Alpha Strike marks the old heart position, then Double Strike crosses it twice; leave the X before the first cut and wait for the second.
function alphaDouble(o = {}) {
  return sequence(o, 1.25, 1.5, (api, wave) => {
    const b = api.box, target = { x: api.soul.x, y: api.soul.y };
    for (const [i, slope] of [0.55, -0.55].entries()) {
      const sign = wave % 2 ? -1 : 1;
      slash(api, { x: b.x + 3, y: target.y + (b.x + 3 - target.x) * slope * sign },
        { x: b.x + b.w - 3, y: target.y + (b.x + b.w - 3 - target.x) * slope * sign }, WARN + i * 0.27);
    }
  }, [[WARN, 'heavyswing'], [0.87, 'hit']]);
}

// Highlander readies parallel sword afterimages; a missing pair of rows is the passage through each fast lunge.
function highlander(o = {}) {
  return sequence(o, 1.55, 1.8, (api, wave) => {
    const b = api.box, side = wave % 2 ? -1 : 1, gap = [2, 4, 1, 3][wave % 4];
    for (let row = 0; row < 7; row++) if (row !== gap && row !== gap + 1)
      missile(api, point(b, side > 0 ? 0.025 : 0.975, (row + 0.5) / 7), side > 0 ? 0 : Math.PI, 190, { sword: true, life: b.w / 190 + 0.2 });
  }, [[WARN, 'heavyswing']]);
}

// Meditate gathers blades around a still point, then releases a radial Wuju counterburst and a delayed second sword; sidestep between spokes.
function meditate(o = {}) {
  return sequence(o, 1.9, 2.2, (api, wave) => {
    const b = api.box, center = point(b, 0.5, 0.5), target = { x: api.soul.x, y: api.soul.y };
    const aim = Math.atan2(target.y - center.y, target.x - center.x);
    for (let i = 0; i < 7; i++) {
      const angle = aim + i * TAU / 7;
      missile(api, center, angle, 105, { sword: true, warn: 0.75, orbit: 13, phase: angle, life: 1.35 });
    }
    const from = point(b, wave % 2 ? 0.96 : 0.04, 0.1);
    missile(api, from, Math.atan2(target.y - from.y, target.x - from.x), 165, { sword: true, warn: 1.1, life: 1.4 });
  }, [[0.75, 'heavyswing'], [1.1, 'hit']]);
}

// Three Dark Spheres are placed, their shove lanes appear, and Scatter the Weak pushes the locked fan; move across a lane after its sphere passes.
function scatter(o = {}) {
  return sequence(o, 1.35, 1.9, (api, wave) => {
    const b = api.box, side = wave % 2 ? -1 : 1, target = { x: api.soul.x, y: api.soul.y };
    for (const [i, v] of [0.14, 0.5, 0.86].entries()) {
      const from = point(b, side > 0 ? 0.06 : 0.94, v);
      missile(api, from, Math.atan2(target.y - from.y, target.x - from.x), 165, { warn: WARN + i * 0.12, r: 9, life: 1.6 });
    }
  }, [[WARN, 'furnace_blast']]);
}

// Force of Will lifts a sphere over the old heart position, drops it and sends a circular shock outwards; step out, then enter behind the ripple.
function forceOfWill(o = {}) {
  return sequence(o, 1.42, 1.7, api => {
    forceDrop(api, { x: api.soul.x, y: api.soul.y });
  }, [[0.7, 'baron_slam']]);
}

// Unleashed Power orbits four spheres at the corner, with four separately visible locked trajectories; strafe the volley, then reverse after the tail.
function unleashed(o = {}) {
  return sequence(o, 2.05, 2.4, (api, wave) => {
    const center = point(api.box, wave % 2 ? 0.83 : 0.17, 0.2), target = { x: api.soul.x, y: api.soul.y };
    for (let i = 0; i < 4; i++) {
      const phase = i * TAU / 4, orbit = 17;
      const launch = { x: center.x + Math.cos(phase) * orbit, y: center.y + Math.sin(phase) * orbit };
      missile(api, center, Math.atan2(target.y - launch.y, target.x - launch.x), 180, { warn: 0.7 + i * 0.18, orbit, phase, r: 8, life: 1.45 });
    }
  }, [[0.7, 'locker'], [0.88, 'locker'], [1.06, 'locker'], [1.24, 'furnace_blast']]);
}

/** Six independent attack factories consumed by the existing battle pattern registry. */
export const CASTLE_REGRET_DUEL_PATTERNS = {
  regret_alpha_double: alphaDouble, regret_highlander: highlander, regret_meditate: meditate,
  regret_scatter: scatter, regret_force_of_will: forceOfWill, regret_unleashed: unleashed,
};
