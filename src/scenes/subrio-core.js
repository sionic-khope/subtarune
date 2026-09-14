// 섭리오(스크린 속 2D 플랫포머)의 순수 규칙: 레벨·충돌·이동·점프·앉기·창·따라오기. DOM/캔버스 없음 → tests/unit/subrio.test.mjs 가 직접 검사한다.
// 조작(2026-09-15 사용자 브리핑): 좌우 이동, 위 점프, 아래 앉기, C 창 던지기, X 방패 막기. 적은 아직 없다(사용자가 따로 지시).
export const TILE = 16;
export const VIEW_W = 460;
export const VIEW_H = 340;
export const MOVE_SPEED = 118;
export const JUMP_SPEED = 430;
export const GRAVITY = 1500;
export const MAX_FALL = 520;
export const SPEAR_SPEED = 380;
export const SPEAR_LIFE = 1.1;
export const ATTACK_TIME = 0.28;
export const ATTACK_COOLDOWN = 0.42;
export const STAND_H = 24;
export const CROUCH_H = 14;
export const BODY_W = 12;
// 타일 문자: '.' 빈칸, '=' 바닥 윗면, '#' 바닥 속, 'B' 떠 있는 블록, '[' 블록 왼쪽 끝, ']' 블록 오른쪽 끝, '|' 깃발 기둥(통과)
export const SOLID = new Set(['=', '#', 'B', '[', ']']);
export const ATLAS_COLUMN = { '=': 0, '#': 1, B: 2, '[': 3, ']': 4, '|': 5 };

/** 첫 방송 플랫폼 섬을 단순화한 보라 섬: 왼쪽 착지 평지 → 계단 → 구덩이 두 개 → 떠 있는 블록 줄 → 오른쪽 평지. 21행 × 160열 */
export function buildLevel() {
  const cols = 160, rows = 21;
  const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
  const ground = (from, to, top) => {
    for (let c = from; c < to; c++) {
      grid[top][c] = '=';
      for (let r = top + 1; r < rows; r++) grid[r][c] = '#';
    }
  };
  const blocks = (from, to, row) => {
    for (let c = from; c < to; c++) grid[row][c] = c === from ? '[' : c === to - 1 ? ']' : 'B';
  };
  ground(0, 34, 18);
  ground(34, 40, 17);
  ground(40, 46, 16);
  ground(46, 58, 15);
  ground(61, 80, 18);
  blocks(66, 70, 13);
  blocks(73, 78, 11);
  ground(84, 104, 18);
  blocks(90, 93, 14);
  ground(104, 112, 16);
  ground(115, 160, 18);
  blocks(124, 129, 13);
  blocks(134, 138, 10);
  grid[17][150] = '|'; grid[16][150] = '|'; grid[15][150] = '|'; grid[14][150] = '|';
  const tiles = grid.map(row => row.join(''));
  return { cols, rows, tiles, width: cols * TILE, height: rows * TILE, solidAt: (tx, ty) => ty >= rows ? true : (ty < 0 || tx < 0 || tx >= cols) ? false : SOLID.has(grid[ty][tx]) };
}

/** 사각형이 막힌 타일과 겹치는가 */
export function overlapsSolid(level, x, y, w, h) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 0.01) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (level.solidAt(tx, ty)) return true;
  return false;
}

/** 축별로 밀어 넣어 막힌 곳에서 멈춘다. 막히면 타일 경계에 딱 맞춰 선다(소수 위치 누적 방지). 반환: 접촉 */
export function moveBody(level, body, dx, dy) {
  const hit = { x: false, floor: false, ceiling: false };
  if (dx !== 0) {
    const nx = body.x + dx;
    if (overlapsSolid(level, nx, body.y, body.w, body.h)) {
      hit.x = true;
      const y0 = Math.floor(body.y / TILE), y1 = Math.floor((body.y + body.h - 0.01) / TILE);
      if (dx > 0) {
        let col = Math.floor((body.x + body.w - 0.01) / TILE) + 1;
        const last = Math.floor((nx + body.w - 0.01) / TILE);
        for (; col <= last; col++) if (rowsSolid(level, col, y0, y1)) break;
        body.x = col * TILE - body.w;
      } else {
        let col = Math.floor(body.x / TILE) - 1;
        const last = Math.floor(nx / TILE);
        for (; col >= last; col--) if (rowsSolid(level, col, y0, y1)) break;
        body.x = (col + 1) * TILE;
      }
    } else body.x = nx;
  }
  if (dy !== 0) {
    const ny = body.y + dy;
    if (overlapsSolid(level, body.x, ny, body.w, body.h)) {
      const x0 = Math.floor(body.x / TILE), x1 = Math.floor((body.x + body.w - 0.01) / TILE);
      if (dy > 0) {
        hit.floor = true;
        let row = Math.floor((body.y + body.h - 0.01) / TILE) + 1;
        const last = Math.floor((ny + body.h - 0.01) / TILE);
        for (; row <= last; row++) if (colsSolid(level, row, x0, x1)) break;
        body.y = row * TILE - body.h;
      } else {
        hit.ceiling = true;
        let row = Math.floor(body.y / TILE) - 1;
        const last = Math.floor(ny / TILE);
        for (; row >= last; row--) if (colsSolid(level, row, x0, x1)) break;
        body.y = (row + 1) * TILE;
      }
    } else body.y = ny;
  }
  return hit;
}

function rowsSolid(level, col, y0, y1) { for (let ty = y0; ty <= y1; ty++) if (level.solidAt(col, ty)) return true; return false; }
function colsSolid(level, row, x0, x1) { for (let tx = x0; tx <= x1; tx++) if (level.solidAt(tx, row)) return true; return false; }

/** 배우 생성. 발 위치(x 중심, y 바닥) 기준 */
export function makeActor(id, footX, footY, facing = 1) {
  return { id, x: Math.round(footX - BODY_W / 2), y: footY - STAND_H, w: BODY_W, h: STAND_H, vx: 0, vy: 0, facing,
    grounded: false, crouch: false, state: 'idle', stateT: 0, cooldown: 0, animT: 0, jumpCut: false, landed: false };
}

/**
 * 한 배우를 입력 의도로 한 프레임 진행시킨다.
 * intent: { left, right, jump(눌린 순간), jumpHeld, crouch, attack(눌린 순간), guard }
 * 반환: { landed, jumped, attacked } 소리·연출용 사건
 */
export function stepActor(level, actor, intent, dt, events = []) {
  const wasGrounded = actor.grounded;
  actor.cooldown = Math.max(0, actor.cooldown - dt);
  actor.stateT += dt;
  const guarding = intent.guard && actor.grounded;
  const crouching = !guarding && intent.crouch && actor.grounded;
  const targetH = crouching ? CROUCH_H : STAND_H;
  if (targetH !== actor.h) {
    const bottom = actor.y + actor.h;
    if (targetH < actor.h || !overlapsSolid(level, actor.x, bottom - targetH, actor.w, targetH)) { actor.y = bottom - targetH; actor.h = targetH; }
  }
  actor.crouch = actor.h === CROUCH_H;
  const canMove = !guarding && !actor.crouch;
  const dir = canMove ? (intent.right ? 1 : 0) - (intent.left ? 1 : 0) : 0;
  if (dir) actor.facing = dir;
  const target = dir * MOVE_SPEED;
  actor.vx += (target - actor.vx) * Math.min(1, dt * (actor.grounded ? 14 : 7));
  if (Math.abs(actor.vx) < 2 && !dir) actor.vx = 0;
  if (intent.jump && actor.grounded && !guarding) { actor.vy = -JUMP_SPEED; actor.grounded = false; actor.jumpCut = false; events.push({ type: 'jump', id: actor.id }); }
  if (!intent.jumpHeld && actor.vy < -120 && !actor.jumpCut) { actor.vy *= 0.55; actor.jumpCut = true; }
  actor.vy = Math.min(MAX_FALL, actor.vy + GRAVITY * dt);
  const hit = moveBody(level, actor, actor.vx * dt, actor.vy * dt);
  if (hit.x) actor.vx = 0;
  if (hit.floor) { actor.grounded = true; actor.vy = 0; }
  else if (hit.ceiling) actor.vy = 0;
  else actor.grounded = false;
  if (!wasGrounded && actor.grounded) events.push({ type: 'land', id: actor.id });
  if (intent.attack && actor.cooldown === 0 && !guarding && !actor.crouch) {
    actor.cooldown = ATTACK_COOLDOWN; actor.state = 'attack'; actor.stateT = 0;
    events.push({ type: 'attack', id: actor.id, x: actor.x + (actor.facing > 0 ? actor.w : -24), y: actor.y + 8, facing: actor.facing });
  } else if (actor.state === 'attack' && actor.stateT < ATTACK_TIME) {
    actor.state = 'attack';
  } else if (guarding) actor.state = 'guard';
  else if (actor.crouch) actor.state = 'crouch';
  else if (!actor.grounded) actor.state = 'jump';
  else if (dir) { actor.state = 'walk'; actor.animT += dt; }
  else { actor.state = 'idle'; actor.animT = 0; }
  if (actor.y > level.height + 80) { actor.y = -40; actor.x = Math.max(16, actor.x - 48); actor.vy = 0; events.push({ type: 'fall', id: actor.id }); }
  return events;
}

/** 시트 2×4 프레임 번호: 0 idle, 1~3 walk, 4 jump, 5 crouch, 6 attack, 7 guard */
export function frameOf(actor) {
  if (actor.state === 'attack') return 6;
  if (actor.state === 'guard') return 7;
  if (actor.state === 'crouch') return 5;
  if (actor.state === 'jump') return 4;
  if (actor.state === 'walk') return 1 + Math.floor(actor.animT * 9) % 3;
  return 0;
}

/**
 * 동료 따라오기: 주인공의 과거 위치(reaction 초 전)를 목표로 삼아 사람이 조종하듯 늦게 반응하고,
 * 목표보다 낮은 곳에서 막히거나 주인공이 그때 뛰었으면 같이 뛴다. 가까우면 멈춘다.
 * trail: 주인공 기록 [{t, x, y, jumped}] (오래된 것 → 최신)
 */
export function followerIntent(follower, trail, now, { reaction = 0.35, spacing = 34 } = {}) {
  const intent = { left: false, right: false, jump: false, jumpHeld: false, crouch: false, attack: false, guard: false };
  if (!trail.length) return intent;
  const wantT = now - reaction;
  let sample = trail[0];
  for (const entry of trail) { if (entry.t <= wantT) sample = entry; else break; }
  const targetX = sample.x - spacing * Math.sign(sample.facing || 1);
  const dx = targetX - follower.x;
  if (Math.abs(dx) > 6) { intent.right = dx > 0; intent.left = dx < 0; }
  const higher = sample.y < follower.y - 12;
  if (follower.grounded && (sample.jumped || (higher && Math.abs(dx) < 90) || (follower.blockedT > 0.12 && Math.abs(dx) > 6))) intent.jump = true;
  intent.jumpHeld = !follower.grounded && follower.vy < 0 && sample.y < follower.y;
  return intent;
}

/** 창 투사체 진행. 막힌 타일에 박히거나 수명이 끝나면 제거 */
export function updateSpears(level, spears, dt) {
  for (const spear of spears) {
    spear.life -= dt;
    spear.x += spear.vx * dt;
    if (spear.life <= 0 || overlapsSolid(level, spear.x, spear.y, 24, 6)) spear.dead = true;
  }
  return spears.filter(spear => !spear.dead);
}

/** 카메라 x: 주인공이 화면 40% 지점에 오도록, 레벨 밖으로 나가지 않게 */
export function cameraX(level, actor) {
  return Math.max(0, Math.min(level.width - VIEW_W, Math.round(actor.x + actor.w / 2 - VIEW_W * 0.4)));
}
