// 러너 기믹 — 그리기·소리·카메라·입력 (BUILD230 사용자 브리핑 2026-09-19, 상태는 runner-core.js)
//   파란 토리이를 지나면 형섭이 땅을 짚고 검을 뒤로 뽑고(weaponpull) → 잔상을 남기며 대시(wing) → 화면 왼쪽 22% 자리에서 계속 달린다(쿠키런처럼 카메라가 따라감).
//   X 점프(jump), C 앞을 가르는 베기(델타룬 snd_swing) + 초승달 호, 공중 C 머리 위에서 아래로 내려치는 점프 공격(snd_criticalswing) + 세로 호, 착지 웅크림. 발 접촉 프레임마다 검은 물 위 물결 고리 + 물걸음 루프.
//   스프라이트는 CHARACTER_MOTIONS.hyungsub.runner_*(오른쪽 옆모습, 걷기의 0.85 크기). 동료는 달리는 동안 숨겼다가 끝나면 뒤에 정렬.
import { RUNNER, OBSTACLES, TUTORIAL, createRunner, stepRunner } from './runner-core.js';
import { FONT } from '../ui/font.js';
import { CHAR_SCALE } from './world.js';
import { SCREEN_W, SCREEN_H } from '../core/layout.js';
import { makeCanvas, loadImageOptional } from '../core/gfx.js';
import { WATER_WALK } from '../data/footsteps.js';

const SFX = Object.freeze({ draw: 'weaponpull', dash: 'wing', jump: 'jump', slash: 'swing', airslash: 'criticalswing', skid: 'scrape', deflect: 'deflect', hurt: 'hurt_dr' });
// 장애물 그림(BUILD236, assets/source/run-obstacles-v1): 종류 → 소품 PNG. 한 번 읽어 모든 러너가 나눠 쓴다
const OBSTACLE_IMAGES = { leaf: 'assets/props/run_leaf_1.png', leaf2: 'assets/props/run_leaf_2.png', needles: 'assets/props/run_needles.png', branch: 'assets/props/run_branch.png' };
const obstacleCache = {};
function obstacleImage(type) { if (!(type in obstacleCache)) { obstacleCache[type] = null; loadImageOptional(OBSTACLE_IMAGES[type]).then((img) => { obstacleCache[type] = img || null; }); } return obstacleCache[type]; }
export function preloadObstacleImages() { for (const t of Object.keys(OBSTACLE_IMAGES)) obstacleImage(t); }
const HURT_HP = 10;
const TRAIL_COLOR = '#58c8ff';
const SLASH_FX = 0.26;
// 속도감(사용자 “배경이 달리는 느낌, 바람”): 화면을 가로지르는 바람 줄기(화면 좌표, 지형보다 빠르게 왼쪽으로), 바닥 물결 줄기(월드 좌표, 바닥보다 빠르게 뒤로), 발마다 튀는 물보라(월드 좌표, 뒤로 튀어 떨어짐)
// BUILD240 사용자 “바람을 가르는 흰색 줄은 좋은데 너무 과한 것 같기도”: 줄기 수 약 40%↓, 밝기↓
const WIND = Object.freeze({ dashRate: 44, runRate: 14, extra: [320, 640], len: [36, 120], alpha: [0.1, 0.3] });
const STREAK = Object.freeze({ rate: 18, speed: [220, 420], len: [18, 48], alpha: [0.16, 0.34] });
const SPRAY = Object.freeze({ count: 6, vx: [110, 300], vy: [90, 230], gravity: 620, life: [0.32, 0.5] });
// 쳐냄 연출(BUILD243 사용자 “효과음 더, 초록 점이 나뭇잎·꽃잎 흩날리듯, 진동 아주 살짝”): 잎 조각 12개(초록 2톤), 흔들림 1px 0.12초, 소리는 snd_hit(deflect) + snd_break1 한 겹
const PETAL = Object.freeze({ count: 12, vx: [40, 170], vy: [40, 150], gravity: 260, life: [0.45, 0.8], colors: ['#7fd36a', '#b7ef8a', '#4f9a44'], shake: { time: 0.12, amp: 1 } });
// 검기 오라(BUILD243 사용자 “흰색 검기 오라, 도트풍, 투명한 느낌”): 절반 해상도 캔버스에 흰 반투명 초승달을 그려 2배로 찍는다(계단진 가장자리)
const AURA = makeCanvas(48, 48);
function drawAura(ctx, cx, cy, r, a0, a1, alpha, ccw) {
  const ac = AURA.getContext('2d'); ac.clearRect(0, 0, 48, 48);
  const hr = r / 2, ir = Math.max(2, hr - 6), c = 24;
  ac.globalAlpha = alpha * 0.62; ac.fillStyle = '#fff'; ac.beginPath(); ac.arc(c, c, hr, a0, a1, ccw); ac.arc(c, c, ir, a1, a0, !ccw); ac.closePath(); ac.fill();
  ac.globalAlpha = alpha * 0.95; ac.lineWidth = 1.5; ac.strokeStyle = '#fff'; ac.beginPath(); ac.arc(c, c, hr - 1.5, a0, a1, ccw); ac.stroke();
  ac.globalAlpha = 1;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(AURA, 0, 0, 48, 48, Math.round(cx) - 48, Math.round(cy) - 48, 96, 96); ctx.restore();
}
const rand = (a, b) => a + Math.random() * (b - a);

export class Runner {
  constructor(game, opts = {}) {
    this.game = game;
    this.cfg = opts;   // 맵 meta.run / meta.runs.<id>: dir·endX·speed·obstacles·seed·outro·outroFlag·keepFollowersHidden
    const p = game.player;
    const dir = opts.dir < 0 ? -1 : 1;
    this.core = createRunner({ x: p.x, endX: opts.endX ?? (dir > 0 ? game.map.pxW - 386 : 362), speed: opts.speed || RUNNER.speed, dir, obstacles: !!opts.obstacles, seed: opts.seed ?? 1, tutorial: !!opts.tutorial && !game.has?.(TUTORIAL.flag) });
    this.holdT = 0;
    if (opts.obstacles) preloadObstacleImages();
    this.groundY = p.y;
    this.fx = [];
    this.wind = []; this.streaks = []; this.spray = []; this.leafBits = []; this.windAcc = 0; this.streakAcc = 0;
    this.sfxLog = [];
    p.moving = false; p.facing = dir > 0 ? 'right' : 'left'; p.frame = 0; p.animPhase = 0; p.knock = null;
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
    p.x = s.x; p.y = this.groundY; p.moving = s.vx > 0; p.facing = s.dir > 0 ? 'right' : 'left';
    for (const ev of events) {
      if (SFX[ev]) { g.sound?.sfx(SFX[ev]); this.sfxLog.push(SFX[ev]); }
      if (ev === 'step') { g.emitRipple(p.x + p.w / 2, p.y + p.h - 1); this.splash(p.x + p.w / 2, p.y + p.h - 1); }
      if (ev === 'skid') this.skidSfxT = 0.42;   // 드르르르륵: scrape(0.55초)를 한 번 더 이어 튼다
      if (ev === 'skidstep') { this.splash(p.x + p.w / 2 + 8, p.y + p.h - 1, 3); g.emitRipple(p.x + p.w / 2 + 6, p.y + p.h - 1); }
      if (ev === 'slash') this.fx.push({ kind: 'slash', t: 0, dur: SLASH_FX, up: !!s.attack?.up });
      if (ev === 'airslash') this.fx.push({ kind: 'airslash', t: 0, dur: RUNNER.airSlashTime });
      if (ev === 'land') this.splash(p.x + p.w / 2, p.y + p.h - 1, 8);
      if (ev === 'deflect') { this.fx.push({ kind: 'deflect', t: 0, dur: 0.22 }); this.onDeflect(); }
      if (ev === 'hurt') this.hurt();
      if (ev === 'tutorial_hold') { this.holdT = 0; g.sound?.walk?.(null); }
      if (ev === 'tutorial_done') g.setFlag?.(TUTORIAL.flag);
      if (ev === 'end') this.finish();
    }
    // 첫 나뭇잎 튜토리얼 정지: 이펙트·바람·물보라도 멈춘 채 C 표시만 통통 뛴다
    if (s.tutorial === 'hold') { this.holdT += dt; if (g.runner === this) this.placeCamera(0.5); return; }
    if (this.skidSfxT !== undefined) { this.skidSfxT -= dt; if (this.skidSfxT <= 0) { this.skidSfxT = undefined; g.sound?.sfx('scrape'); this.sfxLog.push('scrape'); } }
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.dur);
    this.updateParticles(dt);
    if (g.runner !== this) return;
    g.sound?.walk?.(s.vx > 0 && s.grounded ? WATER_WALK : null);
    this.placeCamera(s.phase === 'prep' ? 0.08 : 0.5);   // 준비 동작 동안 가운데 정렬에서 왼쪽 22% 로 천천히 옮겨 간다(한 프레임에 튀지 않게)
  }
  /** 장애물에 맞음(BUILD236 사용자 “못 쳐내면 피가 10”): 주인공 HP −10(1 아래로는 안 내려감), 붉은 섬광·흔들림·무적은 game.hurtPlayer 가, 소리는 델타룬 snd_damage */
  hurt() {
    const g = this.game;
    const id = 'hyungsub';
    // BUILD240: game.damageParty 가 1 아래로 안 내려가게 깎고 아래에 HP 띠(−10)를 잠깐 띄운다(사용자 “바깥에서 맞는 건 죽지 않음, 1은 항상 남김”)
    if (g.damageParty) g.damageParty(id, HURT_HP);
    else if (g.partyHp && g.hpOf) g.partyHp[id] = Math.max(1, g.hpOf(id) - HURT_HP);
    g.hurtPlayer?.(null, { silent: true, push: 0 });
    this.game.player.knock = null;
  }
  /** 쳐냄 연출: 부서지는 소리 한 겹 더 + 잎 조각이 흩날림 + 아주 살짝 흔들림 */
  onDeflect() {
    const g = this.game, s = this.core, p = g.player;
    g.sound?.sfx('break1'); this.sfxLog.push('break1');
    g.shake = { ...PETAL.shake };
    const groundY = p.y + p.h;
    for (const o of s.obstacles) if (o.deflected && !o.fxDone) { o.fxDone = true; this.petals(o.x, groundY - o.h - o.hh / 2); }
  }
  petals(x, y) {
    const s = this.core;
    for (let i = 0; i < PETAL.count; i++) this.leafBits.push({ x, y, vx: s.dir * rand(...PETAL.vx) + rand(-50, 50), vy: -rand(...PETAL.vy), life: rand(...PETAL.life), t: 0, c: PETAL.colors[i % PETAL.colors.length], sz: i % 3 === 0 ? 3 : 2, ph: rand(0, 6.28) });
  }
  /** 발이 물을 차서 뒤로 튀는 물보라(월드 좌표) */
  splash(x, y, count = SPRAY.count) {
    const s = this.core;
    for (let i = 0; i < count; i++) this.spray.push({ x: x - s.dir * rand(0, 10), y, vx: s.dir * (s.vx * 0.3 - rand(...SPRAY.vx)), vy: -rand(...SPRAY.vy), life: rand(...SPRAY.life), t: 0, big: i % 3 === 0 });
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
        this.wind.push({ x: s.dir > 0 ? SCREEN_W + len : -len, y: rand(6, SCREEN_H - 6), len, v: rand(...WIND.extra), a: rand(...WIND.alpha) * (s.phase === 'dash' ? 1.3 : 1), thick: s.phase === 'dash' && Math.random() < 0.25 ? 2 : 1 });
      }
      if (map) {
        const groundRow = Math.floor((this.groundY + g.player.h - 1) / 32);
        const rr = map.def.meta?.runRoadRows;
        const [r0, r1] = (Array.isArray(rr?.[0]) ? rr.find(([a, b]) => groundRow >= a && groundRow <= b) : rr) || [groundRow - 1, groundRow];   // 맵 meta 가 길 행을 주면 그대로(여러 길이면 선 행이 든 것), 없으면 주인공이 선 행 기준
        this.streakAcc += dt * STREAK.rate * k;
        while (this.streakAcc >= 1) {
          this.streakAcc -= 1;
          this.streaks.push({ x: s.dir > 0 ? cam.x + SCREEN_W + rand(0, 80) : cam.x - rand(0, 80) - 48, y: rand(r0 * 32 + 3, (r1 + 1) * 32 - 3), len: rand(...STREAK.len), v: rand(...STREAK.speed), a: rand(...STREAK.alpha) });
        }
      }
    }
    for (const w of this.wind) w.x -= s.dir * (s.vx * 1.2 + w.v) * dt;
    this.wind = this.wind.filter((w) => w.x + w.len > -4 && w.x - w.len < SCREEN_W + 4);   // 오른쪽 달리기 줄기는 화면 오른쪽 밖(x = 480+len)에서 시작하므로 len 만큼 여유
    for (const t of this.streaks) t.x -= s.dir * t.v * dt;
    this.streaks = this.streaks.filter((t) => t.x + t.len > cam.x - 8 && t.x < cam.x + SCREEN_W + 8);
    for (const d of this.spray) { d.t += dt; d.vy += SPRAY.gravity * dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    this.spray = this.spray.filter((d) => d.t < d.life);
    for (const d of this.leafBits) { d.t += dt; d.vy += PETAL.gravity * dt; d.vx *= Math.max(0, 1 - 1.8 * dt); d.x += d.vx * dt + Math.sin(d.ph + d.t * 9) * 34 * dt; d.y += d.vy * dt; }
    this.leafBits = this.leafBits.filter((d) => d.t < d.life);
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
    for (const d of this.leafBits) { ctx.globalAlpha = Math.max(0, 1 - d.t / d.life); ctx.fillStyle = d.c; ctx.fillRect(Math.round(d.x - cam.x), Math.round(d.y - cam.y), d.sz, d.sz); }
    ctx.restore();
  }
  /** 캐릭터를 화면 왼쪽 22% 자리에 두고 따라간다(맵 안으로 클램프). lerp 0.5 = 520px/s 에서 약 9px 뒤처짐(가속 때 살짝 밀리는 느낌만) */
  placeCamera(lerp) {
    const g = this.game, cam = g.camera, map = g.map, p = g.player;
    if (!map) return;
    cam.locked = true;
    const side = this.core.dir > 0 ? RUNNER.cameraLeft : 1 - RUNNER.cameraLeft;   // 왼쪽으로 달리면 화면 오른쪽 22% 자리
    const tx = Math.max(0, Math.min(map.pxW - SCREEN_W, p.x + p.w / 2 - SCREEN_W * side));
    const ty = map.pxH < SCREEN_H ? (map.pxH - SCREEN_H) / 2 : Math.max(0, Math.min(map.pxH - SCREEN_H, p.y + p.h / 2 - SCREEN_H / 2));
    cam.x += (tx - cam.x) * lerp; cam.y += (ty - cam.y) * lerp;
  }
  /** 끝: 조작·카메라 복귀, 동료 다시 보이고 뒤에 정렬 */
  finish() {
    const g = this.game, p = g.player;
    if (g.runner === this) g.runner = null;
    g.camera.locked = false; p.moving = false; p.facing = this.core.dir > 0 ? 'right' : 'left';
    g.sound?.walk?.(null);
    p.trail = [];   // 달리는 동안 쌓이지 않은 발자국 궤적을 비운다 — 안 비우면 동료가 토리이 자리로 되돌아 걸어간다(리뷰 2026-09-19)
    // cfg.outro(BUILD235 청소부 끝 연출): 아직 안 본 상태면 동료는 숨긴 채 그 스크립트가 데려온다. keepFollowersHidden(사라진 채 다음 구간으로) 이면 숨긴 채 둔다. 아니면 바로 뒤에 정렬
    const run = this.cfg;
    if (run?.outro && !(run.outroFlag && g.has?.(run.outroFlag)) && g.runScript) { g.runScript(run.outro); }
    else if (!run?.keepFollowersHidden) for (const e of g.entities) if (e.def?.type === 'follower') { e.visible = true; e.snapBehind?.(); }
    for (const name of ['prep', 'run', 'jump', 'slash', 'airslash']) for (const f of this.sheet(name)?.frames || []) delete f.silhouette;
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
    const mirror = this.core.dir < 0;   // 시트는 오른쪽을 본다 → 왼쪽으로 달릴 땐 앵커 기준 좌우 반전(기울기도 반대)
    ctx.save();
    if (mirror) { ctx.translate(Math.round(ax) * 2, 0); ctx.scale(-1, 1); }
    if (angle) {
      const cx = Math.round(ax), cy = Math.round(ay - dh * 0.5);
      ctx.translate(cx, cy); ctx.rotate(angle); ctx.drawImage(img, dx - cx, dy - cy, dw, dh);
    } else ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }
  /** 장애물(월드 x·땅 높이 h → 화면): 쳐낸 것은 돌며 날아간다 */
  drawObstacles(ctx, cam) {
    const s = this.core, p = this.game.player;
    if (!s.obstacles?.length) return;
    const groundY = p.y + p.h;
    for (const o of s.obstacles) {
      const img = obstacleImage(o.type), k = OBSTACLES[o.type]?.draw || 1;
      const cx = Math.round(o.x - cam.x), cy = Math.round(groundY - o.h - o.hh / 2 - cam.y);
      if (!o.deflected) {
        // 가시성(BUILD240 사용자 “나뭇잎 잘 안 보여”): 땅에 떨어질 자리 표시(어두운 타원 + 옅은 테두리)와 잎 뒤의 옅은 빛무리, 그림은 k 배
        const gy = Math.round(groundY - cam.y) - 1, halo = (o.w + o.hh) / 2 * k * 0.6;
        ctx.save(); ctx.beginPath(); ctx.ellipse(cx, gy, 10 * k, 3, 0, 0, Math.PI * 2); ctx.globalAlpha = 0.5; ctx.fillStyle = '#000'; ctx.fill(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#8fd0ff'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#e8ffd0'; ctx.beginPath(); ctx.arc(cx, cy, halo, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.save(); ctx.translate(cx, cy);
      if (o.deflected) { ctx.rotate(o.spin); ctx.globalAlpha = Math.max(0, 1 - o.t / 0.6); }
      else if (o.sway) ctx.rotate(Math.sin(o.phase + o.t * 5) * 0.35);
      if (s.dir < 0) ctx.scale(-1, 1);
      if (img) { const w = Math.round(img.width * k), h = Math.round(img.height * k); ctx.drawImage(img, -Math.round(w / 2), -Math.round(h / 2), w, h); }
      else { ctx.fillStyle = '#3f7a44'; ctx.fillRect(-o.w / 2, -o.hh / 2, o.w, o.hh); }
      ctx.restore();
      if (s.tutorial === 'hold' && !o.deflected) this.drawTutorialTarget(ctx, cx, cy, k);
    }
  }
  /** 첫 나뭇잎 튜토리얼(BUILD240): 멈춘 화면에서 잎에 노란 고리, 머리 위에 C 키 표시가 통통 뛴다(대사 없음) */
  drawTutorialTarget(ctx, cx, cy, k) {
    const r = 14 * k + Math.sin(this.holdT * 8) * 2;
    ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  drawTutorialPrompt(ctx, ax, ay) {
    const t = this.holdT, x = Math.round(ax) - 11, y = Math.round(ay) - 78 + Math.round(Math.sin(t * 6) * 3);
    ctx.save(); ctx.globalAlpha = Math.min(1, t * 4);
    ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, 26, 26); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 22, 22); ctx.fillStyle = '#000'; ctx.fillRect(x + 2, y + 2, 18, 18);
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.fillText('C', x + 11, y + 3);
    ctx.beginPath(); ctx.moveTo(x + 7, y + 26); ctx.lineTo(x + 15, y + 26); ctx.lineTo(x + 11, y + 31); ctx.closePath(); ctx.fill();
    ctx.restore();
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
    if (fr) this.drawFrame(ctx, fr.frame.image, fr.frame, fr.scale, ax, ay - s.airY, s.tilt);
    else { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(ax - 8), Math.round(ay - s.airY - 40), 16, 40); }
    this.drawObstacles(ctx, cam);
    if (s.tutorial === 'hold') this.drawTutorialPrompt(ctx, ax, ay - s.airY);
    const D = s.dir;
    for (const f of this.fx) {
      const k = f.t / f.dur;
      if (f.kind === 'slash') {
        // 앞을 가르는 흰 검기 초승달(도트풍·반투명): 내려베기는 위→아래로, 올려베기(f.up)는 아래→위로 쓸며 옅어진다
        const cx = ax + 20 * D, cy = ay - s.airY - 22, r = 30, sweep = Math.PI * 1.1 * Math.min(1, k * 1.6);
        const top = D > 0 ? -Math.PI * 0.55 : Math.PI * 1.55, bottom = D > 0 ? Math.PI * 0.55 : Math.PI * 0.45;
        const a0 = f.up ? bottom : top, a1 = f.up ? bottom - D * sweep : top + D * sweep;
        drawAura(ctx, cx, cy, r, a0, a1, 1 - k * k, f.up ? D > 0 : D < 0);
      } else if (f.kind === 'airslash') {
        // 점프 공격: 머리 위에서 앞 아래로 내려치는 세로 검기(위 → 아래로 쓸어 내리며 옅어진다)
        const cx = ax + 16 * D, cy = ay - s.airY - 26, r = 34;
        const a0 = D > 0 ? -Math.PI * 0.95 : Math.PI * 1.95, a1 = a0 + D * Math.PI * 1.25 * Math.min(1, k * 1.5);
        drawAura(ctx, cx, cy, r, a0, a1, 1 - k * k, D < 0);
      } else if (f.kind === 'deflect') {
        // 쳐냄: 몸 앞에서 흰 섬광이 확 퍼진다
        const cx = ax + 34 * D, cy = ay - s.airY - 24, rr = 8 + 26 * k;
        ctx.save(); ctx.globalAlpha = 0.9 * (1 - k); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(200,240,255,0.8)'; ctx.fillRect(Math.round(cx - 3), Math.round(cy - 3), 6, 6);
        ctx.restore();
      }
    }
  }
}
