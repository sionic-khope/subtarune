import test from 'node:test';
import assert from 'node:assert/strict';
import { MAILLARD_CART, MAILLARD_SUNRISE } from '../../src/data/maillard-sunrise.js';
import { advanceSunrise, MaillardSunrise } from '../../src/world/sunrise.js';
import { cartPassengerProgress } from '../../src/scenes/maillard-cart.js';

const fresh = () => ({ progress: 0, completed: false, lastAudioTime: 0 });

test('test_sunrise_audio_clock_holds_before_14_seconds', () => {
  // Arrange
  const state = fresh();

  // Act
  const next = advanceSunrise(state, 13.999, { ...MAILLARD_SUNRISE, animated: true, seen: false });

  // Assert
  assert.equal(next.progress, 0);
  assert.equal(next.shouldPersist, false);
});

test('test_sunrise_audio_clock_rises_from_14_through_18_seconds', () => {
  // Arrange
  const cfg = { ...MAILLARD_SUNRISE, animated: true, seen: false };

  // Act
  const atStart = advanceSunrise(fresh(), 14, cfg);
  const halfway = advanceSunrise(atStart, 16, cfg);
  const complete = advanceSunrise(halfway, 18, cfg);

  // Assert
  assert.equal(atStart.progress, 0);
  assert.equal(halfway.progress, 0.5);
  assert.equal(complete.progress, 1);
  assert.equal(complete.shouldPersist, true);
});

test('test_sunrise_seen_or_static_map_stays_fully_raised', () => {
  // Arrange
  const seen = { ...MAILLARD_SUNRISE, animated: true, seen: true };
  const staticMap = { ...MAILLARD_SUNRISE, animated: false, seen: false };

  // Act
  const seenFrame = advanceSunrise(fresh(), 0, seen);
  const staticFrame = advanceSunrise(fresh(), 0, staticMap);

  // Assert
  assert.equal(seenFrame.progress, 1);
  assert.equal(seenFrame.shouldPersist, false);
  assert.equal(staticFrame.progress, 1);
  assert.equal(staticFrame.shouldPersist, false);
});

test('test_sunrise_bgm_loop_never_replays_a_completed_rise', () => {
  // Arrange
  const cfg = { ...MAILLARD_SUNRISE, animated: true, seen: false };
  const complete = advanceSunrise(fresh(), 18, cfg);

  // Act
  const looped = advanceSunrise(complete, 0.25, cfg);

  // Assert
  assert.equal(looped.progress, 1);
  assert.equal(looped.completed, true);
  assert.equal(looped.shouldPersist, false);
});

test('test_sunrise_muted_or_buffered_media_uses_only_current_time', () => {
  // Arrange
  const bgm = { currentTime: 9, play: () => Promise.resolve() };
  const sound = { bgmName: MAILLARD_SUNRISE.bgm, bgm, muted: true };
  const effect = new MaillardSunrise(MAILLARD_SUNRISE);
  effect.enter({ sound, images: {}, animated: true, seen: false, restart: true });

  // Act
  bgm.currentTime = 16;
  effect.update();
  const rising = effect.frame.progress;
  effect.update();

  // Assert
  assert.equal(rising, 0.5);
  assert.equal(effect.frame.progress, 0.5);
});

test('test_cart_boarding_order_and_duration_match_scene_contract', () => {
  // Arrange
  const firstPassengerBeat = MAILLARD_CART.boardingSeconds / MAILLARD_CART.order.length;

  // Act
  const first = cartPassengerProgress('boarding', firstPassengerBeat, 0);
  const second = cartPassengerProgress('boarding', firstPassengerBeat, 1);

  // Assert
  assert.deepEqual(MAILLARD_CART.order, ['player', 'ppaman', 'gyeongsub']);
  assert.equal(first, 1);
  assert.equal(second, 0);
  assert.equal(MAILLARD_CART.rideSeconds, 20);
});
