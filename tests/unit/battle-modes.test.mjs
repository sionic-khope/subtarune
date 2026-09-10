// 전투 기믹 모드 레지스트리: 기본(rush/bullets)·예시(timing) 등록, 중복·오타 방지, 모드 객체 계약(update/draw)
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerBattleMode, getBattleMode, listBattleModes, NATIVE } from '../../src/battle/modes.js';
import { createTimingAttack } from '../../src/battle/modes/timing.js';

test('test_battle_modes_defaults_and_example_registered', () => {
  const l = listBattleModes();
  assert.ok(l.attack.includes('rush') && l.attack.includes('timing'), JSON.stringify(l));
  assert.ok(l.enemy.includes('bullets'), JSON.stringify(l));
  assert.equal(getBattleMode('attack', 'rush'), NATIVE); assert.equal(getBattleMode('enemy', 'bullets'), NATIVE);
  assert.equal(typeof getBattleMode('attack', 'timing'), 'function'); assert.equal(getBattleMode('attack', 'nope'), null);
});
test('test_battle_modes_reject_duplicates_and_bad_kind', () => {
  assert.throws(() => registerBattleMode('attack', 'rush', () => ({})), /이미 있는/);
  assert.throws(() => registerBattleMode('dance', 'x', () => ({})), /모르는 종류/);
  assert.throws(() => registerBattleMode('enemy', 'bad', 'not-a-function'), /함수/);
});
test('test_timing_mode_hits_when_confirmed_at_center_and_misses_at_edge', () => {
  const calls = [];
  const battle = { hitEnemy: (t, m, d) => calls.push(['hit', d]), setText: (s) => calls.push(['text', s]), sfx: () => {}, box: () => {} };
  const member = { name: '형섭' }, target = { hp: 6 };
  const inputNo = { just: () => false }, inputC = { just: (k) => k === 'confirm' };
  const m = createTimingAttack(battle, { member, target });
  // 마커는 300px/s 로 220px 바를 왕복: 0.3667s 뒤 가운데(110px)
  for (let i = 0; i < 36; i++) m.update(0.01, inputNo);
  assert.equal(m.update(0.0067, inputC), false); assert.deepEqual(calls[0], ['hit', 2]);   // PERFECT = 2
  let done = false; for (let i = 0; i < 60 && !done; i++) done = m.update(0.01, inputNo); assert.ok(done, '결과 표시 뒤 끝나야');
  const calls2 = []; const b2 = { ...battle, hitEnemy: (t, mm, d) => calls2.push(['hit', d]), setText: (s) => calls2.push(['text', s]) };
  const m2 = createTimingAttack(b2, { member, target }); m2.update(0.01, inputC);           // 시작 직후(x≈3) = 빗나감
  assert.deepEqual(calls2, [['text', '* 형섭 의 공격이 빗나갔다.']]);
});
