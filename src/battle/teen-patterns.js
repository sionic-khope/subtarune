// BUILD339 청소년 보스전 탄막(사용자 2026-09-25 브리핑). 상자 안 캐릭터 그림은 흰색 간소화(whiteSprite) — 무릎 가재맨만 사용자 지정 검정·보라.
//   teen_vacuum : 손바닥 구멍이 하트를 왼쪽으로 끌어당기고, 왼쪽에서 잔해가 날아온다. 피한 잔해마다 청소 용량(support.onProjectile)
//   teen_slam   : 주먹 내려찍기(조준 예고 → 충격파) 네 번 → 거대한 주먹. 한 대도 안 맞으면 튀어 오른 낙석이 청소년에게 50
//   gj_swords / gj_knee / gj_mouse : 청소년이 쓰러진 동안 가재맨(검 · 무릎 · 강제퇴장 버튼 파동)
import { whiteSprite } from './youngcle-patterns.js';

const TAU = Math.PI * 2;
/** 계속 붙잡고 움직일 탄: 실제 전투의 emit 은 탄 객체를 돌려준다(테스트의 가짜 api 는 숫자) */
const keep = (api, o) => { const made = api.emit(o); return made && typeof made === 'object' ? made : o; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clip = (ctx, box) => { ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip(); };
const rockPoints = (r, seed) => Array.from({ length: 7 }, (_, i) => { const a = i / 7 * TAU; const k = 0.72 + 0.28 * Math.abs(Math.sin(seed * 13.7 + i * 2.1)); return [Math.cos(a) * r * k, Math.sin(a) * r * k]; });
const drawRock = (ctx, b) => {
  ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.rot);
  ctx.fillStyle = '#fff'; ctx.beginPath(); b.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000'; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
};
const warnArrow = (ctx, b) => {
  if (Math.floor(b.age * 12) % 2) return;
  ctx.fillStyle = '#ff4d4d'; const x = Math.round(b.x), y = Math.round(b.y);
  ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 6); ctx.closePath(); ctx.fill();
};

export const TEEN_PATTERNS = {
  teen_vacuum: (o = {}) => {
    const duration = o.duration ?? 8.4;
    let next = 0.6, n = 0, hole = null;
    return { duration, update(t, dt, api) {
      const box = api.box, cy = box.y + box.h / 2;
      if (!hole) {
        api.present?.({ sheet: 'all', frame: 4 });
        api.sfx?.('laser_charge', { volume: 0.5 });
        hole = keep(api, { x: box.x + 2, y: cy, r: 16, life: duration, drawShape(ctx, b) {
          ctx.save(); clip(ctx, api.box); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          for (let k = 0; k < 3; k++) { const r = 6 + k * 6 + (b.age * 18 % 6); ctx.beginPath(); ctx.arc(b.x, b.y, r, b.age * 6 + k, b.age * 6 + k + 4.2); ctx.stroke(); }
          ctx.restore();
        } });
      }
      // 빨아들이는 힘: 점점 세진다
      const pull = 24 + 26 * Math.min(1, t / (duration * 0.8));
      api.soul.x = clamp(api.soul.x - pull * dt, box.x + api.soul.r + 4, box.x + box.w - api.soul.r - 4);
      const every = Math.max(0.28, 0.46 - t * 0.02);
      while (t >= next && t < duration - 1) {
        next += every; n++;
        const y = box.y + 10 + api.rnd() * (box.h - 20), warn = 0.35, speed = 130 + api.rnd() * 70, r = 9 + Math.floor(api.rnd() * 6);
        api.emit({ x: box.x + 4, y, r: 0, harmless: true, life: warn, drawShape: warnArrow });
        const seed = n;
        api.emit({ x: box.x - 14, y, r, vx: 0, spin: (api.rnd() - 0.5) * 8, pts: rockPoints(r, seed), drawShape: drawRock,
          steer(b) {
            if (b.age >= warn && !b.vx) b.vx = speed;
            if (!b.touched && b.hits(api.soul)) b.touched = true;
            if (!b.counted && b.x > api.box.x + api.box.w + 6) { b.counted = true; if (!b.touched) api.trackProjectile?.({ type: 'teen_dodge' }); }
          } });
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
          ctx.drawImage(whiteSprite(img, 0.35), -len + 8, -img.height * s / 2, len, img.height * s);
        }
        ctx.restore();
      } });
    return { duration, update(t, dt, api) {
      const box = api.box, soul = api.soul;
      if (hits0 === null) { hits0 = soul.hits; api.present?.({ sheet: 'all', frame: 3 }); }
      while (fired < slams.length && t >= slams[fired]) {
        const w = 60, x = clamp(soul.x, box.x + w / 2, box.x + box.w - w / 2), warn = 0.62, at = fired++;
        fist(api, x, box.y, box.y + box.h, w, warn);
        api.sfx?.('heavyswing', { volume: 0.5 });
        // 내려찍는 순간: 바닥을 따라 양쪽으로 퍼지는 충격파
        setTimeoutLike(api, warn, () => {
          api.sfx?.('furnace_blast', { volume: 0.45 }); api.shake?.(0.25, 4); api.present?.({ sheet: 'all', frame: at % 2 ? 2 : 3 });
          for (const dir of [-1, 1]) api.emit({ x, y: box.y + box.h - 9, r: 7, vx: dir * 170, pts: rockPoints(7, at + dir), drawShape: drawRock, spin: dir * 6 });
          for (let k = 0; k < 3; k++) api.emit({ x, y: box.y + box.h - 12, r: 4, vx: (api.rnd() - 0.5) * 140, vy: -140 - api.rnd() * 60, ay: 260, pts: rockPoints(4, k), drawShape: drawRock, spin: 5 });
        });
      }
      if (!giant && t >= giantAt) {
        // 마지막 거대한 주먹: 한쪽 끝 56px 만 안전
        const safeLeft = soul.x > box.x + box.w / 2, safe = 56, x0 = safeLeft ? box.x + safe : box.x, x1 = safeLeft ? box.x + box.w : box.x + box.w - safe;
        giant = fist(api, (x0 + x1) / 2, box.y, box.y + box.h, x1 - x0, giantWarn, true);
        api.present?.({ sheet: 'all', frame: 3 }); api.sfx?.('power', { volume: 0.6 });
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
              const img = whiteSprite(api.images?.sword, 0.3);
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
            ctx.fillStyle = b.pressed > 0 ? '#fff' : '#000'; ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
            ctx.fillStyle = b.pressed > 0 ? '#000' : '#fff'; ctx.font = '9px "Galmuri9", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('강제퇴장', b.x, y + bh / 2 + 1); ctx.restore();
          } });
        cursor = keep(api, { x: box.x + box.w + 30, y: box.y + box.h, r: 0, harmless: true, life: duration, tx: 0, ty: 0,
          drawShape(ctx, c) {
            const x = Math.round(c.x), y = Math.round(c.y); ctx.save();
            ctx.fillStyle = '#000'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
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
              ctx.save(); clip(ctx, api.box); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
              ctx.beginPath(); ctx.arc(w.x, w.y, w.R, aim + gap / 2, aim - gap / 2 + TAU); ctx.stroke();
              ctx.strokeStyle = 'rgba(180,120,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w.x, w.y, w.R - 5, aim + gap / 2, aim - gap / 2 + TAU); ctx.stroke(); ctx.restore();
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
