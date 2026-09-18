// 변신 영클 특별 패턴 2 리듬(BUILD217) 순수 로직 검사:
//   1) 차트 구간 자르기(pickWindow)가 [start, start+seconds] 안의 노트만 순서대로 주고 칸을 그대로 옮긴다(루프로 되감긴 사본 포함)
//   2) 생성된 멜로디 차트(assets/rhythm/tvtime.json)가 규격에 맞다 — 칸 L/R, 시간 오름차순, 최소 간격 0.16초, 어느 2초 창에도 7개 이하(≤3.5/s)
//   3) 가짜 battle 로 한 판: 노트를 다 놓치면 MISS 마다 파티 15 피해 → 시큰둥, 다 맞히면 “영클이 감동한다!” → 우는 그림 → 10 피해
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRhythmGame, pickWindow } from '../../src/battle/modes/tvform-rhythm.js';
import { YOUNGCLE_SPECIAL as S } from '../../src/data/youngcle-special.js';

const chartData = (t0 = 0, n = 40, gap = 0.4) => ({
  id: 'test', title: 'T', artist: 'A', duration: 60, bpm: 150, offset: 0,
  notes: Array.from({ length: n }, (_, i) => ({ t: Math.round((t0 + i * gap) * 1000) / 1000, lane: i % 3 === 0 ? 'R' : 'L' })),
  side: { drums: [{ t: 3, lane: 'L' }], vocal: [{ t: 4, lane: 'R' }] }, highlights: [],
});
const fakeBattle = () => {
  const yc = { id: 'youngcle_tvform', hp: 200, maxHp: 200, x: 340, y: 246, def: { damage: 15 } };
  let seed = 11; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  return { yc, hurt: [], hits: [], texts: [], sounds: [], rnd, game: { shake: null, sound: {} },
    sfx(n) { this.sounds.push(n); }, setText(t) { this.texts.push(t); }, drawTextBox() {},
    hitEnemy(e, by, dmg) { this.hits.push(dmg); e.hp -= dmg; return dmg; }, hurtParty(d) { this.hurt.push(d); },
    board: { setTarget() {} } };
};
const makeInput = (state = {}) => ({ down: (k) => !!state[k], just: (k) => !!state['just:' + k] });
const K = { ...S.rhythm, chartWait: 0.2, chartData: chartData(2.6) };

test('test_pick_window_keeps_only_notes_inside_the_window_in_order', () => {
  const song = { duration: 20, notes: [{ t: 1, lane: 'L' }, { t: 5.5, lane: 'R' }, { t: 9.9, lane: 'L' }, { t: 10.4, lane: 'R' }, { t: 19.5, lane: 'L' }] };
  const w = pickWindow(song, 5, 5);
  assert.deepEqual(w, [{ t: 5.5, lane: 'R' }, { t: 9.9, lane: 'L' }]);
  // 창이 곡 끝을 넘어가면 되감긴 사본(t + duration)도 같이 잡는다
  const wrapped = pickWindow(song, 19, 5);
  assert.deepEqual(wrapped.map((n) => n.t), [19.5, 21]);
  assert.deepEqual(pickWindow(song, 100, 5), []);
});

test('test_generated_melody_chart_is_well_formed_and_within_density', () => {
  const c = JSON.parse(fs.readFileSync(new URL('../../assets/rhythm/tvtime.json', import.meta.url), 'utf8'));
  assert.equal(c.title, "It's Tv Time!"); assert.equal(c.artist, 'Deltarune');
  assert.ok(!c.video, '영상 없는 곡');
  assert.ok(c.duration > 170 && c.duration < 173, `길이 ${c.duration}`);
  assert.ok(c.notes.length > 200, `노트 ${c.notes.length}`);
  assert.ok(c.notes.every((n) => n.lane === 'L' || n.lane === 'R'), '칸은 L/R');
  let minGap = Infinity;
  for (let i = 1; i < c.notes.length; i++) { const d = c.notes[i].t - c.notes[i - 1].t; assert.ok(d > 0, '시간 오름차순'); minGap = Math.min(minGap, d); }
  assert.ok(minGap >= 0.16 - 1e-6, `최소 간격 ${minGap}`);
  assert.ok(c.notes.length / c.duration <= 3.5, `밀도 ${(c.notes.length / c.duration).toFixed(2)}/s`);
  for (let i = 0; i < c.notes.length; i++) {
    const inWin = c.notes.filter((n) => n.t > c.notes[i].t - 2 && n.t <= c.notes[i].t).length;
    assert.ok(inWin <= 7, `2초 창 안 ${inWin}개`);
  }
  assert.ok((c.side.drums || []).length > 100 && (c.side.vocal || []).length > 100, '양옆 자동 패드');
});

/** 한 판 돌리기. hit=true 면 다음 노트를 제때 누른다 */
const run = (hit) => {
  const b = fakeBattle(), g = createRhythmGame(b, b.yc, K), step = 1 / 60;
  let t = 0, pressed = new Set();
  while (g.snapshot.phase !== 'done' && t < 40) {
    const s = g.snapshot; let input = makeInput();
    if (hit && s.phase === 'play' && s.next !== null && Math.abs(s.next - s.time) <= 0.05 && !pressed.has(s.next)) {
      pressed.add(s.next); input = makeInput({ ['just:' + (s.nextLane === 'L' ? 'left' : 'right')]: true });
    }
    g.update(step, input); t += step;
  }
  return { b, snap: g.snapshot, t };
};

test('test_rhythm_missing_everything_hurts_party_15_each_and_youngcle_stays_unmoved', () => {
  const { b, snap } = run(false);
  assert.equal(snap.phase, 'done');
  assert.ok(snap.notes >= 30, `노트 ${snap.notes}`);
  assert.equal(snap.misses, snap.notes, '다 놓쳤다');
  assert.equal(b.hurt.length, snap.notes); assert.ok(b.hurt.every((d) => d === S.rhythm.missDamage));
  assert.equal(snap.moved, false); assert.equal(snap.cried, false);
  assert.equal(b.hits.length, 0); assert.equal(b.yc.hp, 200);
  assert.ok(b.texts.includes(S.rhythm.sourText), `시큰둥 문구 ${JSON.stringify(b.texts)}`);
});

test('test_rhythm_hitting_the_melody_notes_moves_youngcle_to_tears_for_10_damage', () => {
  const { b, snap } = run(true);
  assert.equal(snap.phase, 'done');
  assert.ok(snap.greats >= snap.notes - 2, `GREAT ${snap.greats} / ${snap.notes}`);
  assert.ok(snap.misses < S.rhythm.cryUnder, `MISS ${snap.misses}`);
  assert.equal(snap.moved, true); assert.equal(snap.cried, true);
  assert.ok(b.texts.includes(S.rhythm.movedText), `감동 문구 ${JSON.stringify(b.texts)}`);
  assert.deepEqual(b.hits, [S.rhythm.cryDamage]); assert.equal(b.yc.hp, 200 - S.rhythm.cryDamage);
  assert.equal(b.game.shake.amp, 5); assert.ok(b.sounds.includes('damage'));
});

test('test_rhythm_window_uses_the_song_chart_and_starts_after_the_lead', () => {
  const b = fakeBattle(), g = createRhythmGame(b, b.yc, K), step = 1 / 60;
  for (let i = 0; i < 40; i++) g.update(step, makeInput());
  const s = g.snapshot;
  assert.equal(s.melody, true, '곡 차트에서 잘라 왔다');
  assert.ok(s.start >= S.rhythm.lead && s.start <= S.rhythm.lead + 0.5, `시작 ${s.start}`);
  assert.equal(s.next !== null && s.next >= s.start, true, `첫 노트 ${s.next} ≥ ${s.start}`);
  assert.ok(s.next <= s.start + S.rhythm.seconds);
});
