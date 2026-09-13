const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

function timeline(duration, events) {
  events.sort((a, b) => a.at - b.at);
  let index = 0;
  return { duration, update(t, dt, api) {
    while (index < events.length && events[index].at <= t && t < duration) events[index++].run(api);
  } };
}

function clipArena(ctx, box) {
  ctx.beginPath(); ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6); ctx.clip();
}

function inArena(soul, box) {
  return soul.x >= box.x + 3 && soul.x <= box.x + box.w - 3 && soul.y >= box.y + 3 && soul.y <= box.y + box.h - 3;
}

function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - dx * u, p.y - a.y - dy * u);
}

function polygon(ctx, points) {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(Math.round(p.x), Math.round(p.y)) : ctx.moveTo(Math.round(p.x), Math.round(p.y))); ctx.closePath();
}

function hitPolygon(soul, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if (segmentDistance(soul, a, b) <= soul.r) return true;
    if ((a.y > soul.y) !== (b.y > soul.y) && soul.x < (b.x - a.x) * (soul.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function drawIcon(ctx, b) {
  if (!b.image) return;
  ctx.save(); clipArena(ctx, b.box); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
  ctx.drawImage(b.image, -b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
}

function smoke(api, x, y) {
  api.emit({ shape: 'mankatsuki_smoke', x, y, harmless: true, life: 0.35, r: 0,
    drawShape(ctx, b) {
      ctx.save(); ctx.globalAlpha = 1 - b.age / b.life;
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7, d = 5 + b.age * 45;
        ctx.fillStyle = i % 2 ? '#30303e' : '#0b0b13';
        ctx.fillRect(Math.round(x + Math.cos(a) * d - 5), Math.round(y + Math.sin(a) * d - 5), 10, 10);
      }
      ctx.restore();
    } });
}

function guide(api, from, to, life) {
  api.emit({ shape: 'mankatsuki_aim', x: api.box.x + api.box.w / 2, y: api.box.y, r: 0, harmless: true, life,
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, api.box); ctx.strokeStyle = Math.floor(b.age * 10) % 2 ? '#d96a88' : '#ffc2d6';
      ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.restore();
    } });
}

function shuriken(api, from, angle, speed, life) {
  api.emit({ shape: 'mankatsuki_shuriken', box: { ...api.box }, image: api.images?.shuriken,
    x: from.x, y: from.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    w: 24, h: 24, r: 8, spin: 7, life, drawShape: drawIcon,
    hitShape(b, soul) {
      if (!inArena(soul, b.box)) return false;
      const dx = soul.x - b.x, dy = soul.y - b.y;
      const p = { x: dx * Math.cos(b.rot) + dy * Math.sin(b.rot), y: -dx * Math.sin(b.rot) + dy * Math.cos(b.rot), r: soul.r };
      return hitPolygon(p, [{ x: 0, y: -10 }, { x: 3, y: -3 }, { x: 10, y: 0 }, { x: 3, y: 3 },
        { x: 0, y: 10 }, { x: -3, y: 3 }, { x: -10, y: 0 }, { x: -3, y: -3 }]);
    } });
}

function stampedePolygon(b) {
  const box = b.box, left = box.x + 3, right = box.x + box.w - 3, top = box.y + 3, bottom = box.y + box.h - 3;
  const front = b.age < b.warn ? bottom : Math.min(bottom, top + (b.age - b.warn) / b.fall * (bottom - top));
  const triangle = Math.max(0, b.safeSize - (bottom - front));
  if (b.safeRight) return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: Math.min(front, bottom - b.safeSize) },
    { x: right - triangle, y: front }, { x: left, y: front }];
  return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: front },
    { x: left + triangle, y: front }, { x: left, y: Math.min(front, bottom - b.safeSize) }];
}

function stampede(api, safeRight, o) {
  const box = { ...api.box }, safeSize = o.safeSize ?? 70;
  const travel = Math.hypot(box.w - 21, box.h - 21) / 110;
  const warn = Math.max(o.warn ?? 2.2, travel + 0.35);
  api.emit({ shape: 'mankatsuki_stampede', x: box.x + box.w / 2, y: box.y + box.h / 2, box, safeRight, safeSize,
    image: api.images?.pig, r: 0, warn, fall: o.fall ?? 0.35, life: warn + (o.hit ?? 0.7),
    hitShape(b, soul) { return b.age >= b.warn && inArena(soul, box) && hitPolygon(soul, stampedePolygon(b)); },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box); polygon(ctx, stampedePolygon(b));
      if (b.age < b.warn) {
        ctx.fillStyle = `rgba(235,45,72,${0.14 + b.age / b.warn * 0.22})`; ctx.fill();
        ctx.strokeStyle = '#ff7691'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff';
        const cx = safeRight ? box.x + box.w - 18 : box.x + 18, cy = box.y + box.h - 18;
        ctx.fillRect(cx - 5, cy, 10, 2); ctx.fillRect(cx, cy - 5, 2, 10);
      } else {
        ctx.fillStyle = '#686873'; ctx.fill(); ctx.clip();
        const offset = Math.round((b.age - b.warn) * 230) % 26;
        for (let y = box.y - 26 + offset; y < box.y + box.h + 26; y += 26)
          for (let x = box.x - 12; x < box.x + box.w; x += 26)
            if (b.image) ctx.drawImage(b.image, Math.round(x), Math.round(y), 30, 30);
      }
      ctx.restore();
    } });
  return warn;
}

function flame(api, x, speed, drift, life) {
  const box = { ...api.box };
  api.emit({ shape: 'mankatsuki_flame', x, y: box.y + box.h + 14, vx: drift, vy: -speed, r: 7, life,
    hitShape(b, soul) {
      if (!inArena(soul, box)) return false;
      return hitPolygon(soul, [{ x: b.x, y: b.y - 13 }, { x: b.x + 7, y: b.y + 2 }, { x: b.x + 4, y: b.y + 9 },
        { x: b.x - 5, y: b.y + 9 }, { x: b.x - 8, y: b.y + 2 }]);
    },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box); const x = Math.round(b.x), y = Math.round(b.y);
      ctx.fillStyle = '#ff6137';
      for (const [dx, dy, w, h] of [[-2,-13,4,6],[-5,-7,10,7],[-8,0,15,5],[-5,5,10,4]]) ctx.fillRect(x + dx, y + dy, w, h);
      ctx.fillStyle = '#ffe8a1'; ctx.fillRect(x - 2, y - 5, 4, 9); ctx.fillRect(x - 4, y + 1, 8, 5); ctx.restore();
    } });
}

function stock(api, rising, o) {
  const box = { ...api.box }, points = [], warn = Math.max(0.3, o.warn ?? 0.75), hit = o.hit ?? 0.4;
  const shift = (api.rnd() - 0.5) * box.h * 0.22;
  for (let i = 0; i < 7; i++) {
    const trend = rising ? 0.8 - i / 6 * 0.6 : 0.2 + i / 6 * 0.6;
    const correction = (i % 2 ? 1 : -1) * (0.06 + api.rnd() * 0.1);
    points.push({ x: box.x + 4 + i / 6 * (box.w - 8), y: clamp(box.y + box.h * (trend + correction) + shift, box.y + 12, box.y + box.h - 12) });
  }
  api.emit({ shape: 'mankatsuki_stock', x: box.x + box.w / 2, y: box.y + box.h / 2, points, rising,
    r: 0, warn, life: warn + hit, thickness: o.thickness ?? 6,
    hitShape(b, soul) { return b.age >= b.warn && inArena(soul, box) && points.slice(1).some((p, i) => segmentDistance(soul, points[i], p) <= soul.r + b.thickness / 2); },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box); ctx.lineJoin = 'miter';
      ctx.strokeStyle = rising ? '#ff8085' : '#89baff'; ctx.lineWidth = b.age < b.warn ? 1 : b.thickness;
      if (b.age < b.warn) ctx.setLineDash([4, 4]);
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(Math.round(p.x), Math.round(p.y)) : ctx.moveTo(Math.round(p.x), Math.round(p.y))); ctx.stroke();
      if (b.age >= b.warn) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
    } });
}

/** Junhee's own teleport, rear-pig stampede, frying-pan flame and stock-chart attacks. */
export const MANKATSUKI_PATTERNS = {
  mankatsuki_teleport: (o = {}) => {
    const events = [], duration = o.duration ?? 6.2, warn = Math.max(0.3, o.warn ?? 0.55);
    for (let wave = 0; wave < 4; wave++) {
      const at = 0.1 + wave * 1.2; let from, angle, pose;
      events.push({ at, run(api) { api.present?.({ hidden: true }); } });
      events.push({ at: at + 0.16, run(api) {
        const b = api.box, top = wave % 2 === 0;
        const x = top ? b.x + b.w * (0.25 + api.rnd() * 0.5) : (wave === 1 ? b.x - 20 : b.x + b.w + 20);
        pose = { x, y: top ? b.y - 4 : Math.min(308, b.y + b.h + 22), sheet: 'idle', scale: 0.65 };
        from = { x, y: top ? b.y - 10 : b.y + b.h + 10 };
        angle = Math.atan2(api.soul.y - from.y, api.soul.x - from.x);
        api.present?.(pose); api.sfx?.('mankatsuki_clone'); smoke(api, x, pose.y - 25);
        for (let ray = -1; ray <= 1; ray++) guide(api, from, { x: from.x + Math.cos(angle + ray * 0.34) * 500, y: from.y + Math.sin(angle + ray * 0.34) * 500 }, warn);
      } });
      events.push({ at: at + 0.16 + warn, run(api) {
        api.present?.({ ...pose, sheet: 'attack' }); api.sfx?.('whoosh');
        for (let ray = -1; ray <= 1; ray++) shuriken(api, from, angle + ray * 0.34, o.speed ?? 134, Math.min(2.6, duration - at - 0.16 - warn - 0.04));
      } });
    }
    events.push({ at: duration - 0.3, run(api) { api.present?.(null); } });
    return timeline(duration, events);
  },
  mankatsuki_stampede: (o = {}) => {
    const duration = o.duration ?? 7, events = []; let safeRight;
    for (let wave = 0; wave < 2; wave++) events.push({ at: 0.15 + wave * 3.35, run(api) {
      safeRight = wave ? !safeRight : api.rnd() >= 0.5;
      const warn = stampede(api, safeRight, o);
      events.push({ at: 0.15 + wave * 3.35 + warn, run(api) { api.sfx?.('thud'); api.present?.({ sheet: 'attack' }); } });
      events.sort((a, b) => a.at - b.at);
    } });
    return timeline(duration, events);
  },
  mankatsuki_pan: (o = {}) => {
    const events = [], duration = o.duration ?? 6, warn = Math.max(0.3, o.warn ?? 0.6);
    for (let wave = 0; wave < 4; wave++) {
      const at = 0.15 + wave * 1.1; let x;
      events.push({ at, run(api) {
        const b = api.box; x = b.x + b.w * [0.23, 0.73, 0.43, 0.8][wave];
        api.present?.({ sheet: 'attack' });
        api.emit({ shape: 'mankatsuki_pan', x, y: b.y + b.h - 12, w: 60, h: 30, box: { ...b }, image: api.images?.pan,
          harmless: true, life: 1, r: 0, drawShape: drawIcon });
        guide(api, { x, y: b.y + b.h - 20 }, { x, y: b.y + 4 }, warn);
      } });
      events.push({ at: at + warn, run(api) {
        api.sfx?.('rocket');
        for (let jet = -1; jet <= 1; jet++) flame(api, x + jet * 15, (o.speed ?? 118) + (jet === 0 ? 16 : 0), jet * 16, Math.min(2.1, duration - at - warn - 0.04));
      } });
    }
    return timeline(duration, events);
  },
  mankatsuki_stocks: (o = {}) => {
    const duration = o.duration ?? 6.2, events = []; let firstRising;
    events.push({ at: 0, run(api) { firstRising = api.rnd() >= 0.5; api.say?.('형님 주식 그거 사셔야겠습니까', 2.8); } });
    for (let wave = 0; wave < 4; wave++) {
      const at = 0.6 + wave * 1.3;
      events.push({ at, run(api) { api.present?.({ sheet: 'attack' }); stock(api, wave % 2 ? !firstRising : firstRising, o); } });
      events.push({ at: at + Math.max(0.3, o.warn ?? 0.75), run(api) { api.sfx?.('hit'); } });
    }
    return timeline(duration, events);
  },
};
