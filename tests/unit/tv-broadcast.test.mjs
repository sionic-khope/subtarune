import test from 'node:test';
import assert from 'node:assert/strict';
import { TvBroadcast } from '../../src/world/tv-broadcast.js';
import { YOUNGCLE_TV as TV, YOUNGCLE_TV_PORTRAITS } from '../../src/data/youngcle-tv.js';

function fixture() {
  const sounds = [];
  const game = {
    entities: [{ id: TV.anchor, x: 80, y: 50 }],
    propImages: Object.fromEntries(Object.values(TV.expressions).map(src => [src, { src, width: 258, height: 119 }])),
    sound: { sfx: name => sounds.push(name) },
  };
  const calls = [], stack = [];
  const ctx = {
    globalAlpha: 0.4, activeClip: 'caller', fillStyle: '#000',
    save() { stack.push({ globalAlpha: this.globalAlpha, activeClip: this.activeClip, fillStyle: this.fillStyle }); },
    restore() { Object.assign(this, stack.pop()); },
    beginPath() {}, rect(...rect) { this.pendingClip = rect; },
    clip() { this.activeClip = this.pendingClip; calls.push(['clip', this.activeClip]); },
    fillRect(...rect) { calls.push(['fill', rect, this.fillStyle, this.globalAlpha, this.activeClip]); },
    drawImage(...args) { calls.push(['image', args, this.activeClip, this.globalAlpha]); },
  };
  return { tv: new TvBroadcast(game, TV), game, ctx, calls, stack, sounds };
}

test('test_tv_still_illustrations_fill_the_same_inset_for_every_expression_and_elapsed_time', () => {
  const { tv, game, ctx, calls } = fixture();
  const cam = { x: 20, y: 15 }, inset = [75, 64, 258, 119];
  tv.power(true); tv.update(TV.powerTime);
  assert.deepEqual(Object.keys(TV.expressions), ['smirk', 'laugh', 'greet', 'oh', 'taunt', 'shrug', 'bye', 'yes', 'surprise', 'read', 'shock', 'hide']);
  assert.deepEqual(YOUNGCLE_TV_PORTRAITS, ['youngcle_tv_smirk', 'youngcle_tv_laugh', 'youngcle_tv_greet', 'youngcle_tv_oh', 'youngcle_tv_taunt', 'youngcle_tv_shrug', 'youngcle_tv_bye', 'youngcle_tv_yes', 'youngcle_tv_surprise', 'youngcle_tv_read', 'youngcle_tv_shock', 'youngcle_tv_hide']);
  for (const [expression, src] of Object.entries(TV.expressions)) {
    tv.setExpression(expression);
    let first;
    for (const dt of [0, 0.017, 0.3, 3, 60]) {
      calls.length = 0; tv.update(dt); tv.draw(ctx, cam);
      const image = calls.find(call => call[0] === 'image');
      assert.deepEqual(image, ['image', [game.propImages[src], ...inset], inset, 1]);
      if (first) assert.deepEqual(calls, first, `${expression} must stay completely still while the dialogue waits`);
      else first = structuredClone(calls);
    }
  }
});

test('test_tv_power_and_shutdown_clip_every_draw_inside_screen_and_restore_the_caller', () => {
  const { tv, ctx, calls, stack, sounds } = fixture();
  const cam = { x: 20, y: 15 }, inset = [75, 64, 258, 119];
  tv.draw(ctx, cam); assert.equal(calls.length, 0);
  tv.power(true);
  for (const dt of [0, TV.powerTime / 2, TV.powerTime / 2]) {
    calls.length = 0; tv.update(dt); tv.draw(ctx, cam);
    const clip = calls[0][1];
    assert.equal(clip[0], inset[0]); assert.equal(clip[2], inset[2]);
    assert.ok(clip[1] >= inset[1] && clip[1] + clip[3] <= inset[1] + inset[3]);
    assert.equal(calls.some(call => call[0] === 'image'), tv.phase === 'on');
    for (const call of calls.slice(1)) assert.deepEqual(call[0] === 'image' ? call[2] : call[4], clip);
    assert.equal(ctx.activeClip, 'caller'); assert.equal(ctx.globalAlpha, 0.4); assert.equal(stack.length, 0);
  }
  tv.power(false); tv.update(TV.shutdownTime / 2); calls.length = 0; tv.draw(ctx, cam);
  const clip = calls[0][1];
  assert.ok(clip[3] > 2 && clip[3] < inset[3]);
  assert.ok(clip[1] >= inset[1] && clip[1] + clip[3] <= inset[1] + inset[3]);
  assert.deepEqual(calls.find(call => call[0] === 'image')[2], clip);
  tv.update(TV.shutdownTime / 2); calls.length = 0; tv.draw(ctx, cam);
  assert.equal(tv.phase, 'off'); assert.equal(calls.length, 0);
  assert.deepEqual(sounds, ['youngcle_tv_on']);
});
