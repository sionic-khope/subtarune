/** An anchored screen overlay; the standard cutscene runner owns dialogue and actors. */
export class TvBroadcast {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.anchor = game.entities.find(entity => entity.id === config.anchor);
    this.phase = 'off';
    this.expression = 'smirk';
    this.elapsed = 0;
    this.time = 0;
    this.disposed = false;
  }

  /** The power click fires once; the screen expands from a thin horizontal scan. */
  power(on) {
    if (this.disposed) return;
    this.phase = on ? 'powering' : 'shutting';
    this.elapsed = 0;
    if (on) this.game.sound.sfx(this.config.sound, { volume: 0.65 });
  }

  /** Match the on-screen acting pose to the dialogue's named portrait. */
  setExpression(expression) { this.expression = expression; }

  /** Progress without blocking player-independent dialogue typing. */
  update(dt) {
    if (this.disposed) return;
    this.time += dt; this.elapsed += dt;
    if (this.phase === 'powering' && this.elapsed >= this.config.powerTime) this.phase = 'on';
    if (this.phase === 'shutting' && this.elapsed >= this.config.shutdownTime) this.phase = 'off';
  }

  /** The frame and screen share world coordinates and the caller's camera/zoom transform. */
  screenRect(cam) {
    const [left, top, width, height] = this.config.inset;
    return { x: Math.round((this.anchor.drawX ?? this.anchor.x) - cam.x + left),
      y: Math.round((this.anchor.drawY ?? this.anchor.y) - cam.y + top), width, height };
  }

  /** Clip CRT glow, scanlines and upper-body animation strictly inside the frame inset. */
  draw(ctx, cam) {
    if (this.disposed || this.phase === 'off' || !this.anchor) return;
    const r = this.screenRect(cam);
    const progress = this.phase === 'powering' ? Math.min(1, this.elapsed / this.config.powerTime)
      : this.phase === 'shutting' ? Math.max(0, 1 - this.elapsed / this.config.shutdownTime) : 1;
    const height = Math.max(2, Math.round(r.height * progress * progress));
    const top = r.y + Math.round((r.height - height) / 2);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, top, r.width, height); ctx.clip();
    ctx.globalAlpha = 1; ctx.fillStyle = '#17283a'; ctx.fillRect(r.x, r.y, r.width, r.height);
    const image = this.game.propImages[this.config.expressions[this.expression]];
    if (image && this.phase !== 'powering') {
      const bob = Math.round(Math.sin(this.time * (this.expression === 'laugh' ? 18 : 3)) * (this.expression === 'laugh' ? 2 : 1));
      const size = Math.round(r.height * 1.05);
      ctx.drawImage(image, Math.round(r.x + (r.width - size) / 2), r.y + bob, size, size);
    }
    ctx.fillStyle = '#c7f7ff';
    ctx.globalAlpha = this.phase === 'on' ? 0.06 : 0.65 * (1 - progress) + 0.1;
    for (let y = 0; y < r.height; y += 4) ctx.fillRect(r.x, r.y + y, r.width, 1);
    if (this.phase !== 'on') { ctx.globalAlpha = 0.8; ctx.fillRect(r.x, top, r.width, Math.min(2, height)); }
    ctx.restore();
  }

  /** Drop all scene references on map/title/QA cancellation. */
  dispose() { this.disposed = true; this.phase = 'off'; this.anchor = null; }
}
