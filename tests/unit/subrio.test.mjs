// 섭리오 코어 규칙(2026-09-15 브리핑 + 167 확장): 충돌·점프·앉기·창 탭/차징·불·시계 스턴·CS 미니언·따라오기(낭떠러지 점프)·스테이지·보스. DOM 없이 순수 함수만 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel, makeActor, stepActor, moveBody, overlapsSolid, followerIntent, updateSpears, updateProjectiles, frameOf, cameraX, pitAhead,
  STAGES, reachedGoal, makeBoss, stepBoss, hitBoss, hurtActor, bossHitbox, bossFrame, rectsOverlap, brandThink, zileanThink, clockVelocity,
  makeEnemy, stepEnemy, damageEnemy, heroTouchesEnemy, enemyFrame, nearestTarget,
  TILE, STAND_H, CROUCH_H, VIEW_W, SPEAR, FIRE, CLOCK, ENEMY, BOSS, WATER_W, WATER_H, NO_INTENT } from '../../src/scenes/subrio-core.js';

const NONE = NO_INTENT;
const settle = (level, actor, frames = 60) => { for (let i = 0; i < frames; i++) stepActor(level, actor, NONE, 1 / 60); return actor; };
const GROUND = 18 * TILE;

test('test_subrio_level_has_left_landing_ground_pits_and_floating_blocks', () => {
  const level = buildLevel(1);
  assert.equal(level.tiles.length, level.rows);
  assert.ok(level.tiles.every(row => row.length === level.cols));
  assert.equal(level.solidAt(2, 18), true, '왼쪽 착지 평지');
  assert.equal(level.solidAt(2, 17), false);
  assert.equal(level.solidAt(5, level.rows), false, '레벨 아래는 뚫려 있다(낙사)');
  assert.ok(level.enemies.length >= 20, '1-1 에 몬스터가 여럿');
  assert.deepEqual([...new Set(level.enemies.map(e => e.type))].sort(), ['cs_red', 'gromp', 'raptor'], '1-1 트위치: CS·칼날부리·두꺼비 균등 배분');
  assert.ok(level.enemies.every(e => level.solidAt(Math.floor(e.x / TILE), e.y / TILE) && !level.solidAt(Math.floor(e.x / TILE), e.y / TILE - 1)), '미니언은 전부 바닥 윗면 위에 선다');
});

test('test_subrio_actor_falls_lands_and_stops_at_ground_top', () => {
  const level = buildLevel(1);
  const actor = makeActor('p', 40, 200);
  const events = [];
  for (let i = 0; i < 90; i++) stepActor(level, actor, NONE, 1 / 60, events);
  assert.equal(actor.grounded, true);
  assert.equal(actor.y + actor.h, GROUND, '발이 바닥 윗면(18행)에 닿는다');
  assert.ok(events.some(event => event.type === 'land'));
});

test('test_subrio_jump_rises_then_lands_and_short_tap_jumps_lower', () => {
  const level = buildLevel(1);
  const full = settle(level, makeActor('a', 40, GROUND));
  const tap = settle(level, makeActor('b', 40, GROUND));
  let fullPeak = full.y, tapPeak = tap.y;
  stepActor(level, full, { ...NONE, jump: true, jumpHeld: true }, 1 / 60);
  stepActor(level, tap, { ...NONE, jump: true, jumpHeld: true }, 1 / 60);
  assert.equal(full.vy < 0, true);
  for (let i = 0; i < 90; i++) {
    stepActor(level, full, { ...NONE, jumpHeld: true }, 1 / 60);
    stepActor(level, tap, { ...NONE, jumpHeld: false }, 1 / 60);
    fullPeak = Math.min(fullPeak, full.y); tapPeak = Math.min(tapPeak, tap.y);
  }
  assert.ok(fullPeak < GROUND - STAND_H - 60, '꾹 누르면 60px 이상 오른다(4칸 단차)');
  assert.ok(tapPeak > fullPeak, '살짝 누르면 덜 오른다');
  assert.equal(full.grounded, true); assert.equal(tap.grounded, true);
});

test('test_subrio_crouch_shrinks_body_and_blocks_movement_guard_blocks_movement', () => {
  const level = buildLevel(1);
  const actor = settle(level, makeActor('p', 40, GROUND));
  const x0 = actor.x;
  for (let i = 0; i < 10; i++) stepActor(level, actor, { ...NONE, crouch: true, right: true }, 1 / 60);
  const crouchState = actor.state, crouchH = actor.h, crouchX = actor.x;
  for (let i = 0; i < 10; i++) stepActor(level, actor, { ...NONE, guard: true, right: true }, 1 / 60);
  const guardState = actor.state, guardH = actor.h, guardX = actor.x;
  for (let i = 0; i < 30; i++) stepActor(level, actor, { ...NONE, right: true }, 1 / 60);
  assert.equal(crouchState, 'crouch'); assert.equal(crouchH, CROUCH_H); assert.equal(crouchX, x0, '앉으면 안 움직인다');
  assert.equal(guardState, 'guard'); assert.equal(guardH, STAND_H); assert.equal(guardX, x0, '막을 때도 안 움직인다');
  assert.ok(actor.x > x0 + 20, '놓으면 다시 걷는다'); assert.equal(actor.state, 'walk');
  assert.equal(actor.y + actor.h, GROUND, '앉았다 일어나도 발 위치는 바닥');
});

test('test_subrio_spear_tap_throws_short_spear_and_holding_c_charges_then_throws_a_long_fast_one', () => {
  const level = buildLevel(1);
  const tapper = settle(level, makeActor('p', 40, GROUND));
  const events = [];
  stepActor(level, tapper, { ...NONE, attack: true, attackHeld: true }, 1 / 60, events);
  stepActor(level, tapper, { ...NONE, attackHeld: true }, 1 / 60, events);
  stepActor(level, tapper, NONE, 1 / 60, events);
  const tap = events.find(event => event.type === 'attack');
  assert.ok(tap && tap.charged === false, '짧게 누르면 놓는 순간 짧은 창');
  stepActor(level, tapper, { ...NONE, attack: true, attackHeld: true }, 1 / 60, events);
  stepActor(level, tapper, NONE, 1 / 60, events);
  assert.equal(events.filter(event => event.type === 'attack').length, 1, '쿨다운 안에는 한 번만');
  assert.equal(frameOf({ ...tapper, state: 'attack' }), 6);
  // 차징: 0.6초 누르고 놓으면 강창, chargeMin 을 넘는 순간 chargeStart, 차징 중엔 자세 6·이동 절반
  const charger = settle(level, makeActor('c', 40, GROUND));
  const ev2 = [];
  stepActor(level, charger, { ...NONE, attack: true, attackHeld: true }, 1 / 60, ev2);
  for (let i = 0; i < 36; i++) stepActor(level, charger, { ...NONE, attackHeld: true, right: true }, 1 / 60, ev2);
  assert.equal(charger.state, 'charge'); assert.equal(frameOf(charger), 8, '차징은 창을 뒤로 든 5행 프레임'); assert.equal(frameOf({ ...charger, classId: 'brand' }), 6);
  assert.ok(ev2.some(event => event.type === 'chargeStart'));
  assert.ok(Math.abs(charger.vx) < 80, '차징 중엔 느리다');
  stepActor(level, charger, { ...NONE, right: true }, 1 / 60, ev2);
  const strong = ev2.find(event => event.type === 'attack');
  assert.ok(strong && strong.charged === true, '놓으면 강창');
  let spears = [{ x: strong.x, y: strong.y, vx: strong.facing * SPEAR.chargedSpeed, life: SPEAR.chargedLife }];
  for (let i = 0; i < 45; i++) spears = updateSpears(buildLevel(4), spears, 1 / 60);
  assert.equal(spears.length, 1); assert.ok(spears[0].x > strong.x + 400, '강창은 0.75초에 400px 넘게 간다');
  const wall = [{ x: 42 * TILE - 30, y: 10 * TILE, vx: 380, life: 1.1 }];
  assert.equal(updateSpears(buildLevel(4), wall, 0.1).length, 0, '막힌 타일(무대 벽)에 박히면 사라진다');
});

test('test_subrio_follower_trails_the_leader_with_delay_jumps_when_leader_jumped_and_jumps_at_cliffs', () => {
  const level = buildLevel(1);
  const follower = { x: 40, y: GROUND - STAND_H, w: 16, h: STAND_H, vy: 0, grounded: true, blockedT: 0 };
  const trail = [];
  for (let t = 0; t <= 1.0; t += 0.1) trail.push({ t, x: 40 + t * 100, y: GROUND - STAND_H, facing: 1, jumped: t > 0.85 });
  const early = followerIntent(follower, trail, 0.3, { level });
  const later = followerIntent(follower, trail, 1.0, { level });
  const jumped = followerIntent(follower, trail, 1.3, { level });
  assert.equal(early.right, false, '0.3초 시점: 0.35초 전 주인공은 아직 출발점 근처 → 안 따라감');
  assert.equal(later.right, true, '늦게 따라간다');
  assert.equal(jumped.jump, true, '주인공이 뛴 기록을 보면 같이 뛴다');
  // 낭떠러지: 1-1 첫 구덩이(30열 뒤 … 첫 gap) 앞에 선 동료가 오른쪽으로 가야 하면 스스로 뛴다
  const gapCol = [...Array(level.cols).keys()].find(c => c > 30 && !level.solidAt(c, 18) && !level.solidAt(c, 17) && !level.solidAt(c, 16) && !level.solidAt(c, 15));
  const top = [15, 16, 17, 18].find(r => level.solidAt(gapCol - 1, r));
  const edge = { x: gapCol * TILE - 16 - 4, y: top * TILE - STAND_H, w: 16, h: STAND_H, vy: 0, grounded: true, blockedT: 0 };
  assert.equal(pitAhead(level, edge, 1), true);
  const cliffTrail = [{ t: 0, x: edge.x + 200, y: edge.y, facing: 1, jumped: false }];
  const atCliff = followerIntent(edge, cliffTrail, 1.0, { level });
  assert.equal(atCliff.right, true); assert.equal(atCliff.jump, true, '앞이 낭떠러지면 뛴다'); assert.equal(atCliff.jumpHeld, true);
});

test('test_subrio_camera_follows_leader_inside_level_bounds', () => {
  const level = buildLevel(1);
  assert.equal(cameraX(level, makeActor('p', 30, GROUND)), 0);
  assert.equal(cameraX(level, makeActor('p', level.width - 10, GROUND)), level.width - VIEW_W);
  const mid = cameraX(level, makeActor('p', 1000, GROUND));
  assert.ok(mid > 0 && mid < level.width - VIEW_W);
});

test('test_subrio_move_body_stops_horizontally_at_step_and_reports_floor', () => {
  const level = buildLevel(1);
  const body = { x: 30 * TILE - 24, y: GROUND - STAND_H, w: 16, h: STAND_H };
  assert.equal(overlapsSolid(level, body.x, body.y, body.w, body.h), false, '출발 위치는 비어 있다');
  const hit = moveBody(level, body, 40, 0);
  assert.equal(hit.x, true); assert.equal(body.x + body.w, 30 * TILE, '한 칸 높은 계단 옆면에 멈춘다');
  const drop = moveBody(level, { x: 5 * TILE, y: 10 * TILE, w: 16, h: STAND_H }, 0, 200);
  assert.equal(drop.floor, true);
});

// ── 스테이지 1-1~1-3·보스 1-4 ──
/** 오른쪽만 보고 달리는 봇: 앞이 막히거나 발밑 앞이 낭떠러지면 점프. 사람이 할 수 있는 지형인지의 하한 검사(적은 무시) */
function botIntent(level, actor, memo) {
  memo.stuck = actor.grounded && Math.abs(actor.vx) < 5 && memo.lastX === actor.x ? memo.stuck + 1 : 0;
  memo.lastX = actor.x;
  const jump = actor.grounded && (pitAhead(level, actor, 1, 4) || memo.stuck > 6);
  return { ...NONE, right: true, jump, jumpHeld: true };
}
function botRun(stage) {
  const level = buildLevel(stage);
  const actor = makeActor('bot', level.spawnX, 200);
  const memo = { stuck: 0, lastX: 0 };
  const events = [];
  let falls = 0;
  for (let i = 0; i < 60 * 150; i++) {
    const before = events.length;
    stepActor(level, actor, botIntent(level, actor, memo), 1 / 60, events);
    if (events.slice(before).some(e => e.type === 'fall')) falls += 1;
    if (reachedGoal(level, actor)) return { reached: true, t: i / 60, falls };
  }
  return { reached: false, t: 150, falls, x: actor.x };
}

test('test_subrio_stage_list_is_tutorial_twitch_chzzk_forest_then_bidet_boss', () => {
  assert.deepEqual(STAGES.map(s => s.id), ['tutorial', 'purple', 'teal', 'blue', 'boss']);
  assert.deepEqual(STAGES.map(s => s.title), ['1-0', '1-1', '1-2', '1-3', '1-4']);
  assert.deepEqual(STAGES.map(s => s.name), ['튜토리얼', '트위치', '치지직', '숲', '따듯한비데']);
  assert.equal(STAGES[4].boss, true); assert.equal(STAGES[0].tutorial, true);
  for (const stage of [1, 2, 3]) {
    const level = buildLevel(stage);
    assert.ok(level.goal, `stage ${stage} 깃발`); assert.equal(level.tiles[level.goal.y / TILE][level.goal.col], 'F');
    assert.ok(level.cols >= 400, `stage ${stage} 는 3분 분량(400열 이상)`);
    assert.ok(level.chatter.length >= 3, `stage ${stage} 위치 대사`);
  }
  const forest = buildLevel(3);
  const lastTwo = forest.enemies.slice(-2).map(e => e.type).sort();
  assert.deepEqual(lastTwo, ['blue', 'red'], '1-3 마지막 쪽에 레드·블루');
  const tutorial = buildLevel(0);
  assert.equal(tutorial.enemies.filter(e => e.type === 'totem').length, 1, '1-0 훈련 토템');
  assert.equal(tutorial.enemies.find(e => e.demo)?.hp, 1, '밟기 시범용 약한 미니언');
  assert.ok(tutorial.prompts.length === 3 && tutorial.stompDemo, '조작 팻말 3개·밟기 시범');
  const arena = buildLevel(4);
  assert.equal(arena.goal, null); assert.ok(arena.bossSpawnX > arena.spawnX); assert.equal(arena.enemies.length, 0);
  assert.equal(arena.solidAt(0, 10), true, '왼쪽 벽'); assert.equal(arena.solidAt(43, 10), true, '오른쪽 벽');
});

test('test_subrio_each_stage_is_clearable_by_a_run_and_jump_bot_without_falling_in_under_150s', () => {
  for (const stage of [0, 1, 2, 3]) {
    const result = botRun(stage);
    assert.equal(result.reached, true, `stage ${stage} 봇이 깃발까지 못 감 (x=${result.x})`);
    assert.equal(result.falls, 0, `stage ${stage} 봇이 떨어짐`);
    if (stage > 0) assert.ok(result.t > 40 && result.t < 150, `stage ${stage} 달리기만으로 40~150초 (${result.t.toFixed(1)}s)`);
  }
});

test('test_subrio_hurt_knocks_back_without_hp_and_guard_facing_the_source_blocks', () => {
  const level = buildLevel(4);
  const hero = settle(level, makeActor('p', 200, GROUND));
  const events = [];
  assert.equal(hero.hp, undefined, '체력 없음');
  assert.equal(hurtActor(hero, hero.x + 40, events), true);
  assert.ok(hero.vx < 0 && hero.vy < 0); assert.equal(hero.state, 'hurt');
  assert.equal(hurtActor(hero, hero.x + 40, events), false, '무적 시간 안에는 안 맞는다');
  for (let i = 0; i < 100; i++) stepActor(level, hero, NONE, 1 / 60);
  assert.equal(hero.invuln, 0);
  stepActor(level, hero, { ...NONE, guard: true }, 1 / 60); hero.facing = 1;
  assert.equal(hurtActor(hero, hero.x + 40, events), false, '방패로 보는 쪽은 막힌다');
  assert.ok(events.some(e => e.type === 'block'));
  assert.equal(hurtActor(hero, hero.x - 40, events), true, '뒤에서 오면 맞는다');
});

test('test_subrio_cs_minion_walks_turns_at_ledges_takes_two_hits_and_is_stomped', () => {
  const level = buildLevel(1);
  const spec = level.enemies.find(e => e.type === 'cs_red');
  const enemy = makeEnemy(spec.type, spec.x, spec.y);
  const events = [];
  for (let i = 0; i < 60; i++) stepEnemy(level, enemy, 1 / 60, events);
  assert.equal(enemy.grounded, true); assert.equal(enemy.y + enemy.h, spec.y);
  assert.ok(enemy.x < spec.x - 20, '왼쪽으로 걷는다');
  // 토템은 제자리, 칼날부리는 주기적으로 뛴다, 불에 맞으면 2초 불탄다
  const totem = makeEnemy('totem', 400, GROUND); for (let i = 0; i < 60; i++) stepEnemy(level, totem, 1 / 60); assert.equal(totem.x, 400 - 8); assert.equal(totem.hp, 8);
  const raptor = makeEnemy('raptor', 300, GROUND); let hopped = false; for (let i = 0; i < 120; i++) { stepEnemy(level, raptor, 1 / 60); if (raptor.vy < -100) hopped = true; } assert.equal(hopped, true, '칼날부리 hop');
  damageEnemy(raptor, 1, 'fire', 0); assert.equal(raptor.burnT, ENEMY.burn);
  let turned = false;
  for (let i = 0; i < 60 * 20 && !turned; i++) { stepEnemy(level, enemy, 1 / 60, events); if (enemy.dir === 1) turned = true; }
  assert.equal(turned, true, '벽이나 낭떠러지에서 돈다');
  assert.equal(enemy.y + enemy.h, spec.y, '돌면서 떨어지지 않는다');
  assert.equal(enemyFrame(enemy) <= 1, true);
  damageEnemy(enemy, 1, 'spear', 0, events);
  assert.equal(enemy.hp, ENEMY.hp - 1); assert.ok(events.some(e => e.type === 'enemyHit'));
  // 밟기: 위에서 떨어지는 주인공은 피해 1을 주고 튀어오른다. 세 번째 피해에 쓰러진다
  const hero = makeActor('p', enemy.x + enemy.w / 2, enemy.y + 4); hero.vy = 200;
  assert.equal(heroTouchesEnemy(hero, enemy, 1, events), true);
  assert.ok(events.some(e => e.type === 'stomp')); assert.ok(hero.vy < 0);
  assert.equal(enemy.hp, ENEMY.hp - 2); assert.equal(enemy.dead, false);
  damageEnemy(enemy, 1, 'fire', 2, events);
  assert.equal(enemy.dead, true); assert.equal(enemyFrame(enemy), 3); assert.ok(events.some(e => e.type === 'enemyDead'));
  // 옆에서 닿으면 주인공이 튕긴다
  const walker = makeEnemy('cs_blue', 300, GROUND);
  const side = settle(level, makeActor('s', 300 - 14, GROUND));
  const ev2 = [];
  assert.equal(heroTouchesEnemy(side, walker, 2, ev2), true);
  assert.ok(ev2.some(e => e.type === 'hurt') && side.vx < 0);
});

test('test_subrio_brand_fires_at_a_visible_enemy_once_per_six_seconds', () => {
  const brand = makeActor('ppaman', 100, GROUND);
  const enemy = makeEnemy('cs_red', 260, GROUND);
  const events = [];
  assert.equal(brandThink(brand, [enemy], 1 / 60, events), enemy);
  const fire = events.find(e => e.type === 'fire');
  assert.ok(fire && fire.vx > 0, '적 쪽으로 불덩이'); assert.equal(brand.facing, 1);
  assert.equal(brand.fireCool, FIRE.cooldown);
  for (let i = 0; i < 60 * 5; i++) brandThink(brand, [enemy], 1 / 60, events);
  assert.equal(events.filter(e => e.type === 'fire').length, 1, '6초 안엔 한 번');
  for (let i = 0; i < 60 * 1.2; i++) brandThink(brand, [enemy], 1 / 60, events);
  assert.equal(events.filter(e => e.type === 'fire').length, 2, '6초 뒤 다시');
  assert.equal(nearestTarget(brand, [makeEnemy('cs_red', 900, GROUND)], FIRE.range, FIRE.dy), null, '멀면 안 쏜다');
});

test('test_subrio_zilean_lobs_two_clocks_in_an_arc_and_two_hits_on_the_same_enemy_stun_it_for_two_seconds', () => {
  const level = buildLevel(4);
  const zilean = makeActor('gyeongsub', 300, GROUND);
  const enemy = makeEnemy('cs_red', 440, GROUND);
  const events = [];
  assert.equal(zileanThink(zilean, [enemy], 1 / 60, events), enemy);
  for (let i = 0; i < 20; i++) zileanThink(zilean, [enemy], 1 / 60, events);
  const clocks = events.filter(e => e.type === 'clock');
  assert.equal(clocks.length, 2, '두 개를 던진다'); assert.deepEqual(clocks.map(c => c.index), [0, 1]);
  assert.ok(clocks.every(c => c.vy < 0 && c.vx > 0), '포물선(위로 떠서 오른쪽으로)');
  // 첫 시계는 실제로 적 근처에 떨어진다
  let list = [{ ...clocks[0], life: 2 }];
  let hitAt = null;
  for (let i = 0; i < 90 && !hitAt; i++) { list = updateProjectiles(level, list, 1 / 60, CLOCK.w, CLOCK.h, CLOCK.gravity); if (list[0] && rectsOverlap({ x: list[0].x, y: list[0].y, w: CLOCK.w, h: CLOCK.h }, enemy)) hitAt = i / 60; }
  assert.ok(hitAt !== null, '시계가 적에 닿는다');
  for (let i = 0; i < 80; i++) zileanThink(zilean, [enemy], 1 / 60, events);
  assert.equal(events.filter(e => e.type === 'clock').length, 4, '1.2초 뒤 또 두 개');
  const v = clockVelocity(200, 0); assert.ok(v.vy < 0 && v.vx > 0);
  // 같은 적에 두 개 → 스턴 2초 + stun 사건, 스턴 중엔 안 걷는다
  const ev2 = [];
  damageEnemy(enemy, 1, 'clock', 5.0, ev2);
  assert.equal(enemy.stunT, 0);
  damageEnemy(enemy, 0, 'clock', 5.3, ev2);
  assert.equal(enemy.stunT, CLOCK.stun); assert.ok(ev2.some(e => e.type === 'stun')); assert.equal(enemyFrame(enemy), 2);
  const x0 = enemy.x;
  for (let i = 0; i < 60; i++) stepEnemy(level, enemy, 1 / 60, ev2);
  assert.equal(enemy.x, x0, '스턴 중엔 제자리');
  for (let i = 0; i < 70; i++) stepEnemy(level, enemy, 1 / 60, ev2);
  assert.equal(enemy.stunT, 0); assert.ok(ev2.some(e => e.type === 'stunEnd'));
});

test('test_subrio_boss_lands_roars_chases_swings_in_reach_and_sprays_three_waters_when_far', () => {
  const level = buildLevel(4);
  const hero = settle(level, makeActor('p', 200, GROUND));
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
  assert.ok(box && box.x + box.w <= boss.x + 6 && rectsOverlap(box, hero), '도끼 판정이 주인공 쪽 앞에 있고 주인공에 닿는다');
  assert.equal(bossFrame(boss), 5);
  hero.x = boss.x - 300;
  const before = events.length;
  for (let i = 0; i < 60 * 5; i++) stepBoss(level, boss, hero, 1 / 60, events);
  const waters = events.slice(before).filter(e => e.type === 'water');
  assert.ok(waters.length >= 3, `물줄기 ${waters.length}`); assert.ok(waters.every(w => w.vx < 0));
  const list = waters.slice(0, 3).map(w => ({ x: w.x, y: w.y, vx: w.vx, life: BOSS.waterLife }));
  const moved = updateProjectiles(level, list, 0.5, WATER_W, WATER_H);
  assert.equal(moved.length, 3); assert.ok(moved[0].x < waters[0].x - 100);
});

test('test_subrio_boss_takes_one_damage_per_hit_with_cooldown_and_dies_at_zero', () => {
  const boss = makeBoss(400, GROUND);
  const events = [];
  assert.equal(hitBoss(boss, events), true); assert.equal(boss.hp, BOSS.hp - 1);
  assert.equal(hitBoss(boss, events), false, '연속 판정 방지');
  assert.equal(bossFrame(boss), 7, '맞은 직후 아픈 프레임');
  boss.hitCooldown = 0; boss.hp = 1;
  assert.equal(hitBoss(boss, events), true);
  assert.equal(boss.dead, true); assert.equal(boss.state, 'dead'); assert.ok(events.some(e => e.type === 'bossDead'));
  assert.equal(hitBoss(boss, events), false);
});

test('test_subrio_clock_that_lands_near_an_enemy_bursts_and_two_bursts_stun', async () => {
  const { burstClocks } = await import('../../src/scenes/subrio-core.js');
  const level = buildLevel(4);
  const enemy = makeEnemy('cs_red', 300, GROUND);
  // 바닥에 닿은 시계(hitSolid)가 적 발치 20px 안에 떨어지면 피해, 먼 것은 무시
  const near = { x: 300 + 14, y: GROUND - 8, hitSolid: true, dead: true }, far = { x: 400, y: GROUND - 8, hitSolid: true, dead: true }, expired = { x: 300, y: GROUND - 8, hitSolid: false, dead: true };
  const events = [];
  burstClocks([far, expired], [enemy], 1, events); assert.equal(enemy.hp, ENEMY.hp);
  burstClocks([near], [enemy], 1, events); assert.equal(enemy.hp, ENEMY.hp - 1);
  burstClocks([near], [enemy], 1.5, events); assert.equal(enemy.stunT, CLOCK.stun, '둘 다 맞으면 스턴');
  // 투사체 진행이 바닥 접촉을 hitSolid 로 표시한다
  const falling = [{ x: 300, y: GROUND - 20, vx: 0, vy: 300, life: 2 }];
  const left = updateProjectiles(level, falling, 0.1, CLOCK.w, CLOCK.h, CLOCK.gravity);
  assert.equal(left.length, 0); assert.equal(falling[0].hitSolid, true);
});
