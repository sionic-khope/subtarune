import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet, PATTERNS } from '../../src/battle/bullets.js';
import { CASTLE_MEMORY_PATTERNS } from '../../src/battle/castle-memory-patterns.js';
import { ENEMIES } from '../../src/data/enemies.js';

const box = { x: 120, y: 130, w: 240, h: 160 };
function run(name, step = 1 / 60, visit = () => {}) {
  const pattern = CASTLE_MEMORY_PATTERNS[name]();
  let active = [], now = 0;
  const emitted = [], poses = [];
  const api = { box, soul: { x: 240, y: 210, r: 6 }, rnd: () => 0.4,
    emit(o) { const bullet = new Bullet(o); active.push(bullet); emitted.push({ bullet, at: now }); return bullet; },
    present(pose) { poses.push(pose); }, sfx() {},
  };
  for (; now < pattern.duration + 4; now += step) {
    if (now < pattern.duration) pattern.update(now, step, api);
    for (const b of active) {
      b.update(step, box);
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), name);
      if (b.age < b.warn) assert.equal(b.hits({ x: b.x, y: b.y, r: 6 }), false, `${name} harmless warning`);
      assert.ok(b.life > 0 && Number.isFinite(b.life));
    }
    active = active.filter(b => !b.out(box));
    visit(active, now);
  }
  assert.equal(active.length, 0, name + ' expires');
  return { emitted, poses };
}

test('castle memory has nine registered finite attacks and phase-driven body poses', () => {
  assert.equal(Object.keys(CASTLE_MEMORY_PATTERNS).length, 9);
  for (const name of Object.keys(CASTLE_MEMORY_PATTERNS)) {
    assert.equal(PATTERNS[name], CASTLE_MEMORY_PATTERNS[name]);
    for (const step of [1 / 60, 0.17]) {
      const { emitted, poses } = run(name, step);
      assert.ok(emitted.some(({ bullet }) => !bullet.harmless));
      assert.ok(emitted.every(({ bullet }) => bullet.warn >= 0.45));
      for (const frame of name === 'memory_web' ? [1, 0, 3] : [1, 2, 3]) assert.ok(poses.some(p => p?.frame === frame), `${name} frame ${frame}`);
      assert.equal(poses.at(-1), null);
    }
  }
});

test('castle memory defaults preserve requested health, fixed damage and neutral-only idle', () => {
  for (const id of ['seobruto', 'jiroesub', 'udyrsub']) {
    const e = ENEMIES[id];
    assert.equal(e.hp, 50); assert.equal(e.damage, 15); assert.equal(e.damageStep, 0);
    assert.equal(e.sheet.count, 1); assert.equal(e.actions.cast.count, 4);
    assert.deepEqual(e.pivot, [64, 120]); assert.equal(e.patterns.length, 3);
    assert.ok(e.patterns.every(p => CASTLE_MEMORY_PATTERNS[p.type]));
    assert.ok(e.lines.idle.length >= 4);
  }
  assert.deepEqual(ENEMIES.seobruto.lines.speak, ['니애미따라가라센간', '넌나가라센간']);
  assert.deepEqual(ENEMIES.jiroesub.lines.speak, ['가재멘헤라 아니다.', '넌니애미따라가라멘헤라']);
  assert.deepEqual(ENEMIES.udyrsub.lines.speak, ['니애미따라가디르']);
});

test('individual hazards leave more than 100 sampled board points unhit', () => {
  for (const name of Object.keys(CASTLE_MEMORY_PATTERNS)) {
    const { emitted } = run(name);
    for (const { bullet: b } of emitted) {
      if (b.harmless) continue;
      b.age = b.warn + 0.01;
      let safe = 0;
      for (let x = box.x + 10; x < box.x + box.w - 9; x += 10)
        for (let y = box.y + 10; y < box.y + box.h - 9; y += 10)
          if (!b.hits({ x, y, r: 6 })) safe++;
      assert.ok(safe > 100, name + ' leaves more than 100 sampled points outside this hazard');
      assert.equal(b.hits({ x: -100, y: -100, r: 6 }), false);
    }
  }
});

test('simultaneous hazards leave an unhit grid point at each 60 Hz sample with a stationary center soul', () => {
  const points = [];
  for (let x = box.x + 10; x < box.x + box.w - 9; x += 10)
    for (let y = box.y + 10; y < box.y + box.h - 9; y += 10)
      points.push({ x, y, r: 6 });
  for (const name of Object.keys(CASTLE_MEMORY_PATTERNS)) {
    run(name, 1 / 60, (active, now) => {
      assert.ok(points.some(p => active.every(b => !b.hits(p))), `${name} at ${now.toFixed(3)}s has an unhit grid point`);
    });
  }
});

test('projectile warning guides clip to the board and restore clipping before drawing the projectile', () => {
  const { emitted } = run('memory_rasengan');
  const bullet = emitted[0].bullet;
  const stack = [], strokes = [], fills = [], rectangles = [];
  let clipped = false;
  const ctx = {
    save() { stack.push(clipped); }, restore() { clipped = stack.pop(); },
    beginPath() {}, arc() {}, moveTo() {}, lineTo() {}, setLineDash() {},
    rect(...args) { rectangles.push(args); }, clip() { clipped = true; },
    stroke() { strokes.push(clipped); }, fill() { fills.push(clipped); },
  };
  bullet.age = bullet.warn / 2;
  bullet.draw(ctx);
  assert.deepEqual(rectangles, [[box.x, box.y, box.w, box.h]]);
  assert.deepEqual(strokes, [true, true, false]);
  assert.deepEqual(fills, [false]);
  assert.equal(stack.length, 0);
  strokes.length = 0; fills.length = 0; rectangles.length = 0;
  bullet.age = bullet.warn + 0.01;
  bullet.draw(ctx);
  assert.deepEqual(rectangles, []);
  assert.deepEqual(strokes, [false]);
  assert.deepEqual(fills, [false]);
  assert.equal(stack.length, 0);
});
