/** An anchored screen overlay; the standard cutscene runner owns dialogue and actors. */
export class TvBroadcast {
  constructor(game, config) {
    this.game = game;
    this.config = config;
    this.anchor = game.entities.find(entity => entity.id === config.anchor);
    this.phase = 'off';
    this.expression = 'smirk';
    this.elapsed = 0;
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
    this.elapsed += dt;
    if (this.phase === 'powering' && this.elapsed >= this.config.powerTime) this.phase = 'on';
    if (this.phase === 'shutting' && this.elapsed >= this.config.shutdownTime) this.phase = 'off';
  }

  /** The frame and screen share world coordinates and the caller's camera/zoom transform. */
  screenRect(cam) {
    // config.scale: 프레임 소품이 def.scale 로 작게 그려질 때 화면 안쪽도 같이(용광로 광장 0.82). anchor.def.foldX: 접힌 정도(가운데 기준으로 폭만 줄어든다)
    const s = this.config.scale ?? 1, fold = this.anchor.def?.foldX ?? 1;
    const [left, top, width, height] = this.config.inset.map((v) => v * s);
    const x = (this.anchor.drawX ?? this.anchor.x) - cam.x + left, y = (this.anchor.drawY ?? this.anchor.y) - cam.y + top;
    return { x: Math.round(x + width * (1 - fold) / 2), y: Math.round(y), width: Math.max(1, Math.round(width * fold)), height: Math.round(height) };
  }

  /** Fill the frame inset with a still illustration; clip the CRT power transition inside it. */
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
      ctx.drawImage(image, r.x, r.y, r.width, r.height);
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
