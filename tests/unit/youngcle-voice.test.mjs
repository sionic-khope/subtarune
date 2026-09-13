import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound, VOICES } from '../../src/core/audio.js';

test('test_youngcle_typing_restarts_before_the_sample_tail_without_changing_pitch_or_other_voices', t => {
  let now = 0;
  const starts = [], rates = [];
  const sound = new Sound(), sample = { duration: 0.16 };
  t.mock.method(performance, 'now', () => now * 1000);
  sound.ctx = {
    state: 'running', get currentTime() { return now; },
    createGain: () => ({ connect() {}, gain: { value: 1, setValueAtTime() {},
      exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} } }),
    createBufferSource: () => ({ playbackRate: { value: 1 }, connect() {}, stop() {},
      start(time) { starts.push(time); rates.push(this.playbackRate.value); assert.equal(this.buffer, sample); } }),
  };
  sound.voiceBuf.youngcle = sample;
  for (let character = 0; character < 40; character++) {
    now = character * 0.045;
    sound.blip('youngcle');
  }
  assert.ok(starts.length > 1);
  for (let i = 1; i < starts.length; i++) {
    assert.ok(starts[i] - starts[i - 1] <= 0.145 + 1e-9,
      `sample fades before the next syllable: ${starts[i] - starts[i - 1]}s between starts`);
  }
  assert.ok(rates.every(rate => rate === 0.96));
  assert.equal(VOICES.youngcle.cut, false);
  assert.equal(VOICES.youngcle.poly, undefined);
  assert.equal(VOICES.yerim.minGap, 0.14);
  assert.equal(VOICES.yongjun.minGap, 0.07);
});
