import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, Bullet, Soul } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';

const CENTER = { x: 240, y: 214, r: 6 };
const [WIDTH, HEIGHT] = ENEMIES.park_guardian.board;
const BOX = { x: CENTER.x - WIDTH / 2, y: CENTER.y - HEIGHT / 2, w: WIDTH, h: HEIGHT };
const BOARDS = [BOX, { x: 140, y: 139, w: 200, h: 150 }];
const TYPES = ['park_rabbit_ears', 'park_obsessive_hearts', 'park_pirate_fans', 'park_dog_scratch'];

function simulate(type, { dt = 1 / 60, soul = CENTER, move, box = BOX } = {}) {
  const pattern = PATTERNS[type](), emitted = [], frames = [], speeches = [], poses = [], sounds = [];
  let live = [], now = 0;
  const api = { box, soul: { ...soul }, rnd: () => 0.5,
    say: text => speeches.push(text), present: pose => poses.push(pose), sfx: name => sounds.push(name),
    emit(options) { const bullet = new Bullet(options); emitted.push({ bullet, at: now }); live.push(bullet); } };
  for (now = 0; now < pattern.duration + 0.6; now += dt) {
    if (move) Object.assign(api.soul, move(now, api.soul));
    pattern.update(now, dt, api);
    for (const bullet of live) bullet.update(dt, box);
    live = live.filter(bullet => !bullet.out(box));
    frames.push({ at: now, soul: { ...api.soul }, bullets: live.map(bullet => ({ ...bullet })) });
  }
  return { pattern, emitted, frames, speeches, poses, sounds, live };
}

test('test_park_patterns_register_unique_silhouettes_exact_speech_and_body_reactions', () => {
  const shapes = ['park_ear', 'park_heart', 'park_flag', 'park_scratch'];
  const lines = ['칠라스아트해줘 형섭아', '형섭아 나도 사랑해줘', '가재맨 해적지부 많이 사랑해주세요'];
  for (const [i, type] of TYPES.entries()) {
    const result = simulate(type);
    assert.equal(result.emitted[0].bullet.shape, shapes[i]);
    assert.deepEqual(result.speeches, i < 3 ? [lines[i]] : []);
    assert.ok(result.poses.some(pose => pose?.sheet === (i < 3 ? 'attack' : 'scratch')));
    assert.ok(result.poses.some(pose => pose?.frame === (i < 3 ? 5 : 3)));
    assert.equal(result.poses.at(-1), null);
    assert.ok(result.sounds.length > 0);
    assert.equal(result.live.length, 0, `${type}: lifetime terminates before turn end`);
  }
});

test('test_park_warnings_expired_shapes_and_offboard_geometry_cannot_damage', () => {
  for (const type of TYPES) for (const { bullet } of simulate(type).emitted) {
    assert.ok(bullet.warn >= 0.3);
    assert.equal(typeof bullet.drawShape, 'function');
    assert.equal(typeof bullet.polygons, 'function');
    for (const age of [0, bullet.warn - 0.001, bullet.life, bullet.life + 1]) {
      bullet.age = age;
      for (const points of bullet.polygons(bullet)) for (const p of points)
        assert.equal(bullet.hits({ ...p, r: 6 }), false, `${type}: harmless at ${age}`);
    }
    bullet.age = bullet.warn + 0.25;
    assert.equal(bullet.hits({ x: BOX.x - 1, y: BOX.y + 20, r: 6 }), false);
  }
});

test('test_park_event_counts_are_frame_rate_independent_and_hitches_do_not_duplicate_actions', () => {
  for (const type of TYPES) {
    const regular = simulate(type), fast = simulate(type, { dt: 1 / 120 }), hitch = simulate(type, { dt: 0.23 });
    assert.equal(regular.emitted.length, fast.emitted.length, type);
    assert.equal(regular.emitted.length, hitch.emitted.length, type);
    assert.deepEqual(regular.speeches, hitch.speeches);
    assert.equal(regular.sounds.length, hitch.sounds.length);
  }
});

test('test_park_harmful_geometry_is_real_and_continuous_escape_exists_at_normal_walking_speed', () => {
  const step = 5, dt = 1 / 20, speed = new Soul().speed;
  for (const box of BOARDS) {
    const columns = Math.floor((box.w - 20) / step) + 1, rows = Math.floor((box.h - 20) / step) + 1;
    const positions = Array.from({ length: columns * rows }, (_, i) => ({
      x: box.x + 10 + i % columns * step, y: box.y + 10 + Math.floor(i / columns) * step, r: 6,
    }));
    for (const type of TYPES) {
      const { frames } = simulate(type, { dt, box });
      let reachable = new Set([Math.floor(rows / 2) * columns + Math.floor(columns / 2)]), damagingFrames = 0;
      for (const { bullets } of frames) {
        const safe = positions.map(p => bullets.every(b => !b.hitShape(b, p)));
        if (safe.some(value => !value)) damagingFrames++;
        const next = new Set();
        for (const from of reachable) for (const to of [from, from - 1, from + 1, from - columns, from + columns]) {
          if (to < 0 || to >= positions.length || !safe[to] || next.has(to)) continue;
          const a = positions[from], b = positions[to];
          if (Math.hypot(b.x - a.x, b.y - a.y) > speed * dt) continue;
          const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, r: 6 };
          if (bullets.every(bullet => !bullet.hitShape(bullet, middle))) next.add(to);
        }
        assert.ok(next.size, `${type}: no reachable escape in ${box.w}x${box.h}`);
        reachable = next;
      }
      assert.ok(damagingFrames >= 4, `${type}: actually attacks`);
    }
  }
});

test('test_park_costume_attacks_pressure_stationary_center_and_all_four_corners', () => {
  for (const box of BOARDS) {
    const corners = [CENTER, ...[10, box.w - 10].flatMap(x => [10, box.h - 10].map(y => ({ x: box.x + x, y: box.y + y, r: 6 })))];
    for (const type of TYPES.slice(0, 3)) for (const soul of corners) {
      const { frames } = simulate(type, { soul, box });
      assert.ok(frames.some(frame => frame.bullets.some(b => b.hitShape(b, soul))), `${type}: permanent safe point ${soul.x},${soul.y}`);
    }
  }
});

test('test_park_dog_scratch_is_a_single_locked_target_easily_escaped_by_walking', () => {
  for (const box of BOARDS) {
    const still = simulate('park_dog_scratch', { box });
    assert.equal(still.emitted.length, 1);
    assert.ok(still.frames.some(frame => frame.bullets.some(b => b.hitShape(b, CENTER))));
    const walking = simulate('park_dog_scratch', { box, move: t => ({ x: CENTER.x + Math.min(45, Math.max(0, t - 0.45) * new Soul().speed), y: CENTER.y }) });
    assert.ok(walking.frames.every(frame => frame.bullets.every(b => !b.hitShape(b, frame.soul))));
    assert.deepEqual(walking.emitted[0].bullet.target, { x: CENTER.x, y: CENTER.y });
    assert.ok(walking.pattern.duration < simulate('park_rabbit_ears').pattern.duration);
  }
});

test('test_park_heart_bait_and_turn_route_survives_live_retargeting_without_exceeding_soul_speed', () => {
  const dt = 1 / 120, speed = new Soul().speed;
  for (const box of BOARDS) {
    const result = simulate('park_obsessive_hearts', { dt, box, move(t, soul) {
      const wave = Math.floor(Math.max(0, t - 0.2) / 1.75), local = t - 0.2 - wave * 1.75;
      if (wave >= 3 || local <= 0.1 || local >= 0.75) return soul;
      const angle = wave % 2 ? Math.PI * 5 / 4 : Math.PI / 8;
      return { x: soul.x + Math.cos(angle) * speed * dt, y: soul.y + Math.sin(angle) * speed * dt };
    } });
    for (const frame of result.frames) {
      assert.ok(frame.soul.x >= box.x + 10 && frame.soul.x <= box.x + box.w - 10);
      assert.ok(frame.soul.y >= box.y + 10 && frame.soul.y <= box.y + box.h - 10);
      assert.ok(frame.bullets.every(b => !b.hitShape(b, frame.soul)), `live retargeting hit at ${frame.at}`);
    }
  }
});

test('test_park_heart_locks_each_bait_before_flight_and_ear_corridor_changes_without_teleporting_damage', () => {
  const hearts = simulate('park_obsessive_hearts', { move: t => ({ x: CENTER.x + Math.sin(t * 2) * 55, y: CENTER.y }) });
  assert.equal(hearts.emitted.length, 24);
  assert.notDeepEqual(hearts.emitted[0].bullet.target, hearts.emitted[8].bullet.target);
  const heart = hearts.emitted[0].bullet;
  const saved = { ...heart.target };
  heart.age = heart.warn + 0.7;
  assert.deepEqual(heart.target, saved);
  assert.ok(Math.hypot(heart.center(heart).x - saved.x, heart.center(heart).y - saved.y) < 10);
  const ears = simulate('park_rabbit_ears').emitted;
  const first = ears[0].bullet, second = ears[10].bullet;
  first.age = first.warn + 0.2; second.age = second.warn + 0.2;
  assert.ok(Math.abs(first.polygons(first)[0][2].y - second.polygons(second)[0][2].y) > 40);
});
