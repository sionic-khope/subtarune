import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet, PATTERNS } from '../../src/battle/bullets.js';
import { CASTLE_MEMORY_PATTERNS } from '../../src/battle/castle-memory-patterns.js';
import { ENEMIES } from '../../src/data/enemies.js';

const box = { x: 120, y: 130, w: 240, h: 160 };
function run(name, step = 1 / 60, visit = () => {}) {
  const pattern = CASTLE_MEMORY_PATTERNS[name]();
  let active = [], now = 0;
  const emitted = [], poses = [], sounds = [];
  const api = { box, soul: { x: 240, y: 210, r: 6 }, rnd: () => 0.4,
    emit(o) { const bullet = new Bullet(o); active.push(bullet); emitted.push({ bullet, at: now }); return bullet; },
    present(pose) { poses.push(pose); }, sfx(cue) { sounds.push({ cue, at: now }); },
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
  return { emitted, poses, sounds };
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

test('final-area patterns add volleys within the same duration and sound once per cast phase', () => {
  const previousVolleys = { memory_rasengan: 4, memory_shuriken: 4, memory_cross_throw: 3, memory_kuromi: 4, memory_mines: 5, memory_web: 3, memory_claw: 4, memory_mantle_stampede: 3, memory_storm: 4 };
  for (const [name, previous] of Object.entries(previousVolleys)) {
    const { emitted, sounds } = run(name);
    const volleys = new Set(emitted.map(({ at }) => at));
    assert.equal(volleys.size, previous + 1, name);
    assert.equal(CASTLE_MEMORY_PATTERNS[name]().duration, 6.4);
    assert.equal(sounds.filter(s => s.cue === 'hit').length, volleys.size);
    assert.equal(sounds.filter(s => s.cue !== 'hit').length, volleys.size);
  }
  assert.equal(run('memory_web').emitted.filter(({ bullet }) => bullet.shape === 'memory_mine').length, 2);
});

function warningAwareDestination(active, soul) {
  const step = 1 / 60, forecast = [], copies = active.map(b => new Bullet({ ...b }));
  for (let frame = 0; frame < 48; frame++) {
    for (const b of copies) b.update(step, box);
    forecast.push(copies.filter(b => !b.out(box)).map(b => new Bullet({ ...b })));
  }
  const destinations = [{ x: soul.x, y: soul.y }];
  for (let distance = 10; distance <= 80; distance += 10) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2]]) {
      const x = soul.x + dx * distance, y = soul.y + dy * distance;
      if (x >= box.x + 10 && x <= box.x + box.w - 10 && y >= box.y + 10 && y <= box.y + box.h - 10) destinations.push({ x, y });
    }
  }
  return [0, 0.1, 0.2].flatMap(wait => destinations.map(target => ({ ...target, wait }))).find(target => {
    const distance = Math.hypot(target.x - soul.x, target.y - soul.y);
    return forecast.every((hazards, frame) => {
      const progress = distance ? Math.min(1, 100 * Math.max(0, step * (frame + 1) - target.wait) / distance) : 0;
      const p = { x: soul.x + (target.x - soul.x) * progress, y: soul.y + (target.y - soul.y) * progress, r: soul.r };
      return hazards.every(b => !b.hits(p));
    });
  });
}

test('all nine actual adaptive timelines admit a warning-aware path at 100px/s from center and four corners', { timeout: 15000 }, () => {
  for (const name of Object.keys(CASTLE_MEMORY_PATTERNS)) {
    for (const [x, y] of [[240, 210], [130, 140], [350, 140], [130, 280], [350, 280]]) {
      const pattern = CASTLE_MEMORY_PATTERNS[name]();
      const soul = { x, y, r: 6 };
      let active = [], target = { x, y };
      const api = { box, soul, rnd: () => 0.4, emit(o) { const b = new Bullet(o); active.push(b); return b; } };
      for (let frame = 0; frame < Math.ceil((pattern.duration + 3) * 60); frame++) {
        const t = frame / 60;
        if (t < pattern.duration) pattern.update(t, 1 / 60, api);
        if (frame % 6 === 0) {
          target = warningAwareDestination(active, soul);
          assert.ok(target, `${name} from ${x},${y} has a known-threat escape at ${t.toFixed(2)}s`);
        }
        const travelTime = Math.max(0, 1 / 60 - (target.wait || 0));
        target.wait = Math.max(0, (target.wait || 0) - 1 / 60);
        const d = Math.hypot(target.x - soul.x, target.y - soul.y), fraction = d ? Math.min(1, 100 * travelTime / d) : 0;
        soul.x += (target.x - soul.x) * fraction; soul.y += (target.y - soul.y) * fraction;
        for (const b of active) b.update(1 / 60, box);
        active = active.filter(b => !b.out(box));
        assert.ok(active.every(b => !b.hits(soul)), `${name} from ${x},${y} path is collision-free at ${t.toFixed(2)}s`);
      }
    }
  }
});
