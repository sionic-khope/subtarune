// 색깔 기억 게임 규칙(BUILD198, 용광로 광장 조작 패널): 8판 순서·1초 호출·마지막 판 혼돈 단어·순서대로 누르기·시간 초과. DOM 없이 순수 함수만.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COLORS, NOISE, STAGES, SEQUENCE, RULES, makeRound, stepRound, pressRound, passRound, passReady, answerProgress, wordOf } from '../../src/scenes/colorgame-core.js';

const colorIds = new Set(COLORS.map(c => c.id)), noiseIds = new Set(NOISE.map(n => n.id));
const runUntil = (round, pred, max = 60) => { const ev = []; for (let t = 0; t < max; t += 1 / 60) { ev.push(...stepRound(round, 1 / 60)); if (pred(ev, round)) break; } return ev; };

test('test_colorgame_stages_grow_to_eight_and_only_the_last_mixes_noise_words', () => {
  assert.equal(STAGES.length, 8);
  assert.deepEqual(COLORS.map(c => c.ko), ['빨', '주', '노', '초', '파', '남', '보']);
  // 1~7판: 앞 판 순서 그대로 + 색 하나(사용자 “전 단계랑 이어져서 하나 추가”)
  for (let i = 0; i < 7; i++) { assert.equal(STAGES[i].length, i + 1); assert.ok(STAGES[i].every(id => colorIds.has(id)), `stage ${i + 1} 는 색만`); if (i) assert.deepEqual(STAGES[i].slice(0, i), STAGES[i - 1]); }
  assert.deepEqual(STAGES[0], ['red']); assert.deepEqual(STAGES[1], ['red', 'green']); assert.deepEqual(STAGES[2], ['red', 'green', 'yellow']); assert.deepEqual(STAGES[6], SEQUENCE);
  assert.equal(new Set(SEQUENCE).size, 7, '일곱 색이 한 번씩');
  const last = STAGES[7];
  assert.ok(last.filter(id => noiseIds.has(id)).length >= 5, '마지막 판엔 사용자 원문의 이상한 말이 섞인다');
  assert.ok(last.every(id => colorIds.has(id) || noiseIds.has(id)));
  for (const n of ['heart', 'nasdf', 'pi', 'legend', 'ngaita']) assert.ok(last.includes(n), n);
  assert.deepEqual(NOISE.map(n => n.label), ['하트', 'nasdf', 'pi', '레전드', '응아잇어']);
});

test('test_colorgame_calls_fire_one_per_second_then_answer_starts_right_after_the_last_call', () => {
  const round = makeRound(1);   // ['red','green']
  assert.equal(round.status, 'calling'); assert.equal(round.gap, RULES.callGap);
  let ev = runUntil(round, ev => ev.some(e => e.type === 'call'), 0.5);
  assert.deepEqual(ev.filter(e => e.type === 'call').map(e => [e.id, e.index]), [['red', 0]]);
  ev = runUntil(round, ev => ev.filter(e => e.type === 'call').length >= 1, 1.2);
  const second = ev.find(e => e.type === 'call'); assert.equal(second.id, 'green');
  assert.ok(Math.abs(round.t - RULES.callGap) < 0.05, `둘째 호출은 1초 뒤 (${round.t})`);
  ev = runUntil(round, ev => ev.some(e => e.type === 'answer'), 5);
  assert.equal(round.status, 'answer');
  const expectAt = RULES.callGap + RULES.callHold + RULES.preRoll;
  assert.ok(Math.abs(round.t - expectAt) < 0.05, `마지막 색이 꺼지면 바로 입력 차례 (${round.t} ≈ ${expectAt})`);
  assert.ok(round.t - RULES.callGap < 1.0, '마지막 호출 뒤 1초 안에 입력 차례');
  // 제한 시간은 모든 판 같다
  assert.equal(round.limit, RULES.answerTime); assert.equal(makeRound(0).limit, RULES.answerTime); assert.equal(makeRound(6).limit, RULES.answerTime);
});

test('test_colorgame_chaos_stage_babbles_faster_in_a_loop_and_only_the_exclamation_button_passes', () => {
  const round = makeRound(7);
  assert.ok(round.chaos); assert.equal(round.gap, RULES.chaosGap);
  assert.ok(round.gap < RULES.callGap);
  assert.ok(STAGES[7].filter(id => colorIds.has(id)).length >= 6);
  assert.deepEqual(STAGES[7].filter(id => colorIds.has(id)).slice(0, 7), SEQUENCE, '광기 판도 7판 순서로 시작');
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

test('test_colorgame_presses_ignored_while_calling_then_correct_order_clears', () => {
  const round = makeRound(2);   // ['red','green','yellow']
  assert.equal(pressRound(round, 'red').type, 'ignored');
  runUntil(round, ev => ev.some(e => e.type === 'answer'), 10);
  assert.equal(pressRound(round, 'red').type, 'ok'); assert.equal(round.i, 1);
  assert.equal(pressRound(round, 'green').type, 'ok');
  const done = pressRound(round, 'yellow'); assert.equal(done.type, 'clear'); assert.equal(round.status, 'clear');
  assert.equal(pressRound(round, 'red').type, 'ignored', '끝난 판은 무시');
});

test('test_colorgame_wrong_press_keeps_the_round_and_only_speeds_up_the_cage', () => {
  const round = makeRound(2); runUntil(round, ev => ev.some(e => e.type === 'answer'), 10);
  const w = pressRound(round, 'blue');
  assert.equal(w.type, 'wrong'); assert.equal(w.want, 'red'); assert.equal(w.got, 'blue');
  assert.equal(round.status, 'answer', '틀려도 판은 계속'); assert.equal(round.i, 0); assert.equal(round.speed, RULES.wrongSpeedUp); assert.equal(round.wrongs, 1);
  pressRound(round, 'blue'); assert.equal(round.speed, RULES.wrongSpeedUp * RULES.wrongSpeedUp, '누적');
  // 같은 시간에 철창이 더 내려가 있다
  const fast = round, slow = makeRound(2); runUntil(slow, ev => ev.some(e => e.type === 'answer'), 10);
  runUntil(fast, () => false, 1); runUntil(slow, () => false, 1);
  assert.ok(answerProgress(fast) > answerProgress(slow) * 2, `빨라진 철창 ${answerProgress(fast)} > ${answerProgress(slow)}`);
  assert.equal(pressRound(round, 'red').type, 'ok', '틀린 뒤에도 맞는 색부터 이어서');
});

test('test_colorgame_answer_time_runs_out_and_progress_reaches_one', () => {
  const round = makeRound(0);
  runUntil(round, ev => ev.some(e => e.type === 'answer'), 10);
  assert.equal(answerProgress(round), 0);
  const ev = runUntil(round, ev => ev.some(e => e.type === 'timeout'), 30);
  assert.ok(ev.some(e => e.type === 'timeout')); assert.equal(round.status, 'timeout');
  assert.ok(answerProgress(round) >= 1 - 1e-6);
  assert.ok(Math.abs(round.answerT - round.limit) < 0.05);
  assert.ok(Math.abs(round.t - round.answerAt - RULES.answerTime) < 0.05, '제한 시간 그대로 흐른 뒤 timeout');
});

test('test_colorgame_voice_files_and_camera_clip_exist', () => {
  for (const c of COLORS) assert.ok(fs.existsSync(`assets/audio/sfx/color_${c.id}.mp3`), c.id);
  for (const n of NOISE) assert.ok(fs.existsSync(`assets/audio/sfx/color_${n.id}.mp3`), n.id);
  assert.ok(fs.existsSync(RULES.camVideo));
  for (const p of ['assets/props/hand_point.png', 'assets/props/hand_press.png']) assert.ok(fs.existsSync(p), p);
});
