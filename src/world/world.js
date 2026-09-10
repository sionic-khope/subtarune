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
        if (def.name === 'void') continue;                 // 허공은 투명 — 맵 배경(backdrop)이 비친다. 바탕은 어차피 검정
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
      const sideWalk = CHARACTERS[paletteName]?.sideWalk;
      if (sideWalk && (dir === 'left' || dir === 'right')) {
        const sourceY = r * fh;
        const neutral = makeCanvas(fw, fh);
        neutral.getContext('2d').drawImage(override, 0, sourceY, fw, fh, 0, 0, fw, fh);
        if (sideWalk.legFrames) {
          const { legY, legFrames } = sideWalk;
          const step = (legFrame) => {
            const c = makeCanvas(fw, fh);
            const ctx = c.getContext('2d');
            ctx.drawImage(override, 0, sourceY, fw, legY, 0, 0, fw, legY);
            ctx.drawImage(override, legFrame * fw, sourceY + legY, fw, fh - legY, 0, legY, fw, fh - legY);
            return c;
          };
          set[dir].push(neutral, step(legFrames[0]), neutral, step(legFrames[1]));
          return;
        }
        const { feetY, splitX, stride } = sideWalk;
        const step = (leftOffset, rightOffset) => {
          const c = makeCanvas(fw, fh);
          const ctx = c.getContext('2d');
          ctx.drawImage(override, 0, sourceY, fw, feetY, 0, 0, fw, feetY);
          ctx.drawImage(override, 0, sourceY + feetY, splitX, fh - feetY, leftOffset, feetY, splitX, fh - feetY);
          ctx.drawImage(override, splitX, sourceY + feetY, fw - splitX, fh - feetY, splitX + rightOffset, feetY, fw - splitX, fh - feetY);
          return c;
        };
        set[dir].push(neutral, step(-stride, stride), neutral, step(stride, -stride));
        return;
      }
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
    if (this.motion) {
      const frame = this.motion.frames[this.motion.index];
      const scale = this.motion.scale * CHAR_SCALE;
      const anchorX = this.x + this.w / 2 - cam.x, anchorY = this.y + this.h - cam.y;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(Math.round(anchorX - this.w / 2), Math.round(anchorY - 2), this.w, 3);
      ctx.drawImage(frame.image, Math.round(anchorX - frame.pivot[0] * scale), Math.round(anchorY - frame.pivot[1] * scale), Math.round(frame.image.width * scale), Math.round(frame.image.height * scale));
      if (this.emote) drawEmote(ctx, this.emote, Math.round(anchorX), Math.round(anchorY - frame.pivot[1] * scale));
      return;
    }
    const img = this.sprite[this.facing][this.frame];
    const dw = Math.round(this.sprite.fw / this.sprite.px * CHAR_SCALE), dh = Math.round(this.sprite.fh / this.sprite.px * CHAR_SCALE);
    const jx = this.jitter && this.jitter.t > 0 ? (Math.floor(this.jitter.t * 18) % 2 ? this.jitter.amp : -this.jitter.amp) : 0;   // 타다다닥(강아지 물 털듯) — main.js 가 t 를 줄인다
    const sx = Math.round(this.x + this.w / 2 - dw / 2 - cam.x) + jx;
    const sy = Math.round(this.y + this.h - dh - cam.y) - Math.round(this.hopY || 0);   // hopY: 컷신 {hop} 점프 연출
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
    if (this.emote) drawEmote(ctx, this.emote, sx + Math.round(dw / 2), sy);
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
/**
 * 머리 위 이모트 (컷신 { emote:id, kind:'!'|'sweat', duration }): '!' 는 0.12초 동안 튀어올라 머물고, 'sweat' 는 오른쪽 관자놀이에서 식은땀이 흘러내린다.
 * main.js 가 e.emote.t 를 올리고 life 가 지나면 지운다. 새 스프라이트 없이 캐릭터 위에 덧그린다 (2026-09-10 쥰희·경섭 컷신).
 */
export function drawEmote(ctx, em, cx, top) {
  const t = em.t;
  if (em.kind === 'sweat') {
    const x = cx + 14, y = top + 6 + Math.min(10, t * 12);
    ctx.fillStyle = '#0b1a3a'; ctx.fillRect(x - 1, y, 3, 3); ctx.fillRect(x - 2, y + 3, 5, 4); ctx.fillRect(x - 1, y + 7, 3, 1);
    ctx.fillStyle = '#4fa3ff'; ctx.fillRect(x, y + 1, 1, 2); ctx.fillRect(x - 1, y + 3, 3, 4);
    ctx.fillStyle = '#d6ecff'; ctx.fillRect(x - 1, y + 3, 1, 2);
    return;
  }
  const pop = Math.min(1, t / 0.12), y = top - 22 - Math.round(6 * Math.sin(pop * Math.PI / 2)), x = cx - 3;   // '!'
  ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, 8, 12); ctx.fillRect(x - 1, y + 13, 8, 5);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 6, 10); ctx.fillRect(x, y + 14, 6, 3);
}
let _unstickTick = 0; const g_frame_skip = () => (++_unstickTick % 6) !== 0;   // 끼임 검사는 6프레임마다 (비용 절감)

/**
 * 캐릭터를 놓을 자리가 막혀 있으면(타일·solid 소품) 주변 8px 격자에서 가장 가까운 빈 칸을 돌려준다.
 * 컷신 이동 도착·점프 착지·동료 재정렬 등 "코드가 캐릭터를 옮기는" 모든 곳이 쓴다 — 벽/소품 안에 끼워 넣지 않기 (2026-09-10 포스트모텀).
 */
export function freeSpot(game, e, tx, ty, radius = 48) {
  const map = game.map; if (!map) return [tx, ty];
  const blocked = (x, y) => map.solidRect(x, y, e.w, e.h) || game.entities.some((o) => o !== e && o.solid && !o.dead && o !== game.player && o.def?.type !== 'follower' && o.overlaps({ x, y, w: e.w, h: e.h }));
  if (!blocked(tx, ty)) return [tx, ty];
  let best = null;
  for (let dy = -radius; dy <= radius; dy += 8) for (let dx = -radius; dx <= radius; dx += 8) {
    const x = tx + dx, y = ty + dy; if (blocked(x, y)) continue;
    const d = Math.hypot(dx, dy); if (!best || d < best.d) best = { x, y, d };
  }
  return best ? [best.x, best.y] : [tx, ty];
}

export class Player extends Character {
  constructor(def, game) {
    super({ speed: TILE * 3.9 * 1.75, ...def }, game);
    this.slowMul = 1 / 1.75;              // X/Shift 를 누르면 천천히 (기본이 달리기)
    this.lastMove = 0;
  }
  /** 어떤 코드 경로로든 벽·solid 소품 안에 놓였으면(끼임) 가장 가까운 빈 칸으로 빠져나온다 — 영구 끼임 방지 안전장치 (2026-09-10) */
  unstick() {
    const g = this.game, map = g.map; if (!map) return;
    const inSolid = map.solidRect(this.x, this.y, this.w, this.h) || g.entities.some((o) => o !== this && o.solid && !o.dead && o.def?.type !== 'follower' && o.overlaps(this.rect));
    if (!inSolid) return;
    const [x, y] = freeSpot(g, this, this.x, this.y, 64); this.x = x; this.y = y;
  }
  update(dt, input) {
    if (!g_frame_skip(this)) this.unstick();
    if (this.knock) {                       // 피격 슬라이드: 입력 없이 옆으로 미끄러진다(벽에 부딪히는 느낌 금지) — game.hurtPlayer 가 건다
      const k = this.knock; k.t -= dt;
      this.moveBy(k.vx * Math.max(0, k.t / k.dur) * dt, 0);
      if (k.t <= 0) this.knock = null;
      this.moving = false; this.animate(dt);
      return;
    }
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
    if (this.moving) this.recordTrail();

    // 밟는 트리거
    for (const e of this.game.entities) {
      if (e !== this && !e.solid && !e.dead && e.overlaps(this.rect)) e.onEnter(this);
    }
  }
  /** 동료가 따라올 발자국 기록 (이동한 프레임만) — Follower 가 뒤에서 이 자취를 따라 걷는다 */
  recordTrail() {
    if (!this.trail) this.trail = [];
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(this.x - last.x, this.y - last.y) >= 2) { this.trail.push({ x: this.x, y: this.y, facing: this.facing }); if (this.trail.length > 400) this.trail.splice(0, this.trail.length - 400); }
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
 *   { type:'door', x,y,w?,h?, to:'맵', spawn:'스폰', requires?:'플래그', lockedScript?:'스크립트', sfx?:false|'이름', interact?:true }
 *   requires 플래그가 없으면 lockedScript 대사만 띄우고 이동하지 않는다 (같은 자리에 서 있어도 반복 안 됨).
 *   interact:true 면 **밟아서는 아무 일도 없고 앞에서 C 를 눌러야** 연다(잠긴 작은 문 등, 2026-09-10 사용자 규칙 "상호작용해야 문이 열려야지").
 *     이때 x,y,w,h 는 상호작용 히트박스 — 문 그림보다 넓게(≈70px) 줘서 좁은 자리 찾기가 없게 한다.
 */
export class Door extends Trigger {
  constructor(def, game) { super({ w: TILE, h: TILE * 0.375, ...def }, game); }
  canInteract() { return !!this.def.interact; }
  interact() {
    if (!this.def.interact) return false;
    if (this.running || this.cooldown > 0 || this.game.dialogue.running || this.game.transitioning) return true;
    this.running = true; this.fire(() => { this.running = false; this.cooldown = Trigger.COOLDOWN; });
    return true;
  }
  update(dt) { if (this.def.interact) { if (this.cooldown > 0) this.cooldown -= dt; return; } super.update(dt); }
  fire(done) {
    if (this.def.requires && !this.game.has(this.def.requires)) {
      if (this.def.lockedScript) this.game.runScript(this.def.lockedScript, done); else done();
      return;
    }
    if (!this.def.to) { done(); return; }
    if (this.def.sfx !== false) this.game.sound.sfx(this.def.sfx || 'door');   // sfx:false 면 소리 없음(보라맵 문), sfx:'이름' 으로 바꿀 수도
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
  /** 움직이는 소품: def.oscillate = { dx?, dy?, period, phase? } — 기준 위치에서 사인파로 왕복(움직이는 벽 등). 히트박스와 그림이 같이 움직인다 */
  update(dt) {
    const o = this.def.oscillate; if (!o) return;
    if (this.base === undefined) { this.base = { x: this.x, y: this.y, ix: this.def.ix ?? this.x, iy: this.def.iy ?? this.y }; this.osT = 0; }
    this.osT += dt; const k = Math.sin((this.osT / (o.period || 3) + (o.phase || 0)) * Math.PI * 2);
    const ox = Math.round((o.dx || 0) * k), oy = Math.round((o.dy || 0) * k);
    this.x = this.base.x + ox; this.y = this.base.y + oy; this.def.ix = this.base.ix + ox; this.def.iy = this.base.iy + oy;
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

/**
 * 뗏목(재사용 기믹): 물 위 발판. 옆에 서서 C → 정해진 경로(route)를 따라 일직선으로 이동, 끝에서 내린다. 반대편에서 타면 되돌아온다.
 *   { type:'raft', id:'raft1', image:'assets/props/raft.png', x,y, route:[[x,y]], speed:171, flag?:'raft1',
 *     onBoard?:'스크립트', onBoardFlag?:'플래그',   // 처음 탈 때 출발하지 않고 컷신부터 (컷신이 { raft:id, go:true } 로 출발시킨다)
 *     onArrive?:'스크립트', onArriveFlag?:'플래그', // 도착 직후 1회 컷신
 *     swim?:'ppaman',                              // 이 동료는 타지 않고 뗏목 뒤에서 얼굴만 내밀고 헤엄친다(Swimmer). 도착하면 뭍에 올라와 다시 동료
 *     jump?:true, jumpH?:64, jumpDur?:1.0 }        // C 점프(2블럭). **swim 동료가 뒤에 있을 때만** 된다 — 그 전 뗏목은 C 눌러도 안 됨 (2026-09-10 사용자 규칙)
 *   x,y 와 route 는 이미지 좌상단(월드). 상태: flags[flag] = 지금 있는 route 인덱스(0=시작) → 맵을 다시 들어와도 그 자리.
 *   타는 동안 game.ride 가 서서 플레이어 입력·트리거가 멈춘다(main.js). 탑승자(와 동료)는 걷지 않고 정지 프레임으로 서 있는다. 도착하면 진행 방향으로 플레이어를 밀어 내린다.
 *   장애물: `obstacle:true` 소품(물 위 벽)에 공중이 아닐 때 닿으면 쿵(thud·흔들림) 하고 벽 앞에 멈춘다 → C 점프로 넘는다(멈춘 채 점프해도 넘어감). 가로·세로 경로 모두. 움직이는 벽은 소품 `oscillate`.
 */
export class Raft extends Prop {
  constructor(def, game) {
    const w = def.w ?? 56, h = def.h ?? 40;
    super({ solid: true, w, h, ix: def.x, iy: def.y, ...def }, game);
    this.route = [[def.x, def.y], ...(def.route || [])];
    this.speed = def.speed ?? 171;   // 2026-09-09 +50%
    this.at = Math.min(this.route.length - 1, game.flags[this.flagKey] ?? 0);
    this.setPos(this.route[this.at]);
    this.riding = false; this.moving = false; this.target = 0; this.blocked = null; this.hits = 0;
    this.jumping = false; this.jumpT = 0; this.jumpY = 0; this.jumpDur = def.jumpDur ?? 1.0; this.jumpH = def.jumpH ?? 64;
    this.swimmer = null; this.dirFacing = 'right';
  }
  get flagKey() { return this.def.flag || `raft_${this.id || 'raft'}`; }
  setPos([x, y]) { this.x = x; this.y = y; this.def.ix = x; this.def.iy = y; }
  canInteract() { return true; }
  interact(player) {
    if (this.riding || this.game.ride) return true;
    this.board(player);
    const bf = this.def.onBoardFlag || `${this.id}_boarded`;
    if (this.def.onBoard && !this.game.has(bf)) { this.game.setFlag(bf); this.game.runScript(this.def.onBoard); return true; }   // 출발은 컷신이
    this.depart();
    return true;
  }
  /** 올라타기만 (출발 안 함) */
  board(player) {
    this.riding = true; this.game.ride = this; this.rider = player; player.moving = false; player.frame = 0;
    this.target = this.at === 0 ? this.route.length - 1 : 0;
    const [tx, ty] = this.route[this.target]; player.facing = tx > this.x ? 'right' : tx < this.x ? 'left' : ty > this.y ? 'down' : 'up'; this.dirFacing = player.facing;
    this._carry(); this.game.sound.sfx('splash', { volume: 0.6 }); this.splashT = 1.1;
  }
  /** 출발 (swim 동료가 있으면 숨기고 뒤에서 헤엄치게) */
  depart() { if (!this.riding) return; this.moving = true; this.blocked = null; this.ensureSwimmer(); }
  ensureSwimmer() {
    const id = this.def.swim; if (!id || !this.game.party?.includes(id)) return;
    const f = this.game.entities.find((e) => e.def?.type === 'follower' && e.id === id); if (f) f.visible = false;
    if (!this.hasSwimmer) this.swimmer = this.game.spawn({ type: 'swimmer', id: `${id}_swim`, sprite: id, raft: this.id, x: this.x - 26, y: this.y, facing: this.dirFacing });
  }
  get hasSwimmer() { return !!(this.swimmer && !this.swimmer.dead); }
  /** C 점프 가능? — jump 옵션 + 뒤에서 헤엄치는 동료 + 공중 아님 + 대사 아님 */
  canJump() { return this.riding && !!this.def.jump && this.hasSwimmer && !this.jumping && !this.game.dialogue.running; }
  /** 점프: 2블럭 높이 사인 궤적, 그동안 계속 전진(멈춰 있었어도 다시 간다). force 는 컷신용 */
  jump(force = false) {
    if (force ? !(this.riding && !this.jumping) : !this.canJump()) return false;
    this.jumping = true; this.jumpT = 0; this.jumpY = 0; this.moving = true; this.blocked = null;
    this.game.sound.sfx('jump', { volume: 0.7 });
    if (this.hasSwimmer) { this.game.emitDropletsAt(this.swimmer.x + this.swimmer.w / 2, this.swimmer.y + this.swimmer.h, 10); this.swimmer.hop = 0; }   // 이륙 물튀김 + 웅크렸다 뛰는 연출
    return true;
  }
  _carry() { const p = this.rider; p.x = Math.round(this.x + this.w / 2 - p.w / 2); p.y = Math.round(this.y + this.h * 0.68 - p.h) - Math.round(this.jumpY); }   // 발이 뗏목 아래쪽에 닿게 → 위에 서 있는 느낌 (그리기 순서는 main.js 가 항상 위로). 점프 중엔 같이 뜬다
  update(dt) {
    if (!this.riding) return;
    if (this.jumping) {
      this.jumpT += dt;
      if (this.jumpT >= this.jumpDur) { this.jumping = false; this.jumpT = 0; this.jumpY = 0; this.game.emitDropletsAt(this.x + this.w / 2, this.y + this.h * 0.7, 8); }   // 착지 물튀김(소리 없음)
      else this.jumpY = this.jumpH * Math.sin(Math.PI * this.jumpT / this.jumpDur);
    }
    if (!this.moving) { this._carry(); this.rider.moving = false; this.rider.frame = 0; return; }
    const [tx, ty] = this.route[this.target];
    const dx = tx - this.x, dy = ty - this.y, dist = Math.hypot(dx, dy), step = this.speed * dt;
    if (dist <= step) {
      this.setPos([tx, ty]); this.at = this.target; this.game.flags[this.flagKey] = this.at;
      this.jumping = false; this.jumpY = 0; this._carry();                 // 공중에서 도착해도 먼저 뗏목 위로 내려놓고(점프 높이 0) 하차 자리를 찾는다 (2026-09-10 '도착할 때쯤 점프하면 맵 밖에 갇힘')
      this.riding = false; this.moving = false; this.game.ride = null;
      this.game.sound.sfx('splash', { volume: 0.5 });
      this._disembark(dx, dy);
      this._landSwimmer();
      const af = this.def.onArriveFlag || `${this.id}_arrived`;
      const runArrive = this.def.onArrive && !this.game.has(af);
      if (runArrive) this.game.setFlag(af);
      this.game.autosave?.();
      if (runArrive) this.game.runScript(this.def.onArrive);
      return;
    }
    const nx = this.x + (dx / dist) * step, ny = this.y + (dy / dist) * step;
    const low = !this.jumping || (this.jumpT > this.jumpDur * 0.5 && this.jumpY < 16);   // 이륙(상승)은 벽 바로 앞에서도 넘어간다. 착지 구간에 벽이면 쿵
    if (low) {
      const wall = this.game.entities.find((e) => e.def?.obstacle && !e.dead && e.overlaps({ x: nx, y: ny, w: this.w, h: this.h }));
      if (wall) {
        if (Math.abs(dx) >= Math.abs(dy)) this.setPos([Math.round(dx >= 0 ? wall.x - this.w - 2 : wall.x + wall.w + 2), this.y]);   // 가로 경로
        else this.setPos([this.x, Math.round(dy >= 0 ? wall.y - this.h - 2 : wall.y + wall.h + 2)]);                         // 세로 경로
        this.moving = false; this.blocked = wall; this.jumping = false; this.jumpY = 0; this.hits++;
        this._carry(); this.game.sound.sfx('thud', { volume: 0.8 }); this.game.shake = { time: 0.25, amp: 3 };
        return;
      }
    }
    this.x = nx; this.y = ny; this.def.ix = this.x; this.def.iy = this.y;
    this._carry();
    this.rider.moving = false; this.rider.frame = 0; this.rider.animPhase = 0;   // 실려 가는 동안 가만히 서 있는다(걷기 애니 금지, 2026-09-10)
    if (!this.jumping) {
      this.splashT -= dt;                                                     // 움직이는 동안 첨벙 (1.1s 마다, 작게·피치 조금씩 다르게)
      if (this.splashT <= 0) { this.splashT = 1.1; this.game.sound.sfx('splash', { volume: 0.32, rate: 0.85 + Math.random() * 0.2 }); }
    }
  }
  /** 도착: 진행 방향(없으면 사방)으로 4px 씩 밀어 뗏목 밖·막히지 않은 자리에 내려놓는다 */
  _disembark(dx, dy) {
    const p = this.rider; const map = this.game.map;
    const solidEnt = (x, y) => this.game.entities.some((o) => o !== this && o !== p && o.solid && !o.dead && o.def?.type !== 'follower' && o.overlaps({ x, y, w: p.w, h: p.h }));
    const dirs = Math.abs(dx) > Math.abs(dy) ? [[Math.sign(dx), 0], [0, 1], [0, -1]] : [[0, Math.sign(dy) || 1], [1, 0], [-1, 0]];
    for (const [ux, uy] of dirs) {
      for (let k = 1; k <= 24; k++) {
        const nx = p.x + ux * 4 * k, ny = p.y + uy * 4 * k;
        if (!map.solidRect(nx, ny, p.w, p.h) && !this.overlaps({ x: nx, y: ny, w: p.w, h: p.h }) && !solidEnt(nx, ny)) { p.x = nx; p.y = ny; p.moving = false; p.frame = 0; return; }   // 타일·뗏목·소품(버튼 등) 전부 피한다
      }
    }
    // 못 찾으면(이상 위치) 뗏목 주변 6타일 안에서 가장 가까운 빈 자리로 — 어떤 경우에도 막힌 칸에 남기지 않는다
    let best = null;
    for (let ty = -6; ty <= 6; ty++) for (let tx = -6; tx <= 6; tx++) {
      const nx = Math.round(this.x + this.w / 2 - p.w / 2) + tx * TILE, ny = Math.round(this.y + this.h * 0.68 - p.h) + ty * TILE;
      if (map.solidRect(nx, ny, p.w, p.h) || this.overlaps({ x: nx, y: ny, w: p.w, h: p.h })) continue;
      const d = Math.hypot(tx - Math.sign(dx) * 2, ty);
      if (!best || d < best.d) best = { nx, ny, d };
    }
    if (best) { p.x = best.nx; p.y = best.ny; p.moving = false; p.frame = 0; }
  }
  /** 헤엄치던 동료가 뭍에 올라온다: Swimmer 제거, 주인공은 조금 더 뭍 안쪽으로, 동료는 물가 쪽(주인공 뒤)에서 마주 본다 (2026-09-10 위치 반전 요청) */
  _landSwimmer() {
    if (!this.def.swim) return;
    if (this.swimmer) { this.swimmer.dead = true; this.swimmer = null; }
    const f = this.game.entities.find((e) => e.def?.type === 'follower' && e.id === this.def.swim); if (!f) return;
    const p = this.rider, ahead = this.dirFacing === 'left' ? -1 : 1;
    [p.x, p.y] = freeSpot(this.game, p, p.x + ahead * 40, p.y);                       // 뭍 안쪽으로 — 소품(버튼 등)·벽이면 옆 빈 칸 (2026-09-10 '도착하면 버튼에 낌')
    f.visible = true; [f.x, f.y] = freeSpot(this.game, f, p.x - ahead * (f.w + 18), p.y); f.facing = ahead > 0 ? 'right' : 'left'; f.moving = false; f.frame = 0; p.facing = ahead > 0 ? 'left' : 'right'; p.trail = [];
  }
  draw(ctx, cam) {
    if (!this.visible) return;
    const x = Math.round(this.drawX - cam.x), y = Math.round(this.drawY - cam.y);
    if (this.jumpY > 0) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + this.iw / 2, y + this.ih * 0.7, this.iw * 0.45, 5, 0, 0, Math.PI * 2); ctx.fill(); }   // 물 위 그림자
    if (this.image) ctx.drawImage(this.image, x, y - Math.round(this.jumpY), this.iw, this.ih);
  }
}

/**
 * 헤엄치는 동료(뗏목 뒤에서 얼굴만): Raft 가 swim 옵션으로 만들고 도착 때 치운다. 점프 중엔 몸 전체가 뗏목을 들고 같이 뜬다.
 *   { type:'swimmer', id:'ppaman_swim', sprite:'ppaman', raft:'raft8' }
 */
export class Swimmer extends Character {
  constructor(def, game) { super({ solid: false, w: 24, h: 12, ...def }, game); this.raftId = def.raft; this.t = 0; this.lift = 0; this.hop = null; }
  canInteract() { return false; }
  get raft() { return this.game.entities.find((e) => e.id === this.raftId && !e.dead); }
  update(dt) {
    this.t += dt; const r = this.raft; if (!r) return;
    const d = r.dirFacing;                                               // 진행 방향 반대쪽 = 뒤
    if (d === 'down' || d === 'up') { this.x = Math.round(r.x + r.w / 2 - this.w / 2); this.y = d === 'down' ? r.y - this.h - 46 : r.y + r.h + 14; }   // 세로: 주인공 머리(뗏목 위 -21px)와 안 겹치게 뒤(위)로 충분히 띄운다
    else { this.x = d === 'left' ? r.x + r.w + 2 : r.x - this.w - 2; this.y = Math.round(r.y + r.h * 0.55) - this.h; }   // 물결선 = 뗏목 중간
    this.facing = r.dirFacing; this.lift = r.jumpY; this.moving = false; this.frame = 0;
    if (this.hop !== null) { this.hop += dt; if (this.hop > 0.35) this.hop = null; }
  }
  draw(ctx, cam) {
    if (!this.visible) return;
    const img = this.sprite[this.facing][0];
    const dw = Math.round(this.sprite.fw / this.sprite.px * CHAR_SCALE), dh = Math.round(this.sprite.fh / this.sprite.px * CHAR_SCALE);
    const water = this.y + this.h, sx = Math.round(this.x + this.w / 2 - dw / 2 - cam.x), wy = Math.round(water - cam.y);
    if (this.lift > 0 || this.hop !== null) {                                            // 점프: 뒤에서 들고 같이 뜬다(몸 전체). 처음 0.35s 는 웅크렸다(0.8) 쭉 늘어나(1.15) 돌아오는 미세 연출
      const k = this.hop ?? 1, sy = k < 0.1 ? 0.8 + (k / 0.1) * 0.35 : k < 0.35 ? 1.15 - ((k - 0.1) / 0.25) * 0.15 : 1;
      const foot = Math.round(water + 12 - this.lift - cam.y);
      ctx.save(); ctx.translate(sx + dw / 2, foot); ctx.scale(1, sy); ctx.drawImage(img, -dw / 2, -dh, dw, dh); ctx.restore();
      return;
    }
    const bob = Math.round(Math.sin(this.t * 4) * 1.5), headH = Math.round(dh * 0.42);
    const sy = wy - headH + bob;
    ctx.save(); ctx.beginPath(); ctx.rect(sx - 2, sy, dw + 4, wy - sy); ctx.clip(); ctx.drawImage(img, sx, sy, dw, dh); ctx.restore();   // 물결선 아래는 안 보임
    ctx.strokeStyle = 'rgba(20,40,120,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx + dw / 2, wy + 0.5, dw / 2 + 2, 3, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

/**
 * 동료(파티원): 델타룬처럼 주인공의 발자국을 일정 거리 뒤에서 따라 걷는다. 충돌 없음(끼임 방지).
 *   game.party = ['ppaman', ...] 순서대로 1번·2번 뒤(슬롯당 1.5타일). 맵 전환 시 주인공 뒤에 다시 모인다. 탈것(ride) 중엔 주인공 옆에 붙는다.
 *   말을 걸 수 있는 대상은 아니다(canInteract false). 컷신에서 id 로 move/face 가능(id = 캐릭터 id).
 */
export class Follower extends Character {
  constructor(def, game) {
    super({ solid: false, ...def }, game);
    this.slot = def.slot ?? 1;                       // 뒤에서 몇 번째
    this.gap = TILE * 1.5 * this.slot;               // 주인공과의 거리(발자국 길이) — 1.5타일, 바로 뒤에 붙지 않게 (2026-09-10 사용자 지적)
    this.snapBehind();
  }
  canInteract() { return false; }
  /** 주인공 바로 뒤(바라보는 반대 방향)에 즉시 놓는다 — 맵 전환·컷신 뒤 재정렬 */
  snapBehind() {
    const p = this.game.player; if (!p) return;
    const [dx, dy] = DIRS[p.facing];
    this.x = p.x - dx * this.gap; this.y = p.y - dy * this.gap; this.facing = p.facing; this.moving = false; this.frame = 0;
    [this.x, this.y] = freeSpot(this.game, this, this.x, this.y);   // 벽·소품(버튼 등) 안에 세우지 않는다
  }
  update(dt) {
    const p = this.game.player; if (!p) return;
    if (this.knock) {                                // 주인공이 피격 슬라이드 중이면 같이 미끄러진다(간격 유지, 겹침 방지)
      const k = this.knock; k.t -= dt; this.moveBy(k.vx * Math.max(0, k.t / k.dur) * dt, 0);
      if (k.t <= 0) this.knock = null; this.moving = false; this.animate(dt); return;
    }
    if (this.game.dialogue.running) return;          // 컷신 중엔 컷신(move)이 움직인다 — 발자국 추종과 싸우지 않게
    if (this.game.ride) {
      if (this.game.ride.def?.swim) { this.moving = false; this.frame = 0; return; }   // 헤엄치는 뗏목(swim): 타지 않는다(Raft 가 숨기고 Swimmer 로 바꾼다)
      this.x = p.x - 18 * this.slot; this.y = p.y - 3 * this.slot; this.facing = p.facing; this.moving = false; this.frame = 0; this.animPhase = 0; return;   // 탈것 위에선 동료도 가만히, 주인공 옆(겹치지 않게)
    }
    const trail = p.trail || [];
    // 발자국을 뒤에서부터 gap 만큼 거슬러 올라간 지점이 목표
    let acc = 0, target = null, prev = { x: p.x, y: p.y };
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i]; acc += Math.hypot(prev.x - t.x, prev.y - t.y);
      if (acc >= this.gap) { target = t; break; }
      prev = t;
    }
    const startX = this.x, startY = this.y;
    if (target) {
      const dx = target.x - this.x, dy = target.y - this.y, dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const step = Math.min(dist, p.speed * dt * 1.05);
        this.x += (dx / dist) * step; this.y += (dy / dist) * step;
        this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
    }
    this.moving = Math.hypot(this.x - startX, this.y - startY) > 0.3;
    this.animate(dt, 12);
  }
}

registerEntity('player', Player);
/**
 * 낙석 레인(재사용): 정해진 x 에서 일정한 리듬으로 바위가 **화면 위에서 길 전체를 쓸고 내려와** 길 맨 아래(ground)에 떨어진다.
 *   { type:'rockfall', image:'assets/props/rock.png', x:<레인 중심>, ground:<착지 y(바위 아래쪽)>, period:2.0, offset:0, warn:0.8, fall:0.4, rest:0.45 }
 *   주기: idle → warn(바위 폭의 평행한 세로 스포트라이트만, 원뿔·가운데 선·흰 섬광 없음) → fall(위→아래로 길의 모든 줄을 지나감) → rest(바닥에 놓였다 사라짐) → idle.
 *   피격: 떨어지는 동안·놓인 직후 바위 사각형과 겹치면 game.hurtPlayer(무음) → 왼쪽으로 슬라이드. 어느 줄에 서 있든 바위가 실제로 지나갈 때만 맞는다.
 *   소리 없음(2026-09-10 사용자 규칙). 대사/탈것 중엔 맞지 않는다. 스포트라이트는 어두움(dim) 위에 그려진다(drawOverlay).
 */
export class Rockfall extends Entity {
  constructor(def, game) {
    const img = game.propImages[def.image] || null;
    const w = def.w ?? (img ? img.width : 40), h = img ? img.height : 28;   // 히트 폭 = 바위 그림 폭(기본 40px, 2026-09-10 "x 면적 높여")
    super({ solid: false, ...def, x: def.x - w / 2, y: def.ground - h, w, h }, game);
    this.lx = def.x; this.gy = def.ground; this.top = def.top ?? -48;
    this.period = def.period ?? 2.0; this.offset = def.offset ?? 0; this.warn = def.warn ?? 0.8; this.fall = def.fall ?? 0.4; this.rest = def.rest ?? 0.45;
    this.image = img;
    this.rw = w; this.rh = h;
    this.t = this.offset; this.phase = 'idle'; this.k = 0; this.hitDone = false;
  }
  canInteract() { return false; }
  /** 바위 아래쪽 y (떨어지는 동안은 위에서 가속) */
  rockY() { return this.phase === 'fall' ? this.top + (this.gy - this.top) * Math.pow(this.k, 1.7) : this.gy; }
  /** 지금 바위의 월드 사각형 — 떨어지는 동안 길의 모든 줄을 지나간다 */
  get rockRect() { const y = this.rockY(); return { x: this.lx - this.rw / 2 + 2, y: y - this.rh + 4, w: this.rw - 4, h: this.rh - 4 }; }
  update(dt) {
    this.t = (this.t + dt) % this.period;
    const t = this.t, w = this.warn, f = this.fall, r = this.rest;
    let phase = 'idle', k = 0;
    if (t < w) { phase = 'warn'; k = t / w; }
    else if (t < w + f) { phase = 'fall'; k = (t - w) / f; }
    else if (t < w + f + r) { phase = 'rest'; k = (t - w - f) / r; }
    if (phase === 'warn' && this.phase !== 'warn') this.hitDone = false;
    this.phase = phase; this.k = k;
    const p = this.game.player;
    const active = phase === 'fall' || (phase === 'rest' && k < 0.5);
    if (active && !this.hitDone && p && !this.game.dialogue.running && !this.game.ride && p.overlaps(this.rockRect)) { this.hitDone = true; this.game.hurtPlayer(this, { silent: true }); }
  }
  /** 바위 (y 정렬 대상). idle·warn 땐 안 보임 */
  draw(ctx, cam) {
    if (this.phase === 'idle' || this.phase === 'warn') return;
    const y = this.rockY();
    const x = Math.round(this.lx - this.rw / 2 - cam.x), yy = Math.round(y - this.rh - cam.y);
    if (this.phase === 'fall') { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(Math.round(this.lx - cam.x), Math.round(this.gy + 2 - cam.y), 5 + 9 * this.k, 2 + 3 * this.k, 0, 0, Math.PI * 2); ctx.fill(); }   // 바닥 그림자(어둡게, 커짐)
    if (this.phase === 'rest' && this.k > 0.7) ctx.globalAlpha = 1 - (this.k - 0.7) / 0.3;
    if (this.image) ctx.drawImage(this.image, x, yy); else { ctx.fillStyle = '#5a4a70'; ctx.fillRect(x, yy, this.rw, this.rh); }
    ctx.globalAlpha = 1;
  }
  /** 스포트라이트(어두움 위에): 바위 폭만큼의 **평행한 세로 기둥**(연보라 한 겹, 아래로 갈수록 조금 진해짐) + 바닥 타원. 원뿔·가운데 선·착지 섬광 없음 (2026-09-10 사용자 지적 두 번) */
  drawOverlay(ctx, cam) {
    if (this.phase !== 'warn' && this.phase !== 'fall') return;
    const x = Math.round(this.lx - cam.x), gy = Math.round(this.gy - cam.y), hw = Math.round(this.rw / 2) + 4;
    const a = this.phase === 'warn' ? 0.08 + 0.2 * this.k : 0.28;
    const g = ctx.createLinearGradient(0, 0, 0, gy + 4);
    g.addColorStop(0, `rgba(205,180,245,${a * 0.6})`); g.addColorStop(1, `rgba(205,180,245,${a})`);
    ctx.fillStyle = g; ctx.fillRect(x - hw, 0, hw * 2, gy + 4);
    ctx.fillStyle = `rgba(215,195,250,${a * 1.15})`; ctx.beginPath(); ctx.ellipse(x, gy + 2, hw, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
}

registerEntity('follower', Follower);
registerEntity('rockfall', Rockfall);
registerEntity('raft', Raft);
registerEntity('swimmer', Swimmer);
registerEntity('prop', Prop);
registerEntity('npc', NPC);
registerEntity('sign', Sign);
registerEntity('chest', Chest);
registerEntity('door', Door);
registerEntity('trigger', Trigger);
