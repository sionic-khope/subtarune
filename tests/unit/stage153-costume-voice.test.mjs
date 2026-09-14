import test from 'node:test';
import assert from 'node:assert/strict';
import { Sound, VOICES } from '../../src/core/audio.js';

test('test_costume_voice_adds_saturation_once_without_changing_other_voices_or_pitch', async () => {
  const original = new Float32Array([0, 0.04, 0.16, 0.28, -0.28, -0.16, -0.04, 0]);
  const buffers = [];
  const sound = new Sound();
  sound.ctx = {
    async decodeAudioData() {
      const samples = original.slice();
      const buffer = { numberOfChannels: 1, getChannelData: () => samples };
      buffers.push(buffer);
      return buffer;
    },
  };
  sound.voiceRaw = { park_guardian_costume: new ArrayBuffer(1), park_guardian: new ArrayBuffer(1), warm_bidet: new ArrayBuffer(1) };
  await sound._decodeVoices();
  const preset = VOICES.park_guardian_costume;
  const processed = sound.voiceBuf.park_guardian_costume.getChannelData(0);
  assert.equal(preset.rate, 1);
  assert.equal(preset.cut, false);
  assert.equal(preset.minGap, 0.18);
  for (let i = 0; i < original.length; i++) {
    assert.ok(Math.abs(processed[i] - Math.tanh(original[i] * 2.1) * 0.64) < 1e-7);
    assert.equal(Math.sign(processed[i]), Math.sign(original[i]));
    assert.ok(Math.abs(processed[i]) < 1);
  }
  assert.ok(processed[3] > original[3]);
  assert.ok(processed[1] / original[1] > processed[3] / original[3], 'soft saturation compresses peaks');
  assert.deepEqual(sound.voiceBuf.park_guardian.getChannelData(0), original);
  assert.deepEqual(sound.voiceBuf.warm_bidet.getChannelData(0), original);
  const once = processed.slice();
  await sound._decodeVoices();
  assert.equal(buffers.length, 3);
  assert.deepEqual(processed, once, 'cached decode is never driven twice');
  assert.deepEqual(Object.keys(VOICES).filter(key => VOICES[key].drive), ['park_guardian_costume']);
});
