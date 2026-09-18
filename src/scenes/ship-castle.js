import { SHIP_CASTLE as DEFAULT_CONFIG, SHIP_CASTLE_BEATS } from '../data/ship-castle.js';
import { characterSprite } from '../world/world.js';
import { drawShipCastleField } from './ship-castle-field.js';
import { drawShipCastleOcean, shipCastleGeometry } from './ship-castle-ocean.js';

const FULL_FRAME_BEATS = new Set([
  'ocean_rise', 'sky_tug', 'sky_opposite_aura', 'vortex_gather',
  'vortex_burst', 'castle_reveal', 'yoplait_fall', 'castle_attack',
  'retreat', 'final_hold',
]);

const ENTRY_SOUNDS = Object.freeze({
  field_rush: ['wing', 0.9],
  ocean_rise: ['maillard_water_lift', 0.55],
  yoplait_fall: ['wing', 0.72],
  castle_reveal: ['mankatsuki_clone', 0.8],
  castle_attack: ['laser_charge', 0.8],
  retreat: ['laser_charge', 0.76],
});

export class ShipCastle {
  constructor(game, { config = DEFAULT_CONFIG, completed = false } = {}) {
    this.game = game;
    this.config = config;
    this.beat = completed ? 'final_hold' : 'field_idle';
    this.elapsed = 0;
    this.time = 0;
    this.sailTime = 0;
    this.scroll = 0;
    this.beamClock = 0;
    this.beamIndex = 0;
    this.splashPlayed = false;
    this.disposed = false;
    this.passive = completed;
    this.ownsBgm = false;
    this.beamFired = false;
    this.model = { scroll: 0, completed: true, phase: 'cleared', phaseTime: 0 };
    this.images = Object.fromEntries(Object.entries(config.images).map(([key, path]) => [key, game.propImages?.[path] || null]));
    this.actors = {
      yoplait: game.player?.sprite || characterSprite(game.playerSprite || 'hyungsub', game.spriteOverrides?.[game.playerSprite || 'hyungsub']),
      gajaeman: characterSprite('gajaeman_shadow', game.spriteOverrides?.gajaeman_shadow),
    };
    this.shards = Array.from({ length: config.field.shardCount }, (_, index) => ({
      x: 4 + index % 6 * 5,
      y: 8 + index % 4 * 7,
      vx: 34 + index % 5 * 9,
      vy: -48 - index % 7 * 8,
      spin: index * 0.41,
      size: 1 + index % 3,
      tint: index % 3 ? '#d8edff' : '#91b5dd',
    }));
    game.sound.preloadBgm(config.bgm);
    if (completed) this._startMusic();
  }

  get fullFrame() { return FULL_FRAME_BEATS.has(this.beat); }

  /** Select one authored presentation beat without advancing dialogue. */
  setBeat(name) {
    if (this.disposed || name === this.beat) return this;
    if (!SHIP_CASTLE_BEATS.includes(name)) throw new RangeError(`Unknown ship castle beat: ${name}`);
    this.beat = name;
    this.elapsed = 0;
    this.beamClock = 0;
    this.beamFired = false;
    this.splashPlayed = false;
    if (name === 'field_window') this._resetShards();
    if (name === 'ocean_rise') this._startMusic();
    const cue = ENTRY_SOUNDS[name];
    if (cue) this.game.sound.sfx(cue[0], { volume: cue[1] });
    return this;
  }

  /** Keep the retreat tableau alive without spawning actors or replaying beats. */
  hold() {
    if (this.disposed) return;
    this.setBeat('final_hold');
    this.passive = true;
  }

  _startMusic() {
    if (this.game.sound.bgmName !== this.config.bgm) this.game.sound.playBgm(this.config.bgm, { loop: false, volume: 0.4, fadeIn: 1.2 });
    this.ownsBgm = true;
  }

  _resetShards() {
    this.shards.forEach((shard, index) => {
      shard.x = 4 + index % 6 * 5;
      shard.y = 8 + index % 4 * 7;
      shard.vy = -48 - index % 7 * 8;
    });
  }

  /** Advance only scene-local clocks and deterministic particles. */
  update(dt) {
    if (this.disposed) return;
    this.time += dt;
    this.elapsed += dt;
    this.sailTime += dt;
    this.scroll += dt * this.config.ocean.waterSpeed;
    this.model.scroll = this.scroll;
    this.model.phaseTime = this.elapsed;
    if (this.beat === 'field_window') {
      for (const shard of this.shards) {
        shard.x += shard.vx * dt;
        shard.y += shard.vy * dt;
        shard.vy += 115 * dt;
        shard.spin += dt * 7;
      }
    }
    if (this.beat === 'yoplait_fall' && !this.splashPlayed && this.elapsed >= this.config.timing.fall * 0.72) {
      this.splashPlayed = true;
      this.game.sound.sfx('maillard_splash', { volume: 0.9 });
    }
    if (this.beat === 'castle_attack' || this.beat === 'retreat') {
      this.beamClock += dt;
      if (!this.beamFired && this.beamClock >= 0.36) {
        this.beamFired = true;
        this.beamIndex++;
        this.game.sound.sfx('laser_beam', { volume: 0.74 });
        this.game.shake = { time: 0.18, amp: 2 };
      }
      if (this.beamClock >= 0.86) {
        this.beamClock -= 0.86;
        this.beamFired = false;
        this.game.sound.sfx('laser_charge', { volume: 0.64 });
      }
    }
  }

  /** Draw either the field overlay or the self-contained sky/ocean surface. */
  draw(ctx) {
    if (this.disposed) return;
    if (this.fullFrame) drawShipCastleOcean(ctx, this);
    else drawShipCastleField(ctx, this);
  }

  /** Return geometry and state used by regression tests without mutating the scene. */
  snapshot() {
    const geometry = this.fullFrame && !['sky_tug', 'sky_opposite_aura', 'vortex_gather', 'vortex_burst', 'yoplait_fall'].includes(this.beat)
      ? shipCastleGeometry(this) : null;
    return {
      beat: this.beat,
      elapsed: this.elapsed,
      fullFrame: this.fullFrame,
      passive: this.passive,
      geometry,
      castleToWarship: geometry?.castle ? this.config.ocean.castleWidth / this.config.ocean.warshipWidth : null,
      skyScaleRatio: this.config.sky.gajaemanCanonicalScale,
      skyGrips: {
        gajaeman: [...this.config.sky.gajaemanGrip],
        yoplait: [...this.config.sky.yoplaitGrip],
      },
      cordOwner: ['vortex_burst', 'castle_reveal', 'yoplait_fall', 'castle_attack', 'retreat', 'final_hold'].includes(this.beat) ? 'gajaeman' : 'shared',
    };
  }

  /** Release transient particles, music and screen shake on interruption. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.shards.length = 0;
    if (this.ownsBgm && this.game.sound.bgmName === this.config.bgm) this.game.sound.stopBgm(0.35);
    this.game.shake = null;
  }
}
