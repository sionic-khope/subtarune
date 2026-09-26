import { CHAR_SCALE } from '../world/world.js';
import { RISE, tickRiseClock, updateRise, drawRise, drawCell, Backlight, SunRays, Motes, drawSunsetSky, glow } from './castle-rise.js';

/**
 * BUILD358 after the summit (사용자 2026-09-26 브리핑): the straight road below the summit (kind 'road') and the raft
 * pool at the foot of the colossal wall (kind 'raft'). One scene class serves both maps through `meta.descent`.
 * road: 가재맨 flees right with his aura, the party lands at the top-left, 섭 몬스터 leap in from above/below each stretch
 *       and the 편집노조 knock them away, four swords at the end fall to 영클's three lasers.
 * raft: 가재맨 rises up the wall, 요플래 boards the raft, 경섭·억빠맨 dive under it, gather strength for two seconds
 *       and jump — the raft climbs the wall with all three to the ledge on top.
 */
export const DESCENT = Object.freeze({
  sword: 'assets/props/cathedral323_sword.png', swordW: 40, swordH: 160,
  // 구간마다 누가 어디서 들어오는가(사용자 원문): 1 오른쪽 위 비데 · 2 왼쪽 아래 파크가디언 · 3 오른쪽 위 뚜울라·도트마리오
  allies: { 1: [['road_bidet', 'upRight']], 2: [['road_park', 'downLeft']], 3: [['road_ttuulla', 'upRight'], ['road_mario', 'upRight']] },
  laserLife: 0.3,
  raftScale: 1.4, charge: 2.0, launch: 2.6,
});

const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeOut = k => 1 - (1 - k) ** 3;
const lerpN = (a, b, k) => a + (b - a) * k;

export class CastleDescent {
  constructor(game, { rnd = Math.random } = {}) {
    this.game = game; this.map = game.map; this.rnd = rnd; this.disposed = false;
    this.meta = game.map.def.meta.descent; this.kind = this.meta.kind;
    this.time = 0; this.jobs = []; this.motes = []; this.bits = []; this.lasers = []; this.swords = [];
    this.gj = game.entities.find(e => e.id === this.meta.gajaeman) || null; this.aura = 0; this.trail = [];
    this.tracking = null;
    // 뗏목: 가운데 떠 있고, 잠수한 사람은 물결선 아래가 안 보이게 따로 그린다
    const [px, py, pw, ph] = this.meta.pool || [0, 0, 0, 0];
    this.raft = this.kind === 'raft' ? { x: px + pw / 2, y: py + ph / 2 + 4, bob: true } : null;
    this.divers = [];
    void game.sound.loadSfxFiles?.(['wing', 'thud', 'jump', 'impact', 'captain_transform', 'spearappear', 'laser_zap', 'laser_charge', 'break1', 'splash', 'maillard_splash', 'maillard_water_lift', 'power', 'rumble', 'mario_jump', 'heavyswing', 'chime']);
    this.backlight = new Backlight(); this.rays = new SunRays(); this.warm = new Motes(rnd); this.rise = null; this.tumble = null; this.dust = [];
    if (this.kind === 'raft') void game.waitForMap?.('gajaeman_castle_sunset')?.catch?.(() => {});
    if (this.kind === 'sunset' && game.player) game.player.def.visualScale = this.meta.charScale || 1;
    if (this.kind === 'sunset') { void game.sound.loadSfxFiles?.(['swing', 'whoosh', 'switch_noise', 'thud', 'wing', 'captain_transform', 'great_shine']); this.ground = null; }
    // 다음 맵(뗏목 웅덩이)을 미리 준비해 둔다 — 페이드 뒤 검은 화면이 길게 남지 않게
    if (this.kind === 'road') void game.waitForMap?.('gajaeman_castle_raft')?.catch?.(() => {});
    // 이미 올라간 저장이면 뗏목은 꼭대기 턱에
    if (this.raft && game.flags?.castle_raft_launched) { const [lx, ly, lw] = this.meta.ledge; this.raft = { x: lx + lw / 2, y: ly + 76, bob: false }; }
  }
  get snapshot() {
    return { kind: this.kind, swords: this.swords.filter(s => !s.dead).length, lasers: this.lasers.length, divers: this.divers.map(d => d.e.id),
      raft: this.raft ? { x: Math.round(this.raft.x), y: Math.round(this.raft.y) } : null, gajaeman: !!this.gj?.visible };
  }
  sfx(name, volume = 0.7) { this.game.sound.sfx(name, { volume }); }
  ent(id) { return id === 'player' ? this.game.player : this.game.entities.find(e => e.id === id); }
  feet(e) { return [e.x + e.w / 2, e.y + e.h]; }
  setFeet(e, x, y) { e.x = Math.round(x - e.w / 2); e.y = Math.round(y - e.h); }
  /** A timed job stepped in update(); resolves when it has run its course. */
  job(d, step) {
    return new Promise(resolve => { this.jobs.push({ t: 0, d, step, resolve }); });
  }
  /** Arc an actor's feet from → to with a hop of `height` (world px, no snapping to walkable tiles). */
  arc(e, from, to, height, d, curve = k => k) {
    if (!e) return Promise.resolve();
    e.visible = true; e.moving = false;
    return this.job(d, k => {
      const c = curve(k);
      this.setFeet(e, from[0] + (to[0] - from[0]) * c, from[1] + (to[1] - from[1]) * c);
      e.hopY = Math.round(Math.sin(Math.PI * k) * height);
      if (k >= 1) e.hopY = 0;
    });
  }
  delay(seconds) { return this.job(seconds, () => {}); }
  track(fn) { this.tracking = fn; this.game.camera.locked = true; }
  untrack() { this.tracking = null; }
  band() { return this.meta.band; }
  camera() { return this.game.camera; }

  // ── 가재맨 ────────────────────────────────────────────────
  /** 가재맨이 오오라와 함께 왼쪽에서 오른쪽으로 날아간다(길: 화면을 가로질러 사라짐 / 뗏목: 벽 앞에서 멈춤). */
  gajaemanDash(from, to, d) {
    const a = this.gj; if (!a) return Promise.resolve();
    a.visible = true; a.facing = 'right'; this.aura = 2; this.trail = [];
    this.setFeet(a, ...from);
    this.sfx('wing', 0.8); this.sfx('captain_transform', 0.5);
    return this.job(d, k => this.setFeet(a, from[0] + (to[0] - from[0]) * ease(k), from[1] + (to[1] - from[1]) * ease(k)));
  }
  /** 벽 앞에서 위로 쭉 상승해 사라진다(카메라가 조금 따라 올라간다). */
  gajaemanRise(height, d) {
    const a = this.gj; if (!a) return Promise.resolve();
    const [x, y] = this.feet(a);
    this.sfx('wing', 0.8); this.sfx('power', 0.5);
    return this.job(d, k => this.setFeet(a, x, y - height * k * k)).then(() => { a.visible = false; this.aura = 0; this.trail = []; });
  }
  hideGajaeman() { if (this.gj) this.gj.visible = false; this.aura = 0; this.trail = []; }

  // ── 길: 섭 몬스터와 편집노조 ──────────────────────────────
  /** 이 구간의 섭 몬스터가 길 위·아래 허공에서 뛰어올라 일행 앞(오른쪽)에 내려선다. */
  ambush(zone) {
    const p = this.game.player, [px, py] = this.feet(p), [top, bottom] = this.band();
    const list = this.meta.monsters.filter(m => m.zone === zone);
    let tops = 0, bottoms = 0;
    const jobs = list.map((m, i) => {
      const e = this.ent(m.id); if (!e) return Promise.resolve();
      const up = m.side === 'top', n = up ? tops++ : bottoms++;
      const lx = px + (up ? 110 + n * 110 : 180 + n * 90);
      const ly = Math.max(top + 30, Math.min(bottom - 6, up ? py - 34 - n * 6 : py + 62));
      m.land = [lx, ly];
      const sx = lx + 60, sy = up ? top - 150 : bottom + 170;
      e.visible = true; e.spin = 0; e.flyX = 0; e.hopY = 0; e.dead = false;
      const place = (x, y) => { e.x = Math.round(x - m.w / 2); e.y = Math.round(y - m.h); };
      place(sx, sy);
      return this.delay(i * 0.18).then(() => {
        this.sfx('wing', 0.5);
        return this.job(0.55, k => { place(sx + (lx - sx) * k, sy + (ly - sy) * k); e.hopY = Math.round(Math.sin(Math.PI * k) * (up ? 30 : 90)); })
          .then(() => { e.hopY = 0; this.sfx('thud', 0.6); this.game.shake = { time: 0.15, amp: 2 }; });
      });
    });
    return Promise.all(jobs);
  }
  /** 몬스터들이 일행 쪽으로 한 발 다가선다. */
  creep(zone, by = 34) {
    const list = this.meta.monsters.filter(m => m.zone === zone).map(m => [m, this.ent(m.id)]).filter(([, e]) => e);
    const start = list.map(([, e]) => e.x);
    return this.job(0.6, k => list.forEach(([m, e], i) => { e.x = Math.round(start[i] - by * ease(k)); e.hopY = Math.round(Math.abs(Math.sin(k * Math.PI * 2)) * 4); }));
  }
  /** 편집노조가 들어온다: 오른쪽 위 허공 / 왼쪽 아래 허공에서 크게 뛰어 몬스터와 일행 사이에 착지. */
  allyIn(zone) {
    const p = this.game.player, [px, py] = this.feet(p), [top, bottom] = this.band(), cam = this.camera();
    const list = DESCENT.allies[zone] || [];
    return Promise.all(list.map(([id, from], i) => {
      const e = this.ent(id); if (!e) return Promise.resolve();
      const tx = px + 64 + i * 26, ty = Math.max(top + 30, Math.min(bottom - 6, py + (i ? 22 : -10)));
      const start = from === 'upRight' ? [cam.x + 520, top - 170] : [cam.x - 40, bottom + 190];
      e.facing = 'right';
      return this.delay(i * 0.22).then(() => {
        this.sfx(id === 'road_mario' ? 'mario_jump' : 'jump', 0.7);
        return this.arc(e, start, [tx, ty], from === 'upRight' ? 60 : 140, 0.75, k => k);
      }).then(() => { this.sfx('thud', 0.8); this.game.shake = { time: 0.22, amp: 3 }; });
    }));
  }
  /** 몬스터가 전부 뒤로 튕겨 날아간다(위쪽 것은 위로, 아래쪽 것은 아래로). */
  knock(zone) {
    const list = this.meta.monsters.filter(m => m.zone === zone).map(m => [m, this.ent(m.id)]).filter(([, e]) => e && e.visible);
    this.sfx('impact', 0.9); this.sfx('heavyswing', 0.6); this.game.shake = { time: 0.3, amp: 4 };
    const v = list.map(([m], i) => ({ vx: 420 + i * 70, vup: m.side === 'top' ? 640 : 260, fall: m.side === 'top' ? 1500 : 1900, spin: (i % 2 ? -1 : 1) * 14 }));
    let air = list.map(() => 0), fx = list.map(() => 0);
    return this.job(1.1, (k, dt) => list.forEach(([, e], i) => {
      fx[i] += v[i].vx * dt; air[i] += v[i].vup * dt; v[i].vup -= v[i].fall * dt;
      e.flyX = Math.round(fx[i]); e.hopY = Math.round(air[i]); e.spin = (e.spin || 0) + v[i].spin * dt;
      if (k >= 1) { e.visible = false; e.flyX = 0; e.hopY = 0; e.spin = 0; }
    }));
  }

  // ── 길 끝: 검 넷과 영클 레이저 ────────────────────────────
  /** 화면 오른쪽에 검 네 자루가 보라 빛과 함께 나타나 일행을 겨눈다. */
  summonSwords() {
    const p = this.game.player, [, py] = this.feet(p), cam = this.camera(), [top, bottom] = this.band();
    const ys = [-70, -24, 22, 66].map(dy => Math.max(top + 20, Math.min(bottom - 10, py - 30 + dy)));
    this.swords = ys.map((y, i) => ({ x: cam.x + 420 - (i % 2) * 26, y, appear: 0, delay: i * 0.18, phase: 'hover', dead: false, vx: 0, t: 0 }));
    return this.job(1.3, k => this.swords.forEach(s => {
      const before = s.appear; s.appear = clamp01((k * 1.3 - s.delay) / 0.4);
      if (before <= 0 && s.appear > 0) this.sfx('spearappear', 0.45);
    }));
  }
  /** 영클이 왼쪽 위 뒤편에서 날아와 일행 뒤에 선다. */
  youngcleIn() {
    const e = this.ent('road_youngcle'), p = this.game.player, [px, py] = this.feet(p), cam = this.camera();
    if (!e) return Promise.resolve();
    e.facing = 'right';
    this.sfx('wing', 0.7);
    return this.arc(e, [cam.x - 50, py - 170], [px - 36, py - 58], 30, 0.7, easeOut);
  }
  /** 검들이 일행에게 날아오고, 영클이 세 번 쏴서 떨어뜨린다(세 번째 빔은 남은 둘을 한꺼번에). */
  volley() {
    const y = this.ent('road_youngcle'), p = this.game.player, [px] = this.feet(p);
    const plan = [[0.3, [1]], [0.6, [2]], [0.9, [0, 3]]];
    let fired = 0;
    this.swords.forEach((s, i) => { s.phase = 'fly'; s.vx = -(200 + i * 10); });
    this.sfx('heavyswing', 0.7);
    return this.job(1.7, (k, dt) => {
      const t = k * 1.7;
      for (const s of this.swords) if (!s.dead) s.x = Math.max(px + 90, s.x + s.vx * dt);
      while (fired < plan.length && t >= plan[fired][0]) {
        const targets = plan[fired][1].map(i => this.swords[i]).filter(s => s && !s.dead);
        const from = y ? [y.x + y.w / 2 + 16, y.y - 30 + (y.flyY || 0)] : [px - 40, 200];
        for (const s of targets) {
          this.lasers.push({ from, to: [s.x, s.y], age: 0 });
          s.dead = true; this.burst(s.x, s.y - 20, 12);
        }
        this.sfx('laser_zap', 0.7); this.sfx('break1', 0.5); this.game.shake = { time: 0.12, amp: 2 };
        fired++;
      }
    });
  }
  burst(x, y, n, color) {
    for (let i = 0; i < n; i++) this.bits.push({ x, y, vx: Math.cos(i * 2.39996) * (50 + i * 10), vy: -110 - i * 8, age: 0, life: 1.1, size: 2 + i % 3, color: color || (i % 2 ? '#b89cff' : '#2a1d3a'), g: 300 });
  }

  // ── 뗏목 ──────────────────────────────────────────────────
  /** 요플래가 가운데 뗏목으로 뛰어 올라탄다. */
  board() {
    const p = this.game.player, r = this.raft;
    const from = this.feet(p);
    p.facing = 'right';
    this.sfx('jump', 0.7);
    return this.arc(p, from, [r.x, r.y + 4], 34, 0.6).then(() => { this.sfx('thud', 0.6); this.sfx('splash', 0.4); this.splash(r.x, r.y + 14, 10); this.raft.dip = 0.4; this.onRaft = p; });
  }
  /** 물 속(뗏목 가장자리 밑)으로 뛰어든다 — 물결선 아래는 안 보인다. */
  dive(id, side) {
    const e = this.ent(id), r = this.raft; if (!e) return Promise.resolve();
    const tx = r.x + side * 46, ty = r.y + 14;
    e.facing = side < 0 ? 'right' : 'left';
    this.sfx('jump', 0.6);
    return this.arc(e, this.feet(e), [tx, ty], 30, 0.55).then(() => {
      this.sfx('splash', 0.8); this.splash(tx, ty - 4, 14);
      this.divers.push({ e, side, depth: 0.5, x: tx, y: ty });
      e.visible = false;
    });
  }
  /** 2초 동안 물 속에서 부들부들 떨며 가라앉아 기를 모은다(보라·하늘 빛 입자가 모여든다). */
  gather(d = DESCENT.charge) {
    this.sfx('rumble', 0.8); this.sfx('laser_charge', 0.5); this.gathering = true;
    return this.job(d, (k, dt) => {
      for (const v of this.divers) { v.depth = 0.5 + 0.38 * k; v.jx = Math.round(Math.sin(this.time * 70 + v.side) * 1.5); }
      this.game.shake = { time: 0.05, amp: 1 + k * 1.5 };
      if (this.rnd() < 0.8) for (const v of this.divers) {
        const a = this.rnd() * Math.PI * 2, R = 40 + this.rnd() * 30;
        this.motes.push({ x: v.x + Math.cos(a) * R, y: v.y - 10 + Math.sin(a) * R * 0.6, tx: v.x, ty: v.y - 6, age: 0, life: 0.5, size: 2 + (this.rnd() < 0.3 ? 1 : 0), color: this.rnd() < 0.5 ? '#9fe8ff' : '#c9a0ff' });
      }
      if (this.rnd() < 0.3) { const v = this.divers[Math.floor(this.rnd() * this.divers.length)]; if (v) this.bits.push({ x: v.x + (this.rnd() - 0.5) * 16, y: v.y - 4, vx: 0, vy: -30, age: 0, life: 0.5, size: 2, color: '#bfe6ff', g: 0 }); }
    }).then(() => { this.gathering = false; });
  }
  /** 동시에 점프! 뗏목이 요플래를 태우고 벽을 따라 치솟는다(둘은 뗏목 밑을 받치고 함께) — RISE.handoff 뒤 화면 전체 상승으로. */
  launch() {
    const r = this.raft, p = this.game.player;
    const riders = this.divers.map(v => ({ e: v.e, side: v.side }));
    for (const v of riders) { v.e.visible = true; v.e.hopY = 0; }
    this.divers = []; r.bob = false;
    this.sfx('splash', 0.5);
    this.splash(r.x, r.y + 10, 30); this.game.shake = { time: 0.3, amp: 3 };
    // 뛰는 순간부터 요플래는 상승 자세 — 뗏목과 둘을 발 아래 두고 빠르게 솟는다(뒤에 페이드 → 화면 전체 상승)
    this.launching = true; p.visible = false;
    let v = 300;
    this.track(() => ({ x: r.x, y: r.y - 66 }));
    return this.job(1.3, (k, dt) => {
      v = Math.min(950, v + 760 * dt); r.y -= v * dt;
      this.setFeet(p, r.x, r.y + 4);
      for (const w of riders) this.setFeet(w.e, r.x + w.side * 34, r.y + 34);
      if (this.rnd() < 0.7) this.bits.push({ x: r.x + (this.rnd() - 0.5) * 60, y: r.y + 30, vx: (this.rnd() - 0.5) * 40, vy: 80, age: 0, life: 0.5, size: 2, color: '#9fd6ff', g: 200 });
    });
  }
  /** 화면 전체 상승(성벽 → 노을 바다) — 곡 위치가 RISE.flash 에 닿으면 끝난다(뒤에 흰 번쩍임·맵 전환). */
  ascend() {
    this.launching = false;
    this.rise ||= { d: 0, spin: 0, alpha: 0, motes: new Motes(this.rnd), rays: this.rays, backlight: this.backlight };
    return this.waitRise(RISE.flash);
  }
  /** 곡 위치(game.riseT)가 at 초에 닿을 때까지 기다린다. */
  waitRise(at) { return new Promise(resolve => { this.jobs.push({ t: 0, d: Infinity, until: () => (this.game.riseT ?? 0) >= at, step: () => {}, resolve }); }); }
  // ── 노을 땅: 앞덤블링 도착 ─────────────────────────────
  /** 필드에서 서 있는 요플래의 그려지는 키(px) — 착지 자세를 같은 크기로 */
  standH() { const sp = this.game.player?.sprite; return (sp?.fh ? Math.round(sp.fh / sp.px * CHAR_SCALE) : 52) * (this.meta.charScale || 1); }
  /**
   * 가재맨이 먼저 올라와 서 있다가 오른쪽으로 도망가고, 요플래가 화면 앞(땅 아래 앞쪽)에서 동그랗게 앞덤블링하며 천천히 올라와
   * 곡 64초(RISE.land)에 무릎 꿇고 착지 — 챱.
   */
  arrive() {
    const g = this.game, p = g.player, a = this.gj, [lx, ly] = this.meta.land;
    p.visible = false;
    for (const id of ['gyeongsub', 'ppaman']) { const e = this.ent(id); if (e) e.visible = false; }
    if (a) { a.visible = true; a.facing = 'left'; this.setFeet(a, ...this.meta.gajaemanAt); this.aura = 1; }
    const start = RISE.land - RISE.tumble;
    this.tumble = { u: 0, trail: [], landed: 0, flips: 0 };
    let fled = false;
    return new Promise(resolve => this.jobs.push({ t: 0, d: Infinity, step: () => {}, resolve, until: () => {
      const T = g.riseT ?? 0, tb = this.tumble;
      if (!fled && a && T >= RISE.mapAt + 1.4) {
        fled = true;
        const [ax, ay] = this.feet(a);
        this.gajaemanDash([ax, ay], [ax + 560, ay - 110], 2.6).then(() => this.hideGajaeman());
      }
      tb.u = clamp01((T - start) / (RISE.land - start));
      // 한 바퀴 돌 때마다 착 — 바람 가르는 소리
      const flips = Math.floor(RISE.tumbleTurns * (1 - (1 - tb.u) ** 1.3));
      if (T >= start && flips > tb.flips) { tb.flips = flips; this.sfx(flips % 2 ? 'swing' : 'whoosh', 0.5); }
      if (!tb.landed && T >= RISE.land) {
        tb.landed = T;
        this.sfx('switch_noise', 0.9); this.sfx('thud', 0.3); g.shake = { time: 0.18, amp: 2 };
        for (let i = 0; i < 14; i++) this.dust.push({ x: lx + (i - 6.5) * 3, y: ly - 2, vx: (i - 6.5) * (10 + this.rnd() * 14), vy: -12 - this.rnd() * 22, age: 0, life: 0.7 + this.rnd() * 0.4, s: 2 + (i % 3) });
      }
      if (tb.landed && T >= tb.landed + 1.5) {
        p.visible = true; p.facing = 'right'; this.setFeet(p, lx, ly); p.trail = [];
        this.tumble = null; g.riseT = null;
        return true;
      }
      return false;
    } }));
  }
  /** 앞덤블링(동그라미 궤적 + 몸 회전 + 잔상) → 웅크린 착지 → 무릎 꿇기. world 좌표. */
  drawTumble(ctx, cam, bare = false) {
    const tb = this.tumble; if (!tb) return;
    const img = this.game.propImages[RISE.landSheet]; if (!img) return;
    const [lx, ly] = this.meta.land, k = this.standH() / 101, cellH = img.height * k;
    const at = (x, y) => [x - cam.x, y - cam.y];
    if (tb.landed) { const [x, y] = at(lx, ly); drawCell(ctx, img, 3, x, y, cellH); return; }
    const u = tb.u, split = 0.62;
    if (u <= 0) return;
    if (u > 0.965) { const [x, y] = at(lx, ly); drawCell(ctx, img, 2, x, y, cellH); return; }
    // 땅 아래 화면 앞에서 튀어 올라 → 정점 → 착지 자리로. 동그라미 궤적을 그리며 몸이 빙글빙글(초당 3바퀴 남짓)
    const cy = u < split ? lerpN(this.map.pxH + 60, 150, 1 - (1 - u / split) ** 2) : lerpN(150, ly - cellH * 0.45, ((u - split) / (1 - split)) ** 2);
    const cx = lerpN(lx - 70, lx, u);
    const theta = Math.PI * 2 * RISE.tumbleTurns * (1 - (1 - u) ** 1.3), R = 16 * (1 - u) + 4, z = lerpN(1.6, 1, 1 - (1 - u) ** 2);
    const bx = cx + Math.sin(theta) * R, by = cy - Math.cos(theta) * R;
    if (!bare) {
      tb.trail.unshift([bx, by, theta, z]); tb.trail.length = Math.min(tb.trail.length, 8);
      // 회전 바람: 뒤따르는 잔상 + 바깥으로 흩어지는 흰 바람 덩어리
      for (let i = 7; i >= 1; i--) { const t = tb.trail[i]; if (!t) continue; const [x, y] = at(t[0], t[1]); ctx.save(); ctx.globalAlpha = 0.28 * (1 - i / 8); drawCell(ctx, this.backlight.tinted?.(img, 'rgba(255,230,200,1)', 'trail') || img, 0, x, y, cellH * t[3] * 0.92, { angle: t[2], pivotY: 0.5 }); ctx.restore(); }
      if (this.rnd() < 0.9) for (let n = 0; n < 2; n++) { const a = theta + Math.PI * (0.5 + n) + (this.rnd() - 0.5) * 0.6, rr = cellH * z * 0.55; this.dust.push({ x: bx + Math.cos(a) * rr, y: by + Math.sin(a) * rr, vx: -Math.sin(a) * 90, vy: Math.cos(a) * 90, age: 0, life: 0.28, s: 2 + (n % 2), wind: true }); }
    }
    const [x, y] = at(bx, by);
    drawCell(ctx, img, 0, x, y, cellH * z * 0.92, { angle: theta, pivotY: 0.5 });
  }
  /** 검은 땅(참고 그림 비율: 위 40% 하늘 · 넓은 윗면 · 앞 테두리 · 아래 띠) — 한 번 그려 둔다. */
  groundCanvas() {
    if (this.ground) return this.ground;
    const m = this.meta, w = this.map.pxW, top = m.groundTop, edge = m.edgeY, h = this.map.pxH - top;
    try { this.ground = document.createElement('canvas'); this.ground.width = w; this.ground.height = h; } catch { return null; }
    const x = this.ground.getContext('2d');
    let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    x.fillStyle = '#060408'; x.fillRect(0, 0, w, edge - top);
    // 윗면: 멀수록(위) 해빛을 받아 살짝 따뜻하게
    const sheen = x.createLinearGradient(0, 0, 0, 40); sheen.addColorStop(0, 'rgba(120,60,70,0.28)'); sheen.addColorStop(1, 'rgba(40,20,40,0)');
    x.fillStyle = sheen; x.fillRect(0, 0, w, 40);
    for (let i = 0; i < w * 0.9; i++) { const px = Math.floor(r() * w / 2) * 2, py = Math.floor(r() * (edge - top) / 2) * 2; x.fillStyle = r() < 0.5 ? '#0e0b16' : '#140f1c'; x.fillRect(px, py, 2 + (r() < 0.3 ? 2 : 0), 2); }
    // 앞 테두리
    x.fillStyle = '#1a1222'; x.fillRect(0, edge - top, w, 12);
    const rim = x.createLinearGradient(0, edge - top - 2, 0, edge - top + 6); rim.addColorStop(0, 'rgba(255,170,110,0)'); rim.addColorStop(0.4, 'rgba(255,170,110,0.35)'); rim.addColorStop(1, 'rgba(255,170,110,0)');
    x.fillStyle = rim; x.fillRect(0, edge - top - 2, w, 8);
    for (let i = 0; i < w / 6; i++) { x.fillStyle = r() < 0.5 ? '#2a1c30' : '#0f0a14'; x.fillRect(Math.floor(r() * w / 2) * 2, edge - top + 2 + Math.floor(r() * 4) * 2, 4, 2); }
    // 아래 띠
    x.fillStyle = '#040206'; x.fillRect(0, edge - top + 12, w, h - (edge - top + 12));
    for (let i = 0; i < w * 0.25; i++) { x.fillStyle = r() < 0.5 ? '#0d0812' : '#120b18'; x.fillRect(Math.floor(r() * w / 2) * 2, edge - top + 14 + Math.floor(r() * (h - edge + top - 14) / 2) * 2, 2 + (r() < 0.2 ? 4 : 0), 2); }
    return this.ground;
  }
  sunScreen(cam) { const m = this.meta, shift = -cam.x * 0.18; return [240 + shift + m.sunDx, m.horizonY - cam.y]; }
  drawSunset(ctx, cam) {
    const m = this.meta, shift = -cam.x * 0.18;
    drawSunsetSky(ctx, this.game.propImages, { horizonY: m.horizonY - cam.y, width: 640, shiftX: shift, sunX: this.sunScreen(cam)[0], sunD: 64, time: this.time, rays: this.rays, rayStrength: 0.8 });
    const gc = this.groundCanvas();
    if (gc) ctx.drawImage(gc, Math.round(-cam.x), Math.round(m.groundTop - cam.y));
    // 역광이라 그림자는 앞(아래)으로 길게, 부드럽게
    for (const e of this.chars()) {
      const [fx, fy] = this.feet(e), x = fx - cam.x, y = fy - cam.y;
      const g = ctx.createRadialGradient(x, y + 10, 2, x, y + 10, 26); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(x, y + 10); ctx.scale(0.8, 0.55); ctx.translate(-x, -(y + 10)); ctx.fillStyle = g; ctx.fillRect(x - 26, y - 16, 52, 52); ctx.restore();
    }
  }
  chars() { return this.game.entities.filter(e => e.visible && (e === this.game.player || e.def?.type === 'npc' || e.def?.type === 'follower')); }
  splash(x, y, n) {
    for (let i = 0; i < n; i++) this.bits.push({ x, y, vx: (this.rnd() - 0.5) * 160, vy: -120 - this.rnd() * 160, age: 0, life: 0.8, size: 2 + (i % 2), color: i % 3 ? '#9fd6ff' : '#ffffff', g: 500 });
  }

  update(dt) {
    const g = this.game;
    if (this.disposed) return;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    const s = Math.max(0, dt); this.time += s;
    const T = tickRiseClock(g, s);
    if (this.rise && T != null) updateRise(this.rise, T, s);
    if (this.kind === 'sunset') this.warm.update(s, { rate: 5, vy: -10, warm: true });
    for (const d of this.dust) { d.age += s; d.x += d.vx * s; d.y += d.vy * s; d.vx *= 0.92; d.vy += 30 * s; }
    this.dust = this.dust.filter(d => d.age < d.life);
    for (const j of [...this.jobs]) {
      if (j.until) { if (j.until()) { this.jobs.splice(this.jobs.indexOf(j), 1); j.resolve(); } continue; }
      j.t += s; const k = j.d > 0 ? clamp01(j.t / j.d) : 1;
      j.step(k, s);
      if (k >= 1) { this.jobs.splice(this.jobs.indexOf(j), 1); j.resolve(); }
    }
    if (this.tracking) {
      const at = this.tracking(), cam = g.camera, m = g.map;
      if (at) {
        cam.x = Math.max(0, Math.min(m.pxW - 480, at.x - 240));
        cam.y = Math.max(0, Math.min(m.pxH - 360, at.y - 180));
      }
    }
    const a = this.gj;
    if (a?.visible && this.aura) {
      a.flyY = Math.sin(this.time * 2.4) * 3;
      for (let i = 0; i < 3; i++) if (this.rnd() < 0.8) {
        const side = this.rnd() * 2 - 1;
        this.motes.push({ x: a.x + a.w / 2 + side * 40, y: a.y + a.h - 20 - this.rnd() * 60, vx: side * 20, vy: -(60 + this.rnd() * 140), age: 0, life: 0.6 + this.rnd() * 0.6, size: 3 + Math.floor(this.rnd() * 3), color: this.rnd() < 0.4 ? '#4a2478' : '#050208' });
      }
    }
    for (const m of this.motes) {
      m.age += s;
      if (m.tx !== undefined) { const k = clamp01(m.age / m.life); m.x += (m.tx - m.x) * Math.min(1, s * 8); m.y += (m.ty - m.y) * Math.min(1, s * 8); m.k = k; }
      else { m.x += m.vx * s; m.y += m.vy * s; }
    }
    this.motes = this.motes.filter(m => m.age < m.life);
    for (const b of this.bits) { b.age += s; b.x += b.vx * s; b.y += b.vy * s; b.vy += b.g * s; }
    this.bits = this.bits.filter(b => b.age < b.life);
    for (const l of this.lasers) l.age += s;
    this.lasers = this.lasers.filter(l => l.age < DESCENT.laserLife);
    if (this.raft?.dip) this.raft.dip = Math.max(0, this.raft.dip - s);
  }

  /** Before the actors (after floor props such as the wall): road rims, the pool, divers, the raft. */
  drawBehind(ctx, cam) {
    if (this.disposed) return;
    const [top, bottom] = this.band();
    ctx.save();
    // 길 가장자리: 가는 사파이어 선(검은 허공과 경계)
    ctx.fillStyle = this.kind === 'sunset' ? 'rgba(0,0,0,0)' : 'rgba(90,130,255,0.55)';
    ctx.fillRect(0, Math.round(top - cam.y) - 1, 480, 1); ctx.fillRect(0, Math.round(bottom - cam.y), 480, 1);
    if (this.kind === 'raft') this.drawPool(ctx, cam);
    if (this.kind === 'sunset') this.drawSunset(ctx, cam);
    ctx.restore();
  }
  drawPool(ctx, cam) {
    const [px, py, pw, ph] = this.meta.pool, x = Math.round(px - cam.x), y = Math.round(py - cam.y);
    // 돌 테두리 + 물
    ctx.fillStyle = '#2b3566'; ctx.fillRect(x - 4, y - 4, pw + 8, ph + 8);
    ctx.fillStyle = '#10183a'; ctx.fillRect(x - 2, y - 2, pw + 4, ph + 4);
    const g = ctx.createLinearGradient(0, y, 0, y + ph); g.addColorStop(0, '#0c2c5c'); g.addColorStop(1, '#061738');
    ctx.fillStyle = g; ctx.fillRect(x, y, pw, ph);
    for (let row = 0; row < ph; row += 10) {
      const drift = Math.round(Math.sin(this.time * 1.3 + row) * 4);
      for (let col = (row * 7) % 26; col < pw - 12; col += 30) {
        ctx.fillStyle = (row + col) % 3 ? 'rgba(90,150,210,0.5)' : 'rgba(170,215,240,0.6)';
        ctx.fillRect(x + ((col + drift + pw) % (pw - 12)), y + row + 4, 8 + (col % 7), 1);
      }
    }
    // 잠수한 둘: 물결선 위만(가라앉을수록 적게) + 물결 고리
    for (const v of this.divers) {
      const e = v.e; e.visible = true;
      const [fx, fy] = this.feet(e), sink = Math.round(48 * v.depth), wl = Math.round(fy - cam.y);
      ctx.save(); ctx.beginPath(); ctx.rect(Math.round(fx - 30 - cam.x), wl - 90, 60, 90); ctx.clip();
      const ox = e.x; e.x += v.jx || 0; e.y += sink; e.draw(ctx, cam); e.y -= sink; e.x = ox;
      ctx.restore();
      ctx.strokeStyle = 'rgba(170,215,240,0.7)'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.ellipse(Math.round(fx - cam.x), wl + 0.5, 12 + Math.sin(this.time * 6) * 1.5, 3, 0, 0, Math.PI * 2); ctx.stroke();
      e.visible = false;
    }
    this.drawRaft(ctx, cam);
  }
  drawRaft(ctx, cam) {
    const r = this.raft, img = this.game.propImages[this.meta.raft]; if (!r || !img) return;
    const s = DESCENT.raftScale, w = Math.round(img.width * s), h = Math.round(img.height * s);
    const bob = r.bob ? Math.round(Math.sin(this.time * 2) * 1.5) : 0, dip = r.dip ? Math.round(Math.sin(r.dip * 16) * r.dip * 6) : 0;
    ctx.drawImage(img, Math.round(r.x - w / 2 - cam.x), Math.round(r.y - h / 2 - cam.y) + bob + dip, w, h);
  }
  /** After the actors: gajaeman's aura and trail, swords, lasers, particles. */
  draw(ctx, cam) {
    if (this.disposed) return;
    ctx.save();
    const a = this.gj;
    if (a?.visible && this.aura) {
      const x = a.x + a.w / 2 - cam.x, y = a.y + a.h - 50 - cam.y + (a.flyY || 0), R = 110;
      this.trail.unshift([a.x + a.w / 2, a.y + a.h - 50]); this.trail.length = Math.min(this.trail.length, 14);
      this.trail.forEach(([tx, ty], i) => { ctx.fillStyle = `rgba(170,110,255,${0.5 * (1 - i / 14)})`; const r = 10 - i * 0.6; ctx.fillRect(Math.round(tx - cam.x - r), Math.round(ty - cam.y - r), Math.round(r * 2), Math.round(r * 2)); });
      const glow = ctx.createRadialGradient(x, y, 0, x, y, R);
      glow.addColorStop(0, 'rgba(200,140,255,0.7)'); glow.addColorStop(1, 'rgba(20,6,40,0)');
      ctx.fillStyle = glow; ctx.fillRect(x - R, y - R, R * 2, R * 2);
      a.draw(ctx, cam);
    }
    const img = this.game.propImages[DESCENT.sword];
    for (const s of this.swords) {
      if (s.dead || !img || s.appear <= 0) continue;
      const flick = s.appear < 1 && Math.floor(this.time * 30) % 2 ? 0.4 : 1;
      const x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 40); glow.addColorStop(0, 'rgba(160,90,255,0.45)'); glow.addColorStop(1, 'rgba(40,10,80,0)');
      ctx.globalAlpha = s.appear * flick; ctx.fillStyle = glow; ctx.fillRect(x - 40, y - 40, 80, 80);
      if (s.phase === 'fly') { ctx.fillStyle = 'rgba(210,190,255,0.45)'; for (const dy of [-6, 0, 6]) ctx.fillRect(x + 50, y + dy, 50, 1); }
      // 칼끝이 왼쪽(일행)을 향한다
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 2);
      // 밝은 라일락 테두리 → 보라로 물든 칼(어두운 바닥 위에서도 보이게)
      const rim = this.rimOf(img), W = DESCENT.swordW, H = DESCENT.swordH;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(rim, -W / 2 + dx, -H / 2 + dy, W, H);
      ctx.drawImage(this.tint(img), -W / 2, -H / 2, W, H); ctx.restore();
      ctx.globalAlpha = 1;
    }
    for (const beam of this.lasers) {
      const width = (1 - beam.age / DESCENT.laserLife) * 9;
      for (const [size, color] of [[width * 2.6, '#8152cc'], [width, '#86e8ff'], [Math.max(1, width * 0.35), '#ffffff']]) {
        ctx.strokeStyle = color; ctx.lineWidth = size; ctx.beginPath();
        ctx.moveTo(Math.round(beam.from[0] - cam.x), Math.round(beam.from[1] - cam.y));
        ctx.lineTo(Math.round(beam.to[0] - cam.x), Math.round(beam.to[1] - cam.y)); ctx.stroke();
      }
    }
    for (const m of this.motes) {
      ctx.globalAlpha = Math.max(0, 1 - m.age / m.life); ctx.fillStyle = m.color;
      ctx.fillRect(Math.round(m.x - cam.x), Math.round(m.y - cam.y), m.size, m.size);
    }
    for (const b of this.bits) {
      ctx.globalAlpha = Math.max(0, Math.min(1, (b.life - b.age) * 3)); ctx.fillStyle = b.color;
      ctx.fillRect(Math.round(b.x - cam.x), Math.round(b.y - cam.y), b.size, b.size);
    }
    ctx.globalAlpha = 1;
    if (this.kind === 'sunset') {
      this.drawTumble(ctx, cam);
      const sun = this.sunScreen(cam), list = this.chars();
      this.backlight.apply(ctx, c => { for (const e of list) e.draw(c, cam); this.drawTumble(c, cam, true); }, sun, 1);
      // 햇빛이 화면 전체로 번진다(인물 위로도 옅게)
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 480, Math.round(this.meta.groundTop - cam.y)); ctx.clip();
      this.rays.draw(ctx, sun[0], sun[1], this.time, 0.28);
      ctx.restore();
      glow(ctx, sun[0], sun[1], 160, 'rgba(255,150,90,A)', 0.1);
      for (const d of this.dust) { ctx.globalAlpha = Math.max(0, 1 - d.age / d.life) * 0.8; ctx.fillStyle = d.wind ? '#fff4e0' : d.s > 3 ? '#3a2a3a' : '#5a4050'; ctx.fillRect(Math.round(d.x - cam.x), Math.round(d.y - cam.y), d.s, d.s); }
      ctx.globalAlpha = 1;
      this.warm.draw(ctx, this.time);
    }
    if (this.launching && this.kind === 'raft') {
      const p = this.game.player, [fx, fy] = this.feet(p);
      drawCell(ctx, this.game.propImages[RISE.riseSheet], Math.floor(this.time * 2.6) % 4, fx - cam.x, fy - cam.y, RISE.riseH);
    }
    if (this.rise) drawRise(ctx, this.rise, this.game.riseT ?? 0, this.game.propImages, this.time);
    ctx.restore();
  }
  rimOf(img) {
    if (this._rim) return this._rim;
    try { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#e6ccff'; x.fillRect(0, 0, c.width, c.height); this._rim = c; } catch { this._rim = img; }
    return this._rim;
  }
  tint(img) {
    if (this._tint) return this._tint;
    try { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(140,70,240,0.3)'; x.fillRect(0, 0, c.width, c.height); this._tint = c; } catch { this._tint = img; }
    return this._tint;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const j of this.jobs) j.resolve();
    this.jobs = [];
    if (this.game.castleDescent === this) this.game.castleDescent = null;
  }
}

