const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const point = (x, y) => ({ x, y });

function distance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const u = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - a.x - dx * u, p.y - a.y - dy * u);
}

function polygonHit(p, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if (distance(p, a, b) <= Math.max(0, p.r - 2)) return true;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The warning and hit share a silhouette; off-board and expired geometry never damages. */
export function hitParkGuardian(b, soul) {
  if (b.age < b.warn || b.age >= b.life || soul.x < b.box.x + 3 || soul.x > b.box.x + b.box.w - 3
    || soul.y < b.box.y + 3 || soul.y > b.box.y + b.box.h - 3) return false;
  return b.polygons(b).some(points => polygonHit(soul, points));
}

function path(ctx, points) {
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(Math.round(p.x), Math.round(p.y)) : ctx.moveTo(Math.round(p.x), Math.round(p.y)));
  ctx.closePath();
}

/** Costume ears, broken hearts, fan flags and bare claws keep distinct two-tone silhouettes. */
export function drawParkGuardian(ctx, b) {
  const warning = b.age < b.warn;
  ctx.save(); ctx.beginPath(); ctx.rect(b.box.x + 3, b.box.y + 3, b.box.w - 6, b.box.h - 6); ctx.clip();
  ctx.lineWidth = 1;
  if (warning) {
    ctx.globalAlpha = 0.42 + Math.sin(b.age * 18) * 0.12;
    ctx.fillStyle = '#c36a97'; ctx.strokeStyle = '#ffaccd'; ctx.setLineDash([3, 3]);
  } else {
    ctx.fillStyle = b.shape === 'park_ear' ? '#343040' : b.shape === 'park_heart' ? '#f379b1' : b.shape === 'park_flag' ? '#dcb2f5' : '#f5ece0';
    ctx.strokeStyle = '#fff0fa';
  }
  for (const points of b.polygons(b)) { path(ctx, points); ctx.fill(); ctx.stroke(); }
  if (warning && b.shape === 'park_heart') {
    const center = b.center(b);
    ctx.beginPath(); ctx.moveTo(Math.round(center.x), Math.round(center.y));
    ctx.lineTo(Math.round(b.target.x), Math.round(b.target.y)); ctx.stroke();
  }
  if (!warning) {
    ctx.strokeStyle = b.shape === 'park_ear' ? '#dc80b1' : '#6c3659'; ctx.setLineDash([]);
    if (b.shape === 'park_ear') {
      const points = b.polygons(b)[0], tip = points[2];
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(Math.round(b.x), Math.round(points[0].y));
      ctx.lineTo(Math.round(tip.x), Math.round(tip.y + b.direction * -10)); ctx.stroke();
    }
    if (b.shape === 'park_heart' || b.shape === 'park_flag') {
      const center = b.center(b);
      ctx.fillStyle = '#592745';
      if (b.shape === 'park_heart') {
        ctx.beginPath(); ctx.moveTo(Math.round(center.x + 1), Math.round(center.y - 6));
        ctx.lineTo(Math.round(center.x - 2), Math.round(center.y)); ctx.lineTo(Math.round(center.x + 2), Math.round(center.y + 2));
        ctx.lineTo(Math.round(center.x), Math.round(center.y + 7)); ctx.stroke();
      } else {
        ctx.fillRect(Math.round(center.x - 1), Math.round(center.y - 7), 5, 4);
        ctx.fillStyle = '#fcefff'; ctx.fillRect(Math.round(center.x), Math.round(center.y - 6), 1, 1);
        ctx.fillRect(Math.round(center.x + 2), Math.round(center.y - 6), 1, 1);
      }
    }
  }
  ctx.restore();
}

function emit(api, options) {
  api.emit({ x: api.box.x + api.box.w / 2, y: api.box.y + api.box.h / 2, r: 0,
    box: { ...api.box }, drawShape: drawParkGuardian, hitShape: hitParkGuardian, ...options });
}

function timeline(duration, events) {
  events.sort((a, b) => a.at - b.at);
  let next = 0;
  return { duration, update(t, dt, api) {
    while (next < events.length && events[next].at <= t) events[next++].run(api);
  } };
}

function action(events, at, warn, apiAction, sheet = 'attack') {
  events.push({ at, run(api) { api.present?.({ sheet, frame: 0 }); apiAction(api); } });
  events.push({ at: at + warn, run(api) { api.present?.({ sheet, frame: 1 }); api.sfx?.('whoosh'); } });
  for (let frame = 2; frame < (sheet === 'scratch' ? 4 : 6); frame++)
    events.push({ at: at + warn + (frame - 1) * 0.1, run(api) { api.present?.({ sheet, frame }); } });
  events.push({ at: at + warn + 0.5, run(api) { api.present?.(null); } });
}

function ear(api, column, direction, safeY, gap, warn, hit) {
  const box = api.box, width = (box.w - 6) / 5, x = box.x + 3 + (column + 0.5) * width;
  const baseY = direction > 0 ? box.y + 3 : box.y + box.h - 3, tipY = safeY - direction * gap / 2;
  emit(api, { shape: 'park_ear', x, direction, warn, life: warn + hit,
    polygons(b) {
      const age = b.age - warn;
      const extension = age < 0 ? 1 : Math.min(clamp(age / 0.16, 0, 1), clamp((hit - age) / 0.18, 0, 1));
      const tip = baseY + (tipY - baseY) * extension, shoulder = tip - direction * Math.min(18, Math.abs(tip - baseY) * 0.5);
      return [[point(x - width / 2, baseY), point(x - width * 0.47, shoulder), point(x, tip),
        point(x + width * 0.47, shoulder), point(x + width / 2, baseY)]];
    } });
}

function heart(api, target, angle, warn, speed, radius, flight) {
  const center = b => {
    const range = radius - Math.max(0, b.age - warn) * speed;
    return point(target.x + Math.cos(angle) * range, target.y + Math.sin(angle) * range);
  };
  emit(api, { shape: 'park_heart', warn, life: warn + flight, center, target: { ...target },
    polygons(b) {
      const p = center(b);
      return [[[-9,-3],[-9,-7],[-5,-10],[0,-6],[5,-10],[9,-7],[9,-3],[0,9]].map(([x, y]) => point(p.x + x, p.y + y))];
    } });
}

function flag(api, vertical, reverse, lane, lanes, warn, speed) {
  const box = api.box, span = vertical ? box.h : box.w;
  const center = b => {
    const travel = 8 + Math.max(0, b.age - warn) * speed;
    const along = reverse ? span - travel : travel;
    return vertical ? point(box.x + box.w * (lane + 0.5) / lanes, box.y + along)
      : point(box.x + along, box.y + box.h * (lane + 0.5) / lanes);
  };
  emit(api, { shape: 'park_flag', warn, life: warn + (span + 24) / speed, center,
    polygons(b) {
      const p = center(b);
      return [[[-7,-10],[10,-10],[6,-4],[-5,-4],[-5,10],[-7,10]].map(([x, y]) => point(p.x + x, p.y + y))];
    } });
}

/** Three costume dances demand different decisions; the exposed dog gets one forgiving scratch. */
export const PARK_GUARDIAN_PATTERNS = {
  // Ear twitch → opposing cloth ears → full reach preview → follow the changing horizontal corridor.
  park_rabbit_ears: (o = {}) => {
    const warn = Math.max(0.8, o.warn ?? 0.85), every = o.every ?? 1.45, hit = o.hit ?? 0.62;
    const events = [{ at: 0, run: api => api.say?.('칠라스아트해줘 형섭아', 2) }];
    for (let wave = 0; wave < 4; wave++) action(events, 0.2 + wave * every, warn, api => {
      const safeY = api.box.y + api.box.h * [0.34, 0.68, 0.38, 0.66][wave];
      for (let column = 0; column < 5; column++) for (const direction of [-1, 1])
        ear(api, column, direction, safeY, o.gap ?? 35, warn, hit);
    });
    return timeline(o.duration ?? 6.3, events);
  },
  // Clingy embrace → cracked hearts closing on a frozen bait point → ring preview → slip through then turn.
  park_obsessive_hearts: (o = {}) => {
    const warn = Math.max(0.65, o.warn ?? 0.75), speed = o.speed ?? 86, radius = o.radius ?? 68;
    const events = [{ at: 0, run: api => api.say?.('형섭아 나도 사랑해줘', 2) }];
    for (let wave = 0; wave < 3; wave++) action(events, 0.2 + wave * (o.every ?? 1.75), warn, api => {
      const target = { x: api.soul.x, y: api.soul.y };
      for (let i = 0; i < 8; i++) heart(api, target, (i + wave * 0.5) * Math.PI / 4, warn, speed, radius, o.flight ?? 1.3);
    });
    return timeline(o.duration ?? 6.4, events);
  },
  // Fan-club rally → little pirate pennants → edge silhouettes → change rows while crossing the delayed columns.
  park_pirate_fans: (o = {}) => {
    const warn = Math.max(0.6, o.warn ?? 0.7), speed = o.speed ?? 116;
    const events = [{ at: 0, run: api => api.say?.('가재맨 해적지부 많이 사랑해주세요', 2) }];
    for (let wave = 0; wave < 3; wave++) {
      const at = 0.2 + wave * (o.every ?? 1.85);
      action(events, at, warn, api => {
        for (let lane = 0; lane < 5; lane++) if (lane !== [1, 3, 2][wave]) flag(api, false, (lane + wave) % 2 === 0, lane, 5, warn, speed);
      });
      action(events, at + 0.65, warn, api => {
        for (let lane = 0; lane < 3; lane++) if (lane !== wave) flag(api, true, (lane + wave) % 2 === 0, lane, 3, warn, speed * 0.78);
      });
    }
    return timeline(o.duration ?? 7.4, events);
  },
  // Nervous paw raise → three short claw marks → fixed target for a full second → walk one step away.
  park_dog_scratch: (o = {}) => {
    const warn = Math.max(1, o.warn ?? 1.1), hit = o.hit ?? 0.25, events = [];
    action(events, 0.3, warn, api => {
      const target = { x: api.soul.x, y: api.soul.y };
      emit(api, { shape: 'park_scratch', warn, life: warn + hit, target,
        polygons() {
          return [-9, 0, 9].map(offset => [[-13,-17],[-9,-18],[14,17],[10,18]].map(([x, y]) => point(target.x + x + offset, target.y + y)));
        } });
    }, 'scratch');
    return timeline(o.duration ?? 3, events);
  },
};
