import test from 'node:test';
import assert from 'node:assert/strict';
import { ShipAssault } from '../../src/scenes/ship-assault.js';
import { SHIP_ASSAULT as C } from '../../src/data/ship-assault.js';
import { FX } from '../../src/data/fx.js';

function scene() {
  const sounds = [];
  const game = { propImages: {
    [C.images.maillard]: { width: 768, height: 496 },
    [C.images.enemy]: { width: 768, height: 384 },
    [FX.explosion.sheet]: { width: 2635, height: 128 },
  }, sound: { sfx: id => sounds.push(id) } };
  return { game, sounds, scene: new ShipAssault(game) };
}

test('test_ship_assault_reveal_fits_full_ships_above_dialogue_with_1_5_width_ratio', () => {
  const { scene: s } = scene();
  s.setBeat('reveal'); s.update(C.timing.reveal);
  const rects = s.shipRects();
  assert.equal(rects.enemy.width / rects.maillard.width, 1.5);
  for (const r of Object.values(rects)) {
    assert.ok(r.x >= 0 && r.y >= 0, JSON.stringify(r));
    assert.ok(r.x + r.width <= 480 && r.y + r.height <= 230, JSON.stringify(r));
  }
});

test('test_ship_assault_bridge_reaches_both_hulls_after_visible_lowering', () => {
  const { scene: s } = scene();
  s.setBeat('bridge');
  const initial = s.bridgeGeometry();
  s.update(C.timing.bridge / 2);
  const middle = s.bridgeGeometry();
  assert.equal(initial.progress, 0);
  assert.ok(middle.progress > 0 && middle.progress < 1);
  assert.notDeepEqual(middle.tip, middle.target);
  s.update(C.timing.bridge / 2);
  const end = s.bridgeGeometry();
  assert.equal(end.progress, 1);
  assert.deepEqual(end.tip, end.target);
  assert.ok(Math.hypot(end.target[0] - end.start[0], end.target[1] - end.start[1]) > 50);
});

test('test_ship_assault_room_dust_and_ocean_explosion_repeat_then_dispose', () => {
  const { scene: s, sounds, game } = scene();
  s.impact(true);
  assert.equal(s.dust.length, C.room.dustCount);
  assert.equal(sounds[0], 'boom');
  for (let i = 0; i < 60; i++) s.update(0.05);
  assert.ok(sounds.includes('rumble'));
  assert.ok(s.dust.some(p => p.y > 0));
  s.setBeat('ocean');
  assert.equal(s.dust.length, 0);
  for (let i = 0; i < 80; i++) s.update(0.05);
  assert.ok(sounds.filter(id => id === 'explosion').length >= 3);
  s.dispose();
  const count = sounds.length;
  s.update(10);
  assert.equal(sounds.length, count);
  assert.deepEqual(s.dust, []); assert.deepEqual(s.explosions, []);
  assert.equal(game.shake, null);
});

test('test_ship_assault_draw_uses_both_pngs_and_existing_explosion_with_enemy_flip', () => {
  const { scene: s, game } = scene(), draws = [], flips = [];
  const ctx = {
    fillRect() {}, save() {}, restore() {}, translate() {}, rotate() {},
    scale: (x, y) => flips.push([x, y]),
    drawImage: image => draws.push(image),
  };
  s.setBeat('ocean'); s.setBeat('bridge'); s.update(0.2);
  s.draw(ctx);
  assert.ok(draws.includes(game.propImages[C.images.maillard]));
  assert.ok(draws.includes(game.propImages[C.images.enemy]));
  assert.ok(draws.includes(game.propImages[FX.explosion.sheet]));
  assert.deepEqual(flips, [[-1, 1]]);
});
