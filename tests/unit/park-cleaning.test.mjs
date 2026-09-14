import test from 'node:test';
import assert from 'node:assert/strict';
import { PARK_CLEANING_PATTERNS, cleaningGeometry, drawCleaning } from '../../src/battle/patterns/park-cleaning.js';
import { PARK_CLEANING as C } from '../../src/data/park-cleaning.js';
import { Bullet } from '../../src/battle/bullets.js';

const images = Object.fromEntries(Object.values(C.assets).map(key => [key, { key }]));
function simulate(box = { x: 120, y: 134, w: 240, h: 160 }, dt = 1 / 20) {
  const pattern = PARK_CLEANING_PATTERNS.park_cleaning(), bullets = [], emitted = [], frames = [], lines = [];
  const api = { box, images, soul: { x: 240, y: 214 }, say: text => lines.push(text), emit(o) { const b = new Bullet(o); bullets.push(b); emitted.push(b); } };
  for (let t = 0; t <= pattern.duration + 0.2; t += dt) {
    pattern.update(t, dt, api);
    for (const b of bullets) b.update(dt, box);
    frames.push({ t, bullets: bullets.filter(b => !b.out(box)).map(b => ({ ...b })) });
  }
  return { frames, emitted, lines, pattern };
}

test('test_cleaning_three_generated_assets_exact_attack_line_and_finite_waves', () => {
  const result = simulate();
  assert.deepEqual(result.lines, [C.line]);
  assert.equal(result.emitted.length, 9);
  assert.deepEqual([...new Set(result.emitted.map(b => b.cleaningKind))], ['bag', 'broom', 'dustpan']);
  assert.equal(result.frames.at(-1).bullets.length, 0);
  for (const bullet of result.emitted) assert.equal(bullet.image, images[C.assets[bullet.cleaningKind]]);
});

test('test_cleaning_missing_art_rejects_before_any_invisible_damage', () => {
  let emitted = 0;
  assert.throws(() => PARK_CLEANING_PATTERNS.park_cleaning().update(1, 1, { images: {}, emit: () => emitted++ }), /not loaded/);
  assert.equal(emitted, 0);
});

test('test_cleaning_warning_and_expired_contacts_are_harmless', () => {
  for (const b of simulate().emitted) {
    for (const age of [0, b.warn - 0.001, b.life, b.life + 1]) {
      b.age = age;
      for (const points of b.polygons(b)) for (const p of points) assert.equal(b.hits({ ...p, r: 6 }), false);
    }
  }
});

test('test_cleaning_generated_draw_and_collision_use_identical_position_without_sprite_stretch', () => {
  const calls = [];
  const ctx = new Proxy({ drawImage: (...args) => calls.push(args) }, { get: (o, key) => o[key] ?? (() => {}) });
  for (const b of simulate().emitted) {
    b.age = b.warn + b.travel / 2;
    const g = cleaningGeometry(b); drawCleaning(ctx, b);
    assert.deepEqual(calls.at(-1), [b.image, Math.round(g.x - g.w / 2), Math.round(g.y - g.h / 2), g.w, g.h]);
    assert.deepEqual(b.polygons(b), g.polygons);
  }
});

test('test_cleaning_normal_walking_speed_has_continuous_escape_and_no_corner_is_permanently_safe', () => {
  const dt = 1 / 20, grid = 5;
  for (const box of [{ x: 120, y: 134, w: 240, h: 160 }, { x: 140, y: 139, w: 200, h: 150 }]) {
    const cols = Math.floor((box.w - 20) / grid) + 1, rows = Math.floor((box.h - 20) / grid) + 1;
    const positions = Array.from({ length: cols * rows }, (_, i) => ({ x: box.x + 10 + i % cols * grid, y: box.y + 10 + Math.floor(i / cols) * grid, r: 6 }));
    let reachable = new Set([Math.floor(rows / 2) * cols + Math.floor(cols / 2)]);
    const { frames } = simulate(box, dt);
    for (const frame of frames) {
      const safe = positions.map(p => frame.bullets.every(b => !b.hitShape(b, p))), next = new Set();
      for (const i of reachable) for (const j of [i, i - 1, i + 1, i - cols, i + cols]) {
        if (j < 0 || j >= positions.length || !safe[j]) continue;
        if (Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y) <= 110 * dt) next.add(j);
      }
      assert.ok(next.size, `No escape at ${frame.t} in ${box.w}`); reachable = next;
    }
    for (const i of [0, cols - 1, (rows - 1) * cols, rows * cols - 1, Math.floor(positions.length / 2)])
      assert.ok(frames.some(f => f.bullets.some(b => b.hitShape(b, positions[i]))), `Safe forever: ${i}`);
  }
});

test('test_cleaning_hitches_do_not_duplicate_waves', () => {
  assert.equal(simulate(undefined, 0.23).emitted.length, simulate(undefined, 1 / 120).emitted.length);
});

test('test_cleaning_contact_points_fit_approved_visible_bounds_and_uniform_scale', () => {
  const bounds = { bag: [9, 6, 55, 60], broom: [17, 8, 47, 124], dustpan: [8, 12, 88, 60] };
  for (const [kind, polygons] of Object.entries(C.contactPixels)) {
    const [left, top, right, bottom] = bounds[kind];
    for (const polygon of polygons) for (const [x, y] of polygon) {
      assert.ok(x >= left && x < right && y >= top && y < bottom);
    }
    assert.equal(C.sizes[kind][0] / C.sourceSizes[kind][0], C.sizes[kind][1] / C.sourceSizes[kind][1]);
  }
});
