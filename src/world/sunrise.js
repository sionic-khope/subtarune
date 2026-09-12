import { SCREEN_W, SCREEN_H } from './world.js';

const clamp = (value) => Math.max(0, Math.min(1, value));

export function advanceSunrise(state, audioTime, config, out = {}) {
  const staticOrSeen = !config.animated || config.seen;
  const lightProgress = staticOrSeen ? 1 : Math.max(state.lightProgress || 0, clamp((audioTime - config.lightStartSeconds) / config.lightDurationSeconds));
  const sunProgress = staticOrSeen ? 1 : Math.max(state.sunProgress || 0, clamp((audioTime - config.sunStartSeconds) / config.sunDurationSeconds));
  const completed = staticOrSeen || state.completed || (lightProgress >= 1 && sunProgress >= 1);
  out.lightProgress = completed ? 1 : lightProgress;
  out.sunProgress = completed ? 1 : sunProgress;
  out.progress = out.sunProgress;
  out.completed = completed;
  out.shouldPersist = config.animated && !config.seen && !state.completed && completed;
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
  ctx.fillStyle = colors.sun;
  for (let dy = -radius; dy <= radius; dy += 4) {
    const half = Math.floor(Math.sqrt(Math.max(0, radius * radius - dy * dy)) / 4) * 4;
    ctx.fillRect(Math.round(x - half), Math.round(y + dy), half * 2, 4);
  }
}

export class MaillardSunrise {
  constructor(config) {
    this.config = config;
    this.frame = { progress: 0, lightProgress: 0, sunProgress: 0, completed: false, lastAudioTime: 0 };
    this.nextFrame = { progress: 0, lightProgress: 0, sunProgress: 0, completed: false, shouldPersist: false, lastAudioTime: 0 };
    this.active = false;
  }

  enter({ sound, images, animated, seen, onComplete }) {
    this.dispose();
    this.sound = sound;
    this.images = images;
    this.onComplete = onComplete;
    this.runtimeConfig = { ...this.config, animated, seen };
    const complete = !animated || seen;
    this.frame = { progress: complete ? 1 : 0, lightProgress: complete ? 1 : 0, sunProgress: complete ? 1 : 0, completed: complete, lastAudioTime: 0 };
    this.active = true;
  }

  update() {
    if (!this.active) return;
    const audioTime = this.sound.bgmName === this.config.bgm && this.sound.bgm ? this.sound.bgm.currentTime : this.frame.lastAudioTime;
    const previous = this.frame;
    this.frame = advanceSunrise(previous, audioTime, this.runtimeConfig, this.nextFrame);
    this.nextFrame = previous;
    if (this.frame.shouldPersist) this.onComplete?.();
  }

  drawBackdrop(ctx) {
    if (!this.active) return;
    const light = this.frame.lightProgress;
    const rise = this.frame.sunProgress;
    const glowProgress = this.frame.completed ? 1 : clamp((this.frame.lastAudioTime - this.config.glowStartSeconds) / this.config.glowDurationSeconds);
    const glow = glowProgress * glowProgress * (3 - 2 * glowProgress);
    const sky = this.images[this.config.sky];
    ctx.save();
    ctx.fillStyle = this.config.colors.sea; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (sky) drawCover(ctx, sky);
    ctx.globalAlpha = 0.88 * (1 - light); ctx.fillStyle = this.config.colors.cool; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.globalAlpha = 0.26 * light; ctx.fillStyle = this.config.colors.warm; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const atmosphere = ctx.createLinearGradient(0, this.config.horizonY - 100, 0, this.config.horizonY + 120);
    atmosphere.addColorStop(0, `${this.config.colors.atmosphere}00`);
    atmosphere.addColorStop(0.38, this.config.colors.atmosphere);
    atmosphere.addColorStop(0.46, this.config.colors.gold);
    atmosphere.addColorStop(0.6, this.config.colors.atmosphere);
    atmosphere.addColorStop(1, `${this.config.colors.atmosphere}00`);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = glow * 0.27;
    ctx.fillStyle = atmosphere; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const [sunX, finalSunY] = this.config.sunCenter;
    const radius = this.config.sunDiameter / 2;
    const eased = rise * (2 - rise);
    const hiddenY = this.config.horizonY + radius;
    const sunY = Math.round(hiddenY + (finalSunY - hiddenY) * eased);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SCREEN_W, this.config.horizonY); ctx.clip();
    ctx.globalAlpha = 1;
    const sun = this.images[this.config.sun];
    if (sun) ctx.drawImage(sun, ...this.config.sunCrop, Math.round(sunX - radius), Math.round(sunY - radius), this.config.sunDiameter, this.config.sunDiameter);
    else drawPixelSun(ctx, sunX, sunY, this.config.sunDiameter, this.config.colors);
    ctx.restore();
    ctx.fillStyle = this.config.colors.horizonGlow;
    ctx.globalAlpha = 0.08 + light * 0.34;
    ctx.fillRect(0, this.config.horizonY - 3, SCREEN_W, 5);
    ctx.fillStyle = this.config.colors.reflection;
    for (let i = 0; i < 12; i++) {
      const y = this.config.horizonY + 7 + i * 11;
      const shimmer = Math.sin(this.frame.lastAudioTime * 1.5 + i * 1.7);
      const width = Math.max(0, Math.round((8 + i * 3 + shimmer * 5) * light));
      ctx.globalAlpha = light * (0.24 - i * 0.012) + glow * 0.1;
      ctx.fillRect(Math.round(sunX - width / 2 + shimmer * 4), y, width, 2);
    }
    const streak = light;
    ctx.globalAlpha = streak * 0.34;
    ctx.fillStyle = this.config.colors.streak;
    ctx.fillRect(Math.round(-120 + (this.frame.lastAudioTime * 42) % 720), this.config.horizonY + 14, 118, 1);
    ctx.fillRect(Math.round(360 - (this.frame.lastAudioTime * 26) % 620), this.config.horizonY + 58, 74, 1);
    ctx.restore();
  }

  drawWorldLight(ctx) {
    if (!this.active) return;
    const alpha = this.config.worldDimAlpha * (1 - this.frame.lightProgress);
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(36,29,53,${alpha})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  dispose() {
    this.active = false;
    this.sound = null;
    this.images = null;
    this.runtimeConfig = null;
    this.onComplete = null;
  }
}
