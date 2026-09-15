// 섭리오(스크린 속 2D 플랫포머)의 순수 규칙: 레벨·충돌·이동·점프·앉기·창·따라오기. DOM/캔버스 없음 → tests/unit/subrio.test.mjs 가 직접 검사한다.
// 조작(2026-09-15 사용자 브리핑): 좌우 이동, 위 점프, 아래 앉기, C 창 던지기, X 방패 막기.
// 구성(2026-09-15 사용자 확정): 스테이지 1~3(보라·청록·파랑 섬) → 마지막에 따듯한비데 보스전. 일반 적은 아직 없다(사용자가 따로 지시).
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
export const HERO_HP = 5;
export const HURT_TIME = 0.35;
export const INVULN_TIME = 1.2;
export const KNOCK_VX = 170;
export const KNOCK_VY = 220;
export const WATER_W = 14;
export const WATER_H = 8;
// 따듯한비데 보스 수치(2026-09-15 기본값 — 사용자 지시로 조정). 창 12방, 도끼 내려찍기(예비 0.55초 → 휘두름 0.3초 → 회복 0.45초), 물줄기 3발
export const BOSS = { w: 28, h: 44, speed: 64, hp: 12, reach: 62, windup: 0.55, swing: 0.3, recover: 0.45, sprayTime: 1.1, shots: [0.15, 0.45, 0.75],
  waterSpeed: 240, waterLife: 1.7, jumpSpeed: 430, roar: 1.4, hitFlash: 0.25, hitCooldown: 0.2, chaseMax: 2.6, deathTime: 2.2 };
// 타일 문자: '.' 빈칸, '=' 바닥 윗면, '#' 바닥 속, 'B' 떠 있는 블록, '[' 블록 왼쪽 끝, ']' 블록 오른쪽 끝, '|' 깃발 기둥(통과), 'F' 깃발 천(통과·목표)
export const SOLID = new Set(['=', '#', 'B', '[', ']']);
export const ATLAS_COLUMN = { '=': 0, '#': 1, B: 2, '[': 3, ']': 4, '|': 5, F: 6 };

/** 스테이지 목록: 순서대로 진행. 색은 하늘 그라데이션(위→아래)·물결 두 겹·물결 바닥 띠·타일 그림이 늦게 올 때의 폴백 */
export const STAGES = [
  { id: 'purple', title: 'STAGE 1', name: '보라 섬', tiles: 'assets/props/subrio_tiles.png', sky: ['#0c0416', '#2a1048', '#120620', '#05020a'],
    wave: ['rgba(98,44,170,0.55)', 'rgba(190,130,255,0.5)', 'rgba(150,90,230,0.22)'], fallback: ['#3e1c6e', '#6030a0', '#804cc4'] },
  { id: 'teal', title: 'STAGE 2', name: '청록 섬', tiles: 'assets/props/subrio_tiles_teal.png', sky: ['#02100f', '#0b3d3a', '#06201e', '#020908'],
    wave: ['rgba(30,140,130,0.55)', 'rgba(120,235,215,0.5)', 'rgba(60,180,170,0.22)'], fallback: ['#145a56', '#248c82', '#3caaa0'] },
  { id: 'blue', title: 'STAGE 3', name: '파랑 섬', tiles: 'assets/props/subrio_tiles_blue.png', sky: ['#030818', '#0e2a6a', '#071638', '#02050f'],
    wave: ['rgba(40,90,210,0.55)', 'rgba(140,180,255,0.5)', 'rgba(80,120,230,0.22)'], fallback: ['#1a2e78', '#3054be', '#466ed7'] },
  { id: 'boss', title: 'FINAL STAGE', name: '따듯한비데', tiles: 'assets/props/subrio_tiles_blue.png', sky: ['#05030f', '#1a1440', '#0a0a2a', '#020208'],
    wave: ['rgba(60,70,200,0.5)', 'rgba(150,160,255,0.45)', 'rgba(90,100,230,0.2)'], fallback: ['#1a2e78', '#3054be', '#466ed7'], boss: true },
];

function makeGrid(cols, rows) {
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
  const wall = (from, to, top) => { for (let c = from; c < to; c++) for (let r = top; r < rows; r++) grid[r][c] = '#'; };
  // 깃발: 기둥 4칸 + 꼭대기 천. 밟고 선 바닥 윗면(groundTop) 기준
  const flag = (col, groundTop) => { for (let r = groundTop - 1; r >= groundTop - 4; r--) grid[r][col] = '|'; grid[groundTop - 5][col] = 'F'; return { col, x: col * TILE + 8, y: (groundTop - 5) * TILE }; };
  return { grid, ground, blocks, wall, flag };
}

/**
 * 스테이지 레벨. 0 보라(첫 방송 섬 단순화) · 1 청록 · 2 파랑 · 3 보스 무대(파랑, 양쪽 벽).
 * 지형 규칙(점프 61px·체공 0.57초·이동 118px/s 기준): 같은 높이 틈은 3칸까지, 4칸 틈은 내려가는 쪽만, 오르막 단차는 3칸까지.
 */
export function buildLevel(stage = 0) {
  const rows = 21;
  const def = STAGES[stage] || STAGES[0];
  let cols, goal = null, spawnX = 64, bossSpawnX = 0;
  let g;
  if (stage === 1) {
    cols = 176; g = makeGrid(cols, rows);
    g.ground(0, 24, 18); g.ground(24, 30, 16); g.ground(33, 44, 18); g.blocks(38, 41, 14);
    g.ground(48, 54, 18); g.ground(54, 60, 17); g.ground(60, 66, 16); g.ground(66, 72, 15);
    g.ground(75, 90, 15); g.blocks(80, 84, 12);
    g.ground(94, 110, 18); g.blocks(98, 101, 15); g.blocks(104, 108, 13);
    g.ground(110, 116, 16); g.ground(119, 130, 16);
    g.blocks(133, 136, 16); g.blocks(140, 143, 16);
    g.ground(147, 176, 18); g.blocks(154, 158, 14);
    goal = g.flag(166, 18);
  } else if (stage === 2) {
    cols = 192; g = makeGrid(cols, rows);
    g.ground(0, 20, 18); g.ground(24, 36, 18); g.blocks(28, 31, 14);
    g.ground(36, 42, 16); g.ground(42, 48, 14); g.ground(51, 60, 14);
    g.ground(64, 76, 17); g.blocks(68, 72, 13); g.ground(79, 86, 17); g.ground(86, 92, 15);
    g.ground(96, 110, 18); g.blocks(100, 103, 15); g.blocks(106, 109, 12);
    g.ground(110, 116, 16); g.ground(119, 128, 16);
    g.blocks(131, 134, 16); g.blocks(137, 140, 15); g.blocks(143, 146, 15);
    g.ground(149, 160, 17); g.blocks(152, 155, 13);
    g.ground(160, 166, 15); g.ground(166, 172, 13);
    g.ground(176, 192, 18);
    goal = g.flag(184, 18);
  } else if (stage === 3) {
    cols = 44; g = makeGrid(cols, rows);
    g.ground(0, 44, 18); g.wall(0, 2, 6); g.wall(42, 44, 6);
    g.blocks(10, 14, 14); g.blocks(30, 34, 14);
    spawnX = 72; bossSpawnX = 560;
  } else {
    cols = 160; g = makeGrid(cols, rows);
    g.ground(0, 34, 18); g.ground(34, 40, 17); g.ground(40, 46, 16); g.ground(46, 58, 15);
    g.ground(61, 81, 18); g.blocks(66, 70, 13); g.blocks(73, 78, 11);
    g.ground(84, 104, 18); g.blocks(90, 93, 14);
    g.ground(104, 112, 16); g.ground(115, 160, 18); g.blocks(124, 129, 13); g.blocks(134, 138, 10);
    goal = g.flag(150, 18);
  }
  const { grid } = g;
  const tiles = grid.map(row => row.join(''));
  return { stage, def, cols, rows, tiles, width: cols * TILE, height: rows * TILE, goal, spawnX, bossSpawnX,
    solidAt: (tx, ty) => ty >= rows ? true : (ty < 0 || tx < 0 || tx >= cols) ? false : SOLID.has(grid[ty][tx]) };
}

/** 주인공 몸 중심이 깃발 기둥을 지나면 스테이지 클리어 */
export function reachedGoal(level, actor) {
  return !!level.goal && actor.x + actor.w / 2 >= level.goal.x;
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
    grounded: false, crouch: false, state: 'idle', stateT: 0, cooldown: 0, animT: 0, jumpCut: false, landed: false,
    hp: HERO_HP, maxHp: HERO_HP, invuln: 0, hurtT: 0, dead: false };
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
  actor.invuln = Math.max(0, (actor.invuln || 0) - dt);
  // 맞은 직후·쓰러진 뒤에는 조작이 먹지 않는다(넉백만 물리로 진행)
  if (actor.hurtT > 0 || actor.dead) { actor.hurtT = Math.max(0, actor.hurtT - dt); intent = NO_INTENT; }
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
  } else if (actor.dead) actor.state = 'dead';
  else if (actor.hurtT > 0) actor.state = 'hurt';
  else if (guarding) actor.state = 'guard';
  else if (actor.crouch) actor.state = 'crouch';
  else if (!actor.grounded) actor.state = 'jump';
  else if (dir) { actor.state = 'walk'; actor.animT += dt; }
  else { actor.state = 'idle'; actor.animT = 0; }
  if (actor.y > level.height + 80) { actor.y = -40; actor.x = Math.max(16, actor.x - 48); actor.vy = 0; events.push({ type: 'fall', id: actor.id }); }
  return events;
}

const NO_INTENT = { left: false, right: false, jump: false, jumpHeld: false, crouch: false, attack: false, guard: false };

/** 시트 2×4 프레임 번호: 0 idle, 1~3 walk, 4 jump, 5 crouch, 6 attack, 7 guard. 맞으면 점프 프레임, 쓰러지면 앉기 프레임 */
export function frameOf(actor) {
  if (actor.state === 'attack') return 6;
  if (actor.state === 'guard') return 7;
  if (actor.state === 'crouch' || actor.state === 'dead') return 5;
  if (actor.state === 'jump' || actor.state === 'hurt') return 4;
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

/** 투사체 진행(창 24×6, 물줄기 14×8). 막힌 타일에 박히거나 수명이 끝나면 제거 */
export function updateProjectiles(level, list, dt, w, h) {
  for (const p of list) {
    p.life -= dt;
    p.x += p.vx * dt;
    if (p.life <= 0 || overlapsSolid(level, p.x, p.y, w, h)) p.dead = true;
  }
  return list.filter(p => !p.dead);
}
export function updateSpears(level, spears, dt) { return updateProjectiles(level, spears, dt, 24, 6); }

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * 주인공 피격. fromX: 피해가 온 쪽의 x(가드 방향 판정). 방패(guard)로 그쪽을 보고 있으면 막고 살짝 밀린다.
 * 무적 시간 안이면 무시. 반환: 실제로 맞았는가
 */
export function hurtActor(actor, fromX, events = []) {
  if (actor.dead || actor.invuln > 0) return false;
  const cx = actor.x + actor.w / 2;
  const dir = Math.sign(fromX - cx) || actor.facing;
  if (actor.state === 'guard' && dir === actor.facing) {
    actor.vx = -dir * 90;
    events.push({ type: 'block', id: actor.id });
    return false;
  }
  actor.hp -= 1;
  actor.invuln = INVULN_TIME; actor.hurtT = HURT_TIME;
  actor.vx = -dir * KNOCK_VX; actor.vy = -KNOCK_VY; actor.grounded = false;
  actor.h = STAND_H; actor.crouch = false;
  actor.state = 'hurt'; actor.stateT = 0;
  events.push({ type: 'hurt', id: actor.id, hp: actor.hp });
  if (actor.hp <= 0) { actor.dead = true; actor.state = 'dead'; events.push({ type: 'dead', id: actor.id }); }
  return true;
}

/** 보스 생성(발 기준). 하늘에서 떨어져 착지하면 포효 → 추격 */
export function makeBoss(footX, footY) {
  return { id: 'bidet', x: Math.round(footX - BOSS.w / 2), y: footY - BOSS.h, w: BOSS.w, h: BOSS.h, vx: 0, vy: 0, facing: -1, grounded: false,
    hp: BOSS.hp, maxHp: BOSS.hp, state: 'enter', stateT: 0, seq: 0, flash: 0, hitCooldown: 0, animT: 0, shot: 0, dead: false, deadT: 0 };
}

/** 휘두르는 동안 도끼 판정 사각형(앞쪽 44px). 그 외엔 null */
export function bossHitbox(boss) {
  if (boss.state !== 'swing') return null;
  return { x: boss.facing > 0 ? boss.x + boss.w - 4 : boss.x - 40, y: boss.y + 10, w: 44, h: boss.h - 10 };
}

/**
 * 보스 한 프레임. target: 주인공. 상태: enter(낙하) → roar → chase(다가감·같은 높이 사거리 안이면 windup, 위에 있으면 점프, 오래 못 잡으면 spray)
 * → windup → swing → recover → (세 번에 한 번 spray) … dead 는 서 있기만. events: bossLand/bossJump/swing/water/…
 */
export function stepBoss(level, boss, target, dt, events = []) {
  boss.stateT += dt; boss.animT += dt;
  boss.flash = Math.max(0, boss.flash - dt); boss.hitCooldown = Math.max(0, boss.hitCooldown - dt);
  const cx = boss.x + boss.w / 2, tx = target.x + target.w / 2;
  const dx = tx - cx, dist = Math.abs(dx);
  const sameLevel = target.y + target.h > boss.y + 8 && target.y < boss.y + boss.h;
  let move = 0;
  const go = (state) => { boss.state = state; boss.stateT = 0; };
  if (boss.dead) { boss.deadT += dt; }
  else if (boss.state === 'enter') { if (boss.grounded) { go('roar'); events.push({ type: 'bossLand' }); } }
  else if (boss.state === 'roar') { if (boss.stateT >= BOSS.roar) go('chase'); }
  else if (boss.state === 'chase') {
    boss.facing = Math.sign(dx) || boss.facing;
    move = boss.facing;
    if (dist <= BOSS.reach && sameLevel) go('windup');
    else if (boss.grounded && target.y + target.h < boss.y + boss.h - 40 && dist < 140 && boss.stateT > 0.4) { boss.vy = -BOSS.jumpSpeed; boss.grounded = false; events.push({ type: 'bossJump' }); }
    else if (boss.stateT > BOSS.chaseMax) go('spray');
  }
  else if (boss.state === 'windup') { if (boss.stateT >= BOSS.windup) { go('swing'); events.push({ type: 'swing', facing: boss.facing }); } }
  else if (boss.state === 'swing') { if (boss.stateT >= BOSS.swing) go('recover'); }
  else if (boss.state === 'recover') { if (boss.stateT >= BOSS.recover) { boss.seq += 1; go(boss.seq % 3 === 2 ? 'spray' : 'chase'); if (boss.state === 'spray') boss.shot = 0; } }
  else if (boss.state === 'spray') {
    if (boss.stateT < 0.05) boss.facing = Math.sign(dx) || boss.facing;
    while (boss.shot < BOSS.shots.length && boss.stateT >= BOSS.shots[boss.shot]) {
      boss.shot += 1;
      events.push({ type: 'water', x: boss.facing > 0 ? boss.x + boss.w + 2 : boss.x - WATER_W - 2, y: boss.y + 14, vx: boss.facing * BOSS.waterSpeed, facing: boss.facing });
    }
    if (boss.stateT >= BOSS.sprayTime) { boss.seq += 1; boss.shot = 0; go('chase'); }
  }
  const targetVx = move * BOSS.speed;
  boss.vx += (targetVx - boss.vx) * Math.min(1, dt * (boss.grounded ? 12 : 5));
  if (!move && Math.abs(boss.vx) < 2) boss.vx = 0;
  boss.vy = Math.min(MAX_FALL, boss.vy + GRAVITY * dt);
  const hit = moveBody(level, boss, boss.vx * dt, boss.vy * dt);
  if (hit.x) boss.vx = 0;
  if (hit.floor) { boss.grounded = true; boss.vy = 0; }
  else if (hit.ceiling) boss.vy = 0;
  else boss.grounded = false;
  return events;
}

/** 창이 보스에 맞았을 때. 짧은 무적으로 한 창에 두 번 안 맞는다. 반환: 맞았는가 */
export function hitBoss(boss, events = []) {
  if (boss.dead || boss.hitCooldown > 0) return false;
  boss.hp -= 1; boss.flash = BOSS.hitFlash; boss.hitCooldown = BOSS.hitCooldown;
  events.push({ type: 'bossHit', hp: boss.hp });
  if (boss.hp <= 0) { boss.dead = true; boss.state = 'dead'; boss.stateT = 0; boss.deadT = 0; boss.vx = 0; events.push({ type: 'bossDead' }); }
  return true;
}

/** 보스 시트 2×4: 0 idle, 1~2 walk, 3 jump, 4 windup, 5 swing, 6 spray, 7 hurt */
export function bossFrame(boss) {
  if (boss.dead) return 7;
  if (boss.flash > 0 && boss.state !== 'swing' && boss.state !== 'windup') return 7;
  if (boss.state === 'enter' || (!boss.grounded && boss.state === 'chase')) return 3;
  if (boss.state === 'windup') return 4;
  if (boss.state === 'swing') return 5;
  if (boss.state === 'spray') return 6;
  if (boss.state === 'chase') return 1 + Math.floor(boss.animT * 6) % 2;
  return 0;
}

/** 카메라 x: 주인공이 화면 40% 지점에 오도록, 레벨 밖으로 나가지 않게 */
export function cameraX(level, actor) {
  return Math.max(0, Math.min(level.width - VIEW_W, Math.round(actor.x + actor.w / 2 - VIEW_W * 0.4)));
}
