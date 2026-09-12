import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QA_POINTS } from '../../src/core/story.js';

const readMap = (id) => {
  const path = `assets/maps/${id}.json`;
  assert.ok(fs.existsSync(path), `${id} must exist`);
  return JSON.parse(fs.readFileSync(path, 'utf8'));
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test('lounge provides a broad enclosed ship floor with only its spring and exit', () => {
  const map = readMap('maillard_lounge');
  assert.equal(map.rows.length, 28);
  assert.equal(map.rows[0].length, 48);
  assert.equal(map.backdrop, undefined);
  assert.equal(map.sunrise, undefined);
  assert.equal(map.bgm, 'maillard_lounge');
  assert.equal(map.dim, 0.08);
  assert.ok([...map.rows.join('')].filter((tile) => tile === 'M').length > 900);
  assert.ok(map.rows[0].trim().length === 0 && map.rows.at(-1).trim().length === 0);
  assert.ok(map.rows.every((row) => row[0] === ' ' && row.at(-1) === ' '));
  assert.deepEqual(map.entities.map((entity) => entity.type).sort(), ['door', 'prop', 'prop']);
  const spring = map.entities.find((entity) => entity.id === 'lounge_spring');
  assert.equal(spring.image, 'assets/props/blue_buff.png');
  assert.deepEqual(spring.anim, { cols: 3, fps: 4 });
  assert.equal(map.enter, undefined);
});

test('walking right from the final deck reaches the lounge and returns outside either portal', () => {
  const path = readMap('maillard_path');
  const lounge = readMap('maillard_lounge');
  const entrance = path.entities.find((entity) => entity.to === lounge.id);
  const exit = lounge.entities.find((entity) => entity.to === path.id);
  assert.ok(entrance && exit);
  assert.equal(entrance.interact, false);
  assert.equal(exit.interact, false);
  assert.ok(entrance.x > 7424);
  assert.deepEqual([entrance.x, entrance.y, entrance.w, entrance.h], [7720, 144, 40, 64]);
  for (let x = 7424; x < entrance.x + 24; x += 8) {
    assert.equal(path.rows[5][Math.floor(x / 32)], 'M');
  }
  const inside = lounge.spawns[entrance.spawn];
  const outside = path.spawns[exit.spawn];
  assert.equal(inside.facing, 'right');
  assert.equal(outside.facing, 'left');
  assert.equal(overlaps({ ...inside, w: 24, h: 16 }, exit), false);
  assert.equal(overlaps({ ...outside, w: 24, h: 16 }, entrance), false);
  assert.ok(inside.x - exit.x - exit.w >= 64);
  assert.ok(entrance.x - outside.x - 24 >= 64);
  assert.equal(path.rows[8][240], 'M');
  assert.equal(path.rows[5][244], '!');
});

test('lounge QA starts at map entry with the completed cart state and existing party', () => {
  const qa = QA_POINTS.filter((point) => point.map === 'maillard_lounge');
  assert.equal(qa.length, 1);
  assert.equal(qa[0].spawn, 'from_path');
  assert.equal(qa[0].flags.maillard_cart_done, true);
  assert.equal(qa[0].flags.maillard_sunrise_seen, true);
  assert.deepEqual(qa[0].party, ['gyeongsub', 'ppaman']);
});
