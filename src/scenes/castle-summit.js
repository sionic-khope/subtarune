import { SCREEN_W, SCREEN_H } from '../core/layout.js';

/** BUILD337 tower summit: black smoke at the broken end, 청소년 rising out of it, gajaeman's aura and perch. */
export const SUMMIT = Object.freeze({
  map: 'gajaeman_castle_summit', stage: 'castle_summit_ready',
  smoke: { rate: 22, life: 3.2 },
  reveal: 4.0, breathe: 3.6,
  descend: 2.6, burst: 1.2, perch: 1.4,
});

const clamp01 = v => Math.max(0, Math.min(1, v));
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

export class CastleSummit {
  constructor(game, { rnd = Math.random } = {}) {
    this.game = game; this.map = game.map; this.rnd = rnd; this.disposed = false;
    this.meta = game.map.def.meta.summit;
    this.actor = game.entities.find(e => e.id === this.meta.gajaeman) || null;
    this.time = 0; this.acc = 0; this.clouds = []; this.motes = []; this.giant = null; this.aura = 0; this.tween = null;
    for (let i = 0; i < 40; i++) this.spawnCloud(true);
    void game.sound.loadSfxFiles?.(['captain_transform', 'captain_thunder', 'rumble', 'wing', 'power', 'thud']);
    // 대치가 끝난 저장에서는 청소년·가재맨이 이미 자리에 있다
    if (game.has(SUMMIT.stage)) { this.giant = { t: SUMMIT.reveal }; this.aura = 1; this.perch(true); }
  }
  get snapshot() { return { giant: this.giant ? +clamp01(this.giant.t / SUMMIT.reveal).toFixed(2) : 0, aura: this.aura, gajaeman: this.actor?.visible !== false && !!this.actor?.visible }; }
  spawnCloud(anywhere = false) {
    const [x0, x1] = this.meta.smoke;
    this.clouds.push({ x: x0 + this.rnd() * (x1 - x0), y: anywhere ? this.rnd() * 700 : 700 + this.rnd() * 60, vx: -8 + this.rnd() * 16,
      vy: -(14 + this.rnd() * 22), r: 24 + this.rnd() * 40, age: anywhere ? this.rnd() * SUMMIT.smoke.life : 0, life: SUMMIT.smoke.life + this.rnd() });
  }
  waitFor(done) { return new Promise(resolve => this.game.background.push({ update: () => { if (this.disposed || done()) { resolve(); return true; } return false; } })); }
  /** 청소년 slowly rises out of the black smoke (smoke thickens around her first). */
  revealGiant() {
    this.giant = { t: 0 };
    for (let i = 0; i < 60; i++) this.spawnCloud(true);
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
    const [sx, sy] = this.meta.giant.shoulder;
    a.visible = true; a.x = sx - 140; a.y = sy - 420; a.facing = 'left'; this.aura = 1;
    this.game.sound.sfx('captain_transform', { volume: 0.4 });
    return this.tweenActor(sx - 140, sy + 30, SUMMIT.descend);
  }
  /** Huge aura burst, rise, then land on 청소년's back shoulder. */
  auraAndPerch() {
    const a = this.actor; if (!a) return undefined;
    this.aura = 2; this.game.shake = { time: SUMMIT.burst, amp: 5 };
    this.game.sound.sfx('captain_thunder', { volume: 0.8 }); this.game.sound.sfx('power', { volume: 0.6 });
    const [sx, sy] = this.meta.giant.shoulder;
    return this.tweenActor(a.x, a.y - 260, SUMMIT.burst, k => k * k).then(() => {
      this.game.sound.sfx('wing', { volume: 0.5 });
      return this.tweenActor(sx - a.w / 2, sy - a.h, SUMMIT.perch);
    }).then(() => { this.aura = 1; this.game.sound.sfx('thud', { volume: 0.5 }); });
  }
  perch(instant) {
    const a = this.actor; if (!a) return;
    const [sx, sy] = this.meta.giant.shoulder;
    a.visible = true; a.facing = 'left'; if (instant) { a.x = sx - a.w / 2; a.y = sy - a.h; }
  }
  update(dt) {
    const g = this.game;
    if (this.disposed) return;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    const s = Math.max(0, dt); this.time += s;
    this.acc += SUMMIT.smoke.rate * s;
    while (this.acc >= 1) { this.acc -= 1; this.spawnCloud(); }
    for (const c of this.clouds) { c.age += s; c.x += c.vx * s; c.y += c.vy * s; c.r += 6 * s; }
    this.clouds = this.clouds.filter(c => c.age < c.life);
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
  /** Giant (behind the smoke), then the smoke, then aura motes. Drawn after actors so the giant towers over the walkway. */
  draw(ctx, cam) {
    if (this.disposed) return;
    ctx.save();
    const G = this.meta.giant, img = this.giant && this.game.propImages[G.image];
    if (img) {
      const k = clamp01(this.giant.t / SUMMIT.reveal), breath = Math.sin(this.time * Math.PI * 2 / SUMMIT.breathe);
      const w = img.width * (1 + 0.008 * breath), h = img.height * (1 + 0.018 * breath);
      // 제자리에서 연기가 걷히며 드러난다(올라오지 않는다, 사용자 “연기가 걷어지면서 나오는거야”)
      const x = G.x - w / 2 - cam.x, y = G.bottom - h - cam.y - breath * 4;
      ctx.globalAlpha = ease(k);
      ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
      const neck = ctx.createLinearGradient(0, y - 20, 0, y + 70);
      neck.addColorStop(0, 'rgba(0,0,0,1)'); neck.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neck; ctx.fillRect(Math.round(x) - 10, Math.round(y) - 20, Math.round(w) + 20, 90);
      ctx.globalAlpha = 1;
    }
    // 가재맨은 청소년 앞(어깨 위)에 보이게 한 번 더 위에 그린다
    if (this.actor?.visible && img) this.actor.draw(ctx, cam);
    for (const c of this.clouds) {
      const fade = Math.min(1, c.age / 0.6, (c.life - c.age) / 0.8);
      // 드러나기 전엔 연기가 짙게 덮고, 걷히면서 옅어진다
      const thin = this.giant ? 0.3 + 0.9 * (1 - clamp01(this.giant.t / SUMMIT.reveal)) : 1;
      ctx.globalAlpha = Math.max(0, fade * 0.85 * thin); ctx.fillStyle = c.r > 50 ? '#120c1c' : '#040307';
      const r = Math.round(c.r), cx = c.x - cam.x, cy = c.y - cam.y;
      if (cx < -r || cx > SCREEN_W * 3 + r || cy < -r - SCREEN_H || cy > SCREEN_H * 3 + r) continue;
      for (let row = -r; row < r; row += 3) { const half = Math.round(Math.sqrt(1 - ((row + 1) / r) ** 2) * r * 1.3); ctx.fillRect(Math.round(cx - half), Math.round(cy + row), half * 2, 3); }
    }
    for (const m of this.motes) {
      ctx.globalAlpha = Math.max(0, 1 - m.age / m.life); ctx.fillStyle = m.purple ? '#4a2478' : '#050208';
      ctx.fillRect(Math.round(m.x - cam.x), Math.round(m.y - cam.y), m.size, m.size + 1);
    }
    ctx.restore();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.game.castleSummit === this) this.game.castleSummit = null;
  }
}
