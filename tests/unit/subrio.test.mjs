// 섭리오 코어 규칙: 충돌·점프·앉기·창·따라오기 (2026-09-15 브리핑). DOM 없이 순수 함수만 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel, makeActor, stepActor, moveBody, overlapsSolid, followerIntent, updateSpears, frameOf, cameraX,
  TILE, STAND_H, CROUCH_H, JUMP_SPEED, VIEW_W } from '../../src/scenes/subrio-core.js';

const NONE = { left: false, right: false, jump: false, jumpHeld: false, crouch: false, attack: false, guard: false };
const settle = (level, actor, frames = 60) => { for (let i = 0; i < frames; i++) stepActor(level, actor, NONE, 1 / 60); return actor; };

test('test_subrio_level_has_left_landing_ground_pits_and_floating_blocks', () => {
  // Arrange
  const level = buildLevel();

  // Assert
  assert.equal(level.tiles.length, level.rows);
  assert.ok(level.tiles.every(row => row.length === level.cols));
  assert.equal(level.solidAt(2, 18), true, '왼쪽 착지 평지');
  assert.equal(level.solidAt(2, 17), false);
  assert.equal(level.solidAt(59, 18), false, '첫 구덩이');
  assert.equal(level.solidAt(67, 13), true, '떠 있는 블록');
  assert.equal(level.solidAt(150, 16), false, '깃발 기둥은 통과');
  assert.equal(level.solidAt(5, level.rows), true, '레벨 아래는 막힘으로 취급');
});

test('test_subrio_actor_falls_lands_and_stops_at_ground_top', () => {
  // Arrange
  const level = buildLevel();
  const actor = makeActor('p', 40, 200);

  // Act
  const events = [];
  for (let i = 0; i < 90; i++) stepActor(level, actor, NONE, 1 / 60, events);

  // Assert
  assert.equal(actor.grounded, true);
  assert.equal(actor.y + actor.h, 18 * TILE, '발이 바닥 윗면(18행)에 닿는다');
  assert.ok(events.some(event => event.type === 'land'));
});

test('test_subrio_jump_rises_then_lands_and_short_tap_jumps_lower', () => {
  // Arrange
  const level = buildLevel();
  const full = settle(level, makeActor('a', 40, 288));
  const tap = settle(level, makeActor('b', 40, 288));

  // Act
  let fullPeak = full.y, tapPeak = tap.y;
  stepActor(level, full, { ...NONE, jump: true, jumpHeld: true }, 1 / 60);
  stepActor(level, tap, { ...NONE, jump: true, jumpHeld: true }, 1 / 60);
  assert.equal(full.vy < 0, true);
  for (let i = 0; i < 90; i++) {
    stepActor(level, full, { ...NONE, jumpHeld: true }, 1 / 60);
    stepActor(level, tap, { ...NONE, jumpHeld: false }, 1 / 60);
    fullPeak = Math.min(fullPeak, full.y); tapPeak = Math.min(tapPeak, tap.y);
  }

  // Assert
  assert.ok(fullPeak < 288 - STAND_H - 40, '꾹 누르면 40px 이상 오른다');
  assert.ok(tapPeak > fullPeak, '살짝 누르면 덜 오른다');
  assert.equal(full.grounded, true); assert.equal(tap.grounded, true);
});

test('test_subrio_crouch_shrinks_body_and_blocks_movement_guard_blocks_movement', () => {
  // Arrange
  const level = buildLevel();
  const actor = settle(level, makeActor('p', 40, 288));
  const x0 = actor.x;

  // Act
  for (let i = 0; i < 10; i++) stepActor(level, actor, { ...NONE, crouch: true, right: true }, 1 / 60);
  const crouchState = actor.state, crouchH = actor.h, crouchX = actor.x;
  for (let i = 0; i < 10; i++) stepActor(level, actor, { ...NONE, guard: true, right: true }, 1 / 60);
  const guardState = actor.state, guardH = actor.h, guardX = actor.x;
  for (let i = 0; i < 30; i++) stepActor(level, actor, { ...NONE, right: true }, 1 / 60);

  // Assert
  assert.equal(crouchState, 'crouch'); assert.equal(crouchH, CROUCH_H); assert.equal(crouchX, x0, '앉으면 안 움직인다');
  assert.equal(guardState, 'guard'); assert.equal(guardH, STAND_H); assert.equal(guardX, x0, '막을 때도 안 움직인다');
  assert.ok(actor.x > x0 + 20, '놓으면 다시 걷는다'); assert.equal(actor.state, 'walk');
  assert.equal(actor.y + actor.h, 18 * TILE, '앉았다 일어나도 발 위치는 바닥');
});

test('test_subrio_attack_spawns_one_spear_per_press_with_cooldown_and_spear_stops_at_walls', () => {
  // Arrange
  const level = buildLevel();
  const actor = settle(level, makeActor('p', 40, 288));

  // Act
  const events = [];
  stepActor(level, actor, { ...NONE, attack: true }, 1 / 60, events);
  stepActor(level, actor, { ...NONE, attack: true }, 1 / 60, events);
  const attacks = events.filter(event => event.type === 'attack');
  let spears = attacks.map(event => ({ x: event.x, y: event.y, vx: event.facing * 380, life: 1.1 }));
  for (let i = 0; i < 40; i++) spears = updateSpears(level, spears, 1 / 60);
  const wall = [{ x: 34 * TILE - 30, y: 17 * TILE + 4, vx: 380, life: 1.1 }];
  const afterWall = updateSpears(level, wall, 0.2);

  // Assert
  assert.equal(attacks.length, 1, '쿨다운 안에는 한 번만');
  assert.equal(frameOf({ ...actor, state: 'attack' }), 6);
  assert.equal(spears.length, 1); assert.ok(spears[0].x > attacks[0].x + 200, '창이 오른쪽으로 난다');
  assert.equal(afterWall.length, 0, '계단 벽에 박히면 사라진다');
});

test('test_subrio_follower_trails_the_leader_with_delay_and_jumps_when_leader_jumped', () => {
  // Arrange
  const follower = { x: 40, y: 264, vy: 0, grounded: true, blockedT: 0 };
  const trail = [];
  for (let t = 0; t <= 1.0; t += 0.1) trail.push({ t, x: 40 + t * 100, y: 264, facing: 1, jumped: t > 0.85 });

  // Act
  const early = followerIntent(follower, trail, 0.3);
  const later = followerIntent(follower, trail, 1.0);
  const jumped = followerIntent(follower, trail, 1.3);

  // Assert
  assert.equal(early.right, false, '0.3초 시점: 0.35초 전 주인공은 아직 출발점 근처 → 안 따라감');
  assert.equal(later.right, true, '늦게 따라간다');
  assert.equal(jumped.jump, true, '주인공이 뛴 기록을 보면 같이 뛴다');
});

test('test_subrio_camera_follows_leader_inside_level_bounds', () => {
  const level = buildLevel();
  assert.equal(cameraX(level, makeActor('p', 30, 288)), 0);
  assert.equal(cameraX(level, makeActor('p', level.width - 10, 288)), level.width - VIEW_W);
  const mid = cameraX(level, makeActor('p', 1000, 288));
  assert.ok(mid > 0 && mid < level.width - VIEW_W);
});

test('test_subrio_move_body_stops_horizontally_at_step_and_reports_floor', () => {
  const level = buildLevel();
  // 왼쪽 평지(윗면 18행) 위에 선 몸(발 y288)이 오른쪽 계단(윗면 17행)으로 걸어간다
  const body = { x: 34 * TILE - 20, y: 18 * TILE - 24, w: 12, h: 24 };
  assert.equal(overlapsSolid(level, body.x, body.y, body.w, body.h), false, '출발 위치는 비어 있다');
  const hit = moveBody(level, body, 40, 0);
  assert.equal(hit.x, true); assert.equal(body.x + body.w, 34 * TILE, '한 칸 높은 계단 옆면에 멈춘다');
  assert.equal(overlapsSolid(level, body.x, body.y, body.w, body.h), false);
  const drop = moveBody(level, { x: 5 * TILE, y: 10 * TILE, w: 12, h: 24 }, 0, 200);
  assert.equal(drop.floor, true);
});

// ── 스테이지 1~3·보스 (2026-09-15 사용자 확정: 보라·청록·파랑 → 마지막 비데 보스전) ──
import { STAGES, reachedGoal, makeBoss, stepBoss, hitBoss, hurtActor, bossHitbox, bossFrame, rectsOverlap, updateProjectiles, BOSS, HERO_HP, WATER_W, WATER_H } from '../../src/scenes/subrio-core.js';

/** 오른쪽만 보고 달리는 봇: 앞이 막히거나 발밑 앞이 낭떠러지면 점프. 사람이 할 수 있는 지형인지의 하한 검사 */
function botIntent(level, actor, memo) {
  const footRow = Math.floor((actor.y + actor.h) / TILE);
  const aheadCol = Math.floor((actor.x + actor.w + 3) / TILE);
  const groundAhead = level.solidAt(aheadCol, footRow) || level.solidAt(aheadCol, footRow + 1) || level.solidAt(aheadCol, footRow + 2);
  memo.stuck = actor.grounded && Math.abs(actor.vx) < 5 && memo.lastX === actor.x ? memo.stuck + 1 : 0;
  memo.lastX = actor.x;
  const jump = actor.grounded && (!groundAhead || memo.stuck > 6);
  return { ...NONE, right: true, jump, jumpHeld: true };
}
function botRun(stage) {
  const level = buildLevel(stage);
  const actor = makeActor('bot', level.spawnX, 200);
  const memo = { stuck: 0, lastX: 0 };
  const events = [];
  let falls = 0;
  for (let i = 0; i < 60 * 90; i++) {
    const before = events.length;
    stepActor(level, actor, botIntent(level, actor, memo), 1 / 60, events);
    if (events.slice(before).some(e => e.type === 'fall')) falls += 1;
    if (reachedGoal(level, actor)) return { reached: true, t: i / 60, falls };
  }
  return { reached: false, t: 90, falls, x: actor.x };
}

test('test_subrio_stage_list_is_purple_teal_blue_then_bidet_boss', () => {
  assert.deepEqual(STAGES.map(s => s.id), ['purple', 'teal', 'blue', 'boss']);
  assert.deepEqual(STAGES.map(s => s.title), ['STAGE 1', 'STAGE 2', 'STAGE 3', 'FINAL STAGE']);
  assert.equal(STAGES[3].boss, true);
  assert.ok(STAGES[1].tiles.includes('teal') && STAGES[2].tiles.includes('blue'));
  for (const stage of [0, 1, 2]) { const level = buildLevel(stage); assert.ok(level.goal, `stage ${stage} 깃발`); assert.equal(level.tiles[level.goal.y / TILE][level.goal.col], 'F'); }
  const arena = buildLevel(3);
  assert.equal(arena.goal, null); assert.ok(arena.bossSpawnX > arena.spawnX);
  assert.equal(arena.solidAt(0, 10), true, '왼쪽 벽'); assert.equal(arena.solidAt(43, 10), true, '오른쪽 벽');
});

test('test_subrio_each_stage_is_clearable_by_a_run_and_jump_bot_without_falling', () => {
  for (const stage of [0, 1, 2]) {
    const result = botRun(stage);
    assert.equal(result.reached, true, `stage ${stage} 봇이 깃발까지 못 감 (x=${result.x})`);
    assert.equal(result.falls, 0, `stage ${stage} 봇이 떨어짐`);
    assert.ok(result.t < 60, `stage ${stage} 60초 안`);
  }
});

test('test_subrio_hurt_knocks_back_costs_a_heart_and_guard_facing_the_source_blocks', () => {
  const level = buildLevel(3);
  const hero = settle(level, makeActor('p', 200, 288));
  const events = [];
  // 오른쪽에서 온 피해: 왼쪽으로 튕기고 하트 하나
  assert.equal(hurtActor(hero, hero.x + 40, events), true);
  assert.equal(hero.hp, HERO_HP - 1); assert.ok(hero.vx < 0 && hero.vy < 0); assert.equal(hero.state, 'hurt');
  assert.equal(hurtActor(hero, hero.x + 40, events), false, '무적 시간 안에는 안 맞는다');
  for (let i = 0; i < 100; i++) stepActor(level, hero, NONE, 1 / 60);
  assert.equal(hero.invuln, 0);
  // 방패로 오른쪽을 보고 막으면 오른쪽 피해는 막힌다, 뒤에서 오면 맞는다
  stepActor(level, hero, { ...NONE, guard: true }, 1 / 60); hero.facing = 1;
  assert.equal(hurtActor(hero, hero.x + 40, events), false); assert.equal(hero.hp, HERO_HP - 1);
  assert.ok(events.some(e => e.type === 'block'));
  assert.equal(hurtActor(hero, hero.x - 40, events), true); assert.equal(hero.hp, HERO_HP - 2);
  hero.hp = 1; hero.invuln = 0;
  hurtActor(hero, hero.x - 40, events);
  assert.equal(hero.dead, true); assert.ok(events.some(e => e.type === 'dead'));
});

test('test_subrio_boss_lands_roars_chases_swings_in_reach_and_sprays_three_waters_when_far', () => {
  const level = buildLevel(3);
  const hero = settle(level, makeActor('p', 200, 288));
  const boss = makeBoss(level.bossSpawnX, 100);
  const events = [];
  for (let i = 0; i < 50; i++) stepBoss(level, boss, hero, 1 / 60, events);
  assert.ok(events.some(e => e.type === 'bossLand')); assert.equal(boss.state, 'roar');
  for (let i = 0; i < 100; i++) stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'chase'); assert.equal(boss.facing, -1, '주인공 쪽(왼쪽)을 본다');
  const startX = boss.x;
  let swung = false;
  for (let i = 0; i < 60 * 8 && !swung; i++) { stepBoss(level, boss, hero, 1 / 60, events); swung = events.some(e => e.type === 'swing'); }
  assert.ok(swung, '사거리 안에 들어오면 휘두른다'); assert.ok(boss.x < startX);
  assert.equal(boss.state, 'swing');
  const box = bossHitbox(boss);
  assert.ok(box && box.x + box.w <= boss.x + 4 && rectsOverlap(box, hero), '도끼 판정이 주인공 쪽 앞에 있고 주인공에 닿는다');
  assert.equal(bossFrame(boss), 5);
  // 주인공을 멀리 옮기면 추격이 길어지다 물줄기 3발
  hero.x = boss.x - 300;
  const before = events.length;
  for (let i = 0; i < 60 * 5; i++) stepBoss(level, boss, hero, 1 / 60, events);
  const waters = events.slice(before).filter(e => e.type === 'water');
  assert.ok(waters.length >= 3, `물줄기 ${waters.length}`); assert.ok(waters.every(w => w.vx < 0));
  const list = waters.slice(0, 3).map(w => ({ x: w.x, y: w.y, vx: w.vx, life: BOSS.waterLife }));
  const moved = updateProjectiles(level, list, 0.5, WATER_W, WATER_H);
  assert.equal(moved.length, 3); assert.ok(moved[0].x < waters[0].x - 100);
});

test('test_subrio_boss_takes_one_hit_per_spear_with_cooldown_and_dies_at_zero', () => {
  const boss = makeBoss(400, 288);
  const events = [];
  assert.equal(hitBoss(boss, events), true); assert.equal(boss.hp, BOSS.hp - 1);
  assert.equal(hitBoss(boss, events), false, '연속 판정 방지');
  assert.equal(bossFrame(boss), 7, '맞은 직후 아픈 프레임');
  boss.hitCooldown = 0; boss.hp = 1;
  assert.equal(hitBoss(boss, events), true);
  assert.equal(boss.dead, true); assert.equal(boss.state, 'dead'); assert.ok(events.some(e => e.type === 'bossDead'));
  assert.equal(hitBoss(boss, events), false);
});
