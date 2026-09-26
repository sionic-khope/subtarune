import { CHAR_SCALE } from '../world/world.js';
import { Input } from '../core/input.js';
import { characterMotionWaiter } from '../world/character-motion.js';
import { FONT } from '../ui/font.js';
import { SunsetRun } from './sunset-run.js';
import { GJ_RUNNER as GJ } from '../data/gajaeman-runner.js';
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
    this.divers = []; this.waiters = [];
    void game.sound.loadSfxFiles?.(['wing', 'thud', 'jump', 'impact', 'captain_transform', 'spearappear', 'laser_zap', 'laser_charge', 'break1', 'splash', 'maillard_splash', 'maillard_water_lift', 'power', 'rumble', 'mario_jump', 'heavyswing', 'chime']);
    this.backlight = new Backlight(); this.rays = new SunRays(); this.warm = new Motes(rnd); this.rise = null; this.tumble = null; this.dust = [];
    if (this.kind === 'raft') void game.waitForMap?.('gajaeman_castle_sunset')?.catch?.(() => {});
    if (this.kind === 'sunset' && game.player) game.player.def.visualScale = this.meta.charScale || 1;
    if (['sunset', 'lounge', 'deck'].includes(this.kind)) { void game.sound.loadSfxFiles?.(['blade_lock_whine', 'metalhit', 'laugh_junhee', 'punch', 'impact', 'item', 'pop', 'great_shine', 'power', 'static_burst', 'rumble', 'baron_slam', 'furnace_blast', 'menumove', 'confirm_echo', 'captain_transform', 'laser_charge', 'cannon_charge', 'explosion', 'deltarune_release_shoot', 'wing', 'weaponpull', 'swing', 'whoosh', 'switch_noise', 'thud', 'wing', 'captain_transform', 'great_shine']); this.ground = null; }
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
  ambush(zone, ahead = 110) {
    const p = this.game.player, [px, py] = this.feet(p), [top, bottom] = this.band();
    const list = this.meta.monsters.filter(m => m.zone === zone);
    let tops = 0, bottoms = 0;
    const jobs = list.map((m, i) => {
      const e = this.ent(m.id); if (!e) return Promise.resolve();
      const up = m.side === 'top', n = up ? tops++ : bottoms++;
      const lx = px + (up ? ahead + n * 110 : ahead + 70 + n * 90);
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
  allyIn(zone, nearMonsters = false, seconds = 0.75) {
    const p = this.game.player, [px, py] = this.feet(p), [top, bottom] = this.band(), cam = this.camera();
    const list = DESCENT.allies[zone] || [];
    const lands = this.meta.monsters.filter(m => m.zone === zone && m.land).map(m => m.land[0]);
    const front = nearMonsters && lands.length ? Math.min(...lands) - 42 : null;
    return Promise.all(list.map(([id, from], i) => {
      const e = this.ent(id); if (!e) return Promise.resolve();
      const tx = front != null ? front - i * 26 : px + 64 + i * 26, ty = Math.max(top + 30, Math.min(bottom - 6, py + (i ? 22 : -10)));
      const start = from === 'upRight' ? [cam.x + 520, top - 170] : [cam.x - 40, bottom + 190];
      e.facing = 'right';
      return this.delay(i * 0.22).then(() => {
        this.sfx(id === 'road_mario' ? 'mario_jump' : 'jump', 0.7);
        return this.arc(e, start, [tx, ty], from === 'upRight' ? 60 : 140, seconds, k => k);
      }).then(() => { this.sfx('thud', 0.8); this.game.shake = { time: 0.22, amp: 3 }; });
    }));
  }
  /** 캐릭터 동작 한 번(컷신 {motion} 과 같은 그림) — 조작을 멈추지 않는다 */
  playMotion(id, name) {
    const e = this.ent(id), def = this.game.characterMotions?.[e?.def.sprite]?.[name];
    if (!e || !def) return Promise.resolve();
    const w = characterMotionWaiter(e, def);
    return new Promise(resolve => this.waiters.push({ w, resolve }));
  }
  /**
   * BUILD366(사용자 “멈춰서 연출이 아니라 걷다가 쭉 걸을 수 있고 타이밍 맞춰 잡아주게”): 걸어가며 구간을 지나면 섭 몬스터가 앞에서 뛰어들고
   * 편집노조가 바로 그 앞에 내려와 날려 버린다 — 조작은 그대로(영클 레이저 끝 구간만 연출).
   */
  ambient(n) {
    const party = [this.game.player, this.ent('gyeongsub'), this.ent('ppaman')];
    void this.ambush(n, 250);
    this.delay(0.25).then(() => { for (const e of party) if (e) e.emote = { kind: '!', t: 0, life: 0.7 }; this.sfx('chime', 0.5); });
    return this.delay(0.2).then(() => this.allyIn(n, true, 0.55)).then(() => {
      if (n === 1) { void this.playMotion('road_bidet', 'axe_strike'); return this.delay(0.4).then(() => this.knock(1)); }
      if (n === 2) return this.knock(2).then(() => this.playMotion('road_park', 'bow'));
      const m = this.ent('road_mario'); if (m) { this.sfx('mario_jump', 0.6); void this.arc(m, this.feet(m), this.feet(m), 30, 0.4); }
      return this.delay(0.2).then(() => this.knock(3));
    });
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
    // 둘은 물 속에서 힘껏 뛰었다가 다시 물로 — 뗏목(요플래)만 위로 날아간다
    const divers = this.divers; this.divers = [];
    this.sfx('splash', 0.6); this.splash(r.x, r.y + 10, 34); this.game.shake = { time: 0.3, amp: 3 };
    for (const v of divers) {
      const e = v.e, from = [v.x, v.y]; e.visible = true;
      this.arc(e, from, from, 46, 0.7).then(() => { e.visible = false; this.divers.push({ ...v, depth: 0.55 }); this.splash(from[0], from[1] - 4, 12); this.sfx('splash', 0.4); });
    }
    this.launching = true; p.visible = false; r.bob = false;
    let v = 160;
    this.track(() => ({ x: r.x, y: r.y - 66 }));
    return this.job(3.3, (k, dt) => {
      v = Math.min(460, v + 170 * dt); r.y -= v * dt;
      this.setFeet(p, r.x, r.y + 4);
      if (this.rnd() < 0.6) this.bits.push({ x: r.x + (this.rnd() - 0.5) * 60, y: r.y + 30, vx: (this.rnd() - 0.5) * 40, vy: 80, age: 0, life: 0.5, size: 2, color: '#9fd6ff', g: 200 });
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
        g.sound.stopBgm(2.2);
        for (let i = 0; i < 14; i++) this.dust.push({ x: lx + (i - 6.5) * 3, y: ly - 2, vx: (i - 6.5) * (10 + this.rnd() * 14), vy: -12 - this.rnd() * 22, age: 0, life: 0.7 + this.rnd() * 0.4, s: 2 + (i % 3) });
      }
      if (tb.landed && T >= tb.landed + 1.5) {
        // 무릎 꿇은 채로 남는다(SAVE THE WORLD 버튼까지, 사용자 “계속 무릎꿇고 있어야지”)
        this.setFeet(p, lx, ly); p.trail = []; g.riseT = null;
        return true;
      }
      return false;
    } }));
  }
  // ── SAVE THE WORLD → 달리기 ──────────────────────────────
  /** 화면 위 SAVE THE WORLD 버튼(무지개 오오라가 모여든다) → 옆에 하트 띡 → C: 에코 띠링, 무지개 글자가 위로 떠 사라진다 */
  saveButton() {
    this.button = { t: 0, heart: false, pressed: 0, motes: [] };
    return new Promise(resolve => this.jobs.push({ t: 0, d: Infinity, step: () => {}, resolve, until: () => {
      const b = this.button; if (!b) return true;
      if (!b.heart && b.t >= 1.5) { b.heart = true; this.sfx('menumove', 0.9); }
      if (b.heart && !b.pressed && Input.just('confirm')) { b.pressed = b.t; this.sfx('confirm_echo', 1); }
      if (b.pressed && b.t >= b.pressed + 0.9) { this.button = null; return true; }
      return false;
    } }));
  }
  /** 화면이 하얘지고 요플래 그림자가 준비 동작 → 달리는 순간 흰 화면이 걷히며 곡(원곡 1분 3초부터) */
  /** 이어하기·QA 로 버튼부터 올 때도 무릎 꿇은 요플래 */
  kneelHold() { const p = this.game.player, [lx, ly] = this.meta.land; p.visible = false; this.setFeet(p, lx, ly); this.tumble = { u: 1, trail: [], landed: 1 }; }
  startRun() {
    this.tumble = null;
    const g = this.game, run = this.run = new SunsetRun(g, { rnd: this.rnd });
    g.player.visible = false; this.hideGajaeman();
    this.delay(GJ.white.hold).then(() => run.begin(() => { g.sound.playBgm(GJ.bgm, { volume: 0.7, fadeIn: 0.02 }); }));
    return new Promise(resolve => this.jobs.push({ t: 0, d: Infinity, step: () => {}, resolve, until: () => run.reveal >= 1 }));
  }
  /** 달린 지 2~3초 뒤 오른쪽에서 천천히 가재맨 */
  gajaemanRunIn() {
    const run = this.run, b = run.boss;
    return this.delay(GJ.boss.enterAt).then(() => {
      b.visible = true; b.x = GJ.boss.from[0]; b.y = GJ.boss.from[1]; b.aura = 1; this.sfx('wing', 0.6);
      return this.job(GJ.boss.enter, k => { const e = 1 - (1 - k) ** 3; b.x = lerpN(GJ.boss.from[0], GJ.boss.home[0], e); b.y = lerpN(GJ.boss.from[1], GJ.boss.home[1], e); });
    });
  }
  /** 엄청난 오오라를 모아 힘을 폭발시킨다 */
  auraBurst() {
    const run = this.run, b = run.boss, g = this.game;
    this.sfx('captain_transform', 0.9); this.sfx('laser_charge', 0.8); this.sfx('cannon_charge', 0.6);
    return this.job(GJ.aura.gather, (k, dt) => {
      b.aura = 1 + k * 3; b.shake = 0.1; g.shake = { time: 0.05, amp: 1 + k * 2 };
      if (this.rnd() < 0.9) for (let i = 0; i < 2; i++) { const a = this.rnd() * Math.PI * 2, r = 80 + this.rnd() * 60; run.particles.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 2.2, t: 0, life: 0.42, s: 2 + (i % 2), color: this.rnd() < 0.6 ? '#a851ff' : '#1a0830', g: 0 }); }
    }).then(() => {
      this.sfx('deltarune_release_shoot', 1); this.sfx('power', 0.7);
      run.flash = 0.45; run.flashColor = '245,225,255'; g.shake = { time: 0.7, amp: 7 };
      run.burst(b.x, b.y, 70, { rainbow: false, speed: 260, life: 0.9 }); run.burst(b.x, b.y, 30, { speed: 200, life: 0.8 });
      b.aura = 1.8;
      return this.delay(GJ.aura.burst);
    });
  }
  /** 벤 뒤: 그림자가 걷히며 가재맨은 하늘에 멈춰 디디디딕(엄청난 오오라가 흔들림), 요플래는 검을 든 채 뒤돌아 땅을 본다 */
  afterSlash() {
    const run = this.run; if (!run) return undefined;
    const b = run.boss;
    run.frozen = true; run.pose = 3; run.poseFlip = false; run.pxOverride = GJ.release.endPlayerX;
    b.visible = true; b.x = GJ.release.bossTo[0]; b.y = GJ.release.bossTo[1]; b.lie = 0; b.face = 'left'; b.jitter = true; b.aura = 3;
    this.sfx('static_burst', 0.45);
    return this.job(GJ.after.lift, k => { run.shade = 1 - k * k * (3 - 2 * k); });
  }
  /** 검은 연기가 점점 모여 — 쾅, 쿠와아앙 — 터지고, 연기는 하늘로 */
  farewell() {
    const run = this.run; if (!run) return undefined;
    const b = run.boss, g = this.game;
    this.sfx('rumble', 0.7);
    return this.job(GJ.after.smoke, k => {
      b.aura = 3 + k * 2; b.shake = 0.1; g.shake = { time: 0.05, amp: 1 + k * 3 };
      const n = 1 + Math.floor(k * 4);
      for (let i = 0; i < n; i++) { const a = this.rnd() * Math.PI * 2, r = 90 + this.rnd() * 70; run.smoke.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r * 0.8, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.3, t: 0, life: 0.6, r: 4 + this.rnd() * 5, grow: -4, drag: 0.99 }); }
    }).then(() => {
      this.sfx('baron_slam', 1); this.sfx('furnace_blast', 1);
      g.shake = { time: 1.1, amp: 9 }; run.flash = 0.35; run.flashColor = '255,236,220';
      b.visible = false; b.jitter = false;
      for (let i = 0; i < 70; i++) { const a = this.rnd() * Math.PI * 2, v = 60 + this.rnd() * 220; run.smoke.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 30, t: 0, life: GJ.after.rise * (0.6 + this.rnd() * 0.5), r: 6 + this.rnd() * 10, grow: 6, drag: 0.96, color: i % 5 ? '#050308' : '#2a1640' }); }
      run.burst(b.x, b.y, 40, { rainbow: false, speed: 200, life: 0.8 });
      // 터짐이 끝나면 남은 연기가 하늘로 천천히
      return this.job(GJ.after.rise, (k, dt) => { for (const p of run.smoke) { p.vy = Math.min(p.vy, 0) - 70 * dt; p.vx *= 0.98; } });
    });
  }
  // ── 결말(사용자 2026-09-26): 동료 합류 → 하트 상승·빛의 파장 → 김형섭 복귀 → 나레이션 → 빛의 요플래 → 영클 ──
  /** 달리기 화면이 끝나면(페이드 속) 요플래는 무릎 꿇고 힘들어한다. 동료(경섭·억빠맨·영클)는 왼쪽 화면 밖 */
  epilogueStart() {
    const g = this.game, p = g.player, cam = g.camera;
    this.run = null; this.button = null;
    p.visible = false; this.kneel = { t: 0 };
    const [lx, ly] = this.meta.epilogue.yoplae; this.setFeet(p, lx, ly); p.facing = 'right';
    const scale = this.meta.charScale || 1;
    for (const [id, dy] of [['gyeongsub', -14], ['ppaman', 16], ['sunset_youngcle', -34]]) {
      const e = this.ent(id); if (!e) continue;
      e.def.visualScale = scale; e.visible = true; e.facing = 'right'; this.setFeet(e, cam.x - 40, ly + dy);
    }
  }
  /** 요플래 몸에서 밝은 빛이 돌기 시작한다(점점 세진다) */
  lightUp(seconds = 2.4) {
    this.light = { level: 0 };
    this.sfx('great_shine', 0.6); this.sfx('power', 0.5);
    return this.job(seconds, k => { this.light.level = k; });
  }
  /** 하트가 몸에서 천천히 올라와 하늘로 — 곡(heart_rise, 24.3초)에 맞춰 잔상·어둠 빨아들임 → 8초 세로 빛의 파장 → 끝날 즈음 정상화, 경섭이 달려가 받는다 */
  heartSeq() {
    const g = this.game, p = g.player, cam = g.camera, E = this.meta.epilogue;
    const [px, py] = this.feet(p);
    const heart = this.heart = { x: px, y: py - 26, trail: [], alpha: 1 };
    g.sound.playBgm('heart_rise', { volume: 0.7, fadeIn: 0.05, loop: false });
    this.wave = { w: 0, bright: 0 };
    let caught = false, fallen = false, returned = false;
    const gy = this.ent('gyeongsub');

    return this.job(E.heartSeconds, (k, dt) => {
      const t = k * E.heartSeconds;
      // 하늘로(처음 8초에 대부분, 이후 천천히)
      heart.y = lerpN(py - 26, 70, 1 - (1 - Math.min(1, t / 9)) ** 2) - Math.max(0, t - 9) * 1.2;
      // 확대된 화면이 하트를 따라 올라간다(맵이 낮아 카메라 대신 확대 중심을 옮긴다) — 정상화 전까지
      if (t < E.normalAt) { const z = g.zoom; z.fx += (heart.x - z.fx) * Math.min(1, dt * 2.5); z.fy += (heart.y + 20 - z.fy) * Math.min(1, dt * 2.5); }
      heart.x = px + Math.sin(t * 0.9) * 6;
      heart.trail.unshift([heart.x, heart.y]); heart.trail.length = Math.min(heart.trail.length, 18);
      // 어둠을 빨아들인다: 화면 가장자리에서 검은 알갱이가 하트로
      if (this.rnd() < 0.8) { const a = this.rnd() * Math.PI * 2, r = 220; this.motes.push({ x: heart.x + Math.cos(a) * r, y: heart.y + Math.sin(a) * r * 0.7, tx: heart.x, ty: heart.y, age: 0, life: 1.1, size: 3, color: this.rnd() < 0.7 ? '#0a0612' : '#3a1a5a' }); }
      this.light.level = 1;
      // 8초부터 세로 빛의 파장이 아주 천천히 펼쳐진다
      if (t >= E.waveAt) { const w = (t - E.waveAt) / (E.normalAt - E.waveAt); this.wave.w = Math.min(1, w); this.wave.bright = Math.min(0.55, w * 0.6); }
      // 곡이 끝날 즈음 정상화
      if (t >= E.normalAt) { const n = Math.min(1, (t - E.normalAt) / 1.6); this.wave.bright = 0.55 * (1 - n); this.wave.fade = n; heart.alpha = 1 - n; this.light.level = 1 - n; }
      // 쓰러지기 전에 경섭이 달려가 받는다
      if (!caught && t >= E.catchAt && gy) { caught = true; const [gx, gyy] = this.feet(gy); this.arc(gy, [gx, gyy], [px - 22, py], 8, 0.7, easeOut); gy.facing = 'right'; }
      if (!fallen && t >= E.fallAt) { fallen = true; this.kneel = null; this.lean = { t: 0 }; this.sfx('thud', 0.4); }
      if (this.lean) this.lean.t += dt;
    }).then(() => { this.heart = null; this.wave = null; this.light = null; g.sound.playBgm('wind', { volume: 0.35, fadeIn: 1.5 }); });
  }
  /** 오른쪽에서 하트가 천천히 날아와 일행 앞에 뜬다 */
  heartReturn() {
    const p = this.game.player, cam = this.game.camera, [px, py] = this.feet(p);
    const heart = this.heart = { x: cam.x + 520, y: py - 90, trail: [], alpha: 1 };
    this.sfx('wing', 0.4);
    const from = [heart.x, heart.y], to = [px + 44, py - 70];
    return this.job(3.2, k => { const e = 1 - (1 - k) ** 3; heart.x = lerpN(from[0], to[0], e); heart.y = lerpN(from[1], to[1], e) + Math.sin(k * 9) * 4; heart.trail.unshift([heart.x, heart.y]); heart.trail.length = 14; });
  }
  /** 보라색 코드를 천천히 빙글빙글 돌려 소환 → 경섭 주머니 속으로 */
  codeSummon() {
    const h = this.heart, gy = this.ent('gyeongsub'); if (!h || !gy) return undefined;
    this.code = { x: h.x, y: h.y - 30, spin: 0, scale: 0, alpha: 1 };
    this.sfx('great_shine', 0.5);
    return this.job(2.6, (k, dt) => { this.code.spin += dt * 2.4; this.code.scale = Math.min(1, k * 1.6); this.code.y = h.y - 30 - k * 10; })
      .then(() => { const [gx, gyy] = this.feet(gy), from = [this.code.x, this.code.y]; this.sfx('item', 0.7);
        return this.job(1.2, (k, dt) => { const e = k * k; this.code.x = lerpN(from[0], gx + 4, e); this.code.y = lerpN(from[1], gyy - 16, e); this.code.spin += dt * 6; this.code.scale = 1 - k * 0.8; }); })
      .then(() => { this.code = null; this.sfx('pop', 0.5); });
  }
  /** 하트에 오오라가 빨려 들어오더니 빛의 형상을 띤 김형섭(요플래)으로 변해 땅에 내려온다 */
  heartToLight() {
    const h = this.heart, p = this.game.player; if (!h) return undefined;
    this.sfx('power', 0.6); this.sfx('laser_charge', 0.5);
    return this.job(1.8, () => {
      if (this.rnd() < 0.9) for (let i = 0; i < 2; i++) { const a = this.rnd() * Math.PI * 2, r = 70 + this.rnd() * 40; this.motes.push({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, tx: h.x, ty: h.y, age: 0, life: 0.5, size: 2, color: this.rnd() < 0.5 ? '#fff4c0' : '#c9a0ff' }); }
    }).then(() => {
      this.sfx('great_shine', 0.8); this.game.shake = { time: 0.2, amp: 2 };
      const [, py] = this.feet(p), from = [h.x, h.y];
      this.heart = null; this.lightForm = { x: from[0], y: from[1] + 30, alpha: 0 };
      return this.job(1.6, k => { const e = 1 - (1 - k) ** 2; this.lightForm.y = lerpN(from[1] + 30, py, e); this.lightForm.alpha = Math.min(1, k * 2); });
    });
  }
  /** 영클이 앞으로 날아와 경섭과 빛의 요플래 사이에 선다(아래를 본다) */
  youngcleBetween() {
    const y = this.ent('sunset_youngcle'), gy = this.ent('gyeongsub'), lf = this.lightForm; if (!y || !gy || !lf) return undefined;
    const [gx, gyy] = this.feet(gy), to = [(gx + lf.x) / 2, gyy - 16];
    y.facing = 'down'; this.sfx('wing', 0.5);
    return this.arc(y, this.feet(y), to, 30, 0.9, easeOut);
  }
  /** 모두 왼쪽으로 걸어간다(빛의 요플래·기대 선 김형섭도) */
  walkAwayLeft(seconds = 3.2) {
    const cam = this.game.camera, list = ['gyeongsub', 'ppaman', 'sunset_youngcle'].map(id => this.ent(id)).filter(Boolean);
    for (const e of list) { e.facing = 'left'; e.moving = true; }
    const starts = list.map(e => this.feet(e)), lf = this.lightForm, lf0 = lf ? lf.x : 0;
    return this.job(seconds, (k, dt) => {
      list.forEach((e, i) => { this.setFeet(e, starts[i][0] - k * 200, starts[i][1]); e.animate?.(dt, 8); });
      if (lf) { lf.x = lf0 - k * 200; lf.facing = 'left'; lf.walking = true; }
      this.leanShift = -k * 200;
    });
  }
  /** 검은 화면 가운데 나레이션(천천히, 줄마다 페이드) */
  blackCard(lines, { delay = 2.0, fadeIn = 0.9, hold = 2.4, fadeOut = 0.7, skipBlack = false } = {}) {
    this.card ||= { text: '', alpha: 0, black: 0 };
    const each = fadeIn + hold + fadeOut;
    return this.job(skipBlack ? 0 : 1.2, k => { this.card.black = skipBlack ? 1 : k; })
      .then(() => this.delay(delay))
      .then(() => this.job(each * lines.length, k => {
        const t = k * each * lines.length, i = Math.min(lines.length - 1, Math.floor(t / each)), u = t - i * each;
        this.card.text = lines[i]; this.card.alpha = u < fadeIn ? u / fadeIn : u < fadeIn + hold ? 1 : Math.max(0, 1 - (u - fadeIn - hold) / fadeOut);
      }));
  }
  /** 결말 그림(월드 좌표, 액터 뒤): 무릎 꿇은 요플래·기댄 김형섭·빛·하트·세로 파장·보라 코드·빛의 요플래 */
  paintEpilogueFigures(ctx, cam, withLight = true) {
    const p = this.game.player, [px, py] = this.feet(p);
    if (this.kneel) {
      const img = this.game.propImages[RISE.landSheet], k = this.standH() / 101, jx = Math.round(Math.sin(this.time * 38) * 1);
      if (img) drawCell(ctx, img, 3, px - cam.x + jx, py - cam.y, img.height * k);
    }
    if (this.lean) {
      const a = -0.42 * Math.min(1, this.lean.t / 0.6);
      p.visible = true; ctx.save(); const fx = px - cam.x + (this.leanShift || 0), fy = py - cam.y;
      ctx.translate(fx, fy); ctx.rotate(a); ctx.translate(-fx, -fy); ctx.translate(this.leanShift || 0, 0); p.draw(ctx, cam); ctx.restore(); p.visible = false;
    }
    const lf = this.lightForm, sp = p.sprite;
    if (withLight && lf && sp) {
      const frames = sp[lf.facing || 'down'], img = frames?.[lf.walking ? Math.floor(this.time * 8) % frames.length : 0];
      if (img) {
        const s = CHAR_SCALE * (this.meta.charScale || 1) / sp.px, dw = Math.round(sp.fw * s), dh = Math.round(sp.fh * s);
        ctx.save(); ctx.globalAlpha = lf.alpha * (0.85 + 0.15 * Math.sin(this.time * 4));
        ctx.drawImage(this.backlight.tinted(img, 'rgba(255,244,200,1)', 'lightform'), Math.round(lf.x - cam.x - dw / 2), Math.round(lf.y - cam.y - dh), dw, dh);
        ctx.globalAlpha = lf.alpha * 0.45; ctx.drawImage(img, Math.round(lf.x - cam.x - dw / 2), Math.round(lf.y - cam.y - dh), dw, dh);
        ctx.restore();
      }
    }
  }
  drawEpilogueFx(ctx, cam) {
    const p = this.game.player, [px, py] = this.feet(p);
    if (this.light?.level > 0) {
      const L = this.light.level, x = px - cam.x, y = py - cam.y - 18;
      glow(ctx, x, y, 40 + 40 * L, 'rgba(255,245,200,A)', 0.55 * L);
      for (let i = 0; i < 10; i++) { const a = this.time * 2.2 + i * 0.628, r = 16 + 6 * Math.sin(this.time * 3 + i); ctx.globalAlpha = L * (0.6 + 0.4 * Math.sin(this.time * 6 + i)); ctx.fillStyle = i % 2 ? '#fff6d0' : '#ffe08a'; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.5), 2, 2); }
      ctx.globalAlpha = 1;
    }
    const lf = this.lightForm;
    if (lf) { glow(ctx, lf.x - cam.x, lf.y - cam.y - 14, 36, 'rgba(255,240,190,A)', 0.5 * lf.alpha); for (let i = 0; i < 4; i++) { const a = this.time * 1.5 + i * 1.57; ctx.globalAlpha = lf.alpha * 0.8; ctx.fillStyle = '#fff8e0'; ctx.fillRect(Math.round(lf.x - cam.x + Math.cos(a) * 14), Math.round(lf.y - cam.y - 16 + Math.sin(a) * 18), 2, 2); } ctx.globalAlpha = 1; }
    const h = this.heart;
    if (h) {
      h.trail.forEach(([tx, ty], i) => { if (i % 3) return; ctx.globalAlpha = h.alpha * 0.28 * (1 - i / h.trail.length); this.drawHeart(ctx, tx - cam.x, ty - cam.y, 2, '#ffd0d0'); });
      ctx.globalAlpha = h.alpha; glow(ctx, h.x - cam.x, h.y - cam.y, 50, 'rgba(255,200,200,A)', 0.5 * h.alpha);
      for (let i = 0; i < 8; i++) { const a = this.time * 3 + i * 0.785, r = 20; ctx.globalAlpha = h.alpha * 0.8; ctx.fillStyle = i % 2 ? '#ffffff' : '#ffd6e0'; ctx.fillRect(Math.round(h.x - cam.x + Math.cos(a) * r), Math.round(h.y - cam.y + Math.sin(a) * r * 0.55), 2, 2); }
      ctx.globalAlpha = h.alpha; this.drawHeart(ctx, h.x - cam.x, h.y - cam.y, 2, '#ff2030'); ctx.globalAlpha = 1;
    }
    const c = this.code;
    if (c) {
      const x = c.x - cam.x, y = c.y - cam.y, s = 12 * c.scale;
      glow(ctx, x, y, 30 * c.scale + 4, 'rgba(170,90,255,A)', 0.6);
      const cord = this.game.propImages['assets/props/purple_cord.png'], k2 = c.scale;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(c.spin);
      if (cord) ctx.drawImage(cord, Math.round(-cord.width * k2 / 2), Math.round(-cord.height * k2 / 2), Math.round(cord.width * k2), Math.round(cord.height * k2));
      ctx.restore();
    }
  }
  /** 세로 빛의 파장·밝아짐은 화면 좌표(확대와 무관하게 화면 전체) — 하트는 화면 가운데 위로 올라가 있다 */
  drawWaveHud(ctx) {
    const w = this.wave; if (!w || !(w.w > 0)) return;
    const hx = 240, half = 16 + w.w * 280, a = 0.75 * (1 - (w.fade || 0));
    const g = ctx.createLinearGradient(hx - half, 0, hx + half, 0);
    g.addColorStop(0, 'rgba(255,250,225,0)'); g.addColorStop(0.35, `rgba(255,250,225,${a * 0.6})`); g.addColorStop(0.5, `rgba(255,255,245,${a})`); g.addColorStop(0.65, `rgba(255,250,225,${a * 0.6})`); g.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(Math.round(hx - half), 0, Math.round(half * 2), 360); ctx.restore();
    if (w.bright > 0) { ctx.fillStyle = `rgba(255,252,236,${w.bright})`; ctx.fillRect(0, 0, 480, 360); }
  }
  drawHeart(ctx, x, y, k, color) {
    ctx.fillStyle = color; const hx = Math.round(x - 5 * k), hy = Math.round(y - 4 * k);
    for (const [dx, dy, w] of [[1, 0, 3], [6, 0, 3], [0, 1, 10], [0, 2, 10], [0, 3, 10], [1, 4, 8], [2, 5, 6], [3, 6, 4], [4, 7, 2]]) ctx.fillRect(hx + dx * k, hy + dy * k, w * k, k);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(hx + 2 * k, hy + 1 * k, k, k);
  }
  drawCard(ctx) {
    const c = this.card; if (!c) return;
    ctx.save(); ctx.fillStyle = `rgba(0,0,0,${c.black})`; ctx.fillRect(0, 0, 480, 360);
    if (c.text && c.alpha > 0) { ctx.globalAlpha = c.alpha; ctx.font = FONT.replace(/^\d+px/, '14px'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText(c.text, 240, 180); }
    ctx.restore();
  }
  // ── 갑판 노을(사용자 2026-09-26): 요플래(빛)가 노을을 보고, 경섭·억빠맨이 온다. 역광과 긴 그림자 ──
  /** 맵 backdrop 'castle_sunset_sky' — 타일보다 먼저(화면 좌표) */
  drawSky(ctx, cam) {
    const m = this.meta;
    drawSunsetSky(ctx, this.game.propImages, { horizonY: m.horizonY, width: 760, shiftX: -cam.x * 0.08, sunX: m.sunX - cam.x * 0.08, sunD: 60, time: this.time, rays: this.rays, rayStrength: 0.7 });
  }
  deckSetup() {
    const g = this.game, p = g.player, [lx, ly] = this.meta.lookout;
    p.visible = false; this.setFeet(p, lx, ly);
    this.lightForm = { x: lx, y: ly, alpha: 1, facing: 'right' };
    for (const e of g.entities) if (e.def?.type === 'follower') e.visible = false;
  }
  /** 경섭·억빠맨이 왼쪽에서 걸어와 요플래 곁에 선다 */
  deckFriendsIn() {
    const cam = this.game.camera, st = this.meta.lookout, list = [['ppaman', [st[0] - 66, st[1] - 30], 0], ['gyeongsub', [st[0] - 70, st[1] + 22], 0.2]];
    return Promise.all(list.map(([id, to, d]) => { const e = this.ent(id); if (!e) return Promise.resolve();
      e.visible = true; e.facing = 'right'; this.setFeet(e, cam.x - 30, to[1]);
      return this.delay(d).then(() => this.job(3.2, (k, dt) => { this.setFeet(e, lerpN(cam.x - 30, to[0], k), to[1]); e.moving = k < 1; e.animate?.(dt, 8); if (k >= 1) e.moving = false; })); }));
  }
  deckFriendsLeave(seconds = 4) {
    const list = ['ppaman', 'gyeongsub'].map(id => this.ent(id)).filter(Boolean), from = list.map(e => this.feet(e));
    for (const e of list) e.facing = 'left';
    return this.job(seconds, (k, dt) => list.forEach((e, i) => { this.setFeet(e, from[i][0] - k * 260, from[i][1]); e.moving = true; e.animate?.(dt, 8); }));
  }
  /** 해를 등진 긴 그림자(발에서 해 반대쪽으로, 부드럽게) */
  drawLongShadows(ctx, cam) {
    const sun = this.meta.sunX, figs = this.chars().map(e => this.feet(e));
    if (this.lightForm) figs.push([this.lightForm.x, this.lightForm.y]);
    for (const [fx, fy] of figs) {
      const x = fx - cam.x, y = fy - cam.y, dir = x < sun ? -1 : 1, len = 60;
      const g = ctx.createLinearGradient(x, 0, x + dir * len, 0);
      g.addColorStop(0, 'rgba(10,4,20,0.5)'); g.addColorStop(1, 'rgba(10,4,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 7, y - 2); ctx.lineTo(x + dir * len, y - 6); ctx.lineTo(x + dir * len, y + 6); ctx.lineTo(x + 7, y + 3); ctx.closePath(); ctx.fill();
    }
  }
  // ── 라운지: 점례가 최미스를 문 밖으로 차낸다 ──
  kickInto(id) {
    const e = this.ent(id), D = this.meta.door; if (!e) return undefined;
    const from = this.feet(e);
    this.sfx('punch', 0.9); this.sfx('impact', 0.8); this.game.shake = { time: 0.25, amp: 3 };
    return this.job(0.55, k => { this.setFeet(e, lerpN(from[0], D.enter[0], k), lerpN(from[1], D.enter[1], k)); e.hopY = Math.sin(Math.PI * k) * 40; e.spin = k * Math.PI * 4; })
      .then(() => { e.visible = false; e.hopY = 0; e.spin = 0; this.sfx('great_shine', 0.3); for (let i = 0; i < 14; i++) this.bits.push({ x: D.enter[0], y: D.enter[1] - 20, vx: (this.rnd() - 0.5) * 120, vy: -40 - this.rnd() * 80, age: 0, life: 0.7, size: 2, color: '#fff6d0', g: 60 }); });
  }
  // ── 라운지 결말 퍼레이드(사용자 2026-09-26): 한쪽이 열린 보라 문 너머 밝은 빛, 들어가면 그림자가 진다 ──
  loungeSetup() {
    const g = this.game;
    g.player.visible = false;
    for (const e of g.entities) if (e.def?.type === 'follower') e.visible = false;
    this.pairFacing = 'back';
  }
  /** 문 앞까지 걸어간 배우가 빛 속으로 들어가 사라진다(가까울수록 그림자, 문턱에서 반짝) */
  enterDoor(id, seconds = 0.8) {
    const e = this.ent(id), D = this.meta.door; if (!e) return undefined;
    const from = this.feet(e); e.facing = 'up';
    return this.job(seconds, (k, dt) => { this.setFeet(e, lerpN(from[0], D.enter[0], k), lerpN(from[1], D.enter[1], k)); e.moving = true; e.animate?.(dt, 8); })
      .then(() => { e.visible = false; e.moving = false; this.sfx('great_shine', 0.25); for (let i = 0; i < 10; i++) this.bits.push({ x: D.enter[0], y: D.enter[1] - 20, vx: (this.rnd() - 0.5) * 60, vy: -30 - this.rnd() * 50, age: 0, life: 0.7, size: 2, color: '#fff6d0', g: -20 }); });
  }
  doorScreen(cam) { const D = this.meta.door; return [D.enter[0] - cam.x, D.y + 110 - cam.y]; }
  /** 바닥으로 번지는 문빛(배우 뒤) */
  drawLoungeFloor(ctx, cam) {
    const D = this.meta.door, x = D.enter[0] - cam.x, y = D.y + D.h - cam.y;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, y, 0, y + 200);
    g.addColorStop(0, 'rgba(255,236,170,0.34)'); g.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 38, y); ctx.lineTo(x + 38, y); ctx.lineTo(x + 110, y + 200); ctx.lineTo(x - 110, y + 200); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  /** 문 너머 빛·문가 역광 그림자·어깨동무한 경섭과 김형섭(배우 앞) */
  drawLounge(ctx, cam) {
    const [dx, dy] = this.doorScreen(cam), D = this.meta.door;
    const pulse = 0.85 + 0.15 * Math.sin(this.time * 1.6);
    glow(ctx, dx, dy, 120, 'rgba(255,240,190,A)', 0.45 * pulse);
    glow(ctx, dx, dy, 50, 'rgba(255,255,240,A)', 0.55 * pulse);
    // 문에 가까운 배우는 빛을 등져 그림자가 진다
    const near = this.game.entities.filter(e => e.visible && e.def?.type === 'npc' && this.feet(e)[1] < D.front[1] + 60);
    if (near.length) {
      const k = Math.max(...near.map(e => 1 - Math.min(1, (this.feet(e)[1] - D.enter[1]) / 90)));
      this.backlight.apply(ctx, c => { for (const e of near) e.draw(c, cam); }, [dx, dy - 200], Math.max(0.3, k));
    }
    const img = this.game.propImages[`assets/props/pair_hug_${this.pairFacing}.png`];
    if (img) {
      const [px, py] = this.meta.pair, fw = img.width / 2, s = 62 / img.height, f = Math.floor(this.time / 0.9) % 2;
      ctx.drawImage(img, f * fw, 0, fw, img.height, Math.round(px - cam.x - fw * s / 2), Math.round(py - cam.y - img.height * s), Math.round(fw * s), Math.round(img.height * s));
    }
  }
  /** 달리기 화면을 걷고 필드로(요플래는 뒤돌아본 자리 그대로) — 다음 연출은 사용자 다음 브리핑 */
  endRun() {
    const run = this.run, p = this.game.player, cam = this.game.camera;
    p.visible = true; p.facing = 'left';
    if (run) this.setFeet(p, run.x + cam.x, run.groundY + cam.y);
    if (!run) return undefined;
    return this.job(1.0, k => { run.alpha = 1 - k; }).then(() => { this.run = null; });
  }
  drawButton(ctx) {
    const b = this.button; if (!b) return;
    const cx = 240, cy = 64, appear = Math.min(1, b.t / 0.6), fly = b.pressed ? Math.min(1, (b.t - b.pressed) / 0.9) : 0;
    // 무지개 오오라가 버튼 안으로 모여든다
    if (!b.pressed && this.rnd() < 0.9) { const a = this.rnd() * Math.PI * 2, r = 90 + this.rnd() * 50; b.motes.push({ x: cx + Math.cos(a) * r * 1.4, y: cy + Math.sin(a) * r * 0.6, t: 0, life: 0.7, c: GJ.rainbow[Math.floor(this.rnd() * GJ.rainbow.length)] }); }
    for (const m of b.motes) { m.t += 1 / 60; const k = m.t / m.life; m.x += (cx - m.x) * 0.08; m.y += (cy - m.y) * 0.08; }
    b.motes = b.motes.filter(m => m.t < m.life);
    ctx.save();
    glow(ctx, cx, cy, 120, 'rgba(255,230,160,A)', 0.25 * appear * (1 - fly));
    for (const m of b.motes) { ctx.globalAlpha = Math.sin(Math.PI * m.t / m.life) * appear * (1 - fly); ctx.fillStyle = m.c; ctx.fillRect(Math.round(m.x), Math.round(m.y), 3, 3); }
    ctx.globalAlpha = appear * (1 - fly);
    ctx.font = FONT.replace(/^\d+px/, '24px'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(GJ.text.button).width, y = cy - fly * 60;
    const grad = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0), shift = (this.time * 0.5) % 1;
    GJ.rainbow.forEach((c, i) => grad.addColorStop(((i / (GJ.rainbow.length - 1)) + shift) % 1, c));
    if (!b.pressed) {
      // 버튼 판: 검은 바탕 + 무지개 테두리(선택된 느낌으로 반짝)
      const bw = tw + 36, bh = 38, pulse = 0.75 + 0.25 * Math.sin(this.time * 6);
      ctx.fillStyle = 'rgba(8,4,14,0.85)'; ctx.fillRect(Math.round(cx - bw / 2), Math.round(cy - bh / 2), Math.round(bw), bh);
      ctx.globalAlpha = appear * pulse; ctx.fillStyle = grad;
      ctx.fillRect(Math.round(cx - bw / 2), Math.round(cy - bh / 2), Math.round(bw), 3); ctx.fillRect(Math.round(cx - bw / 2), Math.round(cy + bh / 2 - 3), Math.round(bw), 3);
      ctx.fillRect(Math.round(cx - bw / 2), Math.round(cy - bh / 2), 3, bh); ctx.fillRect(Math.round(cx + bw / 2 - 3), Math.round(cy - bh / 2), 3, bh);
      ctx.globalAlpha = appear;
      if (b.heart) {
        // 하트(소울)
        const hx = Math.round(cx - bw / 2 - 22), hy = Math.round(cy - 6);
        ctx.fillStyle = '#ff2020';
        for (const [dx, dy, w] of [[1, 0, 3], [6, 0, 3], [0, 1, 10], [0, 2, 10], [0, 3, 10], [1, 4, 8], [2, 5, 6], [3, 6, 4], [4, 7, 2]]) ctx.fillRect(hx + dx, hy + dy, w, 1);
        ctx.fillRect(hx, hy + 1, 10, 4);
      }
    }
    ctx.fillStyle = grad; ctx.fillText(GJ.text.button, cx, Math.round(y));
    ctx.restore();
  }
  /** 화면 좌표: 버튼, 달리기 화면(전투 전) */
  drawHud(ctx) {
    if (this.disposed) return;
    if (this.run && !this.game.battle) this.run.draw(ctx);
    this.drawWaveHud(ctx);
    this.drawButton(ctx);
    this.drawCard(ctx);
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
    x.fillStyle = '#060408'; x.fillRect(0, 0, w, h);
    // 윗면: 멀수록(위) 해빛을 받아 살짝 따뜻하게
    const sheen = x.createLinearGradient(0, 0, 0, 40); sheen.addColorStop(0, 'rgba(120,60,70,0.28)'); sheen.addColorStop(1, 'rgba(40,20,40,0)');
    x.fillStyle = sheen; x.fillRect(0, 0, w, 40);
    for (let i = 0; i < w * 0.9; i++) { const px = Math.floor(r() * w / 2) * 2, py = Math.floor(r() * (edge - top) / 2) * 2; x.fillStyle = r() < 0.5 ? '#0e0b16' : '#140f1c'; x.fillRect(px, py, 2 + (r() < 0.3 ? 2 : 0), 2); }
    // 앞 테두리
    // BUILD367(사용자 “바깥의 검은 길은 없애던가”): 앞 테두리·아래 띠 없이 윗면이 화면 아래까지 이어지고 아래로 갈수록 조금 더 어둡다
    for (let i = 0; i < w * 0.5; i++) { x.fillStyle = r() < 0.5 ? '#0e0b16' : '#140f1c'; x.fillRect(Math.floor(r() * w / 2) * 2, edge - top + Math.floor(r() * (h - edge + top) / 2) * 2, 2 + (r() < 0.3 ? 2 : 0), 2); }
    const deep = x.createLinearGradient(0, edge - top - 60, 0, h); deep.addColorStop(0, 'rgba(0,0,0,0)'); deep.addColorStop(1, 'rgba(0,0,0,0.45)');
    x.fillStyle = deep; x.fillRect(0, edge - top - 60, w, h - edge + top + 60);
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
    if (this.button) this.button.t += s;
    for (const x of [...this.waiters]) if (x.w.update(s)) { this.waiters.splice(this.waiters.indexOf(x), 1); x.resolve(); }
    // 끝없는 길: 걸어가며 구간을 지나면 편집노조 한 판(멈추지 않는다)
    if (this.kind === 'road' && !g.dialogue.running) for (const z of this.meta.zones || []) if (!g.flags?.[z.flag] && g.player.x >= z.x - 80) { g.setFlag?.(z.flag); void this.ambient(z.n); }
    if (this.run && !g.battle) this.run.update(s);
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
    ctx.fillStyle = this.kind === 'road' || this.kind === 'raft' ? 'rgba(90,130,255,0.55)' : 'rgba(0,0,0,0)';
    ctx.fillRect(0, Math.round(top - cam.y) - 1, 480, 1); ctx.fillRect(0, Math.round(bottom - cam.y), 480, 1);
    if (this.kind === 'raft') this.drawPool(ctx, cam);
    if (this.kind === 'sunset') this.drawSunset(ctx, cam);
    if (this.kind === 'lounge') this.drawLoungeFloor(ctx, cam);
    if (this.kind === 'deck') this.drawLongShadows(ctx, cam);
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
      this.paintEpilogueFigures(ctx, cam);
      const sun = this.sunScreen(cam), list = this.chars();
      this.backlight.apply(ctx, c => { for (const e of list) e.draw(c, cam); this.drawTumble(c, cam, true); this.paintEpilogueFigures(c, cam, false); }, sun, 1);
      // 햇빛이 화면 전체로 번진다(인물 위로도 옅게)
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 480, Math.round(this.meta.groundTop - cam.y)); ctx.clip();
      this.rays.draw(ctx, sun[0], sun[1], this.time, 0.28);
      ctx.restore();
      glow(ctx, sun[0], sun[1], 160, 'rgba(255,150,90,A)', 0.1);
      for (const d of this.dust) { ctx.globalAlpha = Math.max(0, 1 - d.age / d.life) * 0.8; ctx.fillStyle = d.wind ? '#fff4e0' : d.s > 3 ? '#3a2a3a' : '#5a4050'; ctx.fillRect(Math.round(d.x - cam.x), Math.round(d.y - cam.y), d.s, d.s); }
      ctx.globalAlpha = 1;
      this.warm.draw(ctx, this.time);
      this.drawEpilogueFx(ctx, cam);
    }
    if (this.launching && this.kind === 'raft') {
      const p = this.game.player, [fx, fy] = this.feet(p);
      drawCell(ctx, this.game.propImages[RISE.riseSheet], Math.floor(this.time * 2.6) % 4, fx - cam.x, fy - cam.y, RISE.riseH);
    }
    if (this.kind === 'lounge') this.drawLounge(ctx, cam);
    if (this.kind === 'deck') {
      // 빛의 요플래 · 역광(해 쪽 가장자리만 따뜻하게)
      this.paintEpilogueFigures(ctx, cam);
      const sun = [this.meta.sunX - cam.x * 0.08, this.meta.horizonY], list = this.chars();
      this.backlight.apply(ctx, c => { for (const e of list) e.draw(c, cam); }, sun, 0.8);
      this.drawEpilogueFx(ctx, cam);
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

