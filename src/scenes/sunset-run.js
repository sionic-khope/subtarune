import { GJ_RUNNER as C } from '../data/gajaeman-runner.js';
import { createRunner, stepRunner, RUNNER } from '../world/runner-core.js';
import { drawRunnerFrame, drawRunnerAura } from '../world/runner-render.js';
import { CHAR_SCALE } from '../world/world.js';
import { RISE, drawSunsetSky, SunRays, Backlight, glow } from './castle-rise.js';

/**
 * BUILD363 노을 땅 달리기 화면 — 필드 연출(흰 화면 준비 동작·달리기·가재맨 등장·오오라)과 전투 모드(gajaeman_runner)가
 * **같은 객체**를 이어 쓴다(전투로 넘어가도 달리던 자세·배경·가재맨 자리가 그대로). 화면 좌표.
 */
const W = 480, H = 360;
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = k => { const c = clamp01(k); return c * c * (3 - 2 * c); };
const lerp = (a, b, k) => a + (b - a) * k;

export class SunsetRun {
  constructor(game, { rnd = Math.random } = {}) {
    this.game = game; this.rnd = rnd;
    this.core = createRunner({ x: 0, endX: Infinity });
    this.time = 0; this.started = false;
    this.white = 1; this.whiteT = 0; this.reveal = 0; this.revealing = false;
    this.boss = { x: C.boss.from[0], y: C.boss.from[1], visible: false, alpha: 1, lie: 0, aura: 1, face: 'left', shake: 0 };
    this.particles = []; this.puffs = []; this.slashFx = []; this.flash = 0; this.flashColor = '255,255,255';
    this.rays = new SunRays(); this.backlight = new Backlight();
    this.ground = null; this.onEvent = null;
    // 결전 마무리용: 요플래 x 덮어쓰기·자세 그림(clash 시트 칸)·달리기 멈춤·흰 그림자 화면·거대 검기·검은 연기
    this.pxOverride = null; this.frozen = false; this.pose = null; this.poseFlip = false; this.jolt = 0;
    this.shade = 0; this.slashK = -1; this.smoke = []; this.alpha = 1;
  }
  sfx(name, volume = 0.8) { this.game.sound?.sfx(C.sfx[name] || name, { volume }); }
  /** 준비 동작을 시작한다(흰 화면 속). 대시 순간 onDash() — 곡과 화면 걷힘이 여기서 시작. */
  begin(onDash) { this.started = true; this.onDash = onDash; }
  get x() { return this.pxOverride ?? C.stage.playerX; }
  get groundY() { return C.stage.groundY; }
  update(dt, keys = {}) {
    this.time += dt;
    if (this.started && !this.frozen) {
      const events = stepRunner(this.core, dt, keys);
      for (const ev of events) {
        if (['draw', 'dash', 'jump', 'slash', 'airslash'].includes(ev)) this.sfx(ev, ev === 'draw' ? 0.8 : 0.7);
        if (ev === 'dash') { this.revealing = true; this.onDash?.(); }
        if (ev === 'slash' || ev === 'airslash') this.slashFx.push({ kind: ev, up: !!this.core.attack?.up, t: 0, dur: ev === 'slash' ? 0.26 : RUNNER.airSlashTime });
        if (ev === 'step') for (let i = 0; i < 3; i++) this.puffs.push({ x: this.x - 4, y: this.groundY - 2, vx: -60 - this.rnd() * 80, vy: -10 - this.rnd() * 20, t: 0, life: 0.45, s: 2 + (i % 2) });
      }
    }
    if (this.revealing) this.reveal = Math.min(1, this.reveal + dt / C.white.reveal);
    this.white = 1 - smooth(this.reveal);
    for (const f of this.slashFx) f.t += dt;
    this.slashFx = this.slashFx.filter(f => f.t < f.dur);
    for (const p of this.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g ?? 160) * dt; p.vx *= p.drag ?? 1; }
    this.particles = this.particles.filter(p => p.t < p.life);
    for (const p of this.puffs) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.puffs = this.puffs.filter(p => p.t < p.life);
    this.flash = Math.max(0, this.flash - dt);
    this.boss.shake = Math.max(0, this.boss.shake - dt);
    this.jolt = Math.max(0, this.jolt - dt);
    for (const p of this.smoke) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= p.drag ?? 1; p.vy *= p.drag ?? 1; p.r += (p.grow ?? 0) * dt; }
    this.smoke = this.smoke.filter(p => p.t < p.life);
  }
  /** 무지개·보라 입자 폭발(쳐냄·폭발 공용) */
  burst(x, y, n, { rainbow = true, purple = true, speed = 150, life = 0.7 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + this.rnd() * 0.3, v = speed * (0.5 + this.rnd());
      const color = rainbow && (!purple || i % 3) ? C.rainbow[i % C.rainbow.length] : (i % 2 ? '#a851ff' : '#e8b4ff');
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: life * (0.7 + this.rnd() * 0.5), s: 2 + (i % 3), color, g: 60, drag: 0.985 });
    }
  }
  travel() { return this.core.x; }
  groundCanvas() {
    if (this.ground) return this.ground;
    const w = 960, top = C.stage.groundTop, edge = C.stage.edgeY, h = H - top;
    try { this.ground = document.createElement('canvas'); this.ground.width = w; this.ground.height = h; } catch { return null; }
    const x = this.ground.getContext('2d');
    let seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    x.fillStyle = '#060408'; x.fillRect(0, 0, w, edge - top);
    const sheen = x.createLinearGradient(0, 0, 0, 40); sheen.addColorStop(0, 'rgba(120,60,70,0.28)'); sheen.addColorStop(1, 'rgba(40,20,40,0)');
    x.fillStyle = sheen; x.fillRect(0, 0, w, 40);
    for (let i = 0; i < w * 0.9; i++) { x.fillStyle = r() < 0.5 ? '#0e0b16' : '#140f1c'; x.fillRect(Math.floor(r() * w / 2) * 2, Math.floor(r() * (edge - top) / 2) * 2, 2 + (r() < 0.3 ? 2 : 0), 2); }
    x.fillStyle = '#1a1222'; x.fillRect(0, edge - top, w, 12);
    const rim = x.createLinearGradient(0, edge - top - 2, 0, edge - top + 6); rim.addColorStop(0, 'rgba(255,170,110,0)'); rim.addColorStop(0.4, 'rgba(255,170,110,0.35)'); rim.addColorStop(1, 'rgba(255,170,110,0)');
    x.fillStyle = rim; x.fillRect(0, edge - top - 2, w, 8);
    for (let i = 0; i < w / 6; i++) { x.fillStyle = r() < 0.5 ? '#2a1c30' : '#0f0a14'; x.fillRect(Math.floor(r() * w / 2) * 2, edge - top + 2 + Math.floor(r() * 4) * 2, 4, 2); }
    x.fillStyle = '#040206'; x.fillRect(0, edge - top + 12, w, h - (edge - top + 12));
    for (let i = 0; i < w * 0.25; i++) { x.fillStyle = r() < 0.5 ? '#0d0812' : '#120b18'; x.fillRect(Math.floor(r() * w / 2) * 2, edge - top + 14 + Math.floor(r() * (h - edge + top - 14) / 2) * 2, 2 + (r() < 0.2 ? 4 : 0), 2); }
    return this.ground;
  }
  // ── 그리기 ────────────────────────────────────────────────
  drawBackground(ctx) {
    const images = this.game.propImages || {};
    drawSunsetSky(ctx, images, { horizonY: C.stage.horizonY, width: 640, shiftX: -Math.sin(this.time * 0.05) * 6, sunX: C.stage.sunX, sunD: 64, time: this.time, rays: this.rays, rayStrength: 0.75 });
    const gc = this.groundCanvas();
    if (gc) {
      const off = ((this.travel() % gc.width) + gc.width) % gc.width;
      ctx.drawImage(gc, -Math.round(off), C.stage.groundTop); ctx.drawImage(gc, gc.width - Math.round(off), C.stage.groundTop);
    }
    // 달리는 느낌: 발밑에서 뒤로 흩어지는 흙먼지 덩어리
    for (const p of this.puffs) { ctx.globalAlpha = (1 - p.t / p.life) * 0.7; ctx.fillStyle = '#3a2a3a'; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    ctx.globalAlpha = 1;
  }
  bossSprite() {
    const e = this.game.entities?.find(x => x.id === 'sunset_gajaeman');
    return e?.sprite || null;
  }
  /** 가재맨: 떠 있을 땐 왼쪽을 보고, 돌진(lie=1)할 땐 몸을 가로로 눕혀 얼굴은 앞(화면)을 본다 */
  drawBoss(ctx, paintOnly = false) {
    const b = this.boss; if (!b.visible) return;
    const sp = this.bossSprite(); if (!sp) return;
    const facing = b.lie > 0.5 ? 'down' : b.face;
    const img = sp[facing]?.[0]; if (!img) return;
    const s = CHAR_SCALE * C.boss.scale / sp.px, dw = Math.round(sp.fw * s), dh = Math.round(sp.fh * s);
    const stutter = b.jitter ? (Math.floor(this.time * 24) % 5 < 2 ? (Math.floor(this.time * 97) % 3 - 1) * 3 : 0) : 0;
    const jx = (b.shake > 0 ? Math.round(Math.sin(this.time * 70) * 3) : 0) + stutter;
    const y = b.y + (b.lie > 0.5 || b.jitter ? 0 : Math.sin(this.time * 2.4) * C.boss.bob) + (b.jitter && Math.floor(this.time * 31) % 4 === 0 ? 2 : 0);
    if (!paintOnly && b.aura > 0) {
      glow(ctx, b.x, y, 70 + 40 * b.aura, 'rgba(168,81,255,A)', 0.35 * Math.min(1.5, b.aura));
      for (let i = 0; i < 10; i++) {
        const age = (this.time * 0.8 + i / 10) % 1, a = i * 2.4 + this.time;
        const x = b.x + Math.cos(a) * (26 + 10 * b.aura), yy = y + Math.sin(a) * 30 - age * 40;
        ctx.globalAlpha = Math.sin(Math.PI * age) * 0.7; ctx.fillStyle = i % 3 ? '#08040f' : '#5a2a90';
        const r = 4 + Math.round(age * 4) * 2; ctx.fillRect(Math.round(x - r / 2), Math.round(yy - r / 2), r, r);
      }
      ctx.globalAlpha = 1;
    }
    const fly = this.game.propImages?.[C.flySheet];
    if (fly && b.lie > 0.5) {
      const cw = fly.width / 4, fs = C.flyH / fly.height, f = (b.aura > 2 ? 2 : 0) + Math.floor(this.time * 8) % 2;
      const blit = (x, yy, a) => { ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(fly, f * cw, 0, cw, fly.height, Math.round(x - cw * fs / 2), Math.round(yy - fly.height * fs / 2), Math.round(cw * fs), Math.round(fly.height * fs)); ctx.restore(); };
      if (!paintOnly) (b.trail || []).forEach((t, i) => blit(t.x, t.y, 0.32 * (1 - i / 5) * b.alpha));
      blit(b.x + jx, y, b.alpha);
      return;
    }
    if (!paintOnly && b.lie > 0.5) (b.trail || []).forEach((t, i) => { ctx.save(); ctx.globalAlpha *= 0.3 * (1 - i / 5); ctx.translate(Math.round(t.x), Math.round(t.y)); ctx.rotate(-Math.PI / 2 * b.lie); ctx.drawImage(img, -Math.round(dw / 2), -Math.round(dh / 2), dw, dh); ctx.restore(); });
    ctx.save(); ctx.globalAlpha *= b.alpha;
    ctx.translate(Math.round(b.x + jx), Math.round(y));
    if (b.lie > 0) ctx.rotate(-Math.PI / 2 * b.lie);
    ctx.drawImage(img, -Math.round(dw / 2), -Math.round(dh / 2), dw, dh);
    ctx.restore();
  }
  frameOf(anim, index) {
    const sheet = this.game.characterMotions?.hyungsub?.[`runner_${anim}`];
    return sheet?.frames?.length ? { frame: sheet.frames[Math.min(index, sheet.frames.length - 1)], scale: sheet.scale * CHAR_SCALE * C.stage.scale } : null;
  }
  poseImage() { return this.game.propImages?.[C.lock.pose] || null; }
  paintPlayer(ctx, { trail = true, alpha = 1 } = {}) {
    const r = this.core, px = this.x, gy = this.groundY;
    const img = this.pose != null ? this.poseImage() : null;
    if (img) {
      const cw = img.width / 4, h = img.height * 0.37 * 1.0, jx = this.jolt > 0 ? Math.round(Math.sin(this.time * 90) * 2) : 0;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(Math.round(px + jx), Math.round(gy)); if (this.poseFlip) ctx.scale(-1, 1);
      const s = h / img.height; ctx.drawImage(img, this.pose * cw, 0, cw, img.height, Math.round(-cw * s / 2), Math.round(-img.height * s), Math.round(cw * s), Math.round(img.height * s));
      ctx.restore(); return;
    }
    ctx.save();
    if (trail) for (const [i, t] of r.trail.entries()) {
      const fr = this.frameOf(t.anim, t.frame); if (!fr) continue;
      ctx.globalAlpha = 0.14 * (i + 1) / r.trail.length * alpha;
      drawRunnerFrame(ctx, fr.frame.image, fr.frame, fr.scale, px + (t.x - r.x) * C.stage.scale, gy - t.airY * C.stage.scale, t.angle, r.dir);
    }
    ctx.globalAlpha = alpha;
    const fr = this.frameOf(r.anim, r.frame);
    if (fr) drawRunnerFrame(ctx, fr.frame.image, fr.frame, fr.scale, px, gy - r.airY * C.stage.scale, r.tilt, r.dir);
    ctx.restore();
  }
  drawPlayer(ctx, { blink = false } = {}) {
    if (blink) return;
    this.paintPlayer(ctx);
    const r = this.core, px = this.x, gy = this.groundY - r.airY * C.stage.scale, k = C.stage.scale;
    ctx.save(); ctx.translate(px, gy); ctx.scale(k * 1.15, k * 1.15); ctx.translate(-px, -gy);
    for (const f of this.slashFx) {
      const t = f.t / f.dur;
      if (f.kind === 'slash') { const from = f.up ? Math.PI * 0.55 : -Math.PI * 0.55; drawRunnerAura(ctx, px + 24, gy - 24, 40, from, from + (f.up ? -1 : 1) * Math.PI * 1.1 * Math.min(1, t * 1.6), 1 - t * t); }
      else drawRunnerAura(ctx, px + 18, gy - 26, 44, -Math.PI * 0.95, -Math.PI * 0.95 + Math.PI * 1.25 * Math.min(1, t * 1.5), 1 - t * t);
    }
    ctx.restore();
  }
  /** 역광(해가 뒤): 인물과 가재맨을 어둡게, 해 쪽 가장자리만 따뜻하게 */
  drawBacklight(ctx) {
    if (this.white > 0.02) return;
    this.backlight.apply(ctx, c => { this.drawBoss(c, true); this.paintPlayer(c, { trail: false }); }, [C.stage.sunX, C.stage.horizonY], 0.9);
  }
  drawParticles(ctx) {
    for (const p of this.particles) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    ctx.globalAlpha = 1;
    if (this.flash > 0) { ctx.fillStyle = `rgba(${this.flashColor},${Math.min(0.85, this.flash * 3)})`; ctx.fillRect(0, 0, W, H); }
  }
  /** 흰 화면(요플래 그림자 잔상만) → 위에서 아래로·아래에서 위로 걷히며 무지개 레터박스 선 */
  drawOverlay(ctx) {
    if (this.white > 0.001) {
      const k = smooth(this.reveal), top = lerp(0, H / 2, k), bottom = lerp(H, H / 2, k);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, Math.round(top), W, Math.max(0, Math.round(bottom - top)));
      if (this.reveal < 1) {
        // 그림자 잔상: 흰 바탕 위 요플래 실루엣(준비 동작)과 옅은 잔상 둘
        ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, bottom - top); ctx.clip();
        this.backlight.apply(ctx, c => { for (const [dx, a] of [[-14, 0.35], [-7, 0.6], [0, 1]]) { c.save(); c.globalAlpha = a; c.translate(dx, 0); this.paintPlayer(c, { trail: false }); c.restore(); } }, [W, 0], 0);
        const dark = this.backlight.tinted(this.backlight.c, 'rgba(58,44,70,1)', 'shadow');
        ctx.drawImage(dark, 0, 0, W, H);
        ctx.restore();
        // 걷히는 가장자리: 무지개 빛
        for (const y of [top, bottom]) this.rainbowBand(ctx, y, 6, 0.8);
      }
    }
    if (this.reveal > 0) {
      const a = smooth(this.reveal);
      this.rainbowLine(ctx, lerp(H / 2, 12, a), a);
      this.rainbowLine(ctx, lerp(H / 2, 320, a), a);
    }
  }
  /** 흰 화면에 그림자만(요플래·가재맨) + 슬로우로 화면을 가르는 거대 검기 그림자 */
  drawShade(ctx) {
    if (this.shade <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = this.shade; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    this.backlight.apply(ctx, c => { this.drawBoss(c, true); this.paintPlayer(c, { trail: false }); }, [W, 0], 0);
    const dark = this.backlight.tinted(this.backlight.c, 'rgba(34,24,44,1)', 'shade');
    ctx.globalAlpha = this.shade; ctx.drawImage(dark, 0, 0, W, H);
    if (this.slashK >= 0 && this.slashK <= 1) {
      // 거대 검기: 화면을 대각선으로 가르는 초승달 그림자(슬로우)
      const k = this.slashK, a0 = -2.6, a1 = a0 + 2.4 * Math.min(1, k * 1.2), cx = 250, cy = 250, R = 230;
      ctx.globalAlpha = this.shade * (k < 0.8 ? 0.85 : 0.85 * (1 - (k - 0.8) / 0.2)); ctx.fillStyle = '#221830';
      ctx.beginPath();
      const n = 28;
      for (let i = 0; i <= n; i++) { const u = i / n, a = a0 + (a1 - a0) * u, w = 34 * Math.sin(Math.PI * u); ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * (R + w), cy + Math.sin(a) * (R + w) * 0.62); }
      for (let i = n; i >= 0; i--) { const u = i / n, a = a0 + (a1 - a0) * u, w = 34 * Math.sin(Math.PI * u); ctx.lineTo(cx + Math.cos(a) * (R - w), cy + Math.sin(a) * (R - w) * 0.62); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  drawSmoke(ctx) {
    for (const p of this.smoke) {
      const k = p.t / p.life, r = Math.round(p.r);
      ctx.globalAlpha = (p.alpha ?? 0.8) * Math.min(1, p.t * 4) * (1 - k * k);
      // 부드러운 연기 덩어리(가운데 짙고 가장자리 흐림) — 작은 것은 도트 알갱이로
      if (r <= 6) { ctx.fillStyle = p.color || '#050308'; ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2); continue; }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r), c = p.color === '#2a1640' ? '42,22,64' : '5,3,8';
      g.addColorStop(0, `rgba(${c},1)`); g.addColorStop(0.55, `rgba(${c},0.75)`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
  rainbowLine(ctx, y, alpha) {
    const n = C.rainbow.length, seg = 456 / n, shift = (this.time * 90) % seg;
    ctx.save(); ctx.globalAlpha = alpha;
    for (let i = -1; i <= n; i++) {
      const x = 12 + i * seg + shift, x0 = Math.max(12, x), x1 = Math.min(468, x + seg);
      if (x1 <= x0) continue;
      ctx.fillStyle = C.rainbow[((i % n) + n) % n]; ctx.fillRect(Math.round(x0), Math.round(y), Math.round(x1 - x0), 2);
    }
    ctx.restore();
  }
  rainbowBand(ctx, y, h, alpha) {
    const g = ctx.createLinearGradient(0, 0, W, 0);
    C.rainbow.forEach((c, i) => g.addColorStop(i / (C.rainbow.length - 1), c));
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.fillRect(0, Math.round(y - h / 2), W, h); ctx.restore();
  }
  /** 필드 연출 동안(전투 전) 한 번에 그리기 */
  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = this.alpha;
    this.drawBackground(ctx);
    this.drawBoss(ctx);
    this.drawPlayer(ctx);
    this.drawBacklight(ctx);
    this.drawSmoke(ctx);
    this.drawParticles(ctx);
    this.drawShade(ctx);
    this.drawOverlay(ctx);
    ctx.restore();
  }
}
