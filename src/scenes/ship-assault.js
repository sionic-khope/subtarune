import { SHIP_ASSAULT as C } from '../data/ship-assault.js';
import { FX } from '../data/fx.js';
import { MaillardArrival } from './maillard-arrival.js';
import { BaronSeaChase } from './baron-sea-chase.js';

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const k = clamp(value); return k * k * (3 - 2 * k); };
const lerp = (from, to, k) => from + (to - from) * k;

/** Authored ship attack presentation; the standard dialogue runner owns progression. */
export class ShipAssault {
  constructor(game, config = C) {
    this.game = game;
    this.config = config;
    this.beat = 'room';
    this.time = 0;
    this.beatTime = 0;
    this.sailTime = 0;
    this.dust = [];
    this.explosions = [];
    this.impactClock = 0;
    this.explosionClock = 0;
    this.impactCount = 0;
    this.disposed = false;
    this.model = { scroll: 0, completed: true };
    this.ship = game.propImages[config.images.maillard];
    this.enemy = game.propImages[config.images.enemy];
  }

  /** Ocean rendering starts only under the authored opaque fade. */
  get ocean() { return !['room', 'return'].includes(this.beat); }

  /** Select an authored camera beat without starting another script runner. */
  setBeat(name) {
    this.beat = name;
    this.beatTime = 0;
    if (name === 'ocean') { this.dust = []; this.explode(); }
    if (name === 'return') { this.explosions = []; this.impactClock = 0; }
  }

  /** A room hit shares the existing heavy impact sounds and emits ceiling dust. */
  impact(strong = false) {
    if (this.disposed) return;
    const c = this.config.room;
    this.impactCount++;
    this.game.sound.sfx(strong ? 'boom' : 'rumble', { volume: strong ? 1 : 0.65 });
    this.game.shake = { time: c.shakeTime, amp: c.shakeAmp * (strong ? 2 : 1) };
    this.impactClock = 0;
    for (let i = 0; i < c.dustCount; i++) this.dust.push({
      x: (i * 79 + this.impactCount * 37) % 480,
      y: -8 - i % 5 * 11, vx: (i % 7 - 3) * 4, vy: 17 + i % 4 * 9,
      age: 0, size: i % 3 ? 2 : 3,
    });
  }

  /** Place the existing explosion sheet on alternating parts of Maillard's hull. */
  explode() {
    this.explosions.push({ age: 0, anchor: [0.28 + (this.impactCount++ % 3) * 0.22, 0.55] });
    this.game.sound.sfx(FX.explosion.sfx, { volume: 0.65 });
    this.game.shake = { time: 0.3, amp: 2 };
  }

  /** Time-driven atmosphere continues while the player reads each dialogue box. */
  update(dt) {
    if (this.disposed) return;
    this.time += dt; this.beatTime += dt; this.sailTime += dt;
    this.model.scroll -= dt * this.config.ocean.waterSpeed;
    if (this.ocean) {
      this.explosionClock += dt;
      if (this.explosionClock >= this.config.ocean.explosionPeriod && this.beat !== 'bridge') {
        this.explosionClock = 0; this.explode();
      }
      for (const explosion of this.explosions) explosion.age += dt;
      this.explosions = this.explosions.filter(explosion => explosion.age < FX.explosion.count / FX.explosion.fps);
    } else {
      this.impactClock += dt;
      if (this.impactClock >= this.config.room.period) this.impact();
      for (const p of this.dust) { p.age += dt; p.vy += this.config.room.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      this.dust = this.dust.filter(p => p.age < this.config.room.dustLife);
    }
  }

  /** Current ship bounds are shared by drawing, bridge attachment, FX and QA. */
  shipRects() {
    const f = this.config.framing;
    const reveal = this.beat === 'ocean' ? 0 : this.beat === 'reveal' ? smooth(this.beatTime / this.config.timing.reveal) : 1;
    const approach = ['bridge', 'return'].includes(this.beat) ? 1 : this.beat === 'approach' ? smooth(this.beatTime / this.config.timing.approach) : 0;
    const ratio = image => image ? image.height / image.width : 1;
    // Keep both complete silhouettes above the dialogue even if the delivered art is tall.
    const width = Math.min(f.width, 154 / (ratio(this.enemy) * f.enemyRatio));
    const maillardWidth = lerp(f.closeWidth, width, reveal);
    const enemyWidth = width * f.enemyRatio;
    const bob = Math.sin(this.time * this.config.ocean.bobRate) * this.config.ocean.bobHeight;
    const rect = (cx, cy, w, image) => ({ x: Math.round(cx - w / 2), y: Math.round(cy - w * ratio(image) / 2 + bob), width: Math.round(w), height: Math.round(w * ratio(image)) });
    return {
      maillard: rect(lerp(f.closeCenter[0], f.maillardCenter[0], reveal), lerp(f.closeCenter[1], f.maillardCenter[1], reveal), maillardWidth, this.ship),
      enemy: rect(lerp(680, f.enemyCenter[0] + f.enemyApproach * (1 - approach), reveal), f.enemyCenter[1], enemyWidth, this.enemy),
    };
  }

  /** Bridge tip travels from the enemy deck down onto Maillard's deck. */
  bridgeGeometry() {
    const { maillard, enemy } = this.shipRects(), f = this.config.framing;
    const anchor = (rect, pair) => [rect.x + rect.width * pair[0], rect.y + rect.height * pair[1]];
    const start = anchor(enemy, f.enemyAnchor), target = anchor(maillard, f.maillardAnchor);
    const progress = this.beat === 'bridge' ? smooth(this.beatTime / this.config.timing.bridge) : 0;
    return { start, target, tip: [lerp(start[0], target[0], progress), lerp(start[1] - 45, target[1], progress)], progress };
  }

  /** Reuse established ocean and wake artwork with the two finished PNG silhouettes. */
  draw(ctx) {
    BaronSeaChase.prototype.drawOcean.call(this, ctx);
    const rects = this.shipRects();
    for (const [image, rect] of [[this.enemy, rects.enemy], [this.ship, rects.maillard]]) {
      if (!image) continue;
      MaillardArrival.prototype.drawWake.call({ sailTime: this.sailTime }, ctx, rect);
      if (image === this.enemy) {
        ctx.save(); ctx.translate(rect.x + rect.width, rect.y); ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0, rect.width, rect.height); ctx.restore();
      } else ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
      MaillardArrival.prototype.drawWaterline.call(this, ctx, rect);
    }
    if (this.beat === 'bridge') this.drawBridge(ctx);
    const fx = FX.explosion, image = this.game.propImages[fx.sheet];
    if (!image) return;
    for (const explosion of this.explosions) {
      const frame = Math.min(fx.count - 1, Math.floor(explosion.age * fx.fps));
      const fw = image.width / fx.cols, fh = image.height / fx.rows, scale = this.config.ocean.explosionScale;
      const x = rects.maillard.x + rects.maillard.width * explosion.anchor[0];
      const y = rects.maillard.y + rects.maillard.height * explosion.anchor[1];
      ctx.drawImage(image, frame * fw, 0, fw, fh, Math.round(x - fw * scale / 2), Math.round(y - fh * scale / 2), Math.round(fw * scale), Math.round(fh * scale));
    }
  }

  /** Metal planks and handrails remain attached to both hull anchors as they bob. */
  drawBridge(ctx) {
    const { start, tip } = this.bridgeGeometry(), width = this.config.framing.bridgeWidth;
    const dx = tip[0] - start[0], dy = tip[1] - start[1], length = Math.hypot(dx, dy);
    ctx.save(); ctx.translate(Math.round(start[0]), Math.round(start[1])); ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = '#202b37'; ctx.fillRect(0, -width / 2, Math.round(length), width);
    ctx.fillStyle = '#83909a'; ctx.fillRect(0, -width / 2 + 2, Math.round(length), width - 4);
    ctx.fillStyle = '#c3aa6a';
    for (let x = 0; x < length; x += 7) ctx.fillRect(x, -width / 2 + 2, 2, width - 4);
    ctx.fillStyle = '#e0cc92'; ctx.fillRect(0, -width / 2 - 3, Math.round(length), 2); ctx.fillRect(0, width / 2 - 1, Math.round(length), 2);
    ctx.restore();
  }

  /** Ceiling dust overlays the room but stays behind the normal dialogue UI. */
  drawDust(ctx) {
    for (const p of this.dust) {
      ctx.globalAlpha = Math.min(0.8, (1 - p.age / this.config.room.dustLife) * 1.3);
      ctx.fillStyle = p.size === 3 ? '#b7a795' : '#e0c9a5';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /** Reset, title and map transitions release all presentation state. */
  dispose() { this.disposed = true; this.dust = []; this.explosions = []; this.game.shake = null; }
}
