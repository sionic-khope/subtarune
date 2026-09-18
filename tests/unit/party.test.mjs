// 파티 조합 정규화 (사용자 2026-09-10 "형섭 / 형섭+경섭 / 형섭+빠맨 / 셋 — 모든 조합, 걷는 순서는 형섭 → 경섭 → 빠맨").
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeParty, fullParty } from '../../src/core/party.js';
import { PARTY_ORDER } from '../../src/data/characters.js';

test('test_party_every_combination_normalizes_to_walk_order', () => {
  const cases = [[[], []], [['ppaman'], ['ppaman']], [['gyeongsub'], ['gyeongsub']], [['ppaman', 'gyeongsub'], ['gyeongsub', 'ppaman']], [['gyeongsub', 'ppaman'], ['gyeongsub', 'ppaman']]];
  for (const [input, want] of cases) assert.deepEqual(normalizeParty(input), want, JSON.stringify(input));
});
test('test_party_drops_leader_unknown_and_duplicates', () => {
  assert.deepEqual(normalizeParty(['hyungsub', 'ppaman', 'ppaman', 'nobody', 42, null]), ['ppaman']);
  assert.deepEqual(normalizeParty(undefined), []);
  assert.deepEqual(fullParty(['ppaman', 'gyeongsub']), ['hyungsub', 'gyeongsub', 'ppaman']);
});
test('test_party_order_constant_is_gyeongsub_then_ppaman_then_janitor', () => { assert.deepEqual(PARTY_ORDER, ['gyeongsub', 'ppaman', 'janitor']); });
