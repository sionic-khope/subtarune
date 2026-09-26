import { SummitSmoke, drawFlutter } from './summit-smoke.js';
import { TEEN_BATTLE } from '../data/teen-battle.js';

/**
 * BUILD337 tower summit: black smoke at the broken end, 청소년 revealed as it clears, gajaeman's aura and perch.
 * BUILD342: 청소년·어깨·연기는 전투와 같은 한 화면(TEEN_BATTLE.view)의 좌표를 월드로 옮겨 쓴다 — 전투로 바로 이어져도 그대로.
 */
export const SUMMIT = Object.freeze({
  map: 'gajaeman_castle_summit', stage: 'castle_summit_ready',
  reveal: 4.0,
  descend: 3.4, burst: 1.2, perch: 1.4,
});
const V = TEEN_BATTLE.view;
const P2 = TEEN_BATTLE.phase2;
/**
 * BUILD352 2페이즈 격파 뒤 연출(사용자 2026-09-26 브리핑) 좌표·그림. 월드 좌표.
 * 용준·대포는 끝길 맨 뒤(왼쪽), 바론은 그 앞 바닥에서 솟고, 쥰희는 부서진 끝 앞에서 주먹을 막는다.
 */
export const FINALE = Object.freeze({
  img: {
    // 대포·대포알은 필드의 용준대포(쮼앰대포) 그림
    sword: 'assets/props/cathedral323_sword.png', shot: 'assets/props/ship_cannonball.png', cannon: 'assets/props/wooden_cannon.png',
    baron: 'assets/enemies/baron-roar-idle.png', arm: 'assets/props/arena332_arm.png',
  },
  bladeAt: [1930, 236], partyAim: [1690, 372],
  cannon: [1452, 404], yongjun: [1398, 404], baron: [1510, 436], baronRest: [1300, 420], baronScale: 1.125, block: [1752, 392],
  gjOut: [1905, 150], flee: [2420, 40],
});
/** 대치 화면의 화면 좌표 → 월드 */
const world = ([x, y]) => [V.cam[0] + x, V.cam[1] + y];

const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

export class CastleSummit {
  constructor(game, { rnd = Math.random } = {}) {
    this.game = game; this.map = game.map; this.rnd = rnd; this.disposed = false;
    this.meta = game.map.def.meta.summit;
    this.actor = game.entities.find(e => e.id === this.meta.gajaeman) || null;
    this.time = 0; this.motes = []; this.giant = null; this.aura = 0; this.tween = null;
    this.smoke = new SummitSmoke({ rnd });
    void game.sound.loadSfxFiles?.(['deltarune_release_shoot', 'explosion', 'laser_charge', 'hurt', 'spearappear', 'heavyswing', 'ultraswing', 'cannon_guard_fire', 'baron_slam', 'baron_eruption', 'baron_roar', 'impact', 'wing', 'thud', 'captain_transform', 'power', 'cannon_charge', 'damage', 'criticalswing', 'hurt_dr']);
    // 격파 연출 상태
    this.form = 'p1'; this.core = false; this.tremble = 0; this.fx = []; this.blade = null; this.balls = []; this.booms = [];
    this.swords = []; this.baron = null; this.cannonOn = false; this.arm = null; this.fall = null; this.lying = null; this.gather = null; this.waves = [];
    void game.sound.loadSfxFiles?.(['captain_transform', 'captain_thunder', 'rumble', 'wing', 'power', 'thud']);
    // 대치가 끝난 저장에서는 청소년·가재맨이 이미 자리에 있다
    if (game.has(SUMMIT.stage)) { this.giant = { t: SUMMIT.reveal }; this.aura = 1; this.perch(true); }
    // 격파 연출을 본 뒤: 청소년은 넘어가 사라졌고 가재맨은 도망갔다
    if (game.flags?.castle_teen_finale_seen) { this.giant = null; if (this.actor) this.actor.visible = false; }
  }
  get snapshot() { return { giant: this.giant ? +clamp01(this.giant.t / SUMMIT.reveal).toFixed(2) : 0, aura: this.aura, gajaeman: this.actor?.visible !== false && !!this.actor?.visible }; }
  waitFor(done) { return new Promise(resolve => this.game.background.push({ update: () => { if (this.disposed || done()) { resolve(); return true; } return false; } })); }
  /** 청소년 is revealed in place as the thick smoke in front of her thins out. */
  revealGiant() {
    this.giant = { t: 0 };
    this.game.sound.sfx('rumble', { volume: 0.8 }); this.game.shake = { time: SUMMIT.reveal, amp: 1 };
    return this.waitFor(() => this.giant.t >= SUMMIT.reveal);
  }
  tweenActor(toX, toY, seconds, curve = ease) {
    const a = this.actor; if (!a) return undefined;
    this.tween = { fx: a.x, fy: a.y, tx: toX, ty: toY, t: 0, d: seconds, curve };
    return this.waitFor(() => !this.tween);
  }
  /** Gajaeman slowly floats down from above to hover beside 청소년. */
  descend() {
    const a = this.actor; if (!a) return undefined;
    // 청소년 머리 왼쪽 위 허공으로 천천히(대사 동안 보인다) → auraAndPerch 로 등 뒤(가려짐)에 앉는다
    const [hx, hy] = world([214, 98]);
    a.visible = true; a.x = hx - a.w / 2; a.y = hy - a.h - 320; a.facing = 'left'; this.aura = 1;
    this.game.sound.sfx('captain_transform', { volume: 0.4 });
    return this.tweenActor(hx - a.w / 2, hy - a.h, SUMMIT.descend);
  }
  /** Huge aura burst, rise, then land on 청소년's back shoulder. */
  auraAndPerch() {
    const a = this.actor; if (!a) return undefined;
    this.aura = 2; this.game.shake = { time: SUMMIT.burst, amp: 5 };
    this.game.sound.sfx('captain_thunder', { volume: 0.8 }); this.game.sound.sfx('power', { volume: 0.6 });
    const [sx, sy] = world(V.shoulder);
    return this.tweenActor(a.x, a.y - 260, SUMMIT.burst, k => k * k).then(() => {
      this.game.sound.sfx('wing', { volume: 0.5 });
      return this.tweenActor(sx - a.w / 2, sy - a.h, SUMMIT.perch);
    }).then(() => { this.aura = 0; this.onBack = true; a.visible = false; this.game.sound.sfx('thud', { volume: 0.5 }); });
  }
  perch(instant) {
    const a = this.actor; if (!a) return;
    const [sx, sy] = world(V.shoulder);
    // 청소년 뒤로 들어가 보이지 않는다(전투에서도 쓰러질 때만 나온다)
    a.visible = false; a.facing = 'left'; this.onBack = true; if (instant) { a.x = sx - a.w / 2; a.y = sy - a.h; }
  }
  update(dt) {
    const g = this.game;
    if (this.disposed) return;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    const s = Math.max(0, dt); this.time += s;
    this.updateFinale(s);
    this.smoke.update(s);
    if (this.giant) this.giant.t += s;
    const a = this.actor;
    if (this.tween && a) {
      const tw = this.tween; tw.t += s; const k = tw.curve(clamp01(tw.t / tw.d));
      a.x = tw.fx + (tw.tx - tw.fx) * k; a.y = tw.fy + (tw.ty - tw.fy) * k;
      if (tw.t >= tw.d) this.tween = null;
    }
    if (a && a.visible) a.flyY = Math.sin(this.time * 2.4) * 3;
    if (this.aura && a && a.visible) {
      const n = this.aura === 2 ? 5 : 1;
      for (let i = 0; i < n; i++) if (this.rnd() < (this.aura === 2 ? 1 : 0.5)) {
        const side = this.rnd() * 2 - 1;
        this.motes.push({ x: a.x + a.w / 2 + side * (this.aura === 2 ? 60 : 26), y: a.y + a.h - 20 - this.rnd() * 60, vx: side * 20, vy: -(60 + this.rnd() * (this.aura === 2 ? 180 : 60)), age: 0, life: 0.8 + this.rnd() * 0.8, size: 3 + Math.floor(this.rnd() * 3), purple: this.rnd() < 0.35 });
      }
    }
    for (const m of this.motes) { m.age += s; m.x += m.vx * s; m.y += m.vy * s; }
    this.motes = this.motes.filter(m => m.age < m.life);
  }
  /**
   * Before the actors (after the floor chunks): sky smoke far behind, the 청소년 (same picture and place as in the battle,
   * fluttering slightly in the wind), then the walkway and its last post in front of her — the party stands in front of all of it.
   */
  drawBehind(ctx, cam) {
    if (this.disposed) return;
    const img = this.giant && this.game.propImages[this.form === 'p2' ? P2.images.idle : V.giant.image];
    const k = this.giant ? Math.min(1, this.giant.t / SUMMIT.reveal) : 0, veil = this.giant ? 1 - ease(k) : 0;
    ctx.save();
    this.smoke.draw(ctx, cam, 'back');
    if (img) {
      const [x, y] = world([V.giant.x, V.giant.y]);
      ctx.globalAlpha = ease(k);
      const jx = this.tremble ? Math.round(Math.sin(this.time * 60) * 2 * this.tremble) : 0;
      if (this.fall) {
        // 뒤로(오른쪽으로) 넘어가며 가라앉고 사라진다
        const f = Math.min(1, this.fall.t / 1.6), e = f * f;
        ctx.save(); ctx.globalAlpha *= 1 - Math.max(0, (f - 0.6) / 0.4);
        const px = x - cam.x + img.width * 0.5, py = y - cam.y + img.height;
        ctx.translate(px + e * 60, py + e * 160); ctx.rotate(0.5 * e); drawFlutter(ctx, img, -img.width * 0.5, -img.height, this.time); ctx.restore();
      } else drawFlutter(ctx, img, x - cam.x + jx, y - cam.y, this.time);
      ctx.globalAlpha = 1;
      if (this.core && !this.fall) this.drawCore(ctx, cam);
      // 드러나는 동안: 짙은 연기가 청소년 앞을 덮고 있다가 걷힌다
      if (veil > 0.01) this.smoke.draw(ctx, cam, 'front', 0.8, veil * 1.6);
    }
    const front = this.game.propImages[V.front];
    if (front) ctx.drawImage(front, Math.round(1152 - cam.x), Math.round(-cam.y));
    this.drawFinaleBack(ctx, cam);
    ctx.restore();
  }
  /** After the actors: smoke under the 청소년 (right of the broken end only), the airborne gajaeman, aura motes. */
  draw(ctx, cam) {
    if (this.disposed) return;
    ctx.save();
    const k = this.giant ? Math.min(1, this.giant.t / SUMMIT.reveal) : 0, veil = this.giant ? 1 - ease(k) : 0;
    this.smoke.draw(ctx, cam, 'front', veil * 0.3);
    // 허공에 떠 있는 가재맨은 연기 위에 또렷이(보라 빛무리와 함께). 등 뒤로 들어가면 안 보인다
    const a = this.actor;
    if (a?.visible && !this.onBack) {
      const x = a.x + a.w / 2 - cam.x, y = a.y + a.h - 50 - cam.y + (a.flyY || 0);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 70);
      glow.addColorStop(0, 'rgba(110,40,180,0.45)'); glow.addColorStop(1, 'rgba(20,6,40,0)');
      ctx.fillStyle = glow; ctx.fillRect(x - 70, y - 70, 140, 140);
      a.draw(ctx, cam);
    }
    for (const m of this.motes) {
      ctx.globalAlpha = Math.max(0, 1 - m.age / m.life); ctx.fillStyle = m.purple ? '#4a2478' : '#050208';
      ctx.fillRect(Math.round(m.x - cam.x), Math.round(m.y - cam.y), m.size, m.size + 1);
    }
    ctx.globalAlpha = 1;
    this.drawFinaleFront(ctx, cam);
    ctx.restore();
  }
  // ── BUILD352 2페이즈 격파 뒤 연출 ──
  img(key) { return this.game.propImages[FINALE.img[key]]; }
  sleep(sec) { let t = 0; return this.waitFor(() => (t += this.game.dt || 0.016) >= sec); }
  /** 전투에서 넘어오는 순간: 2페이즈 모습·코어, 가재맨은 청소년 안, 떨림 */
  enterFinale() {
    this.giant = { t: SUMMIT.reveal }; this.form = 'p2'; this.core = true; this.tremble = 1;
    if (this.actor) this.actor.visible = false;
    // 대치 때의 대각선 자리로(위에서 아래로 형섭·경섭·억빠맨)
    for (const id of ['player', 'gyeongsub', 'ppaman']) {
      const e = id === 'player' ? this.game.player : this.game.entities.find(x => x.id === id), a = this.game.entities.find(x => x.id === `summit_stand_${id}`);
      if (!e) continue;
      if (a) { e.x = a.x + a.w / 2 - e.w / 2; e.y = a.y + a.h - e.h; }
      e.facing = 'right'; e.follow = false;
    }
  }
  setTremble(v) { this.tremble = v; }
  drawCore(ctx, cam) {
    const [cx, cy] = world(P2.core), x = cx - cam.x, y = cy - cam.y, pulse = 1 + 0.08 * Math.sin(this.time * 5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 34 * pulse);
    g.addColorStop(0, 'rgba(255,240,255,0.95)'); g.addColorStop(0.35, 'rgba(190,110,255,0.9)'); g.addColorStop(0.75, 'rgba(90,30,170,0.5)'); g.addColorStop(1, 'rgba(60,10,120,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80);
    ctx.strokeStyle = 'rgba(210,160,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18 * pulse, 0, Math.PI * 2); ctx.stroke();
  }
  /** 청소년가재맨 쪽으로 엄청난 오오라가 모인다(초) */
  gatherAura(seconds = 3) {
    this.gather = { t: 0, d: seconds };
    // 힘 모으는 소리: 영클 레이저 차징 때 쓰던 조합 + 오오라 변신음
    this.game.sound.sfx('captain_transform', { volume: 1 }); this.game.sound.sfx('laser_charge', { volume: 0.9 }); this.game.sound.sfx('cannon_charge', { volume: 0.7 }); this.game.shake = { time: seconds, amp: 2 };
    this.sleep(1.4).then(() => { if (this.gather) { this.game.sound.sfx('laser_charge', { volume: 1 }); this.game.sound.sfx('power', { volume: 0.8 }); } });
    return this.waitFor(() => !this.gather || this.gather.t >= this.gather.d);
  }
  /** 퍼어엉: 릴리즈샷과 함께 발산 — 흰 번쩍, 충격파 여러 겹, 일행이 뒤로 밀려나고 하단 HP 띠가 1 로 깎인다(약 3.5초) */
  releaseBurst() {
    this.gather = null;
    const [cx, cy] = world(P2.core), g = this.game;
    g.sound.sfx('deltarune_release_shoot', { volume: 1 }); g.sound.sfx('explosion', { volume: 1 }); g.sound.sfx('baron_slam', { volume: 0.8 });
    g.fadeTo(1, 0.05, () => g.fadeTo(0, 0.9), 'white');
    g.shake = { time: 2.2, amp: 12 };
    for (let i = 0; i < 6; i++) this.waves.push({ x: cx, y: cy, t: -i * 0.18, life: 1.6 });
    for (let i = 0; i < 80; i++) { const a = Math.random() * Math.PI * 2, sp = 140 + Math.random() * 380; this.fx.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 1.2 + Math.random() * 1.0, r: 6 + Math.random() * 14, dark: Math.random() < 0.5 }); }
    // 하단 HP 띠: 지금 HP → 1
    const ids = ['hyungsub', 'gyeongsub', 'ppaman'];
    this.hud = { t: 0, from: Object.fromEntries(ids.map(id => [id, g.partyHp?.[id] ?? (g.maxHpOf ? g.maxHpOf(id) : 100)])), show: true };
    for (const id of ids) g.partyHp[id] = 1;
    // 일행이 뒤로(왼쪽) 밀려났다 휘청
    const members = ['player', 'gyeongsub', 'ppaman'].map(id => id === 'player' ? g.player : g.entities.find(x => x.id === id)).filter(Boolean);
    this.knock = { t: 0, list: members.map(e => ({ e, x0: e.x })) };
    // 맞는 소리: 크게 두 번
    return this.sleep(0.25).then(() => { g.sound.sfx('hurt', { volume: 1 }); g.sound.sfx('damage', { volume: 1 }); g.sound.sfx('criticalswing', { volume: 0.9 }); g.hurt = 0.6; return this.sleep(0.5); })
      .then(() => { g.sound.sfx('hurt_dr', { volume: 1 }); g.sound.sfx('impact', { volume: 0.8 }); return this.sleep(2.7); });
  }
  hideHud() { if (this.hud) this.hud.show = false; }
  /** 하단 전투식 HP 띠(격파 연출 중 퍼어엉을 맞은 뒤): 체력이 1 로 깎이는 게 보이게 */
  drawHud(ctx) {
    const h = this.hud; if (!h || !h.show) return;
    const g = this.game, ids = ['hyungsub', 'gyeongsub', 'ppaman'], names = { hyungsub: '요플래', gyeongsub: '경섭', ppaman: '억빠맨' }, colors = { hyungsub: '#6fd3ff', gyeongsub: '#ff5c5c', ppaman: '#c8a0ff' };
    const k = Math.min(1, Math.max(0, (h.t - 0.3) / 1.2)), y = 322, cw = 146;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, y - 4, 480, 40);
    ctx.font = '12px "Galmuri11", monospace'; ctx.textBaseline = 'top';
    ids.forEach((id, i) => {
      const x = 20 + i * cw, max = g.maxHpOf ? g.maxHpOf(id) : Math.max(h.from[id], 100), hp = Math.round(h.from[id] + (1 - h.from[id]) * k);
      const face = g.portraits?.[id]; if (face) ctx.drawImage(face, x + 4, y + 2, 26, 26);
      ctx.fillStyle = '#fff'; ctx.fillText(names[id], x + 34, y + 4);
      ctx.fillStyle = '#400'; ctx.fillRect(x + 34, y + 20, 70, 8); ctx.fillStyle = colors[id]; ctx.fillRect(x + 34, y + 20, Math.max(1, Math.round(70 * hp / max)), 8);
      ctx.fillStyle = hp <= 1 ? '#ff5c5c' : '#fff'; ctx.fillText(`${hp}/${max}`, x + 108, y + 18);
      if (k > 0 && k < 1 && Math.floor(h.t * 10) % 2) { ctx.fillStyle = '#ff5c5c'; ctx.fillText(`-${h.from[id] - 1}`, x + 60, y - 14 - k * 10); }
    });
    ctx.restore();
  }
  /** 우웅 — 연기를 걷어내며 거대한 가재맨 칼날이 생겨 일행을 겨눈다 */
  formBlade() {
    const [bx, by] = FINALE.bladeAt, [tx, ty] = FINALE.partyAim;
    this.blade = { x: bx, y: by, ang: Math.atan2(ty - by, tx - bx), a: 0, s: 3.2, mode: 'form', t: 0 };
    for (let i = 0; i < 30; i++) this.fx.push({ x: bx + (Math.random() - 0.5) * 160, y: by + (Math.random() - 0.5) * 60, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, t: 0, life: 1.4 + Math.random(), r: 10 + Math.random() * 12, dark: true });
    this.game.sound.sfx('captain_transform', { volume: 0.9 }); this.game.sound.sfx('laser_charge', { volume: 0.8 }); this.game.sound.sfx('spearappear', { volume: 0.8 }); this.game.shake = { time: 1.4, amp: 3 };
    return this.waitFor(() => this.blade.a >= 1);
  }
  /** 뒤로 한껏 당겼다가 일행에게 날아간다 — 점점 슬로우모션, 닿기 직전 멈춘다(대포알이 막는다) */
  launchBlade() {
    const b = this.blade; b.mode = 'pull'; b.t = 0; b.from = [b.x, b.y];
    this.game.sound.sfx('heavyswing', { volume: 0.9 });
    return this.waitFor(() => b.mode === 'hold');
  }
  /** 쾅! 용준대포알이 날아와 칼을 날려 버린다 */
  cannonSmash() {
    const b = this.blade, cam = this.game.camera;
    this.game.sound.sfx('cannon_guard_fire', { volume: 1 });
    this.balls.push({ x: cam.x - 40, y: b.y - 10, tx: b.x, ty: b.y, t: 0, d: 0.32, onHit: () => {
      this.game.sound.sfx('explosion', { volume: 1 }); this.game.sound.sfx('baron_slam', { volume: 0.9 }); this.game.shake = { time: 0.7, amp: 10 };
      this.booms.push({ x: b.x, y: b.y, t: 0, life: 0.7 });
      b.mode = 'fly'; b.t = 0; b.vx = 520; b.vy = -380;
    } });
    return this.waitFor(() => !this.balls.length);
  }
  showCannon() { this.cannonOn = true; }
  /** 가재맨이 작은 검들을 여러 개 소환해 박용준에게 쏜다 → 바닥에서 바론이 튀어나와 날려 버리고 포효 */
  swordsAtYongjun() {
    const [sx, sy] = world(P2.core), [tx, ty] = FINALE.yongjun;
    this.game.sound.sfx('spearappear', { volume: 0.8 });
    for (let i = 0; i < 7; i++) this.swords.push({ x: sx + (Math.random() - 0.5) * 60, y: sy - 80 + (Math.random() - 0.5) * 60, tx: tx + (Math.random() - 0.5) * 30, ty: ty - 40 + (Math.random() - 0.5) * 30, t: -i * 0.08, d: 0.9, state: 'fly' });
    return this.sleep(0.45);
  }
  baronRise() {
    this.baron = { t: 0, x: FINALE.baron[0], y: FINALE.baron[1] };
    this.game.sound.sfx('baron_eruption', { volume: 1 }); this.game.shake = { time: 0.9, amp: 8 };
    // 날아오던 검들이 튕겨 나간다
    for (const w of this.swords) { w.state = 'knock'; w.vx = -120 - Math.random() * 200; w.vy = -260 - Math.random() * 160; w.spin = (Math.random() - 0.5) * 20; w.kt = 0; }
    return this.sleep(0.8).then(() => this.roar());
  }
  /** 바론 포효(크게 두 번 흔들림) */
  roar() {
    this.game.sound.sfx('baron_roar', { volume: 1 }); this.game.shake = { time: 1.6, amp: 7 };
    if (this.baron) this.baron.roar = 0;
    return this.sleep(1.8);
  }
  /** 포효 뒤 바론은 대포 뒤로 천천히 물러나 그대로 곁에 있는다(사라지지 않는다) */
  baronBack() {
    const b = this.baron; if (!b) return undefined;
    b.move = { t: 0, d: 1.6, fx: b.x, fy: b.y, tx: FINALE.baronRest[0], ty: FINALE.baronRest[1] };
    this.game.sound.sfx('thud', { volume: 0.6 });
    return this.waitFor(() => !b.move);
  }
  /** 대포를 하나 더: 빠르게 날아가 청소년가재맨(코어)에 적중 */
  cannonAtGiant() {
    const [cx, cy] = FINALE.cannon, [gx, gy] = world(P2.core);
    this.game.sound.sfx('cannon_guard_fire', { volume: 1 }); this.recoil = 1; this.booms.push({ x: cx + 60, y: cy - 44, t: 0, life: 0.4 });
    this.balls.push({ x: cx + 60, y: cy - 44, tx: gx, ty: gy, t: 0, d: 0.45, onHit: () => {
      this.game.sound.sfx('explosion', { volume: 1 }); this.game.shake = { time: 0.8, amp: 9 }; this.booms.push({ x: gx, y: gy, t: 0, life: 0.8 }); this.tremble = 1.5;
    } });
    return this.waitFor(() => !this.balls.length).then(() => this.sleep(0.5));
  }
  /** 가재맨이 청소년에게서 빠져나와 위로 살짝 → 청소년이 주먹을 날리게 조종 */
  gajaemanOut() {
    const a = this.actor; if (!a) return undefined;
    const [cx, cy] = world(P2.core), [ox, oy] = FINALE.gjOut;
    a.visible = true; a.facing = 'left'; a.x = cx - a.w / 2; a.y = cy - a.h; this.onBack = false; this.aura = 1;
    this.game.sound.sfx('captain_transform', { volume: 0.6 });
    return this.tweenActor(ox - a.w / 2, oy - a.h, 1.2);
  }
  /** 청소년 주먹이 일행 쪽으로 날아온다 — 쥰희가 막는 자리에서 멈춰 버틴다 */
  punch() {
    // 오른쪽 어깨에서(쥰희까지 약 300px) 뻗는다
    const [gx, gy] = world([V.giant.x + 330, V.giant.y + 130]), [bx, by] = FINALE.block;
    // 뒤로 크게 당겼다가(0.9초) → 쾅 내지른다
    this.arm = { x: gx, y: gy, tx: bx + 30, ty: by - 40, t: -0.9, d: 2.6, hold: false, push: 0 };
    this.game.sound.sfx('power', { volume: 0.7 }); this.tremble = 0.6;
    return this.sleep(0.9).then(() => { this.game.sound.sfx('heavyswing', { volume: 1 }); this.game.sound.sfx('ultraswing', { volume: 0.8 }); this.tremble = 0; });
  }
  /** 주먹이 맞기 직전(비율)까지 오기를 기다린다 */
  armAt(k) { return this.waitFor(() => this.arm && this.arm.t >= this.arm.d * k); }
  blockHit() { this.arm.hold = true; this.arm.t = this.arm.d * 0.84; this.game.fadeTo(0.7, 0.04, () => this.game.fadeTo(0, 0.4), 'white'); this.game.sound.sfx('impact', { volume: 1 }); this.game.sound.sfx('baron_slam', { volume: 0.8 }); this.game.shake = { time: 0.6, amp: 8 }; }
  /** 쥰희가 천천히 밀다가 → 릴리즈샷과 함께 펑! 화면이 잠깐 하얘지고 청소년이 뒤로 넘어간다 */
  pushBack() {
    const arm = this.arm; arm.pushing = true;
    return this.sleep(1.6).then(() => {
      this.game.sound.sfx('deltarune_release_shoot', { volume: 1 }); this.game.sound.sfx('explosion', { volume: 0.8 });
      this.game.fadeTo(1, 0.06, () => this.game.fadeTo(0, 0.7), 'white'); this.game.shake = { time: 1.0, amp: 10 };
      this.arm = null; this.core = false; this.fall = { t: 0 }; this.tremble = 0;
      return this.sleep(1.8);
    });
  }
  /** 가재맨이 하늘을 날아 오른쪽으로 쭉 도망 */
  gajaemanFlee() {
    const a = this.actor; if (!a) return undefined;
    const [fx, fy] = FINALE.flee;
    this.game.sound.sfx('wing', { volume: 0.7 });
    return this.tweenActor(fx, fy, 1.8, k => k * k).then(() => { a.visible = false; this.aura = 0; });
  }
  /** 쥰희가 잠깐 쓰러진다(옆으로 눕힌다) */
  collapse(id) {
    const e = this.game.entities.find(x => x.id === id); if (!e) return undefined;
    this.lying = { e, t: 0 }; this.game.sound.sfx('thud', { volume: 0.7 });
    return this.sleep(0.6);
  }
  updateFinale(s) {
    if (this.hud) this.hud.t += s;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - s * 3);
    if (this.knock) {
      this.knock.t += s; const k = this.knock.t, off = k < 0.35 ? -34 * (k / 0.35) : -34 + 12 * Math.min(1, (k - 0.35) / 0.8);
      for (const m of this.knock.list) m.e.x = m.x0 + off + (k < 1.2 ? Math.round(Math.sin(k * 40) * 1.5) : 0);
      if (k > 1.4) this.knock = null;
    }
    if (this.gather) { this.gather.t += s; const [cx, cy] = world(P2.core); for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 120; this.fx.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.4, vy: -Math.sin(a) * r * 1.4, t: 0, life: 0.7, r: 4 + Math.random() * 6, dark: Math.random() < 0.4, pull: true }); } }
    for (const p of this.fx) { p.t += s; p.x += p.vx * s; p.y += p.vy * s; if (!p.pull) { p.vx *= 0.96; p.vy *= 0.96; p.r += 10 * s; } }
    this.fx = this.fx.filter(p => p.t < p.life);
    for (const w of this.waves) w.t += s; this.waves = this.waves.filter(w => w.t < w.life);
    for (const b of this.booms) b.t += s; this.booms = this.booms.filter(b => b.t < b.life);
    const b = this.blade;
    if (b) {
      b.t += s;
      if (b.mode === 'form') b.a = Math.min(1, b.t / 1.4);
      else if (b.mode === 'pull') {
        // 뒤로 크게 당긴다
        const k = Math.min(1, b.t / 0.8), e = 1 - (1 - k) ** 3;
        b.x = b.from[0] - Math.cos(b.ang) * 70 * e; b.y = b.from[1] - Math.sin(b.ang) * 70 * e;
        if (k >= 1) { b.mode = 'fly'; b.t = 0; b.start = [b.x, b.y]; b.vx = 0; b.vy = 0; b.slow = true; this.game.sound.sfx('ultraswing', { volume: 0.9 }); }
      } else if (b.mode === 'fly' && b.slow) {
        // 빠르게 가다가 점점 슬로우모션 — 닿기 직전(88%)에서 멈춘다
        const [tx, ty] = FINALE.partyAim, t = b.t, p = t < 0.3 ? 0.6 * (t / 0.3) : 0.6 + 0.28 * (1 - Math.exp(-(t - 0.3) * 1.6));
        b.x = b.start[0] + (tx - b.start[0]) * p; b.y = b.start[1] + (ty - b.start[1]) * p;
        if (t > 2.4) { b.mode = 'hold'; b.slow = false; }
      } else if (b.mode === 'fly') {
        // 대포알에 맞고 날아간다
        b.x += b.vx * s; b.y += b.vy * s; b.vy += 500 * s; b.ang += 9 * s; b.a = Math.max(0, 1 - b.t / 1.2);
        if (b.t > 1.2) this.blade = null;
      }
    }
    for (const ball of this.balls) { ball.t += s; if (ball.t >= ball.d && !ball.hit) { ball.hit = true; ball.onHit?.(); } }
    this.balls = this.balls.filter(ball => !ball.hit);
    for (const w of this.swords) {
      w.t += s;
      if (w.state === 'knock') { w.kt += s; w.x += w.vx * s; w.y += w.vy * s; w.vy += 600 * s; }
    }
    this.swords = this.swords.filter(w => w.state !== 'knock' || w.kt < 1.2);
    if (this.baron) {
      const b = this.baron; b.t += s; if (b.roar !== undefined) b.roar += s;
      if (b.move) { b.move.t += s; const k = Math.min(1, b.move.t / b.move.d), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; b.x = b.move.fx + (b.move.tx - b.move.fx) * e; b.y = b.move.fy + (b.move.ty - b.move.fy) * e; if (k >= 1) b.move = null; }
    }
    if (this.arm) {
      // 막히기 전엔 맞기 직전(84%)에서 멈칫 — 쥰희를 기다린다
      this.arm.t = this.arm.hold ? this.arm.t : Math.min(this.arm.t + s, this.arm.d * 0.84);
      if (this.arm.pushing) this.arm.push = Math.min(40, this.arm.push + 18 * s);
    }
    if (this.fall) this.fall.t += s;
    if (this.lying) this.lying.t += s;
  }
  /** 격파 연출 그림(배우 뒤: 대포·바론, 배우 앞: 칼·대포알·주먹·폭발) */
  drawFinaleBack(ctx, cam) {
    const baron = this.img('baron');
    if (this.baron && baron) {
      // 필드 바론과 같은 크기(256×1.125 ≈ 288), 바닥에서 솟아오른다, 포효 때 떨림
      const b = this.baron, k = Math.min(1, b.t / 0.6), e = 1 - (1 - k) ** 3, s = FINALE.baronScale, w = baron.width * s, h = baron.height * s, rise = (1 - e) * h;
      const jit = b.roar !== undefined && b.roar < 1.4 ? Math.round(Math.sin(b.roar * 60) * 3) : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(b.x - w - cam.x, b.y - h * 1.3 - cam.y, w * 2, h * 1.3); ctx.clip();
      ctx.drawImage(baron, Math.round(b.x - w / 2 - cam.x + jit), Math.round(b.y - h - cam.y + rise), Math.round(w), Math.round(h)); ctx.restore();
    }
    // 대포는 바론 앞
    const cannon = this.img('cannon');
    if (this.cannonOn && cannon) { const [x, y] = FINALE.cannon, w = cannon.width, h = cannon.height, kick = this.recoil > 0 ? Math.round(this.recoil * 14) : 0; ctx.drawImage(cannon, Math.round(x - w / 2 - cam.x - kick), Math.round(y - h + 18 - cam.y), w, h); }
  }
  drawFinaleFront(ctx, cam) {
    const sword = this.img('sword'), shot = this.img('shot'), arm = this.img('arm');
    if (this.lying) {
      // 쥰희가 옆으로 눕는다
      const e = this.lying.e, k = Math.min(1, this.lying.t / 0.35), fx = e.x + e.w / 2 - cam.x, fy = e.y + e.h - cam.y;
      e.visible = true; ctx.save(); ctx.translate(fx, fy); ctx.rotate(-Math.PI / 2 * k); ctx.translate(-fx, -fy); e.draw(ctx, cam); ctx.restore(); e.visible = false;
    }
    for (const p of this.fx) { ctx.globalAlpha = Math.max(0, 1 - p.t / p.life) * 0.8; ctx.fillStyle = p.dark ? '#0c0616' : '#5a1e9a'; const r = Math.round(p.r); ctx.fillRect(Math.round(p.x - r - cam.x), Math.round(p.y - r / 2 - cam.y), r * 2, r); }
    ctx.globalAlpha = 1;
    if (this.gather) {
      const [cx, cy] = world(P2.core), k = Math.min(1, this.gather.t / this.gather.d), x = cx - cam.x, y = cy - cam.y;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + 120 * k); g.addColorStop(0, `rgba(230,200,255,${0.4 + 0.5 * k})`); g.addColorStop(0.4, `rgba(120,40,220,${0.35 + 0.3 * k})`); g.addColorStop(1, 'rgba(20,4,40,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 170, y - 170, 340, 340);
    }
    for (const w of this.waves) { if (w.t < 0) continue; const k = w.t / w.life; ctx.strokeStyle = `rgba(230,200,255,${1 - k})`; ctx.lineWidth = 6 * (1 - k) + 2; ctx.beginPath(); ctx.arc(w.x - cam.x, w.y - cam.y, 20 + 420 * k, 0, Math.PI * 2); ctx.stroke(); }
    const b = this.blade;
    if (b && sword) {
      const tint = this.tintSword(sword), h = 90 * b.s, w = h * sword.width / sword.height;
      ctx.save(); ctx.globalAlpha = b.a; ctx.translate(Math.round(b.x - cam.x), Math.round(b.y - cam.y)); ctx.rotate(b.ang - Math.PI / 2);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.6); glow.addColorStop(0, 'rgba(160,80,255,0.45)'); glow.addColorStop(1, 'rgba(60,10,120,0)'); ctx.fillStyle = glow; ctx.fillRect(-h * 0.6, -h * 0.6, h * 1.2, h * 1.2);
      ctx.drawImage(tint, -w / 2, -h / 2, w, h); ctx.restore();
    }
    for (const w of this.swords) {
      if (w.t < 0 || !sword) continue;
      let x, y, ang;
      if (w.state === 'fly') { const k = Math.min(1, w.t / w.d); x = w.x + (w.tx - w.x) * k; y = w.y + (w.ty - w.y) * k; ang = Math.atan2(w.ty - w.y, w.tx - w.x); }
      else { x = w.x; y = w.y; ang = (w.ang ?? 0) + w.spin * w.kt; }
      if (w.state === 'fly' && w.t > w.d) continue;
      ctx.save(); ctx.globalAlpha = w.state === 'knock' ? Math.max(0, 1 - w.kt / 1.2) : 1; ctx.translate(Math.round(x - cam.x), Math.round(y - cam.y)); ctx.rotate(ang - Math.PI / 2); const h = 34, ww = h * sword.width / sword.height; ctx.drawImage(this.tintSword(sword), -ww / 2, -h / 2, ww, h); ctx.restore();
      if (w.state === 'fly') { w.x2 = x; w.y2 = y; w.ang = ang; }
    }
    for (const ball of this.balls) {
      if (!shot) continue;
      const k = Math.min(1, ball.t / ball.d), x = ball.x + (ball.tx - ball.x) * k, y = ball.y + (ball.ty - ball.y) * k - Math.sin(k * Math.PI) * 20, sz = 30;
      ctx.fillStyle = 'rgba(255,200,120,0.35)'; for (let g = 1; g <= 3; g++) ctx.fillRect(Math.round(x - (ball.tx - ball.x) * 0.04 * g - cam.x - 6), Math.round(y - cam.y - 4), 12, 8);
      ctx.drawImage(shot, Math.round(x - sz / 2 - cam.x), Math.round(y - sz / 2 - cam.y), sz, sz);
    }
    for (const bm of this.booms) {
      const k = bm.t / bm.life, x = bm.x - cam.x, y = bm.y - cam.y;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.arc(x, y, 14 + 50 * k, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, 20 + 80 * k, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    if (this.arm && arm) {
      // 청소년 어깨에서 쥰희 쪽으로 쭉 뻗는 보라 팔(그림은 어깨→주먹이 +x, 어깨 높이 130): 막힌 자리에서 버티다 밀려난다
      const a = this.arm, k = Math.max(0, Math.min(1, a.t / a.d)), e = a.t < 0 ? -0.15 * Math.min(1, (a.t + 0.9) / 0.9) : 1 - (1 - k) ** 1.6;
      const fx = a.x + (a.tx - a.x) * e + a.push, fy = a.y + (a.ty - a.y) * e, jit = a.hold ? Math.round(Math.sin(this.time * 70) * 2) : 0;
      const dx = fx - a.x, dy = fy - a.y, dist = Math.max(20, Math.hypot(dx, dy)), s = dist / (arm.width - 20);
      ctx.save(); ctx.translate(Math.round(a.x - cam.x + jit), Math.round(a.y - cam.y)); ctx.rotate(Math.atan2(dy, dx));
      // 왼쪽을 향하면 위아래가 뒤집히지 않게
      if (dx < 0) ctx.scale(1, -1);
      ctx.drawImage(this.tintSword(arm), -10 * s, -130 * s, arm.width * s, arm.height * s); ctx.restore();
    }
  }
  /** 보라로 물들인 그림(칼·팔) — 한 번 만들어 둔다 */
  tintSword(img) {
    this._tint = this._tint || new Map();
    let c = this._tint.get(img);
    if (!c) {
      try { c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(140,70,240,0.75)'; x.fillRect(0, 0, c.width, c.height); } catch { c = img; }
      this._tint.set(img, c);
    }
    return c;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.game.castleSummit === this) this.game.castleSummit = null;
  }
}
