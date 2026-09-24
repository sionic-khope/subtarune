import { FX } from '../data/fx.js';
import { loopCharacterMotion } from '../world/character-motion.js';

export const CASTLE_BOULDER = Object.freeze({
  map: 'gajaeman_castle_boulder', flag: 'castle_boulder_done', bgm: 'baron_intro',
  rock: 'assets/props/castle-boulder316.png', wall: 'assets/props/castle-boulder-wall316.png',
  monster: 'assets/enemies/nunusub316.png', rockCenter: [1810, 628], radius: 128,
  monsterFeet: [2024, 690], monsterCell: 384, monsterPivot: [192, 360], monsterScale: 0.88,
  wallX: 3424, beats: { reveal: 2.8, roar: 1.8, launch: 5.6 },
  sounds: ['laser_zap', 'baron_roar', 'baron_slam', 'rumble', 'furnace_blast', 'break1', 'laugh_junhee', 'mario_jump', 'chime', 'great_shine', 'click', 'cancel'],
});
export const BOULDER_ACTORS = Object.freeze({ youngcle: 'boulder_youngcle', junhee: 'boulder_junhee',
  bidet: 'boulder_bidet', mario: 'boulder_mario', ttuulla: 'boulder_ttuulla', park: 'boulder_park' });
const A = BOULDER_ACTORS;
const find = (game, id) => id === 'player' ? game.player : game.entities.find(entity => entity.id === id && !entity.dead);
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const k = clamp(value); return k * k * (3 - 2 * k); };
const WAITING = [[A.youngcle, -200, -58], [A.junhee, -90, 20], [A.bidet, -270, 6],
  [A.mario, -206, 48], [A.ttuulla, -320, 58], [A.park, -350, -58],
  ['boulder_gyeongsub', -128, -58], ['boulder_ppaman', -58, -38]];

export function restoreCastleBoulder(game) {
  if (game.mapId !== CASTLE_BOULDER.map || !game.flags.castle_boulder_done) return;
  const [ax, ay] = game.map.def.meta.boulder.anchors.finish;
  for (const [id, x, y] of WAITING) {
    const actor = find(game, id);
    actor.x = ax + x; actor.y = ay + y;
    actor.visible = true; actor.solid = true; actor.facing = 'right'; actor.moving = false;
    actor.flyX = 0; actor.flyY = 0; actor.spin = 0;
  }
  if (!find(game, 'castle_boulder_wall')) game.spawn(game.map.def.entities.find(def => def.id === 'castle_boulder_wall'));
}

/** Keep stationary companions before leaveParty recreates the remaining follower list. */
export function separateBoulderParty(game) {
  for (const id of ['gyeongsub', 'ppaman']) {
    const follower = find(game, id), waiting = find(game, `boulder_${id}`);
    waiting.x = follower.x; waiting.y = follower.y; waiting.facing = follower.facing;
    waiting.visible = true; waiting.solid = true;
  }
}

export class CastleBoulderScene {
  constructor(game) {
    this.game = game; this.script = game.dialogue.script; this.map = game.map;
    this.youngcle = find(game, A.youngcle); this.junhee = find(game, A.junhee);
    this.beat = 'holding'; this.elapsed = 0; this.time = 0; this.nextShot = 0.6;
    this.rockX = CASTLE_BOULDER.rockCenter[0]; this.rockAngle = 0; this.monsterX = CASTLE_BOULDER.monsterFeet[0];
    this.stageNumber = 0; this.exert = 0; this.beams = []; this.chips = []; this.waves = [];
    this.handles = new Set(); this.disposed = false; this.crashed = false; this.waiters = [];
    this.pushers = [];
    this.previousJunheeMotion = this.junhee.motion;
    loopCharacterMotion(this.junhee, game.characterMotions?.junhee?.boulder_push);
    this.braceMotion = this.junhee.motion;
    this.junhee.x = 1656;
  }
  get done() { return this.disposed || this.elapsed >= (CASTLE_BOULDER.beats[this.beat] || 0); }
  sound(key, volume = 0.6) {
    const handle = this.game.sound.sfx(key, { volume });
    if (handle?.pause) this.handles.add(handle);
  }
  setBeat(name) {
    if (this.disposed || this.beat === name) return;
    this.beat = name; this.elapsed = 0;
    if (name === 'roar') {
      this.sound('baron_roar', 0.72); this.game.shake = { time: 1.35, amp: 5 };
      this.waves.push({ x: this.monsterX - 60, y: 470, age: 0 });
    }
    if (name === 'push') {
      this.pushers = ['player', 'gyeongsub', 'ppaman', A.junhee, A.bidet, A.mario, A.ttuulla, A.park].map(id => find(this.game, id));
      this.pushOrigins = new Map(this.pushers.map(actor => [actor, actor.x]));
      this.youngcle.flyX = 0; this.youngcle.flyY = 0; this.youngcle.spin = 0;
    }
    if (name === 'launch') {
      this.releaseBrace();
      this.launchX = this.rockX; this.launchMonsterX = this.monsterX;
      this.sound('baron_slam', 0.9); this.sound('rumble', 0.45);
      this.game.shake = { time: 0.65, amp: 7 };
      this.sound('baron_roar', 0.65);
    }
  }
  wait() {
    if (this.done) return Promise.resolve();
    return new Promise(resolve => this.waiters.push(resolve));
  }
  stage(number) {
    this.stageNumber = number; this.exert = 0.4;
    for (const [actor, x] of this.pushOrigins) actor.x = x + number * 3;
  }
  releaseBrace() {
    if (this.junhee.motion === this.braceMotion) this.junhee.motion = this.previousJunheeMotion || null;
  }
  fire() {
    const from = [this.youngcle.x + this.youngcle.w / 2 + (this.youngcle.flyX || 0), this.youngcle.y - 22 + (this.youngcle.flyY || 0)];
    const to = [this.rockX - 120, 575 + Math.sin(this.time * 1.9) * 38];
    this.beams.push({ from, to, age: 0 });
    this.sound('laser_zap', 0.24);
    this.debris(to[0], to[1], 7, 55);
  }
  debris(x, y, count, force) {
    for (let i = 0; i < count; i++) this.chips.push({ x, y, age: 0,
      vx: Math.cos(i * 2.39996) * force, vy: -35 - (i % 7) * force / 5, size: 2 + i % 4 });
  }
  crash() {
    if (this.crashed) return;
    this.crashed = true; this.sound('furnace_blast', 0.86); this.sound('break1', 0.65);
    this.game.shake = { time: 1.25, amp: 12 };
    this.game.playBoom({ ...FX.explosion, src: FX.explosion.sheet, x: CASTLE_BOULDER.wallX - 46, y: 614, scale: 1.35 });
    this.debris(CASTLE_BOULDER.wallX - 70, 540, 45, 210);
    const wall = find(this.game, 'castle_boulder_wall');
    if (wall) wall.visible = true;
  }
  update(dt) {
    if (this.disposed) return;
    if (this.game.map !== this.map || this.game.dialogue.script !== this.script) { finishCastleBoulder(this.game, true); return; }
    this.time += dt; this.elapsed += dt; this.exert = Math.max(0, this.exert - dt);
    for (const beam of this.beams) beam.age += dt;
    this.beams = this.beams.filter(beam => beam.age < 0.24);
    for (const chip of this.chips) { chip.age += dt; chip.x += chip.vx * dt; chip.y += chip.vy * dt; chip.vy += 240 * dt; }
    this.chips = this.chips.filter(chip => chip.age < 1.5);
    for (const wave of this.waves) wave.age += dt;
    this.waves = this.waves.filter(wave => wave.age < 1.6);
    if (['holding', 'reveal', 'roar', 'talk'].includes(this.beat)) {
      this.youngcle.flyX = Math.sin(this.time * 2.1) * 16;
      this.youngcle.flyY = Math.cos(this.time * 2.1) * 8;
      this.youngcle.spin = Math.sin(this.time * 2.1) * 0.15;
      this.youngcle.facing = this.beat === 'talk' ? 'left' : ['right', 'down', 'left', 'up'][Math.floor(this.time * 1.6) % 4];
      this.junhee.flyX = Math.sin(this.time * 21) * 1.2;
      this.rockX = CASTLE_BOULDER.rockCenter[0] + Math.sin(this.time * 3) * 1.5;
      this.rockAngle = Math.sin(this.time * 3) * 0.014;
      if (this.time >= this.nextShot) { this.nextShot = this.time + 2.6; this.fire(); }
    }
    if (this.beat === 'reveal') {
      const remaining = 1 - ease(this.elapsed / 2.2);
      this.rockX += remaining * 52; this.rockAngle += remaining * 0.36;
      this.monsterX = CASTLE_BOULDER.monsterFeet[0] + remaining * 52;
    }
    if (this.beat === 'push') {
      this.rockX = CASTLE_BOULDER.rockCenter[0] + this.stageNumber * 3;
      this.monsterX = CASTLE_BOULDER.monsterFeet[0] + this.stageNumber * 3;
      this.rockAngle = this.stageNumber * 0.035;
    }
    if (this.beat === 'launch') {
      const k = clamp(this.elapsed / 4.15), travel = k * k * (3 - 2 * k);
      this.rockX = this.launchX + (CASTLE_BOULDER.wallX - 80 - this.launchX) * travel;
      this.monsterX = this.launchMonsterX + (CASTLE_BOULDER.wallX + 58 - this.launchMonsterX) * travel;
      this.rockAngle = (this.rockX - this.launchX) / CASTLE_BOULDER.radius;
      for (const actor of this.pushers) { actor.flyX = 0; actor.spin = 0; }
      if (k >= 1) this.crash();
    }
    if (this.done) for (const resolve of this.waiters.splice(0)) resolve();
  }
  draw(ctx, cam) {
    if (this.disposed) return;
    const rock = this.game.propImages[CASTLE_BOULDER.rock], monster = this.game.propImages[CASTLE_BOULDER.monster];
    ctx.save();
    if (!this.crashed && monster) {
      const frame = this.beat === 'roar' ? 2 : this.beat === 'launch' ? 3 : Math.floor(this.time * 2) % 2;
      const cell = CASTLE_BOULDER.monsterCell, scale = CASTLE_BOULDER.monsterScale;
      const [px, py] = CASTLE_BOULDER.monsterPivot;
      const bob = this.beat === 'launch' ? -Math.sin(clamp(this.elapsed / 4.15) * Math.PI) * 24 : Math.sin(this.time * 2.3) * 2;
      ctx.drawImage(monster, frame % 2 * cell, Math.floor(frame / 2) * cell, cell, cell,
        Math.round(this.monsterX - cam.x - px * scale), Math.round(690 - cam.y - py * scale + bob), cell * scale, cell * scale);
    }
    if (!this.crashed && rock) {
      ctx.save(); ctx.translate(Math.round(this.rockX - cam.x), Math.round(628 - cam.y)); ctx.rotate(this.rockAngle);
      ctx.drawImage(rock, -128, -128, 256, 256); ctx.restore();
    }
    if (this.crashed && !find(this.game, 'castle_boulder_wall')) {
      const wall = this.game.propImages[CASTLE_BOULDER.wall];
      if (wall) ctx.drawImage(wall, 3200 - cam.x, 452 - cam.y);
    }
    for (const beam of this.beams) {
      ctx.globalAlpha = 1 - beam.age / 0.24;
      for (const [width, color] of [[6, '#7355c6'], [2, '#e1f8ff']]) {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
        ctx.moveTo(beam.from[0] - cam.x, beam.from[1] - cam.y); ctx.lineTo(beam.to[0] - cam.x, beam.to[1] - cam.y); ctx.stroke();
      }
    }
    for (const wave of this.waves) {
      ctx.globalAlpha = Math.max(0, 1 - wave.age / 1.6) * 0.55;
      ctx.strokeStyle = '#d5b2e8'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(wave.x - cam.x, wave.y - cam.y, 20 + wave.age * 200 + i * 18, 12 + wave.age * 86 + i * 10, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    for (const chip of this.chips) {
      ctx.globalAlpha = Math.min(1, (1.5 - chip.age) * 2); ctx.fillStyle = chip.size % 2 ? '#87748d' : '#463b51';
      ctx.fillRect(Math.round(chip.x - cam.x), Math.round(chip.y - cam.y), chip.size, chip.size);
    }
    ctx.restore();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseBrace();
    for (const actor of [this.youngcle, this.junhee, ...this.pushers]) { actor.flyX = 0; actor.flyY = 0; actor.spin = 0; }
    for (const handle of this.handles) handle.pause();
    this.handles.clear(); this.beams.length = 0; this.chips.length = 0; this.waves.length = 0;
    for (const resolve of this.waiters.splice(0)) resolve();
  }
}

export async function prepareCastleBoulder(game) {
  finishCastleBoulder(game);
  const scene = new CastleBoulderScene(game); game.castleBoulder = scene;
  game.sound.preloadBgm(CASTLE_BOULDER.bgm);
  await Promise.all([game.sound.loadSfxFiles(CASTLE_BOULDER.sounds),
    ...[CASTLE_BOULDER.rock, CASTLE_BOULDER.monster, CASTLE_BOULDER.wall].map(src => game.requestPropImage(src))]);
  return scene;
}

export function finishCastleBoulder(game, abort = false) {
  const scene = game.castleBoulder;
  if (!scene) return;
  scene.dispose(); game.castleBoulder = null;
  if (abort && game.sound.bgmName === CASTLE_BOULDER.bgm) game.sound.stopBgm(0.2);
}

export function drawCastleBoulder(ctx, game, cam) { game.castleBoulder?.draw(ctx, cam); }
