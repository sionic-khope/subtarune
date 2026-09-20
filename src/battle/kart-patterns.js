// 다오·배찌 탄막(BUILD266 사용자 브리핑 2026-09-20 “각각 카트라이더 사운드 쓰는 카트라이더 패턴으로 체력 36씩”): 카트라이더 아이템이 곧 탄이다. 소리는 assets/audio/sfx/kart_*.mp3(assets/source/kartrider-v1/README.md).
//   다오(파랑) — 미사일·부스터·바나나
//     kart_missile: 조준 십자선이 0.5초 하트를 따라오다 잠기고(고정) 0.35초 뒤 잠긴 자리로 미사일(흰 도트 로켓+연기 꼬리)이 가장자리에서 날아와 터지며 파편 6개 방사. 회피 = 잠긴 자리에서 떨어진 뒤 파편 사이로. 1.35초마다, 좌우 번갈아.
//     kart_booster: 가로 띠(높이 28) 예고 0.5초 깜빡 → 흰 다오 카트가 420px/s 로 띠를 가로지르며 불꽃 꼬리(0.45초 남음). 회피 = 다른 띠로. 1.1초마다 위·가운데·아래 순서를 섞고 3번째부터 둘 연속.
//     kart_banana: 착지 표식 0.5초 → 바나나가 위에서 떨어져 바닥에 2.4초 남는다(밟으면 피해). 넷이 깔린 뒤 부스터 띠 하나가 사이를 가른다(두 축). 회피 = 바나나 없는 자리에서 띠를 피한다.
//   배찌(빨강) — 물폭탄·자석·물파리
//     kart_waterbomb: 점선 호 예고 0.45초 → 물폭탄 포물선 → 착지하면 물방울 고리(r 26, 1.2초 위험) + 물방울 8개 방사. 회피 = 고리 밖 + 방울 사이. 1.2초마다 좌우 번갈아.
//     kart_magnet: 상자 한쪽에 자석이 0.45초 깜빡인 뒤 1.6초 동안 하트를 그쪽으로 끌어당기고(초당 95px) 그 벽에 가시탄 띠가 선다. 회피 = 반대쪽으로 계속 밀어 버틴다. 끝나면 반대쪽에 다시.
//     kart_waterfly(조합): 물파리 한 마리가 하트 주위를 돌며(반지름 44, 초당 2.2바퀴) 1.1초마다 하트 쪽으로 찍고 튀어오르는 동안 물폭탄이 번갈아 떨어진다.
//   모든 예고 ≥ 0.35초. 피해는 적 def.damage 고정. 새 실루엣은 흰 1px 외곽 2톤(델타룬 상자 규칙).
import { whiteSprite } from './youngcle-patterns.js';

export const MISSILE = Object.freeze({ every: 1.35, first: 0.4, track: 0.5, lock: 0.35, speed: 260, frags: 6, fragSpeed: 115, r: 6, fragR: 4, duration: 5.0 });
export const BOOSTER = Object.freeze({ every: 1.1, first: 0.45, warn: 0.5, laneH: 28, speed: 420, flameLife: 0.45, kartW: 30, kartH: 22, duration: 4.8 });
export const BANANA = Object.freeze({ every: 0.55, first: 0.35, warn: 0.5, count: 4, stay: 2.4, fall: 230, r: 7, laneAt: 3.0, duration: 5.2 });
export const WATERBOMB = Object.freeze({ every: 1.2, first: 0.4, arcWarn: 0.45, ringR: 26, ringLife: 1.2, drops: 8, dropSpeed: 105, r: 7, lobVx: 150, lobVy: -220, lobG: 470, duration: 5.0 });
export const MAGNET = Object.freeze({ warn: 0.45, pull: 95, hold: 1.6, gap: 0.5, spikes: 7, duration: 5.2 });
export const WATERFLY = Object.freeze({ orbitR: 44, orbitSpeed: 2.2, dive: 1.1, diveSpeed: 190, r: 6, duration: 5.4 });

const blink = (self, hz = 8) => Math.floor(self.age * hz) % 2 === 0;
const kartImage = (api, key) => whiteSprite(api.images?.[key], 0.5);

/** 흰 도트 미사일: 머리·몸통·꼬리 날개 + 연기 점 */
function drawMissile(ctx, self) {
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(Math.atan2(self.vy, self.vx));
  ctx.fillStyle = '#fff'; ctx.fillRect(-8, -3, 14, 6); ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(12, 0); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
  ctx.fillRect(-10, -6, 4, 3); ctx.fillRect(-10, 3, 4, 3);
  ctx.fillStyle = '#000'; ctx.fillRect(-5, -1, 8, 2);
  ctx.restore();
}
function drawCrosshair(ctx, x, y, locked, on) {
  if (!on) return;
  ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = locked ? 2 : 1; ctx.beginPath(); ctx.arc(Math.round(x), Math.round(y), locked ? 10 : 13, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * 5, y + dy * 5); ctx.lineTo(x + dx * 16, y + dy * 16); } ctx.stroke(); ctx.restore();
}
function drawBanana(ctx, self) {
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -3, 8, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-9, -2, 3, 3); ctx.fillRect(6, -2, 3, 3); ctx.fillStyle = '#000'; ctx.fillRect(-2, 4, 4, 1);
  ctx.restore();
}
function drawBomb(ctx, self) {
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y));
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, self.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-2, -2, self.r * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-3, -3, 2, 2);
  ctx.restore();
}
function drawMagnet(ctx, x, y, dir, on) {
  if (!on) return;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(dir, 1);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-2, -14, 8, 6); ctx.fillRect(-2, 8, 8, 6); ctx.fillStyle = '#000'; ctx.fillRect(2, -12, 3, 2); ctx.fillRect(2, 10, 3, 2);
  ctx.restore();
}
function drawFly(ctx, self) {
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y));
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  const w = Math.floor(self.age * 30) % 2 ? 5 : 2; ctx.fillRect(-7, -w - 3, 5, w); ctx.fillRect(2, -w - 3, 5, w);
  ctx.fillStyle = '#000'; ctx.fillRect(-3, -1, 2, 2); ctx.fillRect(1, -1, 2, 2);
  ctx.restore();
}

/** 다오: 미사일 */
function missile(o = {}) {
  const every = o.every ?? MISSILE.every, duration = o.duration ?? MISSILE.duration;
  let next = o.first ?? MISSILE.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box, soul = api.soul;
    if (t >= next && t + MISSILE.track + MISSILE.lock + 0.5 < duration) {
      next += every; const dir = n++ % 2 ? -1 : 1;
      const aim = { x: soul.x, y: soul.y, locked: false };
      api.emit({ x: aim.x, y: aim.y, r: 0, harmless: true, life: MISSILE.track + MISSILE.lock, shape: 'mark',
        steer(self) { if (self.age < MISSILE.track) { aim.x = soul.x; aim.y = soul.y; } else aim.locked = true; self.x = aim.x; self.y = aim.y; },
        drawShape(ctx, self) { drawCrosshair(ctx, self.x, self.y, aim.locked, aim.locked ? true : blink(self, 10)); } });
      queue.push({ at: t + MISSILE.track + MISSILE.lock, aim, dir });
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift(); api.sfx?.('kart_missile');
      const x0 = q.dir > 0 ? b.x - 10 : b.x + b.w + 10, y0 = q.aim.y, dx = q.aim.x - x0, dy = q.aim.y - y0, d = Math.hypot(dx, dy) || 1;
      const m = api.emit({ x: x0, y: y0, r: MISSILE.r, kind: 'white', shape: 'missile', vx: dx / d * MISSILE.speed, vy: dy / d * MISSILE.speed, life: 2.5, smoke: 0,
        steer(self, dt2) {
          self.smoke += dt2; if (self.smoke > 0.05) { self.smoke = 0; api.emit({ x: self.x - self.vx * 0.04, y: self.y, r: 3, harmless: true, life: 0.35, shape: 'mark', drawShape(ctx, s) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 1 - s.age / 0.35; ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4); ctx.globalAlpha = 1; } }); }
          const passed = (self.vx > 0 && self.x >= q.aim.x) || (self.vx < 0 && self.x <= q.aim.x);
          if (passed && !self.burst) {
            self.burst = true; self.life = 0.01; api.sfx?.('boom', { volume: 0.5 });
            for (let i = 0; i < MISSILE.frags; i++) { const a = i / MISSILE.frags * Math.PI * 2 + 0.3; api.emit({ x: q.aim.x, y: q.aim.y, r: MISSILE.fragR, kind: 'white', shape: 'circle', vx: Math.cos(a) * MISSILE.fragSpeed, vy: Math.sin(a) * MISSILE.fragSpeed, life: 1.4 }); }
            api.emit({ x: q.aim.x, y: q.aim.y, r: 0, harmless: true, life: 0.3, shape: 'mark', drawShape(ctx, s) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), 6 + s.age * 90, 0, Math.PI * 2); ctx.stroke(); } });
          }
        },
        drawShape(ctx, self) { drawMissile(ctx, self); } });
      void m;
    }
  } };
}
/** 부스터 띠 하나: 예고 뒤 흰 카트가 가로지른다. queue 에 발사 시각을 넣는다 */
function boosterLane(api, t, laneY, dir, queue) {
  const b = api.box;
  api.emit({ x: b.x + b.w / 2, y: laneY, r: 0, harmless: true, life: BOOSTER.warn, shape: 'mark', drawShape(ctx, self) {
    if (!blink(self)) return; ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.strokeRect(b.x + 2, Math.round(laneY - BOOSTER.laneH / 2), b.w - 4, BOOSTER.laneH); ctx.restore();
    ctx.fillStyle = '#fff'; const ax = dir > 0 ? b.x + 6 : b.x + b.w - 6; ctx.beginPath(); ctx.moveTo(ax, laneY - 6); ctx.lineTo(ax + dir * 10, laneY); ctx.lineTo(ax, laneY + 6); ctx.closePath(); ctx.fill();
  } });
  queue.push({ at: t + BOOSTER.warn, laneY, dir });
}
function fireBooster(api, q) {
  const b = api.box; api.sfx?.('kart_booster');
  const kart = kartImage(api, 'kart');
  api.emit({ x: q.dir > 0 ? b.x - BOOSTER.kartW : b.x + b.w + BOOSTER.kartW, y: q.laneY, r: 0, kind: 'white', shape: 'kart', vx: q.dir * BOOSTER.speed, life: 1.6, flame: 0,
    hitShape(self, soul) { return Math.abs(soul.y - self.y) <= BOOSTER.laneH / 2 + soul.r - 4 && Math.abs(soul.x - self.x) <= BOOSTER.kartW / 2 + soul.r - 2; },
    steer(self, dt2) { self.flame += dt2; if (self.flame > 0.04) { self.flame = 0; api.emit({ x: self.x - q.dir * (BOOSTER.kartW / 2 + 2), y: self.y + (api.rnd() - 0.5) * 10, r: 5, kind: 'white', shape: 'circle', vx: -q.dir * 40, life: BOOSTER.flameLife }); } },
    drawShape(ctx, self) {
      ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); if (q.dir < 0) ctx.scale(-1, 1);
      if (kart) ctx.drawImage(kart, -BOOSTER.kartW / 2, -BOOSTER.kartH / 2 - 4, BOOSTER.kartW, BOOSTER.kartH + 8);
      else { ctx.fillStyle = '#fff'; ctx.fillRect(-BOOSTER.kartW / 2, -BOOSTER.kartH / 2, BOOSTER.kartW, BOOSTER.kartH); }
      ctx.fillStyle = '#fff'; ctx.fillRect(-BOOSTER.kartW / 2 - 2, 4, 6, 6); ctx.fillRect(BOOSTER.kartW / 2 - 4, 4, 6, 6); ctx.restore();
    } });
}
function lanes(b) { return [b.y + BOOSTER.laneH / 2 + 6, b.y + b.h / 2, b.y + b.h - BOOSTER.laneH / 2 - 6]; }
function booster(o = {}) {
  const every = o.every ?? BOOSTER.every, duration = o.duration ?? BOOSTER.duration;
  let next = o.first ?? BOOSTER.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    if (t >= next && t + BOOSTER.warn + 0.6 < duration) {
      next += every; const L = lanes(api.box), order = [1, 0, 2, 1, 2, 0]; const lane = L[order[n % order.length]], dir = n % 2 ? -1 : 1; n += 1;
      boosterLane(api, t, lane, dir, queue);
      if (n >= 3 && n % 2 === 1) boosterLane(api, t + 0.35, L[order[(n + 1) % order.length]], -dir, queue);
    }
    queue.sort((p, q) => p.at - q.at);
    while (queue.length && t >= queue[0].at) fireBooster(api, queue.shift());
  } };
}
function banana(o = {}) {
  const duration = o.duration ?? BANANA.duration; let next = o.first ?? BANANA.first, n = 0, laneDone = false; const queue = [], lanesQ = [];
  return { duration, update(t, dt, api) {
    const b = api.box, floor = b.y + b.h - 4;
    if (n < BANANA.count && t >= next) {
      next += BANANA.every; n += 1; const x = b.x + 18 + api.rnd() * (b.w - 36);
      api.emit({ x, y: floor, r: 0, harmless: true, life: BANANA.warn, shape: 'mark', drawShape(ctx, self) { if (!blink(self)) return; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(Math.round(self.x), Math.round(self.y) - 2, 11, 4, 0, 0, Math.PI * 2); ctx.stroke(); } });
      queue.push({ at: t + BANANA.warn, x });
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift();
      api.emit({ x: q.x, y: b.y - 8, r: BANANA.r, kind: 'white', shape: 'banana', vy: BANANA.fall, life: BANANA.stay + 1, spin: 6,
        steer(self) { if (self.y >= floor - self.r) { if (self.vy) { api.sfx?.('kart_banana'); } self.y = floor - self.r; self.vy = 0; self.spin = 0; self.rot = 0; } },
        drawShape(ctx, self) { drawBanana(ctx, self); } });
    }
    if (!laneDone && t >= BANANA.laneAt) { laneDone = true; const L = lanes(b); boosterLane(api, t, L[1], 1, lanesQ); boosterLane(api, t + 0.5, L[2], -1, lanesQ); }
    lanesQ.sort((p, q) => p.at - q.at);
    while (lanesQ.length && t >= lanesQ[0].at) fireBooster(api, lanesQ.shift());
  } };
}
/** 배찌: 물폭탄 하나(포물선 예고 → 낙하 → 착지 고리 + 물방울) */
const lob = (b, dir) => ({ x0: dir > 0 ? b.x - 8 : b.x + b.w + 8, y0: b.y + b.h * 0.5, vx: dir * WATERBOMB.lobVx, vy: WATERBOMB.lobVy, g: WATERBOMB.lobG });
function bombArc(api, dir, warn) {
  const p = lob(api.box, dir), b = api.box;
  api.emit({ x: p.x0, y: p.y0, r: 0, harmless: true, life: warn, shape: 'mark', drawShape(ctx, self) {
    if (!blink(self)) return; ctx.fillStyle = '#fff';
    for (let tt = 0; tt < 1.6; tt += 0.06) { const x = p.x0 + p.vx * tt, y = p.y0 + p.vy * tt + p.g * tt * tt / 2; if (x < b.x - 4 || x > b.x + b.w + 4 || y > b.y + b.h) continue; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
  } });
}
function throwBomb(api, dir) {
  const p = lob(api.box, dir), b = api.box, floor = b.y + b.h - 4; api.sfx?.('kart_waterbomb');
  api.emit({ x: p.x0, y: p.y0, r: WATERBOMB.r, kind: 'white', shape: 'bomb', vx: p.vx, vy: p.vy, ay: p.g, life: 3,
    steer(self) {
      if (self.y >= floor - self.r && !self.popped) {
        self.popped = true; self.life = 0.01;
        api.emit({ x: self.x, y: self.y, r: WATERBOMB.ringR, kind: 'white', shape: 'ring', life: WATERBOMB.ringLife,
          hitShape(s, soul) { return Math.hypot(soul.x - s.x, soul.y - s.y) <= WATERBOMB.ringR - 2 + soul.r && s.age > 0.05; },
          drawShape(ctx, s) { const k = s.age / WATERBOMB.ringLife; ctx.save(); ctx.globalAlpha = 0.85 - k * 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(Math.round(s.x), Math.round(s.y), WATERBOMB.ringR, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.fill(); for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(s.x + Math.cos(i * 1.3 + s.age * 4) * 12, s.y - 6 - ((s.age * 30 + i * 7) % 20), 2, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); } });
        for (let i = 0; i < WATERBOMB.drops; i++) { const a = i / WATERBOMB.drops * Math.PI * 2; api.emit({ x: self.x, y: self.y - 4, r: 3, kind: 'white', shape: 'circle', vx: Math.cos(a) * WATERBOMB.dropSpeed, vy: Math.sin(a) * WATERBOMB.dropSpeed - 40, ay: 160, life: 1.2 }); }
      }
    },
    drawShape(ctx, self) { drawBomb(ctx, self); } });
}
function waterbomb(o = {}) {
  const every = o.every ?? WATERBOMB.every, duration = o.duration ?? WATERBOMB.duration; let next = o.first ?? WATERBOMB.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    if (t >= next && t + WATERBOMB.arcWarn + 1.0 < duration) { next += every; const dir = n++ % 2 ? -1 : 1; bombArc(api, dir, WATERBOMB.arcWarn); queue.push({ at: t + WATERBOMB.arcWarn, dir }); }
    while (queue.length && t >= queue[0].at) throwBomb(api, queue.shift().dir);
  } };
}
/** 배찌: 자석 — 한쪽 벽의 자석이 하트를 끌어당기고 그 벽에 가시탄 띠 */
function magnet(o = {}) {
  const duration = o.duration ?? MAGNET.duration; let side = 1, phase = 'warn', pt = 0, spikes = [];
  return { duration, update(t, dt, api) {
    const b = api.box, soul = api.soul, mx = side > 0 ? b.x + b.w - 14 : b.x + 14, my = b.y + b.h / 2;
    pt += dt;
    if (phase === 'warn') {
      if (pt === dt) api.emit({ x: mx, y: my, r: 0, harmless: true, life: MAGNET.warn, shape: 'mark', drawShape(ctx, self) { drawMagnet(ctx, self.x, self.y, side, blink(self, 10)); } });
      if (pt >= MAGNET.warn) {
        phase = 'pull'; pt = 0; api.sfx?.('kart_magnet');
        spikes = Array.from({ length: MAGNET.spikes }, (_, i) => api.emit({ x: mx + side * 8, y: b.y + 12 + i * ((b.h - 24) / (MAGNET.spikes - 1)), r: 5, kind: 'white', shape: 'spike', life: MAGNET.hold, drawShape(ctx, self) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(self.x, self.y - 5); ctx.lineTo(self.x - side * 11, self.y); ctx.lineTo(self.x, self.y + 5); ctx.closePath(); ctx.fill(); } }));
        api.emit({ x: mx, y: my, r: 0, harmless: true, life: MAGNET.hold, shape: 'mark', drawShape(ctx, self) { drawMagnet(ctx, self.x, self.y, side, true); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { const ph = (self.age * 3 + i / 3) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(self.x, self.y, 16 + ph * 40, Math.PI * 0.6 - side * Math.PI * 0.5 + (side > 0 ? Math.PI : 0), Math.PI * 1.4 - side * Math.PI * 0.5 + (side > 0 ? Math.PI : 0)); ctx.stroke(); } ctx.globalAlpha = 1; } });
      }
    } else if (phase === 'pull') {
      soul.x = Math.max(b.x + soul.r + 2, Math.min(b.x + b.w - soul.r - 2, soul.x + side * MAGNET.pull * dt));
      if (pt >= MAGNET.hold) { phase = 'gap'; pt = 0; }
    } else if (pt >= MAGNET.gap) { side = -side; phase = 'warn'; pt = 0; }
  } };
}
/** 배찌: 물파리(조합) — 파리가 하트 주위를 돌다 찍고, 사이사이 물폭탄 */
function waterfly(o = {}) {
  const duration = o.duration ?? WATERFLY.duration; let fly = null, ang = 0, nextDive = 0.9, nextBomb = 1.2, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const soul = api.soul;
    if (!fly) { api.sfx?.('kart_waterfly'); fly = api.emit({ x: soul.x + WATERFLY.orbitR, y: soul.y, r: WATERFLY.r, kind: 'white', shape: 'fly', life: duration - 0.2, mode: 'orbit', drawShape(ctx, self) { drawFly(ctx, self); } }); }
    if (fly.mode === 'orbit') {
      ang += WATERFLY.orbitSpeed * Math.PI * 2 * dt; fly.x = soul.x + Math.cos(ang) * WATERFLY.orbitR; fly.y = soul.y + Math.sin(ang) * WATERFLY.orbitR * 0.7;
      if (t >= nextDive) { fly.mode = 'aim'; fly.aimT = 0; fly.tx = soul.x; fly.ty = soul.y; }
    } else if (fly.mode === 'aim') {
      fly.aimT += dt; fly.tx = soul.x; fly.ty = soul.y;
      if (fly.aimT >= 0.35) { const dx = fly.tx - fly.x, dy = fly.ty - fly.y, d = Math.hypot(dx, dy) || 1; fly.vx = dx / d * WATERFLY.diveSpeed; fly.vy = dy / d * WATERFLY.diveSpeed; fly.mode = 'dive'; fly.diveT = 0; }
    } else if (fly.mode === 'dive') {
      fly.diveT += dt; if (fly.diveT >= 0.5) { fly.vx = 0; fly.vy = 0; fly.mode = 'orbit'; ang = Math.atan2(fly.y - soul.y, fly.x - soul.x); nextDive = t + WATERFLY.dive; }
    }
    if (t >= nextBomb && t + 1.2 < duration) { nextBomb += 1.5; const dir = n++ % 2 ? -1 : 1; bombArc(api, dir, WATERBOMB.arcWarn); queue.push({ at: t + WATERBOMB.arcWarn, dir }); }
    while (queue.length && t >= queue[0].at) throwBomb(api, queue.shift().dir);
  } };
}

export const KART_PATTERNS = { kart_missile: missile, kart_booster: booster, kart_banana: banana, kart_waterbomb: waterbomb, kart_magnet: magnet, kart_waterfly: waterfly };
