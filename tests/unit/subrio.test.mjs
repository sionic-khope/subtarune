// 섭리오 코어 규칙(2026-09-15 브리핑 + 167 확장): 충돌·점프·앉기·창 탭/차징·불·시계 스턴·CS 미니언·따라오기(낭떠러지 점프)·스테이지·보스. DOM 없이 순수 함수만 검사한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel, makeActor, stepActor, moveBody, overlapsSolid, followerIntent, updateSpears, updateProjectiles, frameOf, cameraX, pitAhead, MONSTERS,
  STAGES, reachedGoal, makeBoss, stepBoss, hitBoss, hurtActor, bossHitbox, bossFrame, rectsOverlap, brandThink, zileanThink, clockVelocity,
  makeEnemy, stepEnemy, damageEnemy, heroTouchesEnemy, enemyFrame, nearestTarget,
  TILE, STAND_H, CROUCH_H, VIEW_W, SPEAR, FIRE, CLOCK, ENEMY, BOSS, WATER_W, WATER_H, NO_INTENT,
  BOSS_INTRO, RESULT, RESULT_ROWS, makeStats, formatStat, resultView, bossHookBox, hookActor, BOSS_PATTERN_ENRAGED, bossSlamZones } from '../../src/scenes/subrio-core.js';

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
  for (let i = 0; i < 40; i++) spears = updateSpears(buildLevel(1), spears, 1 / 60);
  assert.equal(spears.length, 1); assert.ok(spears[0].x > strong.x + 350, '강창은 0.67초에 350px 넘게 간다(1-1 계단에 박히기 직전)');
  const wall = [{ x: 35 * TILE - 30, y: 8 * TILE, vx: 380, life: 1.1 }];
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
  assert.ok(arena.width > VIEW_W && arena.width - VIEW_W <= 128, '1-4 는 한 화면보다 살짝 넓다(BUILD172, 카메라가 조금 따라감)');
  assert.equal(arena.solidAt(0, 10), true, '왼쪽 벽'); assert.equal(arena.solidAt(arena.cols - 1, 10), true, '오른쪽 벽');
  assert.equal(arena.solidAt(4, 14), true, '왼쪽 발판'); assert.equal(arena.solidAt(31, 14), true, '오른쪽 발판'); assert.equal(arena.solidAt(14, 10), true, '가운데 발판');
  assert.equal(arena.solidAt(10, 10), true, '가운데 발판은 10열부터(옆 발판 끝 x112 에서 틈 48px)'); assert.equal(arena.solidAt(9, 10), false);
  assert.equal(arena.bossSpawnX, arena.width / 2, '보스는 가운데(오프닝 내려찍기)');
  assert.equal(arena.solidAt(25, 10), true, '가운데 발판은 25열까지(오른쪽 발판 끝 x464 에서 틈 48px)'); assert.equal(arena.solidAt(26, 10), false);
  assert.equal(arena.solidAt(14, 11), false); assert.equal(arena.solidAt(14, 17), false);
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

test('test_subrio_boss_lands_roars_chases_swings_in_reach_and_leaps_when_far', () => {
  const level = buildLevel(4);
  const hero = settle(level, makeActor('p', 60, GROUND));
  const boss = makeBoss(level.bossSpawnX, GROUND); boss.grounded = true; boss.state = 'roar';
  const events = [];
  for (let i = 0; i < 100; i++) stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'chase'); assert.equal(boss.facing, -1, '주인공 쪽(왼쪽)을 본다');
  const startX = boss.x;
  let swung = false;
  for (let i = 0; i < 60 * 8 && !swung; i++) { stepBoss(level, boss, hero, 1 / 60, events); swung = events.some(e => e.type === 'swing'); }
  assert.ok(swung, '사거리 안에 들어오면 휘두른다'); assert.ok(boss.x < startX);
  assert.equal(boss.state, 'swing');
  const box = bossHitbox(boss);
  assert.ok(box && box.x + box.w <= boss.x + 10 && rectsOverlap(box, hero), '도끼 판정이 주인공 쪽 앞에 있고 주인공에 닿는다');
  assert.equal(bossFrame(boss), 5);
  // 물줄기(에너지파) 없음: 주인공이 반대편으로 가면 그쪽으로 따라오고, 발판 아래를 지나며, 물 사건은 한 번도 없다
  hero.x = 20; hero.y = GROUND - STAND_H;
  boss.x = 300;
  for (let i = 0; i < 60 * 6; i++) stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(events.some(e => e.type === 'water'), false, '에너지파(물줄기)는 없다');
  assert.ok(boss.x < 200, `주인공 쪽(왼쪽)으로 따라온다 x=${Math.round(boss.x)}`);
  assert.equal(boss.y + boss.h, GROUND, '가운데 발판 아래를 지나 바닥에 서 있다');
  assert.ok(typeof bossFrame(boss) === 'number');
});

test('test_subrio_boss_takes_one_damage_per_hit_with_cooldown_and_dies_at_zero', () => {
  const boss = makeBoss(400, GROUND); boss.state = 'chase';
  const events = [];
  assert.equal(hitBoss(boss, events), true); assert.equal(boss.hp, BOSS.hp - 1);
  assert.equal(hitBoss(boss, events), false, '연속 판정 방지');
  assert.ok(boss.flash > 0, '맞은 직후 번쩍(프레임은 그대로 — 땀방울 프레임 안 씀)');
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

test('test_subrio_hurt_reports_damage_amount_per_source_and_demo_minion_stays_put', () => {
  const level = buildLevel(4);
  const hero = settle(level, makeActor('p', 150, GROUND));
  const events = [];
  hurtActor(hero, hero.x + 40, events, 12);
  assert.equal(events.find(e => e.type === 'hurt').damage, 12, '피해량이 사건에 실린다');
  const walker = makeEnemy('cs_blue', 240, GROUND);
  const side = settle(level, makeActor('s', 240 - 14, GROUND));
  const ev2 = [];
  heroTouchesEnemy(side, walker, 2, ev2);
  assert.equal(ev2.find(e => e.type === 'hurt').damage, 6, '몬스터 접촉은 6');
  // 시범용 미니언은 걷지 않는다
  const tutorial = buildLevel(0);
  const spec = tutorial.enemies.find(e => e.demo);
  const demo = makeEnemy(spec.type, spec.x, spec.y, -1, spec);
  for (let i = 0; i < 120; i++) stepEnemy(tutorial, demo, 1 / 60);
  assert.equal(demo.x, Math.round(spec.x - demo.w / 2), '제자리'); assert.equal(demo.hp, 1);
  assert.equal(Math.floor(spec.x / TILE), 56, '화면 가운데쯤(56열)');
});

// ── 보스 패턴(거슨전 참고)·슬로우·샘물·레드/블루 던지기 (2026-09-15) ──
import { BOSS_PATTERN, bossAttackHero, bossSpinCircle, bossSlamZone, springNear, SLOW_MOVE, MOVE_SPEED } from '../../src/scenes/subrio-core.js';

test('test_subrio_boss_pattern_cycles_swing_spin_and_teleport_slam_with_zones', () => {
  const level = buildLevel(4);
  const hero = settle(level, makeActor('p', 150, GROUND));
  const boss = makeBoss(level.bossSpawnX, GROUND); boss.grounded = true; boss.state = 'roar';
  const events = [];
  const run = (frames, cond) => { for (let i = 0; i < frames; i++) { stepBoss(level, boss, hero, 1 / 60, events); bossAttackHero(boss, hero, events); if (cond && cond()) return true; } return false; };
  assert.deepEqual(BOSS_PATTERN.slice(0, 4), ['swing', 'hook', 'spin', 'slam'], '평타·찌르기·회전·내려찍기(BUILD172 찌르기 추가)');
  // 1·2번째 행동: 평타(도끼) — 맞으면 슬로우
  hero.invuln = 0;
  assert.ok(run(60 * 10, () => events.some(e => e.type === 'swing')), '첫 행동 평타');
  assert.ok(run(60 * 2, () => events.some(e => e.type === 'slowed')), '평타에 맞으면 슬로우');
  assert.ok(hero.slowT > 0);
  // 3번째: 회전 — 1초 경고(빨간 원) 뒤 회전, 원 안이면 피해
  hero.invuln = 0; hero.hurtT = 0; hero.slowT = 0;
  // 2번째 행동(찌르기)은 별도 테스트 — 여기선 회전으로 건너뛴다
  Object.assign(boss, { seq: BOSS_PATTERN.indexOf('spin'), state: 'chase', stateT: 0.5, pulling: null, forceSwing: false });
  assert.ok(run(60 * 12, () => boss.state === 'spinWind'), '회전 예비'); const windT0 = boss.stateT;
  const circle = bossSpinCircle(boss); assert.equal(circle.r, BOSS.spinRadius);
  assert.ok(run(60 * 2, () => boss.state === 'spin'), '1초 뒤 회전'); assert.ok(events.some(e => e.type === 'bossSpinWind') && events.some(e => e.type === 'bossSpin'));
  void windT0;
  // 4번째: 순간이동 → 영역 표시 → 낙하 → 착지(띠 안이면 피해)
  hero.invuln = 0; hero.hurtT = 0;
  assert.ok(run(60 * 6, () => boss.state === 'marker'), '순간이동 뒤 영역 표시'); assert.equal(boss.hidden, true);
  const zone = bossSlamZone(boss); assert.ok(zone && Math.abs(zone.x + zone.w / 2 - (hero.x + hero.w / 2)) < 2, '영역은 주인공 머리 위');
  assert.ok(run(60 * 3, () => { if (boss.state === 'dive') { hero.invuln = 0; hero.hurtT = 0; } return boss.state === 'slam'; }), '미끄러져 내려와 착지'); assert.equal(boss.hidden, false);
  assert.equal(boss.y + boss.h, hero.y + hero.h, '주인공이 선 면(바닥)에 내려온다 — 발판을 통과');
  assert.ok(events.some(e => e.type === 'bossMarker') && events.some(e => e.type === 'bossDive') && events.some(e => e.type === 'bossSlam'));
  assert.ok(events.filter(e => e.type === 'hurt').some(e => e.damage === BOSS.slamDamage), '띠 안에 서 있던 주인공은 내려찍기 피해');
  assert.equal(events.some(e => e.type === 'water'), false);
  assert.ok(BOSS.hp >= 100, '3~4분 싸울 체력');
});

test('test_subrio_slow_halves_move_speed_and_spring_heal_is_near_mid_and_end_of_each_stage', () => {
  const level = buildLevel(1);
  const fast = settle(level, makeActor('a', 40, GROUND)), slowed = settle(level, makeActor('b', 40, GROUND));
  slowed.slowT = 3;
  for (let i = 0; i < 60; i++) { stepActor(level, fast, { ...NONE, right: true }, 1 / 60); stepActor(level, slowed, { ...NONE, right: true }, 1 / 60); }
  assert.ok(Math.abs(slowed.vx - MOVE_SPEED * SLOW_MOVE) < 4, `슬로우 속도 ${slowed.vx}`); assert.ok(fast.vx > slowed.vx * 1.8);
  for (const stage of [1, 2, 3]) {
    const lv = buildLevel(stage);
    assert.equal(lv.springs.length, 2, `stage ${stage} 샘물 둘`);
    assert.ok(lv.springs[0].x > lv.width * 0.4 && lv.springs[0].x < lv.width * 0.6, '중간');
    assert.ok(lv.goal.x - lv.springs[1].x < 80 && lv.springs[1].x < lv.goal.x, '깃발 바로 앞');
    for (const sp of lv.springs) assert.equal(lv.solidAt(Math.floor(sp.x / TILE), sp.y / TILE), true, '샘물은 땅 위');
    const hero = makeActor('h', lv.springs[0].x + 10, lv.springs[0].y);
    assert.equal(springNear(lv, hero), lv.springs[0]); hero.x += 60; assert.equal(springNear(lv, hero), null);
  }
});

test('test_subrio_red_and_blue_throw_projectiles_at_the_hero_and_have_double_hp', () => {
  const level = buildLevel(4);
  const hero = settle(level, makeActor('p', 150, GROUND));
  const red = makeEnemy('red', 330, GROUND), blue = makeEnemy('blue', 330, GROUND);
  assert.equal(red.hp, 12); assert.equal(blue.hp, 14); assert.equal(MONSTERS.krug.name, '돌거북');
  const events = [];
  for (let i = 0; i < 60 * 3; i++) { stepEnemy(level, red, 1 / 60, events, hero); stepEnemy(level, blue, 1 / 60, events, hero); }
  const throws = events.filter(e => e.type === 'enemyThrow');
  assert.ok(throws.some(t => t.kind === 'red') && throws.some(t => t.kind === 'blue'), '둘 다 던진다');
  assert.ok(throws.every(t => t.vx < 0 && t.vy < 0), '주인공 쪽(왼쪽)으로 포물선');
  const shot = { ...throws[0], life: 2.6 };
  let list = [shot], hitAt = null;
  for (let i = 0; i < 90 && !hitAt; i++) { list = updateProjectiles(level, list, 1 / 60, 14, 14, ENEMY.throwGravity); if (list[0] && rectsOverlap({ x: list[0].x, y: list[0].y, w: 14, h: 14 }, hero)) hitAt = i; }
  assert.ok(hitAt !== null, '던진 것이 주인공에 닿는다');
});

test('test_subrio_boss_is_immune_during_patterns_and_vulnerable_in_the_recovery_window', () => {
  const boss = makeBoss(300, GROUND);
  const events = [];
  boss.state = 'spin'; assert.equal(hitBoss(boss, events), false); assert.ok(events.some(e => e.type === 'bossImmune'));
  boss.state = 'dive'; assert.equal(hitBoss(boss, events), false);
  boss.state = 'recover'; boss.hitCooldown = 0; assert.equal(hitBoss(boss, events), true);
  boss.state = 'chase'; boss.hitCooldown = 0; assert.equal(hitBoss(boss, events), true);
  assert.ok(BOSS.recoverAfter.slam > BOSS.recoverAfter.swing, '내려찍기 뒤 틈이 가장 길다');
  assert.ok(BOSS.swingDamage <= 8 && BOSS.slamDamage <= 10, '공격력은 낮춤');
});

test('test_subrio_boss_slam_marker_stays_inside_the_arena_walls', () => {
  const level = buildLevel(4);
  const hero = settle(level, makeActor('p', 24, GROUND));
  const boss = makeBoss(level.bossSpawnX, GROUND); boss.grounded = true; boss.state = 'vanish'; boss.stateT = BOSS.vanish; boss.lastAction = 'slam';
  const events = [];
  stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'marker');
  assert.ok(boss.x >= TILE, `보스 몸이 왼쪽 벽 안쪽 x=${boss.x}`);
  for (let i = 0; i < 60 * 4 && boss.state !== 'slam'; i++) stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'slam'); assert.equal(boss.y + boss.h, boss.markerY, '영역 표시한 착지면에 내려온다');
  assert.ok([14 * TILE, GROUND].includes(boss.markerY), '벽 위(80)가 아니라 발판(224) 또는 바닥(288)');
});

test('test_subrio_stage_1_4_uses_grey_castle_tiles_silences_bgm_and_has_the_intro_script', async () => {
  const { BOSS_INTRO } = await import('../../src/scenes/subrio-core.js');
  assert.ok(STAGES[4].tiles.includes('castle'), '회색 쿠파성 타일');
  assert.equal(BOSS_INTRO.before.length, 2); assert.equal(BOSS_INTRO.voice[0].who, 'bidet'); assert.equal(BOSS_INTRO.after.length, 3);
  assert.ok(BOSS_INTRO.split.gyeongsub < 0 && BOSS_INTRO.split.hyungsub > 0 && BOSS_INTRO.split.ppaman > 0, '경섭 왼쪽, 요플래·억빠맨 오른쪽(가운데 기준 오프셋)');
  const level = buildLevel(4);
  const hero = settle(level, makeActor('p', 150, GROUND));
  const boss = makeBoss(232, GROUND); boss.grounded = true; boss.state = 'intro';
  for (let i = 0; i < 60; i++) stepBoss(level, boss, hero, 1 / 60);
  assert.equal(boss.state, 'intro'); assert.equal(boss.x, 232 - 36, '오프닝 동안 제자리');
  assert.equal(hitBoss(boss), false, '오프닝엔 안 맞는다');
});

test('test_subrio_boss_hits_slow_followers_without_hp_and_center_platform_is_reachable_from_the_side', () => {
  const level = buildLevel(4);
  const follower = settle(level, makeActor('gyeongsub', 200, GROUND));
  const boss = makeBoss(232, GROUND); boss.grounded = true; boss.state = 'spin'; boss.stateT = 0.1;
  const events = [];
  assert.equal(bossAttackHero(boss, follower, events, true), true);
  const hurt = events.find(e => e.type === 'hurt'); assert.equal(hurt.damage, 0, '동료는 체력이 안 깎인다'); assert.ok(follower.slowT > 0, '동료도 슬로우');
  assert.equal(bossAttackHero(boss, follower, events, true), false, '같은 동작엔 한 번');
  // 옆 발판(14행 위, x100)에서 오른쪽으로 꾹 점프 → 가운데 발판(10행) 위에 선다
  const hero = makeActor('p', 92, 14 * TILE); hero.grounded = true;
  for (let i = 0; i < 20; i++) stepActor(level, hero, NONE, 1 / 60);
  for (let i = 0; i < 8; i++) stepActor(level, hero, { ...NONE, right: true }, 1 / 60);
  assert.equal(hero.y + hero.h, 14 * TILE, '옆 발판 위(끝에서 달리는 중)');
  let landed = false;
  for (let i = 0; i < 90; i++) { stepActor(level, hero, { ...NONE, right: true, jump: i === 0, jumpHeld: true }, 1 / 60); if (hero.grounded && hero.y + hero.h === 10 * TILE) { landed = true; break; } }
  assert.equal(landed, true, `가운데 발판에 착지 (x=${Math.round(hero.x)}, feet=${hero.y + hero.h})`);
});

test('test_subrio_boss_enrages_at_half_hp_with_faster_timings_and_a_ppaman_line', async () => {
  const { bossTiming, BOSS_ENRAGE, BOSS_PATTERN_ENRAGED } = await import('../../src/scenes/subrio-core.js');
  const boss = makeBoss(232, GROUND); boss.state = 'chase';
  const events = [];
  const normal = bossTiming(boss);
  while (boss.hp > boss.maxHp * 0.5) { boss.hitCooldown = 0; hitBoss(boss, events); }
  assert.equal(boss.enraged, true); assert.equal(events.filter(e => e.type === 'bossEnrage').length, 1, '격노는 한 번');
  const fast = bossTiming(boss);
  assert.ok(fast.windup < normal.windup && fast.spinWind < normal.spinWind && fast.marker < normal.marker && fast.speed > normal.speed);
  assert.equal(fast.pattern, BOSS_PATTERN_ENRAGED); assert.ok(BOSS_PATTERN_ENRAGED.filter(a => a !== 'swing').length > BOSS_PATTERN.filter(a => a !== 'swing').length, '특수기 비중이 는다');
  assert.equal(BOSS_ENRAGE.line.text, '거의 다 왔어요 족쳐'); assert.equal(BOSS_ENRAGE.line.who, 'ppaman');
});

// ── BUILD172: 결과창·넓어진 보스 무대·발판 아래 점프 금지 ──
test('test_subrio_result_view_reveals_title_rows_then_stamp_and_formats_time', () => {
  const stats = { ...makeStats(), time: 221.3, spears: 231, kills: 87, hits: 12, falls: 2, downs: 1, mushrooms: 3 };
  const start = resultView(0, stats);
  assert.equal(start.title, false); assert.ok(start.rows.every(row => !row.shown)); assert.equal(start.stamp, 0);
  const titled = resultView(RESULT.titleAt + 0.01, stats); assert.equal(titled.title, true); assert.equal(titled.rows[0].shown, false);
  const mid = resultView(RESULT.rowsFrom + RESULT.count / 2, stats);
  assert.equal(mid.rows[0].shown, true); assert.ok(mid.rows[0].k > 0 && mid.rows[0].k < 1, '숫자가 올라가는 중'); assert.equal(mid.rows[1].shown, false, '줄은 차례로');
  const all = resultView(RESULT.rowsFrom + (RESULT_ROWS.length - 1) * RESULT.rowEvery + RESULT.count, stats);
  assert.ok(all.rowsDone); assert.deepEqual(all.rows.map(row => row.text), ['03:41.3', '231', '87', '12', '2', '1', '3']);
  assert.equal(all.stamp, 0, '도장은 줄이 다 찬 뒤');
  const stamped = resultView(all.stampAt + RESULT.stampTime, stats);
  assert.equal(stamped.stamp, 1); assert.equal(stamped.stampDone, true); assert.equal(stamped.canSkip, false); assert.equal(stamped.rank, 'S+');
  const skippable = resultView(all.stampAt + RESULT.stampTime + RESULT.skipAfter, stats); assert.equal(skippable.canSkip, true); assert.equal(skippable.finished, false);
  const end = resultView(all.stampAt + RESULT.stampTime + RESULT.hold, stats); assert.equal(end.finished, true);
  assert.ok(all.stampAt + RESULT.stampTime + RESULT.hold >= 10, '사람이 읽을 시간(10초 이상)');
  assert.equal(formatStat({ time: true }, 0), '00:00.0'); assert.equal(formatStat({ time: true }, 65.04), '01:05.0'); assert.equal(formatStat({}, 7.6), '8');
});

test('test_subrio_boss_arena_is_wider_with_reachable_center_platform_and_boss_floor_span', () => {
  const level = buildLevel(4);
  assert.equal(level.cols, 36); assert.ok(level.width > VIEW_W, '한 화면보다 살짝 넓어 카메라가 따라간다');
  assert.equal(level.solidAt(0, 5), true); assert.equal(level.solidAt(35, 5), true);
  // 양옆 발판 14행(2~6·29~33), 가운데 발판 10행(10~25): 발판 끝과 가운데 발판 사이 틈은 3칸(48px)
  assert.equal(level.solidAt(6, 14), true); assert.equal(level.solidAt(7, 14), false); assert.equal(level.solidAt(29, 14), true); assert.equal(level.solidAt(28, 14), false);
  assert.equal(level.solidAt(10, 10), true); assert.equal(level.solidAt(25, 10), true); assert.equal(level.solidAt(9, 10), false); assert.equal(level.solidAt(26, 10), false);
  assert.deepEqual(level.arena.floor, [7 * TILE, 29 * TILE]);
  assert.deepEqual(level.arena.overhang, [{ row: 10, x0: 10 * TILE, x1: 15 * TILE }, { row: 10, x0: 21 * TILE, x1: 26 * TILE }]);
  for (let col = 15; col <= 20; col++) assert.equal(level.solidAt(col, 10), false, `가운데(15~20열)는 하늘이 트여 있다 ${col}`);
  assert.equal(level.solidAt(14, 10), true); assert.equal(level.solidAt(21, 10), true);
  assert.equal(level.bossSpawnX, level.width / 2);
  // 오프닝에서 갈라지는 자리는 가운데 기준 오프셋: 요플래·억빠맨은 가운데 발판 끝(x416)과 오른쪽 발판(x464) 사이 바닥, 경섭은 왼쪽 틈
  const cx = level.width / 2;
  for (const id of ['hyungsub', 'ppaman']) { const x = cx + BOSS_INTRO.split[id]; assert.ok(x > cx + BOSS.slamZoneW / 2 + 40 && x < level.arena.floor[1], `${id} 는 내려찍기 띠 밖 오른쪽 바닥 ${x}`); }
  const left = cx + BOSS_INTRO.split.gyeongsub; assert.ok(left < cx - BOSS.slamZoneW / 2 - 40 && left > level.arena.floor[0], `gyeongsub 는 띠 밖 왼쪽 바닥 ${left}`);
  // 먼저 가운데로 모이는 자리는 셋이 겹치지 않게 벌어져 있고 전부 내려찍기 띠 안
  const gatherXs = ['hyungsub', 'gyeongsub', 'ppaman'].map(id => cx + BOSS_INTRO.gather[id]).sort((a, b) => a - b);
  assert.ok(gatherXs[1] - gatherXs[0] >= 24 && gatherXs[2] - gatherXs[1] >= 24); assert.ok(gatherXs.every(x => Math.abs(x - cx) <= BOSS.slamZoneW / 2));
  // 내려찍기 자리 클램프: 바닥이면 양옆 발판 아래를 피한다
  const boss = makeBoss(60, 18 * TILE); boss.state = 'vanish'; boss.stateT = BOSS.vanish; boss.grounded = true;
  const hero = makeActor('h', 40, 18 * TILE); hero.grounded = true;
  const events = [];
  stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'marker');
  assert.ok(boss.markerX >= 7 * TILE + BOSS.w / 2, `왼쪽 발판 아래를 피한다 ${boss.markerX}`);
});

test('test_subrio_boss_does_not_jump_when_a_platform_is_over_its_head', () => {
  const level = buildLevel(4);
  // 가운데 왼쪽 발판(10~14열) 아래 바닥에 선 보스, 주인공은 그 발판 위
  const under = makeBoss(12.5 * TILE, 18 * TILE); under.state = 'chase'; under.stateT = 1; under.grounded = true; under.seq = 0;
  const above = makeActor('h', 12.5 * TILE, 10 * TILE); above.grounded = true;
  const events = [];
  for (let i = 0; i < 30; i++) stepBoss(level, under, above, 1 / 60, events);
  assert.ok(!events.some(event => event.type === 'bossJump'), '가운데 발판 아래에선 뛰지 않는다(머리 끼임)');
  assert.ok(overlapsSolid(level, under.x, under.y - BOSS.jumpClear, under.w, BOSS.jumpClear), '머리 위 6칸 안에 발판');
  // 같은 자리라도 머리 위가 트여 있으면(발판 없는 평지) 뛴다
  const flat = { ...level, solidAt: (tx, ty) => ty >= 18 && tx >= 0 && tx < level.cols };
  const open = makeBoss(12.5 * TILE, 18 * TILE); open.state = 'chase'; open.stateT = 1; open.grounded = true; open.seq = 0;
  const openEvents = [];
  for (let i = 0; i < 30; i++) stepBoss(flat, open, above, 1 / 60, openEvents);
  assert.ok(openEvents.some(event => event.type === 'bossJump'), '위가 트여 있으면 뛴다');
});

test('test_subrio_boss_hook_thrusts_forward_and_pulls_the_hero_to_its_front_then_swings', () => {
  const level = buildLevel(4);
  assert.ok(BOSS_PATTERN.includes('hook') && BOSS_PATTERN_ENRAGED.includes('hook'), '평소·격노 패턴 둘 다 찌르기가 있다');
  const boss = makeBoss(200, 18 * TILE); boss.state = 'chase'; boss.stateT = 1; boss.grounded = true; boss.seq = BOSS_PATTERN.indexOf('hook');
  const hero = makeActor('h', 200 + 150, 18 * TILE); hero.grounded = true; hero.facing = -1;
  const events = [];
  stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'hookWind', '사정거리 안·같은 높이면 찌르기 예비'); assert.ok(events.some(e => e.type === 'bossHookWind'));
  assert.equal(bossHookBox(boss), null, '예비 중엔 판정 없음'); assert.ok(bossHookBox(boss, true).w === BOSS.hookReach);
  for (let i = 0; i < 40 && boss.state === 'hookWind'; i++) stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'hook'); assert.ok(events.some(e => e.type === 'bossHook'));
  const box = bossHookBox(boss); assert.ok(box.x >= boss.x + boss.w - 8 && box.w === BOSS.hookReach, '앞으로 뻗는 띠');
  assert.ok(rectsOverlap(box, hero), '150px 앞의 주인공에 닿는다');
  assert.equal(bossAttackHero(boss, hero, events), true);
  assert.ok(events.some(e => e.type === 'bossHooked') && events.some(e => e.type === 'hurt' && e.damage === BOSS.hookDamage), '끌려가며 피해');
  const startX = hero.x;
  for (let i = 0; i < 30 && boss.state !== 'recover'; i++) { stepBoss(level, boss, hero, 1 / 60, events); stepActor(level, hero, NO_INTENT, 1 / 60); }
  assert.equal(boss.state, 'recover');
  assert.ok(hero.x < startX - 60 && Math.abs(hero.x - (boss.x + boss.w + 4)) <= 6, `보스 앞까지 끌려온다 ${hero.x} vs ${boss.x + boss.w + 4}`);
  assert.equal(boss.forceSwing, true, '끌어당긴 뒤엔 평타');
  for (let i = 0; i < 60 && boss.state === 'recover'; i++) stepBoss(level, boss, hero, 1 / 60, events);
  for (let i = 0; i < 5 && boss.state === 'chase'; i++) stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'windup', '회복 뒤 곧바로 평타 예비');
  // 방패로 마주 보면 막힌다(끌리지 않음)
  const boss2 = makeBoss(200, 18 * TILE); boss2.state = 'hook'; boss2.stateT = 0; boss2.grounded = true; boss2.facing = 1;
  const guard = makeActor('g', 300, 18 * TILE); guard.grounded = true; guard.facing = -1; guard.state = 'guard';
  const ev2 = [];
  assert.equal(hookActor(boss2, guard, ev2), false); assert.ok(ev2.some(e => e.type === 'block')); assert.equal(boss2.pulling, null);
  // 동료는 슬로우만
  const mate = makeActor('m', 300, 18 * TILE); mate.grounded = true;
  const ev3 = [];
  hookActor(boss2, mate, ev3, true); assert.ok(ev3.some(e => e.type === 'slowed')); assert.equal(boss2.pulling, null);
});

test('test_subrio_boss_spin_is_wider_and_heals_the_boss_when_it_hits_the_hero', () => {
  assert.ok(BOSS.spinRadius >= 130 && BOSS.spinRange >= 190, '회전베기 범위가 넓다');
  const boss = makeBoss(288, 18 * TILE); boss.state = 'spin'; boss.stateT = 0.3; boss.grounded = true; boss.hp = 50;
  const hero = makeActor('h', 288 + 110, 18 * TILE); hero.grounded = true;
  const events = [];
  assert.equal(bossAttackHero(boss, hero, events), true, '110px 밖도 회전 반경 안');
  assert.equal(boss.hp, 50 + BOSS.spinHeal); assert.ok(events.some(e => e.type === 'bossHeal' && e.amount === BOSS.spinHeal));
  boss.hp = boss.maxHp; boss.hitIds = new Set(); boss.stateT = 0.5;
  const hero2 = makeActor('h2', 288 + 90, 18 * TILE); hero2.grounded = true;
  bossAttackHero(boss, hero2, events); assert.equal(boss.hp, boss.maxHp, '최대치를 넘지 않는다');
  boss.hitIds = new Set(); boss.stateT = 0.6;
  const mate = makeActor('m', 288 - 90, 18 * TILE); mate.grounded = true;
  const before = boss.hp; boss.hp = 40; const ev2 = [];
  bossAttackHero(boss, mate, ev2, true); assert.equal(boss.hp, 40, '동료에게 맞은 건 회복 없음'); assert.ok(!ev2.some(e => e.type === 'bossHeal'));
});

test('test_subrio_boss_hook_can_be_ducked_under_or_jumped_over', () => {
  const boss = makeBoss(200, 18 * TILE); boss.state = 'hook'; boss.stateT = 0; boss.grounded = true; boss.facing = 1;
  const box = bossHookBox(boss);
  const standing = makeActor('s', 330, 18 * TILE); assert.ok(rectsOverlap(box, standing), '서 있으면 닿는다');
  const ducking = { ...standing, h: CROUCH_H, y: 18 * TILE - CROUCH_H }; assert.equal(rectsOverlap(box, ducking), false, '앉으면 밑으로 피한다');
  const jumping = { ...standing, y: standing.y - 70 }; assert.equal(rectsOverlap(box, jumping), false, '점프하면 위로 피한다');
});

test('test_subrio_enraged_slam_drops_three_times_staggered_and_each_zone_hits', () => {
  assert.equal(BOSS.hp, 135, 'BUILD173: 30초쯤 더 버티도록 체력 110 → 135 (회복 틈은 그대로)');
  assert.deepEqual(BOSS.recoverAfter, { swing: 0.8, spin: 1.6, slam: 1.8, hook: 0.35 }, '회복 틈은 안 건드린다');
  const level = buildLevel(4);
  const hero = makeActor('h', level.width / 2, 18 * TILE); hero.grounded = true;
  // 격노 전: 그림자 없음
  const calm = makeBoss(120, 18 * TILE); calm.state = 'vanish'; calm.stateT = BOSS.vanish; calm.grounded = true;
  stepBoss(level, calm, hero, 1 / 60, []); assert.equal(calm.state, 'marker'); assert.equal(calm.extraSlams.length, 0);
  // 격노: 본체 자리 + 양옆 spread 그림자 둘, 착지면은 각자 자리의 바닥/발판
  const boss = makeBoss(120, 18 * TILE); boss.state = 'vanish'; boss.stateT = BOSS.vanish; boss.grounded = true; boss.enraged = true;
  const events = [];
  stepBoss(level, boss, hero, 1 / 60, events);
  assert.equal(boss.state, 'marker'); assert.equal(boss.extraSlams.length, BOSS.slamExtra);
  const xs = boss.extraSlams.map(sh => sh.x).sort((a, b) => a - b);
  assert.ok(xs[0] < boss.markerX && xs[1] > boss.markerX, `양옆 ${xs} 본체 ${boss.markerX}`);
  assert.ok(boss.extraSlams.every(sh => Math.abs(sh.x - boss.markerX) >= BOSS.slamZoneW * 0.6), '본체 띠와 겹치지 않는다');
  assert.ok(boss.extraSlams.every(sh => sh.x - BOSS.w / 2 >= TILE && sh.x + BOSS.w / 2 <= level.width - TILE), '벽 안쪽');
  assert.deepEqual(boss.extraSlams.map(sh => sh.delay), [BOSS.slamStagger, BOSS.slamStagger * 2], '비융·비융·비융 순서로 늦게');
  const marker = events.find(e => e.type === 'bossMarker'); assert.equal(marker.extras.length, 2);
  // 낙하 → 본체 착지 → 그림자 둘이 차례로 착지(팟·팟·팟)
  const timeline = [];
  for (let i = 0; i < 200 && boss.state !== 'recover'; i++) { const ev = []; stepBoss(level, boss, hero, 1 / 60, ev); for (const e of ev) if (['bossDive', 'bossDiveExtra', 'bossSlam', 'bossSlamExtra'].includes(e.type)) timeline.push(e.type); }
  assert.deepEqual(timeline.filter(t => t.startsWith('bossDive')), ['bossDive', 'bossDiveExtra', 'bossDiveExtra'], '비융 세 번');
  assert.deepEqual(timeline.filter(t => t.startsWith('bossSlam')), ['bossSlam', 'bossSlamExtra', 'bossSlamExtra'], '팟 세 번, 본체가 먼저');
  assert.equal(boss.extraSlams.length, 0, '회복 틈에 들어가면 그림자 정리');
  // 그림자 띠 안의 주인공은 그 그림자가 착지하는 순간 피해
  const boss2 = makeBoss(120, 18 * TILE); boss2.state = 'vanish'; boss2.stateT = BOSS.vanish; boss2.grounded = true; boss2.enraged = true;
  stepBoss(level, boss2, hero, 1 / 60, []);
  const shadow = boss2.extraSlams[0];
  const victim = makeActor('v', shadow.x, shadow.y); victim.grounded = true; victim.invuln = 0;
  const ev2 = [];
  let hitAt = null;
  for (let i = 0; i < 200 && boss2.state !== 'recover'; i++) {
    stepBoss(level, boss2, hero, 1 / 60, ev2);
    if (hitAt === null && bossAttackHero(boss2, victim, ev2)) hitAt = boss2.state;
  }
  assert.equal(hitAt, 'slam', '그림자 착지에 맞는다');
  assert.ok(ev2.some(e => e.type === 'hurt' && e.id === 'v' && e.damage === BOSS.slamDamage));
  const zonesNow = bossSlamZones({ ...boss2, state: 'slam', stateT: 0.1, markerX: 200, markerY: 288, extraSlams: [{ x: 400, y: 288, landed: false, started: true, fallY: -100, landedAt: null }], diveT: 0.2 });
  assert.equal(zonesNow.length, 2); assert.equal(zonesNow[0].active, true); assert.equal(zonesNow[1].active, false, '아직 안 떨어진 그림자는 판정 없음');
});
