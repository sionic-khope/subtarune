import { FX } from '../data/fx.js';

export const CASTLE_LOBBY = {
  map: 'gajaeman_castle_lobby', bgm: 'castle_gajaeman',
  youngcle: 'castle_lobby_youngcle', gajaeman: 'castle_lobby_gajaeman',
  duration: { raid: 4.2, descend: 2.1, dodge: 0.7, depart: 1.9 },
  shots: [0.35, 1.45, 2.6], beamLife: 0.3, entryHeight: 310, dodgeDistance: -62,
  dodgeHeight: 16, dodgeSpin: 0.18, hoverAmplitude: 6, hoverPeriod: 2.8,
  sounds: ['laser_zap', 'break1', 'wing', 'captain_transform', 'chime', 'door', 'locker'],
};
const actor = (game, id) => game.entities.find(entity => entity.id === id && !entity.dead);
const ease = value => 1 - (1 - Math.min(1, value)) ** 3;

/** Own only lobby cinematic offsets, beams and sound handles; the DSL owns dialogue and story flags. */
export class CastleLobbyScene {
  constructor(game) {
    this.game = game;
    this.script = game.dialogue.script;
    this.youngcle = actor(game, CASTLE_LOBBY.youngcle);
    this.gajaeman = actor(game, CASTLE_LOBBY.gajaeman);
    this.gajaemanOrigin = [this.gajaeman.x, this.gajaeman.y];
    this.targets = [1, 2, 3].map(index => actor(game, `lobby_wall${index}`));
    this.beat = 'idle'; this.elapsed = 0; this.hoverElapsed = 0; this.shots = 0; this.beams = []; this.debris = [];
    this.scars = []; this.handles = new Set(); this.disposed = false;
  }

  /** Fixed beat durations terminate motion; no timers or animation callbacks outlive cancellation. */
  get done() { return this.disposed || this.elapsed >= (CASTLE_LOBBY.duration[this.beat] || 0); }

  /** Set a cinematic beat once; repeated calls cannot replay a projectile or audio cue. */
  setBeat(name) {
    if (this.disposed || this.beat === name) return;
    this.beat = name; this.elapsed = 0; this.shots = 0;
    if (name === 'descend') {
      this.gajaeman.visible = true; this.gajaeman.y = this.gajaemanOrigin[1] - CASTLE_LOBBY.entryHeight;
      this.sound('captain_transform', 0.35);
    }
    if (name === 'dodge') {
      this.dodgeOrigin = [this.gajaeman.x, this.gajaeman.y];
      this.fire({ x: this.gajaeman.x + this.gajaeman.w / 2, y: this.gajaeman.y - 24 + this.gajaeman.flyY }, false);
      this.sound('wing', 0.45);
    }
    if (name === 'depart') this.sound('wing', 0.5);
    if (name !== 'raid') { this.youngcle.spin = 0; this.youngcle.flyX = 0; this.youngcle.flyY = 0; }
  }

  /** Keep handles local, so an interrupted lobby does not stop another scene's sounds. */
  sound(key, volume) {
    const handle = this.game.sound.sfx(key, { volume });
    if (handle?.pause) this.handles.add(handle);
  }

  /** Hit the wall at the ray endpoint, leaving chips and a short-lived scorch rather than harming actors. */
  fire(target, destruction = true) {
    const from = [this.youngcle.x + this.youngcle.w / 2 + (this.youngcle.flyX || 0),
      this.youngcle.y - 30 + (this.youngcle.flyY || 0)];
    this.beams.push({ from, to: [target.x, target.y], age: 0 });
    this.sound('laser_zap', 0.48);
    if (!destruction) return;
    this.sound('break1', 0.4);
    this.game.shake = { time: 0.3, amp: 3.5 };
    this.game.playBoom({ ...FX.explosion, src: FX.explosion.sheet, x: target.x, y: target.y, scale: 0.42 });
    this.scars.push([target.x, target.y]);
    for (let i = 0; i < 14; i++) this.debris.push({ x: target.x, y: target.y,
      vx: Math.cos(i * 2.39996) * (24 + i * 5), vy: -70 - i * 7, age: 0, size: 2 + i % 3 });
  }

  /** Called by the existing world clock, including while the cutscene owns input. */
  update(dt) {
    if (this.disposed) return;
    if (this.game.mapId !== CASTLE_LOBBY.map || this.game.dialogue.script !== this.script) {
      finishCastleLobby(this.game, true); return;
    }
    this.elapsed += dt;
    this.hoverElapsed += dt;
    this.gajaeman.flyY = Math.sin(this.hoverElapsed * Math.PI * 2 / CASTLE_LOBBY.hoverPeriod) * CASTLE_LOBBY.hoverAmplitude;
    for (const beam of this.beams) beam.age += dt;
    this.beams = this.beams.filter(beam => beam.age < CASTLE_LOBBY.beamLife);
    for (const chip of this.debris) { chip.age += dt; chip.x += chip.vx * dt; chip.y += chip.vy * dt; chip.vy += 210 * dt; }
    this.debris = this.debris.filter(chip => chip.age < 1.4);
    if (this.beat === 'raid') {
      this.youngcle.spin = Math.sin(this.elapsed * 3.4) * 0.14;
      this.youngcle.flyX = Math.sin(this.elapsed * 2.4) * 22;
      this.youngcle.flyY = Math.cos(this.elapsed * 2.4) * 12;
      this.youngcle.facing = ['left', 'up', 'right', 'down'][Math.floor(this.elapsed * 2.2) % 4];
      while (this.shots < CASTLE_LOBBY.shots.length && this.elapsed >= CASTLE_LOBBY.shots[this.shots]) {
        this.fire(this.targets[this.shots]); this.shots++;
      }
    }
    if (this.beat === 'descend') this.gajaeman.y = this.gajaemanOrigin[1] - CASTLE_LOBBY.entryHeight * (1 - ease(this.elapsed / CASTLE_LOBBY.duration.descend));
    if (this.beat === 'dodge') {
      const k = ease(this.elapsed / CASTLE_LOBBY.duration.dodge);
      this.gajaeman.y = this.dodgeOrigin[1] - Math.sin(Math.PI * k) * CASTLE_LOBBY.dodgeHeight;
      this.gajaeman.x = this.dodgeOrigin[0] + CASTLE_LOBBY.dodgeDistance * k;
      this.gajaeman.spin = Math.sin(Math.PI * k) * CASTLE_LOBBY.dodgeSpin;
    }
    if (this.beat === 'depart') {
      const k = Math.min(1, this.elapsed / CASTLE_LOBBY.duration.depart);
      this.gajaeman.y = this.gajaemanOrigin[1] - CASTLE_LOBBY.entryHeight * k * k;
      this.gajaeman.spin = k * Math.PI * 6;
      if (k === 1) this.gajaeman.visible = false;
    }
    if (this.game.darkSmoke?.aura?.actor === this.gajaeman) {
      this.game.darkSmoke.source.x = this.gajaeman.x + this.gajaeman.w / 2;
      this.game.darkSmoke.source.y = this.gajaeman.y + this.gajaeman.h + this.gajaeman.flyY - 30;
    }
  }

  /** World-space overlay shares the game's camera and zoom; it never covers the dialogue UI. */
  draw(ctx, cam) {
    if (this.disposed) return;
    ctx.save();
    ctx.fillStyle = '#171020';
    for (const [x, y] of this.scars) { ctx.fillRect(Math.round(x - cam.x - 12), Math.round(y - cam.y - 4), 24, 8); }
    for (const beam of this.beams) {
      const width = (1 - beam.age / CASTLE_LOBBY.beamLife) * 8;
      for (const [size, color] of [[width * 2.6, '#8152cc'], [width, '#86e8ff'], [Math.max(1, width * 0.35), '#ffffff']]) {
        ctx.strokeStyle = color; ctx.lineWidth = size; ctx.beginPath();
        ctx.moveTo(Math.round(beam.from[0] - cam.x), Math.round(beam.from[1] - cam.y));
        ctx.lineTo(Math.round(beam.to[0] - cam.x), Math.round(beam.to[1] - cam.y)); ctx.stroke();
      }
    }
    for (const chip of this.debris) {
      ctx.globalAlpha = Math.min(1, (1.4 - chip.age) * 2);
      ctx.fillStyle = chip.size === 2 ? '#9180a5' : '#443951';
      ctx.fillRect(Math.round(chip.x - cam.x), Math.round(chip.y - cam.y), chip.size, chip.size);
    }
    ctx.restore();
  }

  /** Idempotent cleanup does not set completion flags or move the party. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const entity of [this.youngcle, this.gajaeman]) {
      entity.flyX = 0; entity.flyY = 0; entity.spin = 0;
    }
    [this.gajaeman.x, this.gajaeman.y] = this.gajaemanOrigin;
    for (const handle of this.handles) handle.pause();
    this.handles.clear(); this.beams.length = 0; this.debris.length = 0; this.scars.length = 0;
  }
}

/** Preload all first-use cues before exposing the rotating hovercraft. */
export async function prepareCastleLobby(game) {
  finishCastleLobby(game);
  const scene = new CastleLobbyScene(game);
  game.castleLobby = scene;
  game.sound.preloadBgm(CASTLE_LOBBY.bgm);
  await game.sound.loadSfxFiles(CASTLE_LOBBY.sounds);
  return scene;
}

/** Reset/title/map cancellation uses abort=true; successful dialogue stops its music explicitly. */
export function finishCastleLobby(game, abort = false) {
  const scene = game.castleLobby;
  if (!scene) return;
  if (abort && game.sound.bgmName === CASTLE_LOBBY.bgm) game.sound.stopBgm(0.2);
  if (game.darkSmoke?.aura?.at === CASTLE_LOBBY.gajaeman) game.darkSmoke = null;
  scene.dispose(); game.castleLobby = null;
}
