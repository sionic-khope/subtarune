import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { VOICES } from '../../src/core/audio.js';

const source = new URL('../../assets/source/lounge148/audio/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', source), 'utf8'));
const expected = {
  warm_bidet: [75, 95], lucky_guy: [130, 250],
  park_guardian_costume: [380, 480], park_guardian: [90, 110],
};

function readWav(name) {
  const file = fs.readFileSync(new URL(name, source));
  assert.equal(file.toString('ascii', 0, 4), 'RIFF');
  assert.equal(file.readUInt32LE(24), 44100);
  assert.equal(file.readUInt16LE(22), 1);
  assert.equal(file.readUInt16LE(34), 16);
  for (let offset = 12; offset + 8 < file.length;) {
    const length = file.readUInt32LE(offset + 4);
    if (file.toString('ascii', offset, offset + 4) === 'data') {
      return Float32Array.from({ length: length / 2 }, (_, i) => file.readInt16LE(offset + 8 + i * 2) / 32768);
    }
    offset += length + 8 + length % 2;
  }
  assert.fail('WAV has no PCM data');
}

function pitch(samples) {
  let best = -Infinity;
  let bestLag = 0;
  const start = 882;
  const end = Math.min(samples.length - 600, 4800);
  for (let lag = 80; lag <= 590; lag++) {
    let dot = 0;
    let aa = 0;
    let bb = 0;
    for (let i = start; i < end; i++) {
      dot += samples[i] * samples[i + lag];
      aa += samples[i] ** 2;
      bb += samples[i + lag] ** 2;
    }
    const correlation = dot / Math.sqrt(aa * bb);
    if (correlation > best) { best = correlation; bestLag = lag; }
  }
  return 44100 / bestLag;
}

test('test_lounge148_voices_have_short_unclipped_envelopes_and_distinct_pitch_ranges', () => {
  assert.deepEqual(manifest.voices.map(voice => voice.id).sort(), Object.keys(expected).sort());
  const levels = [];
  for (const [id, [low, high]] of Object.entries(expected)) {
    const samples = readWav(`${id}-source.wav`);
    assert.ok(samples.length / 44100 >= 0.13 && samples.length / 44100 <= 0.20, id);
    const hz = pitch(samples);
    assert.ok(hz >= low && hz <= high, `${id}: measured ${hz.toFixed(1)} Hz`);
    const peak = Math.max(...samples.map(Math.abs));
    assert.ok(peak >= 0.2 && peak < 0.4, `${id}: headroom`);
    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), 0);
    assert.ok(Math.max(...samples.slice(-44).map(Math.abs)) < 0.02, `${id}: release`);
    levels.push(10 * Math.log10(samples.reduce((sum, value) => sum + value ** 2, 0) / samples.length));
  }
  assert.ok(Math.max(...levels) - Math.min(...levels) < 3, 'balanced average levels');
});

test('test_lounge148_voice_presets_play_complete_checked_samples_with_safe_gaps', () => {
  for (const voice of manifest.voices) {
    const preset = VOICES[voice.id];
    assert.equal(preset.cut, false);
    assert.equal(preset.rate, 1);
    assert.ok(preset.minGap >= voice.duration + 0.015);
    assert.ok(voice.peak * preset.level < 0.3);
    const bytes = fs.readFileSync(new URL(`../../assets/audio/voices/${voice.id}.mp3`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), voice.sha256, `${voice.id}: measured file unchanged`);
    assert.ok(voice.decodedSamples >= 5733 && voice.decodedSamples <= 8820);
    assert.ok(voice.rmsDb > -25 && voice.rmsDb < -15);
    if (voice.id === 'lucky_guy') {
      assert.equal(voice.source, 'lucky_guy-eddy-he.aiff');
      const original = fs.readFileSync(new URL(voice.source, source));
      assert.equal(createHash('sha256').update(original).digest('hex'), voice.sourceSha256);
    }
  }
});

test('test_lounge148_voice_previews_contain_eight_blips_with_quiet_gaps', () => {
  for (const voice of manifest.voices) {
    const preview = readWav(`${voice.id}-preview.wav`);
    const interval = Math.round(44100 * (VOICES[voice.id].dur + 0.02));
    for (let i = 0; i < 8; i++) {
      const offset = i * interval;
      const blip = preview.slice(offset, offset + voice.decodedSamples);
      assert.ok(Math.max(...blip.map(Math.abs)) > 0.15, `${voice.id}: blip ${i}`);
      const gap = preview.slice(offset + voice.decodedSamples, offset + interval);
      assert.ok(gap.every(value => value === 0), `${voice.id}: quiet gap ${i}`);
    }
  }
});
