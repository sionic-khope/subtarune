import test from 'node:test';
import assert from 'node:assert/strict';
import { mankatsukiVortexPoint, mankatsukiAuraPoint } from '../../src/battle/mankatsuki-background.js';
import { BATTLE_BGS } from '../../src/battle/backgrounds.js';
import { darkSmokeWaiter, drawDarkSmoke } from '../../src/ui/dark-smoke.js';

test('test_mankatsuki_background_has_vertical_hourglass_and_independent_surrounding_rotation', () => {
  assert.equal(typeof BATTLE_BGS.mankatsuki_vortex, 'function');
  const top = mankatsukiVortexPoint(0, 0, 0);
  const waist = mankatsukiVortexPoint(0.5, 0, 0);
  const bottom = mankatsukiVortexPoint(1, 0, 0);
  assert.ok(top.y < waist.y && waist.y < bottom.y);
  assert.ok(Math.abs(top.x - 240) > Math.abs(waist.x - 240) * 10);
  assert.ok(Math.abs(bottom.x - 240) > Math.abs(waist.x - 240) * 10);
  const turning = mankatsukiVortexPoint(0.28, 0, 2);
  assert.ok(turning.z > mankatsukiVortexPoint(0.28, 0, 0).z);
  assert.ok(mankatsukiAuraPoint(0, 0, 2).z < mankatsukiAuraPoint(0, 0, 0).z);
  const front = mankatsukiVortexPoint(0.72, -Math.PI / 2, 0);
  const back = mankatsukiVortexPoint(0.72, Math.PI / 2, 0);
  assert.ok(front.y - 110 > back.y - 110, 'near lower face must foreshorten differently from far face');
  for (const time of [0, 4, 100000]) {
    for (const height of [0, 0.5, 1]) {
      const point = mankatsukiVortexPoint(height, Math.PI, time);
      assert.ok(Object.values(point).every(Number.isFinite));
      assert.ok(point.z > -720);
    }
  }
});

test('test_mankatsuki_faster_rotation_preserves_narrow_waist_and_bounded_perspective', () => {
  assert.ok(mankatsukiVortexPoint(0.5, 0, 1).z > 4.5, 'central point advances faster than the previous rotation');
  assert.ok(mankatsukiAuraPoint(0, 0, 1).z < -130, 'outer ribbon counter-rotation also accelerates');
  for (let time = 0; time <= 60; time += 0.25) {
    const waist = mankatsukiVortexPoint(0.5, 0, time);
    assert.ok(Math.abs(waist.x - 240) < 8);
    assert.ok(Math.abs(waist.y - 110) < 2);
    for (const height of [0, 0.3, 0.7, 1]) {
      const point = mankatsukiVortexPoint(height, -Math.PI / 2, time);
      assert.ok(Object.values(point).every(Number.isFinite));
      assert.ok(point.z > -600, 'breathing stays well in front of the nearest projection limit');
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
