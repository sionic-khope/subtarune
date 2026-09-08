// ─────────────────────────────────────────────────────────────
// 오버월드: 타일맵 / 카메라 / 엔티티 / 플레이어
// 엔티티 종류 추가: registerEntity('type', class extends Entity)
// ─────────────────────────────────────────────────────────────
import { makeCanvas, artToCanvas, flipH, mulberry32 } from '../core/gfx.js';
import { TILE, getTile, tileCanvas } from './tiles.js';
import { TORSO, LEGS, WALK_CYCLE, PALETTES } from '../data/art.js';
import { CHARACTERS } from '../data/characters.js';

export const SCREEN_W = 320;
export const SCREEN_H = 240;
export const RENDER_SCALE = 2;   // 물리 해상도 배율 (640x480). 2x 시트가 1:1 로 찍힌다
export const CHAR_SCALE = 1;     // 캐릭터 추가 배율

// ── 타일맵 ───────────────────────────────────────────────────
export class TileMap {
  constructor(def) {
    this.def = def;
    this.rows = def.rows;
    this.h = this.rows.length;
    this.w = Math.max(...this.rows.map((r) => r.length));
    this.pxW = this.w * TILE;
    this.pxH = this.h * TILE;
    this.canvas = null;
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return getTile(' ');
    return getTile(this.rows[ty][tx] ?? ' ');
  }

  /** 픽셀 사각형이 막힌 타일과 겹치는지 */
  solidRect(x, y, w, h) {
    const x0 = Math.floor(x / TILE), y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 1) / TILE), y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.tileAt(tx, ty).solid) return true;
    return false;
  }

  /** 전체 맵을 한 번만 오프스크린에 굽는다 → 프레임마다 타일 루프 없음 */
  bake() {
    const c = makeCanvas(this.pxW, this.pxH);
    const ctx = c.getContext('2d');
    const rng = mulberry32(this.def.seed ?? 1);
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        const def = this.tileAt(tx, ty);
        const variant = Math.floor(rng() * 16);
        if (def.drawOver) {
          // 주변(왼쪽→오른쪽→위→아래)의 걸을 수 있는 타일을 바닥으로, 없으면 기본 drawOver
          const nb = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => this.tileAt(tx + dx, ty + dy)).find((t) => !t.solid && !t.drawOver);
          ctx.drawImage(tileCanvas(nb || getTile(def.drawOver), variant), tx * TILE, ty * TILE);
        }
        ctx.drawImage(tileCanvas(def, variant), tx * TILE, ty * TILE);
      }
    }
    this.canvas = c;
  }

  draw(ctx, cam) {
    if (!this.canvas) this.bake();
    ctx.drawImage(this.canvas, -cam.x, -cam.y);
  }
}

// ── 카메라 ───────────────────────────────────────────────────
export class Camera {
  constructor() { this.x = 0; this.y = 0; this.target = null; this.map = null; this.locked = false; }
  snap() { this.follow(1); }
  follow(lerp = 0.15) {
    if (this.locked || !this.target || !this.map) return;
    const tx = this.target.x + this.target.w / 2 - SCREEN_W / 2;
    const ty = this.target.y + this.target.h / 2 - SCREEN_H / 2;
    this.x += (tx - this.x) * lerp;
    this.y += (ty - this.y) * lerp;
    this.x = Math.max(0, Math.min(this.map.pxW - SCREEN_W, this.x));
    this.y = Math.max(0, Math.min(this.map.pxH - SCREEN_H, this.y));
    if (this.map.pxW < SCREEN_W) this.x = (this.map.pxW - SCREEN_W) / 2;
    if (this.map.pxH < SCREEN_H) this.y = (this.map.pxH - SCREEN_H) / 2;
  }
}

// ── 캐릭터 스프라이트 ────────────────────────────────────────
const spriteCache = new Map();
/** palette 이름으로 4방향 x 4프레임 스프라이트 세트를 만든다 */
export function characterSprite(paletteName, override = null) {
  const key = paletteName;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const set = { down: [], up: [], left: [], right: [], fw: 16, fh: 16, px: 1 };   // px: 시트 해상도 배율
  if (override) {
    // assets/sprites/<name>.png : 4열(프레임) x 4행(down, up, left, right). 프레임 = 폭/4 x 높이/4
    const fw = Math.floor(override.width / 4), fh = Math.floor(override.height / 4);
    set.fw = fw; set.fh = fh; set.px = RENDER_SCALE;   // assets/sprites 시트는 2x 해상도
    const rows = ['down', 'up', 'left', 'right'];
    rows.forEach((dir, r) => {
      for (let f = 0; f < 4; f++) {
        const c = makeCanvas(fw, fh);
        c.getContext('2d').drawImage(override, f * fw, r * fh, fw, fh, 0, 0, fw, fh);
        set[dir].push(c);
      }
    });
  } else {
    const pal = PALETTES[paletteName] || PALETTES[CHARACTERS[paletteName]?.palette] || PALETTES.hero;
    for (const legs of WALK_CYCLE) {
      set.down.push(artToCanvas([...TORSO.down, ...LEGS[legs]], pal));
      set.up.push(artToCanvas([...TORSO.up, ...LEGS[legs]], pal));
      const right = artToCanvas([...TORSO.side, ...LEGS[legs]], pal);
      set.right.push(right);
      set.left.push(flipH(right));
    }
  }
  spriteCache.set(key, set);
  return set;
}

// ── 엔티티 ───────────────────────────────────────────────────
const entityTypes = new Map();
export function registerEntity(type, cls) { entityTypes.set(type, cls); }
export function createEntity(def, game) {
  const Cls = entityTypes.get(def.type);
  if (!Cls) { console.warn('[entity] 모르는 타입', def.type); return null; }
  return new Cls(def, game);
}

export class Entity {
  constructor(def, game) {
    this.game = game;
    this.def = def;
    this.id = def.id ?? null;
    this.x = def.x; this.y = def.y;
    this.w = def.w ?? 12; this.h = def.h ?? 8;     // 충돌 박스(발 밑)
    this.solid = def.solid ?? true;
    this.facing = def.facing ?? 'down';
    this.visible = true;
    this.dead = false;
  }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  overlaps(r) { return this.x < r.x + r.w && this.x + this.w > r.x && this.y < r.y + r.h && this.y + this.h > r.y; }
  update() {}
  draw() {}
  /** 플레이어가 C를 눌렀을 때. 처리했으면 true */
  interact() { return false; }
  /** 플레이어가 위로 걸어 들어왔을 때 (solid=false 인 것만) */
  onEnter() {}
}

/** 스프라이트가 있는 캐릭터 공통 */
export class Character extends Entity {
  constructor(def, game) {
    super(def, game);
    this.sprite = characterSprite(def.sprite || 'hero', game.spriteOverrides[def.sprite]);
    this.frame = 0;
    this.animTime = 0;
    this.moving = false;
    this.speed = def.speed ?? 60;
  }
  animate(dt, fps = 8) {
    if (!this.moving) { this.frame = 0; this.animTime = 0; return; }
    this.animTime += dt;
    this.frame = Math.floor(this.animTime * fps) % 4;
  }
  /** 축별 이동 + 타일/엔티티 충돌 */
  moveBy(dx, dy) {
    const map = this.game.map;
    const others = this.game.entities.filter((e) => e !== this && e.solid && !e.dead);
    const blocked = (x, y) => map.solidRect(x, y, this.w, this.h) || others.some((e) => e.overlaps({ x, y, w: this.w, h: this.h }));
    if (dx) { const nx = this.x + dx; if (!blocked(nx, this.y)) this.x = nx; }
    if (dy) { const ny = this.y + dy; if (!blocked(this.x, ny)) this.y = ny; }
  }
  drawSprite(ctx, cam) {
    const img = this.sprite[this.facing][this.frame];
    const dw = Math.round(this.sprite.fw / this.sprite.px * CHAR_SCALE), dh = Math.round(this.sprite.fh / this.sprite.px * CHAR_SCALE);
    const sx = Math.round(this.x + this.w / 2 - dw / 2 - cam.x);
    const sy = Math.round(this.y + this.h - dh - cam.y);
    // 발밑 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(sx + Math.round(dw * 0.25), sy + dh - 1, Math.round(dw * 0.5), 2);
    ctx.drawImage(img, sx, sy, dw, dh);
  }
  draw(ctx, cam) { if (this.visible) this.drawSprite(ctx, cam); }
  /** 스프라이트 교체 (테스트룸/컷신용) */
  setSprite(name) {
    this.def.sprite = name;
    this.sprite = characterSprite(name, this.game.spriteOverrides[name]);
  }
  /** 대상 쪽을 바라본다 */
  faceToward(e) {
    const dx = e.cx - this.cx, dy = e.cy - this.cy;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
}

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class Player extends Character {
  constructor(def, game) {
    super({ w: 12, h: 8, speed: 62, ...def }, game);
    this.runMul = 1.75;
    this.lastMove = 0;
  }
  update(dt, input) {
    const a = input.axis();
    this.moving = a.x !== 0 || a.y !== 0;
    if (this.moving) {
      if (a.x) this.facing = a.x > 0 ? 'right' : 'left';
      if (a.y && !a.x) this.facing = a.y > 0 ? 'down' : 'up';
      const run = input.down('cancel') ? this.runMul : 1;
      const len = Math.hypot(a.x, a.y);
      const step = this.speed * run * dt;
      // 소수점 누적 이동 (도트 튐 방지: 렌더 시 round)
      this.moveBy((a.x / len) * step, (a.y / len) * step);
    }
    this.animate(dt, input.down('cancel') ? 14 : 8);

    // 밟는 트리거
    for (const e of this.game.entities) {
      if (e !== this && !e.solid && !e.dead && e.overlaps(this.rect)) e.onEnter(this);
    }
  }
  /** 바라보는 방향 앞의 상호작용 대상 */
  probe() {
    const [dx, dy] = DIRS[this.facing];
    const r = { x: this.x + dx * 10, y: this.y + dy * 10, w: this.w, h: this.h };
    return this.game.entities.find((e) => e !== this && !e.dead && e.overlaps(r) && e.interact !== Entity.prototype.interact);
  }
}

/** 말 걸 수 있는 NPC. def.script = 스크립트 키 또는 함수(flags)→키 */
export class NPC extends Character {
  constructor(def, game) {
    super(def, game);
    this.home = { x: def.x, y: def.y };
    this.wander = def.wander ?? 0;        // 픽셀 반경 (0이면 제자리)
    this.wanderTimer = 1 + Math.random() * 2;
    this.dir = { x: 0, y: 0 };
    this.baseFacing = this.facing;
  }
  update(dt) {
    if (this.game.dialogue.running) { this.moving = false; this.animate(dt); return; }
    if (this.wander > 0) {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 0.8 + Math.random() * 2.2;
        if (Math.random() < 0.5) { this.dir = { x: 0, y: 0 }; }
        else {
          const k = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
          this.dir = { x: DIRS[k][0], y: DIRS[k][1] }; this.facing = k;
        }
      }
      this.moving = this.dir.x !== 0 || this.dir.y !== 0;
      if (this.moving) {
        const nx = this.x + this.dir.x * 30 * dt, ny = this.y + this.dir.y * 30 * dt;
        if (Math.abs(nx - this.home.x) > this.wander || Math.abs(ny - this.home.y) > this.wander) { this.dir = { x: 0, y: 0 }; this.moving = false; }
        else { this.moveBy(this.dir.x * 30 * dt, this.dir.y * 30 * dt); }
      }
    }
    this.animate(dt, 6);
  }
  interact(player) {
    const key = typeof this.def.script === 'function' ? this.def.script(this.game.flags) : this.def.script;
    if (!key) return false;
    this.faceToward(player);
    this.dir = { x: 0, y: 0 };
    this.game.runScript(key, () => { this.facing = this.baseFacing; });
    return true;
  }
}

/** 팻말/오브젝트: 타일 위에 얹힌 텍스트 상호작용 */
export class Sign extends Entity {
  interact() { this.game.runScript(this.def.script); return true; }
}

/** 상자: 한 번만 열린다. flags[def.flag] 로 기록 */
export class Chest extends Entity {
  interact() {
    const f = this.def.flag;
    if (this.game.flags[f]) { this.game.runScript(this.def.emptyScript || '_chest_empty'); return true; }
    this.game.flags[f] = true;
    this.game.sound.sfx('item');
    this.game.runScript(this.def.script);
    return true;
  }
}

/** 문/워프: 밟으면 다른 맵으로 */
export class Door extends Entity {
  constructor(def, game) { super({ solid: false, w: 16, h: 6, ...def }, game); this.cooldown = 0; }
  update(dt) { if (this.cooldown > 0) this.cooldown -= dt; }
  onEnter(player) {
    if (this.cooldown > 0 || this.game.transitioning) return;
    this.game.sound.sfx('door');
    this.game.changeMap(this.def.to, this.def.spawn);
  }
}

/** 보이지 않는 트리거 영역 (컷신 시작 등) */
export class Trigger extends Entity {
  constructor(def, game) { super({ solid: false, ...def }, game); this.fired = false; }
  onEnter() {
    if (this.fired || this.game.dialogue.running) return;
    if (this.def.once && this.game.flags[this.def.flag]) return;
    this.fired = true;
    if (this.def.flag) this.game.flags[this.def.flag] = true;
    this.game.runScript(this.def.script, () => { if (!this.def.once) this.fired = false; });
  }
  draw() {}
}

registerEntity('player', Player);
registerEntity('npc', NPC);
registerEntity('sign', Sign);
registerEntity('chest', Chest);
registerEntity('door', Door);
registerEntity('trigger', Trigger);
