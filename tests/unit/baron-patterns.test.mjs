import test from 'node:test';
import assert from 'node:assert/strict';
import { Bullet, PATTERNS } from '../../src/battle/bullets.js';
import { ENEMIES } from '../../src/data/enemies.js';

const BOX = { x: 140, y: 139, w: 200, h: 150 };
const SOUL = { x: 240, y: 214, r: 6 };

function simulate(config, step = 1 / 60) {
  const pattern = PATTERNS[config.type](config);
  const emitted = [], sounds = [];
  let now = 0, active = [], maxActive = 0, centerThreat = false;
  const api = { box: BOX, soul: SOUL, rnd: () => 0.4,
    emit: (options) => { const b = new Bullet(options); emitted.push({ at: now, b }); active.push(b); },
    sfx: (name) => sounds.push({ at: now, name }),
  };
  for (now = 0; now < pattern.duration + 3; now += step) {
    pattern.update(now, step, api);
    for (const b of active) b.update(step, BOX);
    active = active.filter((b) => !b.out(BOX));
    maxActive = Math.max(maxActive, active.length);
    centerThreat ||= active.some((b) => b.hits(SOUL));
    let safe = 0;
    for (let x = BOX.x + 12; x < BOX.x + BOX.w - 12; x += 10)
      for (let y = BOX.y + 12; y < BOX.y + BOX.h - 12; y += 10)
        if (active.every((b) => !b.hits({ x, y, r: 6 }))) safe++;
    assert.ok(safe >= 12, `${config.type} at ${now.toFixed(2)}: usable safe area`);
  }
  assert.equal(active.length, 0, 'all hazards expire without engine teardown');
  return { emitted, sounds, maxActive, centerThreat };
}

test('test_baron_six_signature_timelines_are_warned_bounded_and_cleanup', () => {
  assert.equal(new Set(ENEMIES.baron.patterns.map((p) => p.type)).size, 6);
  for (const config of ENEMIES.baron.patterns) {
    assert.ok(config.type.startsWith('baron_'));
    const { emitted, maxActive, centerThreat } = simulate(config);
    assert.ok(centerThreat, `${config.type}: center camping must be threatened`);
    assert.ok(emitted.length > 10);
    assert.ok(maxActive <= 100, `${config.type}: bounded active bullets`);
    for (const { at, b } of emitted) {
      assert.ok(b.shape.startsWith('baron_'));
      assert.ok(Number.isFinite(b.life) && b.life > 0);
      assert.ok(at + b.life <= config.duration + 0.07, `${config.type}: finishes within turn`);
      if (b.harmless) continue;
      assert.ok(b.outline.length > 0, 'warning has a hollow silhouette');
      for (const c of b.cells) {
        assert.ok(Math.round(b.x) + Math.round(c.x) >= BOX.x && Math.round(b.x) + Math.round(c.x) + c.w <= BOX.x + BOX.w);
        assert.ok(Math.round(b.y) + Math.round(c.y) >= BOX.y && Math.round(b.y) + Math.round(c.y) + c.h <= BOX.y + BOX.h);
      }
      assert.ok(b.warn >= 0.45);
      b.age = b.warn - 0.001;
      const cell = b.cells[0];
      const target = { x: b.x + cell.x + cell.w / 2, y: b.y + cell.y + cell.h / 2, r: 2 };
      assert.equal(b.hits(target), false);
      b.age = b.warn + 0.001;
      assert.equal(b.hits(target), true, 'rendered cell becomes damage after warning');
      assert.equal(b.hits({ x: BOX.x - 50, y: BOX.y - 50, r: 2 }), false);
    }
  }
});

test('test_baron_does_not_delegate_to_generic_enemy_templates', () => {
  const originals = new Map();
  try {
    for (const name of Object.keys(PATTERNS).filter((name) => !name.startsWith('baron_'))) {
      originals.set(name, PATTERNS[name]);
      PATTERNS[name] = () => { throw new Error(`reused ${name}`); };
    }
    for (const config of ENEMIES.baron.patterns) simulate(config, 1 / 30);
  } finally {
    for (const [name, factory] of originals) PATTERNS[name] = factory;
  }
});
