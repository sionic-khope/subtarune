import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTile } from '../../src/world/tiles.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('castle approach has a ten second walk ending at a closed gate', () => {
  const map = readMap('gajaeman_castle_approach');
  const gate = map.entities.find(entity => entity.id === 'castle306_gate');
  const spawn = map.spawns.start;
  const seconds = (spawn.y - gate.y - gate.h) / (32 * 3.9 * 1.75);
  assert.ok(seconds >= 9.5 && seconds <= 10.5, `${seconds}s`);
  assert.equal(gate.solid, true);
  assert.equal(gate.script, 'castle_lobby_enter');
  assert.equal(map.entities.filter(entity => entity.type === 'door').length, 1);
  assert.equal(map.entities.find(entity => entity.type === 'door').to, 'gajaeman_castle_entry');
});

test('castle approach floor variety remains walkable along the whole northern route', () => {
  const map = readMap('gajaeman_castle_approach');
  const gate = map.entities.find(entity => entity.id === 'castle306_gate');
  const tiles = new Set();
  for (let y = gate.y + gate.h; y <= map.spawns.start.y; y += 8) {
    for (const x of [map.spawns.start.x, map.spawns.start.x + 23]) {
      const tile = getTile(map.rows[Math.floor(y / 32)][Math.floor(x / 32)]);
      assert.equal(tile.solid, false, `blocked at ${x},${y}`);
      tiles.add(tile.name);
    }
  }
  assert.ok(tiles.size >= 3);
  assert.equal(map.bgm, 'castle_approach');
  assert.equal(map.backdrop, 'castle306_distant');
});

test('castle interior hall has broad floors bounded by thick stone walls', () => {
  const map = readMap('gajaeman_castle_approach');
  for (const row of [30, 45, 60, 75]) {
    assert.ok([...map.rows[row].slice(8, 16)].every(char => !getTile(char).solid));
    assert.ok([...map.rows[row].slice(6, 8)].every(char => getTile(char).solid));
    assert.ok([...map.rows[row].slice(16, 18)].every(char => getTile(char).solid));
  }
});
