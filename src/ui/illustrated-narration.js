import { captainMemoryImage } from '../data/captain-memories.js';

/** Logical Canvas geometry and reveal timing from DESIGN.md. */
export const ILLUSTRATED_NARRATION = Object.freeze({
  picture: Object.freeze({ x: 48, y: 14, w: 384, h: 208 }),
  text: Object.freeze({ x: 48, y: 240, w: 384, h: 72 }),
  lineHeight: 24,
  maxLines: 3,
  firstFade: 2.8,
  fadeOut: 1.4,
  fadeIn: 2,
});

/** A retained illustration between TextBox nodes, with a black midpoint on card changes. */
export class IllustratedNarration {
  constructor(getImage = captainMemoryImage) {
    this.getImage = getImage;
    this.clear();
  }

  /** Start a new card, or leave the currently visible card untouched. */
  show(id) {
    if (id === this.id) return;
    const image = this.getImage(id);
    this.previous = this.image;
    this.image = image;
    this.id = id;
    this.exiting = false;
    this.elapsed = 0;
    this.duration = this.previous
      ? ILLUSTRATED_NARRATION.fadeOut + ILLUSTRATED_NARRATION.fadeIn
      : ILLUSTRATED_NARRATION.firstFade;
  }

  /** True until the current picture is fully visible. */
  get transitioning() { return this.elapsed < this.duration; }

  /** Fade the final picture to black before TextBox releases its completion callback. */
  exit() {
    this.exiting = true;
    this.previous = null;
    this.elapsed = 0;
    this.duration = ILLUSTRATED_NARRATION.fadeOut;
  }

  /** Advance only the reveal; TextBox consumes no typing time or input during it. */
  update(dt) {
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    if (!this.transitioning) this.previous = null;
  }

  /** Release all card and transition state on close, interruption, or another style. */
  clear() {
    this.id = null;
    this.image = null;
    this.previous = null;
    this.elapsed = 0;
    this.duration = 0;
    this.exiting = false;
  }

  /** Draw the illustration with pixel smoothing disabled; the caller owns the black background. */
  draw(ctx) {
    if (!this.image) return;
    const { picture, fadeOut, fadeIn } = ILLUSTRATED_NARRATION;
    const leaving = this.previous && this.elapsed < fadeOut;
    const alpha = this.exiting ? 1 - this.elapsed / this.duration
      : leaving ? 1 - this.elapsed / fadeOut
      : this.previous ? (this.elapsed - fadeOut) / fadeIn
        : this.duration ? this.elapsed / this.duration : 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
    ctx.drawImage(leaving ? this.previous : this.image, picture.x, picture.y, picture.w, picture.h);
    ctx.restore();
  }
}
