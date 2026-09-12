import { SCREEN_W, SCREEN_H } from './world.js';

/** Advance the one-shot rise from the media clock without allowing time to move backward. */
export function advanceSunrise(state, audioTime, config, out = {}) {
  const staticOrSeen = !config.animated || config.seen;
  const timedProgress = Math.max(0, Math.min(1, (audioTime - config.startSeconds) / config.durationSeconds));
  const progress = staticOrSeen ? 1 : Math.max(state.progress, timedProgress);
  const completed = staticOrSeen || state.completed || progress >= 1;
  out.progress = completed ? 1 : progress;
  out.completed = completed;
  out.shouldPersist = config.animated && !config.seen && !state.completed && progress >= 1;
  out.lastAudioTime = audioTime;
  return out;
}

function drawCover(ctx, image) {
  const sourceWidth = Math.round(image.height * SCREEN_W / SCREEN_H);
  const sourceX = Math.max(0, Math.round((image.width - sourceWidth) / 2));
  ctx.drawImage(image, sourceX, 0, Math.min(sourceWidth, image.width), image.height, 0, 0, SCREEN_W, SCREEN_H);
}

function drawPixelSun(ctx, x, y, diameter, colors) {
  const radius = diameter / 2;
  ctx.fillStyle = colors.sunEdge;
  for (let dy = -radius; dy <= radius; dy += 4) {
    const half = Math.floor(Math.sqrt(Math.max(0, radius * radius - dy * dy)) / 4) * 4;
    ctx.fillRect(Math.round(x - half), Math.round(y + dy), half * 2, 4);
  }
  ctx.fillStyle = colors.sun;
  const inner = radius - 5;
  for (let dy = -inner; dy <= inner; dy += 4) {
    const half = Math.floor(Math.sqrt(Math.max(0, inner * inner - dy * dy)) / 4) * 4;
    ctx.fillRect(Math.round(x - half), Math.round(y + dy), half * 2, 4);
  }
}

export class MaillardSunrise {
  constructor(config) {
    this.config = config;
    this.frame = { progress: 0, completed: false, lastAudioTime: 0 };
    this.nextFrame = { progress: 0, completed: false, shouldPersist: false, lastAudioTime: 0 };
    this.active = false;
  }

  /** Attach the reusable effect to a map and restart unfinished first-entry music at zero. */
  enter({ sound, images, animated, seen, restart = false, onComplete }) {
    this.dispose();
    this.sound = sound;
    this.images = images;
    this.onComplete = onComplete;
    this.animated = animated;
    this.seen = seen;
    this.runtimeConfig = { ...this.config, animated, seen };
    this.frame = { progress: this.animated && !seen ? 0 : 1, completed: !this.animated || seen, lastAudioTime: 0 };
    if (restart && this.animated && !seen && sound.bgmName === this.config.bgm && sound.bgm) {
      sound.bgm.currentTime = 0;
      sound.bgm.play().catch((error) => console.warn('[sunrise] BGM playback failed', error));
    }
    this.active = true;
  }

  /** Sample the playing BGM clock; paused or buffering media naturally freezes the effect. */
  update() {
    if (!this.active) return;
    const audioTime = this.sound.bgmName === this.config.bgm && this.sound.bgm ? this.sound.bgm.currentTime : this.frame.lastAudioTime;
    const previous = this.frame;
    this.frame = advanceSunrise(previous, audioTime, this.runtimeConfig, this.nextFrame);
    this.nextFrame = previous;
    if (this.frame.shouldPersist) this.onComplete?.();
  }

  /** Draw the fixed sky, rising sun, and audio-clock-driven horizontal sea reflection. */
  drawBackdrop(ctx) {
    if (!this.active) return;
    const p = this.frame.progress;
    const sky = this.images[this.config.sky];
    ctx.save();
    ctx.fillStyle = this.config.colors.sea; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sky) drawCover(ctx, sky);
    ctx.globalAlpha = 0.56 * (1 - p); ctx.fillStyle = this.config.colors.cool; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.globalAlpha = 0.16 * p; ctx.fillStyle = this.config.colors.warm; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.globalAlpha = 1;
    const [sunX, finalSunY] = this.config.sunCenter;
    const radius = this.config.sunDiameter / 2;
    const eased = p * p * (3 - 2 * p);
    const sunY = Math.round(this.config.horizonY + radius + 8 + (finalSunY - this.config.horizonY - radius - 8) * eased);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SCREEN_W, this.config.horizonY); ctx.clip();
    const sun = this.images[this.config.sun];
    if (sun) ctx.drawImage(sun, ...this.config.sunCrop, Math.round(sunX - radius), Math.round(sunY - radius), this.config.sunDiameter, this.config.sunDiameter);
    else drawPixelSun(ctx, sunX, sunY, this.config.sunDiameter, this.config.colors);
    ctx.restore();
    ctx.fillStyle = this.config.colors.reflection;
    for (let i = 0; i < 18; i++) {
      const y = this.config.horizonY + 7 + i * 9;
      const shimmer = Math.sin(this.frame.lastAudioTime * 2.4 + i * 1.7);
      const width = Math.max(0, Math.round((10 + i * 3.2 + shimmer * 7) * p));
      ctx.globalAlpha = p * (0.34 - i * 0.012);
      ctx.fillRect(Math.round(sunX - width / 2 + shimmer * 5), y, width, i % 3 === 0 ? 3 : 2);
    }
    ctx.restore();
  }

  /** Dim the complete field or cart tableau before the rise, without changing source sprites. */
  drawWorldLight(ctx) {
    if (!this.active) return;
    const alpha = this.config.worldDimAlpha * (1 - this.frame.progress);
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(36,29,53,${alpha})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  /** Drop map-specific buffers and references so the effect cannot bleed into another map or title. */
  dispose() {
    this.active = false;
    this.sound = null;
    this.images = null;
    this.runtimeConfig = null;
    this.onComplete = null;
  }
}
