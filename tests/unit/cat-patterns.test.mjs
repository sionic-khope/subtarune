import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, Bullet } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';

const BOX = { x: 140, y: 139, w: 200, h: 150 };
const SOUL = { x: 240, y: 214, r: 6 };
const TYPES = ['cat_knead', 'cat_reach', 'cat_whiskers', 'cat_yarn', 'cat_fish', 'cat_tail'];

function simulation(type, dt = 1 / 60) {
  const pattern = PATTERNS[type]();
  const emitted = [], frames = [];
  let live = [], now = 0;
  const api = { box: BOX, soul: { ...SOUL }, rnd: () => 0.5, emit(options) {
    const bullet = new Bullet(options); emitted.push({ bullet, at: now }); live.push(bullet);
  } };
  for (now = 0; now < pattern.duration; now += dt) {
    pattern.update(now, dt, api);
    for (const bullet of live) bullet.update(dt, BOX);
    live = live.filter(bullet => !bullet.out(BOX));
    frames.push(live.map(bullet => ({ ...bullet })));
  }
  return { pattern, emitted, frames };
}

test('test_cats_register_normal_enemies_with_exact_hp_damage_and_three_unique_attacks', () => {
  for (const [id, hp, damage, offset] of [['seopnyang', 27, 16, 0], ['gyeongnyang', 30, 17, 3]]) {
    const enemy = ENEMIES[id];
    assert.ok(enemy, `${id}: registered`);
    assert.equal(enemy.hp, hp);
    assert.equal(enemy.boss, undefined);
    assert.equal(enemy.defense, undefined);
    assert.equal(enemy.support, undefined);
    assert.deepEqual(enemy.patterns.map(pattern => pattern.type), TYPES.slice(offset, offset + 3));
    assert.deepEqual(enemy.pivot, [32, 60]);
    assert.equal(enemy.idle.swayX, 0);
    assert.equal(enemy.idle.swayY, 0);
    assert.equal(enemy.sheet.count, 4);
    assert.equal(enemy.damage, damage);
  }
});

test('test_cat_patterns_warn_before_damage_and_leave_safe_space_every_frame', () => {
  for (const type of TYPES) {
    assert.equal(typeof PATTERNS[type], 'function', type);
    const { pattern, emitted, frames } = simulation(type);
    assert.ok(pattern.duration >= 4 && pattern.duration <= 5, type);
    assert.ok(emitted.length > 0, type);
    for (const { bullet } of emitted) {
      assert.ok(bullet.warn >= 0.3, `${type}: warning`);
      assert.equal(typeof bullet.drawShape, 'function', `${type}: custom silhouette`);
      bullet.age = bullet.warn / 2;
      assert.equal(bullet.hits({ x: bullet.x, y: bullet.y, r: 6 }), false, `${type}: harmless warning`);
    }
    let harmfulFrames = 0;
    for (const frame of frames) {
      let safe = 0, danger = 0;
      for (let x = BOX.x + 10; x <= BOX.x + BOX.w - 10; x += 10) {
        for (let y = BOX.y + 10; y <= BOX.y + BOX.h - 10; y += 10) {
          const hit = frame.some(b => !b.harmless && b.hitShape(b, { x, y, r: 6 }));
          if (hit) danger++; else safe++;
        }
      }
      assert.ok(safe > 0, `${type}: safe space`);
      if (danger) harmfulFrames++;
    }
    assert.ok(harmfulFrames > 10, `${type}: actual damaging phase`);
  }
});

test('test_cat_patterns_have_deterministic_wave_counts_across_frame_rates', () => {
  for (const type of TYPES) {
    assert.equal(typeof PATTERNS[type], 'function', type);
    assert.equal(simulation(type, 1 / 30).emitted.length, simulation(type, 1 / 120).emitted.length, type);
  }
});

test('test_cat_patterns_have_a_continuous_dodge_route_at_normal_soul_speed', () => {
  const step = 5, dt = 1 / 20, columns = 37, rows = 27;
  const positions = Array.from({ length: columns * rows }, (_, i) => ({
    x: BOX.x + 10 + i % columns * step, y: BOX.y + 10 + Math.floor(i / columns) * step, r: SOUL.r,
  }));
  for (const type of TYPES) {
    const { frames } = simulation(type, dt);
    let reachable = new Set([13 * columns + 18]);
    for (const frame of frames) {
      const next = new Set();
      for (const from of reachable) {
        for (const to of [from, from - 1, from + 1, from - columns, from + columns]) {
          if (to < 0 || to >= positions.length || next.has(to)) continue;
          const a = positions[from], b = positions[to];
          if (Math.hypot(b.x - a.x, b.y - a.y) > 110 * dt) continue;
          const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: SOUL.r };
          if (frame.every(bullet => !bullet.hitShape(bullet, b) && !bullet.hitShape(bullet, middle))) next.add(to);
        }
      }
      assert.ok(next.size > 0, `${type}: continuous route from centered soul`);
      reachable = next;
    }
  }
});

test('test_cat_attack_geometry_preserves_retraction_curl_trail_and_release', () => {
  const first = type => simulation(type).emitted[0].bullet;
  const arm = first('cat_reach');
  arm.age = arm.warn + 0.55;
  const extended = Math.abs(arm.points(arm).at(-1).x - arm.x);
  arm.age = arm.life - 0.05;
  assert.ok(Math.abs(arm.points(arm).at(-1).x - arm.x) < extended * 0.2);
  const whisker = first('cat_whiskers');
  whisker.age = whisker.warn + 0.8; whisker.steer(whisker);
  assert.ok(new Set(whisker.points(whisker).map(p => Math.round(p.y))).size > 3);
  const yarn = first('cat_yarn');
  yarn.age = yarn.warn + 1; yarn.steer(yarn);
  const thread = yarn.points(yarn);
  assert.ok(Math.hypot(thread[0].x - thread.at(-1).x, thread[0].y - thread.at(-1).y) > 35);
  const fish = first('cat_fish');
  fish.age = fish.warn * 0.25; fish.steer(fish);
  const swingX = fish.x;
  fish.age = fish.warn + 0.2; fish.steer(fish);
  const released = { x: fish.x, y: fish.y };
  fish.age += 0.4; fish.steer(fish);
  assert.notEqual(swingX, released.x);
  assert.equal(fish.x, released.x);
  assert.ok(fish.y > released.y + 40);
  const tail = first('cat_tail');
  tail.age = tail.warn;
  const start = tail.points(tail)[0];
  tail.age += 0.6;
  assert.ok(Math.hypot(tail.points(tail)[0].x - start.x, tail.points(tail)[0].y - start.y) > 40);
  assert.equal(tail.hitShape(tail, { x: tail.x, y: tail.y, r: SOUL.r }), false);
});
