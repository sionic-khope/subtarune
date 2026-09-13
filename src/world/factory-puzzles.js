import {
  drawFactoryBulkhead,
  drawFactoryConsole,
  drawFactoryCrate,
  drawFactoryGate,
  drawFactoryMoveArea,
  drawFactoryPressurePlate,
  drawFactorySign,
} from './factory-puzzle-art.js';
import { PROBE_RANGE } from '../core/layout.js';

const TILE = 32;

const aligned = (plate) => plate.orientation === plate.solution;
const puzzleEntities = (game, puzzle) => game.entities.filter((entity) => entity.def?.puzzle === puzzle);

export function registerFactoryPuzzleEntities({ Entity, freeSpot, registerEntity }) {
  class FactoryCrate extends Entity {
    constructor(def, game) {
      super({ w: 28, h: 28, ...def }, game);
      this.start = [def.x, def.y];
      this.slide = null;
      this.pendingSolvedScript = null;
      if (game.has(def.flag)) [this.x, this.y] = [def.solvedX, def.solvedY];
    }

    update(dt) {
      if (this.pendingSolvedScript && !this.game.dialogue?.running) {
        const script = this.pendingSolvedScript;
        this.pendingSolvedScript = null;
        this.game.runScript(script);
      }
      if (this.game.has(this.def.flag)) return;
      if (this.slide) {
        this.slide.t = Math.min(this.slide.duration, this.slide.t + dt);
        const progress = this.slide.t / this.slide.duration;
        this.x = this.slide.fromX + (this.slide.toX - this.slide.fromX) * progress;
        this.y = this.slide.fromY + (this.slide.toY - this.slide.fromY) * progress;
        if (progress >= 1) { this.slide = null; this.checkPlate(); }
      }
    }

    interact(player) {
      if (this.game.has(this.def.flag) || this.slide) return true;
      const direction = player.facing;
      const vectors = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
      const [dx, dy] = vectors[direction];
      if (!this.playerCanPush(dx, dy, player) || !this.targetIsFree(dx, dy)) return true;
      this.slide = {
        fromX: this.x, fromY: this.y, toX: this.x + dx * TILE, toY: this.y + dy * TILE,
        t: 0, duration: 0.14,
      };
      this.game.sound.sfx('scrape', { volume: 0.55 });
      return true;
    }

    checkPlate() {
      const entities = puzzleEntities(this.game, this.def.puzzle);
      const plates = entities.filter((entity) => entity.def.type === 'factory_plate');
      const crates = entities.filter((entity) => entity.def.type === 'factory_crate');
      if (plates.some((plate) => plate.contains(this))) this.game.sound.sfx('click');
      if (!plates.length || !plates.every((plate) => crates.some((crate) => plate.contains(crate)))) return;
      this.game.setFlag(this.def.flag);
      this.game.autosave();
      if (!this.def.onSolved) return;
      if (this.game.dialogue?.running) this.pendingSolvedScript = this.def.onSolved;
      else this.game.runScript(this.def.onSolved);
    }

    playerCanPush(dx, dy, player = this.game.player) {
      const overlapsX = player.x < this.x + this.w && player.x + player.w > this.x;
      const overlapsY = player.y < this.y + this.h && player.y + player.h > this.y;
      if (dx > 0) return overlapsY && player.x + player.w <= this.x + 3 && this.x - player.x - player.w <= PROBE_RANGE;
      if (dx < 0) return overlapsY && player.x >= this.x + this.w - 3 && player.x - this.x - this.w <= PROBE_RANGE;
      if (dy > 0) return overlapsX && player.y + player.h <= this.y + 3 && this.y - player.y - player.h <= PROBE_RANGE;
      return overlapsX && player.y >= this.y + this.h - 3 && player.y - this.y - this.h <= PROBE_RANGE;
    }

    targetIsFree(dx, dy) {
      const rect = { x: this.x + dx * TILE, y: this.y + dy * TILE, w: this.w, h: this.h };
      const area = puzzleEntities(this.game, this.def.puzzle)
        .find((entity) => entity.def.type === 'factory_move_area');
      if (area && (rect.x < area.x || rect.y < area.y
        || rect.x + rect.w > area.x + area.w || rect.y + rect.h > area.y + area.h)) return false;
      if (this.game.map.solidRect(rect.x, rect.y, rect.w, rect.h)) return false;
      return !this.game.entities.some((entity) => entity !== this && entity !== this.game.player
        && entity.def?.type !== 'follower' && entity.solid && !entity.dead && entity.overlaps(rect));
    }

    reset() { [this.x, this.y] = this.start; this.slide = null; this.pendingSolvedScript = null; }

    draw(ctx, cam) {
      drawFactoryCrate(ctx, cam, this);
    }
  }

  class FactoryMoveArea extends Entity {
    constructor(def, game) { super({ solid: false, ...def, sortY: def.sortY ?? -220 }, game); }
    draw(ctx, cam) { drawFactoryMoveArea(ctx, cam, this); }
  }

  class FactoryPlate extends Entity {
    constructor(def, game) { super({ solid: false, w: 32, h: 32, ...def, sortY: def.sortY ?? -200 }, game); }
    contains(crate) { return Math.abs(crate.cx - this.cx) < 5 && Math.abs(crate.cy - this.cy) < 5; }
    draw(ctx, cam) {
      const pressed = puzzleEntities(this.game, this.def.puzzle)
        .some((entity) => entity.def.type === 'factory_crate' && this.contains(entity));
      drawFactoryPressurePlate(ctx, cam, this, pressed);
    }
  }

  class FactoryConsole extends Entity {
    constructor(def, game) { super({ solid: true, w: 28, h: 24, ...def }, game); }
    interact() {
      if (this.game.has(this.def.flag)) { this.game.runScript(this.def.solvedScript); return true; }
      if (this.def.resetCrate || this.def.resetCrates) {
        const crates = puzzleEntities(this.game, this.def.puzzle)
          .filter((entity) => entity.def.type === 'factory_crate');
        for (const crate of crates) crate.reset();
        for (const actor of this.game.entities.filter((entity) => entity === this.game.player || entity.def?.type === 'follower')) {
          if (!crates.some((crate) => crate.overlaps(actor.rect))) continue;
          [actor.x, actor.y] = freeSpot(this.game, actor, actor.x, actor.y, 64);
        }
        this.game.sound.sfx('click');
      }
      this.game.runScript(this.def.script);
      return true;
    }
    draw(ctx, cam) {
      drawFactoryConsole(ctx, cam, this);
    }
  }

  class FactoryGate extends Entity {
    constructor(def, game) { super(def, game); this.sync(); }
    update() { this.sync(); }
    sync() { this.solid = !this.game.has(this.def.flag); }
    draw(ctx, cam) {
      drawFactoryGate(ctx, cam, this, !this.solid);
    }
  }

  class FactoryBulkhead extends Entity {
    constructor(def, game) { super({ solid: true, ...def }, game); }
    draw(ctx, cam) { drawFactoryBulkhead(ctx, cam, this); }
  }

  class FactorySign extends Entity {
    constructor(def, game) { super({ solid: true, w: 28, h: 20, ...def }, game); }
    interact() { this.game.runScript(this.def.script); return true; }
    draw(ctx, cam) { drawFactorySign(ctx, cam, this); }
  }

  class CircuitPlate extends Entity {
    constructor(def, game) {
      super({ solid: true, w: 32, h: 32, ...def }, game);
      this.solution = def.solution ?? 0;
      this.orientation = game.has(def.flag) ? this.solution : (def.orientation ?? 1);
    }
    interact() {
      if (this.game.has(this.def.flag)) return true;
      this.orientation = (this.orientation + 1) % 2;
      this.game.sound.sfx('click');
      const plates = puzzleEntities(this.game, this.def.puzzle).filter((entity) => entity.def.type === 'factory_circuit');
      if (plates.length && plates.every(aligned)) {
        this.game.setFlag(this.def.flag);
        this.game.sound.sfx('chime');
        this.game.autosave();
      }
      return true;
    }
    draw(ctx, cam) {
      const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y), powered = this.powered();
      ctx.fillStyle = '#182535'; ctx.fillRect(x, y, 32, 32);
      ctx.fillStyle = '#657a92'; ctx.fillRect(x + 3, y + 3, 26, 26);
      ctx.fillStyle = powered ? '#60f4e0' : '#283d54';
      if (this.orientation === 0) ctx.fillRect(x, y + 13, 32, 6);
      else ctx.fillRect(x + 13, y, 6, 32);
      ctx.fillStyle = '#d8edf4'; ctx.fillRect(x + 14, y + 14, 4, 4);
    }
    powered() {
      if (this.game.has(this.def.flag)) return true;
      return (this.def.poweredBy || []).every((id) => aligned(this.game.entities.find((entity) => entity.id === id)));
    }
  }

  class FactoryWire extends Entity {
    constructor(def, game) { super({ solid: false, ...def, sortY: def.sortY ?? -210 }, game); }
    isLit() {
      const prerequisites = this.def.poweredBy || [];
      return this.def.source || this.game.has(this.def.flag)
        || (prerequisites.length > 0 && prerequisites.every((id) => aligned(this.game.entities.find((entity) => entity.id === id))));
    }
    draw(ctx, cam) {
      const lit = this.isLit();
      ctx.strokeStyle = lit ? '#60f4e0' : '#263c52'; ctx.lineWidth = 4; ctx.beginPath();
      this.def.points.forEach(([px, py], index) => index ? ctx.lineTo(Math.round(px - cam.x), Math.round(py - cam.y)) : ctx.moveTo(Math.round(px - cam.x), Math.round(py - cam.y)));
      ctx.stroke();
      for (const [px, py] of [this.def.points[0], this.def.points.at(-1)]) { ctx.fillStyle = lit ? '#b4fff4' : '#52677d'; ctx.fillRect(Math.round(px - cam.x - 3), Math.round(py - cam.y - 3), 6, 6); }
    }
  }

  class FactoryRail extends Entity {
    constructor(def, game) { super({ solid: false, ...def }, game); }
    draw(ctx, cam) {
      const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
      ctx.fillStyle = '#182535';
      ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = '#8da0b7';
      if (this.w > this.h) {
        ctx.fillRect(x, y, this.w, 3);
        for (let post = 0; post < this.w; post += 32) ctx.fillRect(x + post, y, 3, this.h);
      } else {
        ctx.fillRect(x, y, 3, this.h);
        for (let post = 0; post < this.h; post += 32) ctx.fillRect(x, y + post, this.w, 3);
      }
    }
  }

  registerEntity('factory_crate', FactoryCrate);
  registerEntity('factory_move_area', FactoryMoveArea);
  registerEntity('factory_plate', FactoryPlate);
  registerEntity('factory_console', FactoryConsole);
  registerEntity('factory_gate', FactoryGate);
  registerEntity('factory_bulkhead', FactoryBulkhead);
  registerEntity('factory_sign', FactorySign);
  registerEntity('factory_circuit', CircuitPlate);
  registerEntity('factory_wire', FactoryWire);
  registerEntity('factory_rail', FactoryRail);
}
