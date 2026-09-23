import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getTile } from '../../src/world/tiles.js';
import { Camera, CHAR_SCALE, Entity, Follower, Player, Prop, RENDER_SCALE, SCREEN_W, TileMap, freeSpot } from '../../src/world/world.js';
import { castle_memory_sign, castle_memory_enter } from '../../src/data/cutscenes/castle_memory.js';
import * as memoryScripts from '../../src/data/cutscenes/castle_memory.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('memory rooms each expose three evenly spaced repeatable narrator tombstones off the walking route', () => {
  const texts = [
    '나도 사실은 이런대우가 싫었어. 나도 올라가고싶었어.',
    '이렇게 하면 사람들이 좋아해주니까 그런거였어',
    '왜 나에게 창녀라고 하는거야?',
    '자꾸 높이있는녀석들과 비교하지마, 나를 봐달란말이야',
    '하지마, 난 그런사람이 아니라고, 오해하지 말아줘',
    '사실은 말이야, 나도 양지에 가고싶었어.',
  ];
  for (const number of [1, 2]) {
    const def = readMap(`gajaeman_memory${number}`), inspected = [];
    const stones = def.entities.filter(entity => entity.id?.startsWith('castle_memory_stele'));
    assert.equal(stones.length, 3);
    const game = { map: new TileMap(def), propImages: {}, entities: [], runScript: script => inspected.push(script) };
    game.entities = stones.map(stone => new Prop(stone, game));
    const route = def.meta.route.map(([x, y]) => [x * 32 + 16, y * 32 + 16]);
    const total = route.slice(1).reduce((sum, [x, y], i) => sum + Math.abs(x - route[i][0]) + Math.abs(y - route[i][1]), 0);
    for (const [index, stone] of game.entities.entries()) {
      assert.equal(stone.def.image, 'assets/props/jjajang_stele.png');
      assert.deepEqual(memoryScripts[stone.def.script], [{ voice: 'narrator', text: `* ${texts[(number - 1) * 3 + index]}` }]);
      for (const key of ['once', 'flag', 'unless', 'requires']) assert.equal(stone.def[key], undefined);
      assert.equal(game.map.solidRect(stone.x, stone.y, stone.w, stone.h), true);
      const side = index === 1;
      for (const offset of [0, 4, 8]) {
        const player = new Entity({ x: side ? stone.x - 24 - offset : stone.x,
          y: side ? stone.y : stone.y + stone.h + offset, facing: side ? 'right' : 'up' }, game);
        assert.equal(game.map.solidRect(player.x, player.y, player.w, player.h), false);
        assert.equal(Player.prototype.probe.call(player), stone);
      }
      stone.interact(); stone.interact();
      let along = 0, nearest = { separation: Infinity, distance: 0 };
      for (let i = 1; i < route.length; i++) {
        const [ax, ay] = route[i - 1], [bx, by] = route[i];
        const x = Math.max(Math.min(ax, bx), Math.min(Math.max(ax, bx), stone.cx));
        const y = Math.max(Math.min(ay, by), Math.min(Math.max(ay, by), stone.cy));
        const separation = Math.hypot(x - stone.cx, y - stone.cy);
        if (separation < nearest.separation) nearest = { separation, distance: along + Math.abs(x - ax) + Math.abs(y - ay) };
        along += Math.abs(bx - ax) + Math.abs(by - ay);
      }
      assert.ok(Math.abs(nearest.distance - total * (index + 1) / 4) <= 128, stone.id);
    }
    assert.deepEqual(inspected, stones.flatMap(stone => [stone.script, stone.script]));
  }
});

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

for (const [mapId, spawn, facing] of [
  ['gajaeman_memory2', 'start', 'left'],
  ['gajaeman_memory1', 'from_next', 'right'],
]) test(`${mapId}.${spawn} leaves the complete party sprite frames inside the camera edge`, () => {
  const def = readMap(mapId);
  const game = { map: new TileMap(def), entities: [] };
  game.player = new Entity({ ...def.spawns[spawn], sprite: 'hyungsub' }, game);
  const actors = [game.player];
  for (const [slot, sprite] of ['gyeongsub', 'ppaman'].entries()) {
    const follower = new Entity({ type: 'follower', sprite, solid: false }, game);
    follower.gap = 48 * (slot + 1);
    Follower.prototype.snapBehind.call(follower);
    actors.push(follower);
    game.entities.push(follower);
  }
  const camera = new Camera();
  camera.target = game.player; camera.map = game.map; camera.snap();
  assert.equal(game.player.facing, facing);
  const entranceClearance = facing === 'left' ? game.map.pxW - game.player.x : game.player.x;
  assert.ok(entranceClearance >= 160);
  for (const actor of actors) {
    const png = fs.readFileSync(`assets/sprites/${actor.def.sprite}.png`);
    const frameWidth = Math.round(png.readUInt32BE(16) / 4 / RENDER_SCALE * CHAR_SCALE);
    const left = Math.round(actor.x + actor.w / 2 - frameWidth / 2 - camera.x);
    assert.ok(left >= 16 && left + frameWidth <= SCREEN_W - 16, actor.def.sprite);
    assert.equal(game.map.solidRect(actor.x, actor.y, actor.w, actor.h), false);
  }
  for (const door of def.entities.filter(entity => entity.type === 'door')) {
    const exit = new Entity(door, game);
    assert.ok(actors.every(actor => !exit.overlaps(actor.rect)));
  }
});

test('memory routes connect successive bends and continue north into the defence fork', () => {
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
  assert.equal(maps[1].entities.filter(entity => entity.type === 'door').length, 2);
  assert.equal(maps[1].entities.find(entity => entity.id === 'memory2_next').to, 'gajaeman_castle_fork');
  const [x, y] = maps[1].meta.route.at(-1);
  for (let row = 0; row <= y; row++) assert.equal(getTile(maps[1].rows[row][x]).solid, false);
});
