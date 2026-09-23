import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTile } from '../../src/world/tiles.js';
import { Entity, Player, TileMap, freeSpot } from '../../src/world/world.js';
import { castle_memory_sign, castle_memory_enter } from '../../src/data/cutscenes/castle_memory.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('memory entrance is a small closed door with its own sign on the right', () => {
  const map = readMap('gajaeman_castle_right1');
  const door = map.entities.find(entity => entity.id === 'castle_memory_door');
  assert.ok(door, 'the corridor must have a memory-room entrance');
  const sign = map.entities.find(entity => entity.script === 'castle_memory_sign');
  assert.equal(door.script, 'castle_memory_enter');
  assert.equal(door.image, 'assets/props/castle-memory-door.png');
  assert.ok(sign.x >= door.x + door.w);
  assert.equal(castle_memory_enter.find(node => node.map).map, 'gajaeman_memory1');
  assert.deepEqual(castle_memory_sign.filter(node => node.text).map(node => [node.speaker, node.text]), [
    ['억빠맨', '* 음.. 기억의 방이라고 적혀있어요'],
    ['경섭', '* 무슨뜻일까'],
    ['억빠맨', '* 일단 들어가보시죠'],
  ]);
});

test('old north-wall saves restore onto reachable floor below the new doorway', () => {
  const def = readMap('gajaeman_castle_right1');
  const game = { map: new TileMap(def), entities: [] };
  game.entities = def.entities.filter(entity => entity.type === 'prop').map(entity => new Entity(entity, game));
  const player = new Entity({ x: 372, y: 64, w: 24, h: 16 }, game);
  game.player = player;
  const [x, y] = freeSpot(game, player, player.x, player.y, 96);
  assert.equal(game.map.solidRect(x, y, player.w, player.h), false);
  assert.ok(y >= 128);
  assert.ok(!game.entities.some(entity => entity.overlaps({ x, y, w: 24, h: 16 })));
  for (let south = y; south <= def.spawns.start.y; south += 8) {
    assert.equal(game.map.solidRect(x, south, 24, 16), false);
  }
});

test('door and right-hand sign remain reachable at left middle and right approach edges', () => {
  const def = readMap('gajaeman_castle_right1');
  const game = { map: new TileMap(def), entities: [] };
  game.entities = def.entities.filter(entity => entity.type === 'prop').map(entity => {
    const result = new Entity(entity, game);
    result.canInteract = () => !!entity.script;
    return result;
  });
  for (const target of game.entities) for (const x of [target.x, target.x + target.w / 2 - 12, target.x + target.w - 24]) {
    const player = new Entity({ x, y: target.y + target.h, w: 24, h: 16, facing: 'up' }, game);
    assert.equal(game.map.solidRect(player.x, player.y, player.w, player.h), false);
    assert.equal(Player.prototype.probe.call(player)?.id, target.id);
  }
});

test('memory maps have one then two independent persistent encounters', () => {
  const maps = ['gajaeman_memory1', 'gajaeman_memory2'].map(readMap);
  assert.deepEqual(maps.map(map => map.entities.filter(entity => entity.type === 'enemy').map(entity => entity.id)),
    [['seobruto'], ['jiroesub', 'udyrsub']]);
  for (const map of maps) for (const enemy of map.entities.filter(entity => entity.type === 'enemy')) {
    assert.deepEqual(enemy.enemies, [enemy.id]);
    assert.equal(enemy.unless, `${map.id}_${enemy.id}_defeated`);
    assert.equal(enemy.bgm, 'castle_battle');
    assert.equal(map.battleBg, 'castle_memory');
    assert.equal(map.bgm, 'castle_right');
  }
});

test('memory routes connect successive bends and stop at the final wall', () => {
  const maps = ['gajaeman_memory1', 'gajaeman_memory2'].map(readMap);
  for (const [index, map] of maps.entries()) {
    assert.ok(map.rows.some(row => row.includes('▦')));
    assert.ok(map.rows.every(row => !row.includes('▥')));
    const route = map.meta.route;
    let distance = 0;
    for (let point = 1; point < route.length; point++) {
      const [x0, y0] = route[point - 1], [x1, y1] = route[point];
      const steps = Math.abs(x1 - x0) + Math.abs(y1 - y0);
      assert.ok(x0 === x1 || y0 === y1);
      for (let step = 0; step <= steps; step++) {
        const x = x0 + Math.sign(x1 - x0) * step, y = y0 + Math.sign(y1 - y0) * step;
        assert.equal(getTile(map.rows[y][x]).solid, false);
      }
      distance += steps * 32;
    }
    assert.ok(distance / 218.4 >= (index ? 15 : 12));
    assert.ok(distance / 218.4 <= (index ? 20 : 18));
  }
  const route = maps[0].meta.route;
  assert.deepEqual(route.slice(1).map(([x, y], i) => [Math.sign(x - route[i][0]), Math.sign(y - route[i][1])]),
    [[0, -1], [1, 0], [0, -1], [-1, 0]]);
  assert.equal(maps[1].entities.filter(entity => entity.type === 'door').length, 1);
  const [x, y] = maps[1].meta.route.at(-1);
  assert.equal(getTile(maps[1].rows[y - 2][x]).solid, true);
});
