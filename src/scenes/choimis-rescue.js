import { characterSprite } from '../world/world.js';
import { clearChoimisSky } from './choimis-sky-intro.js';
import { drawChoimisRescue, rescueGeometry } from './choimis-rescue-render.js';
import { DotBubble } from '../ui/bubble.js';

export const RESCUE_IMAGES = Object.freeze({
  jet: 'assets/props/naem-jet.png', sky: 'assets/backdrops/jjajang_night_sea.png',
});
const IDS = ['hyungsub', 'gyeongsub', 'ppaman', 'yongjun', 'choimis'];
const BEATS = ['relief', 'petals_fade', 'dots_ppaman', 'dots_gyeongsub', 'dots_hyungsub',
  'party_fall', 'ocean_fall', 'catch', 'jet_reveal', 'spot_choimis', 'save_choimis', 'flyaway'];

/** Preload the rescue while still in the pre-battle scene; no aircraft placeholder is drawn. */
export async function prepareChoimisRescue(game) {
  const token = { cancelled: false, images: {}, sprites: {} };
  game.choimisRescueAssets = token;
  game.sound.preloadBgm('vs_lancer');
  await Promise.all([
    ...Object.entries(RESCUE_IMAGES).map(async ([key, src]) => {
      const image = await game.mapAssets.image(src);
      if (!token.cancelled) token.images[key] = image;
    }),
    ...IDS.map(async id => {
      const image = game.spriteOverrides?.[id] || await game.mapAssets.image(`assets/sprites/${id}.png`);
      if (!token.cancelled && image) {
        game.spriteOverrides[id] = image;
        token.sprites[id] = characterSprite(id, image);
      }
    }),
    game.sound.loadSfxFiles(['wing']),
  ]);
  if (!token.cancelled && game.choimisRescueAssets === token) {
    game.portraits.yongjun = game.makePortraits().yongjun;
  }
}

/** Script-owned full-frame rescue presentation; the normal text box retains all C input. */
export class ChoimisRescue {
  constructor(game, assets) {
    this.game = game; this.assets = assets; this.beat = 'relief';
    this.elapsed = 0; this.time = 0; this.catchCount = 0; this.disposed = false;
    this.handles = new Set(); this.model = { scroll: 0, completed: true };
    this.bubble = new DotBubble();
    this.choimisFallY = 146;
  }
  get fullFrame() { return !this.disposed; }

  /** Start one authored beat; repeated calls cannot replay its sound. */
  setBeat(name) {
    if (!BEATS.includes(name)) throw new RangeError(`Unknown rescue beat: ${name}`);
    if (this.disposed || name === this.beat) return;
    this.beat = name; this.elapsed = 0;
    if (name.startsWith('dots_')) {
      const id = name.slice(5), member = rescueGeometry(this).party.find(actor => actor.id === id);
      this.bubble.start({ x: member.x, y: member.y, w: 0, h: 0, sprite: { fh: 58 / 1.43, px: 1 } },
        { dots: 3, gap: 0.25, hold: 0.35 });
    }
    if (name === 'party_fall' || name === 'flyaway') this.sound('wing', 0.75);
    if (name === 'save_choimis') this.sound('wing', 0.45, 1.25);
  }
  sound(name, volume, rate = 1) {
    const handle = this.game.sound.sfx(name, { volume, rate });
    if (handle?.pause) this.handles.add(handle);
  }

  /** Continue sea/cloud travel during dialogue; catches happen at three distinct contacts. */
  update(dt) {
    if (this.disposed) return;
    this.time += dt; this.elapsed += dt; this.model.scroll -= dt * 60;
    this.bubble.update(dt);
    if (this.beat === 'spot_choimis') this.choimisFallY = 146 + 35 * (1 - Math.exp(-this.elapsed / 4));
    if (this.beat === 'catch') {
      const target = Math.min(3, Math.floor(Math.max(0, this.elapsed - 0.18) / 0.32) + (this.elapsed >= 0.18 ? 1 : 0));
      while (this.catchCount < target) { this.catchCount++; this.sound('wing', 0.4, 1.8); }
    }
    for (const audio of this.handles) if (audio.ended || audio.paused) this.handles.delete(audio);
  }
  /** Draw behind the shared dialogue/fade layers. */
  draw(ctx) { if (!this.disposed) drawChoimisRescue(ctx, this); }
  /** Read-only phase and screen-space geometry for the reusable QA runner. */
  snapshot() {
    return { beat: this.beat, elapsed: this.elapsed, time: this.time, catchCount: this.catchCount,
      disposed: this.disposed, assetsReady: !!this.assets.images.jet, ...rescueGeometry(this) };
  }
  /** Abort never awards the rescue flag and cannot restart music after a map/title reset. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const audio of this.handles) audio.pause();
    this.handles.clear();
    if (this.game.sound.bgmName === 'vs_lancer') this.game.sound.stopBgm(0.2);
  }
}

/** Switch directly from the finished battle to the sky, before resetting any field camera. */
export function startChoimisRescue(game) {
  game.choimisRescue?.dispose();
  game.choimisRescue = new ChoimisRescue(game, game.choimisRescueAssets);
  clearChoimisSky(game);
  game.curtain = null;
}

/** Shared completion/map/title cleanup; only the DSL stage node marks success. */
export function finishChoimisRescue(game, abort = false) {
  if (abort && game.choimisRescue) {
    game.dialogue.script = null; game.dialogue.wait = null; game.dialogue.onEnd = null;
    game.textbox.close();
  }
  game.choimisRescue?.dispose(); game.choimisRescue = null;
  if (game.choimisRescueAssets) game.choimisRescueAssets.cancelled = true;
  game.choimisRescueAssets = null;
}
