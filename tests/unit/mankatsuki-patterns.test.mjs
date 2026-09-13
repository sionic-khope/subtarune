import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet, PATTERNS } from '../../src/battle/bullets.js';
import { MANKATSUKI_PATTERNS } from '../../src/battle/mankatsuki-patterns.js';

const BOX = { x: 120, y: 134, w: 240, h: 160 };
const SOUL = { x: 240, y: 214, r: 6 };
const KEYS = ['mankatsuki_teleport', 'mankatsuki_stampede', 'mankatsuki_pan', 'mankatsuki_stocks'];

function simulate(name, random = 0.35, visit = () => {}) {
  const pattern = MANKATSUKI_PATTERNS[name]();
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

test('test_mankatsuki_four_independent_registered_patterns_warn_and_expire', () => {
  assert.deepEqual(Object.keys(MANKATSUKI_PATTERNS), KEYS);
  for (const name of KEYS) {
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
    [KEYS[0], 'whoosh', 4], [KEYS[1], 'baron_slam', 2],
    [KEYS[2], 'rocket', 4], [KEYS[3], 'hit', 4],
  ]) assert.equal(simulate(pattern).sounds.filter(sound => sound.name === cue).length, count, pattern);
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
    for (const name of Object.keys(PATTERNS).filter((name) => !KEYS.includes(name))) {
      originals.set(name, PATTERNS[name]);
      PATTERNS[name] = () => { throw new Error(`unexpected reuse: ${name}`); };
    }
    for (const name of KEYS) simulate(name);
  } finally {
    for (const [name, factory] of originals) PATTERNS[name] = factory;
  }
});

test('test_mankatsuki_each_timeline_has_a_continuously_reachable_path_at_100px_per_second', () => {
  const spacing = 5, dt = 0.05, points = [];
  for (let y = BOX.y + 10; y <= BOX.y + BOX.h - 10; y += spacing)
    for (let x = BOX.x + 10; x <= BOX.x + BOX.w - 10; x += spacing) points.push({ x, y, r: 6 });
  const width = Math.floor((BOX.w - 20) / spacing) + 1;
  for (const name of KEYS) for (const random of [0.1, 0.9]) {
    const pattern = MANKATSUKI_PATTERNS[name]();
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
