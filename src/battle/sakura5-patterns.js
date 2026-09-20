// 도미조림·도현 탄막(BUILD271 사용자 브리핑 2026-09-20 “얼린홍어를 던지는것, 횃불을 던지는것, 마른 도현이가 위에서 살랑살랑 떨어지는것, 카톡같은거 텍스트로 파크가디언 그새끼보다 낫노 이런 텍스트 던지는 패턴 … 각각 체력 50씩”)
//   도미조림 — 얼린 홍어·횃불
//     skate_throw: 가로 점선 예고 0.4초 → 얼린 홍어(납작한 마름모+꼬리, 흰 도트·서리 점)가 옆에서 날아와 위아래로 팔락이며 가로지른다(250px/s, 천천히 회전). 둘에 하나는 부메랑(멈췄다가 되돌아옴). 회피 = 다른 높이로. 1.3초마다 좌우 번갈아.
//     torch_throw: 소울 자리 착지 표식 0.4초 → 위 모서리에서 횃불이 포물선으로 날아와 바닥에 꽂히고 불(주황) 이 1.4초 남는다 + 불티 셋이 튄다. 회피 = 표식 자리에서 떨어지기. 1.1초마다.
//   도현 — 살랑살랑 낙하·카톡 텍스트
//     dohyun_fall: 세로 점선 예고 0.35초 → 마른 도현(전투 그림의 흰 실루엣, 44px)이 위에서 나뭇잎처럼 좌우로 살랑살랑(±26px) 기울며 천천히(58px/s) 떨어진다. 회피 = 옆으로. 0.85초마다.
//     kakao_text: 가로 점선 예고 0.4초 → 카톡 말풍선(노랑, “파크가디언 그새끼보다 낫노” 사용자 원문)이 옆에서 미끄러져 들어와 살짝 출렁이며 가로지른다. 셋에 하나는 위에서 떨어진다. 회피 = 위아래로.
//   모든 예고 ≥ 0.35초. 피해는 적 def.damage 고정. 텍스트 원문은 KAKAO_TEXTS 에만 둔다(더 주면 추가).
import { whiteSprite } from './youngcle-patterns.js';

const TAU = Math.PI * 2;
export const SKATE = Object.freeze({ every: 1.3, first: 0.45, warn: 0.4, speed: 250, wobble: 14, wobbleHz: 3.2, r: 9, w: 30, h: 16, spin: 2.4, boomerangEvery: 2, duration: 5.0 });
export const TORCH = Object.freeze({ every: 1.1, first: 0.4, warn: 0.4, lobVy: -250, lobG: 520, r: 7, spin: 7, fireLife: 1.4, fireR: 12, embers: 3, emberSpeed: 70, duration: 5.2 });
export const DOHYUN_FALL = Object.freeze({ every: 0.85, first: 0.35, warn: 0.35, vy: 58, sway: 26, swayHz: 1.5, tilt: 0.3, h: 44, r: 10, duration: 5.6 });
export const KAKAO = Object.freeze({ every: 1.0, first: 0.4, warn: 0.4, speed: 150, dropVy: 120, bob: 6, bobHz: 2.5, padX: 6, padY: 4, dropEvery: 3, font: '11px Galmuri11, "Apple SD Gothic Neo", sans-serif', duration: 5.2 });
export const KAKAO_TEXTS = Object.freeze(['파크가디언 그새끼보다 낫노']);   // 사용자 원문(2026-09-20). 다른 문구를 주면 여기에 더한다

let measureCtx = null;
const textWidth = (font, text) => {
  if (typeof document === 'undefined') return text.length * 11;
  measureCtx ||= document.createElement('canvas').getContext('2d');
  measureCtx.font = font; return Math.ceil(measureCtx.measureText(text).width);
};

/** 얼린 홍어: 납작한 마름모 몸통(흰) + 꼬리, 서리 점(검정) */
function drawSkate(ctx, self) {
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-SKATE.w / 2, 0); ctx.lineTo(0, -SKATE.h / 2); ctx.lineTo(SKATE.w / 2, 0); ctx.lineTo(0, SKATE.h / 2); ctx.closePath(); ctx.fill();
  ctx.fillRect(SKATE.w / 2 - 2, -1, 14, 2);
  ctx.fillStyle = '#000'; ctx.fillRect(-6, -2, 2, 2); ctx.fillRect(2, 1, 2, 2); ctx.fillRect(-2, -5, 1, 1); ctx.fillRect(5, -3, 1, 1);
  ctx.restore();
}
/** 횃불: 흰 자루 + 주황·노랑 불꽃(깜빡) */
function drawTorch(ctx, self) {
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot);
  ctx.fillStyle = '#fff'; ctx.fillRect(-2, -2, 4, 16);
  ctx.fillStyle = '#ff6a2b'; ctx.beginPath(); ctx.arc(0, -6, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(-1, -5, 3, 0, TAU); ctx.fill();
  const flick = Math.floor(self.age * 14) % 2; ctx.fillStyle = '#ff9a3b'; ctx.fillRect(-2, -14 - flick, 4, 4);
  ctx.restore();
}
/** 바닥의 불: 주황 덩어리 + 노랑 심, 마지막 0.3초 사그라듦 */
function drawFire(ctx, self) {
  const k = Math.max(0, Math.min(1, (self.life - self.age) / 0.3)), r = self.r * (0.7 + 0.3 * k), flick = Math.floor(self.age * 12) % 2;
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.globalAlpha = 0.5 + 0.5 * k;
  ctx.fillStyle = '#ff6a2b'; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.ellipse(-1, 1, r * 0.5, r * 0.3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff9a3b'; ctx.fillRect(-2 - flick * 3, -r - 4, 3, 4); ctx.fillRect(3 - flick * 2, -r - 2, 3, 3);
  ctx.restore();
}
/** 카톡 말풍선: 노랑 둥근 상자 + 흰 1px 테두리 + 꼬리, 진갈색 글씨 */
function drawKakao(ctx, self) {
  const x = Math.round(self.x - self.w / 2), y = Math.round(self.y - self.h / 2), w = Math.round(self.w), h = Math.round(self.h), r = 5;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  ctx.fillStyle = '#fae100'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#fae100'; ctx.beginPath();
  if (self.tail === 'left') { ctx.moveTo(x + 2, y + 6); ctx.lineTo(x - 5, y + 10); ctx.lineTo(x + 2, y + 12); } else { ctx.moveTo(x + w - 2, y + 6); ctx.lineTo(x + w + 5, y + 10); ctx.lineTo(x + w - 2, y + 12); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3c1e1e'; ctx.font = KAKAO.font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(self.text, x + KAKAO.padX, y + h / 2 + 1);
  ctx.restore();
}
const rectHit = (self, soul) => Math.abs(soul.x - self.x) <= self.w / 2 + soul.r - 3 && Math.abs(soul.y - self.y) <= self.h / 2 + soul.r - 3;

/** 도미조림: 얼린 홍어 던지기 */
function skateThrow(o = {}) {
  const every = o.every ?? SKATE.every, duration = o.duration ?? SKATE.duration;
  let next = o.first ?? SKATE.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box;
    if (t >= next && t + SKATE.warn + 0.8 < duration) {
      next += every; const dir = n % 2 ? -1 : 1, boomerang = n % SKATE.boomerangEvery === 1; n += 1;
      const y = b.y + 14 + api.rnd() * (b.h - 28);
      api.emit({ x: b.x, y, r: 0, harmless: true, life: SKATE.warn, shape: 'hline', len: b.w });
      queue.push({ at: t + SKATE.warn, y, dir, boomerang });
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift(); api.sfx?.('whoosh', { volume: 0.6 });
      const x0 = q.dir > 0 ? b.x - 20 : b.x + b.w + 20;
      api.emit({ x: x0, y: q.y, r: SKATE.r, kind: 'white', shape: 'skate', vx: q.dir * SKATE.speed, spin: SKATE.spin * q.dir, life: q.boomerang ? 2.6 : 1.8, baseY: q.y,
        steer(self, dt2) {
          self.y = self.baseY + Math.sin(self.age * SKATE.wobbleHz * TAU) * SKATE.wobble;
          if (q.boomerang) self.vx -= q.dir * SKATE.speed * 0.9 * dt2;
        },
        drawShape(ctx, self) { drawSkate(ctx, self); } });
    }
  } };
}
/** 도미조림: 횃불 던지기 → 바닥의 불 */
function torchThrow(o = {}) {
  const every = o.every ?? TORCH.every, duration = o.duration ?? TORCH.duration;
  let next = o.first ?? TORCH.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box, soul = api.soul, floorY = b.y + b.h - 6;
    if (t >= next && t + TORCH.warn + 1.0 + TORCH.fireLife < duration + 1.2) {
      next += every; const dir = n++ % 2 ? -1 : 1;
      const tx = Math.max(b.x + 12, Math.min(b.x + b.w - 12, soul.x));
      api.emit({ x: tx, y: floorY, r: 0, harmless: true, life: TORCH.warn, shape: 'mark' });
      queue.push({ at: t + TORCH.warn, tx, dir });
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift(); api.sfx?.('swing', { volume: 0.5 });
      const x0 = q.dir > 0 ? b.x + 10 : b.x + b.w - 10, y0 = b.y - 10, vy = TORCH.lobVy, g = TORCH.lobG;
      const T = (-vy + Math.sqrt(vy * vy + 2 * g * (floorY - y0))) / g;
      api.emit({ x: x0, y: y0, r: TORCH.r, kind: 'orange', shape: 'torch', vx: (q.tx - x0) / T, vy, ay: g, spin: TORCH.spin * q.dir, life: T + 0.5,
        steer(self) {
          if (self.landed || self.y < floorY) return;
          self.landed = true; self.life = 0.01; api.sfx?.('thud', { volume: 0.5 });
          api.emit({ x: q.tx, y: floorY - 4, r: TORCH.fireR, kind: 'orange', shape: 'fire', life: TORCH.fireLife, drawShape(ctx, s) { drawFire(ctx, s); } });
          for (let i = 0; i < TORCH.embers; i++) { const a = -Math.PI / 2 + (i - (TORCH.embers - 1) / 2) * 0.6; api.emit({ x: q.tx, y: floorY - 8, r: 3, kind: 'orange', shape: 'circle', vx: Math.cos(a) * TORCH.emberSpeed, vy: Math.sin(a) * TORCH.emberSpeed * 1.6, ay: 260, life: 0.8 }); }
        },
        drawShape(ctx, self) { drawTorch(ctx, self); } });
    }
  } };
}
/** 도현: 마른 도현이 위에서 살랑살랑 떨어진다 */
function dohyunFall(o = {}) {
  const every = o.every ?? DOHYUN_FALL.every, duration = o.duration ?? DOHYUN_FALL.duration;
  let next = o.first ?? DOHYUN_FALL.first; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box;
    if (t >= next && t + DOHYUN_FALL.warn + 1.2 < duration) {
      next += every; const x = b.x + 24 + api.rnd() * (b.w - 48);
      api.emit({ x, y: b.y, r: 0, harmless: true, life: DOHYUN_FALL.warn, shape: 'vline', len: b.h });
      queue.push({ at: t + DOHYUN_FALL.warn, x, phase: api.rnd() * TAU });
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift(); api.sfx?.('pop', { volume: 0.35 });
      const img = whiteSprite(api.images?.dohyun), h = DOHYUN_FALL.h, w = img ? Math.max(10, Math.round(img.width * h / img.height)) : 12;
      api.emit({ x: q.x, y: b.y - h / 2, r: DOHYUN_FALL.r, kind: 'white', shape: 'dohyun', vy: DOHYUN_FALL.vy, life: (b.h + h) / DOHYUN_FALL.vy + 0.3, baseX: q.x, w, h,
        steer(self) { const s = Math.sin(self.age * DOHYUN_FALL.swayHz * TAU + q.phase); self.x = self.baseX + s * DOHYUN_FALL.sway; self.rot = -s * DOHYUN_FALL.tilt; },
        hitShape(self, soul) { const dx = (soul.x - self.x) / (self.w / 2 + soul.r - 2), dy = (soul.y - self.y) / (self.h / 2 + soul.r - 6); return dx * dx + dy * dy <= 1; },
        drawShape(ctx, self) {
          ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot); ctx.imageSmoothingEnabled = false;
          if (img) ctx.drawImage(img, -self.w / 2, -self.h / 2, self.w, self.h); else { ctx.fillStyle = '#fff'; ctx.fillRect(-4, -self.h / 2, 8, self.h); }
          ctx.restore();
        } });
    }
  } };
}
/** 도현: 카톡 텍스트 던지기 */
function kakaoText(o = {}) {
  const every = o.every ?? KAKAO.every, duration = o.duration ?? KAKAO.duration, texts = o.texts || KAKAO_TEXTS;
  let next = o.first ?? KAKAO.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box, soul = api.soul;
    if (t >= next && t + KAKAO.warn + 0.8 < duration) {
      next += every; const text = texts[n % texts.length], drop = n % KAKAO.dropEvery === KAKAO.dropEvery - 1, dir = n % 2 ? -1 : 1; n += 1;
      const w = textWidth(KAKAO.font, text) + KAKAO.padX * 2, h = 14 + KAKAO.padY * 2;
      if (drop) {
        const x = Math.max(b.x + w / 2 + 4, Math.min(b.x + b.w - w / 2 - 4, soul.x));
        api.emit({ x, y: b.y, r: 0, harmless: true, life: KAKAO.warn, shape: 'vline', len: b.h });
        queue.push({ at: t + KAKAO.warn, text, w, h, drop: true, x });
      } else {
        const y = b.y + h / 2 + 6 + api.rnd() * (b.h - h - 12);
        api.emit({ x: b.x, y, r: 0, harmless: true, life: KAKAO.warn, shape: 'hline', len: b.w });
        queue.push({ at: t + KAKAO.warn, text, w, h, drop: false, y, dir });
      }
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift(); api.sfx?.('pop', { volume: 0.5 });
      if (q.drop) api.emit({ x: q.x, y: b.y - q.h, r: 0, kind: 'white', shape: 'kakao', vy: KAKAO.dropVy, life: (b.h + q.h * 2) / KAKAO.dropVy + 0.2, w: q.w, h: q.h, text: q.text, tail: 'left', hitShape: rectHit, drawShape(ctx, s) { drawKakao(ctx, s); } });
      else api.emit({ x: q.dir > 0 ? b.x - q.w / 2 - 8 : b.x + b.w + q.w / 2 + 8, y: q.y, r: 0, kind: 'white', shape: 'kakao', vx: q.dir * KAKAO.speed, life: (b.w + q.w + 20) / KAKAO.speed + 0.2, w: q.w, h: q.h, text: q.text, tail: q.dir > 0 ? 'left' : 'right', baseY: q.y,
        steer(self) { self.y = self.baseY + Math.sin(self.age * KAKAO.bobHz * TAU) * KAKAO.bob; }, hitShape: rectHit, drawShape(ctx, s) { drawKakao(ctx, s); } });
    }
  } };
}

export const SAKURA5_PATTERNS = { skate_throw: skateThrow, torch_throw: torchThrow, dohyun_fall: dohyunFall, kakao_text: kakaoText };
