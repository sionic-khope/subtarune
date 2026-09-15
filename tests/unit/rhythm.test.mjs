// 리듬 게임 규칙(BUILD178): 판정창·홀드·연속 미스 게임오버·콤보/점수/인기·자동 사이드·튜토리얼 차트. DOM 없이 순수 함수만.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makePlay, stepPlay, finished, sideHits, visibleNotes, grade, RHYTHM, TWINKLE, LANES } from '../../src/scenes/rhythm-core.js';

const chart = { duration: 10, notes: [{ t: 1, lane: 'L' }, { t: 2, lane: 'R' }, { t: 3, lane: 'L', dur: 1.0 }, { t: 5, lane: 'R' }, { t: 6, lane: 'L' }, { t: 7, lane: 'R' }, { t: 8, lane: 'L' }], side: { drums: [0.5, 1.5], vocal: [2.2] } };
const run = (play, from, to, inputAt = {}) => { const ev = []; for (let t = from; t <= to + 1e-9; t += 1 / 60) { const key = Math.round(t * 60); const input = inputAt[key] || { held: inputAt.held?.(t) || {} }; ev.push(...stepPlay(play, t, input)); } return ev; };

test('test_rhythm_tap_inside_window_is_great_and_late_note_is_miss', () => {
  const play = makePlay(chart);
  let ev = stepPlay(play, 1.05, { press: { L: true } });
  assert.equal(ev[0].type, 'great'); assert.equal(play.combo, 1); assert.equal(play.score, RHYTHM.scoreGreat * 1 + 2);
  ev = stepPlay(play, 2.0 + RHYTHM.late + 0.01, {});
  assert.ok(ev.some(e => e.type === 'miss' && e.why === 'late')); assert.equal(play.combo, 0); assert.equal(play.missStreak, 1);
  assert.ok(play.pop < RHYTHM.popStart);
});

test('test_rhythm_press_with_no_note_is_empty_and_does_not_break_combo', () => {
  const play = makePlay(chart);
  stepPlay(play, 1.0, { press: { L: true } });
  const ev = stepPlay(play, 1.5, { press: { R: true } });
  assert.deepEqual(ev.map(e => e.type), ['empty']); assert.equal(play.combo, 1);
});

test('test_rhythm_hold_must_be_kept_until_near_the_end', () => {
  const play = makePlay(chart);
  stepPlay(play, 1.0, { press: { L: true } }); stepPlay(play, 2.0, { press: { R: true } });
  let ev = stepPlay(play, 3.0, { press: { L: true }, held: { L: true } });
  assert.equal(ev[0].type, 'great'); assert.equal(play.notes[2].status, 'holding');
  ev = stepPlay(play, 3.5, { held: { L: true } }); assert.equal(ev.length, 0);
  ev = stepPlay(play, 3.6, { held: { L: false } });
  assert.ok(ev.some(e => e.type === 'miss' && e.why === 'release'), '일찍 떼면 MISS');
  const play2 = makePlay(chart);
  stepPlay(play2, 1.0, { press: { L: true } }); stepPlay(play2, 2.0, { press: { R: true } });
  stepPlay(play2, 3.0, { press: { L: true }, held: { L: true } });
  stepPlay(play2, 3.9, { held: { L: false } });
  const end = stepPlay(play2, 4.01, { held: { L: false } });
  assert.ok(end.some(e => e.type === 'holdEnd'), '끝나기 0.15초 전부터는 떼어도 완주');
  assert.equal(play2.notes[2].status, 'hit');
});

test('test_rhythm_five_consecutive_misses_end_the_game', () => {
  const play = makePlay(chart);
  const ev = run(play, 0, 9.5);
  assert.ok(ev.some(e => e.type === 'over')); assert.equal(play.over, true); assert.ok(play.missStreak >= RHYTHM.missLimit);
  const ok = makePlay(chart);
  for (const n of chart.notes) { stepPlay(ok, n.t, { press: { [n.lane]: true }, held: { [n.lane]: true } }); if (n.dur) stepPlay(ok, n.t + n.dur + 0.01, { held: { [n.lane]: true } }); }
  assert.equal(ok.over, false); assert.equal(ok.maxCombo, 7); assert.equal(ok.misses, 0);
  assert.equal(finished(ok, 10), true); assert.equal(finished(ok, 9), false);
  assert.equal(grade(ok), ok.pop >= 0.9 ? 'S' : 'A');
});

test('test_rhythm_side_hits_visible_notes_and_tutorial_chart', () => {
  assert.deepEqual(sideHits(chart, 0, 1.6), { drums: [0.5, 1.5], vocal: [] });
  assert.deepEqual(sideHits(chart, 1.6, 2.5), { drums: [], vocal: [2.2] });
  const play = makePlay(chart);
  const vis = visibleNotes(play, 1.0);
  assert.deepEqual(vis.map(v => v.note.t), [1, 2], '1.5초 앞까지 보인다');
  assert.ok(Math.abs(vis[0].k) < 1e-9 && Math.abs(vis[1].k - 1 / RHYTHM.approach) < 1e-9);
  assert.equal(TWINKLE.notes.length, 7); assert.ok(TWINKLE.notes[6].dur > 0, '마지막 “별”은 홀드');
  assert.deepEqual(TWINKLE.notes.map(n => n.lane), ['L', 'L', 'R', 'R', 'R', 'R', 'L']);
  assert.ok(TWINKLE.notes.every(n => LANES.includes(n.lane) && n.pitch > 200));
  for (const id of ['noamtori', 'bojipam']) {
    const c = JSON.parse(fs.readFileSync(new URL(`../../assets/rhythm/${id}.json`, import.meta.url), 'utf8'));
    assert.ok(c.notes.length > 100 && c.duration > 60 && fs.existsSync(new URL(`../../${c.video}`, import.meta.url)), `${id} 차트·영상`);
    assert.ok(c.notes.every((n, i) => LANES.includes(n.lane) && (i === 0 || n.t >= c.notes[i - 1].t)), '노트는 시간순·L/R');
    assert.ok(c.notes.length / c.duration <= 2.5, '밀도 ≤ 2.5/s');
  }
});

test('test_rhythm_beat_grid_and_highlight_lookup', async () => {
  const { beatAt, highlightAt } = await import('../../src/scenes/rhythm-core.js');
  const chart = { bpm: 120, offset: 0.5, highlights: [[10, 20], [30, 40]] };
  const b = beatAt(chart, 0.5 + 6 * 0.5 + 0.1);
  assert.equal(b.len, 0.5); assert.equal(Math.floor(b.beat), 6); assert.equal(b.bar, 1); assert.ok(Math.abs(b.phase - 0.2) < 1e-9);
  assert.equal(highlightAt(chart, 9.9), -1); assert.equal(highlightAt(chart, 10), 0); assert.equal(highlightAt(chart, 19.99), 0); assert.equal(highlightAt(chart, 20), -1); assert.equal(highlightAt(chart, 35), 1);
  assert.equal(highlightAt({}, 5), -1);
  for (const id of ['noamtori', 'bojipam']) {
    const c = JSON.parse(fs.readFileSync(new URL(`../../assets/rhythm/${id}.json`, import.meta.url), 'utf8'));
    assert.ok(c.highlights.length >= 1 && c.highlights.every(([s, e]) => e - s >= 6 && e <= c.duration), `${id} 하이라이트 ${JSON.stringify(c.highlights)}`);
  }
  const boj = JSON.parse(fs.readFileSync(new URL('../../assets/rhythm/bojipam.json', import.meta.url), 'utf8'));
  const last = boj.highlights[boj.highlights.length - 1];
  assert.ok(last[0] > boj.duration * 0.6, '보X팜 마지막 코러스 하이라이트가 곡 후반에 있다 ' + JSON.stringify(last));
});
