import { createChoimisJjajang } from './choimis-jjajang.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function clipArena(ctx, box) {
  ctx.beginPath(); ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6); ctx.clip();
}

function segmentDistance(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const amount = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(point.x - start.x - dx * amount, point.y - start.y - dy * amount);
}

function beamEnd(box, source, target) {
  const dx = target.x - source.x, dy = target.y - source.y;
  const candidates = [];
  for (const x of [box.x + 3, box.x + box.w - 3]) {
    const amount = (x - source.x) / dx, y = source.y + dy * amount;
    if (amount > 1 && y >= box.y + 3 && y <= box.y + box.h - 3) candidates.push({ amount, x, y });
  }
  for (const y of [box.y + 3, box.y + box.h - 3]) {
    const amount = (y - source.y) / dy, x = source.x + dx * amount;
    if (amount > 1 && x >= box.x + 3 && x <= box.x + box.w - 3) candidates.push({ amount, x, y });
  }
  candidates.sort((a, b) => a.amount - b.amount);
  return candidates[0] || target;
}

function drawBloodBeam(ctx, bullet) {
  ctx.save();
  ctx.lineCap = 'butt';
  if (bullet.age < bullet.warn) {
    ctx.strokeStyle = Math.floor(bullet.age * 12) % 2 ? '#ff9b9b' : '#9b2636';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
  } else {
    ctx.strokeStyle = '#5d0717';
    ctx.lineWidth = bullet.width + 4;
    ctx.beginPath();
    ctx.moveTo(bullet.ax, bullet.ay);
    ctx.lineTo(bullet.bx, bullet.by);
    ctx.stroke();
    ctx.strokeStyle = '#ef2648';
    ctx.lineWidth = bullet.width;
  }
  ctx.beginPath();
  ctx.moveTo(bullet.ax, bullet.ay);
  ctx.lineTo(bullet.bx, bullet.by);
  ctx.stroke();
  if (bullet.age >= bullet.warn) {
    ctx.strokeStyle = '#ff8792';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function hitBloodBeam(bullet, soul) {
  return soul.x >= bullet.box.x + 3 && soul.x <= bullet.box.x + bullet.box.w - 3
    && soul.y >= bullet.box.y + 3 && soul.y <= bullet.box.y + bullet.box.h - 3
    && bullet.age >= bullet.warn && bullet.age < bullet.life
    && segmentDistance(soul, { x: bullet.ax, y: bullet.ay }, { x: bullet.bx, y: bullet.by }) <= bullet.width / 2 + Math.max(0, soul.r - 2);
}

function emitBloodBeam(api, options) {
  const box = { ...api.box }, actor = api.actor || { x: box.x + box.w + 56, y: box.y + 37, scale: 1 }, scale = actor.scale ?? 1;
  const source = { x: actor.x + (options.handX ?? -38) * scale, y: actor.y + (options.handY ?? -78) * scale };
  const target = { x: api.soul.x, y: api.soul.y };
  const end = beamEnd(box, source, target), warn = Math.max(0.3, options.warn ?? 0.55);
  api.emit({ shape: 'choimis_blood_beam', box, x: (source.x + end.x) / 2, y: (source.y + end.y) / 2,
    ax: source.x, ay: source.y, bx: end.x, by: end.y, width: options.width ?? 12, r: 0,
    warn, life: warn + (options.hit ?? 0.28), drawShape: drawBloodBeam, hitShape: hitBloodBeam });
  return warn;
}

function drawMoney(ctx, bullet) {
  ctx.save();
  clipArena(ctx, bullet.box);
  if (bullet.age < bullet.warn) {
    ctx.strokeStyle = '#f4dc69';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(bullet.startX, bullet.startY);
    ctx.lineTo(bullet.endX, bullet.endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.5;
  }
  ctx.translate(Math.round(bullet.x), Math.round(bullet.y));
  ctx.rotate(bullet.rot);
  const width = bullet.noteWidth, height = bullet.noteHeight;
  ctx.fillStyle = bullet.age < bullet.warn ? '#294d38' : '#8fd39b';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.strokeStyle = '#f2ffe9';
  ctx.lineWidth = 1;
  ctx.strokeRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2);
  ctx.fillStyle = '#244b31';
  ctx.fillRect(-2, -3, 4, 6);
  ctx.fillStyle = '#fff7b0';
  ctx.fillRect(-7, -2, 2, 5);
  ctx.fillRect(-4, -2, 1, 5);
  ctx.fillRect(4, -2, 1, 5);
  ctx.fillRect(6, -2, 2, 5);
  ctx.restore();
}

function hitMoney(bullet, soul) {
  if (bullet.age < bullet.warn || bullet.age >= bullet.life) return false;
  if (soul.x < bullet.box.x + 3 || soul.x > bullet.box.x + bullet.box.w - 3
    || soul.y < bullet.box.y + 3 || soul.y > bullet.box.y + bullet.box.h - 3) return false;
  const dx = soul.x - bullet.x, dy = soul.y - bullet.y, cosine = Math.cos(bullet.rot), sine = Math.sin(bullet.rot);
  const localX = dx * cosine + dy * sine, localY = -dx * sine + dy * cosine;
  const x = Math.max(-bullet.noteWidth / 2, Math.min(localX, bullet.noteWidth / 2));
  const y = Math.max(-bullet.noteHeight / 2, Math.min(localY, bullet.noteHeight / 2));
  return Math.hypot(localX - x, localY - y) <= Math.max(0, soul.r - 2);
}

function emitMoney(api, side, lane, targetLane, options, phase) {
  const box = { ...api.box }, horizontal = side < 2;
  const startX = side === 0 ? box.x + 4 : side === 1 ? box.x + box.w - 4 : box.x + 12 + lane * (box.w - 24);
  const startY = side === 2 ? box.y + 4 : side === 3 ? box.y + box.h - 4 : box.y + 12 + lane * (box.h - 24);
  const endX = side === 0 ? box.x + box.w - 4 : side === 1 ? box.x + 4 : box.x + 12 + targetLane * (box.w - 24);
  const endY = side === 2 ? box.y + box.h - 4 : side === 3 ? box.y + 4 : box.y + 12 + targetLane * (box.h - 24);
  const warn = Math.max(0.3, options.warn ?? 0.5), flight = options.flight ?? 1.05;
  api.emit({ shape: 'choimis_money_note', box, x: startX, y: startY, startX, startY, endX, endY,
    noteWidth: options.noteWidth ?? 18, noteHeight: options.noteHeight ?? 10, denomination: '1500', r: 0,
    warn, life: warn + flight + 0.05, rot: horizontal ? phase * 0.25 : Math.PI / 2 + phase * 0.25,
    spin: (phase % 2 ? -1 : 1) * 2.4, drawShape: drawMoney, hitShape: hitMoney,
    steer(bullet) {
      const amount = clamp((bullet.age - warn) / flight, 0, 1);
      bullet.x = startX + (endX - startX) * amount;
      bullet.y = startY + (endY - startY) * amount;
    } });
}

/** Choimis-owned signature attacks; dialogue stays in enemy pattern config except exact in-pattern calls. */
export const CHOIMIS_PATTERNS_A = {
  choimis_jjajang: createChoimisJjajang,
  choimis_choso(options = {}) {
    const duration = options.duration ?? 6.6, times = [0.12, 0.95, 1.78, 3.55, 4.38, 5.21], fires = [], holds = [];
    let shot = 0, announced = false, restored = false, costume = options.costume ?? 'choso';
    return { duration, update(t, dt, api) {
      if (!announced) { announced = true; api.present?.({ sheet: costume, frame: 0 }); api.say?.('천혈!', 0.6); }
      while (shot < times.length && t >= times[shot]) {
        const warn = emitBloodBeam(api, options); api.present?.({ sheet: costume, frame: 1 }); fires.push(times[shot] + warn);
        api.sfx?.('laser_charge', { volume: options.chargeVolume ?? 0.18, len: options.chargeLength ?? 0.28 });
        shot++;
      }
      while (fires.length && t >= fires[0]) { fires.shift(); api.present?.({ sheet: costume, frame: 2 }); api.sfx?.(options.beamSfx ?? 'laser_beam', { volume: options.beamVolume ?? 0.22, len: options.beamLength ?? 0.22 }); holds.push(t + 0.14); }
      while (holds.length && t >= holds[0]) { holds.shift(); api.present?.({ sheet: costume, frame: 3 }); }
      if (!restored && t >= duration - 0.05) { restored = true; api.present?.(null); }
    } };
  },
  choimis_money(options = {}) {
    const duration = options.duration ?? 6.4, every = options.every ?? 0.82;
    const sides = [2, 0, 3, 1, 2, 3], gaps = [1, 4, 4, 1, 2, 5];
    let wave = 0, announced = false;
    return { duration, update(t, dt, api) {
      if (!announced) { announced = true; api.say?.('1500만원', 0.8); }
      while (wave < 6 && t >= 0.15 + wave * every) {
        for (let lane = 0; lane < 8; lane++) {
          if (lane === gaps[wave] || lane === gaps[wave] + 1) continue;
          const startLane = lane / 7;
          const targetLane = wave % 2 ? clamp(startLane + (lane < gaps[wave] ? -0.06 : 0.06), 0, 1) : startLane;
          emitMoney(api, sides[wave], startLane, targetLane, options, wave + lane);
        }
        api.sfx?.('bell', { volume: 0.45 });
        wave++;
      }
    } };
  },
};
