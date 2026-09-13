import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap, Entity, Door, Sign, Player } from '../../src/world/world.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('facing right at the bridge back wall enters the ship without turning around', () => {
  const data = readMap('youngcle_bridge');
  const changes = [];
  const game = { mapId: 'youngcle_bridge', flags: { captain_attack_done: true },
    dialogue: { running: false }, sound: { sfx() {} }, changeMap: (...args) => changes.push(args) };
  game.entities = data.entities.map(def => def.type === 'door' ? new Door(def, game)
    : def.type === 'sign' ? new Sign(def, game) : new Entity(def, game));
  for (const x of [1350.589, 1352]) {
    const player = { x, y: 416, w: 24, h: 16, facing: 'right', game };
    const target = Player.prototype.probe.call(player);
    assert.equal(target?.id, 'youngcle_entrance', 'the forward probe must select the door before the hull inspection');
    target.cooldown = 0;
    target.interact();
  }
  assert.deepEqual(changes, [['youngcle1', 'from_bridge'], ['youngcle1', 'from_bridge']]);
});

test('youngcle1 is a wide enclosed steel room with a central TV and northeast door', () => {
  const data = readMap('youngcle1');
  const map = new TileMap(data);
  assert.deepEqual([map.pxW, map.pxH], [1344, 576]);
  assert.equal(data.backdrop, undefined);
  assert.equal(data.bgm, null);
  assert.deepEqual(data.enter, { script: 'youngcle_intro', early: true });
  assert.equal(new Set(data.rows.join('')).size, 2);
  const tv = data.entities.find(entity => entity.id === 'youngcle_tv');
  assert.equal(tv.x + tv.w / 2, map.pxW / 2);
  assert.deepEqual([tv.w, tv.h], [288, 176]);
  const door = data.entities.find(entity => entity.id === 'youngcle_right_door');
  assert.ok(door.x > map.pxW * 0.8 && door.y < map.pxH / 2);
  assert.equal(door.script, 'youngcle_right_door_pending');
  assert.equal(door.to, undefined);
  assert.ok(data.entities.filter(entity => entity.type === 'npc').every(entity => entity.unless === 'youngcle_intro_done'));
});

test('ship entry and return keep all three party members on floor outside transition zones', () => {
  for (const [id, spawnId, facing] of [['youngcle1', 'from_bridge', 'up'], ['youngcle_bridge', 'from_inside', 'left']]) {
    const data = readMap(id);
    const map = new TileMap(data);
    const spawn = data.spawns[spawnId];
    assert.equal(spawn.facing, facing);
    for (const gap of [0, 48, 96]) {
      const x = spawn.x + (facing === 'left' ? gap : 0);
      const y = spawn.y + (facing === 'up' ? gap : 0);
      assert.equal(map.solidRect(x, y, 24, 16), false);
      for (const entity of data.entities.filter(entity => entity.type === 'door' || entity.solid === true)) {
        assert.equal(new Entity(entity, {}).overlaps({ x, y, w: 24, h: 16 }), false);
      }
    }
  }
  const back = readMap('youngcle1').entities.find(entity => entity.id === 'youngcle_to_bridge');
  assert.deepEqual([back.to, back.spawn, back.interact], ['youngcle_bridge', 'from_inside', true]);
});

test('TV and right door interaction anchors are reachable from the steel floor', () => {
  const data = readMap('youngcle1');
  const map = new TileMap(data);
  for (const id of ['youngcle_tv_screen', 'youngcle_right_door']) {
    const anchor = data.entities.find(entity => entity.id === id);
    const stand = { x: anchor.x + anchor.w / 2 - 12, y: anchor.y + anchor.h + 8, w: 24, h: 16 };
    assert.equal(map.solidRect(stand.x, stand.y, stand.w, stand.h), false);
    assert.equal(new Entity(anchor, {}).overlaps({ ...stand, y: stand.y - 19.2 }), true);
  }
});
