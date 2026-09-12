import { loadImageOptional } from '../core/gfx.js';
import { MAILLARD_ARRIVAL as C } from '../data/cutscenes/obj5_maillard.js';
import { SCREEN_W } from '../world/world.js';

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const k = clamp(value); return k * k * (3 - 2 * k); };
const REVEALED = new Set(['reveal', 'hops', 'compose', 'spotlight', 'laugh', 'island']);

/** Camera-only presentation over the completed shooter; dialogue is authored in its DSL. */
export class MaillardArrival {
  constructor(game, sea) {
    this.game = game;
    this.sea = sea;
    this.beat = 'unstable';
    this.time = 0;
    this.beatTime = 0;
    this.ship = null;
    this.island = null;
    this.disposed = false;
    game.sound.preloadBgm('maillard_reveal');
    game.sound.preloadBgm('baron_intro');
    this.ready = Promise.all([loadImageOptional(C.ship), loadImageOptional(C.island)]).then(([ship, island]) => {
      if (!this.disposed) { this.ship = ship; this.island = island; }
    });
  }

  /** DSL action starts a single authored beat without advancing any dialogue itself. */
  setBeat(name) { this.beat = name; this.beatTime = 0; }

  /** Advance water, instability and visual time while the standard runner owns C/X. */
  update(dt) {
    this.time += dt;
    this.beatTime += dt;
    this.sea.model.time += dt;
    this.sea.model.scroll += dt * this.sea.model.config.scrollSpeed;
  }

  /** Reset/title/map disposal prevents late asset results from reviving this scene. */
  dispose() { this.disposed = true; }

  /** Fit the entire ship above the normal dialogue area after the oversized drop. */
  shipRect() {
    const ratio = this.ship ? this.ship.height / this.ship.width : 2 / 3;
    const targetWidth = Math.min(C.shipBox.width, C.shipBox.height / ratio);
    const silentWidth = Math.min(C.silentBox.width, C.silentBox.height / ratio);
    let width = targetWidth, centerY = C.shipBox.centerY;
    if (this.beat === 'reveal' || this.beat === 'hops') {
      const k = this.beat === 'reveal' ? smooth(this.beatTime / C.zoomDuration) : 1;
      width = C.fallWidth + (silentWidth - C.fallWidth) * k;
      centerY = C.silentBox.centerY;
    } else if (this.beat === 'compose') {
      const k = smooth(this.beatTime / C.composeDuration);
      width = silentWidth + (targetWidth - silentWidth) * k;
      centerY = C.silentBox.centerY + (C.shipBox.centerY - C.silentBox.centerY) * k;
    }
    const height = width * ratio;
    return { x: Math.round(C.shipBox.centerX - width / 2), y: Math.round(centerY - height / 2), width: Math.round(width), height: Math.round(height) };
  }

  /** Draw only scene content; main retains the same TextBox and fade layer as field play. */
  draw(ctx) {
    if (!REVEALED.has(this.beat)) {
      this.sea.drawOcean(ctx);
      ctx.save();
      const amp = this.beat === 'resurgence' ? 8 : 2;
      ctx.translate(Math.round(Math.sin(this.time * 32) * amp), Math.round(Math.sin(this.time * 25) * amp * 0.5));
      this.sea.drawBoss(ctx, this.beat === 'resurgence' ? this.sea.model.config.sheet.roar : null);
      ctx.restore();
      this.sea.drawRaft(ctx);
      if (this.beat === 'resurgence') this.drawSurge(ctx);
      if (['shadow', 'fall', 'impact'].includes(this.beat)) this.drawShadow(ctx);
      if (this.beat === 'fall' || this.beat === 'impact') this.drawFall(ctx);
      return;
    }
    this.sea.drawOcean(ctx);
    const rect = this.shipRect();
    const distance = this.beat === 'reveal' ? smooth(this.beatTime / C.zoomDuration) : 1;
    ctx.save(); ctx.globalAlpha = distance;
    ctx.translate(37, 205); ctx.scale(0.2, 0.2); ctx.translate(-this.sea.model.config.raft.x, -this.sea.model.raftY);
    this.sea.drawRaft(ctx); ctx.restore();
    ctx.save(); ctx.globalAlpha = distance;
    ctx.translate(415, 175); ctx.scale(0.14, 0.14); ctx.translate(-this.sea.model.bossX, -this.sea.model.bossY);
    this.sea.drawBoss(ctx); ctx.restore();
    if (['spotlight', 'laugh', 'island'].includes(this.beat)) {
      ctx.fillStyle = '#fff1ae'; ctx.globalAlpha = 0.17;
      for (const x of [68, 163, 271, 378]) ctx.fillRect(x, 0, 28, 225);
      ctx.globalAlpha = 1;
    }
    this.drawWake(ctx, rect);
    if (this.ship) ctx.drawImage(this.ship, rect.x, rect.y, rect.width, rect.height);
    this.drawJunhee(ctx, rect);
    if (this.beat === 'island' && this.island) {
      ctx.fillStyle = 'rgba(2,14,24,0.75)'; ctx.fillRect(0, 0, SCREEN_W, 230);
      const scale = Math.min(340 / this.island.width, 200 / this.island.height) * smooth(this.beatTime / 0.6);
      const width = Math.round(this.island.width * scale), height = Math.round(this.island.height * scale);
      ctx.drawImage(this.island, Math.round((SCREEN_W - width) / 2), Math.round(115 - height / 2), width, height);
    }
  }

  /** Growing stepped shadow spans the ocean before any part of the ship is visible. */
  drawShadow(ctx) {
    const k = this.beat === 'shadow' ? smooth(this.beatTime / C.shadowDuration) : 1;
    ctx.fillStyle = '#061e36'; ctx.globalAlpha = 0.18 + k * 0.57;
    for (let row = 0; row < 15; row++) {
      const breadth = Math.round((90 + k * 620) * Math.sin((row + 1) / 16 * Math.PI));
      ctx.fillRect(240 - breadth / 2, Math.round(80 + row * (5 + k * 10)), breadth, Math.ceil(5 + k * 10));
    }
    ctx.globalAlpha = 1;
  }

  /** The hull accelerates from entirely off-screen, then the DSL supplies impact flash. */
  drawFall(ctx) {
    if (!this.ship) return;
    const k = this.beat === 'impact' ? 1 : clamp(this.beatTime / C.fallDuration), height = C.fallWidth * this.ship.height / this.ship.width;
    const y = -height - 80 + (height + 130) * k * k;
    ctx.drawImage(this.ship, Math.round(240 - C.fallWidth / 2), Math.round(y), C.fallWidth, Math.round(height));
  }

  /** Existing water colors form outward crests around the heavy, settled hull. */
  drawWake(ctx, rect) {
    const spread = this.beat === 'reveal' ? Math.min(1, this.beatTime / 1.6) : 1;
    ctx.fillStyle = '#c4f2ea';
    for (let i = 0; i < 18; i++) {
      const x = rect.x + rect.width * i / 17;
      const y = Math.min(220, rect.y + rect.height * 0.83) + Math.round(Math.sin(this.time * 3 + i) * 3);
      ctx.fillRect(Math.round(x - 12), Math.round(y + i % 3 * 4 + spread * 10), 25, 3);
    }
    if (this.beat === 'reveal' && this.beatTime < 1.8) {
      const k = this.beatTime / 1.8;
      for (let i = 0; i < 28; i++) {
        const side = i % 2 ? 1 : -1;
        const x = 240 + side * (75 + k * (145 + i % 5 * 15));
        const y = 260 - Math.sin(k * Math.PI) * (65 + i % 7 * 16);
        const size = Math.max(2, Math.round(11 * (1 - k)));
        ctx.fillStyle = i % 3 ? '#d8fff4' : '#75c7df';
        ctx.fillRect(Math.round(x), Math.round(y), size, size * 2);
      }
    }
  }

  /** Two small pink hops sell scale; laughter uses Junhee's already-approved motion frames. */
  drawJunhee(ctx, rect) {
    const x = Math.round(rect.x + rect.width * C.junheeAnchor[0]);
    let y = Math.round(rect.y + rect.height * C.junheeAnchor[1]);
    if (this.beat === 'hops' && this.beatTime < C.hopDuration * 2) y -= Math.round(Math.sin(this.beatTime % C.hopDuration / C.hopDuration * Math.PI) * 9);
    const laugh = this.game.characterMotions?.junhee?.laugh;
    if (this.beat === 'laugh' && laugh) {
      const cycle = Math.min(this.beatTime, C.laughDuration - 0.001);
      let elapsed = 0;
      const frame = laugh.frames.find(f => { elapsed += f.duration; return cycle < elapsed; }) || laugh.frames[0];
      const image = frame.image || frame.canvas;
      if (image) { ctx.drawImage(image, x - 6, y - 12, 12, 12); return; }
    }
    ctx.fillStyle = '#ffd2d6'; ctx.fillRect(x - 2, y - 5, 5, 5);
    ctx.fillStyle = '#ee8fa9'; ctx.fillRect(x - 3, y - 4, 7, 2);
  }

  /** Resurgence splashes radiate from the submerged neck without projectile or damage logic. */
  drawSurge(ctx) {
    const m = this.sea.model, y = m.waterline();
    for (let i = 0; i < 22; i++) {
      const k = (this.beatTime * 0.8 + i / 22) % 1;
      ctx.fillStyle = i % 2 ? '#d2fff3' : '#7acee1';
      ctx.fillRect(Math.round(m.bossX + 95 + Math.cos(i * 2.4) * k * 110), Math.round(y - Math.sin(k * Math.PI) * (25 + i % 4 * 13)), 4, 7);
    }
  }
}
