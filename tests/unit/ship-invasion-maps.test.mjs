import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readMap = (id) => JSON.parse(fs.readFileSync(new URL(`../../assets/maps/${id}.json`, import.meta.url), 'utf8'));
const tile = (map, x, y) => map.rows[Math.floor(y / 32)]?.[Math.floor(x / 32)];

test('test_ship_night_deck_staging_keeps_party_on_iron_behind_rail', () => {
  const map = readMap('ship_night_deck');
  assert.equal(map.bgm, 'wind');
  assert.equal(map.backdrop, 'jjajang_night_sea');
  for (const [x, y] of Object.values(map.meta.stage)) {
    for (const [dx, dy] of [[0, 0], [23, 0], [0, 15], [23, 15]]) assert.equal(tile(map, x + dx, y + dy), 'F');
  }
  assert.equal(map.entities.filter((entity) => entity.image === 'assets/props/iron_fence_short.png').length, 19);
  assert.ok(map.rows.slice(9).every((row) => [...row.slice(20)].every((cell) => cell === '!')));
  const edge = map.entities.find((entity) => entity.id === 'deck_rail_right');
  assert.ok(edge.solid && edge.x >= map.spawns.alone.x + 24);
  assert.equal(edge.y + edge.h, map.rows.length * 32);
  assert.equal(map.entities.filter((entity) => entity.type === 'npc').length, 0);
});

test('test_castle_entry_arrival_has_five_safe_anchors_and_north_route_only', () => {
  const map = readMap('gajaeman_castle_entry');
  const walk = new Set(['⌂', '⌁']);
  const start = map.spawns.arrival;
  const queue = [[Math.floor(start.x / 32), Math.floor(start.y / 32)]];
  const seen = new Set();
  while (queue.length) {
    const [x, y] = queue.shift();
    const key = `${x},${y}`;
    if (seen.has(key) || !walk.has(map.rows[y]?.[x])) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  for (const [x, y] of Object.values(map.meta.stage)) {
    assert.ok(seen.has(`${Math.floor(x / 32)},${Math.floor(y / 32)}`));
    assert.ok(walk.has(tile(map, x + 23, y + 15)));
  }
  assert.ok(!seen.has('46,11'));
  assert.ok(seen.has('14,2'));
  assert.ok(seen.has('14,0'));
  const doors = map.entities.filter((entity) => entity.type === 'door');
  assert.equal(doors.length, 1);
  assert.equal(doors[0].to, 'gajaeman_castle_approach');
  assert.equal(doors[0].y, 0);
  assert.equal(doors[0].interact, false);
  assert.deepEqual(map.entities.filter((entity) => entity.type === 'npc').map((entity) => entity.id), ['invasion_youngcle', 'invasion_junhee']);
  assert.equal(map.entities.find((entity) => entity.id === 'invasion_youngcle').visualScale, 2);
});
