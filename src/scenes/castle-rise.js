/**
 * BUILD359 뗏목 점프 뒤의 상승과 노을 도착(사용자 2026-09-26).
 * 곡 `save_the_world_rise` = 사용자 지정 LAn-JYzKm5M 의 42.7초(음이 바뀌는 지점)부터. 시간 T 는 그 곡의 재생 위치(없으면 자체 시계).
 *   T 0~1.6  뗏목이 벽을 타고 솟는다(실제 맵) → 화면 전체 상승 연출로 넘어간다
 *   T ~11    검은 성벽을 계속 오른다(요플래는 팔을 아래로 뻗고 위를 보며 오른쪽·앞·왼쪽·뒤로 돌며 좌우로 살짝 흔들린다)
 *   T 11~12.5 성벽 꼭대기를 지나 노을 바다·햇빛이 열린다 → 점점 슬로우모션
 *   T 15.3   (원곡 58초) 흰 번쩍임과 함께 노을 땅 맵으로
 *   T 21.2   (원곡 64초, 소리가 다시 커지는 지점) 앞덤블링으로 올라와 무릎 꿇고 착지 — 챱
 * 선 모양 효과는 쓰지 않는다(사용자 “선적인건 싫어”): 빛은 부드러운 덩어리·흐린 광선, 입자는 도트 덩어리.
 */
export const RISE = Object.freeze({
  bgm: 'save_the_world_rise',
  handoff: 1.4, castleEnd: 11, clear: 12.4, flash: 15.0, mapAt: 15.3, land: 21.2,
  riseSheet: 'assets/sprites/hyungsub-rise.png', landSheet: 'assets/sprites/hyungsub-land.png',
  backdrop: 'assets/backdrops/castle_sunset359.png', sun: 'assets/props/maillard_sun.png', sunCrop: Object.freeze([53, 53, 151, 150]),
  // 생성 배경의 수평선 높이(비율)
  horizon: 0.566,
  wall: 'assets/props/raft358_wall.png', wallPeriod: Object.freeze([20, 235]),
  // 상승 중 요플래 키(px) — 필드 캐릭터(52px)보다 조금 크게, 연출 화면이라
  riseH: 54, landH: 50,
  // 상승 중 카메라가 요플래 쪽으로 30% 다가간다
  zoom: 1.3,
  // 노을 땅 앞덤블링: 착지 전 몇 초·몇 바퀴(사용자 “극단적으로 빠르게, 착착 대면서 바로 착지”)
  tumble: 1.1, tumbleTurns: 4,
});

const W = 480, H = 360;
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = k => { const c = clamp01(k); return c * c * (3 - 2 * c); };
const lerp = (a, b, k) => a + (b - a) * k;

/** 곡 위치(초). 곡이 실제로 흐르면 그 위치에 맞춘다(마이야르 해돋이와 같은 방식). */
export function tickRiseClock(game, dt) {
  if (game.riseT == null) return null;
  game.riseT += dt;
  const s = game.sound, a = s?.bgm;
  if (s?.bgmName === RISE.bgm && a && !a.paused && a.currentTime > 0.05 && Math.abs(a.currentTime - game.riseT) > 0.08) game.riseT = a.currentTime;
  return game.riseT;
}

/** 시트의 한 칸(가로 4칸 띠, 칸마다 발 = 칸 아래 가운데). */
export function drawCell(ctx, img, index, x, y, height, { angle = 0, alpha = 1, pivotY = 1 } = {}) {
  if (!img) return;
  const cw = img.width / 4, ch = img.height, s = height / ch;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(Math.round(x), Math.round(y)); if (angle) ctx.rotate(angle);
  ctx.drawImage(img, index * cw, 0, cw, ch, Math.round(-cw * s / 2), Math.round(-ch * s * pivotY), Math.round(cw * s), Math.round(ch * s));
  ctx.restore();
}

/** 역광: 그림 모양 그대로 어둡게 + 해 쪽 가장자리에 따뜻한 빛 테두리(그린 뒤 덮는다). */
export class Backlight {
  constructor() { this.c = null; }
  canvas() {
    if (!this.c) { try { this.c = document.createElement('canvas'); this.c.width = W * 2; this.c.height = H * 2; } catch { this.c = null; } }
    return this.c;
  }
  /** paint(ctx) 로 그린 모양에 역광을 입혀 ctx 에 얹는다. sun = 화면 좌표(빛이 오는 쪽). */
  apply(ctx, paint, sun, strength = 1) {
    const c = this.canvas(); if (!c) return;
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    x.setTransform(2, 0, 0, 2, 0, 0); x.imageSmoothingEnabled = false;
    paint(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    // 따뜻한 테두리: 해 쪽으로 밀린 따뜻한 실루엣에서 몸 모양을 빼면 가장자리 띠만 남는다 → 그 위에 몸을 어둡게
    const dx = Math.sign(sun[0] - W / 2) || 0;
    const ring = this.ring || (this.ring = document.createElement('canvas'));
    ring.width = c.width; ring.height = c.height;
    const r = ring.getContext('2d');
    const warm = this.tinted(c, 'rgba(255,205,135,1)', 'rim');
    for (const [ox, oy] of [[dx * 2, -2], [dx * 2, 0], [0, -2], [dx, -1]]) r.drawImage(warm, ox, oy);
    r.globalCompositeOperation = 'destination-out'; r.drawImage(c, 0, 0); r.globalCompositeOperation = 'source-over';
    const dark = this.tinted(c, 'rgba(40,20,52,1)', 'dark');
    ctx.save();
    ctx.globalAlpha = 0.5 * strength; ctx.drawImage(dark, 0, 0, W, H);
    ctx.globalAlpha = 0.95 * strength; ctx.drawImage(ring, 0, 0, W, H);
    ctx.restore();
  }
  tinted(src, color, key) {
    this.t = this.t || {};
    let c = this.t[key];
    if (!c) { c = this.t[key] = document.createElement('canvas'); c.width = src.width; c.height = src.height; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, c.width, c.height);
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over';
    return c;
  }
}

/** 흐린 광선(저해상도로 그려 부드럽게 키운다) — 선이 아니라 빛 덩어리. */
export class SunRays {
  constructor() { this.c = null; }
  draw(ctx, cx, cy, time, strength, radius = 420) {
    if (strength <= 0.01) return;
    if (!this.c) { try { this.c = document.createElement('canvas'); this.c.width = 120; this.c.height = 90; } catch { return; } }
    const x = this.c.getContext('2d'), k = 120 / W;
    x.clearRect(0, 0, 120, 90);
    x.save(); x.translate(cx * k, cy * k);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI + (i + 0.5) * (Math.PI / n) + Math.sin(time * 0.23 + i * 1.7) * 0.07;
      const spread = 0.07 + 0.04 * Math.sin(time * 0.4 + i * 2.3);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, radius * k);
      const alpha = (0.34 + 0.2 * Math.sin(time * 0.7 + i)) * (i % 2 ? 0.7 : 1);
      g.addColorStop(0, `rgba(255,236,170,${alpha})`); g.addColorStop(0.45, `rgba(255,190,110,${alpha * 0.45})`); g.addColorStop(1, 'rgba(255,160,90,0)');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, radius * k, a - spread, a + spread); x.closePath(); x.fill();
    }
    x.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = strength; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.c, 0, 0, W, H);
    ctx.restore();
  }
}

/** 둥근 빛무리(가산). */
export function glow(ctx, x, y, r, color, alpha) {
  if (alpha <= 0.005) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', String(alpha))); g.addColorStop(1, color.replace('A', '0'));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

/** 노을 하늘·바다·산·섬(생성 배경) + 마이야르 태양 + 광선. horizonY 에 수평선이 오도록 폭 width 로 덮는다. */
export function drawSunsetSky(ctx, images, { horizonY, width, shiftX = 0, sunX, sunD, time, rays, rayStrength = 1 }) {
  const bg = images[RISE.backdrop];
  if (bg) {
    const s = width / bg.width, h = bg.height * s, top = horizonY - bg.height * RISE.horizon * s;
    ctx.drawImage(bg, Math.round((W - width) / 2 + shiftX), Math.round(top), Math.round(width), Math.round(h));
    if (top > 0) { ctx.fillStyle = '#3a2a5e'; ctx.fillRect(0, 0, W, Math.ceil(top)); }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, horizonY); g.addColorStop(0, '#3a2a5e'); g.addColorStop(1, '#ff9a45');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizonY); ctx.fillStyle = '#123a60'; ctx.fillRect(0, horizonY, W, H - horizonY);
  }
  // 해: 수평선에 반쯤 걸린 마이야르 태양(수평선 아래는 안 보임)
  const sun = images[RISE.sun], sy = horizonY - sunD * 0.18;
  glow(ctx, sunX, sy, sunD * 2.6, 'rgba(255,170,90,A)', 0.42);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, horizonY); ctx.clip();
  if (sun) ctx.drawImage(sun, ...RISE.sunCrop, Math.round(sunX - sunD / 2), Math.round(sy - sunD / 2), sunD, sunD);
  ctx.restore();
  glow(ctx, sunX, sy, sunD * 1.1, 'rgba(255,240,190,A)', 0.5);
  // 바다 위 햇빛 반사: 도트 덩어리(깜빡이며 흔들림)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const y = horizonY + 4 + i * 6, spread = 6 + i * 4;
    for (let j = 0; j < 3; j++) {
      const ph = Math.sin(time * 2.1 + i * 1.3 + j * 2.2), w = Math.max(2, Math.round((10 - i * 0.4) + ph * 4));
      ctx.globalAlpha = Math.max(0, 0.38 - i * 0.02) * (0.6 + 0.4 * ph);
      ctx.fillStyle = j === 1 ? '#fff0b8' : '#ffb870';
      ctx.fillRect(Math.round(sunX - w / 2 + (j - 1) * spread + ph * 3), y, w, 2);
    }
  }
  ctx.restore();
  rays?.draw(ctx, sunX, sy, time, rayStrength);
}

/** 떠다니는 빛 입자(부드러운 네모 덩어리 + 몇 개의 큰 흐린 빛방울). */
export class Motes {
  constructor(rnd = Math.random) { this.rnd = rnd; this.list = []; }
  update(dt, { rate, vy, warm }) {
    if (this.rnd() < rate * dt) this.list.push({ x: this.rnd() * W, y: vy > 0 ? -8 : H + 8, s: 1 + Math.floor(this.rnd() * 3), a: 0, life: 3 + this.rnd() * 4, t: 0, vx: (this.rnd() - 0.5) * 12, vy: vy * (0.6 + this.rnd() * 0.8), big: this.rnd() < 0.12, warm: warm && this.rnd() < 0.8, ph: this.rnd() * 6 });
    for (const m of this.list) { m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; }
    this.list = this.list.filter(m => m.t < m.life && m.y > -20 && m.y < H + 20);
  }
  draw(ctx, time) {
    for (const m of this.list) {
      const tw = 0.55 + 0.45 * Math.sin(time * 3 + m.ph), fade = Math.min(1, m.t * 2, (m.life - m.t) * 2);
      if (m.big) { glow(ctx, m.x, m.y, 10 + m.s * 3, m.warm ? 'rgba(255,210,140,A)' : 'rgba(150,190,255,A)', 0.22 * fade); continue; }
      ctx.globalAlpha = fade * tw; ctx.fillStyle = m.warm ? (m.s > 2 ? '#ffe3a6' : '#ffc27a') : (m.s > 2 ? '#bcd4ff' : '#7f9fe6');
      ctx.fillRect(Math.round(m.x), Math.round(m.y), m.s + 1, m.s + 1);
      if (m.s > 2) { ctx.globalAlpha *= 0.5; ctx.fillRect(Math.round(m.x) - 1, Math.round(m.y) + 1, m.s + 3, m.s - 1); }
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * 화면 전체 상승 연출(뗏목 맵 위에 덮는다). state = { d: 스크롤 누적, spin: 회전 위상, alpha, motes, rays, light }
 */
export function updateRise(state, T, dt) {
  // 스크롤 속도: 성벽 구간은 빠르게, 꼭대기를 지나며 확 트이고 점점 슬로우모션
  const v = T < RISE.castleEnd ? lerp(560, 420, clamp01((T - RISE.handoff) / (RISE.castleEnd - RISE.handoff)))
    : T < RISE.clear ? 420 : lerp(420, 18, smooth((T - RISE.clear) / (RISE.flash - RISE.clear)));
  state.d += v * dt;
  if (T >= RISE.castleEnd && state.dEnd == null) state.dEnd = state.d;
  // 도는 빠르기: 초당 방향 칸 수(오른쪽→앞→왼쪽→뒤)
  const spin = T < RISE.castleEnd ? 2.6 : lerp(2.6, 0.7, smooth((T - RISE.castleEnd) / (RISE.flash - RISE.castleEnd)));
  state.spin += spin * dt;
  state.alpha = clamp01((T - 0.5) / 0.8);
  state.v = v;
  state.motes.update(dt, { rate: T < RISE.castleEnd ? 30 : 18, vy: T < RISE.castleEnd ? v * 0.9 : Math.max(10, v * 0.5), warm: T >= RISE.castleEnd });
}

export function drawRise(ctx, state, T, images, time) {
  const x = 240 + Math.sin(T * 1.05) * 16, y = lerp(250, 206, smooth((T - RISE.handoff) / (RISE.flash - RISE.handoff))) + Math.sin(T * 2.2) * 2;
  const z = lerp(1, RISE.zoom, smooth((T - 0.5) / 2.4)), cy = y - RISE.riseH * 0.5;
  ctx.save();
  ctx.translate(x, cy); ctx.scale(z, z); ctx.translate(-x, -cy);
  ctx.save(); ctx.globalAlpha = state.alpha;
  const open = state.dEnd == null ? -1 : state.d - state.dEnd;   // 성벽 꼭대기가 화면 위에서 내려온 거리
  const seaK = smooth((T - RISE.castleEnd) / (RISE.clear - RISE.castleEnd));
  // 1) 하늘·바다(성벽 꼭대기 위로 보인다): 올라갈수록 수평선이 천천히 내려간다
  if (open > 0) {
    const horizonY = lerp(200, 262, smooth((T - RISE.castleEnd) / (RISE.flash - RISE.castleEnd)));
    drawSunsetSky(ctx, images, { horizonY, width: 760, sunX: 250, sunD: 84, time, rays: state.rays, rayStrength: 0.35 + 0.65 * seaK });
  } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  // 2) 성벽: 가운데 기둥(뗏목 맵과 같은 자리) + 멀리 좌우 탑(흐리게, 느리게)
  const wall = images[RISE.wall];
  if (wall) {
    const [p0, ph] = RISE.wallPeriod;
    const column = (x, width, speed, alpha) => {
      const s = width / wall.width, step = ph * s, top = open > 0 ? open * speed : -Infinity;
      ctx.save(); ctx.globalAlpha = state.alpha * alpha;
      ctx.beginPath(); ctx.rect(x, Math.max(0, top), width, H); ctx.clip();
      const off = (state.d * speed) % step;
      for (let y = off - step; y < H; y += step) ctx.drawImage(wall, 0, p0, wall.width, ph, Math.round(x), Math.round(y), Math.round(width), Math.ceil(step) + 1);
      ctx.restore();
      // 꼭대기 모서리: 햇빛이 닿아 따뜻하게(부드러운 빛 띠)
      if (open > 0 && top < H) {
        const g = ctx.createLinearGradient(0, top - 10, 0, top + 14);
        g.addColorStop(0, 'rgba(255,190,110,0)'); g.addColorStop(0.45, `rgba(255,200,130,${0.55 * alpha * state.alpha})`); g.addColorStop(1, 'rgba(255,170,90,0)');
        ctx.fillStyle = g; ctx.fillRect(x, top - 10, width, 24);
      }
    };
    column(-70, 150, 0.45, 0.28);
    column(400, 150, 0.45, 0.28);
    column(82, 316, 1, 1);
  }
  // 3) 빛: 성벽 구간은 차가운 푸른 빛, 트이면 따뜻한 빛이 화면을 한 번 가득 채운다
  const burst = smooth((T - RISE.castleEnd) / 0.9) * (1 - smooth((T - RISE.clear) / 1.8));
  glow(ctx, 240, 250, 240, 'rgba(255,200,130,A)', 0.55 * burst);
  if (seaK < 1) glow(ctx, 240, 200, 120, 'rgba(90,120,255,A)', 0.18 * (1 - seaK));
  state.motes.draw(ctx, time);
  ctx.restore();
  // 4) 요플래: 뛰는 순간부터(배경보다 먼저 보인다) 오른쪽 → 앞 → 왼쪽 → 뒤로 돌며 좌우로 살짝 흔들리고 천천히 화면 위쪽으로
  const img = images[RISE.riseSheet];
  const frame = Math.floor(state.spin) % 4;
  glow(ctx, x, y - RISE.riseH * 0.5, 46, seaK > 0.5 ? 'rgba(255,220,160,A)' : 'rgba(140,170,255,A)', 0.3);
  const paint = c => drawCell(c, img, frame, x, y, RISE.riseH);
  paint(ctx);
  if (seaK > 0) state.backlight.apply(ctx, paint, [250, 240], seaK * 0.9);
  ctx.restore();
}
