import { SHIP_CASTLE as DEFAULT_CONFIG, SHIP_CASTLE_BEATS } from '../data/ship-castle.js';
import { characterSprite } from '../world/world.js';
import { drawShipCastleField } from './ship-castle-field.js';
import { drawShipCastleOcean, shipCastleGeometry, shipCastleAscent, shipCastleVeil } from './ship-castle-ocean.js';

const FULL_FRAME_BEATS = new Set([
  'ocean_rise', 'sky_tug', 'sky_opposite_aura', 'vortex_gather',
  'vortex_burst', 'castle_reveal', 'yoplait_fall', 'castle_attack',
  'retreat', 'final_hold',
]);

const smooth = value => { const k = Math.max(0, Math.min(1, value)); return k * k * (3 - 2 * k); };

const ENTRY_SOUNDS = Object.freeze({
  field_rush: ['wing', 0.9],
  ocean_rise: ['maillard_water_lift', 0.55],
  yoplait_fall: ['wing', 0.72],
  castle_reveal: ['mankatsuki_clone', 0.8],
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
    this.beamCue = -1;
    this.airTime = 0;
    this.pushTime = 0;
    this.ascentHeld = true;
    this.popPlayed = false;
    this.flarePhase = -1;
    this.landPlayed = false;
    this.veilClosing = false;
    this.veilClock = 0;
    this.model = { scroll: 0, completed: true, phase: 'cleared', phaseTime: 0 };
    this.images = Object.fromEntries(Object.entries(config.images).map(([key, path]) => [key, game.propImages?.[path] || null]));
    this.actors = {
      yoplait: game.player?.sprite || characterSprite(game.playerSprite || 'hyungsub', game.spriteOverrides?.[game.playerSprite || 'hyungsub']),
      gajaeman: characterSprite('gajaeman_shadow', game.spriteOverrides?.gajaeman_shadow),
    };
    this.shards = Array.from({ length: config.field.shardCount }, (_, index) => ({
      x: 2 + index % 9 * 6,
      y: 70 + index % 6 * 9,
      vx: 96 + index % 7 * 34,
      vy: -104 - index % 9 * 22,
      spin: index * 0.41,
      size: 1 + index % 4,
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
    this.beamCue = -1;
    this.splashPlayed = false;
    this.popPlayed = false;
    this.flarePhase = -1;
    this.landPlayed = false;
    this.veilClosing = false;
    this.veilClock = 0;
    if (name === 'ocean_rise') {
      this.pushTime = 0;
      this.ascentHeld = true;
    }
    if (name === 'field_window') {
      this._resetShards();
      this.game.sound.sfx('park_trial_shatter', { volume: 0.9 });
      this.game.sound.sfx('explosion', { volume: 0.8 });
      this.game.shake = { time: 0.55, amp: 9 };
      this._startMusic();
    }
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

  /** Start the long fade that carries the wide castle shot into the sea fall. */
  closeVeil() {
    if (this.disposed) return this;
    this.veilClosing = true;
    this.veilClock = 0;
    return this;
  }

  /** Hold the wide fleet framing until the authored reaction lines end, then start the push. */
  beginAscent() {
    if (this.disposed) return this;
    this.ascentHeld = false;
    return this;
  }

  _startMusic() {
    if (this.game.sound.bgmName !== this.config.bgm) this.game.sound.playBgm(this.config.bgm, { loop: false, volume: 0.48, fadeIn: 0.2 });
    this.ownsBgm = true;
  }

  _resetShards() {
    this.shards.forEach((shard, index) => {
      shard.x = 2 + index % 9 * 6;
      shard.y = 70 + index % 6 * 9;
      shard.vx = 96 + index % 7 * 34;
      shard.vy = -104 - index % 9 * 22;
    });
  }

  /** Advance only scene-local clocks and deterministic particles. */
  update(dt) {
    if (this.disposed) return;
    this.time += dt;
    this.elapsed += dt;
    if (['ocean_rise', 'sky_tug', 'sky_opposite_aura', 'vortex_gather', 'vortex_burst'].includes(this.beat)) this.airTime += dt;
    if (this.beat === 'ocean_rise' && !this.ascentHeld) this.pushTime += dt;
    if (this.veilClosing) this.veilClock += dt;
    this.sailTime += dt;
    this.scroll += dt * this.config.ocean.waterSpeed;
    this.model.scroll = this.scroll;
    this.model.phaseTime = this.elapsed;
    if (this.beat === 'field_window' && this.elapsed >= this.config.field.impactHold) {
      for (const shard of this.shards) {
        shard.x += shard.vx * dt;
        shard.y += shard.vy * dt;
        shard.vy += 115 * dt;
        shard.spin += dt * 7;
      }
    }
    if (this.beat === 'sky_opposite_aura' || this.beat === 'vortex_gather') {
      const phase = Math.floor(this.time * 3.2 / Math.PI + 0.5);
      if (phase !== this.flarePhase) {
        this.flarePhase = phase;
        this.game.shake = { time: 0.12, amp: 1 };
      }
    }
    if (this.beat === 'castle_reveal') {
      const reveal = this.elapsed / this.config.timing.castleReveal;
      if (!this.popPlayed && reveal >= this.config.ocean.castlePopAt) {
        this.popPlayed = true;
        this.game.sound.sfx('boom', { volume: 0.7 });
        this.game.shake = { time: 0.3, amp: 5 };
      }
      if (!this.landPlayed && reveal >= this.config.ocean.castleLandAt) {
        this.landPlayed = true;
        this.game.sound.sfx('furnace_blast', { volume: 0.9 });
        this.game.shake = { time: 0.7, amp: 11 };
      }
    }
    if (this.beat === 'yoplait_fall' && !this.splashPlayed && this.elapsed >= this.config.timing.fall * 0.72) {
      this.splashPlayed = true;
      this.game.sound.sfx('maillard_splash', { volume: 0.9 });
    }
    if (this.beat === 'castle_attack' || this.beat === 'retreat') {
      const schedule = this.config.ocean.beamSchedule[this.beat];
      const cue = schedule.findLastIndex(start => this.elapsed >= start);
      if (cue !== this.beamCue && cue >= 0) {
        this.beamCue = cue;
        this.beamFired = false;
        this.game.sound.sfx('laser_charge', { volume: this.beat === 'retreat' ? 0.24 : 0.35 });
      }
      this.beamClock = cue < 0 ? -1 : this.elapsed - schedule[cue];
      if (cue >= 0 && !this.beamFired && this.beamClock >= this.config.ocean.beamCharge) {
        this.beamFired = true;
        this.beamIndex++;
        this.game.sound.sfx('laser_beam', { volume: this.beat === 'retreat' ? 0.22 : 0.38 });
        this.game.shake = { time: 0.18, amp: 2 };
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
    const geometry = this.fullFrame && !['sky_tug', 'sky_opposite_aura', 'vortex_gather', 'vortex_burst'].includes(this.beat)
      ? shipCastleGeometry(this) : null;
    return {
      beat: this.beat,
      elapsed: this.elapsed,
      fullFrame: this.fullFrame,
      passive: this.passive,
      geometry,
      ascent: shipCastleAscent(this),
      beamsFired: this.beamIndex,
      ascentHeld: this.ascentHeld,
      veil: shipCastleVeil(this),
      castlePopped: this.popPlayed,
      castleLanded: this.landPlayed,
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
