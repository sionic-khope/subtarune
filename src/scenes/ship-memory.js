import { loadImageOptional } from '../core/gfx.js';
import {
  SHIP_MEMORY as DEFAULT_CONFIG,
  SHIP_MEMORY_BEATS,
} from '../data/ship-memory.js';
import { SCREEN_H, SCREEN_W, characterSprite } from '../world/world.js';
import { drawShipMemoryUnderwater, shipMemoryActorPose } from './ship-memory-water.js';

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => {
  const limited = clamp(value);
  return limited * limited * (3 - 2 * limited);
};

export class ShipMemory {
  /** Create the full-frame sequence and start its exact authored music without advancing dialogue. */
  constructor(game, { config = DEFAULT_CONFIG, imageLoader = loadImageOptional } = {}) {
    this.game = game;
    this.config = config;
    this.beat = 'underwater_enter';
    this.elapsed = 0;
    this.time = 0;
    this.sinkDepth = 0;
    this.panelIndex = -1;
    this.previousPanelIndex = -1;
    this.transitionFromUnderwater = true;
    this.disposed = false;
    this.ownsBgm = false;
    this.images = {};
    this.yoplait = game.player?.sprite || characterSprite(
      game.playerSprite || 'hyungsub',
      game.spriteOverrides?.[game.playerSprite || 'hyungsub'],
    );
    this.bubbles = Array.from({ length: config.underwater.bubbleCount }, (_, index) => ({
      x: 21 + index * 73 % 444,
      y: 58 + index * 97 % 292,
      speed: 7 + index % 5 * 2.3,
      size: 1 + index % 3,
      phase: index * 1.71,
    }));
    this.assetsReady = this.loadAssets(imageLoader);
    game.sound.preloadBgm(config.bgm);
    this.startMusic();
    game.sound.sfx(config.sfx.entry, { volume: 0.42 });
  }

  get fullFrame() { return true; }

  async loadAssets(imageLoader) {
    await Promise.all(this.config.panels.map(async panel => {
      const ready = this.game.propImages?.[panel.src];
      const image = ready || await imageLoader(panel.src);
      if (!this.disposed && image) this.images[panel.id] = image;
    }));
  }

  startMusic() {
    if (this.game.sound.bgmName === this.config.bgm) return;
    this.game.sound.playBgm(this.config.bgm, {
      loop: false,
      volume: 0.4,
      fadeIn: this.config.timing.bgmFadeIn,
    });
    this.ownsBgm = true;
  }

  /** Select a rendering beat while leaving all narrative timing with the cutscene script. */
  setBeat(name) {
    if (!SHIP_MEMORY_BEATS.includes(name)) throw new RangeError(`Unknown ship memory beat: ${name}`);
    if (this.disposed || name === this.beat) return this;
    const oldPanel = this.panelIndex;
    this.beat = name;
    this.elapsed = 0;
    if (name.startsWith('memory_')) {
      this.previousPanelIndex = oldPanel;
      this.panelIndex = Number(name.slice(-1)) - 1;
      this.transitionFromUnderwater = oldPanel < 0;
    } else if (name === 'underwater_return') {
      this.previousPanelIndex = oldPanel >= 0 ? oldPanel : this.config.panels.length - 1;
      this.panelIndex = -1;
      this.transitionFromUnderwater = false;
    } else if (name === 'shore_transition') {
      this.game.sound.sfx(this.config.sfx.recovery, { volume: 0.55, rate: 0.82 });
    }
    return this;
  }

  /** Advance the slow sinking and deterministic water motion even while dialogue is open. */
  update(dt) {
    if (this.disposed) return;
    this.time += dt;
    this.elapsed += dt;
    this.sinkDepth += dt * this.config.underwater.sinkSpeed;
    for (const bubble of this.bubbles) {
      bubble.y -= bubble.speed * dt;
      if (bubble.y < -8) bubble.y += SCREEN_H + 16;
    }
  }

  get cameraDepth() {
    const { maxSink } = this.config.underwater;
    return this.sinkDepth - maxSink * (1 - Math.exp(-this.sinkDepth / maxSink));
  }

  panelImage(index) {
    const panel = this.config.panels[index];
    return panel ? this.images[panel.id] || null : null;
  }

  drawPanel(ctx, index, alpha) {
    const image = this.panelImage(index);
    if (!image || alpha <= 0) return;
    const rect = this.config.panelRect;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  transitionState() {
    const timing = this.config.timing;
    if (this.elapsed < timing.fadeOut) {
      return { phase: 'leaving', alpha: 1 - this.elapsed / timing.fadeOut };
    }
    if (this.elapsed < timing.fadeOut + timing.blackHold) return { phase: 'black', alpha: 0 };
    const incoming = (this.elapsed - timing.fadeOut - timing.blackHold) / timing.fadeIn;
    return { phase: this.beat === 'underwater_return' ? 'underwater' : 'panel', alpha: clamp(incoming) };
  }

  drawMemory(ctx) {
    const transition = this.transitionState();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (transition.phase === 'leaving') {
      if (this.transitionFromUnderwater) drawShipMemoryUnderwater(ctx, this, transition.alpha);
      else this.drawPanel(ctx, this.previousPanelIndex, transition.alpha);
    } else if (transition.phase === 'panel') {
      this.drawPanel(ctx, this.panelIndex, transition.alpha);
    }
  }

  drawReturn(ctx) {
    const transition = this.transitionState();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (transition.phase === 'leaving') this.drawPanel(ctx, this.previousPanelIndex, transition.alpha);
    if (transition.phase === 'underwater') drawShipMemoryUnderwater(ctx, this, transition.alpha);
  }

  /** Draw exactly one full-frame tableau for the current script-controlled beat. */
  draw(ctx) {
    if (this.disposed) return;
    if (this.beat.startsWith('memory_')) this.drawMemory(ctx);
    else if (this.beat === 'underwater_return') this.drawReturn(ctx);
    else {
      drawShipMemoryUnderwater(ctx, this);
      if (this.beat === 'shore_transition') {
        ctx.save();
        ctx.globalAlpha = smooth(this.elapsed / this.config.timing.shoreTransition);
        ctx.fillStyle = this.config.colors.recovery;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.restore();
      }
    }
  }

  /** Return stable scene observables for browser QA without mutating presentation state. */
  snapshot() {
    const transition = this.beat.startsWith('memory_') || this.beat === 'underwater_return'
      ? this.transitionState() : null;
    return {
      beat: this.beat,
      elapsed: this.elapsed,
      time: this.time,
      fullFrame: this.fullFrame,
      disposed: this.disposed,
      imagesReady: Object.keys(this.images).length,
      sinkY: this.config.underwater.yoplaitStartY + this.sinkDepth,
      cameraDepth: this.cameraDepth,
      actor: shipMemoryActorPose(this),
      bubbles: this.bubbles.map(bubble => [
        Math.round(bubble.x + Math.sin(this.time * 0.75 + bubble.phase) * 4),
        Math.round(bubble.y),
      ]),
      panel: this.panelIndex < 0 ? null : this.config.panels[this.panelIndex].id,
      previousPanel: this.previousPanelIndex < 0 ? null : this.config.panels[this.previousPanelIndex].id,
      transition,
      recoveryAlpha: this.beat === 'shore_transition'
        ? smooth(this.elapsed / this.config.timing.shoreTransition) : 0,
    };
  }

  /** Stop owned music and prevent late image loads from reviving an interrupted scene. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.images = {};
    if (this.ownsBgm && this.game.sound.bgmName === this.config.bgm) {
      this.game.sound.stopBgm(this.config.timing.bgmFadeOut);
    }
    this.game.shake = null;
  }
}
