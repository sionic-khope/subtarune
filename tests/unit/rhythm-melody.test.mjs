import test from 'node:test';
import assert from 'node:assert/strict';
import { melodySchedule, createMelodyLayer } from '../../src/battle/modes/rhythm-melody.js';

test('early hit schedules the source phrase at its audible music time, not input time', () => {
  const cue = melodySchedule({ t: 10, soundDur: 0.4 }, 9.9, { currentTime: 50, latency: 0.03, rate: 1, duration: 171.5 });
  assert.ok(Math.abs(cue.when - 50.07) < 1e-8);
  assert.ok(Math.abs(cue.offset - 10) < 1e-8);
  assert.ok(Math.abs(cue.duration - 0.4) < 1e-8);
});

test('late hit joins the playing melody instead of replaying an old note attack', () => {
  const cue = melodySchedule({ t: 10, soundDur: 0.4 }, 10.1, { currentTime: 50, latency: 0.03, rate: 1, duration: 171.5 });
  assert.equal(cue.when, 50);
  assert.ok(Math.abs(cue.offset - 10.13) < 1e-8);
  assert.ok(Math.abs(cue.duration - 0.27) < 1e-8);
});

test('looped melody retains sample position and playback rate', () => {
  const cue = melodySchedule({ t: 343.2, soundDur: 0.6 }, 343.0, { currentTime: 5, latency: 0, rate: 2, duration: 171.5 });
  assert.ok(Math.abs(cue.offset - 0.2) < 1e-8);
  assert.ok(Math.abs(cue.when - 5.1) < 1e-8);
  assert.ok(Math.abs(cue.duration - 0.3) < 1e-8);
});

test('expired notes do not play the next phrase as a successful old note', () => {
  assert.equal(melodySchedule({ t: 1, soundDur: 0.2 }, 1.3, { currentTime: 5, latency: 0, rate: 1, duration: 20 }), null);
});

test('chart-unavailable grid fallback never schedules NaN audio', () => {
  assert.equal(melodySchedule({ t: 1 }, 1, { currentTime: 5, latency: 0, rate: 1, duration: 20 }), null);
});

test('disposing while the decoded layer is loading cannot create late audio', async () => {
  let finish;
  const sound = { ctx: {}, loadCue: () => new Promise(resolve => { finish = resolve; }) };
  const layer = createMelodyLayer(sound, { src: 'fixture.ogg' });
  layer.dispose(); finish({ duration: 10 }); await Promise.resolve();
  assert.equal(layer.snapshot.ready, false);
  assert.equal(layer.snapshot.active, 0);
});
