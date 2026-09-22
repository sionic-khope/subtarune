import { TextBox } from '../ui/dialogue.js';
import { NIGHT_COAST_CHAT } from '../data/cutscenes/jjajang_night_coast.js';

const AUTO_INPUT = { just: () => false };

export function coastProgress(paths, player) {
  const points = paths.flat();
  let walked = 0, nearest = Infinity, progress = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
    if (!length) continue;
    const t = Math.max(0, Math.min(1, ((player.x - ax) * dx + (player.y - ay) * dy) / (length * length)));
    const distance = Math.hypot(player.x - ax - t * dx, player.y - ay - t * dy);
    if (distance < nearest) { nearest = distance; progress = walked + t * length; }
    walked += length;
  }
  return walked ? progress / walked : 0;
}

export class NightCoastChatter {
  constructor(game) {
    this.game = game;
    this.box = new TextBox(game.sound, game.portraits, {
      rect: { x: 14, y: 12, w: 452, h: 94 }, speakerInside: true, textTop: 40,
    });
    this.clear();
  }

  clear() { this.box.close(); this.mapId = null; this.progress = 0; }

  update(dt) {
    const g = this.game, lines = NIGHT_COAST_CHAT[g.mapId];
    if (this.mapId !== g.mapId) { this.clear(); this.mapId = g.mapId; }
    if (!lines || g.state !== 'field' || g.dialogue.running || g.transitioning) return;
    this.progress = Math.max(this.progress, coastProgress(g.map.def.meta.coast.walkRoute, g.player));
    this.box.update(dt, AUTO_INPUT);
    if (this.box.isOpen || g.ride) return;
    const index = lines.findIndex((line, i) => !g.flags[`${g.mapId}_chat_${i}`]);
    if (index < 0 || lines[index].at > this.progress) return;
    g.flags[`${g.mapId}_chat_${index}`] = true;
    this.box.show({ ...lines[index], auto: 1.7 }, g.ctx, null);
    g.autosave();
  }

  draw(ctx) {
    const g = this.game;
    if (this.mapId === g.mapId && g.state === 'field' && !g.dialogue.running && !g.transitioning) this.box.draw(ctx);
  }
}
