import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Camera, TileMap } from '../../src/world/world.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
const id = 'gajaeman_castle_cathedral';

test('test_castle321_closed_refuge_gate_connects_by_confirm_to_a_safe_landing', () => {
  const refuge = readMap('gajaeman_castle_dark_refuge');
  const door = refuge.entities.find(entity => entity.to === id);
  assert.ok(door, 'closed refuge gate needs a real next map');
  assert.equal(door.interact, true);
  const map = readMap(id), world = new TileMap(map), spawn = map.spawns[door.spawn];
  assert.equal(world.solidRect(spawn.x, spawn.y, 24, 16), false);
  const back = map.entities.find(entity => entity.id === 'cathedral_return');
  assert.equal(back.interact, false);
  assert.equal(back.to, refuge.id);
  assert.equal(back.y + back.h, world.pxH);
  assert.ok(spawn.y + 16 < back.y - 32);
  const returned = refuge.spawns[back.spawn];
  assert.ok(returned.y >= door.y + door.h + 24);
});

test('test_castle321_all_three_lanes_reach_the_visible_north_passage_without_a_dummy_exit', () => {
  const map = readMap(id), world = new TileMap(map);
  for (const x of [308, 372, 436]) {
    for (let y = 0; y <= 7552; y += 8) assert.equal(world.solidRect(x, y, 24, 16), false);
  }
  assert.equal(world.solidRect(280, 4000, 24, 16), true);
  assert.equal(world.solidRect(472, 4000, 24, 16), true);
  // BUILD325: 북쪽 끝은 맵 가장자리의 밟는 문으로 둘째 회랑에 이어진다(가짜 중간 출구는 없다)
  const north = map.entities.filter(entity => entity.type === 'door' && entity.y < 7552);
  assert.deepEqual(north.map(door => [door.to, door.y, door.interact]), [['gajaeman_castle_cathedral2', 0, false]]);
  // BUILD323: 입장 연출은 도착 스크립트로(사용자 요청). 회랑 자체에 가짜 출구는 여전히 없다
  assert.deepEqual(map.enter, { script: 'castle_cathedral_intro' });
  assert.equal(map.bgm, null);
  assert.equal(map.backdrop, undefined);
  assert.ok(7488 / 124.8 >= 59 && 7488 / 124.8 <= 61);
  assert.ok(world.pxW * world.pxH * 4 < 32 * 1024 * 1024, 'baked map must fit a 32MiB RGBA budget');
});

test('test_castle321_landing_and_stairs_are_connected_and_decorations_leave_the_aisle_clear', () => {
  const map = readMap(id), world = new TileMap(map);
  for (let y = 7552; y <= map.spawns.start.y; y += 8) assert.equal(world.solidRect(372, y, 24, 16), false);
  for (const x of [148, 308, 436, 596]) assert.equal(world.solidRect(x, 7848, 24, 16), false);
  for (const decoration of map.entities.filter(entity => /sconce/.test(entity.id))) {
    assert.ok(decoration.x + decoration.w <= 288 || decoration.x >= 480);
    assert.equal(decoration.solid, false);
    assert.equal(decoration.script, undefined);
  }
  assert.equal(map.entities.filter(entity => entity.image?.endsWith('castle321_window.png')).length, 2);
  assert.equal(map.entities.filter(entity => entity.image?.endsWith('castle321_column.png')).length, 2);
});

test('test_castle321_north_stop_keeps_the_leader_visible_and_stairs_leave_rear_party_space', () => {
  const map = readMap(id), camera = new Camera();
  camera.map = new TileMap(map);
  camera.target = { x: 372, y: 64, w: 24, h: 16 };
  camera.snap();
  assert.ok(camera.target.y + 16 - 64 - camera.y >= 0);
  assert.ok(map.rows[0].includes('░') && map.rows[1].includes('░'), 'aisle reaches the north edge');
  assert.equal(map.followScreenY, 176);
});

test('test_castle321_initial_view_keeps_both_complete_windows_inside_the_camera', () => {
  const map = readMap(id), camera = new Camera();
  camera.map = new TileMap(map);
  camera.target = { ...map.spawns.start, w: 24, h: 16 };
  camera.snap();
  for (const window of map.entities.filter(entity => entity.image?.endsWith('castle321_window.png'))) {
    assert.ok(window.y >= camera.y);
    assert.ok(window.y + window.h <= camera.y + 360);
    assert.ok(window.x >= camera.x);
    assert.ok(window.x + window.w <= camera.x + 480);
  }
});
