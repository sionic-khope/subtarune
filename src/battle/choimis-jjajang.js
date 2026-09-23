const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function clipArena(ctx, box) {
  ctx.beginPath(); ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6); ctx.clip();
}

function segmentDistance(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const amount = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(point.x - start.x - dx * amount, point.y - start.y - dy * amount);
}

function noodleGeometry(bullet) {
  const length = 42, normalX = -bullet.dirY, normalY = bullet.dirX;
  const strands = [];
  for (let strand = 0; strand < bullet.noodles; strand++) {
    const offset = (strand - (bullet.noodles - 1) / 2) * 5;
    const points = [];
    for (let step = 0; step <= 5; step++) {
      const distance = step / 5 * length;
      const wave = Math.sin(step * 1.7 + bullet.phase) * 2.5;
      points.push({
        x: bullet.x - bullet.dirX * (12 + distance) + normalX * (offset + wave),
        y: bullet.y - bullet.dirY * (12 + distance) + normalY * (offset + wave),
      });
    }
    strands.push(points);
  }
  return strands;
}

function drawJjajang(ctx, bullet) {
  ctx.save();
  clipArena(ctx, bullet.box);
  if (bullet.age < bullet.warn) {
    ctx.strokeStyle = '#d8a47b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(bullet.startX, bullet.startY);
    for (let step = 1; step <= 16; step++) {
      const u = step / 16;
      ctx.lineTo(bullet.startX + (bullet.endX - bullet.startX) * u, bullet.startY + Math.sin(u * Math.PI) * bullet.arcHeight);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.45 + Math.sin(bullet.age * 18) * 0.15;
  } else {
    ctx.strokeStyle = '#f0d88c';
    ctx.lineWidth = 3;
    for (const points of noodleGeometry(bullet)) {
      ctx.beginPath();
      points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.stroke();
    }
  }
  const x = Math.round(bullet.x), y = Math.round(bullet.y);
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(bullet.dirY, bullet.dirX) * 0.18);
  if (bullet.image) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bullet.image, -16, -13, 32, 27);
  } else {
    ctx.fillStyle = '#f2f0e8';
    ctx.fillRect(-15, -4, 30, 9);
    ctx.fillStyle = '#262022';
    ctx.fillRect(-12, -7, 24, 8);
    ctx.fillStyle = '#562b20';
    ctx.fillRect(-9, -5, 18, 5);
  }
  ctx.fillStyle = '#2a1714';
  ctx.fillRect(-9, -5, 18, 3);
  ctx.fillStyle = '#754126';
  ctx.fillRect(-7, -4, 4, 2);
  ctx.fillRect(3, -4, 5, 2);
  ctx.restore();
}

function hitJjajang(bullet, soul) {
  if (bullet.age < bullet.warn || bullet.age >= bullet.life) return false;
  if (soul.x < bullet.box.x + 3 || soul.x > bullet.box.x + bullet.box.w - 3
    || soul.y < bullet.box.y + 3 || soul.y > bullet.box.y + bullet.box.h - 3) return false;
  if (Math.hypot(soul.x - bullet.x, soul.y - bullet.y) <= 10 + Math.max(0, soul.r - 2)) return true;
  return noodleGeometry(bullet).some((points) => points.slice(1).some((end, index) =>
    segmentDistance(soul, points[index], end) <= 2 + Math.max(0, soul.r - 2)));
}

function emitJjajang(api, lane, fromLeft, options, phase, age = 0) {
  const box = { ...api.box }, startX = fromLeft ? box.x + 5 : box.x + box.w - 5;
  const endX = fromLeft ? box.x + box.w - 5 : box.x + 5;
  const startY = box.y + 10 + lane * (box.h - 20), endY = startY;
  const distance = Math.hypot(endX - startX, endY - startY), dirX = (endX - startX) / distance, dirY = (endY - startY) / distance;
  const warn = Math.max(0.3, options.warn ?? 0.5), flight = options.flight ?? 1.1;
  const wave = Math.floor(phase / 3), arcHeight = wave === 0 ? 0 : (wave === 1 ? 1 : -1) * (options.arcHeight ?? 22);
  api.emit({ shape: 'choimis_jjajang_bowl', box, image: api.images?.[options.assetKey ?? 'jjajang'], sauce: true,
    noodles: options.noodles ?? 3, phase, arcHeight, age, startX, startY, endX, endY, dirX, dirY, x: startX, y: startY,
    r: 0, warn, life: warn + flight + 0.05, drawShape: drawJjajang, hitShape: hitJjajang,
    steer(bullet) {
      const amount = clamp((bullet.age - warn) / flight, 0, 1);
      bullet.x = startX + (endX - startX) * amount;
      bullet.y = startY + Math.sin(amount * Math.PI) * arcHeight;
    } });
}

function emitSauce(api, wave, slot, options, age) {
  const box = { ...api.box }, fromLeft = wave % 2 === 0;
  const startX = fromLeft ? box.x + 18 : box.x + box.w - 18;
  const startY = wave === 2 ? box.y + 15 : box.y + box.h - 15;
  const endX = startX + (fromLeft ? 1 : -1) * (45 + slot * 25);
  const endY = startY + (wave === 2 ? 1 : -1) * (slot * 13);
  const warn = Math.max(0.3, options.warn ?? 0.5), flight = options.splashFlight ?? 0.7;
  const radius = options.splashRadius ?? 9;
  api.emit({ shape: 'choimis_jjajang_splash', box, wave, slot, age, startX, startY, endX, endY,
    x: startX, y: startY, r: 0, radius, warn, life: warn + flight,
    steer(b) { const u = clamp((b.age - warn) / flight, 0, 1); b.x = startX + (endX - startX) * u; b.y = startY + (endY - startY) * u; },
    hitShape(b, soul) {
      return b.age >= warn && b.age < b.life && soul.x >= box.x + 3 && soul.x <= box.x + box.w - 3
        && soul.y >= box.y + 3 && soul.y <= box.y + box.h - 3
        && Math.hypot(soul.x - b.x, soul.y - b.y) <= radius + Math.max(0, soul.r - 2);
    },
    drawShape(ctx, b) {
      ctx.save(); clipArena(ctx, box);
      if (b.age < warn) {
        ctx.strokeStyle = '#d8a47b'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(endX, endY, radius, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = '#754126'; ctx.beginPath(); ctx.arc(Math.round(b.x), Math.round(b.y), radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#321a15'; ctx.beginPath(); ctx.arc(Math.round(b.x), Math.round(b.y), radius - 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#bd8150'; ctx.fillRect(Math.round(b.x - 4), Math.round(b.y - 4), 3, 2);
      }
      ctx.restore();
    },
  });
}

/** Create the ordinary jjajang bowl, noodle and sauce attack. */
export function createChoimisJjajang(options = {}) {
  const duration = options.duration ?? 6.4, every = options.every ?? 1.95;
  const volleys = [[0.02, 0.5, 0.98], [0.25, 0.75, 0.5], [0.98, 0.25, 0.02]];
  let shot = 0, splash = 0;
  return { duration, update(t, dt, api) {
    if (t >= duration) return;
    while (shot < volleys.length * 3 && t >= 0.1 + Math.floor(shot / 3) * every + shot % 3 * 0.14) {
      const wave = Math.floor(shot / 3), lane = shot % 3;
      emitJjajang(api, volleys[wave][lane], (wave + lane) % 2 === 0, options, shot, t - (0.1 + wave * every + lane * 0.14));
      if (lane === 0) api.sfx?.('swing', { volume: 0.5 });
      shot++;
    }
    while (splash < 9 && t >= 0.8 + Math.floor(splash / 3) * every + splash % 3 * (options.splashDelay ?? 0.22)) {
      const wave = Math.floor(splash / 3), slot = splash % 3;
      emitSauce(api, wave, slot, options, t - (0.8 + wave * every + slot * (options.splashDelay ?? 0.22)));
      splash++;
    }
  } };
}
