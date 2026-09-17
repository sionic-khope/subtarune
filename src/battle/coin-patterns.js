// 코인벌기 탄막 4종(BUILD214 사용자 “코인벌기를 하면 영클이 레이저 쏘는 패턴이나 뭔가 많이 뿌리는데 거기 중에 코인이 있고 … 턴마다 코인 하나 … 너무 쉽지도 않게 공격 패턴 후반에”):
//   coin_lasers — 사방에서 조준선 뒤 레이저, 중후반에 아주 천천히 가로지르는 코인(사용자 1번)   coin_rain — 위에서 잔뜩 뿌리는 조각들 + 후반 천천히 떨어지는 코인(가짜 코인 셋 섞임)
//   coin_spokes — 가운데서 도는 레이저 바퀴 + 후반 테두리를 도는 코인   coin_ships — 유도 함선 둘 + 후반 소울에게서 달아나는 코인(구석에 몰아야 잡힌다)
//   미로 둘(coin_maze_a/b)은 modes/coin-maze.js(적 턴 모드). 코인 탄은 pickup:true, harmless:true — battle.updateBullets 가 닿으면 support.onPickup 을 부른다.
import { whiteSprite } from './youngcle-patterns.js';
import { TVFORM_BATTLE as C } from '../data/youngcle-tvform-battle.js';
const TAU = Math.PI * 2;
const distToSegment = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)); return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)); };
const keep = (api, o) => { const made = api.emit(o); return made instanceof Object ? made : o; };   // emit 이 탄 객체를 돌려주면 그걸 붙잡는다(단위 검사 가짜 api 는 숫자를 돌려준다)
const clipBox = (ctx, box) => { ctx.beginPath(); ctx.rect(box.x + 3, box.y + 3, box.w - 6, box.h - 6); ctx.clip(); };

/** 코인 그림: 노란 동전이 세로축으로 빙글 돈다(폭이 오므라들었다 펴짐) */
export function drawCoin(ctx, x, y, r, t, fake = false) {
  const w = Math.max(2, Math.abs(Math.cos(t * 5)) * r), X = Math.round(x), Y = Math.round(y);
  ctx.save(); ctx.fillStyle = fake ? '#6a6a7a' : '#ffd23f'; ctx.beginPath(); ctx.ellipse(X, Y, w, r, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = fake ? '#3a3a48' : '#b8860b'; ctx.lineWidth = 2; ctx.stroke();
  if (w > r * 0.45) { ctx.fillStyle = fake ? '#3a3a48' : '#b8860b'; ctx.fillRect(X - 1, Y - Math.round(r * 0.5), 2, Math.round(r)); }
  if (!fake && Math.floor(t * 8) % 4 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(X + Math.round(w * 0.4), Y - Math.round(r * 0.6), 2, 2); }
  ctx.restore();
}
const coinBullet = (extra = {}) => ({ r: C.coin.r, harmless: true, pickup: true, shape: 'coin', kind: 'yellow', drawShape: (ctx, q) => drawCoin(ctx, q.x, q.y, q.r, q.age, q.fake), ...extra });
const boltDraw = (ctx, q) => { ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y)); ctx.rotate(Math.atan2(q.vy, q.vx)); ctx.fillStyle = 'rgba(255,80,80,0.45)'; ctx.fillRect(-16, -5, 32, 10); ctx.fillStyle = '#ff4a4a'; ctx.fillRect(-14, -3, 28, 6); ctx.fillStyle = '#fff'; ctx.fillRect(-9, -1, 18, 2); ctx.restore(); };

export const COIN_PATTERNS = {
  /** 사방 레이저: 상자 네 변의 무작위 점에서 소울을 겨눈 조준선(0.45s) 뒤 빠른 볼트. 코인은 7.2초에 한 변에서 나와 아주 천천히(22px/s) 반대편으로 — 그 전에 잡아야 한다 */
  coin_lasers: (o = {}) => {
    const K = { ...C.lasers, ...o }; let next = K.first, coinDone = false, pending = [];
    return { duration: K.duration, update(t, dt, api) {
      const b = api.box;
      if (t >= next && t < K.duration - 1.2) {
        next += K.every; const side = Math.floor(api.rnd() * 4);
        const sx = side === 0 ? b.x + 6 : side === 1 ? b.x + b.w - 6 : b.x + 8 + api.rnd() * (b.w - 16), sy = side === 2 ? b.y + 6 : side === 3 ? b.y + b.h - 6 : b.y + 8 + api.rnd() * (b.h - 16);
        const dx = api.soul.x - sx, dy = api.soul.y - sy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        api.emit({ x: sx, y: sy, r: 0, harmless: true, life: K.warn, shape: 'aim', ex: sx + ux * 400, ey: sy + uy * 400, box: { ...b },
          drawShape: (ctx, q) => { if (Math.floor(q.age * 12) % 2) return; ctx.save(); clipBox(ctx, q.box); ctx.strokeStyle = 'rgba(255,90,90,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.ex, q.ey); ctx.stroke(); ctx.restore(); } });
        api.sfx?.('laser_charge', { volume: 0.35 }); pending.push({ at: t + K.warn, sx, sy, ux, uy });
      }
      pending = pending.filter(p => { if (t < p.at) return true; api.sfx?.('laser_zap', { volume: 0.7 }); api.emit({ x: p.sx, y: p.sy, vx: p.ux * K.speed, vy: p.uy * K.speed, r: 3, kind: 'red', shape: 'bolt', drawShape: boltDraw }); return false; });
      if (o.coin && !coinDone && t >= K.coinAt) {
        coinDone = true; const fromLeft = api.soul.x > b.x + b.w / 2, cy = b.y + 20 + api.rnd() * (b.h - 40);
        api.emit(coinBullet({ x: fromLeft ? b.x + 8 : b.x + b.w - 8, y: cy, vx: (fromLeft ? 1 : -1) * K.coinSpeed, vy: 0, life: (b.w - 16) / K.coinSpeed + 0.2 })); api.sfx?.('bell', { volume: 0.6 });
      }
    } };
  },

  /** 뿌리기: 위에서 TV 조각(흰 사각·잡음 블록)이 0.16초마다 떨어진다. 7초부터 진짜 코인 하나가 천천히(34px/s) 떨어지고 가짜(회색) 코인 셋이 함께 떨어져 헷갈리게 한다 */
  coin_rain: (o = {}) => {
    const K = { ...C.rain, ...o }; let next = K.first, coinDone = false;
    const junkDraw = (ctx, q) => { const X = Math.round(q.x), Y = Math.round(q.y), s = q.r; ctx.fillStyle = Math.floor(q.age * 10 + q.seed) % 2 ? '#e8e8f0' : '#b0b0c0'; ctx.fillRect(X - s, Y - s, s * 2, s * 2); ctx.fillStyle = '#5a5a6a'; ctx.fillRect(X - s + 2, Y - 1, s * 2 - 4, 2); };
    return { duration: K.duration, update(t, dt, api) {
      const b = api.box;
      if (t >= next && t < K.duration - 1.0) { next += K.every; const r = 3 + Math.floor(api.rnd() * 3); api.emit({ x: b.x + 8 + api.rnd() * (b.w - 16), y: b.y - 8, vx: (api.rnd() - 0.5) * 30, vy: K.speed * (0.8 + api.rnd() * 0.4), r, kind: 'white', shape: 'junk', seed: Math.floor(api.rnd() * 7), drawShape: junkDraw }); }
      if (o.coin && !coinDone && t >= K.coinAt) {
        coinDone = true; const lanes = [0.2, 0.4, 0.6, 0.8].sort(() => api.rnd() - 0.5);
        api.emit(coinBullet({ x: b.x + b.w * lanes[0], y: b.y - 8, vx: 0, vy: K.coinSpeed, life: (b.h + 20) / K.coinSpeed + 0.2 }));
        for (let i = 1; i < 4; i++) api.emit({ x: b.x + b.w * lanes[i], y: b.y - 8 - i * 12, vx: 0, vy: K.coinSpeed * (0.9 + i * 0.08), r: C.coin.r, harmless: true, shape: 'fake_coin', fake: true, drawShape: (ctx, q) => drawCoin(ctx, q.x, q.y, q.r, q.age, true) });
        api.sfx?.('bell', { volume: 0.6 });
      }
    } };
  },

  /** 회전 레이저 바퀴: 상자 가운데서 살 4개가 천천히 돈다(살에 닿으면 피해). 6.5초부터 코인이 반대 방향으로 테두리 원을 돈다 — 살 사이로 따라가 잡는다 */
  coin_spokes: (o = {}) => {
    const K = { ...C.spokes, ...o }; let hub = null, coin = null;
    return { duration: K.duration, update(t, dt, api) {
      const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2, L = Math.hypot(b.w, b.h) / 2 + 10;
      if (!hub) {
        hub = keep(api, { x: cx, y: cy, r: 0, kind: 'red', shape: 'spokes', life: K.duration - 0.6, angle: 0, box: { ...b }, spokes: K.spokes, len: L, thick: K.thick, grow: 0,
          hitShape: (q, soul) => { if (q.grow < 1) return false; for (let i = 0; i < q.spokes; i++) { const a = q.angle + i * TAU / q.spokes; if (distToSegment(soul.x, soul.y, q.x + Math.cos(a) * 14, q.y + Math.sin(a) * 14, q.x + Math.cos(a) * q.len, q.y + Math.sin(a) * q.len) <= q.thick / 2 + soul.r - 2) return true; } return false; },
          drawShape: (ctx, q) => { ctx.save(); clipBox(ctx, q.box); const k = q.grow; for (let i = 0; i < q.spokes; i++) { const a = q.angle + i * TAU / q.spokes; ctx.strokeStyle = k < 1 ? `rgba(255,90,90,${0.3 + 0.5 * k})` : 'rgba(255,60,60,0.95)'; ctx.lineWidth = k < 1 ? 2 : q.thick; if (k < 1) ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(q.x + Math.cos(a) * 14, q.y + Math.sin(a) * 14); ctx.lineTo(q.x + Math.cos(a) * q.len, q.y + Math.sin(a) * q.len); ctx.stroke(); ctx.setLineDash([]); if (k >= 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } }
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, TAU); ctx.fill(); ctx.restore(); } });
        api.sfx?.('laser_charge', { volume: 0.5 });
      }
      hub.grow = Math.min(1, t / 0.9); if (hub.grow >= 1 && !hub.on) { hub.on = true; api.sfx?.('laser_beam', { volume: 0.6 }); }
      hub.angle += K.rev * TAU * dt;
      if (o.coin && !coin && t >= K.coinAt) { coin = keep(api, coinBullet({ x: cx + K.orbitR, y: cy, life: K.duration - K.coinAt - 0.4, a0: 0 })); api.sfx?.('bell', { volume: 0.6 }); }
      if (coin && !coin.taken) { const a = -(t - K.coinAt) * K.orbitRev * TAU; coin.x = cx + Math.cos(a) * K.orbitR; coin.y = cy + Math.sin(a) * K.orbitR * 0.72; }
    } };
  },

  /** 유도 함선 둘(엄청대박인배 흰 도트, 소울을 따라옴) + 6.8초부터 소울에게서 달아나는 코인(벽에서 튕김) — 구석으로 몰아 잡는다 */
  coin_ships: (o = {}) => {
    const K = { ...C.ships, ...o }; let li = 0, coin = null;
    return { duration: K.duration, update(t, dt, api) {
      const b = api.box, img = whiteSprite(api.images?.warship, 0.32);
      while (li < K.launches.length && t >= K.launches[li]) {
        li++; api.sfx?.('wing', { volume: 0.9 });
        const sx = li % 2 ? b.x + b.w - 12 : b.x + 12, sy = b.y + 22, dx = api.soul.x - sx, dy = api.soul.y - sy, d = Math.hypot(dx, dy) || 1;
        api.emit({ x: sx, y: sy, vx: dx / d * K.speed, vy: dy / d * K.speed, r: 13, kind: 'white', shape: 'warship', life: K.life, box: { ...b },
          steer: (q, dt2) => { const ang = Math.atan2(q.vy, q.vx), want = Math.atan2(api.soul.y - q.y, api.soul.x - q.x); let da = want - ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; const na = ang + Math.max(-K.turn * dt2, Math.min(K.turn * dt2, da)); q.vx = Math.cos(na) * K.speed; q.vy = Math.sin(na) * K.speed; if (q.age > K.life - 0.3) q.harmless = true; },
          drawShape: (ctx, q) => { ctx.save(); clipBox(ctx, q.box); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(q.x), Math.round(q.y)); const a = Math.atan2(q.vy, q.vx); if (Math.cos(a) < 0) { ctx.scale(-1, 1); ctx.rotate(Math.PI - a); } else ctx.rotate(a); ctx.globalAlpha = q.harmless ? 0.5 : 1;
            if (img) { const s = 72 / img.width, w = Math.round(img.width * s), h = Math.round(img.height * s); ctx.drawImage(img, -w / 2, -h / 2, w, h); } else { ctx.fillStyle = '#fff'; ctx.fillRect(-30, -10, 60, 20); }
            ctx.restore(); } });
      }
      if (o.coin && !coin && t >= K.coinAt) { const far = api.soul.x < b.x + b.w / 2; coin = keep(api, coinBullet({ x: far ? b.x + b.w - 30 : b.x + 30, y: api.soul.y < b.y + b.h / 2 ? b.y + b.h - 30 : b.y + 30, life: K.coinLife, box: { ...b } })); api.sfx?.('bell', { volume: 0.6 }); }
      if (coin && !coin.taken) {   // 소울 반대쪽으로 달아난다, 벽에서 튕김
        const dx = coin.x - api.soul.x, dy = coin.y - api.soul.y, d = Math.hypot(dx, dy) || 1; const sp = d < 90 ? K.fleeSpeed : K.fleeSpeed * 0.4;
        coin.x += dx / d * sp * dt; coin.y += dy / d * sp * dt;
        coin.x = Math.max(b.x + 14, Math.min(b.x + b.w - 14, coin.x)); coin.y = Math.max(b.y + 14, Math.min(b.y + b.h - 14, coin.y));
      }
    } };
  },
};
