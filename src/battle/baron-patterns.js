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
  if (!extra.harmless) {
    const cells = CELLS[name], b = api.box;
    const left = Math.min(...cells.map((c) => c.x)), right = Math.max(...cells.map((c) => c.x + c.w));
    const top = Math.min(...cells.map((c) => c.y)), bottom = Math.max(...cells.map((c) => c.y + c.h));
    x = clamp(x, b.x + 2 - left, b.x + b.w - 2 - right);
    y = clamp(y, b.y + 2 - top, b.y + b.h - 2 - bottom);
  }
  api.emit({ x, y, r: 0, shape: `baron_${name}`, cells: CELLS[name], outline: OUTLINES[name], warn, life: warn + hold,
    drawShape: drawAnatomy, hitShape: hitsAnatomy, ...extra });
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

function spit(api, o, side = 0) {
  const b = api.box;
  const x = clamp(api.soul.x + side * o.poolOffset, b.x + 20, b.x + b.w - 20);
  const y = clamp(api.soul.y, b.y + 24, b.y + b.h - 24);
  anatomy(api, 'pool', x, y, o.warn, o.poolHold);
  const startX = b.x + b.w / 2, startY = b.y + 8;
  anatomy(api, 'acid', startX, startY, 0, o.warn, { harmless: true,
    steer(bullet) {
      const t = Math.min(1, bullet.age / o.warn);
      bullet.x = startX + (x - startX) * t;
      bullet.y = startY + (y - startY) * t - Math.sin(t * Math.PI) * o.lobHeight;
    },
  });
}

function tentacle(api, o, side, bend) {
  const b = api.box;
  const rootX = side ? b.x + b.w - 10 : b.x + 10;
  const targetX = clamp(api.soul.x, side ? rootX - b.w * o.reach : rootX, side ? rootX : rootX + b.w * o.reach);
  const targetY = api.soul.y;
  for (let i = 0; i < o.segments; i++) {
    const u = i / (o.segments - 1);
    const x = rootX + (targetX - rootX) * u;
    const y = (b.y + b.h / 2) * (1 - u) + targetY * u + b.h * bend * Math.sin(u * Math.PI);
    anatomy(api, 'segment', x, y, o.warn + i * o.segmentDelay, o.hold);
  }
}

function spineRow(api, o, row, gap) {
  const b = api.box;
  for (let i = 0; i < o.columns; i++) {
    if (i === gap || i === gap + 1) continue;
    const x = b.x + (i + 0.5) * b.w / o.columns;
    const y = b.y + b.h * row;
    anatomy(api, 'spine', x, y, o.warn + i * o.step, o.hold);
  }
}

function breath(api, o, lane) {
  const b = api.box, center = b.x + b.w * lane;
  anatomy(api, 'jaw', center, b.y + 20, 0, o.warn + o.hold, { harmless: true });
  for (let i = 0; i < o.rows; i++) {
    const y = b.y + 44 + i * (b.h - 58) / (o.rows - 1);
    for (const side of [-1, 0, 1]) {
      const x = center + side * (o.spread * i / (o.rows - 1));
      anatomy(api, 'breath', x, y, o.warn + i * o.step, o.hold);
    }
  }
}

function enclosure(api, o, gapAngle) {
  const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  anatomy(api, 'pool', api.soul.x, api.soul.y, o.warn + o.ringDelay, o.hold);
  for (let ring = 0; ring < o.rings; ring++) {
    const radius = o.radius - ring * o.constrict;
    for (let i = 0; i < o.segments; i++) {
      const angle = i * Math.PI * 2 / o.segments;
      const difference = Math.atan2(Math.sin(angle - gapAngle), Math.cos(angle - gapAngle));
      if (Math.abs(difference) < o.gapAngle) continue;
      anatomy(api, 'segment', cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * o.flatten,
        o.warn + ring * o.ringDelay, o.hold);
    }
  }
}

/** Six Baron-owned gestures; tuning is passed from ENEMIES.baron.patterns. */
export const BARON_PATTERNS = {
  baron_acid_spit(o = {}) {
    o = { duration: 6.6, warn: 0.6, poolHold: 1.6, poolOffset: 32, lobHeight: 18, every: 0.72, volleys: 6, ...o };
    const events = [];
    sound(events, 0.15, 'baron_roar');
    for (let i = 0; i < o.volleys; i++) events.push({ at: 0.15 + i * o.every, run: (api) => { spit(api, o); spit(api, o, i % 2 ? -1 : 1); } });
    return timeline(o.duration, events);
  },
  baron_tentacle_rake(o = {}) {
    o = { duration: 6.8, warn: 0.6, hold: 0.66, segments: 14, segmentDelay: 0.025, reach: 0.73, bend: 0.28, every: 1.7, waves: 4, ...o };
    const events = [];
    for (let i = 0; i < o.waves; i++) {
      const at = 0.1 + i * o.every;
      events.push({ at, run: (api) => tentacle(api, o, i % 2, i % 2 ? -o.bend : o.bend) });
      sound(events, at + o.warn, 'baron_slam');
    }
    return timeline(o.duration, events);
  },
  baron_spine_fault(o = {}) {
    o = { duration: 6.6, warn: 0.6, hold: 0.62, columns: 9, step: 0.07, every: 1.1, waves: 5, ...o };
    const events = [];
    for (let i = 0; i < o.waves; i++) {
      const at = 0.15 + i * o.every;
      events.push({ at, run: (api) => spineRow(api, o, [0.3, 0.5, 0.7, 0.5, 0.3][i % 5], [1, 6, 3, 0, 5][i % 5]) });
      sound(events, at + o.warn + (i % 5 === 3 ? 2 * o.step : 0), 'baron_eruption');
    }
    return timeline(o.duration, events);
  },
  baron_maw_breath(o = {}) {
    o = { duration: 6.8, warn: 0.7, hold: 0.9, rows: 6, step: 0.045, spread: 20, every: 2.1, waves: 3, ...o };
    const events = [];
    for (let i = 0; i < o.waves; i++) {
      const at = 0.2 + i * o.every;
      events.push({ at, run: (api) => breath(api, o, [0.32, 0.68, 0.5][i % 3]) });
      sound(events, at, 'baron_roar');
    }
    return timeline(o.duration, events);
  },
  baron_tendril_cage(o = {}) {
    o = { duration: 6.8, warn: 0.65, hold: 0.85, segments: 26, rings: 2, radius: 63, constrict: 18, ringDelay: 0.35, flatten: 0.82, gapAngle: 0.66, every: 2.2, waves: 3, ...o };
    const events = [];
    for (let i = 0; i < o.waves; i++) {
      const at = 0.15 + i * o.every;
      events.push({ at, run: (api) => enclosure(api, o, i % 2 ? -Math.PI / 2 : Math.PI / 2) });
      sound(events, at + o.warn, 'baron_slam');
    }
    return timeline(o.duration, events);
  },
  baron_predatory_surge(o = {}) {
    o = { duration: 6.9, warn: 0.6, hold: 0.65, segments: 13, segmentDelay: 0.025, reach: 0.66, bend: 0.26,
      poolHold: 1.3, poolOffset: 32, lobHeight: 18, columns: 8, step: 0.045, rows: 6, spread: 18, ...o };
    const events = [
      { at: 0.1, run: (api) => { tentacle(api, o, 0, o.bend); spit(api, o, -1); } },
      { at: 1.55, run: (api) => spineRow(api, o, 0.72, 3) },
      { at: 2.8, run: (api) => { tentacle(api, o, 1, -o.bend); spit(api, o, 1); } },
      { at: 4.2, run: (api) => spineRow(api, o, 0.3, 3) },
      { at: 5.35, run: (api) => breath(api, o, 0.5) },
    ];
    sound(events, 0.1 + o.warn, 'baron_slam');
    sound(events, 1.55 + o.warn, 'baron_eruption');
    sound(events, 2.8 + o.warn, 'baron_slam');
    sound(events, 4.2 + o.warn, 'baron_eruption');
    sound(events, 5.35, 'baron_roar');
    return timeline(o.duration, events);
  },
};
