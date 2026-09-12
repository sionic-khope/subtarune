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

test('maillard sunrise path reaches the automatic cart in an eight-second leftward approach', () => {
  const data = map();
  const route = data.meta.sunriseRoute;

  assert.equal(data.backdrop, 'maillard_sunrise');
  assert.equal(data.bgm, 'wind');
  assert.equal(data.sunrise.animated, true);
  assert.ok(data.preload.includes('assets/backdrops/maillard_sunset.png'));
  assert.ok(data.preload.includes('assets/props/maillard_sun.png'));
  assert.ok(data.preload.includes('assets/props/maillard-cart.png'));
  assert.ok(data.preload.includes('assets/backdrops/maillard_sea.png'));
  assert.equal(data.rows[0].length, 75);
  assert.equal(data.rows.length, 25);
  assert.equal(routeDistance(route), 1696);
  assert.ok(routeDistance(route) / WALK_SPEED >= 7.5);
  assert.ok(routeDistance(route) / WALK_SPEED <= 8.5);
  assert.ok(route.slice(1).every(([x, y], index) => x <= route[index][0] && y === route[index][1]));
  for (let column = 19; column <= 72; column++) {
    assert.equal(data.rows[18][column], 'M', `manual route must connect through column ${column}`);
  }
  for (const point of route) {
    const [column, row] = tileOf(point);
    assert.equal(data.rows[row][column], 'M', `route waypoint ${column},${row} must be walkable deck`);
  }
});

test('maillard sunrise path gates the cart ride and keeps landing bystanders inert', () => {
  const data = map();
  const bystanders = data.entities.filter((entity) => entity.type === 'npc');
  const returnDoor = data.entities.find((entity) => entity.id === 'path_to_hold');
  const cartBoard = data.entities.find((entity) => entity.id === 'cart_board');

  assert.ok(bystanders.length >= 3 && bystanders.length <= 4);
  assert.ok(bystanders.every((entity) => entity.wander === 0 && entity.script === undefined));
  assert.deepEqual(returnDoor && [returnDoor.to, returnDoor.spawn], ['maillard_deck', 'from_path']);
  assert.deepEqual(cartBoard && [cartBoard.script, cartBoard.unless], ['maillard_cart_board', 'maillard_cart_done']);
  assert.deepEqual(data.meta.sunriseCart.order, ['player', 'ppaman', 'gyeongsub']);
  assert.equal(data.meta.sunriseCart.duration, 20);
  assert.equal(data.meta.connected, false);
  assert.equal(storyBgm('maillard_path', { maillard_cart_done: true }), 'maillard_sunrise');
  assert.deepEqual(data.meta.sunriseCart.landing, [1920, 456]);
  assert.deepEqual(data.spawns.cart_landing, { x: 1920, y: 456, facing: 'left' });
  assert.equal(routeDistance(data.meta.sunriseWalkout), 2272);
  assert.ok(routeDistance(data.meta.sunriseWalkout) / WALK_SPEED >= 10);
  for (let column = 38; column <= 64; column++) assert.equal(data.rows[14][column], 'M');
  for (let row = 6; row <= 14; row++) assert.equal(data.rows[row][38], 'M');
  for (let column = 5; column <= 38; column++) assert.equal(data.rows[6][column], 'M');
  for (let row = 2; row <= 6; row++) assert.equal(data.rows[row][5], 'M');
});
