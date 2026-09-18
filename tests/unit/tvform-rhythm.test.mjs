// 변신 영클 특별 패턴 2 리듬(BUILD217) 순수 로직 검사:
//   1) 차트 구간 자르기(pickWindow)가 [start, start+seconds] 안의 노트만 순서대로 주고 칸을 그대로 옮긴다(루프로 되감긴 사본 포함)
//   2) 생성된 멜로디 차트(assets/rhythm/tvtime.json)가 박자 격자 위에 있다 — 148bpm 1/4박 격자, 칸 L/R, 최소 간격 0.18초, 2초 창 6개 이하(≤3/s)
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
  const song = { duration: 20, notes: [{ t: 1, lane: 'L', pitch: 60 }, { t: 5.5, lane: 'R', pitch: 67 }, { t: 9.9, lane: 'L', pitch: 62 }, { t: 10.4, lane: 'R' }, { t: 19.5, lane: 'L' }] };
  const w = pickWindow(song, 5, 5);
  assert.deepEqual(w, [{ t: 5.5, lane: 'R', pitch: 67 }, { t: 9.9, lane: 'L', pitch: 62 }], '음높이(MIDI)도 같이 들고 온다');
  // 창이 곡 끝을 넘어가면 되감긴 사본(t + duration)도 같이 잡는다
  const wrapped = pickWindow(song, 19, 5);
  assert.deepEqual(wrapped.map((n) => n.t), [19.5, 21]);
  assert.deepEqual(pickWindow(song, 100, 5), []);
});

test('test_generated_melody_chart_is_quantized_to_the_beat_grid', () => {
  const c = JSON.parse(fs.readFileSync(new URL('../../assets/rhythm/tvtime.json', import.meta.url), 'utf8'));
  assert.equal(c.title, "It's Tv Time!"); assert.equal(c.artist, 'Deltarune');
  assert.ok(!c.video, '영상 없는 곡');
  assert.equal(c.bpm, 148, `bpm ${c.bpm}`);
  assert.ok(c.duration > 170 && c.duration < 173, `길이 ${c.duration}`);
  assert.ok(c.notes.length > 300, `노트 ${c.notes.length}`);
  assert.ok(c.notes.every((n) => n.lane === 'L' || n.lane === 'R'), '칸은 L/R');
  // 격자는 다듬는 용도다(사용자 “노래랑 아예 똑같아야 한다”): 대부분 1/4 박 위에 있되,
  // 노래가 당겨지거나 밀린 자리는 격자를 벗어나 소리 난 자리를 지킨다 — 그래서 격자 밖도 조금은 있어야 한다.
  const quarter = 60 / c.bpm / 4;
  let offGrid = 0, quarters = 0, minGap = Infinity;
  for (const n of c.notes) {
    const k = Math.round((n.t - c.offset) / quarter), d = Math.abs(n.t - (c.offset + k * quarter));
    if (d > 0.002) offGrid += 1;
    else if (((k % 2) + 2) % 2 === 1) quarters += 1;
  }
  assert.ok(offGrid <= c.notes.length * 0.25, `격자 밖 노트 ${offGrid}개 — 4분의 1 이하`);
  assert.ok(offGrid > 0, '전부 격자에 붙이면 노래와 어긋난다 — 격자 밖 노트가 있어야 한다');
  assert.ok(quarters < c.notes.length / 2, `1/4 박 노트 ${quarters}개 — 절반 미만이어야 한다`);
  for (let i = 1; i < c.notes.length; i++) { const d = c.notes[i].t - c.notes[i - 1].t; assert.ok(d > 0, '시간 오름차순'); minGap = Math.min(minGap, d); }
  assert.ok(minGap >= 0.18 - 1e-6, `최소 간격 ${minGap}`);
  assert.ok(c.notes.length / c.duration <= 3, `밀도 ${(c.notes.length / c.duration).toFixed(2)}/s`);
  for (let i = 0; i < c.notes.length; i++) {
    const inWin = c.notes.filter((n) => n.t > c.notes[i].t - 2 && n.t <= c.notes[i].t).length;
    assert.ok(inWin <= 6, `2초 창 안 ${inWin}개`);
  }
  assert.ok((c.side.drums || []).length > 100 && (c.side.vocal || []).length > 100, '양옆 자동 패드');
});

test('test_generated_melody_chart_carries_varied_pitches_per_window', () => {
  const c = JSON.parse(fs.readFileSync(new URL('../../assets/rhythm/tvtime.json', import.meta.url), 'utf8'));
  assert.ok(c.notes.every((n) => Number.isInteger(n.pitch) && n.pitch > 40 && n.pitch < 100), '모든 노트에 MIDI 음높이');
  // 사용자 “저번엔 다 같은 음으로 넣어서”: 어느 15초 구간을 잘라도 음이 여러 개여야 하고 한 음이 40% 를 넘지 않아야 한다
  let worstDistinct = 99, worstShare = 0;
  for (let s0 = 0; s0 + 15 < c.duration; s0 += 1) {
    const win = c.notes.filter((n) => n.t >= s0 && n.t < s0 + 15).map((n) => n.pitch);
    if (win.length < 10) continue;
    const counts = new Map();
    for (const p of win) counts.set(p, (counts.get(p) || 0) + 1);
    worstDistinct = Math.min(worstDistinct, counts.size);
    worstShare = Math.max(worstShare, Math.max(...counts.values()) / win.length);
  }
  assert.ok(worstDistinct >= 5, `15초 창 최소 음 종류 ${worstDistinct}`);
  assert.ok(worstShare <= 0.4, `15초 창 한 음 최대 점유율 ${(worstShare * 100).toFixed(0)}%`);
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
