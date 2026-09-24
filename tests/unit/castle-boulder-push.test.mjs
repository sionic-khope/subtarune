import test from 'node:test';
import assert from 'node:assert/strict';
import { BOULDER_PUSH, castleBoulderTarget, startCastleBoulderPush,
  updateCastleBoulderPush, clearCastleBoulderPush, drawCastleBoulderPush } from '../../src/scenes/castle-boulder-push.js';

const idle = { just: () => false, down: () => false };
const press = { just: key => key === 'confirm', down: key => key === 'confirm' };
const hold = { just: () => false, down: key => key === 'confirm' };
function fixture() {
  const events = [], actor = { id: 'junhee', frame: 2, moving: false, facing: 'left', flyX: 7, hopY: 3,
    spin: 0.1, animate() {} };
  const youngcle = { id: 'youngcle', frame: 0, facing: 'up' };
  const game = { map: {}, entities: [actor, youngcle], player: { id: 'player', frame: 0 },
    sound: { sfx: (name, options) => events.push(['sound', name, options]), blip: voice => events.push(['voice', voice]) } };
  const promise = startCastleBoulderPush(game, { push: ['player', 'junhee', 'youngcle'], tremble: 'junhee',
    barks: ['흐압!', '흐랴압!', '좀만 더 합을 맞춰서!!'], missBark: '다시!',
    onStage: (stage, delta) => events.push(['stage', stage, delta]), onFinish: () => events.push(['finish']) });
  return { game, actor, youngcle, events, promise };
}
function tick(game, dt = 1 / 60, input = idle) { updateCastleBoulderPush(game, dt, input); }
function hit(game) {
  tick(game);
  const state = game.castleBoulderPush;
  for (let i = 0; i < 300; i++) {
    const zone = castleBoulderTarget(state.stage);
    if (!state.feedback && state.marker > zone.left && state.marker < zone.right) break;
    tick(game);
  }
  const previous = state.stage;
  tick(game, 1 / 60, press);
  assert.equal(state.stage, previous + 1);
  tick(game, BOULDER_PUSH.feedback + 0.01);
}
function mash(game, count) {
  for (let i = 0; i < count; i++) { tick(game, 0.04); tick(game, 0.04, press); }
}

test('test_boulder_push_entry_and_held_edges_require_release', () => {
  const { game, events } = fixture();
  for (let i = 0; i < 180; i++) tick(game, 1 / 60, press);
  assert.equal(game.castleBoulderPush.stage, 0);
  assert.equal(events.filter(e => e[0] === 'stage').length, 0);
  hit(game);
  const stage = game.castleBoulderPush.stage;
  for (let i = 0; i < 180; i++) tick(game, 1 / 60, hold);
  assert.equal(game.castleBoulderPush.stage, stage);
  clearCastleBoulderPush(game);
});

test('test_boulder_push_intro_delays_then_fades_without_movement_or_early_input', () => {
  const { game, events } = fixture();
  const state = game.castleBoulderPush;
  const fills = [], ctx = { globalAlpha: 1, save() {}, restore() {}, fillText() {},
    fillRect(...rect) { fills.push({ rect, alpha: this.globalAlpha, color: this.fillStyle }); } };
  tick(game, 1.9, press); drawCastleBoulderPush(game, ctx);
  assert.equal(fills.length, 0);
  tick(game, 0.45, idle); drawCastleBoulderPush(game, ctx);
  assert.equal(state.phase, 'intro');
  assert.ok(fills.length > 0 && fills.every(fill => Math.abs(fill.alpha - 0.5) < 1e-8));
  assert.ok(fills.some(fill => fill.color === '#b45ffc'));
  assert.equal(state.marker, 0); assert.equal(state.travel, 0);
  assert.equal(state.armed, false); assert.equal(state.stage, 0);
  tick(game, 0.35, press);
  assert.equal(state.phase, 'timing');
  assert.equal(state.marker, 0); assert.equal(state.stage, 0);
  tick(game, 0.6, hold); tick(game, 0, press);
  assert.equal(events.filter(event => event[0] === 'stage').length, 0);
  hit(game);
  assert.equal(state.stage, 1);
  clearCastleBoulderPush(game);
});

test('test_boulder_push_miss_loses_one_stage_with_zero_floor', () => {
  const { game, events } = fixture();
  hit(game); hit(game); hit(game);
  for (let miss = 0; miss < 5; miss++) {
    tick(game);
    const state = game.castleBoulderPush;
    while (state.marker > 0.1) tick(game);
    const before = state.stage;
    tick(game, 0, press);
    assert.equal(state.stage, Math.max(0, before - 1));
    tick(game, BOULDER_PUSH.feedback + 0.01);
  }
  assert.deepEqual(events.filter(e => e[0] === 'stage').slice(-2), [['stage', 0, 0], ['stage', 0, 0]]);
  clearCastleBoulderPush(game);
});

test('test_boulder_push_timing_uses_colour_game_success_and_mash_quiet_click_only', () => {
  const { game, events } = fixture();
  hit(game);
  assert.deepEqual(events.filter(e => e[0] === 'sound'), [['sound', 'great_shine', { volume: 0.55, rate: 1 }]]);
  for (let i = 1; i < 10; i++) hit(game);
  const timingSounds = events.filter(e => e[0] === 'sound');
  assert.equal(timingSounds.length, 10);
  assert.ok(timingSounds.every(e => e[1] === 'great_shine' && e[2].volume === 0.55 && e[2].rate === 1));
  events.length = 0;
  mash(game, 4);
  assert.deepEqual(events.filter(e => e[0] === 'sound'), Array.from({ length: 4 }, () =>
    ['sound', 'click', { volume: 0.25, rate: 1 }]));
  clearCastleBoulderPush(game);
});

test('test_boulder_push_ten_stages_require_separate_mash_and_finish_once', async () => {
  const { game, events, promise, actor, youngcle } = fixture();
  for (let i = 0; i < 10; i++) hit(game);
  const state = game.castleBoulderPush;
  assert.equal(state.phase, 'mash');
  assert.equal(state.count, 0);
  for (let i = 0; i < 10; i++) tick(game, 0.1, press);
  assert.equal(state.count, 0);
  mash(game, BOULDER_PUSH.mashTarget - 1);
  assert.equal(state.phase, 'mash');
  assert.equal(events.filter(e => e[0] === 'finish').length, 0);
  mash(game, 1);
  assert.equal(state.phase, 'complete');
  tick(game, BOULDER_PUSH.finishHold - 0.01);
  assert.equal(game.castleBoulderPush, state);
  tick(game, 0.02);
  assert.deepEqual(await promise, { completed: true });
  assert.equal(game.castleBoulderPush, null);
  assert.deepEqual(events.filter(e => e[0] === 'finish'), [['finish']]);
  assert.equal(actor.flyX, 7); assert.equal(actor.hopY, 3); assert.equal(actor.spin, 0.1);
  assert.equal(actor.frame, 2); assert.equal(actor.facing, 'left'); assert.equal(actor.driven, undefined);
  assert.equal(youngcle.facing, 'up');
  tick(game, 2); clearCastleBoulderPush(game);
  assert.equal(events.filter(e => e[0] === 'finish').length, 1);
});

test('test_boulder_push_mash_rest_and_decay_remain_recoverable', () => {
  const { game } = fixture();
  for (let i = 0; i < 10; i++) hit(game);
  mash(game, 5);
  const state = game.castleBoulderPush;
  tick(game, 1);
  assert.equal(state.count, 5);
  tick(game, 0.5);
  assert.ok(state.count < 5 && state.count > 4);
  tick(game, 100);
  assert.equal(state.phase, 'mash'); assert.equal(state.count, 0);
  clearCastleBoulderPush(game);
});

test('test_boulder_push_tenth_success_waits_for_scene_beat_before_fresh_mash', async () => {
  const { game } = fixture();
  const state = game.castleBoulderPush;
  let release, calls = 0;
  state.config.onTimingComplete = () => { calls++; return new Promise(resolve => { release = resolve; }); };
  for (let i = 0; i < 10; i++) hit(game);
  assert.equal(state.phase, 'interlude'); assert.equal(calls, 1);
  for (let i = 0; i < 15; i++) { tick(game, 0.1); tick(game, 0.1, press); }
  assert.equal(state.count, 0); assert.equal(calls, 1);
  drawCastleBoulderPush(game, { save() { assert.fail('interlude hides the gauge'); } });
  release(); await Promise.resolve();
  assert.equal(state.phase, 'mash'); assert.equal(state.armed, false);
  tick(game, 0.1, press); assert.equal(state.count, 0);
  mash(game, 1); assert.equal(state.count, 1);
  clearCastleBoulderPush(game);
});

test('test_boulder_push_cancelled_timing_hook_cannot_resume_or_overwrite_replacement', async () => {
  const { game, promise } = fixture();
  const state = game.castleBoulderPush;
  let release;
  state.config.onTimingComplete = () => new Promise(resolve => { release = resolve; });
  for (let i = 0; i < 10; i++) hit(game);
  const replacementPromise = startCastleBoulderPush(game);
  const replacement = game.castleBoulderPush;
  assert.deepEqual(await promise, { completed: false });
  release(); await Promise.resolve();
  assert.equal(game.castleBoulderPush, replacement);
  assert.equal(replacement.phase, 'intro'); assert.equal(replacement.stage, 0);
  assert.equal(state.phase, 'interlude');
  clearCastleBoulderPush(game); await replacementPromise;
});

test('test_boulder_push_clear_map_replacement_cancel_without_finish', async () => {
  for (const mode of ['clear', 'map', 'replace']) {
    const { game, actor, promise, events } = fixture();
    hit(game); tick(game, 0.01);
    if (mode === 'clear') clearCastleBoulderPush(game);
    if (mode === 'map') { game.map = {}; tick(game); }
    if (mode === 'replace') startCastleBoulderPush(game);
    assert.deepEqual(await promise, { completed: false });
    assert.equal(actor.flyX, 7); assert.equal(actor.facing, 'left');
    assert.equal(events.filter(e => e[0] === 'finish').length, 0);
    clearCastleBoulderPush(game);
  }
});

test('test_boulder_push_render_preserves_judged_zone_and_canvas_state', () => {
  const { game } = fixture();
  tick(game, BOULDER_PUSH.introDelay + BOULDER_PUSH.introFade);
  const state = game.castleBoulderPush;
  state.stage = 2; state.judgedStage = 3; state.feedback = 0.3; state.result = 'miss';
  const calls = [], ctx = { save() { calls.push('save'); }, restore() { calls.push('restore'); },
    fillText(text) { assert.notEqual(text, undefined); }, fillRect(...args) { calls.push(args); } };
  drawCastleBoulderPush(game, ctx);
  const zone = castleBoulderTarget(3), gauge = BOULDER_PUSH.gauge;
  assert.ok(calls.some(call => Array.isArray(call) && call[0] === Math.round(gauge.x + gauge.w * zone.left)
    && call[2] === Math.round(gauge.w * (zone.right - zone.left))));
  assert.equal(calls.at(-1), 'restore');
  clearCastleBoulderPush(game);
});

test('test_boulder_push_feedback_stays_above_gauge_and_clear_of_stage_counter', () => {
  const { game } = fixture();
  tick(game, BOULDER_PUSH.introDelay + BOULDER_PUSH.introFade);
  const state = game.castleBoulderPush;
  state.bark = '좀만 더 합을 맞춰서!!'; state.barkShown = state.bark.length; state.barkTime = 0.4;
  const texts = [], ctx = { save() {}, restore() {}, fillRect() {},
    fillText(text, x, y) { if (this.fillStyle === '#fff') texts.push({ text, x, y }); } };
  drawCastleBoulderPush(game, ctx);
  const bark = texts.find(item => item.text === state.bark);
  const counter = texts.find(item => item.text === '0 / 10');
  assert.equal(bark.y, 18);
  assert.ok(bark.y + 16 < BOULDER_PUSH.gauge.y - 5);
  assert.ok(counter.x + counter.text.length * 8 < bark.x - bark.text.length * 8);
  clearCastleBoulderPush(game);
});
