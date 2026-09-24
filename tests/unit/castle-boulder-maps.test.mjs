import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Entity, Player, Prop, TileMap } from '../../src/world/world.js';
import * as regretScripts from '../../src/data/cutscenes/castle_regret.js';
import { castle_boulder_left_block } from '../../src/data/cutscenes/castle_boulder.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));

test('each regret corridor exposes three narrator gravestones from the walking route', () => {
  for (const number of [1, 2]) {
    const map = readMap(`gajaeman_regret${number}`);
    const steles = map.entities.filter(entity => entity.id?.startsWith('castle_regret_stele'));
    assert.equal(steles.length, 3);
    const game = { map: new TileMap(map), entities: [], propImages: {} };
    game.entities = steles.map(entity => new Prop(entity, game));
    for (const target of game.entities) {
      const player = new Entity({ x: target.x, y: target.y + target.h + 3, facing: 'up' }, game);
      assert.equal(game.map.solidRect(player.x, player.y, player.w, player.h), false);
      assert.equal(Player.prototype.probe.call(player)?.id, target.id);
      assert.equal(regretScripts[target.def.script][0].voice, 'narrator');
    }
  }
});

test('regret north exit leads into a wide collision-bounded east boulder bridge', () => {
  const previous = readMap('gajaeman_regret2');
  const exit = previous.entities.find(entity => entity.id === 'regret2_next');
  assert.equal(exit?.to, 'gajaeman_castle_boulder');
  const map = readMap(exit.to), world = new TileMap(map);
  assert.equal(map.bgm, null);
  assert.equal(map.enter.script, 'castle_boulder_intro');
  assert.equal(map.enter.flag, undefined);
  assert.ok(map.meta.boulder.bridge[2] >= 2500);
  assert.ok(map.meta.boulder.bridge[3] >= 300);
  for (const spawn of Object.values(map.spawns)) assert.equal(world.solidRect(spawn.x, spawn.y, 24, 16), false);
  for (const x of [600, 1600, 2800, 3300]) {
    assert.equal(world.solidRect(x, 640, 24, 16), false);
    assert.equal(world.solidRect(x, 420, 24, 16), true);
    assert.equal(world.solidRect(x, 808, 24, 16), true);
  }
  const wall = map.entities.find(entity => entity.id === 'castle_boulder_wall');
  assert.equal(wall.requires, 'castle_boulder_done');
  assert.equal(wall.solid, true);
  assert.deepEqual([wall.ix, wall.iy], [3200, 452]);
});

test('test_boulder316_first_entry_retains_the_guard_when_completion_changes_without_reload', () => {
  const map = readMap('gajaeman_castle_boulder');
  const main = fs.readFileSync('src/main.js', 'utf8');
  const filter = main.split('\n').find(line => line.includes('.filter((e) =>') && line.includes('e.requires'));
  const applyEntityFilter = new Function('entities', `return entities${filter.trim()};`);
  const flags = {};
  const firstEntry = applyEntityFilter.call({ has: flag => !!flags[flag] }, map.entities);
  assert.equal(firstEntry.some(entity => entity.id === 'castle_boulder_back_guard'), true);
  assert.equal(castle_boulder_left_block[0].if(flags), true);
  flags.castle_boulder_done = true;
  assert.equal(firstEntry.some(entity => entity.id === 'castle_boulder_back_guard'), true);
  assert.equal(castle_boulder_left_block[0].if(flags), false);
});

test('left orb chamber retains the right orb room geometry with left-seal interaction', () => {
  const right = readMap('gajaeman_castle_orb');
  const left = readMap('gajaeman_castle_left_orb');
  assert.deepEqual(left.rows, right.rows);
  assert.equal(left.bgm, 'castle_orb');
  assert.equal(left.entities.find(entity => entity.type === 'prop').script, 'castle_left_orb_touch');
  assert.equal(left.entities.find(entity => entity.type === 'trigger').script, 'castle_left_orb_return');
});
