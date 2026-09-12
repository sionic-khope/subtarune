import test from 'node:test';
import assert from 'node:assert/strict';
import { MAILLARD_SUNRISE } from '../../src/data/maillard-sunrise.js';
import { advanceSunrise, MaillardSunrise } from '../../src/world/sunrise.js';
import { Sound } from '../../src/core/audio.js';

const fresh = () => ({ progress: 0, lightProgress: 0, sunProgress: 0, completed: false, lastAudioTime: 0 });

test('sunrise light and low sun unfold slowly from map-entry music time', () => {
  const cfg = { ...MAILLARD_SUNRISE, animated: true, seen: false };
  const start = advanceSunrise(fresh(), 0, cfg);
  const middle = advanceSunrise(start, 9, cfg);
  const highlight = advanceSunrise(middle, 14, cfg);
  const rising = advanceSunrise(highlight, 28, cfg);
  const complete = advanceSunrise(rising, 42, cfg);

  assert.equal(start.lightProgress, 0);
  assert.equal(start.sunProgress, 0);
  assert.equal(middle.lightProgress, 0);
  assert.equal(middle.sunProgress, 0);
  assert.ok(highlight.lightProgress < 0.1);
  assert.equal(highlight.sunProgress, 0);
  assert.equal(rising.sunProgress, 0.5);
  assert.equal(complete.lightProgress, 1);
  assert.equal(complete.sunProgress, 1);
  assert.equal(complete.shouldPersist, true);
});

test('seen or static sunrise stays fully raised and never replays after music loops', () => {
  const seen = advanceSunrise(fresh(), 0, { ...MAILLARD_SUNRISE, animated: true, seen: true });
  const staticMap = advanceSunrise(fresh(), 0, { ...MAILLARD_SUNRISE, animated: false, seen: false });
  const complete = advanceSunrise(fresh(), 42, { ...MAILLARD_SUNRISE, animated: true, seen: false });
  const looped = advanceSunrise(complete, 0.25, { ...MAILLARD_SUNRISE, animated: true, seen: false });

  for (const frame of [seen, staticMap, looped]) {
    assert.equal(frame.lightProgress, 1);
    assert.equal(frame.sunProgress, 1);
    assert.equal(frame.completed, true);
    assert.equal(frame.shouldPersist, false);
  }
});

test('muted or buffered media advances only from the selected BGM currentTime', () => {
  const bgm = { currentTime: 0, play: () => Promise.resolve() };
  const sound = { bgmName: MAILLARD_SUNRISE.bgm, bgm, muted: true };
  const effect = new MaillardSunrise(MAILLARD_SUNRISE);
  effect.enter({ sound, images: {}, animated: true, seen: false });

  bgm.currentTime = 22;
  effect.update();
  const middle = { ...effect.frame };
  effect.update();

  assert.equal(middle.lightProgress, 0.5);
  assert.ok(middle.sunProgress > 0.28 && middle.sunProgress < 0.29);
  assert.deepEqual(effect.frame, middle);
});


test('audio unlock retries a BGM that browser autoplay left paused', async () => {
  let plays = 0;
  const sound = Object.create(Sound.prototype);
  sound.bgm = { paused: true, play: () => { plays++; return Promise.resolve(); } };
  sound.ctx = { state: 'running' };

  sound.unlock();
  await Promise.resolve();

  assert.equal(plays, 1);
});
