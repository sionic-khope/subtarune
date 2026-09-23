import { SHIP_INVASION as C, INVASION_BEATS } from '../data/ship-invasion.js';
import { drawShipInvasion, invasionGeometry } from './ship-invasion-render.js';

/** Prepare once while the DSL owns dialogue; late image resolution cannot revive a cancelled scene. */
export async function prepareShipInvasion(game) {
  finishShipInvasion(game);
  const scene = new ShipInvasion(game);
  game.shipInvasion = scene;
  await scene.ready;
  return scene;
}

/** Named beats share one presentation clock but never advance the story themselves. */
export function setInvasionBeat(game, name) { return game.shipInvasion?.setBeat(name); }

/** The script calls this before castle entry; title/reset and unrelated map transitions also abort it. */
export function finishShipInvasion(game, abort = false) {
  if (abort && game.shipInvasion?.musicStarted && game.sound.bgmName === game.shipInvasion.config.bgm) game.sound.stopBgm(0.2);
  game.shipInvasion?.dispose();
  game.shipInvasion = null;
}

export class ShipInvasion {
  constructor(game, config = C) {
    this.game = game;
    this.config = config;
    this.beat = 'hidden';
    this.elapsed = 0;
    this.time = 0;
    this.impactTime = null;
    this.impactCount = 0;
    this.roomImpactTime = null;
    this.musicStarted = false;
    this.launchCount = 0;
    this.disposed = false;
    this.loaded = false;
    this.images = {};
    this.handles = new Set();
    game.sound.preloadBgm(config.bgm);
    this.ready = Promise.all([
      ...Object.entries(config.images).map(async ([key, path]) => {
        const image = game.propImages?.[path] || await game.mapAssets.image(path);
        if (!this.disposed) this.images[key] = image;
      }),
      game.sound.loadSfxFiles(Object.values(config.sound)),
    ]).then(() => { if (!this.disposed) this.loaded = true; });
  }

  /** Only the shadow overlays the live room; hidden keeps the prepared assets without painting. */
  get fullFrame() { return !this.disposed && !['hidden', 'room-impact', 'room-shadow'].includes(this.beat); }

  /** Completion uses the actual contact event plus its aftermath, not a second script timer. */
  get done() {
    const t = this.config.timing;
    if (!this.loaded || this.disposed) return false;
    if (this.beat === 'sail') return this.elapsed >= t.sail;
    if (this.beat === 'castle-look') return this.elapsed >= t.pan + t.castleHold;
    if (this.beat === 'room-shadow') return this.elapsed >= t.shadow;
    if (this.beat === 'castle-drop') return this.impactTime !== null && this.time - this.impactTime >= t.pullback + t.impactHold;
    if (this.beat === 'teleport') return this.elapsed >= t.teleport && this.launchCount === this.config.teleport.count;
    return true;
  }

  /** Repeating the current beat does not restart motion, impacts or sound. */
  setBeat(name) {
    if (!INVASION_BEATS.includes(name)) throw new RangeError(`Unknown invasion beat: ${name}`);
    if (this.disposed || this.beat === name) return this;
    this.beat = name;
    this.elapsed = 0;
    if (name === 'room-impact' && this.roomImpactTime === null) {
      this.roomImpactTime = this.time;
      this.sound(this.config.sound.impact, 0.85);
      this.game.sound.playBgm(this.config.bgm, { volume: 0.48, fadeIn: 0.15 });
      this.musicStarted = true;
    }
    if (name === 'teleport') {
      this.launchCount = 0;
      this.sound(this.config.sound.charge, 0.45);
    }
    return this;
  }

  /** Keep handles local so scene cancellation never stops another scene's effects. */
  sound(key, volume) {
    const audio = this.game.sound.sfx(key, { volume });
    if (audio?.pause) this.handles.add(audio);
  }

  /** A single collision with the ship deck starts breakage, splash and camera recoil together. */
  update(dt) {
    if (this.disposed || !this.loaded) return;
    this.elapsed += dt;
    this.time += dt;
    if (this.beat === 'castle-drop' && this.impactTime === null && invasionGeometry(this).contact) {
      this.impactTime = this.time;
      this.impactCount++;
      this.sound(this.config.sound.impact, 0.92);
      this.sound(this.config.sound.splash, 0.7);
      this.game.shake = { time: 0.85, amp: 14 };
    }
    if (this.beat === 'teleport') {
      const { count, charge, stagger } = this.config.teleport;
      while (this.launchCount < count && this.elapsed >= charge + this.launchCount * stagger) {
        this.sound(this.config.sound.launch, 0.35);
        this.launchCount++;
      }
    }
    for (const handle of this.handles) if (handle.ended || handle.paused) this.handles.delete(handle);
  }

  /** Public renderer uses the same rectangles as collision and QA. */
  draw(ctx) { if (!this.disposed && this.loaded) drawShipInvasion(ctx, this); }

  /** Read-only values for the existing cutscene QA harness. */
  get snapshot() {
    return { beat: this.beat, elapsed: this.elapsed, loaded: this.loaded, done: this.done, fullFrame: this.fullFrame,
      impactCount: this.impactCount, launchCount: this.launchCount, musicStarted: this.musicStarted,
      roomImpactAge: this.roomImpactTime === null ? null : this.time - this.roomImpactTime, ...invasionGeometry(this) };
  }

  /** Abort releases only this presentation, including sounds still ringing after an impact. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const handle of this.handles) handle.pause();
    this.handles.clear();
  }
}
