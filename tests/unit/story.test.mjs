// 스토리 단계 시스템: 뒤 단계 도달 → 앞 단계 플래그 자동, 되돌아가지 않음, 모르는 단계 무시
import test from 'node:test';
import assert from 'node:assert/strict';
import { Story, STAGES } from '../../src/core/story.js';

test('story_advance_backfills_earlier_stage_flags', () => {
  const flags = {}; const s = new Story(flags);
  s.advance('cord_found');
  for (const st of STAGES.slice(0, STAGES.indexOf(Story.stageOf('cord_found')) + 1)) assert.equal(flags[st.id], true, st.id);
  assert.equal(s.stage, 'cord_found');
  assert.ok(s.atLeast('pc_checked')); assert.ok(!s.before('pc_checked'));
});
test('story_advance_never_regresses', () => {
  const flags = {}; const s = new Story(flags);
  s.advance('living_entered');
  assert.equal(s.advance('opening_seen'), false);
  assert.equal(s.stage, 'living_entered');
  assert.equal(flags.living_entered, true);
});
test('story_advance_returns_true_only_when_moving_up', () => {
  const s = new Story({});
  assert.equal(s.advance('pc_checked'), true);
  assert.equal(s.advance('pc_checked'), false);
});
test('story_unknown_stage_is_ignored', () => {
  const flags = {}; const s = new Story(flags);
  const warn = console.warn; console.warn = () => {};
  try { assert.equal(s.advance('nope'), false); } finally { console.warn = warn; }
  assert.equal(s.stage, 'start'); assert.deepEqual(flags, {});
});
test('story_load_restores_stage_and_flags', () => {
  const flags = {}; const s = new Story(flags);
  s.load({ stage: 'pc_checked' });
  assert.equal(s.stage, 'pc_checked'); assert.equal(flags.opening_seen, true); assert.equal(flags.pc_checked, true); assert.equal(flags.cord_found, undefined);
});
test('story_stages_have_unique_ids_in_order', () => {
  const ids = STAGES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids[0], 'start');
});
