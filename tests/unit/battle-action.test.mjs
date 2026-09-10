import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleAction } from '../../src/ui/battle-action.js';

test('test_battle_action_approach_attack_return_restores_exact_home', () => {
  const action = new BattleAction([0, 10], [190, 10], 0.5);
  assert.equal(action.start(), true);
  action.update(0.5);
  assert.equal(action.mode, 'approach');
  assert.deepEqual(action.position, [95, 10]);
  action.update(0.5);
  assert.equal(action.mode, 'attack');
  assert.deepEqual(action.position, [190, 10]);
  action.update(0.5);
  assert.equal(action.mode, 'return');
  action.update(0.5);
  assert.deepEqual(action.position, [95, 10]);
  action.update(0.5);
  assert.equal(action.mode, 'idle');
  assert.deepEqual(action.position, [0, 10]);
});

test('test_battle_action_repeated_start_preserves_busy_progress', () => {
  const action = new BattleAction([0, 0], [190, 0], 0.5);
  action.start();
  action.update(0.25);
  assert.equal(action.start(), false);
  assert.equal(action.elapsed, 0.25);
});

test('test_battle_action_cancel_and_large_delta_restore_home', () => {
  const action = new BattleAction([12, 24], [202, 24], 0.5);
  action.start();
  action.update(1.6);
  action.reset();
  assert.equal(action.mode, 'idle');
  assert.deepEqual(action.position, [12, 24]);
  action.start();
  action.update(10);
  assert.equal(action.mode, 'idle');
  assert.deepEqual(action.position, [12, 24]);
});
