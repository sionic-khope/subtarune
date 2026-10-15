// 박용준 히든 보스(BUILD462 사용자 브리핑 2026-10-15 — 보라꽃을 먹고 샌즈 옷을 입은 용준) 탄막 여섯.
//   사용자 원문: “1. 박용준이 가운데에 있고 갈색 악취 같은것들을 화면에 빙글빙글 돌리면서 뿌림 2. 용준이가 생선을 먹고 켁켁하는 패턴. 켁켁할때마다 생선하고 침같은것들 뱉어지면서
//   그거 피해야함 3. 용준이가 그냥 굴르면서 그거 피해야하는 패턴 … 엄마 도망가서 우는 패턴, 냄새고아돼지 패턴, 이쁜 여자가 안아서 부르르 떨면서 전기방출하는패턴 … 난이도 어려워야함”
//   [동작 → 실루엣 → 예고 → 회피] (docs/battle/adding-enemies.md §3)
//     yongjun_stench: 상자 가운데 흰 용준이 빙글빙글 돌며 갈색 악취 구름을 세 갈래 나선으로 뿌린다(갈래는 왔다 갔다 방향을 바꾼다) → 커지는 동안(0.6초) 안 맞음
//                     → 갈래 사이 빈틈을 따라 돈다 + 2.3초마다 악취 고리(빈틈 하나, 빈틈 자리를 0.5초 먼저 밝힌다)는 빈틈으로 빠져나간다
//     yongjun_fish:   상자 밖 용준이 생선을 먹고(시트 0·1) 켁켁(2·3) — 켁마다 입에서 소울 쪽으로 생선 하나(점선 예고 0.45초) + 침 여섯 방울이 부채꼴로 튀어 포물선으로 떨어진다
//                     → 점선에서 비키고, 위에서 떨어지는 침 사이로
//     yongjun_roll:   몸을 만 흰 용준이 벽에서 벽으로 소울을 향해 굴러 온다(지나갈 띠를 0.5초 먼저 표시, 갈수록 빨라짐) → 띠 밖으로. 벽에 부딪힐 때마다 부스러기가 상자 안쪽으로 흩어진다
//     yongjun_cry:    상자 밖 용준이 엉엉 운다(cry 시트) — 흐느낄 때마다 눈물 한 줄이 위에서 떨어진다(빈 칸 두 개, 떨어질 칸 표시 0.5초) → 빈 칸으로. 바닥에 닿은 눈물은 튀어 오른다 → 바닥에 붙지 않기
//     yongjun_insults: “냄새”·“고아”·“돼지”(일행이 놀린 말, 컷신 원문)가 가장자리에서 소울 쪽으로 날아온다(글자가 깜빡이고 점선 0.45초) → 맞은편 벽에서 두 글자로 쪼개져 되튄다
//     yongjun_hug:    예쁜 여자가 용준을 안은 흰 그림이 가운데에서 부르르 떨다가 번개 여섯 줄을 뿜는다(번개 줄 점선 0.5초) → 줄 사이로. 번개 줄은 매번 반 칸씩 돌아가 방금 안전하던 자리가 다음 줄이 된다
//                     + 방전마다 불똥 셋이 상자 안을 튕겨 다닌다
//   상자 안 캐릭터 그림은 whiteSprite(흰/검 2톤). 시트 칸은 투명 여백을 잘라 쓴다. 시간 진행은 전부 t 기준(주사율 무관, patterns-refresh-rate.test).
import { whiteSprite } from './youngcle-patterns.js';

const TAU = Math.PI * 2;
export const YONGJUN_SHEETS = Object.freeze({ idle: [2, 2], cough: [2, 2], cry: [2, 2], roll: [1, 1], hug: [1, 1], fish: [1, 1] });
export const STENCH = Object.freeze({ duration: 7.0, grow: 0.6, h: 54, bodyR: 15, arms: 3, emitEvery: 0.12, speed: 76, spin: 1.25, flipEvery: 2.6, puffR: 6, ringFirst: 1.7, ringEvery: 2.3, ringN: 16, ringGap: 4, ringSpeed: 66, ringWarn: 0.5, ringShift: 0.9, stopAt: 6.2 });
export const FISH = Object.freeze({ duration: 7.4, first: 0.35, every: 1.55, eat: 0.5, warn: 0.45, pairGap: 0.42, speed: 250, w: 30, h: 14, spit: 6, spitSpread: 0.85, spitSpeed: [100, 165], spitG: 230, spitR: 3.5, mouth: [-18, -54], endBy: 6.3 });
export const ROLL = Object.freeze({ duration: 7.2, first: 0.35, dashes: 7, warn: 0.5, speed: [210, 310], r: 17, size: 40, spin: 13, rest: 0.12, minLen: 70, debris: 5, debrisSpeed: 92, debrisR: 3.5 });
export const CRY = Object.freeze({ duration: 7.4, first: 0.5, every: 0.92, warn: 0.5, cols: 11, gap: 2, vy: 160, dropR: 7, splashVx: 64, splashVy: -118, splashG: 280, splashR: 3, endBy: 6.2, fps: 5 });
export const INSULT = Object.freeze({ duration: 7.2, first: 0.4, every: 0.72, warn: 0.45, speed: 225, shardSpeed: 120, shardTurn: 0.62, shardLife: 1.5, font: 'bold 20px Galmuri11, "Apple SD Gothic Neo", sans-serif', h: 20, endBy: 6.2 });
export const INSULT_WORDS = Object.freeze(['냄새', '고아', '돼지']);
export const HUG = Object.freeze({ duration: 7.4, appear: 0.7, h: 66, threshold: 0.22, bodyR: 21, first: 1.15, every: 1.15, warn: 0.5, zap: 0.32, rays: 6, rayW: 10, sparks: 3, sparkSpeed: 115, sparkR: 4, sparkLife: 2.2, endBy: 6.4 });

const blink = (self, hz = 8) => Math.floor(self.age * hz) % 2 === 0;
/** 계속 움직일 탄(몸·공): 엔진의 emit 은 Bullet 을 돌려준다. 돌려주지 않는 검사용 api 면 설정 객체를 대신 붙잡는다 */
const keep = (api, o) => { const made = api.emit(o); return made && typeof made === 'object' ? made : o; };
/** 상자 안 위협: 상자를 벗어나면 지우고, 상자 테두리 안쪽에서 잘라 그린다(일행·HP 띠 위로 새어 나가지 않게) */
const inside = (b, draw) => ({
  out(board) { const m = (this.r || 6) + 2; return (this.life && this.age >= this.life) || this.x < board.x - m || this.x > board.x + board.w + m || this.y < board.y - m || this.y > board.y + board.h + m; },
  drawShape(ctx, self) { ctx.save(); ctx.beginPath(); ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.clip(); draw(ctx, self); ctx.restore(); },
});
/** 가운데에 몸이 서는 패턴: 하트가 몸 자리(가운데)에 있으면 상자 아래쪽 가운데로 옮겨 둔다(시작하자마자 겹쳐 맞지 않게) */
function clearCenter(api, cx, cy, radius) {
  const soul = api.soul; if (!soul) return;
  if (Math.hypot(soul.x - cx, soul.y - cy) < radius + (soul.r || 6) + 12) { soul.x = cx; soul.y = api.box.y + api.box.h - 18; }
}
/** 상자 밖(입)에서 날아드는 생선·침: 상자 아래나 왼쪽으로 빠지면 지운다 */
function passedBox(board) { return (this.life && this.age >= this.life) || this.y > board.y + board.h + (this.r || 6) + 4 || this.x < board.x - 24; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let measureCtx = null;
const textWidth = (font, text) => {
  if (typeof document === 'undefined') return text.length * 20;
  try { measureCtx ||= document.createElement('canvas').getContext('2d'); measureCtx.font = font; return Math.ceil(measureCtx.measureText(text).width) || text.length * 20; } catch { return text.length * 20; }
};

/** 시트의 한 칸을 투명 여백을 잘라 캔버스로(그림마다 한 번). 문서가 없거나 그림이 없으면 null */
const CELLS = new WeakMap();
export function sheetCell(img, key, index = 0) {
  if (!img || !img.width || typeof document === 'undefined') return null;
  let list = CELLS.get(img); if (!list) { list = []; CELLS.set(img, list); }
  if (list[index] !== undefined) return list[index];
  const [cols, rows] = YONGJUN_SHEETS[key] || [1, 1], fw = Math.floor(img.width / cols), fh = Math.floor(img.height / rows);
  let out = null;
  try {
    const cell = document.createElement('canvas'); cell.width = fw; cell.height = fh;
    const g = cell.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(img, (index % cols) * fw, Math.floor(index / cols) * fh, fw, fh, 0, 0, fw, fh);
    out = cell;
    const data = g.getImageData(0, 0, fw, fh).data;
    let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (data[(y * fw + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 >= x0 && y1 >= y0 && (x1 - x0 + 1 < fw || y1 - y0 + 1 < fh)) {
      const trim = document.createElement('canvas'); trim.width = x1 - x0 + 1; trim.height = y1 - y0 + 1;
      const t = trim.getContext('2d'); t.imageSmoothingEnabled = false; t.drawImage(cell, x0, y0, trim.width, trim.height, 0, 0, trim.width, trim.height);
      out = trim;
    }
  } catch { /* 검사용 가짜 캔버스: 자르지 않은 칸 */ }
  list[index] = out;
  return out;
}
/** 흰 실루엣을 (x, y) 가운데에 높이 h 로. 그림이 없으면 흰 타원 */
function drawWhite(ctx, img, x, y, h, { rot = 0, alpha = 1, scale = 1, threshold } = {}) {
  const sil = whiteSprite(img, threshold);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = false;
  const hh = Math.max(1, h * scale);
  if (sil && sil.height) { const w = Math.round(sil.width * hh / sil.height); ctx.drawImage(sil, -Math.round(w / 2), -Math.round(hh / 2), w, Math.round(hh)); }
  else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, hh * 0.36), Math.max(1, hh / 2), 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}
/** 점선(예고): a → b, 깜빡임 */
function dottedLine(ctx, self, x0, y0, x1, y1, color = '#ffb347') {
  if (!blink(self, 10)) return;
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 8);
  ctx.fillStyle = color;
  for (let k = 0; k <= n; k++) { const u = n ? k / n : 0; ctx.fillRect(Math.round(x0 + (x1 - x0) * u) - 1, Math.round(y0 + (y1 - y0) * u) - 1, 3, 3); }
}
/** 점 (px, py) 에서 선분 a-b 까지 거리 */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, u = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * u), py - (ay + dy * u));
}
/** 상자 안쪽(여백 inset)에서 p 로부터 방향 d 로 가다 처음 닿는 벽까지의 거리 */
function wallDistance(b, inset, px, py, dx, dy) {
  const minX = b.x + inset, maxX = b.x + b.w - inset, minY = b.y + inset, maxY = b.y + b.h - inset;
  const tx = dx > 1e-6 ? (maxX - px) / dx : dx < -1e-6 ? (minX - px) / dx : Infinity;
  const ty = dy > 1e-6 ? (maxY - py) / dy : dy < -1e-6 ? (minY - py) / dy : Infinity;
  return Math.max(0, Math.min(tx, ty));
}

// ── 그림 ──
/** 갈색 악취 구름: 진갈색 테두리 + 갈색 몸 + 연한 점, 꼬불한 냄새 줄 */
function drawPuff(ctx, self) {
  const x = Math.round(self.x), y = Math.round(self.y), r = self.r;
  ctx.fillStyle = '#3e2412'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#8a5a2b'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#b07a3e'; ctx.fillRect(x - 2, y - 3, 2, 2); ctx.fillRect(x + 1, y, 2, 2);
  const w = Math.floor(self.age * 6 + self.seed) % 2;
  ctx.fillStyle = '#6b4320'; ctx.fillRect(x - 3 + w, y - r - 4, 2, 2); ctx.fillRect(x - 1 - w, y - r - 6, 2, 2);
}
/** 흰 생선(그림이 없으면 마름모 몸 + 꼬리) — 진행 방향으로 돌린다 */
function drawFish(ctx, self, img) {
  const sil = whiteSprite(img);
  ctx.save(); ctx.translate(Math.round(self.x), Math.round(self.y)); ctx.rotate(self.rot); ctx.imageSmoothingEnabled = false;
  if (sil && sil.width) { const w = FISH.w, h = Math.round(sil.height * w / sil.width); ctx.drawImage(sil, -w / 2, -h / 2, w, h); }
  else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-FISH.w / 2, 0); ctx.lineTo(-2, -FISH.h / 2); ctx.lineTo(FISH.w / 2 - 6, 0); ctx.lineTo(-2, FISH.h / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(FISH.w / 2 - 8, 0); ctx.lineTo(FISH.w / 2, -6); ctx.lineTo(FISH.w / 2, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(-FISH.w / 2 + 4, -2, 2, 2);
  }
  ctx.restore();
}
/** 침: 흰 물방울 + 파란 기 도는 반짝 */
function drawSpit(ctx, self) {
  const x = Math.round(self.x), y = Math.round(self.y), r = self.r;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x - 1, y - 1, 1, 1);
}
/** 눈물: 위가 뾰족한 흰 물방울 + 연파랑 안쪽 */
function drawTear(ctx, self, alpha = 1) {
  const x = Math.round(self.x), y = Math.round(self.y), r = self.r;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y + 2, r, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - r + 1, y + 1); ctx.lineTo(x, y - r - 4); ctx.lineTo(x + r - 1, y + 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9fd8ff'; ctx.fillRect(x - 2, y + 1, 3, 3);
  ctx.restore();
}
/** 흰 글자 + 검은 테두리 */
function drawWord(ctx, self, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(self.x), Math.round(self.y)); if (self.rot) ctx.rotate(self.rot);
  ctx.font = INSULT.font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(self.text, 0, 1); ctx.fillStyle = '#fff'; ctx.fillText(self.text, 0, 1);
  ctx.restore();
}
/** 번개: 가운데에서 바깥으로 지그재그(0.05초마다 모양이 바뀐다) */
function drawBolt(ctx, self) {
  const n = 9, seed = Math.floor(self.age * 20) + self.seed;
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n, jitter = k === 0 || k === n ? 0 : (((seed * 31 + k * 17) % 11) / 10 - 0.5) * 12;
    pts.push([self.x0 + (self.x1 - self.x0) * u - Math.sin(self.angle) * jitter, self.y0 + (self.y1 - self.y0) * u + Math.cos(self.angle) * jitter]);
  }
  ctx.save(); ctx.lineCap = 'square';
  for (const [color, width] of [['#ffe95c', 6], ['#fffbd0', 3], ['#fff', 1]]) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y))));
    ctx.stroke();
  }
  ctx.restore();
}
function drawSpark(ctx, self) {
  const x = Math.round(self.x), y = Math.round(self.y), f = Math.floor(self.age * 12) % 2;
  ctx.fillStyle = '#ffe95c'; ctx.fillRect(x - 4, y - 1, 9, 3); ctx.fillRect(x - 1, y - 4, 3, 9);
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 1 + f, y - 1, 2, 2);
}

// ── 패턴 ──
/** 1. 가운데 용준이 빙글빙글 돌며 갈색 악취를 세 갈래 나선 + 빈틈 하나 있는 고리로 */
function stench(o = {}) {
  const C = { ...STENCH, ...o };
  let body = null, nextEmit = C.grow, nextRing = C.ringFirst, ringN = 0, seed = 0;
  const rings = [];
  const angleAt = (t) => {
    const u = Math.max(0, t - C.grow), k = Math.floor(u / C.flipEvery), r = u - k * C.flipEvery;
    return C.spin * (k % 2 === 0 ? r : C.flipEvery - r);
  };
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!body) {
      api.present?.({ hidden: true });
      clearCenter(api, cx, cy, C.bodyR);
      api.sfx?.('wing', { volume: 0.4 });
      body = keep(api, { x: cx, y: cy, r: C.bodyR, kind: 'white', shape: 'yongjun_body', life: C.duration + 0.05,
        out() { return this.age >= this.life; },
        hitShape(self, soul) { return self.age >= C.grow && Math.hypot(soul.x - self.x, soul.y - self.y) <= C.bodyR + soul.r - 3; },
        drawShape(ctx, self) {
          const grow = clamp(self.age / C.grow, 0, 1), frame = Math.floor(self.age * 4) % 4;
          drawWhite(ctx, sheetCell(api.images?.idle, 'idle', frame) || api.images?.idle, self.x, self.y, C.h, { rot: self.rot, scale: 0.25 + 0.75 * grow, alpha: 0.4 + 0.6 * grow });
        } });
    }
    if (body) body.rot = angleAt(t) * 2;
    while (nextEmit <= t && nextEmit < C.stopAt) {
      const a0 = angleAt(nextEmit);
      for (let i = 0; i < C.arms; i++) {
        const a = a0 + i * TAU / C.arms, ux = Math.cos(a), uy = Math.sin(a);
        api.emit({ x: cx + ux * C.bodyR, y: cy + uy * C.bodyR, r: C.puffR, kind: 'white', shape: 'stench', vx: ux * C.speed, vy: uy * C.speed, life: 3.2, seed: seed++, ...inside(b, drawPuff) });
      }
      nextEmit += C.emitEvery;
    }
    while (nextRing <= t && nextRing + C.ringWarn < C.stopAt) {
      const soulAngle = Math.atan2(api.soul.y - cy, api.soul.x - cx), gapAngle = soulAngle + (ringN++ % 2 ? -1 : 1) * C.ringShift;
      api.emit({ x: cx, y: cy, r: 0, harmless: true, life: C.ringWarn, shape: 'gap_warn',
        drawShape(ctx, self) {
          if (!blink(self, 8)) return;
          const half = (C.ringGap / C.ringN) * Math.PI, reach = Math.max(b.w, b.h);
          ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
          ctx.fillStyle = 'rgba(120,255,160,0.18)'; ctx.beginPath(); ctx.moveTo(self.x, self.y); ctx.arc(self.x, self.y, reach, gapAngle - half, gapAngle + half); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#7cff9a'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(self.x, self.y); ctx.lineTo(self.x + Math.cos(gapAngle - half) * reach, self.y + Math.sin(gapAngle - half) * reach);
          ctx.moveTo(self.x, self.y); ctx.lineTo(self.x + Math.cos(gapAngle + half) * reach, self.y + Math.sin(gapAngle + half) * reach); ctx.stroke();
          ctx.restore();
        } });
      rings.push({ at: nextRing + C.ringWarn, gapAngle });
      nextRing += C.ringEvery;
    }
    while (rings.length && rings[0].at <= t) {
      const ring = rings.shift(); api.sfx?.('wing', { volume: 0.45 });
      const step = TAU / C.ringN, gapIndex = Math.round(ring.gapAngle / step);
      for (let i = 0; i < C.ringN; i++) {
        const offset = ((i - gapIndex) % C.ringN + C.ringN) % C.ringN;
        if (offset < C.ringGap / 2 || offset > C.ringN - C.ringGap / 2 - 0.01) continue;
        const a = i * step, ux = Math.cos(a), uy = Math.sin(a);
        api.emit({ x: cx + ux * C.bodyR, y: cy + uy * C.bodyR, r: C.puffR + 1, kind: 'white', shape: 'stench', vx: ux * C.ringSpeed, vy: uy * C.ringSpeed, life: 3.4, seed: seed++, ...inside(b, drawPuff) });
      }
    }
  } };
}

/** 2. 상자 밖 용준이 생선을 먹고 켁켁: 켁마다 생선(점선 예고) + 침 부채꼴 */
function fishCough(o = {}) {
  const C = { ...FISH, ...o };
  let nextCycle = C.first;
  const events = [];
  const mouth = (api) => { const s = api.actor?.scale ?? 1; return [(api.actor?.x ?? api.box.x + api.box.w + 40) + C.mouth[0] * s, (api.actor?.y ?? api.box.y) + C.mouth[1] * s]; };
  return { duration: C.duration, update(t, dt, api) {
    while (nextCycle <= t && nextCycle + C.eat + C.pairGap + C.warn < C.endBy) {
      const c = nextCycle;
      events.push({ at: c, kind: 'pose', frame: 0 }, { at: c + C.eat * 0.5, kind: 'pose', frame: 1 });
      events.push({ at: c + C.eat, kind: 'warn' }, { at: c + C.eat + C.pairGap, kind: 'warn' });
      nextCycle += C.every;
    }
    events.sort((p, q) => p.at - q.at);
    while (events.length && events[0].at <= t) {
      const e = events.shift();
      if (e.kind === 'pose') { api.present?.({ sheet: 'cough', frame: e.frame }); continue; }
      if (e.kind === 'warn') {
        const [mx, my] = mouth(api), tx = clamp(api.soul.x, api.box.x + 8, api.box.x + api.box.w - 8), ty = clamp(api.soul.y, api.box.y + 8, api.box.y + api.box.h - 8);
        const a = Math.atan2(ty - my, tx - mx), reach = Math.hypot(tx - mx, ty - my) + 260;
        api.emit({ x: mx, y: my, r: 0, harmless: true, life: C.warn, shape: 'aim', free: true,
          drawShape(ctx, self) { dottedLine(ctx, self, mx, my, mx + Math.cos(a) * reach, my + Math.sin(a) * reach); } });
        events.push({ at: e.at + C.warn, kind: 'cough', a, mx, my, frame: events.some(q => q.kind === 'cough') ? 3 : 2 });
        events.sort((p, q) => p.at - q.at);
        continue;
      }
      api.present?.({ sheet: 'cough', frame: e.frame });
      api.sfx?.('ralsei_splat', { volume: 0.55 });
      const ux = Math.cos(e.a), uy = Math.sin(e.a);
      api.emit({ x: e.mx, y: e.my, r: 6, kind: 'white', shape: 'fish', vx: ux * C.speed, vy: uy * C.speed, rot: e.a + Math.PI, free: true, life: 2.4, out: passedBox,
        hitShape(self, soul) { const hx = Math.cos(self.rot) * 10, hy = Math.sin(self.rot) * 10; return segDist(soul.x, soul.y, self.x - hx, self.y - hy, self.x + hx, self.y + hy) <= 5 + soul.r - 2; },
        drawShape(ctx, self) { drawFish(ctx, self, sheetCell(api.images?.fish, 'fish', 0) || api.images?.fish); } });
      for (let k = 0; k < C.spit; k++) {
        const spread = (k / (C.spit - 1) - 0.5) * 2 * C.spitSpread, speed = C.spitSpeed[0] + (C.spitSpeed[1] - C.spitSpeed[0]) * ((k * 37) % C.spit) / Math.max(1, C.spit - 1);
        api.emit({ x: e.mx, y: e.my, r: C.spitR, kind: 'white', shape: 'spit', vx: Math.cos(e.a + spread) * speed, vy: Math.sin(e.a + spread) * speed, ay: C.spitG, free: true, life: 2.2, out: passedBox, drawShape: drawSpit });
      }
    }
  } };
}

/** 3. 몸을 만 용준이 벽에서 벽으로 소울을 향해 구른다(지나갈 띠 예고) + 벽 부스러기 */
function roll(o = {}) {
  const C = { ...ROLL, ...o };
  let ball = null, seg = null, dash = 0, nextAt = C.first;
  const begin = (t, api) => {
    const b = api.box, inset = C.r + 3;
    const from = seg ? [seg.x1, seg.y1] : [b.x - C.r - 6, clamp(api.soul.y, b.y + inset, b.y + b.h - inset)];
    let dx = api.soul.x - from[0], dy = api.soul.y - from[1], len = Math.hypot(dx, dy);
    if (len < 1) { dx = b.x + b.w / 2 - from[0]; dy = b.y + b.h / 2 - from[1]; len = Math.hypot(dx, dy) || 1; }
    dx /= len; dy /= len;
    let dist = wallDistance(b, inset, from[0], from[1], dx, dy);
    if (dist < C.minLen) { dx = b.x + b.w / 2 - from[0]; dy = b.y + b.h / 2 - from[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; dist = wallDistance(b, inset, from[0], from[1], dx, dy); }
    const speed = C.speed[0] + (C.speed[1] - C.speed[0]) * Math.min(1, dash / Math.max(1, C.dashes - 1));
    seg = { x0: from[0], y0: from[1], x1: from[0] + dx * dist, y1: from[1] + dy * dist, dx, dy, len: dist, go: t + C.warn, speed, hit: false };
    const s = seg;
    api.emit({ x: s.x0, y: s.y0, r: 0, harmless: true, life: C.warn, shape: 'band', free: true,
      drawShape(ctx, self) {
        if (!blink(self, 10)) return;
        const nx = -s.dy * C.r, ny = s.dx * C.r;
        dottedLine(ctx, { age: 0 }, s.x0 + nx, s.y0 + ny, s.x1 + nx, s.y1 + ny, '#ff6b6b');
        dottedLine(ctx, { age: 0 }, s.x0 - nx, s.y0 - ny, s.x1 - nx, s.y1 - ny, '#ff6b6b');
      } });
  };
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box;
    if (!ball) {
      api.present?.({ hidden: true });
      ball = keep(api, { x: b.x - C.r - 6, y: b.y + b.h / 2, r: C.r, kind: 'white', shape: 'yongjun_roll', free: true, life: C.duration + 0.05,
        out() { return this.age >= this.life; },
        hitShape(self, soul) { return !self.parked && Math.hypot(soul.x - self.x, soul.y - self.y) <= C.r + soul.r - 3; },
        drawShape(ctx, self) { drawWhite(ctx, sheetCell(api.images?.roll, 'roll', 0) || api.images?.roll, self.x, self.y, C.size, { rot: self.rot }); } });
      ball.parked = true;
    }
    if (!seg && t >= nextAt) { begin(t, api); ball.x = seg.x0; ball.y = seg.y0; }
    if (!seg) return;
    if (t >= seg.go && !seg.hit) {
      if (!seg.started) { seg.started = true; api.sfx?.('heavyswing', { volume: 0.5 }); }
      ball.parked = false;
      const d = Math.min(seg.len, (t - seg.go) * seg.speed);
      ball.x = seg.x0 + seg.dx * d; ball.y = seg.y0 + seg.dy * d; ball.rot = (ball.rot || 0) + C.spin * dt * (seg.dx >= 0 ? 1 : -1);
      if (d >= seg.len) {
        seg.hit = true; dash++; api.sfx?.('impact', { volume: 0.5 });
        const back = Math.atan2(-seg.dy, -seg.dx);
        for (let k = 0; k < C.debris; k++) {
          const a = back + (k / (C.debris - 1) - 0.5) * 2.2;
          api.emit({ x: seg.x1, y: seg.y1, r: C.debrisR, kind: 'white', shape: 'crumb', vx: Math.cos(a) * C.debrisSpeed, vy: Math.sin(a) * C.debrisSpeed, life: 1.6, ...inside(b, drawSpit) });
        }
        nextAt = t + C.rest;
      }
    }
    if (seg.hit && t >= nextAt) {
      if (dash < C.dashes && t + C.warn + 0.6 < C.duration) { begin(t, api); ball.parked = true; }
      else { ball.parked = true; ball.life = Math.min(ball.life, ball.age + 0.01); }
    }
  } };
}

/** 4. 엄마가 도망가서 우는 용준: 흐느낄 때마다 눈물 한 줄(빈 칸 둘) + 바닥에서 튀는 눈물 */
function cry(o = {}) {
  const C = { ...CRY, ...o };
  let next = C.first, lastGap = -1, row = 0;
  const rows = [];
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box, spacing = b.w / C.cols, floorY = b.y + b.h - C.dropR - 2;
    api.present?.({ sheet: 'cry', frame: Math.floor(t * C.fps) % 4 });
    while (next <= t && next + C.warn + 0.4 < C.endBy) {
      let gap;
      do { gap = Math.floor(api.rnd() * (C.cols - C.gap + 1)); } while (lastGap >= 0 && Math.abs(gap - lastGap) < 3 && (row++ < 50));
      lastGap = gap;
      const cols = [...Array(C.cols).keys()].filter(i => i < gap || i >= gap + C.gap);
      for (const i of cols) api.emit({ x: b.x + spacing * (i + 0.5), y: b.y + 8, r: C.dropR - 2, harmless: true, life: C.warn, shape: 'tear_mark', drawShape(ctx, self) { if (blink(self, 9)) drawTear(ctx, self, 0.55); } });
      rows.push({ at: next + C.warn, cols });
      next += C.every;
    }
    while (rows.length && rows[0].at <= t) {
      const r = rows.shift(); api.sfx?.('pop', { volume: 0.4 });
      r.cols.forEach((i, n) => {
        api.emit({ x: b.x + spacing * (i + 0.5), y: b.y - C.dropR, r: C.dropR, kind: 'white', shape: 'tear', vy: C.vy, life: 2.0, splash: n % 2 === 0,
          steer(self) {
            if (self.y < floorY || self.done) return;
            self.done = true; self.life = Math.min(self.life, self.age + 0.01);
            if (!self.splash) return;
            for (const side of [-1, 1]) api.emit({ x: self.x, y: floorY, r: C.splashR, kind: 'white', shape: 'splash', vx: side * C.splashVx, vy: C.splashVy, ay: C.splashG, life: 0.95, ...inside(b, drawSpit) });
          },
          ...inside(b, (ctx, self) => drawTear(ctx, self)) });
      });
    }
  } };
}

/** 5. “냄새”·“고아”·“돼지”가 가장자리에서 소울 쪽으로 → 맞은편 벽에서 두 글자로 쪼개져 되튄다 */
function insults(o = {}) {
  const C = { ...INSULT, ...o }, words = o.words || INSULT_WORDS;
  let next = C.first, n = 0;
  const throws = [];
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box;
    while (next <= t && next + C.warn + 0.6 < C.endBy) {
      const text = words[n % words.length], edge = n % 3; n++;
      const w = textWidth(C.font, text), along = 0.2 + api.rnd() * 0.6;
      const start = edge === 0 ? [b.x - w / 2 - 6, b.y + b.h * along] : edge === 1 ? [b.x + b.w * along, b.y - C.h / 2 - 6] : [b.x + b.w + w / 2 + 6, b.y + b.h * along];
      let dx = api.soul.x - start[0], dy = api.soul.y - start[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const inside = [clamp(start[0], b.x + 2, b.x + b.w - 2), clamp(start[1], b.y + 2, b.y + b.h - 2)];
      const dist = wallDistance(b, 6, inside[0] + dx * 4, inside[1] + dy * 4, dx, dy) + Math.hypot(inside[0] - start[0], inside[1] - start[1]) + 4;
      const end = [start[0] + dx * dist, start[1] + dy * dist];
      api.emit({ x: start[0], y: start[1], r: 0, harmless: true, life: C.warn, shape: 'word_warn', text, free: true,
        drawShape(ctx, self) { dottedLine(ctx, self, start[0], start[1], end[0], end[1]); if (blink(self, 7)) drawWord(ctx, self, 0.8); } });
      throws.push({ at: next + C.warn, text, w, start, end, dx, dy, dist });
      next += C.every;
    }
    while (throws.length && throws[0].at <= t) {
      const q = throws.shift(); api.sfx?.('heavyswing', { volume: 0.45 });
      api.emit({ x: q.start[0], y: q.start[1], r: 0, kind: 'white', shape: 'word', text: q.text, vx: q.dx * C.speed, vy: q.dy * C.speed, free: true, life: q.dist / C.speed + 0.02,
        hitShape(self, soul) { return Math.abs(soul.x - self.x) <= q.w / 2 + soul.r - 3 && Math.abs(soul.y - self.y) <= C.h / 2 + soul.r - 4; },
        steer(self) {
          if (self.split || self.age < q.dist / C.speed - 0.01) return;
          self.split = true; api.sfx?.('break1', { volume: 0.4 });
          const back = Math.atan2(-q.dy, -q.dx);
          [...q.text].forEach((ch, i) => {
            const a = back + (i ? 1 : -1) * C.shardTurn;
            api.emit({ x: q.end[0], y: q.end[1], r: 0, kind: 'white', shape: 'word', text: ch, vx: Math.cos(a) * C.shardSpeed, vy: Math.sin(a) * C.shardSpeed, spin: (i ? 1 : -1) * 3, life: C.shardLife,
              hitShape(s, soul) { return Math.abs(soul.x - s.x) <= C.h / 2 + soul.r - 3 && Math.abs(soul.y - s.y) <= C.h / 2 + soul.r - 4; },
              ...inside(b, (ctx, s) => drawWord(ctx, s)) });
          });
        },
        drawShape(ctx, self) { ctx.save(); ctx.beginPath(); ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4); ctx.clip(); drawWord(ctx, self); ctx.restore(); } });
    }
  } };
}

/** 6. 예쁜 여자가 안은 용준이 부르르 떨다가 번개 여섯 줄(반 칸씩 돌아간다) + 튕기는 불똥 */
function hugShock(o = {}) {
  const C = { ...HUG, ...o };
  let body = null, next = C.first, k = 0;
  const zaps = [];
  return { duration: C.duration, update(t, dt, api) {
    const b = api.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!body) {
      api.present?.({ hidden: true });
      clearCenter(api, cx, cy, C.bodyR);
      body = keep(api, { x: cx, y: cy, r: C.bodyR, kind: 'white', shape: 'yongjun_hug', life: C.duration + 0.05, charge: 0,
        out() { return this.age >= this.life; },
        hitShape(self, soul) { return self.age >= C.appear && Math.hypot(soul.x - self.x, soul.y - self.y) <= C.bodyR + soul.r - 3; },
        drawShape(ctx, self) {
          const amp = 1 + self.charge * 3, jx = Math.sin(self.age * 70) * amp, jy = Math.cos(self.age * 55) * amp * 0.5;
          drawWhite(ctx, sheetCell(api.images?.hug, 'hug', 0) || api.images?.hug, cx + jx, cy + jy, C.h, { alpha: clamp(self.age / C.appear, 0, 1), threshold: C.threshold });
        } });
    }
    body.charge = 0;
    while (next <= t && next + C.warn + C.zap < C.endBy) {
      const base = (k++ % 2) * (Math.PI / C.rays) + Math.PI / 2;
      const rays = [...Array(C.rays).keys()].map(i => base + i * TAU / C.rays);
      const reach = Math.hypot(b.w, b.h);
      api.emit({ x: cx, y: cy, r: 0, harmless: true, life: C.warn, shape: 'ray_warn',
        drawShape(ctx, self) {
          ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip();
          for (const a of rays) dottedLine(ctx, self, cx + Math.cos(a) * C.bodyR, cy + Math.sin(a) * C.bodyR, cx + Math.cos(a) * reach, cy + Math.sin(a) * reach, '#ffe95c');
          ctx.restore();
        } });
      zaps.push({ at: next + C.warn, warnFrom: next, rays });
      next += C.every;
    }
    const pending = zaps[0];
    if (pending && t >= pending.warnFrom) body.charge = clamp((t - pending.warnFrom) / C.warn, 0, 1);
    while (zaps.length && zaps[0].at <= t) {
      const z = zaps.shift(); api.sfx?.('static_burst', { volume: 0.5 });
      for (const a of z.rays) {
        const ux = Math.cos(a), uy = Math.sin(a), len = wallDistance(b, 0, cx, cy, ux, uy);
        api.emit({ x: cx, y: cy, r: 0, kind: 'white', shape: 'bolt', life: C.zap, angle: a, seed: Math.round(a * 100),
          x0: cx + ux * C.bodyR, y0: cy + uy * C.bodyR, x1: cx + ux * len, y1: cy + uy * len,
          hitShape(self, soul) { return segDist(soul.x, soul.y, self.x0, self.y0, self.x1, self.y1) <= C.rayW / 2 + soul.r - 2; },
          drawShape(ctx, self) { ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.clip(); drawBolt(ctx, self); ctx.restore(); } });
      }
      for (let s = 0; s < C.sparks; s++) {
        const a = z.rays[s * 2 % z.rays.length] + Math.PI / C.rays;
        api.emit({ x: cx + Math.cos(a) * (C.bodyR + 6), y: cy + Math.sin(a) * (C.bodyR + 6), r: C.sparkR, kind: 'white', shape: 'spark', vx: Math.cos(a) * C.sparkSpeed, vy: Math.sin(a) * C.sparkSpeed, bounce: true, life: C.sparkLife, ...inside(b, drawSpark) });
      }
    }
  } };
}

export const YONGJUN_PATTERNS = { yongjun_stench: stench, yongjun_fish: fishCough, yongjun_roll: roll, yongjun_cry: cry, yongjun_insults: insults, yongjun_hug: hugShock };
