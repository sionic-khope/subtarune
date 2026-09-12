import test from 'node:test';
import assert from 'node:assert/strict';
import { createCannonGuard, cannonBreaths, GUARD_BOARD, GUARD_LANES } from '../../src/battle/modes/cannon-guard.js';
import { BARON_CANNON } from '../../src/data/baron-cannon.js';

const input = (...keys) => ({ down: (key) => keys.includes(key), just: (key) => keys.includes(key) });
function fixture() {
  const sounds = [], lines = [], hits = [], target = { hp: 250 };
  const battle = {
    typed: true,
    showLine: (line) => lines.push(line),
    sfx: (name) => sounds.push(name),
    applyCannonDamage: (enemy, damage) => { hits.push(damage); enemy.hp -= damage; },
  };
  return { battle, target, sounds, lines, hits, mode: createCannonGuard(battle, { target }) };
}
function begin(f) {
  f.mode.update(0.9, input());
  assert.equal(f.mode.snapshot.phase, 'charge-dialogue');
  f.mode.update(0.21, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'guard');
}
function defend(f, seconds, missAfter = Infinity) {
  for (let i = 0; i < Math.ceil(seconds * 120); i++) {
    const s = f.mode.snapshot;
    if (!['guard', 'focus'].includes(s.phase)) return;
    const next = s.breaths.find((b) => !b.resolved);
    let lane = next?.lane ?? s.lane;
    if (s.elapsed > missAfter) lane = lane === 0 ? 2 : 0;
    f.mode.update(1 / 120, lane === s.lane ? input() : input(lane < s.lane ? 'up' : 'down'));
  }
}

test('test_cannon_guard_schedule_three_stacked_lanes_and_sequential_warned_arrivals_through_final_charge', () => {
  assert.equal(GUARD_BOARD.h > GUARD_BOARD.w * 2, true);
  assert.deepEqual(GUARD_LANES, [90, 174, 258]);
  const breaths = cannonBreaths();
  for (const b of breaths) assert.ok(b.warn >= 0.6);
  const arrivals = breaths.map((b) => b.at + b.warn + b.travel);
  assert.ok(arrivals.every((a, i) => !i || a - arrivals[i - 1] >= 1));
  assert.ok(arrivals.some((a) => a > 12 && a < 15));
  assert.equal(new Set(breaths.map((b) => b.lane)).size, 3);
});

test('test_cannon_guard_dialogue_clock_frozen_until_typed_confirm', () => {
  const f = fixture();
  f.mode.update(0.9, input());
  f.battle.typed = false;
  f.mode.update(10, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'charge-dialogue');
  assert.equal(f.mode.snapshot.elapsed, 0);
  f.battle.typed = true;
  f.mode.update(1, input('cancel', 'left'));
  assert.equal(f.mode.snapshot.elapsed, 0);
  f.mode.update(0.01, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'guard');
  assert.equal(f.sounds.filter((s) => s === 'baron_roar').length, 1);
});

test('test_cannon_guard_success_fifteen_second_guard_then_single_fifty_damage_beam_and_exit', () => {
  const f = fixture(); begin(f);
  defend(f, 12.01);
  assert.equal(f.mode.snapshot.phase, 'focus');
  assert.deepEqual(f.hits, []);
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_charge').length, 1);
  defend(f, 3.1);
  assert.equal(f.mode.snapshot.phase, 'fire');
  assert.ok(f.mode.snapshot.elapsed >= 15 && f.mode.snapshot.elapsed < 15.02);
  assert.equal(f.mode.snapshot.blocked, cannonBreaths().length);
  f.mode.update(0.44, input());
  assert.deepEqual(f.hits, []);
  f.mode.update(0.02, input());
  assert.deepEqual(f.hits, [50]);
  assert.equal(f.target.hp, 200);
  f.mode.update(3, input());
  assert.equal(f.mode.snapshot.phase, 'success-dialogue');
  assert.equal(f.lines.at(-1).text, BARON_CANNON.dialogue.success.text);
  f.mode.update(0.3, input('confirm'));
  assert.equal(f.mode.update(0.9, input()), true);
  f.mode.update(10, input());
  assert.deepEqual(f.hits, [50]);
});

test('test_cannon_guard_final_focus_miss_zero_damage_then_exact_failure_line_and_flyaway', () => {
  const f = fixture(); begin(f);
  defend(f, 12.1);
  assert.equal(f.mode.snapshot.phase, 'focus');
  defend(f, 3, 12);
  assert.equal(f.mode.snapshot.phase, 'failure-dialogue');
  assert.equal(f.lines.at(-1).text, BARON_CANNON.dialogue.failure.text);
  assert.deepEqual(f.hits, []);
  f.mode.update(0.3, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'fly');
  assert.equal(f.mode.update(1.3, input()), true);
  assert.deepEqual(f.hits, []);
  assert.equal(f.target.hp, 250);
});

test('test_cannon_guard_input_bounded_delayed_repeat_and_no_cancel_bypass', () => {
  const f = fixture(); begin(f);
  const held = { down: (key) => key === 'down', just: () => false };
  f.mode.update(0.01, held);
  assert.equal(f.mode.snapshot.lane, 2);
  f.mode.update(0.1, held);
  assert.equal(f.mode.snapshot.lane, 2);
  f.mode.update(0.01, input('up'));
  assert.equal(f.mode.snapshot.lane, 1);
  f.mode.update(0.01, input('left', 'right', 'cancel', 'confirm'));
  assert.equal(f.mode.snapshot.lane, 1);
  assert.equal(f.mode.snapshot.phase, 'guard');
  f.mode.dispose();
  assert.equal(f.mode.update(20, input('confirm')), true);
  assert.deepEqual(f.hits, []);
});
