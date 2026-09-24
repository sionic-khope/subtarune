import { SCREEN_W, SCREEN_H } from '../core/layout.js';

/** BUILD323 cathedral climb: all tuning lives here so the cutscene and the field hazard share one source. */
export const CATHEDRAL = Object.freeze({
  map: 'gajaeman_castle_cathedral', actor: 'cathedral_gajaeman', stage: 'castle_cathedral_climb',
  introBgm: 'castle_gajaeman', climbBgm: 'cathedral_climb',
  sword: 'assets/props/cathedral323_sword.png', swordW: 76, swordH: 160,
  // Three 64px lanes of the aisle (x 288–480). Hit width equals the drawn warning band.
  lanes: [320, 384, 448], hitHalf: 22, hitTop: 24,
  charge: 1.0, chargeTop: 4, fallSpeed: 1100, damage: 15,
  knock: { vy: 240, t: 0.28 }, invuln: 0.9,
  // Difficulty follows climb progress (0 at the aisle foot, 1 near the top).
  interval: [1.9, 1.05], doubleFrom: [0.3, 0.6], doubleChance: [0.4, 0.75], chaseLane: 0.6,
  startY: 7560, stopY: 560, topY: 120,
  windResist: 0.72, heartAlpha: 0.76, focusDrop: 74,
  top: [360, 260], hover: { amplitude: 5, period: 2.6 },
  duration: { descend: 2.1, rise: 1.2, forge: 1.8 }, entryHeight: 300, riseHeight: 900,
  fan: [[-128, 34, -0.3], [-64, 14, -0.15], [0, 0, 0], [64, 14, 0.15], [128, 34, 0.3]],
});

const clamp01 = value => Math.max(0, Math.min(1, value));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = value => 1 - (1 - clamp01(value)) ** 3;

/** Pure schedule rule, exported for tests: which lanes the next volley uses. */
export function pickVolley(progress, playerLane, rnd = Math.random) {
  const c = CATHEDRAL, p = clamp01(progress);
  const chance = p < c.doubleFrom[0] ? 0 : p < c.doubleFrom[1] ? c.doubleChance[0] : c.doubleChance[1];
  const others = [0, 1, 2].filter(lane => lane !== playerLane);
  const first = rnd() < c.chaseLane ? playerLane : others[Math.floor(rnd() * others.length) % others.length];
  if (rnd() >= chance) return [first];
  const rest = [0, 1, 2].filter(lane => lane !== first);
  const second = first === playerLane ? rest[Math.floor(rnd() * rest.length) % rest.length] : playerLane;
  return [first, second].sort();
}

/** Seconds between volleys at a given progress. */
export const volleyInterval = progress => lerp(CATHEDRAL.interval[0], CATHEDRAL.interval[1], clamp01(progress));

/** Nearest lane index for a world x. */
export const laneOf = x => CATHEDRAL.lanes.reduce((best, lx, i) => Math.abs(lx - x) < Math.abs(CATHEDRAL.lanes[best] - x) ? i : best, 0);

/** The drawn blade and its hit rectangle share this geometry. */
export function swordHitRect(sword) {
  const c = CATHEDRAL, x = c.lanes[sword.lane];
  return { x: x - c.hitHalf, y: sword.y + c.hitTop, w: c.hitHalf * 2, h: c.swordH - c.hitTop };
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Owns the gajaeman offsets, wind, the lane swords and the heart overlay; the DSL owns lines and flags. */
export class CastleCathedral {
  constructor(game, { rnd = Math.random } = {}) {
    this.game = game; this.map = game.map; this.rnd = rnd;
    this.actor = game.entities.find(entity => entity.id === CATHEDRAL.actor && !entity.dead) || null;
    this.origin = this.actor ? [this.actor.x, this.actor.y] : [0, 0];
    this.beat = 'idle'; this.elapsed = 0; this.hover = 0; this.time = 0;
    this.wind = 0; this.windTarget = 0; this.streaks = [];
    this.swords = []; this.nextVolley = 0; this.fan = 0;
    this.climbing = false; this.heart = false; this.handles = new Set(); this.disposed = false;
    this.focus = { x: 0, y: 0, w: 0, h: 0 };
    for (let i = 0; i < 110; i++) this.streaks.push(this.newStreak(true));
    void game.sound.loadSfxFiles?.(['spearappear', 'knight_cut', 'captain_thunder', 'captain_transform', 'wing', 'damage', 'chime']);
    if (game.has(CATHEDRAL.stage)) this.resume();
  }
  get done() { return this.disposed || this.elapsed >= (CATHEDRAL.duration[this.beat] || 0); }
  get snapshot() {
    return { beat: this.beat, climbing: this.climbing, heart: this.heart, wind: this.wind,
      swords: this.swords.map(s => ({ lane: s.lane, phase: s.phase, y: s.y })), progress: this.progress() };
  }
  sound(key, volume) {
    const handle = this.game.sound.sfx(key, { volume });
    if (handle?.pause) this.handles.add(handle);
    return handle;
  }
  progress() {
    const p = this.game.player; if (!p) return 0;
    return clamp01((CATHEDRAL.startY - p.y) / (CATHEDRAL.startY - CATHEDRAL.topY));
  }
  /** Saved climbs return with the boss at the top and the hazard armed. */
  resume() {
    this.placeAtTop(); this.fan = 1; this.wind = this.windTarget = 0.75; this.start(false);
  }
  placeAtTop() {
    if (!this.actor) return;
    [this.actor.x, this.actor.y] = CATHEDRAL.top; this.actor.visible = true;
    this.actor.flyY = 0; this.actor.spin = 0; this.actor.facing = 'down';
  }
  setBeat(name) {
    if (this.disposed || this.beat === name || !this.actor) return;
    this.beat = name; this.elapsed = 0;
    if (name === 'descend') {
      this.actor.visible = true; this.actor.facing = 'down';
      this.actor.y = this.origin[1] - CATHEDRAL.entryHeight;
      this.sound('captain_transform', 0.35);
    }
    if (name === 'rise') { this.riseFrom = this.actor.y; this.sound('captain_thunder', 0.7); this.sound('wing', 0.5); }
    if (name === 'forge') { this.placeAtTop(); this.fan = 0; this.sound('spearappear', 0.7); }
  }
  setWind(value) { this.windTarget = value; if (value > 0 && this.wind < 0.05) this.game.shake = { time: 0.5, amp: 3 }; }
  /** Fast camera return that the DSL awaits before the hazard starts. */
  panToPlayer(seconds) {
    const g = this.game, cam = g.camera, sx = cam.x, sy = cam.y;
    this.climbing = true; this.updateFocus(); this.climbing = false;
    const tx = Math.max(0, Math.min(this.map.pxW - SCREEN_W, this.focus.x - SCREEN_W / 2));
    const ty = Math.max(0, Math.min(this.map.pxH - SCREEN_H, this.focus.y - (this.map.def.followScreenY ?? SCREEN_H / 2)));
    cam.locked = true;
    let t = 0;
    return new Promise(resolve => g.background.push({ update: dt => {
      if (this.disposed) { resolve(); return true; }
      t += dt; const k = ease(t / seconds);
      cam.x = sx + (tx - sx) * k; cam.y = sy + (ty - sy) * k;
      if (t < seconds) return false;
      resolve(); return true;
    } }));
  }
  /** Arms the lane swords, the heart and the wind drag. */
  start(fresh = true) {
    if (this.disposed) return;
    const g = this.game;
    this.climbing = true; this.heart = true; this.nextVolley = fresh ? 0.8 : 1.2;
    g.windResist = CATHEDRAL.windResist;
    g.camera.locked = false; this.updateFocus(); g.camera.target = this.focus;
    if (g.sound.bgmName !== CATHEDRAL.climbBgm) g.sound.playBgm(CATHEDRAL.climbBgm, { volume: 0.45, fadeIn: 0.3 });
  }
  updateFocus() {
    const p = this.game.player; if (!p) return;
    this.focus.x = p.x; this.focus.w = p.w; this.focus.h = p.h;
    this.focus.y = p.y - (this.climbing ? CATHEDRAL.focusDrop : 0);
  }
  newStreak(anywhere = false) {
    const r = this.rnd;
    return { x: r() * (SCREEN_W + 120) - 60, y: anywhere ? r() * SCREEN_H : -80 - r() * 120,
      len: 30 + r() * 90, speed: 620 + r() * 560, w: 2 + Math.floor(r() * 3), sway: r() * Math.PI * 2,
      color: ['#040208', '#140a22', '#2c1745', '#4a2a78', '#7a4bb3'][Math.floor(r() * 5)], alpha: 0.4 + r() * 0.5 };
  }
  update(dt) {
    if (this.disposed) return;
    const g = this.game, c = CATHEDRAL;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    const seconds = Math.max(0, dt);
    this.time += seconds; this.elapsed += seconds; this.hover += seconds;
    this.wind += (this.windTarget - this.wind) * Math.min(1, seconds * 3);
    for (const s of this.streaks) {
      s.y += s.speed * (0.35 + this.wind) * seconds; s.x += Math.sin(this.time * 2 + s.sway) * 18 * seconds;
      if (s.y > SCREEN_H + 60) Object.assign(s, this.newStreak());
    }
    const a = this.actor;
    if (a && a.visible && this.beat !== 'rise') a.flyY = Math.sin(this.hover * Math.PI * 2 / c.hover.period) * c.hover.amplitude;
    if (a && this.beat === 'descend') a.y = this.origin[1] - c.entryHeight * (1 - ease(this.elapsed / c.duration.descend));
    if (a && this.beat === 'rise') {
      const k = clamp01(this.elapsed / c.duration.rise);
      a.y = this.riseFrom - c.riseHeight * k * k;
      if (k === 1) a.visible = false;
    }
    if (this.beat === 'forge') this.fan = clamp01(this.elapsed / c.duration.forge);
    if (g.darkSmoke?.aura?.actor === a && a) {
      g.darkSmoke.source.x = a.x + a.w / 2;
      g.darkSmoke.source.y = a.y + a.h + (a.flyY || 0) - 30;
    }
    if (!this.climbing) return;
    this.updateFocus();
    if (!g.camera.locked && g.camera.target !== this.focus && !g.dialogue.running) g.camera.target = this.focus;
    if (g.state !== 'field' || g.dialogue.running || g.transitioning) return;
    const p = g.player, cam = g.camera, progress = this.progress();
    let cut = false;
    for (const s of this.swords) {
      s.t += seconds;
      if (s.phase === 'charge') {
        s.y = cam.y + c.chargeTop;
        if (s.t >= c.charge) { s.phase = 'fall'; s.t = 0; cut = true; }
      } else if (s.phase === 'fall') {
        s.y += c.fallSpeed * seconds;
        if (!(g.invuln > 0) && overlaps(swordHitRect(s), p.rect)) this.hit();
        if (s.y > cam.y + SCREEN_H + 40) s.phase = 'done';
      }
    }
    if (cut) this.sound('knight_cut', 0.7);
    this.swords = this.swords.filter(s => s.phase !== 'done');
    const armed = p.y < c.startY && p.y > c.stopY;
    this.nextVolley -= seconds;
    if (armed && this.nextVolley <= 0 && !this.swords.some(s => s.phase === 'charge')) {
      for (const lane of pickVolley(progress, laneOf(p.x + p.w / 2), this.rnd)) {
        this.swords.push({ lane, phase: 'charge', t: 0, y: cam.y + c.chargeTop });
      }
      this.sound('spearappear', 0.55);
      this.nextVolley = volleyInterval(progress);
    }
  }
  /** One contact: whole party −15 once, a short backward slide, then the shared invulnerability window. */
  hit() {
    const g = this.game, c = CATHEDRAL;
    g.damagePartyAll(c.damage);
    g.invuln = c.invuln; g.hurt = 0.32; g.shake = { time: 0.25, amp: 3 };
    this.sound('damage', 0.8);
    const knock = { vx: 0, vy: c.knock.vy, t: c.knock.t, dur: c.knock.t };
    g.player.knock = { ...knock }; g.player.trail = [];
    for (const e of g.entities) if (e.def?.type === 'follower') e.knock = { ...knock };
  }
  drawSword(ctx, image, x, y, alpha = 1, angle = 0, scale = 1) {
    const c = CATHEDRAL;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y + c.swordH * scale / 2)); if (angle) ctx.rotate(angle);
    ctx.drawImage(image, Math.round(-c.swordW * scale / 2), Math.round(-c.swordH * scale / 2), Math.round(c.swordW * scale), Math.round(c.swordH * scale));
    ctx.restore();
  }
  /** The forged fan hangs above the boss's head (drawn after actors so the aisle floor never covers it). */
  drawFan(ctx, cam, image) {
    if (this.fan <= 0 || !this.actor) return;
    const [tx, ty] = CATHEDRAL.top, head = ty - 96, bob = Math.sin(this.time * 1.6) * 3;
    CATHEDRAL.fan.forEach(([dx, dy, angle], i) => {
      const appear = clamp01(this.fan * CATHEDRAL.fan.length - i);
      if (appear <= 0) return;
      const flicker = appear < 1 && Math.floor(this.time * 30) % 2 ? 0.35 : 1;
      const x = tx + 12 + dx - cam.x, top = head - CATHEDRAL.swordH * 0.9 + dy + bob - cam.y;
      this.drawSword(ctx, image, x, top, appear * flicker, angle, 0.9);
      if (appear < 1) {
        ctx.save(); ctx.globalAlpha = 1 - appear; ctx.strokeStyle = '#6a4bd6'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x, top - 30); ctx.lineTo(x + 6, top + 20); ctx.lineTo(x - 5, top + 70); ctx.lineTo(x + 3, top + 130); ctx.stroke();
        ctx.restore();
      }
    });
  }
  /** Swords, lane warnings and the wind share the world camera; the dialogue UI stays on top. */
  draw(ctx, cam) {
    if (this.disposed) return;
    const c = CATHEDRAL, image = this.game.propImages[c.sword];
    if (image) this.drawFan(ctx, cam, image);
    for (const s of this.swords) {
      const x = c.lanes[s.lane] - cam.x, rect = swordHitRect(s);
      if (s.phase === 'charge') {
        const k = clamp01(s.t / c.charge), pulse = 0.18 + 0.22 * k + (Math.floor(s.t * 14) % 2 ? 0.08 : 0);
        ctx.fillStyle = `rgba(122,75,179,${pulse})`;
        ctx.fillRect(Math.round(rect.x - cam.x), Math.round(rect.y - cam.y), rect.w, SCREEN_H);
        ctx.fillStyle = `rgba(230,210,255,${0.25 + 0.5 * k})`;
        ctx.fillRect(Math.round(rect.x - cam.x), Math.round(rect.y - cam.y), 1, SCREEN_H);
        ctx.fillRect(Math.round(rect.x + rect.w - 1 - cam.x), Math.round(rect.y - cam.y), 1, SCREEN_H);
        if (image) this.drawSword(ctx, image, x, s.y - cam.y - (1 - k) * 18, 0.45 + 0.55 * k);
      } else if (image) {
        ctx.fillStyle = 'rgba(210,190,255,0.55)';
        for (const dx of [-14, -5, 6, 15]) ctx.fillRect(Math.round(x + dx), Math.round(s.y - cam.y - 46 + Math.abs(dx)), 1, 40);
        this.drawSword(ctx, image, x, s.y - cam.y);
      }
    }
    if (this.wind > 0.01) this.drawWind(ctx);
  }
  drawWind(ctx) {
    const w = this.wind;
    ctx.save();
    const cam = this.game.camera, zoom = this.game.zoom?.s ?? 1;
    const ox = cam.x - (SCREEN_W / zoom - SCREEN_W) / 2, oy = cam.y - (SCREEN_H / zoom - SCREEN_H) / 2;
    const vw = SCREEN_W / zoom, vh = SCREEN_H / zoom;
    const veil = ctx.createLinearGradient(0, oy - cam.y, 0, oy - cam.y + vh * 0.75);
    veil.addColorStop(0, `rgba(12,4,24,${0.62 * w})`); veil.addColorStop(1, 'rgba(12,4,24,0)');
    ctx.fillStyle = veil; ctx.fillRect(ox - cam.x, oy - cam.y, vw, vh);
    for (let i = 0; i < 7; i++) {
      const by = ((this.time * 300 * (0.6 + w) + i * 120) % (vh + 300)) - 220;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const tint = i % 2 ? '8,3,16' : '70,38,110';
      g.addColorStop(0, `rgba(${tint},${0.42 * w})`); g.addColorStop(1, `rgba(${tint},0)`);
      ctx.save(); ctx.translate(ox - cam.x + vw * ((0.1 + 0.27 * i) % 1), oy - cam.y + by); ctx.scale(130 + (i % 3) * 40, 70 + (i % 2) * 30);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    for (const s of this.streaks) {
      ctx.globalAlpha = s.alpha * w; ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(ox - cam.x + s.x * vw / SCREEN_W), Math.round(oy - cam.y + s.y * vh / SCREEN_H), s.w, Math.round(s.len * (0.5 + w)));
    }
    ctx.restore();
  }
  /** Heart and half-transparent body while the climb is armed (malzahar runner alpha). */
  drawPlayer(ctx, cam, player, drawBody) {
    ctx.save(); ctx.globalAlpha *= CATHEDRAL.heartAlpha; drawBody(); ctx.restore();
    const g = this.game;
    if (g.invuln > 0 && Math.floor(g.invuln * 16) % 2) return;
    const x = Math.round(player.x + player.w / 2 - 3 - cam.x), y = Math.round(player.y + player.h - 30 - cam.y);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x, y + 1, 2, 2); ctx.fillRect(x + 3, y + 1, 2, 2); ctx.fillRect(x - 1, y + 3, 7, 2);
    ctx.fillRect(x, y + 5, 5, 1); ctx.fillRect(x + 1, y + 6, 3, 1); ctx.fillRect(x + 2, y + 7, 1, 1);
  }
  /** Idempotent: no flags, the story owns completion. Music is left to the map/story rules. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const g = this.game;
    for (const handle of this.handles) handle.pause();
    this.handles.clear(); this.swords.length = 0;
    if (g.windResist) g.windResist = 1;
    if (g.camera.target === this.focus) g.camera.target = g.player;
    if (this.actor) { this.actor.flyY = 0; this.actor.spin = 0; }
    if (g.darkSmoke?.aura?.actor === this.actor) g.darkSmoke = null;
    if (g.castleCathedral === this) g.castleCathedral = null;
  }
}

/** Title/reset/map cancellation: stop the intro theme only if the intro still owns it. */
export function finishCastleCathedral(game, abort = false) {
  const scene = game.castleCathedral;
  if (!scene) return;
  if (abort && !scene.climbing && game.sound.bgmName === CATHEDRAL.introBgm) game.sound.stopBgm(0.2);
  scene.dispose();
}
