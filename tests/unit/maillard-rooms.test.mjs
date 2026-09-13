import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';

const readMap = (id) => {
  const path = `assets/maps/${id}.json`;
  assert.ok(fs.existsSync(path), `${id} must exist`);
  return JSON.parse(fs.readFileSync(path, 'utf8'));
};
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test('upper lounge doors are player-sized with reachable C probes clear of statues', () => {
  const map = readMap('maillard_lounge');
  const iron = map.entities.find((entity) => entity.id === 'lounge_storage_door');
  const wood = map.entities.find((entity) => entity.id === 'lounge_saloon_door');
  assert.ok(iron && wood);
  assert.equal(iron.type, 'sign');
  assert.equal(iron.script, 'maillard_storage_enter');
  assert.equal(wood.type, 'door');
  assert.equal(wood.to, 'maillard_saloon');
  assert.equal(wood.spawn, 'start');
  assert.equal(wood.interact, true);
  const images = map.entities.filter((entity) => ['lounge_storage_image', 'lounge_saloon_image'].includes(entity.id));
  assert.equal(images.length, 2);
  for (const image of images) {
    const png = fs.readFileSync(image.image);
    const scale = image.scale ?? 1;
    assert.ok(png.readUInt32BE(20) * scale <= 96);
    assert.ok(image.y + png.readUInt32BE(20) * scale <= 166);
  }
  const tiles = new TileMap(map);
  for (const door of [iron, wood]) {
    const stand = { x: door.x + door.w / 2 - 12, y: 160, w: 24, h: 16 };
    assert.equal(tiles.solidRect(stand.x, stand.y, stand.w, stand.h), false);
    assert.equal(overlaps({ ...stand, y: stand.y - 19.2 }, door), true);
    for (const statue of map.entities.filter((entity) => entity.id.startsWith('lounge_statue_'))) {
      assert.equal(overlaps(stand, statue), false);
    }
  }
});

for (const [id, width, bgm] of [['maillard_storage', 480, 'wind'], ['maillard_saloon', 736, 'maillard_lounge']]) {
  test(`${id} is an enclosed room with the requested dimensions and music`, () => {
    const map = readMap(id);
    const tiles = new TileMap(map);
    assert.deepEqual([tiles.pxW, tiles.pxH], [width, 448]);
    const interior = fs.readFileSync(map.entities.find(entity => entity.id.endsWith('_interior')).image);
    assert.deepEqual([interior.readUInt32BE(16), interior.readUInt32BE(20)], [width, 448]);
    assert.equal(map.bgm, bgm);
    assert.equal(map.meta.connected, true);
    assert.equal(map.backdrop, undefined);
    assert.equal(map.enter, undefined);
    assert.equal(map.entities.filter((entity) => entity.type === 'door').length, 1);
    assert.ok(map.entities.every((entity) => ['prop', 'door'].includes(entity.type)));
    assert.ok(map.entities.every((entity) => !entity.script && !entity.flag && !entity.requires));
    if (id === 'maillard_saloon') assert.equal(map.name, '선장실로 가는 길');
    assert.equal(tiles.solidRect(32, 160, width - 64, 224), false);
    for (const point of [[0, 240], [width - 1, 240], [240, 159], [240, 384]]) {
      assert.equal(tiles.solidRect(...point, 1, 1), true);
    }
  });

  test(`${id} returns through C and leaves both arrival spawns outside door probes`, () => {
    const room = readMap(id);
    const lounge = readMap('maillard_lounge');
    const exit = room.entities.find((entity) => entity.type === 'door');
    assert.equal(exit.to, 'maillard_lounge');
    assert.equal(exit.spawn, id.replace('maillard_', 'from_'));
    assert.equal(exit.interact, true);
    assert.equal(exit.sfx, 'plug');
    assert.ok(exit.y >= 366 && exit.y + exit.h > 384);
    for (const [map, spawn] of [[room, room.spawns.start], [lounge, lounge.spawns[exit.spawn]]]) {
      assert.ok(spawn);
      const entering = map === room;
      assert.equal(spawn.facing, entering ? 'up' : 'down');
      assert.equal(spawn.y, entering ? 248 : 304);
      const player = { ...spawn, w: 24, h: 16 };
      assert.equal(new TileMap(map).solidRect(spawn.x, spawn.y, 24, 16), false);
      for (const offset of [48, 96]) {
        const followerY = spawn.y + (entering ? offset : -offset);
        assert.equal(new TileMap(map).solidRect(spawn.x, followerY, 24, 16), false);
      }
      for (const door of map.entities.filter((entity) => entity.type === 'door' || entity.type === 'sign')) {
        assert.equal(overlaps(player, door), false);
        assert.equal(overlaps({ ...player, y: player.y - 19.2 }, door), false);
      }
    }
    const stand = { x: exit.x + exit.w / 2 - 12, y: 368, w: 24, h: 16 };
    assert.equal(overlaps({ ...stand, y: stand.y + 19.2 }, exit), true);
    assert.equal(new TileMap(room).solidRect(stand.x, stand.y, stand.w, stand.h), false);
  });
}

test('wooden lounge door plays the requested clank when entering', () => {
  const door = readMap('maillard_lounge').entities.find(entity => entity.id === 'lounge_saloon_door');
  assert.equal(door.sfx, 'plug');
});
