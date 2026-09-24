import test from 'node:test';
import assert from 'node:assert/strict';
import { CATHEDRAL, pickVolley, volleyInterval, laneOf, swordHitRect } from '../../src/scenes/castle-cathedral.js';
import { castle_cathedral_intro } from '../../src/data/cutscenes/castle_cathedral.js';

const seq = values => { let i = 0; return () => values[i++ % values.length]; };

test('test_cathedral_volley_early_is_always_single', () => {
  for (const r of [0, 0.2, 0.5, 0.99]) assert.equal(pickVolley(0.1, 1, seq([r, r, r])).length, 1);
});

test('test_cathedral_volley_late_double_always_leaves_one_safe_lane', () => {
  for (let lane = 0; lane < 3; lane++) {
    for (const r of [0, 0.3, 0.7]) {
      const lanes = pickVolley(0.9, lane, seq([r, r, 0]));
      assert.ok(lanes.length <= 2 && new Set(lanes).size === lanes.length, JSON.stringify(lanes));
      assert.ok(lanes.every(l => l >= 0 && l <= 2));
    }
  }
});

test('test_cathedral_volley_double_includes_player_lane', () => {
  const lanes = pickVolley(0.9, 2, seq([0.99, 0, 0]));
  assert.equal(lanes.length, 2);
  assert.ok(lanes.includes(2));
});

test('test_cathedral_interval_tightens_with_progress', () => {
  assert.equal(volleyInterval(0), CATHEDRAL.interval[0]);
  assert.equal(volleyInterval(1), CATHEDRAL.interval[1]);
  assert.ok(volleyInterval(0.5) < volleyInterval(0.2));
  assert.ok(CATHEDRAL.interval[1] > CATHEDRAL.charge, 'a new volley never starts before the last charge ends');
});

test('test_cathedral_lane_hit_matches_warning_band_and_fits_lane', () => {
  assert.deepEqual(CATHEDRAL.lanes.map(laneOf), [0, 1, 2]);
  const rect = swordHitRect({ lane: 1, y: 100 });
  assert.equal(rect.x + rect.w / 2, CATHEDRAL.lanes[1]);
  assert.ok(rect.w < 64, 'hit narrower than the 64px lane');
  const adjacent = CATHEDRAL.lanes[2] - 12;
  assert.ok(adjacent > rect.x + rect.w, 'a 24px body centred in the next lane is safe');
});

test('test_cathedral_intro_keeps_user_lines_in_order', () => {
  const lines = castle_cathedral_intro.filter(n => typeof n.text === 'string').map(n => n.text.replace(/\{w=[^}]*\}/g, ''));
  assert.deepEqual(lines, ['* 여긴 어딜까요', '* 그러게 뭔가 성당같..', '* 후후후', '* 용캐 여기까지 지나왔구나.', '* 씨발년',
    '* 그래 너희들의 능력은 인정해주지', '* 한번 붙어보자고', '* 물론', '* 날 잡는다면 말이지', '* 으윽..', '* 어떻게든 뚫고가야해']);
  const cut = castle_cathedral_intro.find(n => n.text?.startsWith('* 그러게'));
  assert.ok(cut.auto <= 0.1, 'gyeongsub is cut off by the laugh');
});
