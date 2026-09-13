const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

function timeline(duration, events) {
  events.sort((a, b) => a.at - b.at);
  let index = 0;
  return { duration, update(t, dt, api) {
    while (index < events.length && events[index].at <= t && t < duration) events[index++].run(api);
  } };
}

function arranged(duration, phases) {
  return { duration, update(t, dt, api) {
    for (const phase of phases) {
      const local = t - phase.at;
      if (local >= 0 && local < phase.pattern.duration) phase.pattern.update(local, dt, api);
    }
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
  const warn = o.echo ? Math.max(0.3, o.echoWarn ?? 0.3) : Math.max(o.warn ?? 2.2, travel + 0.35);
  api.emit({ shape: 'mankatsuki_stampede', x: box.x + box.w / 2, y: box.y + box.h / 2, box, safeRight, safeSize,
    image: api.images?.pig, r: 0, warn, echo: !!o.echo, fall: o.fall ?? 0.35, life: warn + (o.hit ?? 0.7),
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
  if (o.aim) {
    const index = clamp(Math.round((api.soul.x - box.x - 4) / (box.w - 8) * 6), 0, 6);
    const offset = api.soul.y - points[index].y;
    for (const point of points) point.y = clamp(point.y + offset, box.y + 12, box.y + box.h - 12);
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

function taco(api, edge, o) {
  const box = { ...api.box }, inset = o.inset ?? 22, size = o.size ?? 42, r = o.r ?? 12;
  const from = { x: box.x + inset + edge[0] * (box.w - inset * 2), y: box.y + inset + edge[1] * (box.h - inset * 2) };
  const target = { ...api.soul }, angle = Math.atan2(target.y - from.y, target.x - from.x);
  const dx = Math.cos(angle), dy = Math.sin(angle), margin = size / 2;
  const endX = dx > 0 ? box.x + box.w + margin : box.x - margin;
  const endY = dy > 0 ? box.y + box.h + margin : box.y - margin;
  const distance = Math.min(Math.abs(dx) > 0.0001 ? (endX - from.x) / dx : Infinity,
    Math.abs(dy) > 0.0001 ? (endY - from.y) / dy : Infinity);
  const speed = o.speed ?? 240, flight = distance / speed, warn = Math.max(0.7, o.warn ?? 0.85), recover = o.recover ?? 0.24;
  const to = { x: from.x + dx * distance, y: from.y + dy * distance };
  const sfx = api.sfx, present = api.present;
  api.emit({ shape: 'mankatsuki_taco', x: from.x, y: from.y, box, target, from, to,
    image: api.images?.taco, w: size, h: size, r, warn, flight, recover, life: warn + flight + recover,
    steer(b) {
      if (b.age >= warn && !b.launched) {
        b.launched = true; sfx?.('whoosh'); present?.({ sheet: 'attack' });
      }
      const travel = clamp(b.age - warn, 0, flight) * speed;
      b.x = from.x + dx * travel; b.y = from.y + dy * travel;
    },
    hitShape(b, soul) {
      return b.age >= warn && b.age < warn + flight && inArena(soul, box)
        && Math.hypot(soul.x - b.x, soul.y - b.y) <= r + Math.max(0, soul.r - 2);
    },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box);
      if (b.age < warn) {
        ctx.strokeStyle = 'rgba(255,142,176,0.15)'; ctx.lineWidth = r * 2;
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
        ctx.strokeStyle = '#ffc2d6'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.stroke();
        ctx.setLineDash([]); ctx.strokeRect(Math.round(target.x) - 4, Math.round(target.y) - 4, 8, 8);
      }
      const frame = b.age < warn * 0.45 ? 0 : b.age < warn ? 1 : b.age < warn + flight - recover ? 2 : 3;
      if (b.image) ctx.drawImage(b.image, frame * 64, 0, 64, 64,
        Math.round(b.x - size / 2), Math.round(b.y - size / 2), size, size);
      ctx.restore();
    } });
  api.sfx?.('mankatsuki_clone');
}

function foodTaco(api, fromRight, o, wave = 0) {
  const box = { ...api.box }, target = { x: api.soul.x, y: api.soul.y };
  const from = { x: fromRight ? box.x + box.w + 16 : box.x - 16, y: target.y };
  const warn = Math.max(0.55, o.warn ?? 0.7), flight = o.flight ?? 0.65;
  const arc = o.alternateArc && wave % 2 ? -28 : 28;
  api.emit({ shape: 'mankatsuki_food_taco', x: from.x, y: from.y, box, target, from,
    image: api.images?.foodTaco, w: 32, h: 32, r: 9, warn, flight, life: warn + flight + 0.08,
    steer(b) {
      if (b.age >= warn && !b.launched) { b.launched = true; api.sfx?.('whoosh'); }
      const u = clamp((b.age - warn) / flight, 0, 1);
      b.x = from.x + (target.x - from.x) * u; b.y = from.y - Math.sin(u * Math.PI) * arc;
      b.rot = (fromRight ? -1 : 1) * u * Math.PI;
      if (u < 1 || b.burst) return;
      b.burst = true; api.sfx?.('hit');
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + i * Math.PI / 2 + (o.alternateArc ? wave % 2 * Math.PI / 4 : 0);
        api.emit({ shape: 'mankatsuki_food_chip', x: target.x, y: target.y, r: 3,
          vx: Math.cos(angle) * (o.chipSpeed ?? 58), vy: Math.sin(angle) * (o.chipSpeed ?? 58), life: 0.75,
          hitShape(chip, soul) { return inArena(soul, box) && Math.hypot(soul.x - chip.x, soul.y - chip.y) <= 3 + Math.max(0, soul.r - 2); },
          drawShape(ctx, chip) {
            ctx.save(); clipArena(ctx, box); ctx.translate(Math.round(chip.x), Math.round(chip.y));
            ctx.fillStyle = i % 2 ? '#75b84c' : '#efad45';
            polygon(ctx, [{ x: -3, y: 3 }, { x: 0, y: -4 }, { x: 4, y: 3 }]); ctx.fill();
            ctx.fillStyle = '#ffe4a0'; ctx.fillRect(-1, 0, 2, 2); ctx.restore();
          } });
      }
    },
    hitShape(b, soul) {
      return b.age >= warn && b.age <= warn + flight && inArena(soul, box)
        && Math.hypot(soul.x - b.x, soul.y - b.y) <= b.r + Math.max(0, soul.r - 2);
    },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box);
      if (b.age < warn + flight) {
        ctx.strokeStyle = '#ffd57d'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const u = i / 16, x = from.x + (target.x - from.x) * u, y = from.y - Math.sin(u * Math.PI) * arc;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(target.x, target.y, 15, 0, Math.PI * 2); ctx.stroke();
      }
      if (!b.burst && b.image) {
        ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
        ctx.drawImage(b.image, -16, -16, 32, 32);
      }
      ctx.restore();
    } });
}

function motorcycle(api, fromRight, o, wave = 0) {
  const box = { ...api.box }, offsets = o.laneOffsets ?? [0];
  const lane = clamp(api.soul.y + offsets[wave % offsets.length], box.y + 10, box.y + box.h - 10);
  const from = fromRight ? box.x + box.w + 30 : box.x - 30, direction = fromRight ? -1 : 1;
  const warn = Math.max(0.55, o.warn ?? 0.75), speed = o.speed ?? 280, flight = (box.w + 60) / speed;
  api.emit({ shape: 'mankatsuki_motorcycle', x: from, y: lane, box, lane, direction,
    image: api.images?.motorcycle, w: 60, h: 40, r: 0, warn, flight, life: warn + flight,
    steer(b) {
      if (b.age >= warn && !b.launched) { b.launched = true; api.sfx?.('rocket'); }
      b.x = from + direction * clamp(b.age - warn, 0, flight) * speed;
    },
    hitShape(b, soul) {
      if (b.age < warn || b.age >= warn + flight || !inArena(soul, box)) return false;
      const dx = Math.max(0, Math.abs(soul.x - b.x) - 22), dy = Math.max(0, Math.abs(soul.y - lane) - 9);
      return Math.hypot(dx, dy) <= Math.max(0, soul.r - 2);
    },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box);
      if (b.age < warn) {
        ctx.fillStyle = 'rgba(255,192,70,0.14)'; ctx.fillRect(box.x + 3, lane - 13, box.w - 6, 26);
        ctx.strokeStyle = '#ffd57d'; ctx.lineWidth = 1; ctx.setLineDash([7, 5]);
        ctx.beginPath(); ctx.moveTo(box.x + 3, lane); ctx.lineTo(box.x + box.w - 3, lane); ctx.stroke(); ctx.setLineDash([]);
        const tip = fromRight ? box.x + box.w - 9 : box.x + 9;
        polygon(ctx, [{ x: tip, y: lane }, { x: tip - direction * 10, y: lane - 6 }, { x: tip - direction * 10, y: lane + 6 }]);
        ctx.fillStyle = '#ffd57d'; ctx.fill();
      }
      if (b.image) {
        ctx.translate(Math.round(b.x), Math.round(lane)); ctx.scale(-direction, 1);
        ctx.drawImage(b.image, -30, -20, 60, 40);
      }
      ctx.restore();
    } });
}

/** Junhee's teleport, pig faces, flames, stocks, food and motorcycle attacks. */
export const MANKATSUKI_PATTERNS = {
  mankatsuki_teleport: (o = {}) => {
    const events = [], duration = o.duration ?? 6.2, warn = Math.max(0.3, o.warn ?? 0.55);
    for (let wave = 0; wave < (o.waves ?? 4); wave++) {
      const at = 0.1 + wave * (o.every ?? 1.2); let from, angle, pose;
      const bursts = o.bursts ?? 1, burstGap = o.burstGap ?? 0.12;
      events.push({ at, run(api) { api.present?.({ hidden: true }); } });
      events.push({ at: at + 0.16, run(api) {
        const b = api.box, top = wave % 2 === 0;
        const x = top ? b.x + b.w * (0.25 + api.rnd() * 0.5) : (wave % 4 === 1 ? b.x + 18 : b.x + b.w + 18);
        from = { x, y: top ? b.y - 10 : b.y + b.h * 0.42 };
        pose = { x, y: from.y + 20, sheet: 'idle', scale: 0.45, flipX: x < b.x + b.w / 2 };
        angle = Math.atan2(api.soul.y - from.y, api.soul.x - from.x);
        api.present?.(pose); api.sfx?.('mankatsuki_clone'); smoke(api, x, pose.y - 25);
        for (let burst = 0; burst < bursts; burst++) for (let ray = -1; ray <= 1; ray++) {
          const aim = angle + ray * 0.34 + (burst ? (wave % 2 ? -1 : 1) * 0.14 : 0);
          guide(api, from, { x: from.x + Math.cos(aim) * 500, y: from.y + Math.sin(aim) * 500 }, warn + burst * burstGap);
        }
      } });
      for (let burst = 0; burst < bursts; burst++) events.push({ at: at + 0.16 + warn + burst * burstGap, run(api) {
        api.present?.({ ...pose, sheet: 'attack' }); api.sfx?.('whoosh');
        for (let ray = -1; ray <= 1; ray++) shuriken(api, from, angle + ray * 0.34 + (burst ? (wave % 2 ? -1 : 1) * 0.14 : 0),
          o.speed ?? 134, Math.min(2.6, duration - at - 0.16 - warn - burst * burstGap - 0.04));
      } });
    }
    events.push({ at: duration - 0.3, run(api) { api.present?.(null); } });
    return timeline(duration, events);
  },
  mankatsuki_stampede: (o = {}) => {
    const duration = o.duration ?? 7, events = []; let safeRight;
    for (let wave = 0; wave < 2; wave++) events.push({ at: 0.15 + wave * (o.every ?? 3.35), run(api) {
      safeRight = wave ? !safeRight : api.rnd() >= 0.5;
      const warn = stampede(api, safeRight, o);
      events.push({ at: 0.15 + wave * (o.every ?? 3.35) + warn, run(api) { api.sfx?.('baron_slam'); api.present?.({ sheet: 'attack' }); } });
      if (o.echoDelay != null) {
        const side = safeRight, strikeAt = 0.15 + wave * (o.every ?? 3.35) + warn + o.echoDelay;
        events.push({ at: strikeAt - Math.max(0.3, o.echoWarn ?? 0.3), run(api) { stampede(api, side, { ...o, echo: true }); } });
        events.push({ at: strikeAt, run(api) { api.sfx?.('baron_slam'); api.present?.({ sheet: 'attack' }); } });
      }
      events.sort((a, b) => a.at - b.at);
    } });
    return timeline(duration, events);
  },
  mankatsuki_pan: (o = {}) => {
    const events = [], duration = o.duration ?? 6, warn = Math.max(0.3, o.warn ?? 0.6);
    const positions = o.positions ?? [0.23, 0.73, 0.43, 0.8];
    for (let wave = 0; wave < (o.waves ?? 4); wave++) {
      const at = 0.15 + wave * (o.every ?? 1.1); let x;
      events.push({ at, run(api) {
        const b = api.box; x = b.x + b.w * positions[wave % positions.length];
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
    for (let wave = 0; wave < (o.waves ?? 4); wave++) {
      const at = 0.6 + wave * (o.every ?? 1.3);
      events.push({ at, run(api) { api.present?.({ sheet: 'attack' }); stock(api, wave % 2 ? !firstRising : firstRising, o); } });
      events.push({ at: at + Math.max(0.3, o.warn ?? 0.75), run(api) { api.sfx?.('hit'); } });
    }
    return timeline(duration, events);
  },
  mankatsuki_taco: (o = {}) => {
    const duration = o.duration ?? 6.8, events = [];
    const edges = o.edges ?? [[0, 0.2], [0.55, 0], [1, 0.65], [1, 0.2], [0.45, 1], [0, 0.65]];
    for (let index = 0; index < (o.count ?? edges.length); index++) {
      const offset = o.every != null ? index * o.every : Math.floor(index / 3) * (o.waveGap ?? 3.05) + index % 3 * (o.stagger ?? 0.46);
      events.push({ at: (o.start ?? 0.2) + offset, run(api) { taco(api, edges[index % edges.length], o); } });
    }
    events.push({ at: duration - 0.15, run(api) { api.present?.(null); } });
    return timeline(duration, events);
  },
  mankatsuki_food_taco: (o = {}) => {
    const duration = o.duration ?? 6.6, events = [];
    for (let wave = 0; wave < (o.waves ?? 4); wave++) events.push({ at: 0.15 + wave * (o.every ?? 1.25),
      run(api) { api.present?.({ sheet: 'attack' }); foodTaco(api, wave % 2 === 0, o, wave); } });
    return timeline(duration, events);
  },
  mankatsuki_motorcycle: (o = {}) => {
    const duration = o.duration ?? 6.6, events = [];
    for (let wave = 0; wave < (o.waves ?? 4); wave++) events.push({ at: 0.15 + wave * (o.every ?? 1.35),
      run(api) { api.present?.({ sheet: 'attack' }); motorcycle(api, wave % 2 === 0, o, wave); } });
    return timeline(duration, events);
  },
  mankatsuki_taco_pan: (o = {}) => arranged(o.duration ?? 7.4, [
    { at: 0, pattern: MANKATSUKI_PATTERNS.mankatsuki_taco(o.taco) },
    { at: o.panAt ?? 0.65, pattern: MANKATSUKI_PATTERNS.mankatsuki_pan(o.pan ?? { waves: 3, every: 1.85 }) },
  ]),
  mankatsuki_taco_stocks: (o = {}) => arranged(o.duration ?? 7.4, [
    { at: 0, pattern: MANKATSUKI_PATTERNS.mankatsuki_taco(o.taco) },
    { at: o.stocksAt ?? 0.35, pattern: MANKATSUKI_PATTERNS.mankatsuki_stocks(o.stocks ?? { waves: 3, every: 1.95, aim: true }) },
  ]),
  mankatsuki_teleport_taco: (o = {}) => arranged(o.duration ?? 7.8, [
    { at: 0, pattern: MANKATSUKI_PATTERNS.mankatsuki_teleport(o.teleport ?? { waves: 6, every: 0.95, duration: 7.4 }) },
    { at: o.tacoAt ?? 1.1, pattern: MANKATSUKI_PATTERNS.mankatsuki_taco(o.taco ?? { waveGap: 2.8, stagger: 0.42 }) },
  ]),
  mankatsuki_food_motorcycle: (o = {}) => arranged(o.duration ?? 7.4, [
    { at: 0, pattern: MANKATSUKI_PATTERNS.mankatsuki_food_taco(o.food ?? { waves: 4, every: 1.4 }) },
    { at: o.motorcycleAt ?? 0.65, pattern: MANKATSUKI_PATTERNS.mankatsuki_motorcycle(o.motorcycle ?? { waves: 3, every: 1.8, warn: 0.8 }) },
  ]),
  mankatsuki_clone_crossfire: (o = {}) => {
    const duration = o.duration ?? 7.2, events = [], count = clamp(o.clones ?? 2, 1, 3);
    const warn = Math.max(0.3, o.warn ?? 0.7), stagger = o.stagger ?? 0.18, spread = o.spread ?? 0.3;
    for (let wave = 0; wave < (o.waves ?? 4); wave++) {
      const at = 0.15 + wave * (o.every ?? 1.1); let poses, shots;
      events.push({ at, run(api) {
        const b = api.box;
        const anchors = wave % 2 ? [[0.22, -0.16], [0.78, -0.16], [1.14, 0.2]] : [[0.08, -0.16], [1.14, 0.45], [0.5, -0.16]];
        shots = anchors.slice(0, count).map(([x, y]) => {
          const from = { x: b.x + x * b.w, y: b.y + y * b.h };
          return { from, angle: Math.atan2(api.soul.y - from.y, api.soul.x - from.x) };
        });
        poses = shots.map(({ from }) => ({ x: from.x, y: from.y + 20, scale: 0.45, sheet: 'idle', flipX: from.x < b.x + b.w / 2 }));
        api.present?.({ hidden: true, clones: poses }); api.sfx?.('mankatsuki_clone');
        shots.forEach(({ from, angle }, index) => {
          smoke(api, from.x, from.y);
          for (let ray = -1; ray <= 1; ray++) guide(api, from,
            { x: from.x + Math.cos(angle + ray * spread) * 500, y: from.y + Math.sin(angle + ray * spread) * 500 }, warn + index * stagger);
        });
      } });
      for (let index = 0; index < count; index++) events.push({ at: at + warn + index * stagger, run(api) {
        const { from, angle } = shots[index];
        poses = poses.map((pose, i) => i === index ? { ...pose, sheet: 'attack' } : pose);
        api.present?.({ hidden: true, clones: poses }); api.sfx?.('whoosh');
        for (let ray = -1; ray <= 1; ray++) shuriken(api, from, angle + ray * spread, o.speed ?? 134,
          Math.min(2.6, duration - at - warn - index * stagger - 0.04));
      } });
    }
    events.push({ at: duration - 0.15, run(api) { api.present?.(null); } });
    return timeline(duration, events);
  },
};
