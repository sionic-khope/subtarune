// Baron anatomy and timelines; visual contract: DESIGN.md, Baron signature attacks.
// Glyph cells are shared by rendering and collision. No generic enemy pattern factories.
const PALETTE = { o: '#29143f', p: '#4a2269', v: '#8650b8', l: '#c18ae0', t: '#f3e6ba', d: '#40652b', a: '#a8dc52', h: '#e7ffad' };
const GLYPHS = {
  acid: ['...aa....', '..ahaa...', '.aahaaa..', 'aahhaaaa.', 'daaaaaaad', '.daaaaad.', '..ddadd..'],
  pool: ['...dddddddd...', '.ddaaaaaaaaadd', 'daaaahhaaaaad.', 'daahaaaaaaaadd', '.daaaaaahaaad.', '..ddaaaaaadd..', '....dddddd....'],
  segment: ['....t....', '...tt....', '..oppo...', '.opvvpo..', 'opvllvpot', '.opvvpo.t', '..oppo...', '...tt....', '....t....'],
  spine: ['....t....', '....tt...', '...ttt...', '...tltt..', '..ttltt..', '..tlvltt.', '.ttlvltt.', '.tlvvltt.', 'opvvlvppo', 'opvllvvpo', '.opvvppo.'],
  breath: ['..aa..aa....', '.aahaaaaa...', 'aaahhaaahaa.', 'daaaaaaaaahh', '.daaaaaaaa..', '...ddaad....'],
  jaw: ['..pppp....pppp..', '.pvvlp....plvvp.', 'opvlt......tlvpo', 'opvtt......ttvpo', 'opvt........tvpo', '.pvt........tvp.', '.pvtt......ttvp.', '..pvvttttttvvp..', '...ppvvvvppp....'],
};

function glyph(name, scale = 2) {
  const rows = GLYPHS[name], cells = [];
  for (let y = 0; y < rows.length; y++) {
    let x = 0;
    while (x < rows[y].length) {
      const tone = rows[y][x];
      let end = x + 1;
      while (end < rows[y].length && rows[y][end] === tone) end++;
      if (tone !== '.') cells.push({ x: (x - rows[0].length / 2) * scale, y: (y - rows.length / 2) * scale, w: (end - x) * scale, h: scale, tone });
      x = end;
    }
  }
  return cells;
}

// These immutable glyphs are reused; no pixel arrays are built during a frame update.
const CELLS = { acid: glyph('acid'), pool: glyph('pool'), segment: glyph('segment'), spine: glyph('spine', 3), breath: glyph('breath', 3), jaw: glyph('jaw', 3) };
const OUTLINES = {};
for (const [name, rows] of Object.entries(GLYPHS)) {
  const scale = ['spine', 'breath', 'jaw'].includes(name) ? 3 : 2;
  OUTLINES[name] = [];
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    if (rows[y][x] === '.') continue;
    const px = (x - rows[0].length / 2) * scale, py = (y - rows.length / 2) * scale;
    const empty = (xx, yy) => !rows[yy]?.[xx] || rows[yy][xx] === '.';
    if (empty(x - 1, y)) OUTLINES[name].push({ x: px, y: py, w: 1, h: scale });
    if (empty(x + 1, y)) OUTLINES[name].push({ x: px + scale - 1, y: py, w: 1, h: scale });
    if (empty(x, y - 1)) OUTLINES[name].push({ x: px, y: py, w: scale, h: 1 });
    if (empty(x, y + 1)) OUTLINES[name].push({ x: px, y: py + scale - 1, w: scale, h: 1 });
  }
}

function drawAnatomy(ctx, bullet) {
  const warning = bullet.age < bullet.warn;
  const x = Math.round(bullet.x), y = Math.round(bullet.y);
  ctx.save();
  for (const cell of warning ? bullet.outline : bullet.cells) {
    ctx.fillStyle = warning ? (Math.floor(bullet.age * 8) % 2 ? PALETTE.h : PALETTE.l) : PALETTE[cell.tone];
    ctx.fillRect(x + Math.round(cell.x), y + Math.round(cell.y), cell.w, cell.h);
  }
  ctx.restore();
}

function hitsAnatomy(bullet, soul) {
  if (bullet.age < bullet.warn || bullet.age >= bullet.life) return false;
  const radius = Math.max(0, soul.r - 2);
  const x = Math.round(bullet.x), y = Math.round(bullet.y);
  for (const cell of bullet.cells) {
    const left = x + Math.round(cell.x), top = y + Math.round(cell.y);
    const dx = soul.x - Math.max(left, Math.min(soul.x, left + cell.w));
    const dy = soul.y - Math.max(top, Math.min(soul.y, top + cell.h));
    if (dx * dx + dy * dy <= radius * radius) return true;
  }
  return false;
}

function anatomy(api, name, x, y, warn, hold, extra = {}) {
  let bounds;
  if (!extra.harmless) {
    const cells = CELLS[name], b = api.box;
    const left = Math.min(...cells.map((c) => c.x)), right = Math.max(...cells.map((c) => c.x + c.w));
    const top = Math.min(...cells.map((c) => c.y)), bottom = Math.max(...cells.map((c) => c.y + c.h));
    bounds = [b.x + 2 - left, b.x + b.w - 2 - right, b.y + 2 - top, b.y + b.h - 2 - bottom];
    x = clamp(x, bounds[0], bounds[1]);
    y = clamp(y, bounds[2], bounds[3]);
  }
  const move = extra.steer;
  api.emit({ x, y, r: 0, shape: `baron_${name}`, cells: CELLS[name], outline: OUTLINES[name], warn, life: warn + hold,
    drawShape: drawAnatomy, hitShape: hitsAnatomy, ...extra,
    steer: move ? (bullet) => {
      move(bullet);
      if (bounds) {
        bullet.x = clamp(bullet.x, bounds[0], bounds[1]);
        bullet.y = clamp(bullet.y, bounds[2], bounds[3]);
      }
    } : null });
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function timeline(duration, events) {
  events.sort((a, b) => a.at - b.at);
  let next = 0;
  return { duration, update(t, dt, api) {
    if (t >= duration) return;
    while (next < events.length && t >= events[next].at) events[next++].run(api);
  } };
}

function sound(events, at, name) { events.push({ at, run: (api) => api.sfx?.(name) }); }

function moving(api, name, warn, hold, path) {
  const start = path(0);
  anatomy(api, name, start.x, start.y, warn, hold, { steer(bullet) {
    const point = path(clamp((bullet.age - warn) / hold, 0, 1));
    bullet.x = point.x;
    bullet.y = point.y;
  } });
}

function spit(api, o, wave) {
  const b = api.box, vertical = wave % 2 === 1, reverse = wave % 4 >= 2;
  for (let lane = 0; lane < o.streams; lane++) {
    const line = lane / (o.streams - 1);
    moving(api, 'acid', o.warn, o.flight, (t) => {
      const travel = reverse ? 1 - t : t;
      const cross = clamp(line + Math.sin(t * Math.PI * 2 + lane) * o.weave, 0, 1);
      return { x: b.x + 9 + (b.w - 18) * (vertical ? cross : travel),
        y: b.y + 8 + (b.h - 16) * (vertical ? travel : cross) };
    });
  }
  if (wave % 2 === 0) anatomy(api, 'pool', api.soul.x, api.soul.y, o.warn, o.poolHold);
}

function tentacle(api, o, side, reverse) {
  const b = api.box;
  for (let i = 0; i < o.segments; i++) {
    if (i === 5 || i === 6) continue;
    const u = i / (o.segments - 1);
    moving(api, 'segment', o.warn, o.hold, (t) => {
      const sweep = reverse ? 1 - t : t;
      const angle = -1.5 + sweep * 3;
      const reach = u * b.w * o.reach;
      return { x: b.x + (side ? b.w - 10 - Math.cos(angle) * reach : 10 + Math.cos(angle) * reach),
        y: b.y + b.h / 2 + Math.sin(angle) * reach + Math.sin(u * Math.PI) * Math.sin(t * Math.PI * 2) * o.bend };
    });
  }
}

function spineRow(api, o, reverse, gap) {
  const b = api.box;
  for (let i = 0; i < o.columns; i++) {
    if (i === gap || i === gap + 1) continue;
    moving(api, 'spine', o.warn, o.hold, (t) => ({
      x: b.x + (i + 0.5) * b.w / o.columns + Math.sin(t * Math.PI * 2) * o.drift,
      y: b.y + 12 + (b.h - 24) * (reverse ? 1 - t : t),
    }));
  }
}

function breath(api, o, reverse) {
  const b = api.box;
  const center = (t) => b.x + 18 + (b.w - 36) * (reverse ? 1 - t : t);
  anatomy(api, 'jaw', center(0), b.y + 14, 0, o.warn + o.hold, { harmless: true,
    steer(bullet) { bullet.x = center(clamp((bullet.age - o.warn) / o.hold, 0, 1)); },
  });
  for (let i = 0; i < o.rows; i++) {
    if (i === (reverse ? o.rows - 3 : 2)) continue;
    moving(api, 'breath', o.warn, o.hold, (t) => ({
      x: center(t) + Math.sin(t * Math.PI * 2 - i * 0.45) * o.spread,
      y: b.y + 8 + i * (b.h - 16) / (o.rows - 1),
    }));
  }
}

function enclosure(api, o, wave) {
  const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  for (let i = 0; i < o.segments; i++) {
    const angle = i * Math.PI * 2 / o.segments;
    const gap = wave % 2 ? Math.PI / 2 : -Math.PI / 2;
    if (Math.abs(Math.atan2(Math.sin(angle - gap), Math.cos(angle - gap))) < o.gapAngle) continue;
    moving(api, 'segment', o.warn, o.hold, (t) => {
      const radius = wave % 2 ? 0.12 + 1.4 * t : 1.52 - 1.4 * t;
      const spin = angle + t * o.rotation * (wave % 2 ? -1 : 1);
      return { x: cx + Math.cos(spin) * (b.w / 2 - 10) * radius,
        y: cy + Math.sin(spin) * (b.h / 2 - 10) * radius };
    });
  }
}

/** Six Baron-owned gestures; tuning is passed from ENEMIES.baron.patterns. */
export const BARON_PATTERNS = {
  baron_acid_spit(o = {}) {
    o = { duration: 6.6, warn: 0.55, poolHold: 1.45, flight: 1.8, streams: 5, weave: 0.09, every: 0.82, volleys: 6, ...o };
    const events = [];
    sound(events, 0.15, 'baron_roar');
    for (let i = 0; i < o.volleys; i++) events.push({ at: 0.1 + i * o.every, run: (api) => spit(api, o, i) });
    return timeline(o.duration, events);
  },
  baron_tentacle_rake(o = {}) {
    o = { duration: 6.8, warn: 0.55, hold: 1.65, segments: 17, reach: 1.04, bend: 14, every: 1.48, waves: 4, ...o };
    const events = [];
    for (let i = 0; i < o.waves; i++) {
      const at = 0.1 + i * o.every;
      events.push({ at, run: (api) => tentacle(api, o, i % 2, i % 2 === 1) });
      sound(events, at + o.warn, 'baron_slam');
    }
    return timeline(o.duration, events);
  },
  baron_spine_fault(o = {}) {
    o = { duration: 6.6, warn: 0.55, hold: 1.6, columns: 9, drift: 22, every: 1.4, waves: 4, ...o };
    const events = [];
    for (let i = 0; i < o.waves; i++) {
      const at = 0.15 + i * o.every;
      events.push({ at, run: (api) => spineRow(api, o, i % 2 === 1, [1, 6, 2, 5][i % 4]) });
      sound(events, at + o.warn, 'baron_eruption');
    }
    return timeline(o.duration, events);
  },
  baron_maw_breath(o = {}) {
    o = { duration: 6.8, warn: 0.6, hold: 2.15, rows: 7, spread: 10, every: 3.15, waves: 2, ...o };
    const events = [];
    for (let i = 0; i < o.waves; i++) {
      const at = 0.2 + i * o.every;
      events.push({ at, run: (api) => breath(api, o, i % 2 === 1) });
      sound(events, at, 'baron_roar');
    }
    return timeline(o.duration, events);
  },
  baron_tendril_cage(o = {}) {
    o = { duration: 6.8, warn: 0.6, hold: 1.45, segments: 30, rotation: 1.35, gapAngle: 0.6, every: 2.15, waves: 3, ...o };
    const events = [];
    for (let i = 0; i < o.waves; i++) {
      const at = 0.15 + i * o.every;
      events.push({ at, run: (api) => enclosure(api, o, i) });
      sound(events, at + o.warn, 'baron_slam');
    }
    return timeline(o.duration, events);
  },
  baron_predatory_surge(o = {}) {
    o = { duration: 6.9, warn: 0.55, hold: 1.65, segments: 15, reach: 1.02, bend: 12,
      poolHold: 1.1, flight: 1.7, streams: 4, weave: 0.06, columns: 9, drift: 18, rows: 7, spread: 9, ...o };
    const events = [
      { at: 0.1, run: (api) => tentacle(api, o, 0, false) },
      { at: 0.85, run: (api) => spit(api, o, 1) },
      { at: 1.55, run: (api) => spineRow(api, o, true, 5) },
      { at: 2.65, run: (api) => tentacle(api, o, 1, true) },
      { at: 3.45, run: (api) => spit(api, o, 2) },
      { at: 4.45, run: (api) => breath(api, o, false) },
    ];
    sound(events, 0.1 + o.warn, 'baron_slam');
    sound(events, 1.55 + o.warn, 'baron_eruption');
    sound(events, 2.65 + o.warn, 'baron_slam');
    sound(events, 4.45, 'baron_roar');
    return timeline(o.duration, events);
  },
};
