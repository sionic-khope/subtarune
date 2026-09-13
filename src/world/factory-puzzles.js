const TILE = 32;

const aligned = (plate) => plate.orientation === plate.solution;
const puzzleEntities = (game, puzzle) => game.entities.filter((entity) => entity.def?.puzzle === puzzle);

export function registerFactoryPuzzleEntities({ Entity, freeSpot, registerEntity }) {
  class FactoryCrate extends Entity {
    constructor(def, game) {
      super({ w: 28, h: 28, ...def }, game);
      this.start = [def.x, def.y];
      this.slide = null;
      this.pushCooldown = 0;
      if (game.has(def.flag)) [this.x, this.y] = [def.solvedX, def.solvedY];
    }

    update(dt, input) {
      if (this.game.has(this.def.flag)) return;
      this.pushCooldown = Math.max(0, this.pushCooldown - dt);
      if (this.slide) {
        this.slide.t = Math.min(this.slide.duration, this.slide.t + dt);
        const progress = this.slide.t / this.slide.duration;
        this.x = this.slide.fromX + (this.slide.toX - this.slide.fromX) * progress;
        this.y = this.slide.fromY + (this.slide.toY - this.slide.fromY) * progress;
        if (progress >= 1) { this.slide = null; this.checkPlate(); }
        return;
      }
      if (this.pushCooldown > 0) return;
      const direction = ['left', 'right', 'up', 'down'].find((name) => input.down(name));
      if (!direction) return;
      const vectors = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
      const [dx, dy] = vectors[direction];
      if (!this.playerCanPush(dx, dy) || !this.targetIsFree(dx, dy)) return;
      this.slide = {
        fromX: this.x, fromY: this.y, toX: this.x + dx * TILE, toY: this.y + dy * TILE,
        t: 0, duration: 0.14,
      };
      this.pushCooldown = 0.22;
      this.game.sound.sfx('scrape', { volume: 0.55 });
    }

    checkPlate() {
      const plate = puzzleEntities(this.game, this.def.puzzle).find((entity) => entity.def.type === 'factory_plate');
      if (plate?.contains(this)) {
        this.game.setFlag(this.def.flag);
        this.game.sound.sfx('click');
        this.game.autosave();
      }
    }

    playerCanPush(dx, dy) {
      const player = this.game.player;
      const overlapsX = player.x < this.x + this.w && player.x + player.w > this.x;
      const overlapsY = player.y < this.y + this.h && player.y + player.h > this.y;
      if (dx > 0) return overlapsY && player.x + player.w <= this.x + 3 && this.x - player.x - player.w <= 7;
      if (dx < 0) return overlapsY && player.x >= this.x + this.w - 3 && player.x - this.x - this.w <= 7;
      if (dy > 0) return overlapsX && player.y + player.h <= this.y + 3 && this.y - player.y - player.h <= 7;
      return overlapsX && player.y >= this.y + this.h - 3 && player.y - this.y - this.h <= 7;
    }

    targetIsFree(dx, dy) {
      const rect = { x: this.x + dx * TILE, y: this.y + dy * TILE, w: this.w, h: this.h };
      if (this.game.map.solidRect(rect.x, rect.y, rect.w, rect.h)) return false;
      return !this.game.entities.some((entity) => entity !== this && entity !== this.game.player
        && entity.def?.type !== 'follower' && entity.solid && !entity.dead && entity.overlaps(rect));
    }

    reset() { [this.x, this.y] = this.start; this.slide = null; this.pushCooldown = 0; }

    draw(ctx, cam) {
      const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
      ctx.fillStyle = '#1a2635'; ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = '#71849b'; ctx.fillRect(x + 2, y + 2, this.w - 4, this.h - 4);
      ctx.fillStyle = '#43566e'; ctx.fillRect(x + 6, y + 6, this.w - 12, this.h - 12);
      ctx.fillStyle = '#8da0b7';
      for (let offset = 0; offset < 16; offset += 2) {
        ctx.fillRect(x + 6 + offset, y + 6 + offset, 2, 2);
        ctx.fillRect(x + 20 - offset, y + 6 + offset, 2, 2);
      }
      ctx.fillStyle = '#a8bad0';
      for (const [ox, oy] of [[4, 4], [this.w - 6, 4], [4, this.h - 6], [this.w - 6, this.h - 6]]) ctx.fillRect(x + ox, y + oy, 2, 2);
    }
  }

  class FactoryPlate extends Entity {
    constructor(def, game) { super({ solid: false, w: 32, h: 32, ...def, sortY: def.sortY ?? -200 }, game); }
    contains(crate) { return Math.abs(crate.cx - this.cx) < 5 && Math.abs(crate.cy - this.cy) < 5; }
    draw(ctx, cam) {
      const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
      ctx.fillStyle = '#1b2938'; ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = this.game.has(this.def.flag) ? '#65f2d0' : '#d9a840'; ctx.fillRect(x + 4, y + 4, this.w - 8, this.h - 8);
      ctx.fillStyle = '#25364a'; ctx.fillRect(x + 8, y + 8, this.w - 16, this.h - 16);
    }
  }

  class FactoryConsole extends Entity {
    constructor(def, game) { super({ solid: true, w: 28, h: 24, ...def }, game); }
    interact() {
      if (this.game.has(this.def.flag)) { this.game.runScript(this.def.solvedScript); return true; }
      if (this.def.resetCrate) {
        const crate = puzzleEntities(this.game, this.def.puzzle).find((entity) => entity.def.type === 'factory_crate');
        crate?.reset();
        for (const actor of this.game.entities.filter((entity) => entity === this.game.player || entity.def?.type === 'follower')) {
          if (!crate?.overlaps(actor.rect)) continue;
          [actor.x, actor.y] = freeSpot(this.game, actor, actor.x, actor.y, 64);
        }
        this.game.sound.sfx('click');
      }
      this.game.runScript(this.def.script);
      return true;
    }
    draw(ctx, cam) {
      const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
      ctx.fillStyle = '#1b2938'; ctx.fillRect(x, y, this.w, this.h);
      ctx.fillStyle = '#71849b'; ctx.fillRect(x + 3, y + 3, this.w - 6, this.h - 6);
      ctx.fillStyle = '#f0be45'; ctx.fillRect(x + 9, y + 7, 10, 10);
    }
  }

  class FactoryGate extends Entity {
    constructor(def, game) { super(def, game); this.sync(); }
    update() { this.sync(); }
    sync() { this.solid = !this.game.has(this.def.flag); }
    draw(ctx, cam) {
      const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
      ctx.fillStyle = '#26384d'; ctx.fillRect(x - 4, y, 4, this.h); ctx.fillRect(x + this.w, y, 4, this.h);
      if (!this.solid) {
        ctx.fillStyle = '#65f2d0'; ctx.fillRect(x - 3, y + 4, 2, this.h - 8); ctx.fillRect(x + this.w + 1, y + 4, 2, this.h - 8);
        return;
      }
      if (this.def.style === 'plasma') {
        ctx.fillStyle = '#e958ff';
        for (let line = 4; line < this.w; line += 8) ctx.fillRect(x + line, y, 2, this.h);
      } else {
        ctx.fillStyle = '#536a82'; ctx.fillRect(x, y, this.w, this.h);
        ctx.fillStyle = '#27394e';
        for (let line = 8; line < this.h; line += 16) ctx.fillRect(x, y + line, this.w, 4);
      }
    }
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
  registerEntity('factory_plate', FactoryPlate);
  registerEntity('factory_console', FactoryConsole);
  registerEntity('factory_gate', FactoryGate);
  registerEntity('factory_circuit', CircuitPlate);
  registerEntity('factory_wire', FactoryWire);
  registerEntity('factory_rail', FactoryRail);
}
