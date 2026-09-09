// ─────────────────────────────────────────────────────────────
// 오버월드: 타일맵 / 카메라 / 엔티티 / 플레이어
// 엔티티 종류 추가: registerEntity('type', class extends Entity)
// ─────────────────────────────────────────────────────────────
import { makeCanvas, artToCanvas, flipH, mulberry32 } from '../core/gfx.js';
import { TILE, getTile, tileCanvas } from './tiles.js';
import { TORSO, LEGS, WALK_CYCLE, PALETTES } from '../data/art.js';
import { CHARACTERS } from '../data/characters.js';

export const SCREEN_W = 480;
export const SCREEN_H = 360;
export const RENDER_SCALE = 2;   // 물리 해상도 배율 (640x480). 2x 시트가 1:1 로 찍힌다
export const CHAR_SCALE = 1.43;  // 캐릭터 추가 배율 (+30% → 2026-09-09 사용자 요청으로 +10% 더 = 1.43)

// ── 타일맵 ───────────────────────────────────────────────────
export class TileMap {
  constructor(def, image = null) {
    this.def = def;
    this.image = image;                // 이미지 배경 맵 (def.image) — 실제 게임 배경 그림 + 사각형 충돌
    if (image) {
      this.scale = def.imageScale ?? 1;
      this.pxW = Math.round(image.width * this.scale);
      this.pxH = Math.round(image.height * this.scale);
      this.rows = []; this.w = 0; this.h = 0;
    } else {
      this.rows = def.rows;
      this.h = this.rows.length;
      this.w = Math.max(...this.rows.map((r) => r.length));
      this.pxW = this.w * TILE;
      this.pxH = this.h * TILE;
    }
    this.canvas = null;
  }

  /** 이미지 맵: walkable 사각형 안 + solids 사각형 밖 이어야 걸을 수 있다 */
  _imageSolid(x, y, w, h) {
    const inside = (px, py) => this.def.walkable.some((r) => px >= r[0] && py >= r[1] && px < r[0] + r[2] && py < r[1] + r[3]);
    const corners = [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]];
    if (!corners.every(([px, py]) => inside(px, py))) return true;
    return (this.def.solids || []).some((r) => x < r[0] + r[2] && x + w > r[0] && y < r[1] + r[3] && y + h > r[1]);
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return getTile(' ');
    return getTile(this.rows[ty][tx] ?? ' ');
  }

  /** 픽셀 사각형이 막힌 타일과 겹치는지 */
  solidRect(x, y, w, h) {
    if (this.image) return this._imageSolid(x, y, w, h);
    const x0 = Math.floor(x / TILE), y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 1) / TILE), y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.tileAt(tx, ty).solid) return true;
    return false;
  }

  /** 전체 맵을 한 번만 오프스크린에 굽는다 → 프레임마다 타일 루프 없음 */
  bake() {
    const c = makeCanvas(this.pxW, this.pxH);
    const ctx = c.getContext('2d');
    if (this.image) { ctx.drawImage(this.image, 0, 0, this.pxW, this.pxH); this.canvas = c; return; }
    const rng = mulberry32(this.def.seed ?? 1);
    for (let ty = 0; ty < this.h; ty++) {
      for (let tx = 0; tx < this.w; tx++) {
        const def = this.tileAt(tx, ty);
        const variant = Math.floor(rng() * 16);
        // 타일 아트(16px)를 TILE 크기로 정수배 확대
        if (def.drawOver) {
          // 주변(왼쪽→오른쪽→위→아래)의 걸을 수 있는 타일을 바닥으로, 없으면 기본 drawOver
          const nb = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => this.tileAt(tx + dx, ty + dy)).find((t) => !t.solid && !t.drawOver);
          ctx.drawImage(tileCanvas(nb || getTile(def.drawOver), variant), tx * TILE, ty * TILE, TILE, TILE);
        }
        ctx.drawImage(tileCanvas(def, variant), tx * TILE, ty * TILE, TILE, TILE);
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
      const order = CHARACTERS[paletteName]?.walkFrameOrder?.[dir] || [0, 1, 2, 3];
      for (let f = 0; f < 4; f++) {
        const c = makeCanvas(fw, fh);
        c.getContext('2d').drawImage(override, order[f] * fw, r * fh, fw, fh, 0, 0, fw, fh);
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
    this.w = def.w ?? TILE * 0.75; this.h = def.h ?? TILE * 0.5;     // 충돌 박스(발 밑)
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
  /** probe 후보인가 (interact 를 덮어쓴 엔티티). 소품은 script 유무로 판단 */
  canInteract() { return this.interact !== Entity.prototype.interact; }
  /** 플레이어가 위로 걸어 들어왔을 때 (solid=false 인 것만) */
  onEnter() {}
}

/** 스프라이트가 있는 캐릭터 공통 */
export class Character extends Entity {
  constructor(def, game) {
    super(def, game);
    this.sprite = characterSprite(def.sprite || 'hero', game.spriteOverrides[def.sprite]);
    this.frame = 0;
    this.animPhase = 0;
    this.moving = false;
    this.speed = def.speed ?? TILE * 3.8;
  }
  animate(dt, fps = 8) {
    if (!this.moving) { this.frame = 0; this.animPhase = 0; return; }
    this.animPhase += dt * fps;
    this.frame = Math.floor(this.animPhase) % 4;
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
    if (this.pose === 'lying') {           // 침대에 누움: 정면 스프라이트를 90도 눕힘 (머리가 위쪽)
      ctx.save();
      ctx.translate(Math.round(this.x + this.w / 2 - cam.x), Math.round(this.y + this.h / 2 - cam.y));
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(this.sprite.down[0], -Math.round(dw / 2), -Math.round(dh / 2) - 6, dw, dh);
      ctx.restore();
      return;
    }
    // 발밑 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(sx + Math.round(dw * 0.25), sy + dh - 2, Math.round(dw * 0.5), 3);
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
    super({ speed: TILE * 3.9 * 1.75, ...def }, game);
    this.slowMul = 1 / 1.75;              // X/Shift 를 누르면 천천히 (기본이 달리기)
    this.lastMove = 0;
  }
  update(dt, input) {
    const startX = this.x, startY = this.y;
    const a = input.axis();
    if (a.x !== 0 || a.y !== 0) {
      if (a.x) this.facing = a.x > 0 ? 'right' : 'left';
      if (a.y && !a.x) this.facing = a.y > 0 ? 'down' : 'up';
      const run = input.down('cancel') ? this.slowMul : 1;
      const len = Math.hypot(a.x, a.y);
      const step = this.speed * run * dt;
      // 소수점 누적 이동 (도트 튐 방지: 렌더 시 round)
      this.moveBy((a.x / len) * step, (a.y / len) * step);
    }
    this.moving = this.x !== startX || this.y !== startY;
    this.animate(dt, input.down('cancel') ? 8 : 12);

    // 밟는 트리거
    for (const e of this.game.entities) {
      if (e !== this && !e.solid && !e.dead && e.overlaps(this.rect)) e.onEnter(this);
    }
  }
  /** 바라보는 방향 앞의 상호작용 대상 */
  probe() {
    const [dx, dy] = DIRS[this.facing];
    const r = { x: this.x + dx * TILE * 0.6, y: this.y + dy * TILE * 0.6, w: this.w, h: this.h };
    // 장식 소품(러그·방석 등, script 없음)은 건너뛴다 — 안 그러면 그 위에 서서 밥상을 못 누른다
    return this.game.entities.find((e) => e !== this && !e.dead && e.canInteract() && e.overlaps(r));
  }
}

/** 말 걸 수 있는 NPC. def.script = 스크립트 키 또는 함수(flags)→키 */
export class NPC extends Character {
  constructor(def, game) {
    super(def, game);
    this.home = { x: def.x, y: def.y };
    this.wander = (def.wander ?? 0) * TILE / 16;   // 반경(16px 단위로 적음, 0이면 제자리)
    this.wanderTimer = 1 + Math.random() * 2;
    this.dir = { x: 0, y: 0 };
    this.baseFacing = this.facing;
  }
  update(dt) {
    if (this.game.dialogue.running) { this.moving = false; this.animate(dt); return; }
    const startX = this.x, startY = this.y;
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
        const sp = TILE * 1.9;
        const nx = this.x + this.dir.x * sp * dt, ny = this.y + this.dir.y * sp * dt;
        if (Math.abs(nx - this.home.x) > this.wander || Math.abs(ny - this.home.y) > this.wander) { this.dir = { x: 0, y: 0 }; this.moving = false; }
        else { this.moveBy(this.dir.x * sp * dt, this.dir.y * sp * dt); }
      }
    }
    this.moving = this.x !== startX || this.y !== startY;
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
    if (this.game.has(f)) { this.game.runScript(this.def.emptyScript || '_chest_empty'); return true; }
    this.game.setFlag(f);
    this.game.sound.sfx('item');
    this.game.runScript(this.def.script);
    return true;
  }
}

/**
 * 보이지 않는 트리거 영역.
 * 규칙: (1) 들어가는 순간(edge) 한 번만 발동 — 밟고 있는 동안 반복 금지, 나갔다 들어와야 재발동
 *       (2) 대사/컷신 중·맵 전환 중엔 발동 안 함, 끝난 뒤 COOLDOWN 동안도 안 함
 *       (3) once 면 flag 로 영구 1회
 * 겹침은 트리거가 매 프레임 직접 계산한다 (플레이어 업데이트가 멈춘 대사 중에도 '안에 있음' 상태가 유지되도록)
 */
export class Trigger extends Entity {
  static COOLDOWN = 0.35;
  constructor(def, game) { super({ solid: false, ...def }, game); this.inside = false; this.cooldown = 0; this.running = false; }
  onEnter() {}
  update(dt) {
    const p = this.game.player;
    const over = !!p && p.overlaps(this.rect);
    if (this.cooldown > 0) this.cooldown -= dt;
    const entering = over && !this.inside;
    this.inside = over;
    if (!entering || this.running || this.cooldown > 0) return;
    if (this.game.dialogue.running || this.game.transitioning) return;
    if (this.def.once && this.game.has(this.def.flag)) return;
    if (this.def.flag) this.game.setFlag(this.def.flag);
    this.running = true;
    this.fire(() => { this.running = false; this.cooldown = Trigger.COOLDOWN; });
  }
  /** 진입 시 실제 동작. 끝나면 done() 호출 (서브클래스가 덮어씀) */
  fire(done) { this.game.runScript(this.def.script, done); }
  draw() {}
}

/**
 * 문/워프: 밟으면 다른 맵으로. 트리거와 같은 진입 규칙(edge 1회 + 쿨다운 + 대사 중 무시).
 *   { type:'door', x,y,w?,h?, to:'맵', spawn:'스폰', requires?:'플래그', lockedScript?:'스크립트' }
 *   requires 플래그가 없으면 lockedScript 대사만 띄우고 이동하지 않는다 (같은 자리에 서 있어도 반복 안 됨).
 */
export class Door extends Trigger {
  constructor(def, game) { super({ w: TILE, h: TILE * 0.375, ...def }, game); }
  fire(done) {
    if (this.def.requires && !this.game.has(this.def.requires)) {
      if (this.def.lockedScript) this.game.runScript(this.def.lockedScript, done); else done();
      return;
    }
    if (!this.def.to) { done(); return; }
    this.game.sound.sfx('door');
    this.game.changeMap(this.def.to, this.def.spawn);
    done();
  }
}

/** 소품: 라이브러리 이미지 하나를 월드에 배치. y-정렬로 그려지고, solid 면 막힘, script 있으면 상호작용 */
export class Prop extends Entity {
  constructor(def, game) {
    super({ solid: def.solid ?? true, ...def }, game);
    this.image = game.propImages[def.image] || null;
    this.scale = def.scale ?? 1;
    const iw = this.image ? Math.round(this.image.width * this.scale) : 32;
    const ih = this.image ? Math.round(this.image.height * this.scale) : 32;
    this.iw = iw; this.ih = ih;
    // 히트박스: 지정 없으면 이미지 아래쪽 40%
    if (def.w === undefined) { this.w = iw; this.h = Math.max(4, Math.round(ih * 0.4)); this.x = def.x; this.y = def.y + ih - this.h; }
  }
  get drawX() { return this.def.w === undefined ? this.x : (this.def.ix ?? this.def.x); }
  get drawY() { return this.def.w === undefined ? this.y + this.h - this.ih : (this.def.iy ?? this.def.y); }
  interact() { if (!this.def.script) return false; this.game.runScript(this.def.script); return true; }
  canInteract() { return !!this.def.script; }
  draw(ctx, cam) {
    if (!this.visible) return;
    if (this.image) ctx.drawImage(this.image, Math.round(this.drawX - cam.x), Math.round(this.drawY - cam.y), this.iw, this.ih);
    else { ctx.fillStyle = 'rgba(255,0,255,0.5)'; ctx.fillRect(Math.round(this.x - cam.x), Math.round(this.y - cam.y), this.w, this.h); }
  }
}

registerEntity('player', Player);
registerEntity('prop', Prop);
registerEntity('npc', NPC);
registerEntity('sign', Sign);
registerEntity('chest', Chest);
registerEntity('door', Door);
registerEntity('trigger', Trigger);
