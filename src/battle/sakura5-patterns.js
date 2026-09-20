// 도미조림·도현 탄막(BUILD271~272 사용자 브리핑 2026-09-20 “얼린홍어를 던지는것, 횃불을 던지는것, 마른 도현이가 위에서 살랑살랑 떨어지는것, 카톡같은거 텍스트로 파크가디언 그새끼보다 낫노 이런 텍스트 던지는 패턴 … 각각 체력 50씩”
//   + 2차 “전투패턴도 이상하다” → docs/battle/adding-enemies.md §3 고유성 규칙(동작 → 전용 실루엣 → 예고 → 회피법, 한 패턴에 회피 축 둘)으로 다시 설계)
//   도미조림 — 등의 얼린 홍어·횃불
//     skate_boomerang: [동작] 홍어를 꼬리 잡고 옆에서 던진다 [실루엣] 흰 마름모 홍어(서리 점) 회전 + 떨어져 나가는 서리 조각(작은 마름모) [예고] 상자 옆 홍어 실루엣 깜빡 + 소울 높이 가로 점선 0.45초
//                      [회피] ① 홍어 줄에서 위/아래로 비킨다 ② 홍어는 벽 앞에서 U턴해 되돌아오며 그때 소울 높이로 줄을 바꾼다(되돌아올 줄 가로 점선 0.35초) ③ 지나간 자리에서 서리 조각이 위·아래로 천천히(70px/s) 흩어진다 — 줄 사이로. 1.6초마다 좌우 번갈아
//     torch_pillars:   [동작] 횃불을 위 모서리에서 두 개 던진다 [실루엣] 흰 자루+주황 불꽃 횃불, 착지 자리에 불기둥(세로 띠)·불티 [예고] 바닥 착지 표식 둘(소울 x ±55, 다음엔 소울 x·±80) 0.45초
//                      [회피] ① 표식 사이/바깥으로 ② 착지하면 불기둥이 0.9초 서 있고(세로 zone 22px) 불티 4개가 위로 튀어 포물선으로 떨어진다 — 기둥 사이에서 불티를 본다. 1.35초마다
//   도현 — 마른 몸·카톡
//     dohyun_drift:    [동작] 마른 도현이 위에서 나뭇잎처럼 내려온다 [실루엣] 도현 전투 그림 흰 실루엣(44px) 둘이 반대 위상으로 ±26px 살랑살랑 [예고] 세로 점선 둘 0.35초
//                      [회피] ① 두 줄 사이·바깥 ② 바닥에 닿으면 옆으로 미끄러져(90px/s) 바닥 줄을 쓸고 사라진다 — 바닥에서 떨어져 있기. 0.9초마다
//     kakao_burst:     [동작] 카톡을 연달아 보낸다 [실루엣] 노란 카톡 말풍선 “파크가디언 그새끼보다 낫노”(사용자 원문만) [예고] 가로 점선 0.45초 → 왼쪽에서 한 줄(110px/s, 출렁) → 0.55초 뒤 다른 줄(≥64px 떨어진) 가로 점선 → 오른쪽에서 한 줄 → 둘 다 지나간 뒤 소울 x 세로 점선 0.45초 → 위에서 큰 풍선 낙하(200px/s)
//                      [회피] ① 첫 줄 피해 ② 두 번째 줄로 옮겨 서지 말고 그 사이/바깥 ③ 낙하 자리에서 옆으로 — 한 번에 하나씩 온다(사용자 “어떻게 피하라고” → 동시 두 줄+낙하 겹침 폐기). 2.1초마다
//   모든 예고 ≥ 0.35초. 피해는 적 def.damage 고정. 소리는 델타룬 소리 재사용(heavyswing 던짐·swing 되돌아옴·ember 횃불·sizzle 불기둥·wing 낙하·pop 착지·click 카톡·knock 낙하). whoosh 금지.
//   텍스트 원문은 KAKAO_TEXTS 에만 둔다(더 주면 추가). 상자 안 캐릭터 그림은 whiteSprite(흰/검 2톤).
import { whiteSprite } from './youngcle-patterns.js';

const TAU = Math.PI * 2;
export const SKATE = Object.freeze({ every: 1.6, first: 0.45, warn: 0.45, returnWarn: 0.35, speed: 180, turnAt: 0.82, wobble: 10, wobbleHz: 3.0, r: 9, w: 30, h: 16, spin: 3.0, shards: 3, shardSpeed: 70, shardR: 4, duration: 5.2 });
export const TORCH = Object.freeze({ every: 1.35, first: 0.4, warn: 0.45, lobVy: -260, lobG: 540, r: 7, spin: 7, pillarW: 22, pillarLife: 0.9, embers: 4, emberVy: -150, emberG: 300, emberR: 3, duration: 5.4 });
export const DOHYUN_FALL = Object.freeze({ every: 0.9, first: 0.35, warn: 0.35, vy: 56, sway: 26, swayHz: 1.4, tilt: 0.3, h: 44, slide: 90, duration: 5.6 });
export const KAKAO = Object.freeze({ every: 2.1, first: 0.4, warn: 0.45, secondAfter: 0.55, rowGap: 64, dropWarn: 0.45, dropAfter: 2.2, speed: 110, dropVy: 200, bob: 4, bobHz: 2.0, padX: 6, padY: 4, font: '11px Galmuri11, "Apple SD Gothic Neo", sans-serif', bigFont: '13px Galmuri11, "Apple SD Gothic Neo", sans-serif', duration: 5.4 });
export const KAKAO_TEXTS = Object.freeze(['파크가디언 그새끼보다 낫노']);   // 사용자 원문(2026-09-20). 다른 문구를 주면 여기에 더한다

let measureCtx = null;
const textWidth = (font, text) => {
  if (typeof document === 'undefined') return text.length * 11;
  measureCtx ||= document.createElement('canvas').getContext('2d');
  measureCtx.font = font; return Math.ceil(measureCtx.measureText(text).width);
};
const blink = (self, hz = 8) => Math.floor(self.age * hz) % 2 === 0;

/** 얼린 홍어: 납작한 마름모 몸통(흰) + 꼬리, 서리 점(검정) */
function drawSkate(ctx, x, y, rot, alpha = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-SKATE.w / 2, 0); ctx.lineTo(0, -SKATE.h / 2); ctx.lineTo(SKATE.w / 2, 0); ctx.lineTo(0, SKATE.h / 2); ctx.closePath(); ctx.fill();
  ctx.fillRect(SKATE.w / 2 - 2, -1, 14, 2);
  ctx.fillStyle = '#000'; ctx.fillRect(-6, -2, 2, 2); ctx.fillRect(2, 1, 2, 2); ctx.fillRect(-2, -5, 1, 1); ctx.fillRect(5, -3, 1, 1);
  ctx.restore();
}
function drawShard(ctx, self) {
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(0, -3); ctx.lineTo(4, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000'; ctx.fillRect(-1, -1, 1, 1); ctx.restore();
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
/** 불기둥: 바닥에서 위로 서는 세로 띠(주황·노랑 심), 마지막 0.25초 사그라듦 */
function drawPillar(ctx, self) {
  const life = Math.max(0, self.life - self.age), rise = Math.min(1, self.age / 0.12), fade = Math.min(1, life / 0.25), h = Math.round(self.h * rise), x = Math.round(self.x), bottom = Math.round(self.y + self.h);
  const flick = Math.floor(self.age * 16) % 2;
  ctx.save(); ctx.globalAlpha = 0.55 + 0.45 * fade;
  ctx.fillStyle = '#ff6a2b'; ctx.fillRect(x - self.w / 2, bottom - h, self.w, h);
  ctx.fillStyle = '#ffd24a'; ctx.fillRect(x - self.w / 4, bottom - h + 6, self.w / 2, Math.max(0, h - 10));
  ctx.fillStyle = '#ff9a3b'; ctx.fillRect(x - 3 - flick * 4, bottom - h - 5, 4, 5); ctx.fillRect(x + 2 + flick * 3, bottom - h - 3, 3, 3);
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
  if (self.tail === 'left') { ctx.moveTo(x + 2, y + 6); ctx.lineTo(x - 5, y + 10); ctx.lineTo(x + 2, y + 12); } else if (self.tail === 'right') { ctx.moveTo(x + w - 2, y + 6); ctx.lineTo(x + w + 5, y + 10); ctx.lineTo(x + w - 2, y + 12); } else { ctx.moveTo(x + w / 2 - 4, y); ctx.lineTo(x + w / 2, y - 6); ctx.lineTo(x + w / 2 + 4, y); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3c1e1e'; ctx.font = self.font || KAKAO.font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(self.text, x + KAKAO.padX, y + h / 2 + 1);
  ctx.restore();
}
const rectHit = (self, soul) => Math.abs(soul.x - self.x) <= self.w / 2 + soul.r - 3 && Math.abs(soul.y - self.y) <= self.h / 2 + soul.r - 3;
const hline = (api, y, life) => api.emit({ x: api.box.x, y, r: 0, harmless: true, life, shape: 'hline', len: api.box.w });
const vline = (api, x, life) => api.emit({ x, y: api.box.y, r: 0, harmless: true, life, shape: 'vline', len: api.box.h });

/** 도미조림: 얼린 홍어 부메랑 */
function skateBoomerang(o = {}) {
  const every = o.every ?? SKATE.every, duration = o.duration ?? SKATE.duration;
  let next = o.first ?? SKATE.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box, soul = api.soul;
    if (t >= next && t + SKATE.warn + 1.4 < duration) {
      next += every; const dir = n++ % 2 ? -1 : 1;
      const y = Math.max(b.y + 12, Math.min(b.y + b.h - 12, soul.y));
      hline(api, y, SKATE.warn);
      const sx = dir > 0 ? b.x - 18 : b.x + b.w + 18;
      api.emit({ x: sx, y, r: 0, harmless: true, life: SKATE.warn, shape: 'mark', drawShape(ctx, self) { if (blink(self, 10)) drawSkate(ctx, self.x, self.y, 0, 0.9); } });
      queue.push({ at: t + SKATE.warn, y, dir, sx });
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift(); api.sfx?.('heavyswing', { volume: 0.55 });
      const turnX = q.dir > 0 ? b.x + b.w * SKATE.turnAt : b.x + b.w * (1 - SKATE.turnAt);
      let shardT = 0;
      api.emit({ x: q.sx, y: q.y, r: SKATE.r, kind: 'white', shape: 'skate', vx: q.dir * SKATE.speed, spin: SKATE.spin * q.dir, life: 3.4, baseY: q.y, phase: 'out', targetY: q.y,
        steer(self, dt2) {
          const wob = Math.sin(self.age * SKATE.wobbleHz * TAU) * SKATE.wobble;
          if (self.phase === 'out' && ((q.dir > 0 && self.x >= turnX) || (q.dir < 0 && self.x <= turnX))) {
            self.phase = 'turn'; self.vx = 0; self.turnT = 0; self.targetY = Math.max(b.y + 12, Math.min(b.y + b.h - 12, soul.y));
            hline(api, self.targetY, SKATE.returnWarn);
          }
          if (self.phase === 'turn') { self.turnT += dt2; if (self.turnT >= SKATE.returnWarn) { self.phase = 'back'; self.vx = -q.dir * SKATE.speed; api.sfx?.('swing', { volume: 0.45 }); } }
          const goal = self.phase === 'out' ? q.y : self.targetY;
          self.baseY += (goal - self.baseY) * Math.min(1, dt2 * 9);
          self.y = self.baseY + wob;
          shardT += dt2;
          if (self.phase !== 'turn' && shardT > 0.42) { shardT = 0; api.emit({ x: self.x, y: self.y, r: SKATE.shardR, kind: 'white', shape: 'shard', vy: (api.rnd() < 0.5 ? -1 : 1) * SKATE.shardSpeed, vx: -self.vx * 0.1, spin: 4, life: 2.2, drawShape(ctx, s) { drawShard(ctx, s); } }); }
          if (self.phase === 'back' && ((q.dir > 0 && self.x < b.x - 30) || (q.dir < 0 && self.x > b.x + b.w + 30))) self.life = 0.01;
        },
        drawShape(ctx, self) { drawSkate(ctx, self.x, self.y, self.rot); } });
    }
  } };
}
/** 도미조림: 횃불 두 개 → 불기둥 */
function torchPillars(o = {}) {
  const every = o.every ?? TORCH.every, duration = o.duration ?? TORCH.duration;
  let next = o.first ?? TORCH.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box, soul = api.soul, floorY = b.y + b.h - 4;
    if (t >= next && t + TORCH.warn + 0.9 + TORCH.pillarLife < duration + 1.0) {
      next += every; const wide = n++ % 2 === 1;
      const clampX = x => Math.max(b.x + TORCH.pillarW, Math.min(b.x + b.w - TORCH.pillarW, x));
      const xs = wide ? [clampX(soul.x - 80), clampX(soul.x + 80)] : [clampX(soul.x - 55), clampX(soul.x + 55)];
      for (const tx of xs) api.emit({ x: tx, y: floorY, r: 0, harmless: true, life: TORCH.warn, shape: 'mark' });
      queue.push({ at: t + TORCH.warn, xs });
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift(); api.sfx?.('ember', { volume: 0.5 });
      q.xs.forEach((tx, i) => {
        const dir = i === 0 ? 1 : -1, x0 = dir > 0 ? b.x + 8 : b.x + b.w - 8, y0 = b.y - 12, vy = TORCH.lobVy, g = TORCH.lobG;
        const T = (-vy + Math.sqrt(vy * vy + 2 * g * (floorY - y0))) / g;
        api.emit({ x: x0, y: y0, r: TORCH.r, kind: 'orange', shape: 'torch', vx: (tx - x0) / T, vy, ay: g, spin: TORCH.spin * dir, life: T + 0.5,
          steer(self) {
            if (self.landed || self.y < floorY) return;
            self.landed = true; self.life = 0.01; api.sfx?.('sizzle', { volume: 0.45 });
            api.emit({ x: tx, y: b.y + 6, r: 0, kind: 'orange', shape: 'pillar', w: TORCH.pillarW, h: b.h - 8, life: TORCH.pillarLife,
              hitShape(s, soul2) { return s.age > 0.1 && Math.abs(soul2.x - s.x) <= s.w / 2 + soul2.r - 3 && soul2.y + soul2.r > s.y + s.h * (1 - Math.min(1, s.age / 0.12)); },
              drawShape(ctx, s) { drawPillar(ctx, s); } });
            for (let k = 0; k < TORCH.embers; k++) { const a = -Math.PI / 2 + (k - (TORCH.embers - 1) / 2) * 0.5; api.emit({ x: tx, y: floorY - 10, r: TORCH.emberR, kind: 'orange', shape: 'circle', vx: Math.cos(a) * 80, vy: Math.sin(a) * -TORCH.emberVy, ay: TORCH.emberG, life: 1.6 }); }
          },
          drawShape(ctx, self) { drawTorch(ctx, self); } });
      });
    }
  } };
}
/** 도현: 마른 도현이 나뭇잎처럼 내려와 바닥을 쓸고 간다 */
function dohyunDrift(o = {}) {
  const every = o.every ?? DOHYUN_FALL.every, duration = o.duration ?? DOHYUN_FALL.duration;
  let next = o.first ?? DOHYUN_FALL.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box;
    if (t >= next && t + DOHYUN_FALL.warn + 1.6 < duration) {
      next += every; n += 1;
      const x1 = b.x + 30 + api.rnd() * (b.w - 60), x2 = Math.max(b.x + 30, Math.min(b.x + b.w - 30, x1 + (x1 < b.x + b.w / 2 ? 1 : -1) * (60 + api.rnd() * 50)));
      vline(api, x1, DOHYUN_FALL.warn); vline(api, x2, DOHYUN_FALL.warn);
      queue.push({ at: t + DOHYUN_FALL.warn, xs: [x1, x2] });
    }
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift(); api.sfx?.('wing', { volume: 0.4 });
      const img = whiteSprite(api.images?.dohyun), h = DOHYUN_FALL.h, w = img ? Math.max(10, Math.round(img.width * h / img.height)) : 12;
      q.xs.forEach((x, i) => {
        const phase = i * Math.PI, floorY = b.y + b.h - h / 2 - 2;
        api.emit({ x, y: b.y - h / 2, r: 10, kind: 'white', shape: 'dohyun', vy: DOHYUN_FALL.vy, life: 6, baseX: x, w, h, landed: false,
          steer(self, dt2) {
            if (!self.landed) {
              const s = Math.sin(self.age * DOHYUN_FALL.swayHz * TAU + phase); self.x = self.baseX + s * DOHYUN_FALL.sway; self.rot = -s * DOHYUN_FALL.tilt;
              if (self.y >= floorY) { self.landed = true; self.y = floorY; self.vy = 0; self.vx = (self.x < b.x + b.w / 2 ? 1 : -1) * DOHYUN_FALL.slide; self.rot = self.vx > 0 ? 0.9 : -0.9; api.sfx?.('pop', { volume: 0.35 }); }
            } else if (self.x < b.x - 30 || self.x > b.x + b.w + 30) self.life = 0.01;
          },
          hitShape(self, soul) { const dx = (soul.x - self.x) / (self.w / 2 + soul.r - 2), dy = (soul.y - self.y) / (self.h / 2 + soul.r - 6); return dx * dx + dy * dy <= 1; },
          drawShape(ctx, self) {
            ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot); ctx.imageSmoothingEnabled = false;
            if (img) ctx.drawImage(img, -self.w / 2, -self.h / 2, self.w, self.h); else { ctx.fillStyle = '#fff'; ctx.fillRect(-4, -self.h / 2, 8, self.h); }
            ctx.restore();
          } });
      });
    }
  } };
}
/** 도현: 카톡 두 줄 + 큰 풍선 낙하 */
function kakaoBurst(o = {}) {
  const every = o.every ?? KAKAO.every, duration = o.duration ?? KAKAO.duration, texts = o.texts || KAKAO_TEXTS;
  let next = o.first ?? KAKAO.first, n = 0; const queue = [];
  return { duration, update(t, dt, api) {
    const b = api.box, soul = api.soul;
    if (t >= next && t + KAKAO.dropAfter + KAKAO.dropWarn + 0.9 < duration + 0.8) {
      next += every; const text = texts[n % texts.length]; n += 1;
      const w = textWidth(KAKAO.font, text) + KAKAO.padX * 2, h = 14 + KAKAO.padY * 2;
      const y1 = b.y + h / 2 + 8 + api.rnd() * (b.h - h - 16);
      let y2 = y1 + (api.rnd() < 0.5 ? -1 : 1) * (KAKAO.rowGap + api.rnd() * 30);
      if (y2 < b.y + h / 2 + 8 || y2 > b.y + b.h - h / 2 - 8) y2 = y1 - (y2 - y1);
      hline(api, y1, KAKAO.warn);
      queue.push({ at: t + KAKAO.warn, kind: 'row', text, w, h, y: y1, dir: 1 });
      queue.push({ at: t + KAKAO.secondAfter, kind: 'rowWarn', text, w, h, y: y2, dir: -1 });
      queue.push({ at: t + KAKAO.dropAfter, kind: 'dropWarn', text });
    }
    queue.sort((p, q) => p.at - q.at);
    while (queue.length && t >= queue[0].at) {
      const q = queue.shift();
      if (q.kind === 'rowWarn') { hline(api, q.y, KAKAO.warn); queue.push({ ...q, kind: 'row', at: t + KAKAO.warn }); queue.sort((p, r) => p.at - r.at); }
      else if (q.kind === 'row') {
        api.sfx?.('click', { volume: 0.5 });
        api.emit({ x: q.dir > 0 ? b.x - q.w / 2 - 8 : b.x + b.w + q.w / 2 + 8, y: q.y, r: 0, kind: 'white', shape: 'kakao', vx: q.dir * KAKAO.speed, life: (b.w + q.w + 20) / KAKAO.speed + 0.2, w: q.w, h: q.h, text: q.text, tail: q.dir > 0 ? 'left' : 'right', baseY: q.y,
          steer(self) { self.y = self.baseY + Math.sin(self.age * KAKAO.bobHz * TAU) * KAKAO.bob; }, hitShape: rectHit, drawShape(ctx, s) { drawKakao(ctx, s); } });
      } else if (q.kind === 'dropWarn') {
        const bw = textWidth(KAKAO.bigFont, q.text) + KAKAO.padX * 2, bh = 18 + KAKAO.padY * 2;
        const x = Math.max(b.x + bw / 2 + 4, Math.min(b.x + b.w - bw / 2 - 4, soul.x));
        vline(api, x, KAKAO.dropWarn);
        queue.push({ at: t + KAKAO.dropWarn, kind: 'drop', text: q.text, x, w: bw, h: bh });
      } else {
        api.sfx?.('knock', { volume: 0.5 });
        api.emit({ x: q.x, y: b.y - q.h, r: 0, kind: 'white', shape: 'kakao', vy: KAKAO.dropVy, life: (b.h + q.h * 2) / KAKAO.dropVy + 0.2, w: q.w, h: q.h, text: q.text, tail: 'top', font: KAKAO.bigFont, hitShape: rectHit, drawShape(ctx, s) { drawKakao(ctx, s); } });
      }
    }
  } };
}

export const SAKURA5_PATTERNS = { skate_boomerang: skateBoomerang, torch_pillars: torchPillars, dohyun_drift: dohyunDrift, kakao_burst: kakaoBurst };
