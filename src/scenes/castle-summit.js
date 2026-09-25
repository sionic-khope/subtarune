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
    void game.sound.loadSfxFiles?.(['captain_transform', 'captain_thunder', 'rumble', 'wing', 'power', 'thud']);
    // 대치가 끝난 저장에서는 청소년·가재맨이 이미 자리에 있다
    if (game.has(SUMMIT.stage)) { this.giant = { t: SUMMIT.reveal }; this.aura = 1; this.perch(true); }
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
    const img = this.giant && this.game.propImages[V.giant.image];
    const k = this.giant ? Math.min(1, this.giant.t / SUMMIT.reveal) : 0, veil = this.giant ? 1 - ease(k) : 0;
    ctx.save();
    this.smoke.draw(ctx, cam, 'back');
    if (img) {
      const [x, y] = world([V.giant.x, V.giant.y]);
      ctx.globalAlpha = ease(k);
      drawFlutter(ctx, img, x - cam.x, y - cam.y, this.time);
      ctx.globalAlpha = 1;
      // 드러나는 동안: 짙은 연기가 청소년 앞을 덮고 있다가 걷힌다
      if (veil > 0.01) this.smoke.draw(ctx, cam, 'front', 0.8, veil * 1.6);
    }
    const front = this.game.propImages[V.front];
    if (front) ctx.drawImage(front, Math.round(1152 - cam.x), Math.round(-cam.y));
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
    ctx.restore();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.game.castleSummit === this) this.game.castleSummit = null;
  }
}
