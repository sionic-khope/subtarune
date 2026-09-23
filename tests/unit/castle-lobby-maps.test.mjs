import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTile } from '../../src/world/tiles.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('castle lobby has three north-facing doors with the two-seal central door largest', () => {
  const map = readMap('gajaeman_castle_lobby');
  const doors = ['castle_lobby_left_door', 'castle_lobby_right_door', 'castle_lobby_sealed_door'].map(id => map.entities.find(e => e.id === id));
  assert.equal(map.rows.length, 32);
  assert.equal(map.rows[0].length, 40);
  assert.ok(doors.every(e => e.solid && e.sortY === 0));
  assert.ok(doors[0].x < doors[2].x && doors[2].x < doors[1].x);
  assert.ok(doors[2].y < doors[0].y && doors[2].y < doors[1].y);
  assert.ok(doors[2].scale > doors[0].scale);
  assert.equal(doors[2].script, 'castle_lobby_sealed');
  assert.equal(doors[1].script, 'castle_lobby_right_enter');
  assert.equal(map.entities.filter(e => e.type === 'door' && e.to === 'gajaeman_castle_right1').length, 0);
  assert.equal(map.meta.seals, 2);
});

test('castle lobby entrance and completed left restriction preserve safe party anchors', () => {
  const map = readMap('gajaeman_castle_lobby');
  assert.equal(map.enter.script, 'castle_lobby_intro');
  assert.equal(map.enter.flag, undefined);
  assert.equal(map.bgm, null);
  for (const [x, y] of Object.values(map.meta.stage)) {
    for (const [dx, dy] of [[0, 0], [23, 0], [0, 15], [23, 15]]) {
      assert.equal(getTile(map.rows[Math.floor((y + dy) / 32)][Math.floor((x + dx) / 32)]).solid, false, `unsafe anchor ${x},${y}`);
    }
  }
  const trigger = map.entities.find(e => e.script === 'castle_lobby_left_block');
  assert.equal(trigger.requires, undefined);
  assert.equal(trigger.once, undefined);
  assert.ok(trigger.w >= 64 && trigger.h >= 160);
  assert.ok(map.meta.stage.lobby_left_block_return[0] >= trigger.x + trigger.w);
  for (const id of ['lobby_wall1', 'lobby_wall2', 'lobby_wall3']) {
    const anchor = map.entities.find(e => e.id === id);
    assert.equal(map.rows[Math.floor(anchor.y / 32)][Math.floor(anchor.x / 32)], '▥');
  }
});

test('castle right corridor is a five-second indoor walk beside blocked violet lava', () => {
  const map = readMap('gajaeman_castle_right1');
  assert.equal(map.backdrop, 'castle307_right');
  assert.equal(map.bgm, 'castle_right');
  assert.ok((map.spawns.start.y - 64) / (32 * 3.9 * 1.75) > 4.8);
  assert.ok((map.spawns.start.y - 64) / (32 * 3.9 * 1.75) < 5.3);
  assert.ok(map.rows.some(row => row.includes('♨') && row.includes('♩')));
  for (const row of map.rows.slice(2, -1)) {
    assert.equal(row.slice(0, 7), ' '.repeat(7));
    assert.equal(row.slice(17), ' '.repeat(7));
    assert.ok([...row.slice(9, 15)].every(char => !getTile(char).solid));
    assert.ok([row[7], row[16]].every(char => getTile(char).solid));
  }
  assert.ok(map.rows.slice(0, 2).every(row => row.slice(9, 15) === '▥'.repeat(6)));
  for (let y = 64; y <= map.spawns.start.y; y += 8) {
    for (const dx of [0, 23]) assert.equal(getTile(map.rows[Math.floor(y / 32)][Math.floor((map.spawns.start.x + dx) / 32)]).solid, false);
  }
  assert.equal(map.entities.filter(e => e.type === 'door').length, 1);
  assert.equal(map.entities.find(e => e.type === 'door').to, 'gajaeman_castle_lobby');
  assert.equal(map.entities.find(e => e.type === 'door').x, 288);
  assert.equal(map.entities.find(e => e.type === 'door').w, 192);
});
