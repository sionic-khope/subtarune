import { SCREEN_W, SCREEN_H } from '../core/layout.js';
import { FX } from '../data/fx.js';
import { createEntity } from '../world/world.js';
import { CATHEDRAL, CastleCathedral } from './castle-cathedral.js';

/** BUILD325 second hall: mid-hall nine-sword stand-off, Youngcle/Junhee rescue, then laser-assisted triple volleys. */
export const CATHEDRAL2 = Object.freeze({
  map: 'gajaeman_castle_cathedral2', midY: 6260, rescueFlag: 'castle_cathedral_rescue_done', rescueScript: 'castle_cathedral_rescue',
  youngcle: 'cath2_youngcle', junhee: 'cath2_junhee',
  duration: { swarm: 1.9, gather: 3.0, rescue: 2.8 },
  // Nine overlapping swords hovering ahead of the party (x offset, y offset, tilt).
  swarm: [[-96, 22, -0.32], [-72, 8, -0.24], [-48, -4, -0.16], [-24, -12, -0.08], [0, -16, 0],
    [24, -12, 0.08], [48, -4, 0.16], [72, 8, 0.24], [96, 22, 0.32]],
  swarmAhead: 250,
  // Triple volley: all three lanes charge longer; Youngcle calls it, then lasers one lane open.
  triple: { every: 3, charge: 1.6, warnAt: 0.3, laserAt: 0.75, chance: 0.7 },
  escort: { x: 214, lead: -36, wobble: 10 },
  laserLife: 0.28,
});

const clamp01 = value => Math.max(0, Math.min(1, value));
const ease = value => 1 - (1 - clamp01(value)) ** 3;

/** Pure rule for tests: the lane Youngcle clears is never the one the player already stands in. */
export function laserLane(playerLane, rnd = Math.random) {
  const others = [0, 1, 2].filter(lane => lane !== playerLane);
  return others[Math.floor(rnd() * others.length) % others.length];
}

export class CastleCathedral2 extends CastleCathedral {
  constructor(game, options = {}) {
    super(game, options);
    this.cfg = { ...this.cfg, duration: { ...this.cfg.duration, ...CATHEDRAL2.duration } };
    const find = id => game.entities.find(entity => entity.id === id && !entity.dead) || null;
    this.youngcle = find(CATHEDRAL2.youngcle); this.junheeNpc = find(CATHEDRAL2.junhee);
    this.swarm = []; this.lasers = []; this.debris = []; this.aura = 0;
    this.event = false; this.volleyCount = 0; this.lastTriple = -99;
    this.rescued = game.has(CATHEDRAL2.rescueFlag);
    void game.sound.loadSfxFiles?.(['laser_zap', 'break1', 'jump', 'impact', 'laser_charge', 'chime']);
    // BUILD328: 가재맨은 이미 다음 맵(남색 오르막)으로 가 있어 이 회랑에는 없다 — 검만 위에서 내려온다
    this.fan = 0; this.wind = this.windTarget = 0.75;
    this.start(false);
    if (this.rescued) this.setupSupport(true);
  }
  get snapshot() {
    return { ...super.snapshot, event: this.event, rescued: this.rescued, swarm: this.swarm.length,
      youngcle: this.youngcle ? { x: this.youngcle.x, y: this.youngcle.y, visible: this.youngcle.visible !== false } : null,
      junhee: !!this.game.entities.find(e => e.def?.type === 'follower' && e.id === 'junhee') };
  }
  volleysAllowed() { return !this.event; }
  /** Called by the field loop once the leader passes the middle; the DSL owns the lines. */
  checkRescue() {
    const g = this.game, p = g.player;
    if (this.rescued || this.event || !p || p.y > this.cfg.midY) return;
    if (g.state !== 'field' || g.dialogue.running || g.transitioning) return;
    this.event = true; this.swords.length = 0;
    g.runScript(CATHEDRAL2.rescueScript);
  }
  setBeat(name) {
    if (this.disposed) return;
    if (!['swarm', 'gather', 'rescue'].includes(name)) { super.setBeat(name); return; }
    if (this.beat === name) return;
    this.beat = name; this.elapsed = 0;
    const cx = CATHEDRAL.lanes[1], cy = this.cfg.midY - CATHEDRAL2.swarmAhead;
    if (name === 'swarm') {
      this.swarm = CATHEDRAL2.swarm.map(([dx, dy, tilt], i) => ({ x: cx + dx, y: cy + dy, tilt, appear: 0, delay: i * 0.12,
        hum: false, gone: false, vx: 0, vy: 0, spin: 0 }));
    }
    if (name === 'gather') { this.aura = 0; this.sound('laser_charge', 0.6); }
    if (name === 'rescue') {
      this.shots = 0; this.junheeLanded = false;
      if (this.youngcle) { this.youngcle.visible = true; this.youngcle.x = this.game.camera.x - 70; this.youngcle.y = cy + 60; this.youngcle.facing = 'right'; }
      if (this.junheeNpc) { this.junheeNpc.visible = false; }
    }
  }
  /** After the rescue lines: Junhee trails the party, Youngcle escorts on the left, the climb resumes. */
  async finishRescue() {
    this.setupSupport(false);
    this.rescued = true; this.event = false; this.nextVolley = 1.6; this.beat = 'idle'; this.elapsed = 0;
    await this.panToPlayer(0.8);
    this.game.camera.locked = false; this.updateFocus(); this.game.camera.target = this.focus;
  }
  setupSupport(restored) {
    const g = this.game;
    if (this.youngcle) {
      this.youngcle.visible = true; this.youngcle.facing = 'right';
      if (restored) { this.youngcle.x = CATHEDRAL2.escort.x; this.youngcle.y = g.player.y + CATHEDRAL2.escort.lead; }
    }
    this.ensureJunhee(restored ? g.player : this.junheeNpc);
    if (this.junheeNpc) this.junheeNpc.dead = true;
  }
  /** Junhee follows as a scene-owned trailing follower (not a battle party member). */
  ensureJunhee(from) {
    const g = this.game;
    if (g.entities.some(e => e.def?.type === 'follower' && e.id === 'junhee')) return;
    const at = from || g.player;
    const follower = createEntity({ type: 'follower', id: 'junhee', sprite: 'junhee', x: at.x, y: at.y, facing: 'up', slot: g.party.length + 1 }, g);
    if (follower) g.entities.push(follower);
  }
  spawnVolley(progress, playerLane) {
    const t = CATHEDRAL2.triple, c = this.cfg, cam = this.game.camera;
    this.volleyCount++;
    if (this.rescued && this.volleyCount - this.lastTriple >= t.every && this.rnd() < t.chance) {
      this.lastTriple = this.volleyCount;
      const target = laserLane(playerLane, this.rnd);
      for (const lane of [0, 1, 2]) this.swords.push({ lane, phase: 'charge', t: 0, y: cam.y + c.chargeTop, charge: t.charge, triple: true, laser: lane === target });
      this.sound('spearappear', 0.65);
      this.nextVolley = t.charge + 1.1;
      return;
    }
    super.spawnVolley(progress, playerLane);
  }
  afterSwords() {
    const t = CATHEDRAL2.triple;
    for (const s of this.swords) {
      if (!s.triple || s.phase !== 'charge') continue;
      if (s.laser && !s.warned && s.t >= t.warnAt) { s.warned = true; this.emote(this.youngcle); }
      if (s.laser && s.t >= t.laserAt) this.shoot({ x: CATHEDRAL.lanes[s.lane], y: s.y + 80 }, s);
    }
  }
  emote(entity) {
    if (!entity) return;
    entity.emote = { kind: '!', t: 0, life: 0.8 };
    this.sound('chime', 0.6);
  }
  /** One laser from Youngcle's cannon to a target point; a sword target shatters. */
  shoot(target, sword = null) {
    const y = this.youngcle; if (!y || !target) return;
    const from = [y.x + y.w / 2 + (y.flyX || 0) + 14, y.y - 34 + (y.flyY || 0)];
    this.lasers.push({ from, to: [target.x, target.y], age: 0 });
    this.sound('laser_zap', 0.5);
    if (sword) { sword.phase = 'broken'; sword.t = 0; this.burst(target.x, target.y, 10); this.sound('break1', 0.45); }
  }
  burst(x, y, count) {
    for (let i = 0; i < count; i++) this.debris.push({ x, y, vx: Math.cos(i * 2.39996) * (40 + i * 9), vy: -90 - i * 8, age: 0, size: 2 + i % 3 });
  }
  update(dt) {
    super.update(dt);
    if (this.disposed) return;
    const g = this.game, seconds = Math.max(0, dt), c = CATHEDRAL2;
    this.checkRescue();
    for (const beam of this.lasers) beam.age += seconds;
    this.lasers = this.lasers.filter(beam => beam.age < c.laserLife);
    for (const bit of this.debris) { bit.age += seconds; bit.x += bit.vx * seconds; bit.y += bit.vy * seconds; bit.vy += 260 * seconds; }
    this.debris = this.debris.filter(bit => bit.age < 1.2);
    if (this.beat === 'swarm') {
      for (const s of this.swarm) {
        s.appear = clamp01((this.elapsed - s.delay) / 0.35);
        if (!s.hum && s.appear > 0) { s.hum = true; this.sound('spearappear', 0.32); }
      }
    }
    if (this.beat === 'gather') this.aura = clamp01(this.elapsed / c.duration.gather);
    if (this.beat === 'rescue') this.updateRescue();
    for (const s of this.swarm) if (s.gone) { s.x += s.vx * seconds; s.y += s.vy * seconds; s.vy += 300 * seconds; s.spin += s.vs * seconds; }
    this.swarm = this.swarm.filter(s => !s.gone || s.y < this.game.camera.y + SCREEN_H + 200);
    if (this.rescued && this.youngcle && !this.event) {
      const e = CATHEDRAL2.escort, p = g.player;
      this.youngcle.x += (e.x + Math.sin(this.time * 1.3) * e.wobble - this.youngcle.x) * Math.min(1, seconds * 3);
      this.youngcle.y += (p.y + e.lead - this.youngcle.y) * Math.min(1, seconds * 4);
      this.youngcle.facing = 'right';
      this.ensureJunhee(g.player);
    }
  }
  /** Timed rescue: laser volley from the left, then Junhee leaps in from the right and scatters the rest. */
  updateRescue() {
    const t = this.elapsed, y = this.youngcle, cy = this.cfg.midY - CATHEDRAL2.swarmAhead, cam = this.game.camera;
    if (y) y.x = (cam.x - 70) + (CATHEDRAL2.escort.x - (cam.x - 70)) * ease(t / 0.6);
    const live = () => this.swarm.filter(s => !s.gone);
    for (const at of [0.75, 0.98, 1.21]) {
      if (t >= at && this.shots < [0.75, 0.98, 1.21].indexOf(at) + 1) {
        this.shots++;
        const hits = live().filter((_, i) => i % 3 === this.shots - 1).slice(0, 3);
        const aim = hits[0] || { x: CATHEDRAL.lanes[0], y: cy };
        this.shoot({ x: aim.x, y: aim.y });
        for (const s of hits) this.scatter(s);
        this.burst(aim.x, aim.y, 8); this.sound('break1', 0.4);
      }
    }
    const j = this.junheeNpc;
    if (j && t >= 1.35) {
      const k = clamp01((t - 1.35) / 0.55), sx = cam.x + SCREEN_W + 40, sy = cy + 40, tx = CATHEDRAL.lanes[2] + 20, ty = cy + 70;
      j.visible = true; j.facing = 'left';
      j.x = sx + (tx - sx) * k; j.y = sy + (ty - sy) * k; j.hopY = Math.sin(Math.PI * k) * 70;
      if (!this.jumped) { this.jumped = true; this.sound('jump', 0.6); }
      if (k === 1 && !this.junheeLanded) {
        this.junheeLanded = true; j.hopY = 0;
        this.sound('impact', 0.8); this.sound('break1', 0.5); this.game.shake = { time: 0.4, amp: 4 };
        this.game.playBoom?.({ ...FX.explosion, src: FX.explosion.sheet, x: tx - 20, y: cy + 20, scale: 0.5 });
        for (const s of live()) this.scatter(s);
      }
    }
    if (j && t >= 2.1) {
      const k = clamp01((t - 2.1) / 0.5), fx = CATHEDRAL.lanes[2] + 20, fy = cy + 70, gx = CATHEDRAL.lanes[2], gy = this.cfg.midY + 40;
      j.x = fx + (gx - fx) * k; j.y = fy + (gy - fy) * k; j.hopY = Math.sin(Math.PI * k) * 26; j.facing = 'left';
    }
  }
  scatter(sword) {
    if (sword.gone) return;
    sword.gone = true; sword.vx = (160 + this.rnd() * 160) * (sword.x < CATHEDRAL.lanes[1] ? -1 : 1);
    sword.vy = -220 - this.rnd() * 160; sword.vs = (this.rnd() - 0.5) * 14;
  }
  draw(ctx, cam) {
    super.draw(ctx, cam);
    if (this.disposed) return;
    const image = this.game.propImages[CATHEDRAL.sword];
    if (image && this.swarm.length) {
      if (this.aura > 0) {
        const cx = CATHEDRAL.lanes[1] - cam.x, cy = this.cfg.midY - CATHEDRAL2.swarmAhead + 60 - cam.y;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 + 90 * this.aura);
        g.addColorStop(0, `rgba(215,150,255,${0.8 * this.aura})`); g.addColorStop(0.45, `rgba(140,70,220,${0.45 * this.aura})`); g.addColorStop(1, 'rgba(90,40,160,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - 170, cy - 170, 340, 340);
        ctx.fillStyle = `rgba(230,200,255,${0.7 * this.aura})`;
        for (let i = 0; i < 18; i++) {
          const a = i * 0.349 + this.time * 2, r = (1 - ((this.time * 0.9 + i * 0.13) % 1)) * (80 + 70 * this.aura);
          ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.6), 2, 2);
        }
      }
      for (const s of this.swarm) {
        const alpha = s.gone ? 1 : s.appear * (s.appear < 1 && Math.floor(this.time * 30) % 2 ? 0.4 : 1);
        if (alpha <= 0) continue;
        const shiver = this.aura > 0 && !s.gone ? Math.sin(this.time * 40 + s.delay * 9) * this.aura * 2 : 0;
        this.drawSword(ctx, image, s.x - cam.x + shiver, s.y - cam.y - 80, alpha, s.tilt + (s.spin || 0), 0.9);
      }
    }
    ctx.save();
    for (const beam of this.lasers) {
      const width = (1 - beam.age / CATHEDRAL2.laserLife) * 8;
      for (const [size, color] of [[width * 2.6, '#8152cc'], [width, '#86e8ff'], [Math.max(1, width * 0.35), '#ffffff']]) {
        ctx.strokeStyle = color; ctx.lineWidth = size; ctx.beginPath();
        ctx.moveTo(Math.round(beam.from[0] - cam.x), Math.round(beam.from[1] - cam.y));
        ctx.lineTo(Math.round(beam.to[0] - cam.x), Math.round(beam.to[1] - cam.y)); ctx.stroke();
      }
    }
    for (const bit of this.debris) {
      ctx.globalAlpha = Math.min(1, (1.2 - bit.age) * 2); ctx.fillStyle = bit.size === 2 ? '#b89cff' : '#2a1d3a';
      ctx.fillRect(Math.round(bit.x - cam.x), Math.round(bit.y - cam.y), bit.size, bit.size);
    }
    ctx.restore();
  }
}

