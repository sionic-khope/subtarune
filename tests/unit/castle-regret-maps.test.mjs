import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCRIPTS } from '../../src/data/scripts.js';
import { getTile } from '../../src/world/tiles.js';
import { Entity, Follower, Player, Prop, TileMap } from '../../src/world/world.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
const maps = ['gajaeman_castle_left1', 'gajaeman_regret1', 'gajaeman_regret2'];

test('regret entrance opens only after the pipe return and returns to the left lobby door', () => {
  const lobby = readMap('gajaeman_castle_lobby');
  const door = lobby.entities.find(entity => entity.id === 'castle_lobby_left_door');
  assert.equal(door.script, 'castle_lobby_left_enter');
  const script = SCRIPTS[door.script];
  assert.equal(script[0].if({}), true);
  assert.equal(script[0].if({ castle_pipe_returned: true }), false);
  assert.equal(script.find(node => node.map).map, maps[0]);
  const back = readMap(maps[0]).entities.find(entity => entity.type === 'door');
  assert.equal(back.to, lobby.id);
  assert.ok(lobby.spawns[back.spawn]);
});

test('regret bridge uses the castle purple floor with black walls and indoor depth', () => {
  for (const id of maps) {
    const map = readMap(id);
    assert.equal(map.bgm, 'castle_regret');
    assert.equal(map.backdrop, 'castle-regret-depth');
    assert.ok(map.rows.some(row => row.includes('▥')));
    assert.ok(map.rows.some(row => row.includes('♜')));
    assert.ok(map.rows.every(row => !/[♨♩♤♧]/u.test(row)));
    assert.equal(map.meta.connected, true);
    for (const spawn of Object.values(map.spawns)) {
      assert.equal(new TileMap(map).solidRect(spawn.x, spawn.y, 24, 16), false);
    }
  }
});

test('first bridge contains the recoverable spring, smaller north door, and exact right sign dialogue', () => {
  const map = readMap(maps[0]);
  const door = map.entities.find(entity => entity.id === 'castle_regret_door');
  const sign = map.entities.find(entity => entity.id === 'castle_regret_sign');
  const spring = map.entities.find(entity => entity.id === 'castle_regret_spring');
  assert.equal(door.image, 'assets/props/castle-memory-door.png');
  assert.equal(SCRIPTS[door.script].find(node => node.map).map, maps[1]);
  assert.ok(sign.x >= door.x + door.w);
  assert.deepEqual(SCRIPTS[sign.script].filter(node => node.text).map(node => [node.speaker, node.text]), [
    ['억빠맨', '* 후회의방 이라고 적혀있어요'], ['경섭', '* 후회? 뭘까..'],
  ]);
  assert.equal(spring.image, 'assets/props/blue_buff.png');
  assert.equal(spring.script, 'maillard_spring');
  assert.ok(spring.y > door.y && spring.y < map.spawns.start.y);
  for (const field of ['once', 'unless', 'requires']) assert.equal(spring[field], undefined);
  const game = { map: new TileMap(map), entities: [], propImages: {} };
  game.entities = [door, sign, spring].map(entity => new Prop(entity, game));
  for (const target of game.entities) for (const x of [target.x, target.x + target.w / 2 - 12, target.x + target.w - 24]) {
    const player = new Entity({ x, y: target.y + target.h, facing: 'up' }, game);
    assert.equal(game.map.solidRect(player.x, player.y, player.w, player.h), false);
    assert.equal(Player.prototype.probe.call(player)?.id, target.id);
  }
});

test('two winding regret maps contain exactly the three requested persistent encounters', () => {
  const rooms = maps.slice(1).map(readMap);
  assert.deepEqual(rooms.map(map => map.entities.filter(entity => entity.type === 'enemy').map(entity => entity.enemies)),
    [[['yisub']], [['syndrasub'], ['taliyahsub', 'aurelionsub']]]);
  for (const map of rooms) {
    for (const enemy of map.entities.filter(entity => entity.type === 'enemy')) {
      assert.equal(enemy.unless, `${map.id}_${enemy.id}_defeated`);
      assert.equal(enemy.bgm, 'castle_battle');
      assert.equal(enemy.script, undefined);
    }
    assert.equal(map.battleBg, 'castle_memory');
    const route = map.meta.route;
    assert.ok(route.length >= 5);
    for (let i = 1; i < route.length; i++) {
      const [x0, y0] = route[i - 1], [x1, y1] = route[i];
      assert.ok(x0 === x1 || y0 === y1);
      for (let step = 0; step <= Math.abs(x1 - x0) + Math.abs(y1 - y0); step++) {
        assert.equal(getTile(map.rows[y0 + Math.sign(y1 - y0) * step][x0 + Math.sign(x1 - x0) * step]).solid, false);
      }
    }
    assert.ok(map.meta.walkSeconds >= 12);
    assert.ok(map.entities.every(entity => ['enemy', 'door', 'prop'].includes(entity.type)));
  }
  assert.equal(rooms[0].entities.find(entity => entity.id === 'regret1_next').to, maps[2]);
  assert.deepEqual(rooms[1].entities.filter(entity => entity.type === 'door').map(entity => entity.to), [maps[1], 'gajaeman_castle_boulder']);
});

test('return spawns leave the full party on floor without compressing their following gaps', () => {
  for (const [id, spawn] of [['gajaeman_castle_lobby', 'from_left'], ['gajaeman_castle_left1', 'from_regret']]) {
    const def = readMap(id);
    const game = { map: new TileMap(def), entities: [] };
    game.player = new Entity(def.spawns[spawn], game);
    game.entities = def.entities.filter(entity => entity.type === 'prop' && entity.solid).map(entity => new Entity(entity, game));
    for (const gap of [48, 96]) {
      const follower = new Entity({ type: 'follower', solid: false }, game);
      follower.gap = gap;
      Follower.prototype.snapBehind.call(follower);
      assert.equal(follower.x, game.player.x);
      assert.equal(follower.y, game.player.y - gap);
      assert.equal(game.map.solidRect(follower.x, follower.y, follower.w, follower.h), false);
    }
  }
});
