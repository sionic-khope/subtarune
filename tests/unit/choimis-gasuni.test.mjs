import test from 'node:test';
import assert from 'node:assert/strict';
import { createChoimisGasuniScenario } from '../../src/battle/choimis-gasuni.js';
import { CHOIMIS_GASUNI as C } from '../../src/data/choimis-gasuni.js';
import { CHOIMIS_PINK_SHOOTER, createPinkShot, registerPinkTargetHit } from '../../src/battle/modes/choimis-pink-shooter.js';

function fixture() {
  const soul = { x: 64, y: 159, oldX: 64, oldY: 159, r: 6 };
  const sounds = [], damage = [], contacts = [], effects = [], speech = [];
  let alive = true;
  const images = Object.fromEntries(['boss', 'jeomnye', ...Array.from({ length: 6 }, (_, index) => `gasuni${index + 1}`)]
    .map(id => [id, { id, width: id === 'boss' ? 320 : 512, height: id === 'boss' ? 320 : 512 }]));
  const scenario = createChoimisGasuniScenario({ box: { x: 25, y: 84, w: 430, h: 150 }, soul, images,
    bossAlive: () => alive, hitTarget: registerPinkTargetHit, hit: (x, y) => effects.push({ x, y }),
    hurt: () => { damage.push(15); return true; }, sfx: name => sounds.push(name),
    say: (text, seconds) => speech.push({ text, seconds }),
    bossContact: shot => { if (!registerPinkTargetHit(shot, 'choimis-boss')) return false; contacts.push(shot); return true; },
  });
  return { scenario, soul, images, sounds, damage, contacts, effects, speech, kill: () => { alive = false; } };
}

const crossingShot = (target, charged = false) => ({ oldX: target.x - 45, oldY: target.y,
  x: target.x + 45, y: target.y, r: charged ? 5 : 3, charged });
function advance(run, end, step = 0.02) {
  while (run.scenario.snapshot.elapsed < end) run.scenario.update(Math.min(step, end - run.scenario.snapshot.elapsed), []);
}

test('test_gasuni_gather_has_six_rotating_afterimages_and_no_contact_hazards', () => {
  const run = fixture(); run.scenario.prepare(1); advance(run, 1.2);
  const snapshot = run.scenario.snapshot;
  assert.equal(snapshot.phase, 'gather'); assert.ok(snapshot.spirits.length >= 2);
  assert.ok(snapshot.spirits.some(spirit => Math.abs(spirit.angle) > 1 && spirit.trail.length > 2));
  assert.equal(snapshot.targets.length, 0); assert.deepEqual(run.damage, []);
  advance(run, C.throwAt);
  assert.equal(run.scenario.snapshot.absorbed, 6); assert.ok(run.sounds.includes('power'));
});

test('test_gasuni_individual_warning_locks_aim_then_normal_shot_destroys_target', () => {
  const run = fixture(); advance(run, C.throwAt + 0.1);
  const target = run.scenario.snapshot.targets[0], aim = { ...target.aim };
  assert.equal(target.launched, false); assert.ok(target.warn >= 0.3);
  run.soul.y = 105; run.soul.oldY = 105;
  advance(run, C.throwAt + C.throwWarn + 0.05);
  const flying = run.scenario.snapshot.targets[0];
  assert.deepEqual(flying.aim, aim); assert.ok(flying.x < target.x); assert.equal(flying.launched, true);
  const shot = crossingShot(flying); run.scenario.update(0.001, [shot]);
  assert.equal(shot.dead, true); assert.equal(run.scenario.snapshot.destroyed, 1);
  assert.equal(run.scenario.snapshot.targets.some(item => item.id === target.id), false);
  assert.deepEqual(run.damage, []); assert.equal(run.scenario.done, false);
});

test('test_gasuni_final_jeomnye_requires_twelve_normal_or_four_distinct_charged_hits', () => {
  for (const charged of [false, true]) {
    const run = fixture(); advance(run, C.giantAt + 0.1);
    assert.ok(18 - run.scenario.snapshot.elapsed > 5);
    let giant = run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye');
    assert.equal(giant.kind, 'jeomnye'); assert.equal(giant.hp, 12);
    const count = charged ? 4 : 12;
    for (let index = 0; index < count; index++) {
      giant = run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye');
      const shot = crossingShot(giant, charged); run.scenario.update(0.001, [shot]);
      if (charged && index < count - 1) {
        const hp = run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye').hp;
        run.scenario.update(0.001, [shot]);
        assert.equal(run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye').hp, hp, 'one charged projectile cannot farm damage');
        assert.equal(shot.dead, undefined, 'charged projectile keeps piercing');
      }
      if (index < count - 1) assert.equal(run.scenario.snapshot.giantOutcome, null);
    }
    assert.equal(run.scenario.snapshot.giantOutcome, 'destroyed');
    assert.equal(run.scenario.snapshot.targets.some(target => target.kind === 'jeomnye'), false); assert.equal(run.scenario.done, false);
    advance(run, 17.9); assert.equal(run.scenario.done, false);
  }
});

test('test_gasuni_giant_moves_moderately_on_fixed_lane_with_top_and_bottom_escape_space', () => {
  const run = fixture(); advance(run, C.giantAt + C.giantWarn);
  const before = run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye');
  run.damage.length = 0;
  run.soul.y = 105; run.soul.oldY = 105; advance(run, C.giantAt + C.giantWarn + 1);
  const after = run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye');
  assert.ok(Math.abs(before.x - after.x - 60) < 0.001);
  assert.equal(after.y, before.y); assert.ok(after.y - after.r > 98 + run.soul.r);
  assert.ok(after.y + after.r < 220 - run.soul.r);
  advance(run, 18); assert.deepEqual(run.damage, []);
  run.scenario.stopSpawning(); assert.equal(run.scenario.pending, true);
  advance(run, 20); assert.equal(run.scenario.snapshot.giantOutcome, 'escaped');
  assert.equal(run.scenario.pending, false);
});

test('test_gasuni_contact_expiry_and_shooting_have_distinct_outcomes', () => {
  const run = fixture(); advance(run, C.giantAt + C.giantWarn);
  run.damage.length = 0;
  advance(run, 17.9);
  assert.equal(run.scenario.snapshot.giantOutcome, 'contact'); assert.equal(run.damage.length, 1);
  assert.equal(run.scenario.snapshot.destroyed, 0); assert.equal(run.scenario.done, false);
  const late = fixture(); late.scenario.update(18.1, []);
  assert.deepEqual(late.damage, []); assert.equal(late.scenario.snapshot.targets.length, 0);
  assert.equal(late.scenario.snapshot.phase, 'drain');
});

test('test_gasuni_boss_death_and_dispose_clear_spirits_targets_and_all_late_callbacks', () => {
  for (const stop of ['kill', 'dispose']) {
    const run = fixture(); advance(run, C.giantAt + 0.1);
    if (stop === 'kill') run.kill(); else run.scenario.dispose();
    run.scenario.update(1, [crossingShot(run.scenario.snapshot.boss, true)]);
    const before = [run.sounds.length, run.damage.length, run.contacts.length];
    run.scenario.update(30, []);
    assert.deepEqual([run.sounds.length, run.damage.length, run.contacts.length], before);
    assert.deepEqual(run.scenario.snapshot.targets, []); assert.deepEqual(run.scenario.snapshot.spirits, []);
  }
});

test('test_gasuni_render_uses_existing_sheet_cells_and_boss_contact_uses_shared_callback', () => {
  const run = fixture(); run.scenario.prepare(1); advance(run, 1);
  const calls = [], ctx = new Proxy({}, { get: (object, key) => object[key] ?? ((...args) => calls.push([key, ...args])),
    set: (object, key, value) => { object[key] = value; return true; } });
  run.scenario.draw(ctx);
  assert.ok(calls.some(call => call[0] === 'drawImage' && call[1].id.startsWith('gasuni') && call[4] === 128 && call[5] === 128));
  const boss = run.scenario.snapshot.boss; run.scenario.update(0.001, [crossingShot(boss, true)]);
  assert.equal(run.contacts.length, 1);
});

test('test_gasuni_giant_can_be_broken_with_real_shot_travel_before_reaching_the_heart', () => {
  for (const charged of [false, true]) {
    const run = fixture(); advance(run, C.giantAt); run.damage.length = 0;
    let nextShot = C.giantAt + (charged ? 0.6 : 0), shots = [], fired = 0;
    while (run.scenario.snapshot.elapsed < 17.5 && run.scenario.snapshot.giantOutcome === null) {
      const target = run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye');
      if (run.scenario.snapshot.elapsed >= nextShot) {
        shots.push(createPinkShot(run.soul.x + 11, target.y, charged)); fired++;
        nextShot += charged ? 0.62 : 0.3;
      }
      for (const shot of shots) { shot.oldX = shot.x; shot.oldY = shot.y; shot.x += CHOIMIS_PINK_SHOOTER.shotSpeed / 120; }
      run.scenario.update(1 / 120, shots);
      shots = shots.filter(shot => !shot.dead && shot.x < 470);
    }
    assert.equal(run.scenario.snapshot.giantOutcome, 'destroyed');
    assert.ok(fired >= (charged ? 4 : 12)); assert.deepEqual(run.damage, []);
  }
});

test('test_gasuni_jeomnye_callout_occurs_once_at_launch_without_stopping_movement', () => {
  const run = fixture(); advance(run, C.giantAt + C.giantWarn - 0.01);
  assert.deepEqual(run.speech, []);
  run.scenario.update(0.02, []);
  assert.deepEqual(run.speech, [{ text: '점례야!', seconds: 1.6 }]);
  const before = run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye').x;
  run.scenario.update(0.2, []);
  assert.ok(run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye').x < before);
  assert.equal(run.speech.length, 1);
});

test('test_gasuni_crossing_followup_has_staggered_warning_and_separate_locked_aim', () => {
  const run = fixture(); advance(run, C.throwAt + C.throwEvery + 0.01);
  const primary = run.scenario.snapshot.targets.find(target => target.id === 'gasuni-throw-1');
  run.soul.y = 100; run.soul.oldY = 100;
  advance(run, primary.born + C.crossStagger + 0.01);
  const cross = run.scenario.snapshot.targets.find(target => target.id === 'gasuni-cross-1');
  assert.ok(cross); assert.equal(cross.launched, false); assert.ok(cross.warn >= 0.3);
  assert.ok(Math.abs(cross.born - primary.born - 0.32) < 1e-8);
  assert.equal(Math.abs(cross.aim.y - primary.aim.y), 46);
  assert.ok((cross.startY - primary.startY) * (cross.aim.y - primary.aim.y) < 0, 'ordered endpoints reverse so routes cross');
  const aim = { ...cross.aim }; advance(run, cross.born + cross.warn + 0.01);
  assert.deepEqual(run.scenario.snapshot.targets.find(target => target.id === cross.id).aim, aim);
});

test('test_gasuni_stop_spawning_drains_existing_target_without_late_births_or_callouts', () => {
  const run = fixture(); advance(run, C.throwAt + 0.1);
  const before = run.scenario.snapshot.targets[0]; run.scenario.stopSpawning();
  assert.equal(run.scenario.pending, true);
  advance(run, C.throwAt + 4);
  assert.equal(run.scenario.pending, false); assert.equal(run.scenario.snapshot.targets.length, 0);
  advance(run, 19); assert.deepEqual(run.speech, []);
  assert.equal(run.scenario.snapshot.giantOutcome, null);
  assert.equal(run.scenario.snapshot.contacted + run.scenario.snapshot.escaped + run.scenario.snapshot.expired, 1);
  assert.equal(before.kind, 'gasuni1');
});

test('test_gasuni_staggered_crossfire_pressures_stationary_lanes_but_has_a_speed_limited_dodge_route', () => {
  for (const initialY of [98, 159, 220]) {
    const run = fixture(); run.soul.y = initialY; run.soul.oldY = initialY;
    advance(run, 13.2);
    assert.ok(run.damage.length >= 7, `stationary ${initialY} remains inside seven aimed trajectories`);
  }
  const run = fixture(), seen = new Set();
  let peakConcurrent = 0, reversals = 0, previousDirection = 0;
  while (run.scenario.snapshot.elapsed < 20) {
    const targets = run.scenario.snapshot.targets;
    targets.forEach(target => seen.add(target.id));
    peakConcurrent = Math.max(peakConcurrent, targets.length);
    const incoming = targets.map(target => {
      const flight = (run.soul.x - target.x) / target.vx;
      return { time: Math.max(0, target.warn - target.age) + flight, y: target.y + target.vy * flight, radius: target.r };
    }).filter(target => target.time >= -0.18 && target.time < 0.85);
    let destination = run.soul.y, best = -Infinity;
    if (incoming.length) for (let y = 98; y <= 220; y += 2) {
      const score = Math.min(...incoming.map(target => Math.abs(y - target.y) - target.radius - run.soul.r)) - Math.abs(y - run.soul.y) * 0.3;
      if (score > best) { best = score; destination = y; }
    }
    const direction = Math.sign(destination - run.soul.y);
    if (direction && previousDirection && direction !== previousDirection) reversals++;
    if (direction) previousDirection = direction;
    run.soul.oldY = run.soul.y;
    run.soul.y += direction * Math.min(Math.abs(destination - run.soul.y), CHOIMIS_PINK_SHOOTER.heartSpeed / 120);
    run.scenario.update(1 / 120, []);
  }
  assert.equal(seen.size, 14, 'seven aimed, six crossing, one giant');
  assert.ok(peakConcurrent >= 4); assert.ok(reversals >= 3);
  assert.deepEqual(run.damage, [], 'known warning geometry admits a route at the unchanged 126px/s; this is not human difficulty evidence');
  assert.equal(run.scenario.pending, false);
});

test('test_gasuni_giant_remains_shootable_during_drain_and_cannot_reannounce', () => {
  const run = fixture(); advance(run, C.giantAt + C.giantWarn);
  run.soul.y = 98; run.soul.oldY = 98; advance(run, 18);
  run.scenario.stopSpawning();
  const giant = run.scenario.snapshot.targets.find(target => target.kind === 'jeomnye');
  assert.ok(giant.x + giant.size / 2 > 25); assert.equal(run.scenario.pending, true);
  for (let hit = 0; hit < 4; hit++) {
    const target = run.scenario.snapshot.targets.find(item => item.kind === 'jeomnye');
    run.scenario.update(0.001, [crossingShot(target, true)]);
  }
  assert.equal(run.scenario.snapshot.giantOutcome, 'destroyed'); assert.equal(run.scenario.pending, false);
  assert.deepEqual(run.speech, [{ text: '점례야!', seconds: 1.6 }]);
});
