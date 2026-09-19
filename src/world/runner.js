// 러너 기믹 — 그리기·소리·카메라·입력 (BUILD230 사용자 브리핑 2026-09-19, 상태는 runner-core.js)
//   파란 토리이를 지나면 형섭이 땅을 짚고 검을 뒤로 뽑고(weaponpull) → 잔상을 남기며 대시(wing) → 화면 왼쪽 22% 자리에서 계속 달린다(쿠키런처럼 카메라가 따라감).
//   X 점프(jump), C 앞을 가르는 베기(델타룬 snd_swing) + 초승달 호, 공중 C 한 바퀴 공중제비 회전 베기(snd_criticalswing) + 고리. 발 접촉 프레임마다 검은 물 위 물결 고리 + 물걸음 루프.
//   스프라이트는 CHARACTER_MOTIONS.hyungsub.runner_*(오른쪽 옆모습, 걷기의 0.85 크기). 동료는 달리는 동안 숨겼다가 끝나면 뒤에 정렬.
import { RUNNER, createRunner, stepRunner } from './runner-core.js';
import { CHAR_SCALE } from './world.js';
import { SCREEN_W, SCREEN_H } from '../core/layout.js';
import { makeCanvas } from '../core/gfx.js';
import { WATER_WALK } from '../data/footsteps.js';

const SFX = Object.freeze({ draw: 'weaponpull', dash: 'wing', jump: 'jump', slash: 'swing', spin: 'criticalswing', skid: 'scrape' });
const TRAIL_COLOR = '#58c8ff';
const SLASH_FX = 0.26;
// 속도감(사용자 “배경이 달리는 느낌, 바람”): 화면을 가로지르는 바람 줄기(화면 좌표, 지형보다 빠르게 왼쪽으로), 바닥 물결 줄기(월드 좌표, 바닥보다 빠르게 뒤로), 발마다 튀는 물보라(월드 좌표, 뒤로 튀어 떨어짐)
const WIND = Object.freeze({ dashRate: 70, runRate: 24, extra: [320, 640], len: [36, 120], alpha: [0.14, 0.42] });
const STREAK = Object.freeze({ rate: 26, speed: [220, 420], len: [18, 48], alpha: [0.18, 0.4] });
const SPRAY = Object.freeze({ count: 6, vx: [110, 300], vy: [90, 230], gravity: 620, life: [0.32, 0.5] });
const rand = (a, b) => a + Math.random() * (b - a);

export class Runner {
  constructor(game, opts = {}) {
    this.game = game;
    const p = game.player;
    this.core = createRunner({ x: p.x, endX: opts.endX ?? (game.map.pxW - 386), speed: opts.speed || RUNNER.speed });
    this.groundY = p.y;
    this.fx = [];
    this.wind = []; this.streaks = []; this.spray = []; this.windAcc = 0; this.streakAcc = 0;
    this.sfxLog = [];
    p.moving = false; p.facing = 'right'; p.frame = 0; p.animPhase = 0; p.knock = null;
    for (const e of game.entities) if (e.def?.type === 'follower') e.visible = false;
    game.sound?.walk?.(null);
    game.camera.locked = true;   // 이 프레임부터 카메라는 러너가 옮긴다(첫 update 전에도 잠금)
  }
  get phase() { return this.core.phase; }
  sheet(name) { return this.game.characterMotions?.hyungsub?.[`runner_${name}`] || null; }
  /** 한 틱: 상태기계 → 주인공 자리·소리·물결·이펙트·카메라 */
  update(dt, input) {
    const s = this.core, g = this.game, p = g.player;
    const events = stepRunner(s, dt, { jump: input.just('cancel'), attack: input.just('confirm') });
    p.x = s.x; p.y = this.groundY; p.moving = s.vx > 0; p.facing = 'right';
    for (const ev of events) {
      if (SFX[ev]) { g.sound?.sfx(SFX[ev]); this.sfxLog.push(SFX[ev]); }
      if (ev === 'step') { g.emitRipple(p.x + p.w / 2, p.y + p.h - 1); this.splash(p.x + p.w / 2, p.y + p.h - 1); }
      if (ev === 'skid') this.skidSfxT = 0.42;   // 드르르르륵: scrape(0.55초)를 한 번 더 이어 튼다
      if (ev === 'skidstep') { this.splash(p.x + p.w / 2 + 8, p.y + p.h - 1, 3); g.emitRipple(p.x + p.w / 2 + 6, p.y + p.h - 1); }
      if (ev === 'slash') this.fx.push({ kind: 'slash', t: 0, dur: SLASH_FX });
      if (ev === 'spin') this.fx.push({ kind: 'ring', t: 0, dur: RUNNER.spinTime });
      if (ev === 'end') this.finish();
    }
    if (this.skidSfxT !== undefined) { this.skidSfxT -= dt; if (this.skidSfxT <= 0) { this.skidSfxT = undefined; g.sound?.sfx('scrape'); this.sfxLog.push('scrape'); } }
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dur);
    this.updateParticles(dt);
    if (g.runner !== this) return;
    g.sound?.walk?.(s.vx > 0 && s.grounded ? WATER_WALK : null);
    this.placeCamera(s.phase === 'prep' ? 0.08 : 0.5);   // 준비 동작 동안 가운데 정렬에서 왼쪽 22% 로 천천히 옮겨 간다(한 프레임에 튀지 않게)
  }
  /** 발이 물을 차서 뒤로 튀는 물보라(월드 좌표) */
  splash(x, y, count = SPRAY.count) {
    const s = this.core;
    for (let i = 0; i < count; i++) this.spray.push({ x: x - rand(0, 10), y, vx: s.vx * 0.3 - rand(...SPRAY.vx), vy: -rand(...SPRAY.vy), life: rand(...SPRAY.life), t: 0, big: i % 3 === 0 });
  }
  /** 바람 줄기·바닥 줄기·물보라 갱신. 달리는 속도(vx)에 비례해 생기고, 준비 동작·끝난 뒤엔 사라진다 */
  updateParticles(dt) {
    const s = this.core, g = this.game, cam = g.camera, map = g.map;
    const k = s.speed ? s.vx / s.speed : 0;
    if (k > 0) {
      this.windAcc += dt * (s.phase === 'dash' ? WIND.dashRate : WIND.runRate * k);
      while (this.windAcc >= 1) {
        this.windAcc -= 1;
        const len = rand(...WIND.len);
        this.wind.push({ x: SCREEN_W + len, y: rand(6, SCREEN_H - 6), len, v: rand(...WIND.extra), a: rand(...WIND.alpha) * (s.phase === 'dash' ? 1.3 : 1), thick: s.phase === 'dash' && Math.random() < 0.4 ? 2 : 1 });
      }
      if (map) {
        const groundRow = Math.floor((this.groundY + g.player.h - 1) / 32);
        const [r0, r1] = map.def.meta?.runRoadRows || [groundRow - 1, groundRow];   // 맵 meta 가 길 행을 주면 그대로, 없으면 주인공이 선 행 기준
        this.streakAcc += dt * STREAK.rate * k;
        while (this.streakAcc >= 1) {
          this.streakAcc -= 1;
          this.streaks.push({ x: cam.x + SCREEN_W + rand(0, 80), y: rand(r0 * 32 + 3, (r1 + 1) * 32 - 3), len: rand(...STREAK.len), v: rand(...STREAK.speed), a: rand(...STREAK.alpha) });
        }
      }
    }
    for (const w of this.wind) w.x -= (s.vx * 1.2 + w.v) * dt;
    this.wind = this.wind.filter((w) => w.x + w.len > -4);
    for (const t of this.streaks) t.x -= t.v * dt;
    this.streaks = this.streaks.filter((t) => t.x + t.len > cam.x - 8);
    for (const d of this.spray) { d.t += dt; d.vy += SPRAY.gravity * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    this.spray = this.spray.filter((d) => d.t < d.life);
  }
  /** 바닥 물결 줄기 — 엔티티보다 먼저(바닥 위) 그린다 */
  drawGround(ctx, cam) {
    if (!this.streaks.length) return;
    ctx.save(); ctx.lineWidth = 1;
    for (const t of this.streaks) { ctx.globalAlpha = t.a; ctx.strokeStyle = '#8fd0ff'; ctx.beginPath(); ctx.moveTo(Math.round(t.x - cam.x), Math.round(t.y - cam.y) + 0.5); ctx.lineTo(Math.round(t.x - cam.x + t.len), Math.round(t.y - cam.y) + 0.5); ctx.stroke(); }
    ctx.restore();
  }
  /** 바람 줄기·물보라 — 엔티티 위에 그린다 */
  drawAir(ctx, cam) {
    ctx.save();
    for (const d of this.spray) { const k = d.t / d.life; ctx.globalAlpha = 0.9 * (1 - k); ctx.fillStyle = d.big ? '#d8f4ff' : '#8fd0ff'; const sz = d.big ? 3 : 2; ctx.fillRect(Math.round(d.x - cam.x), Math.round(d.y - cam.y), sz, sz); }
    for (const w of this.wind) { ctx.globalAlpha = w.a; ctx.fillStyle = '#e8f6ff'; ctx.fillRect(Math.round(w.x), Math.round(w.y), Math.round(w.len), w.thick); }
    ctx.restore();
  }
  /** 캐릭터를 화면 왼쪽 22% 자리에 두고 따라간다(맵 안으로 클램프). lerp 0.5 = 520px/s 에서 약 9px 뒤처짐(가속 때 살짝 밀리는 느낌만) */
  placeCamera(lerp) {
    const g = this.game, cam = g.camera, map = g.map, p = g.player;
    if (!map) return;
    cam.locked = true;
    const tx = Math.max(0, Math.min(map.pxW - SCREEN_W, p.x + p.w / 2 - SCREEN_W * RUNNER.cameraLeft));
    const ty = map.pxH < SCREEN_H ? (map.pxH - SCREEN_H) / 2 : Math.max(0, Math.min(map.pxH - SCREEN_H, p.y + p.h / 2 - SCREEN_H / 2));
    cam.x += (tx - cam.x) * lerp; cam.y += (ty - cam.y) * lerp;
  }
  /** 끝: 조작·카메라 복귀, 동료 다시 보이고 뒤에 정렬 */
  finish() {
    const g = this.game, p = g.player;
    if (g.runner === this) g.runner = null;
    g.camera.locked = false; p.moving = false; p.facing = 'right';
    g.sound?.walk?.(null);
    p.trail = [];   // 달리는 동안 쌓이지 않은 발자국 궤적을 비운다 — 안 비우면 동료가 토리이 자리로 되돌아 걸어간다(리뷰 2026-09-19)
    for (const e of g.entities) if (e.def?.type === 'follower') { e.visible = true; e.snapBehind?.(); }
    for (const name of ['prep', 'run', 'jump', 'slash']) for (const f of this.sheet(name)?.frames || []) delete f.silhouette;
  }
  frameOf(anim, index) {
    const sheet = this.sheet(anim);
    if (!sheet?.frames?.length) return null;
    return { frame: sheet.frames[Math.min(index, sheet.frames.length - 1)], scale: sheet.scale * CHAR_SCALE };
  }
  /** 잔상용 파란 실루엣(프레임마다 한 번 만들어 붙여 둔다) */
  silhouette(frame, scale) {
    if (!frame.silhouette) {
      // 표시 크기(약 60px)로 만든다 — 원본 512px 로 만들면 프레임당 1MB 가 게임 내내 남는다(리뷰 2026-09-19). finish() 에서 버린다
      const w = Math.max(1, Math.round(frame.image.width * scale)), h = Math.max(1, Math.round(frame.image.height * scale));
      const c = makeCanvas(w, h);
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(frame.image, 0, 0, w, h); x.globalCompositeOperation = 'source-in'; x.fillStyle = TRAIL_COLOR; x.fillRect(0, 0, w, h);
      frame.silhouette = c;
    }
    return frame.silhouette;
  }
  drawFrame(ctx, img, frame, scale, ax, ay, angle) {
    const dw = Math.round(frame.image.width * scale), dh = Math.round(frame.image.height * scale);
    const dx = Math.round(ax - frame.pivot[0] * scale), dy = Math.round(ay - frame.pivot[1] * scale);
    if (angle) {
      const cx = Math.round(ax), cy = Math.round(ay - dh * 0.5);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.drawImage(img, dx - cx, dy - cy, dw, dh); ctx.restore();
    } else ctx.drawImage(img, dx, dy, dw, dh);
  }
  /** Player.drawSprite 대신 그린다: 잔상 → 그림자 → 프레임(회전) → 베기 호 / 회전 고리 */
  drawPlayer(ctx, cam) {
    const s = this.core, p = this.game.player;
    const ax = p.x + p.w / 2 - cam.x, ay = p.y + p.h - cam.y;
    const n = s.trail.length;
    s.trail.forEach((t, i) => {
      const fr = this.frameOf(t.anim, t.frame);
      if (!fr) return;
      ctx.globalAlpha = (t.phase === 'dash' ? 0.6 : 0.3) * ((i + 1) / (n + 1));
      this.drawFrame(ctx, this.silhouette(fr.frame, fr.scale), fr.frame, fr.scale, t.x + p.w / 2 - cam.x, ay - t.airY, t.angle);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(Math.round(p.x - cam.x), Math.round(ay - 2), p.w, 3);
    const fr = this.frameOf(s.anim, s.frame);
    if (fr && s.attack?.kind === 'spin') {
      // 공중제비 회전 베기(사용자 “좀 별로, 간소화·속도감”): 몸을 바퀴처럼 — 회전 방향 뒤쪽에 파란 실루엣 3장을 겹쳐 흐림을 만들고 그 위에 본체를 그린다
      for (let k = 3; k >= 1; k--) { ctx.globalAlpha = 0.42 - k * 0.1; this.drawFrame(ctx, this.silhouette(fr.frame, fr.scale), fr.frame, fr.scale, ax, ay - s.airY, s.spinAngle - k * 0.45); }
      ctx.globalAlpha = 1;
      this.drawFrame(ctx, fr.frame.image, fr.frame, fr.scale, ax, ay - s.airY, s.spinAngle);
    } else if (fr) this.drawFrame(ctx, fr.frame.image, fr.frame, fr.scale, ax, ay - s.airY, s.spinAngle || s.tilt);
    else { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(ax - 8), Math.round(ay - s.airY - 40), 16, 40); }
    for (const f of this.fx) {
      const k = f.t / f.dur;
      if (f.kind === 'slash') {
        // 앞을 가르는 초승달 호: 몸 앞에서 위→아래로 쓸며 옅어진다
        const cx = ax + 20, cy = ay - s.airY - 22, r = 26;
        const a0 = -Math.PI * 0.55, a1 = a0 + Math.PI * 1.1 * Math.min(1, k * 1.6);
        ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(120,220,255,0.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, r + 1, a0, a1); ctx.stroke();
        ctx.restore();
      } else if (f.kind === 'ring') {
        // 공중제비 회전 베기: 몸을 감싸는 칼날 궤적(회전과 같이 도는 270° 호, 앞 끝이 가장 밝음) + 바깥으로 퍼지며 옅어지는 충격 고리
        const cx = ax, cy = ay - s.airY - 22, rr = 27, a1 = s.spinAngle, a0 = a1 - Math.PI * 1.5;
        ctx.save(); ctx.lineCap = 'round';
        ctx.globalAlpha = 0.55 * (1 - k * 0.5); ctx.strokeStyle = 'rgba(120,220,255,1)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.stroke();
        ctx.globalAlpha = 0.95 * (1 - k * 0.4); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, rr + 1, a1 - Math.PI * 0.8, a1); ctx.stroke();
        ctx.globalAlpha = 0.5 * (1 - k); ctx.strokeStyle = 'rgba(160,230,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 30 + 34 * k, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }
  }
}
