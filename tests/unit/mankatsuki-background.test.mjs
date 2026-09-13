import test from 'node:test';
import assert from 'node:assert/strict';
import { mankatsukiVortexPoint } from '../../src/battle/mankatsuki-background.js';
import { BATTLE_BGS } from '../../src/battle/backgrounds.js';
import { darkSmokeWaiter, drawDarkSmoke } from '../../src/ui/dark-smoke.js';

test('test_mankatsuki_background_registered_and_funnel_has_depth_and_rotation', () => {
  assert.equal(typeof BATTLE_BGS.mankatsuki_vortex, 'function');
  const near = mankatsukiVortexPoint(0, 0, 0);
  const far = mankatsukiVortexPoint(1, 0, 0);
  assert.ok(far.z > near.z);
  assert.ok(Math.abs(near.x - 240) > Math.abs(far.x - 240) * 5);
  assert.notDeepEqual(mankatsukiVortexPoint(0.4, 0.8, 0), mankatsukiVortexPoint(0.4, 0.8, 2));
  for (const time of [0, 4, 100000]) {
    for (const depth of [0, 0.5, 1]) {
      const point = mankatsukiVortexPoint(depth, Math.PI, time);
      assert.ok(Object.values(point).every(Number.isFinite));
      assert.ok(point.z > 0);
    }
  }
});

test('test_smoke_room_purple_tint_ramps_with_veil_and_survives_mode_change', () => {
  const game = { time: 0, player: { x: 0, y: 0, w: 24, h: 16 }, entities: [] };
  const paints = [];
  const ctx = { save() {}, restore() {}, fillRect() {
    paints.push({ color: this.fillStyle, alpha: this.globalAlpha, blend: this.globalCompositeOperation });
  } };
  const waiter = darkSmokeWaiter(game, { mode: 'veil', duration: 2, veil: 0.4 });
  waiter.update(1);
  drawDarkSmoke(ctx, game, { x: 0, y: 0 });
  const mid = paints.find(paint => paint.blend === 'color');
  assert.equal(mid.color, '#66349a');
  assert.ok(mid.alpha > 0 && mid.alpha < 0.85);
  waiter.update(1);
  darkSmokeWaiter(game, { mode: 'gather', from: 'player', duration: 3 });
  assert.equal(game.darkSmoke.veil, 0.4);
  paints.length = 0;
  drawDarkSmoke(ctx, game, { x: 0, y: 0 });
  assert.equal(paints.find(paint => paint.blend === 'color').alpha, 0.85);
  darkSmokeWaiter(game, null);
  paints.length = 0;
  drawDarkSmoke(ctx, game, { x: 0, y: 0 });
  assert.equal(paints.length, 0);
});
