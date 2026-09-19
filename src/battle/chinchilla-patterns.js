// 찢칠라 탄막(BUILD242 사용자 브리핑 2026-09-19: “패턴은 뭔가 찢는듯한 공격과 드럼통 던지기임 … 난이도 적당하게 아짐키야보다 1.8배정도”)
//   찢기(chin_tear): 앞발로 상자를 북 찢는다 — 예고(찢길 자리의 들쭉날쭉한 점선이 0.5초 깜빡 + 시작점 발톱 자국 셋) → 틈이 벌어져(폭 26, 검은 속 + 흰 찢긴 가장자리) 0.35초 위험.
//     회피 = 예고선에서 비켜난다. 가로·세로·대각선이 섞이고(1.05초마다), cross 면 2번째 파도부터 두 줄이 동시에.
//   드럼통(chin_drum): 파란 드럼통(흰 2톤 도트)을 던진다 — 떨어지는 것은 착지 표식(타원, 0.55초) 뒤 위에서 떨어져 바닥에서 한 번 튕기고 굴러가며(회피 = 표식 밖 → 굴러오는 것 위로),
//     높이 던진 것은 점선 호(0.45초) 뒤 그 호를 그대로 따라 위쪽을 지나간다(회피 = 호 아래로). 0.8초마다 낙하·낙하·포물선 순서.
//   조합(chin_tear + cross + drums): 교차 찢기 사이로 바닥을 굴러오는 드럼통(가장자리에서 0.4초 깜빡인 뒤).
//   아짐키야(0.55초에 글자 하나·비 0.36초) 대비 약 1.8배: 한 파도가 상자를 가로지르는 띠 + 드럼통은 반지름 9 로 크고 0.8초 간격
//   소리(델타룬): 찢김 snd_wallclaw, 던지기 snd_wing, 착지 snd_metalhit, 튕김 snd_bell_bounce_short
import { whiteSprite } from './youngcle-patterns.js';

export const TEAR = Object.freeze({ warn: 0.5, hit: 0.35, width: 26, every: 1.05, first: 0.45, kinds: ['h', 'd', 'v', 'd', 'h', 'v'] });
export const DRUM = Object.freeze({ every: 0.8, first: 0.4, warn: 0.55, arcWarn: 0.45, fall: 250, roll: 130, bounce: 120, gravity: 420, lobVx: 170, lobVy: -230, lobG: 480, size: 20, r: 9, rollWarn: 0.4 });

/** 선분 (ax,ay)-(bx,by) 에서 점까지의 거리 */
export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
/** 상자를 가로지르는 찢김 선 하나: h 가로 · v 세로 · d 대각선(가장자리 14px 안쪽) */
export function tearLine(b, kind, rnd) {
  const m = 14;
  if (kind === 'h') { const y = b.y + m + rnd() * (b.h - 2 * m); return { ax: b.x, ay: y, bx: b.x + b.w, by: y }; }
  if (kind === 'v') { const x = b.x + m + rnd() * (b.w - 2 * m); return { ax: x, ay: b.y, bx: x, by: b.y + b.h }; }
  const span = (b.h - 2 * m) * 0.5, y0 = b.y + m + rnd() * span, y1 = y0 + span * (0.6 + rnd() * 0.4);
  return rnd() < 0.5 ? { ax: b.x, ay: y1, bx: b.x + b.w, by: y0 } : { ax: b.x, ay: y0, bx: b.x + b.w, by: y1 };
}
/** 찢김 선을 따라 7px 마다 들쭉날쭉한 점(예고 점선·찢긴 가장자리 공용) */
function jag(line, rnd) {
  const len = Math.hypot(line.bx - line.ax, line.by - line.ay), n = Math.max(2, Math.floor(len / 7));
  const pts = []; for (let i = 0; i <= n; i++) pts.push({ k: i / n, j: (rnd() - 0.5) * 8, e: (rnd() - 0.5) * 6 });
  return pts;
}
/** open 0 = 예고(점선·발톱 자국, blinkOn 일 때만), 0 < open ≤ 1 = 벌어진 틈 */
function drawTear(ctx, line, pts, open, blinkOn) {
  const dx = line.bx - line.ax, dy = line.by - line.ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, ux = dx / len, uy = dy / len;
  const at = (p, off) => [line.ax + dx * p.k + nx * (p.j + off), line.ay + dy * p.k + ny * (p.j + off)];
  if (open <= 0) {
    if (!blinkOn) return;
    ctx.fillStyle = '#fff';
    for (const p of pts) { const [x, y] = at(p, 0); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = -1; i <= 1; i++) { const [x, y] = at(pts[0], i * 5); ctx.moveTo(x - ux * 4, y - uy * 4); ctx.lineTo(x + ux * 12, y + uy * 12); }
    ctx.stroke(); return;
  }
  const half = TEAR.width / 2 * open;
  ctx.fillStyle = '#000'; ctx.beginPath();
  pts.forEach((p, i) => { const [x, y] = at(p, half + p.e); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
  for (let i = pts.length - 1; i >= 0; i--) { const [x, y] = at(pts[i], -half - pts[i].e); ctx.lineTo(x, y); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  for (const s of [1, -1]) { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = at(p, s * (half + p.e)); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); }
}

const drumImage = api => whiteSprite(api.images?.drum, 0.5);
function drawDrum(ctx, api, self) {
  const img = drumImage(api);
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot);
  if (img) { const h = DRUM.size, w = Math.max(1, Math.round(img.width * h / img.height)); ctx.drawImage(img, -Math.round(w / 2), -Math.round(h / 2), w, h); }
  else { ctx.fillStyle = '#fff'; ctx.fillRect(-6, -10, 12, 20); }
  ctx.restore();
}
/** 떨어지는 드럼통: 착지 표식(warn) → 위에서 떨어져 바닥에서 한 번 튕기고 dir 쪽으로 굴러간다. sounds 에 착지·튕김을 적는다(패턴 update 가 소리로 바꾼다) */
function dropDrum(api, x, dir, sounds) {
  const b = api.box, floor = b.y + b.h - 3;
  api.emit({ x, y: b.y - DRUM.r - 4, r: DRUM.r, kind: 'white', shape: 'drum', vy: DRUM.fall, life: 4, phase: 'fall',
    steer(self, dt) {
      if (self.phase === 'fall' && self.y >= floor - self.r) { self.y = floor - self.r; self.vy = -DRUM.bounce; self.ay = DRUM.gravity; self.vx = dir * DRUM.roll; self.phase = 'hop'; sounds.push('metalhit'); }
      else if (self.phase === 'hop' && self.vy > 0 && self.y >= floor - self.r) { self.y = floor - self.r; self.vy = 0; self.ay = 0; self.phase = 'roll'; sounds.push('bell_bounce'); }
      if (self.phase !== 'fall') self.rot += dir * 7 * dt;
    },
    drawShape(ctx, self) { drawDrum(ctx, api, self); } });
}
function landingMark(api, x, warn) {
  const b = api.box, floor = b.y + b.h - 3;
  api.emit({ x, y: floor, r: 0, harmless: true, life: warn, shape: 'mark', drawShape(ctx, self) {
    if (Math.floor(self.age * 8) % 2) return;
    ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(Math.round(self.x), Math.round(self.y) - 2, 12, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(self.x) - 1, Math.round(self.y) - 12 - Math.round(Math.sin(self.age * 12) * 2), 2, 6); ctx.restore();
  } });
}
/** 포물선 궤적(예고 점선 호와 실제 탄이 같은 식을 쓴다) */
const lobPath = (b, dir) => { const x0 = dir > 0 ? b.x - DRUM.r : b.x + b.w + DRUM.r, y0 = b.y + b.h * 0.55; return { x0, y0, vx: dir * DRUM.lobVx, vy: DRUM.lobVy, g: DRUM.lobG }; };
function lobDrum(api, dir, sounds) {
  const p = lobPath(api.box, dir);
  sounds.push('wing');
  api.emit({ x: p.x0, y: p.y0, r: DRUM.r, kind: 'white', shape: 'drum', vx: p.vx, vy: p.vy, ay: p.g, life: 3, spin: dir * 5, drawShape(ctx, self) { drawDrum(ctx, api, self); } });
}
function arcMark(api, dir, warn) {
  const p = lobPath(api.box, dir), b = api.box;
  api.emit({ x: p.x0, y: p.y0, r: 0, harmless: true, life: warn, shape: 'mark', drawShape(ctx, self) {
    if (Math.floor(self.age * 8) % 2) return;
    ctx.fillStyle = '#fff';
    for (let t = 0; t < 1.6; t += 0.05) { const x = p.x0 + p.vx * t, y = p.y0 + p.vy * t + p.g * t * t / 2; if (x < b.x - 4 || x > b.x + b.w + 4 || y > b.y + b.h) continue; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
  } });
}
/** 바닥을 굴러오는 드럼통(조합용): 가장자리에서 rollWarn 동안 깜빡인 뒤 굴러 들어온다 */
function rollDrum(api, dir, sounds, queue, t) {
  const b = api.box, floor = b.y + b.h - 3, x = dir > 0 ? b.x - DRUM.r - 2 : b.x + b.w + DRUM.r + 2;
  api.emit({ x, y: floor - DRUM.r, r: 0, harmless: true, life: DRUM.rollWarn, shape: 'mark', drawShape(ctx, self) { if (Math.floor(self.age * 8) % 2 === 0) drawDrum(ctx, api, self); } });
  queue.push({ at: t + DRUM.rollWarn, dir });
}

export const CHINCHILLA_PATTERNS = {
  chin_tear: (o = {}) => {
    const every = o.every ?? TEAR.every, warn = o.warn ?? TEAR.warn, hit = o.hit ?? TEAR.hit, duration = o.duration ?? 4.8;
    let next = o.first ?? TEAR.first, n = 0, drumNext = 0.9, drumN = 0; const queue = [], rolls = [], sounds = [];
    const spawnTear = (api, t) => {
      const b = api.box, line = tearLine(b, TEAR.kinds[n % TEAR.kinds.length], api.rnd), pts = jag(line, api.rnd); n += 1;
      api.emit({ x: line.ax, y: line.ay, r: 0, harmless: true, life: warn, kind: 'white', shape: 'tear', tearWarn: true, drawShape(ctx, self) { drawTear(ctx, line, pts, 0, Math.floor(self.age * 8) % 2 === 0); } });
      queue.push({ at: t + warn, line, pts });
    };
    return { duration, update(t, dt, api) {
      if (t >= next && t + warn < duration + 0.3) { next += every; spawnTear(api, t); if (o.cross && n >= 2) spawnTear(api, t); }
      while (queue.length && t >= queue[0].at) {
        const q = queue.shift(); api.sfx?.('wallclaw');
        api.emit({ x: q.line.ax, y: q.line.ay, r: 0, life: hit, kind: 'white', shape: 'tear', tear: true,
          hitShape(self, soul) { return self.age >= 0.04 && segDist(soul.x, soul.y, q.line.ax, q.line.ay, q.line.bx, q.line.by) <= TEAR.width / 2 + soul.r - 3; },
          drawShape(ctx, self) { const open = Math.min(1, self.age / 0.08) * (self.age > hit - 0.1 ? Math.max(0, (hit - self.age) / 0.1) : 1); drawTear(ctx, q.line, q.pts, Math.max(0.05, open), true); } });
      }
      if (o.drums) {
        drumNext -= dt;
        if (drumNext <= 0 && t < duration - 1.4) { drumNext = o.drumEvery ?? 1.6; rollDrum(api, drumN++ % 2 ? -1 : 1, sounds, rolls, t); }
        while (rolls.length && t >= rolls[0].at) {
          const r = rolls.shift(), b = api.box, floor = b.y + b.h - 3; api.sfx?.('metalhit');
          api.emit({ x: r.dir > 0 ? b.x - DRUM.r - 2 : b.x + b.w + DRUM.r + 2, y: floor - DRUM.r, r: DRUM.r, kind: 'white', shape: 'drum', vx: r.dir * DRUM.roll * 1.2, spin: r.dir * 7, life: 3, drawShape(ctx, self) { drawDrum(ctx, api, self); } });
        }
      }
      while (sounds.length) { const name = sounds.shift(); api.sfx?.(name); }
    } };
  },
  chin_drum: (o = {}) => {
    const every = o.every ?? DRUM.every, warn = o.warn ?? DRUM.warn, duration = o.duration ?? 5.0;
    let next = o.first ?? DRUM.first, n = 0; const queue = [], sounds = [];
    return { duration, update(t, dt, api) {
      const b = api.box;
      if (t >= next && t + warn < duration) {
        next += every;
        if (n % 3 === 2) { const dir = n % 2 ? -1 : 1; arcMark(api, dir, DRUM.arcWarn); queue.push({ at: t + DRUM.arcWarn, lob: true, dir }); }
        else { const x = b.x + 16 + api.rnd() * (b.w - 32), dir = x < b.x + b.w / 2 ? 1 : -1; landingMark(api, x, warn); queue.push({ at: t + warn, x, dir }); }
        n += 1;
      }
      while (queue.length && t >= queue[0].at) { const q = queue.shift(); if (q.lob) lobDrum(api, q.dir, sounds); else dropDrum(api, q.x, q.dir, sounds); }
      while (sounds.length) { const name = sounds.shift(); api.sfx?.(name); }
    } };
  },
};
