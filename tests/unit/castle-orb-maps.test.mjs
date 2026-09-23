import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Entity, Player, Prop, TileMap } from '../../src/world/world.js';
import { castle_malzahar_end_door } from '../../src/data/cutscenes/gajaeman_malzahar.js';

const read = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('castle orb chamber is available after the runner landing', () => {
  const index = read('index');
  assert.ok(index.maps.includes('gajaeman_castle_orb'));
});

test('orb chamber floor and artwork fit its fixed single-screen view against a black void', () => {
  const chamber = read('gajaeman_castle_orb');
  const [cameraX, cameraY] = chamber.meta.orbRoom.camera;
  const orb = chamber.entities.find(entity => entity.id === 'castle_seal_orb');
  assert.equal(chamber.backdrop, undefined);
  assert.equal(chamber.bgm, 'castle_orb');
  assert.equal(chamber.rows.length, 12);
  assert.equal(chamber.rows[0].length, 15);
  assert.ok(chamber.rows.flatMap(row => [...row]).every(tile => [' ', '♤', '♧'].includes(tile)));
  assert.ok(orb.ix >= cameraX && orb.ix + 128 <= cameraX + 480);
  assert.ok(orb.iy >= cameraY && orb.iy + 128 <= cameraY + 230);
  for (let row = 0; row < chamber.rows.length; row++) {
    for (let col = 0; col < chamber.rows[row].length; col++) {
      if (chamber.rows[row][col] === ' ') continue;
      assert.ok(row * 32 >= cameraY && (row + 1) * 32 <= cameraY + 360);
    }
  }
});

test('orb is reachable by the real C probe from left center and right approach lanes', () => {
  const chamber = read('gajaeman_castle_orb'), map = new TileMap(chamber);
  const orb = new Prop(chamber.entities.find(entity => entity.id === 'castle_seal_orb'), { map, propImages: {} });
  for (const x of [orb.x, 228, orb.x + orb.w - 24]) {
    const player = new Entity({ x, y: orb.y + orb.h + 4, facing: 'up' }, { map, entities: [orb] });
    const probe = Player.prototype.probe.call(player);
    assert.equal(map.solidRect(player.x, player.y, player.w, player.h), false);
    assert.equal(probe, orb);
  }
  for (let y = chamber.spawns.start.y; y >= orb.y + orb.h; y -= 2) {
    assert.equal(map.solidRect(chamber.spawns.start.x, y, 24, 16), false);
  }
});

test('north door enters the chamber with explicit music and the return spawn clears the door', () => {
  const end = read('gajaeman_torii_end');
  const door = new Entity(end.entities.find(entity => entity.id === 'castle_torii_end_door'), {});
  const spawn = end.spawns.from_orb;
  const mapNode = castle_malzahar_end_door.find(node => node.map);
  assert.equal(mapNode.map, 'gajaeman_castle_orb');
  assert.ok(read(mapNode.map).spawns[mapNode.spawn]);
  assert.equal(castle_malzahar_end_door[castle_malzahar_end_door.indexOf(mapNode) + 1].bgm, 'castle_orb');
  assert.equal(door.overlaps({ ...spawn, w: 24, h: 16 }), false);
  assert.equal(new TileMap(end).solidRect(spawn.x, spawn.y, 24, 16), false);
  assert.equal(spawn.facing, 'down');
});

test('bottom walking exit is visible reachable and separated from chamber entry spawn', () => {
  const chamber = read('gajaeman_castle_orb'), map = new TileMap(chamber);
  const exit = new Entity(chamber.entities.find(entity => entity.id === 'castle_orb_exit'), { map });
  assert.equal(exit.def.type, 'trigger');
  assert.equal(exit.def.script, 'castle_orb_return');
  assert.equal(exit.overlaps({ ...chamber.spawns.start, w: 24, h: 16 }), false);
  assert.ok(exit.y + exit.h <= chamber.meta.orbRoom.camera[1] + 360);
  for (let y = chamber.spawns.start.y; y <= exit.y - 12; y += 2) {
    assert.equal(map.solidRect(chamber.spawns.start.x, y, 24, 16), false);
  }
});
