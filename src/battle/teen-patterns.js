// BUILD339 청소년 보스전 탄막(사용자 2026-09-25 브리핑). BUILD343: 흰색 대신 보라 색감(purpleSprite·보라 돌) — 무릎 가재맨은 사용자 지정 검정·보라 그림.
//   teen_vacuum : 청소년이 뻗은 손바닥 구멍이 하트와 돌 잔해를 빨아들인다. 피한 잔해마다 청소 용량(support.onProjectile)
//   teen_slam   : 주먹 내려찍기(조준 예고 → 충격파) 네 번 → 거대한 주먹. 한 대도 안 맞으면 튀어 오른 낙석이 청소년에게 50
//   gj_swords / gj_knee / gj_mouse : 청소년이 쓰러진 동안 가재맨(검 · 무릎 · 강제퇴장 버튼 파동)
import { TEEN_BATTLE } from '../data/teen-battle.js';

const TAU = Math.PI * 2;
/** 계속 붙잡고 움직일 탄: 실제 전투의 emit 은 탄 객체를 돌려준다(테스트의 가짜 api 는 숫자) */
const keep = (api, o) => { const made = api.emit(o); return made && typeof made === 'object' ? made : o; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clip = (ctx, box) => { ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip(); };
const rockPoints = (r, seed) => Array.from({ length: 7 }, (_, i) => { const a = i / 7 * TAU; const k = 0.72 + 0.28 * Math.abs(Math.sin(seed * 13.7 + i * 2.1)); return [Math.cos(a) * r * k, Math.sin(a) * r * k]; });
const drawRock = (ctx, b) => {
  ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
  ctx.fillStyle = '#8a5ad8'; ctx.strokeStyle = '#2a1050'; ctx.lineWidth = 1; ctx.beginPath(); b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9a8ff'; ctx.fillRect(-2, -2, 2, 2); ctx.restore();
};
// BUILD342(사용자 “트로피는 한두개만, 돌이나 그런것들 더”): 돌 잔해 6종이 대부분, 가끔 방 안 잡동사니, 트로피는 한 패턴에 한 번까지
const ROCKS = Array.from({ length: 6 }, (_, i) => `assets/props/teen342_rock_${i}.png`);
const JUNK = [0, 2, 4, 5].map(i => `assets/props/teenboss339_debris_${i}.png`);
const TROPHY = 'assets/props/teenboss339_debris_1.png';
const DEBRIS = [...ROCKS, ...JUNK, TROPHY];
/** 가재맨 공격 그림은 흰색 대신 보라로 물들인다(사용자 “흰색색감좀 쓰지마”). 캔버스가 없으면(단위 테스트) 원본 */
const PURPLE = new WeakMap();
const purpleSprite = img => {
  if (!img) return null;
  let c = PURPLE.get(img);
  if (!c) {
    try {
      c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(150,80,255,0.78)'; x.fillRect(0, 0, c.width, c.height);
    } catch { c = img; }
    PURPLE.set(img, c);
  }
  return c;
};
const drawDebris = (ctx, b) => {
  const img = globalThis.__teenImages?.[b.src];
  if (!img) { if (!b.pts) b.pts = rockPoints(b.r, b.seed || 1); drawRock(ctx, b); return; }
  ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
  const k = b.shrink ?? 1;
  ctx.drawImage(img, -Math.round(img.width * k / 2), -Math.round(img.height * k / 2), Math.round(img.width * k), Math.round(img.height * k)); ctx.restore();
};
export const TEEN_DEBRIS = DEBRIS;
/** 상자를 덮는 소용돌이 깔때기: 왼쪽 손바닥 구멍(꼭짓점)에서 오른쪽으로 벌어지며, 고리·바람 줄기가 구멍으로 빨려 든다 */
const drawVortex = (ctx, b) => {
  const t = b.age, k = Math.min(1, t / b.prep), [ax, ay] = TEEN_BATTLE.view.palm, box = b.box, len = box.x + box.w - ax + 30;
  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  const spread = box.h * 0.75 * k;
  const g = ctx.createLinearGradient(ax, 0, ax + len, 0);
  g.addColorStop(0, `rgba(200,150,255,${0.5 * k})`); g.addColorStop(0.4, `rgba(120,60,220,${0.3 * k})`); g.addColorStop(1, `rgba(60,20,120,${0.16 * k})`);
  ctx.fillStyle = g; ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.translate(ax, ay); ctx.lineCap = 'round';
  // 구멍으로 조여 드는 소용돌이 고리
  for (let i = 0; i < 16; i++) {
    const ph = 1 - (((i / 16) + t * (0.45 + 0.8 * k)) % 1), x = len * ph, r = spread * ph + 6;
    ctx.strokeStyle = `rgba(190,140,255,${(0.2 + 0.6 * (1 - ph)) * k})`; ctx.lineWidth = 1 + 2.5 * (1 - ph);
    const a0 = t * 7 + i * 1.9;
    ctx.beginPath(); ctx.ellipse(x, 0, Math.max(2, r * 0.3), r, 0, a0, a0 + 2.6); ctx.stroke();
  }
  // 상자 전체를 가로질러 구멍으로 빨려 드는 바람 줄기(빈 곳 없이)
  for (let i = 0; i < 26; i++) {
    const ph = ((i * 0.381 + t * (0.9 + (i % 3) * 0.25)) % 1), lane = ((i * 0.618) % 1) * 2 - 1;
    const x = len * (1 - ph), y = lane * box.h * 0.55 * (1 - ph * 0.85);
    ctx.strokeStyle = `rgba(170,120,255,${0.55 * ph * k})`; ctx.lineWidth = 1 + (i % 2);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 14, y * 0.93 + 4 * Math.sin(t * 6 + i), x - 30, y * 0.85); ctx.stroke();
  }
  ctx.restore();
  // 구멍: 보라빛 고리가 맥동
  ctx.save();
  const pr = 8 + 10 * k + Math.sin(t * 14) * 2;
  ctx.strokeStyle = `rgba(190,120,255,${0.9 * k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ax, ay, pr, 0, TAU); ctx.stroke();
  ctx.strokeStyle = `rgba(120,60,220,${0.7 * k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ax, ay, pr + 5 + (t * 30) % 10, 0, TAU); ctx.stroke();
  ctx.restore();
};
/** 방해용 가재맨 검 한 자루(세로 칸 예고 → 보라 검이 내리꽂힘) */
const harassSword = (api, x) => {
  const box = api.box, w = 34, warn = 0.6;
  api.sfx?.('spearappear', { volume: 0.4 });
  api.emit({ zone: true, x: x - w / 2, y: box.y, w, h: box.h, warn, life: warn + 0.3,
    drawShape(ctx, b) {
      ctx.save(); clip(ctx, api.box);
      if (b.age < b.warn) { ctx.fillStyle = `rgba(160,90,255,${0.14 + 0.28 * b.age / b.warn})`; ctx.fillRect(b.x, b.y, b.w, b.h); }
      const img = purpleSprite(api.images?.sword);
      if (img) { const kk = Math.min(1, Math.max(0, (b.age - b.warn + 0.12) / 0.18)); const h = b.h * 0.95, sw = h * img.width / img.height;
        ctx.drawImage(img, Math.round(b.x + b.w / 2 - sw / 2), Math.round(b.y - h + kk * (h + 4)), Math.round(sw), Math.round(h)); }
      ctx.restore();
    } });
  setTimeoutLike(api, warn, () => api.sfx?.('knight_cut', { volume: 0.45 }));
};
/** 방해용 가재맨 무릎(아래에서 솟는 무릎, “넣을게~”) */
const harassKnee = (api, x) => {
  const box = api.box, img = api.images?.knee, cw = img ? img.width / 4 : 60, ch = img ? img.height : 60, s = 0.55, w = cw * s, h = ch * s, warn = 0.55;
  api.sfx?.('gajaeman_knee', { volume: 0.8 });
  api.emit({ zone: true, x: x - 20, y: box.y + box.h - 78, w: 40, h: 78, warn, life: warn + 0.5,
    drawShape(ctx, b) {
      ctx.save(); clip(ctx, api.box);
      if (b.age < b.warn) { ctx.fillStyle = `rgba(160,90,255,${0.14 + 0.28 * b.age / b.warn})`; ctx.fillRect(b.x, b.y, b.w, b.h); }
      if (img) { const up = Math.min(1, Math.max(0, (b.age - b.warn + 0.1) / 0.15)), frame = b.age < b.warn ? 1 : 2;
        ctx.drawImage(img, frame * cw, 0, cw, ch, Math.round(b.x + b.w / 2 - w / 2), Math.round(box.y + box.h - up * h), Math.round(w), Math.round(h)); }
      ctx.restore();
    } });
  setTimeoutLike(api, warn, () => { api.sfx?.('impact', { volume: 0.5 }); api.shake?.(0.2, 3); });
};
export const TEEN_PATTERNS = {
  // BUILD340 재설계(사용자 “오른쪽에 손이 뻗어진 느낌, 가운데 피하는 영역은 좁고, 삼각형 소용돌이 흡입, 더 강렬, 잔해는 스프라이트”):
  //   오른쪽 밖에서 손바닥(구멍)이 뻗어 오고, 그 앞 삼각형 소용돌이가 하트를 오른쪽으로 빨아들인다. 컬러 잔해가 왼쪽에서 날아와 구멍으로 빨려 간다.
  //   손·소용돌이 그림은 support.drawUnderBoard(상자 밖)에서, 이 패턴은 힘·잔해·예고만.
  teen_vacuum: (o = {}) => {
    // BUILD343(사용자 “비어보임”, “맵 위로 소용돌이”, “더 넓혀”, “두배는 더 오래·느리게”, “3번째부터 가재맨이 검·넣을게로 방해”):
    //   왼쪽 손바닥 구멍(view.palm)이 상자 왼쪽 가운데에서 빨아들인다. 잔해는 오른쪽·위·아래 벽 밖에서 생겨 상자를 가로질러 구멍으로.
    const duration = o.duration ?? 16.8, prep = 1.8, V = TEEN_BATTLE.view;
    let next = prep + 0.2, n = 0, started = false, trophy = false, nextHarass = prep + 2.2, h = 0;
    return { duration, update(t, dt, api) {
      const box = api.box, [px, py] = V.palm;
      if (!started) {
        started = true; api.present?.({ sheet: 'vacuum', x: V.vacuumPose[0], y: V.vacuumPose[1] }); api.sfx?.('teen_vacuum', { volume: 0.9 }); api.vacuum?.(true, duration);
        api.emit({ x: box.x, y: box.y, r: 0, harmless: true, life: duration, box, prep, drawShape: drawVortex });
      }
      tickTimers(api, dt);
      if (t < prep) return;
      // 구멍 쪽(왼쪽)으로 끌려간다, 점점 세게
      const pull = 16 + 38 * Math.min(1, (t - prep) / (duration * 0.6)), dx = px - api.soul.x, dy = py - api.soul.y, d = Math.max(1, Math.hypot(dx, dy));
      api.soul.x = clamp(api.soul.x + dx / d * pull * dt, box.x + api.soul.r + 4, box.x + box.w - api.soul.r - 4);
      api.soul.y = clamp(api.soul.y + dy / d * pull * 0.6 * dt, box.y + api.soul.r + 4, box.y + box.h - api.soul.r - 4);
      const every = Math.max(0.24, 0.4 - (t - prep) * 0.012);
      while (t >= next && t < duration - 1.2) {
        next += every; n++;
        const side = api.rnd(), warn = 0.5, speed = 80 + api.rnd() * 45;
        let x, y, wx, wy, dir;
        if (side < 0.5) { x = box.x + box.w + 24; y = box.y + 10 + api.rnd() * (box.h - 20); wx = box.x + box.w - 7; wy = y; dir = 'left'; }
        else if (side < 0.75) { x = box.x + 40 + api.rnd() * (box.w - 50); y = box.y - 24; wx = x; wy = box.y + 7; dir = 'down'; }
        else { x = box.x + 40 + api.rnd() * (box.w - 50); y = box.y + box.h + 24; wx = x; wy = box.y + box.h - 7; dir = 'up'; }
        let src;
        if (!trophy && n > 8 && api.rnd() < 0.06) { src = TROPHY; trophy = true; } else src = api.rnd() < 0.14 ? JUNK[Math.floor(api.rnd() * JUNK.length)] : ROCKS[Math.floor(api.rnd() * ROCKS.length)];
        api.emit({ x: wx, y: wy, r: 0, harmless: true, life: warn, drawShape: (ctx, b) => {
          if (Math.floor(b.age * 12) % 2) return;
          ctx.fillStyle = '#b070ff'; ctx.beginPath();
          if (dir === 'left') { ctx.moveTo(wx + 4, wy - 6); ctx.lineTo(wx - 4, wy); ctx.lineTo(wx + 4, wy + 6); }
          else if (dir === 'down') { ctx.moveTo(wx - 6, wy - 4); ctx.lineTo(wx, wy + 4); ctx.lineTo(wx + 6, wy - 4); }
          else { ctx.moveTo(wx - 6, wy + 4); ctx.lineTo(wx, wy - 4); ctx.lineTo(wx + 6, wy + 4); }
          ctx.closePath(); ctx.fill();
        } });
        api.emit({ x, y, r: 10, vx: 0, vy: 0, spin: (api.rnd() - 0.5) * 7, kind: 'debris', src, seed: n, drawShape: drawDebris,
          steer(b, dd) {
            if (b.age < warn) return;
            // 구멍을 향해 소용돌이치며 가속
            const ex = px - b.x, ey = py - b.y, dist = Math.max(1, Math.hypot(ex, ey)), v = speed * (1 + 1.3 * Math.max(0, 1 - dist / 150));
            const tx = ex / dist * v + (-ey / dist) * v * 0.3, ty = ey / dist * v + (ex / dist) * v * 0.3;
            b.vx += (tx - b.vx) * Math.min(1, dd * 3); b.vy += (ty - b.vy) * Math.min(1, dd * 3);
            b.shrink = Math.min(1, dist / 40);
            if (!b.touched && b.hits(api.soul)) b.touched = true;
            if (!b.counted && dist < 14) { b.counted = true; b.life = b.age; if (!b.touched) api.trackProjectile?.({ type: 'teen_dodge' }); }
          } });
      }
      // 세 번째 청소부터: 가재맨이 중간중간 검·무릎으로 방해
      if (o.harass && t >= nextHarass && t < duration - 2) {
        nextHarass = t + 2.4 + api.rnd() * 0.8; h++;
        const x = clamp(api.soul.x + (api.rnd() - 0.5) * 30, box.x + 24, box.x + box.w - 24);
        if (h % 2) harassSword(api, x); else harassKnee(api, x);
      }
    } };
  },

  teen_slam: (o = {}) => {
    const duration = o.duration ?? 8.2;
    const slams = [0.7, 1.8, 2.9, 4.0], giantAt = 5.2, giantWarn = 1.1;
    let fired = 0, hits0 = null, giant = null, rock = null, launched = false, sent = false;
    const fist = (api, x, y0, y1, w, warn, big = false) => keep(api, { zone: true, x: x - w / 2, y: y0, w, h: y1 - y0, warn, life: warn + 0.28, harmless: false,
      drawShape(ctx, b) {
        ctx.save(); clip(ctx, api.box);
        if (b.age < b.warn) {
          const k = b.age / b.warn; ctx.fillStyle = `rgba(255,60,60,${0.14 + 0.22 * k})`; ctx.fillRect(b.x, b.y, b.w, b.h);
          if (Math.floor(b.age * 10) % 2 === 0) { ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2); }
        }
        const img = api.images?.arm, drop = Math.min(1, Math.max(0, (b.age - b.warn + 0.16) / 0.16));
        if (img && b.age > b.warn - 0.16) {
          const s = big ? b.w / img.height : 0.3, len = img.width * s;
          ctx.translate(b.x + b.w / 2, b.y + b.h - (1 - drop) * (b.h + 20)); ctx.rotate(Math.PI / 2);
          ctx.drawImage(purpleSprite(img), -len + 8, -img.height * s / 2, len, img.height * s);
        }
        ctx.restore();
      } });
    return { duration, update(t, dt, api) {
      const box = api.box, soul = api.soul;
      if (hits0 === null) { hits0 = soul.hits; api.present?.({ sheet: 'slam' }); }
      while (fired < slams.length && t >= slams[fired]) {
        const w = 60, x = clamp(soul.x, box.x + w / 2, box.x + box.w - w / 2), warn = 0.62, at = fired++;
        fist(api, x, box.y, box.y + box.h, w, warn);
        api.sfx?.('heavyswing', { volume: 0.5 });
        // 내려찍는 순간: 바닥을 따라 양쪽으로 퍼지는 충격파
        setTimeoutLike(api, warn, () => {
          api.sfx?.('furnace_blast', { volume: 0.45 }); api.shake?.(0.25, 4); api.present?.({ sheet: at % 2 ? 'idle' : 'slam' });
          for (const dir of [-1, 1]) api.emit({ x, y: box.y + box.h - 9, r: 7, vx: dir * 170, pts: rockPoints(7, at + dir), drawShape: drawRock, spin: dir * 6 });
          for (let k = 0; k < 3; k++) api.emit({ x, y: box.y + box.h - 12, r: 4, vx: (api.rnd() - 0.5) * 140, vy: -140 - api.rnd() * 60, ay: 260, pts: rockPoints(4, k), drawShape: drawRock, spin: 5 });
        });
      }
      if (!giant && t >= giantAt) {
        // 마지막 거대한 주먹: 한쪽 끝 56px 만 안전
        const safeLeft = soul.x > box.x + box.w / 2, safe = 56, x0 = safeLeft ? box.x + safe : box.x, x1 = safeLeft ? box.x + box.w : box.x + box.w - safe;
        giant = fist(api, (x0 + x1) / 2, box.y, box.y + box.h, x1 - x0, giantWarn, true);
        api.present?.({ sheet: 'slam' }); api.sfx?.('power', { volume: 0.6 });
        setTimeoutLike(api, giantWarn, () => {
          api.sfx?.('baron_slam', { volume: 0.9 }); api.shake?.(0.7, 7);
          if (soul.hits === hits0) {
            // 한 대도 안 맞았다: 거대한 낙석이 튀어 올라 청소년에게
            rock = keep(api, { x: (x0 + x1) / 2, y: box.y + box.h - 20, r: 22, harmless: true, vy: -420, life: 1.4, pts: rockPoints(22, 9), spin: 4, drawShape: drawRock });
            launched = true; api.sfx?.('impact', { volume: 0.8 });
          }
        });
      }
      if (launched && !sent && rock && rock.y < box.y - 30) { sent = true; api.trackProjectile?.({ type: 'teen_rock' }); }
      tickTimers(api, dt);
    } };
  },

  gj_swords: (o = {}) => {
    const duration = o.duration ?? 6.6, lanes = 4;
    let next = 0.5, wave = 0;
    return { duration, update(t, dt, api) {
      const box = api.box, lw = box.w / lanes;
      while (t >= next && t < duration - 1) {
        next += Math.max(0.55, 0.8 - wave * 0.03);
        const pick = [Math.floor(api.rnd() * lanes)];
        if (wave > 2 && api.rnd() < 0.6) pick.push((pick[0] + 1 + Math.floor(api.rnd() * (lanes - 1))) % lanes);
        wave++;
        api.sfx?.('spearappear', { volume: 0.4 });
        for (const lane of pick) {
          const x = box.x + lw * lane, warn = 0.5;
          api.emit({ zone: true, x: x + 4, y: box.y, w: lw - 8, h: box.h, warn, life: warn + 0.35,
            drawShape(ctx, b) {
              ctx.save(); clip(ctx, api.box);
              if (b.age < b.warn) { ctx.fillStyle = `rgba(160,90,255,${0.12 + 0.25 * b.age / b.warn})`; ctx.fillRect(b.x, b.y, b.w, b.h); }
              const img = purpleSprite(api.images?.sword);
              if (img) { const k = Math.min(1, Math.max(0, (b.age - b.warn + 0.12) / 0.2)); const h = b.h * 0.95, w = h * img.width / img.height;
                ctx.drawImage(img, Math.round(b.x + b.w / 2 - w / 2), Math.round(b.y - h + k * (h + 4)), Math.round(w), Math.round(h)); }
              ctx.restore();
            } });
          setTimeoutLike(api, warn, () => api.sfx?.('knight_cut', { volume: 0.45 }));
        }
      }
      tickTimers(api, dt);
    } };
  },

  gj_knee: (o = {}) => {
    const duration = o.duration ?? 7.2, every = 1.25;
    let body = null, next = 0.9, strikes = 0;
    return { duration, update(t, dt, api) {
      const box = api.box, img = api.images?.knee, cw = img ? img.width / 4 : 60, ch = img ? img.height : 60, s = 0.6, w = cw * s, h = ch * s;
      if (!body) {
        body = keep(api, { x: box.x + box.w / 2, y: box.y + box.h - h / 2 - 2, r: 0, life: duration, frame: 0, phase: 'walk', dir: 1,
          hitShape: (b, soul) => Math.abs(soul.x - b.x) < w * 0.38 + soul.r - 2 && Math.abs(soul.y - b.y) < h * 0.42 + soul.r - 2,
          drawShape(ctx, b) {
            if (!img) return; ctx.save(); clip(ctx, api.box);
            ctx.drawImage(img, b.frame * cw, 0, cw, ch, Math.round(b.x - w / 2), Math.round(b.y - h / 2), Math.round(w), Math.round(h)); ctx.restore();
          } });
      }
      const b = body;
      if (b.phase === 'walk') {
        b.x += b.dir * 95 * dt; b.frame = 3;
        if (b.x > box.x + box.w - w / 2 - 4) b.dir = -1; if (b.x < box.x + w / 2 + 4) b.dir = 1;
        if (t >= next && t < duration - 1) { next = t + every; b.phase = 'raise'; b.pt = 0; b.frame = 1; api.sfx?.('gajaeman_knee', { volume: 0.8 });
          const kx = b.x;
          api.emit({ zone: true, x: kx - 18, y: box.y, w: 36, h: box.h - h + 6, warn: 0.42, life: 0.72 });
          setTimeoutLike(api, 0.42, () => { api.sfx?.('impact', { volume: 0.55 }); api.shake?.(0.2, 3); strikes++;
            for (let k = 0; k < 3; k++) api.emit({ x: kx, y: box.y + box.h - h, r: 4, vx: (k - 1) * 90, vy: -170, ay: 200, pts: rockPoints(4, k + strikes), drawShape: drawRock }); });
        }
      } else {
        b.pt += dt; b.frame = b.pt < 0.42 ? 1 : 2;
        if (b.pt > 0.8) { b.phase = 'walk'; b.frame = 0; }
      }
      tickTimers(api, dt);
    } };
  },

  gj_mouse: (o = {}) => {
    const duration = o.duration ?? 7.4, clicks = o.clicks ?? 6;
    let n = 0, next = 0.3, btn = null, cursor = null;
    return { duration, update(t, dt, api) {
      const box = api.box, bw = 64, bh = 16;
      if (!btn) {
        btn = keep(api, { x: box.x + box.w / 2, y: box.y + 12, r: 0, harmless: true, life: duration, pressed: 0,
          drawShape(ctx, b) {
            ctx.save(); const x = Math.round(b.x - bw / 2), y = Math.round(b.y - bh / 2) + (b.pressed > 0 ? 1 : 0);
            ctx.fillStyle = b.pressed > 0 ? '#b070ff' : '#1a0b2e'; ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = '#a060ff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
            ctx.fillStyle = b.pressed > 0 ? '#1a0b2e' : '#d0b0ff'; ctx.font = '9px "Galmuri9", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('강제퇴장', b.x, y + bh / 2 + 1); ctx.restore();
          } });
        cursor = keep(api, { x: box.x + box.w + 30, y: box.y + box.h, r: 0, harmless: true, life: duration, tx: 0, ty: 0,
          drawShape(ctx, c) {
            const x = Math.round(c.x), y = Math.round(c.y); ctx.save();
            ctx.fillStyle = '#12061f'; ctx.strokeStyle = '#a060ff'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 17); ctx.lineTo(x + 4, y + 13); ctx.lineTo(x + 7, y + 20); ctx.lineTo(x + 10, y + 19); ctx.lineTo(x + 7, y + 12); ctx.lineTo(x + 12, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
          } });
      }
      btn.pressed -= dt;
      if (t >= next && n < clicks && t < duration - 1.4) {
        next = t + 1.05; n++;
        // 버튼이 위쪽에서 자리를 옮기고, 마우스가 날아가 누른다(0.5초 예고)
        btn.x = box.x + 40 + api.rnd() * (box.w - 80);
        cursor.tx = btn.x + 6; cursor.ty = btn.y + 2;
        const bx = btn.x, by = btn.y + bh / 2, gap = 1.05, aim = Math.PI / 2 + (api.rnd() - 0.5) * 1.6;
        setTimeoutLike(api, 0.5, () => {
          btn.pressed = 0.18; api.sfx?.('gajaeman_kick', { volume: 0.85 }); api.shake?.(0.15, 2);
          api.emit({ x: bx, y: by, r: 0, life: 2.2, R: 4,
            steer(w, d) { w.R += 150 * d; },
            hitShape: (w, soul) => {
              const dx = soul.x - w.x, dy = soul.y - w.y, dist = Math.hypot(dx, dy);
              if (Math.abs(dist - w.R) > 5 + soul.r - 2) return false;
              let a = Math.atan2(dy, dx) - aim; a = Math.atan2(Math.sin(a), Math.cos(a));
              return Math.abs(a) > gap / 2;
            },
            drawShape(ctx, w) {
              ctx.save(); clip(ctx, api.box); ctx.strokeStyle = '#9a50ff'; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.arc(w.x, w.y, w.R, aim + gap / 2, aim - gap / 2 + TAU); ctx.stroke();
              ctx.strokeStyle = 'rgba(210,160,255,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w.x, w.y, w.R - 5, aim + gap / 2, aim - gap / 2 + TAU); ctx.stroke(); ctx.restore();
            } });
        });
      }
      if (cursor) { cursor.x += (cursor.tx - cursor.x) * Math.min(1, dt * 9); cursor.y += (cursor.ty - cursor.y) * Math.min(1, dt * 9); }
      tickTimers(api, dt);
    } };
  },
};

// 패턴 안의 지연 호출: api 객체는 프레임마다 새로 만들어지므로 타이머는 패턴별 배열(WeakMap 대신 api.box 기준 전역 큐)에 둔다
const TIMERS = [];
function setTimeoutLike(api, delay, fn) { TIMERS.push({ left: delay, fn }); }
function tickTimers(api, dt) {
  for (let i = TIMERS.length - 1; i >= 0; i--) { const t = TIMERS[i]; t.left -= dt; if (t.left <= 0) { TIMERS.splice(i, 1); t.fn(); } }
}
/** Battle reset/retry: drop pending delayed hits. */
export function clearTeenTimers() { TIMERS.length = 0; }
