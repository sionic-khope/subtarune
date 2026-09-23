import test from 'node:test';
import assert from 'node:assert/strict';
import { createChoimisFinalAssault } from '../../src/battle/choimis-final-assault.js';

const input = (...keys) => ({ down: key => keys.includes(key) });
function fixture() {
  const calls = { damage: 0, sounds: [], paused: 0 };
  const enemy = { hp: 1, def: { damage: 15, scale: 0.506, scaleY: 1.2 }, projectiles: {} };
  const soul = { x: 240, y: 170, r: 5, invuln: 0 };
  const battle = { soul, hurtParty: () => calls.damage++, sfx: name => calls.sounds.push(name),
    hitEnemy: () => assert.fail('survival contacts must never request HP damage'),
    game: { sound: { sfx: () => ({ pause: () => calls.paused++, removeAttribute() {}, load() {} }) } } };
  const mode = createChoimisFinalAssault(battle, enemy, { box: { x: 8, y: 8, w: 464, h: 304 } });
  return { mode, battle, enemy, calls };
}

test('final assault completes only after sixty seconds, with no shooting required', () => {
  const { mode, enemy } = fixture();
  assert.equal(mode.update(59.99, input()), false);
  assert.equal(mode.update(0.01, input()), true);
  assert.equal(mode.snapshot.elapsed, 60);
  assert.equal(enemy.hp, 1);
});

test('final assault leaves a reachable corridor through every wave and beam', () => {
  const { mode, battle, calls } = fixture();
  let previousY = mode.snapshot.safeY, peak = 0;
  const kinds = new Set();
  for (let step = 0; step < 3600; step++) {
    const target = mode.snapshot.safeY;
    const direction = Math.abs(target - battle.soul.y) < 1 ? [] : [target > battle.soul.y ? 'down' : 'up'];
    mode.update(1 / 60, input(...direction));
    const state = mode.snapshot;
    assert.ok(Math.abs(state.safeY - previousY) <= 126 / 60);
    assert.ok(state.hazards.length <= 96);
    for (const hazard of state.hazards) { kinds.add(hazard.kind); assert.ok(hazard.warn >= 0.3); }
    peak = Math.max(peak, state.hazards.length); previousY = state.safeY;
  }
  assert.equal(calls.damage, 0);
  assert.ok(peak >= 20, `expected dense attack, peak=${peak}`);
  assert.deepEqual([...kinds].sort(), ['bazziKart', 'beam', 'daoKart', 'money', 'noodle', 'petal']);
});

test('charged shots survive multiple contacts without boss damage', () => {
  const { mode, battle, enemy } = fixture();
  const fired = new Set();
  for (let step = 0; step < 1800; step++) {
    const snapshot = mode.snapshot;
    const target = step < 600 ? snapshot.hazards.find(h => h.kind === 'noodle' && h.age >= h.warn) : snapshot.boss;
    if (target) battle.soul.y = target.y;
    const cycle = step % 90;
    mode.update(1 / 60, input(...(cycle >= 1 && cycle <= 40 ? ['confirm'] : [])));
    for (const shot of mode.snapshot.shots) if (shot.charged && shot.contacts > 1) fired.add(shot.id);
  }
  assert.ok(mode.snapshot.destroyed > 0);
  assert.ok(mode.snapshot.contacts > 0);
  assert.ok(fired.size > 0, 'at least one charged shot penetrates multiple targets');
  assert.equal(enemy.hp, 1);
  assert.equal(mode.snapshot.elapsed, 30);
});

test('tap shots break noodles, consume the shot and never charge', () => {
  const { mode, battle, calls } = fixture();
  for (let step = 0; step < 720; step++) {
    const target = mode.snapshot.hazards.find(h => h.kind === 'noodle' && h.age >= h.warn && h.x > battle.soul.x);
    if (target) battle.soul.y = target.y;
    mode.update(1 / 60, input(...(step % 30 === 1 ? ['confirm'] : [])));
    assert.ok(mode.snapshot.shots.every(shot => !shot.charged && shot.contacts === 0));
  }
  assert.ok(mode.snapshot.destroyed > 0);
  assert.ok(calls.sounds.includes('yellowheart_shot'));
  assert.ok(!calls.sounds.includes('yellowheart_shot_big'));
});

test('standing still takes real party damage while invulnerability limits repeated hits', () => {
  const { mode, calls } = fixture();
  mode.update(60, input());
  assert.ok(calls.damage > 8, `stationary damage contacts=${calls.damage}`);
  assert.ok(calls.damage <= 80, '0.75s invulnerability bounds party damage');
});

test('combat rendering contains no screen background, panel border, or explanation text', () => {
  const { mode } = fixture();
  const fills = [], texts = [], borders = [];
  const ctx = new Proxy({ fillRect: (...rect) => fills.push(rect), fillText: (...args) => texts.push(args),
    strokeRect: (...rect) => borders.push(rect) }, { get: (target, key) => target[key] ?? (() => {}) });
  mode.update(17, input());
  mode.draw(ctx);
  assert.deepEqual(texts, []);
  assert.deepEqual(borders, []);
  assert.ok(fills.every(rect => rect[2] < 100 && rect[3] < 100));
});

test('disposal cancels charge, clears projectiles, restores soul and cannot finish early', () => {
  const { mode, battle, calls } = fixture();
  mode.update(0.01, input()); mode.update(0.3, input('confirm'));
  mode.dispose(); mode.dispose();
  assert.equal(calls.paused, 1);
  assert.equal(mode.snapshot.shots.length, 0);
  assert.equal(mode.snapshot.hazards.length, 0);
  assert.equal(mode.snapshot.charge.active, false);
  assert.equal(battle.soul.x, 240);
  assert.equal(battle.soul.y, 170);
  assert.equal(mode.update(60, input()), false);
});
