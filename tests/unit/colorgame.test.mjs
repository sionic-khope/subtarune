// 색깔 기억 게임 규칙(BUILD198, 용광로 광장 조작 패널): 8판 순서·1초 호출·마지막 판 혼돈 단어·순서대로 누르기·시간 초과. DOM 없이 순수 함수만.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COLORS, NOISE, STAGES, RULES, makeRound, stepRound, pressRound, passRound, passReady, answerProgress, wordOf } from '../../src/scenes/colorgame-core.js';

const colorIds = new Set(COLORS.map(c => c.id)), noiseIds = new Set(NOISE.map(n => n.id));
const runUntil = (round, pred, max = 60) => { const ev = []; for (let t = 0; t < max; t += 1 / 60) { ev.push(...stepRound(round, 1 / 60)); if (pred(ev, round)) break; } return ev; };

test('test_colorgame_stages_grow_to_eight_and_only_the_last_mixes_noise_words', () => {
  assert.equal(STAGES.length, 8);
  assert.deepEqual(COLORS.map(c => c.ko), ['빨', '주', '노', '초', '파', '남', '보']);
  for (let i = 0; i < 7; i++) { assert.ok(STAGES[i].length >= 1); assert.ok(STAGES[i].every(id => colorIds.has(id)), `stage ${i + 1} 는 색만`); if (i) assert.ok(STAGES[i].length >= STAGES[i - 1].length); }
  assert.deepEqual(STAGES[0], ['red']); assert.deepEqual(STAGES[1], ['red', 'green']);
  const last = STAGES[7];
  assert.ok(last.filter(id => noiseIds.has(id)).length >= 5, '마지막 판엔 사용자 원문의 이상한 말이 섞인다');
  assert.ok(last.every(id => colorIds.has(id) || noiseIds.has(id)));
  for (const n of ['heart', 'nasdf', 'pi', 'legend', 'ngaita']) assert.ok(last.includes(n), n);
  assert.deepEqual(NOISE.map(n => n.label), ['하트', 'nasdf', 'pi', '레전드', '응아잇어']);
});

test('test_colorgame_calls_fire_one_per_second_then_answer_phase_begins', () => {
  const round = makeRound(1);   // ['red','green']
  assert.equal(round.status, 'calling'); assert.equal(round.gap, RULES.callGap);
  let ev = runUntil(round, ev => ev.some(e => e.type === 'call'), 0.5);
  assert.deepEqual(ev.filter(e => e.type === 'call').map(e => [e.id, e.index]), [['red', 0]]);
  ev = runUntil(round, ev => ev.filter(e => e.type === 'call').length >= 1, 1.2);
  const second = ev.find(e => e.type === 'call'); assert.equal(second.id, 'green');
  assert.ok(Math.abs(round.t - RULES.callGap) < 0.05, `둘째 호출은 1초 뒤 (${round.t})`);
  ev = runUntil(round, ev => ev.some(e => e.type === 'answer'), 5);
  assert.equal(round.status, 'answer');
  assert.ok(Math.abs(round.t - (2 * RULES.callGap + RULES.preRoll)) < 0.05, `호출이 끝나고 preRoll 뒤 입력 차례 (${round.t})`);
  assert.equal(round.limit, RULES.answerBase + RULES.answerPer * 2);
});

test('test_colorgame_chaos_stage_babbles_faster_in_a_loop_and_only_the_exclamation_button_passes', () => {
  const round = makeRound(7);
  assert.ok(round.chaos); assert.equal(round.gap, RULES.chaosGap);
  assert.ok(round.gap < RULES.callGap);
  assert.ok(STAGES[7].filter(id => colorIds.has(id)).length >= 6);
  // 3초 뒤 느낌표 버튼(사용자 “한 3초 정도 지나서”)
  runUntil(round, () => round.t >= 2.9, 3);
  assert.equal(passReady(round), false);
  runUntil(round, () => round.t >= RULES.chaosPassAt + 0.05, 1);
  assert.equal(passReady(round), true);
  // 호출은 입력 차례로 넘어가지 않고 계속 반복된다(어쩌고저쩌고)
  const ev = runUntil(round, ev => ev.some(e => e.type === 'answer'), 14);
  const calls = ev.filter(e => e.type === 'call');
  assert.ok(!ev.some(e => e.type === 'answer' || e.type === 'timeout'), '혼돈 판엔 입력 차례·시간 초과가 없다');
  assert.ok(calls.length > STAGES[7].length, `한 바퀴 돌고 다시 처음부터 (${calls.length})`);
  assert.ok(calls.some(e => e.kind === 'noise') && calls.some(e => e.kind === 'color'));
  assert.equal(round.status, 'calling');
  assert.equal(pressRound(round, 'red').type, 'ignored', '색 버튼은 통과가 아니다');
  assert.equal(passRound(round).type, 'pass'); assert.equal(round.status, 'pass');
  assert.equal(passRound(round).type, 'ignored');
  assert.equal(passRound(makeRound(0)).type, 'ignored', '보통 판엔 느낌표 버튼이 없다');
  assert.equal(wordOf('heart').label, '하트'); assert.equal(wordOf('red').en, 'RED'); assert.equal(wordOf('red').kind, 'color');
});

test('test_colorgame_presses_ignored_while_calling_then_correct_order_clears_and_wrong_press_fails', () => {
  const round = makeRound(2);   // ['red','green','yellow']
  assert.equal(pressRound(round, 'red').type, 'ignored');
  runUntil(round, ev => ev.some(e => e.type === 'answer'), 10);
  assert.equal(pressRound(round, 'red').type, 'ok'); assert.equal(round.i, 1);
  assert.equal(pressRound(round, 'green').type, 'ok');
  const done = pressRound(round, 'yellow'); assert.equal(done.type, 'clear'); assert.equal(round.status, 'clear');
  assert.equal(pressRound(round, 'red').type, 'ignored', '끝난 판은 무시');
  const bad = makeRound(2); runUntil(bad, ev => ev.some(e => e.type === 'answer'), 10);
  const w = pressRound(bad, 'blue'); assert.equal(w.type, 'wrong'); assert.equal(w.want, 'red'); assert.equal(w.got, 'blue'); assert.equal(bad.status, 'wrong');
});

test('test_colorgame_answer_time_runs_out_and_progress_reaches_one', () => {
  const round = makeRound(0);
  runUntil(round, ev => ev.some(e => e.type === 'answer'), 10);
  assert.equal(answerProgress(round), 0);
  const ev = runUntil(round, ev => ev.some(e => e.type === 'timeout'), 30);
  assert.ok(ev.some(e => e.type === 'timeout')); assert.equal(round.status, 'timeout');
  assert.ok(answerProgress(round) >= 1 - 1e-6);
  assert.ok(Math.abs(round.answerT - round.limit) < 0.05);
});

test('test_colorgame_voice_files_and_camera_clip_exist', () => {
  for (const c of COLORS) assert.ok(fs.existsSync(`assets/audio/sfx/color_${c.id}.mp3`), c.id);
  for (const n of NOISE) assert.ok(fs.existsSync(`assets/audio/sfx/color_${n.id}.mp3`), n.id);
  assert.ok(fs.existsSync(RULES.camVideo));
  for (const p of ['assets/props/hand_point.png', 'assets/props/hand_press.png']) assert.ok(fs.existsSync(p), p);
});
