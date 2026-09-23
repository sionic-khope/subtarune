import test from 'node:test';
import assert from 'node:assert/strict';
import { CHOIMIS_LYRICS } from '../../src/data/choimis-lyrics.js';
import { choimisLyricAt, drawChoimisKaraoke } from '../../src/battle/choimis-karaoke.js';

function recordingContext(widthFor = () => 10) {
  const calls = { clips: [], fills: [], strokes: [], fonts: [], events: [] };
  const stack = [];
  let pendingRect = null, activeClip = null;
  const ctx = {
    globalAlpha: 1, font: '', textAlign: '', textBaseline: '', lineJoin: '', strokeStyle: '', fillStyle: '', lineWidth: 0,
    save() { stack.push({ globalAlpha: this.globalAlpha, font: this.font, strokeStyle: this.strokeStyle, fillStyle: this.fillStyle, lineWidth: this.lineWidth, activeClip }); },
    restore() { const saved = stack.pop(); activeClip = saved.activeClip; delete saved.activeClip; Object.assign(this, saved); },
    beginPath() { pendingRect = null; },
    rect(x, y, w, h) { pendingRect = [x, y, w, h]; },
    clip() { activeClip = pendingRect; calls.clips.push(pendingRect); },
    measureText(char) { calls.fonts.push(this.font); return { width: widthFor(char, this.font) }; },
    strokeText(text, x, y) { const call = [text, x, y, this.globalAlpha, this.strokeStyle, activeClip]; calls.strokes.push(call); calls.events.push(['stroke', ...call]); },
    fillText(text, x, y) { const call = [text, x, y, this.globalAlpha, this.fillStyle, activeClip]; calls.fills.push(call); calls.events.push(['fill', ...call]); },
  };
  return { ctx, calls };
}
const glyphClips = calls => calls.clips.filter(rect => rect[2] < 456);

const battleAt = (time, state = 'menu') => ({
  cfg: { bgm: 'choimis_battle' }, state,
  game: { sound: { bgmName: 'choimis_battle', bgm: { currentTime: time } } },
});

test('test_choimis_karaoke_sweeps_continuously_across_a_character', () => {
  const cue = CHOIMIS_LYRICS[0];
  const midpoint = (cue.chars[0].at + cue.chars[0].end) / 2;
  const { ctx, calls } = recordingContext();
  drawChoimisKaraoke(ctx, battleAt(midpoint));
  assert.match(calls.fonts.at(-1), /^17px /);
  assert.equal(glyphClips(calls).length, 1);
  assert.ok(Math.abs(glyphClips(calls)[0][2] - 5) < 0.0001);
  assert.equal(glyphClips(calls)[0][1], 6);
  assert.equal(glyphClips(calls)[0][3], 25);
});

test('test_choimis_karaoke_clip_has_stable_endpoints_and_handles_duplicate_times', () => {
  const cue = CHOIMIS_LYRICS.find(entry => entry.text === '오늘도 스읍 미스');
  const start = recordingContext();
  drawChoimisKaraoke(start.ctx, battleAt(cue.start));
  assert.deepEqual(glyphClips(start.calls), []);

  const duplicateMidpoint = (45.128 + 45.278) / 2 + 0.15;
  const grouped = recordingContext();
  drawChoimisKaraoke(grouped.ctx, battleAt(duplicateMidpoint));
  assert.deepEqual(grouped.calls.clips.slice(-2).map(rect => Math.round(rect[2] * 1000) / 1000), [5, 5]);
  assert.ok(glyphClips(grouped.calls).every(rect => Number.isFinite(rect[2]) && rect[2] >= 0 && rect[2] <= 10));

  const end = recordingContext();
  drawChoimisKaraoke(end.ctx, battleAt(cue.end - 0.000001));
  assert.ok(glyphClips(end.calls).every(rect => rect[2] > 9.99 && rect[2] <= 10));
});

test('test_choimis_karaoke_recomputes_sweep_after_seek_and_repeat', () => {
  assert.equal(choimisLyricAt(24.25).text, '가재맨 방 고닉 최미스');
  assert.equal(choimisLyricAt(46.3).text, '오늘도 스읍 미스');
  assert.equal(choimisLyricAt(46.7).text, '최미스! 최미스! 가재맨! 방고닉!');
  assert.equal(choimisLyricAt(144.35).text, '가재맨 방 고닉 최미스');

  const first = CHOIMIS_LYRICS[0], repeat = CHOIMIS_LYRICS[12];
  const firstCtx = recordingContext(), repeatCtx = recordingContext();
  drawChoimisKaraoke(firstCtx.ctx, battleAt((first.chars[0].at + first.chars[0].end) / 2));
  drawChoimisKaraoke(repeatCtx.ctx, battleAt((repeat.chars[0].at + repeat.chars[0].end) / 2));
  assert.ok(Math.abs(glyphClips(firstCtx.calls)[0][2] - glyphClips(repeatCtx.calls)[0][2]) < 0.0001);
});

test('test_choimis_karaoke_applies_one_constant_delay_after_repeat_expansion', () => {
  assert.equal(CHOIMIS_LYRICS.length, 24);
  const originalBoundaries = [24.090, 27.184, 30.184, 33.184, 36.184, 39.184, 42.184, 44.809, 46.496, 52.215, 58.121, 64.215, 71.246];
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

test('test_choimis_chant_display_waits_for_the_first_syllable_without_moving_fill_or_later_cues', () => {
  const rawChantTimes = [46.496, 46.835, 47.153, 47.153, 47.153, 48.184, 48.559, 48.934, 48.934, 48.934, 49.684, 50.059, 50.434, 50.809, 51.184, 51.559, 51.746, 51.934, 52.059];
  for (const [previousIndex, shift] of [[7, 0], [19, 120]]) {
    const previous = CHOIMIS_LYRICS[previousIndex], chant = CHOIMIS_LYRICS[previousIndex + 1];
    assert.ok(Math.abs(chant.start - (46.646 + shift)) < 0.000001);
    assert.equal(previous.end, chant.start);
    assert.equal(chant.start, chant.chars[0].at);
    assert.equal(choimisLyricAt(46.271 + shift), previous);
    assert.equal(choimisLyricAt(chant.start - 0.000001), previous);
    assert.equal(choimisLyricAt(chant.start), chant);
    assert.ok(Math.abs(previous.chars.at(-1).at - (46.146 + shift)) < 0.000001);
    assert.ok(Math.abs(previous.chars.at(-1).end - (46.271 + shift)) < 0.000001, 'the preceding fill finishes at its original time while its line remains visible');
    chant.chars.forEach((char, index) => {
      assert.ok(Math.abs(char.at - (rawChantTimes[index] + shift + 0.15)) < 0.000001);
      assert.ok(Math.abs(char.end - ((rawChantTimes[index + 1] ?? 52.215) + shift + 0.15)) < 0.000001);
    });
    assert.ok(Math.abs(chant.end - (52.365 + shift)) < 0.000001);
    assert.equal(CHOIMIS_LYRICS[previousIndex + 2].start, chant.end);
  }
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
  const size = Number.parseFloat(calls.fonts.at(-1));
  assert.ok(size < 17);
  assert.ok(calls.clips[0][0] >= 12);
});

test('test_choimis_karaoke_echoes_span_both_sides_behind_every_crisp_foreground_glyph', () => {
  const cue = CHOIMIS_LYRICS[0], { ctx, calls } = recordingContext();
  drawChoimisKaraoke(ctx, battleAt(cue.start + 0.3));
  const echoes = calls.strokes.filter(call => call[4] === '#ff9dca');
  const firstEchoes = echoes.filter(call => call[0] === cue.chars[0].char);
  const foreground = calls.strokes.find(call => call[4] === '#ececf5');
  assert.equal(firstEchoes.length, 10, 'five separate copies extend in each direction');
  const offsets = firstEchoes.map(call => call[1] - foreground[1]);
  assert.equal(offsets.filter(offset => offset < 0).length, 5);
  assert.equal(offsets.filter(offset => offset > 0).length, 5);
  assert.equal(new Set(offsets).size, 10);
  assert.ok(Math.max(...offsets) >= 18 && Math.max(...offsets) <= 20);
  assert.ok(echoes.every(call => call[2] === 10 && call[3] > 0 && call[3] < 1));
  assert.ok(echoes.every(call => JSON.stringify(call[5]) === JSON.stringify([12, 6, 456, 25])), 'echoes use the whole lyric band, never foreground progress clips');
  const lastEcho = calls.events.findLastIndex(call => call[5] === '#ff9dca');
  const firstForeground = calls.events.findIndex(call => call[5] === 'rgba(4,8,20,0.9)');
  assert.ok(lastEcho < firstForeground, 'all afterimages stay behind every foreground character');
  assert.ok(calls.strokes.filter(call => call[4] === '#ececf5').every(call => call[5] === null));
});

test('test_choimis_karaoke_echoes_decay_by_audio_age_and_clear_on_seek_retry_or_phrase_exit', () => {
  const cue = CHOIMIS_LYRICS[0];
  const render = age => { const sample = recordingContext(); drawChoimisKaraoke(sample.ctx, battleAt(cue.start + age)); return sample.calls; };
  const echoes = calls => calls.strokes.filter(call => call[4] === '#ff9dca' && call[0] === cue.chars[0].char);
  const middle = echoes(render(0.3)), tail = echoes(render(0.45));
  assert.equal(middle.length, 10); assert.equal(tail.length, 10);
  assert.ok(tail.every((call, index) => call[3] < middle[index][3]), 'each discrete copy fades toward its half-second end');
  assert.deepEqual(echoes(render(0.5)), []);
  assert.deepEqual(echoes(render(0)), []);

  const reused = recordingContext();
  drawChoimisKaraoke(reused.ctx, battleAt(cue.start + 0.3));
  for (const values of Object.values(reused.calls)) values.length = 0;
  drawChoimisKaraoke(reused.ctx, battleAt(cue.start + 0.45));
  assert.deepEqual(reused.calls, render(0.45), 'a paused seek reproduces a fresh audio-clock render');
  for (const time of [0, CHOIMIS_LYRICS.at(-1).end]) {
    const empty = recordingContext(); drawChoimisKaraoke(empty.ctx, battleAt(time));
    assert.deepEqual(empty.calls.events, []);
  }
  for (const state of ['win', 'lose', 'retry', 'ending']) {
    const stopped = recordingContext(); drawChoimisKaraoke(stopped.ctx, battleAt(cue.start + 0.3, state));
    assert.deepEqual(stopped.calls.events, []);
  }
});
