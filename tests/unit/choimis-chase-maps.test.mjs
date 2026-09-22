import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TileMap } from '../../src/world/world.js';

const readMap = id => JSON.parse(fs.readFileSync(`assets/maps/${id}.json`, 'utf8'));
const completed = { sakura8_split_done: true, sakura8_right_open: true, sakura7_scene_done: true, sakura6_scene_done: true, sakura5_girls_left: true, sakura5_clearing_scene_done: true };
const solids = map => map.entities.filter(e => e.solid && (!e.requires || completed[e.requires]) && (!e.unless || !completed[e.unless]));

for (const id of ['jjajang_sakura8', 'jjajang_sakura7', 'jjajang_sakura6']) {
  test(`${id}: chase staging follows the existing walkable road without moving scenery`, () => {
    const def = readMap(id), map = new TileMap(def);
    const start = def.spawns.chase;
    const end = def.entities.find(e => e.id === 'chase_end');
    assert.ok(start && end, 'both staging endpoints exist');
    assert.ok(start.x > end.x);
    assert.equal(start.y, end.y);
    for (let x = start.x; x >= end.x; x--) {
      assert.equal(map.solidRect(x, start.y, 24, 16), false, `ground at ${x}`);
      assert.equal(solids(def).some(e => x < e.x + (e.w ?? 24) && x + 24 > e.x && start.y < e.y + (e.h ?? 16) && start.y + 16 > e.y), false, `prop at ${x}`);
    }
  });
}

test('the crashed giant tree stays absent on revisiting its original map', () => {
  const map = readMap('jjajang_sakura5');
  const trees = map.entities.filter(e => e.image === 'assets/props/sakura_giant_tree.png' && !e.hidden);
  assert.equal(trees.length, 1);
  assert.equal(trees[0].id, 'sakura5_giant_tree');
  assert.equal(trees[0].unless, 'choimis_tree_crashed');
});

test('crash staging keeps every landing and dialogue anchor on the clearing floor', () => {
  const def = readMap('jjajang_sakura5'), map = new TileMap(def);
  const anchors = def.entities.filter(e => e.id?.startsWith('crash_'));
  assert.ok(anchors.length >= 11);
  for (const anchor of anchors) {
    assert.equal(anchor.hidden, true);
    assert.equal(anchor.solid, false);
    assert.equal(map.solidRect(anchor.x, anchor.y, 24, 16), false, anchor.id);
  }
  const trunk = def.entities.find(e => e.id === 'sakura5_giant_tree');
  const impact = anchors.find(e => e.id === 'crash_impact');
  assert.equal(impact.x, trunk.x + trunk.w);
  assert.ok(impact.y < trunk.y + trunk.h && impact.y + 16 > trunk.y);
});

test('the completed runaway scene restores its actors beside the player without repeating dialogue', () => {
  const def = readMap('jjajang_sakura5'), map = new TileMap(def);
  const npcs = def.entities.filter(e => e.type === 'npc' && e.requires === 'choimis_runaway_done');
  assert.deepEqual(npcs.map(e => e.id).sort(), ['choimis_runaway', 'gyeongsub_scene', 'ppaman_scene']);
  const player = def.spawns.after_runaway;
  for (const actor of npcs) {
    assert.equal(actor.script, undefined);
    assert.equal(map.solidRect(actor.x, actor.y, 24, 16), false);
    if (actor.id !== 'choimis_runaway') assert.ok(Math.hypot(actor.x - player.x, actor.y - player.y) < 100, `${actor.id} stands beside the player`);
  }
  assert.equal(def.enter.script, 'choimis_runaway_restore');
  assert.equal(def.enter.flag, undefined);
});
