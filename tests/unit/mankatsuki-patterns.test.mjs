import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet, PATTERNS } from '../../src/battle/bullets.js';
import { MANKATSUKI_PATTERNS } from '../../src/battle/mankatsuki-patterns.js';
import { ENEMIES } from '../../src/data/enemies.js';

const BOX = { x: 120, y: 134, w: 240, h: 160 };
const SOUL = { x: 240, y: 214, r: 6 };
const KEYS = ['mankatsuki_teleport', 'mankatsuki_stampede', 'mankatsuki_pan', 'mankatsuki_stocks', 'mankatsuki_taco'];
const COMBOS = ['mankatsuki_taco_pan', 'mankatsuki_taco_stocks', 'mankatsuki_teleport_taco'];
const ALL_KEYS = [...KEYS, ...COMBOS];
const config = name => [...ENEMIES.mankatsuki_junhee.patterns, ...ENEMIES.mankatsuki_junhee.enragedPatterns].find(pattern => pattern.type === name);

function simulate(name, random = 0.35, visit = () => {}) {
  const pattern = MANKATSUKI_PATTERNS[name](config(name));
  const emitted = [], poses = [], sounds = [], speech = [];
  let active = [], now = 0, maxActive = 0;
  const api = { box: BOX, soul: { ...SOUL }, actor: { x: 380, y: 210 }, rnd: () => random,
    emit(o) { const b = new Bullet(o); emitted.push({ at: now, b }); active.push(b); },
    present(pose) { poses.push({ at: now, pose }); }, sfx(name) { sounds.push({ at: now, name }); },
    say(text) { speech.push(text); },
  };
  for (now = 0; now < pattern.duration + 2; now += 1 / 60) {
    if (now < pattern.duration) pattern.update(now, 1 / 60, api);
    active.forEach((b) => b.update(1 / 60, BOX));
    active = active.filter((b) => !b.out(BOX));
    maxActive = Math.max(maxActive, active.length);
    visit({ now, active, api });
  }
  assert.equal(active.length, 0, 'finite hazards clean up without engine teardown');
  return { emitted, poses, sounds, speech, maxActive };
}

test('test_mankatsuki_normal_and_enraged_registered_patterns_warn_and_expire', () => {
  assert.deepEqual(Object.keys(MANKATSUKI_PATTERNS), ALL_KEYS);
  for (const name of ALL_KEYS) {
    assert.equal(PATTERNS[name], MANKATSUKI_PATTERNS[name]);
    const { emitted, maxActive } = simulate(name, 0.35, ({ active }) => {
      for (const b of active) {
        if (b.age < b.warn) for (let x = BOX.x + 8; x < BOX.x + BOX.w; x += 16)
          for (let y = BOX.y + 8; y < BOX.y + BOX.h; y += 16)
            assert.equal(b.hits({ x, y, r: 6 }), false, `${name}: warning is harmless`);
        assert.equal(b.hits({ x: BOX.x - 30, y: BOX.y + 30, r: 6 }), false, 'clipped hazards cannot hurt outside arena');
      }
    });
    assert.ok(emitted.some(({ b }) => !b.harmless));
    assert.ok(maxActive <= 32, `${name}: moderate bounded density`);
    assert.ok(emitted.every(({ b }) => b.life > 0 && Number.isFinite(b.life)));
  }
});

test('mankatsuki attack sounds fire once per action, not for every projectile', () => {
  for (const [pattern, cue, count] of [
    [KEYS[0], 'whoosh', 6], [KEYS[1], 'baron_slam', 2],
    [KEYS[2], 'rocket', 6], [KEYS[3], 'hit', 6],
    [KEYS[4], 'mankatsuki_clone', 9], [KEYS[4], 'whoosh', 9],
    [COMBOS[0], 'whoosh', 9], [COMBOS[0], 'rocket', 3],
    [COMBOS[1], 'whoosh', 9], [COMBOS[1], 'hit', 3], [COMBOS[2], 'whoosh', 12],
  ]) assert.equal(simulate(pattern).sounds.filter(sound => sound.name === cue).length, count, pattern);
});

test('test_mankatsuki_enraged_pool_has_three_arranged_taco_combinations', () => {
  assert.deepEqual(ENEMIES.mankatsuki_junhee.enragedPatterns.map(pattern => pattern.type), COMBOS);
  for (const [name, tacoCount, companion, companionCount] of [
    [COMBOS[0], 9, 'mankatsuki_flame', 9], [COMBOS[1], 9, 'mankatsuki_stock', 3],
    [COMBOS[2], 6, 'mankatsuki_shuriken', 18],
  ]) {
    const { emitted } = simulate(name);
    assert.equal(emitted.filter(({ b }) => b.shape === 'mankatsuki_taco').length, tacoCount);
    assert.equal(emitted.filter(({ b }) => b.shape === companion).length, companionCount);
    assert.ok(config(name).duration <= 7.8);
  }
});

test('test_mankatsuki_taco_is_fifth_pattern_with_separate_sheet_and_unchanged_boss_stats', () => {
  const boss = ENEMIES.mankatsuki_junhee;
  assert.deepEqual(boss.patterns.map(pattern => pattern.type), KEYS);
  assert.equal(boss.projectiles.taco, 'assets/projectiles/mankatsuki-taco.png');
  assert.deepEqual([boss.hp, boss.damage, boss.scale], [100, 11, 1.15]);
  const { emitted, poses } = simulate(KEYS[4]);
  assert.equal(emitted.length, 9);
  assert.ok(emitted.every(({ b }) => b.shape === 'mankatsuki_taco' && b.warn >= 0.7 && b.r === 12));
  assert.equal(poses.at(-1).pose, null);
});

test('test_mankatsuki_pressure_increases_without_damage_or_warning_shortcuts', () => {
  const boss = ENEMIES.mankatsuki_junhee;
  assert.equal(boss.dx, -12);
  assert.ok(boss.lines.speak.includes('아 삼전사라고 삼전'));
  assert.ok(boss.lines.speak.includes('우욱 우욱 우욱 이거 빤쓰아녀유?'));
  for (const [name, shape, count] of [[KEYS[0], 'mankatsuki_shuriken', 18], [KEYS[2], 'mankatsuki_flame', 18],
    [KEYS[3], 'mankatsuki_stock', 6], [KEYS[4], 'mankatsuki_taco', 9]]) {
    assert.equal(simulate(name).emitted.filter(({ b }) => b.shape === shape).length, count);
    assert.ok(config(name).duration <= 6.8);
  }
  const safeSize = simulate(KEYS[1]).emitted[0].b.safeSize;
  assert.equal(safeSize, 58);
  assert.ok(70 ** 2 / safeSize ** 2 > 1.45, 'smaller refuge increases positioning pressure');
});

test('test_mankatsuki_all_patterns_reach_stationary_corners_with_safe_warnings_at_50ms', () => {
  for (const name of ALL_KEYS) for (const x of [BOX.x + 10, BOX.x + BOX.w - 10])
    for (const y of [BOX.y + 10, BOX.y + BOX.h - 10]) {
      const pattern = MANKATSUKI_PATTERNS[name](config(name)), soul = { x, y, r: 6 };
      let active = [], hit = false;
      const api = { box: BOX, soul, rnd: () => 0.1, emit(o) { active.push(new Bullet(o)); } };
      for (let t = 0; t < pattern.duration + 2; t += 0.05) {
        if (t < pattern.duration) pattern.update(t, 0.05, api);
        for (const b of active) {
          b.update(0.05, BOX);
          if (b.age < b.warn) assert.equal(b.hits(soul), false);
          hit ||= b.hits(soul);
        }
        active = active.filter(b => !b.out(BOX));
      }
      assert.ok(hit, `${name}: corner ${x},${y} cannot stay still for the entire turn`);
      assert.equal(active.length, 0);
    }
});

test('test_mankatsuki_taco_locks_each_aim_and_hits_only_the_moving_face', () => {
  const pattern = MANKATSUKI_PATTERNS.mankatsuki_taco();
  const heads = [], sounds = [], soul = { ...SOUL };
  const api = { box: BOX, soul, emit(o) { heads.push(new Bullet(o)); }, sfx(name) { sounds.push(name); } };
  pattern.update(0.2, 0, api);
  const first = heads[0], from = { x: first.x, y: first.y };
  assert.deepEqual(first.target, SOUL);
  soul.x += 70; soul.y -= 45;
  pattern.update(0.67, 0, api);
  assert.deepEqual(heads[1].target, soul, 'each summon locks the soul at its own birth');
  assert.deepEqual(first.target, SOUL, 'earlier aim stays locked');
  first.update(first.warn - 0.01, BOX);
  assert.deepEqual({ x: first.x, y: first.y }, from);
  assert.equal(first.hits({ ...from, r: 6 }), false);
  first.update(0.02, BOX);
  assert.equal(first.hits({ x: first.x, y: first.y, r: 6 }), true);
  assert.equal(first.hits(SOUL), false, 'warning corridor is not a laser hitbox');
  const cross = (first.x - from.x) * (SOUL.y - from.y) - (first.y - from.y) * (SOUL.x - from.x);
  assert.ok(Math.abs(cross) < 0.0001, 'lunge stays on the warned locked line');
  assert.equal(first.hits({ x: first.x, y: first.y - 19, r: 6 }), false, 'ear/transparent margin excluded');
  for (let i = 0; i < 150; i++) first.update(1 / 60, BOX);
  assert.equal(sounds.filter(name => name === 'whoosh').length, 1);
  assert.equal(first.hits({ x: first.x, y: first.y, r: 6 }), false, 'expired/recovering head is harmless');
});

test('test_mankatsuki_taco_draws_four_sheet_frames_and_scoped_warning_before_lunge', () => {
  const pattern = MANKATSUKI_PATTERNS.mankatsuki_taco(), heads = [], calls = [];
  const image = { width: 256, height: 64 };
  pattern.update(0.2, 0, { box: BOX, soul: SOUL, images: { taco: image }, emit(o) { heads.push(new Bullet(o)); } });
  const b = heads[0];
  const ctx = new Proxy({}, { get(target, key) { return target[key] ?? ((...args) => calls.push([key, ...args])); }, set(target, key, value) { target[key] = value; return true; } });
  const frames = [];
  for (const age of [0.1, b.warn - 0.05, b.warn + 0.1, b.warn + b.flight - b.recover / 2]) {
    calls.length = 0; b.age = age; b.draw(ctx);
    const draw = calls.find(call => call[0] === 'drawImage');
    assert.equal(draw[1], image);
    frames.push(draw[2] / 64);
    assert.deepEqual(draw.slice(3, 6), [0, 64, 64]);
    assert.deepEqual(draw.slice(-2), [42, 42]);
    assert.equal(calls.some(call => call[0] === 'setLineDash'), age < b.warn);
  }
  assert.deepEqual(frames, [0, 1, 2, 3]);
});

test('test_mankatsuki_teleports_actual_actor_above_and_below_with_clone_sound', () => {
  const { poses, sounds, emitted } = simulate(KEYS[0]);
  assert.ok(poses.some(({ pose }) => pose?.hidden));
  assert.ok(poses.some(({ pose }) => !pose?.hidden && pose?.y < BOX.y));
  assert.ok(poses.some(({ pose }) => !pose?.hidden && pose?.y > BOX.y + BOX.h));
  const arrivals = poses.filter(({ pose }) => pose && !pose.hidden && pose.sheet === 'idle');
  assert.equal(sounds.filter(({ name }) => name === 'mankatsuki_clone').length, arrivals.length);
  assert.ok(emitted.filter(({ b }) => b.shape === 'mankatsuki_shuriken').length >= 9);
});

test('test_mankatsuki_stampede_triangle_protects_full_soul_and_is_reachable', () => {
  const { emitted } = simulate(KEYS[1]);
  const waves = emitted.filter(({ b }) => b.shape === 'mankatsuki_stampede');
  assert.equal(waves.length, 2);
  assert.notEqual(waves[0].b.safeRight, waves[1].b.safeRight);
  for (const { b } of waves) {
    const target = { x: b.safeRight ? BOX.x + BOX.w - 12 : BOX.x + 12, y: BOX.y + BOX.h - 12, r: 6 };
    const opposite = { x: b.safeRight ? BOX.x + 9 : BOX.x + BOX.w - 9, y: BOX.y + 9 };
    assert.ok(Math.hypot(target.x - opposite.x, target.y - opposite.y) / 110 + 0.3 <= b.warn,
      'warning budgets travel from farthest corner plus reaction time');
    b.age = b.warn + 0.5;
    assert.equal(b.hits(target), false);
    assert.equal(b.hits({ ...target, y: BOX.y + 12 }), true, 'upper corner is unsafe');
    assert.equal(b.hits(SOUL), true, 'center is unsafe');
    assert.equal(b.hits({ x: b.safeRight ? BOX.x + 12 : BOX.x + BOX.w - 12, y: target.y, r: 6 }), true);
  }
});

test('test_mankatsuki_stocks_preserve_exact_line_and_randomize_rising_falling_paths', () => {
  const low = simulate(KEYS[3], 0.1), high = simulate(KEYS[3], 0.9);
  assert.deepEqual(low.speech, ['형님 주식 그거 사셔야겠습니까']);
  const paths = low.emitted.filter(({ b }) => b.shape === 'mankatsuki_stock');
  assert.ok(paths.some(({ b }) => b.points.at(-1).y > b.points[0].y));
  assert.ok(paths.some(({ b }) => b.points.at(-1).y < b.points[0].y));
  assert.notDeepEqual(paths.map(({ b }) => b.points), high.emitted.filter(({ b }) => b.shape === 'mankatsuki_stock').map(({ b }) => b.points));
});

test('test_mankatsuki_does_not_call_other_enemy_pattern_factories', () => {
  const originals = new Map();
  try {
    for (const name of Object.keys(PATTERNS).filter((name) => !ALL_KEYS.includes(name))) {
      originals.set(name, PATTERNS[name]);
      PATTERNS[name] = () => { throw new Error(`unexpected reuse: ${name}`); };
    }
    for (const name of ALL_KEYS) simulate(name);
  } finally {
    for (const [name, factory] of originals) PATTERNS[name] = factory;
  }
});

test('test_mankatsuki_each_timeline_has_a_continuously_reachable_path_at_100px_per_second', () => {
  const spacing = 5, dt = 0.05, points = [];
  for (let y = BOX.y + 10; y <= BOX.y + BOX.h - 10; y += spacing)
    for (let x = BOX.x + 10; x <= BOX.x + BOX.w - 10; x += spacing) points.push({ x, y, r: 6 });
  const width = Math.floor((BOX.w - 20) / spacing) + 1;
  for (const name of ALL_KEYS) for (const random of [0.1, 0.9]) {
    const pattern = MANKATSUKI_PATTERNS[name](config(name));
    let active = [], reachable = new Set([points.findIndex((p) => p.x === SOUL.x && p.y === SOUL.y)]);
    assert.ok(!reachable.has(-1));
    const api = { box: BOX, soul: SOUL, rnd: () => random, emit(o) { active.push(new Bullet(o)); } };
    for (let t = 0; t < pattern.duration; t += dt) {
      pattern.update(t, dt, api);
      active.forEach((b) => b.update(dt, BOX)); active = active.filter((b) => !b.out(BOX));
      const next = new Set();
      for (const i of reachable) for (const j of [i, i - 1, i + 1, i - width, i + width]) {
        if (!points[j] || Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) > spacing) continue;
        const middle = { x: (points[i].x + points[j].x) / 2, y: (points[i].y + points[j].y) / 2, r: 6 };
        if (active.every((b) => !b.hits(points[j]) && !b.hits(middle))) next.add(j);
      }
      reachable = next;
      assert.ok(reachable.size, `${name} random ${random}: escape at ${t.toFixed(2)}`);
    }
  }
});
