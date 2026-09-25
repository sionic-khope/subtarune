import { SCREEN_W, SCREEN_H } from '../core/layout.js';
import { FX } from '../data/fx.js';

/**
 * BUILD332 final chamber (사용자 2026-09-25 브리핑). Owns every visual the DSL cannot express:
 * gajaeman's aura (2 levels), the upward darkness, summon puffs, Youngcle's giant laser charge and hurried shot,
 * the 청소년 orb (spinning descent with afterimages), gajaeman's rise, the thrown orb and sword volley into the pit,
 * and the giant blue fountain wave that shadows everyone while the camera climbs.
 */
export const ARENA = Object.freeze({
  map: 'gajaeman_castle_arena',
  aura: [{ rate: 26, rise: 70, spread: 34, size: 3 }, { rate: 70, rise: 150, spread: 56, size: 4 }],
  erupt: { duration: 1.8, width: 150 },
  summon: { puff: 22, life: 0.7 },
  charge: { duration: 3.0, radius: 26, below: 18 },
  hover: { amplitude: 4, period: 2.4, lift: 10 },
  // BUILD333: 더 천천히(7.5초), 잔상 더 길게, 가재맨 머리 위(above)에서 들고 있는다. 속의 청소년은 보랏빛으로 물든 그림
  orb: { radius: 52, descend: 7.5, from: 560, sway: 50, above: 118, spin: 1.8, trail: 10, trailEvery: 0.09, image: 'assets/props/arena332_cheong_orb.png' },
  rise: { height: 300, duration: 1.0 },
  laser: { life: 0.55 },
  throwOrb: { duration: 0.75 },
  swords: { count: 9, every: 0.16, fly: 0.26, stagger: 0.06, trail: 90, image: 'assets/props/cathedral323_sword.png', w: 76, h: 160, scale: 0.7 },
  // build: 가운데에서 바람처럼 조금 새어 나오는 시간(사용자 “5초”), 그 뒤 갑자기 주변으로 파동(surge)
  fog: { blobs: 60, veil: 0.96, clearRadius: 190 },
  giant: { breathe: 1.3, scale: 0.018, bob: 4, fade: 3.0 },
  track: { rate: 9 },
  // BUILD335: 휘두르기 대신 화면 밖 어깨에서 주먹을 내지른다(굵고 크게, 사용자 “주먹을 날려야함”)
  arm: { image: 'assets/props/arena332_arm.png', reach: 640, pivotY: 130, windup: 0.4, swing: 0.16, hold: 0.5, pull: 260, tilt: 0.12 },
  fountain: { build: 5.0, grow: 2.6, height: 3400, width: 380, ribbons: 4, bands: 2, shadow: 0.62 },
});

const clamp01 = value => Math.max(0, Math.min(1, value));
/** Slower camera follow while panning up to the sword draw. */
const ARENA_TRACK_SLOW = { on: false };
const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeOut = k => 1 - (1 - clamp01(k)) ** 3;

export class CastleArena {
  constructor(game, { rnd = Math.random } = {}) {
    this.game = game; this.map = game.map; this.rnd = rnd; this.disposed = false;
    const meta = game.map?.def?.meta?.arena || {};
    this.meta = meta;
    this.pit = meta.pit || [384, 457, 322, 124];
    this.actor = game.entities.find(e => e.id === meta.gajaeman) || null;
    this.level = 0; this.time = 0; this.spawnAcc = 0;
    this.motes = []; this.puffs = []; this.eruption = null; this.chargeState = null;
    this.orb = null; this.rising = null; this.lasers = []; this.swords = []; this.fountain = null; this.dust = [];
    this.sparks = [];
    this.fog = { level: 0, target: 0, speed: 1, clear: null }; this.tracking = null; this.giant = null; this.pacing = null; this.flying = null; this.arms = []; this.flung = [];
    void game.sound.loadSfxFiles?.(['captain_transform', 'captain_thunder', 'rumble', 'laser_charge', 'cannon_charge', 'laser_beam', 'laser_zap',
      'impact', 'hit', 'thud', 'power', 'wing', 'heavyswing', 'knight_cut', 'baron_slam', 'fountain_draw', 'fountain_erupt', 'spearappear', 'furnace_blast', 'explosion', 'punch', 'cathedral_gust']);
  }
  get snapshot() {
    return { level: this.level, erupting: !!this.eruption, charging: this.chargeState ? +clamp01(this.chargeState.t / ARENA.charge.duration).toFixed(2) : 0,
      orb: this.orb ? { phase: this.orb.phase, x: Math.round(this.orb.x), y: Math.round(this.orb.y) } : null,
      swords: this.swords.map(s => s.phase), fountain: this.fountain ? Math.round(this.fountainHeight()) : 0,
      fog: +this.fog.level.toFixed(2), arms: this.arms.length, pacing: !!this.pacing };
  }
  sfx(name, volume) { this.game.sound.sfx(name, { volume }); }
  image(src) { return this.game.propImages[src]; }
  waitFor(done) {
    return new Promise(resolve => this.game.background.push({ update: () => { if (this.disposed || done()) { resolve(); return true; } return false; } }));
  }
  /** Aura strength: 0 none, 1 normal, 2 violent (“검은 오오라가 더 많이 튄다”). */
  setAura(level) { this.level = level; }
  center() {
    const a = this.actor;
    return a ? { x: a.x + a.w / 2, y: a.y + a.h - 40 + (a.flyY || 0) } : { x: 0, y: 0 };
  }
  erupt() {
    this.eruption = { t: 0 };
    this.game.shake = { time: ARENA.erupt.duration, amp: 4 };
    this.sfx('captain_thunder', 0.8); this.sfx('rumble', 0.7);
    return this.waitFor(() => !this.eruption || this.eruption.t >= ARENA.erupt.duration * 0.7);
  }
  summon(id) {
    const e = this.game.entities.find(x => x.id === id);
    if (!e) return;
    const cx = e.drawX + (e.iw || e.w) / 2, cy = e.drawY + (e.ih || e.h) * 0.6;
    this.burst(cx, cy, ARENA.summon.puff, ['#3a1a5e', '#07030d']);
    e.visible = true;
    this.sfx('captain_transform', 0.35);
  }
  burst(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.rnd() * 0.3;
      this.puffs.push({ x, y, vx: Math.cos(a) * (40 + this.rnd() * 60), vy: Math.sin(a) * (30 + this.rnd() * 40) - 30, age: 0,
        size: 4 + Math.floor(this.rnd() * 5), color: colors[i % colors.length] });
    }
  }
  charge(id) {
    const y = this.game.entities.find(x => x.id === id);
    if (!y) return undefined;
    this.chargeState = { t: 0, actor: y, sparks: [] };
    this.sfx('laser_charge', 0.7); this.sfx('cannon_charge', 0.6);
    return this.waitFor(() => !this.chargeState || this.chargeState.t >= ARENA.charge.duration);
  }
  /** Gajaeman gathers power, then the orb with 청소년 spins down from above and settles in front of him. */
  summonOrb() {
    const c = this.center(), o = ARENA.orb;
    this.orb = { phase: 'descend', t: 0, x: c.x, y: c.y - o.from, fromY: c.y - o.from, toY: c.y - o.above, trail: [], trailT: 0, spin: 0 };
    this.sfx('power', 0.6); this.sfx('spearappear', 0.35);
    return this.waitFor(() => !this.orb || this.orb.phase !== 'descend');
  }
  /** Youngcle's hurried shot: the beam goes where gajaeman was; he rises out of it with the orb. */
  fireAndRise(youngcleId) {
    const y = this.game.entities.find(x => x.id === youngcleId), c = this.center(), a = this.actor;
    const from = this.chargeCenter() || (y ? { x: y.x + y.w / 2, y: y.y + y.h } : null);
    this.chargeState = null;
    if (from) this.lasers.push({ from, to: { x: c.x, y: c.y + 10 }, age: 0 });
    this.sfx('laser_beam', 0.7); this.sfx('laser_zap', 0.6);
    if (a) { this.rising = { t: 0, fromY: a.y }; this.sfx('wing', 0.6); }
    this.game.shake = { time: 0.35, amp: 3 };
    return this.waitFor(() => !this.rising);
  }
  /** Orb hurled into the pit (own whoosh while it falls), then swords forged and fired after it (own launch sound), then a heavy 쿠웅. */
  throwOrbAndSwords() {
    const o = this.orb, [px, py] = this.pit;
    if (o) { o.phase = 'thrown'; o.t = 0; o.sx = o.x; o.sy = o.y; o.tx = px; o.ty = py; this.sfx('heavyswing', 0.8); }
    return this.waitFor(() => !this.orb).then(() => {
      // 구슬이 빠진 구덩이를 잠깐 보여 준 뒤(간격), 카메라가 천천히 가재맨 쪽으로 올라간다
      const t0 = this.time;
      return this.waitFor(() => this.time - t0 > 1.3);
    }).then(() => {
      ARENA_TRACK_SLOW.on = true;
      this.track(() => { const cc = this.center(); return { x: cc.x, y: cc.y - 40 }; });
      const t0 = this.time;
      return this.waitFor(() => this.time - t0 > 1.1);
    }).then(() => {
      ARENA_TRACK_SLOW.on = false;
      this.sfx('fountain_draw', 0.9);
      const c = this.center(), S = ARENA.swords;
      this.swords = Array.from({ length: S.count }, (_, i) => {
        const k = i / (S.count - 1) - 0.5;
        return { phase: 'forming', t: -i * S.every, x: c.x + k * 300, y: c.y - 120 - Math.abs(k) * -60 - 40, angle: k * 0.9, tx: px + k * 120, ty: py + 10 };
      });
      return this.waitFor(() => this.swords.every(s => s.phase === 'ready'));
    }).then(() => {
      this.sfx('knight_cut', 0.75);
      this.swords.forEach((s, i) => { s.phase = 'fly'; s.t = -i * ARENA.swords.stagger; s.sx = s.x; s.sy = s.y; s.sa = s.angle; });
      // 떨어지는 검을 따라 카메라가 빠르게 내려간다
      const lead = this.swords[Math.floor(this.swords.length / 2)];
      this.track(() => ({ x: lead.x, y: lead.y + 30 }));
      return this.waitFor(() => this.swords.every(s => s.phase === 'stuck')).then(() => this.untrack());
    });
  }
  /** The pit answers: a giant pale-blue wave column (Deltarune dark fountain) rising while everyone is thrown into shadow. */
  fountainRise() {
    this.fountain = { t: 0, ribbons: Array.from({ length: ARENA.fountain.ribbons }, (_, i) => ({ phase: i / ARENA.fountain.ribbons, speed: 0.35 + (i % 3) * 0.12, dir: i % 2 ? 1 : -1 })) };
    // 작은 버전은 바람 소리만, 큰 파동이 터질 때 분수 굉음(사용자 “작은버전나올때는 바람소리만”)
    this.sfx('cathedral_gust', 0.5);
    this.game.shake = { time: ARENA.fountain.build, amp: 1 };
    return this.waitFor(() => !this.fountain || this.fountain.t >= ARENA.fountain.build);
  }
  /** Seconds since the surge (negative while it is still only a wind-like trickle). */
  surgeT() { return this.fountain ? this.fountain.t - ARENA.fountain.build : -1; }
  fountainHeight() {
    if (!this.fountain) return 0;
    const F = ARENA.fountain, st = this.surgeT();
    if (st < 0) return 40 + 230 * easeOut(this.fountain.t / F.build);
    return 270 + (F.height - 270) * easeOut(st / F.grow);
  }
  /** The wave fades away and eerie smoke swallows the view (사용자: “미묘하고 호러한 연기들때문에 아무것도 안보이는 상태”). */
  fountainEnd(seconds = 1.6) {
    if (this.fountain) this.fountain.fadeOut = { t: 0, d: seconds };
    this.setFog(1, seconds);
    this.sfx('rumble', 0.4);
    return this.waitFor(() => !this.fountain);
  }
  /** Camera follows a moving point (orb, lead sword, column top, an actor) — fn returns a world point or null to stop. */
  track(fn) { this.tracking = fn; this.game.camera.locked = true; }
  untrack() { this.tracking = null; }
  trackActor(id, dy = 0) {
    const e = this.game.entities.find(x => x.id === id);
    if (e) this.track(() => ({ x: e.x + e.w / 2, y: e.y + dy }));
  }
  /** 청소년거인(선화): fades in and keeps breathing. */
  showGiant() { this.giant = { t: 0 }; }
  /** Clear spot in the fog: world point, 'screen' (follows the camera centre while an action is tracked) or null. */
  setFogClear(x, y) { this.fog.clear = x === null ? null : x === 'screen' ? 'screen' : { x, y }; }
  setFog(level, seconds = 1) { this.fog.target = level; this.fog.speed = Math.abs(level - this.fog.level) / Math.max(0.05, seconds); }
  /** Youngcle hovers left and right, flustered. */
  pace(id) {
    const e = this.game.entities.find(x => x.id === id);
    if (e) this.pacing = { e, base: e.x, t: 0 };
  }
  stopPace() { if (this.pacing) { this.pacing.e.x = this.pacing.base; this.pacing = null; } }
  /** Fly straight up for `seconds` while the camera follows. */
  flyUp(id, seconds, height) {
    const g = this.game, e = g.entities.find(x => x.id === id);
    if (!e) return undefined;
    this.stopPace();
    this.flying = { e, t: 0, d: seconds, fromY: e.y, height };
    g.camera.locked = false; g.camera.target = e;
    this.sfx('wing', 0.5);
    return this.waitFor(() => !this.flying || this.flying.t >= seconds);
  }
  /**
   * A giant arm swings in from one side. side 'right' reaches leftwards. onHit runs at contact.
   * Resolves after the follow-through.
   */
  swingArm(side, target, onHit) {
    const A = ARENA.arm, dir = side === 'right' ? -1 : 1;
    const arm = { side, dir, t: 0, px: target.x - dir * A.reach, py: target.y, hit: false, onHit };
    this.arms.push(arm);
    this.sfx('heavyswing', 0.9);
    return this.waitFor(() => !this.arms.includes(arm));
  }
  armAngle() { return ARENA.arm.tilt; }
  /** How far the fist is pulled back (1 = wound up off-screen, 0 = landed). */
  armPull(arm) {
    const A = ARENA.arm, t = arm.t;
    if (t < A.windup) return 1 - 0.15 * clamp01(t / A.windup);
    return 0.85 * (1 - easeOut(clamp01((t - A.windup) / A.swing)));
  }
  /** Youngcle slammed into the wall: shoots to the wall, crash, then gone. */
  slamIntoWall(id, wallX) {
    const g = this.game, e = g.entities.find(x => x.id === id);
    if (!e) return;
    this.flung.push({ e, kind: 'wall', t: 0, fromX: e.x, toX: wallX, y: e.y });
  }
  /** 펑: explosion where the arm lands and the victims fly off. */
  blastAway(ids, vx) {
    const g = this.game;
    for (const id of ids) {
      const e = g.entities.find(x => x.id === id);
      if (!e) continue;
      g.playBoom?.({ ...FX.explosion, src: FX.explosion.sheet, x: e.x + e.w / 2 - 20, y: e.y - 40, scale: 0.7 });
      this.flung.push({ e, kind: 'fly', t: 0, vx: vx * (0.8 + this.rnd() * 0.4), vup: 700 + this.rnd() * 200, air: 0, fx: e.flyX || 0 });
    }
    this.sfx('explosion', 0.9); g.shake = { time: 0.5, amp: 5 };
  }
  update(dt) {
    const g = this.game;
    if (this.disposed) return;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    const s = Math.max(0, dt);
    this.time += s;
    const a = this.actor, h = ARENA.hover;
    if (a && a.visible !== false) a.flyY = -h.lift + Math.sin(this.time * Math.PI * 2 / h.period) * h.amplitude;
    if (this.rising && a) {
      const R = ARENA.rise; this.rising.t += s;
      const k = easeInOut(clamp01(this.rising.t / R.duration));
      a.y = this.rising.fromY - R.height * k;
      if (this.rising.t >= R.duration) this.rising = null;
    }
    const spec = ARENA.aura[this.level - 1];
    if (spec && a) {
      this.spawnAcc += spec.rate * s;
      const c = this.center();
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        const side = this.rnd() * 2 - 1;
        this.motes.push({ x: c.x + side * spec.spread, y: c.y + 20 - this.rnd() * 70, vx: side * 14 + (this.rnd() - 0.5) * (this.level > 1 ? 70 : 20),
          vy: -spec.rise * (0.5 + this.rnd()), age: 0, life: 0.8 + this.rnd() * 0.9, size: spec.size + Math.floor(this.rnd() * 3), purple: this.rnd() < 0.35 });
      }
    }
    for (const m of this.motes) { m.age += s; m.x += m.vx * s; m.y += m.vy * s; }
    this.motes = this.motes.filter(m => m.age < m.life);
    for (const p of this.puffs) { p.age += s; p.x += p.vx * s; p.y += p.vy * s; p.vx *= 0.94; p.vy *= 0.94; }
    this.puffs = this.puffs.filter(p => p.age < ARENA.summon.life);
    if (this.eruption) { this.eruption.t += s; if (this.eruption.t >= ARENA.erupt.duration) this.eruption = null; }
    if (this.chargeState) {
      const c = this.chargeState; c.t += s;
      if (c.sparks.length < 60 && this.rnd() < 0.8) c.sparks.push({ ang: this.rnd() * Math.PI * 2, r: 60 + this.rnd() * 50, speed: 70 + this.rnd() * 60 });
      for (const sp of c.sparks) sp.r -= sp.speed * s;
      c.sparks = c.sparks.filter(sp => sp.r > 4);
    }
    for (const b of this.lasers) b.age += s;
    this.lasers = this.lasers.filter(b => b.age < ARENA.laser.life);
    this.updateOrb(s);
    this.updateSwords(s);
    for (const d of this.dust) { d.age += s; d.x += d.vx * s; d.y += d.vy * s; d.vy += 200 * s; }
    this.dust = this.dust.filter(d => d.age < 0.9);
    if (this.tracking) {
      const pt = this.tracking();
      if (!pt) this.tracking = null;
      else {
        const cam = g.camera, z = g.zoom?.s ?? 1, k = Math.min(1, (ARENA_TRACK_SLOW.on ? 2.2 : ARENA.track.rate) * s);
        const tx = Math.max(0, Math.min(this.map.pxW - SCREEN_W, pt.x - SCREEN_W / 2)), ty = Math.max(0, Math.min(this.map.pxH - SCREEN_H, pt.y - SCREEN_H / 2));
        cam.locked = true; cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; void z;
      }
    }
    if (this.giant) this.giant.t += s;
    const fg = this.fog;
    if (fg.level !== fg.target) fg.level = fg.level < fg.target ? Math.min(fg.target, fg.level + fg.speed * s) : Math.max(fg.target, fg.level - fg.speed * s);
    if (this.pacing) { const p = this.pacing; p.t += s; const v = Math.cos(p.t * 2.6); p.e.x = p.base + Math.sin(p.t * 2.6) * 26; p.e.facing = v > 0 ? 'right' : 'left'; }
    if (this.flying) { const f = this.flying; f.t += s; f.e.y = f.fromY - f.height * easeInOut(clamp01(f.t / f.d)); if (f.t >= f.d + 5) this.flying = null; }
    for (const arm of this.arms) {
      arm.t += s;
      const A = ARENA.arm;
      if (!arm.hit && arm.t >= A.windup + A.swing * 0.55) { arm.hit = true; this.sfx('furnace_blast', 1); g.shake = { time: 0.6, amp: 7 }; arm.onHit?.(); }
    }
    this.arms = this.arms.filter(arm => arm.t < ARENA.arm.windup + ARENA.arm.swing + ARENA.arm.hold);
    for (const f of this.flung) {
      f.t += s;
      if (f.kind === 'wall') {
        const k = clamp01(f.t / 0.18);
        f.e.x = f.fromX + (f.toX - f.fromX) * k; f.e.spin = (f.e.spin || 0) + 20 * s;
        if (k >= 1 && !f.crashed) { f.crashed = true; this.burst(f.toX + 10, f.y, 26, ['#6c7aa8', '#1c2144', '#c8d6ff']); this.sfx('punch', 0.9); g.shake = { time: 0.5, amp: 6 }; }
        if (f.t > 0.32) { f.e.visible = false; f.e.spin = 0; f.done = true; }
      } else {
        f.fx += f.vx * s; f.air += f.vup * s; f.vup -= 1700 * s;
        f.e.flyX = Math.round(f.fx); f.e.hopY = Math.round(f.air); f.e.spin = (f.e.spin || 0) + 14 * s;
        if (f.t > 1.3) { f.e.visible = false; f.e.spin = 0; f.e.flyX = 0; f.e.hopY = 0; f.done = true; }
      }
    }
    this.flung = this.flung.filter(f => !f.done);
    for (const sp of this.sparks) { sp.age += s; sp.y += sp.vy * s; }
    this.sparks = this.sparks.filter(sp => sp.age < 2.2);
    if (this.fountain?.fadeOut) { const fo = this.fountain.fadeOut; fo.t += s; if (fo.t >= fo.d) this.fountain = null; }
    if (this.fountain) {
      const before = this.surgeT();
      this.fountain.t += s;
      if (before < 0 && this.surgeT() >= 0) { this.sfx('fountain_erupt', 1); this.sfx('captain_thunder', 0.8); this.game.shake = { time: 1.8, amp: 6 }; }
    }
  }
  updateOrb(s) {
    const o = this.orb, O = ARENA.orb;
    if (!o) return;
    o.t += s; o.spin += O.spin * s;
    o.trailT += s;
    if (o.trailT >= O.trailEvery) { o.trailT = 0; o.trail.unshift({ x: o.x, y: o.y, spin: o.spin }); o.trail.length = Math.min(o.trail.length, O.trail); }
    const c = this.center();
    if (o.phase === 'descend') {
      const k = clamp01(o.t / O.descend), e = easeInOut(k);
      o.y = o.fromY + (o.toY - o.fromY) * e;
      o.x = c.x + Math.sin(o.t * 1.7) * O.sway * (1 - e);
      if (k >= 1) { o.phase = 'held'; o.dy = o.y - c.y; }
    } else if (o.phase === 'held') {
      o.x = c.x; o.y = c.y + o.dy + Math.sin(this.time * 2) * 3;
    } else if (o.phase === 'thrown') {
      const k = clamp01(o.t / ARENA.throwOrb.duration);
      o.x = o.sx + (o.tx - o.sx) * k; o.y = o.sy + (o.ty - o.sy) * k * k;
      o.scale = 1 - 0.7 * k;
      if (k >= 1) { this.burst(o.tx, o.ty, 16, ['#8a4bd6', '#1a0a2c']); this.sfx('thud', 0.7); this.orb = null; }
    }
  }
  updateSwords(s) {
    const S = ARENA.swords;
    for (const w of this.swords) {
      w.t += s;
      if (w.flash > 0) w.flash -= s;
      if (w.phase === 'forming') { if (w.t >= 0.3) w.phase = 'ready'; }
      else if (w.phase === 'fly' && w.t >= 0) {
        const k = clamp01(w.t / S.fly), e = k * k;
        w.flash = 0;
        w.x = w.sx + (w.tx - w.sx) * e; w.y = w.sy + (w.ty - w.sy) * e; w.angle = w.sa * (1 - k);
        if (k >= 1) { w.phase = 'sink'; w.st = 0; }
      } else if (w.phase === 'sink') {
        // 구덩이 속으로 그대로 빨려 들어간다: 계속 떨어지며 작아지고 어둠에 잠긴다(사용자 “꽂히는 게 아니라 그대로 안에 들어가는 느낌”)
        w.st += s;
        if (w.st >= 0.45) {
          w.phase = 'stuck';
          if (this.swords.every(x => x.phase === 'stuck')) { this.sfx('baron_slam', 0.85); this.game.shake = { time: 0.9, amp: 5 }; }
        }
      }
    }
  }
  chargeCenter() {
    const y = this.chargeState?.actor;
    return y ? { x: y.x + y.w / 2, y: y.y + y.h + ARENA.charge.below + (y.flyY || 0) } : null;
  }
  /** Behind-the-actors layer: the fountain column and its base rings sit in the pit, behind the party. */
  draw(ctx, cam) {
    if (this.disposed) return;
    ctx.save();
    if (this.giant) this.drawGiant(ctx, cam);
    const c = this.center();
    if (this.level > 0 && this.actor) {
      const k = this.level === 2 ? 1 : 0.6, pulse = 0.85 + 0.15 * Math.sin(this.time * 5);
      const glow = ctx.createRadialGradient(c.x - cam.x, c.y - cam.y, 0, c.x - cam.x, c.y - cam.y, 90 * k * pulse);
      glow.addColorStop(0, `rgba(40,12,70,${0.55 * k})`); glow.addColorStop(0.6, `rgba(12,4,24,${0.35 * k})`); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(c.x - cam.x - 140, c.y - cam.y - 140, 280, 280);
    }
    for (const m of this.motes) {
      ctx.globalAlpha = Math.min(1, (1 - m.age / m.life) * 1.4);
      ctx.fillStyle = m.purple ? '#4a2478' : '#050208';
      ctx.fillRect(Math.round(m.x - cam.x), Math.round(m.y - cam.y), m.size, m.size + 1);
    }
    ctx.globalAlpha = 1;
    if (this.eruption && this.actor) this.drawEruption(ctx, cam, c);
    for (const p of this.puffs) {
      ctx.globalAlpha = 1 - p.age / ARENA.summon.life; ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cam.x - p.size / 2), Math.round(p.y - cam.y - p.size / 2), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    this.drawCharge(ctx, cam);
    this.drawSwords(ctx, cam);
    this.drawOrb(ctx, cam);
    for (const b of this.lasers) {
      const w = (1 - b.age / ARENA.laser.life) * 10;
      for (const [size, color] of [[w * 2.6, '#8152cc'], [w, '#86e8ff'], [Math.max(1, w * 0.35), '#ffffff']]) {
        ctx.strokeStyle = color; ctx.lineWidth = size; ctx.beginPath();
        ctx.moveTo(Math.round(b.from.x - cam.x), Math.round(b.from.y - cam.y)); ctx.lineTo(Math.round(b.to.x - cam.x), Math.round(b.to.y - cam.y)); ctx.stroke();
      }
    }
    ctx.fillStyle = '#6c7aa8';
    for (const d of this.dust) { ctx.globalAlpha = 1 - d.age / 0.9; ctx.fillRect(Math.round(d.x - cam.x), Math.round(d.y - cam.y), 2, 2); }
    ctx.globalAlpha = 1;
    if (this.fountain) {
      ctx.save(); if (this.fountain.fadeOut) ctx.globalAlpha = 1 - clamp01(this.fountain.fadeOut.t / this.fountain.fadeOut.d);
      this.drawFountain(ctx, cam); ctx.restore();
    }
    // 팔은 연기를 뚫고 나온다(연기 위에 그린다)
    if (this.fog.level > 0.01) this.drawFog(ctx);
    this.drawArms(ctx, cam);
    ctx.restore();
  }
  drawArms(ctx, cam) {
    const img = this.image(ARENA.arm.image), A = ARENA.arm;
    if (!img) return;
    for (const arm of this.arms) {
      const out = arm.t > A.windup + A.swing ? clamp01((arm.t - A.windup - A.swing) / A.hold) : 0;
      const back = this.armPull(arm) * A.pull + out * A.pull * 1.4;
      ctx.save();
      ctx.translate(Math.round(arm.px - cam.x - arm.dir * back), Math.round(arm.py - cam.y));
      if (arm.dir < 0) ctx.scale(-1, 1);
      ctx.rotate(-this.armAngle(arm));
      ctx.drawImage(img, -10, -A.pivotY);
      ctx.restore();
    }
  }
  drawGiant(ctx, cam) {
    const G = ARENA.giant, meta = this.meta.giant, img = meta && this.image(meta.image);
    if (!img) return;
    const t = this.giant.t, breath = Math.sin(t * Math.PI * 2 / (G.breathe * 3));
    const sy = 1 + G.scale * breath, sx = 1 + G.scale * 0.4 * breath;
    const w = img.width * sx, h = img.height * sy, x = meta.x - w / 2 - cam.x, y = meta.bottom - h - cam.y - G.bob * breath;
    ctx.save(); ctx.globalAlpha = clamp01(t / G.fade);
    ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    const neck = ctx.createLinearGradient(0, y - 30, 0, y + 90);
    neck.addColorStop(0, 'rgba(0,0,0,1)'); neck.addColorStop(0.5, 'rgba(0,0,0,0.8)'); neck.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = neck; ctx.fillRect(Math.round(x) - 20, Math.round(y) - 30, Math.round(w) + 40, 120);
    ctx.restore();
  }
  /** Eerie horror smoke (사용자 “검은연기가 더 짙어야함”): a near-opaque veil that only thins right around the heroes, plus drifting clouds. */
  drawFog(ctx) {
    const L = this.fog.level, F = ARENA.fog, cam = this.game.camera, c = this.fog.clear;
    if (c) {
      const cx = c === 'screen' ? SCREEN_W / 2 : c.x - cam.x, cy = c === 'screen' ? SCREEN_H / 2 : c.y - cam.y, g = ctx.createRadialGradient(cx, cy, F.clearRadius * 0.25, cx, cy, F.clearRadius);
      g.addColorStop(0, `rgba(5,4,10,${0.3 * L})`); g.addColorStop(1, `rgba(5,4,10,${F.veil * L})`);
      ctx.fillStyle = g;
    } else ctx.fillStyle = `rgba(5,4,10,${F.veil * L})`;
    ctx.fillRect(-SCREEN_W, -SCREEN_H, SCREEN_W * 3, SCREEN_H * 3);
    for (let i = 0; i < F.blobs; i++) {
      const x = ((i * 97.3 + this.time * (8 + (i % 5) * 4)) % (SCREEN_W + 160)) - 80;
      const y = ((i * 53.7 + Math.sin(this.time * 0.4 + i) * 20) % (SCREEN_H + 80)) - 40;
      const r = 16 + (i % 6) * 8;
      ctx.globalAlpha = L * (0.2 + (i % 4) * 0.07);
      ctx.fillStyle = i % 3 ? '#15111f' : '#241c35';
      for (let row = -r; row < r; row += 2) {
        const wob = Math.round(Math.sin(row * 0.3 + this.time + i) * 3);
        const half = Math.round(Math.sqrt(1 - ((row + 1) / r) ** 2) * r * 1.7);
        ctx.fillRect(Math.round(x - half + wob), Math.round(y + row), half * 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  drawEruption(ctx, cam, c) {
    const t = this.eruption.t / ARENA.erupt.duration, up = clamp01(t / 0.35), fade = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    const base = c.y - cam.y, reach = (base + 420) * up, cx = c.x - cam.x;
    ctx.fillStyle = `rgba(0,0,0,${0.3 * fade})`; ctx.fillRect(-SCREEN_W, -SCREEN_H, SCREEN_W * 3, SCREEN_H * 3);
    for (let i = 0; i < 70; i++) {
      const f = ((i * 0.618034) % 1), y = base - f * reach - ((this.time * 260 + i * 37) % 60);
      const spread = ARENA.erupt.width * (0.25 + 0.75 * f) * 0.5, x = cx + Math.sin(i * 2.399 + this.time * 3) * spread;
      const r = 6 + (i % 5) * 3;
      ctx.globalAlpha = fade * (0.55 + 0.45 * (1 - f));
      ctx.fillStyle = i % 4 === 0 ? '#3a1a5e' : i % 3 === 0 ? '#16082a' : '#030106';
      for (let row = -r; row < r; row += 2) {
        const half = Math.round(Math.sqrt(1 - ((row + 1) / r) ** 2) * r);
        ctx.fillRect(Math.round(x - half), Math.round(y + row), half * 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }
  drawCharge(ctx, cam) {
    const cc = this.chargeCenter();
    if (!cc) return;
    const st = this.chargeState, k = clamp01(st.t / ARENA.charge.duration), x = cc.x - cam.x, y = cc.y - cam.y;
    const r = ARENA.charge.radius * (0.25 + 0.75 * k) * (0.9 + 0.1 * Math.sin(this.time * 30));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(134,232,255,0.8)'); g.addColorStop(0.7, `rgba(129,82,204,${0.5 * k})`); g.addColorStop(1, 'rgba(60,20,120,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    ctx.fillStyle = '#c8f6ff';
    for (const sp of st.sparks) ctx.fillRect(Math.round(x + Math.cos(sp.ang) * sp.r), Math.round(y + Math.sin(sp.ang) * sp.r * 0.7), 2, 2);
    ctx.strokeStyle = `rgba(134,232,255,${0.3 + 0.5 * k})`; ctx.lineWidth = 1;
    const ring = (this.time * 2) % 1;
    ctx.beginPath(); ctx.ellipse(x, y, r * (1 + 2 * (1 - ring)), r * 0.6 * (1 + 2 * (1 - ring)), 0, 0, Math.PI * 2); ctx.stroke();
  }
  /** Big glossy purple glass orb (사용자 “더 크고 유광… 구슬 같은 질감”): dark rim, deep inner gradient, swirling inner mist,
   *  the purple-tinted girl turning left/right inside, a sharp window highlight, a soft rim light and afterimages. */
  drawOrb(ctx, cam) {
    const o = this.orb;
    if (!o) return;
    const img = this.image(ARENA.orb.image);
    const one = (x, y, spin, alpha, scale, full) => {
      const R = ARENA.orb.radius * scale, sx = Math.round(x - cam.x), sy = Math.round(y - cam.y);
      ctx.save(); ctx.globalAlpha = alpha;
      const body = ctx.createRadialGradient(sx + R * 0.25, sy + R * 0.3, R * 0.1, sx, sy, R);
      body.addColorStop(0, 'rgba(120,60,200,0.55)'); body.addColorStop(0.7, 'rgba(60,20,120,0.65)'); body.addColorStop(1, 'rgba(20,6,50,0.95)');
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
      if (full) {
        ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, R - 2, 0, Math.PI * 2); ctx.clip();
        for (let i = 0; i < 5; i++) {
          const a0 = this.time * 0.8 + i * 1.3;
          ctx.strokeStyle = `rgba(200,150,255,${0.18 + 0.06 * (i % 2)})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(sx, sy, R * (0.5 + 0.08 * i), R * 0.22, a0, 0, Math.PI * 1.2); ctx.stroke();
        }
        if (img) {
          const turn = Math.cos(spin), w = Math.max(2, Math.round(img.width * Math.abs(turn) * scale * 1.1)), h = Math.round(img.height * scale * 1.1);
          ctx.save(); ctx.translate(sx, sy); if (turn < 0) ctx.scale(-1, 1);
          ctx.drawImage(img, -Math.round(w / 2), -Math.round(h / 2) + 3, w, h); ctx.restore();
        }
        const shade = ctx.createRadialGradient(sx - R * 0.35, sy - R * 0.4, R * 0.2, sx, sy, R);
        shade.addColorStop(0, 'rgba(255,255,255,0)'); shade.addColorStop(0.75, 'rgba(40,10,90,0.1)'); shade.addColorStop(1, 'rgba(20,4,50,0.6)');
        ctx.fillStyle = shade; ctx.fillRect(sx - R, sy - R, R * 2, R * 2);
        ctx.restore();
        // 유광: 창문 모양 반사 + 아래쪽 반사광 + 테두리 빛
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.ellipse(sx - R * 0.38, sy - R * 0.45, R * 0.22, R * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(sx - Math.round(R * 0.12), sy - Math.round(R * 0.62), 4, 4);
        ctx.strokeStyle = 'rgba(230,200,255,0.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, R * 0.82, Math.PI * 0.15, Math.PI * 0.75); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(210,160,255,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,10,80,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, R + 2, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    };
    o.trail.forEach((p, i) => one(p.x, p.y, p.spin, 0.2 * (1 - i / ARENA.orb.trail), o.scale ?? 1, false));
    one(o.x, o.y, o.spin, 1, o.scale ?? 1, true);
  }
  drawSwords(ctx, cam) {
    const img = this.image(ARENA.swords.image), S = ARENA.swords;
    if (!img) return;
    for (const w of this.swords) {
      if (w.phase === 'forming' && w.t < 0) continue;
      const appear = w.phase === 'forming' ? clamp01(w.t / 0.3) : 1;
      const flicker = appear < 1 && Math.floor(this.time * 30) % 2 ? 0.35 : 1;
      if (w.phase === 'stuck') continue;
      const sink = w.phase === 'sink' ? clamp01(w.st / 0.45) : 0;
      const sw = S.w * S.scale * (1 - 0.7 * sink), sh = S.h * S.scale * (1 - 0.7 * sink), stuckSink = sink * 26;
      // 빠르게 내리꽂히는 흰 잔상 빛줄기 + 꽂힌 순간 번쩍
      if (w.phase === 'fly' && w.t >= 0) {
        const x = Math.round(w.x - cam.x), y = Math.round(w.y - cam.y), g = ctx.createLinearGradient(0, y - S.trail - sh / 2, 0, y);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.85)');
        ctx.fillStyle = g; ctx.fillRect(x - Math.round(sw * 0.22), y - S.trail - Math.round(sh / 2), Math.round(sw * 0.44), S.trail + Math.round(sh / 2));
        ctx.fillStyle = 'rgba(200,220,255,0.35)'; ctx.fillRect(x - Math.round(sw * 0.4), y - Math.round(S.trail * 0.6), Math.round(sw * 0.8), Math.round(S.trail * 0.6));
      }
      if (w.flash > 0) {
        ctx.save(); ctx.globalAlpha = w.flash / 0.25; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(Math.round(w.tx - cam.x), Math.round(w.ty - cam.y + 22), 26, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(Math.round(w.tx - cam.x) - 1, Math.round(w.ty - cam.y) - 60, 3, 80); ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = appear * flicker * (1 - sink);
      ctx.translate(Math.round(w.x - cam.x), Math.round(w.y - cam.y + stuckSink)); ctx.rotate(w.angle || 0);
      if (sink > 0) ctx.filter = `brightness(${1 - 0.8 * sink})`;
      ctx.drawImage(img, -Math.round(sw / 2), -Math.round(sh / 2), Math.round(sw), Math.round(sh));
      ctx.restore();
    }
  }
  /**
   * Deltarune titan-summon style (사용자 참고 영상·스크린샷): a thin bright beam first, then a wide pale column with bright cyan
   * edges, darker diagonal blue bands sweeping up through it, and ribbons coiling around it at every height the camera passes.
   * A blue-black shadow falls over everyone else.
   */
  drawFountain(ctx, cam) {
    const F = ARENA.fountain, f = this.fountain, [px, py, prx, pry] = this.pit;
    const h = this.fountainHeight(), st = this.surgeT();
    if (st < 0) { this.drawTrickle(ctx, cam); return; }
    // 레퍼런스(델타룬 거인 소환): 구덩이 전체가 한꺼번에 뿜어 올린다. 밑동 = 구덩이 앞 테두리 곡선, 잘린 선 없음
    const open = easeOut(clamp01(st / 0.45)), t = this.time;
    const baseY = py - cam.y, cx = px - cam.x, topY = baseY - h;
    const visTop = Math.max(topY, -SCREEN_H * 1.5);
    const R = 8 + (prx * 0.97 - 8) * open, RY = pry * 0.97 * (R / prx), width = R * 2;
    ctx.fillStyle = `rgba(2,10,34,${F.shadow * clamp01(f.t / 0.6)})`; ctx.fillRect(-SCREEN_W, -SCREEN_H, SCREEN_W * 3, SCREEN_H * 3);
    this.drawPitWater(ctx, cx, baseY, prx, pry, 1);
    // 밑동 위로 조금 부풀었다가(불꽃처럼) 곧게 오르고, 꼭대기는 둥글다
    const half = y => {
      const up = baseY - y;
      const flare = 1 + 0.09 * Math.sin(clamp01(up / 240) * Math.PI) * open;
      const dome = up > h - R ? Math.sqrt(clamp01((h - up) / R)) : 1;
      return R * flare * dome;
    };
    const wav = (y, side) => (Math.sin((y + t * 300) * 0.011 + side * 1.9) * 8 + Math.sin((y + t * 520) * 0.029 + side) * 3) * open * clamp01((baseY - y) / 70);
    const yTop = Math.max(visTop, topY);
    const silhouette = inset => {
      const r = Math.max(0, R - inset), ry = RY * (r / Math.max(1, R));
      ctx.beginPath();
      for (let y = baseY; y >= yTop; y -= 8) ctx.lineTo(cx - Math.max(0, half(y) - inset) + wav(y, -1), y);
      ctx.lineTo(cx + wav(yTop, 0), yTop);
      for (let y = yTop; y <= baseY; y += 8) ctx.lineTo(cx + Math.max(0, half(y) - inset) + wav(y, 1), y);
      for (let a = 0; a <= Math.PI + 0.001; a += Math.PI / 32) ctx.lineTo(cx + Math.cos(a) * r, baseY + Math.sin(a) * ry);
      ctx.closePath();
    };
    this.drawRibbons(ctx, cam, cx, width, baseY, visTop, open, false);
    for (const [inset, color] of [[0, '#2aa8dc'], [R * 0.06, '#56d8f0'], [R * 0.15, '#bff0ef'], [R * 0.28, '#e0faf6']]) {
      if (R - inset < 1) continue;
      ctx.fillStyle = color; silhouette(inset); ctx.fill();
    }
    // 기둥 안쪽만: 비스듬한 짙은 파랑 덩어리(가장자리 들쭉날쭉)와 위로 흐르는 붓자국
    ctx.save(); silhouette(0); ctx.clip();
    const period = 760, shift = ((t * 420 + cam.y) % period + period) % period;
    for (let i = 0; i < F.bands; i++) {
      for (let rep = -2; rep <= 3; rep++) {
        const yy = i * period / F.bands + rep * period - shift, thick = i % 2 ? 110 : 70, drop = width * 0.62;
        if (yy + drop > baseY + RY + thick || yy - drop < yTop - thick) continue;
        ctx.fillStyle = i % 2 ? 'rgba(74,168,232,0.88)' : 'rgba(95,200,240,0.5)';
        ctx.beginPath();
        const x0 = cx - R - 30, x1 = cx + R + 30, n = 10;
        for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n; ctx.lineTo(x, yy - drop / 2 + drop * k / n + Math.sin(k * 2.3 + i) * 7); }
        for (let k = n; k >= 0; k--) { const x = x0 + (x1 - x0) * k / n; ctx.lineTo(x, yy - drop / 2 + drop * k / n + thick * (0.45 + 0.55 * k / n) + Math.sin(k * 1.7 + i) * 9); }
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.strokeStyle = 'rgba(90,190,235,0.55)'; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const lane = ((i * 0.37) % 1) * 1.6 - 0.8, len = 26 + (i % 4) * 14, speed = 260 + (i % 3) * 90;
      const yy = ((i * 97 - t * speed - cam.y) % 520 + 520) % 520 + yTop - 40;
      if (yy > baseY) continue;
      ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath(); ctx.moveTo(cx + lane * half(yy), yy); ctx.quadraticCurveTo(cx + lane * half(yy) + 5, yy - len / 2, cx + lane * half(yy) - 2, yy - len); ctx.stroke();
    }
    // 밑동이 구덩이 빛과 한 덩어리로 보이게 아래쪽을 하얗게 번지게
    const foot = ctx.createRadialGradient(cx, baseY + RY * 0.4, 0, cx, baseY + RY * 0.4, R * 1.1);
    foot.addColorStop(0, 'rgba(240,255,252,0.9)'); foot.addColorStop(0.55, 'rgba(210,248,246,0.45)'); foot.addColorStop(1, 'rgba(210,248,246,0)');
    ctx.fillStyle = foot; ctx.fillRect(cx - R * 1.2, baseY - R, R * 2.4, R + RY * 2);
    ctx.restore();
    this.drawRibbons(ctx, cam, cx, width, baseY, visTop, open, true);
    // 둘레를 감아 오르는 반투명 바람 호
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const per = 480, y0 = ((i * 80 - t * 520 - cam.y) % per + per) % per - 60, RR = R * (1.15 + 0.1 * (i % 3));
      for (let rep = 0; rep < 2; rep++) {
        const yy = y0 + rep * per;
        if (yy > baseY || yy < yTop) continue;
        ctx.strokeStyle = `rgba(210,245,255,${(0.16 + 0.08 * (i % 2)) * open})`; ctx.lineWidth = 3 + (i % 3) * 2;
        ctx.beginPath(); ctx.ellipse(cx, yy, RR, RR * 0.22, 0, Math.PI * (0.05 + (i % 2) * 0.9), Math.PI * (0.9 + (i % 2) * 0.9)); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.fillStyle = `rgba(226,251,248,${0.45 * (1 - clamp01(st / 0.6))})`; ctx.fillRect(-SCREEN_W, -SCREEN_H, SCREEN_W * 3, SCREEN_H * 3);
  }
  /** Pit surface: a dark teal pool filling the hole's ellipse from the middle, with light swirl ripples turning on it. */
  drawPitWater(ctx, cx, baseY, prx, pry, fill) {
    const r = prx * (0.2 + 0.8 * fill), ry = pry * (0.2 + 0.8 * fill), t = this.time;
    ctx.save();
    ctx.fillStyle = `rgba(62,110,140,${0.3 + 0.3 * fill})`; ctx.beginPath(); ctx.ellipse(cx, baseY, r, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(150,225,245,${0.35 + 0.3 * fill})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const k = 0.2 + i * 0.17, a0 = t * (1.4 - i * 0.18) + i * 1.9;
      ctx.beginPath(); ctx.ellipse(cx, baseY, r * k, ry * k, 0, a0, a0 + 1.6 + (i % 2)); ctx.stroke();
    }
    ctx.restore();
  }
  /** Ribbons coil around the column: the back half before the column is drawn, short front arcs over its edges. */
  drawRibbons(ctx, cam, cx, width, baseY, visTop, open, front) {
    const f = this.fountain, period = 620;
    ctx.lineCap = 'round';
    for (const r of f.ribbons) {
      const phase = (r.phase + this.time * r.speed) % 1, start = Math.floor((cam.y - SCREEN_H * 1.5) / period) * period;
      for (let wy = start; wy < cam.y + SCREEN_H * 2.5 + period; wy += period) {
        const y0 = wy - cam.y + (1 - phase) * period + r.phase * 180;
        if (y0 > baseY || y0 < visTop - 80) continue;
        ctx.strokeStyle = front ? (r.dir > 0 ? 'rgba(90,190,240,0.95)' : 'rgba(60,150,190,0.9)') : 'rgba(30,90,120,0.7)';
        ctx.lineWidth = (front ? 12 : 9) * (0.4 + 0.6 * open);
        ctx.beginPath();
        const from = front ? -0.15 : Math.PI - 0.3, to = front ? Math.PI + 0.15 : Math.PI * 2 - 0.2;
        for (let a = from; a <= to; a += 0.08) {
          const x = cx + Math.cos(a) * r.dir * (width * 0.62 + 18 * Math.sin(a * 3));
          const y = y0 + Math.sin(a) * 30 - (a - from) * 60;
          if (a === from) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
  /**
   * Before the surge: one continuous thin stream rising from the middle of the pit to the top of the view,
   * bright at the base and fading upward (사용자 “잘려보이잖아 이어져있는게 아니고”), with wisps curling round it.
   */
  drawTrickle(ctx, cam) {
    const F = ARENA.fountain, f = this.fountain, [px, py, prx, pry] = this.pit, k = clamp01(f.t / F.build), t = this.time;
    const baseY = py - cam.y, cx = px - cam.x, reach = clamp01(f.t / 1.2), top = baseY - (baseY + 60) * reach;
    ctx.fillStyle = `rgba(2,10,34,${0.35 * k})`; ctx.fillRect(-SCREEN_W, -SCREEN_H, SCREEN_W * 3, SCREEN_H * 3);
    // 레퍼런스 1: 구덩이 안이 청록 수면으로 차오르고, 그 한가운데로 곧은 빛줄기 하나
    this.drawPitWater(ctx, cx, baseY, prx, pry, easeOut(clamp01(f.t / 2.5)));
    // 줄기 둘레를 크게 휘감는 물살 두 가닥(뒤 반쪽은 어둡게, 앞 반쪽은 밝게)
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const spin = t * 1.6 + i * Math.PI, rr = prx * (0.55 + 0.25 * k), lift = (baseY - top) * 0.55;
      for (const front of [false, true]) {
        ctx.strokeStyle = front ? `rgba(90,210,245,${0.5 + 0.4 * k})` : `rgba(30,90,120,${0.4 + 0.3 * k})`;
        ctx.lineWidth = 3 + 5 * k; ctx.beginPath();
        for (let a = 0; a <= 1; a += 0.04) {
          const ang = spin + a * Math.PI * 1.3, x = cx + Math.cos(ang) * rr * (1 - a * 0.55), y = baseY + Math.sin(ang) * pry * 0.8 * (1 - a * 0.55) - a * lift;
          if ((Math.sin(ang) > 0) !== front) { ctx.moveTo(x, y); continue; }
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    const w = 5 + 7 * k;
    for (const [inset, color] of [[0, `rgba(47,182,224,0.85)`], [w * 0.3, 'rgba(230,252,250,0.97)']]) {
      ctx.fillStyle = color; ctx.fillRect(Math.round(cx - w / 2 + inset), Math.round(top), Math.round(w - inset * 2), Math.round(baseY - top));
    }
    ctx.strokeStyle = `rgba(200,245,255,${0.5 + 0.3 * k})`; ctx.lineWidth = 2;
    const ring = (t * 0.9) % 1;
    ctx.beginPath(); ctx.ellipse(cx, baseY, 10 + prx * 0.3 * ring, (10 + prx * 0.3 * ring) * (pry / prx), 0, 0, Math.PI * 2); ctx.stroke();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.actor) this.actor.flyY = 0;
    if (this.game.castleArena === this) this.game.castleArena = null;
  }
}
