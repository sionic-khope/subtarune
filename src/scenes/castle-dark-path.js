import { TILE } from '../core/layout.js';

export const CASTLE_DARK_PATH = Object.freeze({ radius: 110, lifetime: 1.5, maxPulses: 10,
  firstStepDistance: 8, stepDistance: 24, actorAlpha: 0.48 });

export function darkPathWalkableRects(map) {
  const rectangles = [], previous = new Map();
  for (let ty = 0; ty < map.h; ty++) {
    const current = new Map();
    for (let tx = 0; tx < map.w;) {
      if (map.tileAt(tx, ty).solid) { tx++; continue; }
      const start = tx;
      while (tx < map.w && !map.tileAt(tx, ty).solid) tx++;
      const key = `${start}:${tx}`, above = previous.get(key);
      const rect = above || [start * TILE, ty * TILE, (tx - start) * TILE, 0];
      rect[3] += TILE;
      if (!above) rectangles.push(rect);
      current.set(key, rect);
    }
    previous.clear();
    for (const [key, rect] of current) previous.set(key, rect);
  }
  return rectangles;
}

export function darkPathPulseColor(progress) {
  const white = [255, 255, 255], violet = [181, 105, 255], pink = [255, 84, 188];
  const p = Math.max(0, Math.min(1, progress)), from = p < 0.5 ? white : violet;
  const to = p < 0.5 ? violet : pink, mix = p < 0.5 ? p * 2 : (p - 0.5) * 2;
  return from.map((value, i) => Math.round(value + (to[i] - value) * mix)).join(',');
}

export class CastleDarkPath {
  constructor(game) {
    this.game = game; this.map = game.map;
    this.rectangles = darkPathWalkableRects(this.map);
    this.pulses = []; this.distance = 0; this.hasStepped = false; this.disposed = false;
    this.last = { x: game.player.x, y: game.player.y, frame: game.player.frame };
  }
  update(dt) {
    if (this.disposed) return;
    if (this.map !== this.game.map || this.game.state === 'title') { this.dispose(); return; }
    for (const pulse of this.pulses) pulse.age += dt;
    this.pulses = this.pulses.filter(pulse => pulse.age < CASTLE_DARK_PATH.lifetime);
    const player = this.game.player;
    const distance = Math.hypot(player.x - this.last.x, player.y - this.last.y);
    const landed = player.frame !== this.last.frame && (player.frame === 1 || player.frame === 3);
    this.last = { x: player.x, y: player.y, frame: player.frame };
    if (this.game.state !== 'field' || this.game.dialogue.running || this.game.transitioning
      || !player.moving || !distance || distance > TILE * 4) {
      if (distance > TILE * 4) this.distance = 0;
      return;
    }
    this.distance += distance;
    const threshold = this.hasStepped ? CASTLE_DARK_PATH.stepDistance : CASTLE_DARK_PATH.firstStepDistance;
    if (this.distance < threshold || (!landed && this.distance < CASTLE_DARK_PATH.stepDistance * 1.5)) return;
    this.distance = 0; this.hasStepped = true;
    this.pulses.push({ x: player.x + player.w / 2, y: player.y + player.h - 2, age: 0 });
    if (this.pulses.length > CASTLE_DARK_PATH.maxPulses) this.pulses.shift();
  }
  drawGround(ctx, cam) {
    if (this.disposed || !this.pulses.length) return;
    ctx.save(); ctx.beginPath();
    for (const [x, y, width, height] of this.rectangles) ctx.rect(x - cam.x, y - cam.y, width, height);
    ctx.clip();
    for (const pulse of this.pulses) {
      const p = pulse.age / CASTLE_DARK_PATH.lifetime;
      const radius = 8 + (CASTLE_DARK_PATH.radius - 8) * (1 - (1 - p) ** 4);
      const opacity = (1 - p) ** 0.8, color = darkPathPulseColor(p);
      const x = Math.round(pulse.x - cam.x), y = Math.round(pulse.y - cam.y);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(${color},0)`);
      glow.addColorStop(0.56, `rgba(${color},${opacity * 0.045})`);
      glow.addColorStop(0.86, `rgba(${color},${opacity * 0.23})`);
      glow.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = glow; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      ctx.strokeStyle = `rgba(${color},${opacity * 0.82})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, radius * 0.86, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  drawEntity(ctx, actor, cam) {
    const party = actor === this.game.player || actor.def?.type === 'follower';
    ctx.save();
    if (party) ctx.globalAlpha *= CASTLE_DARK_PATH.actorAlpha;
    actor.draw(ctx, cam);
    ctx.restore();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.pulses.length = 0; this.rectangles.length = 0;
    if (this.game.castleDarkPath === this) this.game.castleDarkPath = null;
  }
}
