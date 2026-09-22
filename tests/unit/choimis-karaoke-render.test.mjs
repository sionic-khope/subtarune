import test from 'node:test';
import assert from 'node:assert/strict';
import { CHOIMIS_LYRICS } from '../../src/data/choimis-lyrics.js';
import { choimisLyricAt, drawChoimisKaraoke } from '../../src/battle/choimis-karaoke.js';

function recordingContext(widthFor = () => 10) {
  const calls = { clips: [], fills: [], strokes: [], fonts: [] };
  let pendingRect = null;
  const ctx = {
    globalAlpha: 1, font: '', textAlign: '', textBaseline: '', lineJoin: '', strokeStyle: '', fillStyle: '', lineWidth: 0,
    save() {}, restore() {}, beginPath() { pendingRect = null; },
    rect(x, y, w, h) { pendingRect = [x, y, w, h]; },
    clip() { calls.clips.push(pendingRect); },
    measureText(char) { calls.fonts.push(this.font); return { width: widthFor(char, this.font) }; },
    strokeText: (text, x, y) => calls.strokes.push([text, x, y]),
    fillText(text, x, y) { calls.fills.push([text, x, y, this.globalAlpha, this.fillStyle]); },
  };
  return { ctx, calls };
}

const battleAt = (time, state = 'menu') => ({
  cfg: { bgm: 'choimis_battle' }, state,
  game: { sound: { bgmName: 'choimis_battle', bgm: { currentTime: time } } },
});

test('test_choimis_karaoke_sweeps_continuously_across_a_character', () => {
  const cue = CHOIMIS_LYRICS[0];
  const midpoint = (cue.chars[0].at + cue.chars[0].end) / 2;
  const { ctx, calls } = recordingContext();
  drawChoimisKaraoke(ctx, battleAt(midpoint));
  assert.match(ctx.font, /^17px /);
  assert.equal(calls.clips.length, 1);
  assert.ok(Math.abs(calls.clips[0][2] - 5) < 0.0001);
  assert.equal(calls.clips[0][1], 6);
  assert.equal(calls.clips[0][3], 25);
});

test('test_choimis_karaoke_clip_has_stable_endpoints_and_handles_duplicate_times', () => {
  const cue = CHOIMIS_LYRICS.find(entry => entry.text === '오늘도 스읍 미스');
  const start = recordingContext();
  drawChoimisKaraoke(start.ctx, battleAt(cue.start));
  assert.deepEqual(start.calls.clips, []);

  const duplicateMidpoint = (45.128 + 45.278) / 2 + 0.15;
  const grouped = recordingContext();
  drawChoimisKaraoke(grouped.ctx, battleAt(duplicateMidpoint));
  assert.deepEqual(grouped.calls.clips.slice(-2).map(rect => Math.round(rect[2] * 1000) / 1000), [5, 5]);
  assert.ok(grouped.calls.clips.every(rect => Number.isFinite(rect[2]) && rect[2] >= 0 && rect[2] <= 10));

  const end = recordingContext();
  drawChoimisKaraoke(end.ctx, battleAt(cue.end - 0.000001));
  assert.ok(end.calls.clips.every(rect => rect[2] > 9.99 && rect[2] <= 10));
});

test('test_choimis_karaoke_recomputes_sweep_after_seek_and_repeat', () => {
  assert.equal(choimisLyricAt(24.25).text, '가재맨 방 고닉 최미스');
  assert.equal(choimisLyricAt(46.3).text, '최미스! 최미스! 가재맨! 방고닉!');
  assert.equal(choimisLyricAt(144.35).text, '가재맨 방 고닉 최미스');

  const first = CHOIMIS_LYRICS[0], repeat = CHOIMIS_LYRICS[12];
  const firstCtx = recordingContext(), repeatCtx = recordingContext();
  drawChoimisKaraoke(firstCtx.ctx, battleAt((first.chars[0].at + first.chars[0].end) / 2));
  drawChoimisKaraoke(repeatCtx.ctx, battleAt((repeat.chars[0].at + repeat.chars[0].end) / 2));
  assert.ok(Math.abs(firstCtx.calls.clips[0][2] - repeatCtx.calls.clips[0][2]) < 0.0001);
});

test('test_choimis_karaoke_applies_one_constant_delay_after_repeat_expansion', () => {
  assert.equal(CHOIMIS_LYRICS.length, 24);
  const originalBoundaries = [24.090, 27.184, 30.184, 33.184, 36.184, 39.184, 42.184, 44.809, 46.121, 52.215, 58.121, 64.215, 71.246];
  for (let index = 0; index < 12; index++) {
    const first = CHOIMIS_LYRICS[index], repeat = CHOIMIS_LYRICS[index + 12];
    assert.ok(Math.abs(first.start - (originalBoundaries[index] + 0.15)) < 0.000001);
    assert.ok(Math.abs(first.end - (originalBoundaries[index + 1] + 0.15)) < 0.000001);
    const repeatStart = index === 0 ? 144.184 + 0.15 : originalBoundaries[index] + 120 + 0.15;
    assert.ok(Math.abs(repeat.start - repeatStart) < 0.000001);
    assert.ok(Math.abs(repeat.end - (originalBoundaries[index + 1] + 120 + 0.15)) < 0.000001);
    for (let charIndex = index === 0 ? 1 : 0; charIndex < first.chars.length; charIndex++) {
      assert.ok(Math.abs(repeat.chars[charIndex].at - first.chars[charIndex].at - 120) < 0.000001);
      assert.ok(Math.abs(repeat.chars[charIndex].end - first.chars[charIndex].end - 120) < 0.000001);
    }
  }
  const money = CHOIMIS_LYRICS.find(entry => entry.text === '1500, 1500, 경섭이 1500');
  const moneyRepeat = CHOIMIS_LYRICS.findLast(entry => entry.text === money.text);
  assert.ok(Math.abs(money.start - 58.271) < 0.000001);
  assert.ok(Math.abs(moneyRepeat.start - 178.271) < 0.000001);
  assert.equal(choimisLyricAt(58.270999).text, '최미스! 오늘도 가순이 만나야');
  assert.equal(choimisLyricAt(58.271).text, money.text);
  assert.ok(Math.abs((money.end - money.start) - (64.215 - 58.121)) < 0.000001);
  assert.ok(Math.abs(money.chars[0].at - money.start) < 0.000001);
  assert.ok(Math.abs(CHOIMIS_LYRICS.at(-1).end - 191.396) < 0.000001);
});

test('test_choimis_karaoke_keeps_fade_attack_dimming_and_pink_trail', () => {
  const cue = CHOIMIS_LYRICS[0];
  const time = cue.start + 0.14;
  const menu = recordingContext(), attack = recordingContext();
  drawChoimisKaraoke(menu.ctx, battleAt(time));
  drawChoimisKaraoke(attack.ctx, battleAt(time, 'bullets'));
  const menuMain = menu.calls.fills.findLast(call => call[4] === '#ff78b8');
  const attackMain = attack.calls.fills.findLast(call => call[4] === '#ff78b8');
  assert.ok(Math.abs(menuMain[3] - 0.5) < 0.0001);
  assert.ok(Math.abs(attackMain[3] - 0.34) < 0.0001);
  assert.ok(menu.calls.fills.filter(call => call[4] === '#ff9dca').length >= 2);
});

test('test_choimis_karaoke_fits_only_lines_wider_than_the_safe_width', () => {
  const cue = CHOIMIS_LYRICS.find(entry => entry.text === '최미스! 최미스! 가재맨! 방고닉!');
  const { ctx, calls } = recordingContext((_char, font) => Number.parseFloat(font) * 2);
  drawChoimisKaraoke(ctx, battleAt((cue.chars[0].at + cue.chars[0].end) / 2));
  const size = Number.parseFloat(ctx.font);
  assert.ok(size < 17);
  assert.ok(calls.clips[0][0] >= 12);
});
