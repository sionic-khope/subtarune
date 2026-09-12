import test from 'node:test';
import assert from 'node:assert/strict';
import { createCannonGuard, cannonBreaths, cannonShotPosition, GUARD_BOARD, GUARD_LANES } from '../../src/battle/modes/cannon-guard.js';
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
  f.mode.update(4, input());
  assert.equal(f.mode.snapshot.phase, 'charge-dialogue');
  f.mode.update(0.21, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'controls-dialogue');
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
  assert.deepEqual(GUARD_BOARD, { x: 8, y: 12, w: 464, h: 304 });
  assert.deepEqual(GUARD_LANES, [78, 162, 246]);
  const breaths = cannonBreaths();
  for (const b of breaths) assert.ok(b.warn >= 0.6);
  const arrivals = breaths.map((b) => b.at + b.warn + b.travel);
  assert.ok(arrivals.every((a, i) => !i || a - arrivals[i - 1] > 0.89));
  assert.ok(arrivals.some((a) => a > 9 && a < 12));
  assert.ok(arrivals.every((a) => a < 12));
  assert.ok(breaths.every((b) => b.travel >= 1.1));
  assert.equal(new Set(breaths.map((b) => b.lane)).size, 3);
});

test('test_cannon_guard_dialogue_clock_frozen_until_typed_confirm', () => {
  const f = fixture();
  f.mode.update(4, input());
  f.battle.typed = false;
  f.mode.update(10, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'charge-dialogue');
  assert.equal(f.mode.snapshot.elapsed, 0);
  f.battle.typed = true;
  f.mode.update(1, input('cancel', 'left'));
  assert.equal(f.mode.snapshot.elapsed, 0);
  f.mode.update(0.01, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'controls-dialogue');
  assert.equal(f.lines.at(-1).text, BARON_CANNON.dialogue.controls.text);
  f.mode.update(0.3, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'guard');
  assert.equal(f.sounds.filter((s) => s === 'baron_roar').length, 1);
});

test('test_cannon_guard_success_twelve_seconds_then_slow_projectile_actual_impact_sixty_damage_once', () => {
  const f = fixture(); begin(f);
  defend(f, 8.9);
  assert.equal(f.mode.snapshot.phase, 'guard');
  assert.equal(f.sounds.includes('cannon_guard_charge'), false);
  defend(f, 0.11);
  assert.equal(f.mode.snapshot.phase, 'focus');
  assert.deepEqual(f.hits, []);
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_charge').length, 1);
  defend(f, 3.1);
  assert.equal(f.mode.snapshot.phase, 'fire');
  assert.ok(f.mode.snapshot.elapsed >= 12 && f.mode.snapshot.elapsed < 12.02);
  assert.equal(f.mode.snapshot.blocked, cannonBreaths().length);
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_breath').length, cannonBreaths().length);
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_block').length, cannonBreaths().length);
  f.mode.update(1.39, input());
  assert.deepEqual(f.hits, []);
  assert.equal(f.mode.snapshot.projectile.arrived, false);
  f.mode.update(0.02, input());
  assert.deepEqual(f.hits, [60]);
  assert.equal(f.target.hp, 190);
  assert.equal(f.mode.snapshot.projectile.arrived, true);
  assert.equal(f.lines.at(-1).text, '* 바론에게 60 데미지를 입혔다.');
  f.mode.update(1.4, input());
  assert.equal(f.mode.snapshot.phase, 'fire');
  f.mode.update(3, input());
  assert.equal(f.mode.snapshot.phase, 'success-dialogue');
  assert.equal(f.lines.at(-1).text, BARON_CANNON.dialogue.success.text);
  f.mode.update(0.3, input('confirm'));
  assert.equal(f.mode.update(0.9, input()), true);
  f.mode.update(10, input());
  assert.deepEqual(f.hits, [60]);
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_block').length, cannonBreaths().length);
});

test('test_cannon_guard_breath_sound_starts_after_warning_once_and_block_sound_waits_for_resolution', () => {
  const f = fixture(); begin(f);
  f.mode.update(0.69, input());
  assert.equal(f.sounds.includes('cannon_guard_breath'), false);
  assert.equal(f.mode.snapshot.breaths[0].launched, false);
  f.mode.update(0.02, input());
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_breath').length, 1);
  assert.equal(f.mode.snapshot.breaths[0].launched, true);
  f.mode.update(0.1, input());
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_breath').length, 1);
  assert.equal(f.sounds.includes('cannon_guard_block'), false);
  f.mode.update(0.8, input());
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_breath').length, 2);
  assert.equal(f.sounds.includes('cannon_guard_block'), false);
  f.mode.update(0.2, input());
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_block').length, 1);
  f.mode.update(0.1, input());
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_block').length, 1);
});

test('test_cannon_guard_missed_first_breath_never_plays_successful_block_sound', () => {
  const f = fixture(); begin(f);
  defend(f, 2, 0);
  assert.equal(f.mode.snapshot.phase, 'failure-dialogue');
  assert.equal(f.mode.snapshot.blocked, 0);
  assert.equal(f.sounds.includes('cannon_guard_block'), false);
  const launches = f.sounds.filter((s) => s === 'cannon_guard_breath').length;
  assert.equal(launches, 2);
  f.mode.update(1, input());
  assert.equal(f.sounds.filter((s) => s === 'cannon_guard_breath').length, launches);
  assert.equal(f.sounds.includes('cannon_guard_block'), false);
});

test('test_cannon_guard_active_jet_has_contiguous_pixel_columns_from_front_to_mouth', () => {
  const f = fixture(); begin(f);
  f.mode.update(1.4, input());
  const columns = [];
  const ctx = new Proxy({
    fillRect(x, y, w, h) {
      if (this.fillStyle === '#8d45db' && w === 2 && x > 166) columns.push({ x, y, w, h });
    },
  }, { get: (target, key) => target[key] ?? (() => {}) });
  f.mode.draw(ctx);
  const first = f.mode.snapshot.breaths[0];
  const distance = (340 - 178) * (1.4 - first.at - first.warn) / first.travel;
  assert.equal(columns.length, Math.floor(distance / 2) + 1);
  assert.equal(columns[0].x, 340);
  assert.equal(columns.at(-1).x, 340 - Math.floor(distance / 2) * 2);
  for (let i = 0; i < columns.length; i++) {
    const c = columns[i];
    assert.ok([c.x, c.y, c.w, c.h].every(Number.isInteger));
    if (i) {
      const previous = columns[i - 1];
      assert.equal(c.x + c.w, previous.x);
      assert.ok(c.y < previous.y + previous.h && previous.y < c.y + c.h);
    }
  }
});

test('test_cannon_guard_final_focus_miss_zero_damage_then_exact_failure_line_and_flyaway', () => {
  const f = fixture(); begin(f);
  defend(f, 9.1);
  assert.equal(f.mode.snapshot.phase, 'focus');
  defend(f, 3, 9);
  assert.equal(f.mode.snapshot.phase, 'failure-dialogue');
  assert.equal(f.lines.at(-1).text, BARON_CANNON.dialogue.failure.text);
  assert.deepEqual(f.hits, []);
  f.mode.update(0.3, input('confirm'));
  assert.equal(f.mode.snapshot.phase, 'fly');
  assert.equal(f.mode.update(1.3, input()), true);
  assert.deepEqual(f.hits, []);
  assert.equal(f.target.hp, 250);
});

test('test_cannon_guard_entry_frame_then_helpers_then_baron_before_dialogue', () => {
  const f = fixture();
  f.mode.update(0.4, input());
  assert.equal(f.mode.snapshot.entryStage, 'frame');
  f.mode.update(0.3, input());
  assert.equal(f.mode.snapshot.entryStage, 'helpers');
  f.mode.update(2, input());
  assert.equal(f.mode.snapshot.entryStage, 'baron');
  assert.equal(f.lines.length, 0);
  f.mode.update(1.3, input());
  assert.equal(f.mode.snapshot.phase, 'charge-dialogue');
});

test('test_cannon_guard_projectile_moves_from_muzzle_to_mouth_in_one_point_four_seconds', () => {
  assert.deepEqual(cannonShotPosition(0), { x: 105, y: 162, arrived: false });
  const midway = cannonShotPosition(0.7);
  assert.ok(midway.x > 105 && midway.x < 340);
  assert.equal(midway.arrived, false);
  assert.deepEqual(cannonShotPosition(1.4), { x: 340, y: 166, arrived: true });
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
