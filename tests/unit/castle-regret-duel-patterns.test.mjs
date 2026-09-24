import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet } from '../../src/battle/bullets.js';
import { CASTLE_REGRET_DUEL_PATTERNS } from '../../src/battle/castle-regret-duel-patterns.js';

const box = { x: 140, y: 150, w: 200, h: 150 };
const names = ['regret_alpha_double', 'regret_highlander', 'regret_meditate', 'regret_scatter', 'regret_force_of_will', 'regret_unleashed'];
function simulate(name, step = 1 / 60, visit = () => {}, start = [240, 225]) {
  const pattern = CASTLE_REGRET_DUEL_PATTERNS[name]();
  const soul = { x: start[0], y: start[1], r: 6 }, emitted = [], poses = [], sounds = [];
  let active = [], t = 0;
  const api = { box, soul, rnd: () => 0.4,
    emit(spec) { const b = new Bullet(spec); emitted.push(b); active.push(b); return b; },
    present(pose) { poses.push(pose); }, sfx(cue) { sounds.push(cue); },
  };
  for (; t < pattern.duration + 4; t += step) {
    if (t < pattern.duration) pattern.update(t, step, api);
    visit(active, soul, t, step);
    for (const b of active) b.update(step, box);
    active = active.filter(b => !b.out(box));
    for (const b of active) {
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), `${name} finite`);
      if (b.age < b.warn) assert.equal(b.hits(soul), false, `${name} harmless warning`);
    }
  }
  const beforeEnd = emitted.length;
  pattern.update(pattern.duration + step, step, api);
  assert.equal(emitted.length, beforeEnd, `${name} no late emission`);
  assert.equal(active.length, 0, `${name} cleanup`);
  return { emitted, poses, sounds };
}

test('six regret duel attacks have finite damage, full warnings, phase poses and late-step cleanup', () => {
  assert.deepEqual(Object.keys(CASTLE_REGRET_DUEL_PATTERNS), names);
  for (const name of names) for (const step of [1 / 60, 0.17, 0.83]) {
    const { emitted, poses, sounds } = simulate(name, step);
    assert.ok(emitted.length >= 3, name);
    assert.ok(emitted.every(b => b.warn >= 0.6 && b.life > b.warn && b.dmg === null));
    assert.ok(sounds.length >= 2);
    assert.equal(poses.at(-1), null);
    if (step < 0.2) {
      for (const frame of [1, 2, 0]) assert.ok(poses.some(p => p?.frame === frame), `${name} frame ${frame}`);
    }
    for (const b of emitted) {
      b.age = b.life + 1;
      assert.equal(b.hits({ x: b.x, y: b.y, r: 6 }), false, `${name} expired hazard harmless`);
    }
  }
});

test('regret threats reach a stationary center and all four legal corners', () => {
  for (const name of names) for (const start of [[240,225],[150,160],[330,160],[150,290],[330,290]]) {
    let danger = false;
    simulate(name, 1 / 60, (active, soul) => { danger ||= active.some(b => b.hits(soul)); }, start);
    assert.ok(danger, `${name} pressures ${start}`);
  }
});

function destination(active, soul) {
  const forecast = [], copies = active.map(b => new Bullet({ ...b }));
  for (let frame = 0; frame < 54; frame++) {
    for (const b of copies) b.update(1 / 60, box);
    forecast.push(copies.filter(b => !b.out(box)).map(b => new Bullet({ ...b })));
  }
  const targets = [{ x: soul.x, y: soul.y }];
  for (let distance = 10; distance <= 100; distance += 10)
    for (let i = 0; i < 16; i++) {
      const x = soul.x + Math.cos(i * Math.PI / 8) * distance, y = soul.y + Math.sin(i * Math.PI / 8) * distance;
      if (x >= box.x + 10 && x <= box.x + box.w - 10 && y >= box.y + 10 && y <= box.y + box.h - 10) targets.push({ x, y });
    }
  return targets.find(target => {
    const d = Math.hypot(target.x - soul.x, target.y - soul.y);
    return forecast.every((hazards, frame) => {
      const p = d ? Math.min(1, 100 * (frame + 1) / 60 / d) : 0;
      const candidate = { x: soul.x + (target.x - soul.x) * p, y: soul.y + (target.y - soul.y) * p, r: 6 };
      return hazards.every(b => !b.hits(candidate));
    });
  });
}

test('regret adaptive timelines admit warning-aware collision-free paths at 100px/s', { timeout: 30000 }, () => {
  for (const name of names) for (const start of [[240,225],[150,160],[330,160],[150,290],[330,290]]) {
    let target, frame = 0;
    simulate(name, 1 / 60, (active, soul, t, dt) => {
      if (frame++ % 6 === 0) target = destination(active, soul);
      assert.ok(target, `${name} escape from ${start} at ${t.toFixed(2)}`);
      const d = Math.hypot(target.x - soul.x, target.y - soul.y), p = d ? Math.min(1, 100 * dt / d) : 0;
      soul.x += (target.x - soul.x) * p; soul.y += (target.y - soul.y) * p;
      const forecast = active.map(b => new Bullet({ ...b }));
      for (const b of forecast) b.update(dt, box);
      assert.ok(forecast.every(b => b.out(box) || !b.hits(soul)), `${name} clean path at ${t.toFixed(2)}`);
    }, start);
  }
});

test('all regret geometry renders inside a balanced clipped canvas state', () => {
  let depth = 0, clips = 0, primitives = 0;
  const ctx = { save() { depth++; }, restore() { depth--; }, clip() { clips++; }, beginPath() {},
    rect() {}, moveTo() {}, lineTo() {}, closePath() {}, setLineDash() {}, translate() {}, rotate() {},
    arc() { primitives++; }, stroke() { primitives++; }, fill() { primitives++; }, fillRect() { primitives++; },
  };
  for (const name of names) simulate(name, 0.17, active => {
    for (const b of active) { b.draw(ctx); assert.equal(depth, 0, `${name} balanced save/restore`); }
  });
  assert.ok(clips > 100 && primitives > 300);
});

test('locked sphere trajectories survive target movement and large updates never count warning as flight', () => {
  const pattern = CASTLE_REGRET_DUEL_PATTERNS.regret_scatter();
  const bullets = [], soul = { x: 240, y: 225, r: 6 };
  pattern.update(0, 0, { box, soul, emit(spec) { const b = new Bullet(spec); bullets.push(b); return b; } });
  const b = bullets[0], start = { x: b.x, y: b.y }, angle = b.angle;
  soul.x = 330; soul.y = 290;
  b.update(b.warn - 0.01, box);
  assert.deepEqual({ x: b.x, y: b.y }, start);
  assert.equal(b.hits({ ...start, r: 6 }), false);
  b.update(0.11, box);
  assert.equal(b.angle, angle);
  assert.ok(Math.abs(Math.hypot(b.x - start.x, b.y - start.y) - 16.5) < 1e-8);
  assert.equal(b.hits({ x: b.x, y: b.y, r: 6 }), true);
  assert.equal(b.hits({ x: b.x - Math.sin(angle) * 14, y: b.y + Math.cos(angle) * 14, r: 6 }), false);
});

test('alpha warning and slash share exact endpoints and the visible eight-pixel thickness', () => {
  const pattern = CASTLE_REGRET_DUEL_PATTERNS.regret_alpha_double(), bullets = [];
  pattern.update(0, 0, { box, soul: { x: 240, y: 225, r: 6 }, emit(spec) { const b = new Bullet(spec); bullets.push(b); return b; } });
  for (const b of bullets) {
    const mid = { x: (b.a.x + b.b.x) / 2, y: (b.a.y + b.b.y) / 2, r: 6 };
    const angle = Math.atan2(b.b.y - b.a.y, b.b.x - b.a.x);
    b.age = b.warn - 0.001;
    assert.equal(b.hits(mid), false);
    b.age = b.warn;
    assert.equal(b.hits(mid), true);
    assert.equal(b.hits({ x: mid.x - Math.sin(angle) * 8.01, y: mid.y + Math.cos(angle) * 8.01, r: 6 }), false);
    b.age = b.life;
    assert.equal(b.hits(mid), false);
  }
});
