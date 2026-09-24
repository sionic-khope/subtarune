import { SCREEN_W } from '../core/layout.js';
import { FONT } from '../ui/font.js';

/**
 * BUILD328 prophecy hall. Panels hang on a far wall (0.3× camera speed): each fades in right of centre when the
 * leader reaches its `at`, then drifts to the left side while the next one appears (~3s apart).
 */
export const PROPHECY = Object.freeze({
  map: 'gajaeman_castle_prophecy', fade: 1.2, parallax: 0.3, revealCenter: 320, bottom: 270,
  textGap: 8, textColor: '#b8c2ff', textShadow: '#05060f', leaderOffset: 228,
});

/** Screen-space rectangle of a panel for a camera x (pure, exported for tests). */
export function panelRect(panel, camX) {
  const c = PROPHECY, revealCam = panel.at - c.leaderOffset;
  const x = c.revealCenter - panel.w / 2 - (camX - revealCam) * c.parallax;
  return { x: Math.round(x), y: c.bottom - panel.h, w: panel.w, h: panel.h };
}

export class ProphecyHall {
  constructor(game) {
    this.game = game; this.map = game.map; this.disposed = false;
    this.panels = (game.map?.def?.meta?.prophecy || []).map(p => ({ ...p, alpha: 0, shown: false }));
    // 이어하기·되돌아온 경우: 이미 지나친 그림은 바로 보인다
    const x = game.player?.x ?? 0;
    for (const p of this.panels) if (x >= p.at) { p.shown = true; p.alpha = 1; }
  }
  get snapshot() { return this.panels.map(p => +p.alpha.toFixed(2)); }
  update(dt) {
    const g = this.game;
    if (this.disposed) return;
    if (g.map !== this.map || g.state === 'title') { this.dispose(); return; }
    const x = g.player?.x ?? 0;
    for (const p of this.panels) {
      if (!p.shown && x >= p.at) p.shown = true;
      if (p.shown && p.alpha < 1) p.alpha = Math.min(1, p.alpha + Math.max(0, dt) / PROPHECY.fade);
    }
  }
  /** Drawn after the field actors; panels sit above the path so they never cover the party. */
  draw(ctx, cam) {
    if (this.disposed) return;
    ctx.save();
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const p of this.panels) {
      const image = this.game.propImages[p.image];
      if (!image || p.alpha <= 0) continue;
      const r = panelRect(p, cam.x), y = r.y - cam.y;
      if (r.x > SCREEN_W || r.x + r.w < 0) continue;
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(image, r.x, y, r.w, r.h);
      const tx = r.x + Math.round(r.w / 2), ty = y - PROPHECY.textGap;
      ctx.fillStyle = PROPHECY.textShadow; ctx.fillText(p.text, tx + 1, ty + 1);
      ctx.fillStyle = PROPHECY.textColor; ctx.fillText(p.text, tx, ty);
    }
    ctx.restore();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.game.prophecyHall === this) this.game.prophecyHall = null;
  }
}
