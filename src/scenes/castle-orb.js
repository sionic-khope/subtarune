import { makeCanvas } from '../core/gfx.js';
import { CHAR_SCALE, SCREEN_W, SCREEN_H, TileMap } from '../world/world.js';

/** Chamber geometry and scene-owned beats, measured against the existing sealed gate PNG. */
export const CASTLE_ORB = Object.freeze({
  map: 'gajaeman_castle_orb', lobby: 'gajaeman_castle_lobby', flag: 'castle_right_seal_active',
  center: [240, 130], radius: 62, gate: 'castle_lobby_sealed_door',
  sealCenter: [202, 228], sealRadius: 18,
  sounds: ['power', 'spearappear', 'static_burst', 'great_shine'],
  beats: [['charge', 1.05], ['out', 0.7], ['reveal', 0.7], ['pan', 1.3],
    ['crackle', 0.9], ['ignite', 0.85], ['hold', 1.25], ['returnOut', 0.7], ['returnIn', 0.8]],
  cameraFrom: [360, 80], cameraTo: [400, 32],
});
export const CASTLE_LEFT_ORB = Object.freeze({
  ...CASTLE_ORB, map: 'gajaeman_castle_left_orb', flag: 'castle_left_seal_active',
  sealCenter: [117, 228],
});
const ORBS = [CASTLE_ORB, CASTLE_LEFT_ORB];
const chamberFor = map => ORBS.find(orb => orb.map === map);
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const k = clamp(value); return k * k * (3 - 2 * k); };
const masks = new WeakMap();

function glow(ctx, x, y, radius, alpha, rgb = '161,74,239') {
  const fill = ctx.createRadialGradient(x, y, 0, x, y, radius);
  fill.addColorStop(0, `rgba(${rgb},${alpha})`);
  fill.addColorStop(0.42, `rgba(${rgb},${alpha * 0.48})`);
  fill.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = fill; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Point-light ground pool and a cached silhouette of the player's real current sprite. */
export function drawCastleOrbGround(ctx, game, cam) {
  const orb = chamberFor(game.mapId);
  if (!orb) return;
  const [ox, oy] = orb.center, time = game.time || 0;
  ctx.save(); ctx.translate(ox - cam.x, oy + 57 - cam.y); ctx.scale(1, 0.63);
  glow(ctx, 0, 0, 160, 0.25 + Math.sin(time * 1.7) * 0.035); ctx.restore();
  const player = game.player, sprite = player?.sprite;
  const frame = sprite?.[player.facing]?.[player.frame];
  if (!player?.visible || !frame) return;
  const x = player.x + player.w / 2, y = player.y + player.h;
  const dx = x - ox, dy = y - oy, distance = Math.max(1, Math.hypot(dx, dy));
  const near = clamp(1 - distance / 240);
  if (!near) return;
  let mask = masks.get(frame);
  if (!mask) {
    mask = makeCanvas(frame.width, frame.height);
    const painter = mask.getContext('2d'); painter.drawImage(frame, 0, 0);
    painter.globalCompositeOperation = 'source-in'; painter.fillStyle = '#050309';
    painter.fillRect(0, 0, mask.width, mask.height); masks.set(frame, mask);
  }
  const scale = CHAR_SCALE * (player.def.visualScale || 1) / sprite.px;
  const width = sprite.fw * scale, height = sprite.fh * scale;
  const length = 30 + near * 92;
  ctx.save(); ctx.globalAlpha = 0.28 + near * 0.58;
  ctx.translate(Math.round(x - cam.x), Math.round(y - cam.y - 2));
  ctx.transform(1, 0, -dx / distance * length / height, -dy / distance * length / height, 0, 0);
  ctx.drawImage(mask, -width / 2, -height, width, height); ctx.restore();
}

function sealPosition(gate, orb) {
  const scale = gate.scale ?? 1;
  return { x: (gate.ix ?? gate.x) + orb.sealCenter[0] * scale,
    y: (gate.iy ?? gate.y) + orb.sealCenter[1] * scale,
    r: orb.sealRadius * scale };
}

function drawSeal(ctx, gate, cam, time, orb, strength, crackle = 0) {
  if (!gate || (!strength && !crackle)) return;
  const point = sealPosition(gate, orb), x = point.x - cam.x, y = point.y - cam.y, r = point.r;
  ctx.save();
  if (strength) {
    glow(ctx, x, y, r * 3.6, 0.42 * strength);
    const core = ctx.createRadialGradient(x - r * 0.28, y - r * 0.35, 0, x, y, r);
    core.addColorStop(0, '#eacaff'); core.addColorStop(0.22, '#b45ffc');
    core.addColorStop(0.65, '#6b28a5'); core.addColorStop(1, '#2c0b4a');
    ctx.globalAlpha = strength; ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c78efb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r - 2, time * 0.9, time * 0.9 + 2.4); ctx.stroke();
  }
  if (crackle) {
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(time * 51) ** 2;
    ctx.strokeStyle = '#dab2ff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 0.4 + Math.floor(time * 12) * 0.37;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 1; j <= 4; j++) {
        const a = angle + Math.sin(i * 9 + j * 3 + time * 31) * 0.3;
        ctx.lineTo(Math.round(x + Math.cos(a) * j * r * 0.47), Math.round(y + Math.sin(a) * j * r * 0.47));
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Aura stays with either chamber; each activated seal persists on ordinary lobby reentry. */
export function drawCastleOrbWorld(ctx, game, cam) {
  const time = game.time || 0;
  if (game.mapId === CASTLE_ORB.lobby && !game.flags.castle_gate_open && !game.castleGate?.progress) {
    const gate = game.map.def.entities.find(e => e.id === CASTLE_ORB.gate);
    for (const orb of ORBS) if (game.flags[orb.flag]) drawSeal(ctx, gate, cam, time, orb, 1);
  }
  const orb = chamberFor(game.mapId);
  if (!orb) return;
  const [ox, oy] = orb.center, x = ox - cam.x, y = oy - cam.y;
  const scene = game.castleOrb, charge = scene?.beat === 'charge' ? smooth(scene.elapsed / scene.duration) : 0;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  glow(ctx, x, y, 86 + charge * 34, 0.12 + charge * 0.35);
  for (let i = 0; i < 24; i++) {
    const phase = (time * 0.21 + i / 24) % 1;
    const angle = i * 2.39996 + time * 0.36, r = 62 + Math.sin(phase * Math.PI) * 17;
    ctx.globalAlpha = Math.sin(phase * Math.PI) * (0.28 + charge * 0.55);
    ctx.fillStyle = i % 3 ? '#9e59d6' : '#debcff';
    ctx.fillRect(Math.round(x + Math.cos(angle) * r), Math.round(y + Math.sin(angle) * r * 0.78 - phase * 10), 2, 3);
  }
  if (charge) {
    ctx.globalAlpha = charge * 0.65; ctx.strokeStyle = '#ebd3ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 62 + charge * 45, 56 + charge * 29, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

/** Isolated read-only gate view: never replaces the live map, party, camera, or BGM clock. */
export class CastleOrbScene {
  constructor(game, orb = CASTLE_ORB) {
    this.game = game; this.script = game.dialogue.script;
    this.orb = orb;
    this.index = -1; this.beat = 'loading'; this.elapsed = 0; this.duration = 0;
    this.handles = new Set(); this.disposed = false; this.remote = null; this.activated = false;
    this.promise = new Promise(resolve => { this.resolve = resolve; });
  }

  /** Preload may complete after Q/title cancellation; the identity guard prevents late effects. */
  async prepare() {
    try {
      const [def] = await Promise.all([this.game.mapAssets.prepare(CASTLE_ORB.lobby),
        this.game.sound.loadSfxFiles(CASTLE_ORB.sounds)]);
      if (!this.current()) return this.dispose();
      this.remote = new TileMap(def, this.game.mapAssets.images[def.image]);
      this.props = def.entities.filter(e => e.type === 'prop' && !e.hidden &&
        (!e.requires || this.game.flags[e.requires]) && (!e.unless || !this.game.flags[e.unless]));
      this.gate = this.props.find(e => e.id === CASTLE_ORB.gate);
      this.next();
    } catch (error) {
      console.warn('[castle-orb] gate preparation failed', error); this.dispose();
    }
  }

  current() {
    return !this.disposed && this.game.castleOrb === this && this.game.mapId === this.orb.map &&
      this.game.dialogue.script === this.script;
  }

  sound(key, volume) {
    const handle = this.game.sound.sfx(key, { volume });
    if (handle?.pause) this.handles.add(handle);
  }

  next() {
    const beat = CASTLE_ORB.beats[++this.index];
    if (!beat) { this.dispose(false); return; }
    [this.beat, this.duration] = beat; this.elapsed = 0;
    if (this.beat === 'charge') { this.sound('power', 0.48); this.sound('spearappear', 0.58); }
    if (this.beat === 'crackle') this.sound('static_burst', 0.44);
    if (this.beat === 'ignite') this.sound('great_shine', 0.56);
  }

  /** All timing runs on the world update clock, with cancellation before any state mutation. */
  update(dt) {
    if (!this.current()) { this.dispose(); return; }
    if (this.beat === 'loading') return;
    this.elapsed += dt;
    if (this.beat === 'ignite' && this.elapsed >= 0.12 && !this.activated) {
      this.activated = true; this.game.setFlag(this.orb.flag);
    }
    if (this.elapsed >= this.duration) this.next();
  }

  /** Commit on full return; interruption rolls back only this scene's unsaved activation. */
  dispose(abort = true) {
    if (this.disposed) return;
    this.disposed = true;
    for (const handle of this.handles) handle.pause();
    this.handles.clear(); this.remote = null;
    if (abort && this.activated) delete this.game.flags[this.orb.flag];
    if (this.game.castleOrb === this) this.game.castleOrb = null;
    this.resolve();
  }

  draw(ctx) {
    const k = smooth(this.elapsed / this.duration);
    const remote = !['loading', 'charge', 'out', 'returnIn'].includes(this.beat);
    ctx.save();
    if (remote && this.remote) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      const pan = this.beat === 'reveal' ? 0 : this.beat === 'pan' ? k : 1;
      const cam = { x: Math.round(CASTLE_ORB.cameraFrom[0] + (CASTLE_ORB.cameraTo[0] - CASTLE_ORB.cameraFrom[0]) * pan),
        y: Math.round(CASTLE_ORB.cameraFrom[1] + (CASTLE_ORB.cameraTo[1] - CASTLE_ORB.cameraFrom[1]) * pan) };
      const backdrop = this.game.propImages[`assets/backdrops/${this.remote.def.backdrop}.png`];
      if (backdrop) ctx.drawImage(backdrop, 0, 0, backdrop.width, backdrop.height, 0, 0, SCREEN_W, SCREEN_H);
      this.remote.draw(ctx, cam);
      for (const prop of this.props) {
        const image = this.game.propImages[prop.image]; if (!image) continue;
        const scale = prop.scale ?? 1;
        ctx.drawImage(image, Math.round((prop.ix ?? prop.x) - cam.x), Math.round((prop.iy ?? prop.y) - cam.y),
          Math.round(image.width * scale), Math.round(image.height * scale));
      }
      for (const orb of ORBS) {
        const active = orb === this.orb;
        const strength = active && this.beat === 'ignite' ? k : this.game.flags[orb.flag] ? 1 : 0;
        drawSeal(ctx, this.gate, cam, this.game.time || 0, orb, strength,
          active && (this.beat === 'crackle' || this.beat === 'ignite') ? 1 : 0);
      }
    }
    const black = this.beat === 'out' || this.beat === 'returnOut' ? k :
      this.beat === 'reveal' || this.beat === 'returnIn' ? 1 - k : 0;
    if (black) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }
    ctx.restore();
  }
}

/** Called after the three narrator lines; the existing dialogue completion performs the autosave. */
export function activateCastleOrb(game) {
  const orb = chamberFor(game.mapId);
  if (!orb || game.flags[orb.flag]) return Promise.resolve();
  if (game.castleOrb) return game.castleOrb.promise;
  game.textbox.close();
  const scene = new CastleOrbScene(game, orb); game.castleOrb = scene;
  void scene.prepare(); return scene.promise;
}

/** World clock hook, including while the dialogue action is waiting. */
export function updateCastleOrb(game, dt) { game.castleOrb?.update(dt); }

/** Screen-space cutaway and curtain, after the world transform and before dialogue/global fade. */
export function drawCastleOrbCutaway(ctx, game) { game.castleOrb?.draw(ctx); }

/** Map/title/QA cleanup; no completed flag is fabricated during cancellation. */
export function finishCastleOrb(game) { game.castleOrb?.dispose(); }
