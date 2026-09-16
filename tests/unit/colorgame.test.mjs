// 색깔 기억 게임 규칙(BUILD198, 용광로 광장 조작 패널): 8판 순서·1초 호출·마지막 판 혼돈 단어·순서대로 누르기·시간 초과. DOM 없이 순수 함수만.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COLORS, NOISE, STAGES, SEQUENCE, RULES, CHAOS, makeRound, stepRound, pressRound, passRound, passReady, answerProgress, wordOf, chaosPhase } from '../../src/scenes/colorgame-core.js';

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
  assert.ok(last.length >= 20, `폭주 때 반복하는 말은 더 장황하게(${last.length})`);
  assert.ok(last.every(id => colorIds.has(id) || noiseIds.has(id)));
  for (const n of ['heart', 'nasdf', 'pi', 'legend', 'ngaita']) assert.ok(last.includes(n), n);
  assert.deepEqual(NOISE.map(n => n.label), ['하트', 'nasdf', 'pi', '레전드', '응아잇어']);
});

test('test_colorgame_calls_fire_every_1_2s_then_answer_starts_right_after_the_last_call', () => {
  assert.equal(RULES.callGap, 1.2, '사용자 “간격 0.2초 정도 늘려”'); assert.equal(RULES.clearReady, 2.0, '통과 뒤 준비 2초');
  const round = makeRound(1);   // ['red','green']
  assert.equal(round.status, 'calling'); assert.equal(round.gap, RULES.callGap);
  let ev = runUntil(round, ev => ev.some(e => e.type === 'call'), 0.5);
  assert.deepEqual(ev.filter(e => e.type === 'call').map(e => [e.id, e.index]), [['red', 0]]);
  ev = runUntil(round, ev => ev.filter(e => e.type === 'call').length >= 1, 1.2);
  const second = ev.find(e => e.type === 'call'); assert.equal(second.id, 'green');
  assert.ok(Math.abs(round.t - RULES.callGap) < 0.05, `둘째 호출은 1.2초 뒤 (${round.t})`);
  ev = runUntil(round, ev => ev.some(e => e.type === 'answer'), 5);
  assert.equal(round.status, 'answer');
  const expectAt = RULES.callGap + RULES.callHold + RULES.preRoll;
  assert.ok(Math.abs(round.t - expectAt) < 0.05, `마지막 색이 꺼지면 바로 입력 차례 (${round.t} ≈ ${expectAt})`);
  assert.ok(round.t - RULES.callGap < 1.0, '마지막 호출 뒤 1초 안에 입력 차례');
  // 제한 시간은 모든 판 같다
  assert.equal(round.limit, RULES.answerTime); assert.equal(makeRound(0).limit, RULES.answerTime); assert.equal(makeRound(6).limit, RULES.answerTime);
});

test('test_colorgame_chaos_stage_calls_three_normally_then_stutters_goes_dark_and_rampages_before_the_exclamation_button', () => {
  const round = makeRound(7);
  assert.ok(round.chaos); assert.equal(round.gap, CHAOS.gap); assert.equal(CHAOS.gap, 0.3, '폭주 호출은 0.3초 간격(더 빠르게)');
  assert.ok(round.gap < RULES.callGap);
  assert.ok(STAGES[7].filter(id => colorIds.has(id)).length >= 6);
  assert.deepEqual(STAGES[7].filter(id => colorIds.has(id)).slice(0, 7), SEQUENCE, '광기 판도 7판 순서로 시작');
  assert.equal(chaosPhase(round), 'normal'); assert.equal(chaosPhase(makeRound(0)), null);
  // ① 빨·초·노는 보통 판처럼(1.2초 간격), 그동안 버벅·느낌표 없음
  const first = runUntil(round, () => round.t >= round.stutterAt - 0.02, 5);
  assert.deepEqual(first.map(e => e.type), ['call', 'call', 'call']);
  assert.deepEqual(first.map(e => e.id), ['red', 'green', 'yellow']);
  assert.ok(Math.abs(round.stutterAt - 3 * RULES.callGap) < 1e-9);
  assert.equal(passReady(round), false);
  // ② 파랑에서 버벅: 끊긴 호출(stutter)이 여러 번 + 영클 웃는 화면(laugh), 이 동안 보통 호출은 없다
  const st = runUntil(round, () => round.t >= round.offAt - 0.02, 5);
  assert.equal(chaosPhase(round), 'stutter');
  assert.ok(st.filter(e => e.type === 'stutter').length >= 6 && st.filter(e => e.type === 'stutter').every(e => e.id === 'blue'), '파랑에서 버벅');
  assert.ok(st.filter(e => e.type === 'laugh').length >= 2, '영클이 한 번씩 웃는 화면');
  assert.ok(!st.some(e => e.type === 'call' || e.type === 'off'), '버벅 동안 보통 호출·꺼짐 없음');
  const cam = st.find(e => e.type === 'cam'); assert.ok(cam && Math.abs(cam.at - (round.offAt - CHAOS.camLead)) < 1e-9 && CHAOS.camLead === 1.0, '카메라는 화면이 꺼지기 1초 전(버벅 중)에 페이드인 시작');
  // ③ 화면 꺼짐 … (off) — 아무 호출도 없다
  const off = runUntil(round, () => round.t >= round.rampageAt - 0.02, 5);
  assert.deepEqual(off.map(e => e.type), ['off']); assert.equal(chaosPhase(round), 'off');
  assert.equal(passReady(round), false, '꺼진 동안엔 느낌표 없음');
  // ④ 폭주: rampage 이벤트 뒤 이상한 말이 0.3초 간격으로 계속 반복되고, 느낌표는 폭주 4초 뒤에야
  const ramp = runUntil(round, () => round.t >= round.passAt - 0.05, 8);
  assert.equal(ramp[0].type, 'rampage'); assert.equal(chaosPhase(round), 'rampage');
  const calls = ramp.filter(e => e.type === 'call');
  assert.ok(calls.length >= 12, `폭주 4초 동안 0.3초 간격 호출 (${calls.length})`);
  assert.deepEqual(calls.slice(0, 3).map(e => e.id), STAGES[7].slice(0, 3));
  assert.equal(passReady(round), false);
  assert.ok(Math.abs(round.passAt - (round.rampageAt + CHAOS.passAfter)) < 1e-9 && round.passAt > 11, `느낌표는 판 시작 ${round.passAt.toFixed(1)}초 뒤(더 늦게)`);
  runUntil(round, () => round.t >= round.passAt + 0.05, 1);
  assert.equal(passReady(round), true);
  // 호출은 입력 차례로 넘어가지 않고 계속 반복된다(어쩌고저쩌고)
  const ev = runUntil(round, ev => ev.some(e => e.type === 'answer'), 14);
  const more = ev.filter(e => e.type === 'call');
  assert.ok(!ev.some(e => e.type === 'answer' || e.type === 'timeout'), '혼돈 판엔 입력 차례·시간 초과가 없다');
  assert.ok(more.length > STAGES[7].length && round.loops >= 1, `한 바퀴 돌고 다시 처음부터 (${more.length})`);
  assert.ok(more.some(e => e.kind === 'noise') && more.some(e => e.kind === 'color'));
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
  assert.ok(fs.existsSync(RULES.camStrip.src), '카메라 PNG 띠(코덱 상관없이 그려진다)');
  assert.equal(RULES.camStrip.frames, 60); assert.equal(RULES.camStrip.fps, 15);
  for (const p of ['assets/props/hand_point.png', 'assets/props/hand_press.png']) assert.ok(fs.existsSync(p), p);
});
