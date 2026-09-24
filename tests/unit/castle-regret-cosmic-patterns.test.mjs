import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet } from '../../src/battle/bullets.js';
import { CASTLE_REGRET_COSMIC_PATTERNS as patterns } from '../../src/battle/castle-regret-cosmic-patterns.js';

const box = { x: 120, y: 129, w: 240, h: 170 };
const step = 1 / 60;
const names = Object.keys(patterns);
const points = [];
for (let x = box.x + 10; x <= box.x + box.w - 10; x += 5)
  for (let y = box.y + 10; y <= box.y + box.h - 10; y += 5) points.push({ x, y, r: 6 });

function simulation(ids, soul = { x: 240, y: 225, r: 6 }) {
  const attacks = ids.map(id => patterns[id]());
  const result = { soul, active: [], emitted: [], poses: [], sounds: [], now: 0 };
  const api = { box, soul, rnd: () => 0.4,
    emit(o) { const b = new Bullet(o); result.active.push(b); result.emitted.push({ b, at: result.now }); return b; },
    present(pose) { result.poses.push(pose); }, sfx(cue) { result.sounds.push({ cue, at: result.now }); },
  };
  result.update = (t, dt) => {
    result.now = t;
    for (const p of attacks) p.update(t, dt, api);
    for (const b of result.active) b.update(dt, box);
    result.active = result.active.filter(b => !b.out(box));
  };
  return result;
}

test('test_cosmic_patterns_telegraphs_are_harmless_hazards_are_finite_and_expire', () => {
  assert.equal(names.length, 6);
  for (const name of names) {
    for (const dt of [step, 0.17, 0.43]) {
      const s = simulation([name]);
      let danger = false;
      for (let t = 0; t < 8; t += dt) {
        s.update(t, dt);
        for (const b of s.active) {
          assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.life), name);
          assert.ok(b.warn >= 0.5 && b.life > b.warn, name);
          if (b.age < b.warn) assert.ok(points.every(p => !b.hits(p)), name + ' harmless warning');
          else danger ||= points.some(p => b.hits(p));
        }
      }
      assert.ok(danger, name + ' actually dangerous');
      assert.ok(s.emitted.length > 0);
      assert.equal(s.active.length, 0);
      assert.equal(s.poses.at(-1), null);
      assert.ok(s.poses.some(p => p?.frame === 1));
      assert.ok(s.poses.some(p => p?.frame === 2));
      assert.ok(s.poses.every(p => !p || p.frame !== 3), 'hurt frame is not normal recovery');
      assert.equal(s.sounds.length, 4, name + ' exactly two prepare/release beats');
    }
  }
});

test('test_cosmic_patterns_late_update_skips_expired_casts_without_compressing_warning', () => {
  for (const name of names) {
    const s = simulation([name]);
    s.update(4.8, 0.01);
    assert.equal(s.emitted.length, 0);
    s.update(5.2, 0.01);
    assert.ok(s.active.every(b => b.age < b.warn));
    s.update(9, 4);
    assert.equal(s.active.length, 0);
    assert.equal(s.poses.at(-1), null);
  }
});

test('test_cosmic_duo_all_combinations_keep_damaging_windows_separate_at_170ms', () => {
  for (const taliyah of names.slice(0, 3)) for (const aurelion of names.slice(3)) {
    for (const dt of [step, 0.17]) {
      const s = simulation([taliyah, aurelion]);
      for (let t = 0; t < 7; t += dt) {
        s.update(t, dt);
        const live = s.active.filter(b => b.age >= b.warn);
        assert.ok(!live.some(b => b.shape.startsWith('taliyah')) || !live.some(b => b.shape.startsWith('aurelion')),
          `${taliyah}/${aurelion} overlap at ${t}`);
      }
    }
  }
});

function chooseRoute(active, soul) {
  const future = [], copies = active.map(b => new Bullet({ ...b }));
  for (let frame = 0; frame < 96; frame++) {
    for (const b of copies) b.update(step, box);
    future.push(copies.filter(b => !b.out(box)).map(b => new Bullet({ ...b })));
  }
  const targets = [{ x: soul.x, y: soul.y }];
  for (let distance = 10; distance <= 100; distance += 10) for (let direction = 0; direction < 16; direction++) {
    const angle = direction * Math.PI / 8;
    const x = soul.x + Math.cos(angle) * distance, y = soul.y + Math.sin(angle) * distance;
    if (x >= box.x + 10 && x <= box.x + box.w - 10 && y >= box.y + 10 && y <= box.y + box.h - 10) targets.push({ x, y });
  }
  return targets.find(target => {
    const distance = Math.hypot(target.x - soul.x, target.y - soul.y);
    return future.every((bullets, frame) => {
      const f = distance ? Math.min(1, 100 * step * (frame + 1) / distance) : 0;
      const p = { x: soul.x + (target.x - soul.x) * f, y: soul.y + (target.y - soul.y) * f, r: 6 };
      return bullets.every(b => !b.hits(p));
    });
  });
}

test('test_cosmic_duo_all_combinations_allow_100px_per_second_dodge_from_center_and_corners', { timeout: 30000 }, () => {
  for (const taliyah of names.slice(0, 3)) for (const aurelion of names.slice(3)) {
    for (const start of [[240, 225], [150, 160], [330, 160], [150, 290], [330, 290]]) {
      const s = simulation([taliyah, aurelion], { x: start[0], y: start[1], r: 6 });
      let target = { ...s.soul };
      for (let frame = 0; frame < 7 * 60; frame++) {
        s.update(frame * step, step);
        if (frame % 6 === 0) {
          target = chooseRoute(s.active, s.soul);
          assert.ok(target, `${taliyah}/${aurelion} ${start} route at ${(frame * step).toFixed(2)}`);
        }
        const distance = Math.hypot(target.x - s.soul.x, target.y - s.soul.y);
        const f = distance ? Math.min(1, 100 * step / distance) : 0;
        s.soul.x += (target.x - s.soul.x) * f; s.soul.y += (target.y - s.soul.y) * f;
        assert.ok(s.active.every(b => !b.hits(s.soul)), `${taliyah}/${aurelion} ${start} collision at ${frame * step}`);
      }
    }
  }
});

test('test_cosmic_patterns_draw_with_balanced_clipping_and_finite_coordinates', () => {
  for (const name of names) {
    const s = simulation([name]);
    let depth = 0, clips = 0, draws = 0;
    const numeric = (...args) => { assert.ok(args.every(Number.isFinite), name); };
    const ctx = { save() { depth++; }, restore() { depth--; }, beginPath() {}, closePath() {},
      rect: numeric, clip() { clips++; }, arc: numeric, moveTo: numeric, lineTo: numeric, fillRect: numeric,
      stroke() { draws++; }, fill() { draws++; }, setLineDash() {},
    };
    for (let t = 0; t < 7; t += 0.05) {
      s.update(t, 0.05);
      for (const b of s.active) b.draw(ctx);
      assert.equal(depth, 0);
    }
    assert.ok(clips > 0 && draws > 0);
  }
});

test('test_cosmic_patterns_stationary_center_and_corners_are_not_permanent_shelters', () => {
  for (const name of names) for (const [x, y] of [[240, 225], [150, 160], [330, 160], [150, 290], [330, 290]]) {
    const s = simulation([name], { x, y, r: 6 });
    let hit = false;
    for (let t = 0; t < 7; t += step) {
      s.update(t, step);
      hit ||= s.active.some(b => b.hits(s.soul));
    }
    assert.ok(hit, `${name} can reach stationary ${x},${y}`);
  }
});

test('test_taliyah_threaded_volley_emits_five_rocks_and_one_worked_lane_per_beat', () => {
  const s = simulation(['taliyah_threaded_volley']);
  for (let t = 0; t < 7; t += step) s.update(t, step);
  assert.equal(s.emitted.filter(({ b }) => b.shape === 'taliyah_threaded_stone').length, 10);
  assert.equal(s.emitted.filter(({ b }) => b.shape === 'taliyah_worked_ground').length, 2);
});
