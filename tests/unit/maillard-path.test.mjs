import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { storyBgm } from '../../src/core/story.js';

const TILE = 32;
const WALK_SPEED = 218.4;

const map = () => {
  const path = 'assets/maps/maillard_path.json';
  assert.ok(fs.existsSync(path), 'maillard_path map must be generated and registered');
  return JSON.parse(fs.readFileSync(path, 'utf8'));
};

const tileOf = ([x, y]) => [Math.floor(x / TILE), Math.floor(y / TILE)];
const routeDistance = (points) => points.slice(1).reduce(
  (total, point, index) => total + Math.abs(point[0] - points[index][0]) + Math.abs(point[1] - points[index][1]),
  0,
);

test('maillard deck begins at the left and reaches the cart by walking right for about eight seconds', () => {
  const data = map();
  const route = data.meta.sunriseRoute;

  assert.equal(data.backdrop, 'maillard_sunrise');
  assert.equal(data.bgm, 'maillard_sunrise');
  assert.equal(data.sunrise.animated, true);
  assert.ok(data.preload.includes('assets/backdrops/maillard_sunset.png'));
  assert.ok(data.preload.includes('assets/props/maillard_sun.png'));
  assert.ok(data.preload.includes('assets/props/maillard-cart.png'));
  assert.equal(routeDistance(route), 1728);
  assert.ok(routeDistance(route) / WALK_SPEED >= 7.5);
  assert.ok(routeDistance(route) / WALK_SPEED <= 8.5);
  assert.ok(route.slice(1).every(([x, y], index) => x >= route[index][0] && y === route[index][1]));
  assert.equal(data.spawns.from_hold.facing, 'right');
  for (const point of route) {
    const [column, row] = tileOf(point);
    assert.equal(data.rows[row][column], 'M', `approach waypoint ${column},${row} must be walkable deck`);
  }
});

test('maillard cart waits for interaction and travels right on its own rail', () => {
  const data = map();
  const cart = data.entities.find((entity) => entity.id === 'maillard_cart');
  const legacyTrigger = data.entities.find((entity) => entity.id === 'cart_board');

  assert.ok(cart);
  assert.equal(cart.type, 'raft');
  assert.equal(cart.autoBoard, undefined);
  assert.equal(cart.boardSfx, 'thud');
  assert.equal(cart.script, undefined);
  assert.equal(legacyTrigger, undefined);
  assert.ok(cart.route[0][0] > cart.x);
  assert.equal(cart.speed, 192);
  assert.deepEqual(cart.route, [[6464, 986]]);
  assert.deepEqual(data.rails, [[1856, 1007, 4846]]);
  assert.equal(routeDistance([[cart.x, cart.y], ...cart.route]) / cart.speed, 24);
  assert.equal(data.meta.sunriseCart.duration, 24);
  assert.equal(cart.passengerLookAfter, 8);
  assert.equal(cart.passengerLookFacing, 'up');
  assert.equal(cart.flag, 'maillard_cart_done');
  assert.equal(cart.cars, 3);
  assert.equal(cart.riderOffset[0], 80);
  assert.equal(cart.passengerGap, 80);
  assert.deepEqual(data.meta.sunriseCart.order, ['player', 'ppaman', 'gyeongsub']);
  assert.equal(storyBgm('maillard_path', {}), undefined);
  assert.equal(storyBgm('maillard_path', { maillard_cart_done: true }), 'maillard_sunrise');
});

test('post-cart winding deck stays narrow enough to preserve the sky and keeps NPCs off the route', () => {
  const data = map();
  const bystanders = data.entities.filter((entity) => entity.type === 'npc');
  const returnDoor = data.entities.find((entity) => entity.id === 'path_to_hold');
  const walkout = data.meta.sunriseWalkout;

  assert.ok(bystanders.length >= 3 && bystanders.length <= 4);
  assert.ok(bystanders.every((entity) => entity.wander === 0 && entity.solid === false && entity.script));
  assert.deepEqual(returnDoor && [returnDoor.to, returnDoor.spawn], ['maillard_deck', 'from_path']);
  assert.equal(data.rows[0].length, 250);
  assert.deepEqual(data.meta.sunriseCart.landing, [6848, 1000]);
  assert.deepEqual(data.spawns.cart_landing, { x: 6848, y: 1000, facing: 'right' });
  assert.ok(walkout[0][1] - walkout[2][1] >= 12 * TILE, 'the next deck tier must remain outside the current viewport');
  assert.ok(walkout[2][1] - walkout[4][1] >= 12 * TILE, 'each winding tier must preserve an open sky view');
  assert.ok(routeDistance(walkout) / WALK_SPEED >= 9);
  for (const point of walkout) {
    const [column, row] = tileOf(point);
    assert.equal(data.rows[row][column], 'M', `walkout waypoint ${column},${row} must be walkable deck`);
  }
  const cells = data.rows.join('');
  const covered = [...cells].filter((tile) => tile === 'M').length;
  assert.equal(cells.includes(' '), false, 'outside the route must not paint black void over the backdrop');
  assert.ok(cells.includes('!'), 'transparent solid tiles must reveal the backdrop outside the route');
  assert.ok(covered < data.rows.length * data.rows[0].length * 0.22, 'deck must not cover the backdrop');
});
