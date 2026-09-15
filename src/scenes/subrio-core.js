// 섭리오(스크린 속 2D 플랫포머)의 순수 규칙: 레벨·충돌·이동·점프·앉기·창(탭/차징)·불·시계·적·보스·따라오기. DOM/캔버스 없음 → tests/unit/subrio.test.mjs 가 직접 검사한다.
// 조작(2026-09-15 사용자 브리핑): 좌우 이동, 위 점프, 아래 앉기, C 창(탭 = 짧은 창, 꾹 누르면 차징 → 놓으면 강한 창), X 방패.
// 구성(2026-09-15 사용자 확정): 월드 1 — 1-1 보라·1-2 청록·1-3 파랑 섬(각 3분 분량, CS 미니언이 걸어 다님) → 1-4 따듯한비데 보스전.
// 체력·게임오버 없음(사용자 지시): 맞으면 튕겨나기만 한다. 이 게임 전용 공격력 = 1(창·불·시계 모두 1). 적 CS 는 2, 보스는 12.
export const TILE = 16;
export const VIEW_W = 460;
export const VIEW_H = 340;
export const MOVE_SPEED = 136;
export const JUMP_SPEED = 500;
export const GRAVITY = 1500;
export const MAX_FALL = 560;
export const ATTACK_TIME = 0.28;
export const STAND_H = 32;
export const CROUCH_H = 20;
export const BODY_W = 16;
export const HURT_TIME = 0.35;
export const INVULN_TIME = 1.0;
export const KNOCK_VX = 190;
export const KNOCK_VY = 240;
export const ATTACK_POWER = 1;
// 판테온 창: 탭이면 짧은 창, chargeMin 이상 누르면 차징(이동 절반) → 놓으면 빠르고 오래 가는 강창
export const SPEAR = { speed: 380, life: 1.1, chargedSpeed: 600, chargedLife: 2.4, chargeMin: 0.28, chargeMax: 1.0, cooldown: 0.42, w: 24, h: 6 };
export const SPEAR_SPEED = SPEAR.speed;
export const SPEAR_LIFE = SPEAR.life;
// 브랜드 불: 적이 앞뒤 range 안·비슷한 높이면 자동, 6초에 한 번. 게이지는 머리 위에서 천천히 찬다(씬)
export const FIRE = { range: 230, dy: 64, cooldown: 6, speed: 260, life: 1.3, w: 12, h: 12 };
// 질리언 시계: 적이 보이면 두 개를 pair 간격으로 포물선으로, 1.2초마다. 같은 적에 둘 다 맞으면(stunWindow 안) 2초 스턴
export const CLOCK = { range: 220, dy: 96, cooldown: 1.2, pair: 0.2, gravity: 720, w: 12, h: 12, stunWindow: 1.6, stun: 2.0, flightMin: 0.45, flightMax: 0.85, burst: 22 };
// CS 미니언: 좌우로 걷다 벽·낭떠러지에서 돈다. 밟기·창·불·시계 모두 1씩, 3번 맞으면 쓰러진다(시계 둘 = 스턴이 죽음보다 먼저 오게). 몸에 닿으면 주인공이 튕긴다
export const ENEMY = { w: 16, h: 24, speed: 40, hp: 3, stompBounce: 300, deathTime: 1.1, hitFlash: 0.2 };
export const WATER_W = 14;
export const WATER_H = 8;
// 따듯한비데 보스 수치(2026-09-15 기본값 — 사용자 지시로 조정). 창 12방, 도끼 내려찍기(예비 0.55초 → 휘두름 0.3초 → 회복 0.45초), 물줄기 3발
export const BOSS = { w: 40, h: 60, speed: 64, hp: 12, reach: 76, windup: 0.55, swing: 0.3, recover: 0.45, sprayTime: 1.1, shots: [0.15, 0.45, 0.75],
  waterSpeed: 240, waterLife: 1.7, jumpSpeed: 500, roar: 1.4, hitFlash: 0.25, hitCooldown: 0.2, chaseMax: 3.2, deathTime: 2.2 };
// 타일 문자: '.' 빈칸, '=' 바닥 윗면, '#' 바닥 속, 'B' 떠 있는 블록, '[' 블록 왼쪽 끝, ']' 블록 오른쪽 끝, '|' 깃발 기둥(통과), 'F' 깃발 천(통과·목표)
export const SOLID = new Set(['=', '#', 'B', '[', ']']);
export const ATLAS_COLUMN = { '=': 0, '#': 1, B: 2, '[': 3, ']': 4, '|': 5, F: 6 };

/** 스테이지 목록: 순서대로 진행. 색은 하늘 그라데이션(위→아래)·물결 두 겹·물결 바닥 띠·타일 그림이 늦게 올 때의 폴백 */
export const STAGES = [
  { id: 'purple', title: '1-1', name: '보라 섬', tiles: 'assets/props/subrio_tiles.png', sky: ['#0c0416', '#2a1048', '#120620', '#05020a'],
    wave: ['rgba(98,44,170,0.55)', 'rgba(190,130,255,0.5)', 'rgba(150,90,230,0.22)'], fallback: ['#3e1c6e', '#6030a0', '#804cc4'] },
  { id: 'teal', title: '1-2', name: '청록 섬', tiles: 'assets/props/subrio_tiles_teal.png', sky: ['#02100f', '#0b3d3a', '#06201e', '#020908'],
    wave: ['rgba(30,140,130,0.55)', 'rgba(120,235,215,0.5)', 'rgba(60,180,170,0.22)'], fallback: ['#145a56', '#248c82', '#3caaa0'] },
  { id: 'blue', title: '1-3', name: '파랑 섬', tiles: 'assets/props/subrio_tiles_blue.png', sky: ['#030818', '#0e2a6a', '#071638', '#02050f'],
    wave: ['rgba(40,90,210,0.55)', 'rgba(140,180,255,0.5)', 'rgba(80,120,230,0.22)'], fallback: ['#1a2e78', '#3054be', '#466ed7'] },
  { id: 'boss', title: '1-4', name: '따듯한비데', tiles: 'assets/props/subrio_tiles_blue.png', sky: ['#05030f', '#1a1440', '#0a0a2a', '#020208'],
    wave: ['rgba(60,70,200,0.5)', 'rgba(150,160,255,0.45)', 'rgba(90,100,230,0.2)'], fallback: ['#1a2e78', '#3054be', '#466ed7'], boss: true },
];

/**
 * 레벨 빌더: 커서를 오른쪽으로 옮기며 땅·틈·블록·적·깃발을 놓는다.
 * 지형 규칙(점프 83px·체공 0.67초·이동 136px/s): 같은 높이 틈 4칸까지, 내려가는 틈 5칸까지, 오르막 단차 4칸까지.
 */
function makeBuilder(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
  const enemies = [];
  let cursor = 0, lastTop = 18, lastStart = 0;
  const b = {
    grid, enemies,
    get cursor() { return cursor; },
    /** 땅 len 칸(윗면 top). walkers: 땅 시작 기준 열에 CS 를 놓는다 */
    ground(len, top, walkers = []) {
      for (let c = cursor; c < cursor + len && c < cols; c++) { grid[top][c] = '='; for (let r = top + 1; r < rows; r++) grid[r][c] = '#'; }
      for (const [type, at] of walkers) enemies.push({ type, x: (cursor + at) * TILE + 8, y: top * TILE });
      lastStart = cursor; lastTop = top; cursor += len; return b;
    },
    gap(len) { cursor += len; return b; },
    /** 마지막 땅 시작 기준 offset 열부터 len 칸의 떠 있는 블록. walkers 는 블록 위 */
    blocks(offset, len, row, walkers = []) {
      const from = lastStart + offset, to = from + len;
      for (let c = from; c < to && c < cols; c++) grid[row][c] = c === from ? '[' : c === to - 1 ? ']' : 'B';
      for (const [type, at] of walkers) enemies.push({ type, x: (from + at) * TILE + 8, y: row * TILE });
      return b;
    },
    wall(from, to, top) { for (let c = from; c < to; c++) for (let r = top; r < rows; r++) grid[r][c] = '#'; return b; },
    /** 마지막 땅 위 offset 열에 깃발(기둥 4 + 천) */
    flag(offset) {
      const col = lastStart + offset, top = lastTop;
      for (let r = top - 1; r >= top - 4; r--) grid[r][col] = '|';
      grid[top - 5][col] = 'F';
      return { col, x: col * TILE + 8, y: (top - 5) * TILE };
    },
  };
  return b;
}

const R = 'cs_red', U = 'cs_blue';

function stagePurple(b) {
  // 1-1: 평지 위주, 미니언은 한 마리씩. 틈은 2~3칸, 단차 1~2
  b.ground(30, 18, [[R, 16], [R, 24]]);
  b.ground(6, 17).ground(6, 16).ground(14, 15, [[U, 6]]);
  b.gap(3).ground(26, 18, [[R, 8], [R, 18]]).blocks(6, 4, 14).blocks(14, 5, 12, [[U, 2]]);
  b.gap(3).ground(22, 18, [[R, 10]]).blocks(6, 3, 14);
  b.ground(8, 16).gap(3).ground(30, 18, [[R, 6], [U, 14], [R, 22]]).blocks(10, 5, 13).blocks(20, 4, 11);
  b.gap(2).ground(18, 18, [[R, 9]]).blocks(4, 3, 15).blocks(11, 3, 13);
  b.ground(6, 17).ground(6, 16).ground(6, 15).gap(3).ground(20, 15, [[U, 5], [R, 14]]);
  b.gap(4).ground(28, 18, [[R, 8], [R, 20]]).blocks(6, 4, 14, [[U, 1]]).blocks(16, 4, 12);
  b.gap(3).ground(24, 18, [[R, 6], [U, 12], [R, 18]]).blocks(8, 6, 14);
  b.ground(6, 17).ground(6, 16).gap(3).ground(26, 16, [[R, 8], [R, 18]]).blocks(10, 4, 12);
  b.gap(3).ground(30, 18, [[R, 6], [U, 12], [R, 20], [U, 26]]).blocks(8, 5, 14).blocks(18, 5, 12, [[R, 2]]);
  b.gap(4).ground(34, 18, [[R, 8], [R, 16]]);
  return b.flag(26);
}

function stageTeal(b) {
  // 1-2: 틈 3~4칸, 오르내리는 계단, 블록 징검다리, 블록 위 미니언
  b.ground(22, 18, [[R, 12], [U, 18]]);
  b.ground(6, 16).gap(3).ground(14, 18, [[R, 6]]).blocks(5, 3, 14);
  b.gap(4).ground(6, 18).ground(6, 17).ground(6, 16).ground(6, 15).gap(3).ground(18, 15, [[U, 4], [R, 12]]).blocks(5, 4, 12, [[R, 1]]);
  b.gap(4).ground(20, 18, [[R, 5], [U, 13]]).blocks(4, 3, 15).blocks(10, 4, 13);
  b.ground(6, 16).gap(3).ground(14, 16, [[R, 7]]);
  // 블록 징검다리: 땅 끝(offset 14)에서 틈 3 → 블록 3칸(같은 높이) → 틈 3 → 블록 3칸(한 칸 위) → 틈 3 → 블록 3칸 → 틈 3 → 땅(내려감)
  b.blocks(17, 3, 16).blocks(23, 3, 15).blocks(29, 3, 15);
  b.gap(21).ground(24, 18, [[U, 6], [R, 14], [R, 20]]).blocks(8, 5, 14, [[U, 2]]);
  b.gap(3).ground(8, 17).ground(6, 15).ground(6, 13).gap(4).ground(20, 18, [[R, 4], [U, 10], [R, 16]]).blocks(6, 4, 14).blocks(13, 4, 12);
  b.gap(4).ground(28, 18, [[R, 6], [R, 12], [U, 20]]).blocks(4, 3, 15).blocks(11, 3, 13).blocks(18, 3, 11, [[R, 1]]);
  b.gap(3).ground(6, 16).gap(3).ground(6, 16).gap(3).ground(22, 18, [[U, 8], [R, 16]]).blocks(10, 4, 14);
  b.ground(6, 17).ground(6, 16).ground(6, 15).ground(6, 14).gap(4).ground(24, 18, [[R, 6], [U, 12], [R, 18]]).blocks(8, 6, 14, [[U, 2]]);
  b.gap(4).ground(30, 18, [[R, 8], [R, 14], [U, 22]]).blocks(6, 5, 14).blocks(16, 5, 12).blocks(24, 3, 15);
  b.gap(3).ground(34, 18, [[R, 8], [U, 16]]);
  return b.flag(26);
}

function stageBlue(b) {
  // 1-3: 틈 4칸, 내려가는 틈 5칸, 높은 블록 탑, 미니언 촘촘
  b.ground(20, 18, [[R, 8], [U, 14]]);
  b.gap(4).ground(14, 18, [[R, 6]]).blocks(4, 3, 14).blocks(9, 3, 12);
  b.ground(6, 16).ground(6, 14).gap(3).ground(12, 14, [[U, 5]]);
  b.gap(5).ground(18, 17, [[R, 4], [R, 10]]).blocks(4, 4, 13).blocks(11, 4, 11, [[U, 1]]);
  b.gap(3).ground(8, 17).ground(6, 15).gap(4).ground(20, 18, [[R, 5], [U, 11], [R, 16]]).blocks(4, 3, 15).blocks(10, 3, 12).blocks(15, 3, 9);
  b.ground(6, 16).gap(4).ground(12, 16, [[U, 6]]);
  b.gap(4).blocks(12 + 4, 3, 16).blocks(12 + 10, 3, 15).blocks(12 + 16, 3, 15).blocks(12 + 22, 3, 14);
  b.gap(21).ground(22, 18, [[R, 4], [R, 10], [U, 16]]).blocks(6, 5, 14, [[R, 2]]).blocks(14, 4, 11);
  b.gap(4).ground(6, 17).ground(6, 15).ground(6, 13).gap(5).ground(24, 18, [[U, 4], [R, 10], [R, 16], [U, 20]]).blocks(6, 4, 14).blocks(14, 4, 12).blocks(19, 3, 9);
  b.gap(4).ground(26, 18, [[R, 5], [U, 11], [R, 17], [R, 22]]).blocks(4, 3, 15).blocks(10, 3, 13).blocks(16, 3, 11, [[U, 1]]).blocks(21, 3, 9);
  b.gap(4).ground(6, 16).gap(4).ground(6, 16).gap(4).ground(6, 16).gap(3).ground(22, 18, [[R, 6], [U, 12], [R, 18]]).blocks(8, 5, 14, [[R, 2]]);
  b.ground(6, 17).ground(6, 16).ground(6, 15).ground(6, 14).ground(6, 13).gap(5).ground(26, 18, [[R, 4], [U, 10], [R, 16], [U, 22]]).blocks(8, 6, 14, [[U, 2]]).blocks(18, 4, 11);
  b.gap(4).ground(30, 18, [[R, 6], [R, 12], [U, 18], [R, 24]]).blocks(5, 4, 14).blocks(13, 4, 12).blocks(21, 4, 10, [[R, 1]]);
  b.gap(4).ground(34, 18, [[R, 8], [U, 14], [R, 20]]);
  return b.flag(26);
}

/**
 * 스테이지 레벨. 0 보라 · 1 청록 · 2 파랑(각 ~400열, 미니언 포함) · 3 보스 무대(파랑, 양쪽 벽).
 * enemies: [{type, x(발 중심), y(발)}]
 */
export function buildLevel(stage = 0) {
  const rows = 21;
  const def = STAGES[stage] || STAGES[0];
  let cols, goal = null, spawnX = 64, bossSpawnX = 0, b;
  if (stage === 1) { cols = 440; b = makeBuilder(cols, rows); goal = stageTeal(b); }
  else if (stage === 2) { cols = 470; b = makeBuilder(cols, rows); goal = stageBlue(b); }
  else if (stage === 3) {
    cols = 44; b = makeBuilder(cols, rows);
    // 블록은 13행: 보스(키 60)가 아래로 지나갈 수 있고(틈 64px) 주인공(점프 83px)은 올라갈 수 있다
    b.ground(44, 18).wall(0, 2, 6).wall(42, 44, 6);
    b.blocks(10, 4, 13).blocks(30, 4, 13);
    spawnX = 72; bossSpawnX = 560;
  } else { cols = 420; b = makeBuilder(cols, rows); goal = stagePurple(b); }
  const { grid, enemies } = b;
  const tiles = grid.map(row => row.join(''));
  // 레벨 아래는 뚫려 있다(구덩이에 빠지면 낙사 → 마지막 자리 위 하늘에서 재낙하). 양옆 밖은 빈칸
  return { stage, def, cols, rows, tiles, width: cols * TILE, height: rows * TILE, goal, spawnX, bossSpawnX, enemies,
    solidAt: (tx, ty) => (ty < 0 || ty >= rows || tx < 0 || tx >= cols) ? false : SOLID.has(grid[ty][tx]) };
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

/** 축별로 밀어 넣어 막힌 곳에서 멈춘다. 지나가는 타일을 전부 훑으므로(sweep) 한 프레임에 여러 칸을 움직여도 뚫고 지나가지 않는다. 막히면 타일 경계에 딱 맞춰 선다. 반환: 접촉 */
export function moveBody(level, body, dx, dy) {
  const hit = { x: false, floor: false, ceiling: false };
  if (dx !== 0) {
    const nx = body.x + dx;
    const y0 = Math.floor(body.y / TILE), y1 = Math.floor((body.y + body.h - 0.01) / TILE);
    if (dx > 0) {
      const last = Math.floor((nx + body.w - 0.01) / TILE);
      for (let col = Math.floor((body.x + body.w - 0.01) / TILE) + 1; col <= last; col++) if (rowsSolid(level, col, y0, y1)) { hit.x = true; body.x = col * TILE - body.w; break; }
    } else {
      const last = Math.floor(nx / TILE);
      for (let col = Math.floor(body.x / TILE) - 1; col >= last; col--) if (rowsSolid(level, col, y0, y1)) { hit.x = true; body.x = (col + 1) * TILE; break; }
    }
    if (!hit.x) body.x = nx;
  }
  if (dy !== 0) {
    const ny = body.y + dy;
    const x0 = Math.floor(body.x / TILE), x1 = Math.floor((body.x + body.w - 0.01) / TILE);
    if (dy > 0) {
      const last = Math.floor((ny + body.h - 0.01) / TILE);
      for (let row = Math.floor((body.y + body.h - 0.01) / TILE) + 1; row <= last; row++) if (colsSolid(level, row, x0, x1)) { hit.floor = true; body.y = row * TILE - body.h; break; }
      if (!hit.floor) body.y = ny;
    } else {
      const last = Math.floor(ny / TILE);
      for (let row = Math.floor(body.y / TILE) - 1; row >= last; row--) if (colsSolid(level, row, x0, x1)) { hit.ceiling = true; body.y = (row + 1) * TILE; break; }
      if (!hit.ceiling) body.y = ny;
    }
  }
  return hit;
}

function rowsSolid(level, col, y0, y1) { for (let ty = y0; ty <= y1; ty++) if (level.solidAt(col, ty)) return true; return false; }
function colsSolid(level, row, x0, x1) { for (let tx = x0; tx <= x1; tx++) if (level.solidAt(tx, row)) return true; return false; }

/** 몸 앞(dir 쪽) 바로 아래 3칸 안에 바닥이 없으면 낭떠러지 */
export function pitAhead(level, body, dir, lookahead = 6) {
  const footRow = Math.floor((body.y + body.h) / TILE);
  const aheadX = dir > 0 ? body.x + body.w + lookahead : body.x - lookahead;
  const col = Math.floor(aheadX / TILE);
  for (let r = footRow; r <= footRow + 3; r++) if (level.solidAt(col, r)) return false;
  return true;
}

export const NO_INTENT = { left: false, right: false, jump: false, jumpHeld: false, crouch: false, attack: false, attackHeld: false, guard: false };

/** 배우 생성. 발 위치(x 중심, y 바닥) 기준. 체력 없음(사용자 지시) */
export function makeActor(id, footX, footY, facing = 1) {
  return { id, x: Math.round(footX - BODY_W / 2), y: footY - STAND_H, w: BODY_W, h: STAND_H, vx: 0, vy: 0, facing,
    grounded: false, crouch: false, state: 'idle', stateT: 0, cooldown: 0, animT: 0, jumpCut: false, landed: false,
    invuln: 0, hurtT: 0, charge: 0, fireCool: 0, clockCool: 0, secondClock: 0, safeX: footX };
}

/**
 * 한 배우를 입력 의도로 한 프레임 진행시킨다.
 * intent: { left, right, jump(눌린 순간), jumpHeld, crouch, attack(눌린 순간), attackHeld, guard }
 * 반환 events: jump / land / attack{charged} / chargeStart / fall
 */
export function stepActor(level, actor, intent, dt, events = []) {
  const wasGrounded = actor.grounded;
  actor.cooldown = Math.max(0, actor.cooldown - dt);
  actor.stateT += dt;
  actor.invuln = Math.max(0, (actor.invuln || 0) - dt);
  // 맞은 직후에는 조작이 먹지 않는다(넉백만 물리로 진행)
  if (actor.hurtT > 0) { actor.hurtT = Math.max(0, actor.hurtT - dt); intent = NO_INTENT; actor.charge = 0; }
  const guarding = intent.guard && actor.grounded;
  const crouching = !guarding && intent.crouch && actor.grounded;
  const targetH = crouching ? CROUCH_H : STAND_H;
  if (targetH !== actor.h) {
    const bottom = actor.y + actor.h;
    if (targetH < actor.h || !overlapsSolid(level, actor.x, bottom - targetH, actor.w, targetH)) { actor.y = bottom - targetH; actor.h = targetH; }
  }
  actor.crouch = actor.h === CROUCH_H;
  // 창 차징: 누르는 동안 charge 가 쌓이고(chargeMin 넘으면 자세), 놓으면 던진다
  let attackNow = null;
  if (!guarding && !actor.crouch) {
    if (intent.attack && actor.cooldown === 0 && actor.charge === 0) actor.charge = 0.0001;
    if (actor.charge > 0 && intent.attackHeld) {
      const before = actor.charge;
      actor.charge = Math.min(SPEAR.chargeMax, actor.charge + dt);
      if (before < SPEAR.chargeMin && actor.charge >= SPEAR.chargeMin) events.push({ type: 'chargeStart', id: actor.id });
    } else if (actor.charge > 0) { attackNow = actor.charge >= SPEAR.chargeMin ? 'charged' : 'tap'; actor.charge = 0; }
  } else actor.charge = 0;
  const charging = actor.charge >= SPEAR.chargeMin;
  const canMove = !guarding && !actor.crouch;
  const dir = canMove ? (intent.right ? 1 : 0) - (intent.left ? 1 : 0) : 0;
  if (dir && !charging) actor.facing = dir;
  const target = dir * MOVE_SPEED * (charging ? 0.5 : 1);
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
  if (actor.grounded && actor.hurtT <= 0) actor.safeX = actor.x + actor.w / 2;
  if (attackNow) {
    actor.cooldown = SPEAR.cooldown; actor.state = 'attack'; actor.stateT = 0;
    events.push({ type: 'attack', id: actor.id, charged: attackNow === 'charged', x: actor.x + (actor.facing > 0 ? actor.w : -SPEAR.w), y: actor.y + 10, facing: actor.facing });
  } else if (actor.state === 'attack' && actor.stateT < ATTACK_TIME) {
    actor.state = 'attack';
  } else if (actor.hurtT > 0) actor.state = 'hurt';
  else if (charging) actor.state = 'charge';
  else if (guarding) actor.state = 'guard';
  else if (actor.crouch) actor.state = 'crouch';
  else if (!actor.grounded) actor.state = 'jump';
  else if (dir) { actor.state = 'walk'; actor.animT += dt; }
  else { actor.state = 'idle'; actor.animT = 0; }
  // 낙사: 마지막으로 서 있던 자리 위 하늘에서 다시 떨어진다
  if (actor.y > level.height + 80) { actor.y = -60; actor.x = Math.round(Math.max(16, actor.safeX - 40) - actor.w / 2); actor.vy = 0; actor.vx = 0; actor.charge = 0; events.push({ type: 'fall', id: actor.id }); }
  return events;
}

/** 시트 2×4 프레임 번호: 0 idle, 1~3 walk, 4 jump, 5 crouch, 6 attack(차징도), 7 guard. 맞으면 점프 프레임 */
export function frameOf(actor) {
  if (actor.state === 'attack' || actor.state === 'charge') return 6;
  if (actor.state === 'guard') return 7;
  if (actor.state === 'crouch') return 5;
  if (actor.state === 'jump' || actor.state === 'hurt') return 4;
  if (actor.state === 'walk') return 1 + Math.floor(actor.animT * 9) % 3;
  return 0;
}

/**
 * 동료 따라오기: 주인공의 과거 위치(reaction 초 전)를 목표로 삼아 사람이 조종하듯 늦게 반응하고,
 * 목표보다 낮은 곳에서 막히거나 주인공이 그때 뛰었으면 같이 뛴다. level 을 주면 가는 방향 앞이 낭떠러지일 때 스스로 뛴다(빠지지 않게).
 * trail: 주인공 기록 [{t, x, y, jumped}] (오래된 것 → 최신)
 */
export function followerIntent(follower, trail, now, { reaction = 0.35, spacing = 34, level = null } = {}) {
  const intent = { ...NO_INTENT };
  if (!trail.length) return intent;
  const wantT = now - reaction;
  let sample = trail[0];
  for (const entry of trail) { if (entry.t <= wantT) sample = entry; else break; }
  const targetX = sample.x - spacing * Math.sign(sample.facing || 1);
  const dx = targetX - follower.x;
  if (Math.abs(dx) > 6) { intent.right = dx > 0; intent.left = dx < 0; }
  const higher = sample.y < follower.y - 12;
  const dir = intent.right ? 1 : intent.left ? -1 : 0;
  const cliff = !!level && dir !== 0 && follower.grounded && pitAhead(level, follower, dir);
  if (follower.grounded && (sample.jumped || cliff || (higher && Math.abs(dx) < 90) || (follower.blockedT > 0.12 && Math.abs(dx) > 6))) intent.jump = true;
  intent.jumpHeld = intent.jump || (!follower.grounded && follower.vy < 0);
  return intent;
}

/** 투사체 진행(창 24×6, 물줄기 14×8, 불 12×12). gravity 를 주면 포물선(시계). 막힌 타일에 박히거나 수명이 끝나면 제거 */
export function updateProjectiles(level, list, dt, w, h, gravity = 0) {
  for (const p of list) {
    p.life -= dt;
    if (gravity) { p.vy = (p.vy || 0) + gravity * dt; p.y += p.vy * dt; }
    p.x += p.vx * dt;
    if (overlapsSolid(level, p.x, p.y, w, h)) { p.dead = true; p.hitSolid = true; }
    else if (p.life <= 0 || p.x + w < 0 || p.x > level.width || p.y > level.height) p.dead = true;
  }
  return list.filter(p => !p.dead);
}
export function updateSpears(level, spears, dt) { return updateProjectiles(level, spears, dt, SPEAR.w, SPEAR.h); }

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * 주인공 피격(체력 없음 → 튕겨나기만). fromX: 피해가 온 쪽의 x(가드 방향 판정). 방패로 그쪽을 보고 있으면 막고 살짝 밀린다.
 * 무적 시간 안이면 무시. 반환: 실제로 맞았는가
 */
export function hurtActor(actor, fromX, events = []) {
  if (actor.invuln > 0) return false;
  const cx = actor.x + actor.w / 2;
  const dir = Math.sign(fromX - cx) || actor.facing;
  if (actor.state === 'guard' && dir === actor.facing) {
    actor.vx = -dir * 90;
    events.push({ type: 'block', id: actor.id });
    return false;
  }
  actor.invuln = INVULN_TIME; actor.hurtT = HURT_TIME; actor.charge = 0;
  actor.vx = -dir * KNOCK_VX; actor.vy = -KNOCK_VY; actor.grounded = false;
  actor.h = STAND_H; actor.crouch = false;
  actor.state = 'hurt'; actor.stateT = 0;
  events.push({ type: 'hurt', id: actor.id });
  return true;
}

/** 표적 찾기: 배우 기준 앞뒤 range·높이차 dy 안의 살아 있는(스턴 아닌 것 포함) 적/보스 중 가장 가까운 것 */
export function nearestTarget(actor, targets, range, dy) {
  const cx = actor.x + actor.w / 2, cy = actor.y + actor.h;
  let best = null, bestD = Infinity;
  for (const t of targets) {
    if (!t || t.dead) continue;
    const d = Math.abs(t.x + t.w / 2 - cx);
    if (d <= range && Math.abs(t.y + t.h - cy) <= dy && d < bestD) { best = t; bestD = d; }
  }
  return best;
}

/** 브랜드(억빠맨) 자동 불: 표적이 보이면 그쪽을 보고 불덩이. 6초 쿨타임(fireCool 이 게이지) */
export function brandThink(actor, targets, dt, events = []) {
  actor.fireCool = Math.max(0, (actor.fireCool || 0) - dt);
  if (actor.fireCool > 0 || actor.hurtT > 0) return null;
  const target = nearestTarget(actor, targets, FIRE.range, FIRE.dy);
  if (!target) return null;
  actor.facing = Math.sign(target.x + target.w / 2 - (actor.x + actor.w / 2)) || actor.facing;
  actor.fireCool = FIRE.cooldown; actor.state = 'attack'; actor.stateT = 0;
  events.push({ type: 'fire', id: actor.id, x: actor.x + (actor.facing > 0 ? actor.w : -FIRE.w), y: actor.y + 8, vx: actor.facing * FIRE.speed, facing: actor.facing });
  return target;
}

/** 시계가 바닥·블록에 닿아 터졌을 때 반경 burst 안의 적에 시계 피해 */
export function burstClocks(removed, enemies, now, events = []) {
  for (const clock of removed) {
    if (!clock.hitSolid) continue;
    const cx = clock.x + CLOCK.w / 2, cy = clock.y + CLOCK.h / 2;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const ex = Math.max(enemy.x, Math.min(cx, enemy.x + enemy.w)), ey = Math.max(enemy.y, Math.min(cy, enemy.y + enemy.h));
      if ((ex - cx) ** 2 + (ey - cy) ** 2 <= CLOCK.burst ** 2) { damageEnemy(enemy, ATTACK_POWER, 'clock', now, events); events.push({ type: 'projectileHit', source: 'clock' }); }
    }
  }
}

/** 시계 포물선 초기 속도: dx, dy(양수 = 아래) 를 flight 초에 맞춘다 */
export function clockVelocity(dx, dy) {
  const flight = Math.max(CLOCK.flightMin, Math.min(CLOCK.flightMax, Math.abs(dx) / 260));
  return { vx: dx / flight, vy: (dy - 0.5 * CLOCK.gravity * flight * flight) / flight };
}

/** 질리언(경섭) 자동 시계: 표적이 보이면 두 개(pair 간격), 1.2초 쿨타임. 손으로 던지지 않으므로 몸 옆에서 떠오르듯 시작 */
export function zileanThink(actor, targets, dt, events = []) {
  actor.clockCool = Math.max(0, (actor.clockCool || 0) - dt);
  if (actor.secondClock > 0) {
    actor.secondClock -= dt;
    if (actor.secondClock <= 0 && actor.clockTarget && !actor.clockTarget.dead) { actor.secondClock = 0; emitClock(actor, actor.clockTarget, events, 1); }
    else if (actor.secondClock <= 0) actor.secondClock = 0;
  }
  if (actor.clockCool > 0 || actor.hurtT > 0) return null;
  const target = nearestTarget(actor, targets, CLOCK.range, CLOCK.dy);
  if (!target) return null;
  actor.facing = Math.sign(target.x + target.w / 2 - (actor.x + actor.w / 2)) || actor.facing;
  actor.clockCool = CLOCK.cooldown; actor.clockTarget = target; actor.secondClock = CLOCK.pair; actor.state = 'attack'; actor.stateT = 0;
  emitClock(actor, target, events, 0);
  return target;
}
function emitClock(actor, target, events, index) {
  const sx = actor.x + actor.w / 2 + actor.facing * 10, sy = actor.y + 6;
  // 걷는 적은 비행 시간만큼 앞을 겨냥한다(예측 사격)
  const dx0 = target.x + target.w / 2 - sx, dy = target.y + target.h / 2 - sy;
  const flight = Math.max(CLOCK.flightMin, Math.min(CLOCK.flightMax, Math.abs(dx0) / 260));
  const dx = dx0 + (target.vx || 0) * flight;
  const v = clockVelocity(dx, dy);
  events.push({ type: 'clock', id: actor.id, index, x: sx - CLOCK.w / 2, y: sy - CLOCK.h / 2, vx: v.vx, vy: v.vy });
}

/** CS 미니언 생성(발 기준). 왼쪽으로 걷기 시작 */
export function makeEnemy(type, footX, footY, dir = -1) {
  return { id: `${type}_${Math.round(footX)}`, type, x: Math.round(footX - ENEMY.w / 2), y: footY - ENEMY.h, w: ENEMY.w, h: ENEMY.h, vx: 0, vy: 0, dir, facing: dir,
    hp: ENEMY.hp, grounded: false, stunT: 0, flash: 0, animT: 0, dead: false, deadT: 0, clockHits: [] };
}

/** 미니언 한 프레임: 걷다 벽·낭떠러지에서 돌고, 스턴이면 서 있고, 죽으면 통과하며 떨어진다 */
export function stepEnemy(level, enemy, dt, events = []) {
  enemy.flash = Math.max(0, enemy.flash - dt);
  enemy.animT += dt;
  if (enemy.dead) { enemy.deadT += dt; enemy.vy += GRAVITY * dt; enemy.y += enemy.vy * dt; enemy.x += enemy.vx * dt; return events; }
  if (enemy.stunT > 0) { enemy.stunT = Math.max(0, enemy.stunT - dt); if (enemy.stunT === 0) events.push({ type: 'stunEnd', id: enemy.id }); }
  const walking = enemy.stunT === 0 && enemy.grounded;
  if (walking && pitAhead(level, enemy, enemy.dir, 2)) enemy.dir = -enemy.dir;
  enemy.vx = walking ? enemy.dir * ENEMY.speed : 0;
  enemy.facing = enemy.dir;
  enemy.vy = Math.min(MAX_FALL, enemy.vy + GRAVITY * dt);
  const hit = moveBody(level, enemy, enemy.vx * dt, enemy.vy * dt);
  if (hit.x) enemy.dir = -enemy.dir;
  if (hit.floor) { enemy.grounded = true; enemy.vy = 0; } else if (hit.ceiling) enemy.vy = 0; else enemy.grounded = false;
  return events;
}

/** 미니언 피해. source: 'spear' | 'fire' | 'clock' | 'stomp'. 시계는 같은 적에 stunWindow 안에 둘 맞으면 스턴 */
export function damageEnemy(enemy, amount, source, now, events = []) {
  if (enemy.dead) return false;
  enemy.hp -= amount; enemy.flash = ENEMY.hitFlash;
  if (source === 'clock') {
    enemy.clockHits = enemy.clockHits.filter(t => now - t <= CLOCK.stunWindow);
    enemy.clockHits.push(now);
    if (enemy.clockHits.length >= 2 && enemy.stunT === 0 && enemy.hp > 0) { enemy.stunT = CLOCK.stun; enemy.clockHits = []; events.push({ type: 'stun', id: enemy.id }); }
  }
  if (enemy.hp <= 0) { enemy.dead = true; enemy.deadT = 0; enemy.vy = -220; enemy.vx = 0; events.push({ type: 'enemyDead', id: enemy.id, source }); }
  else events.push({ type: 'enemyHit', id: enemy.id, source });
  return true;
}

/** 주인공과 미니언 접촉: 위에서 떨어지며 밟으면 밟기(피해 1·튀어오름), 아니면 주인공이 튕긴다. 스턴 중인 적은 밟기만 */
export function heroTouchesEnemy(hero, enemy, now, events = []) {
  if (enemy.dead || !rectsOverlap(hero, enemy)) return false;
  const stomp = hero.vy > 0 && hero.y + hero.h < enemy.y + enemy.h * 0.6;
  if (stomp) { damageEnemy(enemy, ATTACK_POWER, 'stomp', now, events); hero.vy = -ENEMY.stompBounce; hero.grounded = false; events.push({ type: 'stomp', id: enemy.id }); return true; }
  if (enemy.stunT > 0) return false;
  return hurtActor(hero, enemy.x + enemy.w / 2, events);
}

/** 미니언 시트 2×2: 0~1 걷기, 2 스턴, 3 쓰러짐 */
export function enemyFrame(enemy) {
  if (enemy.dead) return 3;
  if (enemy.stunT > 0) return 2;
  return Math.floor(enemy.animT * 6) % 2;
}

/** 보스 생성(발 기준). 하늘에서 떨어져 착지하면 포효 → 추격 */
export function makeBoss(footX, footY) {
  return { id: 'bidet', x: Math.round(footX - BOSS.w / 2), y: footY - BOSS.h, w: BOSS.w, h: BOSS.h, vx: 0, vy: 0, facing: -1, grounded: false,
    hp: BOSS.hp, maxHp: BOSS.hp, state: 'enter', stateT: 0, seq: 0, flash: 0, hitCooldown: 0, animT: 0, shot: 0, dead: false, deadT: 0 };
}

/** 휘두르는 동안 도끼 판정 사각형(앞쪽 56px). 그 외엔 null */
export function bossHitbox(boss) {
  if (boss.state !== 'swing') return null;
  return { x: boss.facing > 0 ? boss.x + boss.w - 6 : boss.x - 50, y: boss.y + 12, w: 56, h: boss.h - 12 };
}

/**
 * 보스 한 프레임. target: 주인공. 상태: enter(낙하) → roar → chase(다가감·같은 높이 사거리 안이면 windup, 위에 있으면 점프, 오래 못 잡으면 spray)
 * → windup → swing → recover → (세 번에 한 번 spray) … dead 는 서 있기만. events: bossLand/bossJump/swing/water
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
    else if (boss.stateT > BOSS.chaseMax && dist < 340 && dist > BOSS.reach * 1.5) go('spray');
  }
  else if (boss.state === 'windup') { if (boss.stateT >= BOSS.windup) { go('swing'); events.push({ type: 'swing', facing: boss.facing }); } }
  else if (boss.state === 'swing') { if (boss.stateT >= BOSS.swing) go('recover'); }
  else if (boss.state === 'recover') { if (boss.stateT >= BOSS.recover) { boss.seq += 1; go(boss.seq % 3 === 2 ? 'spray' : 'chase'); if (boss.state === 'spray') boss.shot = 0; } }
  else if (boss.state === 'spray') {
    if (boss.stateT < 0.05) boss.facing = Math.sign(dx) || boss.facing;
    while (boss.shot < BOSS.shots.length && boss.stateT >= BOSS.shots[boss.shot]) {
      boss.shot += 1;
      events.push({ type: 'water', x: boss.facing > 0 ? boss.x + boss.w + 2 : boss.x - WATER_W - 2, y: boss.y + 20, vx: boss.facing * BOSS.waterSpeed, facing: boss.facing });
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

/** 창·불·시계가 보스에 맞았을 때(공격력 1). 짧은 무적으로 한 투사체에 두 번 안 맞는다. 반환: 맞았는가 */
export function hitBoss(boss, events = []) {
  if (boss.dead || boss.hitCooldown > 0) return false;
  boss.hp -= ATTACK_POWER; boss.flash = BOSS.hitFlash; boss.hitCooldown = BOSS.hitCooldown;
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
